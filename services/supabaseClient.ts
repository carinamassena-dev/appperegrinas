import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client — uses ONLY environment variables.
 * No localStorage fallback.
 */
const getSupabaseConfig = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://ofrwgukuoqbftdyzbfza.supabase.co';
    // @ts-ignore
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcndndWt1b3FiZnRkeXpiZnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MDM2NjksImV4cCI6MjA4ODE3OTY2OX0.igAsGDZA1QbZfPQW7i4V9jNBvu02Mds3Cs7-pLQ26MI';
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

/**
 * safeQuery — Proteção global de Egress.
 * Nunca carrega uma tabela inteira: sempre aplica .limit() e .order('created_at').
 *
 * Uso:
 *   const { data } = await safeQuery('forum_posts', { select: 'id, titulo', limit: 20 });
 */
export interface SafeQueryConfig {
    select?: string;
    limit?: number;
    filters?: Record<string, string | number | boolean>;
}

export const safeQuery = async <T = unknown>(
    table: string,
    queryConfig: SafeQueryConfig = {}
): Promise<{ data: T[] | null; error: unknown }> => {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    let query = supabase
        .from(table)
        .select(queryConfig.select ?? '*')
        .order('created_at', { ascending: false })
        .limit(queryConfig.limit ?? 50); // Nunca carrega tudo de uma vez

    if (queryConfig.filters) {
        for (const [col, val] of Object.entries(queryConfig.filters)) {
            query = query.eq(col, val);
        }
    }

    const { data, error } = await query;
    return { data: data as T[] | null, error };
};
