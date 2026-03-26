/**
 * Donation API Routes
 * POST /api/donations — create a Razorpay order for one-off donation to a charity
 * Requirements: 6.4
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { razorpay } from "../lib/razorpay";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * POST /api/donations
 * Creates a Razorpay order for a one-off donation to a charity.
 * Returns { orderId, keyId, amount, currency } for client-side Razorpay checkout.
 * Requirements: 6.4
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { charity_id, amount } = req.body as { charity_id?: string; amount?: number };

  if (!charity_id || typeof charity_id !== "string") {
    return res.status(400).json({ error: "charity_id is required", code: "MISSING_FIELDS" });
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({
      error: "amount must be a positive number",
      code: "INVALID_AMOUNT",
    });
  }

  // Verify charity exists
  const { data: charity, error: charityError } = await supabase
    .from("charities")
    .select("id, name")
    .eq("id", charity_id)
    .single();

  if (charityError || !charity) {
    return res.status(404).json({ error: "Charity not found", code: "CHARITY_NOT_FOUND" });
  }

  // Create a Razorpay order (one-time payment)
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `donation_${userId}_${Date.now()}`,
      notes: {
        user_id: userId,
        charity_id,
        charity_name: charity.name,
        type: "donation",
      },
    });

    // Pre-create a donation record with pending status
    const { data: donation, error: insertError } = await supabase
      .from("donations")
      .insert({
        user_id: userId,
        charity_id,
        amount,
        razorpay_payment_id: null, // will be updated via webhook
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: "Failed to create donation record", code: "INSERT_FAILED" });
    }

    return res.status(201).json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      donationId: donation.id,
    });
  } catch (err: unknown) {
    console.error("Failed to create Razorpay order:", err);
    return res.status(500).json({
      error: "Failed to create donation order",
      code: "ORDER_CREATION_FAILED",
    });
  }
});

export default router;
