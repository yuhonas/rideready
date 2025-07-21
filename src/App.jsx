import './App.css'
import React, { useState, useEffect, useCallback } from 'react';

// Main App component
const App = () => {
  // State for latitude and longitude (defaulting to Melbourne, Australia)
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // State for riding criteria
  // Default riding criteria constants
  const DEFAULT_MAX_WIND_SPEED = 20;
  const DEFAULT_MIN_TEMPERATURE = 10;
  const DEFAULT_MAX_TEMPERATURE = 35;
  const DEFAULT_MAX_PRECIPITATION = 0;

  const [maxPrecipitation, setMaxPrecipitation] = useState(DEFAULT_MAX_PRECIPITATION);
  const [maxWindSpeed, setMaxWindSpeed] = useState(DEFAULT_MAX_WIND_SPEED);
  const [minTemperature, setMinTemperature] = useState(DEFAULT_MIN_TEMPERATURE);
  const [maxTemperature, setMaxTemperature] = useState(DEFAULT_MAX_TEMPERATURE);

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
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,wind_speed_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

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

  // Function to organize weather data into grid format
  const organizeWeatherGrid = () => {
    if (!weatherData || !weatherData.hourly) {
      return { days: [], hours: [], grid: [] };
    }

    const { time, precipitation, wind_speed_10m, temperature_2m } = weatherData.hourly;
    const dayMap = new Map();
    const hoursSet = new Set();

    // Group data by day and collect all hours
    for (let i = 0; i < time.length; i++) {
      const dateTime = new Date(time[i]);
      const dayKey = dateTime.toDateString();
      const hour = dateTime.getHours();

      hoursSet.add(hour);

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          date: dateTime,
          hours: new Map()
        });
      }

      // Check if conditions are suitable for riding
      const isSuitable =
        precipitation[i] <= maxPrecipitation &&
        wind_speed_10m[i] <= maxWindSpeed &&
        temperature_2m[i] >= minTemperature &&
        temperature_2m[i] <= maxTemperature;

      dayMap.get(dayKey).hours.set(hour, {
        suitable: isSuitable,
        temperature: temperature_2m[i],
        precipitation: precipitation[i],
        windSpeed: wind_speed_10m[i],
        isPast: dateTime < new Date()
      });
    }

    const days = Array.from(dayMap.values()).sort((a, b) => a.date - b.date);
    const hours = Array.from(hoursSet).sort((a, b) => a - b).filter(hour => hour >= 6);

    // Create grid data with days as rows and hours as columns
    const grid = days.map(day => ({
      day,
      hours: hours.map(hour => day.hours.get(hour) || null)
    }));

    return { days, hours, grid };
  };

  const { days, hours, grid } = organizeWeatherGrid();

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
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">
      🏍️ POC Ride Ready - 7 Day Forecast
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
        value={latitude || ''}
        onChange={(e) => setLatitude(e.target.value)}
        placeholder="Latitude"
        className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        <input
        type="text"
        value={longitude || ''}
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
      Suitable Forecasted Riding Windows
      </h2>
      <p className="mb-6">Select your criteria</p>
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

      {/* Weather Grid Display */}
      <p className="text-sm text-gray-500 mb-4">Green blocks indicate suitable riding conditions based on your criteria:</p>
      {days.length > 0 ? (
        <div className="relative overflow-hidden">
          <div className="flex">
            {/* Fixed Day Column */}
            <div className="flex-shrink-0 bg-white border-r border-gray-200 z-10">
              {/* Day Header */}
              <div className="p-2 text-xs text-gray-600 font-extrabold h-10 flex items-center border-b border-gray-200 bg-gray-50">
                Day
              </div>
              {/* Day Rows */}
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="p-2 text-xs font-medium text-gray-600 flex items-center h-16 border-b border-gray-100 last:border-b-0 bg-white min-w-[120px]">
                  {formatDate(row.day.date)}
                </div>
              ))}
            </div>

            {/* Scrollable Hours Section */}
            <div className="overflow-x-auto flex-1">
              <div className="min-w-max">
                {/* Hours Header */}
                <div className="flex gap-1 h-10 border-b border-gray-200 bg-gray-50">
                  {hours.map((hour, index) => (
                    <div key={index} className="p-2 text-xs font-medium text-gray-600 text-center min-w-[80px] flex items-center justify-center">
                      {formatTime(new Date(new Date().setHours(hour, 0, 0, 0)))}
                    </div>
                  ))}
                </div>

                {/* Weather Grid Rows */}
                {grid.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1 h-16 border-b border-gray-100 last:border-b-0">
                    {row.hours.map((cell, cellIndex) => (
                      <div
                        key={cellIndex}
                        className={`p-2 rounded text-xs border transition-all duration-200 hover:scale-105 min-w-[80px] ${
                          !cell
                            ? 'bg-gray-100 border-gray-200'
                            : cell.isPast
                            ? 'bg-gray-200 border-gray-300 opacity-50'
                            : cell.suitable
                            ? 'bg-green-100 border-green-300 hover:bg-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                        title={
                          cell
                            ? `${cell.temperature}°C, ${cell.windSpeed}km/h, ${cell.precipitation}mm${cell.isPast ? ' (past)' : ''}`
                            : 'No data'
                        }
                      >
                        {cell && (
                          <div className="flex flex-col items-center justify-center h-12">
                            <div className="font-medium">{Math.round(cell.temperature)}°C</div>
                            <div className="text-xs text-gray-600">
                              {cell.windSpeed}km/h
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && !error && weatherData && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">No data available!</strong>
            <span className="block sm:inline"> Unable to load weather data for the forecast period.</span>
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
