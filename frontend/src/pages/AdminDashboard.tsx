import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";
import { Users, Calendar, Settings, BarChart3 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string;
  organizer: {
    name: string;
  };
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { accessToken } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data?.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Only administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage events, staff, and system settings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {events.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    events.filter((e) => new Date(e.start_date) > new Date())
                      .length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    events.filter((e) => {
                      const eventDate = new Date(e.start_date);
                      const now = new Date();
                      return (
                        eventDate.getMonth() === now.getMonth() &&
                        eventDate.getFullYear() === now.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-md">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  System Status
                </p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Events List with Staff Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Event Management
            </h3>
            <p className="text-sm text-gray-600">
              Manage events and their staff assignments
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No events found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <div key={event.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {event.title}
                      </h4>
                      <div className="mt-1 text-sm text-gray-600">
                        <p>
                          📅 {new Date(event.start_date).toLocaleDateString()}
                        </p>
                        <p>📍 {event.location}</p>
                        <p>👤 Organizer: {event.organizer.name}</p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Link
                        to={`/events/${event.id}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        View Event
                      </Link>

                      <Link
                        to={`/events/${event.id}/check-in`}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Check-in Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Staff Management
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Staff management is available on individual event pages. Navigate
              to any event to add or manage staff members.
            </p>
            <p className="text-sm text-gray-500">
              💡 Tip: Each event can have its own staff with custom permissions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600 mb-4">
              View check-in analytics and event performance metrics from
              individual event dashboards.
            </p>
            <p className="text-sm text-gray-500">
              📊 Real-time check-in statistics available for each event.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="h-8 w-8 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">
                System Settings
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Configure system-wide settings, email templates, and QR code
              generation parameters.
            </p>
            <p className="text-sm text-gray-500">
              ⚙️ Advanced settings coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
