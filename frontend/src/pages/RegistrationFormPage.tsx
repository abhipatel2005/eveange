import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EventService, Event } from "../api/events";
import { RegistrationService } from "../api/registrations";
import {
  RegistrationFormService,
  RegistrationForm,
} from "../api/registrationForms";
import { useAuthStore } from "../store/authStore";
import { handleError, ErrorPatterns } from "../utils/errorHandling";
import { RegistrationFormRenderer } from "../components/forms/RegistrationFormRenderer";

const RegistrationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [registrationForm, setRegistrationForm] =
    useState<RegistrationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Event ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch event details
        const eventResponse = await EventService.getEventById(id);
        if (!eventResponse.success || !eventResponse.data) {
          setError(eventResponse.error || "Event not found");
          setLoading(false);
          return;
        }

        setEvent(eventResponse.data.event);

        // Fetch custom registration form
        try {
          const formResponse =
            await RegistrationFormService.getRegistrationForm(id);
          if (formResponse.success && formResponse.data) {
            setRegistrationForm(formResponse.data.form);
          }
        } catch (formError) {
          // No custom form found, will use default form
          // Don't set error here - we'll fall back to default form
        }

        // Pre-fill form with user data if available
        if (user) {
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            firstName: user.name.split(" ")[0] || "",
            lastName: user.name.split(" ").slice(1).join(" ") || "",
          }));
        }

        // Check if user is already registered
        if (user) {
          const statusResponse =
            await RegistrationService.checkRegistrationStatus(id);
          if (statusResponse.success && statusResponse.data?.isRegistered) {
            setIsRegistered(true);
          }
        }
      } catch (err) {
        setError("Failed to load event details");
        console.error("Registration form error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !id || !user) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await RegistrationService.registerForEvent(id, {
        formData: formData,
      });

      if (response.success && response.data) {
        // Check if payment is required
        if (response.data.requiresPayment) {
          // Navigate to payment page with registration data
          navigate(`/events/${id}/payment`, {
            state: {
              registration: response.data.registration,
              amount: response.data.amount,
              message: response.message,
            },
          });
        } else {
          navigate(`/events/${id}`, {
            state: { message: "Successfully registered for the event!" },
          });
        }
      } else {
        setError(response.error || "Failed to register for event");
      }
    } catch (err) {
      // Use the new error handling utility for consistent, user-friendly messages
      const errorMessage = handleError(err, ErrorPatterns.REGISTRATION);
      setError(errorMessage);
      console.error("Registration error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading registration form...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Login Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to register for events.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="btn btn-secondary"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Already Registered
          </h2>
          <p className="text-gray-600 mb-6">
            You are already registered for this event.
          </p>
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="btn btn-primary"
          >
            View Event Details
          </button>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.start_date);
  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : null;
  const isDeadlinePassed =
    registrationDeadline && new Date() > registrationDeadline;
  const hasStarted = new Date() > startDate;

  if (isDeadlinePassed || hasStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Registration Closed
          </h2>
          <p className="text-gray-600 mb-6">
            {hasStarted
              ? "This event has already started."
              : "The registration deadline has passed."}
          </p>
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="btn btn-secondary"
          >
            View Event Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/events/${event.id}`)}
          className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Event
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Register for Event
        </h1>
        <h2 className="text-xl text-gray-700 mb-4">{event.title}</h2>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2m-8 0V7"
                />
              </svg>
              {startDate.toLocaleDateString()} at{" "}
              {startDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {event.location}
            </span>
          </div>
          {event.is_paid && (
            <div className="mt-2">
              <span className="text-lg font-semibold text-gray-900">
                ${event.price}
              </span>
              <span className="text-sm text-gray-600 ml-1">per ticket</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        {registrationForm ? (
          // Render custom form
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {registrationForm.title}
            </h2>
            {registrationForm.description && (
              <p className="text-gray-600 mb-6">
                {registrationForm.description}
              </p>
            )}
            <RegistrationFormRenderer
              form={registrationForm}
              onDataChange={setFormData}
              initialData={formData}
            />
          </div>
        ) : (
          // Fallback to default form if no custom form exists
          <DefaultRegistrationFormFields
            event={event}
            formData={formData}
            handleInputChange={handleInputChange}
          />
        )}

        {/* Single Submit Button for both forms */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                Registering...
              </>
            ) : (
              <>Register for Event</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Default registration form component (just the fields, no form wrapper)
const DefaultRegistrationFormFields: React.FC<{
  event: Event;
  formData: Record<string, any>;
  handleInputChange: (fieldId: string, value: any) => void;
}> = ({ event, formData, handleInputChange }) => {
  return (
    <div className="card space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName || ""}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="input"
              placeholder="Enter your first name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName || ""}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="input"
              placeholder="Enter your last name"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="input"
            placeholder="Enter your email address"
            required
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="input"
            placeholder="Enter your phone number"
            required
          />
        </div>

        <div>
          <label
            htmlFor="organization"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Organization (Optional)
          </label>
          <input
            type="text"
            id="organization"
            value={formData.organization || ""}
            onChange={(e) => handleInputChange("organization", e.target.value)}
            className="input"
            placeholder="Enter your organization"
          />
        </div>
      </div>

      {/* Additional Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Additional Information
        </h3>

        <div>
          <label
            htmlFor="dietary"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Dietary Requirements (Optional)
          </label>
          <textarea
            id="dietary"
            rows={3}
            value={formData.dietary || ""}
            onChange={(e) => handleInputChange("dietary", e.target.value)}
            className="input"
            placeholder="Please list any dietary requirements or food allergies"
          />
        </div>

        <div>
          <label
            htmlFor="accessibility"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Accessibility Requirements (Optional)
          </label>
          <textarea
            id="accessibility"
            rows={3}
            value={formData.accessibility || ""}
            onChange={(e) => handleInputChange("accessibility", e.target.value)}
            className="input"
            placeholder="Please describe any accessibility requirements"
          />
        </div>

        <div>
          <label
            htmlFor="comments"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Additional Comments (Optional)
          </label>
          <textarea
            id="comments"
            rows={3}
            value={formData.comments || ""}
            onChange={(e) => handleInputChange("comments", e.target.value)}
            className="input"
            placeholder="Any additional comments or questions"
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Emergency Contact (Optional)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="emergencyContact"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contact Name
            </label>
            <input
              type="text"
              id="emergencyContact"
              value={formData.emergencyContact || ""}
              onChange={(e) =>
                handleInputChange("emergencyContact", e.target.value)
              }
              className="input"
              placeholder="Emergency contact name"
            />
          </div>

          <div>
            <label
              htmlFor="emergencyPhone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyPhone"
              value={formData.emergencyPhone || ""}
              onChange={(e) =>
                handleInputChange("emergencyPhone", e.target.value)
              }
              className="input"
              placeholder="Emergency contact phone"
            />
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="border-t pt-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            By registering for this event, you agree to provide accurate
            information and comply with the event terms and conditions.
            {event.is_paid && (
              <span className="font-medium">
                {" "}
                Payment will be required to complete your registration.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormPage;
