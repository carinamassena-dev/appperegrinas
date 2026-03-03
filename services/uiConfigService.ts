
// uiConfigService.ts — Gerenciamento da configuração visual do app (Master only)
// Uses Supabase via dataService for persistence.
// Falls back to defaults if Supabase hasn't loaded yet.

import { loadData, saveRecord } from './dataService';

export interface UITheme {
    primaryColor: string;
    primaryText: string;
    bgColor: string;
    cardColor: string;
    fontFamily: string;
    borderRadius: string;
}

export interface ScreenColumnConfig {
    key: string;
    label: string;
    visible: boolean;
    order: number;
}

export interface ScreenConfig {
    logOnLoad: boolean;
    hiddenElements: string[];
    columns: ScreenColumnConfig[];
}

export interface UIConfig {
    theme: UITheme;
    screens: Record<string, ScreenConfig>;
    lastModified: string;
    version: number;
}

export const DEFAULT_THEME: UITheme = {
    primaryColor: '#CCFF00',
    primaryText: '#000000',
    bgColor: '#F9FAFB',
    cardColor: '#FFFFFF',
    fontFamily: 'Inter',
    borderRadius: '2rem',
};

export const SCREEN_DEFINITIONS: Record<string, { label: string; columns: Omit<ScreenColumnConfig, 'order'>[] }> = {
    disciples: {
        label: 'Peregrinas',
        columns: [
            { key: 'nome', label: 'Nome', visible: true },
            { key: 'status', label: 'Status', visible: true },
            { key: 'liderDireta', label: 'Líder', visible: true },
            { key: 'batizada', label: 'Batismo', visible: true },
            { key: 'fezEncontro', label: 'Encontro', visible: true },
            { key: 'cdStatus', label: 'Nível CD', visible: true },
            { key: 'whatsapp', label: 'WhatsApp', visible: true },
            { key: 'dataAniversario', label: 'Aniversário', visible: true },
            { key: 'profissao', label: 'Profissão', visible: false },
            { key: 'statusRelacionamento', label: 'Est. Civil', visible: false },
        ],
    },
    leaders: {
        label: 'Líderes',
        columns: [
            { key: 'nome', label: 'Nome', visible: true },
            { key: 'celula1.perfil', label: 'Perfil Célula', visible: true },
            { key: 'celula1.dia', label: 'Dia', visible: true },
            { key: 'celula1.horario', label: 'Horário', visible: true },
            { key: 'celula1.ativa', label: 'Ativa', visible: true },
            { key: 'whatsapp', label: 'WhatsApp', visible: true },
        ],
    },
    finance: {
        label: 'Financeiro',
        columns: [
            { key: 'data', label: 'Data', visible: true },
            { key: 'descricao', label: 'Descrição', visible: true },
            { key: 'responsavel', label: 'Responsável', visible: true },
            { key: 'tipo', label: 'Tipo', visible: true },
            { key: 'valor', label: 'Valor', visible: true },
            { key: 'categoria', label: 'Categoria', visible: true },
            { key: 'observacao', label: 'Observação', visible: false },
        ],
    },
    harvest: {
        label: 'Colheita',
        columns: [
            { key: 'nome', label: 'Nome', visible: true },
            { key: 'whatsapp', label: 'Telefone', visible: true },
            { key: 'bairro', label: 'Bairro', visible: true },
            { key: 'dataAbordagem', label: 'Data Abordagem', visible: true },
            { key: 'contatoFeito', label: 'Contactada', visible: true },
            { key: 'quemContactou', label: 'Quem Contactou', visible: false },
            { key: 'observacao', label: 'Observação', visible: false },
        ],
    },
    events: {
        label: 'Eventos',
        columns: [
            { key: 'nome', label: 'Nome do Evento', visible: true },
            { key: 'status', label: 'Status', visible: true },
            { key: 'dataInicio', label: 'Data', visible: true },
            { key: 'local', label: 'Local', visible: true },
            { key: 'capacidadeMax', label: 'Capacidade', visible: true },
            { key: 'tipo', label: 'Tipo', visible: true },
        ],
    },
};

