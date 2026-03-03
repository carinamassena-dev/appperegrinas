
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, Palette, LayoutGrid, Settings, Columns, Save, RotateCcw,
    ChevronDown, GripVertical, Eye, EyeOff, Check, Monitor, Type,
    Circle, Square, Info, Zap, Plus, Trash, Edit3
} from 'lucide-react';
import { logAction } from '../services/auditService';
import { AuthContext } from '../App';
import { useContext } from 'react';
import {
    getConfig, saveConfig, applyThemeToDOM,
    DEFAULT_THEME, DEFAULT_CONFIG, SCREEN_DEFINITIONS,
    UIConfig, UITheme, ScreenColumnConfig
} from '../services/uiConfigService';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

type Tab = 'colors' | 'fields' | 'tables' | 'general';

// ─── Preset palettes ─────────────────────────────────────────────────────────
const PALETTES = [
    { name: 'Peregrinas (Padrão)', primary: '#CCFF00', text: '#000000' },
    { name: 'Violeta Royal', primary: '#8B5CF6', text: '#FFFFFF' },
    { name: 'Coral Sunset', primary: '#F97316', text: '#FFFFFF' },
    { name: 'Oceano Profundo', primary: '#0EA5E9', text: '#FFFFFF' },
    { name: 'Rosa Neon', primary: '#EC4899', text: '#FFFFFF' },
    { name: 'Esmeralda', primary: '#10B981', text: '#FFFFFF' },
    { name: 'Âmbar', primary: '#F59E0B', text: '#000000' },
    { name: 'Slate Dark', primary: '#475569', text: '#FFFFFF' },
];

const FONTS = ['Inter', 'Roboto', 'Outfit', 'Poppins', 'Montserrat'];

