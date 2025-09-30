import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { ParticipantQRCode } from "../components/checkin/ParticipantQRCode";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";

interface Registration {
  id: string;
  name: string;
  email: string;
  qr_code: string;
  status: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    location: string;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🎫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ticket Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error ||
              "The ticket you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Your Event Ticket
          </h1>
          <p className="text-gray-600 mt-2">
            Present this QR code at the event entrance
          </p>
        </div>

        {/* Status Badge */}
        <div className="text-center mb-6">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              registration.status === "confirmed"
                ? "bg-green-100 text-green-800"
                : registration.status === "attended"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {registration.status === "confirmed" && "✅ Confirmed"}
            {registration.status === "attended" && "🎉 Attended"}
            {registration.status === "pending" && "⏳ Pending"}
            {registration.status === "cancelled" && "❌ Cancelled"}
          </span>
        </div>

        {/* QR Code Component */}
        <ParticipantQRCode
          registrationId={registration.id}
          eventTitle={registration.event.title}
          participantName={registration.name}
          participantEmail={registration.email}
          qrCode={registration.qr_code}
        />

        {/* Important Notes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            📋 Important Information
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Keep this QR code safe and don't share it with others</li>
            <li>• Arrive at the venue 15 minutes before the event starts</li>
            <li>• Have your QR code ready for quick check-in</li>
            <li>
              • Take a screenshot or download the ticket for offline access
            </li>
            <li>• Contact support if you have any issues</li>
          </ul>
        </div>

        {/* Event Details Card */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-900 mb-3">Event Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Event:</span>
              <span className="font-medium">{registration.event.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {new Date(registration.event.start_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">
                {new Date(registration.event.start_date).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{registration.event.location}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantTicketPage;
