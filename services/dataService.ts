/**
 * Centralized Data Service
 * ALL reads/writes go through Supabase. No localStorage dependency.
 * localStorage is ONLY used for `current_user` session cache (handled in App.tsx).
 */
import { supabase } from './supabaseClient';
import { supabaseService } from './supabaseService';
import { logAction } from './auditService';

const isSupabaseReady = () => !!supabase;

type TableMap = {
    table: string;
};

const TABLES: Record<string, { table: string; isRelational?: boolean; isGlobal?: boolean }> = {
    disciples: { table: 'peregrinas' },
    finance: { table: 'financeiro' },
    harvest: { table: 'colheita' },
    events: { table: 'eventos' },
    cellMeetings: { table: 'atas' },
    feed: { table: 'feed' },
    tickets: { table: 'tickets' },
    users: { table: 'usuarios' },
    leaders: { table: 'lideres' },
    settings: { table: 'configuracoes' },
    auditLogs: { table: 'audit_logs' },
    pendingRegistrations: { table: 'pending_registrations' },
    intercessions: { table: 'intercessoes' },
    attendance: { table: 'presencas', isRelational: true },
    forumPosts: { table: 'forum_posts' },
    organizations: { table: 'organizations', isRelational: true, isGlobal: true },
    amigoSecreto: { table: 'amigo_secreto', isRelational: true }
};

/**
 * Safely log an error to the audit system.
 * Avoids infinite recursion by NOT logging audit errors about the auditLogs module itself.
 */
function safeLogError(module: string, action: string, errorMsg: string) {
    if (module === 'auditLogs') {
        // Only console.error to avoid infinite recursion
        console.error(`[DataService] ${action}: ${errorMsg}`);
        return;
    }
    logAction('SISTEMA', action, errorMsg, 'ERRO').catch(() => {
        // If even audit logging fails, just console it
        console.error(`[DataService] Falha ao registrar log de auditoria: ${errorMsg}`);
    });
}

/**
 * Cache Local para mitigar Egress Loop (24 horas)
 */
const CACHE_LIFETIME = 24 * 60 * 60 * 1000;
const memoryCache: Record<string, { data: any[], timestamp: number }> = {};

/**
 * Load data: Supabase ONLY
 */
export async function loadData<T>(module: keyof typeof TABLES): Promise<T[]> {
    const { table } = TABLES[module];

    if (!isSupabaseReady()) {
        console.error(`[DataService] Supabase não está configurado. Impossível carregar ${module}.`);
        return [];
    }

    const now = Date.now();

    // 1. Check localStorage cache first (survives page refresh)
    const lsKey = `cached_${module}`;
    const cachedItemStr = localStorage.getItem(lsKey);
    if (cachedItemStr) {
        try {
            const cachedItem = JSON.parse(cachedItemStr);
            if (now - cachedItem.timestamp < CACHE_LIFETIME) {
                console.log(`[Cache Hit] Poupando Egress de: ${module} (via localStorage)`);
                memoryCache[module] = cachedItem;
                return cachedItem.data as T[];
            } else {
                localStorage.removeItem(lsKey);
            }
        } catch (e) {
            localStorage.removeItem(lsKey);
        }
    }

    // 2. Check in-memory cache
    if (memoryCache[module] && (now - memoryCache[module].timestamp < CACHE_LIFETIME)) {
        console.log(`[Cache Hit] Poupando Egress de: ${module}`);
        return memoryCache[module].data as T[];
    }

    // 3. Fetch from Supabase
    try {
        const data = await supabaseService.getAll(table);
        const cacheObj = { data: data || [], timestamp: now };
        memoryCache[module] = cacheObj;

        // Save to localStorage for next browser session
        try {
            localStorage.setItem(lsKey, JSON.stringify(cacheObj));
        } catch (e) {
            console.warn(`[Cache] Falha ao salvar ${module} no localStorage (possível limite de quota)`, e);
        }

        return (data || []) as T[];
    } catch (err: any) {
        const errorMsg = `${err?.message || err} - Code: ${err?.code || 'N/A'}`;
        console.error(`[DataService] Erro ao carregar ${module} do Supabase:`, err);
        return [];
    }
}

/**
 * Optimized Fetch specifically for Disciples List (avoids downloading Base64 images)
 */
