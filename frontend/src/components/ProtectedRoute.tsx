import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserPermissions } from "../hooks/useUserPermissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganizer?: boolean;
  requireAdmin?: boolean;
  allowStaff?: boolean; // Allow staff with appropriate permissions
}

export const ProtectedRoute = ({
  children,
  requireOrganizer = false,
  requireAdmin = false,
  allowStaff = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = useUserPermissions();
  const location = useLocation();

  // Show loading state while checking authentication or permissions
  if (isLoading || (allowStaff && permissionsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permissions
  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireOrganizer) {
    const isOrganizerOrAdmin = ["organizer", "admin"].includes(
      user?.role || ""
    );

    // If allowStaff is true, check event_users permissions from backend
    if (allowStaff && !isOrganizerOrAdmin) {
      // Check if user has staff assignments or certificate permissions from event_users
      const hasAccess =
        permissions?.hasStaffAssignments ||
        permissions?.canAccessCertificates ||
        permissions?.canScanQR;

      if (!hasAccess) {
        return <Navigate to="/dashboard" replace />;
      }
    } else if (!isOrganizerOrAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
