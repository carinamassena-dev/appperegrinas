import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export default async function handler(req: any, res: any) {
    // 1. Configurar Headers CORS antes de qualquer lógica para não travar preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Validação estrita do JWT no Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acesso negado: Token ausente ou formato inválido.' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Try-catch GLOBAL envolvendo todas as instâncias e inicializações e rotas
    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const jwtSecret = process.env.JWT_SECRET || 'peregrinas-fallback-secret-for-dev-only-xpto';

        // TRAVA OBRIGATÓRIA: Checagem de Variáveis Críticas
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({
                error: 'Variáveis de ambiente ausentes no servidor da Vercel.',
                details: `SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseKey}`
            });
        }

        let decodedUser: any;
        try {
            decodedUser = jwt.verify(token, jwtSecret);
        } catch (err: any) {
            return res.status(401).json({ error: 'Acesso negado: Sessão expirada ou Token corrompido.' });
        }

        const { id: requesterId, role: requesterRole } = decodedUser;

        // 3. Inicializa somente após testar se as chaves existem
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        // ==========================================
        // 1. GET - Leitura Segura (Lightweight list OR Detail)
        // ==========================================
        if (req.method === 'GET') {
            const { id } = req.query;

            if (id) {
                // Fetch full detail
                let query: any = supabase.from('one_on_one').select('*').eq('id', id).single();
                if (requesterRole !== 'Master') {
                    query = query.eq('lider_id', requesterId);
                }
                const { data, error } = await query;
                if (error) return res.status(500).json({ error: error.message });
                return res.status(200).json(data);
            } else {
                // Fetch lightweight list
                let query: any = supabase.from('one_on_one')
                    .select('id, lider_id, ovelha_id, data_encontro, assunto_principal')
                    .order('data_encontro', { ascending: false });

                if (requesterRole !== 'Master') {
                    query = query.eq('lider_id', requesterId);
                }

                const { data, error } = await query;
                if (error) {
                    return res.status(500).json({ error: `Falha interna na leitura Supabase: ${error.message}` });
                }
                return res.status(200).json(data);
            }
        }

        // ==========================================
        // 2. POST - Inserção Segura
        // ==========================================
        if (req.method === 'POST') {
            const { lider_id, ovelha_id, data_encontro, assunto_principal, anotacoes_confidenciais, proximos_passos } = req.body;

            if (!lider_id || !ovelha_id || !data_encontro || !assunto_principal || !anotacoes_confidenciais) {
                return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
            }

            // Validação anti-falsificação
            if (lider_id !== requesterId && requesterRole !== 'Master') {
                return res.status(403).json({ error: 'Você não tem privilégios para registrar encontros como se fosse outra líder.' });
            }

            const { data, error } = await supabase.from('one_on_one').insert([{
                lider_id,
                ovelha_id,
                data_encontro,
                assunto_principal,
                anotacoes_confidenciais,
                proximos_passos
            }]).select().single();

            if (error) {
                return res.status(500).json({ error: `Falha ao salvar no banco Supabase: ${error.message}` });
            }
            return res.status(201).json(data);
        }

        // ==========================================
        // 3. DELETE - Remoção Segura
        // ==========================================
        if (req.method === 'DELETE') {
            const { id } = req.query;
            const targetId = id || req.body?.id;

            if (!targetId) return res.status(400).json({ error: 'ID ausente para remoção.' });

            const { data: record, error: fetchErr } = await supabase.from('one_on_one').select('lider_id').eq('id', targetId).single();

            if (fetchErr) return res.status(404).json({ error: `Encontro não encontrado no banco: ${fetchErr.message}` });

            if (requesterRole !== 'Master' && record.lider_id !== requesterId) {
                return res.status(403).json({ error: 'Permissões insuficientes para deletar este registro alheio.' });
            }

            const { error: delErr } = await supabase.from('one_on_one').delete().eq('id', targetId);

            if (delErr) {
                return res.status(500).json({ error: `Erro do banco ao deletar: ${delErr.message}` });
            }

            return res.status(200).json({ success: true, message: 'Registro apagado com segurança.' });
        }

        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

    } catch (err: any) {
        // Envia o stack trace exato para ajudar no diagnóstico do erro 500
        return res.status(500).json({
            error: err.message || 'Erro inesperado no servidor',
            stack: err.stack
        });
    }
}
