import React, { useState, useEffect } from 'react';
import { CloudOff, Cloud, RefreshCw, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { draftService } from '../services/draftService';

export const DraftIndicator: React.FC = () => {
    const [draftCount, setDraftCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: number, failed: number } | null>(null);

    const checkDrafts = () => {
        const drafts = draftService.getAllDrafts();
        setDraftCount(drafts.length);
    };

    useEffect(() => {
        checkDrafts();
        window.addEventListener('drafts_updated', checkDrafts);
        return () => window.removeEventListener('drafts_updated', checkDrafts);
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);

        // Simular um pequeno delay para UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const result = await draftService.syncAllDrafts();
        setSyncResult(result);
        setIsSyncing(false);
        checkDrafts();
    };

    if (draftCount === 0) return null;

    return (
        <>
            <button
                onClick={() => { setIsModalOpen(true); setSyncResult(null); }}
                className="relative p-2 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-all flex items-center justify-center animate-pulse shadow-sm"
                title="Rascunhos Pendentes de Envio"
            >
                <CloudOff size={24} />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 items-center justify-center text-[8px] text-white font-black">{draftCount}</span>
                </span>
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-2">
                                <CloudOff size={32} />
                            </div>

                            <h3 className="font-black text-lg uppercase tracking-tight text-gray-900">Rascunhos Pendentes</h3>
                            <p className="text-gray-500 text-sm font-medium">Você tem <strong className="text-black">{draftCount} formulário(s)</strong> salvo(s) locamente devido à falta de internet ou modo de manutenção.</p>

                            {syncResult && (
                                <div className={`w-full p-4 rounded-xl text-xs font-bold uppercase tracking-widest ${syncResult.failed > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {syncResult.success > 0 && <span className="flex items-center justify-center gap-1"><CheckCircle size={14} /> {syncResult.success} Sincronizados</span>}
                                    {syncResult.failed > 0 && <span className="flex items-center justify-center gap-1 mt-1"><AlertTriangle size={14} /> {syncResult.failed} Falharam</span>}
                                </div>
                            )}

                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full mt-6 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
                                {isSyncing ? 'SINCRONIZANDO...' : 'TENTAR ENVIAR AGORA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
