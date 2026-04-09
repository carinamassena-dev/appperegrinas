import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  Users, Sprout, DollarSign, Calendar,
  Menu, X, Flower2, ShieldCheck,
  Home as HomeIcon, Activity, LogOut, MapPin, Gift, 
  BarChart3, QrCode, BookOpen, ClipboardList, UserCircle, 
  MoreHorizontal, MessageSquarePlus, Mail, Calculator, 
  MessageSquare, ShieldAlert
} from 'lucide-react';

// Importação de Componentes
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import TitheCalculator from './components/TitheCalculator';
import Disciples from './components/Disciples';
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
import { OneOnOne } from './components/OneOnOne';
import { IdleProtector } from './components/IdleProtector';
import { UserAccount } from './types';
import { applyThemeToDOM, loadConfigFromSupabase } from './services/uiConfigService';
import { saveRecord } from './services/dataService';
import { supabase } from './services/supabaseClient';
import MuralComunhao from './components/MuralComunhao';
import AgendaGeracao from './components/AgendaGeracao';
import SuperAdminPanel from './components/SuperAdminPanel';
import { AmigoSecreto } from './components/AmigoSecreto';
import { RevelarAmigo } from './components/RevelarAmigo';

// --- Contexto de Autenticação ---
export interface AuthContextType {
  user: UserAccount | null;
  login: (u: UserAccount) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserAccount>) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null, login: () => { }, logout: () => { }, updateProfile: () => { }
});

// --- Helpers e Segurança ---
const getDefaultPermissions = (role?: string) => {
  const isMaster = role === 'Master' || role === 'SuperAdmin';
  return {
    dashboard: 'view',
    disciples: 'edit',
    leaders: isMaster ? 'edit' : 'view',
    finance: isMaster ? 'edit' : 'view',
    events: 'edit',
    harvest: 'edit',
    master: isMaster
  };
};

