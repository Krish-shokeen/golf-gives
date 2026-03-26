/**
 * Subscription API Routes
 * POST /api/subscriptions/create — create a Razorpay subscription/order for monthly or yearly plan
 * Requirements: 2.1, 2.2
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { razorpay } from "../lib/razorpay";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * Plan configuration.
 * Amounts are in paise (INR smallest unit): 1 INR = 100 paise.
 * Adjust plan IDs and amounts to match your Razorpay dashboard plans.
 */
const PLANS: Record<string, { amount: number; period: string; interval: number }> = {
  monthly: { amount: 999_00, period: "monthly", interval: 1 },   // ₹999/month
  yearly:  { amount: 9999_00, period: "yearly",  interval: 1 },  // ₹9999/year
};

/**
 * POST /api/subscriptions/create
 * Creates a Razorpay subscription (or order for one-time) for the authenticated user.
 * Returns { subscriptionId, keyId } for client-side Razorpay checkout.
 * Stores razorpay_customer_id on the profile after first checkout.
 * Requirements: 2.1, 2.2
 */
router.post("/create", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { plan } = req.body as { plan?: string };

  if (!plan || !PLANS[plan]) {
    return res.status(400).json({
      error: "plan must be 'monthly' or 'yearly'",
      code: "INVALID_PLAN",
    });
  }

  // Fetch profile to check for existing razorpay_customer_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name, razorpay_customer_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: "Profile not found", code: "PROFILE_NOT_FOUND" });
  }

  let customerId: string = profile.razorpay_customer_id ?? "";

  // Create a Razorpay customer if one doesn't exist yet
  if (!customerId) {
    try {
      const customer = await razorpay.customers.create({
        name: profile.full_name ?? profile.email,
        email: profile.email,
        fail_existing: "0", // don't fail if customer already exists in Razorpay
      });
      customerId = customer.id;

      // Persist the customer ID on the profile
      await supabase
        .from("profiles")
        .update({ razorpay_customer_id: customerId })
        .eq("id", userId);
    } catch (err) {
      console.error("Failed to create Razorpay customer:", err);
      return res.status(500).json({
        error: "Failed to create payment customer",
        code: "CUSTOMER_CREATION_FAILED",
      });
    }
  }

  // Create a Razorpay subscription
  try {
    const planConfig = PLANS[plan];
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env[`RAZORPAY_PLAN_ID_${plan.toUpperCase()}`] ?? "",
      customer_notify: 1,
      total_count: plan === "yearly" ? 1 : 12, // 12 monthly cycles or 1 yearly
      quantity: 1,
      notes: {
        user_id: userId,
        plan,
      },
    });

    return res.status(201).json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      amount: planConfig.amount,
      currency: "INR",
    });
  } catch (err: unknown) {
    console.error("Failed to create Razorpay subscription:", err);
    return res.status(500).json({
      error: "Failed to create subscription",
      code: "SUBSCRIPTION_CREATION_FAILED",
    });
  }
});

export default router;
