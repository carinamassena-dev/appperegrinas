import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isBefore,
    subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgendaEvento {
    id: string;
    titulo: string;
    data: string; // ISO date string
    categoria?: string;
    status?: string;
    tipo?: string;
}

interface AgendaGeracaoProps {
    userRole: 'Master' | 'Líder' | 'Operador';
}

const AgendaGeracao: React.FC<AgendaGeracaoProps> = ({ userRole }) => {
    const [mesAtual, setMesAtual] = useState(new Date());
    const [eventos, setEventos] = useState<AgendaEvento[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEventos = async () => {
            const { loadData } = await import('../services/dataService');
            try {
                // A Agenda lê da mesma tabela 'events' do Events.tsx
                const evs = await loadData<any>('events');
                setEventos(evs.map(e => ({
                    id: e.id,
                    titulo: e.nome,
                    data: e.dataInicio,
                    categoria: e.categoria,
                    status: e.status,
                    tipo: e.tipo
                })));
            } catch (err) {
                console.error("Erro ao carregar eventos da agenda", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEventos();
    }, []);

    const onAddEvento = async (dia: Date) => {
        const titulo = prompt("Digite o nome/título para o novo evento neste dia:");
        if (!titulo || !titulo.trim()) return;

        const { saveRecord } = await import('../services/dataService');

        const novoId = `EVT_${Date.now()}`;
        const dataIso = format(dia, 'yyyy-MM-dd');

        const fullEventStruct = {
            id: novoId,
            nome: titulo,
            descricao: 'Evento criado rapidamente pela Agenda',
            categoria: 'Outros',
            dataInicio: dataIso,
            dataTermino: dataIso,
            horario: '19:00',
            local: 'Sede / A Definir',
            tipo: 'Presencial',
            valorPadrao: 0,
            capacidadeMax: 100,
            status: 'Ativo',
            participantes: []
        };

        try {
            await saveRecord('events', fullEventStruct);
            setEventos(prev => [...prev, { id: fullEventStruct.id, titulo: fullEventStruct.nome, data: fullEventStruct.dataInicio }]);
        } catch (e) {
            console.error("Erro", e);
            alert("Erro ao salvar Evento na Agenda.");
        }
    };

    // Lógica de Auto-Limpeza: Filtra eventos com mais de 5 dias de atraso (Segurança de Egress)
    const eventosFiltrados = useMemo(() => {
        const dataLimite = subDays(new Date(), 5);
        return eventos.filter((ev) => !isBefore(new Date(ev.data), dataLimite));
    }, [eventos]);

    const diasNoMes = eachDayOfInterval({
        start: startOfMonth(mesAtual),
        end: endOfMonth(mesAtual),
    });

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden font-sans">
            {/* Header Institucional */}
            <div className="bg-black p-6 text-white flex justify-between items-center border-b-[6px] border-lime-peregrinas">
                <button onClick={() => setMesAtual(subMonths(mesAtual, 1))} className="hover:text-lime-peregrinas transition-colors">
                    <ChevronLeft />
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-black capitalize tracking-tight uppercase">
                        {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <p className="text-[10px] text-lime-400 font-bold uppercase tracking-widest mt-1">Agenda da Geração</p>
                </div>
                <button onClick={() => setMesAtual(addMonths(mesAtual, 1))} className="hover:text-lime-peregrinas transition-colors">
                    <ChevronRight />
                </button>
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div className="p-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i}>{d}</div>
                ))}
            </div>

            {/* Grade do Calendário */}
            <div className="grid grid-cols-7 gap-2 p-4 pt-0">
                {diasNoMes.map((dia) => {
                    const eventosDoDia = eventosFiltrados.filter((ev) =>
                        isSameDay(new Date(ev.data), dia)
                    );
                    const ehHoje = isSameDay(dia, new Date());

                    return (
                        <div
                            key={dia.toString()}
                            className={`min-h-[80px] p-1 rounded-xl border transition-all ${ehHoje
                                ? 'bg-lime-50 border-lime-300 shadow-inner'
                                : 'bg-white border-gray-100'
                                }`}
                        >
                            <span
                                className={`text-[10px] font-black ${ehHoje ? 'text-lime-700' : 'text-gray-400'
                                    }`}
                            >
                                {format(dia, 'd')}
                            </span>

                            <div className="flex flex-col gap-1 mt-1">
                                {eventosDoDia.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="bg-gray-900 text-lime-400 text-[9px] p-1.5 rounded-md leading-tight border border-black font-bold uppercase tracking-tighter"
                                    >
                                        {ev.titulo}
                                    </div>
                                ))}
                            </div>

                            {/* Botão de Adicionar (Apenas Líderes/Master) */}
                            {(userRole === 'Master' || userRole === 'Líder') && (
                                <button
                                    onClick={() => onAddEvento(dia)}
                                    className="w-full mt-1 opacity-0 hover:opacity-100 flex justify-center text-lime-600 transition-opacity"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-white/80 text-[10px] text-gray-400 flex items-center gap-2">
                <CalendarIcon size={12} />
                <span>
                    Eventos passados (5 dias+) são removidos automaticamente para manter o app leve.
                </span>
            </div>
        </div>
    );
};

export default AgendaGeracao;
