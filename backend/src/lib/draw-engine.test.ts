/**
 * Tests for Draw Engine Module
 * Feature: golf-charity-platform
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { runRandomDraw, runAlgorithmicDraw, calculateMatchTier } from "./draw-engine";

// Arbitrary: 5 unique integers from 1–45 (drawn numbers)
const drawnNumbersArb = fc
  .uniqueArray(fc.integer({ min: 1, max: 45 }), { minLength: 5, maxLength: 5 });

// Arbitrary: array of 0–5 valid scores (user score log)
const userScoresArb = fc.uniqueArray(fc.integer({ min: 1, max: 45 }), {
  minLength: 0,
  maxLength: 5,
});

describe("Draw Engine Module", () => {
  describe("runRandomDraw", () => {
    it("returns exactly 5 numbers", () => {
      expect(runRandomDraw()).toHaveLength(5);
    });

    it("all numbers are in range 1–45", () => {
      const drawn = runRandomDraw();
      for (const n of drawn) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    });

    it("all numbers are unique", () => {
      const drawn = runRandomDraw();
      expect(new Set(drawn).size).toBe(5);
    });
  });

  describe("runAlgorithmicDraw", () => {
    it("returns exactly 5 numbers", () => {
      expect(runAlgorithmicDraw([10, 20, 30])).toHaveLength(5);
    });

    it("all numbers are in range 1–45", () => {
      const drawn = runAlgorithmicDraw([5, 15, 25, 35, 45]);
      for (const n of drawn) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
    });

    it("all numbers are unique", () => {
      const drawn = runAlgorithmicDraw([1, 2, 3, 4, 5]);
      expect(new Set(drawn).size).toBe(5);
    });

    it("works with empty score list", () => {
      const drawn = runAlgorithmicDraw([]);
      expect(drawn).toHaveLength(5);
      expect(new Set(drawn).size).toBe(5);
    });
  });

  describe("Property 12: Draw match tier correctness", () => {
    /**
     * Feature: golf-charity-platform, Property 12: Draw match tier correctness
     * Validates: Requirements 4.3
     *
     * For any set of 5 drawn numbers and any subscriber's score log, the match tier
     * assigned to that subscriber should equal the count of their scores that appear
     * in the drawn numbers, and the tier should only be recorded if the count is 3, 4, or 5.
     */
    it("match tier equals the count of user scores in drawn numbers, or null if < 3", () => {
      fc.assert(
        fc.property(drawnNumbersArb, userScoresArb, (drawnNumbers, userScores) => {
          const tier = calculateMatchTier(drawnNumbers, userScores);

          const drawnSet = new Set(drawnNumbers);
          const uniqueUserScores = [...new Set(userScores)];
          const matchCount = uniqueUserScores.filter((s) => drawnSet.has(s)).length;

          if (matchCount >= 3) {
            expect(tier).toBe(matchCount);
          } else {
            expect(tier).toBeNull();
          }
        }),
        { numRuns: 100 }
      );
    });

    it("tier is always 3, 4, 5, or null — never any other value", () => {
      fc.assert(
        fc.property(drawnNumbersArb, userScoresArb, (drawnNumbers, userScores) => {
          const tier = calculateMatchTier(drawnNumbers, userScores);
          expect([3, 4, 5, null]).toContain(tier);
        }),
        { numRuns: 100 }
      );
    });
  });
});
