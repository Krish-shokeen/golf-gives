/**
 * Property tests for the subscription state machine.
 * Feature: golf-charity-platform, Property 9: Subscription state machine validity
 * Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  VALID_STATUSES,
  ALLOWED_TRANSITIONS,
  applyEvent,
  SubscriptionStatus,
  SubscriptionEvent,
} from "./subscription-state-machine";

const ALL_EVENTS: SubscriptionEvent[] = [
  "payment_captured",
  "payment_failed",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_charged",
];

const statusArb = fc.constantFrom(...VALID_STATUSES);
const eventArb = fc.constantFrom(...ALL_EVENTS);

describe("Property 9: Subscription state machine validity", () => {
  /**
   * Property 9a: Status is always one of the valid states.
   * For any starting status and any event, the resulting status (if a transition occurs)
   * must be one of the four valid states.
   * Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7
   */
  it("resulting status is always a valid state", () => {
    fc.assert(
      fc.property(statusArb, eventArb, (status, event) => {
        const next = applyEvent(status, event);
        if (next !== null) {
          expect(VALID_STATUSES).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9b: Transitions only occur in the defined directions.
   * For any starting status and event, if a transition is produced it must be
   * in the ALLOWED_TRANSITIONS set for that starting status.
   * Validates: Requirements 2.3, 2.4, 2.6, 2.7
   */
  it("transitions only occur in allowed directions", () => {
    fc.assert(
      fc.property(statusArb, eventArb, (status, event) => {
        const next = applyEvent(status, event);
        if (next !== null) {
          expect(ALLOWED_TRANSITIONS[status]).toContain(next);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9c: Terminal states (cancelled, lapsed) produce no further transitions.
   * Validates: Requirements 2.6, 2.7
   */
  it("terminal states produce no further transitions", () => {
    const terminalStatuses: SubscriptionStatus[] = ["cancelled", "lapsed"];
    fc.assert(
      fc.property(fc.constantFrom(...terminalStatuses), eventArb, (status, event) => {
        const next = applyEvent(status, event);
        expect(next).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9d: active → past_due only via payment_failed.
   * Validates: Requirements 2.4
   */
  it("active transitions to past_due only on payment_failed", () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const next = applyEvent("active", event);
        if (next === "past_due") {
          expect(event).toBe("payment_failed");
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9e: past_due → lapsed only via subscription_expired.
   * Validates: Requirements 2.7
   */
  it("past_due transitions to lapsed only on subscription_expired", () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const next = applyEvent("past_due", event);
        if (next === "lapsed") {
          expect(event).toBe("subscription_expired");
        }
      }),
      { numRuns: 100 }
    );
  });
});
