/**
 * Profile API Routes
 * PUT /api/profile/charity — update charity selection and contribution percentage
 * Requirements: 6.1, 6.2, 6.3
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * PUT /api/profile/charity
 * Updates the authenticated user's charity selection and contribution percentage.
 * Enforces minimum 10% contribution.
 * Requirements: 6.1, 6.2, 6.3
 */
router.put("/charity", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { charity_id, charity_contribution_pct } = req.body as {
    charity_id?: string;
    charity_contribution_pct?: number;
  };

  // Validate contribution percentage if provided
  if (charity_contribution_pct !== undefined) {
    if (typeof charity_contribution_pct !== "number") {
      return res.status(400).json({
        error: "charity_contribution_pct must be a number",
        code: "INVALID_TYPE",
      });
    }

    if (charity_contribution_pct < 10 || charity_contribution_pct > 100) {
      return res.status(400).json({
        error: "charity_contribution_pct must be between 10 and 100",
        code: "CONTRIBUTION_OUT_OF_RANGE",
      });
    }
  }

  // Validate charity exists if charity_id is provided
  if (charity_id !== undefined && charity_id !== null) {
    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .select("id")
      .eq("id", charity_id)
      .single();

    if (charityError || !charity) {
      return res.status(404).json({ error: "Charity not found", code: "CHARITY_NOT_FOUND" });
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (charity_id !== undefined) updates.charity_id = charity_id;
  if (charity_contribution_pct !== undefined) updates.charity_contribution_pct = charity_contribution_pct;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: "At least one of charity_id or charity_contribution_pct must be provided",
      code: "MISSING_FIELDS",
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, charity_id, charity_contribution_pct")
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update charity settings", code: "UPDATE_FAILED" });
  }

  return res.status(200).json({ profile: data });
});

export default router;
