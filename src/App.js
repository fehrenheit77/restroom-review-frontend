import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import "./App.css";
import axios from "axios";
import { Loader } from '@googlemaps/js-api-loader';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (tokenData) => {
    const { access_token, user: userData } = tokenData;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Terms of Service Modal
const TermsModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Terms of Service & Community Guidelines</h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <section>
              <h3 className="font-bold text-lg mb-2">Zero-Tolerance Policy</h3>
              <p>
                Restroom Review maintains a <strong>zero-tolerance policy</strong> for objectionable content. 
                We do not allow content that is offensive, inappropriate, harmful, or violates our community standards.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-lg mb-2">Prohibited Content</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Offensive, abusive, or inappropriate language</li>
                <li>Harassment, bullying, or threats</li>
                <li>Discriminatory or hateful content</li>
                <li>Sexually explicit or suggestive material</li>
                <li>Violence or graphic content</li>
                <li>Spam or misleading information</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-lg mb-2">Content Moderation</h3>
              <p>
                All user-submitted content is subject to review. Users can report inappropriate content, 
                and we will investigate all reports within 24 hours. Violators may face:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Content removal</li>
                <li>Account warnings</li>
                <li>Temporary or permanent account suspension</li>
                <li>Legal action if necessary</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-lg mb-2">Reporting</h3>
              <p>
                If you encounter inappropriate content, please use the "Report" button available on all reviews. 
                You can also block users whose content you find objectionable.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-lg mb-2">Your Agreement</h3>
              <p>
                By creating an account, you agree to follow these guidelines and understand that 
                violations will result in enforcement actions.
              </p>
            </section>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              I Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Component
const Login = () => {
  const { login } = useAuth();
  const [authMethod, setAuthMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    confirmPassword: ''
  });
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check terms acceptance for registration
      if (isRegister && !termsAccepted) {
        setError('');
        setLoading(false);
        setShowTerms(true);
        return;
      }

      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister 
        ? { email: formData.email, password: formData.password, full_name: formData.full_name, accept_terms: true }
        : { email: formData.email, password: formData.password };

      if (isRegister && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    // Automatically submit the form after accepting terms
    setTimeout(() => {
      document.getElementById('login-form')?.requestSubmit();
    }, 100);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post(`${API}/auth/google`, {
        credential: credentialResponse.credential
      });
      
      login(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load Apple Sign-In JS SDK
      if (!window.AppleID) {
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.onload = () => initAppleSignIn();
        document.body.appendChild(script);
      } else {
        await initAppleSignIn();
      }
    } catch (error) {
      setError('Apple Sign-In initialization failed');
      setLoading(false);
    }
  };

  const initAppleSignIn = async () => {
    try {
      window.AppleID.auth.init({
        clientId: process.env.REACT_APP_APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: process.env.REACT_APP_APPLE_REDIRECT_URI,
        usePopup: true
      });

      const response = await window.AppleID.auth.signIn();
      
      if (response && response.authorization) {
        // Send to backend
        const backendResponse = await axios.post(`${API}/auth/apple`, {
          id_token: response.authorization.id_token,
          authorization_code: response.authorization.code,
          user: response.user
        });
        
        login(backendResponse.data);
      }
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      setError(error.error || 'Apple Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🚽 Welcome to Restroom Review
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* Auth Method Selector */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                authMethod === 'email'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setAuthMethod('social')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                authMethod === 'social'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Social Login
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {authMethod === 'email' && (
            <form id="login-form" onSubmit={handleEmailLogin} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
              </button>
            </form>
          )}

          {authMethod === 'social' && (
            <div className="space-y-4">
              {/* Google Sign In */}
              <div className="w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Login Failed')}
                  text={isRegister ? "signup_with" : "signin_with"}
                  width="100%"
                  theme="outline"
                  size="large"
                />
              </div>
              
              {/* Apple Sign In Button */}
              <div className="w-full">
                <button
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>{loading ? 'Signing in...' : (isRegister ? 'Sign up with Apple' : 'Sign in with Apple')}</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setTermsAccepted(false);
                setFormData({ email: '', password: '', full_name: '', confirmPassword: '' });
              }}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Terms of Service Modal */}
        <TermsModal
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={handleTermsAccept}
        />
      </div>
    </div>
  );
};

// Categorical Rating Component
const CategoryRating = ({ category, rating, onRatingChange, icon }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-gray-700 capitalize">{category}</span>
      </div>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-xl ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-500 cursor-pointer transition-colors`}
            onClick={() => onRatingChange && onRatingChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
};

// Overall Rating Display Component
const OverallRating = ({ 
  vibeRating, 
  cleanlinessRating, 
  privacyRating, 
  smellRating, 
  accessoriesRating, 
  overallRating,
  showBreakdown = false,
  readonly = true 
}) => {
  const categories = [
    { name: 'vibe', rating: vibeRating, icon: '💫' },
    { name: 'cleanliness', rating: cleanlinessRating, icon: '🧼' },
    { name: 'privacy', rating: privacyRating, icon: '🧴' },
    { name: 'smell', rating: smellRating, icon: '👃' },
    { name: 'accessories', rating: accessoriesRating, icon: '🧴' }
  ];

  if (!showBreakdown) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-lg ${
                star <= Math.round(overallRating) ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-sm font-medium text-gray-600">
          {overallRating}/5
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">Overall Rating</span>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-lg ${
                  star <= Math.round(overallRating) ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-sm font-medium text-gray-600">
            {overallRating}/5
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-1 text-sm">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span>{category.icon}</span>
              <span className="capitalize text-gray-600">{category.name}</span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xs ${
                    star <= category.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Google Map Component with Current Location Support
const GoogleMap = ({ bathrooms, onMapClick, onMarkerClick, center = { lat: 37.7749, lng: -122.4194 } }) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocationMarker, setUserLocationMarker] = useState(null);

  const handleMapClick = useCallback((event) => {
    if (onMapClick) {
      onMapClick({
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      });
    }
  }, [onMapClick]);

  const handleMarkerClick = useCallback((bathroom) => {
    if (onMarkerClick) {
      onMarkerClick(bathroom);
    }
  }, [onMarkerClick]);

  const getCurrentLocation = useCallback(() => {
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Center the map on user location
          map.setCenter(pos);
          map.setZoom(15);

          // Remove previous user location marker if exists
          if (userLocationMarker) {
            userLocationMarker.setMap(null);
          }

          // Add user location marker
          const marker = new window.google.maps.Marker({
            position: pos,
            map: map,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
                  <circle cx="10" cy="10" r="3" fill="#FFFFFF"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(20, 20),
              anchor: new window.google.maps.Point(10, 10)
            }
          });

          setUserLocationMarker(marker);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Error getting your location. Please check your browser permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }, [map, userLocationMarker]);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
          center: center,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        mapInstance.addListener('click', handleMapClick);

        // Add current location button
        const locationButton = document.createElement('button');
        locationButton.textContent = '📍';
        locationButton.className = 'bg-white border-2 border-gray-300 rounded-md p-2 m-2 shadow-md hover:bg-gray-50';
        locationButton.title = 'Go to your location';
        locationButton.style.fontSize = '16px';
        locationButton.style.cursor = 'pointer';
        
        locationButton.addEventListener('click', () => {
          getCurrentLocation();
        });

        mapInstance.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(locationButton);

        setMap(mapInstance);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    if (!map) {
      initMap();
    }
  }, [center, handleMapClick, map, getCurrentLocation]);

  // Update map center when center prop changes
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
    }
  }, [map, center]);

  useEffect(() => {
    if (!map || !isLoaded || !bathrooms) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = bathrooms
      .filter(bathroom => bathroom.latitude && bathroom.longitude)
      .map(bathroom => {
        const marker = new window.google.maps.Marker({
          position: { lat: bathroom.latitude, lng: bathroom.longitude },
          map: map,
          title: bathroom.location,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3C10.05 3 6 7.05 6 12c0 7.5 9 15 9 15s9-7.5 9-15c0-4.95-4.05-9-9-9z" fill="#4285F4"/>
                <circle cx="15" cy="12" r="3.5" fill="white"/>
                <text x="15" y="14" text-anchor="middle" fill="#4285F4" font-size="8" font-weight="bold">${Math.round(bathroom.overall_rating)}</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(30, 30),
            anchor: new window.google.maps.Point(15, 30)
          }
        });

        marker.addListener('click', () => handleMarkerClick(bathroom));

        return marker;
      });

    setMarkers(newMarkers);
  }, [map, bathrooms, isLoaded, handleMarkerClick]);

  return <div id="map" className="w-full h-full rounded-lg shadow-lg" />;
};

// Mobile Camera Component
const MobileCamera = ({ onImageCapture, onClose }) => {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const info = await Device.getInfo();
        setIsNative(info.platform !== 'web');
      } catch (error) {
        setIsNative(false);
      }
    };
    checkDevice();
  }, []);

  const captureImage = async () => {
    try {
      if (isNative) {
        // Use native camera on mobile
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });
        
        // Convert dataUrl to file
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        
        onImageCapture(file, image.dataUrl);
      } else {
        // Fallback to file input on web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const url = URL.createObjectURL(file);
            onImageCapture(file, url);
          }
        };
        
        input.click();
      }
      onClose();
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Failed to capture image. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      if (isNative) {
        // Use native photo library on mobile
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos
        });
        
        // Convert dataUrl to file
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'gallery-photo.jpg', { type: 'image/jpeg' });
        
        onImageCapture(file, image.dataUrl);
      } else {
        // Fallback to file input on web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const url = URL.createObjectURL(file);
            onImageCapture(file, url);
          }
        };
        
        input.click();
      }
      onClose();
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      alert('Failed to select image. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Add Photo</h3>
          
          <div className="space-y-3">
            <button
              onClick={captureImage}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <span>📷</span>
              <span>Take Photo</span>
            </button>
            
            <button
              onClick={selectFromGallery}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center space-x-2"
            >
              <span>🖼️</span>
              <span>Choose from Gallery</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Geolocation Component
const MobileGeolocation = ({ onLocationFound, onError }) => {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const location = {
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude
      };

      onLocationFound(location);
    } catch (error) {
      console.error('Geolocation error:', error);
      onError('Failed to get current location. Please select manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={getCurrentLocation}
      disabled={loading}
      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center space-x-2"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Getting Location...</span>
        </>
      ) : (
        <>
          <span>📍</span>
          <span>Use Current Location</span>
        </>
      )}
    </button>
  );
};

const LocationAutocomplete = ({ onLocationSelect, selectedLocation, value, onChange }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const isManualInput = useRef(false);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        // Initialize Autocomplete
        const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry']
        });

        autocompleteInstance.addListener('place_changed', () => {
          // Only process if this is NOT a manual input
          if (isManualInput.current) {
            isManualInput.current = false;
            return;
          }

          const place = autocompleteInstance.getPlace();
          
          if (place.geometry && place.geometry.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            const locationText = place.name && place.formatted_address 
              ? `${place.name}, ${place.formatted_address}`
              : place.formatted_address || place.name || value;
            
            console.log('Autocomplete selected:', locationText, location);
            
            // Use setTimeout to prevent form re-render issues
            setTimeout(() => {
              onChange(locationText);
              if (onLocationSelect) {
                onLocationSelect(location);
              }
            }, 0);
          }
        });

        setAutocomplete(autocompleteInstance);
      } catch (error) {
        console.error('Error loading Google Places:', error);
      }
    };

    if (inputRef.current && !autocomplete && process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      initAutocomplete();
    }
  }, [onLocationSelect, onChange, value, autocomplete]);

  const handleInputChange = (e) => {
    isManualInput.current = true;
    const newValue = e.target.value;
    console.log('Manual input changing from:', value, 'to:', newValue);
    onChange(newValue);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      onFocus={() => { isManualInput.current = false; }}
      placeholder="Search for a place... (e.g., Starbucks, McDonald's, Mall)"
      required
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};

// Location Selector Component (Manual Map Selection with My Location)
const LocationSelector = ({ onLocationSelect, selectedLocation, onLocationTextChange }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [userLocationMarker, setUserLocationMarker] = useState(null);

const getCurrentLocation = useCallback(() => {
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Center the map on user location
          map.setCenter(location);
          map.setZoom(15);

          // Remove previous user location marker if exists
          if (userLocationMarker) {
            userLocationMarker.setMap(null);
          }

          // Add user location marker
          const newUserMarker = new window.google.maps.Marker({
            position: location,
            map: map,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
                  <circle cx="10" cy="10" r="3" fill="#FFFFFF"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(20, 20),
              anchor: new window.google.maps.Point(10, 10)
            }
          });

          setUserLocationMarker(newUserMarker);

          // Call onLocationSelect with the current location
          if (onLocationSelect) {
            onLocationSelect(location);
          }

          // Reverse geocode to get address
          if (onLocationTextChange) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const response = await geocoder.geocode({ location: location });
              
              if (response.results && response.results[0]) {
                const address = response.results[0].formatted_address;
                onLocationTextChange(address);
              }
            } catch (error) {
              console.error('Geocoding error:', error);
              // Fallback to coordinates if geocoding fails
              onLocationTextChange(`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Error getting your location. Please check your browser permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }, [map, userLocationMarker, onLocationSelect, onLocationTextChange]);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        const mapInstance = new window.google.maps.Map(document.getElementById('location-map'), {
          center: selectedLocation || { lat: 37.7749, lng: -122.4194 },
          zoom: 13,
        });

        mapInstance.addListener('click', async (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          
          if (onLocationSelect) {
            onLocationSelect(location);
          }

          // Reverse geocode to get address
          if (onLocationTextChange) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const response = await geocoder.geocode({ location: location });
              
              if (response.results && response.results[0]) {
                const address = response.results[0].formatted_address;
                onLocationTextChange(address);
              }
            } catch (error) {
              console.error('Geocoding error:', error);
              // Fallback to coordinates if geocoding fails
              onLocationTextChange(`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
            }
          }

          // Remove previous marker
          if (marker) {
            marker.setMap(null);
          }

          // Add red teardrop marker
          const newMarker = new window.google.maps.Marker({
            position: location,
            map: mapInstance,
            title: 'Selected Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="25" height="35" viewBox="0 0 25 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 22.5 12.5 22.5s12.5-11.6 12.5-22.5C25 5.6 19.4 0 12.5 0z" fill="#FF0000"/>
                  <circle cx="12.5" cy="12.5" r="4" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(25, 35),
              anchor: new window.google.maps.Point(12.5, 35)
            }
          });
          
          setMarker(newMarker);
        });
        
        setMap(mapInstance);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, [onLocationSelect, selectedLocation, onLocationTextChange]);

  // Update map center when selectedLocation changes
  useEffect(() => {
    if (map && selectedLocation) {
      map.setCenter(selectedLocation);
    }
  }, [map, selectedLocation]);

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Click on map to select location</span>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center space-x-1"
        >
          <span>📍</span>
          <span>My Location</span>
        </button>
      </div>
      
      <div className="w-full h-64 border rounded-lg overflow-hidden">
        <div id="location-map" className="w-full h-full" />
      </div>
      
      {selectedLocation && (
        <div className="p-2 bg-gray-50 text-sm text-gray-600 rounded">
          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};

// Upload Form Component
const UploadForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    image: null,
    vibeRating: 0,
    cleanlinessRating: 0,
    privacyRating: 0,
    smellRating: 0,
    accessoriesRating: 0,
    location: '',
    coordinates: null,
    comments: ''
  });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const info = await Device.getInfo();
        setIsNative(info.platform !== 'web');
      } catch (error) {
        setIsNative(false);
      }
    };
    checkDevice();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleMobileImageCapture = (file, dataUrl) => {
    setFormData(prev => ({ ...prev, image: file }));
    setPreviewUrl(dataUrl);
  };

  const handleLocationFound = (location) => {
    setFormData(prev => ({ 
      ...prev, 
      coordinates: location,
      location: prev.location || `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    }));
  };

  const handleLocationError = (error) => {
    alert(error);
  };

  const handleLocationSelect = (coordinates) => {
    setFormData(prev => ({ ...prev, coordinates }));
    setShowLocationSelector(true); // Show the map when coordinates are selected
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Debug logging
    console.log('Form submission attempt:', {
      hasImage: !!formData.image,
      imageType: formData.image?.type,
      imageSize: formData.image?.size,
      location: formData.location,
      locationLength: formData.location?.length,
      locationTrimmed: formData.location?.trim(),
      coordinates: formData.coordinates,
      ratings: {
        vibe: formData.vibeRating,
        cleanliness: formData.cleanlinessRating,
        privacy: formData.privacyRating,
        smell: formData.smellRating,
        accessories: formData.accessoriesRating
      },
      comments: formData.comments
    });
    
    // Validation with better error messages
    const missingFields = [];
    if (!formData.image) missingFields.push('Image');
    if (formData.vibeRating === 0) missingFields.push('Vibe rating');
    if (formData.cleanlinessRating === 0) missingFields.push('Cleanliness rating');
    if (formData.privacyRating === 0) missingFields.push('Privacy rating');
    if (formData.smellRating === 0) missingFields.push('Smell rating');
    if (formData.accessoriesRating === 0) missingFields.push('Accessories rating');
    if (!formData.location?.trim()) missingFields.push('Location');
    
    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      alert(`Please fill in all required fields:\n\n${missingFields.map(field => `• ${field}`).join('\n')}\n\nCurrent form state:\n• Image: ${formData.image ? '✓ Selected' : '✗ Missing'}\n• Ratings: ${[formData.vibeRating, formData.cleanlinessRating, formData.privacyRating, formData.smellRating, formData.accessoriesRating].filter(r => r > 0).length}/5 completed\n• Location: ${formData.location ? '✓ Filled' : '✗ Empty'}`);
      return;
    }

    // Basic profanity filter check
    const profanityList = ['damn', 'hell', 'shit', 'fuck', 'ass', 'bitch', 'bastard'];
    const checkProfanity = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      return profanityList.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
      });
    };

    if (checkProfanity(formData.comments) || checkProfanity(formData.location)) {
      if (!confirm('⚠️ Your submission may contain inappropriate language. Our community guidelines prohibit offensive content.\n\nSubmitting inappropriate content may result in content removal or account suspension.\n\nDo you want to review your submission?')) {
        return;
      }
    }

    setUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('image', formData.image);
      submitData.append('vibe_rating', formData.vibeRating);
      submitData.append('cleanliness_rating', formData.cleanlinessRating);
      submitData.append('privacy_rating', formData.privacyRating);
      submitData.append('smell_rating', formData.smellRating);
      submitData.append('accessories_rating', formData.accessoriesRating);
      submitData.append('location', formData.location);
      submitData.append('comments', formData.comments);
      
      // Debug: Log what we're actually sending
      console.log('FormData contents:');
      for (let [key, value] of submitData.entries()) {
        console.log(`${key}:`, value);
      }
      
      if (formData.coordinates) {
        submitData.append('latitude', formData.coordinates.lat);
        submitData.append('longitude', formData.coordinates.lng);
      }

      console.log('Making API request to:', `${API}/bathrooms`);
      const response = await axios.post(`${API}/bathrooms`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData({
        image: null,
        vibeRating: 0,
        cleanlinessRating: 0,
        privacyRating: 0,
        smellRating: 0,
        accessoriesRating: 0,
        location: '',
        coordinates: null,
        comments: ''
      });
      setPreviewUrl(null);
      setShowLocationSelector(false);
      
      e.target.reset();
      
      onSuccess(response.data);
      alert('Restroom review uploaded successfully!');
    } catch (error) {
      console.error('Upload failed - Full error details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      let errorMessage = 'Failed to upload Restroom review. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage += `\n\nError details: ${error.response.data.detail}`;
      } else if (error.response?.data?.message) {
        errorMessage += `\n\nError details: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `\n\nError details: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Rate a Restroom</h2>
        {user && (
          <div className="text-sm text-gray-600">
            Signed in as <span className="font-medium">{user.full_name}</span>
          </div>
        )}
      </div>
      
      {/* Image Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Photo *
        </label>
        
        {isNative ? (
          // Mobile-optimized upload
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowMobileCamera(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <span>📷</span>
              <span>Add Photo</span>
            </button>
          </div>
        ) : (
          // Web file input
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        )}
        
        {previewUrl && (
          <div className="mt-4">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Categorical Ratings */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Rate Each Category * 
          <span className="text-xs text-gray-500 ml-2">(All categories required)</span>
        </label>
        <div className="space-y-3">
          <CategoryRating
            category="vibe"
            rating={formData.vibeRating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, vibeRating: rating }))}
            icon="💫"
          />
          <CategoryRating
            category="cleanliness"
            rating={formData.cleanlinessRating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, cleanlinessRating: rating }))}
            icon="🧼"
          />
          <CategoryRating
            category="privacy"
            rating={formData.privacyRating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, privacyRating: rating }))}
            icon="🧴"
          />
          <CategoryRating
            category="smell"
            rating={formData.smellRating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, smellRating: rating }))}
            icon="👃"
          />
          <CategoryRating
            category="accessories"
            rating={formData.accessoriesRating}
            onRatingChange={(rating) => setFormData(prev => ({ ...prev, accessoriesRating: rating }))}
            icon="🧴"
          />
        </div>
        
        {/* Overall Rating Preview */}
        {(formData.vibeRating > 0 || formData.cleanlinessRating > 0 || formData.privacyRating > 0 || 
          formData.smellRating > 0 || formData.accessoriesRating > 0) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <OverallRating
              vibeRating={formData.vibeRating}
              cleanlinessRating={formData.cleanlinessRating}
              privacyRating={formData.privacyRating}
              smellRating={formData.smellRating}
              accessoriesRating={formData.accessoriesRating}
              overallRating={(formData.vibeRating + formData.cleanlinessRating + formData.privacyRating + 
                formData.smellRating + formData.accessoriesRating) / 5}
              showBreakdown={true}
            />
          </div>
        )}
      </div>

      {/* Location with Autocomplete */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location * 
          <span className="text-xs text-gray-500 ml-2">(Search for businesses, addresses, landmarks)</span>
        </label>
        <LocationAutocomplete
          value={formData.location}
          onChange={(location) => setFormData(prev => ({ ...prev, location }))}
          onLocationSelect={(coordinates) => setFormData(prev => ({ ...prev, coordinates }))}
          selectedLocation={formData.coordinates}
        />
        {formData.coordinates && (
          <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            ✓ Location found with coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
          </div>
        )}
        
        {formData.location && !formData.coordinates && (
          <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            📍 Manual location text entered: "{formData.location}"
            <br />
            <span className="text-xs">Coordinates will be geocoded automatically or can be set manually below</span>
          </div>
        )}
        
        {/* Mobile Geolocation */}
        {isNative && (
          <div className="mt-3">
            <MobileGeolocation 
              onLocationFound={handleLocationFound}
              onError={handleLocationError}
            />
          </div>
        )}
      </div>

      {/* Manual Location Selector (Optional) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Manual Location Selection (optional)
          </label>
          <button
            type="button"
            onClick={() => setShowLocationSelector(!showLocationSelector)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {showLocationSelector ? 'Hide Manual Map' : 'Show Manual Map'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Use this if you want to manually click on the map to select coordinates
        </p>
              {showLocationSelector && (
          <LocationSelector 
            onLocationSelect={(coordinates) => setFormData(prev => ({ ...prev, coordinates }))}
            onLocationTextChange={(location) => setFormData(prev => ({ ...prev, location }))}
            selectedLocation={formData.coordinates}
          />
        )}
        {formData.coordinates && !showLocationSelector && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            📍 Coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comments (optional)
        </label>
        <textarea
          value={formData.comments}
          onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
          placeholder="Share your thoughts about this Restroom..."
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {uploading ? 'Uploading...' : 'Submit Rating'}
      </button>
      
      {/* Mobile Camera Modal */}
      {showMobileCamera && (
        <MobileCamera
          onImageCapture={handleMobileImageCapture}
          onClose={() => setShowMobileCamera(false)}
        />
      )}
    </form>
  );
};

