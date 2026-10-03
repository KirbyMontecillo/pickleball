import { createClient } from '@supabase/supabase-js';
console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL);
export const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')}@pickleball-queue.app`;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Placeholders keep the app from crashing when keys are missing; App shows a helpful message instead.
export const supabase = createClient(url || 'http://localhost', key || 'missing');