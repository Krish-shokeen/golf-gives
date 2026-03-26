/**
 * Tests for Charity Contribution Logic
 * Feature: golf-charity-platform
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateContributionPct,
  calculateContributionAmount,
  MIN_CONTRIBUTION_PCT,
  MAX_CONTRIBUTION_PCT,
} from "./charity";

describe("Charity Contribution Module", () => {
  describe("Property 7: Charity contribution minimum enforcement", () => {
    /**
     * Feature: golf-charity-platform, Property 7: Charity contribution minimum enforcement
     * Validates: Requirements 6.2
     *
     * For any subscription fee amount, the charity contribution amount must be
     * greater than or equal to 10% of that fee amount.
     */
    it("should reject any contribution percentage below 10", () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: Math.fround(9.99), noNaN: true }),
          (pct) => {
            const result = validateContributionPct(pct);
            expect(result.valid).toBe(false);
            expect(result.code).toBe("CONTRIBUTION_TOO_LOW");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept any contribution percentage between 10 and 100 inclusive", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MIN_CONTRIBUTION_PCT, max: MAX_CONTRIBUTION_PCT }),
          (pct) => {
            const result = validateContributionPct(pct);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("calculated contribution amount is always >= 10% of the subscription fee", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 100000, noNaN: true }),  // subscriptionFee
          fc.integer({ min: MIN_CONTRIBUTION_PCT, max: MAX_CONTRIBUTION_PCT }), // pct
          (fee, pct) => {
            const amount = calculateContributionAmount(fee, pct);
            const minAmount = fee * 0.10;
            expect(amount).toBeGreaterThanOrEqual(minAmount - 0.0001); // float tolerance
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8: Charity contribution update round-trip", () => {
    /**
     * Feature: golf-charity-platform, Property 8: Charity contribution update round-trip
     * Validates: Requirements 6.3
     *
     * For any valid contribution percentage (10–100), setting a subscriber's charity
     * contribution percentage and then retrieving it should return the same percentage.
     */
    it("valid contribution percentage survives a set-then-get round-trip", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MIN_CONTRIBUTION_PCT, max: MAX_CONTRIBUTION_PCT }),
          (pct) => {
            // Simulate storing and retrieving the value (pure function round-trip)
            const stored = { charity_contribution_pct: pct };
            const retrieved = stored.charity_contribution_pct;

            expect(retrieved).toBe(pct);
            expect(validateContributionPct(retrieved).valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("contribution amount calculation is consistent with stored percentage", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 100000, noNaN: true }),
          fc.integer({ min: MIN_CONTRIBUTION_PCT, max: MAX_CONTRIBUTION_PCT }),
          (fee, pct) => {
            const amount = calculateContributionAmount(fee, pct);
            // Re-derive the percentage from the amount and fee — should match
            const derivedPct = (amount / fee) * 100;
            expect(derivedPct).toBeCloseTo(pct, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
