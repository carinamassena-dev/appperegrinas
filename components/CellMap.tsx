import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Users, Navigation, LayoutGrid, MessageCircle, X, Loader2, Filter } from 'lucide-react';
import { Leader, Disciple } from '../types';
import { loadData, loadDisciplesList } from '../services/dataService';

declare const L: any;

const CellMap: React.FC = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [activeProfile, setActiveProfile] = useState('Todos');
  const [isLoading, setIsLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [visiblePinsCount, setVisiblePinsCount] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const loadLeaders = async () => {
      try {
        const allDisciples = await loadDisciplesList();
        const leadersList = allDisciples.filter(d => d.isLeader) as Leader[];
        setLeaders(leadersList);
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };

    loadLeaders();
  }, []);

  useEffect(() => {
    // PROTEÇÃO: Verifica se o container e a biblioteca Leaflet estão prontos
    if (!mapContainerRef.current || mapRef.current || isLoading || typeof L === 'undefined') return;

    let defaultLat = -12.9714; // Salvador como padrão se não houver células
    let defaultLng = -38.5014;

    const firstWithGPS = leaders.find(l => l.celula1?.localizacao?.lat);
    if (firstWithGPS?.celula1?.localizacao) {
      defaultLat = firstWithGPS.celula1.localizacao.lat;
      defaultLng = firstWithGPS.celula1.localizacao.lng;
    }

    try {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([defaultLat, defaultLng], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      // Invalidate size para garantir renderização correta
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          setIsMapReady(true);
        }
      }, 500);
    } catch (e) {
      console.error("Erro ao carregar mapa:", e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoading, leaders]);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined' || !isMapReady) return;

    markersRef.current.forEach(m => {
      if (mapRef.current) mapRef.current.removeLayer(m);
    });
    markersRef.current = [];

    const bounds: any[] = [];

    const createMarker = (cell: any, leaderName: string, num: number) => {
      if (!cell.ativa) return;

      const cellProfile = (cell.perfil || '').trim().toLowerCase();
      const currentFilter = activeProfile.trim().toLowerCase();

      if (currentFilter !== 'todos' && cellProfile !== currentFilter) return;

      if (cell.localizacao && cell.localizacao.lat && cell.localizacao.lng) {
        const color = cellProfile === 'kingdom' ? '#CCFF00' :
          cellProfile === 'dtx' ? '#a855f7' :
            cellProfile === 'mulheres' ? '#ec4899' :
              cellProfile === 'homens' ? '#3b82f6' :
                cellProfile === 'kids' ? '#f59e0b' :
                  cellProfile === 'casais' ? '#10b981' : '#64748b';

        const textColor = cellProfile === 'kingdom' ? '#000000' : '#ffffff';

        const iconHtml = `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 8px 15px rgba(0,0,0,0.15);"><div style="color: ${textColor}; font-weight: 900; font-size: 11px;">${num}</div></div>`;

        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = L.marker([cell.localizacao.lat, cell.localizacao.lng], { icon: customIcon })
          .addTo(mapRef.current);

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; padding: 16px; min-width: 220px; border-radius: 1.5rem;">
            <p style="margin: 0; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">LÍDER</p>
            <h4 style="margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase; font-size: 16px;">${leaderName}</h4>
            <div style="background: ${color}20; color: ${color === '#CCFF00' ? '#6b8a00' : color}; padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; display: inline-block;">${cell.perfil}</div>
            <p style="margin: 10px 0; font-size: 11px; font-weight: 700;">${cell.endereco || 'Endereço n/i'}, ${cell.bairro}</p>
            <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 900;">${cell.dia} às ${cell.horario}</p>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: false });
        markersRef.current.push(marker);
        bounds.push([cell.localizacao.lat, cell.localizacao.lng]);
      }
    };

    leaders.forEach(leader => {
      if (leader.celula1) createMarker(leader.celula1, leader.nome, 1);
      if (leader.fazMaisDeUmaCelula && leader.celula2) createMarker(leader.celula2, leader.nome, 2);
    });

    setVisiblePinsCount(markersRef.current.length);

    if (bounds.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [leaders, activeProfile, isLoading, isMapReady]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-[3rem]">
        <Loader2 className="animate-spin text-lime-600" size={40} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Mapa Geográfico</h1>
          <p className="text-gray-400 italic font-medium">Células ativas em tempo real</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {['Todos', 'Kingdom', 'DTX', 'Mulheres', 'Homens', 'Kids', 'Casais'].map(p => (
            <button
              key={p}
              onClick={() => setActiveProfile(p)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeProfile === p ? 'bg-lime-peregrinas text-black shadow-md' : 'text-gray-400'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[400px] rounded-[3rem] border-8 border-white shadow-2xl relative overflow-hidden bg-gray-100">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {visiblePinsCount === 0 && !isLoading && isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-10">
            <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl max-w-sm">
              <Navigation size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-lg font-black text-gray-900 uppercase">Nenhum Ponto</p>
              <p className="text-xs text-gray-400 font-bold uppercase">Sem coordenadas GPS para o perfil selecionado.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CellMap;
