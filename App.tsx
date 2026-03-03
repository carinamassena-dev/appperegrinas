
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  Users, Sprout, DollarSign, Calendar,
  Menu, X, Flower2, ShieldCheck,
  Home as HomeIcon, Activity, UserPlus, LogOut, MapPin, Gift, HelpCircle,
  BarChart3, QrCode, BookOpen, GraduationCap, ClipboardList, UserCircle, MoreHorizontal, Plus, MessageSquarePlus, Mail, Calculator
} from 'lucide-react';


import Home from './components/Home';
import Dashboard from './components/Dashboard';
import HelpCenter from './components/HelpCenter';
import TitheCalculator from './components/TitheCalculator';
import { Maintenance } from './components/Maintenance';
import Disciples from './components/Disciples';
import Leaders from './components/Leaders';
import HarvestView from './components/HarvestView';
import Finance from './components/Finance';
import Events from './components/Events';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import AutoCadastro from './components/AutoCadastro';
import CellMap from './components/CellMap';
import Reports from './components/Reports';
import CheckIn from './components/CheckIn';
import Birthdays from './components/Birthdays';
import Feed from './components/Feed';
import CoursesControl from './components/CoursesControl';
import CellMeetings from './components/CellMeetings';
import ProfileSettings from './components/ProfileSettings';
import { Tickets } from './components/Tickets';
import { NotificationBell } from './components/NotificationBell';
import { DraftIndicator } from './components/DraftIndicator';
import { OneOnOne } from './components/OneOnOne';
import { IdleProtector } from './components/IdleProtector';
import { UserAccount } from './types';
import MasterEditModal from './components/MasterEditModal';
import { applyThemeToDOM, loadConfigFromSupabase } from './services/uiConfigService';
import { loadData, saveRecord } from './services/dataService';
import { supabase } from './services/supabaseClient';

export interface AuthContextType {
  user: UserAccount | null;
  login: (u: UserAccount) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserAccount>) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => { },
  logout: () => { },
  updateProfile: () => { }
});

// Default permissions based on role
const getDefaultPermissions = (role?: string) => {
  if (role === 'Master') {
    return {
      dashboard: 'edit', disciples: 'edit', leaders: 'edit',
      finance: 'edit', events: 'edit', harvest: 'edit', master: true
    };
  }
  if (role === 'Líder') {
    return {
      dashboard: 'view', disciples: 'edit', leaders: 'view',
      finance: 'view', events: 'view', harvest: 'edit', master: false
    };
  }
  return {
    dashboard: 'view', disciples: 'view', leaders: 'none',
    finance: 'none', events: 'view', harvest: 'view', master: false
  };
};

// Ensure a user always has a valid permissions object
const ensurePermissions = (u: UserAccount): UserAccount => {
  if (!u.permissions || typeof u.permissions !== 'object') {
    return { ...u, permissions: getDefaultPermissions(u.role) as any };
  }
  // Ensure 'master' key exists on the permissions object
  if (u.permissions.master === undefined) {
    return { ...u, permissions: { ...u.permissions, master: u.role === 'Master' } };
  }
  return u;
};

// Scroll to top on every route change & force start on Início
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
};

// On login, redirect to Início
const ForceHomeOnMount: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, []);
  return null;
};

// Validate session directly with Supabase matching user ID
const validateSession = async (user: UserAccount | null) => {
  if (!user || !supabase) return false;
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, record')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      // MASTER BYPASS: Never auto-logout the master user even if table sync fails
      if (user.role === 'Master' || user.email === 'carina.massena@gmail.com') {
        return true;
      }
      return false;
    }

    // Optional: Cross-verify permission map
    return true;
  } catch {
    return false;
  }
};

