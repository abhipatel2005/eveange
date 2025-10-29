import React, { useState, useEffect } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "../ui/Button.tsx";
import { LoadingSpinner } from "../ui/LoadingSpinner.tsx";
import { PaymentService, PaymentIntent } from "../../api/payments.ts";
import { handleErrorSimple as handleError } from "../../utils/errorHandling";

interface StripePaymentGatewayProps {
  registrationId: string;
  eventId: string;
  amount: number;
  currency?: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

const CheckoutForm: React.FC<{
  paymentIntent: PaymentIntent;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}> = ({ paymentIntent, onSuccess, onError, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError("Card element not found");
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm the payment
      const { error, paymentIntent: confirmedPaymentIntent } =
        await stripe.confirmCardPayment(paymentIntent.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: paymentIntent.participantName,
              email: paymentIntent.participantEmail,
            },
          },
        });

      if (error) {
        onError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (confirmedPaymentIntent.status === "succeeded") {
        // Verify payment on server
        try {
          const verificationResponse = await PaymentService.verifyPayment({
            paymentId: paymentIntent.paymentId,
            paymentIntentId: confirmedPaymentIntent.id,
            paymentMethodId: confirmedPaymentIntent.payment_method as string,
          });

          if (
            verificationResponse.success &&
            verificationResponse.data?.success
          ) {
            onSuccess(paymentIntent.paymentId);
          } else {
            onError(
              verificationResponse.data?.message ||
                "Payment verification failed"
            );
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          onError(handleError(error));
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      onError(handleError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          {paymentIntent.eventTitle}
        </h3>
        <p className="text-gray-600">
          Participant: {paymentIntent.participantName}
        </p>
        <p className="text-gray-600">Email: {paymentIntent.participantEmail}</p>
        <p className="text-xl font-bold mt-2">
          Amount: {paymentIntent.currency.toUpperCase()}{" "}
          {(paymentIntent.amount / 100).toFixed(2)}
        </p>
      </div>

      <div className="p-4 border border-gray-300 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="sm" />
              Processing...
            </>
          ) : (
            `Pay ${paymentIntent.currency.toUpperCase()} ${(
              paymentIntent.amount / 100
            ).toFixed(2)}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export const StripePaymentGateway: React.FC<StripePaymentGatewayProps> = ({
  registrationId,
  eventId,
  amount,
  currency = "USD",
  onSuccess,
  onError,
  onCancel,
}) => {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const response = await PaymentService.createPaymentIntent(
          registrationId,
          eventId,
          amount,
          currency
        );

        if (response.success && response.data) {
          setPaymentIntent(response.data);
        } else {
          onError(response.message || "Failed to initialize payment");
        }
      } catch (error) {
        console.error("Payment initialization error:", error);
        onError(handleError(error));
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [registrationId, eventId, amount, currency, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Initializing payment...</span>
      </div>
    );
  }

  if (!paymentIntent) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Failed to initialize payment</p>
        <Button onClick={onCancel} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret: paymentIntent.clientSecret,
    appearance: {
      theme: "stripe",
    },
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Complete Payment</h2>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CheckoutForm
          paymentIntent={paymentIntent}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
};
