import { supabase } from './supabaseClient';

const getMyOrgId = () => {
    try {
        const u = localStorage.getItem('current_user');
        if (u) {
            const parsed = JSON.parse(u);
            return parsed.organization_id || null;
        }
    } catch { }
    return null;
};

export const supabaseService = {
    // Generic Upsert (NoSQL style with JSONB)
    async upsert(table: string, item: any) {
        if (!supabase) {
            console.error('[Supabase] Tentativa de upsert sem cliente configurado.');
            throw new Error("Supabase não configurado.");
        }

        const orgId = getMyOrgId();
        if (orgId && !item.organization_id) {
            item.organization_id = orgId;
        }

        const payload = {
            id: item.id,
            record: item,
            ...(orgId ? { organization_id: orgId } : {})
        };

        const { data: result, error } = await supabase
            .from(table)
            .upsert(payload, { onConflict: 'id' })
            .select();

        if (error) {
            console.error(`[Supabase Error] Table: ${table}`, error);
            throw error;
        }
        return result;
    },

    // Generic Get All
    async getAll(table: string) {
        if (!supabase) return []; // Retorna lista vazia se não configurado em vez de crashar

        // Fetches directly without attempting to order by a non-existent native column.
        // The sorting of JSONB records is handled by the React components.
        // The sorting of JSONB records is handled by the React components.
        const orgId = getMyOrgId();
        let query = supabase.from(table).select('id, record').order('id', { ascending: true });
        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;

        if (error) {
            console.error(`[Supabase Error] Table: ${table}`, error);
            throw error;
        }

        return (data || []).map((row: any) => row.record);
    },

    // Dedicated Backup Function (No Limits)
    async getFullTableBackup(table: string) {
        if (!supabase) return [];
        const orgId = getMyOrgId();
        let query = supabase.from(table).select('id, record');
        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) {
            console.error(`[Supabase Backup Error] Table: ${table}`, error);
            throw error;
        }
        return (data || []).map((row: any) => row.record);
    },

    // Get Count Header Only (Extreme Egress Saver)
    async getCount(table: string): Promise<number> {
        if (!supabase) return 0;
        const orgId = getMyOrgId();
        let query = supabase.from(table).select('*', { count: 'exact', head: true });
        if (orgId) query = query.eq('organization_id', orgId);

        const { count, error } = await query;
        if (error) {
            console.error(`[Supabase Count Error] Table: ${table}`, error);
            return 0;
        }
        return count || 0;
    },

    // Generic Delete
    async delete(table: string, id: string) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const orgId = getMyOrgId();
        let query = supabase.from(table).delete().eq('id', id);
        if (orgId) query = query.eq('organization_id', orgId);

        const { error } = await query;

        if (error) throw error;
    },
    // Specific for Disciples (Peregrinas)
    async saveDisciple(disciple: any) {
        return this.upsert('peregrinas', disciple);
    },

    // Storage: Upload file to a specific bucket
    async uploadImage(file: File, path: string, bucket: string = 'avatars'): Promise<string> {
        if (!supabase) throw new Error("Supabase não configurado.");

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error(`[Supabase Storage Error]`, error);
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrlData.publicUrl;
    },

    async getDisciples() {
        return this.getAll('peregrinas');
    },

    // Optimized List Fetcher (Now with Pagination & Backend Search)
    async getDisciplesList(page: number = 0, limit: number = 20, searchTerm: string = '') {
        if (!supabase) return [];

        const orgId = getMyOrgId();
        const start = page * limit;
        const end = start + limit - 1;

        let query = supabase
            .from('peregrinas')
            .select(`
                id,
                nome:record->>nome,
                whatsapp:record->>whatsapp,
                status:record->>status,
                isLeader:record->isLeader,
                lider12:record->>lider12,
                liderDireta:record->>liderDireta,
                bairro:record->>bairro,
                batizada:record->>batizada,
                fezUV:record->fezUV,
                fezEncontro:record->fezEncontro,
                fezCD:record->fezCD,
                dataCadastro:record->>dataCadastro,
                profissao:record->>profissao,
                idade:record->idade,
                dataAniversario:record->>dataAniversario,
                cdStatus:record->>cdStatus,
                dataBatismo:record->>dataBatismo,
                dataConclusaoEncontro:record->>dataConclusaoEncontro,
                dataConclusaoCD:record->>dataConclusaoCD,
                celula1:record->celula1,
                celula2:record->celula2,
                fazMaisDeUmaCelula:record->fazMaisDeUmaCelula
            `)
            .range(start, end)
            .order('id', { ascending: false });

        if (orgId) query = query.eq('organization_id', orgId);
        if (searchTerm && searchTerm.trim().length >= 3) {
            query = query.ilike('record->>nome', `%${searchTerm.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Supabase Error] getDisciplesList fallback:', error);
            // Fallback (Not applying pagination here because JSONb specific extracts failed)
            let fallbackQuery = supabase.from('peregrinas').select('id, record').range(start, end);
            if (orgId) fallbackQuery = fallbackQuery.eq('organization_id', orgId);
            const { data: fallback, error: err2 } = await fallbackQuery;
            if (err2) throw err2;
            return (fallback || []).map((row: any) => row.record);
        }

        // Return a mapped lightweight list
        return data as any[];
    },

    // Dedicated fetch for Leaders only
    async getLeaders() {
        if (!supabase) return [];
        const orgId = getMyOrgId();
        let query = supabase.from('peregrinas')
            .select('id, record')
            .eq('record->isLeader', true)
            .order('id', { ascending: true });

        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) {
            console.error('[Supabase Error] getLeaders:', error);
            return [];
        }
        return (data || []).map((row: any) => row.record);
    },

    // Ultra-lightweight fetch for Amigo Secreto (Egress Saver)
    async getDisciplesForAmigoSecreto() {
        if (!supabase) return [];
        const orgId = getMyOrgId();
        let query = supabase
            .from('peregrinas')
            .select(`
                id,
                nome:record->>nome,
                whatsapp:record->>whatsapp,
                liderDireta:record->>liderDireta
            `)
            .eq('record->>status', 'Ativa');

        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;

        if (error) {
            console.error('[Supabase Error] getDisciplesForAmigoSecreto:', error);
            return [];
        }
        return data as any[];
    },

    // Optimized Search for modal / selects (3 letters minimum)
    async searchDisciplesByName(term: string) {
        if (!supabase || term.trim().length < 3) return [];
        const orgId = getMyOrgId();
        let query = supabase
            .from('peregrinas')
            .select(`
                id,
                nome:record->>nome,
                whatsapp:record->>whatsapp,
                liderDireta:record->>liderDireta
            `);

        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query.ilike('record->>nome', `%${term}%`).limit(20);

        if (error) {
            console.error('[Supabase Error] searchDisciplesByName:', error);
            return [];
        }
        return data as any[];
    },

    // Optimized fetch for today's birthdays (no need to fetch all)
    async getTodayBirthdays() {
        if (!supabase) return [];
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const searchStr = `-${month}-${day}`; // Matches YYYY-MM-DD ending in -MM-DD

        const orgId = getMyOrgId();
        let query = supabase
            .from('peregrinas')
            .select(`
                id,
                nome:record->>nome,
                dataAniversario:record->>dataAniversario,
                liderDireta:record->>liderDireta
            `);

        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query.like('record->>dataAniversario', `%${searchStr}%`).limit(50);

        if (error) {
            console.error('[Supabase Error] getTodayBirthdays:', error);
            return [];
        }
        return data as any[];
    },

    // Specific fetch by EXACT name for tickets
    async getDiscipleByName(name: string) {
        if (!supabase || !name) return null;

        // As data is JSONB and names can have accents, we query directly.
        // If normalization is strict, might need fetching active ones and filtering in TS, 
        // but lets try a direct match first.
        const orgId = getMyOrgId();
        let query = supabase
            .from('peregrinas')
            .select('id, record');

        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query.ilike('record->>nome', name).limit(1).single();

        if (error || !data) return null;
        return data.record;
    },


    async getDiscipleById(id: string) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const { data, error } = await supabase
            .from('peregrinas')
            .select('id, record')
            .eq('id', id)
            .single();

        return data ? data.record : null;
    },

    // Daily Intercession Wall (Mural) Filter
    async getRecentIntercessions() {
        if (!supabase) return [];

        // "início do dia atual"
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const orgId = getMyOrgId();
        let query = supabase
            .from('intercessoes')
            .select('id, record, created_at');

        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query.gte('created_at', startOfDay.toISOString()).order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase Error] getRecentIntercessions:', error);
            // Non-fatal, return empty
            return [];
        }

        // Merge created_at into the returning objects for UI sorting/display if needed
        return (data || []).map((row: any) => ({ ...row.record, id: row.id, created_at: row.created_at }));
    },

    // Specific for Finance
    async saveFinance(record: any) {
        return this.upsert('financeiro', record);
    },

    async getFinance() {
        return this.getAll('financeiro');
    },

    // Specific for Harvest
    async saveHarvest(record: any) {
        return this.upsert('colheita', record);
    },

    async getHarvest() {
        return this.getAll('colheita');
    },

    // Specific for Tickets
    async saveTicket(record: any) {
        return this.upsert('tickets', record);
    },

    async getTickets() {
        return this.getAll('tickets');
    },

    // Specific for Events
    async saveEvent(record: any) {
        return this.upsert('eventos', record);
    },

    async getEvents() {
        return this.getAll('eventos');
    },

    // Specific for Cell Meetings
    async saveCellMeeting(record: any) {
        return this.upsert('atas', record);
    },

    async getCellMeetings() {
        return this.getAll('atas');
    },

    // Specific for Feed Posts
    async saveFeedPost(record: any) {
        return this.upsert('feed', record);
    },

    async getFeedPosts() {
        return this.getAll('feed');
    },

    // Specific for Attendance (Check-ins)
    async saveAttendanceBatch(records: { id_discipula: string; id_lider: string; data_presenca: string }[]) {
        if (!supabase) throw new Error("Supabase não configurado.");

        // This inserts without checking conflicts because we only record presence, multiple true checks on the same day can be ignored by UI or filtered by date query.
        const { error } = await supabase
            .from('presencas')
            .insert(records);

        if (error) {
            console.error(`[Supabase Error] Table: presencas (Batch Insert)`, error);
            throw error;
        }
    },

    async getWeeklyAttendanceCount(): Promise<number> {
        if (!supabase) return 0;

        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);

        const { count, error } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .gte('data_presenca', startOfWeek.toISOString().split('T')[0]);

        if (error) {
            console.error(`[Supabase Error] Table: presencas (Count)`, error);
            return 0;
        }

        return count || 0;
    },

    // G12 Lineage Recursive Fetch (from View)
    async getLinhagem() {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('v_linhagem_peregrinas')
            .select('*');

        if (error) {
            console.error('[Supabase Error] v_linhagem_peregrinas:', error);
            return [];
        }
        return data || [];
    },

    // --- SUPER ADMIN: Gestão de Tenants (Organizations) ---
    async getOrganizations() {
        if (!supabase) return [];
        // Sem filtro de orgId, queremos ver todas as organizações
        const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('[Supabase Error] getOrganizations:', error);
            return [];
        }
        return data || [];
    },

    async saveOrganization(org: any) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const isUpdate = !!org.id;

        const payload = isUpdate ? org : {
            nome: org.nome,
            slug: org.slug || org.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };

        let query = supabase.from('organizations');
        if (isUpdate) {
            query = query.update(payload).eq('id', org.id) as any;
        } else {
            query = query.insert([payload]) as any;
        }

        const { data, error } = await query.select().single();
        if (error) throw error;
        return data;
    },

    // --- AMIGO SECRETO ---
    async saveAmigoSecretoBatch(records: any[]) {
        if (!supabase) throw new Error("Supabase não configurado.");
        const orgId = getMyOrgId();

        // Garante que a organization_id está injetada em todos
        const payload = records.map(r => ({
            ...r,
            ...(orgId ? { organization_id: orgId } : {})
        }));

        const { error } = await supabase.from('amigo_secreto').insert(payload);
        if (error) {
            console.error('[Supabase Error] saveAmigoSecretoBatch:', error);
            throw error;
        }
    },

    async getHistoricoSorteios() {
        if (!supabase) return [];
        const orgId = getMyOrgId();
        let query = supabase.from('amigo_secreto').select('*').order('created_at', { ascending: false });
        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) {
            console.error('[Supabase Error] getHistoricoSorteios:', error);
            return [];
        }
        return data || [];
    },

    async revelarAmigoSecretoByToken(token: string) {
        if (!supabase) return null;
        // Não filtramos por orgId aqui pois a pessoa abre pelo link no celular (pode não estar logada e sem contexto de org)
        const { data, error } = await supabase
            .from('amigo_secreto')
            .select('nome_participante, nome_sorteado, grupo_id, created_at')
            .eq('token', token)
            .single();

        if (error) {
            console.warn('[Supabase Warn] revelarAmigoSecretoByToken:', error);
            return null; // Token inválido ou não achou
        }
        return data;
    }
}

