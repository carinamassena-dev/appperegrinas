import { createClient } from '@supabase/supabase-js';

// Função para gerar JWT básico usando a Web Crypto API (Nativa em Edge/Browsers)
async function signJwtEdge(payload: any, secret: string) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encoder = new TextEncoder();

    const base64UrlEncode = (obj: any) => {
        return btoa(JSON.stringify(obj))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    };

    const head = base64UrlEncode(header);
    const body = base64UrlEncode({ ...payload, exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) });
    const data = `${head}.${body}`;

    // Polyfill simples para o Vite dev / Node fallback se crypto.subtle não estiver disponível
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        return `${data}.insecure-signature-fallback`;
    }

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    );

    const sigBase64Url = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `${data}.${sigBase64Url}`;
}

export default async function handler(req: any, res: any) {
    // 1. Configurar Headers CORS antes de qualquer lógica para não travar preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Try-catch GLOBAL envolvendo todas as instâncias e inicializações
    try {
        // Tenta capturar as variáveis comuns do Next/Vite ou nativas da Vercel
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ofrwgukuoqbftdyzbfza.supabase.co';
                const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        // TRAVA OBRIGATÓRIA: Checagem de Variáveis Críticas
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({
                error: 'Variáveis de ambiente ausentes no servidor da Vercel.',
                details: `SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseKey}`
            });
        }

        // 3. Inicializa somente após testar se as chaves existem
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        // Parse body — Vercel pode entregar como string em certos runtimes
        let rawBody = req.body;
        if (typeof rawBody === 'string') {
            try { rawBody = JSON.parse(rawBody); } catch { rawBody = {}; }
        }
        const { username, password } = rawBody || {};

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios.' });
        }

        const { data: users, error } = await supabase
            .from('usuarios')
            .select('*');

        if (error) {
            return res.status(500).json({ error: `Falha interna na conexão (Supabase): ${error.message}` });
        }

        // Guard: filter out rows where record is null/undefined (empty table on new DB)
        const parsedUsers = (users || [])
            .map((row: any) => row.record)
            .filter((u: any) => u != null && typeof u === 'object');

        let found = parsedUsers.find(
            (u: any) => u && (u.username === username || u.email === username) && u.passwordHash === password
        );

        // MASTER OVERRIDE RECOVERY — funciona mesmo com tabela vazia no novo banco
        const MASTER_PASSWORDS = ['#lider12@12', 'lider12'];
        const isMasterLogin =
            username === 'carina.massena@gmail.com' || username === 'carina.massena';

        if (!found && isMasterLogin) {
            // 1. Tenta achar no banco
            const masterUser = parsedUsers.find(
                (u: any) => u.role === 'Master' || u.username === 'carina.massena'
            );
            if (masterUser && (MASTER_PASSWORDS.includes(password) || masterUser.passwordHash === password)) {
                found = masterUser;
            }

            // 2. Bootstrap: banco vazio no novo projeto — cria o Master na hora
            if (!found && MASTER_PASSWORDS.includes(password)) {
                const bootstrapMaster = {
                    id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0;
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    }),
                    username: 'carina.massena',
                    passwordHash: '#lider12@12',
                    nome: 'Carina Massena',
                    email: 'carina.massena@gmail.com',
                    whatsapp: '71900000000',
                    role: 'Master',
                    permissions: {
                        dashboard: 'edit', disciples: 'edit', leaders: 'edit',
                        finance: 'edit', events: 'edit', harvest: 'edit', master: true
                    }
                };
                try {
                    await supabase.from('usuarios').upsert({ id: bootstrapMaster.id, record: bootstrapMaster });
                } catch (seedErr) {
                    console.error('Bootstrap seed failed (non-fatal):', seedErr);
                }
                found = bootstrapMaster;
            }
        }

        // SYNC REAL UUID FROM SUPABASE AUTH FOR MASTER USER
        if (found && (found.role === 'Master' || found.email === 'carina.massena@gmail.com')) {
            let newRealId = null;
            try {
                // Find true UUID by email in auth.users
                const { data: authData } = await supabase.auth.admin.listUsers();
                if (authData && authData.users) {
                    const authMatch = authData.users.find((u: any) => u.email === 'carina.massena@gmail.com');
                    if (authMatch) newRealId = authMatch.id;
                }
            } catch (err) {
                console.error("Failed to sync Master UUID:", err);
            }

            // If no auth match exists yet, but we are still using placeholders, FORCE a valid UUID format
            if (!newRealId && (found.id === '1' || found.id === 'master_user')) {
                newRealId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            if (newRealId && newRealId !== found.id) {
                const oldId = found.id;
                found.id = newRealId;

                // Ensure record also has the correct ID internally
                found.id = newRealId;

                // Update the record in usuarios to hold the real UUID
                await supabase.from('usuarios').upsert({ id: found.id, record: found });

                // Delete the old placeholder record
                if (oldId === '1' || oldId === 'master_user') {
                    await supabase.from('usuarios').delete().eq('id', oldId);
                }
            }
        }

        if (found) {
            if (found.status === 'pending') {
                return res.status(401).json({ error: 'Sua solicitação está em análise pela Usuária Master. Aguarde a liberação!' });
            }

            // Gera de forma segura o token JWT assinado usando a versão Edge-compatible
            const token = await signJwtEdge(
                { id: found.id, role: found.role, username: found.username },
                jwtSecret
            );

            return res.status(200).json({
                user: { ...found, sessionToken: token }
            });
        } else {
            return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        }
    } catch (err: any) {
        // Envia o stack trace exato para ajudar no diagnóstico do erro 500
        return res.status(500).json({
            error: err.message || 'Erro inesperado no servidor',
            stack: err.stack
        });
    }
}

