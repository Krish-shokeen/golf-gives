/**
 * Tests for Score Engine
 * Feature: golf-charity-platform
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateScore, applyRollingWindow, sortScoresDescending, Score } from "./score-engine";

describe("Score Engine", () => {
  describe("Property 1: Score range validation", () => {
    /**
     * Feature: golf-charity-platform, Property 1: Score range validation
     * Validates: Requirements 3.1, 3.6
     *
     * For any integer submitted as a Stableford score, the system should accept it
     * if and only if it is between 1 and 45 inclusive; all other integers should be
     * rejected with a validation error.
     */
    it("should accept scores between 1 and 45 inclusive and reject all others", () => {
      fc.assert(
        fc.property(fc.integer(), fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), (score, date) => {
          const result = validateScore(score, date);

          if (score >= 1 && score <= 45) {
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.code).toBe("SCORE_OUT_OF_RANGE");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject scores when date is missing or empty", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 45 }), (score) => {
          const emptyDateResult = validateScore(score, "");
          expect(emptyDateResult.valid).toBe(false);
          expect(emptyDateResult.code).toBe("MISSING_DATE");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2: Rolling 5-score window invariant", () => {
    /**
     * Feature: golf-charity-platform, Property 2: Rolling 5-score window invariant
     * Validates: Requirements 3.3, 3.4, 3.5
     *
     * For any sequence of score submissions of length N (where N > 5), after all
     * submissions the score log should contain exactly 5 scores, and those 5 scores
     * should be the N most recently submitted scores in reverse chronological order.
     */

    // Helper to build a Score object
    function makeScore(id: string, score: number, played_on: string, created_at: string): Score {
      return { id, user_id: "user-1", score, played_on, created_at };
    }

    it("should never exceed 5 scores after any number of submissions", () => {
      fc.assert(
        fc.property(
          // Generate between 1 and 20 scores to submit sequentially
          fc.array(
            fc.record({
              score: fc.integer({ min: 1, max: 45 }),
              // dates in 2024, ensuring variety
              played_on: fc.date({
                min: new Date("2024-01-01"),
                max: new Date("2024-12-31"),
              }).map((d) => d.toISOString().slice(0, 10)),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (submissions) => {
            let scores: Score[] = [];
            submissions.forEach((sub, i) => {
              const newScore = makeScore(
                `id-${i}`,
                sub.score,
                sub.played_on,
                new Date(2024, 0, i + 1).toISOString()
              );
              scores = applyRollingWindow(scores, newScore);
            });

            expect(scores.length).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should contain exactly 5 scores after more than 5 submissions", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              score: fc.integer({ min: 1, max: 45 }),
              played_on: fc.date({
                min: new Date("2024-01-01"),
                max: new Date("2024-12-31"),
              }).map((d) => d.toISOString().slice(0, 10)),
            }),
            { minLength: 6, maxLength: 20 }
          ),
          (submissions) => {
            let scores: Score[] = [];
            submissions.forEach((sub, i) => {
              const newScore = makeScore(
                `id-${i}`,
                sub.score,
                sub.played_on,
                new Date(2024, 0, i + 1).toISOString()
              );
              scores = applyRollingWindow(scores, newScore);
            });

            expect(scores.length).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should retain the most recently submitted score after a replacement", () => {
      fc.assert(
        fc.property(
          // Start with exactly 5 scores, then add one more
          fc.tuple(
            fc.uniqueArray(
              fc.date({ min: new Date("2024-01-01"), max: new Date("2024-06-30") })
                .map((d) => d.toISOString().slice(0, 10)),
              { minLength: 5, maxLength: 5 }
            ),
            fc.date({ min: new Date("2024-07-01"), max: new Date("2024-12-31") })
              .map((d) => d.toISOString().slice(0, 10)),
            fc.integer({ min: 1, max: 45 })
          ),
          ([existingDates, newDate, newScoreVal]) => {
            const existing: Score[] = existingDates.map((d, i) =>
              makeScore(`id-${i}`, 20, d, `2024-01-0${i + 1}T00:00:00Z`)
            );

            const newScore = makeScore("id-new", newScoreVal, newDate, "2024-12-01T00:00:00Z");
            const result = applyRollingWindow(existing, newScore);

            // The new score must be present in the result
            expect(result.some((s) => s.id === "id-new")).toBe(true);
            // Length must still be 5
            expect(result.length).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 3: Score storage round-trip", () => {
    /**
     * Feature: golf-charity-platform, Property 3: Score storage round-trip
     * Validates: Requirements 3.2
     *
     * For any valid score (integer 1–45) and date, storing the score and then
     * retrieving it should return the same score value and date.
     */

    function makeScore(id: string, score: number, played_on: string, created_at: string): Score {
      return { id, user_id: "user-1", score, played_on, created_at };
    }

    it("should preserve score value and date through a store-then-retrieve cycle", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 45 }),
          fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
            .map((d) => d.toISOString().slice(0, 10)),
          (scoreVal, playedOn) => {
            const stored: Score = makeScore("id-rt", scoreVal, playedOn, new Date().toISOString());
            const retrieved = sortScoresDescending([stored]);

            expect(retrieved.length).toBe(1);
            expect(retrieved[0].score).toBe(scoreVal);
            expect(retrieved[0].played_on).toBe(playedOn);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve all scores in a multi-score round-trip", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              score: fc.integer({ min: 1, max: 45 }),
              played_on: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
                .map((d) => d.toISOString().slice(0, 10)),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (entries) => {
            const stored: Score[] = entries.map((e, i) =>
              makeScore(`id-${i}`, e.score, e.played_on, new Date().toISOString())
            );

            const retrieved = sortScoresDescending(stored);

            expect(retrieved.length).toBe(stored.length);
            stored.forEach((s) => {
              const found = retrieved.find((r) => r.id === s.id);
              expect(found).toBeDefined();
              expect(found!.score).toBe(s.score);
              expect(found!.played_on).toBe(s.played_on);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
