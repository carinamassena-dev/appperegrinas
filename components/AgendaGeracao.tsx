import React, { useState, useMemo } from 'react';
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
}

interface AgendaGeracaoProps {
    eventos: AgendaEvento[];
    onAddEvento: (dia: Date) => void;
    onDeleteEvento?: (id: string) => void;
    userRole: 'Master' | 'Líder' | 'Operador';
}

const AgendaGeracao: React.FC<AgendaGeracaoProps> = ({
    eventos,
    onAddEvento,
    onDeleteEvento,
    userRole,
}) => {
    const [mesAtual, setMesAtual] = useState(new Date());

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
        <div className="bg-[#FFF5F8] rounded-3xl shadow-sm border border-pink-100 overflow-hidden font-sans">
            {/* Header Mimoso */}
            <div className="bg-gradient-to-r from-pink-400 to-purple-400 p-6 text-white flex justify-between items-center">
                <button onClick={() => setMesAtual(subMonths(mesAtual, 1))}>
                    <ChevronLeft />
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold capitalize">
                        {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <p className="text-xs opacity-90 italic">Planejamento das Peregrinas 🌸</p>
                </div>
                <button onClick={() => setMesAtual(addMonths(mesAtual, 1))}>
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
                                    ? 'bg-white border-pink-300 shadow-inner'
                                    : 'bg-white/50 border-gray-50'
                                }`}
                        >
                            <span
                                className={`text-[10px] font-bold ${ehHoje ? 'text-pink-500' : 'text-gray-400'
                                    }`}
                            >
                                {format(dia, 'd')}
                            </span>

                            <div className="flex flex-col gap-1 mt-1">
                                {eventosDoDia.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="bg-purple-100 text-purple-700 text-[9px] p-1 rounded-md leading-tight border border-purple-200"
                                    >
                                        {ev.titulo}
                                    </div>
                                ))}
                            </div>

                            {/* Botão de Adicionar (Apenas Líderes/Master) */}
                            {(userRole === 'Master' || userRole === 'Líder') && (
                                <button
                                    onClick={() => onAddEvento(dia)}
                                    className="w-full mt-1 opacity-0 hover:opacity-100 flex justify-center text-pink-300 transition-opacity"
                                >
                                    <Plus size={12} />
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
