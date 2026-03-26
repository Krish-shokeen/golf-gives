/**
 * Winner Verification Routes
 *
 * POST /api/winners/:id/proof
 *   — authenticated subscriber uploads proof screenshot to Supabase Storage,
 *     stores URL in draw_winners.proof_url, sets verification_status to pending_review
 *   Requirements: 7.1, 7.2
 *
 * PUT  /api/admin/winners/:id/verify
 *   — admin approves or rejects; on approval sets payment_status to pending;
 *     on rejection sends notification email
 *   Requirements: 7.3, 7.4, 7.5, 7.6
 *
 * PUT  /api/admin/winners/:id/payout
 *   — admin sets payment_status to paid
 *   Requirements: 7.5
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import {
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth";
import {
  applyVerificationEvent,
  applyPaymentEvent,
} from "../lib/winner-verification";
import { sendWinnerRejectionEmail } from "../lib/email";

// ─── Subscriber routes ────────────────────────────────────────────────────────

export const winnersRouter = Router();

winnersRouter.use(requireAuth);

/**
 * POST /api/winners/:id/proof
 * Body: { fileBase64: string, fileName: string, mimeType: string }
 *
 * Uploads the proof image to Supabase Storage (bucket: "winner-proofs"),
 * stores the public URL in draw_winners.proof_url, and advances
 * verification_status from pending_proof → pending_review.
 * Requirements: 7.1, 7.2
 */
