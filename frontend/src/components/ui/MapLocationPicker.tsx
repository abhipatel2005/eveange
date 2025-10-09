import React, { useState, useEffect, useRef } from "react";
import { MapPin, Search, X } from "lucide-react";

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface MapLocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
}

interface MapMyIndiaPlace {
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  name: string;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  placeholder = "Search for a location...",
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState<MapMyIndiaPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    value || null
  );
  const [error, setError] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<string>("");

  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with value prop changes
  useEffect(() => {
    if (value?.address !== searchQuery) {
      setSearchQuery(value?.address || "");
      setSelectedLocation(value || null);
    }
  }, [value]);

  // Autocomplete search function
  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using our backend proxy for location APIs (Ola Maps, MapMyIndia)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/maps/search?query=${encodeURIComponent(
          query
        )}&region=IND`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500 && errorData.error?.includes("API key")) {
          setError(
            "Location API not properly configured on server. Please contact administrator."
          );
        } else {
          setError("Failed to search locations. Please try again.");
        }
        return;
      }

      const data = await response.json();

      if (
        data.success &&
        data.data?.results &&
        Array.isArray(data.data.results)
      ) {
        // Set provider information for UI feedback
        setApiProvider(data.provider || "unknown");
        setSuggestions(data.data.results.slice(0, 5)); // Limit to 5 suggestions
        setShowSuggestions(true);
        // console.log(`Using ${data.provider} API for location search`);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("MapMyIndia search error:", error);
      setError("Network error. Please check your connection.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 300);
  };

  // Handle location selection
  const handleLocationSelect = (place: MapMyIndiaPlace) => {
    // console.log("handleLocationSelect called with:", place);

    const locationData: LocationData = {
      address: place.formatted_address || place.name,
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      placeId: place.place_id,
    };

    // console.log("Location selected:", locationData);
    // console.log("Setting searchQuery to:", locationData.address);

    // Update the search query to show the selected address in the input field
    setSearchQuery(locationData.address);
    setSelectedLocation(locationData);

    // Use a small timeout to ensure state updates happen before hiding suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      setSuggestions([]); // Clear suggestions
    }, 10);

    setError(null); // Clear any errors

    // console.log("Calling onChange with:", locationData);
    // Notify parent component of the selection
    onChange(locationData);

    // console.log("handleLocationSelect completed");
  };

  // Clear selection
  const handleClear = () => {
    setSelectedLocation(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    onChange({
      address: "",
      latitude: 0,
      longitude: 0,
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />

        {/* Clear button */}
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Selected location display */}
      {selectedLocation && selectedLocation.address && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Selected Location:
              </p>
              <p className="text-sm text-green-700">
                {selectedLocation.address}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Coordinates: {selectedLocation.latitude.toFixed(6)},{" "}
                {selectedLocation.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Provider indicator */}
          {apiProvider && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">
                Results from{" "}
                {apiProvider === "olamaps"
                  ? "Ola Maps 🚗 ✅"
                  : apiProvider === "mapmyindia"
                  ? "MapMyIndia 🇮🇳"
                  : "Unknown Provider"}
                {apiProvider === "olamaps" && " • 500K free/month • Verified"}
              </p>
            </div>
          )}

          {suggestions.map((place, index) => (
            <button
              key={place.place_id || index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLocationSelect(place);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {place.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {place.formatted_address}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showSuggestions &&
        suggestions.length === 0 &&
        searchQuery.length >= 3 &&
        !isLoading &&
        !error && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <div className="text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No locations found for "{searchQuery}"</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          </div>
        )}
    </div>
  );
};

export default MapLocationPicker;
