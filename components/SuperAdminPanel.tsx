import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Building2, Copy, Trash2, CheckCircle, Loader2, Save } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

const SuperAdminPanel: React.FC = () => {
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const loadOrgs = async () => {
        setIsLoading(true);
        try {
            const data = await supabaseService.getOrganizations();
            setOrganizations(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrgs();
    }, []);

    const handleSaveOrg = async () => {
        if (!newOrgName.trim()) return;
        setIsSaving(true);
        try {
            await supabaseService.saveOrganization({ nome: newOrgName });
            setNewOrgName('');
            setShowModal(false);
            await loadOrgs();
        } catch (e) {
            console.error('Erro ao salvar Org', e);
            alert('Falha ao criar organização.');
        } finally {
            setIsSaving(false);
        }
    };

    const copyInviteLink = (orgId: string) => {
        const link = `${window.location.origin}/#/auto-cadastro?tipo=novo&liderId=SYSTEM&orgId=${orgId}`;
        navigator.clipboard.writeText(link);
        setCopiedId(orgId);
        setTimeout(() => setCopiedId(null), 3000);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Tenants...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in pb-10">
            <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 p-8 text-indigo-800/50 pointer-events-none">
                    <ShieldAlert size={160} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Global Master
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">Painel Root <br /> Multi-Tenant</h1>
                    <p className="text-indigo-200 mt-4 font-medium italic max-w-md">Gerencie todas as igrejas e organizações instanciadas no sistema.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="relative z-10 bg-white text-indigo-900 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl hover:scale-105 transition-all w-full md:w-auto text-center justify-center"
                >
                    <Plus size={18} /> Instanciar Organização
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                    <div key={org.id} className="bg-white border p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all space-y-6 flex flex-col">
                        <div className="flex items-start justify-between">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Building2 size={24} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2">
                                {new Date(org.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">{org.nome}</h3>
                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Slug: {org.slug}</p>
                        </div>
                        <div className="pt-4 border-t mt-auto">
                            <button
                                onClick={() => copyInviteLink(org.id)}
                                className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${copiedId === org.id
                                    ? 'bg-green-50 border-green-200 text-green-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                    }`}
                            >
                                {copiedId === org.id ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {copiedId === org.id ? 'Link Copiado!' : 'Convite Líder Master'}
                            </button>
                            <p className="text-[8px] font-bold text-center text-gray-400 mt-3 uppercase">ENVIE ESTE LINK PARA A PRIMEIRA LÍDER DESTA IGREJA</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Criação */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                                <Building2 size={32} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Nova Instância</h2>
                            <p className="text-gray-500 text-xs font-medium italic">Crie uma nova organização totalmente isolada no sistema.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nome da Organização/Igreja</label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-300 rounded-2xl outline-none font-bold transition-all text-sm"
                                placeholder="Ex: Comunidade Videira VIP"
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveOrg()}
                            />
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button
                                onClick={handleSaveOrg}
                                disabled={isSaving || !newOrgName.trim()}
                                className="flex-[2] bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Instanciar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminPanel;
