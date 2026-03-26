import Razorpay from "razorpay";

/**
 * Shared Razorpay client instance.
 * Uses RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from environment.
 */
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
