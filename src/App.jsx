import './App.css'
import React, { useState, useEffect, useCallback } from 'react';

// Main App component
const App = () => {
  // State for latitude and longitude (defaulting to Melbourne, Australia)
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // State for riding criteria
  const [maxPrecipitation, setMaxPrecipitation] = useState(0);
  const [maxWindSpeed, setMaxWindSpeed] = useState(20);
  const [minTemperature, setMinTemperature] = useState(10);
  const [maxTemperature, setMaxTemperature] = useState(35);

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
      setLatitude(position.coords.latitude.toString());
      setLongitude(position.coords.longitude.toString());
      },
      (error) => {
      console.error('Error getting location:', error);
      // Fallback to Melbourne coordinates
      setLatitude('-37.8136');
      setLongitude('144.9631');
      setError('Unable to get your location. Using Melbourne as default.');
      }
    );
    } else {
    // Geolocation not supported, use Melbourne as fallback
    setLatitude('-37.8136');
    setLongitude('144.9631');
    setError('Geolocation not supported by this browser. Using Melbourne as default.');
    }
  }, []);
  // State for weather data
  const [weatherData, setWeatherData] = useState(null);
  // State for loading status
  const [loading, setLoading] = useState(false);
  // State for any errors
  const [error, setError] = useState('');
  // State for current city name (optional, could be added via geocoding)
  const [cityName, setCityName] = useState('Melbourne');

  // Function to fetch weather data from Open-Meteo API
  const fetchWeatherData = useCallback(async () => {
    // Only fetch if we have valid coordinates
    if (!latitude || !longitude) {
    return;
    }

    setLoading(true); // Set loading to true while fetching
    setError('');      // Clear any previous errors
    setWeatherData(null); // Clear previous weather data

    try {
      // Open-Meteo API URL
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,wind_speed_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=2`;

      const response = await fetch(apiUrl);
      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setWeatherData(data); // Set the fetched weather data
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError('Failed to fetch weather data. Please try again.'); // Set error message
    } finally {
      setLoading(false); // Set loading to false once fetching is complete
    }
  }, [latitude, longitude]); // Dependencies for useCallback

  // useEffect hook to fetch data when latitude or longitude changes
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]); // Dependency array ensures it runs when fetchWeatherData changes (which is on initial render and when lat/lon change)

  // Function to find suitable riding windows
  const findRidingWindows = () => {
    if (!weatherData || !weatherData.hourly) {
      return []; // Return empty array if no data
    }

    const { time, precipitation, wind_speed_10m, temperature_2m } = weatherData.hourly;
    const ridingWindows = [];
    let currentWindowStart = null;

    // Iterate through hourly forecast data
    for (let i = 0; i < time.length; i++) {
      const dateTime = new Date(time[i]);
      const currentPrecipitation = precipitation[i];
      const currentWindSpeed = wind_speed_10m[i];
      const currentTemperature = temperature_2m[i];

      // Check if conditions are suitable for riding based on user criteria
      const isSuitable =
        currentPrecipitation <= maxPrecipitation &&
        currentWindSpeed <= maxWindSpeed &&
        currentTemperature >= minTemperature &&
        currentTemperature <= maxTemperature;

      if (isSuitable) {
        // If suitable and no window is currently open, start a new window
        if (currentWindowStart === null) {
          currentWindowStart = dateTime;
        }
      } else {
        // If not suitable and a window was open, close it
        if (currentWindowStart !== null) {
          ridingWindows.push({
            start: currentWindowStart,
            end: dateTime // End time is the start of the unsuitable hour
          });
          currentWindowStart = null;
        }
      }
    }

    // After the loop, if a window is still open, close it (means it extends to the end of the forecast)
    if (currentWindowStart !== null) {
      const lastTime = new Date(time[time.length - 1]);
      // Add 1 hour to the last reported time as it represents the start of that hour
      const lastForecastEnd = new Date(lastTime.getTime() + 60 * 60 * 1000);
      ridingWindows.push({
        start: currentWindowStart,
        end: lastForecastEnd
      });
    }

    return ridingWindows;
  };

  const ridingWindows = findRidingWindows();

  // Helper to format date for display
  const formatDate = (date) => date.toLocaleDateString('en-AU', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  // Helper to format time for display
  const formatTime = (date) => date.toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">
      🏍️ POC Ride Ready ({new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'long' })})
      </h1>

      {/* Location Input */}
      <div className="mb-6">
      <input
        type="text"
        id="city"
        value={cityName}
        onChange={(e) => setCityName(e.target.value)}
        placeholder="Enter city name or adjust Lat/Lon below"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2"
        disabled // Disabled for now, as geocoding isn't implemented.
      />
      <div className="flex space-x-4">
        <input
        type="text"
        value={latitude}
        onChange={(e) => setLatitude(e.target.value)}
        placeholder="Latitude"
        className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <input
        type="text"
        value={longitude}
        onChange={(e) => setLongitude(e.target.value)}
        placeholder="Longitude"
        className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Currently hardcoded to Melbourne (change Lat/Lon above for other locations).
      </p>
      </div>

        {/* Fetch Button */}
      {/* Loading and Error Messages */}
      {loading && (
      <div className="flex items-center justify-center py-4 text-blue-600">
        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading weather data...
      </div>
      )}
      {error && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
      )}

      {/* Current Weather Display (if data available) */}
      {weatherData && weatherData.hourly && (
        <>
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Current Conditions</h2>
      <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow-inner">
        <p className="text-gray-700">
        <span className="font-medium">Temperature:</span>{' '}
        {(() => {
          // Find the index for the current hour
          const now = new Date();
          // Round to the nearest hour in the weather data's timezone
          const pad = (n) => n.toString().padStart(2, '0');
          const localISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
          const idx = weatherData.hourly.time.findIndex(t => t.startsWith(localISO));
          return idx !== -1
          ? `${weatherData.hourly.temperature_2m[idx]} °C`
          : 'N/A';
        })()}
        </p>
        <p className="text-gray-700">
        <span className="font-medium">Precipitation:</span> {weatherData.hourly.precipitation[0]} mm
        </p>
        <p className="text-gray-700">
        <span className="font-medium">Wind Speed:</span> {weatherData.hourly.wind_speed_10m[0]} km/h
        </p>
      </div></>
      )}

      <button
      onClick={fetchWeatherData}
      disabled={loading}
      className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-300 ${
        loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50'
      } shadow-md mb-6`}
      >
      {loading ? 'Fetching Weather...' : 'Refresh Weather Data'}
      </button>


      {/* Riding Criteria */}
      <>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
      Suitable Riding Windows
      </h2>
      <p class="mb-6">Select your criteria</p>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Precipitation: {maxPrecipitation} mm
          </label>
          <input
            type="range"
            value={maxPrecipitation}
            onChange={(e) => setMaxPrecipitation(Number(e.target.value))}
            min="0"
            max="10"
            step="0.1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Wind Speed: {maxWindSpeed} km/h
          </label>
          <input
            type="range"
            value={maxWindSpeed}
            onChange={(e) => setMaxWindSpeed(Number(e.target.value))}
            min="0"
            max="50"
            step="1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Temperature: {minTemperature}°C
          </label>
          <input
            type="range"
            value={minTemperature}
            onChange={(e) => setMinTemperature(Number(e.target.value))}
            min="-10"
            max="40"
            step="1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Temperature: {maxTemperature}°C
          </label>
          <input
            type="range"
            value={maxTemperature}
            onChange={(e) => setMaxTemperature(Number(e.target.value))}
            min="-10"
            max="50"
            step="1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          </div>
        </div>
      </div></>

      {/* Riding Windows Display */}
      <p className="text-sm text-gray-500 mb-4">Based on your criteria, here are the suitable riding windows:</p>
      {ridingWindows.length > 0 ? (
      <ul className="space-y-4">
      {ridingWindows.map((window, index) => {
        // Find the index of the start time in the weather data
        const startIndex = weatherData.hourly.time.findIndex(
        t => new Date(t).getTime() === window.start.getTime()
        );
        // Use the temperature at the start of the window
        const temp =
        startIndex !== -1
        ? weatherData.hourly.temperature_2m[startIndex]
        : 'N/A';

        // Calculate window length in hours
        const windowLengthHours = Math.round(
        (window.end - window.start) / (1000 * 60 * 60)
        );

        // Determine if the window is in the past
        const now = new Date();
        const isPast = window.end <= now;

        return (
        <React.Fragment key={index}>
        {/* Show date heading above the first window of each day */}
        <li
        className={`bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 flex items-center space-x-4 ${
          isPast ? 'opacity-50 grayscale pointer-events-none' : ''
        }`}
        >
        {/* Weather Icon */}
        <span className="text-2xl" title="Clear & Calm">
        🌤️
        </span>
        <div className="flex-1">
        <p className="text-lg font-medium text-green-800 flex items-center space-x-2">
          <span>
          {formatTime(window.start)} - {formatTime(window.end)}
          </span>
          <span className="inline-flex items-center ml-3 text-gray-700 text-base font-semibold">
          <span className="mr-1" title="Temperature">🌡️</span>
          {temp}°C
          </span>
          <span className="inline-flex items-center ml-3 text-gray-700 text-base font-semibold">
          <span className="mr-1" title="Wind Speed">💨</span>
          {startIndex !== -1
          ? `${weatherData.hourly.wind_speed_10m[startIndex]} km/h`
          : 'N/A'}
          </span>
          <span className="inline-flex items-center ml-3 text-gray-700 text-base font-semibold">
          <span className="mr-1" title="Window Length">⏱️</span>
          {windowLengthHours} hr{windowLengthHours !== 1 ? 's' : ''}
          </span>
        </p>
        </div>
        </li>
        </React.Fragment>
        );
      })}
      </ul>
      ) : (
      !loading && !error && weatherData && (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative" role="alert">
        <strong className="font-bold">No windows found!</strong>
        <span className="block sm:inline"> No suitable riding windows found in the next 48 hours based on your criteria.</span>
      </div>
      )
      )}
      <div className="mt-8 text-center text-gray-500 text-xs">
      <p>Powered by Open-Meteo.com</p>
      </div>
    </div>
    </div>
  );
};

// Export the App component as default
export default App;
