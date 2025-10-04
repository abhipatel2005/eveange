import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Ticket,
  CreditCard,
} from "lucide-react";
import { RegistrationService } from "../api/registrations";
import { formatDate } from "../utils/dateUtils.ts";

import { Registration } from "../api/registrations";

const MyRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await RegistrationService.getUserRegistrations();
      setRegistrations(response.data?.registrations || []);
    } catch (err) {
      setError(typeof err === "string" ? err : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleCancelRegistration = async (eventId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel your registration for this event?"
      )
    ) {
      return;
    }

    try {
      await RegistrationService.cancelRegistration(eventId);
      fetchRegistrations();
    } catch (error) {
      console.error("Failed to cancel registration:", error);

      let errorMessage = "Failed to cancel registration. Please try again.";
      if (error instanceof Error && "response" in error) {
        const apiError = error as any;
        if (apiError.status === 400) {
          errorMessage =
            "Cannot cancel registration for this event. It may have already started or the cancellation deadline has passed.";
        } else if (apiError.status === 404) {
          errorMessage =
            "Registration not found. It may have already been cancelled.";
        } else if (apiError.status === 403) {
          errorMessage =
            "You don't have permission to cancel this registration.";
        } else {
          errorMessage =
            apiError.response?.error ||
            "Failed to cancel registration. Please try again.";
        }
      }

      alert(errorMessage);
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

  const getPaymentStatusColor = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "not_required":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canAccessTicket = (registration: Registration): boolean => {
    if (registration.status === "cancelled") return false;

    // For paid events, payment must be completed
    if (registration.event?.is_paid) {
      return registration.payment_status === "completed";
    }

    // For free events, registration should be confirmed or payment not required
    return (
      registration.status === "confirmed" ||
      registration.payment_status === "not_required"
    );
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
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading registrations
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error || "An error occurred"}
              </p>
              <button
                onClick={() => fetchRegistrations()}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Registrations
        </h1>
        <p className="text-gray-600">
          View and manage your event registrations
        </p>
      </div>

      {/* Registrations List */}
      {!registrations || registrations.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No registrations yet
          </h3>
          <p className="text-gray-500 mb-6">
            You haven't registered for any events yet.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {registrations.map((registration: Registration) => {
            const event = registration.event;
            if (!event) return null;

            return (
              <div
                key={registration.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Event Title and Status */}
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {event.title}
                        </h3>
                        <div className="ml-3 flex space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              registration.status
                            )}`}
                          >
                            {registration.status}
                          </span>
                          {event.is_paid && registration.payment_status && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                                registration.payment_status
                              )}`}
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              {registration.payment_status.replace("_", " ")}
                            </span>
                          )}
                          {!event.is_paid && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Free Event
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event Description */}
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      {/* Event Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(event.start_date)}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Registered {formatDate(registration.created_at)}
                        </div>
                      </div>

                      {/* Price info for paid events */}
                      {event.is_paid && event.price && (
                        <div className="mt-3 text-sm text-gray-600">
                          Event Price: ${event.price}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {canAccessTicket(registration) && (
                        <Link
                          to={`/ticket/${registration.id}`}
                          className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          View Ticket
                        </Link>
                      )}

                      {event.is_paid &&
                        registration.payment_status === "pending" && (
                          <Link
                            to={`/events/${event.id}/payment`}
                            state={{
                              registration: registration,
                              amount: event.price || 0,
                              message:
                                "Complete your payment to confirm registration",
                            }}
                            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Complete Payment
                          </Link>
                        )}

                      <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Event
                      </Link>

                      {registration.status !== "cancelled" &&
                        !canAccessTicket(registration) && (
                          <button
                            onClick={() =>
                              handleCancelRegistration(registration.id)
                            }
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRegistrationsPage;
