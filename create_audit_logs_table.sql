-- Script para criar a tabela audit_logs no Supabase
-- Execute este SQL no Editor SQL do Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    record JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política permissiva para permitir todas as operações com a anon key
CREATE POLICY "Allow all operations on audit_logs"
    ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
