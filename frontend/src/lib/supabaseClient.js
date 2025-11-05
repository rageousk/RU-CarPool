// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug once at boot (you can remove later)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 10 chars):', supabaseAnonKey?.substring(0, 10));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // keep session in storage
    autoRefreshToken: true,     // refresh in background
    detectSessionInUrl: false,  // we'll manually handle hashes once on boot
    storageKey: 'sb-ru-carpool-auth', // namespaced
  },
});

// Expose for quick console checks (dev only)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  console.log('✅ Supabase client exposed to window.supabase (for console use)');
}