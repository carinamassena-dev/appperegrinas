
import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Edit2, UserPlus, Search, QrCode, Mail, CheckCircle2, Loader2, AlertTriangle, Download, Clock, MapPin, Tag, Users, Info, Calendar, Phone, Table, Check, LogOut, FileText } from 'lucide-react';
import { Event, Participant, EventCategory, EventStatus, EventType, ParticipantStatus, ParticipationType } from '../types';
import { logAction } from '../services/auditService';
import { AuthContext } from '../App';
import { useContext } from 'react';
import { draftService } from '../services/draftService';
import { loadData, saveRecord, saveList, deleteRecord } from '../services/dataService';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState<Event | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useContext(AuthContext)!;

  const initialEvent: Partial<Event> = {
    nome: '',
    descricao: '',
    categoria: 'Congresso',
    dataInicio: '',
    dataTermino: '',
    horario: '',
    local: '',
    tipo: 'Presencial',
    valorPadrao: 0,
    capacidadeMax: 50,
    status: 'Ativo',
    participantes: []
  };

  const [newEvent, setNewEvent] = useState<Partial<Event>>(initialEvent);
  const [newReg, setNewReg] = useState<Partial<Participant>>({
    nome: '', email: '', whatsapp: '', valorInscricao: 0,
    formaIdentificacao: '', tipoParticipacao: 'Participante', status: 'Confirmada'
  });
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await loadData<Event>('events');
        setEvents(data);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Load draft on mount for new events
  useEffect(() => {
    if (!showModal) {
      const draft = draftService.getDraft('events');
      if (draft && Object.keys(draft).length > 0) {
        setNewEvent(draft);
      }
    }
  }, [showModal]);

  // Save to draft when typing
  useEffect(() => {
    if (showModal && !newEvent.id && newEvent.nome !== undefined && newEvent.nome.trim() !== '') {
      draftService.saveDraft('events', newEvent);
    }
  }, [newEvent, showModal]);

  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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
        nome: findCol(['nome', 'evento', 'titulo']),
        categoria: findCol(['categoria', 'tipo']),
        data: findCol(['data', 'data inicio', 'inicio']),
        local: findCol(['local', 'endereco']),
        valor: findCol(['valor', 'preco', 'investimento']),
        capacidade: findCol(['capacidade', 'vagas', 'limite'])
      };

      const imported: Event[] = [];
      rows.slice(1).forEach(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 2 || !cols[m.nome] || cols[m.nome].trim() === "") return;

        const ev: Event = {
          id: `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          nome: cols[m.nome],
          descricao: '',
          categoria: (cols[m.categoria] as any) || 'Congresso',
          dataInicio: cols[m.data] || '',
          dataTermino: cols[m.data] || '',
          horario: '19:00',
          local: cols[m.local] || '',
          tipo: 'Presencial',
          valorPadrao: parseFloat(cols[m.valor]) || 0,
          capacidadeMax: parseInt(cols[m.capacidade]) || 50,
          status: 'Ativo',
          participantes: []
        };
        imported.push(ev);
      });

      const updated = [...events, ...imported];
      setEvents(updated);
      Promise.all(imported.map(e => saveRecord('events', e))).catch(console.error);
      alert(`${imported.length} eventos importados com sucesso!`);
    };
    reader.readAsText(file);
  };

  const saveEvents = async (data: Event[], changedItem?: Event) => {
    try {
      if (changedItem) {
        await saveRecord('events', changedItem);
        draftService.clearDraft('events');
      }
      setEvents(data);
    } catch (err) {
      console.error("Erro ao salvar", err);
      if (changedItem) draftService.saveDraft('events', changedItem);
      alert("Sistema em manutenção. Seu rascunho foi salvo com segurança no seu aparelho!");
      throw err;
    }
  };

  const exportInscritos = (event: Event) => {
    const headers = "ID Inscrição,Nome,Email,Whatsapp,Status,Tipo,Participação,Data Inscrição\n";
    const csv = event.participantes.map(p => `${p.id},${p.nome},${p.email},${p.whatsapp},${p.status},${p.tipoParticipacao},${p.dataInscricao}`).join('\n');
    const blob = new Blob([headers + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos_${event.nome.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const handleAddRegistration = async () => {
    if (!showRegModal || !newReg.nome || !newReg.email) return;
    if (!editingParticipant && showRegModal.participantes.length >= showRegModal.capacidadeMax) return alert("CAPACIDADE MÁXIMA ATINGIDA!");

    const participant: Participant = editingParticipant
      ? { ...editingParticipant, ...newReg as Participant }
      : {
        ...newReg as Participant,
        id: `REG_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        isGuest: true,
        dataInscricao: new Date().toISOString()
      };

    const updated = events.map(e => {
      if (e.id === showRegModal.id) {
        const participants = editingParticipant
          ? e.participantes.map(p => p.id === editingParticipant.id ? participant : p)
          : [...e.participantes, participant];
        return { ...e, participantes: participants };
      }
      return e;
    });

    const targetedEvent = updated.find(e => e.id === showRegModal.id);

    try {
      await saveEvents(updated, targetedEvent);
      logAction(user?.nome || 'Operador', editingParticipant ? "Participante Editado" : "Nova Inscrição", `${participant.nome} - Evento: ${showRegModal.nome}`, "EVENTO");
    } catch (err) {
      return; // Error already warned in saveEvents
    }

    if (!editingParticipant) {
      setEmailStatus('sending');
      setTimeout(() => {
        setEmailStatus('sent');
        setTimeout(() => setEmailStatus('idle'), 2000);
      }, 1200);
    }

    setNewReg({ nome: '', email: '', whatsapp: '', valorInscricao: 0, formaIdentificacao: '', tipoParticipacao: 'Participante', status: 'Confirmada' });
    setEditingParticipant(null);
    setShowRegModal(updated.find(e => e.id === showRegModal.id) || null);
  };

  const handleDeleteParticipant = async (eventId: string, participantId: string) => {
    if (!confirm("Excluir esta inscrição definitivamente?")) return;
    const event = events.find(e => e.id === eventId);
    const participant = event?.participantes.find(p => p.id === participantId);

    const updated = events.map(e => e.id === eventId ? { ...e, participantes: e.participantes.filter(p => p.id !== participantId) } : e);
    const targetedEvent = updated.find(e => e.id === eventId);

    try {
      await saveEvents(updated, targetedEvent);
      logAction(user?.nome || 'Operador', "Inscrição Excluída", `${participant?.nome} removida do evento ${event?.nome}`, "EVENTO");
      setShowRegModal(updated.find(e => e.id === eventId) || null);
    } catch { return; }
  };

  const togglePresence = async (eventId: string, participantId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId) {
        const participants = e.participantes.map(p => {
          if (p.id === participantId) {
            const isPresent = (p as any).presente;
            return { ...p, presente: !isPresent, dataCheckin: !isPresent ? new Date().toISOString() : p.dataInscricao };
          }
          return p;
        });
        return { ...e, participantes: participants };
      }
      return e;
    });
    const targetedEvent = updated.find(e => e.id === eventId);

    try {
      await saveEvents(updated, targetedEvent);
      const event = events.find(e => e.id === eventId);
      const participant = event?.participantes.find(p => p.id === participantId);
      logAction(user?.nome || 'Check-in', "Status de Presença", `${participant?.nome} - ${!(participant as any).presente ? 'Entrou' : 'Saiu'}`, "EVENTO");
      setShowRegModal(updated.find(e => e.id === eventId) || null);
    } catch { return; }
  };

  const filteredParticipants = showRegModal?.participantes.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Eventos & Inscrições</h1>
          <p className="text-gray-400 font-medium italic">Logística e controle de acessos da Rede</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-white border-2 border-lime-peregrinas text-black font-black px-6 py-4 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-lime-peregrinas transition-all text-xs shadow-lg">
            <Table size={18} />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button onClick={() => { setNewEvent(initialEvent); setShowModal(true); }} className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all flex items-center gap-2 tracking-widest">
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map(event => (
          <div key={event.id} className="bg-white p-8 rounded-[3rem] border shadow-sm group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-1">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${event.status === 'Ativo' ? 'bg-lime-peregrinas text-black' : 'bg-red-50 text-red-500'}`}>{event.status}</span>
                <span className="text-[10px] font-black uppercase text-gray-400">{event.categoria} • {event.tipo}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNewEvent(event); setShowModal(true); }} title="Editar Evento" className="p-2 text-gray-200 hover:text-black transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => exportInscritos(event)} title="Baixar Inscritos" className="p-2 text-gray-200 hover:text-black transition-colors"><Download size={16} /></button>
                <button onClick={async () => {
                  if (confirm("Excluir evento?")) {
                    setEvents(events.filter(x => x.id !== event.id));
                    await deleteRecord('events', event.id);
                  }
                }} className="p-2 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{event.nome}</h3>
            <div className="space-y-2 mb-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2"><Clock size={12} /> {event.dataInicio} {event.horario && `às ${event.horario}`}</div>
              <div className="flex items-center gap-2"><MapPin size={12} /> {event.local}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Inscritos</p>
                <p className="text-xl font-black">{event.participantes.length} / {event.capacidadeMax}</p>
              </div>
              <div className="p-4 bg-lime-50 rounded-2xl">
                <p className="text-[8px] font-black text-lime-600 uppercase mb-1">Preenchimento</p>
                <p className="text-xl font-black">{Math.round((event.participantes.length / event.capacidadeMax) * 100)}%</p>
              </div>
            </div>

            <button onClick={() => setShowRegModal(event)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">Gerenciar Inscritos</button>
          </div>
        ))}
        {events.length === 0 && (
          <div className="col-span-full py-24 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
            <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-300 font-black uppercase tracking-widest">Nenhum evento programado</p>
          </div>
        )}
      </div>

      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] p-10 space-y-8 animate-in flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center border-b pb-6 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-black uppercase">{showRegModal.nome}</h2>
                <p className="text-[10px] font-black uppercase text-lime-600">Gestão de Bilheteria • {showRegModal.participantes.length} Inscritos</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => exportInscritos(showRegModal)} className="text-[9px] font-black uppercase text-lime-600 flex items-center gap-2 border border-lime-200 px-4 py-2 rounded-xl hover:bg-lime-50 transition-all"><Download size={14} /> Exportar CSV</button>
                <button onClick={() => setShowRegModal(null)}><X size={24} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 overflow-y-auto custom-scrollbar pr-4">
              <div className="lg:col-span-1 space-y-6">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Registrar Inscrição</h3>
                <div className="space-y-4">
                  <Input label="Nome Completo" value={newReg.nome} onChange={(v: any) => setNewReg({ ...newReg, nome: v })} />
                  <Input label="E-mail" type="email" value={newReg.email} onChange={(v: any) => setNewReg({ ...newReg, email: v })} />
                  <Input label="WhatsApp" value={newReg.whatsapp} onChange={(v: any) => setNewReg({ ...newReg, whatsapp: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Participação" value={newReg.tipoParticipacao} options={['Participante', 'Voluntário', 'Palestrante', 'Equipe']} onChange={(v: any) => setNewReg({ ...newReg, tipoParticipacao: v as any })} />
                    <Select label="Status" value={newReg.status} options={['Confirmada', 'Pendente', 'Cancelada']} onChange={(v: any) => setNewReg({ ...newReg, status: v as any })} />
                  </div>
                  <Input label="Forma de Identificação (RG/CPF)" value={newReg.formaIdentificacao} onChange={(v: any) => setNewReg({ ...newReg, formaIdentificacao: v })} />
                  <Input label="Valor da Inscrição (R$)" type="number" value={newReg.valorInscricao} onChange={(v: any) => setNewReg({ ...newReg, valorInscricao: parseFloat(v) })} />
                  <button
                    onClick={handleAddRegistration}
                    disabled={!editingParticipant && showRegModal.participantes.length >= showRegModal.capacidadeMax}
                    className={`w-full py-4 rounded-2xl shadow-xl font-black uppercase text-xs tracking-widest transition-all ${editingParticipant ? 'bg-black text-white' : 'bg-lime-peregrinas text-black'}`}
                  >
                    {editingParticipant ? 'Salvar Alterações' : 'Confirmar & Gerar QR'}
                  </button>
                  {editingParticipant && (
                    <button onClick={() => { setEditingParticipant(null); setNewReg({ nome: '', email: '', whatsapp: '', valorInscricao: 0, formaIdentificacao: '', tipoParticipacao: 'Participante', status: 'Confirmada' }); }} className="w-full text-[9px] font-black text-gray-400 uppercase">Cancelar Edição</button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Lista de Participantes</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                    <input type="text" placeholder="Pesquisar..." className="pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold outline-none w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {filteredParticipants.map(p => (
                    <div key={p.id} className="p-5 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white border hover:border-lime-200 transition-all">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => togglePresence(showRegModal.id, p.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border transition-all ${(p as any).presente ? 'bg-black text-white' : 'bg-white text-gray-300'}`}
                        >
                          {(p as any).presente ? <Check size={18} /> : p.nome.charAt(0)}
                        </button>
                        <div>
                          <p className="text-sm font-black text-gray-900">{p.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${p.status === 'Confirmada' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>{p.status}</span>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{p.tipoParticipacao}</span>
                            {(p as any).presente && <span className="text-[8px] font-black bg-lime-400 text-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><Clock size={8} /> Presente</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID: {p.id}</p>
                          <p className="text-[8px] text-gray-300 font-bold">{new Date(p.dataInscricao).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingParticipant(p); setNewReg(p); }} className="p-2 text-gray-400 hover:text-black"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteParticipant(showRegModal.id, p.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                        <QrCode className={`transition-colors ${(p as any).presente ? 'text-black' : 'text-gray-200'}`} size={28} />
                      </div>
                    </div>
                  ))}
                  {filteredParticipants.length === 0 && <p className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhuma inscrição encontrada</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 space-y-8 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Novo Evento Peregrinas</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Input label="Nome do Evento" value={newEvent.nome} onChange={(v: any) => setNewEvent({ ...newEvent, nome: v })} />
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">Descrição Completa</label>
                  <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold h-24 text-sm outline-none border-none focus:ring-2 focus:ring-lime-100" value={newEvent.descricao} onChange={e => setNewEvent({ ...newEvent, descricao: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Data de Início" type="date" value={newEvent.dataInicio} onChange={(v: any) => setNewEvent({ ...newEvent, dataInicio: v })} />
                  <Input label="Data de Término" type="date" value={newEvent.dataTermino} onChange={(v: any) => setNewEvent({ ...newEvent, dataTermino: v })} />
                </div>
                <Input label="Horário de Início" type="time" value={newEvent.horario} onChange={(v: any) => setNewEvent({ ...newEvent, horario: v })} />
              </div>
              <div className="space-y-4">
                <Input label="Local / Endereço / Link" value={newEvent.local} onChange={(v: any) => setNewEvent({ ...newEvent, local: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Tipo de Evento" value={newEvent.tipo} options={['Presencial', 'Online', 'Híbrido']} onChange={(v: any) => setNewEvent({ ...newEvent, tipo: v as any })} />
                  <Select label="Categoria" value={newEvent.categoria} options={['Congresso', 'Encontro', 'Treinamento', 'Social', 'Outros']} onChange={(v: any) => setNewEvent({ ...newEvent, categoria: v as any })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Capacidade Máxima" type="number" value={newEvent.capacidadeMax} onChange={(v: any) => setNewEvent({ ...newEvent, capacidadeMax: parseInt(v) })} />
                  <Input label="Investimento (R$)" type="number" value={newEvent.valorPadrao} onChange={(v: any) => setNewEvent({ ...newEvent, valorPadrao: parseFloat(v) })} />
                </div>
                <Select label="Status Inicial" value={newEvent.status} options={['Ativo', 'Encerrado', 'Cancelado']} onChange={(v: any) => setNewEvent({ ...newEvent, status: v as any })} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400">Observações Estratégicas</label>
              <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold h-20 text-sm outline-none border-none focus:ring-2 focus:ring-lime-100" value={newEvent.observacoes} onChange={e => setNewEvent({ ...newEvent, observacoes: e.target.value })} />
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">DESCARTAR</button>
              <button onClick={async () => {
                if (!newEvent.nome) return alert("Preencha o nome!");
                try {
                  if (newEvent.id) {
                    const updated = events.map(e => e.id === newEvent.id ? newEvent as Event : e);
                    await saveEvents(updated, newEvent as Event);
                  } else {
                    const ev = { ...newEvent, id: `EVT_${Date.now()}`, participantes: [] } as Event;
                    await saveEvents([ev, ...events], ev);
                  }
                  setShowModal(false);
                  setNewEvent(initialEvent);
                } catch (err) {
                  // Do nothing, UI rollback handled by user retrying manually
                }
              }} className="flex-1 py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest">{newEvent.id ? 'SALVAR ALTERAÇÕES' : 'CRIAR EVENTO AGORA'}</button>
            </div>
          </div>
        </div>
      )}

      {emailStatus !== 'idle' && (
        <div className="fixed bottom-10 right-10 z-[100] bg-black text-white px-8 py-5 rounded-3xl flex items-center gap-4 shadow-2xl animate-in slide-in-from-right-10 border border-lime-500/30">
          {emailStatus === 'sending' ? <Loader2 className="animate-spin text-lime-400" size={20} /> : <CheckCircle2 className="text-lime-400" size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{emailStatus === 'sending' ? 'Processando Registro...' : 'Inscrição Confirmada!'}</span>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, type = "text", value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-none focus:ring-2 focus:ring-lime-100" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const Select = ({ label, options, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none border-none focus:ring-2 focus:ring-lime-100" value={value} onChange={e => onChange(e.target.value)}>
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default Events;
