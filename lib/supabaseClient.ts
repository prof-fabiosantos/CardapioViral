import { createClient } from '@supabase/supabase-js';

declare const process: any;

// As variáveis de ambiente serão injetadas pelo Vite (ver vite.config.ts)
// Se a injeção falhar ou estiver vazia, usamos uma string vazia como fallback inicial.
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

// Verifica se os valores existem e não são vazios
const hasUrl = typeof envUrl === 'string' && envUrl.trim().length > 0;
const hasKey = typeof envKey === 'string' && envKey.trim().length > 0;

if (!hasUrl || !hasKey) {
  console.warn('⚠️ Supabase URL ou Key não encontradas. Usando modo offline/placeholder.');
}

// Fallback values para evitar crash do createClient (que lança erro se URL for vazia)
// 'https://placeholder.supabase.co' é uma URL sintaticamente válida que permite o app carregar.
const validUrl = hasUrl ? envUrl : 'https://placeholder.supabase.co';
const validKey = hasKey ? envKey : 'placeholder-key';

export const supabase = createClient(validUrl, validKey);