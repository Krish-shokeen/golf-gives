/**
 * Charity API Routes
 * GET    /api/charities          — paginated list with optional search and filter
 * GET    /api/charities/:id      — individual charity profile with events
 * POST   /api/admin/charities    — create charity (admin only)
 * PUT    /api/admin/charities/:id — update charity (admin only)
 * DELETE /api/admin/charities/:id — delete charity (admin only)
 * PUT    /api/profile/charity    — update subscriber's charity selection and contribution %
 * Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 9.6, 9.7
 */

import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, requireAdmin, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// ─── Public / Subscriber Routes ──────────────────────────────────────────────

/**
 * GET /api/charities
 * Returns a paginated list of charities with optional search and filter.
 * Query params: search (string), featured (boolean), page (number), limit (number)
 * Requirements: 6.5
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const { search, featured, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from("charities")
    .select("id, name, description, image_url, is_featured, created_at", { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + limitNum - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (featured === "true") {
    query = query.eq("is_featured", true);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: "Failed to fetch charities", code: "FETCH_FAILED" });
  }

  return res.status(200).json({
    charities: data ?? [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    },
  });
});

/**
 * GET /api/charities/:id
 * Returns an individual charity profile including its upcoming events.
 * Requirements: 6.6
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: charity, error } = await supabase
    .from("charities")
    .select("id, name, description, image_url, is_featured, created_at")
    .eq("id", id)
    .single();

  if (error || !charity) {
    return res.status(404).json({ error: "Charity not found", code: "NOT_FOUND" });
  }

  const { data: events } = await supabase
    .from("charity_events")
    .select("id, title, event_date, description")
    .eq("charity_id", id)
    .order("event_date", { ascending: true });

  return res.status(200).json({ charity, events: events ?? [] });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/admin/charities
 * Creates a new charity listing. Admin only.
 * Requirements: 9.6
 */
router.post("/admin", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, image_url, is_featured } = req.body as {
    name?: string;
    description?: string;
    image_url?: string;
    is_featured?: boolean;
  };

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required", code: "MISSING_FIELDS" });
  }

  const { data, error } = await supabase
    .from("charities")
    .insert({
      name: name.trim(),
      description: description ?? null,
      image_url: image_url ?? null,
      is_featured: is_featured ?? false,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to create charity", code: "INSERT_FAILED" });
  }

  return res.status(201).json({ charity: data });
});

/**
 * PUT /api/admin/charities/:id
 * Updates an existing charity. Admin only.
 * Requirements: 9.7
 */
router.put("/admin/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, image_url, is_featured } = req.body as {
    name?: string;
    description?: string;
    image_url?: string;
    is_featured?: boolean;
  };

  const { data: existing, error: fetchError } = await supabase
    .from("charities")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: "Charity not found", code: "NOT_FOUND" });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (image_url !== undefined) updates.image_url = image_url;
  if (is_featured !== undefined) updates.is_featured = is_featured;

  const { data, error } = await supabase
    .from("charities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update charity", code: "UPDATE_FAILED" });
  }

  return res.status(200).json({ charity: data });
});

/**
 * DELETE /api/admin/charities/:id
 * Deletes a charity listing. Admin only.
 * Requirements: 9.6, 9.7
 */
router.delete("/admin/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: existing, error: fetchError } = await supabase
    .from("charities")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: "Charity not found", code: "NOT_FOUND" });
  }

  const { error } = await supabase.from("charities").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: "Failed to delete charity", code: "DELETE_FAILED" });
  }

  return res.status(200).json({ message: "Charity deleted successfully" });
});

export default router;
