import express from "express";
const router = express.Router();
// Search places using Ola Maps API with MapMyIndia and OpenStreetMap fallback
router.get("/search", async (req, res) => {
    try {
        const { query, region = "IND" } = req.query;
        if (!query || typeof query !== "string") {
            return res.status(400).json({
                success: false,
                error: "Query parameter is required",
            });
        }
        if (query.length < 3) {
            return res.json({
                success: true,
                data: { results: [] },
            });
        }
        console.log(`Searching for: "${query}" in region: ${region}`);
        // Try Ola Maps API first (500K free requests/month)
        const olaMapsApiKey = process.env.OLA_MAPS_API_KEY;
        if (olaMapsApiKey && olaMapsApiKey !== "your_ola_maps_api_key_here") {
            try {
                console.log("Trying Ola Maps API...");
                console.log("Ola API Key (first 10 chars):", olaMapsApiKey.substring(0, 10) + "...");
                // Official Ola Maps Autocomplete API (better for real-time search suggestions)
                // Documentation: https://maps.olakrutrim.com/apidocs#tag/places-apis/GET/places/v1/autocomplete
                // This is preferred over textsearch for interactive location picking as it's optimized for real-time suggestions
                // Authentication: api_key query parameter (as per official docs)
                const olaMapsUrl = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${olaMapsApiKey}`;
                const olaMapsResponse = await fetch(olaMapsUrl, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "EventManagementPlatform/1.0",
                    },
                });
                if (olaMapsResponse.ok) {
                    const olaMapsData = await olaMapsResponse.json();
                    console.log("Ola Maps API response:", olaMapsData);
                    let transformedResults = [];
                    // Handle Ola Maps TextSearch response format (returns predictions)
                    if (olaMapsData.predictions && olaMapsData.predictions.length > 0) {
                        transformedResults = olaMapsData.predictions.map((place) => ({
                            name: place.structured_formatting.main_text,
                            formatted_address: place.description,
                            geometry: place.geometry || {
                                location: { lat: 0, lng: 0 }, // Some predictions might not have coordinates
                            },
                            place_id: place.place_id,
                        }));
                    }
                    if (transformedResults.length > 0) {
                        console.log(`Found ${transformedResults.length} results from Ola Maps`);
                        return res.json({
                            success: true,
                            data: {
                                results: transformedResults,
                            },
                            provider: "olamaps",
                        });
                    }
                }
                else {
                    console.log(`Ola Maps API failed with status: ${olaMapsResponse.status}`);
                    const errorText = await olaMapsResponse.text();
                    console.log("Ola Maps error response:", errorText);
                }
            }
            catch (olaMapsError) {
                console.log("Ola Maps API error, falling back to MapMyIndia:", olaMapsError);
            }
        }
        else {
            console.log("Ola Maps API key not configured, trying MapMyIndia");
        }
        // Try MapMyIndia API as second option (limited free tier)
        const mapMyIndiaApiKey = process.env.MAPMYINDIA_API_KEY;
        if (mapMyIndiaApiKey &&
            mapMyIndiaApiKey !== "your_mapmyindia_api_key_here") {
            try {
                console.log("Trying MapMyIndia API as fallback...");
                console.log("MapMyIndia API Key (first 10 chars):", mapMyIndiaApiKey.substring(0, 10) + "...");
                // MapMyIndia Autosuggest API - using the correct endpoint from official docs
                // Correct endpoint: https://search.mappls.com/search/places/autosuggest/json
                let mapMyIndiaUrl;
                // Use the correct autosuggest endpoint with access_token parameter
                mapMyIndiaUrl = `https://search.mappls.com/search/places/autosuggest/json?query=${encodeURIComponent(query)}&region=${region}&access_token=${mapMyIndiaApiKey}`;
                console.log("MapMyIndia request URL (correct endpoint):", mapMyIndiaUrl);
                const mapMyIndiaResponse = await fetch(mapMyIndiaUrl, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "EventManagementPlatform/1.0",
                    },
                });
                if (mapMyIndiaResponse.ok) {
                    const mapMyIndiaData = await mapMyIndiaResponse.json();
                    console.log("MapMyIndia API response:", mapMyIndiaData);
                    let transformedResults = [];
                    // Handle MapMyIndia autosuggest response format
                    if (mapMyIndiaData.suggestedLocations &&
                        mapMyIndiaData.suggestedLocations.length > 0) {
                        transformedResults = mapMyIndiaData.suggestedLocations.map((place) => ({
                            name: place.placeName,
                            formatted_address: place.placeAddress,
                            geometry: {
                                location: {
                                    lat: 0, // MapMyIndia autosuggest doesn't provide coordinates directly
                                    lng: 0, // We would need to use Place Details API with eLoc
                                },
                            },
                            place_id: place.eLoc, // Use eLoc as place_id
                            eloc: place.eLoc, // Include for future coordinate lookup
                            type: place.type,
                        }));
                    }
                    else if (mapMyIndiaData.results &&
                        mapMyIndiaData.results.length > 0) {
                        transformedResults = mapMyIndiaData.results;
                    }
                    if (transformedResults.length > 0) {
                        console.log(`Found ${transformedResults.length} results from MapMyIndia`);
                        return res.json({
                            success: true,
                            data: {
                                results: transformedResults,
                            },
                            provider: "mapmyindia",
                        });
                    }
                }
                else {
                    console.log(`MapMyIndia API failed with status: ${mapMyIndiaResponse.status}`);
                    const errorText = await mapMyIndiaResponse.text();
                    console.log("MapMyIndia error response:", errorText);
                    console.log("MapMyIndia request URL:", mapMyIndiaUrl);
                    // Try alternative endpoint if 412 error (often indicates API key or endpoint issues)
                    if (mapMyIndiaResponse.status === 412) {
                        console.log("Trying alternative MapMyIndia endpoint...");
                        try {
                            // Alternative endpoint format
                            const altUrl = `https://atlas.mapmyindia.com/api/places/search/json?query=${encodeURIComponent(query)}&region=${region}&access_token=${mapMyIndiaApiKey}`;
                            const altResponse = await fetch(altUrl, {
                                headers: {
                                    "User-Agent": "EventManagementPlatform/1.0",
                                },
                            });
                            if (altResponse.ok) {
                                const altData = await altResponse.json();
                                console.log("Alternative MapMyIndia API response:", altData);
                                // Handle response format
                                let transformedResults = [];
                                if (altData.suggestedLocations &&
                                    altData.suggestedLocations.length > 0) {
                                    transformedResults = altData.suggestedLocations.map((place) => ({
                                        name: place.placeName,
                                        formatted_address: place.placeAddress,
                                        geometry: {
                                            location: {
                                                lat: parseFloat(place.latitude),
                                                lng: parseFloat(place.longitude),
                                            },
                                        },
                                        place_id: place.placeId,
                                    }));
                                }
                                else if (altData.results && altData.results.length > 0) {
                                    transformedResults = altData.results;
                                }
                                if (transformedResults.length > 0) {
                                    console.log(`Found ${transformedResults.length} results from alternative MapMyIndia endpoint`);
                                    return res.json({
                                        success: true,
                                        data: {
                                            results: transformedResults,
                                        },
                                        provider: "mapmyindia",
                                    });
                                }
                            }
                            else {
                                console.log(`Alternative MapMyIndia endpoint also failed with status: ${altResponse.status}`);
                                const altErrorText = await altResponse.text();
                                console.log("Alternative endpoint error:", altErrorText);
                            }
                        }
                        catch (altError) {
                            console.log("Alternative MapMyIndia endpoint error:", altError);
                        }
                    }
                }
            }
            catch (mapMyIndiaError) {
                console.log("MapMyIndia API error:", mapMyIndiaError);
            }
        }
        else {
            console.log("MapMyIndia API key not configured");
        }
        // If both Ola Maps and MapMyIndia failed, return an error
        console.log("Both primary location APIs failed");
        res.status(500).json({
            success: false,
            error: "Location search services are currently unavailable. Please try again later.",
        });
    }
    catch (error) {
        console.error("Location search error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to search locations",
        });
    }
});
// Reverse geocoding - get address from coordinates
router.get("/reverse", async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng || typeof lat !== "string" || typeof lng !== "string") {
            return res.status(400).json({
                success: false,
                error: "Latitude and longitude parameters are required",
            });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                success: false,
                error: "Invalid coordinates",
            });
        }
        console.log(`Reverse geocoding: ${latitude}, ${longitude}`);
        // Try Ola Maps API first (500K free requests/month)
        const olaMapsApiKey = process.env.OLA_MAPS_API_KEY;
        if (olaMapsApiKey && olaMapsApiKey !== "your_ola_maps_api_key_here") {
            try {
                console.log("Trying Ola Maps reverse geocoding...");
                // Official Ola Maps Reverse Geocoding API
                // Documentation: https://maps.olakrutrim.com/apidocs
                // Endpoint: /places/v1/reverse-geocode with latlng parameter
                const olaMapsUrl = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${olaMapsApiKey}`;
                const olaMapsResponse = await fetch(olaMapsUrl, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "EventManagementPlatform/1.0",
                    },
                });
                if (olaMapsResponse.ok) {
                    const olaMapsData = await olaMapsResponse.json();
                    console.log("Ola Maps reverse geocoding response:", olaMapsData);
                    return res.json({
                        success: true,
                        data: olaMapsData,
                        provider: "olamaps",
                    });
                }
                else {
                    console.log(`Ola Maps reverse geocoding failed with status: ${olaMapsResponse.status}`);
                }
            }
            catch (olaMapsError) {
                console.log("Ola Maps reverse geocoding error, falling back to MapMyIndia:", olaMapsError);
            }
        }
        else {
            console.log("Ola Maps API key not configured, trying MapMyIndia for reverse geocoding");
        }
        // Try MapMyIndia API as second option
        const mapMyIndiaApiKey = process.env.MAPMYINDIA_API_KEY;
        if (mapMyIndiaApiKey &&
            mapMyIndiaApiKey !== "cca7cc6fa46564a60cc71da4892107e0") {
            try {
                console.log("Trying MapMyIndia reverse geocoding...");
                // MapMyIndia Reverse Geocoding API - using newer endpoint format
                const mapMyIndiaUrl = `https://apis.mapmyindia.com/advancedmaps/v1/${mapMyIndiaApiKey}/rev_geocode?lat=${latitude}&lng=${longitude}`;
                const mapMyIndiaResponse = await fetch(mapMyIndiaUrl, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "EventManagementPlatform/1.0",
                    },
                });
                if (mapMyIndiaResponse.ok) {
                    const mapMyIndiaData = await mapMyIndiaResponse.json();
                    console.log("MapMyIndia reverse geocoding response:", mapMyIndiaData);
                    return res.json({
                        success: true,
                        data: mapMyIndiaData,
                        provider: "mapmyindia",
                    });
                }
                else {
                    console.log(`MapMyIndia reverse geocoding failed with status: ${mapMyIndiaResponse.status}`);
                }
            }
            catch (mapMyIndiaError) {
                console.log("MapMyIndia reverse geocoding error, falling back to OpenStreetMap:", mapMyIndiaError);
            }
        }
        else {
            console.log("MapMyIndia API key not configured, using OpenStreetMap for reverse geocoding");
        }
        // If both Ola Maps and MapMyIndia reverse geocoding failed, return an error
        console.log("Both primary reverse geocoding APIs failed");
        res.status(500).json({
            success: false,
            error: "Reverse geocoding services are currently unavailable. Please try again later.",
        });
    }
    catch (error) {
        console.error("Reverse geocoding error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to reverse geocode coordinates",
        });
    }
});
export default router;
