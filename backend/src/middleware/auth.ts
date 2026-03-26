import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Validates the Supabase JWT from the Authorization header.
 * Attaches user id, email, and role to req.user.
 * Returns 401 if the token is missing, invalid, or expired.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header", code: "UNAUTHORIZED" });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session token", code: "INVALID_TOKEN" });
    return;
  }

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  req.user = {
    id: data.user.id,
    email: data.user.email ?? "",
    role: profile?.role ?? "subscriber",
  };

  next();
}

/**
 * Requires the authenticated user to have the 'admin' role.
 * Must be used after requireAuth.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required", code: "FORBIDDEN" });
    return;
  }
  next();
}

/**
 * Requires the authenticated user to have an active subscription.
 * Must be used after requireAuth.
 * Returns 403 with a redirect hint to /subscribe if the subscription is not active.
 * Requirements: 2.5, 2.9
 */
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { supabase } = await import("../lib/supabase");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription || subscription.status !== "active") {
    res.status(403).json({
      error: "An active subscription is required to access this feature",
      code: "SUBSCRIPTION_REQUIRED",
      redirectTo: "/subscribe",
    });
    return;
  }

  next();
}
