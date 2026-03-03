-- ==========================================
-- Migration: Controle de Presenças (Check-in)
-- ==========================================

-- 1. Criar a tabela de presenças
CREATE TABLE IF NOT EXISTS public.presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_discipula TEXT NOT NULL,
    id_lider TEXT NOT NULL,
    data_presenca DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para performance nas buscas por líder, discípula e data
CREATE INDEX IF NOT EXISTS idx_presencas_lider ON public.presencas(id_lider);
CREATE INDEX IF NOT EXISTS idx_presencas_discipula ON public.presencas(id_discipula);
CREATE INDEX IF NOT EXISTS idx_presencas_data ON public.presencas(data_presenca);

-- 3. Habilitar Segurança em Nível de Linha (RLS)
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de Acesso
-- Permitir leitura para todos os usuários autenticados (ou ajustar conforme necessidade de cada app)
CREATE POLICY "Permitir SELECT para usuários autenticados na tabela presencas" 
ON public.presencas FOR SELECT 
USING (auth.role() = 'authenticated');

-- Permitir inserção para todos os usuários autenticados
CREATE POLICY "Permitir INSERT para usuários autenticados na tabela presencas" 
ON public.presencas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Permitir exclusão/atualização se necessário (opcional)
CREATE POLICY "Permitir DELETE para usuários autenticados na tabela presencas"
ON public.presencas FOR DELETE
USING (auth.role() = 'authenticated');
