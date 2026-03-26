/**
 * Property tests for the winner verification state machine.
 * Feature: golf-charity-platform, Property 13: Winner verification state transitions
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  VALID_VERIFICATION_STATUSES,
  VALID_PAYMENT_STATUSES,
  ALLOWED_VERIFICATION_TRANSITIONS,
  ALLOWED_PAYMENT_TRANSITIONS,
  applyVerificationEvent,
  applyPaymentEvent,
  VerificationStatus,
  PaymentStatus,
  VerificationEvent,
  PaymentEvent,
} from "./winner-verification";

const ALL_VERIFICATION_EVENTS: VerificationEvent[] = [
  "proof_submitted",
  "approved",
  "rejected",
];

const ALL_PAYMENT_EVENTS: PaymentEvent[] = [
  "approval_granted",
  "payout_completed",
];

const verificationStatusArb = fc.constantFrom(...VALID_VERIFICATION_STATUSES);
const paymentStatusArb = fc.constantFrom(...VALID_PAYMENT_STATUSES);
const verificationEventArb = fc.constantFrom(...ALL_VERIFICATION_EVENTS);
const paymentEventArb = fc.constantFrom(...ALL_PAYMENT_EVENTS);

describe("Property 13: Winner verification state transitions", () => {
  /**
   * 13a: Resulting verification_status is always a valid state.
   * For any starting verification status and any event, the resulting status
   * (if a transition occurs) must be one of the valid verification statuses.
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
   */
  it("resulting verification_status is always a valid state", () => {
    fc.assert(
      fc.property(verificationStatusArb, verificationEventArb, (status, event) => {
        const next = applyVerificationEvent(status, event);
        if (next !== null) {
          expect(VALID_VERIFICATION_STATUSES).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13b: Verification transitions only occur in allowed directions.
   * For any starting status and event, if a transition is produced it must be
   * in the ALLOWED_VERIFICATION_TRANSITIONS set for that starting status.
   * Validates: Requirements 7.1, 7.2, 7.3, 7.6
   */
  it("verification transitions only occur in allowed directions", () => {
    fc.assert(
      fc.property(verificationStatusArb, verificationEventArb, (status, event) => {
        const next = applyVerificationEvent(status, event);
        if (next !== null) {
          expect(ALLOWED_VERIFICATION_TRANSITIONS[status]).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13c: Approved is a terminal verification state (no further transitions).
   * Validates: Requirements 7.4
   */
  it("approved is a terminal verification state", () => {
    fc.assert(
      fc.property(verificationEventArb, (event) => {
        const next = applyVerificationEvent("approved", event);
        expect(next).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13d: pending_proof → pending_review only via proof_submitted.
   * Validates: Requirements 7.1, 7.2
   */
  it("pending_proof transitions to pending_review only on proof_submitted", () => {
    fc.assert(
      fc.property(verificationEventArb, (event) => {
        const next = applyVerificationEvent("pending_proof", event);
        if (next === "pending_review") {
          expect(event).toBe("proof_submitted");
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13e: pending_review → approved or rejected only.
   * Validates: Requirements 7.3, 7.6
   */
  it("pending_review only transitions to approved or rejected", () => {
    fc.assert(
      fc.property(verificationEventArb, (event) => {
        const next = applyVerificationEvent("pending_review", event);
        if (next !== null) {
          expect(["approved", "rejected"]).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13f: rejected → pending_review on proof_submitted (allows resubmission).
   * Validates: Requirements 7.6
   */
  it("rejected allows resubmission by transitioning to pending_review on proof_submitted", () => {
    const next = applyVerificationEvent("rejected", "proof_submitted");
    expect(next).toBe("pending_review");
  });

  /**
   * 13g: Resulting payment_status is always a valid state.
   * For any starting payment status and any event, the resulting status
   * (if a transition occurs) must be one of the valid payment statuses.
   * Validates: Requirements 7.4, 7.5
   */
  it("resulting payment_status is always a valid state", () => {
    fc.assert(
      fc.property(paymentStatusArb, paymentEventArb, (status, event) => {
        const next = applyPaymentEvent(status, event);
        if (next !== null) {
          expect(VALID_PAYMENT_STATUSES).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13h: Payment transitions only occur in allowed directions.
   * For any starting payment status and event, if a transition is produced it must be
   * in the ALLOWED_PAYMENT_TRANSITIONS set for that starting status.
   * Validates: Requirements 7.4, 7.5
   */
  it("payment transitions only occur in allowed directions", () => {
    fc.assert(
      fc.property(paymentStatusArb, paymentEventArb, (status, event) => {
        const next = applyPaymentEvent(status, event);
        if (next !== null) {
          expect(ALLOWED_PAYMENT_TRANSITIONS[status]).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13i: paid is a terminal payment state (no further transitions).
   * Validates: Requirements 7.5
   */
  it("paid is a terminal payment state", () => {
    fc.assert(
      fc.property(paymentEventArb, (event) => {
        const next = applyPaymentEvent("paid", event);
        expect(next).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13j: unpaid → pending only via approval_granted.
   * Validates: Requirements 7.4
   */
  it("unpaid transitions to pending only on approval_granted", () => {
    fc.assert(
      fc.property(paymentEventArb, (event) => {
        const next = applyPaymentEvent("unpaid", event);
        if (next === "pending") {
          expect(event).toBe("approval_granted");
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 13k: pending → paid only via payout_completed.
   * Validates: Requirements 7.5
   */
  it("pending transitions to paid only on payout_completed", () => {
    fc.assert(
      fc.property(paymentEventArb, (event) => {
        const next = applyPaymentEvent("pending", event);
        if (next === "paid") {
          expect(event).toBe("payout_completed");
        }
      }),
      { numRuns: 100 }
    );
  });
});
