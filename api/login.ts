import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { username, password } = req.body;

    // BLOCO PASSE LIVRE: Se for você, o app abre na hora!
    if (username === 'carina.massena@gmail.com' || username === 'carina.massena') {
        return res.status(200).json({
            user: {
                id: 'master-id',
                username: 'carina.massena',
                nome: 'Carina Massena',
                email: 'carina.massena@gmail.com',
                role: 'Master',
                status: 'active'
            }
        });
    }

    try {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: user } = await supabase
            .from('usuarios')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .single();

        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
        return res.status(200).json({ user });
    } catch (err: any) {
        return res.status(500).json({ error: 'Erro de conexão' });
    }
}
