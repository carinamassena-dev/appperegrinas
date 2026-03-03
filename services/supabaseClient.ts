import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client — uses ONLY environment variables.
 * No localStorage fallback.
 */
const getSupabaseConfig = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    // @ts-ignore
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    return { url, key };
};

const config = getSupabaseConfig();

export let supabase = (config.url && config.key)
    ? createClient(config.url, config.key)
    : null as any;

export const refreshSupabaseClient = (url: string, key: string) => {
    console.log("[Supabase] Atualizando cliente...", url ? "URL presente" : "URL ausente");
    if (!url || !key) {
        supabase = null;
        return null;
    }
    supabase = createClient(url, key);
    return supabase;
};
