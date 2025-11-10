import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { CheckInDashboard } from "../components/checkin/CheckInDashboard";
import { Loader } from "../components/common/Loader";

export function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only allow staff, organizers, and admins to access check-in
  if (!["staff", "organizer", "admin"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access the check-in system. Only event
            staff and organizers can check in participants.
          </p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Event Not Found
          </h1>
          <p className="text-gray-600">Invalid event ID provided.</p>
        </div>
      </div>
    );
  }

  return <CheckInDashboard eventId={eventId} />;
}

export default CheckInPage;
