import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { RegistrationService } from "../api/registrations";

// Basic registration form schema
const RegistrationFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  organization: z.string().optional(),
  dietary: z.string().optional(),
  accessibility: z.string().optional(),
  comments: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof RegistrationFormSchema>;

const RegistrationFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(RegistrationFormSchema),
  });

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

        // Pre-fill form with user data if available
        if (user) {
          setValue("email", user.email);
          setValue("firstName", user.name.split(" ")[0] || "");
          setValue("lastName", user.name.split(" ").slice(1).join(" ") || "");
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
  }, [id, user, setValue]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (!event || !id || !user) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await RegistrationService.registerForEvent(id, {
        formData: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          organization: data.organization,
          dietary: data.dietary,
          accessibility: data.accessibility,
          comments: data.comments,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
        },
      });

      if (response.success) {
        navigate(`/events/${id}`, {
          state: { message: "Successfully registered for the event!" },
        });
      } else {
        setError(response.error || "Failed to register for event");
      }
    } catch (err) {
      setError("Failed to register for event. Please try again.");
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
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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
                {...register("firstName")}
                type="text"
                id="firstName"
                className={`input ${errors.firstName ? "border-red-500" : ""}`}
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name *
              </label>
              <input
                {...register("lastName")}
                type="text"
                id="lastName"
                className={`input ${errors.lastName ? "border-red-500" : ""}`}
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.lastName.message}
                </p>
              )}
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
              {...register("email")}
              type="email"
              id="email"
              className={`input ${errors.email ? "border-red-500" : ""}`}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number *
              </label>
              <input
                {...register("phone")}
                type="tel"
                id="phone"
                className={`input ${errors.phone ? "border-red-500" : ""}`}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="organization"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization
              </label>
              <input
                {...register("organization")}
                type="text"
                id="organization"
                className="input"
                placeholder="Company or organization"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Additional Information
          </h3>

          <div>
            <label
              htmlFor="dietary"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dietary Requirements
            </label>
            <input
              {...register("dietary")}
              type="text"
              id="dietary"
              className="input"
              placeholder="Any dietary restrictions or preferences"
            />
          </div>

          <div>
            <label
              htmlFor="accessibility"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Accessibility Needs
            </label>
            <input
              {...register("accessibility")}
              type="text"
              id="accessibility"
              className="input"
              placeholder="Any accessibility requirements"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="emergencyContact"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Emergency Contact Name
              </label>
              <input
                {...register("emergencyContact")}
                type="text"
                id="emergencyContact"
                className="input"
                placeholder="Emergency contact name"
              />
            </div>

            <div>
              <label
                htmlFor="emergencyPhone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Emergency Contact Phone
              </label>
              <input
                {...register("emergencyPhone")}
                type="tel"
                id="emergencyPhone"
                className="input"
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="comments"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional Comments
            </label>
            <textarea
              {...register("comments")}
              id="comments"
              rows={3}
              className="input"
              placeholder="Any additional information or comments"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate(`/events/${event.id}`)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registering...
              </div>
            ) : event.is_paid ? (
              `Register & Pay $${event.price}`
            ) : (
              "Register for Event"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationFormPage;
