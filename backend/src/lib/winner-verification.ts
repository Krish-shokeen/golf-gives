/**
 * Winner Verification State Machine
 * Encodes valid states and allowed transitions for draw winner verification and payment.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

export type VerificationStatus =
  | "pending_proof"
  | "pending_review"
  | "approved"
  | "rejected";

export type PaymentStatus = "unpaid" | "pending" | "paid";

export type VerificationEvent =
  | "proof_submitted"   // subscriber uploads proof → pending_review
  | "approved"          // admin approves → approved (payment → pending)
  | "rejected";         // admin rejects → rejected

export type PaymentEvent =
  | "approval_granted"  // verification approved → payment pending
  | "payout_completed"; // admin marks paid → paid

/** All valid verification statuses */
export const VALID_VERIFICATION_STATUSES: VerificationStatus[] = [
  "pending_proof",
  "pending_review",
  "approved",
  "rejected",
];

/** All valid payment statuses */
export const VALID_PAYMENT_STATUSES: PaymentStatus[] = [
  "unpaid",
  "pending",
  "paid",
];

/**
 * Allowed verification transitions:
 * pending_proof   → pending_review (proof_submitted)
 * pending_review  → approved | rejected
 * approved        → terminal
 * rejected        → pending_review (allow resubmission per Req 7.6)
 */
export const ALLOWED_VERIFICATION_TRANSITIONS: Record<
  VerificationStatus,
  VerificationStatus[]
> = {
  pending_proof:   ["pending_review"],
  pending_review:  ["approved", "rejected"],
  approved:        [],
  rejected:        ["pending_review"], // allow resubmission
};

/**
 * Allowed payment transitions:
 * unpaid  → pending (on approval)
 * pending → paid    (on payout)
 * paid    → terminal
 */
export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid:  ["pending"],
  pending: ["paid"],
  paid:    [],
};

/**
 * Apply a verification event to the current verification status.
 * Returns the new status, or null if the transition is not allowed.
 */
export function applyVerificationEvent(
  current: VerificationStatus,
  event: VerificationEvent
): VerificationStatus | null {
  const next = VERIFICATION_EVENT_MAP[event];
  if (!next) return null;
  if (!ALLOWED_VERIFICATION_TRANSITIONS[current].includes(next)) return null;
  return next;
}

/**
 * Apply a payment event to the current payment status.
 * Returns the new status, or null if the transition is not allowed.
 */
export function applyPaymentEvent(
  current: PaymentStatus,
  event: PaymentEvent
): PaymentStatus | null {
  const next = PAYMENT_EVENT_MAP[event];
  if (!next) return null;
  if (!ALLOWED_PAYMENT_TRANSITIONS[current].includes(next)) return null;
  return next;
}

const VERIFICATION_EVENT_MAP: Record<VerificationEvent, VerificationStatus> = {
  proof_submitted: "pending_review",
  approved:        "approved",
  rejected:        "rejected",
};

const PAYMENT_EVENT_MAP: Record<PaymentEvent, PaymentStatus> = {
  approval_granted: "pending",
  payout_completed: "paid",
};
