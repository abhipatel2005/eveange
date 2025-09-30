import { useState, useEffect } from "react";
import { UserPlus, Mail, Trash2, Shield, Eye } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface Staff {
  id: string;
  permissions: {
    can_check_in: boolean;
    can_view_stats: boolean;
  };
  assigned_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    last_login_at: string | null;
  };
  assigned_by_user: {
    name: string;
    email: string;
  };
}

interface StaffManagementProps {
  eventId: string;
}

export function StaffManagement({ eventId }: StaffManagementProps) {
  const { accessToken } = useAuthStore();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hasGmailPermission, setHasGmailPermission] = useState(false);
  const [checkingGmailPermission, setCheckingGmailPermission] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: "",
    name: "",
    permissions: {
      can_check_in: true,
      can_view_stats: true,
    },
  });

  useEffect(() => {
    fetchStaff();
    checkGmailPermission();
  }, [eventId]);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/checkin/events/${eventId}/staff`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Staff data received:", data);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
      } else {
        console.error("Failed to fetch staff:", response.status);
        setStaff([]);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkGmailPermission = async () => {
    try {
      setCheckingGmailPermission(true);
      const response = await fetch("/api/email/status", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasGmailPermission(data.hasGmailPermission);
      }
    } catch (error) {
      console.error("Error checking Gmail permission:", error);
    } finally {
      setCheckingGmailPermission(false);
    }
  };

  const requestGmailPermission = async () => {
    try {
      const response = await fetch("/api/email/authorize", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        console.error("Failed to get Gmail authorization URL");
      }
    } catch (error) {
      console.error("Error requesting Gmail permission:", error);
    }
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📝 Frontend newStaff state:", newStaff);

    try {
      // Convert permissions object to array format for backend
      const permissionsArray = [];
      if (newStaff.permissions.can_check_in) {
        permissionsArray.push("check-in");
      }
      if (newStaff.permissions.can_view_stats) {
        permissionsArray.push("view-stats");
      }

      const staffData = {
        email: newStaff.email,
        name: newStaff.name,
        permissions: permissionsArray,
      };

      console.log("📤 Sending staff data:", staffData);

      const response = await fetch(`/api/checkin/events/${eventId}/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(staffData),
      });

      if (response.ok) {
        await fetchStaff(); // Refresh the list
        setNewStaff({
          email: "",
          name: "",
          permissions: {
            can_check_in: true,
            can_view_stats: true,
          },
        });
        setShowAddForm(false);
        alert(
          "Staff member added successfully! Login credentials will be sent via email."
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add staff member");
      }
    } catch (error) {
      console.error("Error adding staff:", error);
      alert("Failed to add staff member");
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/checkin/events/${eventId}/staff/${staffId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchStaff(); // Refresh the list
        alert("Staff member removed successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove staff member");
      }
    } catch (error) {
      console.error("Error removing staff:", error);
      alert("Failed to remove staff member");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Event Staff Management
            </h3>
            <p className="text-sm text-gray-600">
              Manage staff access for check-in and event management
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Gmail Permission Banner */}
      {!hasGmailPermission && (
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">
                  Gmail Permission Required
                </h4>
                <p className="text-sm text-amber-700">
                  Grant Gmail access to automatically send staff credentials
                  from your email account
                </p>
              </div>
            </div>
            <button
              onClick={requestGmailPermission}
              disabled={checkingGmailPermission}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {checkingGmailPermission ? "Checking..." : "Grant Permission"}
            </button>
          </div>
        </div>
      )}

      {hasGmailPermission && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              ✓ Gmail permission granted - Staff emails will be sent from your
              account
            </span>
          </div>
        </div>
      )}

      {/* Add Staff Form */}
      {showAddForm && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={addStaff} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStaff.permissions.can_check_in}
                    onChange={(e) =>
                      setNewStaff({
                        ...newStaff,
                        permissions: {
                          ...newStaff.permissions,
                          can_check_in: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Can check-in participants
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStaff.permissions.can_view_stats}
                    onChange={(e) =>
                      setNewStaff({
                        ...newStaff,
                        permissions: {
                          ...newStaff.permissions,
                          can_view_stats: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Can view check-in statistics
                  </span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Staff Member
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Loading staff...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No staff members assigned to this event.</p>
            <p className="text-sm">
              Add staff members to help with check-in and event management.
            </p>
          </div>
        ) : (
          staff
            .filter((member) => member && member.user)
            .map((member) => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {member.user?.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.user?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {member.user?.email || "No email"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Added{" "}
                          {new Date(member.assigned_at).toLocaleDateString()} by{" "}
                          {member.assigned_by_user?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Permissions */}
                    <div className="flex space-x-2">
                      {member.permissions.can_check_in && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Check-in
                        </span>
                      )}
                      {member.permissions.can_view_stats && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Stats
                        </span>
                      )}
                    </div>

                    {/* Last Login */}
                    <div className="text-xs text-gray-500">
                      {member.user?.last_login_at ? (
                        <>
                          Last login:{" "}
                          {new Date(
                            member.user.last_login_at
                          ).toLocaleDateString()}
                        </>
                      ) : (
                        "Never logged in"
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const subject = encodeURIComponent(
                            `Event Staff Access - ${eventId}`
                          );
                          const body = encodeURIComponent(
                            `Hi ${
                              member.user?.name || "Staff Member"
                            },\n\nYou have been granted staff access for this event. Please check your email for login credentials.\n\nBest regards`
                          );
                          window.open(
                            `mailto:${
                              member.user?.email || ""
                            }?subject=${subject}&body=${body}`
                          );
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="Send email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          removeStaff(member.user?.id || member.id)
                        }
                        className="text-red-600 hover:text-red-700"
                        title="Remove staff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Info Footer */}
      <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Staff Access Information:</p>
            <ul className="space-y-1">
              <li>• Staff members receive login credentials via email</li>
              <li>
                • They can access the check-in system with their assigned
                permissions
              </li>
              <li>
                • Staff accounts are created automatically if they don't exist
              </li>
              <li>• You can modify or revoke access at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
