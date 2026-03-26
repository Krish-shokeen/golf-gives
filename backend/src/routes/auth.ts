import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { sendConfirmationEmail } from "../lib/email";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body as {
    email?: string;
    password?: string;
    full_name?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "email and password are required", code: "MISSING_FIELDS" });
  }

  // Create auth user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (authError) {
    // Duplicate email surfaces as a specific Supabase error
    if (
      authError.message.toLowerCase().includes("already registered") ||
      authError.message.toLowerCase().includes("already exists") ||
      authError.message.toLowerCase().includes("duplicate")
    ) {
      return res
        .status(409)
        .json({ error: "Email is already registered", code: "EMAIL_ALREADY_EXISTS" });
    }
    return res.status(400).json({ error: authError.message, code: "REGISTRATION_FAILED" });
  }

  const userId = authData.user.id;

  // Insert profile row
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: full_name ?? null,
  });

  if (profileError) {
    // Roll back the auth user to keep state consistent
    await supabase.auth.admin.deleteUser(userId);
    return res
      .status(500)
      .json({ error: "Failed to create user profile", code: "PROFILE_CREATION_FAILED" });
  }

  // Send confirmation email (non-blocking — don't fail registration if email fails)
  try {
    await sendConfirmationEmail(email, full_name ?? email);
  } catch {
    // Log but don't surface to client
    console.error("Failed to send confirmation email for", email);
  }

  return res.status(201).json({ message: "Registration successful. Please check your email." });
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "email and password are required", code: "MISSING_FIELDS" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res
      .status(401)
      .json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
  }

  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

export default router;
