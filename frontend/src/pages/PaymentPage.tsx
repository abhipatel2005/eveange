import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { StripePaymentGateway } from "../components/payment/StripePaymentGateway";
import { toast } from "react-hot-toast";

interface LocationState {
  registration: {
    id: string;
    name: string;
    email: string;
    event: {
      id: string;
      title: string;
      start_date: string;
      location: string;
      is_paid: boolean;
      price: number;
    };
  };
  amount: number;
  message: string;
}

export function PaymentPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const state = location.state as LocationState;

  useEffect(() => {
    // Validate state and redirect if invalid
    if (!state || !state.registration || !eventId) {
      setError("Invalid payment session. Please try registering again.");
      setLoading(false);
      return;
    }

    // Payment is ready to be processed by Stripe component
    setLoading(false);
  }, [state, eventId]);

  const handlePaymentSuccess = (_paymentId: string) => {
    setPaymentCompleted(true);
    toast.success("Payment completed successfully!");

    // Navigate to ticket page or event details
    setTimeout(() => {
      navigate(`/ticket/${state.registration.id}`, {
        state: {
          message: "Payment completed! Your registration is confirmed.",
        },
      });
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    toast.error("Payment failed: " + errorMessage);
  };

  const handlePaymentCancel = () => {
    // User cancelled payment
    toast(
      "Payment cancelled. You can complete it later from your registrations."
    );
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing payment...</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Error
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "Invalid payment session. Please try registering again."}
          </p>
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-4">
            Your registration is confirmed. Redirecting to your ticket...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Registration
          </h1>
          <p className="text-gray-600 mt-2">{state.message}</p>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Event Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Event:</span>
              <span className="font-medium">
                {state.registration.event.title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {new Date(
                  state.registration.event.start_date
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">
                {state.registration.event.location}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Participant:</span>
              <span className="font-medium">{state.registration.name}</span>
            </div>
          </div>
        </div>

        {/* Payment Gateway */}
        <StripePaymentGateway
          registrationId={state.registration.id}
          eventId={eventId!}
          amount={state.amount}
          currency="USD"
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />

        {/* Support Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Having trouble with payment? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
