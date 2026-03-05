
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, X, Search, Navigation, Trash2, Camera,
  Edit2, UserPlus, Table, Download, MapPin,
  Clock, LayoutGrid, List, Map as MapIcon, Filter,
  ChevronRight, ExternalLink, MessageCircle, UserCheck, Phone, MapPinned, Loader2, CalendarDays, AlertCircle
} from 'lucide-react';
import { Leader, Disciple } from '../types';
import { sendDataToSheet } from '../services/googleSheetsService';
import { loadData, saveRecord, deleteRecord, loadDisciplesList } from '../services/dataService';
import { supabaseService } from '../services/supabaseService';

declare const L: any;

const Leaders: React.FC = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [disciples, setDisciples] = useState<Disciple[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('Todos');
  const [selectedProfile, setSelectedProfile] = useState('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeCellTab, setActiveCellTab] = useState<'cel1' | 'cel2'>('cel1');
  const [visiblePinsCount, setVisiblePinsCount] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialLeader: Partial<Leader> = {
    nome: '', whatsapp: '', foto: '', fazMaisDeUmaCelula: false,
    isLeader: true,
    celula1: { ativa: true, perfil: 'Kingdom', dia: 'Segunda', horario: '20:00', modalidade: 'Presencial', endereco: '', bairro: '' },
    celula2: { ativa: false, perfil: '', dia: '', horario: '', modalidade: '', endereco: '', bairro: '' }
  };

  const [newLeader, setNewLeader] = useState<Partial<Leader>>(initialLeader);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allDisciples = await loadDisciplesList();
        setDisciples(allDisciples);
        const allLeaders = await supabaseService.getLeaders();
        setLeaders(allLeaders);
      } catch (err) {
        console.error('Erro ao carregar líderes:', err);
      }
    };
    fetchData();
  }, []);

  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const strVal = String(val);
    if (strVal.includes('Date(')) {
      const match = strVal.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
      if (match) {
        if (match[4] !== undefined) {
          const h = match[4].padStart(2, '0');
          const m = match[5].padStart(2, '0');
          return `${h}:${m}`;
        }
        const d = match[3].padStart(2, '0');
        const m = (parseInt(match[2]) + 1).toString().padStart(2, '0');
        return `${d}/${m}/${match[1]}`;
      }
    }
    return strVal;
  };

  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current) {
      if (typeof L === 'undefined') return;

      if (!mapRef.current) {
        try {
          mapRef.current = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
          }).setView([-12.9714, -38.5014], 12);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
          L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        } catch (err) {
          console.error("Erro ao inicializar mapa:", err);
        }
      }

      const timer = setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 400);

      markersRef.current.forEach(m => mapRef.current && mapRef.current.removeLayer(m));
      markersRef.current = [];

      const bounds: any[] = [];
      let count = 0;

      leaders.forEach(l => {
        const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return;

        const cells = [l.celula1];
        if (l.fazMaisDeUmaCelula && l.celula2) cells.push(l.celula2);

        cells.forEach((cell, idx) => {
          if (cell && cell.ativa && cell.localizacao && cell.localizacao.lat) {
            const cellBairro = (cell.bairro || '').trim().toLowerCase();
            const filterBairro = selectedBairro.trim().toLowerCase();
            const cellProfile = (cell.perfil || '').trim().toLowerCase();
            const filterProfile = selectedProfile.trim().toLowerCase();

            const matchesB = selectedBairro === 'Todos' || cellBairro === filterBairro;
            const matchesP = selectedProfile === 'Todos' || cellProfile === filterProfile;

            if (matchesB && matchesP) {
              count++;
              const color = cellProfile === 'kingdom' ? '#CCFF00' :
                cellProfile === 'dtx' ? '#a855f7' :
                  cellProfile === 'mulheres' ? '#ec4899' :
                    cellProfile === 'homens' ? '#3b82f6' :
                      cellProfile === 'kids' ? '#f59e0b' :
                        cellProfile === 'casais' ? '#10b981' : '#64748b';

              const textColor = cellProfile === 'kingdom' ? '#000' : '#fff';

              const marker = L.marker([cell.localizacao.lat, cell.localizacao.lng], {
                icon: L.divIcon({
                  className: '',
                  html: `<div style="background:${color}; width:34px; height:34px; border-radius:12px; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,0,0,0.2);"><div style="width:8px; height:8px; background:${textColor}; border-radius:50%;"></div></div>`,
                  iconSize: [34, 34],
                  iconAnchor: [17, 17]
                })
              }).addTo(mapRef.current);

              const popupHtml = `
                <div style="padding:15px; font-family:Inter; min-width:220px; text-align:center;">
                  <div style="width:70px; height:70px; margin: 0 auto 12px; border-radius:20px; overflow:hidden; border:3px solid ${color}; background:#f3f4f6;">
                    ${l.foto ? `<img src="${l.foto}" style="width:100%; height:100%; object-fit:cover;" />` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-weight:900; color:#ccc; font-size:24px;">${l.nome.charAt(0)}</div>`}
                  </div>
                  <h4 style="margin:0; font-weight:900; text-transform:uppercase; font-size:14px; color:#1a1a1a;">${l.nome}</h4>
                  <div style="margin:4px 0 10px; display:inline-block; background:${color}20; color:${color === '#CCFF00' ? '#6b8a00' : color}; padding:2px 10px; border-radius:6px; font-size:9px; font-weight:900; text-transform:uppercase;">
                    ${cell.perfil}
                  </div>
                  <div style="background:#f8fafc; padding:10px; border-radius:14px; margin-bottom:12px; text-align:left; border:1px solid #f1f5f9;">
                    <p style="margin:0 0 4px 0; font-size:8px; font-weight:900; color:#94a3b8; text-transform:uppercase;">Célula ${idx + 1} • ${cell.bairro}</p>
                    <p style="margin:0; font-size:10px; color:#475569; font-weight:700;">${cell.dia} • ${formatDisplayValue(cell.horario)}</p>
                  </div>
                  <a href="https://wa.me/55${l.whatsapp.replace(/\D/g, '')}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:8px; background:#25D366; color:white; padding:12px; border-radius:14px; font-weight:900; font-size:10px; text-decoration:none; text-transform:uppercase;">WhatsApp</a>
                </div>
              `;

              marker.bindPopup(popupHtml, { closeButton: false, className: 'peregrinas-map-popup', maxWidth: 280 });
              markersRef.current.push(marker);
              bounds.push([cell.localizacao.lat, cell.localizacao.lng]);
            }
          }
        });
      });

      setVisiblePinsCount(count);
      if (bounds.length > 0 && mapRef.current) mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

      return () => {
        clearTimeout(timer);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      }
    }
  }, [viewMode, leaders, selectedBairro, selectedProfile, searchTerm]);

  const handleSave = async () => {
    if (!newLeader.nome) return alert("Nome é obrigatório!");
    const personToSave = {
      ...newLeader as Leader,
      id: editId || Math.random().toString(36).substr(2, 9),
      isLeader: true
    };

    const updatedDisciples = editId
      ? disciples.map(d => d.id === editId ? personToSave : d)
      : [personToSave, ...disciples];

    setDisciples(updatedDisciples);
    setLeaders(updatedDisciples.filter(d => d.isLeader) as Leader[]);

    // Save to Supabase
    const btn = document.getElementById('btn-save-leader');
    if (btn) btn.innerText = "Salvando...";
    try {
      await saveRecord('disciples', personToSave);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    }

    setShowModal(false);
    setEditId(null);
    setNewLeader(initialLeader);
  };

  const bairrosOptions = useMemo(() => {
    const bSet = new Set<string>();
    leaders.forEach(l => {
      if (l.celula1.bairro) bSet.add(l.celula1.bairro);
      if (l.fazMaisDeUmaCelula && l.celula2?.bairro) bSet.add(l.celula2.bairro);
    });
    return ['Todos', ...Array.from(bSet).sort()];
  }, [leaders]);

  const profileOptions = ['Todos', 'Kingdom', 'DTX', 'Mulheres', 'Homens', 'Kids', 'Casais'];

  const filtered = leaders.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBairro = selectedBairro === 'Todos' || l.celula1.bairro === selectedBairro || (l.fazMaisDeUmaCelula && l.celula2?.bairro === selectedBairro);
    const matchesProfile = selectedProfile === 'Todos' || l.celula1.perfil === selectedProfile || (l.fazMaisDeUmaCelula && l.celula2?.perfil === selectedProfile);
    return matchesSearch && matchesBairro && matchesProfile;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 leading-none">Liderança</h1>
          <p className="text-gray-400 italic font-medium text-xs md:text-sm mt-1">Gestão estratégica da Geração de Luz</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border self-start md:self-center">
          <button onClick={() => setViewMode('list')} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            <List size={16} /> Lista
          </button>
          <button onClick={() => setViewMode('map')} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'map' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            <MapIcon size={16} /> Mapa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-2 md:px-0">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input type="text" placeholder="Buscar por nome..." className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl font-bold shadow-sm outline-none border-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="md:col-span-2 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
          <select value={selectedBairro} onChange={e => setSelectedBairro(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl font-black text-[10px] uppercase shadow-sm outline-none border-none appearance-none cursor-pointer">
            {bairrosOptions.map(opt => <option key={opt} value={opt}>{opt === 'Todos' ? 'Todos os Bairros' : opt}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 relative">
          <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
          <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-white rounded-2xl font-black text-[10px] uppercase shadow-sm outline-none border-none appearance-none cursor-pointer">
            {profileOptions.map(opt => <option key={opt} value={opt}>{opt === 'Todos' ? 'Todos os Perfis' : opt}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditId(null); setNewLeader(initialLeader); setShowModal(true); setActiveCellTab('cel1'); }} className="md:col-span-3 bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
          <UserPlus size={18} /> Adicionar Líder
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
          {filtered.map(l => (
            <div key={l.id} className="bg-white rounded-[2rem] p-6 md:p-8 border shadow-sm flex flex-col group hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border overflow-hidden flex items-center justify-center font-black text-3xl text-gray-300 uppercase shrink-0">
                  {l.foto ? <img src={l.foto} className="w-full h-full object-cover" /> : l.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 leading-tight truncate uppercase text-sm md:text-base">{l.nome}</h3>
                    <a href={`https://wa.me/55${l.whatsapp.replace(/\D/g, '')}`} target="_blank" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shrink-0"><Phone size={12} fill="currentColor" /></a>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase text-gray-400">{l.celula1.bairro}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Célula Principal</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.celula1.perfil === 'Kingdom' ? 'bg-lime-peregrinas text-black' : 'bg-gray-200 text-gray-600'}`}>{l.celula1.perfil}</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.celula1.ativa ? 'bg-lime-50 text-lime-600' : 'bg-red-50 text-red-500'}`}>{l.celula1.ativa ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-700">
                    <span className="flex items-center gap-1"><Clock size={12} className="text-gray-300" /> {l.celula1.dia}</span>
                    <span>{formatDisplayValue(l.celula1.horario)}</span>
                  </div>
                  <p className="text-[11px] font-medium text-gray-500 line-clamp-1 italic mt-1"><MapPin size={10} className="inline mr-1 text-gray-300" /> {l.celula1.endereco}</p>
                </div>

                {l.fazMaisDeUmaCelula && l.celula2 && (
                  <div className="bg-lime-50/30 p-4 rounded-2xl border border-lime-100/50 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase text-lime-600 tracking-widest">Célula 2 (Multi)</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.celula2.perfil === 'Kingdom' ? 'bg-lime-peregrinas text-black' : 'bg-gray-200 text-gray-600'}`}>{l.celula2.perfil || '---'}</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${l.celula2.ativa ? 'bg-lime-50 text-lime-600' : 'bg-red-50 text-red-500'}`}>{l.celula2.ativa ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-700">
                      <span className="flex items-center gap-1"><Clock size={12} className="text-lime-200" /> {l.celula2.dia || 'N/A'}</span>
                      <span>{formatDisplayValue(l.celula2.horario)}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-500 line-clamp-1 italic mt-1"><MapPin size={10} className="inline mr-1 text-lime-200" /> {l.celula2.endereco || 'Endereço não informado'}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50">
                <button onClick={() => { setEditId(l.id); setNewLeader(l); setShowModal(true); setActiveCellTab('cel1'); }} className="flex-1 py-3 bg-gray-50 rounded-xl text-gray-400 hover:text-black transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase"><Edit2 size={14} /> Editar</button>
                <button onClick={async () => { if (confirm("Excluir?")) { const up = disciples.filter(x => x.id !== l.id); setDisciples(up); setLeaders(up.filter(d => d.isLeader) as Leader[]); await deleteRecord('disciples', l.id); } }} className="flex-1 py-3 bg-red-50 rounded-xl text-red-200 hover:text-red-500 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase"><Trash2 size={14} /> Excluir</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-2 md:px-0 space-y-4">
          <div className="relative w-full h-[600px] bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl border-8 border-white overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0 z-10" />
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl md:rounded-[3rem] p-6 md:p-10 space-y-6 md:space-y-8 animate-in h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">Ficha da Líder</h2>
              <button onClick={() => setShowModal(false)} className="p-2"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                  {newLeader.foto ? (
                    <div className="relative group">
                      <img src={newLeader.foto} className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white" />
                      <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-black text-white p-3 rounded-2xl"><Camera size={18} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-white rounded-[2rem] flex flex-col items-center justify-center gap-2 text-gray-300">
                      <Camera size={28} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-center">Upload Foto</span>
                    </button>
                  )}
                  <input type="file" className="hidden" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setNewLeader({ ...newLeader, foto: r.result as string }); r.readAsDataURL(f); } }} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vincular Discípula</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none" value={disciples.find(d => d.nome === newLeader.nome)?.id || ""} onChange={e => { const d = disciples.find(x => x.id === e.target.value); if (d) setNewLeader({ ...newLeader, nome: d.nome, whatsapp: d.whatsapp, foto: d.foto || '' }); }}>
                    <option value="">Selecionar...</option>
                    {disciples.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>

                <InputField label="Nome (Visualização)" value={newLeader.nome} onChange={v => setNewLeader({ ...newLeader, nome: v })} />
                <InputField label="WhatsApp" value={newLeader.whatsapp} onChange={v => setNewLeader({ ...newLeader, whatsapp: v })} />

                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all cursor-pointer" onClick={() => setNewLeader({ ...newLeader, fazMaisDeUmaCelula: !newLeader.fazMaisDeUmaCelula })}>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest cursor-pointer">+ de uma célula</label>
                  <div className={`w-12 h-6 rounded-full p-1 transition-all ${newLeader.fazMaisDeUmaCelula ? 'bg-lime-peregrinas' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${newLeader.fazMaisDeUmaCelula ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><LayoutGrid size={16} /> Configurações de Célula</h3>
                  <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveCellTab('cel1')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeCellTab === 'cel1' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Célula 1</button>
                    {newLeader.fazMaisDeUmaCelula && <button onClick={() => setActiveCellTab('cel2')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeCellTab === 'cel2' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Célula 2</button>}
                  </div>
                </div>

                <CellForm
                  data={activeCellTab === 'cel1' ? newLeader.celula1 : (newLeader.celula2 || initialLeader.celula2)}
                  onChange={v => {
                    if (activeCellTab === 'cel1') setNewLeader({ ...newLeader, celula1: { ...newLeader.celula1!, ...v } });
                    else setNewLeader({ ...newLeader, celula2: { ...(newLeader.celula2 || initialLeader.celula2)!, ...v } });
                  }}
                  formatDisplayValue={formatDisplayValue}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t mt-auto md:mt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">DESCARTAR</button>
              <button onClick={handleSave} id="btn-save-leader" className="flex-[2] py-4 bg-black text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all">SALVAR FICHA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CellForm = ({ data, onChange, formatDisplayValue }: any) => {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const lookupCoordinates = async () => {
    if (!data.endereco || !data.bairro) return alert("Preencha endereço e bairro antes de buscar!");
    setIsGeocoding(true);
    try {
      const query = `${data.endereco}, ${data.bairro}, Salvador, Bahia, Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const results = await response.json();
      if (results && results.length > 0) {
        onChange({ localizacao: { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) } });
      } else {
        alert("Localização não encontrada. Verifique se o endereço está escrito corretamente.");
      }
    } catch (e) {
      alert("Erro ao buscar localização.");
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Ativa?" options={['Sim', 'Não']} value={data.ativa ? 'Sim' : 'Não'} onChange={(v: any) => onChange({ ativa: v === 'Sim' })} />
        <SelectField label="Perfil" options={['Kingdom', 'DTX', 'Mulheres', 'Homens', 'Kids', 'Casais']} value={data.perfil} onChange={(v: any) => onChange({ perfil: v })} />
      </div>

      <div className={`grid ${!data.ativa ? 'grid-cols-2' : 'grid-cols-1'} gap-4 animate-in fade-in duration-300`}>
        <InputField label="Data de Abertura" type="date" value={formatDisplayValue(data.dataAbertura)} onChange={(v: any) => onChange({ dataAbertura: v })} />
        {!data.ativa && (
          <InputField label="Data de Fechamento" type="date" value={formatDisplayValue(data.dataFechamento)} onChange={(v: any) => onChange({ dataFechamento: v })} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Dia" options={['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']} value={data.dia} onChange={(v: any) => onChange({ dia: v })} />
        <InputField label="Horário" type="time" value={formatDisplayValue(data.horario)} onChange={(v: any) => onChange({ horario: v })} />
      </div>

      <InputField label="Bairro" value={data.bairro} onChange={(v: any) => onChange({ bairro: v })} />

      <div className="relative">
        <InputField label="Endereço" value={data.endereco} onChange={(v: any) => onChange({ endereco: v })} />
        <button onClick={lookupCoordinates} disabled={isGeocoding} className="absolute right-2 bottom-2 bg-black text-white p-2.5 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase hover:bg-lime-peregrinas hover:text-black transition-all disabled:opacity-50 shadow-sm">
          {isGeocoding ? <Loader2 size={12} className="animate-spin" /> : <MapPinned size={14} />}
          {isGeocoding ? 'Buscando...' : 'Obter GPS'}
        </button>
      </div>

      {!data.localizacao?.lat && data.endereco && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-[9px] font-bold text-blue-600 uppercase">
          <AlertCircle size={14} /> Clique em "Obter GPS" para localizar no mapa.
        </div>
      )}
    </div>
  );
};

const InputField = ({ label, type = "text", value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none text-sm focus:ring-2 focus:ring-lime-100 transition-all text-gray-900" />
  </div>
);

const SelectField = ({ label, options, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none text-sm cursor-pointer focus:ring-2 focus:ring-lime-100 transition-all text-gray-900">
      <option value="">Selecionar...</option>
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default Leaders;
