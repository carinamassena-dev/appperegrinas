import React, { useState, useEffect, useContext } from 'react';
import {
  Users, ShieldCheck, Database, Save,
  Trash2, Plus, UserPlus, Edit2,
  RefreshCw, X, Terminal, Loader2,
  Activity, Sparkles, DatabaseZap, Link as LinkIcon,
  DollarSign, Calendar, CheckCircle2, ArrowRight, Sprout
} from 'lucide-react';
import { UserAccount, BaptismStatus, CDLevel, TransactionType, Disciple, Leader, FinanceRecord, Harvest, Event as AppEvent } from '../types';
import { AuthContext } from '../App';
import { fetchSheetCSV, parseCSV, sendDataToSheet } from '../services/googleSheetsService';
import { supabaseService } from '../services/supabaseService';
import { loadData, saveRecord, deleteRecord } from '../services/dataService';
import { refreshSupabaseClient } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs, getCachedAuditLogs, logAction, AuditLog, AuditLogType } from '../services/auditService';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'connection' | 'logs'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [stats, setStats] = useState({
    disciples: 0,
    leaders: 0,
    finance: 0,
    harvest: 0,
    events: 0
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [systemLogs, setSystemLogs] = useState<AuditLog[]>([]);
  const [logFilters, setLogFilters] = useState({
    user: '',
    type: '' as AuditLogType | '',
    startDate: '',
    endDate: ''
  });

  const updateStats = async () => {
    try {
      const [d, f, h] = await Promise.all([
        supabaseService.getDisciples(),
        supabaseService.getFinance(),
        supabaseService.getHarvest()
      ]);
      const disciplesList = d || [];
      const financeList = f || [];
      const harvestList = h || [];

      setStats({
        disciples: disciplesList.length,
        leaders: disciplesList.filter((x: any) => x.isLeader).length,
        finance: financeList.length,
        harvest: harvestList.length,
        events: 0
      });
    } catch (err) {
      console.error("Erro ao atualizar stats:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Load users from Supabase
      const supaUsers = await loadData<UserAccount>('users');
      setUsers(supaUsers || []);

      // Load audit logs from Supabase
      const logs = await getAuditLogs();
      setSystemLogs(logs || []);

      updateStats();
    };
    fetchData();

    const handleAuditUpdate = () => setSystemLogs(getCachedAuditLogs());
    window.addEventListener('audit_log_added', handleAuditUpdate);

    return () => window.removeEventListener('audit_log_added', handleAuditUpdate);
  }, []);

  const addAuditLog = (action: string, details: string, type: AuditLogType = 'SISTEMA') => {
    logAction(currentUser?.nome || 'Sistema', action, details, type);
  };

  const handleSaveUser = async (userData: Partial<UserAccount>) => {
    let updatedUsers = [...users];
    let changedUser: UserAccount;

    if (userData.id) {
      changedUser = userData as UserAccount;
      updatedUsers = users.map(u => (u && u.id === changedUser.id) ? changedUser : u);
      addAuditLog("Usuário Editado", `Perfil @${changedUser.username} alterado`, "USUARIO");
    } else {
      changedUser = {
        ...userData,
        id: `USR_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        passwordHash: userData.passwordHash || '123456',
        status: 'active'
      } as UserAccount;
      updatedUsers = [changedUser, ...users];
      addAuditLog("Usuário Criado", `Novo usuário @${userData.username} adicionado`, "USUARIO");
    }

    setUsers(updatedUsers);
    await saveRecord('users', changedUser);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleApproveUser = async (userToApprove: UserAccount) => {
    if (!confirm(`Deseja aprovar o acesso de ${userToApprove.nome}?`)) return;
    const updatedUser = { ...userToApprove, status: 'active' } as UserAccount;
    const updatedUsers = users.map(u => (u && u.id === updatedUser.id) ? updatedUser : u);
    setUsers(updatedUsers);
    await saveRecord('users', updatedUser);
    addAuditLog("Acesso Aprovado", `Solicitação de @${updatedUser.username} foi aprovada.`, "USUARIO");
  };

  const handleRejectUser = async (userToReject: UserAccount) => {
    if (!confirm(`Deseja RECUSAR e apagar a solicitação de ${userToReject.nome}?`)) return;
    const updatedUsers = users.filter(u => u && u.id !== userToReject.id);
    setUsers(updatedUsers);
    await deleteRecord('users', userToReject.id);
    addAuditLog("Acesso Recusado", `Solicitação de @${userToReject.username} foi rejeitada e apagada.`, "USUARIO");
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) return alert("Você não pode excluir a si mesmo!");
    if (!confirm("Deseja realmente excluir este usuário?")) return;

    const userToDelete = users.find(u => u && u.id === id);
    const updatedUsers = users.filter(u => u && u.id !== id);
    setUsers(updatedUsers);
    await deleteRecord('users', id);
    addAuditLog("Usuário Excluído", `Usuário @${userToDelete?.username} removido do sistema`, "USUARIO");
  };

  const filteredLogs = systemLogs.filter(log => {
    const matchUser = !logFilters.user || (log.user && log.user.toLowerCase().includes(logFilters.user.toLowerCase()));
    const matchType = !logFilters.type || log.type === logFilters.type;
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const matchStart = !logFilters.startDate || logDate >= logFilters.startDate;
    const matchEnd = !logFilters.endDate || logDate <= logFilters.endDate;
    return matchUser && matchType && matchStart && matchEnd;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 md:px-0 text-left">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Painel Master</h1>
          <p className="text-gray-400 font-medium text-sm italic">Infraestrutura e Dados</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-full md:w-auto overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>Acessos</button>
          <button onClick={() => setActiveTab('requests')} className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>
            Solicitações
            {users.filter(u => u && u.status === 'pending').length > 0 && (
              <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                {users.filter(u => u && u.status === 'pending').length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('connection')} className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'connection' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>Integração</button>
          <button onClick={() => setActiveTab('logs')} className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}>Auditoria</button>
        </div>
      </div>

      {activeTab === 'logs' && (
        <div className="space-y-6 text-left animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter"><Terminal size={24} /> Auditoria do Sistema</h2>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Filtrar Usuário..."
                  className="flex-1 md:w-32 p-3 bg-gray-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-lime-200"
                  value={logFilters.user}
                  onChange={e => setLogFilters({ ...logFilters, user: e.target.value })}
                />
                <select
                  className="flex-1 md:w-32 p-3 bg-gray-50 rounded-xl text-[10px] font-bold outline-none cursor-pointer"
                  value={logFilters.type}
                  onChange={e => setLogFilters({ ...logFilters, type: e.target.value as any })}
                >
                  <option value="">Todos Tipos</option>
                  <option value="USUARIO">Usuários</option>
                  <option value="UI">Interface</option>
                  <option value="EVENTO">Eventos</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="ERRO">Erros</option>
                </select>
                <input
                  type="date"
                  className="flex-1 md:w-32 p-3 bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                  value={logFilters.startDate}
                  onChange={e => setLogFilters({ ...logFilters, startDate: e.target.value })}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-[9px] font-black uppercase text-gray-400">Data/Hora</th>
                    <th className="p-4 text-[9px] font-black uppercase text-gray-400">Usuário</th>
                    <th className="p-4 text-[9px] font-black uppercase text-gray-400">Ação</th>
                    <th className="p-4 text-[9px] font-black uppercase text-gray-400">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[10px] font-medium text-gray-400 tabular-nums">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-black uppercase px-2 py-1 bg-gray-100 rounded-lg">{log.user}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black uppercase ${log.type === 'ERRO' ? 'text-red-500' : 'text-gray-900'}`}>{log.action}</span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-500 font-medium leading-relaxed max-w-xs md:max-w-md truncate md:whitespace-normal">{log.details}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhum log encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-lime-400/5 group-hover:scale-110 transition-transform pointer-events-none">
                <DatabaseZap size={100} />
              </div>
              <div className="relative z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter">
                    <DatabaseZap className="text-lime-600" size={24} /> Supabase
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Banco de Dados Principal</p>
                </div>

                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} /> Configurado via Vercel (Auto)
                  </p>
                  <p className="text-[9px] text-green-600 mt-1">A URL e Key estão sendo carregadas das variáveis de ambiente automaticamente. Todos os dados são sincronizados em tempo real.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase flex items-center gap-3 tracking-tighter"><Activity className="text-gray-400" /> Resumo de Atividade</h2>
                <div className="flex flex-wrap gap-4">
                  <StatMini label="Peregrinas" value={stats.disciples} icon={Users} />
                  <StatMini label="Vidas" value={stats.harvest} icon={Sprout} />
                  <StatMini label="Caixa" value={stats.finance} icon={DollarSign} />
                </div>
              </div>

              <div className="flex-1 bg-gray-950 rounded-[2.5rem] p-6 text-lime-400 font-mono text-[11px] space-y-2 overflow-y-auto min-h-[400px] border-8 border-white shadow-inner custom-scrollbar">
                <div className="flex items-center gap-2 mb-4 text-white/20 uppercase font-black text-[9px]">
                  <Terminal size={14} /> <span>Live Feed_</span>
                </div>
                {systemLogs.slice(0, 50).map((log) => (
                  <div key={log.id} className={`flex gap-3 leading-relaxed animate-in slide-in-from-left-2 ${log.type === 'ERRO' ? 'text-red-400' : 'text-gray-500'}`}>
                    <span className="opacity-40">[{new Date(log.timestamp).toLocaleTimeString('pt-BR')}]</span>
                    <span className="font-bold">[{log.type}]</span>
                    <span className="text-gray-300">{log.action}: {log.details.substring(0, 100)}</span>
                  </div>
                ))}
                {systemLogs.length === 0 && <div className="text-gray-600 italic">Nenhuma atividade registrada...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 text-left animate-in fade-in">
          <button onClick={() => { setEditingUser({ nome: '', username: '', role: 'Operador', permissions: { dashboard: 'view', disciples: 'view', leaders: 'none', finance: 'none', events: 'none', harvest: 'view', master: false } }); setShowUserModal(true); }} className="w-full md:w-auto bg-black text-white px-8 py-5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
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

          {/* User CRUD Modal */}
          {showUserModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 space-y-8 animate-in relative overflow-hidden">
                <div className="flex justify-between items-center border-b pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-gray-900">{editingUser?.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Painel de Acessos Master</p>
                  </div>
                  <button onClick={() => setShowUserModal(false)}><X size={24} /></button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Nome Completo" value={editingUser?.nome} onChange={(v: string) => setEditingUser({ ...editingUser, nome: v })} />
                    <InputField label="Username (Login)" value={editingUser?.username} onChange={(v: string) => setEditingUser({ ...editingUser, username: v })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Senha de Acesso</label>
                    <input
                      type="text"
                      placeholder={editingUser?.id ? "Digite para alterar a senha..." : "Defina uma senha..."}
                      className="w-full mt-2 p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-transparent focus:border-lime-200 transition-all text-sm"
                      onChange={(e) => setEditingUser({ ...editingUser, passwordHash: e.target.value })}
                    />
                    {editingUser?.id && <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase">Deixe em branco para não alterar a senha atual desse usuário.</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Perfil de Acesso</label>
                    <div className="flex gap-2">
                      {['Master', 'Líder', 'Discípula'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setEditingUser({ ...editingUser, role: role as any, permissions: { ...editingUser.permissions, master: role === 'Master' } })}
                          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${editingUser?.role === role ? 'bg-black text-white border-black' : 'border-gray-100 text-gray-400'}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-gray-900 tracking-tighter border-b pb-2">Permissões Detalhadas</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'disciples', label: 'Peregrinas' },
                        { id: 'leaders', label: 'Líderes' },
                        { id: 'finance', label: 'Financeiro' },
                        { id: 'events', label: 'Eventos' },
                        { id: 'harvest', label: 'Colheita' }
                      ].map((module) => (
                        <div key={module.id} className="space-y-2">
                          <label className="text-[9px] font-black uppercase text-gray-400">{module.label}</label>
                          <select
                            className="w-full p-3 bg-gray-50 rounded-xl font-bold text-xs outline-none"
                            value={editingUser?.permissions?.[module.id as keyof typeof editingUser.permissions] as string}
                            onChange={(e) => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions, [module.id]: e.target.value as any } })}
                          >
                            <option value="view">Visualizar</option>
                            <option value="edit">Editar/Anotar</option>
                            <option value="none">Nenhum Acesso</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <button onClick={() => setShowUserModal(false)} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">DESCARTAR</button>
                  <button
                    onClick={() => handleSaveUser(editingUser)}
                    disabled={!editingUser?.username}
                    className="flex-1 py-4 bg-black text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {editingUser?.id ? 'Salvar Alterações' : 'Criar Conta Agora'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6 text-left animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 bg-lime-50 rounded-2xl flex items-center justify-center text-lime-600">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900">Solicitações Pendentes</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Aprove o acesso à rede</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {users.filter(u => u && u.status === 'pending').map(u => (
                <div key={u.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-6">
                  <div>
                    <h3 className="font-black uppercase text-sm text-gray-900">{u?.nome || 'Sem Nome'}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Username: @{u?.username}</p>

                    <div className="mt-4 space-y-1">
                      {u?.whatsapp && <p className="text-xs text-gray-500 font-medium">📱 {u.whatsapp}</p>}
                      {u?.email && <p className="text-xs text-gray-500 font-medium">📧 {u.email}</p>}
                      {u?.requestedAt && <p className="text-[9px] text-gray-400 font-bold uppercase mt-2">Solicitado em: {new Date(u.requestedAt).toLocaleString('pt-BR')}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleApproveUser(u)} className="flex-1 bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-gray-800">
                      Aprovar Acesso
                    </button>
                    <button onClick={() => handleRejectUser(u)} className="px-4 py-3 bg-red-100 text-red-600 rounded-xl transition-all hover:bg-red-200" title="Recusar">
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
              {users.filter(u => u && u.status === 'pending').length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Nenhuma solicitação pendente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatMini = ({ label, value, icon: Icon }: any) => (
  <div className="text-right flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
    <div>
      <p className="text-[8px] font-black uppercase text-gray-400 leading-none">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
    <div className="text-gray-300"><Icon size={16} /></div>
  </div>
);

const InputField = ({ label, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">{label}</label>
    <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none text-xs focus:ring-4 focus:ring-lime-100 transition-all shadow-sm" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default AdminPanel;
