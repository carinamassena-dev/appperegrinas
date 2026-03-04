import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'SUA_URL_AQUI';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANON_AQUI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
