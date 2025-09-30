import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { StaffManagement } from "../components/admin/StaffManagement";
import { Ticket } from "lucide-react";

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const isUserRegistered = (eventId: string): boolean => {
    return userRegistrations.some(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );
  };

  const getUserRegistrationForEvent = (
    eventId: string
  ): Registration | undefined => {
    return userRegistrations.find(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        setError("Event ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await EventService.getEventById(id);

        if (response.success && response.data) {
          setEvent(response.data.event);
        } else {
          setError(response.error || "Event not found");
        }
      } catch (err) {
        setError("Failed to load event details");
        console.error("Event details error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    fetchUserRegistrations();
  }, [id]);

  const handleDelete = async () => {
    if (!event || !id) return;

    if (
      confirm(
        `Are you sure you want to delete "${event.title}"? This action cannot be undone.`
      )
    ) {
      try {
        const response = await EventService.deleteEvent(id);

        if (response.success) {
          navigate("/dashboard");
        } else {
          alert(response.error || "Failed to delete event");
        }
      } catch (err) {
        alert("Failed to delete event");
        console.error("Delete event error:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const isEventOrganizer =
    user && event.organizer && user.id === event.organizer.id;
  const canManage = isEventOrganizer || user?.role === "admin";

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : null;
  const isUpcoming = startDate > new Date();
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const registrationsCount = event.registrations?.length || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>

        {canManage && (
          <div className="flex space-x-2">
            <Link
              to={`/events/${event.id}/form-builder`}
              className="btn btn-primary"
            >
              Registration Form
            </Link>
            <Link
              to={`/events/${event.id}/registrations`}
              className="btn btn-secondary"
            >
              View Registrations ({registrationsCount})
            </Link>
            <Link
              to={`/events/${event.id}/attendance`}
              className="btn btn-secondary"
            >
              Manage Attendance
            </Link>
            <Link
              to={`/events/${event.id}/certificates`}
              className="btn btn-secondary"
            >
              Certificates
            </Link>
            <button
              onClick={handleDelete}
              className="btn bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Event
            </button>
          </div>
        )}
      </div>

      {/* Event Banner */}
      {event.banner_url && (
        <div className="mb-8">
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-64 object-cover rounded-lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  isActive
                    ? "bg-green-100 text-green-800"
                    : isUpcoming
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isActive ? "Active" : isUpcoming ? "Upcoming" : "Past"}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  event.visibility === "public"
                    ? "bg-green-100 text-green-800"
                    : event.visibility === "private"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {event.visibility}
              </span>
              {event.is_paid && (
                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                  ${event.price}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {event.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Event Details */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Event Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5"
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
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Date & Time
                  </p>
                  <p className="text-sm text-gray-600">
                    {startDate.toLocaleDateString()} at{" "}
                    {startDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {endDate.toDateString() !== startDate.toDateString() &&
                      ` - ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}`}
                    {endDate.toDateString() === startDate.toDateString() &&
                      ` - ${endDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5"
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
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5"
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
                <div>
                  <p className="text-sm font-medium text-gray-900">Capacity</p>
                  <p className="text-sm text-gray-600">
                    {registrationsCount} / {event.capacity} registered
                  </p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (registrationsCount / event.capacity) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {registrationDeadline && (
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Registration Deadline
                    </p>
                    <p className="text-sm text-gray-600">
                      {registrationDeadline.toLocaleDateString()} at{" "}
                      {registrationDeadline.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {event.organizer && (
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Organizer
                    </p>
                    <p className="text-sm text-gray-600">
                      {event.organizer.name}
                    </p>
                    {event.organizer.organization_name && (
                      <p className="text-xs text-gray-500">
                        {event.organizer.organization_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Card */}
          {!canManage && isUpcoming && (
            <div className="card">
              {user && isUserRegistered(event.id) ? (
                // User is already registered - show ticket button
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    You're Registered!
                  </h3>
                  <div className="mb-4">
                    <span className="text-lg font-semibold text-green-600">
                      Registration Confirmed
                    </span>
                  </div>
                  <Link
                    to={`/ticket/${getUserRegistrationForEvent(event.id)?.id}`}
                    className="btn bg-green-600 hover:bg-green-700 text-white w-full flex items-center justify-center"
                  >
                    <Ticket className="w-4 h-4 mr-2" />
                    View Ticket
                  </Link>
                </>
              ) : registrationsCount < event.capacity ? (
                // User not registered and spots available - show register button
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Register for Event
                  </h3>
                  {event.is_paid ? (
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-gray-900">
                        ${event.price}
                      </span>
                      <span className="text-sm text-gray-600 ml-1">
                        per ticket
                      </span>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-lg font-semibold text-green-600">
                        Free Event
                      </span>
                    </div>
                  )}

                  <Link
                    to={`/events/${event.id}/register`}
                    className="btn btn-primary w-full"
                  >
                    Register Now
                  </Link>

                  {registrationDeadline &&
                    new Date() > registrationDeadline && (
                      <p className="text-sm text-red-600 mt-2">
                        Registration deadline has passed
                      </p>
                    )}
                </>
              ) : (
                // Event is full
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Event Full
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This event has reached its maximum capacity.
                  </p>
                  <button
                    disabled
                    className="btn bg-gray-300 text-gray-500 w-full cursor-not-allowed"
                  >
                    Registration Closed
                  </button>
                </>
              )}
            </div>
          )}

          {/* Quick Stats for Organizers */}
          {canManage && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total Registrations
                  </span>
                  <span className="text-sm font-medium">
                    {registrationsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Available Spots</span>
                  <span className="text-sm font-medium">
                    {event.capacity - registrationsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fill Rate</span>
                  <span className="text-sm font-medium">
                    {Math.round((registrationsCount / event.capacity) * 100)}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <Link
                  to={`/events/${event.id}/registrations`}
                  className="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Manage Registrations
                </Link>

                <Link
                  to={`/events/${event.id}/check-in`}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Check-In Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Staff Management for Organizers */}
          {canManage && (
            <div className="card">
              <StaffManagement eventId={event.id} />
            </div>
          )}

          {/* Category */}
          {event.category && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Category
              </h3>
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: event.category.color }}
                />
                <span className="text-sm text-gray-600">
                  {event.category.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
