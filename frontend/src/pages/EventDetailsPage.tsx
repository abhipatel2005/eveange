import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { RegistrationService, Registration } from "../api/registrations";
import { StaffManagement } from "../components/admin/StaffManagement";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  Settings,
  Edit,
  UserPlus,
  Award,
  Building,
  Mic,
  Coffee,
  CheckCircle2,
  Share2,
  Plus,
} from "lucide-react";

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "about" | "speakers" | "schedule" | "sponsors"
  >("about");
  const [userEventRole, setUserEventRole] = useState<string | null>(null);

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

  const fetchUserEventRole = async () => {
    if (!user || !id || !accessToken) return;

    try {
      const response = await fetch(`/api/events/${id}/user-role`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUserEventRole(result.data.role);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Failed to fetch user event role:", err);
      }
    }
  };

  const isUserRegistered = (eventId: string): boolean => {
    const registration = userRegistrations.find(
      (registration) =>
        registration.event?.id === eventId &&
        registration.status !== "cancelled"
    );

    if (!registration) return false;

    if (registration.event?.is_paid) {
      return registration.payment_status === "completed";
    }

    return (
      registration.status === "confirmed" ||
      registration.payment_status === null
    );
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

    if (registration.event?.is_paid) {
      return registration.payment_status === "completed"
        ? registration
        : undefined;
    }

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
            setError("This event could not be found.");
          } else if (apiError.status === 403) {
            setError("You don't have permission to view this event.");
          } else if (apiError.status === 401) {
            setError("Please log in to view this event.");
          } else {
            setError("An unexpected error occurred while loading the event.");
          }
        } else {
          setError("Unable to connect to the server.");
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
    fetchUserEventRole();
  }, [id, user, accessToken]);

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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if user is organizer for this event based on event_users table
  const canManage = userEventRole === "organizer";
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const isUpcoming = startDate > new Date();
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const registrationsCount = event.registrations?.length || 0;
  const registered = isUserRegistered(event.id);
  const userRegistration = getUserRegistrationForEvent(event.id);

  // Placeholder data
  const placeholderSpeakers = [
    { name: "Speaker Name", role: "Coming Soon", company: "TBA" },
    { name: "Speaker Name", role: "Coming Soon", company: "TBA" },
    { name: "Speaker Name", role: "Coming Soon", company: "TBA" },
    { name: "Speaker Name", role: "Coming Soon", company: "TBA" },
  ];

  const placeholderSchedule = [
    { time: "09:00 AM", title: "Registration & Welcome Coffee", type: "break" },
    {
      time: "10:00 AM",
      title: "Opening Keynote",
      type: "keynote",
      speaker: "TBA",
    },
    {
      time: "11:30 AM",
      title: "Panel Discussion",
      type: "panel",
      speaker: "Multiple Speakers",
    },
    { time: "12:30 PM", title: "Lunch & Networking", type: "break" },
    {
      time: "02:00 PM",
      title: "Workshop Sessions",
      type: "workshop",
      speaker: "TBA",
    },
    {
      time: "04:00 PM",
      title: "Closing Remarks",
      type: "keynote",
      speaker: "TBA",
    },
  ];

  const placeholderSponsors = [
    { name: "Company Name", tier: "platinum", logo: null },
    { name: "Company Name", tier: "gold", logo: null },
    { name: "Company Name", tier: "gold", logo: null },
    { name: "Company Name", tier: "silver", logo: null },
    { name: "Company Name", tier: "silver", logo: null },
    { name: "Company Name", tier: "silver", logo: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-700 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back</span>
            </button>

            {canManage && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/events/${event.id}/edit`}
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
                <Link
                  to={`/events/${event.id}/staff`}
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Staff</span>
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Event"
                >
                  <svg
                    className="w-4 h-4"
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
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-800">
        {event.banner_url ? (
          <div className="relative h-[500px]">
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Share Button on Image */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-white transition-all shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium">Share</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-[500px] bg-gradient-to-br from-primary-600 to-primary-800">
            {/* Share Button on Gradient */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-white transition-all shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                <span className="font-medium">Share</span>
              </button>
            </div>
          </div>
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="max-w-4xl">
              {/* Event Status Badge */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                    isActive
                      ? "bg-green-500"
                      : isUpcoming
                      ? "bg-blue-500"
                      : "bg-gray-500"
                  } text-white shadow-lg`}
                >
                  {isActive
                    ? "Live Now"
                    : isUpcoming
                    ? "Upcoming"
                    : "Past Event"}
                </span>
                {event.is_paid && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-500 text-white shadow-lg">
                    ${event.price}
                  </span>
                )}
              </div>

              {/* Event Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                {event.title}
              </h1>

              {/* Key Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/90">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-sm opacity-80">Date</div>
                    <div className="font-semibold">
                      {startDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-sm opacity-80">Location</div>
                    <div className="font-semibold">{event.location}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-sm opacity-80">Attendees</div>
                    <div className="font-semibold">
                      {registrationsCount} / {event.capacity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA + Tabs Container */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {startDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {registrationsCount} Registered
              </div>
            </div>
            <div className="flex items-center gap-3">
              {registered && userRegistration ? (
                <>
                  <div className="flex items-center text-green-600 font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    You're Registered
                  </div>
                  {/* Ticket button (assumption: ticket route exists) */}
                  <Link
                    to={`/ticket/${userRegistration.id}`}
                    className="px-4 py-2 bg-white text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors font-medium shadow-sm"
                  >
                    Ticket
                  </Link>
                </>
              ) : isUpcoming ? (
                <Link
                  to={`/events/${event.id}/register`}
                  className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg"
                >
                  Register Now
                </Link>
              ) : (
                <div className="text-gray-500 font-medium">
                  Registration Closed
                </div>
              )}
            </div>
          </div>
          {/* Tabs Navigation directly beneath CTA */}
          <nav className="mt-6 flex gap-8 overflow-x-auto border-t border-gray-200 pt-2">
            {["about", "speakers", "schedule", "sponsors"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Management Quick Links (for organizers) - in a row */}
      {canManage && (
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 border-b border-primary-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-primary-900">
                Quick Management
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/events/${event.id}/registrations`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium shadow-sm border border-primary-200"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Registrations</span>
                </Link>
                <Link
                  to={`/events/${event.id}/attendance`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium shadow-sm border border-primary-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Attendance</span>
                </Link>
                <Link
                  to={`/events/${event.id}/certificates`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium shadow-sm border border-primary-200"
                >
                  <Award className="w-4 h-4" />
                  <span>Certificates</span>
                </Link>
                <Link
                  to={`/events/${event.id}/form-builder`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium shadow-sm border border-primary-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Registration Form</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* (Removed separate sticky Tabs Navigation; integrated with CTA above) */}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* About Tab */}
        {activeTab === "about" && (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                About this Event
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                <p>{event.description}</p>

                <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                  What to Expect
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-primary-600 mt-1 flex-shrink-0" />
                    <span>Engaging presentations from industry experts</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-primary-600 mt-1 flex-shrink-0" />
                    <span>Networking opportunities with fellow attendees</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-primary-600 mt-1 flex-shrink-0" />
                    <span>Hands-on workshops and interactive sessions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-primary-600 mt-1 flex-shrink-0" />
                    <span>
                      Access to exclusive event materials and resources
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Details Card */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Event Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Organizer</div>
                    <div className="font-semibold text-gray-900">
                      {event.organizer?.name || "N/A"}
                    </div>
                    {event.organizer?.organization_name && (
                      <div className="text-sm text-gray-600">
                        {event.organizer.organization_name}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Category</div>
                    <div className="font-semibold text-gray-900">
                      {event.category?.name || "General"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Event Duration
                    </div>
                    <div className="font-semibold text-gray-900">
                      {startDate.toLocaleDateString()} -{" "}
                      {endDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Registration Deadline
                    </div>
                    <div className="font-semibold text-gray-900">
                      {event.registration_deadline
                        ? new Date(
                            event.registration_deadline
                          ).toLocaleDateString()
                        : "Until event starts"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        event.location
                      )}`;
                      window.open(mapUrl, "_blank");
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View on Google Maps
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speakers Tab */}
        {activeTab === "speakers" && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Featured Speakers
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Learn from industry leaders and experts in their fields
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {placeholderSpeakers.map((speaker, idx) => (
                <div key={idx} className="text-center group">
                  <div className="relative mb-6 overflow-hidden rounded-2xl">
                    <div className="aspect-square bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                      <Mic className="w-16 h-16 text-primary-400" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {speaker.name}
                  </h3>
                  <p className="text-gray-600 mb-1">{speaker.role}</p>
                  <p className="text-sm text-gray-500">{speaker.company}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-primary-50 rounded-2xl p-8 text-center border border-primary-100">
              <p className="text-gray-700">
                Speaker information will be available soon. Check back for
                updates!
              </p>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Event Schedule
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Full day agenda with sessions, workshops, and networking breaks
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-4">
                {placeholderSchedule.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-6 p-6 rounded-2xl border transition-all ${
                      item.type === "break"
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-primary-200 hover:border-primary-300 shadow-sm hover:shadow"
                    }`}
                  >
                    <div className="flex-shrink-0 w-24 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {item.time}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {item.type === "break" ? (
                        <Coffee className="w-6 h-6 text-gray-400" />
                      ) : (
                        <Mic className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      {item.speaker && (
                        <p className="text-gray-600">{item.speaker}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-primary-50 rounded-2xl p-8 text-center border border-primary-100">
                <p className="text-gray-700">
                  Detailed schedule will be announced closer to the event date
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sponsors Tab */}
        {activeTab === "sponsors" && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Event Sponsors
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Thank you to our sponsors who make this event possible
              </p>
            </div>

            {/* Platinum Sponsors */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Platinum Sponsors
              </h3>
              <div className="grid md:grid-cols-1 gap-8 max-w-2xl mx-auto">
                {placeholderSponsors
                  .filter((s) => s.tier === "platinum")
                  .map((sponsor, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-primary-200 rounded-2xl p-12 text-center shadow-sm"
                    >
                      <div className="h-32 flex items-center justify-center">
                        <Building className="w-20 h-20 text-primary-400" />
                      </div>
                      <p className="mt-4 text-xl font-bold text-gray-900">
                        {sponsor.name}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Gold Sponsors */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Gold Sponsors
              </h3>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {placeholderSponsors
                  .filter((s) => s.tier === "gold")
                  .map((sponsor, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-300 rounded-2xl p-8 text-center shadow-sm"
                    >
                      <div className="h-24 flex items-center justify-center">
                        <Building className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="mt-4 text-lg font-bold text-gray-900">
                        {sponsor.name}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Silver Sponsors */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Silver Sponsors
              </h3>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {placeholderSponsors
                  .filter((s) => s.tier === "silver")
                  .map((sponsor, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-300 rounded-xl p-6 text-center"
                    >
                      <div className="h-20 flex items-center justify-center">
                        <Building className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="mt-3 font-semibold text-gray-900">
                        {sponsor.name}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-12 bg-primary-50 rounded-2xl p-8 text-center border border-primary-100">
              <p className="text-gray-700">
                Interested in sponsoring this event? Contact the organizer for
                opportunities.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Staff Management Section (for organizers) */}
      {canManage && (
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <StaffManagement eventId={event.id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailsPage;
