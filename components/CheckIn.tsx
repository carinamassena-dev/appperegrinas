
import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, Search, Calendar, AlertCircle, UserCheck, X, ClipboardList, Clock, User } from 'lucide-react';
import { Event, Participant } from '../types';
import { loadData } from '../services/dataService';

const CheckIn: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [history, setHistory] = useState<{ name: string, time: string, type: string }[]>([]);

  const [eventParticipants, setEventParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const evList = await loadData<Event>('events');
      setEvents(evList);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const ev = events.find(e => e.id === selectedEventId);
    setEventParticipants(ev ? ev.participantes : []);
  }, [selectedEventId, events]);

  const saveHistory = (newEntry: any) => {
    const updated = [newEntry, ...history].slice(0, 100);
    setHistory(updated);
  };

  const handleCheckIn = (input: string) => {
    if (!selectedEventId) return alert("Por favor, selecione o evento primeiro!");
    if (!input.trim()) return;

    // Busca por ID, Nome (parcial) ou Email
    const participant = eventParticipants.find(p =>
      p.id.toLowerCase() === input.toLowerCase() ||
      p.nome.toLowerCase().includes(input.toLowerCase()) ||
      p.email.toLowerCase() === input.toLowerCase() ||
      p.formaIdentificacao?.toLowerCase() === input.toLowerCase()
    );

    if (participant) {
      if (participant.status === 'Cancelada') {
        setStatus('error');
        setMessage("Inscrição Cancelada!");
      } else {
        setStatus('success');
        setMessage(`${participant.nome} confirmado!`);
        saveHistory({
          name: participant.nome,
          time: new Date().toLocaleTimeString('pt-BR'),
          type: participant.tipoParticipacao
        });
        setManualSearch('');
      }
    } else {
      setStatus('error');
      setMessage(`Participante não localizado.`);
    }

    setTimeout(() => { setStatus('idle'); setMessage(''); }, 2500);
  };

  const filteredSearch = manualSearch.length > 2
    ? eventParticipants.filter(p => p.nome.toLowerCase().includes(manualSearch.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-10 px-4 animate-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Validação de Acesso</h1>
        <p className="text-gray-500 font-medium italic">Scanner QR e busca manual em tempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-lime-600 font-black uppercase tracking-widest text-[10px]"><Calendar size={16} /> Evento Ativo</div>
            <select
              className="w-full p-5 bg-gray-50 rounded-2xl font-black text-sm outline-none border-none transition-all focus:ring-2 focus:ring-lime-peregrinas uppercase tracking-tighter"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">Selecione o Evento para Check-in...</option>
              {events.filter(e => e.status === 'Ativo').map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div className={`aspect-video w-full rounded-[3.5rem] overflow-hidden relative border-8 shadow-2xl transition-all duration-500 flex items-center justify-center ${status === 'success' ? 'border-lime-peregrinas bg-lime-50' : status === 'error' ? 'border-red-500 bg-red-50' : 'border-gray-900 bg-gray-900'
            }`}>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              {status === 'success' ? (
                <div className="animate-in zoom-in">
                  <CheckCircle size={80} className="text-lime-600 mx-auto mb-4" />
                  <p className="text-3xl font-black uppercase text-lime-700">Validado ✓</p>
                  <p className="text-sm font-bold opacity-60 mt-2">{message}</p>
                </div>
              ) : status === 'error' ? (
                <div className="animate-in zoom-in text-red-600">
                  <AlertCircle size={80} className="mx-auto mb-4" />
                  <p className="text-3xl font-black uppercase">Recusado</p>
                  <p className="text-sm font-bold opacity-60 mt-2">{message}</p>
                </div>
              ) : (
                <div className="text-white flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-6 animate-pulse">
                    <Camera size={40} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Aguardando Validação</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input
                  type="text"
                  placeholder="ID, Nome, E-mail ou CPF..."
                  disabled={!selectedEventId}
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleCheckIn(manualSearch)}
                  className="w-full pl-12 pr-4 py-5 rounded-[1.5rem] bg-white border shadow-sm font-bold outline-none focus:ring-2 focus:ring-lime-peregrinas transition-all disabled:opacity-20"
                />
              </div>
              <button
                onClick={() => handleCheckIn(manualSearch)}
                disabled={!selectedEventId || !manualSearch}
                className="bg-black text-white px-10 rounded-[1.5rem] font-black uppercase text-xs tracking-widest disabled:opacity-20 shadow-xl active:scale-95 transition-all"
              >
                Checar
              </button>
            </div>
            {filteredSearch.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-lg overflow-hidden animate-in fade-in">
                {filteredSearch.map(p => (
                  <button key={p.id} onClick={() => handleCheckIn(p.nome)} className="w-full p-4 flex items-center justify-between hover:bg-lime-50 border-b last:border-0 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900">{p.nome}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{p.email}</p>
                    </div>
                    <User size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[3.5rem] border shadow-sm p-10 space-y-8 h-full min-h-[500px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-xl font-black uppercase flex items-center gap-3"><ClipboardList className="text-lime-600" /> Histórico de Presença</h3>
            <button onClick={() => { setHistory([]); }} className="text-[9px] font-black text-red-400 uppercase hover:text-red-600">Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl animate-in slide-in-from-right-4 border border-gray-100">
                <div>
                  <p className="text-sm font-black text-gray-800">{h.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{h.type}</p>
                </div>
                <div className="flex items-center gap-2 text-lime-600 font-black text-xs bg-white px-3 py-1 rounded-lg shadow-sm border">
                  <Clock size={12} /> {h.time}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300 opacity-50">
                <UserCheck size={60} className="mb-4" />
                <p className="text-center font-black uppercase text-[10px] tracking-widest">Nenhuma presença registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
