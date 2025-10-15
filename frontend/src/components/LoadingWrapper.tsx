import React, { useState, useEffect } from "react";
import { Loader } from "lucide-react";

interface LoadingWrapperProps {
  loading: boolean;
  children: React.ReactNode;
  minLoadingTime?: number; // Minimum time to show loading (prevents flickering)
  loadingComponent?: React.ReactNode;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  children,
  minLoadingTime = 300, // 300ms minimum loading time
  loadingComponent,
}) => {
  const [showLoading, setShowLoading] = useState(loading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (loading) {
      setStartTime(Date.now());
      setShowLoading(true);
    } else if (startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
          setStartTime(null);
        }, remaining);

        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
        setStartTime(null);
      }
    } else {
      // Handle edge case: loading toggled to false before we recorded a start time
      // In this case, hide the loader immediately to avoid getting stuck
      setShowLoading(false);
    }
  }, [loading, startTime, minLoadingTime]);

  if (showLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default LoadingWrapper;
