/**
 * Draw Engine Module
 * Core logic for monthly draw execution and match tier calculation.
 * Requirements: 4.2, 4.3
 */

const DRAW_SIZE = 5;
const MIN_SCORE = 1;
const MAX_SCORE = 45;

/**
 * Returns 5 unique random integers from the valid score range (1–45).
 * Requirements: 4.2
 */
export function runRandomDraw(): number[] {
  const pool = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => i + MIN_SCORE);
  const drawn: number[] = [];

  for (let i = 0; i < DRAW_SIZE; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    drawn.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return drawn;
}

/**
 * Returns 5 numbers weighted by frequency in subscriber scores.
 * Numbers that appear more frequently in allScores are more likely to be drawn.
 * Falls back to random selection for numbers not present in allScores.
 * Requirements: 4.2
 */
export function runAlgorithmicDraw(allScores: number[]): number[] {
  // Build frequency map for scores in valid range
  const freq = new Map<number, number>();
  for (let n = MIN_SCORE; n <= MAX_SCORE; n++) {
    freq.set(n, 0);
  }
  for (const s of allScores) {
    if (s >= MIN_SCORE && s <= MAX_SCORE) {
      freq.set(s, (freq.get(s) ?? 0) + 1);
    }
  }

  // Build weighted pool: each number appears (freq + 1) times to ensure all numbers are eligible
  const weightedPool: number[] = [];
  for (const [num, count] of freq.entries()) {
    const weight = count + 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(num);
    }
  }

  // Draw 5 unique numbers from the weighted pool
  const drawn = new Set<number>();
  const remaining = [...weightedPool];

  while (drawn.size < DRAW_SIZE && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    drawn.add(remaining[idx]);
    // Remove all occurrences of this number from remaining pool
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i] === remaining[idx]) {
        remaining.splice(i, 1);
      }
    }
  }

  return Array.from(drawn);
}

/**
 * Calculates the match tier for a subscriber given drawn numbers and their scores.
 * Returns 3, 4, or 5 if the subscriber matches that many numbers, or null if fewer than 3.
 * Requirements: 4.3
 */
export function calculateMatchTier(
  drawnNumbers: number[],
  userScores: number[]
): number | null {
  const drawnSet = new Set(drawnNumbers);
  const userSet = new Set(userScores);

  let matchCount = 0;
  for (const score of userSet) {
    if (drawnSet.has(score)) {
      matchCount++;
    }
  }

  if (matchCount >= 3) return matchCount > 5 ? 5 : matchCount;
  return null;
}
