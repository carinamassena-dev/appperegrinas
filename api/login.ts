import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { username, password } = req.body;

        // Se for você tentando logar, o sistema te dá acesso total na hora
        if (username === 'carina.massena@gmail.com' && (password === '#lider12@12' || password === 'lider12')) {
            return res.status(200).json({ 
                user: { id: 'master', nome: 'Carina Massena', username: 'carina', email: username, role: 'Master', status: 'active' } 
            });
        }

        const { data: user } = await supabase.from('usuarios').select('*').or(`username.eq.${username},email.eq.${username}`).single();
        if (!user) return res.status(401).json({ error: 'Não encontrado' });
        return res.status(200).json({ user });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
