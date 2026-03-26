/**
 * Dashboard API Route
 * GET /api/dashboard — aggregated user dashboard data
 *
 * Returns:
 *   - subscription: status + current_period_end (renewal date)
 *   - scores: user's current score log (up to 5, most recent first)
 *   - charity: selected charity name + contribution percentage
 *   - draws: upcoming draws + draws entered count
 *   - winnings: total amount won + current payment status of latest win
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/dashboard
 * Returns aggregated dashboard data for the authenticated user.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Run all queries in parallel for performance
  const [
    subscriptionResult,
    scoresResult,
    profileResult,
    drawsEnteredResult,
    upcomingDrawsResult,
    winningsResult,
  ] = await Promise.all([
    // Subscription status + renewal date (Requirement 8.1)
    supabase
      .from("subscriptions")
      .select("status, plan, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Score log — up to 5, most recent first (Requirement 8.2)
    supabase
      .from("scores")
      .select("id, score, played_on, created_at")
      .eq("user_id", userId)
      .order("played_on", { ascending: false })
      .limit(5),

    // Charity selection + contribution % (Requirement 8.3)
    supabase
      .from("profiles")
      .select("charity_contribution_pct, charities(id, name, image_url, is_featured)")
      .eq("id", userId)
      .single(),

    // Draws the user has been entered in (has scores during draw month) (Requirement 8.4)
    supabase
      .from("draw_winners")
      .select("id, draw_id, match_tier, prize_amount, verification_status, payment_status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    // Upcoming draws (status = 'draft' or 'simulated', not yet published) (Requirement 8.4)
    supabase
      .from("draws")
      .select("id, month, mode, status, prize_pool_total, jackpot_carried")
      .in("status", ["draft", "simulated"])
      .order("month", { ascending: true })
      .limit(3),

    // Winnings summary — total won + latest win payment status (Requirement 8.5)
    supabase
      .from("draw_winners")
      .select("prize_amount, payment_status, verification_status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  // Handle critical errors
  if (subscriptionResult.error && subscriptionResult.error.code !== "PGRST116") {
    return res.status(500).json({ error: "Failed to fetch subscription data", code: "FETCH_FAILED" });
  }
  if (scoresResult.error) {
    return res.status(500).json({ error: "Failed to fetch scores", code: "FETCH_FAILED" });
  }
  if (profileResult.error) {
    return res.status(500).json({ error: "Failed to fetch profile data", code: "FETCH_FAILED" });
  }

  // Build subscription summary (Requirement 8.1)
  const subscription = subscriptionResult.data
    ? {
        status: subscriptionResult.data.status,
        plan: subscriptionResult.data.plan,
        renewalDate: subscriptionResult.data.current_period_end ?? null,
      }
    : { status: "inactive", plan: null, renewalDate: null };

  // Build scores list (Requirement 8.2)
  const scores = scoresResult.data ?? [];

  // Build charity summary (Requirement 8.3)
  const profile = profileResult.data;
  type CharityRow = { id: string; name: string; image_url: string | null; is_featured: boolean };
  const rawCharity = profile?.charities as CharityRow | CharityRow[] | null | undefined;
  const charityData: CharityRow | null = Array.isArray(rawCharity)
    ? (rawCharity[0] ?? null)
    : (rawCharity ?? null);
  const charity = charityData
    ? {
        id: charityData.id,
        name: charityData.name,
        imageUrl: charityData.image_url,
        contributionPct: profile?.charity_contribution_pct ?? 10,
      }
    : { id: null, name: null, imageUrl: null, contributionPct: profile?.charity_contribution_pct ?? 10 };

  // Build draws summary (Requirement 8.4)
  const allWinnerRecords = drawsEnteredResult.data ?? [];
  const upcomingDraws = upcomingDrawsResult.data ?? [];
  const draws = {
    drawsEntered: allWinnerRecords.length,
    upcomingDraws: upcomingDraws.map((d) => ({
      id: d.id,
      month: d.month,
      mode: d.mode,
      status: d.status,
      prizePoolTotal: d.prize_pool_total,
      jackpotCarried: d.jackpot_carried,
    })),
  };

  // Build winnings summary (Requirement 8.5)
  const winnerRecords = winningsResult.data ?? [];
  const totalWon = winnerRecords.reduce((sum, w) => sum + Number(w.prize_amount), 0);
  const latestWin = winnerRecords[0] ?? null;
  const winnings = {
    totalWon,
    latestPaymentStatus: latestWin?.payment_status ?? null,
    latestVerificationStatus: latestWin?.verification_status ?? null,
    winCount: winnerRecords.length,
  };

  return res.status(200).json({
    subscription,
    scores,
    charity,
    draws,
    winnings,
  });
});

export default router;
