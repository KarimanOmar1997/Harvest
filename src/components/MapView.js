// src/components/MapView.js

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import { CircularProgress } from '@mui/material';
import axios from 'axios';
import "leaflet/dist/leaflet.css";

const MapView = ({ geoJsonData, selectedFeature, onFeatureSelect, center, zoom }) => {
    const [weatherData, setWeatherData] = useState(null);
    const [forecastData, setForecastData] = useState(null);

    useEffect(() => {
        if (selectedFeature) {
            const coordinates = selectedFeature.geometry.coordinates[0][0];
            const [lon, lat] = coordinates;

            // Fetch weather data
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.REACT_APP_OPENWEATHERMAP_API_KEY}`;
            axios.get(weatherUrl).then(response => {
                setWeatherData(response.data);
            });

            // Fetch weather forecast data
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.REACT_APP_OPENWEATHERMAP_API_KEY}`;
            axios.get(forecastUrl).then(response => {
                setForecastData(response.data);
            });
        }
    }, [selectedFeature]);

    return (
        <MapContainer style={{ height: "500px", width: "100%" }} center={center} zoom={zoom}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {geoJsonData && (
                <GeoJSON
                    data={geoJsonData}
                    onEachFeature={(feature, layer) => {
                        layer.on('click', () => onFeatureSelect(feature));
                    }}
                >
                    {selectedFeature && weatherData && (
                        <Popup position={selectedFeature.geometry.coordinates[0][0].reverse()}>
                            <div>
                                <h3>{selectedFeature.properties.name || `Polygon`}</h3>
                                <p><strong>Temperature:</strong> {weatherData.main.temp} °C</p>
                                <p><strong>Weather:</strong> {weatherData.weather[0].description}</p>
                                <p><strong>Forecast:</strong></p>
                                {forecastData ? (
                                    <ul>
                                        {forecastData.list.slice(0, 3).map((entry, idx) => (
                                            <li key={idx}>
                                                {new Date(entry.dt * 1000).toLocaleString()}: {entry.main.temp} °C, {entry.weather[0].description}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <CircularProgress />
                                )}
                            </div>
                        </Popup>
                    )}
                </GeoJSON>
            )}
        </MapContainer>
    );
};

export default MapView;
