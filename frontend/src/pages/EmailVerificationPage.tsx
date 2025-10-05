import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already-verified"
  >("loading");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] =
    useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const token = searchParams.get("token");

  useEffect(() => {
    // Only attempt verification once and only if we have a token
    if (token && !hasAttemptedVerification) {
      setHasAttemptedVerification(true);
      verifyEmail(token);
    } else if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
    }
  }, [token, hasAttemptedVerification]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      console.log("🔍 Attempting to verify token:", verificationToken);
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001/api"
        }/auth/verify-email?token=${verificationToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      const data = await response.json();
      console.log("📋 Response data:", data);

      if (data.success) {
        console.log("✅ Success response received");
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      } else {
        console.log("❌ Error response received:", data.error);
        // Handle specific error cases
        if (data.error?.includes("already been used")) {
          console.log("🔄 Setting status to already-verified");
          setStatus("already-verified");
          setMessage(
            "Your email has been verified! You can now log in to your account."
          );
        } else if (data.error?.includes("expired")) {
          console.log("⏰ Setting status to error (expired)");
          setStatus("error");
          setMessage(
            "This verification link has expired. Please request a new verification email."
          );
        } else {
          console.log("💥 Setting status to error (general)");
          setStatus("error");
          setMessage(data.error || "Failed to verify email.");
        }
      }
    } catch (error) {
      console.error("Email verification error:", error);
      setStatus("error");
      setMessage(
        "An error occurred while verifying your email. Please try again."
      );
    }
  };

  const resendVerification = async (email: string) => {
    try {
      setIsResending(true);
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/api/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage("Verification email sent! Please check your inbox.");
      } else {
        setMessage(data.error || "Failed to resend verification email.");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      setMessage("An error occurred while resending verification email.");
    } finally {
      setIsResending(false);
    }
  };

  const renderSuccessState = (title: string) => {
    // If user is currently logged in, we need to log them out so they can log in with verified credentials
    const needsReLogin = isAuthenticated && user;

    return (
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        {needsReLogin ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-3">
                You're currently logged in with an unverified account. Please
                log out and log back in to access all features.
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="btn btn-primary"
            >
              Log Out & Continue to Login
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Continue to Login
          </Link>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Email
            </h1>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        );

      case "success":
        return renderSuccessState("Email Verified!");

      case "already-verified":
        return renderSuccessState("Already Verified!");

      case "error":
        const isExpired = message.includes("expired");

        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Need a new verification link?
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  {isExpired
                    ? "Your verification link has expired. Enter your email address to get a new one."
                    : "If your verification link has expired or you need a new one, enter your email address below."}
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const email = formData.get("email") as string;
                    if (email) resendVerification(email);
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isResending}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isResending && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}
                      Resend
                    </button>
                  </div>
                </form>
              </div>

              <Link
                to="/register"
                className="inline-block text-primary-600 hover:text-primary-500 text-sm"
              >
                Create a new account
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex justify-center mb-6">
            <Mail className="h-12 w-12 text-primary-600" />
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
