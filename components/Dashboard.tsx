
import React, { useState, useEffect } from 'react';
import {
  Cake, Users, CheckCircle, Flower2,
  Target, Trophy, Calendar, GraduationCap,
  Star, Zap, ArrowRight, UserCheck, Activity, Bell, X, MessageCircle, Phone, Heart, Loader2
} from 'lucide-react';
import { Disciple, BaptismStatus, CDLevel, Leader } from '../types';
import { loadDisciplesList } from '../services/dataService';

const Dashboard: React.FC = () => {
  const [verse] = useState({ texto: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.", referencia: "Salmos 119:105" });
  const [disciples, setDisciples] = useState<Disciple[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [showBdayModal, setShowBdayModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Dashboard] tela carregada');
      try {
        const list = await loadDisciplesList();
        setDisciples(list);
        setLeaders(list.filter((d: any) => d.isLeader) as Leader[]);
      } catch (err) {
        console.error("Erro dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const years = ['Todos', '2025', '2024', '2023'];

  const filterByYear = (date?: string) => {
    if (selectedYear === 'Todos') return true;
    return date?.startsWith(selectedYear);
  };

  const todayStr = new Date().toISOString().slice(5, 10); // MM-DD
  const todayBirthdays = disciples.filter(d => d.dataAniversario?.includes(todayStr));

  const totalCelulasAbertas = leaders.reduce((acc, l) => {
    let count = 0;
    if (l.celula1?.ativa) count++;
    if (l.celula2?.ativa) count++;
    return acc + count;
  }, 0);

  const stats = {
    totalDiscipulas: disciples.length,
    totalBatizados: disciples.filter(d => d.batizada === BaptismStatus.BATIZADA && filterByYear(d.dataBatismo)).length,
    totalEncontro: disciples.filter(d => d.fezEncontro && filterByYear(d.dataConclusaoEncontro)).length,
    totalConcluiramCD: disciples.filter(d => d.cdStatus === CDLevel.CONCLUIDO && filterByYear(d.dataConclusaoCD)).length,
    totalCelulasAbertas: totalCelulasAbertas
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-10 text-left animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 md:px-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tight">Estratégico</h1>
          <p className="text-gray-500 font-medium italic text-sm md:text-base">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3.5 rounded-2xl border shadow-sm w-fit">
          <Calendar className="text-lime-600" size={18} />
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-black text-xs uppercase tracking-[0.2em] outline-none border-none pr-4 cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Grid de Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        <StatItem label="Células" value={stats.totalCelulasAbertas} icon={Target} color="bg-white text-black" />
        <StatItem label="Peregrinas" value={stats.totalDiscipulas} icon={Users} color="bg-white text-blue-600" />
        <StatItem label="Batizadas" value={stats.totalBatizados} icon={CheckCircle} color="bg-white text-green-600" />
        <StatItem label="Encontro" value={stats.totalEncontro} icon={Star} color="bg-white text-orange-600" />
        <StatItem label="Líderes CD" value={stats.totalConcluiramCD} icon={Trophy} color="bg-white text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-lime-50/50 group-hover:scale-110 transition-transform pointer-events-none"><Flower2 size={120} /></div>
          <div className="relative z-10 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-lime-600" fill="currentColor" />
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-lime-600">Palavra do Dia</h3>
              </div>
            </div>
            <p className="text-2xl md:text-4xl font-serif italic text-gray-800 leading-tight">"{verse.texto}"</p>
            <p className="text-xs md:text-sm font-black text-gray-400">— {verse.referencia}</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (todayBirthdays.length > 0) {
              window.location.hash = 'aniversarios';
            }
          }}
          className={`bg-pink-50 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-pink-100 flex flex-col justify-center text-center transition-all ${todayBirthdays.length > 0 ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer' : 'opacity-80'}`}
        >
          <div className="relative mx-auto mb-4">
            <Cake size={48} className="text-pink-500" />
            {todayBirthdays.length > 0 && <span className="absolute -top-2 -right-2 bg-pink-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{todayBirthdays.length}</span>}
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-pink-600 mb-2">Celebração Hoje</h3>
          <p className="text-3xl font-black text-gray-900">
            {todayBirthdays.length > 0 ? 'Temos aniversariante!' : 'Nenhum aniversário hoje.'}
          </p>
          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-2">
            {todayBirthdays.length > 0 ? 'Clique aqui para ver ✓' : ''}
          </p>
        </button>
      </div>

    </div>
  );
};

const StatItem = ({ label, value, icon: Icon, color }: any) => (
  <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 ${color}`}>
    <Icon size={24} className="md:w-7 md:h-7" />
    <div className="space-y-1">
      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 leading-tight">{label}</p>
      <p className="text-2xl md:text-3xl font-black tracking-tighter">{value}</p>
    </div>
  </div>
);

export default Dashboard;
