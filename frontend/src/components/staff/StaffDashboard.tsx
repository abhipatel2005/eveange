import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/authStore";
import { CheckInDashboard } from "../checkin/CheckInDashboard";
import { Users, Calendar, BarChart3, QrCode, AlertCircle } from "lucide-react";

interface AssignedEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  permissions: {
    can_check_in?: boolean;
    can_view_stats?: boolean;
  };
  assigned_at: string;
}

export function StaffDashboard() {
  const { user } = useAuth();
  const { accessToken } = useAuthStore();
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      fetchAssignedEvents();
    }
  }, [accessToken]);

  const fetchAssignedEvents = async () => {
    try {
      if (!accessToken) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/staff/assigned-events", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assigned events: ${response.status}`);
      }

      const data = await response.json();
      setAssignedEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching assigned events:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load assigned events"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEvent(eventId);
    setShowQRScanner(true);
  };

  const handleBackToDashboard = () => {
    setShowQRScanner(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-red-800 font-medium">Error Loading Events</h3>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={fetchAssignedEvents}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (showQRScanner && selectedEvent) {
    const selectedEventData = assignedEvents.find(
      (e) => e.id === selectedEvent
    );
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  QR Code Scanner
                </h1>
                <p className="text-gray-600">
                  {selectedEventData
                    ? `Scanning for: ${selectedEventData.title}`
                    : "Event Scanner"}
                </p>
              </div>
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CheckInDashboard eventId={selectedEvent} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Staff Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assignedEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No Events Assigned
            </h3>
            <p className="mt-1 text-gray-500">
              You haven't been assigned to any events yet. Contact your event
              organizer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {assignedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start">
                    <Calendar className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.location}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {event.description}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Starts:</strong>{" "}
                      {new Date(event.start_date).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Ends:</strong>{" "}
                      {new Date(event.end_date).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.permissions?.can_check_in && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Users className="w-3 h-3 mr-1" />
                        Check-in
                      </span>
                    )}
                    {event.permissions?.can_view_stats && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        View Stats
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    {event.permissions?.can_check_in ? (
                      <button
                        onClick={() => handleEventSelect(event.id)}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Start QR Scanning
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-50 cursor-not-allowed">
                        <QrCode className="w-4 h-4 mr-2" />
                        No Check-in Permission
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
