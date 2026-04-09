
import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, Search, Calendar, AlertCircle, UserCheck, ClipboardList, Clock, User, Undo2, VideoOff } from 'lucide-react';
import { Event, Participant } from '../types';
import { loadData, saveRecord } from '../services/dataService';

const CheckIn: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [history, setHistory] = useState<{ name: string; time: string; type: string; participantId: string }[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectorRef = useRef<any>(null);

  const [eventParticipants, setEventParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const evList = await loadData<Event>('events');
      setEvents(evList);
      // Auto-select from URL hash if present
      const hash = window.location.hash;
      const match = hash.match(/checkin=([^&]+)/);
      if (match) {
        const eventId = decodeURIComponent(match[1]);
        const found = evList.find(e => e.id === eventId);
        if (found) setSelectedEventId(found.id);
      }
    };
    fetchData();

    // Check if BarcodeDetector is available
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch { }
    }
  }, []);

  useEffect(() => {
    const ev = events.find(e => e.id === selectedEventId);
    setEventParticipants(ev ? ev.participantes : []);
  }, [selectedEventId, events]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);

      // Wait for next render to attach video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => { });
          };
        }
        // Start scan loop
        if (detectorRef.current) {
          scanIntervalRef.current = setInterval(scanFrame, 400);
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Permissão de câmera negada. Toque em "Permitir" quando solicitado.'
        : 'Câmera indisponível neste dispositivo.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    const video = videoRef.current;
    if (video.readyState < video.HAVE_ENOUGH_DATA) return;

    try {
      const barcodes = await detectorRef.current.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        if (code) {
          handleCheckIn(code);
          stopCamera();
        }
      }
    } catch { }
  };

  const handleCheckIn = (input: string) => {
    if (!selectedEventId) return alert("Selecione o evento primeiro!");
    if (!input.trim()) return;

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
      } else if ((participant as any).presente) {
        setStatus('error');
        setMessage(`${participant.nome} já está presente.`);
      } else {
        markPresence(participant.id, true);
        setStatus('success');
        setMessage(`${participant.nome} confirmado!`);
        setHistory(prev => [{
          name: participant.nome,
          time: new Date().toLocaleTimeString('pt-BR'),
          type: participant.tipoParticipacao,
          participantId: participant.id
        }, ...prev].slice(0, 100));
        setManualSearch('');
      }
    } else {
      setStatus('error');
      setMessage("Participante não localizado.");
    }

    setTimeout(() => { setStatus('idle'); setMessage(''); }, 2500);
  };

  const markPresence = async (participantId: string, present: boolean) => {
    const updated = events.map(e => {
      if (e.id === selectedEventId) {
        return {
          ...e,
          participantes: e.participantes.map(p =>
            p.id === participantId
              ? { ...p, presente: present, dataCheckin: present ? new Date().toISOString() : p.dataInscricao }
              : p
          )
        };
      }
      return e;
    });
    setEvents(updated);
    const targetEvent = updated.find(e => e.id === selectedEventId);
    if (targetEvent) {
      try { await saveRecord('events', targetEvent); } catch { }
    }
  };

  const undoCheckIn = (participantId: string) => {
    markPresence(participantId, false);
    setHistory(prev => prev.filter(h => h.participantId !== participantId));
  };

  const filteredSearch = manualSearch.length > 1
    ? eventParticipants.filter(p =>
      p.nome.toLowerCase().includes(manualSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(manualSearch.toLowerCase())
    ).slice(0, 5)
    : [];

  const presentCount = eventParticipants.filter(p => (p as any).presente).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 animate-in">
      <div className="text-center space-y-1">
        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">Validação de Acesso</h1>
        <p className="text-gray-500 font-medium italic text-sm">Scanner QR e busca manual</p>
      </div>

      {/* Event Selector */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3 text-lime-600 font-black uppercase tracking-widest text-[10px] mb-3"><Calendar size={14} /> Evento Ativo</div>
        <select
          className="w-full p-3 bg-gray-50 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-lime-peregrinas uppercase"
          value={selectedEventId}
          onChange={e => setSelectedEventId(e.target.value)}
        >
          <option value="">Selecione o Evento...</option>
          {events.filter(e => e.status === 'Ativo').map(e => <option key={e.id} value={e.id}>{e.nome} ({e.participantes.length} inscritos)</option>)}
        </select>
        {selectedEventId && (
          <div className="flex gap-4 mt-3 text-[10px] font-black uppercase text-gray-500">
            <span>Total: {eventParticipants.length}</span>
            <span className="text-lime-600">Presentes: {presentCount}</span>
            <span className="text-orange-500">Restantes: {eventParticipants.length - presentCount}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Camera Scanner */}
          <div className={`aspect-video w-full rounded-2xl overflow-hidden relative border-4 shadow-xl transition-all duration-300 ${status === 'success' ? 'border-lime-400 bg-lime-50' :
              status === 'error' ? 'border-red-400 bg-red-50' :
                'border-gray-800 bg-gray-900'
            }`}>
            {cameraActive && (
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              {status === 'success' ? (
                <div className="animate-in zoom-in">
                  <CheckCircle size={56} className="text-lime-600 mx-auto mb-2" />
                  <p className="text-lg font-black uppercase text-lime-700">Validado ✓</p>
                  <p className="text-xs font-bold opacity-60">{message}</p>
                </div>
              ) : status === 'error' ? (
                <div className="animate-in zoom-in text-red-600">
                  <AlertCircle size={56} className="mx-auto mb-2" />
                  <p className="text-lg font-black uppercase">Recusado</p>
                  <p className="text-xs font-bold opacity-60">{message}</p>
                </div>
              ) : !cameraActive ? (
                <div className="text-white flex flex-col items-center gap-3">
                  {cameraError ? (
                    <>
                      <AlertCircle size={32} className="text-red-400" />
                      <p className="text-xs font-bold text-red-300 max-w-[200px]">{cameraError}</p>
                      <button onClick={startCamera} className="mt-2 px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase">Tentar novamente</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startCamera}
                        disabled={!selectedEventId}
                        className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-lime-500/30 flex items-center justify-center transition-all disabled:opacity-20 active:scale-95"
                      >
                        <Camera size={28} />
                      </button>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                        {selectedEventId ? 'Toque para ativar câmera' : 'Selecione um evento'}
                      </p>
                      {!detectorRef.current && selectedEventId && (
                        <p className="text-[8px] text-yellow-400 font-bold mt-1">QR automático indisponível neste navegador. Use busca manual.</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="absolute top-3 right-3 z-10">
                  <button onClick={stopCamera} className="bg-red-500 text-white p-2 rounded-xl shadow-lg active:scale-95"><VideoOff size={16} /></button>
                </div>
              )}
            </div>

            {cameraActive && status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-lime-400/50 rounded-2xl animate-pulse" />
              </div>
            )}
          </div>

          {/* Manual Search */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  placeholder="ID, Nome ou CPF..."
                  disabled={!selectedEventId}
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheckIn(manualSearch)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-white border shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-lime-peregrinas disabled:opacity-20"
                />
              </div>
              <button
                onClick={() => handleCheckIn(manualSearch)}
                disabled={!selectedEventId || !manualSearch}
                className="bg-black text-white px-6 rounded-xl font-black uppercase text-[10px] disabled:opacity-20 shadow-lg active:scale-95 transition-all"
              >
                Checar
              </button>
            </div>
            {filteredSearch.length > 0 && (
              <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
                {filteredSearch.map(p => (
                  <button key={p.id} onClick={() => handleCheckIn(p.id)} className="w-full p-3 flex items-center justify-between hover:bg-lime-50 border-b last:border-0 transition-colors">
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">{p.nome}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase">{p.tipoParticipacao} • {p.id}</p>
                    </div>
                    {(p as any).presente
                      ? <span className="text-[8px] font-black bg-lime-100 text-lime-700 px-2 py-1 rounded uppercase">Presente</span>
                      : <User size={14} className="text-gray-300" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col" style={{ minHeight: 280, maxHeight: 500 }}>
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <h3 className="text-sm font-black uppercase flex items-center gap-2"><ClipboardList className="text-lime-600" size={16} /> Histórico ({history.length})</h3>
            {history.length > 0 && <button onClick={() => setHistory([])} className="text-[9px] font-black text-red-400 uppercase">Limpar</button>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate">{h.name}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">{h.type} • {h.time}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => undoCheckIn(h.participantId)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Desfazer"><Undo2 size={14} /></button>
                  <span className="text-lime-600 font-black text-[9px] bg-lime-50 px-2 py-1 rounded border flex items-center gap-1"><Clock size={10} />{h.time}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-300 opacity-50">
                <UserCheck size={40} className="mb-2" />
                <p className="font-black uppercase text-[9px] tracking-widest">Nenhuma presença</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
