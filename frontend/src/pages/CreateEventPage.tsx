import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EventService } from "../api/events";
import { useAuth } from "../hooks/useAuth";
import { UserService } from "../api/user";
import MapLocationPicker from "../components/ui/MapLocationPicker";
import { OrganizerUpgradeModal } from "../components/modals/OrganizerUpgradeModal";
import { Loader } from "../components/common/Loader";
import {
  showErrorToast,
  showSuccessToast,
  showLoadingToast,
  dismissToast,
} from "../utils/toast";
import { invalidateDashboardCache } from "../utils/cacheInvalidation";

const CreateEventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  bannerUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  visibility: z.enum(["public", "private", "invite-only"]),
  registrationDeadline: z.string().optional(),
  isPaid: z.boolean(),
  price: z.number().min(0, "Price must be 0 or greater").optional(),
});

type CreateEventFormData = z.infer<typeof CreateEventFormSchema>;

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  // Allow all users, but require org name and phone number
  const needsProfileInfo = !user?.organizationName || !user?.phoneNumber;
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [locationData, setLocationData] = useState<
    | {
        address: string;
        latitude: number;
        longitude: number;
        placeId?: string;
      }
    | undefined
  >(undefined);

  // Show modal if user missing org/phone
  useEffect(() => {
    if (user && needsProfileInfo) {
      setShowUpgradeModal(true);
    } else {
      setShowUpgradeModal(false);
    }
  }, [user, needsProfileInfo]);

  // Fetch latest user profile after successful upgrade
  const handleUpgradeSuccess = async () => {
    try {
      const response = await UserService.getProfile();
      if (response.success && response.data) {
        updateUser(response.data.user);
      }
    } catch (err) {
      // ignore
    } finally {
      setShowUpgradeModal(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(CreateEventFormSchema),
    defaultValues: {
      visibility: "public",
      isPaid: false,
      capacity: 50,
    },
  });

  const isPaid = watch("isPaid");

  const onSubmit = async (data: CreateEventFormData) => {
    let toastId: string | undefined;
    try {
      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (endDate <= startDate) {
        showErrorToast("End date must be after start date");
        return;
      }

      if (data.registrationDeadline) {
        const registrationDeadline = new Date(data.registrationDeadline);
        if (registrationDeadline >= startDate) {
          showErrorToast(
            "Registration deadline must be before the event start date"
          );
          return;
        }
      }

      setIsLoading(true);
      toastId = showLoadingToast("Creating event...");

      const eventData = {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        capacity: data.capacity,
        bannerUrl: data.bannerUrl || undefined,
        visibility: data.visibility,
        registrationDeadline: data.registrationDeadline || undefined,
        isPaid: data.isPaid,
        price: data.isPaid ? data.price : undefined,
      };

      const response = await EventService.createEvent(eventData);

      if (response.success && response.data) {
        dismissToast(toastId);
        showSuccessToast("Event created successfully!");

        // Invalidate dashboard cache so new event appears immediately
        invalidateDashboardCache();

        navigate(`/events/${response.data.event.id}`);
      } else {
        dismissToast(toastId);
        showErrorToast(response.error || "Failed to create event");
      }
    } catch (err) {
      if (toastId) dismissToast(toastId);
      showErrorToast(err);
      console.error("Create event error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      {/* Show form only if user has org/phone and modal is not showing */}
      {!showUpgradeModal && !needsProfileInfo && (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {/* Basic Information */}
          <div className="form-section">
            <h2 className="text-xl font-semibold text-gray-900">
              Basic Information
            </h2>

            <div>
              <label htmlFor="title" className="form-label">
                Event Title *
              </label>
              <input
                {...register("title")}
                type="text"
                id="title"
                className={`input ${errors.title ? "border-red-500" : ""}`}
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="form-error">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="form-label">
                Description *
              </label>
              <textarea
                {...register("description")}
                id="description"
                rows={4}
                className={`input ${
                  errors.description ? "border-red-500" : ""
                }`}
                placeholder="Describe your event"
              />
              {errors.description && (
                <p className="form-error">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="form-label">
                Event Location *
              </label>
              <MapLocationPicker
                value={locationData}
                onChange={(location) => {
                  setLocationData(location);
                  setValue("location", location.address);
                  setValue("latitude", location.latitude);
                  setValue("longitude", location.longitude);
                }}
                placeholder="Search for event location..."
                className="mt-1"
              />
              {errors.location && (
                <p className="form-error">{errors.location.message}</p>
              )}

              {/* Hidden inputs for form validation */}
              <input type="hidden" {...register("location")} />
              <input
                type="hidden"
                {...register("latitude", { valueAsNumber: true })}
              />
              <input
                type="hidden"
                {...register("longitude", { valueAsNumber: true })}
              />
            </div>

            <div>
              <label htmlFor="bannerUrl" className="form-label">
                Banner Image URL
              </label>
              <input
                {...register("bannerUrl")}
                type="url"
                id="bannerUrl"
                className={`input ${errors.bannerUrl ? "border-red-500" : ""}`}
                placeholder="https://example.com/banner.jpg"
              />
              {errors.bannerUrl && (
                <p className="form-error">{errors.bannerUrl.message}</p>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Date & Time</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date & Time *
                </label>
                <input
                  {...register("startDate")}
                  type="datetime-local"
                  id="startDate"
                  className={`input ${
                    errors.startDate ? "border-red-500" : ""
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date & Time *
                </label>
                <input
                  {...register("endDate")}
                  type="datetime-local"
                  id="endDate"
                  className={`input ${errors.endDate ? "border-red-500" : ""}`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="registrationDeadline"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Registration Deadline
              </label>
              <input
                {...register("registrationDeadline")}
                type="datetime-local"
                id="registrationDeadline"
                className="input"
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional: Set a deadline for registrations
              </p>
            </div>
          </div>

          {/* Capacity and Settings */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Event Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Maximum Capacity *
                </label>
                <input
                  {...register("capacity", { valueAsNumber: true })}
                  type="number"
                  id="capacity"
                  min="1"
                  className={`input ${errors.capacity ? "border-red-500" : ""}`}
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.capacity.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="visibility"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Event Visibility *
                </label>
                <select
                  {...register("visibility")}
                  id="visibility"
                  className="input"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite-only">Invite Only</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  {...register("isPaid")}
                  type="checkbox"
                  id="isPaid"
                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <label
                  htmlFor="isPaid"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  This is a paid event
                </label>
              </div>

              {isPaid && (
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ticket Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      {...register("price", { valueAsNumber: true })}
                      type="number"
                      id="price"
                      min="0"
                      step="0.5"
                      className={`input pl-8 ${
                        errors.price ? "border-red-500" : ""
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.price.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader size="xs" className="border-white mr-2" />
                  Creating...
                </div>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Organizer Upgrade Modal */}
      <OrganizerUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={handleUpgradeSuccess}
      />
    </div>
  );
};

export default CreateEventPage;
