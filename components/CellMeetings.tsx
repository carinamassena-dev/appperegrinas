
import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, Calendar, Users, MessageSquare, Trash2, X, Filter, User } from 'lucide-react';
import { CellMeetingReport, Leader, Disciple, FinanceRecord, TransactionType } from '../types';
import { loadData, loadDisciplesList, saveRecord, deleteRecord } from '../services/dataService';

const CellMeetings: React.FC = () => {
  const [reports, setReports] = useState<CellMeetingReport[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newReport, setNewReport] = useState<Partial<CellMeetingReport>>({
    data: new Date().toISOString().split('T')[0],
    tema: '',
    qtdMembros: 0,
    qtdVisitantes: 0,
    ofertaArrecadada: 0,
    numConversoes: 0,
    pedidosOracao: '',
    observacoes: '',
    leaderId: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const meetingsData = await loadData<CellMeetingReport>('cellMeetings');
      setReports(meetingsData);

      const allDisciples = await loadDisciplesList();
      const leadersList = allDisciples.filter(d => d.isLeader) as Leader[];
      setLeaders(leadersList);
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!newReport.leaderId || !newReport.tema) {
      alert("Por favor, selecione a líder e o tema da palavra.");
      return;
    }
    const report: CellMeetingReport = {
      ...newReport as CellMeetingReport,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [report, ...reports];
    setReports(updated);
    await saveRecord('cellMeetings', report);

    if (report.ofertaArrecadada && report.ofertaArrecadada > 0) {
      const financeRecord: FinanceRecord = {
        id: `FIN_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        data: report.data,
        tipo: TransactionType.ENTRADA,
        valor: report.ofertaArrecadada,
        responsavel: leaders.find(l => l.id === report.leaderId)?.nome || 'Líder Célula',
        descricao: `Oferta Célula - ${report.tema} (${report.data})`,
        categoria: 'Oferta de Célula'
      };
      await saveRecord('finance', financeRecord);
    }

    setShowModal(false);
    setNewReport({
      data: new Date().toISOString().split('T')[0],
      tema: '', qtdMembros: 0, qtdVisitantes: 0, ofertaArrecadada: 0, numConversoes: 0, pedidosOracao: '', observacoes: '', leaderId: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir esta ata permanentemente?")) {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      await deleteRecord('cellMeetings', id);
    }
  };

  const filtered = reports.filter(r => {
    const leader = leaders.find(l => l.id === r.leaderId);
    return (
      leader?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tema.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Atas de Célula</h1>
          <p className="text-gray-500 font-medium italic">Relatório semanal de crescimento e oração</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-lime-peregrinas text-black font-black px-8 py-4 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Plus size={20} /> Nova Ata
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por líder ou tema..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-lime-peregrinas"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.length > 0 ? filtered.map(report => {
          const leader = leaders.find(l => l.id === report.leaderId);
          return (
            <div key={report.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative group overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-lime-50 rounded-xl flex items-center justify-center text-lime-600 font-black border border-lime-100">
                    {leader?.nome.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">{leader?.nome || 'Líder não encontrada'}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={10} /> {new Date(report.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(report.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Palavra Ministrada</p>
                  <p className="text-sm font-black text-gray-800 italic">"{report.tema}"</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-lime-50/50 rounded-2xl border border-lime-100/50 text-center">
                    <p className="text-[10px] font-black uppercase text-lime-600">Membros</p>
                    <p className="text-xl font-black">{report.qtdMembros}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                    <p className="text-[10px] font-black uppercase text-purple-600">Visitantes</p>
                    <p className="text-xl font-black">{report.qtdVisitantes}</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                    <p className="text-[10px] font-black uppercase text-amber-600">Conversões</p>
                    <p className="text-xl font-black">{report.numConversoes || 0}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-black uppercase text-emerald-600">Oferta</p>
                    <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.ofertaArrecadada || 0)}</p>
                  </div>
                </div>

                {report.pedidosOracao && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-400 ml-1">Clamor e Oração</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{report.pedidosOracao}</p>
                  </div>
                )}
              </div>

              <div className="absolute -right-2 -bottom-2 opacity-[0.03] text-lime-600 transform rotate-12">
                <ClipboardList size={120} />
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center text-gray-300 font-black uppercase tracking-widest border-4 border-dashed border-gray-50 rounded-[3rem]">
            Nenhuma ata registrada para esta busca
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Registrar Ata Semanal</h2>
                <p className="text-xs text-lime-600 font-bold uppercase tracking-widest">Relatório de Célula</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Líder Responsável</label>
                  <select
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    value={newReport.leaderId}
                    onChange={e => setNewReport({ ...newReport, leaderId: e.target.value })}
                  >
                    <option value="">Selecione a líder...</option>
                    {leaders.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data da Reunião</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    value={newReport.data}
                    onChange={e => setNewReport({ ...newReport, data: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tema da Palavra</label>
                <input
                  type="text"
                  placeholder="Ex: A Parábola do Semeador"
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                  value={newReport.tema}
                  // Fix: Correct property name from 'theme' to 'tema'
                  onChange={e => setNewReport({ ...newReport, tema: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nº de Membros</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    value={newReport.qtdMembros || ''}
                    onChange={e => setNewReport({ ...newReport, qtdMembros: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nº de Visitantes</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    value={newReport.qtdVisitantes || ''}
                    onChange={e => setNewReport({ ...newReport, qtdVisitantes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nº de Conversões</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    value={newReport.numConversoes || ''}
                    onChange={e => setNewReport({ ...newReport, numConversoes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Oferta Arrecadada (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-lime-700"
                    placeholder="0.00"
                    value={newReport.ofertaArrecadada || ''}
                    onChange={e => setNewReport({ ...newReport, ofertaArrecadada: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Pedidos de Oração / Clamor</label>
                <textarea
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm h-24"
                  placeholder="Liste os nomes e motivos de oração da célula..."
                  value={newReport.pedidosOracao}
                  onChange={e => setNewReport({ ...newReport, pedidosOracao: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Observações da Reunião</label>
                <textarea
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm h-20"
                  placeholder="Algum acontecimento especial ou vida ganha?"
                  value={newReport.observacoes}
                  onChange={e => setNewReport({ ...newReport, observacoes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase tracking-widest">CANCELAR</button>
              <button
                onClick={handleSave}
                className="flex-1 py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl shadow-lime-500/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
              >
                SALVAR ATA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellMeetings;
