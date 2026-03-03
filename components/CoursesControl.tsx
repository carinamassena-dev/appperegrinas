
import React, { useState, useEffect } from 'react';
import { GraduationCap, Trophy, BookOpen, Search, X, Users, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Disciple, CDLevel } from '../types';
import { loadData, loadDisciplesList } from '../services/dataService';

const CoursesControl: React.FC = () => {
  const [disciples, setDisciples] = useState<Disciple[]>([]);
  const [showAllModal, setShowAllModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log('[CoursesControl] tela carregada');
    const fetchData = async () => {
      const list = await loadDisciplesList();
      setDisciples(list);
    };
    fetchData();
  }, []);

  const uvData = [
    { name: 'Fizeram UV', value: disciples.filter(d => d.fezUV).length },
    { name: 'Pendente', value: disciples.filter(d => !d.fezUV).length },
  ];

  const cdData = [
    { name: 'Nível 1', value: disciples.filter(d => d.cdStatus === CDLevel.NIVEL_1).length },
    { name: 'Nível 2', value: disciples.filter(d => d.cdStatus === CDLevel.NIVEL_2).length },
    { name: 'Nível 3', value: disciples.filter(d => d.cdStatus === CDLevel.NIVEL_3).length },
    { name: 'Concluído', value: disciples.filter(d => d.cdStatus === CDLevel.CONCLUIDO).length },
    { name: 'Pendente', value: disciples.filter(d => d.cdStatus === CDLevel.NAO_INICIOU).length },
  ];

  const COLORS = ['#CCFF00', '#F3F4F6', '#22c55e', '#a855f7', '#fbbf24', '#6b7280'];

  const filtered = disciples.filter(d => d.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Controle Acadêmico</h1>
        <p className="text-gray-500 font-medium italic">Monitoramento da trilha de maturidade espiritual</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3"><BookOpen size={24} className="text-blue-500" /> Universidade da Vida</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={uvData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {uvData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Trophy size={24} className="text-yellow-500" /> Capacitação Destino</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cdData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {cdData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
        <div className="p-8 border-b flex items-center justify-between">
          <h3 className="text-xl font-black uppercase">Lista de Alunas</h3>
          <button onClick={() => setShowAllModal(true)} className="text-xs font-black text-lime-600 uppercase tracking-widest hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
              <tr>
                <th className="px-8 py-4">Peregrina</th>
                <th className="px-8 py-4">UV Status</th>
                <th className="px-8 py-4">Nível CD</th>
                <th className="px-8 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {disciples.slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td className="px-8 py-4 font-black text-gray-900 text-sm">{d.nome}</td>
                  <td className="px-8 py-4"><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${d.fezUV ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{d.fezUV ? 'Concluído ✓' : 'Pendente'}</span></td>
                  <td className="px-8 py-4 font-bold text-gray-500 text-xs">{d.cdStatus}</td>
                  <td className="px-8 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${d.status === 'Ativa' ? 'bg-lime-50 text-lime-600' : 'bg-red-50 text-red-400'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 space-y-6 animate-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase">Painel Acadêmico Geral</h2>
              <button onClick={() => setShowAllModal(false)}><X size={24} /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" placeholder="Buscar aluna..." className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 sticky top-0">
                  <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">UV</th><th className="px-4 py-3">CD</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(d => (
                    <tr key={d.id} className="text-sm">
                      <td className="px-4 py-3 font-bold">{d.nome}</td>
                      <td className="px-4 py-3">{d.fezUV ? '✓' : '✗'}</td>
                      <td className="px-4 py-3">{d.cdStatus}</td>
                      <td className="px-4 py-3 text-[10px] font-black">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesControl;
