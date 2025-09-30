import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { StaffDashboard } from "../components/staff/StaffDashboard";

const DashboardPage: React.FC = () => {
  const { user, accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication first
        if (!isAuthenticated || !accessToken) {
          setError("Authentication required");
          clearAuth();
          navigate("/login");
          return;
        }

        const response = await EventService.getMyEvents();

        if (response.success && response.data) {
          setEvents(response.data.events);
        } else {
          // Handle 403 Forbidden specifically
          if (
            response.error?.includes("403") ||
            response.error?.includes("Invalid or expired token")
          ) {
            console.log("Token expired, redirecting to login");
            clearAuth();
            navigate("/login");
            return;
          }
          setError(response.error || "Failed to fetch events");
        }
      } catch (err: any) {
        console.error("Dashboard events error:", err);

        // Handle authentication errors
        if (
          err.message?.includes("Invalid or expired token") ||
          err.status === 403
        ) {
          console.log("Authentication failed, clearing auth and redirecting");
          clearAuth();
          navigate("/login");
          return;
        }

        setError("Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "organizer" || user?.role === "admin") {
      fetchMyEvents();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, user, navigate]);

  // Debug authentication state
  useEffect(() => {
    console.log("Dashboard Auth Debug:", {
      user: user?.email,
      userRole: user?.role,
      hasToken: !!accessToken,
      isAuthenticated,
      tokenPreview: accessToken
        ? accessToken.substring(0, 20) + "..."
        : "No token",
    });
  }, [user, accessToken, isAuthenticated]);

  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  // Show staff dashboard for staff users
  if (user?.role === "staff") {
    return <StaffDashboard />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {isOrganizer && (
          <Link
            to="/events/create"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Event
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-primary-600">
            {loading ? "..." : events.length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Registrations</h3>
          <p className="text-3xl font-bold text-green-600">
            {loading
              ? "..."
              : events.reduce(
                  (sum, event) => sum + (event.registrations?.length || 0),
                  0
                )}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold text-blue-600">
            {loading
              ? "..."
              : events.filter(
                  (event) => new Date(event.start_date) > new Date()
                ).length}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Active Events</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {loading
              ? "..."
              : events.filter((event) => {
                  const now = new Date();
                  const start = new Date(event.start_date);
                  const end = new Date(event.end_date);
                  return start <= now && now <= end;
                }).length}
          </p>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isOrganizer ? "My Events" : "Welcome to Event Management"}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : !isOrganizer ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome, {user?.name}!
            </h3>
            <p className="text-gray-600 mb-4">
              Explore upcoming events and register for events you're interested
              in.
            </p>
            <Link
              to="/events"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
            >
              Browse Events
            </Link>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2m-8 0V7"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No events
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first event.
            </p>
            <div className="mt-6">
              <Link
                to="/events/create"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
              >
                Create Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => {
              const startDate = new Date(event.start_date);
              const isUpcoming = startDate > new Date();

              return (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        <Link
                          to={`/events/${event.id}`}
                          className="hover:text-primary-600"
                        >
                          {event.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {event.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2m-8 0V7"
                            />
                          </svg>
                          {startDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {event.location}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          isUpcoming
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isUpcoming ? "Upcoming" : "Past"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
