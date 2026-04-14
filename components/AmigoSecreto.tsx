import React, { useState, useContext, useEffect } from 'react';
import { Gift, Search, Send, CheckCircle, RefreshCcw, Loader2, ArrowRight } from 'lucide-react';
import { AuthContext, hasPermission } from '../App';

import { supabaseService } from '../services/supabaseService';
import { getHistoricoSorteiosAmigoSecreto, saveAmigoSecretoBatch, loadDisciplesForAmigoSecreto } from '../services/dataService';
import { Disciple } from '../types';

export const AmigoSecreto: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [disciples, setDisciples] = useState<Disciple[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);

    const [historico, setHistorico] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Buscando apenas dados essenciais via endpoint ultra leve
            const ativas = await loadDisciplesForAmigoSecreto();
            setDisciples(ativas);

            const hist = await getHistoricoSorteiosAmigoSecreto();
            setHistorico(hist);
        } catch (error) {
            console.error(error);
            alert("Erro ao buscar dados do Supabase.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: string, isChecked: boolean) => {
        const newSet = new Set(selectedIds);
        if (isChecked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const selecionarTodas = () => {
        if (selectedIds.size === filteredDisciples.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDisciples.map(d => d.id)));
        }
    };

    const cleanNumber = (phone: string | undefined) => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('55')) return cleaned;
        return `55${cleaned}`;
    };

    const handleSortear = async () => {
        if (!hasPermission(user as any, 'amigo_secreto', 'edit')) {
            return alert("Você não possui permissão para realizar o sorteio.");
        }

        if (selectedIds.size < 3) {
            return alert("Selecione pelo menos 3 participantes para o amigo secreto.");
        }

        if (!confirm(`Confirmar o sorteio entre as ${selectedIds.size} participantes selecionadas? Os links definitivos serão gerados e não poderão ser alterados.`)) {
            return;
        }


        setIsDrawing(true);

        try {
            const participantes = disciples.filter(d => selectedIds.has(d.id));
            let shuffled = [...participantes];

            // Lógica de Embaralhamento (Garante que ninguém tira si mesmo)
            let valido = false;
            while (!valido) {
                shuffled.sort(() => Math.random() - 0.5);
                valido = true;
                for (let i = 0; i < participantes.length; i++) {
                    if (participantes[i].id === shuffled[i].id) {
                        valido = false;
                        break;
                    }
                }
            }

            const grupo_id = crypto.randomUUID();

            const recordsToSave = participantes.map((p, index) => {
                const sorteado = shuffled[index];
                return {
                    grupo_id,
                    nome_participante: p.nome,
                    whatsapp_participante: p.whatsapp,
                    nome_sorteado: sorteado.nome,
                    token: crypto.randomUUID()
                };
            });

            await saveAmigoSecretoBatch(recordsToSave);

            alert('Sorteio realizado com sucesso! Os links únicos foram gerados.');
            setSelectedIds(new Set());
            loadData(); // Atualiza histórico

        } catch (error) {
            console.error(error);
            alert("Erro ao realizar o sorteio.");
        } finally {
            setIsDrawing(false);
        }
    };

    const handleSendWhatsApp = (nome: string, telefone: string, token: string) => {
        if (!hasPermission(user as any, 'amigo_secreto', 'edit')) {
            return alert("Você não possui permissão para enviar o link.");
        }

        const url = `${window.location.origin}/#/revelar?id=${token}`;
        const number = cleanNumber(telefone);

        if (!number || number.length < 10) {
            return alert("O número de WhatsApp desta discípula parece estar inválido ou em branco na ficha.");
        }

        const msg = `Olá *${nome}*! 🎁\n\nO nosso sorteio do Amigo Secreto acabou de acontecer!\nPara descobrir quem você tirou de forma secreta e segura, clique no seu link único abaixo:\n\n🔗 ${url}\n\n_Guarde esse link só para você!_`;

        window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filteredDisciples = disciples.filter(d =>
        d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.liderDireta && d.liderDireta.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Agrupar histórico por grupo_id
    const historicoAgrupado = historico.reduce((acc, curr) => {
        if (!acc[curr.grupo_id]) {
            acc[curr.grupo_id] = {
                data: curr.created_at,
                participantes: []
            };
        }
        acc[curr.grupo_id].participantes.push(curr);
        return acc;
    }, {} as Record<string, { data: string, participantes: any[] }>);


    return (
        <div className="space-y-6 animate-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900 flex items-center gap-3">
                        <Gift className="text-lime-500" size={32} />
                        Amigo Secreto
                    </h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Sorteio Inteligente com Revelação via Link</p>
                </div>
                <button
                    onClick={handleSortear}
                    disabled={isDrawing || selectedIds.size < 3}
                    className={`px-6 py-4 rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 transition-all w-full md:w-auto ${selectedIds.size >= 3
                        ? 'bg-black text-white hover:scale-105 active:scale-95 cursor-pointer'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                >
                    {isDrawing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    Realizar Sorteio ({selectedIds.size})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
                {/* Painel Esquerdo: Seleção para Novo Sorteio */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">1. Selecionar Participantes</h2>
                        <span className="text-xs font-bold bg-lime-100 text-lime-700 px-3 py-1 rounded-full">{selectedIds.size} Selecionadas</span>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou líder..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl font-bold outline-none border-none text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-between items-center px-2 mb-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer hover:text-black transition-colors">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                                checked={selectedIds.size === filteredDisciples.length && filteredDisciples.length > 0}
                                onChange={selecionarTodas}
                            />
                            Selecionar Listadas
                        </label>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {isLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : filteredDisciples.map(d => (
                            <label key={d.id} className={`flex items-center gap-4 p-3 rounded-2xl border cursor-pointer transition-all ${selectedIds.has(d.id) ? 'bg-lime-50 border-lime-200' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                                    checked={selectedIds.has(d.id)}
                                    onChange={(e) => toggleSelection(d.id, e.target.checked)}
                                />
                                <div className="flex-1">
                                    <h3 className="text-sm font-black text-gray-900 uppercase truncate">{d.nome}</h3>
                                    <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase truncate">{d.liderDireta || 'Sem Líder'}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Painel Direito: Histórico e Compartilhamento */}
                <div className="space-y-6">
                    <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-lime-400 mb-1">Como Funciona?</h2>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-sm">
                                Ao sortear, links únicos serão validados no banco de dados. Os nomes sorteados são camuflados. Só a participante saberá quem tirou ao abrir o link.
                            </p>
                        </div>
                        <Gift className="text-gray-800 hidden sm:block opacity-50" size={64} />
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 px-2 pt-2">2. Últimos Sorteios & Links</h2>

                    <div className="space-y-4">
                        {Object.keys(historicoAgrupado).length === 0 && !isLoading && (
                            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhum sorteio realizado ainda.</p>
                            </div>
                        )}

                        {Object.entries(historicoAgrupado).map(([grupoId, data]: [string, any]) => (
                            <div key={grupoId} className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-5 py-3 border-b flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        SORTEIO: {new Date(data.data).toLocaleDateString()}
                                    </span>
                                    <span className="bg-black text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                        {data.participantes.length} Participantes
                                    </span>
                                </div>
                                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {data.participantes.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-xs font-black text-gray-900 uppercase truncate">{p.nome_participante}</p>
                                                <p className="text-[10px] text-gray-400 font-bold truncate">Tirou alguém no Sigilo 🤫</p>
                                            </div>
                                            <button
                                                onClick={() => handleSendWhatsApp(p.nome_participante, p.whatsapp_participante, p.token)}
                                                className="shrink-0 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white p-3 rounded-full transition-all flex items-center justify-center shadow-sm"
                                                title="Enviar Link de Revelação via WhatsApp"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
