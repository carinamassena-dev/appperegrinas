import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    eachDayOfInterval, isSameDay, isBefore, subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AgendaEvento {
    id: string;
    titulo: string;
    data: string; // ISO date string
    descricao?: string;
    horario?: string;
    local?: string;
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

    // Modal States
    const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit' | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvento | null>(null);

    // Form States
    const [formData, setFormData] = useState({ titulo: '', data: '', horario: '19:00', local: '', descricao: '' });

    useEffect(() => {
        fetchEventos();
    }, []);

    const fetchEventos = async () => {
        const { loadData } = await import('../services/dataService');
        try {
            const evs = await loadData<any>('events');
            setEventos(evs.map(e => ({
                id: e.id,
                titulo: e.nome,
                data: e.dataInicio,
                descricao: e.descricao || '',
                horario: e.horario || '',
                local: e.local || '',
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

    const openCreateModal = (dia: Date) => {
        setSelectedDate(dia);
        const dataStr = format(dia, 'yyyy-MM-dd');
        setFormData({ titulo: '', data: dataStr, horario: '19:00', local: 'Sede / A Definir', descricao: '' });
        setModalMode('create');
    };

    const openViewModal = (evento: AgendaEvento) => {
        setSelectedEvent(evento);
        setModalMode('view');
    };

    const openEditModal = () => {
        if (!selectedEvent) return;
        setFormData({
            titulo: selectedEvent.titulo,
            data: selectedEvent.data,
            horario: selectedEvent.horario || '19:00',
            local: selectedEvent.local || '',
            descricao: selectedEvent.descricao || ''
        });
        setModalMode('edit');
    };

    const handleSave = async () => {
        if (!formData.titulo.trim()) return alert("O título é obrigatório.");
        const { saveRecord } = await import('../services/dataService');

        try {
            const dataIso = formData.data || (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : (selectedEvent?.data || new Date().toISOString()));
            const evId = modalMode === 'edit' && selectedEvent ? selectedEvent.id : crypto.randomUUID();

            const fullEventStruct = {
                id: evId,
                nome: formData.titulo,
                descricao: formData.descricao,
                categoria: 'Outros',
                dataInicio: dataIso,
                dataTermino: dataIso,
                horario: formData.horario,
                local: formData.local,
                tipo: 'Presencial',
                valorPadrao: 0,
                capacidadeMax: 100,
                status: 'Ativo',
                participantes: []
            };

            await saveRecord('events', fullEventStruct);
            setModalMode(null);
            fetchEventos(); // Reload from DB
        } catch (e) {
            console.error("Erro", e);
            alert("Erro ao salvar Evento na Agenda.");
        }
    };

    const handleDelete = async () => {
        if (!selectedEvent) return;
        if (!confirm(`Remover definitivamente o evento "${selectedEvent.titulo}"?`)) return;

        const { deleteRecord } = await import('../services/dataService');
        try {
            await deleteRecord('events', selectedEvent.id);
            setModalMode(null);
            fetchEventos();
        } catch (e) {
            console.error("Erro", e);
            alert("Erro ao remover o Evento.");
        }
    };

    const eventosFiltrados = useMemo(() => {
        const dataLimite = subDays(new Date(), 5);
        return eventos.filter((ev) => !isBefore(new Date(ev.data), dataLimite));
    }, [eventos]);

    const diasNoMes = eachDayOfInterval({
        start: startOfMonth(mesAtual),
        end: endOfMonth(mesAtual),
    });

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden font-sans relative pb-8">
            {/* Header Institucional */}
            <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100">
                <button onClick={() => setMesAtual(subMonths(mesAtual, 1))} className="hover:bg-gray-100 transition-colors p-2 rounded-full">
                    <ChevronLeft />
                </button>
                <div className="text-center">
                    <h2 className="text-[22px] font-extrabold tracking-tight leading-tight uppercase text-gray-900">
                        {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <p className="text-[10px] text-lime-600 font-bold uppercase tracking-widest mt-1">Agenda da Geração</p>
                </div>
                <button onClick={() => setMesAtual(addMonths(mesAtual, 1))} className="hover:bg-gray-100 transition-colors p-2 rounded-full">
                    <ChevronRight />
                </button>
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div className="p-4 grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                    <div key={i}>{d}</div>
                ))}
            </div>

            {/* Grade do Calendário */}
            <div className="grid grid-cols-7 gap-2 p-4 pt-0">
                {/* Dias vazios para alinhar o início do mês */}
                {Array.from({ length: startOfMonth(mesAtual).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[90px] p-1.5 rounded-2xl border border-transparent bg-gray-50/30 opacity-20" />
                ))}

                {diasNoMes.map((dia) => {
                    const dataStr = format(dia, 'yyyy-MM-dd');
                    const eventosDoDia = eventosFiltrados.filter((ev) => ev.data === dataStr);
                    const ehHoje = isSameDay(dia, new Date());

                    return (
                        <div
                            key={dia.toString()}
                            className={`min-h-[90px] p-1.5 rounded-2xl border transition-all flex flex-col group ${ehHoje
                                ? 'bg-lime-50 border-lime-300 shadow-inner'
                                : 'bg-white border-gray-100 hover:border-gray-300'
                                }`}
                        >
                            <span className={`text-xs ml-1 font-black ${ehHoje ? 'text-lime-700' : 'text-gray-500'}`}>
                                {format(dia, 'd')}
                            </span>

                            <div className="flex flex-col gap-1.5 mt-2 flex-1">
                                {eventosDoDia.map((ev) => (
                                    <button
                                        key={ev.id}
                                        onClick={() => openViewModal(ev)}
                                        className="text-left bg-black text-lime-400 hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all text-[9px] p-1.5 rounded-lg leading-tight border border-gray-900 font-black uppercase tracking-tighter truncate w-full shadow-sm"
                                    >
                                        {ev.titulo}
                                    </button>
                                ))}
                            </div>

                            {/* Botão de Adicionar */}
                            {(userRole === 'Master' || userRole === 'Líder') && (
                                <button
                                    onClick={() => openCreateModal(dia)}
                                    className="w-full mt-2 opacity-0 group-hover:opacity-100 flex justify-center text-gray-300 hover:text-lime-600 transition-all pb-1"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="px-6 py-4 bg-gray-50 text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 border-t">
                <AlertCircle size={14} className="text-yellow-500" />
                <span>Eventos passados (5 dias+) são removidos p/ performance.</span>
            </div>

            {/* --- MODAIS DE CRUD --- */}
            {modalMode && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* HEADER MODAL */}
                        <div className="bg-black p-5 flex justify-between items-center text-white border-b-4 border-lime-peregrinas">
                            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <CalendarIcon size={18} className="text-lime-500" />
                                {modalMode === 'create' ? 'Novo Evento' : modalMode === 'edit' ? 'Editar Evento' : 'Detalhes do Evento'}
                            </h3>
                            <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-white transition-colors bg-gray-900 rounded-full p-2"><X size={16} /></button>
                        </div>

                        {/* VIEW MODE */}
                        {modalMode === 'view' && selectedEvent && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <p className="text-lime-600 text-[10px] font-black uppercase tracking-widest mb-1">{format(new Date(selectedEvent.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase leading-tight">{selectedEvent.titulo}</h2>
                                    {selectedEvent.descricao && <p className="text-sm text-gray-600 mt-3 font-medium">{selectedEvent.descricao}</p>}
                                </div>

                                <div className="space-y-3 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                        <Clock size={16} className="text-gray-400" />
                                        {selectedEvent.horario || 'Horário indefinido'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                        <MapPin size={16} className="text-gray-400" />
                                        {selectedEvent.local || 'Local indefinido'}
                                    </div>
                                </div>

                                {(userRole === 'Master' || userRole === 'Líder') && (
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={openEditModal} className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors">
                                            <Edit2 size={16} /> Editar
                                        </button>
                                        <button onClick={handleDelete} className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black text-xs uppercase hover:bg-red-500 hover:text-white flex items-center justify-center gap-2 transition-all">
                                            <Trash2 size={16} /> Excluir
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CREATE / EDIT MODE */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Título do Evento</label>
                                    <input
                                        type="text"
                                        value={formData.titulo}
                                        onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                        className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-black outline-none"
                                        placeholder="Ex: Reunião Célula"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Data do Evento</label>
                                        <input
                                            type="date"
                                            value={formData.data}
                                            onChange={e => setFormData({ ...formData, data: e.target.value })}
                                            className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-black outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Horário</label>
                                        <input
                                            type="time"
                                            value={formData.horario}
                                            onChange={e => setFormData({ ...formData, horario: e.target.value })}
                                            className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-black outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Local</label>
                                        <input
                                            type="text"
                                            value={formData.local}
                                            onChange={e => setFormData({ ...formData, local: e.target.value })}
                                            className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-black outline-none"
                                            placeholder="Ex: Sede"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Detalhes Adicionais</label>
                                    <textarea
                                        value={formData.descricao}
                                        onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                        className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-medium focus:border-black outline-none"
                                        rows={3}
                                    />
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="w-full mt-4 bg-lime-400 hover:bg-lime-500 text-black p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-[0_4px_14px_0_rgba(204,255,0,0.39)]"
                                >
                                    Confirmar {modalMode === 'edit' ? 'Alterações' : 'Cadastro'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaGeracao;
