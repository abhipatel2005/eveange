import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EventService } from "../api/events";

const CreateEventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
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
    try {
      setIsLoading(true);
      setError(null);

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (endDate <= startDate) {
        setError("End date must be after start date");
        return;
      }

      if (data.registrationDeadline) {
        const registrationDeadline = new Date(data.registrationDeadline);
        if (registrationDeadline >= startDate) {
          setError("Registration deadline must be before the event start date");
          return;
        }
      }

      const eventData = {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        capacity: data.capacity,
        bannerUrl: data.bannerUrl || undefined,
        visibility: data.visibility,
        registrationDeadline: data.registrationDeadline || undefined,
        isPaid: data.isPaid,
        price: data.isPaid ? data.price : undefined,
      };

      const response = await EventService.createEvent(eventData);

      if (response.success && response.data) {
        navigate(`/events/${response.data.event.id}`);
      } else {
        setError(response.error || "Failed to create event");
      }
    } catch (err) {
      setError("Failed to create event. Please try again.");
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

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Basic Information
          </h2>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              <p className="mt-1 text-sm text-red-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description *
            </label>
            <textarea
              {...register("description")}
              id="description"
              rows={4}
              className={`input ${errors.description ? "border-red-500" : ""}`}
              placeholder="Describe your event"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location *
            </label>
            <input
              {...register("location")}
              type="text"
              id="location"
              className={`input ${errors.location ? "border-red-500" : ""}`}
              placeholder="Event location or venue"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">
                {errors.location.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="bannerUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              <p className="mt-1 text-sm text-red-600">
                {errors.bannerUrl.message}
              </p>
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
                className={`input ${errors.startDate ? "border-red-500" : ""}`}
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
                    ₹
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              "Create Event"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
