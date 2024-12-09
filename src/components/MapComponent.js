// src/components/MapComponent.js

import React, { useState } from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Windy API overlay setup (loaded using an iframe with Leaflet)
const WindyMapOverlay = ({ lat, lon }) => {
    const windyApiKey = process.env.REACT_APP_WINDY_API_KEY;
    const iframeUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=5&level=surface&overlay=wind&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&detailLat=&detailLon=&metricWind=m/s&metricTemp=default&radarRange=-1&key=${windyApiKey}`;

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <iframe
                title="Windy Map"
                src={iframeUrl}
                frameBorder="0"
                style={{ height: '100%', width: '100%' }}
                allow="fullscreen"
            />
        </div>
    );
};

const MapComponent = () => {
    const [mapType, setMapType] = useState('satellite'); // default to satellite
    const [center] = useState([30.0444, 31.2357]); // Center around Cairo, Egypt

    return (
        <div style={{ height: '500px', position: 'relative' }}>
            <button
                onClick={() => setMapType(mapType === 'satellite' ? 'windy' : 'satellite')}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '10px',
                    background: '#fff',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    border: '1px solid #ddd'
                }}
            >
                Toggle to {mapType === 'satellite' ? 'Windy' : 'Satellite'} Map
            </button>

            {mapType === 'satellite' ? (
                <MapContainer center={center} zoom={5} style={{ height: '100%' }}
                >
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Satellite Imagery">
                            <TileLayer
                                url="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=YOUR_MAPBOX_ACCESS_TOKEN"
                                attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                </MapContainer>
            ) : (
                <WindyMapOverlay lat={center[0]} lon={center[1]} />
            )}
        </div>
    );
};

export default MapComponent;
