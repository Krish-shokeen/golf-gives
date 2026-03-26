/**
 * Admin Draw API Routes
 * POST /api/admin/draws/simulate — run draw in preview mode (no persistence)
 * POST /api/admin/draws/publish  — persist draw, calculate winners, trigger emails
 * Requirements: 4.4, 4.5, 4.6, 4.7
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "../middleware/auth";
import { runRandomDraw, runAlgorithmicDraw, calculateMatchTier } from "../lib/draw-engine";
import { calculatePrizePool, distributePrizes, rolloverJackpot } from "../lib/prize-pool";

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/draws/list
 * Returns all draws ordered by month descending.
 * Requirements: 9.4, 9.5
 */
router.get("/list", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase
    .from("draws")
    .select("id, month, mode, drawn_numbers, status, prize_pool_total, jackpot_carried, published_at, created_at")
    .order("month", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch draws", code: "FETCH_FAILED" });
  }

  return res.status(200).json({ draws: data ?? [] });
});

interface DrawRequestBody {
  month: string;          // ISO date string for first day of draw month e.g. "2024-06-01"
  mode: "random" | "algorithmic";
  monthlyFee: number;
}

/**
 * POST /api/admin/draws/simulate
 * Runs the draw engine in preview mode — returns results without persisting anything.
 * Requirements: 4.4, 4.5
 */
router.post("/simulate", async (req: AuthenticatedRequest, res: Response) => {
  const { month, mode, monthlyFee } = req.body as DrawRequestBody;

  if (!month || !mode || !monthlyFee) {
    return res.status(400).json({
      error: "month, mode, and monthlyFee are required",
      code: "MISSING_FIELDS",
    });
  }

  if (mode !== "random" && mode !== "algorithmic") {
    return res.status(400).json({
      error: "mode must be 'random' or 'algorithmic'",
      code: "INVALID_MODE",
    });
  }

  // Fetch active subscriber count
  const { count: activeCount, error: subError } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (subError) {
    return res.status(500).json({ error: "Failed to fetch subscriber count", code: "FETCH_FAILED" });
  }

  // Fetch most recent carried jackpot (from last published draw)
  const { data: lastDraw } = await supabase
    .from("draws")
    .select("jackpot_carried")
    .eq("status", "published")
    .order("month", { ascending: false })
    .limit(1)
    .single();

  const jackpotCarried = lastDraw?.jackpot_carried ?? 0;
  const subscriberCount = activeCount ?? 0;

  // Fetch all subscriber scores for algorithmic mode
  let allScores: number[] = [];
  if (mode === "algorithmic") {
    const { data: scores } = await supabase
      .from("scores")
      .select("score")
      .in(
        "user_id",
        (
          await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("status", "active")
        ).data?.map((s: { user_id: string }) => s.user_id) ?? []
      );
    allScores = scores?.map((s: { score: number }) => s.score) ?? [];
  }

  const drawnNumbers =
    mode === "random" ? runRandomDraw() : runAlgorithmicDraw(allScores);

  const prizePool = calculatePrizePool(subscriberCount, monthlyFee, jackpotCarried);

  return res.status(200).json({
    preview: true,
    month,
    mode,
    drawnNumbers,
    prizePool,
    subscriberCount,
    jackpotCarried,
  });
});

/**
 * POST /api/admin/draws/publish
 * Persists the draw, calculates winners, handles jackpot rollover, triggers email notifications.
 * Requirements: 4.4, 4.6, 4.7
 */