function buildDefaultScreens(): Record<string, ScreenConfig> {
    const screens: Record<string, ScreenConfig> = {};
    for (const [key, def] of Object.entries(SCREEN_DEFINITIONS)) {
        screens[key] = {
            logOnLoad: false,
            hiddenElements: [],
            columns: def.columns.map((c, i) => ({ ...c, order: i })),
        };
    }
    return screens;
}

export const DEFAULT_CONFIG: UIConfig = {
    theme: DEFAULT_THEME,
    screens: buildDefaultScreens(),
    lastModified: new Date().toISOString(),
    version: 1,
};

// In-memory cache for sync access
let cachedConfig: UIConfig = { ...DEFAULT_CONFIG, screens: buildDefaultScreens() };

export function getConfig(): UIConfig {
    return cachedConfig;
}

export async function loadConfigFromSupabase(): Promise<UIConfig> {
    try {
        const configs = await loadData<any>('settings');
        const found = configs.find((c: any) => c.id === 'app_ui_config');
        if (found) {
            const parsed: UIConfig = found.data || found;
            // Merge: fill in any missing screen keys from defaults
            const defaultScreens = buildDefaultScreens();
            if (!parsed.screens) parsed.screens = defaultScreens;
            for (const key of Object.keys(defaultScreens)) {
                if (!parsed.screens[key]) {
                    parsed.screens[key] = defaultScreens[key];
                }
            }
            if (!parsed.theme) parsed.theme = DEFAULT_THEME;
            cachedConfig = parsed;
            return parsed;
        }
    } catch (err) {
        console.error('[UIConfig] Erro ao carregar config do Supabase:', err);
    }
    return { ...DEFAULT_CONFIG, screens: buildDefaultScreens() };
}

export async function saveConfig(config: UIConfig): Promise<void> {
    const updated = { ...config, lastModified: new Date().toISOString() };
    cachedConfig = updated;
    try {
        await saveRecord('settings', { id: 'app_ui_config', data: updated });
    } catch (err) {
        console.error('[UIConfig] Erro ao salvar config no Supabase:', err);
    }
}

export function applyThemeToDOM(theme?: UITheme): void {
    const t = theme || cachedConfig.theme;
    let styleEl = document.getElementById('master-theme') as HTMLStyleElement | null;
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'master-theme';
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
    :root {
      --color-primary: ${t.primaryColor};
      --color-primary-text: ${t.primaryText};
      --color-bg: ${t.bgColor};
      --color-card: ${t.cardColor};
      --font-family: '${t.fontFamily}', sans-serif;
      --border-radius: ${t.borderRadius};
    }
    body {
      background-color: var(--color-bg) !important;
      font-family: var(--font-family) !important;
    }
    .bg-lime-peregrinas {
      background-color: var(--color-primary) !important;
    }
    .text-lime-peregrinas {
      color: var(--color-primary) !important;
    }
    .border-lime-peregrinas {
      border-color: var(--color-primary) !important;
    }
  `;

    // Apply Google Fonts if needed
    const fontMap: Record<string, string> = {
        Inter: 'Inter:wght@400;700;900',
        Roboto: 'Roboto:wght@400;700;900',
        Outfit: 'Outfit:wght@400;700;900',
        Poppins: 'Poppins:wght@400;700;900',
        Montserrat: 'Montserrat:wght@400;700;900',
    };
    if (fontMap[t.fontFamily]) {
        let fontLink = document.getElementById('master-font') as HTMLLinkElement | null;
        if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = 'master-font';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
        fontLink.href = `https://fonts.googleapis.com/css2?family=${fontMap[t.fontFamily]}&display=swap`;
    }
}

// Auto-apply defaults on import (sync — uses cached config)
applyThemeToDOM();
