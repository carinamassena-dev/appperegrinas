import { saveRecord } from './dataService';

const DRAFT_PREFIX = 'peregrinas_draft_';

export const draftService = {
    saveDraft: (module: string, data: any) => {
        localStorage.setItem(`${DRAFT_PREFIX}${module}`, JSON.stringify(data));
        window.dispatchEvent(new Event('drafts_updated'));
    },

    getDraft: (module: string): any | null => {
        const d = localStorage.getItem(`${DRAFT_PREFIX}${module}`);
        if (!d) return null;
        try { return JSON.parse(d); } catch { return null; }
    },

    clearDraft: (module: string) => {
        localStorage.removeItem(`${DRAFT_PREFIX}${module}`);
        window.dispatchEvent(new Event('drafts_updated'));
    },

    hasDrafts: (): boolean => {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(DRAFT_PREFIX)) return true;
        }
        return false;
    },

    getAllDrafts: () => {
        const drafts: { module: string, data: any }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(DRAFT_PREFIX)) {
                const mod = k.replace(DRAFT_PREFIX, '');
                const data = draftService.getDraft(mod);
                if (data) drafts.push({ module: mod, data });
            }
        }
        return drafts;
    },

    syncAllDrafts: async (): Promise<{ success: number, failed: number }> => {
        const drafts = draftService.getAllDrafts();
        let successCount = 0;
        let failCount = 0;

        for (const draft of drafts) {
            try {
                // Check if the module maps to a valid table via saveRecord natively
                // Actually, we need to map the "module" naming from UI to the dataService module key
                // we will pass the exact dataService module key as the 'module' parameter.
                await saveRecord(draft.module as any, draft.data);
                draftService.clearDraft(draft.module);
                successCount++;
            } catch (err) {
                console.error(`Falha ao sincronizar rascunho de ${draft.module}:`, err);
                failCount++;
            }
        }

        return { success: successCount, failed: failCount };
    }
};
