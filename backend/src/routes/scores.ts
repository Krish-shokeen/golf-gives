/**
 * Score API Routes
 * POST   /api/scores        — submit a new score
 * PUT    /api/scores/:id    — update an existing score
 * GET    /api/scores        — list authenticated user's scores (descending)
 * Requirements: 3.2, 3.8
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import {
  validateScore,
  applyRollingWindow,
  sortScoresDescending,
  Score,
} from "../lib/score-engine";

const router = Router();

// All score routes require authentication
router.use(requireAuth);

// GET /api/scores — return authenticated user's scores, most recent first
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch scores", code: "FETCH_FAILED" });
  }

  return res.status(200).json({ scores: data });
});

// POST /api/scores — validate, insert, apply rolling window, return updated list
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { score, played_on } = req.body as { score?: unknown; played_on?: unknown };

  if (typeof score !== "number" || typeof played_on !== "string") {
    return res
      .status(400)
      .json({ error: "score (number) and played_on (string) are required", code: "MISSING_FIELDS" });
  }

  const validation = validateScore(score, played_on);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, code: validation.code });
  }

  // Fetch current scores to apply rolling window
  const { data: existing, error: fetchError } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: true });

  if (fetchError) {
    return res.status(500).json({ error: "Failed to fetch existing scores", code: "FETCH_FAILED" });
  }

  const currentScores: Score[] = existing ?? [];

  // If already at 5, delete the oldest before inserting
  if (currentScores.length >= 5) {
    const afterWindow = applyRollingWindow(currentScores, {
      id: "__placeholder__",
      user_id: userId,
      score,
      played_on,
    });

    // The score that was removed is the one not in afterWindow
    const removedId = currentScores.find(
      (s) => !afterWindow.some((a) => a.id === s.id)
    )?.id;

    if (removedId) {
      await supabase.from("scores").delete().eq("id", removedId);
    }
  }

  // Insert the new score
  const { data: inserted, error: insertError } = await supabase
    .from("scores")
    .insert({ user_id: userId, score, played_on })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: "Failed to save score", code: "INSERT_FAILED" });
  }

  // Return updated list sorted descending
  const { data: updated } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("played_on", { ascending: false });

  return res.status(201).json({ score: inserted, scores: updated ?? [] });
});

// PUT /api/scores/:id — validate and update an existing score
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { score, played_on } = req.body as { score?: unknown; played_on?: unknown };

  if (typeof score !== "number" || typeof played_on !== "string") {
    return res
      .status(400)
      .json({ error: "score (number) and played_on (string) are required", code: "MISSING_FIELDS" });
  }

  const validation = validateScore(score, played_on);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error, code: validation.code });
  }

  // Ensure the score belongs to the authenticated user
  const { data: existing, error: fetchError } = await supabase
    .from("scores")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: "Score not found", code: "NOT_FOUND" });
  }

  if (existing.user_id !== userId) {
    return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
  }

  const { data: updated, error: updateError } = await supabase
    .from("scores")
    .update({ score, played_on })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ error: "Failed to update score", code: "UPDATE_FAILED" });
  }

  return res.status(200).json({ score: updated });
});

export default router;