const ensurePermissions = (u: UserAccount): UserAccount => {
  if (!u.permissions) return { ...u, permissions: getDefaultPermissions(u.role) as any };
  return u;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children, requireRole }: { children: React.ReactNode, requireRole?: string }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" replace />;
  if (requireRole && user.role !== requireRole && user.role !== 'Master' && user.role !== 'SuperAdmin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// --- Componente Principal App ---
const App: React.FC = () => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const config = await loadConfigFromSupabase();
        applyThemeToDOM(config.theme);
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) setUser(ensurePermissions(JSON.parse(savedUser)));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    initApp();
  }, []);

  const login = (u: UserAccount) => {
    const safeUser = ensurePermissions(u);
    setUser(safeUser);
    localStorage.setItem('current_user', JSON.stringify(safeUser));
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

  // Sub-componente de Item de Menu (UI do Vídeo)
  const NavItem = ({ to, icon: Icon, label, permission }: any) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    const perms = user?.permissions as any;

    if (permission !== 'public' && !perms?.master && perms?.[permission] === 'none') return null;

    return (
      <Link
        to={to}
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all mb-1 ${
          isActive ? 'bg-lime-peregrinas text-black font-black shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <Icon size={18} strokeWidth={isActive ? 3 : 2} />
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      <HashRouter>
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
                    
                    {/* HEADER MOBILE */}
                    <header className="lg:hidden bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-lime-peregrinas rounded-xl flex items-center justify-center"><Flower2 size={22} /></div>
                        <span className="font-black text-lg uppercase tracking-tighter">Peregrinas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <NotificationBell />
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-xl"><Menu size={24} /></button>
                      </div>
                    </header>

                    {/* SIDEBAR (ESTRUTURA DO VÍDEO) */}
                    <aside className={`fixed inset-y-0 left-0 z-[60] w-full md:w-80 bg-white transform transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                      <div className="p-8 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-10">
                          <div className="flex items-center space-x-4">
                            <Flower2 size={24} className="text-lime-600" />
                            <h1 className="font-black text-xl uppercase tracking-tighter">Menu Geral</h1>
                          </div>
                          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-3 bg-gray-100 rounded-2xl"><X size={24} /></button>
                        </div>

                        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
                          <NavItem to="/" icon={HomeIcon} label="Início" permission="public" />
                          <NavItem to="/dashboard" icon={Activity} label="Painel Estratégico" permission="dashboard" />

                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Discipulado</div>
                          <NavItem to="/discipulas" icon={Users} label="Peregrinas" permission="disciples" />
                          <NavItem to="/aniversariantes" icon={Gift} label="Aniversários" permission="disciples" />
                          <NavItem to="/one-on-one" icon={ShieldCheck} label="One-on-One (Sigiloso)" permission="disciples" />
                          <NavItem to="/mapa" icon={MapPin} label="Mapa GPS" permission="public" />
                          <NavItem to="/colheita" icon={Sprout} label="Colheita" permission="harvest" />
                          <NavItem to="/amigo-secreto" icon={UserCircle} label="Amigo Secreto" permission="public" />

                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Gestão</div>
                          <NavItem to="/eventos" icon={Calendar} label="Eventos" permission="events" />
                          <NavItem to="/checkin" icon={QrCode} label="Check-in QR" permission="events" />
                          <NavItem to="/academico" icon={BookOpen} label="Acadêmico" permission="master" />
                          <NavItem to="/atas" icon={ClipboardList} label="Atas de Célula" permission="disciples" />
                          <NavItem to="/financeiro" icon={DollarSign} label="Financeiro" permission="finance" />
                          <NavItem to="/calculadora" icon={Calculator} label="Calculadora" permission="public" />
                          <NavItem to="/relatorios" icon={BarChart3} label="Relatórios" permission="master" />

                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Ouvidoria</div>
                          <NavItem to="/tickets" icon={MessageSquarePlus} label="Chamados & Tickets" permission="public" />

                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Conteúdo</div>
                          <NavItem to="/mural" icon={MessageSquare} label="Mural de Comunhão" permission="public" />
                          <NavItem to="/agenda" icon={Calendar} label="Agenda da Geração" permission="public" />
                          <NavItem to="/feed" icon={Activity} label="Feed Palavras" permission="public" />

                          <div className="pt-6 pb-2 text-[9px] font-black text-gray-300 uppercase tracking-widest ml-5">Configurações</div>
                          <NavItem to="/perfil" icon={UserCircle} label="Meu Perfil" permission="profile" />
                          {user.role === 'Master' && <NavItem to="/admin" icon={ShieldAlert} label="Master Admin" permission="master" />}
                          {user.role === 'SuperAdmin' && <NavItem to="/super-admin" icon={ShieldCheck} label="Super Admin" permission="master" />}
                        </nav>

                        <button onClick={logout} className="mt-8 flex items-center space-x-4 px-6 py-5 rounded-2xl text-red-500 font-black text-[11px] uppercase tracking-widest bg-red-50">
                          <LogOut size={20} /><span>Sair do Aplicativo</span>
                        </button>
                      </div>
                    </aside>

                    {/* ÁREA DE CONTEÚDO */}
                    <main className="flex-1 overflow-x-hidden p-4 md:p-8 lg:p-12">
                      <div className="max-w-7xl mx-auto">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/discipulas" element={<Disciples />} />
                          <Route path="/aniversariantes" element={<Birthdays />} />
                          <Route path="/one-on-one" element={<OneOnOne />} />
                          <Route path="/mapa" element={<CellMap />} />
                          <Route path="/colheita" element={<HarvestView />} />
                          <Route path="/eventos" element={<Events />} />
                          <Route path="/checkin" element={<CheckIn />} />
                          <Route path="/academico" element={<CoursesControl />} />
                          <Route path="/atas" element={<CellMeetings />} />
                          <Route path="/financeiro" element={<Finance />} />
                          <Route path="/calculadora" element={<TitheCalculator />} />
                          <Route path="/relatorios" element={<Reports />} />
                          <Route path="/tickets" element={<Tickets />} />
                          <Route path="/mural" element={<MuralComunhao userProfile={user} />} />
                          <Route path="/agenda" element={<AgendaGeracao userRole={user.role} />} />
                          <Route path="/feed" element={<Feed />} />
                          <Route path="/amigo-secreto" element={<AmigoSecreto />} />
                          <Route path="/perfil" element={<ProfileSettings />} />
                          <Route path="/admin" element={<AdminPanel />} />
                          <Route path="/super-admin" element={<SuperAdminPanel />} />
                        </Routes>
                      </div>
                    </main>

                    {/* NAV BOTTOM MOBILE */}
                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around z-50 h-20 shadow-2xl">
                      <Link to="/" className="flex flex-col items-center flex-1"><HomeIcon size={20} /><span className="text-[8px] font-bold uppercase mt-1">Início</span></Link>
                      <Link to="/discipulas" className="flex flex-col items-center flex-1"><Users size={20} /><span className="text-[8px] font-bold uppercase mt-1">Rede</span></Link>
                      <Link to="/financeiro" className="flex flex-col items-center flex-1"><DollarSign size={20} /><span className="text-[8px] font-bold uppercase mt-1">Caixa</span></Link>
                      <Link to="/eventos" className="flex flex-col items-center flex-1"><Calendar size={20} /><span className="text-[8px] font-bold uppercase mt-1">Agenda</span></Link>
                      <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center flex-1 text-gray-400"><MoreHorizontal size={20} /><span className="text-[8px] font-bold uppercase mt-1">Mais</span></button>
                    </nav>
                  </div>
                </ProtectedRoute>
              } />
            )}
          </Routes>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
