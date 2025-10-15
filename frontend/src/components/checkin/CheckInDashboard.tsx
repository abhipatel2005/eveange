import { useState, useEffect } from "react";
import { Users, Clock, TrendingUp, UserCheck, Search } from "lucide-react";
import { QRScanner } from "./QRScanner";
import { useAuthStore } from "../../store/authStore";

interface CheckInStats {
  total_registrations: number;
  total_check_ins: number;
  check_in_rate: string;
}

interface RecentCheckIn {
  id: string;
  checked_in_at: string;
  registration: {
    name: string;
    email: string;
  };
  checked_in_by_user: {
    name: string;
  };
  location?: string;
}

interface CheckInDashboardProps {
  eventId: string;
}

export function CheckInDashboard({ eventId }: CheckInDashboardProps) {
  const { accessToken, user, validateToken, clearAuth } = useAuthStore();
  const [stats, setStats] = useState<CheckInStats>({
    total_registrations: 0,
    total_check_ins: 0,
    check_in_rate: "0",
  });
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<{
    name: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    // Validate token before making requests
    if (!validateToken()) {
      console.error("❌ Invalid or expired token detected");
      setLastCheckIn({
        name: "Authentication Error",
        time: "Please refresh and login again",
      });
      return;
    }

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchStats = async () => {
    try {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const response = await fetch(
        `${API_BASE_URL}/checkin/events/${eventId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentCheckIns(data.recent_check_ins);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  const handleScan = async (qrCode: string) => {
    if (!accessToken) {
      throw new Error(
        "Authentication required. Please refresh the page and login again."
      );
    }

    const API_BASE_URL =
      import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const fullUrl = `${API_BASE_URL}/checkin/events/${eventId}`;

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        qr_code: qrCode,
        location: "Main Entrance",
        device_info: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please refresh the page and login again."
        );
      }

      const error = await response.json();
      throw new Error(
        error.error || error.message || "Failed to check in participant"
      );
    }

    const result = await response.json();
    console.log("✅ Check-in successful:", result);

    // Update UI with success
    setLastCheckIn({
      name: result.participant.name,
      time: new Date().toLocaleTimeString(),
    });

    // Refresh stats
    fetchStats();

    return result;
  };

  const filteredCheckIns = recentCheckIns.filter(
    (checkIn) =>
      checkIn.registration.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      checkIn.registration.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Check for authentication issues
  if (!accessToken || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-4">
            You need to be logged in to access the check-in system.
          </p>
          <button
            onClick={() => {
              clearAuth();
              window.location.href = "/login";
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Login Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading check-in dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Check-In</h1>
          <p className="mt-2 text-gray-600">
            Scan QR codes to check in participants
          </p>
        </div>

        {/* Success Message */}
        {lastCheckIn && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <UserCheck className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">
                  ✅ {lastCheckIn.name} checked in successfully
                </p>
                <p className="text-green-600 text-sm">at {lastCheckIn.time}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Registrations
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_registrations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_check_ins}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Check-in Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.check_in_rate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner */}
          <div>
            <QRScanner
              onScan={handleScan}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
              eventId={eventId}
            />
          </div>

          {/* Recent Check-ins */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Check-ins
                </h3>
                <button
                  onClick={fetchStats}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredCheckIns.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {searchTerm ? "No participants found" : "No check-ins yet"}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {checkIn.registration.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {checkIn.registration.email}
                          </p>
                          {checkIn.location && (
                            <p className="text-xs text-gray-500">
                              📍 {checkIn.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {new Date(
                                checkIn.checked_in_at
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">
                            by {checkIn.checked_in_by_user.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-3">
            📱 How to Use Check-In System
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h5 className="font-medium mb-2">For Staff:</h5>
              <ul className="space-y-1">
                <li>• Click "Start Scanning" to activate camera</li>
                <li>• Point camera at participant's QR code</li>
                <li>• Wait for automatic scan and confirmation</li>
                <li>• Monitor real-time check-in statistics</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">For Participants:</h5>
              <ul className="space-y-1">
                <li>• Show QR code from registration email</li>
                <li>• Ensure QR code is clearly visible</li>
                <li>• One-time check-in per registration</li>
                <li>• Get instant confirmation when checked in</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
