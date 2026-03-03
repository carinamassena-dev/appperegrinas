-- Este script corrige as políticas RLS do Supabase Storage para permitir 
-- upload de arquivos (Avatares, Tickets, Confidencial) pelo frontend da aplicação.

-- 1. Garanta que os buckets existam e sejam públicos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('certificados', 'certificados', true),
  ('tickets', 'tickets', true),
  ('one-on-one', 'one-on-one', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpar políticas antigas se existirem (Evita erro "already exists")
DROP POLICY IF EXISTS "Public Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Certificados" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Tickets" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload One On One" ON storage.objects;

DROP POLICY IF EXISTS "Public Select Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Certificados" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Tickets" ON storage.objects;
DROP POLICY IF EXISTS "Public Select One On One" ON storage.objects;

DROP POLICY IF EXISTS "Public Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Certificados" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Tickets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update One On One" ON storage.objects;

-- 3. Permitir Uploads (INSERT) para usuários anônimos e autenticados
CREATE POLICY "Public Upload Avatars" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public Upload Certificados" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'certificados');
CREATE POLICY "Public Upload Tickets" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'tickets');
CREATE POLICY "Public Upload One On One" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'one-on-one');

-- 4. Permitir Leitura (SELECT)
CREATE POLICY "Public Select Avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public Select Certificados" ON storage.objects FOR SELECT TO public USING (bucket_id = 'certificados');
CREATE POLICY "Public Select Tickets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tickets');
CREATE POLICY "Public Select One On One" ON storage.objects FOR SELECT TO public USING (bucket_id = 'one-on-one');

-- 5. Permitir Atualização (UPDATE) - Caso a foto seja substituída
CREATE POLICY "Public Update Avatars" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public Update Certificados" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'certificados');
CREATE POLICY "Public Update Tickets" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'tickets');
CREATE POLICY "Public Update One On One" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'one-on-one');

-- ==========================================
-- 6. PERMISSÕES DA TABELA DE INTERCESSÃO (MURAL 24H)
-- ==========================================

-- Criação da tabela (caso ainda não exista no Supabase)
CREATE TABLE IF NOT EXISTS public.intercessoes (
    id text PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    record JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.intercessoes ENABLE ROW LEVEL SECURITY;

-- Permitir Leitura (SELECT) para todos
DROP POLICY IF EXISTS "Permitir leitura pública no Mural" ON public.intercessoes;
CREATE POLICY "Permitir leitura pública no Mural" 
ON public.intercessoes FOR SELECT USING (true);

-- Permitir Escrita (INSERT) para todos
DROP POLICY IF EXISTS "Permitir escrita pública no Mural" ON public.intercessoes;
CREATE POLICY "Permitir escrita pública no Mural" 
ON public.intercessoes FOR INSERT WITH CHECK (true);

-- Permitir Atualização (UPDATE) para contagem de orações
DROP POLICY IF EXISTS "Permitir update público no Mural" ON public.intercessoes;
CREATE POLICY "Permitir update público no Mural" 
ON public.intercessoes FOR UPDATE USING (true);
