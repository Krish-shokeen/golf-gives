/**
 * Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 * Verifies Razorpay webhook signature and handles subscription lifecycle events.
 * Requirements: 2.3, 2.4, 2.6, 2.7, 2.8
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabase";
import {
  sendSubscriptionEmail,
  sendWinnerAlertEmail,
} from "../lib/email";

const router = Router();

/**
 * Verify the Razorpay webhook signature.
 * Razorpay signs the raw body with HMAC-SHA256 using the webhook secret.
 */
function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * POST /api/webhooks/razorpay
 * Handles Razorpay webhook events for subscription lifecycle management.
 */
router.post(
  "/razorpay",
  // Use raw body for signature verification — express.json() must NOT have parsed this yet.
  // The route is registered before express.json() middleware in index.ts.
  async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

    if (!signature) {
      return res.status(400).json({ error: "Missing webhook signature", code: "MISSING_SIGNATURE" });
    }

    // req.body is a Buffer when express.raw() is used for this route
    const rawBody: Buffer = req.body as Buffer;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: "Invalid webhook signature", code: "INVALID_SIGNATURE" });
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as WebhookPayload;
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload", code: "INVALID_PAYLOAD" });
    }

    const event = payload.event;

    try {
      switch (event) {
        case "payment.captured":
          await handlePaymentCaptured(payload);
          break;
        case "payment.failed":
          await handlePaymentFailed(payload);
          break;
        case "subscription.cancelled":
          await handleSubscriptionCancelled(payload);
          break;
        case "subscription.charged":
          await handleSubscriptionCharged(payload);
          break;
        default:
          // Acknowledge unhandled events without error
          break;
      }
    } catch (err) {
      console.error(`Error handling Razorpay event ${event}:`, err);
      return res.status(500).json({ error: "Internal error processing webhook", code: "HANDLER_ERROR" });
    }

    return res.status(200).json({ received: true });
  }
);

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * payment.captured — activate the subscription.
 * Requirements: 2.3
 */
async function handlePaymentCaptured(payload: WebhookPayload): Promise<void> {
  const subscriptionId = payload.payload?.subscription?.entity?.id
    ?? payload.payload?.payment?.entity?.subscription_id;

  if (!subscriptionId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .single();

  if (!sub) return;

  await supabase
    .from("subscriptions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", sub.id);
}

/**
 * payment.failed — mark subscription as past_due and notify user.
 * Requirements: 2.4
 */
async function handlePaymentFailed(payload: WebhookPayload): Promise<void> {
  const subscriptionId =
    payload.payload?.payment?.entity?.subscription_id
    ?? payload.payload?.subscription?.entity?.id;

  if (!subscriptionId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .single();

  if (!sub) return;

  await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("id", sub.id);

  // Notify the user
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", sub.user_id)
    .single();

  if (profile?.email) {
    await sendSubscriptionEmail(profile.email, "renewal_failed").catch(console.error);
  }
}

/**
 * subscription.cancelled — mark subscription as cancelled or lapsed.
 * Requirements: 2.6, 2.7
 */
async function handleSubscriptionCancelled(payload: WebhookPayload): Promise<void> {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  const entity = payload.payload?.subscription?.entity;
  // Razorpay sends 'cancelled' for explicit cancellations and 'expired' for lapsed
  const newStatus = entity?.status === "expired" ? "lapsed" : "cancelled";

  await supabase
    .from("subscriptions")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("razorpay_subscription_id", subscriptionId);
}

/**
 * subscription.charged — renewal succeeded; update period end and notify user.
 * Requirements: 2.8
 */
async function handleSubscriptionCharged(payload: WebhookPayload): Promise<void> {
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  if (!subscriptionId) return;

  const entity = payload.payload?.subscription?.entity;
  const currentEnd = entity?.current_end
    ? new Date(entity.current_end * 1000).toISOString()
    : null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .single();

  if (!sub) return;

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      ...(currentEnd ? { current_period_end: currentEnd } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  // Notify the user of successful renewal
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", sub.user_id)
    .single();

  if (profile?.email) {
    await sendSubscriptionEmail(profile.email, "renewal_success").catch(console.error);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RazorpayEntity {
  id?: string;
  status?: string;
  subscription_id?: string;
  current_end?: number;
}

interface WebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    subscription?: { entity?: RazorpayEntity };
  };
}

export default router;
