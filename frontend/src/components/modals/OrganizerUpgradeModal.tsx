import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { UserService, OrganizerUpgradeData } from "../../api/user";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

// Define the schema for organizer upgrade
const OrganizerUpgradeSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  phoneNumber: z.string().optional(),
  description: z.string().optional(),
});

type OrganizerUpgradeFormData = z.infer<typeof OrganizerUpgradeSchema>;

interface OrganizerUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OrganizerUpgradeModal = ({
  isOpen,
  onClose,
  onSuccess,
}: OrganizerUpgradeModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizerUpgradeFormData>({
    resolver: zodResolver(OrganizerUpgradeSchema),
  });

  const onSubmit = async (data: OrganizerUpgradeFormData) => {
    try {
      setIsSubmitting(true);

      const upgradeData: OrganizerUpgradeData = {
        organizationName: data.organizationName,
        phoneNumber: data.phoneNumber || undefined,
        description: data.description || undefined,
      };

      const response = await UserService.upgradeToOrganizer(upgradeData);

      if (response.success && response.data) {
        // Update user in auth store
        updateUser(response.data.user);

        toast.success("Successfully upgraded to organizer!");
        reset();
        onSuccess();
      } else {
        throw new Error(response.error || "Failed to upgrade to organizer");
      }
    } catch (error) {
      console.error("Organizer upgrade failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upgrade to organizer. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Become an Event Organizer
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            To create events, you need to upgrade your account to an organizer.
            Please provide some additional information about your organization.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization Name *
              </label>
              <input
                {...register("organizationName")}
                type="text"
                id="organizationName"
                className="input"
                placeholder="Enter your organization name"
                disabled={isSubmitting}
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number (Optional)
              </label>
              <input
                {...register("phoneNumber")}
                type="tel"
                id="phoneNumber"
                className="input"
                placeholder="Enter your phone number"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Organization Description (Optional)
              </label>
              <textarea
                {...register("description")}
                id="description"
                rows={3}
                className="input resize-none"
                placeholder="Brief description of your organization"
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Upgrading..." : "Upgrade Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
