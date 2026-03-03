
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Sprout, Target, Trophy, Calendar,
  Download, FileText, ClipboardList, TrendingUp,
  TrendingDown, Star, GraduationCap, CheckCircle,
  Filter, CalendarDays, UserCheck, Flame,
  ChevronRight, Award, MapPinned, Activity,
  RefreshCcw, Search, LayoutGrid, UserPlus, MinusCircle,
  BookOpen, Heart, Landmark, ArrowUpRight
} from 'lucide-react';
import { Disciple, Leader, BaptismStatus, CDLevel } from '../types';
import { loadData, loadDisciplesList, getWeeklyAttendanceTotal } from '../services/dataService';

const Reports: React.FC = () => {
  const [disciples, setDisciples] = useState<Disciple[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('Todos');
  const [leaderFilter, setLeaderFilter] = useState<string>('Todos');
  const [weeklyAttendance, setWeeklyAttendance] = useState<number>(0);

  useEffect(() => {
    console.log('[Reports] tela carregada');

    const fetchData = async () => {
      try {
        const allDisciples = await loadDisciplesList();
        setDisciples(allDisciples);
        const leadersList = allDisciples.filter(d => d.isLeader) as Leader[];
        setLeaders(leadersList);

        // Buscar presença da semana atual
        const attendanceTotal = await getWeeklyAttendanceTotal();
        setWeeklyAttendance(attendanceTotal);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    disciples.forEach(d => {
      if (d.dataCadastro) yearsSet.add(d.dataCadastro.split('-')[0]);
      if (d.dataBatismo) yearsSet.add(d.dataBatismo.split('-')[0]);
    });
    // Garantir que anos atuais existam na lista
    yearsSet.add(new Date().getFullYear().toString());
    return ['Todos', ...Array.from(yearsSet).sort().reverse()];
  }, [disciples]);

  const leaderNames = useMemo(() => {
    return ['Todos', ...Array.from(new Set(leaders.map(l => l.nome))).sort()];
  }, [leaders]);

  // Filtragem Global
  const filteredDisciples = useMemo(() => {
    return disciples.filter(d => {
      const matchYear = yearFilter === 'Todos' || (d.dataCadastro && d.dataCadastro.startsWith(yearFilter));
      const matchLeader = leaderFilter === 'Todos' || d.liderDireta === leaderFilter;
      return matchYear && matchLeader;
    });
  }, [disciples, yearFilter, leaderFilter]);

  const filteredLeaders = useMemo(() => {
    return leaders.filter(l => leaderFilter === 'Todos' || l.nome === leaderFilter);
  }, [leaders, leaderFilter]);

  // KPIs Detalhados
  const stats = useMemo(() => {
    const totalDiscipulas = filteredDisciples.filter(d => yearFilter === 'Todos' || (d.dataCadastro && d.dataCadastro.startsWith(yearFilter))).length;
    const entraram = filteredDisciples.filter(d => d.status === 'Ativa' && (yearFilter === 'Todos' || (d.dataCadastro && d.dataCadastro.startsWith(yearFilter)))).length;
    const sairam = filteredDisciples.filter(d => d.status === 'Inativa' && (yearFilter === 'Todos' || (d.dataCadastro && d.dataCadastro.startsWith(yearFilter)))).length;

    // Batismo (Filtra por ano se selecionado)
    const batizados = filteredDisciples.filter(d =>
      d.batizada === BaptismStatus.BATIZADA &&
      (yearFilter === 'Todos' || d.dataBatismo?.startsWith(yearFilter))
    ).length;

    // Universidade da Vida
    const iniciaramUV = filteredDisciples.filter(d => d.dataInscricaoUV && (yearFilter === 'Todos' || d.dataInscricaoUV.startsWith(yearFilter))).length;
    const fizeramUV = filteredDisciples.filter(d => d.fezUV && (yearFilter === 'Todos' || (d.dataConclusaoUV && d.dataConclusaoUV.startsWith(yearFilter)))).length;
    const concluiramUV = filteredDisciples.filter(d => d.dataConclusaoUV && (yearFilter === 'Todos' || d.dataConclusaoUV.startsWith(yearFilter))).length;

    // Marcos Espirituais
    const fizeramEncontro = filteredDisciples.filter(d => d.fezEncontro && (yearFilter === 'Todos' || (d.dataConclusaoEncontro && d.dataConclusaoEncontro.startsWith(yearFilter)))).length;
    const fizeramReencontro = filteredDisciples.filter(d => d.fezReencontro && (yearFilter === 'Todos' || (d.dataReencontro && d.dataReencontro.startsWith(yearFilter)))).length;

    // Capacitação Destino (CD)
    const matriculadosCD = filteredDisciples.filter(d => d.cdStatus !== CDLevel.NAO_INICIOU && (yearFilter === 'Todos' || (d.dataInscricaoCD1 && d.dataInscricaoCD1.startsWith(yearFilter)))).length;
    const concluiramN1 = filteredDisciples.filter(d => d.dataInscricaoCD1 && (yearFilter === 'Todos' || d.dataInscricaoCD1.startsWith(yearFilter))).length;
    const concluiramN2 = filteredDisciples.filter(d => d.dataInscricaoCD2 && (yearFilter === 'Todos' || d.dataInscricaoCD2.startsWith(yearFilter))).length;
    const concluiramN3 = filteredDisciples.filter(d => d.dataInscricaoCD3 && (yearFilter === 'Todos' || d.dataInscricaoCD3.startsWith(yearFilter))).length;
    const concluiramCD = filteredDisciples.filter(d => d.cdStatus === CDLevel.CONCLUIDO && (yearFilter === 'Todos' || (d.dataConclusaoCD && d.dataConclusaoCD.startsWith(yearFilter)))).length;
    const formaramNaCD = filteredDisciples.filter(d => d.fezFormatura && (yearFilter === 'Todos' || (d.dataFormatura && d.dataFormatura.startsWith(yearFilter)))).length;

    // Métricas de Células
    let celulasAbriram = 0;
    let celulasFecharam = 0;
    let celulasAtuais = 0;

    filteredLeaders.forEach(l => {
      [l.celula1, l.celula2].forEach(c => {
        if (!c || !c.perfil) return; // Ignora células completamente vazias/não iniciadas

        if (c.ativa) {
          celulasAtuais++;
          if (yearFilter === 'Todos' || (c.dataAbertura && c.dataAbertura.startsWith(yearFilter))) {
            celulasAbriram++;
          }
        } else {
          if (yearFilter === 'Todos' || (c.dataFechamento && c.dataFechamento.startsWith(yearFilter))) {
            celulasFecharam++;
          }
        }
      });
    });

    return {
      totalDiscipulas, entraram, sairam, batizados,
      iniciaramUV, fizeramUV, concluiramUV,
      fizeramEncontro, fizeramReencontro,
      matriculadosCD, concluiramN1, concluiramN2, concluiramN3, concluiramCD, formaramNaCD,
      celulasAbriram, celulasFecharam, celulasAtuais
    };
  }, [filteredDisciples, filteredLeaders, yearFilter]);

  const exportAllToCSV = () => {
    const headers = "ID,Nome,Status,Data Cadastro,Batismo,UV Iniciou,UV Concluiu,CD Nivel,CD Formada,Encontro,Reencontro\n";
    const data = filteredDisciples.map(d =>
      `"${d.id}","${d.nome}","${d.status}","${d.dataCadastro || ''}","${d.batizada}","${d.dataInscricaoUV || 'Não'}","${d.dataConclusaoUV || 'Não'}","${d.cdStatus}","${d.fezFormatura ? 'Sim' : 'Não'}","${d.fezEncontro ? 'Sim' : 'Não'}","${d.fezReencontro ? 'Sim' : 'Não'}"`
    ).join('\n');
    const blob = new Blob(["\ufeff" + headers + data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bi_crescimento_${yearFilter}_${leaderFilter.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 animate-in text-left">
      {/* Header e Filtros Inteligentes */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Activity className="text-lime-600" /> Dashboard de Crescimento
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest italic">Visão 360º da Maturidade e Expansão</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <div className="flex-1 min-w-[140px] bg-white border p-1 rounded-xl flex shadow-sm">
            <div className="p-2 text-gray-400"><CalendarDays size={16} /></div>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="flex-1 bg-transparent font-black text-[10px] uppercase outline-none border-none pr-4 cursor-pointer">
              {years.map(y => <option key={y} value={y}>{y === 'Todos' ? 'Ano: Todos' : `Ano: ${y}`}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px] bg-white border p-1 rounded-xl flex shadow-sm">
            <div className="p-2 text-gray-400"><LayoutGrid size={16} /></div>
            <select value={leaderFilter} onChange={e => setLeaderFilter(e.target.value)} className="flex-1 bg-transparent font-black text-[10px] uppercase outline-none border-none pr-4 cursor-pointer">
              {leaderNames.map(n => <option key={n} value={n}>{n === 'Todos' ? 'Líder: Todas' : `Líder: ${n}`}</option>)}
            </select>
          </div>
          <button onClick={exportAllToCSV} className="bg-black text-white px-6 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:scale-105 transition-all">
            <Download size={14} /> Exportar Dados
          </button>
        </div>
      </div>

      {/* Grid Visão Geral: Entradas e Saídas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-2">
        <KPICard label="Membros (Total)" value={stats.totalDiscipulas} icon={Users} theme="gray" />
        <KPICard label="Entradas (Ativas)" value={stats.entraram} icon={UserPlus} theme="green" />
        <KPICard label="Saídas (Inativas)" value={stats.sairam} icon={MinusCircle} theme="red" />
        <KPICard label="Batizadas" value={stats.batizados} icon={CheckCircle} theme="blue" />
        <KPICard label="Presenças (Semana)" value={weeklyAttendance} icon={ClipboardList} theme="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-2">
        {/* Universidade da Vida */}
        <div className="xl:col-span-1 bg-white rounded-[2.5rem] p-8 border shadow-sm space-y-6">
          <SectionTitle icon={BookOpen} label="Univer. da Vida (UV)" color="blue" />
          <div className="space-y-4">
            <StatRow label="Iniciaram a UV" value={stats.iniciaramUV} icon={Activity} />
            <StatRow label="Fizeram a UV" value={stats.fizeramUV} icon={GraduationCap} />
            <StatRow label="Concluíram a UV" value={stats.concluiramUV} icon={CheckCircle} color="text-blue-600" />
            <div className="h-px bg-gray-100 my-4" />
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Marcos Espirituais</p>
              <StatRow label="Fizeram Encontro" value={stats.fizeramEncontro} icon={Star} color="text-orange-500" />
              <StatRow label="Fizeram Reencontro" value={stats.fizeramReencontro} icon={Award} color="text-pink-500" />
            </div>
          </div>
        </div>

        {/* Trilha de Liderança (CD) */}
        <div className="xl:col-span-1 bg-white rounded-[2.5rem] p-8 border shadow-sm space-y-6">
          <SectionTitle icon={Trophy} label="Capacitação Destino" color="purple" />
          <div className="space-y-4">
            <StatRow label="Matriculados na CD" value={stats.matriculadosCD} icon={Users} />
            <div className="grid grid-cols-1 gap-2 p-4 bg-gray-50 rounded-2xl">
              <StatRow label="Concluíram Nível 1" value={stats.concluiramN1} icon={ChevronRight} />
              <StatRow label="Concluíram Nível 2" value={stats.concluiramN2} icon={ChevronRight} />
              <StatRow label="Concluíram Nível 3" value={stats.concluiramN3} icon={ChevronRight} />
            </div>
            <StatRow label="Concluíram a CD" value={stats.concluiramCD} icon={Award} color="text-purple-600" />
            <StatRow label="Formadas na CD" value={stats.formaramNaCD} icon={CheckCircle} color="text-purple-600" />
          </div>
        </div>

        {/* Expansão e Saúde de Células */}
        <div className="xl:col-span-1 bg-black rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-white overflow-hidden relative group">
          <div className="absolute -bottom-6 -right-6 text-white/5 rotate-12 group-hover:scale-110 transition-transform"><Landmark size={140} /></div>
          <SectionTitle icon={MapPinned} label="Expansão de Células" color="lime" light />
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between p-6 bg-white/10 rounded-[2rem] border border-white/5 shadow-inner">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Total Atual de Células</p>
                <p className="text-5xl font-black text-lime-400">{stats.celulasAtuais}</p>
              </div>
              <div className="w-14 h-14 bg-lime-400/20 rounded-2xl flex items-center justify-center text-lime-400">
                <ArrowUpRight size={28} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Células Abriram</p>
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-lime-400" />
                  <span className="text-2xl font-black">{stats.celulasAbriram}</span>
                </div>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Células Fecharam</p>
                <div className="flex items-center gap-2">
                  <TrendingDown size={20} className="text-red-400" />
                  <span className="text-2xl font-black">{stats.celulasFecharam}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-lime-400/10 rounded-2xl flex items-center gap-4">
              <div className="p-2 bg-lime-400 rounded-lg text-black"><Landmark size={14} /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-lime-400 leading-tight">Saúde da Expansão</p>
                <p className="text-[11px] font-bold text-gray-400">Saldo: {stats.celulasAbriram - stats.celulasFecharam >= 0 ? '+' : ''}{stats.celulasAbriram - stats.celulasFecharam} no período</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componentes Auxiliares
const KPICard = ({ label, value, icon: Icon, theme }: any) => {
  const themes: any = {
    gray: 'bg-white border-gray-100 text-gray-900',
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700'
  };

  return (
    <div className={`p-6 md:p-8 rounded-[2.5rem] border shadow-sm space-y-3 relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-lg ${themes[theme]}`}>
      <div className="p-3 bg-white/50 rounded-2xl shadow-xs w-fit group-hover:scale-110 transition-transform"><Icon size={22} className="opacity-70" /></div>
      <div>
        <p className="text-[10px] font-black uppercase opacity-50 tracking-widest leading-none mb-1">{label}</p>
        <p className="text-3xl font-black tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, label, color, light }: any) => {
  const colors: any = {
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    lime: 'bg-lime-peregrinas text-black',
    blue: 'bg-blue-100 text-blue-600'
  };
  return (
    <div className="flex items-center gap-4 border-b pb-4">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}><Icon size={20} /></div>
      <h3 className={`text-sm font-black uppercase tracking-widest ${light ? 'text-white' : 'text-gray-900'}`}>{label}</h3>
    </div>
  );
};

const StatRow = ({ label, value, icon: Icon, color }: any) => (
  <div className="flex items-center justify-between group cursor-default py-1">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
        <Icon size={14} className={color || "text-gray-400"} />
      </div>
      <span className="text-[11px] font-black text-gray-600 uppercase tracking-tight">{label}</span>
    </div>
    <span className={`font-black text-base ${color || 'text-gray-900'}`}>{value}</span>
  </div>
);

export default Reports;
