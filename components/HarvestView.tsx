
import React, { useState, useEffect } from 'react';
import { Sprout, Phone, Plus, MessageCircle, Calendar, User, MapPin, Search, CheckCircle, Clock, X, HeartHandshake, FileText, Loader2, Table, FileUp, Trash2, Download } from 'lucide-react';
import { Harvest } from '../types';
import { sendDataToSheet } from '../services/googleSheetsService';
import { loadData, saveRecord, deleteRecord } from '../services/dataService';

const HarvestView: React.FC = () => {
  const [prospects, setProspects] = useState<Harvest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState<Harvest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProspect, setNewProspect] = useState<Partial<Harvest>>({
    nome: '', whatsapp: '', dataAbordagem: new Date().toISOString().split('T')[0], contatoFeito: false, bairro: '', idade: 0
  });

  const [followUpData, setFollowUpData] = useState({
    quemContactou: '', dataContato: new Date().toISOString().split('T')[0], observacao: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await loadData<Harvest>('harvest');
        setProspects(list);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const normalize = (str: string) =>
    str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const parseCSVDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === "") return "";
    // Formato comum em planilhas: DD/MM/YY ou DD-MM-YY
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = "20" + year;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/);
      if (rows.length < 2) return;

      const rawHeader = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const normalizedHeader = rawHeader.map(normalize);

      const findCol = (synonyms: string[]) =>
        normalizedHeader.findIndex(h => synonyms.some(s => h === normalize(s) || h.includes(normalize(s))));

      const m = {
        dataAbordagem: findCol(['data da abordagem', 'abordagem', 'data']),
        nome: findCol(['nome', 'contato']),
        telefone: findCol(['telefone', 'whatsapp', 'celular']),
        idade: findCol(['idade']),
        bairro: findCol(['bairro']),
        contatoFeito: findCol(['feito contato', 'contatada', 'feito contato?']),
        quemContactou: findCol(['quem entrou em contato', 'quem contatou', 'quem entrou em contato?']),
        quando: findCol(['quando', 'data contato', 'quando?']),
        observacao: findCol(['observacao', 'obs'])
      };

      const imported: Harvest[] = [];
      rows.slice(1).forEach(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 2 || !cols[m.nome] || cols[m.nome].trim() === "") return;

        const h: Harvest = {
          id: Math.random().toString(36).substr(2, 9),
          dataAbordagem: parseCSVDate(cols[m.dataAbordagem]),
          nome: cols[m.nome],
          whatsapp: m.telefone !== -1 ? cols[m.telefone] : '',
          idade: m.idade !== -1 ? parseInt(cols[m.idade]) || 0 : 0,
          bairro: m.bairro !== -1 ? cols[m.bairro] : '',
          contatoFeito: cols[m.contatoFeito]?.toLowerCase().includes('sim') || cols[m.contatoFeito]?.toLowerCase() === 'true',
          quemContactou: m.quemContactou !== -1 ? cols[m.quemContactou] : '',
          dataContato: m.quando !== -1 ? parseCSVDate(cols[m.quando]) : '',
          observacao: m.observacao !== -1 ? cols[m.observacao] : ''
        };
        imported.push(h);
      });

      const updated = [...imported, ...prospects];
      setProspects(updated);
      Promise.all(imported.map(h => saveRecord('harvest', h))).catch(console.error);
      alert(`${imported.length} abordagens importadas com sucesso!`);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = "DataAbordagem,Nome,WhatsApp,Idade,Bairro,ContatoFeito,QuemContactou,DataContato,Observacao\n";
    const csvContent = filteredProspects.map(p =>
      `"${p.dataAbordagem}","${p.nome}","${p.whatsapp}","${p.idade}","${p.bairro || ''}","${p.contatoFeito ? 'Sim' : 'Não'}","${p.quemContactou || ''}","${p.dataContato || ''}","${p.observacao || ''}"`
    ).join('\n');

    const blob = new Blob(["\ufeff" + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `colheita_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!newProspect.nome || !newProspect.whatsapp) return alert("Preencha os campos obrigatórios!");
    const p = { ...newProspect, id: Math.random().toString(36).substr(2, 9) } as Harvest;
    const updated = [p, ...prospects];
    setProspects(updated);

    const btn = document.getElementById('btn-save-harvest');
    if (btn) btn.innerText = "Salvando...";
    await saveRecord('harvest', p);

    setShowModal(false);
    setNewProspect({ nome: '', whatsapp: '', dataAbordagem: new Date().toISOString().split('T')[0], contatoFeito: false });
  };

  const handleConfirmFollowUp = async () => {
    if (!followUpData.quemContactou || !followUpData.observacao) return alert("Relate o acompanhamento!");

    let updatedHarvest: Harvest | null = null;

    const updated = prospects.map(p => {
      if (p.id === showFollowUpModal?.id) {
        updatedHarvest = {
          ...p,
          contatoFeito: true,
          quemContactou: followUpData.quemContactou,
          dataContato: followUpData.dataContato,
          observacao: followUpData.observacao
        };
        return updatedHarvest;
      }
      return p;
    });
    setProspects(updated);

    if (updatedHarvest) {
      await saveRecord('harvest', updatedHarvest);
    }

    setShowFollowUpModal(null);
    setFollowUpData({ quemContactou: '', dataContato: new Date().toISOString().split('T')[0], observacao: '' });
  };

  const toggleContact = async (p: Harvest) => {
    if (p.contatoFeito) {
      if (confirm("Voltar para 'Não Contactada'?")) {
        const toggled = { ...p, contatoFeito: false };
        const updated = prospects.map(item => item.id === p.id ? toggled : item);
        setProspects(updated);
        await saveRecord('harvest', toggled);
      }
    } else {
      setShowFollowUpModal(p);
    }
  };

  const removeHarvest = async (id: string) => {
    if (confirm("Excluir registro permanentemente?")) {
      const updated = prospects.filter(p => p.id !== id);
      setProspects(updated);
      await deleteRecord('harvest', id);
    }
  };

  const filteredProspects = prospects.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.whatsapp.includes(searchTerm)
  );

  const pending = filteredProspects.filter(p => !p.contatoFeito);
  const completed = filteredProspects.filter(p => p.contatoFeito);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Colheita...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Fluxo de Colheita</h1>
          <p className="text-gray-500 font-medium italic">Vidas alcançadas aguardando consolidação</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="bg-white border-2 border-lime-peregrinas text-black font-black px-6 py-4 rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer hover:bg-lime-peregrinas transition-all text-xs">
            <Table size={18} />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button
            onClick={handleExportCSV}
            className="bg-white text-gray-400 border border-gray-100 px-6 py-4 rounded-2xl shadow-sm flex items-center gap-2 font-black text-[10px] uppercase hover:text-black transition-all"
          >
            <Download size={18} /> Exportar
          </button>
          <button onClick={() => setShowModal(true)} className="bg-black text-white font-black px-8 py-4 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest">
            <Plus size={20} /> Registrar Abordagem
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative">
        <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input
          type="text"
          placeholder="Pesquisar por nome, bairro ou telefone..."
          className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-16">
        <section className="space-y-8">
          <SectionTitle label="Não Contactadas" icon={Clock} color="text-orange-500" count={pending.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pending.map(p => <HarvestCard key={p.id} prospect={p} onToggle={() => toggleContact(p)} onDelete={() => removeHarvest(p.id)} />)}
          </div>
          {pending.length === 0 && <p className="text-center text-gray-300 italic py-10">Tudo em dia!</p>}
        </section>

        <section className="space-y-8">
          <SectionTitle label="Contactadas" icon={CheckCircle} color="text-green-500" count={completed.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {completed.map(p => <HarvestCard key={p.id} prospect={p} onToggle={() => toggleContact(p)} onDelete={() => removeHarvest(p.id)} />)}
          </div>
          {completed.length === 0 && <p className="text-center text-gray-300 italic py-10">Nenhum contato realizado ainda.</p>}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-black uppercase">Nova Abordagem</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              {/* Ordem exata da planilha: Data, Nome, Telefone, Idade, Bairro, Feito contato?, Quem, Quando */}

              <InputField label="Data da abordagem" type="date" value={newProspect.dataAbordagem} onChange={v => setNewProspect({ ...newProspect, dataAbordagem: v })} />

              <InputField label="Nome" value={newProspect.nome} onChange={v => setNewProspect({ ...newProspect, nome: v })} />

              <InputField label="Telefone" type="tel" value={newProspect.whatsapp} onChange={v => setNewProspect({ ...newProspect, whatsapp: v })} />

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Idade" type="number" value={newProspect.idade} onChange={v => setNewProspect({ ...newProspect, idade: parseInt(v) })} />
                <InputField label="Bairro" value={newProspect.bairro} onChange={v => setNewProspect({ ...newProspect, bairro: v })} />
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Feito contato?</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-xl flex-1">
                    <input
                      type="radio"
                      name="contatoFeito"
                      className="accent-lime-peregrinas"
                      checked={newProspect.contatoFeito === true}
                      onChange={() => setNewProspect({ ...newProspect, contatoFeito: true })}
                    />
                    <span className="text-xs font-bold text-gray-700">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-xl flex-1">
                    <input
                      type="radio"
                      name="contatoFeito"
                      className="accent-lime-peregrinas"
                      checked={newProspect.contatoFeito === false}
                      onChange={() => setNewProspect({ ...newProspect, contatoFeito: false })}
                    />
                    <span className="text-xs font-bold text-gray-700">Não</span>
                  </label>
                </div>
              </div>

              {/* Campos condicionais mas mantendo a ordem visual se selecionado Sim */}
              {newProspect.contatoFeito && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                  <InputField label="Quem entrou em contato?" value={newProspect.quemContactou} onChange={v => setNewProspect({ ...newProspect, quemContactou: v })} />
                  <InputField label="Quando?" type="date" value={newProspect.dataContato} onChange={v => setNewProspect({ ...newProspect, dataContato: v })} />
                  <InputField label="Observacao" value={newProspect.observacao} onChange={v => setNewProspect({ ...newProspect, observacao: v })} />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 font-black text-gray-400 uppercase text-xs">CANCELAR</button>
              <button onClick={handleSave} id="btn-save-harvest" className="flex-1 py-4 bg-lime-peregrinas font-black rounded-2xl shadow-xl text-xs uppercase tracking-widest">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 space-y-6">
            <h2 className="text-2xl font-black uppercase text-center">Registrar Contato Feito</h2>
            <div className="space-y-5">
              <InputField label="Quem entrou em contato?" value={followUpData.quemContactou} onChange={v => setFollowUpData({ ...followUpData, quemContactou: v })} />
              <InputField label="Quando?" type="date" value={followUpData.dataContato} onChange={v => setFollowUpData({ ...followUpData, dataContato: v })} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Observações do Acompanhamento</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm h-32" value={followUpData.observacao} onChange={e => setFollowUpData({ ...followUpData, observacao: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowFollowUpModal(null)} className="flex-1 font-black text-gray-400 uppercase text-[10px]">CANCELAR</button>
              <button onClick={handleConfirmFollowUp} id="btn-save-followup" className="flex-1 py-4 bg-lime-peregrinas text-black font-black rounded-2xl text-[10px] uppercase">CONFIRMAR CONTATO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ label, icon: Icon, color, count }: any) => (
  <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border border-gray-100 w-fit shadow-sm">
    <Icon size={20} className={color} />
    <h2 className="text-sm font-black text-gray-800 uppercase tracking-[0.2em]">{label} ({count})</h2>
  </div>
);

const HarvestCard = ({ prospect, onToggle, onDelete }: any) => (
  <div className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group transition-all ${prospect.contatoFeito ? 'opacity-75' : ''}`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{prospect.dataAbordagem ? new Date(prospect.dataAbordagem).toLocaleDateString() : 'Sem Data'}</span>
      <div className="flex gap-2">
        <button onClick={onToggle} className={`p-2 rounded-xl border transition-all ${prospect.contatoFeito ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-300 border-gray-100 hover:text-green-500'}`}><CheckCircle size={20} /></button>
        <button onClick={onDelete} className="p-2 text-gray-200 hover:text-red-500"><Trash2 size={20} /></button>
      </div>
    </div>
    <h3 className="text-2xl font-black text-gray-900 mb-2">{prospect.nome}</h3>
    <div className="flex flex-wrap items-center gap-4 text-gray-400 mb-6">
      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={12} /> {prospect.bairro || 'S/B'}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><User size={12} /> {prospect.idade || '--'} anos</span>
    </div>

    {prospect.contatoFeito && (
      <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Contato realizado por: {prospect.quemContactou}</p>
        <p className="text-[10px] font-bold text-gray-600 line-clamp-2 italic">"{prospect.observacao}"</p>
      </div>
    )}

    <div className="flex space-x-3">
      <a href={`https://wa.me/55${prospect.whatsapp.replace(/\D/g, '')}`} target="_blank" className={`flex-1 py-4 text-white rounded-2xl flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${prospect.contatoFeito ? 'bg-gray-400' : 'bg-green-500'}`}>
        <MessageCircle size={18} /> <span>{prospect.contatoFeito ? 'CONSOLIDAR NOVAMENTE' : 'CONSOLIDAR AGORA'}</span>
      </a>
    </div>
  </div>
);

const InputField = ({ label, type = "text", value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border-none focus:ring-2 focus:ring-lime-peregrinas" onChange={e => onChange(e.target.value)} value={value || ''} />
  </div>
);

export default HarvestView;
