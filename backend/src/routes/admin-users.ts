/**
 * Admin User Management Routes
 * GET  /api/admin/users         — list all users with subscription info
 * PUT  /api/admin/users/:id     — update user profile (name, role)
 * PUT  /api/admin/users/:id/subscription — update subscription status
 * Requirements: 9.1, 9.2, 9.3
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Returns all users with their latest subscription info.
 * Requirements: 9.1
 */
router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, charity_contribution_pct, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to fetch users", code: "FETCH_FAILED" });
  }

  // Fetch latest subscription per user
  const userIds = (profiles ?? []).map((p: { id: string }) => p.id);
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, status, plan, current_period_end")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  // Map latest subscription per user
  const subMap = new Map<string, { status: string; plan: string; current_period_end: string | null }>();
  for (const sub of subscriptions ?? []) {
    if (!subMap.has(sub.user_id)) {
      subMap.set(sub.user_id, {
        status: sub.status,
        plan: sub.plan,
        current_period_end: sub.current_period_end,
      });
    }
  }

  const users = (profiles ?? []).map((p: {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    charity_contribution_pct: number;
    created_at: string;
  }) => ({
    ...p,
    subscription: subMap.get(p.id) ?? null,
  }));

  return res.status(200).json({ users });
});

/**
 * PUT /api/admin/users/:id
 * Updates a user's profile (full_name, role).
 * Requirements: 9.1, 9.2
 */
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { full_name, role } = req.body as { full_name?: string; role?: string };

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: "User not found", code: "NOT_FOUND" });
  }

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) {
    if (role !== "subscriber" && role !== "admin") {
      return res.status(400).json({ error: "role must be 'subscriber' or 'admin'", code: "INVALID_ROLE" });
    }
    updates.role = role;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update user", code: "UPDATE_FAILED" });
  }

  return res.status(200).json({ user: data });
});

/**
 * PUT /api/admin/users/:id/subscription
 * Updates a user's subscription status (e.g. cancel).
 * Requirements: 9.3
 */
router.put("/:id/subscription", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  const validStatuses = ["active", "cancelled", "lapsed", "past_due"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${validStatuses.join(", ")}`,
      code: "INVALID_STATUS",
    });
  }

  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !sub) {
    return res.status(404).json({ error: "Subscription not found", code: "NOT_FOUND" });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sub.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update subscription", code: "UPDATE_FAILED" });
  }

  return res.status(200).json({ subscription: data });
});

export default router;