// Bathroom Card Component
const BathroomCard = ({ bathroom, onClick, onReport }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReportClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onReport) {
      onReport(bathroom);
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={() => onClick && onClick(bathroom)}
    >
      {/* Report Button */}
      <button
        onClick={handleReportClick}
        className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 px-2 py-1 rounded text-xs font-medium shadow-md z-10"
        title="Report this content"
      >
        🚩 Report
      </button>

      <img
        src={`${BACKEND_URL}${bathroom.image_url}`}
        alt="Restroom"
        className="w-full h-48 object-cover"
        onError={(e) => {
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KICA8L3N2Zz4K';
        }}
      />
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800 truncate flex-1">
            {bathroom.location}
          </h3>
          <div className="ml-2">
            <OverallRating
              vibeRating={bathroom.vibe_rating}
              cleanlinessRating={bathroom.cleanliness_rating}
              privacyRating={bathroom.privacy_rating}
              smellRating={bathroom.smell_rating}
              accessoriesRating={bathroom.accessories_rating}
              overallRating={bathroom.overall_rating}
              showBreakdown={false}
              readonly={true}
            />
          </div>
        </div>
        
        {bathroom.user_name && (
          <div className="flex items-center text-xs text-gray-500 mb-2">
            <span className="mr-1">👤</span>
            <span>by {bathroom.user_name}</span>
          </div>
        )}
        
        {bathroom.latitude && bathroom.longitude && (
          <div className="flex items-center text-xs text-blue-600 mb-2">
            <span className="mr-1">📍</span>
            <span>Mapped Location</span>
          </div>
        )}
        
        {bathroom.comments && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {bathroom.comments}
          </p>
        )}
        
        <p className="text-xs text-gray-500">
          {formatDate(bathroom.timestamp)}
        </p>
      </div>
    </div>
  );
};

