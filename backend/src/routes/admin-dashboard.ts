/**
 * Admin Dashboard Analytics Route
 * GET /api/admin/dashboard — aggregated analytics for administrators
 *
 * Returns:
 *   - totalUsers: total registered user count
 *   - totalPrizePool: sum of all prize pools across published draws
 *   - charityContributions: total contribution amounts per charity
 *   - drawStats: draw counts by status, total winners, tier breakdown
 *
 * Requirements: 9.10
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/dashboard
 * Returns aggregated analytics data for the admin dashboard.
 * Requirements: 9.10
 */
router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const [
    totalUsersResult,
    activeSubscribersResult,
    drawStatsResult,
    publishedDrawsResult,
    winnersResult,
    charitiesResult,
    profilesResult,
  ] = await Promise.all([
    // Total registered users
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),

    // Active subscribers
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    // Draw counts by status
    supabase
      .from("draws")
      .select("status, prize_pool_total, jackpot_carried"),

    // Published draws for prize pool total
    supabase
      .from("draws")
      .select("id, month, mode, prize_pool_total, jackpot_carried, published_at")
      .eq("status", "published")
      .order("month", { ascending: false })
      .limit(12),

    // Winner records for tier breakdown and payout stats
    supabase
      .from("draw_winners")
      .select("match_tier, prize_amount, verification_status, payment_status"),

    // Charities for contribution mapping
    supabase
      .from("charities")
      .select("id, name"),

    // Profiles for charity contribution totals
    supabase
      .from("profiles")
      .select("charity_id, charity_contribution_pct"),
  ]);

  if (totalUsersResult.error) {
    return res.status(500).json({ error: "Failed to fetch user count", code: "FETCH_FAILED" });
  }

  // ── Total users ──────────────────────────────────────────────────────────────
  const totalUsers = totalUsersResult.count ?? 0;
  const activeSubscribers = activeSubscribersResult.count ?? 0;

  // ── Total prize pool (sum of all published draw prize pools) ─────────────────
  const allDraws = drawStatsResult.data ?? [];
  const totalPrizePool = allDraws.reduce(
    (sum, d) => sum + Number(d.prize_pool_total ?? 0),
    0
  );

  // Draw counts by status
  const drawCounts = allDraws.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  // ── Winner / tier stats ───────────────────────────────────────────────────────
  const winners = winnersResult.data ?? [];
  const totalWinners = winners.length;
  const totalPaidOut = winners
    .filter((w) => w.payment_status === "paid")
    .reduce((sum, w) => sum + Number(w.prize_amount ?? 0), 0);
  const totalPendingPayout = winners
    .filter((w) => w.payment_status === "pending")
    .reduce((sum, w) => sum + Number(w.prize_amount ?? 0), 0);

  const tierBreakdown = winners.reduce<Record<number, number>>((acc, w) => {
    acc[w.match_tier] = (acc[w.match_tier] ?? 0) + 1;
    return acc;
  }, {});

  const verificationBreakdown = winners.reduce<Record<string, number>>((acc, w) => {
    acc[w.verification_status] = (acc[w.verification_status] ?? 0) + 1;
    return acc;
  }, {});

  // ── Charity contribution totals ───────────────────────────────────────────────
  // Estimate: active subscribers × monthly fee × contribution pct
  // We don't store actual contribution amounts per billing cycle, so we
  // aggregate by charity: count of subscribers + average contribution pct
  const charities = charitiesResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const charityMap = new Map(charities.map((c) => [c.id, c.name]));

  const charityContributions = charities.map((charity) => {
    const subscribers = profiles.filter((p) => p.charity_id === charity.id);
    const avgPct =
      subscribers.length > 0
        ? subscribers.reduce((sum, p) => sum + (p.charity_contribution_pct ?? 10), 0) /
          subscribers.length
        : 0;
    return {
      charityId: charity.id,
      charityName: charityMap.get(charity.id) ?? "Unknown",
      subscriberCount: subscribers.length,
      averageContributionPct: Math.round(avgPct * 10) / 10,
    };
  }).sort((a, b) => b.subscriberCount - a.subscriberCount);

  // ── Recent published draws ────────────────────────────────────────────────────
  const recentDraws = (publishedDrawsResult.data ?? []).map((d) => ({
    id: d.id,
    month: d.month,
    mode: d.mode,
    prizePoolTotal: d.prize_pool_total,
    jackpotCarried: d.jackpot_carried,
    publishedAt: d.published_at,
  }));

  return res.status(200).json({
    totalUsers,
    activeSubscribers,
    totalPrizePool,
    drawStats: {
      counts: drawCounts,
      totalDraws: allDraws.length,
      recentDraws,
    },
    winnerStats: {
      totalWinners,
      totalPaidOut,
      totalPendingPayout,
      tierBreakdown,
      verificationBreakdown,
    },
    charityContributions,
  });
});

export default router;
