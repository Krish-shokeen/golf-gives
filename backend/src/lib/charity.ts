/**
 * Charity Contribution Logic
 * Core validation and calculation functions for charity contributions.
 * Requirements: 6.1, 6.2, 6.3
 */

export const MIN_CONTRIBUTION_PCT = 10;
export const MAX_CONTRIBUTION_PCT = 100;

export interface ContributionValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validates a charity contribution percentage.
 * Must be an integer between 10 and 100 inclusive.
 * Requirements: 6.2
 */
export function validateContributionPct(pct: number): ContributionValidationResult {
  if (!Number.isFinite(pct)) {
    return { valid: false, error: "Contribution percentage must be a finite number", code: "INVALID_TYPE" };
  }

  if (pct < MIN_CONTRIBUTION_PCT) {
    return {
      valid: false,
      error: `Charity contribution must be at least ${MIN_CONTRIBUTION_PCT}%`,
      code: "CONTRIBUTION_TOO_LOW",
    };
  }

  if (pct > MAX_CONTRIBUTION_PCT) {
    return {
      valid: false,
      error: `Charity contribution cannot exceed ${MAX_CONTRIBUTION_PCT}%`,
      code: "CONTRIBUTION_TOO_HIGH",
    };
  }

  return { valid: true };
}

/**
 * Calculates the charity contribution amount from a subscription fee.
 * Requirements: 6.2
 */
export function calculateContributionAmount(subscriptionFee: number, contributionPct: number): number {
  return (subscriptionFee * contributionPct) / 100;
}
