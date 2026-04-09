
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle, Search, Calendar, AlertCircle, UserCheck, X, ClipboardList, Clock, User, Undo2, Video, VideoOff } from 'lucide-react';
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

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

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start scanning loop
      scanIntervalRef.current = setInterval(() => {
        scanFrame();
      }, 500);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
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
    setCameraActive(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use BarcodeDetector API if available (Chrome, Edge, Android)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      detector.detect(imageData).then((barcodes: any[]) => {
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          handleCheckIn(code);
          stopCamera();
        }
      }).catch(() => { });
    }
  };

  const handleCheckIn = (input: string) => {
    if (!selectedEventId) return alert("Por favor, selecione o evento primeiro!");
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
        // Mark as present and persist
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
      setMessage(`Participante não localizado.`);
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
      try {
        await saveRecord('events', targetEvent);
      } catch (err) {
        console.error('Erro ao salvar presença:', err);
      }
    }
  };

  const undoCheckIn = (participantId: string) => {
    markPresence(participantId, false);
    setHistory(prev => prev.filter(h => h.participantId !== participantId));
  };

  const filteredSearch = manualSearch.length > 2
    ? eventParticipants.filter(p => p.nome.toLowerCase().includes(manualSearch.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 py-6 md:py-10 px-4 animate-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-gray-900">Validação de Acesso</h1>
        <p className="text-gray-500 font-medium italic text-sm">Scanner QR e busca manual em tempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="space-y-6">
          <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] border shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-lime-600 font-black uppercase tracking-widest text-[10px]"><Calendar size={16} /> Evento Ativo</div>
            <select
              className="w-full p-3 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl font-black text-sm outline-none border-none transition-all focus:ring-2 focus:ring-lime-peregrinas uppercase tracking-tighter"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">Selecione o Evento para Check-in...</option>
              {events.filter(e => e.status === 'Ativo').map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {/* Camera / Scanner Area */}
          <div className={`aspect-video w-full rounded-2xl md:rounded-[3rem] overflow-hidden relative border-4 md:border-8 shadow-2xl transition-all duration-500 ${status === 'success' ? 'border-lime-peregrinas bg-lime-50' : status === 'error' ? 'border-red-500 bg-red-50' : 'border-gray-900 bg-gray-900'
            }`}>
            {/* Hidden canvas for frame processing */}
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && (
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8">
              {status === 'success' ? (
                <div className="animate-in zoom-in">
                  <CheckCircle size={60} className="text-lime-600 mx-auto mb-3" />
                  <p className="text-xl md:text-3xl font-black uppercase text-lime-700">Validado ✓</p>
                  <p className="text-xs font-bold opacity-60 mt-1">{message}</p>
                </div>
              ) : status === 'error' ? (
                <div className="animate-in zoom-in text-red-600">
                  <AlertCircle size={60} className="mx-auto mb-3" />
                  <p className="text-xl md:text-3xl font-black uppercase">Recusado</p>
                  <p className="text-xs font-bold opacity-60 mt-1">{message}</p>
                </div>
              ) : !cameraActive ? (
                <div className="text-white flex flex-col items-center">
                  <button
                    onClick={startCamera}
                    disabled={!selectedEventId}
                    className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4 hover:bg-white/20 transition-all disabled:opacity-30"
                  >
                    <Camera size={32} />
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    {selectedEventId ? 'Toque para ativar câmera' : 'Selecione um evento'}
                  </p>
                </div>
              ) : (
                <div className="absolute top-3 right-3 z-10">
                  <button onClick={stopCamera} className="bg-red-500 text-white p-2 rounded-xl shadow-lg"><VideoOff size={16} /></button>
                </div>
              )}
            </div>

            {/* Scan guide overlay */}
            {cameraActive && status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-lime-400/60 rounded-3xl" />
              </div>
            )}
          </div>

          {/* Manual Search */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  placeholder="ID, Nome, E-mail ou CPF..."
                  disabled={!selectedEventId}
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleCheckIn(manualSearch)}
                  className="w-full pl-10 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-lime-peregrinas transition-all disabled:opacity-20"
                />
              </div>
              <button
                onClick={() => handleCheckIn(manualSearch)}
                disabled={!selectedEventId || !manualSearch}
                className="bg-black text-white px-6 md:px-10 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-20 shadow-xl active:scale-95 transition-all"
              >
                Checar
              </button>
            </div>
            {filteredSearch.length > 0 && (
              <div className="bg-white rounded-xl border shadow-lg overflow-hidden animate-in fade-in">
                {filteredSearch.map(p => (
                  <button key={p.id} onClick={() => handleCheckIn(p.nome)} className="w-full p-3 flex items-center justify-between hover:bg-lime-50 border-b last:border-0 transition-colors">
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-900">{p.nome}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase">{p.email} • {p.tipoParticipacao}</p>
                    </div>
                    {(p as any).presente
                      ? <span className="text-[8px] font-black bg-lime-100 text-lime-700 px-2 py-1 rounded-lg uppercase">Presente</span>
                      : <User size={14} className="text-gray-300" />
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        <div className="bg-white rounded-2xl md:rounded-[3rem] border shadow-sm p-4 md:p-10 space-y-4 md:space-y-6 flex flex-col" style={{ minHeight: 300 }}>
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm md:text-xl font-black uppercase flex items-center gap-2"><ClipboardList className="text-lime-600" size={18} /> Histórico</h3>
            <button onClick={() => setHistory([])} className="text-[9px] font-black text-red-400 uppercase hover:text-red-600">Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 400 }}>
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl animate-in slide-in-from-right-4 border border-gray-100">
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate">{h.name}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">{h.type} • {h.time}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => undoCheckIn(h.participantId)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Desfazer check-in"
                  >
                    <Undo2 size={14} />
                  </button>
                  <div className="text-lime-600 font-black text-[10px] bg-white px-2 py-1 rounded-lg border flex items-center gap-1">
                    <Clock size={10} /> {h.time}
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300 opacity-50">
                <UserCheck size={48} className="mb-3" />
                <p className="text-center font-black uppercase text-[9px] tracking-widest">Nenhuma presença registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
