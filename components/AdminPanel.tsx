
import React, { useState, useEffect, useContext } from 'react';
import {
  Users, ShieldCheck, Database, Save,
  Trash2, Plus, UserPlus, Edit2,
  RefreshCw, X, Terminal, Loader2,
  Activity, Sparkles, DatabaseZap, Link as LinkIcon,
  DollarSign, Calendar, CheckCircle2, ArrowRight, Sprout, Download, Upload, AlertTriangle,
  FileText, Shield
} from 'lucide-react';
import { UserAccount } from '../types';
import { AuditLog, AuditLogType, getAuditLogs, getCachedAuditLogs, logAction } from '../services/auditService';
import { AuthContext } from '../App';
import { supabaseService } from '../services/supabaseService';
import { loadData, saveRecord, deleteRecord, loadDisciplesList, generateFullSystemBackup, restoreFromBackup } from '../services/dataService';
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'integration' | 'audit'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemLogs, setSystemLogs] = useState<AuditLog[]>([]);
  const [logFilters, setLogFilters] = useState({
    user: '',
    type: '' as AuditLogType | '',
    startDate: '',
    endDate: ''
  });

  const [stats, setStats] = useState({
    disciples: 0,
    leaders: 0,
    finance: 0,
    harvest: 0,
    events: 0
  });

  const updateStats = async () => {
    try {
      const [disciplesList, financeCount, harvestCount] = await Promise.all([
        loadDisciplesList(),
        supabaseService.getCount('financeiro'),
        supabaseService.getCount('colheita')
      ]);
      const validDisciples = disciplesList || [];

      setStats({
        disciples: validDisciples.length,
        leaders: validDisciples.filter((x: any) => x.isLeader).length,
        finance: financeCount,
        harvest: harvestCount,
        events: 0
      });
    } catch (err) {
      console.error("Erro ao atualizar stats:", err);
    }
  };

  const fetchData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      // Forçamos o recarregamento de usuários para ver novas solicitações
      const supaUsers = await loadData<UserAccount>('users', force);
      setUsers(supaUsers || []);

      const logs = await getAuditLogs();
      setSystemLogs(logs || []);

      updateStats();
    } catch (err) {
      console.error('[Admin] Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Inicial sem force por padrão, mas Admin Panel deve carregar fresh

    // Na verdade, Admin Panel SEMPRE deve carregar fresh para o Master
    fetchData(true);

    const handleAuditUpdate = () => setSystemLogs(getCachedAuditLogs());
    window.addEventListener('audit_log_added', handleAuditUpdate);
    return () => window.removeEventListener('audit_log_added', handleAuditUpdate);
  }, []);

  const addAuditLog = (action: string, details: string, type: AuditLogType = 'SISTEMA') => {
    logAction(currentUser?.nome || 'Sistema', action, details, type);
  };

  const handleSaveUser = async (userData: Partial<UserAccount>) => {
    let changedUser: UserAccount;

    if (userData.id) {
      changedUser = userData as UserAccount;
      addAuditLog("Usuário Editado", `Perfil @${changedUser.username} alterado`, "USUARIO");
    } else {
      changedUser = {
        ...userData,
        id: crypto.randomUUID(),
        passwordHash: userData.passwordHash || '123456',
        status: 'active',
        organization_id: currentUser?.organization_id
      } as UserAccount;
      addAuditLog("Usuário Criado", `Novo usuário @${userData.username} adicionado`, "USUARIO");
    }

    await saveRecord('users', changedUser);
    setUsers(prev => prev.map(u => (u && u.id === changedUser.id) ? changedUser : u));
    if (!userData.id) setUsers(prev => [changedUser, ...prev]);

    setShowUserModal(false);
    setEditingUser(null);
    fetchData(true);
  };

  const handleApproveUser = async (userToApprove: UserAccount) => {
    if (!confirm(`Deseja aprovar o acesso de ${userToApprove.nome}?`)) return;

    const updatedUser = {
      ...userToApprove,
      status: 'active',
      permissions: userToApprove.permissions || {
        dashboard: 'view',
        disciples: 'view',
        leaders: 'none',
        finance: 'none',
        events: 'view',
        harvest: 'none'
      }
    } as UserAccount;

    try {
      await saveRecord('users', updatedUser);
      setUsers(prev => prev.map(u => (u && u.id === updatedUser.id) ? updatedUser : u));
      addAuditLog("Acesso Aprovado", `Solicitação de @${updatedUser.username} foi aprovada.`, "USUARIO");
      alert("Usuário aprovado com sucesso!");
    } catch (err) {
      alert("Erro ao aprovar usuário.");
    }
  };

  const handleRejectUser = async (userToReject: UserAccount) => {
    if (!confirm(`Deseja RECUSAR e apagar a solicitação de ${userToReject.nome}?`)) return;
    await deleteRecord('users', userToReject.id);
    setUsers(prev => prev.filter(u => u && u.id !== userToReject.id));
    addAuditLog("Acesso Recusado", `Solicitação de @${userToReject.username} foi rejeitada e apagada.`, "USUARIO");
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) return alert("Você não pode excluir a si mesmo!");
    if (!confirm("Deseja realmente excluir este usuário?")) return;

    const userToDelete = users.find(u => u && u.id === id);
    await deleteRecord('users', id);
    setUsers(prev => prev.filter(u => u && u.id !== id));
    addAuditLog("Usuário Excluído", `Usuário @${userToDelete?.username} removido do sistema`, "USUARIO");
  };

  const updatePendingUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const updatePermission = (id: string, module: string, value: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u;
      const currentPermissions = u.permissions || {
        dashboard: 'none', disciples: 'none', leaders: 'none', finance: 'none', events: 'none', harvest: 'none', master: false
      };
      return {
        ...u,
        permissions: { ...currentPermissions, [module]: value } as any
      };
    }));
  };

  const filteredLogs = systemLogs.filter(log => {
    const matchUser = !logFilters.user || (log.user && log.user.toLowerCase().includes(logFilters.user.toLowerCase()));
    const matchType = !logFilters.type || log.type === logFilters.type;
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const matchStart = !logFilters.startDate || logDate >= logFilters.startDate;
    const matchEnd = !logFilters.endDate || logDate <= logFilters.endDate;
    return matchUser && matchType && matchStart && matchEnd;
  });

  if (!currentUser || currentUser.role !== 'Master') {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-black text-red-500 uppercase">Acesso Restrito</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Apenas usuários Master podem acessar este painel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Painel Master</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Infraestrutura e Dados</p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] gap-1 overflow-x-auto">
          {[
            { id: 'users', label: 'Acessos', icon: <Shield size={14} /> },
            { id: 'requests', label: 'Solicitações', badge: users.filter(u => u?.status === 'pending').length, icon: <Users size={14} /> },
            { id: 'integration', label: 'Integração', icon: <Database size={14} /> },
            { id: 'audit', label: 'Auditoria', icon: <FileText size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6 text-left animate-in fade-in">
          <button onClick={() => { setEditingUser({ nome: '', username: '', role: 'Discípula', permissions: { dashboard: 'view', disciples: 'view', leaders: 'none', finance: 'none', events: 'none', harvest: 'view' } }); setShowUserModal(true); }} className="w-full md:w-auto bg-black text-white px-8 py-5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
            <UserPlus size={20} /> Adicionar Novo Usuário
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.filter(u => u && u.status !== 'pending').map(u => (
              <div key={u.id} className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col gap-6 group hover:border-lime-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 text-xl border-2 border-dashed">{u?.nome?.charAt(0) || u?.username?.charAt(0) || '?'}</div>
                    <div className="min-w-0">
                      <h3 className="font-black uppercase text-sm text-gray-900 truncate">{u?.nome || 'Sem Nome'}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">@{u?.username || 'unknown'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-tighter ${u?.role === 'Master' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>{u?.role}</span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 p-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Edit2 size={16} /> <span className="text-[10px] font-black uppercase">Editar</span>
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6 text-left animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-lime-50 rounded-2xl flex items-center justify-center text-lime-600">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900">Solicitações Pendentes</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Defina as permissões e aprove o acesso</p>
                </div>
              </div>
              <button onClick={() => fetchData(true)} className="p-3 hover:bg-gray-50 rounded-xl text-gray-400 transition-all" title="Atualizar">
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {users.filter(u => u && u.status === 'pending').map(u => (
                <div key={u.id} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black uppercase text-base text-gray-900">{u?.nome || 'Sem Nome'}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">@ {u?.username}</p>
                    </div>
                    <div className="space-y-2">
                      {u?.whatsapp && <p className="text-xs text-gray-500 font-bold tracking-tight">📱 {u.whatsapp}</p>}
                      {u?.email && <p className="text-xs text-gray-500 font-bold tracking-tight">📧 {u.email}</p>}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Nível de Acesso (Role)</label>
                      <select
                        className="w-full p-3 bg-white rounded-xl font-bold text-xs outline-none border border-gray-200"
                        value={u.role || 'Discípula'}
                        onChange={(e) => updatePendingUser(u.id, { role: e.target.value as any })}
                      >
                        <option value="Discípula">Discípula</option>
                        <option value="Líder">Líder</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button onClick={() => handleApproveUser(u)} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-gray-800 shadow-lg shadow-gray-200">
                        Aprovar
                      </button>
                      <button onClick={() => handleRejectUser(u)} className="px-5 py-4 bg-red-100 text-red-600 rounded-2xl transition-all hover:bg-red-200">
                        <X size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                    <h4 className="text-[10px] font-black uppercase text-gray-900 tracking-tighter border-b pb-3 mb-4">Acesso aos Módulos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'disciples', label: 'Peregrinas' },
                        { id: 'leaders', label: 'Líderes' },
                        { id: 'finance', label: 'Financeiro' },
                        { id: 'events', label: 'Eventos' },
                        { id: 'harvest', label: 'Colheita' }
                      ].map((module) => (
                        <div key={module.id} className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-400">{module.label}</label>
                          <select
                            className="w-full p-2.5 bg-gray-50 rounded-lg font-bold text-[10px] outline-none border border-transparent focus:border-black transition-all"
                            value={(u.permissions?.[module.id as keyof typeof u.permissions] as string) || 'none'}
                            onChange={(e) => updatePermission(u.id, module.id, e.target.value)}
                          >
                            <option value="none">Bloqueado</option>
                            <option value="view">Visualizar</option>
                            <option value="edit">Editar</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {users.filter(u => u && u.status === 'pending').length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Nenhuma solicitação pendente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter">
                  <DatabaseZap className="text-lime-600" size={24} /> Supabase
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status da Conexão</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-green-600 tracking-widest flex items-center gap-2">
                  <CheckCircle2 size={14} /> Conectado
                </p>
              </div>

              <button
                onClick={() => { localStorage.clear(); alert("Cache limpo!"); window.location.reload(); }}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-amber-50 rounded-2xl transition-all group"
              >
                <span className="text-xs font-black uppercase">Limpar Cache Local</span>
                <RefreshCw size={16} className="text-gray-300 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter"><Activity className="text-gray-400" /> Atividade em Tempo Real</h2>
              </div>

              <div className="flex-1 bg-gray-950 rounded-[2.5rem] p-6 text-lime-400 font-mono text-[11px] space-y-2 overflow-y-auto max-h-[500px] border-8 border-white shadow-inner custom-scrollbar">
                {systemLogs.slice(0, 50).map((log) => (
                  <div key={log.id} className="flex gap-3 leading-relaxed opacity-70 hover:opacity-100 transition-opacity">
                    <span className="opacity-40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="font-bold">[{log.type}]</span>
                    <span>{log.action}: {log.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6 animate-in fade-in">
          <h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter"><Terminal size={24} /> Log de Auditoria</h2>
          <div className="overflow-x-auto rounded-3xl border border-gray-100">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-[9px] font-black uppercase text-gray-400">Data</th>
                  <th className="p-4 text-[9px] font-black uppercase text-gray-400">Usuário</th>
                  <th className="p-4 text-[9px] font-black uppercase text-gray-400">Ação</th>
                  <th className="p-4 text-[9px] font-black uppercase text-gray-400">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="text-[10px]">
                    <td className="p-4 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-black">{log.user}</td>
                    <td className="p-4 font-bold uppercase">{log.action}</td>
                    <td className="p-4 text-gray-500">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRUD User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 space-y-8 animate-in relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-6">
              <h2 className="text-2xl font-black uppercase text-gray-900">{editingUser?.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowUserModal(false)}><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Nome" value={editingUser?.nome} onChange={(v: string) => setEditingUser({ ...editingUser, nome: v })} />
                <InputField label="Username" value={editingUser?.username} onChange={(v: string) => setEditingUser({ ...editingUser, username: v })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="WhatsApp" value={editingUser?.whatsapp} onChange={(v: string) => setEditingUser({ ...editingUser, whatsapp: v })} />
                <InputField label="Email" value={editingUser?.email} onChange={(v: string) => setEditingUser({ ...editingUser, email: v })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Poder de Acesso (Role)</label>
                <div className="flex gap-2">
                  {['Master', 'Líder', 'Discípula'].map(r => (
                    <button key={r} onClick={() => setEditingUser({ ...editingUser, role: r })} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${editingUser.role === r ? 'bg-black text-white border-black' : 'border-gray-100 text-gray-400'}`}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t flex gap-4">
                <button onClick={() => setShowUserModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs">Cancelar</button>
                <button onClick={() => handleSaveUser(editingUser)} className="flex-1 py-4 bg-black text-white font-black rounded-2xl uppercase text-xs shadow-xl">Salvar Usuário</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputField = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5 text-left">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input
      type="text"
      className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none text-xs focus:ring-4 focus:ring-lime-50 transition-all shadow-sm"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const StatMini = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
    <div className="text-right">
      <p className="text-[8px] font-black uppercase text-gray-400 leading-none">{label}</p>
      <p className="text-xs font-black">{value}</p>
    </div>
    <div className="text-gray-300"><Icon size={14} /></div>
  </div>
);

export default AdminPanel;