const RADII = [
    { label: 'Quadrado', value: '0.5rem' },
    { label: 'Suave', value: '1rem' },
    { label: 'Padrão', value: '2rem' },
    { label: 'Arredond', value: '3rem' },
    { label: 'Pill', value: '9999px' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const MasterEditModal: React.FC<Props> = ({ onClose }) => {
    const [tab, setTab] = useState<Tab>('colors');
    const [config, setConfig] = useState<UIConfig>(getConfig());
    const [theme, setTheme] = useState<UITheme>(getConfig().theme);
    const [selectedScreen, setSelectedScreen] = useState<string>('disciples');
    const [saved, setSaved] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const { user } = useContext(AuthContext)!;

    // Fields CRUD State
    const [isAddingField, setIsAddingField] = useState(false);
    const [newField, setNewField] = useState({ key: '', label: '', visible: true });
    const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);

    // Live-preview theme as user changes values
    useEffect(() => { applyThemeToDOM(theme); }, [theme]);

    const handleSaveAll = () => {
        const updated: UIConfig = { ...config, theme };
        saveConfig(updated);
        setConfig(updated);
        applyThemeToDOM(theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleResetTheme = () => {
        setTheme(DEFAULT_THEME);
    };

    // ── Column helpers ─────────────────────────────────────────────────────────
    const getColumns = (): ScreenColumnConfig[] => {
        const cols = config.screens[selectedScreen]?.columns;
        if (!cols) return [];
        return [...cols].sort((a, b) => a.order - b.order);
    };

    const updateColumns = (cols: ScreenColumnConfig[]) => {
        setConfig(prev => ({
            ...prev,
            screens: {
                ...prev.screens,
                [selectedScreen]: {
                    ...prev.screens[selectedScreen],
                    columns: cols.map((c, i) => ({ ...c, order: i })),
                },
            },
        }));
    };

    const toggleColumn = (key: string) => {
        const cols = getColumns().map(c => c.key === key ? { ...c, visible: !c.visible } : c);
        updateColumns(cols);
    };

    const renameColumn = (key: string, label: string) => {
        const cols = getColumns().map(c => c.key === key ? { ...c, label } : c);
        updateColumns(cols);
    };

    const handleCreateField = () => {
        if (!newField.key || !newField.label) return alert("Preencha chave e label!");
        const cols = getColumns();
        if (cols.some(c => c.key === newField.key)) return alert("Esta chave já existe!");

        const updated = [...cols, { ...newField, order: cols.length }];
        updateColumns(updated);
        logAction(user?.nome || 'Master', "Campo Criado", `Novo campo '${newField.label}' (${newField.key}) na tela ${selectedScreen}`, "UI");
        setNewField({ key: '', label: '', visible: true });
        setIsAddingField(false);
    };

    const handleDeleteField = (key: string) => {
        const criticalFields = ['id', 'nome', 'data', 'valor'];
        if (criticalFields.includes(key)) return alert("Este campo é crítico para o sistema e não pode ser excluído.");

        if (!confirm("Tem certeza que deseja excluir este campo? Todos os dados associados a esta chave na visualização serão perdidos.")) return;

        const colToDelete = getColumns().find(c => c.key === key);
        const updated = getColumns().filter(c => c.key !== key);
        updateColumns(updated);
        logAction(user?.nome || 'Master', "Campo Excluído", `Campo '${colToDelete?.label}' (${key}) removido da tela ${selectedScreen}`, "UI");
    };

    // ── Drag-and-drop ──────────────────────────────────────────────────────────
    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const cols = getColumns();
        const reordered = [...cols];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(idx, 0, moved);
        updateColumns(reordered);
        setDragIdx(idx);
    };
    const handleDragEnd = () => setDragIdx(null);

    // ── Log on load toggle ─────────────────────────────────────────────────────
    const toggleLog = (screen: string) => {
        setConfig(prev => ({
            ...prev,
            screens: {
                ...prev.screens,
                [screen]: {
                    ...prev.screens[screen],
                    logOnLoad: !prev.screens[screen]?.logOnLoad,
                },
            },
        }));
    };

    // ── Hidden elements toggle ─────────────────────────────────────────────────
    const HIDEABLE = [
        { key: 'bottomNav', label: 'Barra de navegação inferior (mobile)' },
        { key: 'fab', label: 'Botão flutuante (+)' },
        { key: 'sidebarLogo', label: 'Logo no sidebar' },
    ];

    const toggleHidden = (screen: string, elKey: string) => {
        setConfig(prev => {
            const current = prev.screens[screen]?.hiddenElements || [];
            const updated = current.includes(elKey)
                ? current.filter(x => x !== elKey)
                : [...current, elKey];
            return {
                ...prev,
                screens: {
                    ...prev.screens,
                    [screen]: { ...prev.screens[screen], hiddenElements: updated },
                },
            };
        });
    };

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b bg-gray-950 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-lime-400 rounded-2xl flex items-center justify-center">
                            <Zap size={20} className="text-black" fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-xl uppercase tracking-tight">Editor Master</h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Personalização exclusiva</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="flex border-b bg-gray-50 px-4 pt-4 gap-1">
                    {([
                        { id: 'colors', label: 'Cores', icon: Palette },
                        { id: 'fields', label: 'Campos', icon: Columns },
                        { id: 'tables', label: 'Tabelas', icon: LayoutGrid },
                        { id: 'general', label: 'Geral', icon: Settings },
                    ] as { id: Tab; label: string; icon: any }[]).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${tab === t.id
                                ? 'bg-white border-black text-black shadow-sm'
                                : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <t.icon size={14} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* ─── TAB: CORES ─────────────────────────────────────────── */}
                    {tab === 'colors' && (
                        <div className="space-y-8">
                            {/* Palettes */}
                            <section>
                                <SectionTitle icon={Palette} label="Paletas Pré-definidas" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                    {PALETTES.map(p => (
                                        <button
                                            key={p.name}
                                            onClick={() => setTheme({ ...theme, primaryColor: p.primary, primaryText: p.text })}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all group hover:scale-105 ${theme.primaryColor === p.primary ? 'border-gray-900 shadow-lg scale-105' : 'border-gray-100'
                                                }`}
                                        >
                                            <div className="w-full h-8 rounded-xl mb-3 border border-black/10" style={{ backgroundColor: p.primary }} />
                                            <p className="text-[9px] font-black uppercase text-gray-600 leading-tight">{p.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Custom Color */}
                            <section>
                                <SectionTitle icon={Circle} label="Cor Personalizada" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <ColorPicker
                                        label="Cor Primária (Botões/Destaque)"
                                        value={theme.primaryColor}
                                        onChange={c => setTheme({ ...theme, primaryColor: c })}
                                    />
                                    <ColorPicker
                                        label="Texto sobre a Cor Primária"
                                        value={theme.primaryText}
                                        onChange={c => setTheme({ ...theme, primaryText: c })}
                                    />
                                    <ColorPicker
                                        label="Cor de Fundo"
                                        value={theme.bgColor}
                                        onChange={c => setTheme({ ...theme, bgColor: c })}
                                    />
                                    <ColorPicker
                                        label="Cor dos Cards"
                                        value={theme.cardColor}
                                        onChange={c => setTheme({ ...theme, cardColor: c })}
                                    />
                                </div>
                            </section>

                            {/* Font */}
                            <section>
                                <SectionTitle icon={Type} label="Tipografia" />
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                                    {FONTS.map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setTheme({ ...theme, fontFamily: f })}
                                            className={`p-4 rounded-2xl border-2 text-center font-bold text-sm transition-all hover:scale-105 ${theme.fontFamily === f ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-700'
                                                }`}
                                            style={{ fontFamily: f }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Border Radius */}
                            <section>
                                <SectionTitle icon={Square} label="Arredondamento dos Cantos" />
                                <div className="grid grid-cols-5 gap-3 mt-4">
                                    {RADII.map(r => (
                                        <button
                                            key={r.value}
                                            onClick={() => setTheme({ ...theme, borderRadius: r.value })}
                                            className={`p-4 border-2 flex flex-col items-center gap-2 transition-all hover:scale-105 ${theme.borderRadius === r.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-600'
                                                }`}
                                            style={{ borderRadius: r.value }}
                                        >
                                            <div className="w-8 h-6 border-2 border-current" style={{ borderRadius: r.value }} />
                                            <p className="text-[9px] font-black uppercase">{r.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Preview Badge */}
                            <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center space-y-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Preview ao Vivo</p>
                                <button
                                    style={{ backgroundColor: theme.primaryColor, color: theme.primaryText, borderRadius: theme.borderRadius, fontFamily: theme.fontFamily }}
                                    className="px-8 py-3 font-black text-xs uppercase tracking-widest shadow-xl"
                                >
                                    Botão Exemplo
                                </button>
                            </div>

                            <button onClick={handleResetTheme} className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-red-500 transition-colors">
                                <RotateCcw size={14} /> Resetar para Padrão (Peregrinas)
                            </button>
                        </div>
                    )}

                    {/* ─── TAB: CAMPOS ────────────────────────────────────────── */}
                    {tab === 'fields' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <SectionTitle icon={Columns} label="Configurar Campos" />
                                    <ScreenSelect value={selectedScreen} onChange={setSelectedScreen} />
                                </div>
                                <button
                                    onClick={() => setIsAddingField(true)}
                                    className="px-4 py-2 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
                                >
                                    <Plus size={14} /> Novo Campo
                                </button>
                            </div>

                            {isAddingField && (
                                <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 animate-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] font-black uppercase text-gray-500">Adicionar Novo Campo à Tela</h4>
                                        <button onClick={() => setIsAddingField(false)}><X size={16} /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Chave Técnica (ex: profissao)</label>
                                            <input
                                                type="text"
                                                value={newField.key}
                                                onChange={e => setNewField({ ...newField, key: e.target.value })}
                                                className="w-full p-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                                                placeholder="ex: data_nascimento"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Label Exibido</label>
                                            <input
                                                type="text"
                                                value={newField.label}
                                                onChange={e => setNewField({ ...newField, label: e.target.value })}
                                                className="w-full p-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                                                placeholder="ex: Data de Nascimento"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button onClick={() => setIsAddingField(false)} className="px-4 py-2 text-[9px] font-black uppercase text-gray-400">Cancelar</button>
                                        <button onClick={handleCreateField} className="px-6 py-2 bg-lime-400 text-black rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md">Criar Campo</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {getColumns().map(col => (
                                    <div
                                        key={col.key}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${col.visible ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-50 opacity-60'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleColumn(col.key)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${col.visible ? 'bg-lime-400 text-black' : 'bg-gray-200 text-gray-400'
                                                }`}
                                        >
                                            {col.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[9px] font-black uppercase text-gray-400">Chave: {col.key}</p>
                                            <input
                                                type="text"
                                                value={col.label}
                                                onChange={e => renameColumn(col.key, e.target.value)}
                                                className="w-full bg-transparent font-black text-sm text-gray-800 outline-none border-b border-transparent focus:border-gray-300 transition-colors"
                                                placeholder="Label da coluna..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${col.visible ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {col.visible ? 'Visível' : 'Oculto'}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteField(col.key)}
                                                className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: TABELAS ───────────────────────────────────────── */}
                    {tab === 'tables' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <SectionTitle icon={LayoutGrid} label="Reorganizar Colunas" />
                                <ScreenSelect value={selectedScreen} onChange={setSelectedScreen} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Arraste para reordenar. Marque para mostrar/ocultar cada coluna na tabela.
                            </p>

                            <div className="space-y-2">
                                {getColumns().map((col, idx) => (
                                    <div
                                        key={col.key}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={e => handleDragOver(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border cursor-grab active:cursor-grabbing transition-all select-none ${dragIdx === idx
                                            ? 'opacity-40 scale-95'
                                            : col.visible
                                                ? 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                                                : 'bg-gray-50 border-gray-50 opacity-50'
                                            }`}
                                    >
                                        <div className="text-gray-300 flex-shrink-0">
                                            <GripVertical size={20} />
                                        </div>
                                        <span className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 flex-shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-black text-sm text-gray-800">{col.label}</p>
                                            <p className="text-[9px] text-gray-400 font-bold">{col.key}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleColumn(col.key)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${col.visible
                                                ? 'bg-lime-50 text-lime-700 hover:bg-lime-100'
                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                        >
                                            {col.visible ? <><Eye size={12} /> Visível</> : <><EyeOff size={12} /> Oculto</>}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center gap-4 text-gray-400">
                                <Info size={18} className="flex-shrink-0" />
                                <p className="text-[10px] font-bold leading-relaxed">
                                    A ordem e visibilidade configuradas aqui ficam salvas no banco de configurações e serão aplicadas ao recarregar.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: GERAL ─────────────────────────────────────────── */}
                    {tab === 'general' && (
                        <div className="space-y-8">
                            {/* Log on load */}
                            <section>
                                <SectionTitle icon={Monitor} label="Log 'Tela Carregada' no Console" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 mb-4">
                                    Ative por tela para registrar no console quando a tela for carregada.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(SCREEN_DEFINITIONS).map(([key, def]) => (
                                        <div key={key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                            <div>
                                                <p className="font-black text-sm text-gray-800">{def.label}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase">/{key}</p>
                                            </div>
                                            <Toggle
                                                value={!!config.screens[key]?.logOnLoad}
                                                onChange={() => toggleLog(key)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Hide elements */}
                            <section>
                                <SectionTitle icon={EyeOff} label="Ocultar Elementos de Interface" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 mb-4">
                                    Ative para ocultar elementos globais do layout.
                                </p>
                                <div className="flex items-center gap-2 mb-4">
                                    <ScreenSelect value={selectedScreen} onChange={setSelectedScreen} />
                                </div>
                                <div className="space-y-3">
                                    {HIDEABLE.map(el => (
                                        <div key={el.key} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                                            <p className="font-bold text-sm text-gray-700">{el.label}</p>
                                            <Toggle
                                                value={config.screens[selectedScreen]?.hiddenElements?.includes(el.key) ?? false}
                                                onChange={() => toggleHidden(selectedScreen, el.key)}
                                                activeColor="bg-red-500"
                                                activeLabel="Oculto"
                                                inactiveLabel="Visível"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Metadata */}
                            <section className="p-6 bg-gray-900 rounded-2xl text-white space-y-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Informações do Banco de Config</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-[9px] uppercase font-black">Última Modificação</p>
                                        <p className="font-bold text-xs">{new Date(config.lastModified).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[9px] uppercase font-black">Versão Config</p>
                                        <p className="font-bold text-xs">v{config.version}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { saveConfig({ ...DEFAULT_CONFIG, screens: config.screens }); setTheme(DEFAULT_THEME); }}
                                    className="w-full mt-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Resetar TODAS as configurações
                                </button>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-8 py-5 flex items-center justify-between bg-gray-50 rounded-b-[2.5rem]">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                        Acesso restrito ao usuário Master
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-black text-xs uppercase text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleSaveAll}
                            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all ${saved ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black'
                                }`}
                        >
                            {saved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar Configurações</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-xl"><Icon size={16} className="text-gray-600" /></div>
        <h3 className="font-black text-base uppercase tracking-tight text-gray-800">{label}</h3>
    </div>
);

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black uppercase text-gray-400">{label}</label>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <input
                type="color"
                value={value}
                onChange={e => { onChange(e.target.value); console.log('campo alterado'); }}
                className="w-10 h-10 rounded-xl border-none cursor-pointer bg-transparent"
            />
            <span className="font-black text-sm text-gray-700 uppercase tracking-widest">{value}</span>
        </div>
    </div>
);

const ScreenSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
        value={value}
        onChange={e => { onChange(e.target.value); console.log('campo alterado'); }}
        className="bg-gray-100 px-4 py-2.5 rounded-xl font-black text-xs uppercase outline-none cursor-pointer text-gray-700"
    >
        {Object.entries(SCREEN_DEFINITIONS).map(([k, d]) => (
            <option key={k} value={k}>{d.label}</option>
        ))}
    </select>
);

const Toggle = ({
    value, onChange,
    activeColor = 'bg-lime-400',
    activeLabel = 'Ativo',
    inactiveLabel = 'Inativo'
}: {
    value: boolean; onChange: () => void;
    activeColor?: string; activeLabel?: string; inactiveLabel?: string;
}) => (
    <button
        onClick={() => { onChange(); console.log('Botão clicado'); }}
        className={`relative w-16 h-8 rounded-full transition-all flex items-center px-1 ${value ? activeColor : 'bg-gray-200'}`}
    >
        <span className={`absolute w-6 h-6 bg-white rounded-full shadow-md transition-all ${value ? 'translate-x-8' : 'translate-x-0'}`} />
        <span className="sr-only">{value ? activeLabel : inactiveLabel}</span>
    </button>
);

export default MasterEditModal;