// Bathroom Detail Modal
const BathroomModal = ({ bathroom, isOpen, onClose, onReportContent, onReportUser, onBlockUser, currentUserId }) => {
  if (!isOpen || !bathroom) return null;

  const isOwnReview = currentUserId === bathroom.user_id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{bathroom.location}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4">
            <img
              src={`${BACKEND_URL}${bathroom.image_url}`}
              alt="Restroom"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <OverallRating
                vibeRating={bathroom.vibe_rating}
                cleanlinessRating={bathroom.cleanliness_rating}
                privacyRating={bathroom.privacy_rating}
                smellRating={bathroom.smell_rating}
                accessoriesRating={bathroom.accessories_rating}
                overallRating={bathroom.overall_rating}
                showBreakdown={true}
                readonly={true}
              />
            </div>

            {bathroom.user_name && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Reviewed by:</span>
                <span className="text-sm text-gray-600">{bathroom.user_name}</span>
              </div>
            )}
            
            {bathroom.latitude && bathroom.longitude && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Coordinates:</span>
                <span className="text-sm text-gray-600">
                  {bathroom.latitude.toFixed(6)}, {bathroom.longitude.toFixed(6)}
                </span>
              </div>
            )}
            
            {bathroom.comments && (
              <div>
                <span className="font-medium">Comments:</span>
                <p className="text-gray-600 text-sm mt-1">{bathroom.comments}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Added:</span>
              <span className="text-sm text-gray-600">
                {new Date(bathroom.timestamp).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Action Buttons */}
            {!isOwnReview && (
              <div className="pt-4 border-t space-y-2">
                <button
                  onClick={() => {
                    onReportContent(bathroom);
                    onClose();
                  }}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
                >
                  🚩 Report This Review
                </button>
                
                {bathroom.user_id && (
                  <>
                    <button
                      onClick={() => {
                        onReportUser(bathroom);
                        onClose();
                      }}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
                    >
                      ⚠️ Report User
                    </button>
                    
                    <button
                      onClick={() => onBlockUser(bathroom.user_id, bathroom.user_name)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      🚫 Block User
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component  
function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

// Report Modal Component
const ReportModal = ({ isOpen, onClose, contentType, contentId, contentTitle, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    'Inappropriate Content',
    'Spam',
    'Offensive Language',
    'Harassment',
    'False Information',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      alert('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        content_type: contentType,
        content_id: contentId,
        reason: reason,
        description: description
      });
      
      setReason('');
      setDescription('');
      onClose();
      alert('Report submitted successfully. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Report Content</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Reporting: <span className="font-medium">{contentTitle}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                {reportReasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                placeholder="Provide more information about why you're reporting this content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Main App Content
function MainApp() {
  const { user, logout, loading } = useAuth();
  const [bathrooms, setBathrooms] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [view, setView] = useState('upload');
  const [selectedBathroom, setSelectedBathroom] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  
  // Report Content System state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState(null);
  
  // Blocked users list (stored in localStorage)
  const [blockedUsers, setBlockedUsers] = useState(() => {
    const stored = localStorage.getItem('blockedUsers');
    return stored ? JSON.parse(stored) : [];
  });

  const fetchBathrooms = async () => {
    try {
      const response = await axios.get(`${API}/bathrooms`);
      // Filter out reviews from blocked users
      const filtered = response.data.filter(b => !blockedUsers.includes(b.user_id));
      setBathrooms(filtered);
    } catch (error) {
      console.error('Failed to fetch bathrooms:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchBathrooms();
  }, [blockedUsers]);
  
  // Handle Report Submission
  const handleReportSubmit = async (reportData) => {
    try {
      await axios.post(`${API}/reports`, reportData);
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw error;
    }
  };
  
  // Handle Block User
  const handleBlockUser = (userId, userName) => {
    if (!userId) {
      alert('Cannot block this user');
      return;
    }
    
    if (confirm(`Are you sure you want to block ${userName}? You will no longer see their reviews.`)) {
      const updated = [...blockedUsers, userId];
      setBlockedUsers(updated);
      localStorage.setItem('blockedUsers', JSON.stringify(updated));
      
      // Close modal if open
      if (showModal) {
        setShowModal(false);
        setSelectedBathroom(null);
      }
      
      alert(`${userName} has been blocked.`);
      
      // Refresh bathrooms to apply filter
      fetchBathrooms();
    }
  };
  
  // Basic Profanity Filter
  const profanityList = ['badword1', 'badword2', 'offensive']; // Add actual words as needed
  const checkProfanity = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
  };

  const handleUploadSuccess = (newBathroom) => {
    setBathrooms([newBathroom, ...bathrooms]);
    setView('gallery');
  };

  const [selectedMapCenter, setSelectedMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });

  const handleMarkerClick = (bathroom) => {
    setSelectedBathroom(bathroom);
    setShowModal(true);
  };

  const handleGalleryItemClick = (bathroom) => {
    setSelectedBathroom(bathroom);
    setShowModal(true);
    
    // If the bathroom has coordinates, update map center for when user switches to map view
    if (bathroom.latitude && bathroom.longitude) {
      setMapCenter({ lat: bathroom.latitude, lng: bathroom.longitude });
      console.log('Gallery item clicked, setting map center to:', { lat: bathroom.latitude, lng: bathroom.longitude });
    }
  };

  const bathroomsWithCoordinates = bathrooms.filter(b => b.latitude && b.longitude);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">🚽 Restroom Review</h1>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setView('upload')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    view === 'upload' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Rate Restroom
                </button>
                <button
                  onClick={() => setView('gallery')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    view === 'gallery' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Browse Gallery ({bathrooms.length})
                </button>
                <button
                  onClick={() => setView('map')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    view === 'map' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Map View ({bathroomsWithCoordinates.length})
                </button>
              </nav>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Hello, {user.full_name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <UploadForm onSuccess={handleUploadSuccess} />
          </div>
        )}

        {view === 'gallery' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Recent Restroom Reviews
              </h2>
              <p className="text-gray-600">
                {bathrooms.length} {bathrooms.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {dataLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading Restroom reviews...</p>
              </div>
            ) : bathrooms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg mb-4">No Restroom reviews yet!</p>
                <button
                  onClick={() => setView('upload')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Rate Your First Restroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {bathrooms.map((bathroom) => (
                  <BathroomCard 
                    key={bathroom.id} 
                    bathroom={bathroom} 
                    onClick={handleGalleryItemClick}
                    onReport={(bathroom) => {
                      setReportContent(bathroom);
                      setReportModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'map' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Restroom Locations Map
              </h2>
              <p className="text-gray-600">
                {bathroomsWithCoordinates.length} mapped locations
              </p>
            </div>

            {bathroomsWithCoordinates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg mb-4">No mapped Restroom locations yet!</p>
                <p className="text-gray-400 mb-4">Add location coordinates when rating Restrooms to see them on the map.</p>
                <button
                  onClick={() => setView('upload')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Rate a Restroom with Location
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-96 lg:h-[500px]">
                  <GoogleMap
                    bathrooms={bathroomsWithCoordinates}
                    onMarkerClick={handleMarkerClick}
                    center={mapCenter}
                  />
                </div>
                <div className="p-4 bg-gray-50 text-sm text-gray-600">
                  💡 Click on map markers to view Restroom details. Markers show the rating number.
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bathroom Detail Modal */}
      <BathroomModal
        bathroom={selectedBathroom}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentUserId={user?.id}
        onReportContent={(bathroom) => {
          setReportContent(bathroom);
          setReportModalOpen(true);
        }}
        onReportUser={(bathroom) => {
          setReportContent({
            ...bathroom,
            reportType: 'user'
          });
          setReportModalOpen(true);
        }}
        onBlockUser={handleBlockUser}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportContent(null);
        }}
        contentType={reportContent?.reportType === 'user' ? 'user' : 'review'}
        contentId={reportContent?.reportType === 'user' ? reportContent?.user_id : reportContent?.id}
        contentTitle={reportContent?.reportType === 'user' 
          ? `User: ${reportContent?.user_name}` 
          : reportContent?.location}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}

export default App;
