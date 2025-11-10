import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/api/client";
import { Loader } from "../components/common/Loader";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  registrations_count: number;
  certificates_generated?: number;
  has_ended: boolean;
}

const CertificatesListPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all events that can have certificates (past events)
      const response = await apiClient.get("/certificates/events");
      const eventsData = (response.data as any)?.data || response.data || [];

      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
      setError("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Certificate Management
            </h1>
          </div>
          <p className="text-gray-600">
            Select an event to generate and manage certificates for participants
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Events Available
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have any events that can generate certificates yet.
            </p>
            <Link
              to="/events/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const hasEnded = new Date() > new Date(event.end_date);
              const canGenerateCertificates = hasEnded;

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* Event Status Badge */}
                    {/* <div className="flex items-center justify-between mb-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          hasEnded
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {hasEnded ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Ongoing
                          </>
                        )}
                      </span>
                      {event.certificates_generated && (
                        <span className="text-xs text-gray-500">
                          {event.certificates_generated} certificates
                        </span>
                      )}
                    </div> */}

                    {/* Event Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Event Details */}
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(event.start_date).toLocaleDateString()} -{" "}
                          {new Date(event.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.registrations_count || 0} participants
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Event Description */}
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Action Button */}
                    <div className="pt-4 border-t border-gray-200">
                      {canGenerateCertificates ? (
                        <Link
                          to={`/certificates/${event.id}`}
                          className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Award className="w-4 h-4 mr-2" />
                          Manage Certificates
                        </Link>
                      ) : (
                        <div className="text-center">
                          <button
                            disabled
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Event Must End First
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Certificates available after event completion
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificatesListPage;
