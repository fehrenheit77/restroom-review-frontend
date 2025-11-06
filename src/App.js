
Action: file_editor view /app/frontend/src/App.js
Observation: /app/frontend/src/App.js:
1|import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
2|import "./App.css";
3|import axios from "axios";
4|import { Loader } from '@googlemaps/js-api-loader';
5|import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
6|import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
7|import { Geolocation } from '@capacitor/geolocation';
8|import { Device } from '@capacitor/device';
9|
10|const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
11|const API = `${BACKEND_URL}/api`;
12|
13|// Authentication Context
14|const AuthContext = createContext();
15|
16|export const useAuth = () => {
17|  const context = useContext(AuthContext);
18|  if (!context) {
19|    throw new Error('useAuth must be used within an AuthProvider');
20|  }
21|  return context;
22|};
23|
24|// Auth Provider Component
25|const AuthProvider = ({ children }) => {
26|  const [user, setUser] = useState(null);
27|  const [token, setToken] = useState(localStorage.getItem('token'));
28|  const [loading, setLoading] = useState(true);
29|
30|  useEffect(() => {
31|    if (token) {
32|      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
33|      fetchUser();
34|    } else {
35|      setLoading(false);
36|    }
37|  }, [token]);
38|
39|  const fetchUser = async () => {
40|    try {
41|      const response = await axios.get(`${API}/auth/me`);
42|      setUser(response.data);
43|    } catch (error) {
44|      logout();
45|    } finally {
46|      setLoading(false);
47|    }
48|  };
49|
50|  const login = (tokenData) => {
51|    const { access_token, user: userData } = tokenData;
52|    setToken(access_token);
53|    setUser(userData);
54|    localStorage.setItem('token', access_token);
55|    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
56|  };
57|
58|  const logout = () => {
59|    setToken(null);
60|    setUser(null);
61|    localStorage.removeItem('token');
62|    delete axios.defaults.headers.common['Authorization'];
63|  };
64|
65|  const value = {
66|    user,
67|    token,
68|    login,
69|    logout,
70|    loading
71|  };
72|
73|  return (
74|    <AuthContext.Provider value={value}>
75|      {children}
76|    </AuthContext.Provider>
77|  );
78|};
79|
80|// Login Component
81|const Login = () => {
82|  const { login } = useAuth();
83|  const [authMethod, setAuthMethod] = useState('email');
84|  const [formData, setFormData] = useState({
85|    email: '',
86|    password: '',
87|    full_name: '',
88|    confirmPassword: ''
89|  });
90|  const [isRegister, setIsRegister] = useState(false);
91|  const [loading, setLoading] = useState(false);
92|  const [error, setError] = useState('');
93|
94|  const handleInputChange = (e) => {
95|    setFormData({
96|      ...formData,
97|      [e.target.name]: e.target.value
98|    });
99|    setError('');
100|  };
101|
102|  const handleEmailLogin = async (e) => {
103|    e.preventDefault();
104|    setLoading(true);
105|    setError('');
106|
107|    try {
108|      const endpoint = isRegister ? '/auth/register' : '/auth/login';
109|      const payload = isRegister 
110|        ? { email: formData.email, password: formData.password, full_name: formData.full_name }
111|        : { email: formData.email, password: formData.password };
112|
113|      if (isRegister && formData.password !== formData.confirmPassword) {
114|        setError('Passwords do not match');
115|        setLoading(false);
116|        return;
117|      }
118|
119|      const response = await axios.post(`${API}${endpoint}`, payload);
120|      login(response.data);
121|    } catch (error) {
122|      setError(error.response?.data?.detail || 'Authentication failed');
123|    } finally {
124|      setLoading(false);
125|    }
126|  };
127|
128|  const handleGoogleSuccess = async (credentialResponse) => {
129|    try {
130|      setLoading(true);
131|      setError('');
132|      
133|      const response = await axios.post(`${API}/auth/google`, {
134|        credential: credentialResponse.credential
135|      });
136|      
137|      login(response.data);
138|    } catch (error) {
139|      setError(error.response?.data?.detail || 'Google login failed');
140|    } finally {
141|      setLoading(false);
142|    }
143|  };
144|
145|  return (
146|    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
147|      <div className="max-w-md w-full space-y-8">
148|        <div>
149|          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
150|            🚽 Welcome to Loo Review
151|          </h2>
152|          <p className="mt-2 text-center text-sm text-gray-600">
153|            {isRegister ? 'Create your account' : 'Sign in to your account'}
154|          </p>
155|        </div>
156|
157|        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
158|          {/* Auth Method Selector */}
159|          <div className="flex rounded-md shadow-sm">
160|            <button
161|              onClick={() => setAuthMethod('email')}
162|              className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
163|                authMethod === 'email'
164|                  ? 'bg-blue-600 text-white border-blue-600'
165|                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
166|              }`}
167|            >
168|              Email
169|            </button>
170|            <button
171|              onClick={() => setAuthMethod('google')}
172|              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
173|                authMethod === 'google'
174|                  ? 'bg-blue-600 text-white border-blue-600'
175|                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
176|              }`}
177|            >
178|              Google
179|            </button>
180|          </div>
181|
182|          {error && (
183|            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
184|              {error}
185|            </div>
186|          )}
187|
188|          {authMethod === 'email' && (
189|            <form onSubmit={handleEmailLogin} className="space-y-4">
190|              {isRegister && (
191|                <div>
192|                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
193|                  <input
194|                    type="text"
195|                    name="full_name"
196|                    value={formData.full_name}
197|                    onChange={handleInputChange}
198|                    required
199|                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
200|                    placeholder="Your full name"
201|                  />
202|                </div>
203|              )}
204|
205|              <div>
206|                <label className="block text-sm font-medium text-gray-700">Email</label>
207|                <input
208|                  type="email"
209|                  name="email"
210|                  value={formData.email}
211|                  onChange={handleInputChange}
212|                  required
213|                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
214|                  placeholder="your.email@example.com"
215|                />
216|              </div>
217|
218|              <div>
219|                <label className="block text-sm font-medium text-gray-700">Password</label>
220|                <input
221|                  type="password"
222|                  name="password"
223|                  value={formData.password}
224|                  onChange={handleInputChange}
225|                  required
226|                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
227|                  placeholder="••••••••"
228|                />
229|              </div>
230|
231|              {isRegister && (
232|                <div>
233|                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
234|                  <input
235|                    type="password"
236|                    name="confirmPassword"
237|                    value={formData.confirmPassword}
238|                    onChange={handleInputChange}
239|                    required
240|                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
241|                    placeholder="••••••••"
242|                  />
243|                </div>
244|              )}
245|
246|              <button
247|                type="submit"
248|                disabled={loading}
249|                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
250|              >
251|                {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
252|              </button>
253|            </form>
254|          )}
255|
256|          {authMethod === 'google' && (
257|            <div className="space-y-4">
258|              <div className="w-full">
259|                <GoogleLogin
260|                  onSuccess={handleGoogleSuccess}
261|                  onError={() => setError('Google Login Failed')}
262|                  text={isRegister ? "signup_with" : "signin_with"}
263|                  width="320"
264|                  theme="outline"
265|                  size="large"
266|                />
267|              </div>
268|            </div>
269|          )}
270|
271|          <div className="text-center">
272|            <button
273|              onClick={() => {
274|                setIsRegister(!isRegister);
275|                setError('');
276|                setFormData({ email: '', password: '', full_name: '', confirmPassword: '' });
277|              }}
278|              className="text-blue-600 hover:text-blue-500 text-sm"
279|            >
280|              {isRegister 
281|                ? 'Already have an account? Sign in' 
282|                : "Don't have an account? Sign up"}
283|            </button>
284|          </div>
285|        </div>
286|      </div>
287|    </div>
288|  );
289|};
290|
291|// Categorical Rating Component
292|const CategoryRating = ({ category, rating, onRatingChange, icon }) => {
293|  return (
294|    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
295|      <div className="flex items-center space-x-2">
296|        <span className="text-lg">{icon}</span>
297|        <span className="font-medium text-gray-700 capitalize">{category}</span>
298|      </div>
299|      <div className="flex space-x-1">
300|        {[1, 2, 3, 4, 5].map((star) => (
301|          <button
302|            key={star}
303|            type="button"
304|            className={`text-xl ${
305|              star <= rating ? 'text-yellow-400' : 'text-gray-300'
306|            } hover:text-yellow-500 cursor-pointer transition-colors`}
307|            onClick={() => onRatingChange && onRatingChange(star)}
308|          >
309|            ★
310|          </button>
311|        ))}
312|      </div>
313|    </div>
314|  );
315|};
316|
317|// Overall Rating Display Component
318|const OverallRating = ({ 
319|  sinkRating, 
320|  floorRating, 
321|  toiletRating, 
322|  smellRating, 
323|  nicenessRating, 
324|  overallRating,
325|  showBreakdown = false,
326|  readonly = true 
327|}) => {
328|  const categories = [
329|    { name: 'sink', rating: sinkRating, icon: '🚰' },
330|    { name: 'floor', rating: floorRating, icon: '🧽' },
331|    { name: 'toilet', rating: toiletRating, icon: '🚽' },
332|    { name: 'smell', rating: smellRating, icon: '👃' },
333|    { name: 'niceness', rating: nicenessRating, icon: '✨' }
334|  ];
335|
336|  if (!showBreakdown) {
337|    return (
338|      <div className="flex items-center space-x-2">
339|        <div className="flex space-x-1">
340|          {[1, 2, 3, 4, 5].map((star) => (
341|            <span
342|              key={star}
343|              className={`text-lg ${
344|                star <= Math.round(overallRating) ? 'text-yellow-400' : 'text-gray-300'
345|              }`}
346|            >
347|              ★
348|            </span>
349|          ))}
350|        </div>
351|        <span className="text-sm font-medium text-gray-600">
352|          {overallRating}/5
353|        </span>
354|      </div>
355|    );
356|  }
357|
358|  return (
359|    <div className="space-y-2">
360|      <div className="flex items-center justify-between">
361|        <span className="font-medium text-gray-800">Overall Rating</span>
362|        <div className="flex items-center space-x-2">
363|          <div className="flex space-x-1">
364|            {[1, 2, 3, 4, 5].map((star) => (
365|              <span
366|                key={star}
367|                className={`text-lg ${
368|                  star <= Math.round(overallRating) ? 'text-yellow-400' : 'text-gray-300'
369|                }`}
370|              >
371|                ★
372|              </span>
373|            ))}
374|          </div>
375|          <span className="text-sm font-medium text-gray-600">
376|            {overallRating}/5
377|          </span>
378|        </div>
379|      </div>
380|      
381|      <div className="grid grid-cols-1 gap-1 text-sm">
382|        {categories.map((category) => (
383|          <div key={category.name} className="flex items-center justify-between">
384|            <div className="flex items-center space-x-1">
385|              <span>{category.icon}</span>
386|              <span className="capitalize text-gray-600">{category.name}</span>
387|            </div>
388|            <div className="flex space-x-1">
389|              {[1, 2, 3, 4, 5].map((star) => (
390|                <span
391|                  key={star}
392|                  className={`text-xs ${
393|                    star <= category.rating ? 'text-yellow-400' : 'text-gray-300'
394|                  }`}
395|                >
396|                  ★
397|                </span>
398|              ))}
399|            </div>
400|          </div>
401|        ))}
402|      </div>
403|    </div>
404|  );
405|};
406|
407|// Google Map Component with Current Location Support
408|const GoogleMap = ({ bathrooms, onMapClick, onMarkerClick, center = { lat: 37.7749, lng: -122.4194 } }) => {
409|  const [map, setMap] = useState(null);
410|  const [markers, setMarkers] = useState([]);
411|  const [isLoaded, setIsLoaded] = useState(false);
412|  const [userLocationMarker, setUserLocationMarker] = useState(null);
413|
414|  const handleMapClick = useCallback((event) => {
415|    if (onMapClick) {
416|      onMapClick({
417|        lat: event.latLng.lat(),
418|        lng: event.latLng.lng()
419|      });
420|    }
421|  }, [onMapClick]);
422|
423|  const handleMarkerClick = useCallback((bathroom) => {
424|    if (onMarkerClick) {
425|      onMarkerClick(bathroom);
426|    }
427|  }, [onMarkerClick]);
428|
429|  const getCurrentLocation = useCallback(() => {
430|    if (!map) return;
431|
432|    if (navigator.geolocation) {
433|      navigator.geolocation.getCurrentPosition(
434|        (position) => {
435|          const pos = {
436|            lat: position.coords.latitude,
437|            lng: position.coords.longitude
438|          };
439|
440|          // Center the map on user location
441|          map.setCenter(pos);
442|          map.setZoom(15);
443|
444|          // Remove previous user location marker if exists
445|          if (userLocationMarker) {
446|            userLocationMarker.setMap(null);
447|          }
448|
449|          // Add user location marker
450|          const marker = new window.google.maps.Marker({
451|            position: pos,
452|            map: map,
453|            title: 'Your Location',
454|            icon: {
455|              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
456|                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
457|                  <circle cx="10" cy="10" r="8" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
458|                  <circle cx="10" cy="10" r="3" fill="#FFFFFF"/>
459|                </svg>
460|              `),
461|              scaledSize: new window.google.maps.Size(20, 20),
462|              anchor: new window.google.maps.Point(10, 10)
463|            }
464|          });
465|
466|          setUserLocationMarker(marker);
467|        },
468|        (error) => {
469|          console.error('Error getting location:', error);
470|          alert('Error getting your location. Please check your browser permissions.');
471|        },
472|        {
473|          enableHighAccuracy: true,
474|          timeout: 5000,
475|          maximumAge: 0
476|        }
477|      );
478|    } else {
479|      alert('Geolocation is not supported by this browser.');
480|    }
481|  }, [map, userLocationMarker]);
482|
483|  useEffect(() => {
484|    const initMap = async () => {
485|      try {
486|        const loader = new Loader({
487|          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
488|          version: 'weekly',
489|          libraries: ['places']
490|        });
491|
492|        await loader.load();
493|        
494|        const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
495|          center: center,
496|          zoom: 13,
497|          mapTypeControl: true,
498|          streetViewControl: true,
499|          fullscreenControl: true,
500|        });
501|
502|        mapInstance.addListener('click', handleMapClick);
503|
504|        // Add current location button
505|        const locationButton = document.createElement('button');
506|        locationButton.textContent = '📍';
507|        locationButton.className = 'bg-white border-2 border-gray-300 rounded-md p-2 m-2 shadow-md hover:bg-gray-50';
508|        locationButton.title = 'Go to your location';
509|        locationButton.style.fontSize = '16px';
510|        locationButton.style.cursor = 'pointer';
511|        
512|        locationButton.addEventListener('click', () => {
513|          getCurrentLocation();
514|        });
515|
516|        mapInstance.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(locationButton);
517|
518|        setMap(mapInstance);
519|        setIsLoaded(true);
520|      } catch (error) {
521|        console.error('Error loading Google Maps:', error);
522|      }
523|    };
524|
525|    if (!map) {
526|      initMap();
527|    }
528|  }, [center, handleMapClick, map, getCurrentLocation]);
529|
530|  // Update map center when center prop changes
531|  useEffect(() => {
532|    if (map && center) {
533|      map.setCenter(center);
534|    }
535|  }, [map, center]);
536|
537|  useEffect(() => {
538|    if (!map || !isLoaded || !bathrooms) return;
539|
540|    // Clear existing markers
541|    markers.forEach(marker => marker.setMap(null));
542|
543|    const newMarkers = bathrooms
544|      .filter(bathroom => bathroom.latitude && bathroom.longitude)
545|      .map(bathroom => {
546|        const marker = new window.google.maps.Marker({
547|          position: { lat: bathroom.latitude, lng: bathroom.longitude },
548|          map: map,
549|          title: bathroom.location,
550|          icon: {
551|            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
552|              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
553|                <path d="M15 3C10.05 3 6 7.05 6 12c0 7.5 9 15 9 15s9-7.5 9-15c0-4.95-4.05-9-9-9z" fill="#4285F4"/>
554|                <circle cx="15" cy="12" r="3.5" fill="white"/>
555|                <text x="15" y="14" text-anchor="middle" fill="#4285F4" font-size="8" font-weight="bold">${Math.round(bathroom.overall_rating)}</text>
556|              </svg>
557|            `),
558|            scaledSize: new window.google.maps.Size(30, 30),
559|            anchor: new window.google.maps.Point(15, 30)
560|          }
561|        });
562|
563|        marker.addListener('click', () => handleMarkerClick(bathroom));
564|
565|        return marker;
566|      });
567|
568|    setMarkers(newMarkers);
569|  }, [map, bathrooms, isLoaded, handleMarkerClick]);
570|
571|  return <div id="map" className="w-full h-full rounded-lg shadow-lg" />;
572|};
573|
574|// Mobile Camera Component
575|const MobileCamera = ({ onImageCapture, onClose }) => {
576|  const [isNative, setIsNative] = useState(false);
577|
578|  useEffect(() => {
579|    const checkDevice = async () => {
580|      try {
581|        const info = await Device.getInfo();
582|        setIsNative(info.platform !== 'web');
583|      } catch (error) {
584|        setIsNative(false);
585|      }
586|    };
587|    checkDevice();
588|  }, []);
589|
590|  const captureImage = async () => {
591|    try {
592|      if (isNative) {
593|        // Use native camera on mobile
594|        const image = await Camera.getPhoto({
595|          quality: 90,
596|          allowEditing: false,
597|          resultType: CameraResultType.DataUrl,
598|          source: CameraSource.Camera
599|        });
600|        
601|        // Convert dataUrl to file
602|        const response = await fetch(image.dataUrl);
603|        const blob = await response.blob();
604|        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
605|        
606|        onImageCapture(file, image.dataUrl);
607|      } else {
608|        // Fallback to file input on web
609|        const input = document.createElement('input');
610|        input.type = 'file';
611|        input.accept = 'image/*';
612|        input.capture = 'environment';
613|        
614|        input.onchange = (e) => {
615|          const file = e.target.files[0];
616|          if (file) {
617|            const url = URL.createObjectURL(file);
618|            onImageCapture(file, url);
619|          }
620|        };
621|        
622|        input.click();
623|      }
624|      onClose();
625|    } catch (error) {
626|      console.error('Error capturing image:', error);
627|      alert('Failed to capture image. Please try again.');
628|    }
629|  };
630|
631|  const selectFromGallery = async () => {
632|    try {
633|      if (isNative) {
634|        // Use native photo library on mobile
635|        const image = await Camera.getPhoto({
636|          quality: 90,
637|          allowEditing: false,
638|          resultType: CameraResultType.DataUrl,
639|          source: CameraSource.Photos
640|        });
641|        
642|        // Convert dataUrl to file
643|        const response = await fetch(image.dataUrl);
644|        const blob = await response.blob();
645|        const file = new File([blob], 'gallery-photo.jpg', { type: 'image/jpeg' });
646|        
647|        onImageCapture(file, image.dataUrl);
648|      } else {
649|        // Fallback to file input on web
650|        const input = document.createElement('input');
651|        input.type = 'file';
652|        input.accept = 'image/*';
653|        
654|        input.onchange = (e) => {
655|          const file = e.target.files[0];
656|          if (file) {
657|            const url = URL.createObjectURL(file);
658|            onImageCapture(file, url);
659|          }
660|        };
661|        
662|        input.click();
663|      }
664|      onClose();
665|    } catch (error) {
666|      console.error('Error selecting from gallery:', error);
667|      alert('Failed to select image. Please try again.');
668|    }
669|  };
670|
671|  return (
672|    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
673|      <div className="bg-white rounded-lg max-w-sm w-full">
674|        <div className="p-6">
675|          <h3 className="text-lg font-bold mb-4">Add Photo</h3>
676|          
677|          <div className="space-y-3">
678|            <button
679|              onClick={captureImage}
680|              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
681|            >
682|              <span>📷</span>
683|              <span>Take Photo</span>
684|            </button>
685|            
686|            <button
687|              onClick={selectFromGallery}
688|              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center space-x-2"
689|            >
690|              <span>🖼️</span>
691|              <span>Choose from Gallery</span>
692|            </button>
693|            
694|            <button
695|              onClick={onClose}
696|              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400"
697|            >
698|              Cancel
699|            </button>
700|          </div>
701|        </div>
702|      </div>
703|    </div>
704|  );
705|};
706|// Mobile Geolocation Component
707|const MobileGeolocation = ({ onLocationFound, onError }) => {
708|  const [loading, setLoading] = useState(false);
709|
710|  const getCurrentLocation = async () => {
711|    setLoading(true);
712|    try {
713|      const coordinates = await Geolocation.getCurrentPosition({
714|        enableHighAccuracy: true,
715|        timeout: 10000
716|      });
717|
718|      const location = {
719|        lat: coordinates.coords.latitude,
720|        lng: coordinates.coords.longitude
721|      };
722|
723|      onLocationFound(location);
724|    } catch (error) {
725|      console.error('Geolocation error:', error);
726|      onError('Failed to get current location. Please select manually.');
727|    } finally {
728|      setLoading(false);
729|    }
730|  };
731|
732|  return (
733|    <button
734|      type="button"
735|      onClick={getCurrentLocation}
736|      disabled={loading}
737|      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center space-x-2"
738|    >
739|      {loading ? (
740|        <>
741|          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
742|          <span>Getting Location...</span>
743|        </>
744|      ) : (
745|        <>
746|          <span>📍</span>
747|          <span>Use Current Location</span>
748|        </>
749|      )}
750|    </button>
751|  );
752|};
753|
754|const LocationAutocomplete = ({ onLocationSelect, selectedLocation, value, onChange }) => {
755|  const [autocomplete, setAutocomplete] = useState(null);
756|  const inputRef = useRef(null);
757|  const isManualInput = useRef(false);
758|
759|  useEffect(() => {
760|    const initAutocomplete = async () => {
761|      try {
762|        const loader = new Loader({
763|          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
764|          version: 'weekly',
765|          libraries: ['places']
766|        });
767|
768|        await loader.load();
769|        
770|        // Initialize Autocomplete
771|        const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
772|          types: ['establishment', 'geocode'],
773|          fields: ['place_id', 'name', 'formatted_address', 'geometry']
774|        });
775|
776|        autocompleteInstance.addListener('place_changed', () => {
777|          // Only process if this is NOT a manual input
778|          if (isManualInput.current) {
779|            isManualInput.current = false;
780|            return;
781|          }
782|
783|          const place = autocompleteInstance.getPlace();
784|          
785|          if (place.geometry && place.geometry.location) {
786|            const location = {
787|              lat: place.geometry.location.lat(),
788|              lng: place.geometry.location.lng()
789|            };
790|            
791|            const locationText = place.name && place.formatted_address 
792|              ? `${place.name}, ${place.formatted_address}`
793|              : place.formatted_address || place.name || value;
794|            
795|            console.log('Autocomplete selected:', locationText, location);
796|            
797|            // Use setTimeout to prevent form re-render issues
798|            setTimeout(() => {
799|              onChange(locationText);
800|              if (onLocationSelect) {
801|                onLocationSelect(location);
802|              }
803|            }, 0);
804|          }
805|        });
806|
807|        setAutocomplete(autocompleteInstance);
808|      } catch (error) {
809|        console.error('Error loading Google Places:', error);
810|      }
811|    };
812|
813|    if (inputRef.current && !autocomplete && process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
814|      initAutocomplete();
815|    }
816|  }, [onLocationSelect, onChange, value, autocomplete]);
817|
818|  const handleInputChange = (e) => {
819|    isManualInput.current = true;
820|    const newValue = e.target.value;
821|    console.log('Manual input changing from:', value, 'to:', newValue);
822|    onChange(newValue);
823|  };
824|
825|  return (
826|    <input
827|      ref={inputRef}
828|      type="text"
829|      value={value}
830|      onChange={handleInputChange}
831|      onFocus={() => { isManualInput.current = false; }}
832|      placeholder="Search for a place... (e.g., Starbucks, McDonald's, Mall)"
833|      required
834|      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
835|    />
836|  );
837|};
838|// Location Selector Component (Manual Map Selection with My Location)
839|const LocationSelector = ({ onLocationSelect, selectedLocation }) => {
840|  const [map, setMap] = useState(null);
841|  const [marker, setMarker] = useState(null);
842|  const [userLocationMarker, setUserLocationMarker] = useState(null);
843|
844|  const getCurrentLocation = useCallback(() => {
845|    if (!map) return;
846|
847|    if (navigator.geolocation) {
848|      navigator.geolocation.getCurrentPosition(
849|        (position) => {
850|          const location = {
851|            lat: position.coords.latitude,
852|            lng: position.coords.longitude
853|          };
854|
855|          // Center the map on user location
856|          map.setCenter(location);
857|          map.setZoom(15);
858|
859|          // Remove previous user location marker if exists
860|          if (userLocationMarker) {
861|            userLocationMarker.setMap(null);
862|          }
863|
864|          // Add user location marker
865|          const newUserMarker = new window.google.maps.Marker({
866|            position: location,
867|            map: map,
868|            title: 'Your Location',
869|            icon: {
870|              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
871|                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
872|                  <circle cx="10" cy="10" r="8" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
873|                  <circle cx="10" cy="10" r="3" fill="#FFFFFF"/>
874|                </svg>
875|              `),
876|              scaledSize: new window.google.maps.Size(20, 20),
877|              anchor: new window.google.maps.Point(10, 10)
878|            }
879|          });
880|
881|          setUserLocationMarker(newUserMarker);
882|
883|          // Call onLocationSelect with the current location
884|          if (onLocationSelect) {
885|            onLocationSelect(location);
886|          }
887|        },
888|        (error) => {
889|          console.error('Error getting location:', error);
890|          alert('Error getting your location. Please check your browser permissions.');
891|        },
892|        {
893|          enableHighAccuracy: true,
894|          timeout: 5000,
895|          maximumAge: 0
896|        }
897|      );
898|    } else {
899|      alert('Geolocation is not supported by this browser.');
900|    }
901|  }, [map, userLocationMarker, onLocationSelect]);
902|
903|  useEffect(() => {
904|    const initMap = async () => {
905|      try {
906|        const loader = new Loader({
907|          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
908|          version: 'weekly',
909|          libraries: ['places']
910|        });
911|
912|        await loader.load();
913|        
914|        const mapInstance = new window.google.maps.Map(document.getElementById('location-map'), {
915|          center: selectedLocation || { lat: 37.7749, lng: -122.4194 },
916|          zoom: 13,
917|        });
918|
919|        mapInstance.addListener('click', (event) => {
920|          const location = {
921|            lat: event.latLng.lat(),
922|            lng: event.latLng.lng()
923|          };
924|          
925|          if (onLocationSelect) {
926|            onLocationSelect(location);
927|          }
928|
929|          // Remove previous marker
930|          if (marker) {
931|            marker.setMap(null);
932|          }
933|
934|          // Add red teardrop marker
935|          const newMarker = new window.google.maps.Marker({
936|            position: location,
937|            map: mapInstance,
938|            title: 'Selected Location',
939|            icon: {
940|              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
941|                <svg width="25" height="35" viewBox="0 0 25 35" fill="none" xmlns="http://www.w3.org/2000/svg">
942|                  <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 22.5 12.5 22.5s12.5-11.6 12.5-22.5C25 5.6 19.4 0 12.5 0z" fill="#FF0000"/>
943|                  <circle cx="12.5" cy="12.5" r="4" fill="white"/>
944|                </svg>
945|              `),
946|              scaledSize: new window.google.maps.Size(25, 35),
947|              anchor: new window.google.maps.Point(12.5, 35)
948|            }
949|          });
950|          
951|          setMarker(newMarker);
952|        });
953|
954|        setMap(mapInstance);
955|      } catch (error) {
956|        console.error('Error loading Google Maps:', error);
957|      }
958|    };
959|
960|    initMap();
961|  }, [onLocationSelect, selectedLocation]);
962|
963|  // Update map center when selectedLocation changes
964|  useEffect(() => {
965|    if (map && selectedLocation) {
966|      map.setCenter(selectedLocation);
967|    }
968|  }, [map, selectedLocation]);
969|
970|  return (
971|    <div className="w-full space-y-3">
972|      <div className="flex justify-between items-center">
973|        <span className="text-sm font-medium text-gray-700">Click on map to select location</span>
974|        <button
975|          type="button"
976|          onClick={getCurrentLocation}
977|          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center space-x-1"
978|        >
979|          <span>📍</span>
980|          <span>My Location</span>
981|        </button>
982|      </div>
983|      
984|      <div className="w-full h-64 border rounded-lg overflow-hidden">
985|        <div id="location-map" className="w-full h-full" />
986|      </div>
987|      
988|      {selectedLocation && (
989|        <div className="p-2 bg-gray-50 text-sm text-gray-600 rounded">
990|          Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
991|        </div>
992|      )}
993|    </div>
994|  );
995|};
996|
997|// Upload Form Component
998|const UploadForm = ({ onSuccess }) => {
999|  const { user } = useAuth();
1000|  const [formData, setFormData] = useState({
1001|    image: null,
1002|    sinkRating: 0,
1003|    floorRating: 0,
1004|    toiletRating: 0,
1005|    smellRating: 0,
1006|    nicenessRating: 0,
1007|    location: '',
1008|    coordinates: null,
1009|    comments: ''
1010|  });
1011|  const [uploading, setUploading] = useState(false);
1012|  const [previewUrl, setPreviewUrl] = useState(null);
1013|  const [showLocationSelector, setShowLocationSelector] = useState(false);
1014|  const [showMobileCamera, setShowMobileCamera] = useState(false);
1015|  const [isNative, setIsNative] = useState(false);
1016|
1017|  useEffect(() => {
1018|    const checkDevice = async () => {
1019|      try {
1020|        const info = await Device.getInfo();
1021|        setIsNative(info.platform !== 'web');
1022|      } catch (error) {
1023|        setIsNative(false);
1024|      }
1025|    };
1026|    checkDevice();
1027|  }, []);
1028|
1029|  const handleImageChange = (e) => {
1030|    const file = e.target.files[0];
1031|    if (file) {
1032|      setFormData(prev => ({ ...prev, image: file }));
1033|      
1034|      const url = URL.createObjectURL(file);
1035|      setPreviewUrl(url);
1036|    }
1037|  };
1038|
1039|  const handleMobileImageCapture = (file, dataUrl) => {
1040|    setFormData(prev => ({ ...prev, image: file }));
1041|    setPreviewUrl(dataUrl);
1042|  };
1043|
1044|  const handleLocationFound = (location) => {
1045|    setFormData(prev => ({ 
1046|      ...prev, 
1047|      coordinates: location,
1048|      location: prev.location || `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
1049|    }));
1050|  };
1051|
1052|  const handleLocationError = (error) => {
1053|    alert(error);
1054|  };
1055|
1056|  const handleLocationSelect = (coordinates) => {
1057|    setFormData(prev => ({ ...prev, coordinates }));
1058|    setShowLocationSelector(true); // Show the map when coordinates are selected
1059|  };
1060|
1061|  const handleSubmit = async (e) => {
1062|    e.preventDefault();
1063|    
1064|    // Debug logging
1065|    console.log('Form submission attempt:', {
1066|      hasImage: !!formData.image,
1067|      imageType: formData.image?.type,
1068|      imageSize: formData.image?.size,
1069|      location: formData.location,
1070|      locationLength: formData.location?.length,
1071|      locationTrimmed: formData.location?.trim(),
1072|      coordinates: formData.coordinates,
1073|      ratings: {
1074|        sink: formData.sinkRating,
1075|        floor: formData.floorRating,
1076|        toilet: formData.toiletRating,
1077|        smell: formData.smellRating,
1078|        niceness: formData.nicenessRating
1079|      },
1080|      comments: formData.comments
1081|    });
1082|    
1083|    // Validation with better error messages
1084|    const missingFields = [];
1085|    if (!formData.image) missingFields.push('Image');
1086|    if (formData.sinkRating === 0) missingFields.push('Sink rating');
1087|    if (formData.floorRating === 0) missingFields.push('Floor rating');
1088|    if (formData.toiletRating === 0) missingFields.push('Toilet rating');
1089|    if (formData.smellRating === 0) missingFields.push('Smell rating');
1090|    if (formData.nicenessRating === 0) missingFields.push('Niceness rating');
1091|    if (!formData.location?.trim()) missingFields.push('Location');
1092|    
1093|    if (missingFields.length > 0) {
1094|      console.log('Missing fields:', missingFields);
1095|      alert(`Please fill in all required fields:\n\n${missingFields.map(field => `• ${field}`).join('\n')}\n\nCurrent form state:\n• Image: ${formData.image ? '✓ Selected' : '✗ Missing'}\n• Ratings: ${[formData.sinkRating, formData.floorRating, formData.toiletRating, formData.smellRating, formData.nicenessRating].filter(r => r > 0).length}/5 completed\n• Location: ${formData.location ? '✓ Filled' : '✗ Empty'}`);
1096|      return;
1097|    }
1098|
1099|    setUploading(true);
1100|
1101|    try {
1102|      const submitData = new FormData();
1103|      submitData.append('image', formData.image);
1104|      submitData.append('sink_rating', formData.sinkRating);
1105|      submitData.append('floor_rating', formData.floorRating);
1106|      submitData.append('toilet_rating', formData.toiletRating);
1107|      submitData.append('smell_rating', formData.smellRating);
1108|      submitData.append('niceness_rating', formData.nicenessRating);
1109|      submitData.append('location', formData.location);
1110|      submitData.append('comments', formData.comments);
1111|      
1112|      // Debug: Log what we're actually sending
1113|      console.log('FormData contents:');
1114|      for (let [key, value] of submitData.entries()) {
1115|        console.log(`${key}:`, value);
1116|      }
1117|      
1118|      if (formData.coordinates) {
1119|        submitData.append('latitude', formData.coordinates.lat);
1120|        submitData.append('longitude', formData.coordinates.lng);
1121|      }
1122|
1123|      console.log('Making API request to:', `${API}/bathrooms`);
1124|      const response = await axios.post(`${API}/bathrooms`, submitData, {
1125|        headers: {
1126|          'Content-Type': 'multipart/form-data',
1127|        },
1128|      });
1129|
1130|      setFormData({
1131|        image: null,
1132|        sinkRating: 0,
1133|        floorRating: 0,
1134|        toiletRating: 0,
1135|        smellRating: 0,
1136|        nicenessRating: 0,
1137|        location: '',
1138|        coordinates: null,
1139|        comments: ''
1140|      });
1141|      setPreviewUrl(null);
1142|      setShowLocationSelector(false);
1143|      
1144|      e.target.reset();
1145|      
1146|      onSuccess(response.data);
1147|      alert('Loo review uploaded successfully!');
1148|    } catch (error) {
1149|      console.error('Upload failed - Full error details:', error);
1150|      console.error('Error response:', error.response?.data);
1151|      console.error('Error status:', error.response?.status);
1152|      console.error('Error headers:', error.response?.headers);
1153|      
1154|      let errorMessage = 'Failed to upload loo review. Please try again.';
1155|      if (error.response?.data?.detail) {
1156|        errorMessage += `\n\nError details: ${error.response.data.detail}`;
1157|      } else if (error.response?.data?.message) {
1158|        errorMessage += `\n\nError details: ${error.response.data.message}`;
1159|      } else if (error.message) {
1160|        errorMessage += `\n\nError details: ${error.message}`;
1161|      }
1162|      
1163|      alert(errorMessage);
1164|    } finally {
1165|      setUploading(false);
1166|    }
1167|  };
1168|
1169|  return (
1170|    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
1171|      <div className="flex justify-between items-center mb-6">
1172|        <h2 className="text-2xl font-bold text-gray-800">Rate a Loo</h2>
1173|        {user && (
1174|          <div className="text-sm text-gray-600">
1175|            Signed in as <span className="font-medium">{user.full_name}</span>
1176|          </div>
1177|        )}
1178|      </div>
1179|      
1180|      {/* Image Upload */}
1181|      <div className="mb-6">
1182|        <label className="block text-sm font-medium text-gray-700 mb-2">
1183|          Upload Photo *
1184|        </label>
1185|        
1186|        {isNative ? (
1187|          // Mobile-optimized upload
1188|          <div className="space-y-3">
1189|            <button
1190|              type="button"
1191|              onClick={() => setShowMobileCamera(true)}
1192|              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
1193|            >
1194|              <span>📷</span>
1195|              <span>Add Photo</span>
1196|            </button>
1197|          </div>
1198|        ) : (
1199|          // Web file input
1200|          <input
1201|            type="file"
1202|            accept="image/*"
1203|            onChange={handleImageChange}
1204|            required
1205|            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
1206|          />
1207|        )}
1208|        
1209|        {previewUrl && (
1210|          <div className="mt-4">
1211|            <img 
1212|              src={previewUrl} 
1213|              alt="Preview" 
1214|              className="max-w-full h-48 object-cover rounded-lg"
1215|            />
1216|          </div>
1217|        )}
1218|      </div>
1219|
1220|      {/* Categorical Ratings */}
1221|      <div className="mb-6">
1222|        <label className="block text-sm font-medium text-gray-700 mb-4">
1223|          Rate Each Category * 
1224|          <span className="text-xs text-gray-500 ml-2">(All categories required)</span>
1225|        </label>
1226|        <div className="space-y-3">
1227|          <CategoryRating
1228|            category="sink"
1229|            rating={formData.sinkRating}
1230|            onRatingChange={(rating) => setFormData(prev => ({ ...prev, sinkRating: rating }))}
1231|            icon="🚰"
1232|          />
1233|          <CategoryRating
1234|            category="floor"
1235|            rating={formData.floorRating}
1236|            onRatingChange={(rating) => setFormData(prev => ({ ...prev, floorRating: rating }))}
1237|            icon="🧽"
1238|          />
1239|          <CategoryRating
1240|            category="toilet"
1241|            rating={formData.toiletRating}
1242|            onRatingChange={(rating) => setFormData(prev => ({ ...prev, toiletRating: rating }))}
1243|            icon="🚽"
1244|          />
1245|          <CategoryRating
1246|            category="smell"
1247|            rating={formData.smellRating}
1248|            onRatingChange={(rating) => setFormData(prev => ({ ...prev, smellRating: rating }))}
1249|            icon="👃"
1250|          />
1251|          <CategoryRating
1252|            category="niceness"
1253|            rating={formData.nicenessRating}
1254|            onRatingChange={(rating) => setFormData(prev => ({ ...prev, nicenessRating: rating }))}
1255|            icon="✨"
1256|          />
1257|        </div>
1258|        
1259|        {/* Overall Rating Preview */}
1260|        {(formData.sinkRating > 0 || formData.floorRating > 0 || formData.toiletRating > 0 || 
1261|          formData.smellRating > 0 || formData.nicenessRating > 0) && (
1262|          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
1263|            <OverallRating
1264|              sinkRating={formData.sinkRating}
1265|              floorRating={formData.floorRating}
1266|              toiletRating={formData.toiletRating}
1267|              smellRating={formData.smellRating}
1268|              nicenessRating={formData.nicenessRating}
1269|              overallRating={(formData.sinkRating + formData.floorRating + formData.toiletRating + 
1270|                formData.smellRating + formData.nicenessRating) / 5}
1271|              showBreakdown={true}
1272|            />
1273|          </div>
1274|        )}
1275|      </div>
1276|
1277|      {/* Location with Autocomplete */}
1278|      <div className="mb-6">
1279|        <label className="block text-sm font-medium text-gray-700 mb-2">
1280|          Location * 
1281|          <span className="text-xs text-gray-500 ml-2">(Search for businesses, addresses, landmarks)</span>
1282|        </label>
1283|        <LocationAutocomplete
1284|          value={formData.location}
1285|          onChange={(location) => setFormData(prev => ({ ...prev, location }))}
1286|          onLocationSelect={(coordinates) => setFormData(prev => ({ ...prev, coordinates }))}
1287|          selectedLocation={formData.coordinates}
1288|        />
1289|        {formData.coordinates && (
1290|          <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
1291|            ✓ Location found with coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
1292|          </div>
1293|        )}
1294|        
1295|        {formData.location && !formData.coordinates && (
1296|          <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
1297|            📍 Manual location text entered: "{formData.location}"
1298|            <br />
1299|            <span className="text-xs">Coordinates will be geocoded automatically or can be set manually below</span>
1300|          </div>
1301|        )}
1302|        
1303|        {/* Mobile Geolocation */}
1304|        {isNative && (
1305|          <div className="mt-3">
1306|            <MobileGeolocation 
1307|              onLocationFound={handleLocationFound}
1308|              onError={handleLocationError}
1309|            />
1310|          </div>
1311|        )}
1312|      </div>
1313|
1314|      {/* Manual Location Selector (Optional) */}
1315|      <div className="mb-6">
1316|        <div className="flex items-center justify-between mb-2">
1317|          <label className="block text-sm font-medium text-gray-700">
1318|            Manual Location Selection (optional)
1319|          </label>
1320|          <button
1321|            type="button"
1322|            onClick={() => setShowLocationSelector(!showLocationSelector)}
1323|            className="text-blue-600 hover:text-blue-800 text-sm"
1324|          >
1325|            {showLocationSelector ? 'Hide Manual Map' : 'Show Manual Map'}
1326|          </button>
1327|        </div>
1328|        <p className="text-xs text-gray-500 mb-2">
1329|          Use this if you want to manually click on the map to select coordinates
1330|        </p>
1331|        {showLocationSelector && (
1332|          <LocationSelector 
1333|            onLocationSelect={(coordinates) => setFormData(prev => ({ ...prev, coordinates }))}
1334|            selectedLocation={formData.coordinates}
1335|          />
1336|        )}
1337|        {formData.coordinates && !showLocationSelector && (
1338|          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
1339|            📍 Coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
1340|          </div>
1341|        )}
1342|      </div>
1343|
1344|      {/* Comments */}
1345|      <div className="mb-6">
1346|        <label className="block text-sm font-medium text-gray-700 mb-2">
1347|          Comments (optional)
1348|        </label>
1349|        <textarea
1350|          value={formData.comments}
1351|          onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
1352|          placeholder="Share your thoughts about this loo..."
1353|          rows="3"
1354|          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
1355|        />
1356|      </div>
1357|
1358|      <button
1359|        type="submit"
1360|        disabled={uploading}
1361|        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
1362|      >
1363|        {uploading ? 'Uploading...' : 'Submit Rating'}
1364|      </button>
1365|      
1366|      {/* Mobile Camera Modal */}
1367|      {showMobileCamera && (
1368|        <MobileCamera
1369|          onImageCapture={handleMobileImageCapture}
1370|          onClose={() => setShowMobileCamera(false)}
1371|        />
1372|      )}
1373|    </form>
1374|  );
1375|};
1376|
1377|// Bathroom Card Component
1378|const BathroomCard = ({ bathroom, onClick }) => {
1379|  const formatDate = (dateString) => {
1380|    return new Date(dateString).toLocaleDateString('en-US', {
1381|      year: 'numeric',
1382|      month: 'short',
1383|      day: 'numeric',
1384|      hour: '2-digit',
1385|      minute: '2-digit'
1386|    });
1387|  };
1388|
1389|  return (
1390|    <div 
1391|      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
1392|      onClick={() => onClick && onClick(bathroom)}
1393|    >
1394|      <img
1395|        src={`${BACKEND_URL}${bathroom.image_url}`}
1396|        alt="Loo"
1397|        className="w-full h-48 object-cover"
1398|        onError={(e) => {
1399|          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KICA8L3N2Zz4K';
1400|        }}
1401|      />
1402|      <div className="p-4">
1403|        <div className="flex justify-between items-start mb-2">
1404|          <h3 className="text-lg font-semibold text-gray-800 truncate flex-1">
1405|            {bathroom.location}
1406|          </h3>
1407|          <div className="ml-2">
1408|            <OverallRating
1409|              sinkRating={bathroom.sink_rating}
1410|              floorRating={bathroom.floor_rating}
1411|              toiletRating={bathroom.toilet_rating}
1412|              smellRating={bathroom.smell_rating}
1413|              nicenessRating={bathroom.niceness_rating}
1414|              overallRating={bathroom.overall_rating}
1415|              showBreakdown={false}
1416|              readonly={true}
1417|            />
1418|          </div>
1419|        </div>
1420|        
1421|        {bathroom.user_name && (
1422|          <div className="flex items-center text-xs text-gray-500 mb-2">
1423|            <span className="mr-1">👤</span>
1424|            <span>by {bathroom.user_name}</span>
1425|          </div>
1426|        )}
1427|        
1428|        {bathroom.latitude && bathroom.longitude && (
1429|          <div className="flex items-center text-xs text-blue-600 mb-2">
1430|            <span className="mr-1">📍</span>
1431|            <span>Mapped Location</span>
1432|          </div>
1433|        )}
1434|        
1435|        {bathroom.comments && (
1436|          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
1437|            {bathroom.comments}
1438|          </p>
1439|        )}
1440|        
1441|        <p className="text-xs text-gray-500">
1442|          {formatDate(bathroom.timestamp)}
1443|        </p>
1444|      </div>
1445|    </div>
1446|  );
1447|};
1448|
1449|// Bathroom Detail Modal
1450|const BathroomModal = ({ bathroom, isOpen, onClose }) => {
1451|  if (!isOpen || !bathroom) return null;
1452|
1453|  return (
1454|    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
1455|      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
1456|        <div className="p-6">
1457|          <div className="flex justify-between items-center mb-4">
1458|            <h2 className="text-xl font-bold">{bathroom.location}</h2>
1459|            <button
1460|              onClick={onClose}
1461|              className="text-gray-500 hover:text-gray-700 text-2xl"
1462|            >
1463|              ×
1464|            </button>
1465|          </div>
1466|          
1467|          <div className="mb-4">
1468|            <img
1469|              src={`${BACKEND_URL}${bathroom.image_url}`}
1470|              alt="Loo"
1471|              className="w-full h-48 object-cover rounded-lg"
1472|            />
1473|          </div>
1474|          
1475|          <div className="space-y-3">
1476|            <div>
1477|              <OverallRating
1478|                sinkRating={bathroom.sink_rating}
1479|                floorRating={bathroom.floor_rating}
1480|                toiletRating={bathroom.toilet_rating}
1481|                smellRating={bathroom.smell_rating}
1482|                nicenessRating={bathroom.niceness_rating}
1483|                overallRating={bathroom.overall_rating}
1484|                showBreakdown={true}
1485|                readonly={true}
1486|              />
1487|            </div>
1488|
1489|            {bathroom.user_name && (
1490|              <div className="flex items-center justify-between">
1491|                <span className="font-medium">Reviewed by:</span>
1492|                <span className="text-sm text-gray-600">{bathroom.user_name}</span>
1493|              </div>
1494|            )}
1495|            
1496|            {bathroom.latitude && bathroom.longitude && (
1497|              <div className="flex items-center justify-between">
1498|                <span className="font-medium">Coordinates:</span>
1499|                <span className="text-sm text-gray-600">
1500|                  {bathroom.latitude.toFixed(6)}, {bathroom.longitude.toFixed(6)}
1501|                </span>
1502|              </div>
1503|            )}
1504|            
1505|            {bathroom.comments && (
1506|              <div>
1507|                <span className="font-medium">Comments:</span>
1508|                <p className="text-gray-600 text-sm mt-1">{bathroom.comments}</p>
1509|              </div>
1510|            )}
1511|            
1512|            <div className="flex items-center justify-between pt-2 border-t">
1513|              <span className="font-medium">Added:</span>
1514|              <span className="text-sm text-gray-600">
1515|                {new Date(bathroom.timestamp).toLocaleDateString('en-US', {
1516|                  year: 'numeric',
1517|                  month: 'short',
1518|                  day: 'numeric',
1519|                  hour: '2-digit',
1520|                  minute: '2-digit'
1521|                })}
1522|              </span>
1523|            </div>
1524|          </div>
1525|        </div>
1526|      </div>
1527|    </div>
1528|  );
1529|};
1530|
1531|// Main App Component  
1532|function App() {
1533|  return (
1534|    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
1535|      <AuthProvider>
1536|        <MainApp />
1537|      </AuthProvider>
1538|    </GoogleOAuthProvider>
1539|  );
1540|}
1541|
1542|// Main App Content
1543|function MainApp() {
1544|  const { user, logout, loading } = useAuth();
1545|  const [bathrooms, setBathrooms] = useState([]);
1546|  const [dataLoading, setDataLoading] = useState(true);
1547|  const [view, setView] = useState('upload');
1548|  const [selectedBathroom, setSelectedBathroom] = useState(null);
1549|  const [showModal, setShowModal] = useState(false);
1550|  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
1551|
1552|  const fetchBathrooms = async () => {
1553|    try {
1554|      const response = await axios.get(`${API}/bathrooms`);
1555|      setBathrooms(response.data);
1556|    } catch (error) {
1557|      console.error('Failed to fetch bathrooms:', error);
1558|    } finally {
1559|      setDataLoading(false);
1560|    }
1561|  };
1562|
1563|  useEffect(() => {
1564|    fetchBathrooms();
1565|  }, []);
1566|
1567|  const handleUploadSuccess = (newBathroom) => {
1568|    setBathrooms([newBathroom, ...bathrooms]);
1569|    setView('gallery');
1570|  };
1571|
1572|  const [selectedMapCenter, setSelectedMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
1573|
1574|  const handleMarkerClick = (bathroom) => {
1575|    setSelectedBathroom(bathroom);
1576|    setShowModal(true);
1577|  };
1578|
1579|  const handleGalleryItemClick = (bathroom) => {
1580|    setSelectedBathroom(bathroom);
1581|    setShowModal(true);
1582|    
1583|    // If the bathroom has coordinates, update map center for when user switches to map view
1584|    if (bathroom.latitude && bathroom.longitude) {
1585|      setMapCenter({ lat: bathroom.latitude, lng: bathroom.longitude });
1586|      console.log('Gallery item clicked, setting map center to:', { lat: bathroom.latitude, lng: bathroom.longitude });
1587|    }
1588|  };
1589|
1590|  const bathroomsWithCoordinates = bathrooms.filter(b => b.latitude && b.longitude);
1591|
1592|  if (loading) {
1593|    return (
1594|      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
1595|        <div className="text-center">
1596|          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
1597|          <p className="mt-2 text-gray-600">Loading...</p>
1598|        </div>
1599|      </div>
1600|    );
1601|  }
1602|
1603|  if (!user) {
1604|    return <Login />;
1605|  }
1606|
1607|  return (
1608|    <div className="min-h-screen bg-gray-100">
1609|      {/* Header */}
1610|      <header className="bg-white shadow-sm">
1611|        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
1612|          <div className="flex justify-between items-center py-6">
1613|            <h1 className="text-3xl font-bold text-gray-900">🚽 Loo Review</h1>
1614|            <div className="flex items-center space-x-4">
1615|              <nav className="flex space-x-4">
1616|                <button
1617|                  onClick={() => setView('upload')}
1618|                  className={`px-4 py-2 rounded-md font-medium ${
1619|                    view === 'upload' 
1620|                      ? 'bg-blue-600 text-white' 
1621|                      : 'text-gray-600 hover:text-gray-900'
1622|                  }`}
1623|                >
1624|                  Rate Loo
1625|                </button>
1626|                <button
1627|                  onClick={() => setView('gallery')}
1628|                  className={`px-4 py-2 rounded-md font-medium ${
1629|                    view === 'gallery' 
1630|                      ? 'bg-blue-600 text-white' 
1631|                      : 'text-gray-600 hover:text-gray-900'
1632|                  }`}
1633|                >
1634|                  Browse Gallery ({bathrooms.length})
1635|                </button>
1636|                <button
1637|                  onClick={() => setView('map')}
1638|                  className={`px-4 py-2 rounded-md font-medium ${
1639|                    view === 'map' 
1640|                      ? 'bg-blue-600 text-white' 
1641|                      : 'text-gray-600 hover:text-gray-900'
1642|                  }`}
1643|                >
1644|                  Map View ({bathroomsWithCoordinates.length})
1645|                </button>
1646|              </nav>
1647|              <div className="flex items-center space-x-3">
1648|                <span className="text-sm text-gray-600">Hello, {user.full_name}</span>
1649|                <button
1650|                  onClick={logout}
1651|                  className="text-sm text-gray-600 hover:text-gray-900"
1652|                >
1653|                  Sign Out
1654|                </button>
1655|              </div>
1656|            </div>
1657|          </div>
1658|        </div>
1659|      </header>
1660|
1661|      {/* Main Content */}
1662|      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
1663|        {view === 'upload' && (
1664|          <div className="max-w-2xl mx-auto">
1665|            <UploadForm onSuccess={handleUploadSuccess} />
1666|          </div>
1667|        )}
1668|
1669|        {view === 'gallery' && (
1670|          <div>
1671|            <div className="flex justify-between items-center mb-6">
1672|              <h2 className="text-2xl font-bold text-gray-800">
1673|                Recent Loo Reviews
1674|              </h2>
1675|              <p className="text-gray-600">
1676|                {bathrooms.length} {bathrooms.length === 1 ? 'review' : 'reviews'}
1677|              </p>
1678|            </div>
1679|
1680|            {dataLoading ? (
1681|              <div className="text-center py-12">
1682|                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
1683|                <p className="mt-2 text-gray-600">Loading loo reviews...</p>
1684|              </div>
1685|            ) : bathrooms.length === 0 ? (
1686|              <div className="text-center py-12 bg-white rounded-lg shadow">
1687|                <p className="text-gray-500 text-lg mb-4">No loo reviews yet!</p>
1688|                <button
1689|                  onClick={() => setView('upload')}
1690|                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
1691|                >
1692|                  Rate Your First Loo
1693|                </button>
1694|              </div>
1695|            ) : (
1696|              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
1697|                {bathrooms.map((bathroom) => (
1698|                  <BathroomCard 
1699|                    key={bathroom.id} 
1700|                    bathroom={bathroom} 
1701|                    onClick={handleGalleryItemClick}
1702|                  />
1703|                ))}
1704|              </div>
1705|            )}
1706|          </div>
1707|        )}
1708|
1709|        {view === 'map' && (
1710|          <div>
1711|            <div className="flex justify-between items-center mb-6">
1712|              <h2 className="text-2xl font-bold text-gray-800">
1713|                Loo Locations Map
1714|              </h2>
1715|              <p className="text-gray-600">
1716|                {bathroomsWithCoordinates.length} mapped locations
1717|              </p>
1718|            </div>
1719|
1720|            {bathroomsWithCoordinates.length === 0 ? (
1721|              <div className="text-center py-12 bg-white rounded-lg shadow">
1722|                <p className="text-gray-500 text-lg mb-4">No mapped loo locations yet!</p>
1723|                <p className="text-gray-400 mb-4">Add location coordinates when rating loos to see them on the map.</p>
1724|                <button
1725|                  onClick={() => setView('upload')}
1726|                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
1727|                >
1728|                  Rate a Loo with Location
1729|                </button>
1730|              </div>
1731|            ) : (
1732|              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
1733|                <div className="h-96 lg:h-[500px]">
1734|                  <GoogleMap
1735|                    bathrooms={bathroomsWithCoordinates}
1736|                    onMarkerClick={handleMarkerClick}
1737|                    center={mapCenter}
1738|                  />
1739|                </div>
1740|                <div className="p-4 bg-gray-50 text-sm text-gray-600">
1741|                  💡 Click on map markers to view loo details. Markers show the rating number.
1742|                </div>
1743|              </div>
1744|            )}
1745|          </div>
1746|        )}
1747|      </main>
1748|
1749|      {/* Bathroom Detail Modal */}
1750|      <BathroomModal
1751|        bathroom={selectedBathroom}
1752|        isOpen={showModal}
1753|        onClose={() => setShowModal(false)}
1754|      />
1755|    </div>
1756|  );
1757|}
1758|
1759|export default App;
1760|