export async function loadDisciplesList(page: number = 0, limit: number = 20, searchTerm: string = ''): Promise<any[]> {
    if (!isSupabaseReady()) return [];

    const now = Date.now();

    // Check Local Storage Cache first
    const cachedItemStr = localStorage.getItem('cached_disciplesList');
    if (cachedItemStr) {
        try {
            const cachedItem = JSON.parse(cachedItemStr);
            if (now - cachedItem.timestamp < CACHE_LIFETIME) {
                console.log(`[Cache Hit] Poupando Egress de: disciplesList (via localStorage)`);
                // Populate memory cache to avoid parsing again if called rapidly
                memoryCache['disciplesList'] = cachedItem;
                return cachedItem.data;
            } else {
                localStorage.removeItem('cached_disciplesList');
            }
        } catch (e) {
            localStorage.removeItem('cached_disciplesList');
        }
    }

    if (memoryCache['disciplesList'] && (now - memoryCache['disciplesList'].timestamp < CACHE_LIFETIME)) {
        console.log(`[Cache Hit] Poupando Egress de: disciplesList`);
        return memoryCache['disciplesList'].data;
    }

    try {
        console.log('[Data Fetch] Carregando lista de discípulos do banco...');
        const data = await supabaseService.getDisciplesList(page, limit, searchTerm);
        const cacheObj = { data: data || [], timestamp: now };
        memoryCache['disciplesList'] = cacheObj;

        // Save to Local Storage for next browser session
        try {
            localStorage.setItem('cached_disciplesList', JSON.stringify(cacheObj));
        } catch (e) {
            console.warn('[Cache] Falha ao salvar no localStorage (possível limite de quota)', e);
        }

        return data;
    } catch (err: any) {
        console.error('[DataService] Erro ao carregar lista de discípulas:', err);
        return [];
    }
}

/**
 * Funções de Otimização Isoladas (Buscas Diretas contra o Supabase)
 */
export async function searchDisciplesByName(term: string): Promise<any[]> {
    return await supabaseService.searchDisciplesByName(term);
}

export async function getTodayBirthdays(): Promise<any[]> {
    return await supabaseService.getTodayBirthdays();
}

export async function getDiscipleByName(name: string): Promise<any | null> {
    return await supabaseService.getDiscipleByName(name);
}

// Amigo Secreto Funções
export async function loadDisciplesForAmigoSecreto(): Promise<any[]> {
    return await supabaseService.getDisciplesForAmigoSecreto();
}

export async function saveAmigoSecretoBatch(records: any[]): Promise<void> {
    return await supabaseService.saveAmigoSecretoBatch(records);
}

export async function getHistoricoSorteiosAmigoSecreto(): Promise<any[]> {
    return await supabaseService.getHistoricoSorteios();
}

export async function revelarAmigoSecretoByToken(token: string): Promise<any | null> {
    return await supabaseService.revelarAmigoSecretoByToken(token);
}

/**
 * Fetch a full Disciple record by ID (used for editing/viewing details)
 */
export async function loadDiscipleFull(id: string): Promise<any | null> {
    if (!isSupabaseReady()) return null;
    try {
        return await supabaseService.getDiscipleById(id);
    } catch (err: any) {
        console.error(`[DataService] Erro ao carregar discípula inteira (${id}):`, err);
        return null;
    }
}

/**
 * Save a single record to Supabase
 */
export async function saveRecord(module: keyof typeof TABLES, item: any): Promise<void> {
    const { table } = TABLES[module];

    if (!isSupabaseReady()) {
        console.error(`[DataService] Supabase não configurado. Impossível salvar em ${module}.`);
        return;
    }

    try {
        await supabaseService.upsert(table, item);
        delete memoryCache[module];
        localStorage.removeItem(`cached_${module}`);
        if (module === 'disciples') {
            delete memoryCache['disciplesList'];
            localStorage.removeItem('cached_disciplesList');
        }
    } catch (err) {
        console.error(`[DataService] Erro ao salvar em ${module}:`, err);
    }
}

/**
 * Save an entire list at once: syncs the changed item to Supabase
 */
export async function saveList(module: keyof typeof TABLES, _list: any[], changedItem?: any): Promise<void> {
    if (!isSupabaseReady() || !changedItem) return;

    const { table } = TABLES[module];

    try {
        await supabaseService.upsert(table, changedItem);
        delete memoryCache[module];
        delete memoryCache[`${module}List`];
    } catch (err) {
        console.error(`[DataService] Erro ao salvar lista em ${module}:`, err);
    }
}

/**
 * Delete a record from Supabase
 */
