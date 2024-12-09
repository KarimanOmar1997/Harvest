// src/components/FileUploader.js

import React from 'react';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { kml as toGeoJSON } from '@tmcw/togeojson';

const FileUploader = ({ onFileLoad }) => {
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const zip = await JSZip.loadAsync(file);
        const kmlFile = zip.file(/.kml$/i)[0]; // Get the first KML file in the KMZ archive

        if (kmlFile) {
            const kmlText = await kmlFile.async("text");
            const kmlDom = new DOMParser().parseFromString(kmlText, "text/xml");
            const geoJsonData = toGeoJSON(kmlDom); // Convert KML to GeoJSON

            // Assign a unique ID to each feature if it doesn't have one
            geoJsonData.features = geoJsonData.features.map((feature, index) => {
                if (!feature.properties.id) {
                    feature.properties.id = `polygon_${index}`;
                }
                return feature;
            });

            onFileLoad(geoJsonData); // Pass GeoJSON data to the parent component
        } else {
            alert("No KML file found in KMZ.");
        }
    };

    return (
        <div>
            <input type="file" accept=".kmz" onChange={handleFileChange} className="form-control w-25"/>
        </div>
    );
};

export default FileUploader;
