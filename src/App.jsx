import './App.css'
import React, { useState, useEffect, useCallback } from 'react';

// Main App component
const App = () => {
    // State for latitude and longitude (defaulting to Melbourne, Australia)
    const [latitude, setLatitude] = useState('-37.8136');
    const [longitude, setLongitude] = useState('144.9631');
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
        setLoading(true); // Set loading to true while fetching
        setError('');      // Clear any previous errors
        setWeatherData(null); // Clear previous weather data

        try {
            // Open-Meteo API URL
            const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation,wind_speed_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=2`;

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

        const { time, precipitation, wind_speed_10m } = weatherData.hourly;
        const ridingWindows = [];
        let currentWindowStart = null;

        // Iterate through hourly forecast data
        for (let i = 0; i < time.length; i++) {
            const dateTime = new Date(time[i]);
            const currentPrecipitation = precipitation[i];
            const currentWindSpeed = wind_speed_10m[i];

            // Check if conditions are suitable for riding
            const isSuitable = currentPrecipitation === 0 && currentWindSpeed < 20;

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
                    🏍️ POC Ride Ready (Gap Finder)
                </h1>

                {/* Location Input */}
                <div className="mb-6">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                        Location (e.g., Melbourne) - Lat: {latitude}, Lon: {longitude}
                    </label>
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
                <button
                    onClick={fetchWeatherData}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-300 ${
                        loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50'
                    } shadow-md mb-6`}
                >
                    {loading ? 'Fetching Weather...' : 'Refresh Weather Data'}
                </button>

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
                    <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow-inner">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Current Conditions ({cityName})</h2>
                        <p className="text-gray-700">
                            <span className="font-medium">Time:</span> {formatDate(new Date(weatherData.hourly.time[0]))} {formatTime(new Date(weatherData.hourly.time[0]))}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Precipitation:</span> {weatherData.hourly.precipitation[0]} mm
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Wind Speed:</span> {weatherData.hourly.wind_speed_10m[0]} km/h
                        </p>
                    </div>
                )}

                {/* Riding Windows Display */}
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Suitable Riding Windows
                </h2>
                {ridingWindows.length > 0 ? (
                    <ul className="space-y-4">
                        {ridingWindows.map((window, index) => (
                            <li key={index} className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                                <p className="text-lg font-medium text-green-800">
                                    {formatDate(window.start)}: {formatTime(window.start)} - {formatTime(window.end)}
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    (No rain, wind below 20 km/h)
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !loading && !error && weatherData && (
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative" role="alert">
                            <strong className="font-bold">No windows found!</strong>
                            <span className="block sm:inline"> No suitable riding windows found in the next 48 hours based on your criteria.</span>
                        </div>
                    )
                )}
                 {/* Footer for Tailwind CSS and Inter Font */}
                <div className="mt-8 text-center text-gray-500 text-xs">
                    <p>Powered by Open-Meteo.com</p>
                </div>
            </div>
        </div>
    );
};

// Export the App component as default
export default App;

