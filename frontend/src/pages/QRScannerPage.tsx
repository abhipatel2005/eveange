import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { EventService, Event } from "../api/events";
import { CheckInDashboard } from "../components/checkin/CheckInDashboard";
import { ChevronLeft, Calendar, MapPin, Users } from "lucide-react";

export default function QRScannerPage() {
  const { user, isLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Check authorization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only allow organizers and admins
  if (!["organizer", "admin"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access the QR scanner. Only organizers
            and administrators can use this feature.
          </p>
        </div>
      </div>
    );
  }

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await EventService.getMyEvents();
        if (response.success && response.data) {
          // Filter to only active and upcoming events
          const availableEvents = response.data.events.filter(
            (event: Event) => {
              const now = new Date();
              const eventEnd = new Date(event.end_date);
              return eventEnd >= now; // Show current and future events
            }
          );
          setEvents(availableEvents);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const selectedEvent = events.find((event) => event.id === selectedEventId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!selectedEventId ? (
        // Event Selection
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            QR Code Scanner
          </h1>
          <p className="text-gray-600 mb-6">
            Select an event to start scanning participant QR codes for check-in.
          </p>

          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Available Events
              </h3>
              <p className="text-gray-600">
                You don't have any active or upcoming events to scan for.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {event.title}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(event.start_date)} at{" "}
                        {formatTime(event.start_date)}
                      </div>

                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.location}
                        </div>
                      )}

                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Capacity: {event.capacity}
                      </div>
                    </div>

                    <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                      Start Scanning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Use existing CheckInDashboard component
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => setSelectedEventId(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back to Events
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedEvent?.title} - Check-In
            </h1>
          </div>

          <CheckInDashboard eventId={selectedEventId} />
        </div>
      )}
    </div>
  );
}
