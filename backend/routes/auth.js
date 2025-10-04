// backend/routes/auth.js
import { Router } from 'express';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase.js';

const router = Router();

/**
 * POST /api/auth/signup
 * body: { email, password, first_name?, last_name?, phone?, is_driver? }
 * - Creates auth user (anon client)
 * - Mirrors row in public.users with service role (bypasses RLS)
 */
router.post('/signup', async (req, res) => {
  const { email, password, first_name, last_name, phone, is_driver } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  // 1) Create auth user
  const { data: authData, error: authErr } = await supabaseAnon.auth.signUp({ email, password });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const userId = authData.user?.id;
  // 2) Upsert into public.users with service role (bypasses RLS)
  if (userId) {
    const upsertBody = {
      id: userId,
      email,
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      phone: phone ?? null,
      is_driver: typeof is_driver === 'boolean' ? is_driver : false,
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert(upsertBody, { onConflict: 'id' }); // avoid unique violations

    if (upsertErr) {
      // If email is unique and already exists, try updating that row to match id (rare race)
      if (upsertErr.code === '23505') {
        const { error: fixErr } = await supabaseAdmin
          .from('users')
          .update(upsertBody)
          .eq('email', email);

        if (fixErr) return res.status(500).json({ error: fixErr.message });
      } else {
        return res.status(500).json({ error: upsertErr.message });
      }
    }
  }

  return res.status(201).json({
    message: 'Signup successful. Check your email for verification.',
    user: authData.user,
  });
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

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

export default router;