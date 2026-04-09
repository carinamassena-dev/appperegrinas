import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  Users, Sprout, DollarSign, Calendar,
  Menu, X, Flower2, ShieldCheck,
  Home as HomeIcon, Activity, LogOut, MapPin, Gift, HelpCircle,
  BarChart3, QrCode, BookOpen, GraduationCap, ClipboardList, UserCircle, MoreHorizontal, MessageSquarePlus, Mail, Calculator, MessageSquare, ShieldAlert
} from 'lucide-react';


import Home from './components/Home';
import Dashboard from './components/Dashboard';
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
import MuralComunhao from './components/MuralComunhao';
import AgendaGeracao from './components/AgendaGeracao';
import SuperAdminPanel from './components/SuperAdminPanel';
import { AmigoSecreto } from './components/AmigoSecreto';
import { RevelarAmigo } from './components/RevelarAmigo';

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

const ensurePermissions = (u: UserAccount): UserAccount => {
  if (!u.permissions || typeof u.permissions !== 'object') {
    return { ...u, permissions: getDefaultPermissions(u.role) as any };
  }
  if (u.permissions.master === undefined) {
    return { ...u, permissions: { ...u.permissions, master: u.role === 'Master' } };
  }
  return u;
};

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
};

const ForceHomeOnMount: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, []);
  return null;
};

let _sessionCache: { userId: string; valid: boolean; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 10 * 60 * 1000;

const validateSession = async (user: UserAccount | null) => {
  if (!user || !supabase) return false;
  const now = Date.now();
  if (_sessionCache && _sessionCache.userId === user.id && (now - _sessionCache.timestamp < SESSION_CACHE_TTL)) {
    return _sessionCache.valid;
  }
  try {
    const { count, error } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('id', user.id);
    if (error || count === 0) {
      _sessionCache = { userId: user.id, valid: false, timestamp: now };
      return false;
    }
    _sessionCache = { userId: user.id, valid: true, timestamp: now };
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
  if (!isAuth) return <Navigate to="/" replace />;
  if (requireEmail && (!user?.email || user.email.trim() === '')) return <Navigate to="/completar-perfil" replace />;
  if (requireRole && user?.role !== requireRole && user?.role !== 'Master') return <Navigate to="/" replace />;
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
      alert("Erro ao salvar seu e-mail. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-lime-50 text-lime-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
          <Mail size={32} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Atualização Obrigatória</h2>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <input
            type="email"
            placeholder="seu.email@exemplo.com"
            required
            className="w-full px-6 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button type="submit" disabled={isSaving} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">
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
  const [loading, setLoading] = useState(true);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const config = await loadConfigFromSupabase();
        applyThemeToDOM(config.theme);
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
          const parsed = ensurePermissions(JSON.parse(savedUser));
          if (parsed.id === 'master_user' || parsed.id === '1') {
            localStorage.removeItem('current_user');
          } else {
            setUser(parsed);
          }
        }
      } catch (e) {
        console.error(e);
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
        className={`flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all ${isActive ? 'bg-lime-peregrinas text-black font-black shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100'}`}
      >
        <Icon size={20} />
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  };

  const BottomNavItem = ({ to, icon: Icon, label }: any) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex flex-col items-center justify-center flex-1 py-2 ${isActive ? 'text-black' : 'text-gray-400'}`}>
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
            <Route path="/revelar" element={<RevelarAmigo />} />
            {!user ? (
              <Route path="*" element={<Login />} />
            ) : (
              <Route path="*" element={
                <ProtectedRoute>
                  <div className="flex flex-col lg:flex-row w-full min-h-screen pb-20 lg:pb-0">
                    <IdleProtector />
                    <header className="lg:hidden bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 mt-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-lime-peregrinas rounded-xl flex items-center justify-center">
                          <Flower2 size={22} className="text-black" />
                        </div>
                        <span className="font-black text-lg uppercase tracking-tighter">Peregrinas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <NotificationBell />
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-xl"><Menu size={24} /></button>
                      </div>
                    </header>

                    <aside className={`fixed inset-y-0 left-0 z-[60] w-full md:w-80 bg-white transform transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                      <div className="p-8 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-10">
                          <div className="flex items-center space-x-4"><Flower2 size={24} /><h1 className="font-black text-xl uppercase">Menu</h1></div>
                          <button onClick={() => setIsSidebarOpen(false)} className="p-3 bg-gray-100 rounded-2xl"><X size={24} /></button>
                        </div>
                        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
                          <NavItem to="/" icon={HomeIcon} label="Início" permission="dashboard" />
                          <NavItem to="/dashboard" icon={Activity} label="Painel" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Rede</div>
                          <NavItem to="/discipulas" icon={Users} label="Peregrinas" permission="disciples" />
                          <NavItem to="/aniversariantes" icon={Gift} label="Aniversários" permission="disciples" />
                          <NavItem to="/colheita" icon={Sprout} label="Colheita" permission="harvest" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Gestão</div>
                          <NavItem to="/eventos" icon={Calendar} label="Eventos" permission="events" />
                          <NavItem to="/checkin" icon={QrCode} label="Check-in QR" permission="events" />
                          <NavItem to="/financeiro" icon={DollarSign} label="Financeiro" permission="finance" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Conteúdo</div>
                          <NavItem to="/mural" icon={MessageSquare} label="Mural" permission="dashboard" />
                          <NavItem to="/agenda" icon={Calendar} label="Eventos da Geração" permission="dashboard" />
                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Config</div>
                          <NavItem to="/perfil" icon={UserCircle} label="Meu Perfil" permission="profile" />
                          {user.permissions?.master && <NavItem to="/admin" icon={ShieldCheck} label="Admin" permission="master" />}
                        </nav>
                        <button onClick={logout} className="mt-8 flex items-center space-x-4 px-6 py-5 rounded-2xl text-red-500 font-black text-[11px] uppercase tracking-widest bg-red-50">
                          <LogOut size={20} /><span>Sair</span>
                        </button>
                      </div>
                    </aside>

                    {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

                    <main className="flex-1 overflow-x-hidden p-4 md:p-8 lg:p-12">
                      <div className="max-w-7xl mx-auto">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/completar-perfil" element={<CompleteProfile />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/discipulas" element={<Disciples />} />
                          <Route path="/aniversariantes" element={<Birthdays />} />
                          <Route path="/colheita" element={<HarvestView />} />
                          <Route path="/financeiro" element={<Finance />} />
                          <Route path="/eventos" element={<Events />} />
                          <Route path="/checkin" element={<CheckIn />} />
                          <Route path="/mural" element={<MuralComunhao userProfile={user} />} />
                          <Route path="/agenda" element={<AgendaGeracao userRole={user.role} />} />
                          <Route path="/perfil" element={<ProfileSettings />} />
                          {user.permissions?.master && <Route path="/admin" element={<AdminPanel />} />}
                          <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                      </div>
                    </main>

                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t flex items-center justify-around z-50 h-20 shadow-xl">
                      <BottomNavItem to="/" icon={HomeIcon} label="Início" />
                      <BottomNavItem to="/discipulas" icon={Users} label="Rede" />
                      <BottomNavItem to="/financeiro" icon={DollarSign} label="Caixa" />
                      <BottomNavItem to="/eventos" icon={Calendar} label="Eventos" />
                      <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400">
                        <MoreHorizontal size={20} />
                        <span className="text-[8px] font-black uppercase mt-1">Mais</span>
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

export default App;
