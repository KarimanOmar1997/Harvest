import React, { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper, Typography } from "@mui/material";
import { Cloud, Opacity, WbSunny, Grain } from "@mui/icons-material";
import axios from "axios";
import L from "leaflet";
import * as turf from "@turf/turf"; // Import Turf.js

const DataTable = ({ selectedFeature, mapInstance }) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecastData, setForecastData] = useState([]);
    const [NDVIimages, setNDVIimages] = useState([]);
    const [imageOverlay, setImageOverlay] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const createPolygonOnAgroMonitoring = async (coordinates) => {
        const createPolygonUrl = `http://api.agromonitoring.com/agro/1.0/polygons?appid=${process.env.REACT_APP_AGROMONITORING_API_KEY}&duplicated=true`;

        const originalPolygon = turf.polygon([coordinates]);
        const simplifiedPolygon = turf.simplify(originalPolygon, { tolerance: 0, highQuality: false });

        const polygonData = {
            name: "Simplified Polygon",
            geo_json: {
                type: "Feature",
                properties: {},
                geometry: simplifiedPolygon.geometry,
                // geometry: {
                //     type: "Polygon",
                //     coordinates: coordinates,
                //   },
            },
        };

        try {
            const response = await axios.post(createPolygonUrl, polygonData, {
                headers: { "Content-Type": "application/json" },
            });
            return response.data.id;
        } catch (error) {
            console.error("Error creating polygon on AgroMonitoring:", error);
            setErrorMessage("Failed to create polygon on AgroMonitoring.");
            return null;
        }
    };

    const calculateBounds = (polygonCoordinates) => {
        const latLngs = polygonCoordinates.map((coord) => [coord[1], coord[0]]);
        return L.latLngBounds(latLngs);
    };

    const handleImageClick = (ndviImageUrl, bounds) => {
        if (!mapInstance) {
            console.error("Map instance is not available.");
            return;
        }

        console.log("NDVI Image URL:", ndviImageUrl);
        console.log("Bounds:", bounds);

        // Remove any existing image overlay before adding the new one
        if (imageOverlay) {
            mapInstance.removeLayer(imageOverlay);
            setImageOverlay(null);
        }

        // Create a new image overlay with the given URL and bounds
        const newImageOverlay = L.imageOverlay(ndviImageUrl, bounds, {
            opacity: 1,
        });
        newImageOverlay.addTo(mapInstance);
        setImageOverlay(newImageOverlay);

        // Zoom the map to fit the bounds of the overlay
        mapInstance.fitBounds(bounds);
    };

    const fetchNDVIData = useCallback(async (polygonId, coordinates) => {
        const startTimestamp = startDate ? new Date(startDate).getTime() / 1000 : 0;
        const endTimestamp = endDate ? new Date(endDate).getTime() / 1000 : Date.now() / 1000;

        const ndviUrl = `http://api.agromonitoring.com/agro/1.0/image/search?start=${startTimestamp}&end=${endTimestamp}&polyid=${polygonId}&appid=${process.env.REACT_APP_AGROMONITORING_API_KEY}`;

        try {
            const response = await axios.get(ndviUrl);
            if (response.data && response.data.length > 0) {
                // const ndviData = response.data.map((image) => ({
                //     ndvi: image.image.ndvi,
                //     date: image.dt,
                //     imageUrl: image.image.truecolor, // Assuming the truecolor image URL is available
                //     coordinates,
                // }));
                console.log("fetching NDVI:", response.data);
                const ndviData = await Promise.all(
                  response.data.map(async (image) => {
                    const ndvi = image.image.ndvi;
                    const date = image.dt;
                    try {
                      const r = await axios.get(ndvi);
                      if (r.status !== 500) {
                        return { ndvi, date, coordinates };
                      } else {
                        return null;
                      }
                    } catch (error) {
                      console.log("Error fetching NDVI:", error);
                      return null;
                    }
                  })
                );
      
                const filteredNDVI = await ndviData.filter(
                  (ndvi) => ndvi !== null && ndvi !== undefined
                );
                // setNDVIimages((prevData) => [
                //   ...prevData,
                //   [...filteredNDVI],
                // ]);
                setNDVIimages(filteredNDVI.sort((a, b) => b.date - a.date)); // Sort by date descending
            } else {
                console.log("No NDVI images found for the specified time range.");
                setNDVIimages([]);
            }
        } catch (error) {
            console.error("Error fetching NDVI data:", error);
            setErrorMessage(`NDVI request failed: ${error.message}`);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (selectedFeature) {
            const coordinates = selectedFeature.geometry?.coordinates?.[0];
            let polygonId = selectedFeature.properties?.id;

            if (!coordinates) {
                setErrorMessage("Invalid coordinates for selected feature.");
                return;
            }

            const [lon, lat] = coordinates[0];
            setErrorMessage("");

            const fetchData = async () => {
                if (!polygonId) {
                    polygonId = await createPolygonOnAgroMonitoring(coordinates);
                    if (polygonId) {
                        selectedFeature.properties.id = polygonId;
                    } else {
                        return;
                    }
                }
                // if (selectedFeature && selectedFeature.properties?.id) {
                //     fetchNDVIData(selectedFeature.properties.id, selectedFeature.geometry.coordinates[0]);
                // }
                if (polygonId && coordinates) {
                    await fetchNDVIData(polygonId, coordinates);
                }

                // await fetchNDVIData(polygonId, coordinates);

                const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.REACT_APP_OPENWEATHERMAP_API_KEY}`;
                axios.get(weatherUrl).then((response) => setCurrentWeather(response.data)).catch(console.error);

                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.REACT_APP_OPENWEATHERMAP_API_KEY}`;
                axios.get(forecastUrl).then((response) => {
                    const dailyForecasts = response.data.list.filter((_, index) => index % 8 === 0);
                    setForecastData(dailyForecasts);
                }).catch(console.error);
            };

            fetchData();
        }
    }, [startDate, endDate, selectedFeature, fetchNDVIData]);

    return (
        <TableContainer component={Paper} style={{ marginTop: "20px", padding: "20px", borderRadius: "10px" }}>
            <h3>Input range date</h3>
             <div class="input-group w-50">
      
                    <input
                        type="datetime-local"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
      
                    <input
                        type="datetime-local"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
       
            </div>
            <hr class="my-3" />
            {errorMessage && <Typography color="error" align="center">{errorMessage}</Typography>}
            {currentWeather && 
            <Typography variant="h6" align="center">
                Weather, Vegetation, and Windy Data
            </Typography>}
            <Table>
                <TableBody>
                    {/* Current Weather */}
                    {currentWeather && (
                        <>
                            <TableRow>
                                <TableCell rowSpan={3} style={{ fontSize: "2rem", textAlign: "center", verticalAlign: "middle" }}>
                                    {currentWeather.main.temp}°C
                                </TableCell>
                                <TableCell colSpan={2} align="center">
                                    <img
                                        src={`http://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@2x.png`}
                                        alt="Weather Icon"
                                        style={{ width: "60px" }}
                                    />
                                    <Typography variant="h6">{currentWeather.weather[0].description}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><WbSunny /> Temperature</TableCell>
                                <TableCell>{currentWeather.main.temp} °C</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><Cloud /> Pressure</TableCell>
                                <TableCell>{currentWeather.main.pressure} hPa</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><Opacity /> Humidity</TableCell>
                                <TableCell>{currentWeather.main.humidity}%</TableCell>
                            </TableRow>
                        </>
                    )}
                    {/* NDVI Data */}
                    {NDVIimages.length > 0 && (
                        <TableRow>
                            <TableCell><Grain /> NDVI</TableCell>
                            <TableCell>
                                {NDVIimages.map((image, index) => { // Limit to first 5 dates
                                    const bounds = calculateBounds(image.coordinates);
                                    return (
                                        <p
                                            key={index}
                                            onClick={() => handleImageClick(image.ndvi, bounds)}
                                            style={{
                                                cursor: "pointer",
                                                color: "blue",
                                                textDecoration: "underline",
                                            }}
                                        >
                                            Date: {new Date(image.date * 1000).toLocaleDateString()}
                                        </p>
                                    );
                                })}
                            </TableCell>
                        </TableRow>
                    )}
                    {/* Forecast Data */}
                    {forecastData.length > 0 && (
                        <>
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography variant="h6" align="center">Forecast</Typography>
                                </TableCell>
                            </TableRow>
                            {forecastData.map((forecast, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        {new Date(forecast.dt * 1000).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <img
                                            src={`http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png`}
                                            alt="Weather Icon"
                                            style={{ width: "40px" }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {forecast.main.temp}°C, {forecast.weather[0].description}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default DataTable;