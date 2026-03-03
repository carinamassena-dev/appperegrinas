
// auditService.ts — Serviço de logs de auditoria centralizado (Supabase)

import { loadData, saveRecord } from './dataService';

export type AuditLogType = 'USUARIO' | 'UI' | 'CONFIG' | 'ERRO' | 'SISTEMA' | 'EVENTO' | 'FINANCEIRO';

export interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
    type: AuditLogType;
}

// In-memory cache to avoid excessive reads
let cachedLogs: AuditLog[] = [];
let cacheLoaded = false;

export async function getAuditLogs(): Promise<AuditLog[]> {
    try {
        const logs = await loadData<AuditLog>('auditLogs');
        cachedLogs = logs;
        cacheLoaded = true;
        return logs;
    } catch {
        return cachedLogs;
    }
}

// Synchronous getter for cached logs (for UI that can't await)
export function getCachedAuditLogs(): AuditLog[] {
    return cachedLogs;
}

export async function logAction(user: string, action: string, details: string, type: AuditLogType = 'SISTEMA'): Promise<void> {
    const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        user,
        action,
        details,
        type
    };

    try {
        await saveRecord('auditLogs', newLog);
        cachedLogs = [newLog, ...cachedLogs].slice(0, 500);
        // Dispara evento para atualizar componentes em tempo real
        window.dispatchEvent(new Event('audit_log_added'));
    } catch (err) {
        console.error('Failed to save audit log to Supabase', err);
    }
}

export async function clearLogs(): Promise<void> {
    cachedLogs = [];
    cacheLoaded = false;
    // Note: clearing all logs from Supabase would require a bulk delete
    // For now, just clear the cache
}
