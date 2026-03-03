import React, { useState, useEffect, useContext, useRef } from 'react';
import { Bell, Bookmark, Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { supabase } from '../services/supabaseClient';
import { loadDisciplesList } from '../services/dataService';
import { Ticket, Disciple } from '../types';

export const NotificationBell: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [unreadTickets, setUnreadTickets] = useState<Ticket[]>([]);
    const [todaysBirthdays, setTodaysBirthdays] = useState<Disciple[]>([]);

    useEffect(() => {
        const checkNotifications = async () => {
            try {
                // Tickets from Supabase (Lightweight)
                const { data } = await supabase.from('tickets').select('id, record->>title, record->>status, record->>creatorId');
                const t = (data || []).map(d => ({
                    id: d.id,
                    title: d.title,
                    status: d.status as string,
                    creatorId: d.creatorId as string
                }));
                const isLeaderOrMaster = user?.role === 'Master' || user?.role === 'Líder';
                const unreadT = t.filter(ticket => {
                    if (isLeaderOrMaster) {
                        return ticket.status === 'Aberto';
                    } else {
                        return ticket.creatorId === user?.id && (ticket.status === 'Respondido' || ticket.status === 'Em Andamento');
                    }
                }) as unknown as Ticket[]; // Cast needed since we only fetched partial data
                setUnreadTickets(unreadT);

                // Birthdays from Supabase via optimized list
                const d = await loadDisciplesList();
                const today = new Date();
                const bdays = d.filter(person => {
                    if (!person.dataAniversario || person.status !== 'Ativa') return false;
                    const [year, month, day] = person.dataAniversario.split('-');
                    return parseInt(month, 10) === today.getMonth() + 1 && parseInt(day, 10) === today.getDate();
                });
                setTodaysBirthdays(bdays);
            } catch (err) {
                console.error('Erro ao carregar notificações:', err);
            }
        };

        if (user) {
            checkNotifications();
            const interval = setInterval(checkNotifications, 60000);
            window.addEventListener('ticketsSync', checkNotifications);

            return () => {
                clearInterval(interval);
                window.removeEventListener('ticketsSync', checkNotifications);
            };
        }
    }, [user]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const totalNotifications = unreadTickets.length + todaysBirthdays.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 bg-white border shadow-sm rounded-full relative hover:bg-gray-50 transition-colors"
            >
                <Bell size={20} className={totalNotifications > 0 ? "text-lime-600 animate-pulse" : "text-gray-400"} />
                {totalNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                        {totalNotifications}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                        <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">Notificações</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {totalNotifications === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase text-gray-400">Tudo em dia!</p>
                                <p className="text-xs text-gray-400 mt-1">Nenhuma notificação nova.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {todaysBirthdays.map(d => (
                                    <div key={d.id}
                                        onClick={() => { setIsOpen(false); navigate('/aniversariantes'); }}
                                        className="p-4 hover:bg-lime-50 cursor-pointer flex items-start gap-4 transition-colors"
                                    >
                                        <div className="bg-lime-100 p-2 rounded-full text-lime-600 shrink-0">
                                            <Gift size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-900 leading-tight">Aniversariante do Dia</p>
                                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{d.nome}</p>
                                        </div>
                                    </div>
                                ))}

                                {unreadTickets.map(t => (
                                    <div key={t.id}
                                        onClick={() => { setIsOpen(false); navigate('/tickets'); }}
                                        className="p-4 hover:bg-blue-50 cursor-pointer flex items-start gap-4 transition-colors"
                                    >
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                            <Bookmark size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-gray-900 leading-tight">
                                                {t.creatorId === user?.id ? 'Atualização de Ticket' : 'Novo Ticket'}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
