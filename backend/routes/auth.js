// backend/routes/auth.js
import { Router } from 'express';
import { supabaseAnon, supabaseAdmin, createSupabaseUser } from '../lib/supabase.js';

const router = Router();

/**
 * POST /api/auth/signup
 * body: { email, password, first_name?, last_name?, phone?, is_driver? }
 * - Creates auth user
 * - Mirrors row in public.users with service role (bypass RLS)
 */
router.post('/signup', async (req, res) => {
  const { email, password, first_name, last_name, phone, is_driver } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data: authData, error: authErr } = await supabaseAnon.auth.signUp({ email, password });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const userId = authData.user?.id;

  if (userId) {
    const body = {
      id: userId,
      email,
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      phone: phone ?? null,
      is_driver: typeof is_driver === 'boolean' ? is_driver : false,
    };
    const { error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert(body, { onConflict: 'id' });

    if (upsertErr) {
      if (upsertErr.code === '23505') {
        // email exists, try align row by email
        const { error: fixErr } = await supabaseAdmin.from('users').update(body).eq('email', email);
        if (fixErr) return res.status(500).json({ error: fixErr.message });
      } else {
        return res.status(500).json({ error: upsertErr.message });
      }
    }
  }

  return res.status(201).json({
    message: 'Signup successful. Please verify your email before logging in.',
    user: authData.user,
  });
});

/**
 * POST /api/auth/login
 * body: { email, password }
 * - Blocks unverified users with clear 401 message (Issue #2)
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  // Supabase returns a user object; if email not verified, email_confirmed_at is null
  if (!data.user?.email_confirmed_at) {
    return res.status(401).json({ error: 'Please verify your email before logging in.' });
  }

  return res.json({ session: data.session, user: data.user });
});

/**
 * POST /api/auth/magic-link
 * body: { email, redirectTo? }
 */
router.post('/magic-link', async (req, res) => {
  const { email, redirectTo } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { error } = await supabaseAnon.auth.signInWithOtp({
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});

/**
 * POST /api/auth/forgot
 * body: { email, redirectTo }
 */
router.post('/forgot', async (req, res) => {
  const { email, redirectTo } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || process.env.SUPABASE_REDIRECT_URL || undefined,
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});

/**
 * POST /api/auth/reset-password
 * body: { access_token, refresh_token, password }
 */
router.post('/reset-password', async (req, res) => {
  const { access_token, refresh_token, password } = req.body || {};
  if (!access_token) return res.status(400).json({ error: 'access_token is required' });
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });

  const { supabaseUser, error: supabaseError } = await createSupabaseUser(access_token, refresh_token);
  if (supabaseError) return res.status(400).json({ error: supabaseError.message });

  const { error } = await supabaseUser.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ ok: true });
});

export default router;