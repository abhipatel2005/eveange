import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  Search,
  Download,
  QrCode,
} from "lucide-react";
import { EventService, Event } from "../api/events";
import { formatDate } from "../utils/dateUtils";
import { useAuthStore } from "../store/authStore";

interface AttendanceRecord {
  id: string;
  checked_in_at: string;
  location: string;
  registration: {
    name: string;
    email: string;
  };
  checked_in_by_user: {
    name: string;
  };
}

interface AttendanceStats {
  total_registrations: number;
  total_check_ins: number;
  check_in_rate: string;
}

const AttendancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({
    total_registrations: 0,
    total_check_ins: 0,
    check_in_rate: "0",
  });
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Event ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch event details
        const eventResponse = await EventService.getEventById(id);
        if (eventResponse.success && eventResponse.data) {
          setEvent(eventResponse.data.event);
        } else {
          setError(eventResponse.error || "Event not found");
          setIsLoading(false);
          return;
        }

        // Fetch attendance stats
        const API_BASE_URL =
          import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const response = await fetch(
          `${API_BASE_URL}/checkin/events/${id}/stats?all=true`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }

        const data = await response.json();
        setStats(data.stats);
        setAttendanceRecords(data.recent_check_ins || []);
      } catch (err) {
        setError("Failed to load attendance data");
        console.error("Attendance page error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, accessToken]);

  const filteredRecords = attendanceRecords.filter(
    (record) =>
      record.registration.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.registration.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!attendanceRecords.length) return;

    const headers = [
      "Name",
      "Email",
      "Check-in Time",
      "Location",
      "Checked In By",
    ];
    const rows = attendanceRecords.map((record) => [
      record.registration.name,
      record.registration.email,
      new Date(record.checked_in_at).toLocaleString(),
      record.location || "N/A",
      record.checked_in_by_user.name,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.title || "event"}-attendance-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900">Error</h3>
            <p className="mt-1 text-red-700">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-3 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(`/events/${id}`)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Event
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/events/${id}/checkin`)}
              className="inline-flex items-center px-4 py-2 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={!attendanceRecords.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Attendance Tracking
        </h1>

        {/* Event Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {event.title}
              </h2>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(event.start_date)}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <p className="text-sm font-medium text-gray-600">
                Total Check-ins
              </p>
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
              <p className="text-sm font-medium text-gray-600">Check-in Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.check_in_rate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Attendance Records */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No matching records found" : "No check-ins yet"}
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Participants will appear here once they check in"}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Check-in Records ({filteredRecords.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <li key={record.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-green-600" />
                      </div>
                    </div>

                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {record.registration.name}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Checked In
                        </span>
                      </div>

                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <span>{record.registration.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(record.checked_in_at).toLocaleString()}
                        </div>
                        {record.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {record.location}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-gray-400">
                        Checked in by: {record.checked_in_by_user.name}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
