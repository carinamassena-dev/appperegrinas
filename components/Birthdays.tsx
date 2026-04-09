
import React, { useState, useEffect, useMemo } from 'react';
import {
    Cake, Gift, MessageCircle, ChevronDown, ChevronUp, Star,
    MapPin, Heart, PartyPopper, Calendar as CalendarIcon, Phone
} from 'lucide-react';
import { Disciple } from '../types';
import { loadData, loadDisciplesList } from '../services/dataService';

const Birthdays: React.FC = () => {
    const [disciples, setDisciples] = useState<Disciple[]>([]);
    const [openMonth, setOpenMonth] = useState<number | null>(new Date().getMonth());

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all disciples for the annual calendar (bypassing the 20-disciple limit)
                const list = await loadDisciplesList(0, 1000, '', true);
                setDisciples(list);
            } catch (err) {
                console.error("Erro ao buscar dados:", err);
            }
        };
        fetchData();
    }, []);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();

    const getMonthName = (monthIdx: number) => {
        return [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ][monthIdx];
    };

    const birthdayData = useMemo(() => {
        const monthly: { [key: number]: Disciple[] } = {};
        const todayBirthdays: Disciple[] = [];

        disciples.forEach(d => {
            if (!d.dataAniversario) return;

            const birthDate = new Date(d.dataAniversario + 'T00:00:00');
            if (isNaN(birthDate.getTime())) return;

            const m = birthDate.getMonth();
            const dDay = birthDate.getDate();

            if (m === currentMonth && dDay === currentDay) {
                todayBirthdays.push(d);
            }

            if (!monthly[m]) monthly[m] = [];
            monthly[m].push(d);
        });

        // Ordenar por dia em cada mês
        Object.keys(monthly).forEach(mIdx => {
            monthly[parseInt(mIdx)].sort((a, b) => {
                const dA = new Date(a.dataAniversario + 'T00:00:00').getDate();
                const dB = new Date(b.dataAniversario + 'T00:00:00').getDate();
                return dA - dB;
            });
        });

        return { monthly, todayBirthdays };
    }, [disciples, currentMonth, currentDay]);

    const verses = [
        { text: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti...", source: "Números 6:24-25" },
        { text: "Aquele que começou a boa obra em vós a aperfeiçoará até ao dia de Jesus Cristo.", source: "Filipenses 1:6" },
        { text: "Deleita-te também no Senhor, e ele te concederá os desejos do teu coração.", source: "Salmos 37:4" },
        { text: "Ensina-nos a contar os nossos dias, para que alcancemos coração sábio.", source: "Salmos 90:12" },
        { text: "O Senhor é o meu pastor, nada me faltará.", source: "Salmos 23:1" }
    ];

    const randomVerse = verses[Math.floor(Math.random() * verses.length)];

    return (
        <div className="space-y-8 animate-in pb-20 text-left">
            <header>
                <h1 className="text-[22px] font-extrabold tracking-tight leading-tight uppercase text-gray-900">Aniversariantes</h1>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Celebração e Comunhão</p>
            </header>

            {/* Destaque do Dia */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-lime-peregrinas pl-4">
                    <PartyPopper className="text-lime-600" size={20} />
                    <h2 className="text-sm font-black uppercase text-gray-900 tracking-widest">Destaque do Dia</h2>
                </div>

                {birthdayData.todayBirthdays.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {birthdayData.todayBirthdays.map(d => (
                            <div key={d.id} className="bg-black text-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-lime-peregrinas/20 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>

                                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gray-800 border-2 border-lime-peregrinas shrink-0 overflow-hidden shadow-xl">
                                        {d.foto ? <img src={d.foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-lime-peregrinas">{d.nome.charAt(0)}</div>}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-lime-peregrinas">{d.nome}</h3>
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                                                <Star size={12} className="text-lime-500" /> Parabéns, Peregrina!
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 italic">
                                            <p className="text-xs text-gray-300 mb-2 leading-relaxed font-medium">"{randomVerse.text}"</p>
                                            <cite className="text-[9px] font-black uppercase text-lime-peregrinas not-italic">— {randomVerse.source}</cite>
                                        </div>

                                        <a
                                            href={`https://wa.me/${d.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns, ${d.nome}! 🎉 "${randomVerse.text}" (${randomVerse.source}) Que o Senhor te abençoe grandemente!`)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 bg-lime-peregrinas text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all"
                                        >
                                            <MessageCircle size={14} /> Enviar Felicitações
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-10 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center text-gray-300 space-y-2">
                        <CalendarIcon size={40} strokeWidth={1} />
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum aniversariante hoje</p>
                    </div>
                )}
            </section>

            {/* Calendário Mensal */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-gray-200 pl-4">
                    <CalendarIcon className="text-gray-400" size={20} />
                    <h2 className="text-sm font-black uppercase text-gray-900 tracking-widest">Calendário Anual</h2>
                </div>

                <div className="space-y-3">
                    {[...Array(12)].map((_, i) => {
                        const isOpen = openMonth === i;
                        const monthBirthdays = birthdayData.monthly[i] || [];

                        return (
                            <div key={i} className={`rounded-[2rem] border transition-all overflow-hidden ${isOpen ? 'bg-white shadow-md border-lime-100' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                <button
                                    onClick={() => setOpenMonth(isOpen ? null : i)}
                                    className="w-full px-6 py-5 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${isOpen ? 'bg-lime-peregrinas text-black rotate-12 shadow-md' : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'}`}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-tighter text-gray-900">{getMonthName(i)}</h3>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{monthBirthdays.length} aniversariantes</p>
                                        </div>
                                    </div>
                                    {isOpen ? <ChevronUp className="text-lime-600" /> : <ChevronDown className="text-gray-300" />}
                                </button>

                                {isOpen && (
                                    <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                                        {monthBirthdays.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {monthBirthdays.map(d => {
                                                    const birthDate = new Date(d.dataAniversario + 'T00:00:00');
                                                    return (
                                                        <div key={d.id} className="p-4 bg-gray-50 rounded-2xl border flex items-center gap-4 hover:border-lime-200 hover:bg-white transition-all group">
                                                            <div className="w-12 h-12 rounded-xl bg-white shadow-xs shrink-0 overflow-hidden font-black text-xs flex items-center justify-center text-gray-300">
                                                                {d.foto ? <img src={d.foto} className="w-full h-full object-cover" /> : d.nome.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-[11px] font-black uppercase text-gray-900 truncate">{d.nome}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-black text-lime-600 bg-white px-1.5 rounded-md shadow-xs">{birthDate.getDate().toString().padStart(2, '0')}/{(birthDate.getMonth() + 1).toString().padStart(2, '0')}</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase truncate">@{d.liderDireta || 'S/ Líder'}</span>
                                                                </div>
                                                            </div>
                                                            <a href={`https://wa.me/${d.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg text-gray-300 hover:text-lime-600 transition-colors shadow-xs">
                                                                <Phone size={14} />
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-center py-6 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">Nenhuma aniversariante cadastrada</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default Birthdays;
