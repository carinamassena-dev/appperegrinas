
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, X, FileUp, Table, DollarSign, ArrowUpRight, ArrowDownLeft, Filter, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { FinanceRecord, TransactionType } from '../types';
import { draftService } from '../services/draftService';
import { loadData, saveRecord, deleteRecord } from '../services/dataService';

const Finance: React.FC = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');

  // Month filter — defaults to current month (YYYY-MM)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  };

  const shiftMonth = (dir: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // Extract the YYYY-MM from a record's date (supports both YYYY-MM-DD and DD/MM/YYYY)
  const getRecordMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      return dateStr.split('T')[0].substring(0, 7); // YYYY-MM
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
    }
    return '';
  };

  // Available months from all records for the dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      const m = getRecordMonth(r.data);
      if (m) set.add(m);
    });
    // Always include the current month
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(set).sort().reverse();
  }, [records]);

  const initialEntry = {
    data: new Date().toISOString().split('T')[0],
    tipo: TransactionType.ENTRADA,
    valor: 0,
    responsavel: '',
    descricao: '',
    categoria: '',
    observacao: ''
  };

  const [entry, setEntry] = useState<Partial<FinanceRecord>>(initialEntry);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = async () => {
    try {
      const list = await loadData<FinanceRecord>('finance');
      setRecords(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    const handleStorageChange = () => loadRecords();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load draft on mount for new entries
  useEffect(() => {
    if (!editId) {
      const draft = draftService.getDraft('finance');
      if (draft && Object.keys(draft).length > 0) {
        setEntry(draft);
      }
    }
  }, [editId]);

  // Save to draft when typing
  useEffect(() => {
    if (!editId && entry.descricao !== undefined && entry.descricao.trim() !== '') {
      draftService.saveDraft('finance', entry);
    }
  }, [entry, editId]);

  const saveToStorage = async (data: FinanceRecord[], changedItem?: FinanceRecord) => {
    setRecords(data);
    if (changedItem) {
      await saveRecord('finance', changedItem);
    }
    window.dispatchEvent(new Event('storage'));
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    if (dateStr.includes('/') && dateStr.split('/').length === 3) return dateStr;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    return dateStr;
  };

  const normalizeNum = (val: string) => {
    if (!val) return 0;
    let clean = val.replace(/"/g, '').trim();
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean) || 0;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split('\n').slice(1);
      const imported: FinanceRecord[] = rows.map(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 3) return null;

        const rawType = (cols[1] || "").toLowerCase();
        const isSaida = rawType.includes('said') || rawType.includes('desp') || cols[2]?.includes('-');

        return {
          id: Math.random().toString(36).substr(2, 9),
          data: cols[0] || '',
          tipo: isSaida ? TransactionType.SAIDA : TransactionType.ENTRADA,
          valor: Math.abs(normalizeNum(cols[2])),
          responsavel: cols[3] || '',
          descricao: cols[4] || '',
          categoria: cols[5] || (isSaida ? 'Saída' : 'Entrada'),
          observacao: cols[6] || ''
        };
      }).filter(Boolean) as FinanceRecord[];
      saveToStorage([...imported, ...records]);
      alert("Importado com sucesso!");
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = "Data,Tipo,Valor,Responsavel,Descricao,Categoria,Observacao\n";
    const csvContent = filtered.map(r =>
      `"${r.data}","${r.tipo}","${r.valor.toFixed(2)}","${r.responsavel}","${r.descricao}","${r.categoria || ''}","${r.observacao || ''}"`
    ).join('\n');

    const blob = new Blob(["\ufeff" + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!entry.descricao || entry.valor === 0) return alert("Preencha os campos!");

    const newId = editId || Math.random().toString(36).substr(2, 9);
    const dataToSave = { ...entry, id: newId } as FinanceRecord;

    const btn = document.getElementById('btn-save-finance');
    if (btn) btn.innerText = "Salvando...";

    try {
      await saveRecord('finance', dataToSave);
      draftService.clearDraft('finance');

      const updated = editId
        ? records.map(r => r.id === editId ? dataToSave : r)
        : [dataToSave, ...records];

      saveToStorage(updated, dataToSave);

      setShowModal(false);
      setEditId(null);
      setEntry(initialEntry);
    } catch (err) {
      console.error("Erro ao salvar", err);
      draftService.saveDraft('finance', entry);
      alert("Sistema em manutenção. Seu rascunho foi salvo com segurança no seu aparelho!");
      if (btn) btn.innerText = "Gravar Transação";
    }
  };

  // Helper: parse date string to sortable ISO
  const toSortableDate = (dateStr: string): string => {
    if (!dateStr) return '0000-00-00';
    if (dateStr.includes('-')) return dateStr.split('T')[0];
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const filtered = records
    .filter(r => {
      const matchesMonth = getRecordMonth(r.data) === selectedMonth;
      const matchesSearch = r.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || r.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'Todos' || r.tipo === typeFilter;
      return matchesMonth && matchesSearch && matchesType;
    })
    .sort((a, b) => toSortableDate(b.data).localeCompare(toSortableDate(a.data)));

  const totalE = filtered.filter(r => r.tipo === TransactionType.ENTRADA).reduce((a, b) => a + b.valor, 0);
  const totalS = filtered.filter(r => r.tipo === TransactionType.SAIDA).reduce((a, b) => a + b.valor, 0);

  // Cumulative balance: all records up to and including the selected month
  const saldoAcumulado = records.reduce((acc, r) => {
    const rm = getRecordMonth(r.data);
    if (rm && rm <= selectedMonth) {
      return acc + (r.tipo === TransactionType.ENTRADA ? r.valor : -r.valor);
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-in pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900">Caixa da Geração</h1>
          <p className="text-gray-400 italic font-medium text-xs md:text-sm">Gestão financeira transparente e organizada</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <label className="flex-1 md:flex-none bg-white border border-gray-100 p-3 md:p-4 rounded-2xl cursor-pointer flex items-center justify-center gap-2 font-black text-[10px] uppercase shadow-sm">
            <FileUp size={16} /> Importar <input type="file" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-none bg-white border border-gray-100 p-3 md:p-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase shadow-sm hover:text-black transition-all"
          >
            <Download size={16} /> Exportar
          </button>
          <button onClick={() => { setEditId(null); setEntry(initialEntry); setShowModal(true); }} className="flex-1 md:flex-none bg-black text-white px-4 md:px-6 py-3 md:py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Novo Lançamento</button>
        </div>
      </div>

      {/* Month Navigation Bar */}
      <div className="bg-white p-3 md:p-4 rounded-[2rem] border shadow-sm flex items-center justify-between gap-2">
        <button
          onClick={() => shiftMonth(-1)}
          className="p-2 md:p-3 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
          title="Mês anterior"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-gray-400 hidden md:block" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent font-black text-sm md:text-base text-center outline-none cursor-pointer appearance-none"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => shiftMonth(1)}
          className="p-2 md:p-3 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
          title="Próximo mês"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <StatBox label="Entradas" value={totalE} color="text-green-600" bg="bg-green-50/50" icon={ArrowUpRight} />
        <StatBox label="Saídas" value={totalS} color="text-red-500" bg="bg-red-50/50" icon={ArrowDownLeft} />
        <StatBox label="Saldo Atual" value={saldoAcumulado} color="text-black" bg="bg-lime-peregrinas" icon={DollarSign} />
      </div>

      <div className="bg-white p-4 md:p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input type="text" placeholder="Buscar lançamentos..." className="w-full pl-12 pr-4 py-3 md:py-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-50 px-6 py-3 md:py-4 rounded-2xl font-black text-[10px] uppercase outline-none cursor-pointer">
          <option>Todos</option>
          <option>{TransactionType.ENTRADA}</option>
          <option>{TransactionType.SAIDA}</option>
        </select>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
              <tr>
                <th className="px-8 py-4">Data</th>
                <th className="px-8 py-4">Descrição</th>
                <th className="px-8 py-4">Responsável</th>
                <th className="px-8 py-4 text-right">Valor</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-4 text-xs font-bold text-gray-400">{formatDateDisplay(r.data)}</td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="font-black text-sm text-gray-900">{r.descricao}</p>
                      <div className="flex gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.tipo === TransactionType.ENTRADA ? 'text-green-600 bg-green-100' : 'text-red-500 bg-red-100'}`}>
                          {r.tipo === TransactionType.ENTRADA ? '(+) ENTRADA' : '(-) SAÍDA'}
                        </span>
                        {r.categoria && <span className="text-[8px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{r.categoria}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-gray-700">{r.responsavel}</td>
                  <td className={`px-8 py-4 text-right font-black ${r.tipo === TransactionType.ENTRADA ? 'text-green-600' : 'text-red-500'}`}>
                    {r.tipo === TransactionType.ENTRADA ? '+' : '-'} R$ {r.valor.toFixed(2)}
                  </td>
                  <td className="px-8 py-4 flex gap-2 justify-end">
                    <button onClick={() => { setEditId(r.id); setEntry(r); setShowModal(true); }} className="text-gray-300 hover:text-black p-2 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={async () => {
                      if (confirm("Excluir registro permanentemente?")) {
                        const up = records.filter(x => x.id !== r.id);
                        saveToStorage(up);
                        await deleteRecord('finance', r.id);
                      }
                    }} className="text-gray-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Aguardando dados ou sincronização...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y">
          {filtered.map(r => (
            <div key={r.id} className="p-5 flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{formatDateDisplay(r.data)}</p>
                  <h4 className="font-black text-gray-900 leading-tight">{r.descricao}</h4>
                  <div className="mt-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.tipo === TransactionType.ENTRADA ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                      {r.tipo === TransactionType.ENTRADA ? '(+) ENTRADA' : '(-) SAÍDA'}
                    </span>
                  </div>
                </div>
                <div className={`font-black text-sm ${r.tipo === TransactionType.ENTRADA ? 'text-green-600' : 'text-red-500'}`}>
                  {r.tipo === TransactionType.ENTRADA ? '+' : '-'} R$ {r.valor.toFixed(2)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-1 rounded">Resp: {r.responsavel}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(r.id); setEntry(r); setShowModal(true); }} className="p-2 text-gray-300 active:text-black"><Edit2 size={14} /></button>
                  <button onClick={async () => {
                    if (confirm("Excluir?")) {
                      const up = records.filter(x => x.id !== r.id);
                      saveToStorage(up);
                      await deleteRecord('finance', r.id);
                    }
                  }} className="p-2 text-gray-200 active:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black uppercase">Lançamento de Caixa</h2>
              <button onClick={() => setShowModal(false)} className="p-2"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tipo de Transação</label>
                <select className="w-full p-3 md:p-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={entry.tipo} onChange={e => setEntry({ ...entry, tipo: e.target.value as any })}>
                  <option>{TransactionType.ENTRADA}</option>
                  <option>{TransactionType.SAIDA}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Data</label>
                <input type="date" className="w-full p-3 md:p-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={entry.data} onChange={e => setEntry({ ...entry, data: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor (R$)</label>
                <input type="number" step="0.01" className="w-full p-3 md:p-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={entry.valor} onChange={e => setEntry({ ...entry, valor: Math.abs(parseFloat(e.target.value)) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Responsável</label>
                <input type="text" className="w-full p-3 md:p-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={entry.responsavel} onChange={e => setEntry({ ...entry, responsavel: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Descrição</label>
              <input type="text" className="w-full p-3 md:p-4 bg-gray-50 rounded-2xl font-bold outline-none text-sm" value={entry.descricao} onChange={e => setEntry({ ...entry, descricao: e.target.value })} />
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 font-black text-gray-400 uppercase text-[10px] tracking-widest py-4">Cancelar</button>
              <button onClick={handleSave} id="btn-save-finance" className="flex-1 py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Salvar Agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <div className={`${bg} p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border shadow-sm flex items-center gap-4 md:gap-6`}>
    <div className="p-3 md:p-4 bg-white/50 rounded-xl md:rounded-2xl shrink-0 shadow-sm"><Icon size={20} className={color} /></div>
    <div>
      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1 md:mb-2">{label}</p>
      <p className={`text-lg md:text-2xl font-black ${color}`}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>
  </div>
);

export default Finance;
