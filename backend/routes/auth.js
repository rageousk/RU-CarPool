// backend/routes/auth.js
import { Router } from "express";
import { supabaseAnon, supabaseAdmin, createSupabaseUser } from "../lib/supabase.js";

const router = Router();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Look up public.users by email (service role bypasses RLS) */
async function getUserByEmail(email) {
  return supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, is_driver")
    .eq("email", email)
    .maybeSingle();
}

/** Try to mirror auth user into public.users with retries to avoid FK race */
async function mirrorUserRowWithRetry({ userId, email, first_name, last_name, phone, is_driver }) {
  const body = {
    id: userId,
    email,
    first_name: first_name ?? null,
    last_name: last_name ?? null,
    phone: phone ?? null,
    is_driver: !!is_driver,
  };

  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabaseAdmin
      .from("users")
      .upsert(body, { onConflict: "id" });

    if (!error) return { ok: true };

    if (error.code === "23505") {
      // Unique violation → align by email (also updates names)
      const { error: fixErr } = await supabaseAdmin.from("users").update(body).eq("email", email);
      if (!fixErr) return { ok: true };
      // else fall through and retry
    } else if (error.code !== "23503") {
      // Not an FK race — give up early
      return { ok: false, error };
    }
    // FK race (23503): wait a little, then retry
    await sleep(500);
  }
  return { ok: false, error: { code: "23503", message: "FK still failing after retries" } };
}

/**
 * POST /api/auth/signup
 * body: { email, password, first_name?, last_name?, phone?, is_driver? }
 * - Pre-checks for existing row by email (returns 409 + friendly message)
 * - Creates auth user
 * - Mirrors row in public.users (retry on FK race), ensuring names get stored
 */
router.post("/signup", async (req, res) => {
  const { email, password, first_name, last_name, phone, is_driver } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  // 0) Strong duplicate guard: if we already have a row for this email, stop early.
  {
    const { data: existing, error: lookupErr } = await getUserByEmail(email);
    if (!lookupErr && existing) {
      // Try to resend a confirmation if they never confirmed (best-effort)
      try {
        await supabaseAnon.auth.resend({ type: "signup", email });
      } catch {
        /* ignore */
      }
      return res
        .status(409)
        .json({ error: "This email is already registered. Please log in or reset your password." });
    }
  }

  // 1) Create auth user in Supabase
  const { data: authData, error: authErr } = await supabaseAnon.auth.signUp({ email, password });
  if (authErr) {
    const msg = String(authErr.message || "").toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already exists") ||
      msg.includes("user exists") ||
      authErr.status === 400
    ) {
      return res
        .status(409)
        .json({ error: "This email is already registered. Please log in or reset your password." });
    }
    return res.status(400).json({ error: authErr.message });
  }

  const userId = authData.user?.id;
  if (!userId) {
    return res.status(500).json({ error: "No user ID returned from Supabase Auth." });
  }

  // 2) Mirror into public.users with retry (handles FK race) and store names
  const mirror = await mirrorUserRowWithRetry({
    userId,
    email,
    first_name,
    last_name,
    phone,
    is_driver,
  });

  if (!mirror.ok) {
    if (mirror.error?.code === "23503") {
      // FK race lingered; let them proceed; we’ll heal on first login
      return res.status(201).json({
        message:
          "Signup successful. Check your email to verify; your profile will be finalized on first login.",
        user: authData.user,
      });
    }
    return res.status(500).json({ error: mirror.error?.message || "Failed to mirror user row" });
  }

  return res.status(201).json({
    message: "Signup successful. Please verify your email before logging in.",
    user: authData.user,
  });
});

/** Ensure a row exists (and optionally backfill names) in public.users for a verified auth user. */
async function ensureUserRowExists({ id, email, first_name = null, last_name = null }) {
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from("users")
      .upsert({ id, email, first_name, last_name, is_driver: false }, { onConflict: "id" });
  } else if ((!existing.first_name && first_name) || (!existing.last_name && last_name)) {
    // Backfill names if missing (safe; no-op if you don’t pass names)
    await supabaseAdmin
      .from("users")
      .update({ first_name, last_name })
      .eq("id", id);
  }
}

/**
 * POST /api/auth/login
 * body: { email, password }
 * - Blocks unverified users
 * - Self-heals missing/partial public.users row after a successful, verified login
 */
router.post("/login", async (req, res) => {
  const { email, password, first_name = null, last_name = null } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: error.message || "Invalid email or password." });
  }

  if (!data.user?.email_confirmed_at) {
    return res.status(401).json({ error: "Please verify your email before logging in." });
  }

  // Self-heal: ensure row exists (and backfill names if we happen to get them)
  try {
    await ensureUserRowExists({
      id: data.user.id,
      email: data.user.email,
      first_name,
      last_name,
    });
  } catch {
    /* non-blocking */
  }

  return res.json({ session: data.session, user: data.user });
});

/** Magic link */
router.post("/magic-link", async (req, res) => {
  const { email, redirectTo } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });

  const { error } = await supabaseAnon.auth.signInWithOtp({
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});

/** Forgot password */
router.post("/forgot", async (req, res) => {
  const { email, redirectTo } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || process.env.SUPABASE_REDIRECT_URL || undefined,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});

/** Reset password */
router.post("/reset-password", async (req, res) => {
  const { access_token, refresh_token, password } = req.body || {};
  if (!access_token) return res.status(400).json({ error: "access_token is required" });
  if (!refresh_token) return res.status(400).json({ error: "refresh_token is required" });
  if (!password) return res.status(400).json({ error: "password is required" });

  const { supabaseUser, error: supabaseError } = await createSupabaseUser(access_token, refresh_token);
  if (supabaseError) return res.status(400).json({ error: supabaseError.message });

  const { error } = await supabaseUser.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ ok: true });
});

export default router;