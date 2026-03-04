import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { username, password } = req.body;

        // Busca o usuário usando as colunas novas (email ou username)
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        // Retorna os dados exatamente como o seu app espera
        return res.status(200).json({ 
            user: {
                id: user.id,
                nome: user.nome,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
            } 
        });
    } catch (err: any) {
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
}
