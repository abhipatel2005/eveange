import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Mail,
  Phone,
  FileText,
  Download,
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { RegistrationService, Registration } from "../api/registrations";
import { EventService, Event } from "../api/events";
import { formatDate } from "../utils/dateUtils";

const EventRegistrationsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    "all" | "confirmed" | "pending" | "cancelled"
  >("all");

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

        // Fetch event details and registrations
        const [eventResponse, registrationsResponse] = await Promise.all([
          EventService.getEventById(id),
          RegistrationService.getEventRegistrations(id),
        ]);

        if (eventResponse.success && eventResponse.data) {
          setEvent(eventResponse.data.event);
        } else {
          setError(eventResponse.error || "Event not found");
          return;
        }

        if (registrationsResponse.success && registrationsResponse.data) {
          setRegistrations(registrationsResponse.data.registrations);
        } else {
          setError(
            registrationsResponse.error || "Failed to load registrations"
          );
        }
      } catch (err) {
        setError("Failed to load data");
        console.error("Event registrations error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredRegistrations = registrations.filter((registration) => {
    if (selectedTab === "all") return true;
    return registration.status === selectedTab;
  });

  const getTabCount = (status: string) => {
    if (status === "all") return registrations.length;
    return registrations.filter((r) => r.status === status).length;
  };

  const exportToCSV = () => {
    if (!registrations.length) return;

    const headers = ["Name", "Email", "Phone", "Status", "Registration Date"];
    const csvContent = [
      headers.join(","),
      ...filteredRegistrations.map((registration) => {
        const user = registration.user;
        return [
          user?.name || "N/A",
          user?.email || "N/A",
          user?.phone_number || "N/A",
          registration.status,
          formatDate(registration.created_at),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event?.title || "event"}-registrations.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="text-lg font-medium">Error</h3>
            <p className="mt-1">{error}</p>
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

  if (!event) {
    return null;
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

          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={!filteredRegistrations.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Event Registrations
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
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {registrations.length} / {event.capacity} registered
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "all", label: "All Registrations" },
            { key: "confirmed", label: "Confirmed" },
            { key: "pending", label: "Pending" },
            { key: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.key
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label} ({getTabCount(tab.key)})
            </button>
          ))}
        </nav>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No registrations found
          </h3>
          <p className="text-gray-500">
            {selectedTab === "all"
              ? "No one has registered for this event yet."
              : `No ${selectedTab} registrations for this event.`}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredRegistrations.map((registration) => (
              <li key={registration.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(registration.status)}
                    </div>

                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {registration.name ||
                            registration.user?.name ||
                            "Unknown User"}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            registration.status
                          )}`}
                        >
                          {registration.status}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {registration.email ||
                            registration.user?.email ||
                            "No email"}
                        </div>
                        {registration.user?.phone_number && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {registration.user.phone_number}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Registered {formatDate(registration.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {registration.responses &&
                      Object.keys(registration.responses).length > 0 && (
                        <button
                          onClick={() => {
                            // Show form data in a modal or expand
                            alert(
                              `Form Data:\n${JSON.stringify(
                                registration.responses,
                                null,
                                2
                              )}`
                            );
                          }}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500"
                          title="View Form Data"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
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

export default EventRegistrationsPage;
