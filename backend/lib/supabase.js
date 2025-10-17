// backend/lib/supabase.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}
if (!serviceRole) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set — admin writes/reads behind RLS will fail.');
}

// Public client (for normal auth calls)
export const supabaseAnon = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Admin client (server-only; bypasses RLS)
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Make a user-scoped client from tokens (used for password reset flow)
export async function createSupabaseUser(access_token, refresh_token) {
  const supabaseUser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabaseUser.auth.setSession({
    access_token,
    refresh_token,
  });
  return { supabaseUser, data, error };
}