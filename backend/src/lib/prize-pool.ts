/**
 * Prize Pool Module
 * Core logic for prize pool calculation, distribution, and jackpot rollover.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

export interface PrizePool {
  tier5: number; // 5-Number Match (40% + any carried jackpot)
  tier4: number; // 4-Number Match (35%)
  tier3: number; // 3-Number Match (25%)
  total: number; // total prize pool before tier split
}

const TIER5_PCT = 0.40;
const TIER4_PCT = 0.35;
const TIER3_PCT = 0.25;

/**
 * Calculates the prize pool for a draw month.
 * - Base pool = activeSubscriberCount * monthlyFee
 * - tier5 receives 40% of base pool plus any carried jackpot
 * - tier4 receives 35% of base pool
 * - tier3 receives 25% of base pool
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function calculatePrizePool(
  activeSubscriberCount: number,
  monthlyFee: number,
  jackpotCarried: number
): PrizePool {
  const base = activeSubscriberCount * monthlyFee;
  const tier5 = base * TIER5_PCT + jackpotCarried;
  const tier4 = base * TIER4_PCT;
  const tier3 = base * TIER3_PCT;
  return { tier5, tier4, tier3, total: base };
}

/**
 * Distributes a tier's prize pool equally among all winners.
 * Returns the per-winner share.
 * Requirements: 5.5
 */
export function distributePrizes(tierAmount: number, winnerCount: number): number {
  if (winnerCount <= 0) return 0;
  return tierAmount / winnerCount;
}

/**
 * Determines the jackpot amount to carry forward to the next draw.
 * - If there was no tier-5 winner, carry the full tier5 amount forward.
 * - If there was a winner, carry 0.
 * Requirements: 4.7, 5.6
 */
export function rolloverJackpot(currentPool: PrizePool, hasWinner: boolean): number {
  return hasWinner ? 0 : currentPool.tier5;
}
