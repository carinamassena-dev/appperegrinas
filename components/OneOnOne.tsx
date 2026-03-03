import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, AuthContextType } from '../App';
import { Calendar, Plus, Save, X, RefreshCw, User, FileText, CheckCircle, Search, ShieldCheck, Image as ImageIcon, DownloadCloud } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';
import { loadDisciplesList } from '../services/dataService';
import imageCompression from 'browser-image-compression';

interface OneOnOneMeeting {
    id: string;
    lider_id: string;
    ovelha_id: string;
    data_encontro: string;
    assunto_principal: string;
    anotacoes_confidenciais?: string;
    proximos_passos?: string;
    created_at?: string;
}

export const OneOnOne: React.FC = () => {
    const { user } = useContext(AuthContext) as AuthContextType;
    const [meetings, setMeetings] = useState<OneOnOneMeeting[]>([]);
    const [disciples, setDisciples] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingDisciples, setLoadingDisciples] = useState(true);

    // Form State
    const [selectedDisciple, setSelectedDisciple] = useState('');
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
    const [topic, setTopic] = useState('');
    const [notes, setNotes] = useState('');
    const [nextSteps, setNextSteps] = useState('');
    const [meetingAttachment, setMeetingAttachment] = useState<File | null>(null);

    const fetchMeetings = async () => {
        if (!user?.sessionToken) return;
        setLoading(true);
        try {
            const res = await fetch('/api/one_on_one', {
                headers: {
                    'Authorization': `Bearer ${user.sessionToken}`
                }
            });
            if (!res.ok) {
                const textError = await res.text();
                console.error("ERRO BRUTO DA API (GET OneOnOne):", textError);
                throw new Error("Erro do servidor ao buscar os encontros.");
            }
            const data = await res.json();
            setMeetings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDisciples = async () => {
        setLoadingDisciples(true);
        try {
            const list = await loadDisciplesList();
            // Fallback: se a lista vier com a estrutura record.nome, ou já planificada (id, nome)
            const mappedList = list.map((item: any) => ({
                id: item.id,
                nome: item.nome || item.record?.nome || 'Sem Nome'
            }));
            setDisciples(mappedList.sort((a, b) => a.nome.localeCompare(b.nome)));
        } catch (e) {
            console.error("Catch fetchDisciples:", e);
        } finally {
            setLoadingDisciples(false);
        }
    };

    const fetchFullMeeting = async (id: string) => {
        if (!user?.sessionToken) return;
        try {
            const res = await fetch(`/api/one_on_one?id=${id}`, {
                headers: { 'Authorization': `Bearer ${user.sessionToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
            }
        } catch (err) {
            console.error("Erro ao puxar detalhes:", err);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchDisciples();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        alert("1. O clique chegou na função!");

        if (!selectedDisciple || !meetingDate || !topic || !notes) {
            alert("Por favor, preencha todos os campos obrigatórios do formulário antes de salvar.");
            return;
        }

        if (!user?.sessionToken) {
            alert('Sessão de segurança inválida. Por favor, faça login novamente.');
            return;
        }

        setSaving(true);
        try {
            let finalNotes = notes;

            if (meetingAttachment) {
                try {
                    const options = { maxSizeMB: 0.1, maxWidthOrHeight: 1280, useWebWorker: true };
                    const compressedFile = await imageCompression(meetingAttachment, options);
                    const fileExt = meetingAttachment.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const url = await supabaseService.uploadImage(compressedFile, fileName, 'one-on-one');
                    finalNotes += `\n\n📷 Anexo da Reunião: ${url}`;
                } catch (err) {
                    console.error('Erro no upload do anexo:', err);
                    alert("Falha ao comprimir e salvar a foto. O encontro será salvo sem a imagem.");
                }
            }

            const res = await fetch('/api/one_on_one', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.sessionToken}`
                },
                body: JSON.stringify({
                    lider_id: user.id,
                    ovelha_id: selectedDisciple,
                    data_encontro: meetingDate,
                    assunto_principal: topic,
                    anotacoes_confidenciais: finalNotes,
                    proximos_passos: nextSteps
                })
            });

            if (!res.ok) {
                const textError = await res.text();
                console.error("ERRO BRUTO DA API (POST OneOnOne):", textError);
                let errorMessage = 'Falha ao registrar o encontro.';
                try {
                    const parsed = JSON.parse(textError);
                    if (parsed.error) errorMessage = parsed.error;
                } catch (parseError) { }
                alert(`Erro HTTP: ${errorMessage}`);
                return;
            }

            setShowModal(false);
            setTopic('');
            setNotes('');
            setNextSteps('');
            setSelectedDisciple('');
            setMeetingAttachment(null);
            alert('Encontro pastoral salvo com sucesso e criptografado.');
            fetchMeetings();
        } catch (err: any) {
            console.error("Erro interno no formulário:", err);
            alert(`Erro de conexão com o servidor seguro: ${err.message || 'Desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    const getDiscipleName = (id: string) => {
        const d = disciples.find(d => d.id === id);
        return d ? d.nome : 'Discípula não encontrada';
    };

    const filteredMeetings = meetings.filter(m =>
        getDiscipleName(m.ovelha_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assunto_principal.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="text-lime-peregrinas" />
                        One-on-one
                    </h2>
                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        Registros Pastorais Confidenciais
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchMeetings}
                        className="flex items-center gap-2 px-4 py-3 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 border shadow-sm transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-lime-peregrinas text-black font-bold rounded-2xl shadow-lg border-2 border-transparent transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                        REGISTRAR ENCONTRO
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl p-8 border">
                <div className="mb-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar encontro por assunto ou discípula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-lime-peregrinas transition-all font-medium"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Carregando registros seguros...</div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border">
                            <ShieldCheck size={30} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhum encontro registrado ainda. Clique em 'Registrar Encontro' para começar.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMeetings.map(m => (
                            <div key={m.id} className="border border-gray-100 bg-gray-50/50 p-6 rounded-2xl flex flex-col gap-4 relative">
                                {user.role === 'Master' && m.lider_id !== user.id && (
                                    <div className="absolute top-6 right-6 text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full font-bold">
                                        Encontro de outra Líder
                                    </div>
                                )}
                                {user.role === 'Master' && m.lider_id === user.id && (
                                    <div className="absolute top-6 right-6 text-xs bg-lime-peregrinas text-black px-3 py-1 rounded-full font-bold">
                                        Seu Encontro
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white shadow-sm border rounded-xl flex items-center justify-center shrink-0">
                                        <User size={20} className="text-gray-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{getDiscipleName(m.ovelha_id)}</h3>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 uppercase">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(m.data_encontro).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-150 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                                            <FileText size={16} className="text-lime-peregrinas" /> Assunto Principal
                                        </h4>
                                        <p className="text-gray-600 text-sm leading-relaxed">{m.assunto_principal}</p>
                                    </div>
                                    {m.anotacoes_confidenciais !== undefined ? (
                                        <>
                                            {m.proximos_passos && (
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                                                        <CheckCircle size={16} className="text-lime-peregrinas" /> Próximos Passos
                                                    </h4>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{m.proximos_passos}</p>
                                                </div>
                                            )}
                                            <div className="md:col-span-2 bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl mt-4">
                                                <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <ShieldCheck size={14} /> Anotações Confidenciais
                                                </h4>
                                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{m.anotacoes_confidenciais}</p>
                                                {m.anotacoes_confidenciais.includes('📷 Anexo da Reunião:') && (
                                                    <div className="mt-3">
                                                        <a href={m.anotacoes_confidenciais.split('📷 Anexo da Reunião: ')[1]} target="_blank" rel="noreferrer" className="text-xs font-bold text-lime-600 underline">
                                                            Visualizar Foto Original
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="md:col-span-2 flex justify-start mt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); fetchFullMeeting(m.id); }}
                                                className="bg-yellow-50 text-yellow-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2 border border-yellow-200 hover:bg-yellow-100 transition-colors"
                                            >
                                                <DownloadCloud size={14} /> Ver Anotações e Detalhes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                    <ShieldCheck className="text-lime-peregrinas" />
                                    Novo Encontro
                                </h3>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Sigilo Absoluto</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-2">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Discípula</label>
                                    <select
                                        value={selectedDisciple}
                                        onChange={(e) => setSelectedDisciple(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lime-peregrinas"
                                    >
                                        <option value="">{loadingDisciples ? 'Carregando discípulas...' : 'Selecione a discípula...'}</option>
                                        {disciples.map(d => (
                                            <option key={d.id} value={d.id}>{d.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Data</label>
                                    <input
                                        type="date"
                                        value={meetingDate}
                                        onChange={(e) => setMeetingDate(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lime-peregrinas"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Assunto Principal *</label>
                                    <input
                                        type="text" placeholder="Ex: Direcionamento Ministerial"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lime-peregrinas"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase flex items-center gap-1 text-yellow-600 bg-yellow-50 px-3 py-1 rounded w-max ml-1">
                                        <ShieldCheck size={14} /> Anotações Confidenciais *
                                    </label>
                                    <textarea
                                        rows={4} placeholder="As anotações inseridas aqui são sigilosas..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full bg-yellow-50/30 border border-yellow-100 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lime-peregrinas resize-none"
                                    ></textarea>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Próximos Passos (Opcional)</label>
                                    <textarea
                                        rows={2} placeholder="Ex: Orar por 7 dias, ler livro X..."
                                        value={nextSteps}
                                        onChange={(e) => setNextSteps(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lime-peregrinas resize-none"
                                    ></textarea>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1 flex items-center gap-1">
                                        <ImageIcon size={14} /> Foto de Acompanhamento / Anexo (Max 100KB)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setMeetingAttachment(e.target.files[0]);
                                            }
                                        }}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-medium text-xs"
                                    />
                                    <p className="text-[9px] text-gray-400 pl-1 uppercase font-bold tracking-widest">
                                        Será comprimido automaticamente e salvo com segurança.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-4 font-bold text-black bg-lime-peregrinas rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-xl shadow-lime-peregrinas/20"
                                >
                                    {saving ? 'Criptografando e Salvando...' : <><Save size={20} /> SALVAR ENCONTRO</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
