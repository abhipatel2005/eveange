import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Search,
  Plus,
  Eye,
  Users,
  Ticket,
} from "lucide-react";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { formatDate } from "../utils/dateUtils";
import { useAuth } from "../hooks/useAuth";

const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);

  const fetchUserRegistrations = async () => {
    if (!user) return;

    try {
      const response = await RegistrationService.getUserRegistrations();
      if (response.success && response.data) {
        setUserRegistrations(response.data.registrations);
      }
    } catch (err) {
      console.error("Failed to fetch user registrations:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await EventService.getEvents({
        page,
        limit: 12,
        search: searchTerm || undefined,
        upcoming: showUpcomingOnly,
      });

      if (response.success && response.data) {
        setEvents(response.data.events);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUserRegistrations();
  }, [page, showUpcomingOnly, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const isUserRegistered = (eventId: string) => {
    const registration = userRegistrations.find(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );

    if (!registration) return false;

    // For paid events, payment must be completed
    if (registration.event?.is_paid) {
      return registration.payment_status === "completed";
    }

    // For free events, registration should be confirmed or payment not required
    return (
      registration.status === "confirmed" ||
      registration.payment_status === "not_required"
    );
  };

  const getUserRegistrationForEvent = (eventId: string) => {
    const registration = userRegistrations.find(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );

    if (!registration) return undefined;

    // For paid events, payment must be completed
    if (registration.event?.is_paid) {
      return registration.payment_status === "completed"
        ? registration
        : undefined;
    }

    // For free events, registration should be confirmed or payment not required
    const isValidFreeRegistration =
      registration.status === "confirmed" ||
      registration.payment_status === "not_required";

    return isValidFreeRegistration ? registration : undefined;
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    if (endDate < now) return { status: "ended", color: "gray" };
    if (startDate <= now && endDate >= now)
      return { status: "ongoing", color: "blue" };
    if (startDate > now) return { status: "upcoming", color: "green" };
    return { status: "unknown", color: "gray" };
  };

  const getRegistrationCount = (event: Event) => {
    return event.registrations?.length || 0;
  };

  if (isLoading && events.length === 0) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events</h1>
              <p className="mt-2 text-gray-600">
                Discover and register for upcoming events
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 md:mt-0 flex gap-3">
              {user && (
                <Link
                  to="/my-registrations"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  My Registrations
                </Link>
              )}

              {user && (user.role === "organizer" || user.role === "admin") && (
                <Link
                  to="/events/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showUpcomingOnly}
                  onChange={(e) => setShowUpcomingOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Upcoming only
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!isLoading && events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No events found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Be the first to create an event!"}
            </p>
            {user && (user.role === "organizer" || user.role === "admin") && (
              <div className="mt-6">
                <Link
                  to="/events/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const eventStatus = getEventStatus(event);
                const registrationCount = getRegistrationCount(event);

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Event Banner */}
                    {event.banner_url ? (
                      <img
                        src={event.banner_url}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-white" />
                      </div>
                    )}

                    {/* Event Content */}
                    <div className="p-6">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            eventStatus.color === "green"
                              ? "bg-green-100 text-green-800"
                              : eventStatus.color === "blue"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {eventStatus.status}
                        </span>

                        {event.is_paid && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ${event.price}
                          </span>
                        )}
                      </div>

                      {/* Event Title */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {event.title}
                      </h3>

                      {/* Event Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {event.description}
                      </p>

                      {/* Event Details */}
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(event.start_date)}</span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            {new Date(event.start_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="truncate">{event.location}</span>
                        </div>

                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>
                            {registrationCount} / {event.capacity} registered
                          </span>
                        </div>
                      </div>

                      {/* Event Actions */}
                      <div className="mt-6">
                        {user && isUserRegistered(event.id) ? (
                          // User is registered - show ticket button
                          <div className="space-y-2">
                            <Link
                              to={`/ticket/${
                                getUserRegistrationForEvent(event.id)?.id
                              }`}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              <Ticket className="w-4 h-4 mr-2" />
                              View Ticket
                            </Link>
                            <Link
                              to={`/events/${event.id}`}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Event Details
                            </Link>
                          </div>
                        ) : (
                          // User not registered or not logged in - show view details/register
                          <Link
                            to={`/events/${event.id}`}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            {user ? "Register Now" : "View Details"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
