-- Tabela One-on-one (Bloqueio Total de RLS para acesso anonimo)
CREATE TABLE public.one_on_one (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lider_id UUID NOT NULL, -- será referenciado ao Auth Custom (usuarios.id)
    ovelha_id UUID NOT NULL, -- será referenciado a peregrinas.id
    data_encontro DATE NOT NULL,
    assunto_principal VARCHAR(255) NOT NULL,
    anotacoes_confidenciais TEXT NOT NULL,
    proximos_passos TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Isso bloqueia TODAS as operações por padrão para chaves non-service-role)
ALTER TABLE public.one_on_one ENABLE ROW LEVEL SECURITY;

-- NOTA IMPORTANTE DE ARQUITETURA:
-- NÃO criaremos nenhuma política RLS de permissão (CREATE POLICY) neste arquivo.
-- Ao habilitar o RLS e não fornecer nenhuma política PERMISSIVA, a tabela fica
-- 100% blindada e bloqueada para o aplicativo Client-side (que usa a Anon Key).
-- As leituras e escritas exigidas pela Camada 1 (Líderes) e Camada 2 (Master) serão
-- feitas EXCLUSIVAMENTE pela Vercel Serverless Function (Backend Next.js/Vite)
-- utilizando a SUPABASE_SERVICE_ROLE_KEY (Chave mestra de servidor que ignora o RLS).
