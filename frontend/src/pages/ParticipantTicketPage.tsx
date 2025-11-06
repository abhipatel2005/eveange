import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import QRVisual from "../components/checkin/QRVisual";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Share2,
  Printer,
  CheckCircle2,
  Mail,
  User as UserIcon,
} from "lucide-react";

interface Registration {
  id: string;
  name: string;
  email: string;
  qr_code: string;
  status: string;
  payment_status?: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    location: string;
    is_paid?: boolean;
    price?: number;
  };
}

export function ParticipantTicketPage() {
  const { registrationId } = useParams<{
    registrationId: string;
  }>();
  const { user, isLoading } = useAuth();
  const { accessToken } = useAuthStore();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registrationId && accessToken) {
      fetchRegistration();
    }
  }, [registrationId, accessToken]);

  const fetchRegistration = async () => {
    try {
      if (!accessToken) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      if (!registrationId) {
        setError("Missing registration ID");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/registrations/${registrationId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Registration not found");
      }

      const result = await response.json();
      if (result.success) {
        setRegistration(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch registration");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-md border border-primary-100 rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
            🎫
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ticket Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error ||
              "The ticket you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if user owns this registration or is admin/organizer
  const canView =
    user.email === registration.email ||
    user.role === "admin" ||
    user.role === "organizer";

  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to view this ticket.
          </p>
        </div>
      </div>
    );
  }

  // actions
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadICS = () => {
    const start = new Date(registration.event.start_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2 hours
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
        d.getUTCDate()
      )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Evange//Ticket//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:${registration.event.title}`,
      `LOCATION:${registration.event.location}`,
      `DESCRIPTION:Your ticket for ${registration.event.title}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${registration.event.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startDate = new Date(registration.event.start_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-700 hover:text-primary-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
          {/* Status moved to ticket card corner */}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white mb-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold">Your Event Ticket</h1>
          <p className="text-white/90 mt-1">
            Show this at the entrance for quick check-in
          </p>
        </div>
      </div>

      {/* Ticket Card */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
          {/* Corner Status Badge */}
          <div className="absolute top-4 right-4">
            {registration.status === "confirmed" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 shadow-sm">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmed
              </span>
            )}
            {registration.status === "attended" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 shadow-sm">
                🎉 Attended
              </span>
            )}
            {registration.status === "pending" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 shadow-sm">
                ⏳ Pending
              </span>
            )}
            {registration.status === "cancelled" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-red-100 text-red-800 shadow-sm">
                ❌ Cancelled
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2">
            {/* Left: QR and registration/payment only */}
            <div className="p-8">
              {/* <div className="mb-6">
                <div className="text-sm text-gray-500">Event</div>
                <div className="text-2xl font-bold text-gray-900">
                  {registration.event.title}
                </div>
              </div> */}

              <div className="">
                <QRVisual
                  value={registration.qr_code}
                  size={220}
                  label={undefined}
                  footer="Show this QR at check-in"
                />
              </div>

              <div className="mt-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide">
                    Registration
                  </div>
                  <div className="mt-1 font-semibold text-gray-900">
                    #{registration.id.slice(0, 8).toUpperCase()}
                  </div>
                  {registration.event.is_paid && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-600 mr-1">Payment:</span>
                      <span
                        className={
                          registration.payment_status === "completed"
                            ? "text-green-600"
                            : "text-yellow-700"
                        }
                      >
                        {registration.payment_status === "completed"
                          ? "Completed"
                          : registration.payment_status || "Pending"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Details & Actions */}
            <div className="p-8 bg-gradient-to-b from-white to-primary-50/40 border-l border-gray-200">
              {/* Event + Attendee at top */}
              <div className="mb-6">
                <div className="text-sm text-gray-500">Event</div>
                <div className="text-2xl font-bold text-gray-900">
                  {registration.event.title}
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-gray-700">
                  <span className="inline-flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" /> {registration.name}
                  </span>
                  <span className="hidden sm:inline text-gray-300">•</span>
                  <span className="inline-flex items-center">
                    <Mail className="h-4 w-4 mr-2" /> {registration.email}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Date</div>
                    <div className="font-semibold text-gray-900">
                      {startDate.toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Time</div>
                    <div className="font-semibold text-gray-900">
                      {startDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Location</div>
                    <div className="font-semibold text-gray-900">
                      {registration.event.location}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button
                  onClick={handleDownloadICS}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                >
                  <Calendar className="h-4 w-4" /> Calendar
                </button>
                <a
                  href={`/events/${registration.event.id}`}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow"
                >
                  View Event
                </a>
              </div>

              {/* Info box */}
              <div className="mt-8 bg-primary-50 border border-primary-100 text-primary-800 rounded-xl p-4">
                <div className="font-semibold mb-2">Important</div>
                <ul className="text-sm space-y-1">
                  <li>• Keep this QR safe and don’t share it.</li>
                  <li>• Arrive 15 minutes early for check-in.</li>
                  <li>
                    • Download or screenshot your ticket for offline access.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParticipantTicketPage;
