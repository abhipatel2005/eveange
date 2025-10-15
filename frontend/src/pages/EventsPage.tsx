import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Search, Plus, Users, Ticket } from "lucide-react";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { useAuth } from "../hooks/useAuth";

const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      if (import.meta.env.DEV) {
        console.error("Failed to fetch user registrations:", err);
      }
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

  const handleRegisterClick = (eventId: string) => {
    if (!user) return;

    // Navigate to the registration form page
    navigate(`/events/${eventId}/register`);
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
      registration.payment_status === null
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
      registration.payment_status === null;

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
      {/* Clean Header - EventBrite Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Top Section - Title and Search */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Discover Events
              </h1>
              <p className="text-gray-600">
                Find amazing events happening around you
              </p>
            </div>

            {/* Search Bar - Positioned beside title */}
            {/* <div className="flex-1 max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Search
                </button>
              </form>
            </div> */}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {/* {user && (
                <Link
                  to="/my-registrations"
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  My Events
                </Link>
              )} */}

              {user && (user.role === "organizer" || user.role === "admin") && (
                <Link
                  to="/events/create"
                  className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              )}
            </div>
          </div>

          {/* Filters Section - Below title */}

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Search
                </button>
              </form>
            </div>
            {/* <label className="flex items-center">
              <input
                type="checkbox"
                checked={showUpcomingOnly}
                onChange={(e) => setShowUpcomingOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Upcoming events only
              </span>
            </label> */}

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setShowUpcomingOnly(true);
                  setPage(1);
                  fetchEvents();
                }}
                className="text-sm px-4 py-2 bg-primary-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                All Events
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setShowUpcomingOnly(true);
                  setPage(1);
                  fetchEvents();
                }}
                className="text-sm px-4 py-2 bg-green-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Free Events
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setShowUpcomingOnly(true);
                  setPage(1);
                  fetchEvents();
                }}
                className="text-sm px-4 py-2 bg-purple-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                This Week
              </button>
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
            {/* EventBrite Style Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => {
                const eventStatus = getEventStatus(event);
                const registrationCount = getRegistrationCount(event);

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden group cursor-pointer"
                  >
                    {/* Event Image */}
                    <div className="relative h-40 bg-gray-100 overflow-hidden">
                      {event.banner_url ? (
                        <img
                          src={event.banner_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-white" />
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-white text-gray-900 px-2 py-1 rounded-md text-sm font-semibold shadow-sm">
                          {event.is_paid ? `$${event.price}` : "FREE"}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      {/* Date */}
                      <div className="text-sm font-medium text-orange-600 mb-2">
                        {new Date(event.start_date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      {/* Attendees Count */}
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{registrationCount || 0} going</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Link
                          to={`/events/${event.id}`}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </Link>

                        {user && isUserRegistered(event.id) ? (
                          <Link
                            to={`/ticket/${
                              getUserRegistrationForEvent(event.id)?.id
                            }`}
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            <Ticket className="w-4 h-4 mr-2" />
                            View Ticket
                          </Link>
                        ) : eventStatus.status === "ended" ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                          >
                            Event Ended
                          </button>
                        ) : registrationCount &&
                          event.capacity &&
                          registrationCount >= event.capacity ? (
                          <button
                            disabled
                            className="w-full px-4 py-2 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                          >
                            Event Full
                          </button>
                        ) : user ? (
                          <button
                            onClick={() => handleRegisterClick(event.id)}
                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Register Now
                          </button>
                        ) : (
                          <Link
                            to="/login"
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Login to Register
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-r border-gray-200"
                  >
                    Previous
                  </button>

                  <div className="flex">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-3 text-sm font-medium transition-colors ${
                            page === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-50"
                          } ${
                            pageNum < totalPages
                              ? "border-r border-gray-200"
                              : ""
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-gray-200"
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