const ProtectedRoute = ({ children, requireRole, requireEmail = true }: { children: React.ReactNode, requireRole?: string, requireEmail?: boolean }) => {
  const { user, logout } = useContext(AuthContext);
  const [isValidating, setIsValidating] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        setIsAuth(false);
        setIsValidating(false);
        return;
      }

      const valid = await validateSession(user);
      if (!valid) {
        logout();
        setIsAuth(false);
      } else {
        setIsAuth(true);
      }
      setIsValidating(false);
    };
    checkAuth();
  }, [user]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin text-lime-600"><Flower2 size={32} /></div>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  if (requireEmail && (!user?.email || user.email.trim() === '')) {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (requireRole && user?.role !== requireRole && user?.role !== 'Master') {
    return <Navigate to="/" replace />;
  }

  // Prevent Bypass: If not Master, forcefully show Maintenance
  if (!user?.permissions?.master) {
    return <Maintenance />;
  }

  return <>{children}</>;
};

const CompleteProfile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/" replace />;
  if (user.email && user.email.trim() !== '') return <Navigate to="/" replace />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert("Por favor, digite um e-mail válido.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ email });
      navigate('/');
    } catch (err) {
      console.error("Erro ao salvar e-mail", err);
      alert("Erro ao salvar seu e-mail. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-lime-50 text-lime-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
          <Mail size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Atualização Obrigatória</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Olá, <b>{user.nome}</b>! Por segurança, seu e-mail é necessário para continuar o acesso.
          </p>
        </div>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="seu.email@exemplo.com"
              required
              className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 focus:bg-white transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar e Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  useEffect(() => {
    applyThemeToDOM();
    const initApp = async () => {
      try {
        // Load UI config from Supabase and apply theme
        const config = await loadConfigFromSupabase();
        applyThemeToDOM(config.theme);

        // Restore session from localStorage (session cache only — acceptable)
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
          const parsed = ensurePermissions(JSON.parse(savedUser));
          // CRITICAL: Dump old placeholder IDs so it forces a fresh login with Auth UUID
          if (parsed.id === 'master_user' || parsed.id === '1') {
            localStorage.removeItem('current_user');
          } else {
            setUser(parsed);
          }
        }

        // Load users from Supabase
        let users: UserAccount[] = await loadData<UserAccount>('users');

        // Ensure all users have valid permissions
        let needsPermFix = false;
        let needsUpdate = false;

        users = users.map((u: UserAccount) => {
          const fixed = ensurePermissions(u);
          if (fixed !== u) needsPermFix = true;
          return fixed;
        });

        // Force Carina Master to have the correct email
        users = users.map((u: UserAccount) => {
          if (u.role === 'Master' && u.username === 'carina.massena') {
            return { ...u, email: 'carina.massena@gmail.com' };
          }
          if (u.role === 'Master' && (!u.passwordHash || u.passwordHash.trim() === '')) {
            needsUpdate = true;
            return { ...u, passwordHash: '#lider12@12', email: 'carina.massena@gmail.com' };
          }
          return u;
        });

        if (needsUpdate || needsPermFix) {
          for (const u of users) {
            await saveRecord('users', u);
          }
        }

        // Create default Master user if none exists
        if (!users.some((u: UserAccount) => u.role === 'Master')) {
          const master: UserAccount = {
            id: Math.random().toString(36).substr(2, 9),
            username: 'carina.massena',
            passwordHash: 'lider12',
            nome: 'Carina Massena',
            email: 'carina.massena@gmail.com',
            whatsapp: '71900000000',
            role: 'Master',
            permissions: {
              dashboard: 'edit', disciples: 'edit', leaders: 'edit',
              finance: 'edit', events: 'edit', harvest: 'edit', master: true
            }
          };
          await saveRecord('users', master);
        }
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const login = (u: UserAccount) => {
    const safeUser = ensurePermissions(u);
    setUser(safeUser);
    localStorage.setItem('current_user', JSON.stringify(safeUser));
    window.location.hash = '#/';
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
  };

  const updateProfile = async (updates: Partial<UserAccount>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));
    // Persist to Supabase
    await saveRecord('users', updated);
  };

  if (loading) return null;

  const NavItem = ({ to, icon: Icon, label, permission, highlight = false }: any) => {
    if (!user) return null;
    const perms = user.permissions || {} as any;
    const userPerm = (perms as any)[permission];
    if (userPerm === 'none' && permission !== 'master' && permission !== 'profile') return null;
    if (permission === 'master' && !perms.master) return null;

    const location = useLocation();
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all ${isActive
          ? 'bg-lime-peregrinas text-black font-black shadow-lg scale-105'
          : highlight
            ? 'text-lime-600 bg-lime-50/50 hover:bg-lime-50'
            : 'text-gray-500 hover:bg-gray-100'
          }`}
      >
        <Icon size={20} className={highlight && !isActive ? 'animate-pulse' : ''} />
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  };

  const BottomNavItem = ({ to, icon: Icon, label }: any) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${isActive ? 'text-black' : 'text-gray-400'}`}>
        <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-lime-peregrinas shadow-md scale-110' : ''}`}>
          <Icon size={20} strokeWidth={isActive ? 3 : 2} />
        </div>
        <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      </Link>
    );
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <ScrollToTop />

          <Routes>
            <Route path="/auto-cadastro" element={<AutoCadastro />} />
            {!user ? (
              <Route path="*" element={<Login />} />
            ) : (
              <Route path="*" element={
                <ProtectedRoute>
                  <div className="flex flex-col lg:flex-row w-full min-h-screen pb-20 lg:pb-0">
                    <IdleProtector />

                    <header className="lg:hidden bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 mt-6 md:mt-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-lime-peregrinas rounded-xl flex items-center justify-center shadow-lg">
                          <Flower2 size={22} className="text-black" />
                        </div>
                        <span className="font-black text-lg uppercase tracking-tighter">Peregrinas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DraftIndicator />
                        <NotificationBell />
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-xl">
                          <Menu size={24} />
                        </button>
                      </div>
                    </header>

                    <aside className={`fixed inset-y-0 left-0 z-[60] w-full md:w-80 bg-white transform transition-transform duration-500 ease-in-out lg:relative lg:translate-x-0 pt-8 lg:pt-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                      <div className="p-8 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-10">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-lime-peregrinas rounded-2xl flex items-center justify-center shadow-xl">
                              <Flower2 size={24} />
                            </div>
                            <h1 className="font-black text-xl tracking-tighter uppercase">Menu Geral</h1>
                          </div>
                          <button onClick={() => setIsSidebarOpen(false)} className="p-3 bg-gray-100 rounded-2xl"><X size={24} /></button>
                        </div>

                        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
                          <NavItem to="/" icon={HomeIcon} label="Início" permission="dashboard" />
                          <NavItem to="/dashboard" icon={Activity} label="Painel Estratégico" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-5">Discipulado</div>
                          <NavItem to="/discipulas" icon={Users} label="Peregrinas" permission="disciples" />
                          <NavItem to="/aniversariantes" icon={Gift} label="Aniversários" permission="disciples" />
                          <NavItem to="/one_on_one" icon={ShieldCheck} label="One-on-one (Sigiloso)" permission="leaders" />
                          <NavItem to="/mapa" icon={MapPin} label="Mapa GPS" permission="leaders" />
                          <NavItem to="/colheita" icon={Sprout} label="Colheita" permission="harvest" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-5">Gestão</div>
                          <NavItem to="/eventos" icon={Calendar} label="Eventos" permission="events" />
                          <NavItem to="/checkin" icon={QrCode} label="Check-in QR" permission="events" />
                          <NavItem to="/cursos" icon={GraduationCap} label="Acadêmico" permission="disciples" />
                          <NavItem to="/atas" icon={ClipboardList} label="Atas de Célula" permission="leaders" />
                          <NavItem to="/financeiro" icon={DollarSign} label="Financeiro" permission="finance" />
                          <NavItem to="/calculadora" icon={Calculator} label="Calculadora" permission="dashboard" />
                          <NavItem to="/relatorios" icon={BarChart3} label="Relatórios" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-5">Ouvidoria</div>
                          <NavItem to="/tickets" icon={MessageSquarePlus} label="Chamados & Tickets" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-5">Conteúdo</div>
                          <NavItem to="/feed" icon={BookOpen} label="Feed Palavras" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-5">Configurações</div>
                          <NavItem to="/perfil" icon={UserCircle} label="Meu Perfil" permission="profile" />
                          <NavItem to="/ajuda" icon={HelpCircle} label="Central de Ajuda" permission="dashboard" />
                          {user.permissions?.master && <NavItem to="/admin" icon={ShieldCheck} label="Master Admin" permission="master" />}
                        </nav>

                        <button onClick={logout} className="mt-8 flex items-center space-x-4 px-6 py-5 rounded-2xl text-red-500 font-black text-[11px] uppercase tracking-widest bg-red-50/50 hover:bg-red-50 transition-colors">
                          <LogOut size={20} />
                          <span>Sair do Aplicativo</span>
                        </button>
                      </div>
                    </aside>

                    {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

                    <main className="flex-1 overflow-x-hidden md:p-8 lg:p-12 pt-10 md:pt-14 lg:pt-16">
                      <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 md:pt-0">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/completar-perfil" element={<CompleteProfile />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/discipulas" element={<Disciples />} />
                          <Route path="/aniversariantes" element={<Birthdays />} />
                          <Route path="/one_on_one" element={<OneOnOne />} />
                          <Route path="/mapa" element={<CellMap />} />
                          <Route path="/colheita" element={<HarvestView />} />
                          <Route path="/financeiro" element={<Finance />} />
                          <Route path="/calculadora" element={<TitheCalculator />} />
                          <Route path="/eventos" element={<Events />} />
                          <Route path="/relatorios" element={<Reports />} />
                          <Route path="/checkin" element={<CheckIn />} />
                          <Route path="/tickets" element={<Tickets />} />
                          <Route path="/feed" element={<Feed />} />
                          <Route path="/cursos" element={<CoursesControl />} />
                          <Route path="/atas" element={<CellMeetings />} />
                          <Route path="/perfil" element={<ProfileSettings />} />
                          <Route path="/ajuda" element={<HelpCenter />} />
                          {user.permissions?.master && <Route path="/admin" element={<AdminPanel />} />}
                          <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                      </div>
                    </main>

                    <div className="hidden md:flex fixed top-12 right-6 z-[150] items-center gap-4">
                      {/* Master Edit Button — only visible for master users */}
                      {user.permissions?.master && (
                        <button
                          onClick={() => setIsMasterModalOpen(true)}
                          title="Editor Master"
                          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black hover:scale-105 transition-all border border-white/10 h-12"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                          Editar UI
                        </button>
                      )}

                      <DraftIndicator />
                      <NotificationBell />
                    </div>

                    {/* Master Edit Modal */}
                    {isMasterModalOpen && (
                      <MasterEditModal onClose={() => setIsMasterModalOpen(false)} />
                    )}

                    <div className="lg:hidden fixed bottom-24 right-6 z-40">
                      {isFabOpen && (
                        <div className="flex flex-col gap-3 mb-4 animate-in slide-in-from-bottom-5">
                          <QuickFabLink to="/atas" icon={ClipboardList} label="Ata" onClick={() => setIsFabOpen(false)} />
                          <QuickFabLink to="/financeiro" icon={Plus} label="Lançar" onClick={() => setIsFabOpen(false)} />
                        </div>
                      )}
                      <button
                        onClick={() => setIsFabOpen(!isFabOpen)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${isFabOpen ? 'bg-black text-white rotate-45' : 'bg-lime-peregrinas text-black'}`}
                      >
                        <Plus size={32} />
                      </button>
                    </div>

                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t flex items-center justify-around px-2 z-50 h-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                      <BottomNavItem to="/" icon={HomeIcon} label="Início" />
                      <BottomNavItem to="/discipulas" icon={Users} label="Rede" />
                      <BottomNavItem to="/financeiro" icon={DollarSign} label="Caixa" />
                      <BottomNavItem to="/eventos" icon={Calendar} label="Agenda" />
                      <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400">
                        <div className="p-2">
                          <MoreHorizontal size={20} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-60">Mais</span>
                      </button>
                    </nav>
                  </div>
                </ProtectedRoute>
              }
              />
            )}
          </Routes>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
};

const QuickFabLink = ({ to, icon: Icon, label, onClick }: any) => (
  <Link to={to} onClick={onClick} className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{label}</span>
    <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center">
      <Icon size={20} />
    </div>
  </Link>
);

export default App;
