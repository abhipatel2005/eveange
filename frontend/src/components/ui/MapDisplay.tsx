import React, { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink, Navigation, Copy, Check } from "lucide-react";

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  address: string;
  eventTitle?: string;
  className?: string;
  height?: string;
}

// Extend Window interface for MapMyIndia
declare global {
  interface Window {
    mappls?: {
      Map: new (element: HTMLElement, options: any) => any;
      Marker: new (options: any) => any;
    };
  }
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  latitude,
  longitude,
  address,
  eventTitle,
  className = "",
  height = "300px",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const API_KEY = import.meta.env.VITE_MAPMYINDIA_API_KEY;

  // Initialize MapMyIndia map
  useEffect(() => {
    if (!API_KEY || API_KEY === "your_mapmyindia_api_key_here") {
      setMapError("MapMyIndia API key not configured");
      return;
    }

    if (!latitude || !longitude) {
      setMapError("Invalid coordinates");
      return;
    }

    // Load MapMyIndia Maps SDK
    const loadMapScript = () => {
      if (window.mappls) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://apis.mapmyindia.com/advancedmaps/v1/${API_KEY}/map_load?v=1.3`;
      script.async = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setMapError("Failed to load map. Please check your API key.");
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.mappls) return;

      try {
        // Clear any existing map
        mapRef.current.innerHTML = "";

        // Initialize map
        const map = new window.mappls.Map(mapRef.current, {
          center: [latitude, longitude],
          zoom: 15,
          search: false,
          traffic: false,
          location: false,
          geolocation: false,
        });

        // Add marker
        new window.mappls.Marker({
          map: map,
          position: [latitude, longitude],
          fitbounds: true,
          icon_url:
            "https://apis.mapmyindia.com/map_v3/1.3/png?height=30&width=20&color=red&text=📍",
          popup: eventTitle
            ? `<div class="p-2"><strong>${eventTitle}</strong><br/>${address}</div>`
            : address,
        });

        setMapError(null);
      } catch (error) {
        console.error("Map initialization error:", error);
        setMapError("Failed to initialize map");
      }
    };

    loadMapScript();
  }, [latitude, longitude, address, eventTitle, API_KEY]);

  // Copy coordinates to clipboard
  const copyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(`${latitude}, ${longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy coordinates:", error);
    }
  };

  // Open in external maps
  const openInMaps = (service: "google" | "mapmyindia") => {
    const coords = `${latitude},${longitude}`;
    let url = "";

    switch (service) {
      case "google":
        url = `https://www.google.com/maps?q=${coords}`;
        break;
      case "mapmyindia":
        url = `https://maps.mapmyindia.com/?lat=${latitude}&lng=${longitude}&z=15`;
        break;
    }

    if (url) {
      window.open(url, "_blank");
    }
  };

  if (mapError) {
    return (
      <div
        className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}
      >
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Map Unavailable
          </h3>
          <p className="text-gray-500 text-sm mb-4">{mapError}</p>

          {/* Location details */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-left">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{address}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={copyCoordinates}
                    className="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>
                          {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* External map links */}
          <div className="flex justify-center space-x-4 mt-4">
            <button
              onClick={() => openInMaps("google")}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in Google Maps</span>
            </button>
            <button
              onClick={() => openInMaps("mapmyindia")}
              className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              <span>Open in MapMyIndia</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {/* Map container */}
      <div ref={mapRef} style={{ height }} className="w-full" />

      {/* Map footer with controls */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{address}</p>
                <button
                  onClick={copyCoordinates}
                  className="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 mt-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">
                        Coordinates copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* External map buttons */}
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => openInMaps("google")}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Google</span>
            </button>
            <button
              onClick={() => openInMaps("mapmyindia")}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
              title="Open in MapMyIndia"
            >
              <Navigation className="h-3 w-3" />
              <span className="hidden sm:inline">Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDisplay;
