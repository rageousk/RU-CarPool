import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}
if (!serviceRole) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set — admin writes will fail behind RLS.');
}

// Public (anon) client — for normal auth calls
export const supabaseAnon = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Admin (service role) client — bypasses RLS; **server-only**
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// User authenticated client
export const createSupabaseUser = async (access_token, refresh_token) => {
  const supabaseUser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabaseUser.auth.setSession({
    access_token, refresh_token
  });
  return { supabaseUser, data, error };
}