router.post("/publish", async (req: AuthenticatedRequest, res: Response) => {
  const { month, mode, monthlyFee } = req.body as DrawRequestBody;

  if (!month || !mode || !monthlyFee) {
    return res.status(400).json({
      error: "month, mode, and monthlyFee are required",
      code: "MISSING_FIELDS",
    });
  }

  if (mode !== "random" && mode !== "algorithmic") {
    return res.status(400).json({
      error: "mode must be 'random' or 'algorithmic'",
      code: "INVALID_MODE",
    });
  }

  // Prevent duplicate published draws for the same month
  const { data: existing } = await supabase
    .from("draws")
    .select("id")
    .eq("month", month)
    .eq("status", "published")
    .single();

  if (existing) {
    return res.status(409).json({
      error: "A published draw already exists for this month",
      code: "DUPLICATE_DRAW",
    });
  }

  // Fetch active subscribers
  const { data: activeSubs, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active");

  if (subError) {
    return res.status(500).json({ error: "Failed to fetch subscribers", code: "FETCH_FAILED" });
  }

  const subscriberIds = activeSubs?.map((s: { user_id: string }) => s.user_id) ?? [];
  const subscriberCount = subscriberIds.length;

  // Fetch most recent carried jackpot
  const { data: lastDraw } = await supabase
    .from("draws")
    .select("jackpot_carried")
    .eq("status", "published")
    .order("month", { ascending: false })
    .limit(1)
    .single();

  const jackpotCarried = lastDraw?.jackpot_carried ?? 0;

  // Fetch all subscriber scores for algorithmic mode
  let allScores: number[] = [];
  if (mode === "algorithmic" && subscriberIds.length > 0) {
    const { data: scores } = await supabase
      .from("scores")
      .select("score")
      .in("user_id", subscriberIds);
    allScores = scores?.map((s: { score: number }) => s.score) ?? [];
  }

  const drawnNumbers =
    mode === "random" ? runRandomDraw() : runAlgorithmicDraw(allScores);

  const prizePool = calculatePrizePool(subscriberCount, monthlyFee, jackpotCarried);

  // Persist the draw record
  const { data: draw, error: drawError } = await supabase
    .from("draws")
    .insert({
      month,
      mode,
      drawn_numbers: drawnNumbers,
      status: "published",
      prize_pool_total: prizePool.total,
      jackpot_carried: jackpotCarried,
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (drawError || !draw) {
    return res.status(500).json({ error: "Failed to persist draw", code: "INSERT_FAILED" });
  }

  // Calculate winners for each active subscriber
  const winners: Array<{ user_id: string; match_tier: number; prize_amount: number }> = [];

  if (subscriberIds.length > 0) {
    const { data: allUserScores } = await supabase
      .from("scores")
      .select("user_id, score")
      .in("user_id", subscriberIds);

    // Group scores by user
    const scoresByUser = new Map<string, number[]>();
    for (const row of allUserScores ?? []) {
      const existing = scoresByUser.get(row.user_id) ?? [];
      existing.push(row.score);
      scoresByUser.set(row.user_id, existing);
    }

    // Determine tier for each subscriber
    const tierWinners: Record<number, string[]> = { 3: [], 4: [], 5: [] };
    for (const userId of subscriberIds) {
      const userScores = scoresByUser.get(userId) ?? [];
      const tier = calculateMatchTier(drawnNumbers, userScores);
      if (tier !== null) {
        tierWinners[tier].push(userId);
      }
    }

    // Calculate per-winner prize amounts
    const tierPools: Record<number, number> = {
      3: prizePool.tier3,
      4: prizePool.tier4,
      5: prizePool.tier5,
    };

    for (const tier of [3, 4, 5] as const) {
      const tierUsers = tierWinners[tier];
      if (tierUsers.length === 0) continue;
      const share = distributePrizes(tierPools[tier], tierUsers.length);
      for (const userId of tierUsers) {
        winners.push({ user_id: userId, match_tier: tier, prize_amount: share });
      }
    }
  }

  // Persist winner records
  if (winners.length > 0) {
    await supabase.from("draw_winners").insert(
      winners.map((w) => ({
        draw_id: draw.id,
        user_id: w.user_id,
        match_tier: w.match_tier,
        prize_amount: w.prize_amount,
        verification_status: "pending_proof",
        payment_status: "unpaid",
      }))
    );
  }

  // Jackpot rollover: if no tier-5 winner, carry tier5 to next draw
  const hasTier5Winner = winners.some((w) => w.match_tier === 5);
  const nextJackpot = rolloverJackpot(prizePool, hasTier5Winner);

  // Update the draw record with the next jackpot amount (stored for reference)
  // The actual carry is read by the next draw from the last published draw's jackpot_carried
  // We store the rollover amount as a separate field by updating the record
  if (!hasTier5Winner) {
    await supabase
      .from("draws")
      .update({ jackpot_carried: nextJackpot })
      .eq("id", draw.id);
  }

  // Trigger draw result emails (fire-and-forget)
  try {
    const { sendDrawResultsEmail } = await import("../lib/email");
    await sendDrawResultsEmail(subscriberIds, draw.id);
  } catch {
    // Email failures should not block the response
  }

  return res.status(201).json({
    draw,
    winners,
    prizePool,
    jackpotRolledOver: !hasTier5Winner,
    nextJackpot,
  });
});

export default router;