export async function deleteRecord(module: keyof typeof TABLES, id: string): Promise<void> {
    const { table } = TABLES[module];

    if (!isSupabaseReady()) {
        console.error(`[DataService] Supabase não configurado. Impossível deletar de ${module}.`);
        return;
    }

    try {
        await supabaseService.delete(table, id);
        delete memoryCache[module];
        delete memoryCache[`${module}List`];
        localStorage.removeItem(`cached_${module}`);
    } catch (err) {
        console.error(`[DataService] Erro ao deletar de ${module}:`, err);
    }
}

/**
 * Generate a complete JSON backup of the entire database
 */
export async function generateFullSystemBackup(): Promise<any> {
    if (!isSupabaseReady()) {
        console.error('[DataService] Supabase não configurado para backup.');
        return null;
    }

    const allData: Record<string, any[]> = {};
    const modules = Object.keys(TABLES) as (keyof typeof TABLES)[];

    for (const mod of modules) {
        const { table, isRelational, isGlobal } = TABLES[mod];
        try {
            console.log(`[Backup] Baixando módulo: ${mod}`);
            const data = await supabaseService.getFullTableBackup(table, isRelational, isGlobal);
            allData[mod] = data;
        } catch (err) {
            console.error(`[Backup] Erro ao baixar módulo ${mod}:`, err);
            allData[mod] = [];
        }
    }

    return {
        ...allData,
        exportedAt: new Date().toISOString(),
        version: '2.0'
    };
}

/**
 * Restore system from a backup object
 */
export async function restoreFromBackup(backupData: any): Promise<{ success: boolean; errors: string[] }> {
    if (!isSupabaseReady()) return { success: false, errors: ['Supabase não configurado.'] };

    const errors: string[] = [];
    const modules = Object.keys(TABLES) as (keyof typeof TABLES)[];

    for (const mod of modules) {
        const records = backupData[mod];
        if (!records || !Array.isArray(records)) {
            console.warn(`[Restore] Módulo ${mod} não encontrado no backup.`);
            continue;
        }

        const { table, isRelational } = TABLES[mod];
        console.log(`[Restore] Restaurando ${records.length} registros em: ${mod}`);

        try {
            // Restore one-by-one to ensure reliability and handle possible JSONB mapping
            for (const record of records) {
                if (isRelational) {
                    await supabaseService.upsertRelational(table, record);
                } else {
                    await supabaseService.upsert(table, record);
                }
            }
            // Clear cache for this module
            delete memoryCache[mod];
            localStorage.removeItem(`cached_${mod}`);
        } catch (err: any) {
            console.error(`[Restore] Erro no módulo ${mod}:`, err);
            errors.push(`Erro em ${mod}: ${err.message || err}`);
        }
    }

    return { success: errors.length === 0, errors };
}


// Check-ins: Save a batch of attendances to minimize Egress
export async function saveAttendanceBatch(records: { id_discipula: string; id_lider: string; data_presenca: string }[]): Promise<void> {
    if (!records || records.length === 0) return;

    try {
        await supabaseService.saveAttendanceBatch(records);
        // Clear potential dashboard caches related to attendance
        delete memoryCache['attendance_weekly'];
    } catch (err: any) {
        console.error('[DataService] Erro ao salvar lote de check-ins:', err);
        throw err;
    }
}

// Check-ins: Get weekly total
export async function getWeeklyAttendanceTotal(): Promise<number> {
    const cacheKey = 'attendance_weekly';
    const now = Date.now();

    if (memoryCache[cacheKey] && (now - memoryCache[cacheKey].timestamp < CACHE_LIFETIME)) {
        return memoryCache[cacheKey].data as any as number;
    }

    try {
        const total = await supabaseService.getWeeklyAttendanceCount();
        memoryCache[cacheKey] = { data: total as any, timestamp: now };
        return total;
    } catch (err) {
        console.error("Erro ao buscar total de check-ins semanais", err);
        return 0;
    }
}

/**
 * Load G12 Lineage with caching
 */
export async function loadLinhagem(): Promise<any[]> {
    if (!isSupabaseReady()) return [];

    const now = Date.now();
    const module = 'linhagem';

    if (memoryCache[module] && (now - memoryCache[module].timestamp < CACHE_LIFETIME)) {
        return memoryCache[module].data;
    }

    try {
        const data = await supabaseService.getLinhagem();
        memoryCache[module] = { data: data || [], timestamp: now };
        return data;
    } catch (err) {
        console.error('[DataService] Erro ao carregar linhagem:', err);
        return [];
    }
}
