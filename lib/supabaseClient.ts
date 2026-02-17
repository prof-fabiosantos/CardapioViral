import { createClient } from '@supabase/supabase-js';

declare const process: any;

// As variáveis de ambiente serão injetadas pelo Vite (ver vite.config.ts)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL ou Key não encontradas. Verifique suas variáveis de ambiente.');
}

// Use fallback values to prevent the app from crashing completely if config is missing.
// This allows the UI to render (and show auth errors) instead of a white screen.
const validUrl = supabaseUrl && supabaseUrl.length > 0 ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey && supabaseAnonKey.length > 0 ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(validUrl, validKey);