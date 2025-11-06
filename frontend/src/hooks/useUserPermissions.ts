import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";

interface UserPermissions {
  hasStaffAssignments: boolean;
  canAccessCertificates: boolean;
  canScanQR: boolean;
  eventUsers: Array<{
    event_id: string;
    role: string;
    permissions: string[];
    is_active: boolean;
  }>;
}

export function useUserPermissions() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users/permissions", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch permissions");
        }

        const result = await response.json();
        if (result.success) {
          setPermissions(result.data);
          
          // Update localStorage for backward compatibility
          localStorage.setItem(
            "dashboard_has_staff",
            result.data.hasStaffAssignments ? "true" : "false"
          );
          localStorage.setItem(
            "dashboard_staff_can_cert",
            result.data.canAccessCertificates ? "true" : "false"
          );
        } else {
          throw new Error(result.error || "Failed to fetch permissions");
        }
      } catch (err: any) {
        console.error("Error fetching user permissions:", err);
        setError(err.message);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [accessToken, isAuthenticated]);

  return { permissions, loading, error };
}
