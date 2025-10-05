import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { StaffDashboard } from "../components/staff/StaffDashboard";

// Utility function to get registration count from event
const getRegistrationCount = (event: Event): number => {
  if (!event.registrations) return 0;

  // If it's an array of registration objects
  if (Array.isArray(event.registrations)) {
    // Check if it's a count array [{count: 5}] or actual registrations
    if (
      event.registrations.length > 0 &&
      typeof event.registrations[0] === "object" &&
      "count" in event.registrations[0]
    ) {
      return (event.registrations[0] as any).count || 0;
    }
    return event.registrations.length;
  }

  return 0;
};

const DashboardPage: React.FC = () => {
  const { user, accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
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

    const fetchUserRegistrations = async () => {
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

        const response = await RegistrationService.getUserRegistrations();

        if (response.success && response.data) {
          setRegistrations(response.data.registrations);
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
          setError(response.error || "Failed to fetch registrations");
        }
      } catch (err: any) {
        console.error("Dashboard registrations error:", err);

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

        setError("Failed to fetch registrations");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "organizer" || user?.role === "admin") {
      fetchMyEvents();
    } else if (user?.role === "participant") {
      fetchUserRegistrations();
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
  const isParticipant = user?.role === "participant";

  // Show staff dashboard for staff users
  if (user?.role === "staff") {
    return <StaffDashboard />;
  }

  // Get upcoming registrations for participants
  const upcomingRegistrations = registrations.filter(
    (reg) => reg.event && new Date(reg.event.start_date) > new Date()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {/* Show Browse Events button to participants, Create Event to organizers */}
        {isParticipant ? (
          <Link
            to="/events"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Browse Events
          </Link>
        ) : (
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
      {isParticipant ? (
        // Participant Dashboard Stats
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">My Registrations</h3>
            <p className="text-3xl font-bold text-primary-600">
              {loading ? "..." : registrations.length}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
            <p className="text-3xl font-bold text-green-600">
              {loading ? "..." : upcomingRegistrations.length}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Attended Events</h3>
            <p className="text-3xl font-bold text-blue-600">
              {loading
                ? "..."
                : registrations.filter((reg) => reg.status === "attended")
                    .length}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Total Spent</h3>
            <p className="text-3xl font-bold text-purple-600">
              {loading
                ? "..."
                : `$${registrations
                    .reduce((sum, reg) => {
                      if (
                        reg.event?.is_paid &&
                        reg.event.price &&
                        reg.payment_status === "completed"
                      ) {
                        return sum + reg.event.price;
                      }
                      return sum;
                    }, 0)
                    .toLocaleString()}`}
            </p>
          </div>
        </div>
      ) : (
        // Organizer Dashboard Stats
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                    (sum, event) => sum + getRegistrationCount(event),
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
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">
              {loading
                ? "..."
                : `$${events
                    .reduce((sum, event) => {
                      if (!event.is_paid || !event.price) return sum;

                      const registrationCount = getRegistrationCount(event);
                      return sum + event.price * registrationCount;
                    }, 0)
                    .toLocaleString()}`}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isParticipant
              ? "My Registrations"
              : isOrganizer
              ? "My Events"
              : "Welcome to Event Management"}
          </h2>
          {isParticipant && (
            <Link
              to="/my-registrations"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All →
            </Link>
          )}
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
        ) : isParticipant ? (
          // Participant View - Show Registrations
          registrations.length === 0 ? (
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
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No event registrations
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by browsing and registering for events.
              </p>
              <div className="mt-6">
                <Link
                  to="/events"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
                >
                  Browse Events
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {registrations.slice(0, 5).map((registration) => {
                if (!registration.event) return null;

                const event = registration.event;
                const startDate = new Date(event.start_date);
                const isUpcoming = startDate > new Date();
                const isPaid =
                  event.is_paid && registration.payment_status === "completed";
                const isConfirmed =
                  registration.status === "confirmed" || isPaid;

                return (
                  <div
                    key={registration.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <Link
                      to={`/events/${event.id}`}
                      className="flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          <div className="hover:text-primary-600">
                            {event.title}
                          </div>
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
                          {event.is_paid && (
                            <span className="text-green-600 font-medium">
                              ${event.price}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center justify-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full block text-center ${
                            isUpcoming
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {isUpcoming ? "Upcoming" : "Past"}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full block text-center ${
                            isConfirmed
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {isConfirmed ? "Confirmed" : "Pending"}
                        </span>
                        {isUpcoming && isConfirmed && (
                          <Link
                            to={`/ticket/${registration.id}`}
                            className="block text-xs text-primary-600 hover:text-primary-700 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Ticket
                          </Link>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )
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
          // Organizer View - Show Events
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => {
              const startDate = new Date(event.start_date);
              const isUpcoming = startDate > new Date();

              return (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <Link
                    to={`/events/${event.id}`}
                    className="flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        <div className="hover:text-primary-600">
                          {event.title}
                        </div>
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
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                            />
                          </svg>
                          {getRegistrationCount(event)} registered
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
                  </Link>
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
