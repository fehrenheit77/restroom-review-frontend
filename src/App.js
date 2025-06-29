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
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister 
        ? { email: formData.email, password: formData.password, full_name: formData.full_name }
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🚽 Welcome to Loo Review
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
              onClick={() => setAuthMethod('google')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                authMethod === 'google'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Google
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {authMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
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

          {authMethod === 'google' && (
            <div className="space-y-4">
              <div className="w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Login Failed')}
                  text={isRegister ? "signup_with" : "signin_with"}
                  width="320"
                  theme="outline"
                  size="large"
                />
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
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
  sinkRating, 
  floorRating, 
  toiletRating, 
  smellRating, 
  nicenessRating, 
  overallRating,
  showBreakdown = false,
  readonly = true 
}) => {
  const categories = [
    { name: 'sink', rating: sinkRating, icon: '🚰' },
    { name: 'floor', rating: floorRating, icon: '🧽' },
    { name: 'toilet', rating: toiletRating, icon: '🚽' },
    { name: 'smell', rating: smellRating, icon: '👃' },
    { name: 'niceness', rating: nicenessRating, icon: '✨' }
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

// Google Map Component
const GoogleMap = ({ bathrooms, onMapClick, onMarkerClick, center = { lat: 37.7749, lng: -122.4194 } }) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

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

        setMap(mapInstance);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    if (!map) {
      initMap();
    }
  }, [center, handleMapClick, map]);

  useEffect(() => {
    if (!map || !isLoaded || !bathrooms) return;

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

// FIXED LocationAutocomplete Component - Now Properly Persists Both Text and Coordinates
const LocationAutocomplete = ({ onLocationSelect, selectedLocation, value, onChange }) => {
  const [autocomplete, setAutocomplete] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry']
        });

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          
          console.log('🗺️ Place selected:', place);
          
          if (place.geometry && place.geometry.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            const locationText = place.name && place.formatted_address 
              ? `${place.name}, ${place.formatted_address}`
              : place.formatted_address || place.name || '';
            
            console.log('📍 Setting location:', locationText, location);
            
            // CRITICAL FIX: Set both location text AND coordinates at the same time
            if (locationText.trim()) {
              onChange(locationText);
              if (onLocationSelect) {
                onLocationSelect(location);
              }
            }
          }
        });

        setAutocomplete(autocompleteInstance);
      } catch (error) {
        console.error('Error loading Google Places:', error);
      }
    };

    if (inputRef.current && !autocomplete) {
      initAutocomplete();
    }
  }, [onLocationSelect, onChange, autocomplete]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // If user manually clears or edits significantly, clear coordinates
    if (!newValue.trim() || (selectedLocation && newValue.length < value.length * 0.5)) {
      if (onLocationSelect) {
        onLocationSelect(null);
      }
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder="Search for a place... (e.g., Starbucks, McDonald's, Mall)"
        required
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          selectedLocation 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-300'
        }`}
      />
      
      {selectedLocation && value.trim() && (
        <div className="absolute right-2 top-2 text-green-600">
          <span title="Location coordinates found">📍</span>
        </div>
      )}
      
      {value.trim() && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onLocationSelect(null);
          }}
          className="absolute right-8 top-2 text-gray-400 hover:text-gray-600"
          title="Clear location"
        >
          ×
        </button>
      )}
    </div>
  );
};

// Location Selector Component (Manual Map Selection)
const LocationSelector = ({ onLocationSelect, selectedLocation }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

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
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 13,
        });

        mapInstance.addListener('click', (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          
          console.log('🗺️ Map clicked:', location);
          
          if (onLocationSelect) {
            onLocationSelect(location);
          }

          if (marker) {
            marker.setMap(null);
          }

          const newMarker = new window.google.maps.Marker({
            position: location,
            map: mapInstance,
            title: 'Selected Location'
          });
          
          setMarker(newMarker);
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, [onLocationSelect]);

  // Update map center when selectedLocation changes from autocomplete
  useEffect(() => {
    if (map && selectedLocation) {
      console.log('🗺️ Updating map center to:', selectedLocation);
      
      const newCenter = { lat: selectedLocation.lat, lng: selectedLocation.lng };
      map.setCenter(newCenter);
      map.setZoom(15);
      
      if (marker) {
        marker.setMap(null);
      }
      
      const newMarker = new window.google.maps.Marker({
        position: newCenter,
        map: map,
        title: 'Selected Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 2C8.5 2 5.5 5 5.5 9c0 6 7 12 7 12s7-6 7-12c0-4-3-7-7-7z" fill="#FF4444"/>
              <circle cx="12.5" cy="9" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(25, 25),
          anchor: new window.google.maps.Point(12.5, 25)
        }
      });
      
      setMarker(newMarker);
    }
  }, [map, selectedLocation]);

  return (
    <div className="w-full h-64 border rounded-lg overflow-hidden">
      <div id="location-map" className="w-full h-full" />
      {selectedLocation && (
        <div className="p-2 bg-gray-50 text-sm text-gray-600">
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
    sinkRating: 0,
    floorRating: 0,
    toiletRating: 0,
    smellRating: 0,
    nicenessRating: 0,
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
      setFormData({ ...formData, image: file });
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleMobileImageCapture = (file, dataUrl) => {
    setFormData({ ...formData, image: file });
    setPreviewUrl(dataUrl);
  };

  const handleLocationFound = (location) => {
    console.log('📍 Location found via geolocation:', location);
    setFormData({ 
      ...formData, 
      coordinates: location,
      location: formData.location || `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    });
  };

  const handleLocationError = (error) => {
    alert(error);
  };

  const handleLocationSelect = (coordinates) => {
    console.log('📍 Location selected:', coordinates);
    setFormData({ ...formData, coordinates });
  };

  const handleLocationChange = (locationText) => {
    console.log('📝 Location text changed:', locationText);
    setFormData({ ...formData, location: locationText });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Form submission started');
    console.log('📋 Current form data:', {
      hasImage: !!formData.image,
      sinkRating: formData.sinkRating,
      floorRating: formData.floorRating,
      toiletRating: formData.toiletRating,
      smellRating: formData.smellRating,
      nicenessRating: formData.nicenessRating,
      location: formData.location,
      locationLength: formData.location.length,
      locationTrimmed: formData.location.trim(),
      comments: formData.comments,
      coordinates: formData.coordinates
    });

    // Enhanced validation with specific error messages
    const missingFields = [];
    
    if (!formData.image) missingFields.push('Photo');
    if (formData.sinkRating === 0) missingFields.push('Sink rating');
    if (formData.floorRating === 0) missingFields.push('Floor rating');
    if (formData.toiletRating === 0) missingFields.push('Toilet rating');
    if (formData.smellRating === 0) missingFields.push('Smell rating');
    if (formData.nicenessRating === 0) missingFields.push('Niceness rating');
    if (!formData.location || !formData.location.trim()) missingFields.push('Location');

    if (missingFields.length > 0) {
      const errorMsg = `Please fill in these required fields: ${missingFields.join(', ')}`;
      alert(errorMsg);
      console.log('❌ Validation failed:', errorMsg);
      return;
    }

    setUploading(true);
    console.log('✅ Validation passed, submitting...');

    try {
      const submitData = new FormData();
      submitData.append('image', formData.image);
      submitData.append('sink_rating', formData.sinkRating);
      submitData.append('floor_rating', formData.floorRating);
      submitData.append('toilet_rating', formData.toiletRating);
      submitData.append('smell_rating', formData.smellRating);
      submitData.append('niceness_rating', formData.nicenessRating);
      submitData.append('location', formData.location.trim());
      submitData.append('comments', formData.comments);
      
      if (formData.coordinates) {
        submitData.append('latitude', formData.coordinates.lat);
        submitData.append('longitude', formData.coordinates.lng);
      }

      console.log('📤 Sending POST request to:', `${API}/bathrooms`);
      
      const response = await axios.post(`${API}/bathrooms`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📨 Server response:', response.data);

      // Check for success response
      if (response.data && (response.data.success || response.data.id)) {
        console.log('✅ Upload successful!');
        
        // Reset form
        const newFormData = {
          image: null,
          sinkRating: 0,
          floorRating: 0,
          toiletRating: 0,
          smellRating: 0,
          nicenessRating: 0,
          location: '',
          coordinates: null,
          comments: ''
        };
        
        setFormData(newFormData);
        setPreviewUrl(null);
        setShowLocationSelector(false);
        
        // Call success callback
        const bathroomData = response.data.bathroom || response.data;
        onSuccess(bathroomData);
        
        alert('🎉 Loo review uploaded successfully!');
      } else {
        throw new Error('Server did not confirm successful upload');
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed';
      alert(`Failed to upload loo review: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Rate a Loo</h2>
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
            category="sink"
            rating={formData.sinkRating}
            onRatingChange={(rating) => setFormData({ ...formData, sinkRating: rating })}
            icon="🚰"
          />
          <CategoryRating
            category="floor"
            rating={formData.floorRating}
            onRatingChange={(rating) => setFormData({ ...formData, floorRating: rating })}
            icon="🧽"
          />
          <CategoryRating
            category="toilet"
            rating={formData.toiletRating}
            onRatingChange={(rating) => setFormData({ ...formData, toiletRating: rating })}
            icon="🚽"
          />
          <CategoryRating
            category="smell"
            rating={formData.smellRating}
            onRatingChange={(rating) => setFormData({ ...formData, smellRating: rating })}
            icon="👃"
          />
          <CategoryRating
            category="niceness"
            rating={formData.nicenessRating}
            onRatingChange={(rating) => setFormData({ ...formData, nicenessRating: rating })}
            icon="✨"
          />
        </div>
        
        {/* Overall Rating Preview */}
        {(formData.sinkRating > 0 || formData.floorRating > 0 || formData.toiletRating > 0 || 
          formData.smellRating > 0 || formData.nicenessRating > 0) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <OverallRating
              sinkRating={formData.sinkRating}
              floorRating={formData.floorRating}
              toiletRating={formData.toiletRating}
              smellRating={formData.smellRating}
              nicenessRating={formData.nicenessRating}
              overallRating={(formData.sinkRating + formData.floorRating + formData.toiletRating + 
                formData.smellRating + formData.nicenessRating) / 5}
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
          onChange={handleLocationChange}
          onLocationSelect={handleLocationSelect}
          selectedLocation={formData.coordinates}
        />
        {formData.coordinates && formData.location.trim() && (
          <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            ✓ Location found with coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
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
            onLocationSelect={handleLocationSelect}
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
          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          placeholder="Share your thoughts about this loo..."
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {uploading ? 'Uploading Review...' : 'Submit Rating'}
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
const BathroomCard = ({ bathroom, onClick, onDelete, currentUserId }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent card click
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await onDelete(bathroom.id);
      } catch (error) {
        alert('Failed to delete review. Please try again.');
      }
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={() => onClick && onClick(bathroom)}
    >
      {/* Delete button for user's own reviews */}
      {currentUserId === bathroom.user_id && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 z-10"
          title="Delete review"
        >
          ×
        </button>
      )}
      
      <img
        src={`${BACKEND_URL}${bathroom.image_url}`}
        alt="Loo"
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
              sinkRating={bathroom.sink_rating}
              floorRating={bathroom.floor_rating}
              toiletRating={bathroom.toilet_rating}
              smellRating={bathroom.smell_rating}
              nicenessRating={bathroom.niceness_rating}
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
const BathroomModal = ({ bathroom, isOpen, onClose }) => {
  if (!isOpen || !bathroom) return null;

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
              alt="Loo"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <OverallRating
                sinkRating={bathroom.sink_rating}
                floorRating={bathroom.floor_rating}
                toiletRating={bathroom.toilet_rating}
                smellRating={bathroom.smell_rating}
                nicenessRating={bathroom.niceness_rating}
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

// Main App Content
function MainApp() {
  const { user, logout, loading } = useAuth();
  const [bathrooms, setBathrooms] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [view, setView] = useState('upload');
  const [selectedBathroom, setSelectedBathroom] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchBathrooms = async () => {
    try {
      const response = await axios.get(`${API}/bathrooms`);
      setBathrooms(response.data);
    } catch (error) {
      console.error('Failed to fetch bathrooms:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchBathrooms();
  }, []);

  const handleUploadSuccess = (newBathroom) => {
    console.log('🎉 Upload success callback triggered', newBathroom);
    setBathrooms([newBathroom, ...bathrooms]);
    setView('gallery');
  };

  const handleMarkerClick = (bathroom) => {
    setSelectedBathroom(bathroom);
    setShowModal(true);
  };

  const handleDeleteReview = async (bathroomId) => {
    try {
      await axios.delete(`${API}/bathrooms/${bathroomId}`);
      setBathrooms(bathrooms.filter(b => b.id !== bathroomId));
      alert('Review deleted successfully!');
    } catch (error) {
      console.error('Failed to delete review:', error);
      throw error;
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
            <h1 className="text-3xl font-bold text-gray-900">🚽 Loo Review</h1>
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
                  Rate Loo
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
                Recent Loo Reviews
              </h2>
              <p className="text-gray-600">
                {bathrooms.length} {bathrooms.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {dataLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading loo reviews...</p>
              </div>
            ) : bathrooms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg mb-4">No loo reviews yet!</p>
                <button
                  onClick={() => setView('upload')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Rate Your First Loo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {bathrooms.map((bathroom) => (
                  <BathroomCard 
                    key={bathroom.id} 
                    bathroom={bathroom} 
                    currentUserId={user.id}
                    onClick={(bathroom) => {
                      setSelectedBathroom(bathroom);
                      setShowModal(true);
                    }}
                    onDelete={handleDeleteReview}
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
                Loo Locations Map
              </h2>
              <p className="text-gray-600">
                {bathroomsWithCoordinates.length} mapped locations
              </p>
            </div>

            {bathroomsWithCoordinates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg mb-4">No mapped loo locations yet!</p>
                <p className="text-gray-400 mb-4">Add location coordinates when rating loos to see them on the map.</p>
                <button
                  onClick={() => setView('upload')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Rate a Loo with Location
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-96 lg:h-[500px]">
                  <GoogleMap
                    bathrooms={bathroomsWithCoordinates}
                    onMarkerClick={handleMarkerClick}
                  />
                </div>
                <div className="p-4 bg-gray-50 text-sm text-gray-600">
                  💡 Click on map markers to view loo details. Markers show the rating number.
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
      />
    </div>
  );
}

export default App;
