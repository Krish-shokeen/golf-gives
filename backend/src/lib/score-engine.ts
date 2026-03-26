/**
 * Score Engine
 * Core logic for Stableford score validation, rolling window management, and sorting.
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7
 */

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string; // ISO date string e.g. "2024-06-01"
  created_at?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

const MIN_SCORE = 1;
const MAX_SCORE = 45;
const MAX_SCORES = 5;

/**
 * Validates a Stableford score and date.
 * - Score must be an integer between 1 and 45 inclusive (Requirements 3.1, 3.6)
 * - Date must be present (Requirement 3.7)
 */
export function validateScore(score: number, date: string): ValidationResult {
  if (!date || date.trim() === "") {
    return { valid: false, error: "Date is required", code: "MISSING_DATE" };
  }

  if (!Number.isInteger(score)) {
    return {
      valid: false,
      error: "Score must be an integer",
      code: "INVALID_SCORE_TYPE",
    };
  }

  if (score < MIN_SCORE || score > MAX_SCORE) {
    return {
      valid: false,
      error: `Score must be between ${MIN_SCORE} and ${MAX_SCORE} inclusive`,
      code: "SCORE_OUT_OF_RANGE",
    };
  }

  return { valid: true };
}

/**
 * Applies the rolling 5-score window rule.
 * - If fewer than 5 scores exist, appends the new score.
 * - If 5 scores already exist, replaces the oldest score with the new one.
 * Returns the updated score array (always max 5 entries).
 * Requirements: 3.3, 3.4, 3.5
 */
export function applyRollingWindow(scores: Score[], newScore: Score): Score[] {
  if (scores.length < MAX_SCORES) {
    return [...scores, newScore];
  }

  // Find and remove the oldest score (earliest played_on, then earliest created_at as tiebreaker)
  const sorted = [...scores].sort((a, b) => {
    const dateDiff = a.played_on.localeCompare(b.played_on);
    if (dateDiff !== 0) return dateDiff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  const oldestId = sorted[0].id;
  const withoutOldest = scores.filter((s) => s.id !== oldestId);
  return [...withoutOldest, newScore];
}

/**
 * Sorts scores in reverse chronological order (most recent played_on first).
 * Requirement: 3.5
 */
export function sortScoresDescending(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => {
    const dateDiff = b.played_on.localeCompare(a.played_on);
    if (dateDiff !== 0) return dateDiff;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}
