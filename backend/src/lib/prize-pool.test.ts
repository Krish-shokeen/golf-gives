/**
 * Tests for Prize Pool Module
 * Feature: golf-charity-platform
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculatePrizePool, distributePrizes, rolloverJackpot } from "./prize-pool";

describe("Prize Pool Module", () => {
  describe("Property 4: Prize pool allocation invariant", () => {
    /**
     * Feature: golf-charity-platform, Property 4: Prize pool allocation invariant
     * Validates: Requirements 5.1, 5.2, 5.3, 5.4
     *
     * For any total prize pool amount, the sum of the three tier allocations
     * (40% + 35% + 25%) must equal the total prize pool amount, and each tier
     * must receive exactly its specified percentage.
     */
    it("tier allocations should sum to the base pool and match exact percentages", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),   // activeSubscriberCount
          fc.float({ min: 1, max: 500, noNaN: true }), // monthlyFee
          fc.float({ min: 0, max: 10000, noNaN: true }), // jackpotCarried
          (subscribers, fee, carried) => {
            const pool = calculatePrizePool(subscribers, fee, carried);
            const base = subscribers * fee;

            // Each tier must match its exact percentage of the base pool
            expect(pool.tier4).toBeCloseTo(base * 0.35, 5);
            expect(pool.tier3).toBeCloseTo(base * 0.25, 5);
            // tier5 includes the carried jackpot on top of 40%
            expect(pool.tier5).toBeCloseTo(base * 0.40 + carried, 5);

            // The three tiers (excluding carried jackpot) must sum to the base pool
            const tierSumWithoutCarried = pool.tier5 - carried + pool.tier4 + pool.tier3;
            expect(tierSumWithoutCarried).toBeCloseTo(base, 5);

            // total must equal the base pool
            expect(pool.total).toBeCloseTo(base, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5: Equal prize split among multiple winners", () => {
    /**
     * Feature: golf-charity-platform, Property 5: Equal prize split among multiple winners
     * Validates: Requirements 5.5
     *
     * For any tier prize amount and any number of winners N (N >= 1), each winner's
     * prize share must equal tier_amount / N, and the sum of all shares must equal
     * the tier_amount.
     */
    it("each winner receives an equal share and shares sum to the tier amount", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 100000, noNaN: true }), // tierAmount
          fc.integer({ min: 1, max: 1000 }),               // winnerCount
          (tierAmount, winnerCount) => {
            const share = distributePrizes(tierAmount, winnerCount);
            const expectedShare = tierAmount / winnerCount;

            expect(share).toBeCloseTo(expectedShare, 5);

            // Sum of all shares must equal the tier amount
            const totalPaid = share * winnerCount;
            expect(totalPaid).toBeCloseTo(tierAmount, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 6: Jackpot rollover accumulation", () => {
    /**
     * Feature: golf-charity-platform, Property 6: Jackpot rollover accumulation
     * Validates: Requirements 4.7, 5.6
     *
     * For any sequence of monthly draws where no 5-Number Match winner exists,
     * the 5-Number Match pool for month M should equal the sum of all unclaimed
     * 5-Number Match pools from all previous months plus the current month's 40%
     * allocation.
     */
    it("jackpot accumulates correctly across consecutive no-winner draws", () => {
      fc.assert(
        fc.property(
          // Generate 2–10 consecutive months of draw data
          fc.array(
            fc.record({
              subscribers: fc.integer({ min: 1, max: 5000 }),
              fee: fc.float({ min: 1, max: 100, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (months) => {
            let carried = 0;
            let expectedAccumulated = 0;

            for (const { subscribers, fee } of months) {
              const pool = calculatePrizePool(subscribers, fee, carried);
              const base = subscribers * fee;
              const currentTier5Base = base * 0.40;

              // Expected tier5 = all previously unclaimed + this month's 40%
              expectedAccumulated += currentTier5Base;
              expect(pool.tier5).toBeCloseTo(expectedAccumulated, 5);

              // No winner — roll the full tier5 forward
              carried = rolloverJackpot(pool, false);
              expect(carried).toBeCloseTo(pool.tier5, 5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("jackpot resets to zero when there is a winner", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5000 }),
          fc.float({ min: 1, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 50000, noNaN: true }),
          (subscribers, fee, carried) => {
            const pool = calculatePrizePool(subscribers, fee, carried);
            const rollover = rolloverJackpot(pool, true);
            expect(rollover).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
