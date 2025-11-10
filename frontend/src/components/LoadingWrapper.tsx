import React from "react";
import { Loader } from "./common/Loader";

interface LoadingWrapperProps {
  loading: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  children,
  loadingComponent,
}) => {
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader size="lg" text="Loading..." />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};

export default LoadingWrapper;
