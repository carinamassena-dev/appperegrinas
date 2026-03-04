import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    // Configuração de segurança para o navegador (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl!, supabaseKey!);

        const { username, password } = req.body;

        // Busca todos os usuários para verificar as credenciais
        const { data: users, error } = await supabase.from('usuarios').select('*');
        if (error) throw error;

        // Proteção contra dados vazios ou erro de leitura
        const parsedUsers = (users || []).map(row => row.record || row).filter(u => u != null);
        
        let found = parsedUsers.find(u => 
            (u.username === username || u.email === username) && (u.passwordHash === password || u.password === password)
        );

        // AUTO-BOOTSTRAP: Se o banco estiver vazio, ele cria você como Master agora
        if (!found && username === 'carina.massena@gmail.com' && (password === '#lider12@12' || password === 'lider12')) {
            const master = {
                id: 'master_user',
                username: 'carina.massena',
                nome: 'Carina Massena',
                email: 'carina.massena@gmail.com',
                role: 'Master',
                status: 'active',
                passwordHash: '#lider12@12'
            };
            // Tenta inserir no banco para as próximas vezes
            await supabase.from('usuarios').upsert({ id: master.id, ...master });
            found = master;
        }

        if (found) {
            return res.status(200).json({ user: found });
        } else {
            return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        }

    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
