import React from "react";

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  text?: string;
}

const sizeClasses = {
  xs: "h-4 w-4 border-2",
  sm: "h-8 w-8 border-2",
  md: "h-12 w-12 border-2",
  lg: "h-16 w-16 border-2",
  xl: "h-32 w-32 border-4",
  full: "h-32 w-32 border-4",
};

/**
 * Universal Loader Component
 * A consistent spinner used across the entire application
 *
 * @param size - Size of the loader: xs, sm, md, lg, xl, full
 * @param className - Additional CSS classes
 * @param text - Optional loading text to display below spinner
 */
export const Loader: React.FC<LoaderProps> = ({
  size = "md",
  className = "",
  text,
}) => {
  const isFullPage = size === "full";

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-primary-600 ${sizeClasses[size]} ${className}`}
        style={{ borderTopColor: "transparent" }}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-gray-600 font-medium">{text}</p>}
    </div>
  );

  if (isFullPage) {
    return (
      <div className="flex items-center justify-center min-h-64">{spinner}</div>
    );
  }

  return spinner;
};

export default Loader;
