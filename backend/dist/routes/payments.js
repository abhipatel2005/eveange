import { Router } from "express";
import { PaymentController } from "../controllers/paymentController.js";
import { authenticateToken } from "../middleware/auth.js";
const router = Router();
// Webhook endpoint (no authentication required)
router.post("/webhook", PaymentController.handleStripeWebhook);
// All other payment routes require authentication
router.use(authenticateToken);
// Create payment intent
router.post("/create-intent", PaymentController.createPaymentIntent);
// Verify payment
router.post("/verify", PaymentController.verifyPayment);
// Handle payment failure
router.post("/failure", PaymentController.handlePaymentFailure);
// Get payment details
router.get("/:paymentId", PaymentController.getPaymentDetails);
export default router;
