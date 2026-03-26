/**
 * Subscription State Machine
 * Encodes the valid states and allowed transitions for a subscription.
 * Requirements: 2.3, 2.4, 2.5, 2.6, 2.7
 */

export type SubscriptionStatus = "active" | "cancelled" | "lapsed" | "past_due";

export type SubscriptionEvent =
  | "payment_captured"   // payment.captured  → active
  | "payment_failed"     // payment.failed    → past_due
  | "subscription_cancelled" // subscription.cancelled → cancelled
  | "subscription_expired"   // subscription expired   → lapsed
  | "subscription_charged";  // subscription.charged   → active (renewal)

/** All valid subscription statuses */
export const VALID_STATUSES: SubscriptionStatus[] = [
  "active",
  "cancelled",
  "lapsed",
  "past_due",
];

/**
 * Allowed transitions: from status → set of reachable statuses via events.
 * active     → past_due (payment_failed), cancelled (subscription_cancelled)
 * past_due   → active (payment_captured / subscription_charged), lapsed (subscription_expired)
 * cancelled  → terminal (no further transitions)
 * lapsed     → terminal (no further transitions)
 */
export const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  active:    ["past_due", "cancelled", "active"], // active→active via renewal
  past_due:  ["active", "lapsed"],
  cancelled: [],
  lapsed:    [],
};

/**
 * Apply a webhook event to the current subscription status.
 * Returns the new status, or null if the transition is not allowed.
 */
export function applyEvent(
  current: SubscriptionStatus,
  event: SubscriptionEvent
): SubscriptionStatus | null {
  const next = EVENT_TRANSITIONS[event];
  if (!next) return null;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) return null;
  return next;
}

const EVENT_TRANSITIONS: Record<SubscriptionEvent, SubscriptionStatus> = {
  payment_captured:        "active",
  payment_failed:          "past_due",
  subscription_cancelled:  "cancelled",
  subscription_expired:    "lapsed",
  subscription_charged:    "active",
};
