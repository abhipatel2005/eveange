import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { StaffManagement } from "../components/admin/StaffManagement";
import MapDisplay from "../components/ui/MapDisplay";

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
  const [showMap, setShowMap] = useState(false);

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

  const isUserRegistered = (eventId: string): boolean => {
    const registration = userRegistrations.find(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );

    // Only log registration details in development
    // if (import.meta.env.DEV) {
    //   console.log(`🔍 Checking registration for event ${eventId}:`, {
    //     foundRegistration: !!registration,
    //     registrationStatus: registration?.status,
    //     paymentStatus: registration?.payment_status,
    //     isEventPaid: registration?.event?.is_paid,
    //     allUserRegistrations: userRegistrations.length,
    //   });
    // }

    if (!registration) return false;

    // For paid events, payment must be completed
    if (registration.event?.is_paid) {
      const isPaymentCompleted = registration.payment_status === "completed";
      // if (import.meta.env.DEV) {
      //   console.log(`💳 Paid event - payment completed: ${isPaymentCompleted}`);
      // }
      return isPaymentCompleted;
    }

    // For free events, registration should be confirmed or payment not required
    const isValidFreeRegistration =
      registration.status === "confirmed" ||
      registration.payment_status === null;

    // if (import.meta.env.DEV) {
    //   console.log(
    //     `🆓 Free event - valid registration: ${isValidFreeRegistration}`
    //   );
    // }
    return isValidFreeRegistration;
  };

  const getUserRegistrationForEvent = (
    eventId: string
  ): Registration | undefined => {
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
          if (
            response.error?.includes("not found") ||
            response.error?.includes("404")
          ) {
            setError(
              "This event could not be found. It may have been deleted or the link is incorrect."
            );
          } else if (
            response.error?.includes("permission") ||
            response.error?.includes("access")
          ) {
            setError(
              "You don't have permission to view this event. It may be private or restricted."
            );
          } else {
            setError(response.error || "Event not found");
          }
        }
      } catch (err) {
        if (err instanceof Error && "response" in err) {
          const apiError = err as any;
          if (apiError.status === 404) {
            setError(
              "This event could not be found. It may have been deleted or the link is incorrect."
            );
          } else if (apiError.status === 403) {
            setError(
              "You don't have permission to view this event. It may be private or restricted."
            );
          } else if (apiError.status === 401) {
            setError("Please log in to view this event.");
          } else {
            setError(
              "An unexpected error occurred while loading the event. Please try again."
            );
          }
        } else {
          setError(
            "Unable to connect to the server. Please check your internet connection and try again."
          );
        }
        if (import.meta.env.DEV) {
          console.error("Event details error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    fetchUserRegistrations();
  }, [id, user]); // Added user as dependency to refresh registrations when user changes

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
        if (import.meta.env.DEV) {
          console.error("Delete event error:", err);
        }
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
  const isUpcoming = startDate > new Date();
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const registrationsCount = event.registrations?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Section with Modern Design */}
      <div className="relative">
        {event.banner_url ? (
          <div className="relative h-80 lg:h-96 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-10" />
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover transform scale-105 hover:scale-100 transition-transform duration-700"
            />

            {/* Navigation Overlay on Hero Image */}
            <div className="absolute top-0 left-0 right-0 z-30 p-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Back Button */}
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
                >
                  <svg
                    className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform"
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
                  Back to Events
                </button>

                {/* Management Actions Dropdown */}
                {canManage && (
                  <div className="relative group">
                    <button className="flex items-center text-white/90 bg-white/10 backdrop-blur-2xl px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Manage
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40">
                      <Link
                        to={`/events/${event.id}/registrations`}
                        className="flex items-center px-6 py-2 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Registrations</div>
                          <div className="text-xs text-slate-500">
                            {registrationsCount} registered
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/attendance`}
                        className="flex items-center px-6 py-2 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Take Attendance</div>
                          <div className="text-xs text-slate-500">
                            Check-in attendees
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/form-builder`}
                        className="flex items-center px-6 py-2 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Registration Form</div>
                          <div className="text-xs text-slate-500">
                            Customize form fields
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/certificates`}
                        className="flex items-center px-6 py-2 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Certificates</div>
                          <div className="text-xs text-slate-500">
                            Generate certificates
                          </div>
                        </div>
                      </Link>

                      <hr className="my-1 border-slate-200" />

                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-6 text-sm text-red-600 hover:bg-red-50/70 hover:text-red-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Delete Event</div>
                          <div className="text-xs text-red-400">
                            Permanently remove
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hero Content Overlay */}
            <div className="absolute inset-0 z-20 flex items-end">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
                <div className="max-w-4xl">
                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-emerald-500/25"
                          : isUpcoming
                          ? "bg-blue-500 text-white shadow-blue-500/25"
                          : "bg-slate-500 text-white shadow-slate-500/25"
                      } shadow-lg backdrop-blur-sm`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          isActive
                            ? "bg-emerald-200 animate-pulse"
                            : "bg-white/70"
                        }`}
                      />
                      {isActive
                        ? "Live Now"
                        : isUpcoming
                        ? "Upcoming"
                        : "Past Event"}
                    </span>

                    {event.is_paid && (
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-500 text-white shadow-lg shadow-amber-500/25 backdrop-blur-sm">
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
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                        ${event.price}
                      </span>
                    )}

                    {event.category && (
                      <span
                        className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white shadow-lg backdrop-blur-sm"
                        style={{ backgroundColor: event.category.color }}
                      >
                        {event.category.name}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 drop-shadow-2xl leading-tight">
                    {event.title}
                  </h1>

                  {/* Description */}
                  <p className="text-lg lg:text-xl text-white/95 mb-6 leading-relaxed max-w-3xl font-medium">
                    {event.description}
                  </p>

                  {/* Quick Info */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-semibold">
                        {startDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {startDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5 mr-2"
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
                      </svg>
                      <span className="font-semibold">{event.location}</span>
                    </div>

                    <div className="flex items-center text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-semibold">
                        {registrationsCount}/{event.capacity} attending
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-24">
            {/* Navigation Overlay for No Banner */}
            <div className="absolute top-0 left-0 right-0 z-30 p-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Back Button */}
                <button
                  onClick={() => navigate(-1)}
                  className="group flex items-center px-4 py-3 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-white rounded-full transition-all duration-200 shadow-xl border border-white/20"
                >
                  <svg
                    className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform"
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
                  Back to Events
                </button>

                {/* Management Actions Dropdown */}
                {canManage && (
                  <div className="relative group">
                    <button className="flex items-center px-4 py-3 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-white rounded-full transition-all duration-200 shadow-xl border border-white/20">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Manage
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40">
                      <Link
                        to={`/events/${event.id}/registrations`}
                        className="flex items-center px-6 py-3 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Registrations</div>
                          <div className="text-xs text-slate-500">
                            {registrationsCount} registered
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/attendance`}
                        className="flex items-center px-6 py-3 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Take Attendance</div>
                          <div className="text-xs text-slate-500">
                            Check-in attendees
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/form-builder`}
                        className="flex items-center px-6 py-3 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Registration Form</div>
                          <div className="text-xs text-slate-500">
                            Customize form fields
                          </div>
                        </div>
                      </Link>

                      <Link
                        to={`/events/${event.id}/certificates`}
                        className="flex items-center px-6 py-3 text-sm text-slate-700 hover:bg-white/70 hover:text-blue-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Certificates</div>
                          <div className="text-xs text-slate-500">
                            Generate certificates
                          </div>
                        </div>
                      </Link>

                      <hr className="my-3 border-slate-200" />

                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-6 py-3 text-sm text-red-600 hover:bg-red-50/70 hover:text-red-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-3 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <div>
                          <div className="font-medium">Delete Event</div>
                          <div className="text-xs text-red-400">
                            Permanently remove
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : isUpcoming
                          ? "bg-blue-500 text-white"
                          : "bg-slate-500 text-white"
                      } shadow-lg`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${
                          isActive
                            ? "bg-emerald-200 animate-pulse"
                            : "bg-white/70"
                        }`}
                      />
                      {isActive
                        ? "Live Now"
                        : isUpcoming
                        ? "Upcoming"
                        : "Past Event"}
                    </span>

                    {event.is_paid && (
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-500 text-white shadow-lg">
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
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                        ${event.price}
                      </span>
                    )}
                  </div>
                </div>

                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 drop-shadow-2xl">
                  {event.title}
                </h1>

                <p className="text-xl text-white/95 mb-8 max-w-4xl mx-auto leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Registration Success Banner */}
        {user && isUserRegistered(event.id) && (
          <div className="mb-8 bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-emerald-800">
                  Successfully Registered!
                </h3>
                <p className="text-emerald-700 mt-1">
                  You're all set for this event. Check your email for
                  confirmation details.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to={`/ticket/${getUserRegistrationForEvent(event.id)?.id}`}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  View Ticket
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Event Overview
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        event.visibility === "public"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {event.visibility === "public" ? "Public" : "Private"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {!event.banner_url && (
                  <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                      {event.title}
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date & Time */}
                  <div className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Date & Time
                        </h3>
                        <p className="text-slate-600 font-medium">
                          {startDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-slate-500 text-sm">
                          {startDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-emerald-600"
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
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Location
                        </h3>
                        <p className="text-slate-600 font-medium mb-3">
                          {event.location}
                        </p>

                        {/* Map toggle and display */}
                        {event.latitude && event.longitude ? (
                          <div className="space-y-4">
                            <button
                              onClick={() => setShowMap(!showMap)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              {showMap ? "Hide Map" : "View on Map →"}
                            </button>

                            {showMap && (
                              <div className="mt-4">
                                <MapDisplay
                                  latitude={event.latitude}
                                  longitude={event.longitude}
                                  address={event.location}
                                  eventTitle={event.title}
                                  height="250px"
                                  className="rounded-lg overflow-hidden shadow-sm"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              // Open Google Maps search for the location
                              window.open(
                                `https://www.google.com/maps/search/${encodeURIComponent(
                                  event.location
                                )}`,
                                "_blank"
                              );
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Search on Maps →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Organizer */}
                  {event.organizer && (
                    <div className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-purple-600"
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
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-slate-900 mb-2">
                            Organizer
                          </h3>
                          <p className="text-slate-600 font-medium">
                            {event.organizer.name}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {event.organizer.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Capacity */}
                  <div className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-slate-900 mb-2">
                          Attendance
                        </h3>
                        <p className="text-slate-600 font-medium mb-3">
                          {registrationsCount} of {event.capacity} spots filled
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                (registrationsCount / event.capacity) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-slate-500 text-sm mt-2">
                          {event.capacity - registrationsCount} spots remaining
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Dashboard - For Organizers */}
            {canManage && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <svg
                      className="w-6 h-6 mr-3 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Event Analytics
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Monitor your event performance and engagement
                  </p>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Registrations */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700 mb-1">
                            Total Registrations
                          </p>
                          <p className="text-3xl font-bold text-blue-900">
                            {registrationsCount}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {registrationsCount > 0
                              ? `+${Math.round(
                                  (registrationsCount / event.capacity) * 100
                                )}% capacity`
                              : "No registrations yet"}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-blue-200 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-7 h-7 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Available Spots */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-700 mb-1">
                            Available Spots
                          </p>
                          <p className="text-3xl font-bold text-emerald-900">
                            {event.capacity - registrationsCount}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            {event.capacity - registrationsCount > 0
                              ? "Spots remaining"
                              : "Event is full"}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-emerald-200 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-7 h-7 text-emerald-600"
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
                        </div>
                      </div>
                    </div>

                    {/* Capacity Usage */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700 mb-1">
                            Capacity Usage
                          </p>
                          <p className="text-3xl font-bold text-purple-900">
                            {Math.round(
                              (registrationsCount / event.capacity) * 100
                            )}
                            %
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            Of total capacity
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-purple-200 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-7 h-7 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Revenue or Quick Actions */}
                    {event.is_paid ? (
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-amber-700 mb-1">
                              Total Revenue
                            </p>
                            <p className="text-3xl font-bold text-amber-900">
                              $
                              {(
                                registrationsCount * (event.price || 0)
                              ).toFixed(2)}
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              From {registrationsCount} tickets
                            </p>
                          </div>
                          <div className="w-14 h-14 bg-amber-200 rounded-xl flex items-center justify-center">
                            <svg
                              className="w-7 h-7 text-amber-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                        <div className="flex flex-col space-y-3">
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            Quick Actions
                          </p>
                          <Link
                            to={`/events/${event.id}/registrations`}
                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            Registrations
                          </Link>
                          <Link
                            to={`/events/${event.id}/attendance`}
                            className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Attendance
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Staff Management - Full Width for Organizers */}
            {canManage && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-8 py-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                    <svg
                      className="w-6 h-6 mr-3 text-indigo-600"
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
                    Staff Management
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Manage event staff and administrative access permissions
                  </p>
                </div>
                <div className="p-8">
                  <StaffManagement eventId={event.id} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Registration CTA Card */}
              {!canManage && isUpcoming && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                        />
                      </svg>
                      Registration
                    </h3>

                    {user && isUserRegistered(event.id) ? (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="text-emerald-800 font-semibold mb-4">
                          You're registered!
                        </p>
                        <Link
                          to={`/ticket/${
                            getUserRegistrationForEvent(event.id)?.id
                          }`}
                          className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                            />
                          </svg>
                          View Ticket
                        </Link>
                      </div>
                    ) : registrationsCount < event.capacity ? (
                      <div>
                        {event.is_paid && (
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl border border-amber-200">
                              <svg
                                className="w-5 h-5 mr-2 text-amber-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                />
                              </svg>
                              <span className="text-2xl font-bold text-amber-900">
                                ${event.price}
                              </span>
                              <span className="text-amber-700 text-sm ml-1">
                                / ticket
                              </span>
                            </div>
                          </div>
                        )}
                        <Link
                          to={`/events/${event.id}/register`}
                          className="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          {event.is_paid
                            ? `Register - $${event.price}`
                            : "Register Free"}
                        </Link>
                        <p className="text-slate-500 text-sm text-center mt-3">
                          {event.capacity - registrationsCount} spots remaining
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                        <p className="text-slate-600 font-medium mb-4">
                          Event is Full
                        </p>
                        <button
                          disabled
                          className="w-full px-6 py-3 bg-slate-300 text-slate-500 font-medium rounded-xl cursor-not-allowed"
                        >
                          Registration Closed
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Event Information Card */}
              {/* <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">
                    Event Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Event ID</span>
                    <span className="font-mono text-sm text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      #{event.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Category</span>
                    <div className="flex items-center">
                      {event.category && (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: event.category.color }}
                        >
                          {event.category.name}
                        </span>
                      )}
                      {!event.category && (
                        <span className="text-slate-500 text-sm">
                          Uncategorized
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">
                      Visibility
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        event.visibility === "public"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {event.visibility === "public" ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Created</span>
                    <span className="text-slate-900 text-sm">
                      {new Date(event.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div> */}

              {/* Management Actions for Organizers */}
              {canManage && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Management
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <Link
                      to={`/events/${event.id}/registrations`}
                      className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 mr-3 text-slate-400 group-hover:text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span className="font-medium">Registrations</span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-medium">
                        {registrationsCount}
                      </span>
                    </Link>

                    <Link
                      to={`/events/${event.id}/form-builder`}
                      className="w-full flex items-center px-4 py-3 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                      <svg
                        className="w-5 h-5 mr-3 text-slate-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium">Registration Form</span>
                    </Link>

                    <Link
                      to={`/events/${event.id}/attendance`}
                      className="w-full flex items-center px-4 py-3 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                      <svg
                        className="w-5 h-5 mr-3 text-slate-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span className="font-medium">Take Attendance</span>
                    </Link>

                    <Link
                      to={`/events/${event.id}/certificates`}
                      className="w-full flex items-center px-4 py-3 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group"
                    >
                      <svg
                        className="w-5 h-5 mr-3 text-slate-400 group-hover:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <span className="font-medium">Certificates</span>
                    </Link>

                    <hr className="my-4 border-slate-200" />

                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors group"
                    >
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="font-medium">Delete Event</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
