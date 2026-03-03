
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Plus, Trash2, Edit2, X, Search, FileType, Upload, AlertCircle, CheckCircle2, Paperclip, File, Eye, Loader2 } from 'lucide-react';
import { FeedItem } from '../types';
import { loadData, saveRecord, deleteRecord } from '../services/dataService';

const Feed: React.FC = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const initialFeed = { titulo: '', autor: '', conteudo: '', data: new Date().toISOString().split('T')[0], documento: '', documentoNome: '' };
  const [entry, setEntry] = useState<Partial<FeedItem>>(initialFeed);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await loadData<FeedItem>('feed');
        setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveItems = async (data: FeedItem[], changedItem?: FeedItem) => {
    setItems(data);
    if (changedItem) {
      await saveRecord('feed', changedItem);
    }
  };

  const handleSave = async () => {
    if (!entry.titulo || !entry.conteudo) return alert("Título e conteúdo são obrigatórios!");

    const newItem = editId
      ? { ...entry, id: editId } as FeedItem
      : { ...entry, id: `FEED_${Math.random().toString(36).substr(2, 6).toUpperCase()}` } as FeedItem;

    const updated = editId
      ? items.map(i => i.id === editId ? newItem : i)
      : [newItem, ...items];

    setItems(updated);
    setShowModal(false);
    setEditId(null);
    setEntry(initialFeed);
    await saveRecord('feed', newItem);
  };

  const handleDeleteAll = async () => {
    if (confirm("ATENÇÃO: Deseja apagar TODO o feed de materiais? Esta ação não pode ser desfeita.")) {
      const allIds = items.map(i => i.id);
      setItems([]);
      await Promise.all(allIds.map(id => deleteRecord('feed', id)));
    }
  };

  const filtered = items.filter(i =>
    i.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.autor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Material...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Feed de Palavras</h1>
          <p className="text-gray-400 italic font-medium">Materiais para nutrição espiritual das células</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditId(null); setEntry(initialFeed); setShowModal(true); }} className="bg-lime-peregrinas text-black px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:scale-105 transition-all tracking-widest">
            <Plus size={18} /> Postar Palavra
          </button>
          <button onClick={handleDeleteAll} className="bg-red-50 text-red-500 p-4 rounded-2xl hover:bg-red-100 transition-colors" title="Limpar Feed">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-4">
        <Search className="text-gray-300" size={20} />
        <input type="text" placeholder="Pesquisar títulos ou autores..." className="w-full bg-transparent font-bold outline-none border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${item.documento ? 'bg-lime-50 text-lime-600 border-lime-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                {item.documento ? <File size={28} /> : <FileType size={28} />}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditId(item.id); setEntry(item); setShowModal(true); }} className="p-2 text-gray-300 hover:text-black transition-colors"><Edit2 size={16} /></button>
                <button onClick={async () => {
                  if (confirm("Excluir material?")) {
                    setItems(items.filter(x => x.id !== item.id));
                    await deleteRecord('feed', item.id);
                  }
                }} className="p-2 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-lime-600 mb-2 tracking-widest">{item.data}</p>
              <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight group-hover:text-lime-700 transition-colors">{item.titulo}</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-4">Por: {item.autor}</p>
              <p className="text-xs text-gray-500 font-medium italic line-clamp-4 mb-8 leading-relaxed">"{item.conteudo}"</p>
            </div>

            <div className="space-y-3 mt-auto">
              {item.documento && (
                <button
                  onClick={() => window.open(item.documento, '_blank')}
                  className="w-full py-4 bg-lime-peregrinas text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all"
                >
                  <Paperclip size={18} /> Acessar Link Externo
                </button>
              )}
              <button
                onClick={() => window.print()}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${item.documento ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-black'}`}
              >
                <Download size={18} /> PDF do Esboço
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
            <FileText size={48} className="mx-auto text-gray-100 mb-4" />
            <p className="text-gray-300 font-black uppercase tracking-widest">Nenhum estudo publicado ainda</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 space-y-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">{editId ? 'Editar Postagem' : 'Postar Material'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Título do Material</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-lime-100" value={entry.titulo} onChange={e => setEntry({ ...entry, titulo: e.target.value })} placeholder="Ex: A Identidade em Cristo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Autor / Ministrante</label>
                  <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-lime-100" value={entry.autor} onChange={e => setEntry({ ...entry, autor: e.target.value })} placeholder="Nome da Líder" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Data de Publicação</label>
                  <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-lime-100" value={entry.data} onChange={e => setEntry({ ...entry, data: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Conteúdo / Resumo do Estudo</label>
                <textarea className="w-full p-6 bg-gray-50 rounded-[2rem] font-bold h-40 text-sm outline-none border-none focus:ring-2 focus:ring-lime-100" value={entry.conteudo} onChange={e => setEntry({ ...entry, conteudo: e.target.value })} placeholder="Escreva aqui o esboço da palavra para as células..." />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Link do Google Drive (Opcional)</label>
                <input
                  type="url"
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-lime-100 placeholder:font-normal text-sm"
                  value={entry.documento}
                  onChange={e => setEntry({ ...entry, documento: e.target.value })}
                  placeholder="Cole o link de compartilhamento do Drive aqui..."
                />
                <p className="text-[9px] text-gray-400 ml-1 mt-1">Cole apenas o link URL para evitar bloqueios de sistema.</p>
              </div>
            </div>
            <div className="flex gap-4 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">DESCARTAR</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:scale-[1.02] transition-all">SALVAR E PUBLICAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