winnersRouter.post("/:id/proof", async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { fileBase64, fileName, mimeType } = req.body as {
    fileBase64?: string;
    fileName?: string;
    mimeType?: string;
  };

  if (!fileBase64 || !fileName || !mimeType) {
    return res.status(400).json({
      error: "fileBase64, fileName, and mimeType are required",
      code: "MISSING_FIELDS",
    });
  }

  // Fetch the winner record and verify ownership
  const { data: winner, error: fetchError } = await supabase
    .from("draw_winners")
    .select("id, user_id, verification_status")
    .eq("id", id)
    .single();

  if (fetchError || !winner) {
    return res.status(404).json({ error: "Winner record not found", code: "NOT_FOUND" });
  }

  if (winner.user_id !== userId) {
    return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
  }

  // Validate state transition
  const nextStatus = applyVerificationEvent(winner.verification_status, "proof_submitted");
  if (!nextStatus) {
    return res.status(409).json({
      error: `Cannot submit proof from status '${winner.verification_status}'`,
      code: "INVALID_TRANSITION",
    });
  }

  // Decode base64 and upload to Supabase Storage
  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(fileBase64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 file data", code: "INVALID_FILE" });
  }

  const storagePath = `proofs/${id}/${Date.now()}_${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("winner-proofs")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return res.status(500).json({
      error: "Failed to upload proof file",
      code: "UPLOAD_FAILED",
    });
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("winner-proofs")
    .getPublicUrl(storagePath);

  const proofUrl = urlData.publicUrl;

  // Update the winner record
  const { data: updated, error: updateError } = await supabase
    .from("draw_winners")
    .update({
      proof_url: proofUrl,
      verification_status: nextStatus,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update winner record",
      code: "UPDATE_FAILED",
    });
  }

  return res.status(200).json({ winner: updated });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

export const adminWinnersRouter = Router();

adminWinnersRouter.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/winners
 * Returns all draw winners with user and draw info.
 * Requirements: 9.8
 */
adminWinnersRouter.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data: winners, error } = await supabase
    .from("draw_winners")
    .select("id, draw_id, user_id, match_tier, prize_amount, verification_status, payment_status, proof_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch winners", code: "FETCH_FAILED" });
  }

  if (!winners || winners.length === 0) {
    return res.status(200).json({ winners: [] });
  }

  // Enrich with user and draw info
  const userIds = [...new Set(winners.map((w: { user_id: string }) => w.user_id))];
  const drawIds = [...new Set(winners.map((w: { draw_id: string }) => w.draw_id))];

  const [profilesResult, drawsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").in("id", userIds),
    supabase.from("draws").select("id, month").in("id", drawIds),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p: { id: string; full_name: string | null; email: string }) => [
      p.id,
      { name: p.full_name, email: p.email },
    ])
  );
  const drawMap = new Map(
    (drawsResult.data ?? []).map((d: { id: string; month: string }) => [d.id, d.month])
  );

  const enriched = winners.map((w: {
    id: string;
    draw_id: string;
    user_id: string;
    match_tier: number;
    prize_amount: number;
    verification_status: string;
    payment_status: string;
    proof_url: string | null;
    created_at: string;
  }) => ({
    ...w,
    user_name: profileMap.get(w.user_id)?.name ?? null,
    user_email: profileMap.get(w.user_id)?.email ?? null,
    draw_month: drawMap.get(w.draw_id) ?? null,
  }));

  return res.status(200).json({ winners: enriched });
});

/**
 * PUT /api/admin/winners/:id/verify
 * Body: { action: "approved" | "rejected" }
 *
 * Approves or rejects a winner's proof submission.
 * On approval: sets payment_status to "pending".
 * On rejection: sends notification email and allows resubmission.
 * Requirements: 7.3, 7.4, 7.6
 */
adminWinnersRouter.put("/:id/verify", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action } = req.body as { action?: "approved" | "rejected" };

  if (action !== "approved" && action !== "rejected") {
    return res.status(400).json({
      error: "action must be 'approved' or 'rejected'",
      code: "INVALID_ACTION",
    });
  }

  // Fetch winner record with user email for notifications
  const { data: winner, error: fetchError } = await supabase
    .from("draw_winners")
    .select("id, user_id, verification_status, payment_status, prize_amount")
    .eq("id", id)
    .single();

  if (fetchError || !winner) {
    return res.status(404).json({ error: "Winner record not found", code: "NOT_FOUND" });
  }

  // Validate verification state transition
  const nextVerificationStatus = applyVerificationEvent(winner.verification_status, action);
  if (!nextVerificationStatus) {
    return res.status(409).json({
      error: `Cannot apply '${action}' from status '${winner.verification_status}'`,
      code: "INVALID_TRANSITION",
    });
  }

  // Determine new payment status
  let nextPaymentStatus = winner.payment_status;
  if (action === "approved") {
    const paymentNext = applyPaymentEvent(winner.payment_status, "approval_granted");
    if (paymentNext) {
      nextPaymentStatus = paymentNext;
    }
  }

  // Persist the update
  const { data: updated, error: updateError } = await supabase
    .from("draw_winners")
    .update({
      verification_status: nextVerificationStatus,
      payment_status: nextPaymentStatus,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update winner record",
      code: "UPDATE_FAILED",
    });
  }

  // On rejection, send notification email (fire-and-forget)
  if (action === "rejected") {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", winner.user_id)
        .single();

      if (profile?.email) {
        await sendWinnerRejectionEmail(profile.email, profile.full_name ?? "");
      }
    } catch {
      // Email failure should not block the response
    }
  }

  return res.status(200).json({ winner: updated });
});

/**
 * PUT /api/admin/winners/:id/payout
 * Marks a winner's payment as paid.
 * Requirements: 7.5
 */
adminWinnersRouter.put("/:id/payout", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: winner, error: fetchError } = await supabase
    .from("draw_winners")
    .select("id, payment_status, verification_status")
    .eq("id", id)
    .single();

  if (fetchError || !winner) {
    return res.status(404).json({ error: "Winner record not found", code: "NOT_FOUND" });
  }

  // Only approved winners can be paid out
  if (winner.verification_status !== "approved") {
    return res.status(409).json({
      error: "Winner must be approved before payout",
      code: "NOT_APPROVED",
    });
  }

  const nextPaymentStatus = applyPaymentEvent(winner.payment_status, "payout_completed");
  if (!nextPaymentStatus) {
    return res.status(409).json({
      error: `Cannot mark payout from payment status '${winner.payment_status}'`,
      code: "INVALID_TRANSITION",
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("draw_winners")
    .update({ payment_status: nextPaymentStatus })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({
      error: "Failed to update payment status",
      code: "UPDATE_FAILED",
    });
  }

  return res.status(200).json({ winner: updated });
});
