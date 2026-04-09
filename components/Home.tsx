
import { useNavigate } from 'react-router-dom';
import {
  Plus, Users, Sprout, DollarSign, Calendar,
  ClipboardList, ArrowRight, Flower2, Quote,
  Cake, Star, Heart, Zap, Loader2, Share2, MessageCircleHeart, Flame
} from 'lucide-react';
import { Disciple, Event } from '../types';
import { loadData, saveRecord, getTodayBirthdays } from '../services/dataService';
import { supabaseService } from '../services/supabaseService';
import { AuthContext } from '../App';
import React, { useState, useEffect, useContext } from 'react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [verse] = useState({ texto: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.", referencia: "Mateus 6:33" });
  const [birthdays, setBirthdays] = useState<Disciple[]>([]);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mock Data: Pão Diário
  const dailyDevotional = {
    verse: "Deleita-te também no Senhor, e te concederá os desejos do teu coração.",
    reference: "Salmos 37:4",
    reflection: "Deus tem o melhor para nós quando aprendemos a descansar n'Ele. Onde o seu coração tem buscado verdadeira alegria e satisfação ultimamente?",
    date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  };

  // Mural de Intercessão
  const { user } = useContext(AuthContext);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [showNewPrayerForm, setShowNewPrayerForm] = useState(false);
  const [newPrayerText, setNewPrayerText] = useState("");
  const [isSavingPrayer, setIsSavingPrayer] = useState(false);

  const fetchPrayers = async () => {
    try {
      const recentPrayers = await supabaseService.getRecentIntercessions();
      setPrayers(recentPrayers);
    } catch (err) {
      console.error('Error fetching prayers', err);
    }
  };

  const submitPrayer = async () => {
    if (!newPrayerText.trim() || !user) return;
    setIsSavingPrayer(true);
    try {
      const prayer = {
        id: crypto.randomUUID(),
        name: user.nome || 'Peregrina',
        request: newPrayerText,
        prayingUsers: []
      };
      await saveRecord('intercessions', prayer);
      setNewPrayerText('');
      setShowNewPrayerForm(false);
      await fetchPrayers();
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar pedido.');
    } finally {
      setIsSavingPrayer(false);
    }
  };

  const handlePray = async (prayer: any) => {
    const isPraying = prayer.prayingUsers?.includes(user?.id);
    let updatedUsers = [...(prayer.prayingUsers || [])];

    if (isPraying) {
      updatedUsers = updatedUsers.filter((uid: string) => uid !== user?.id);
    } else if (user?.id) {
      updatedUsers.push(user?.id);
    }

    // Optimistic UI update
    setPrayers(prev => prev.map(p => {
      if (p.id === prayer.id) {
        return { ...p, prayingUsers: updatedUsers };
      }
      return p;
    }));

    try {
      await saveRecord('intercessoes', { ...prayer, prayingUsers: updatedUsers });
    } catch (e) {
      console.error('Erro ao registrar oração', e);
      // Revert on error
      await fetchPrayers();
    }
  };

  const shareDevotional = () => {
    const text = `*Pão Diário Peregrinas* 🌻\n\n"${dailyDevotional.verse}"\n— ${dailyDevotional.reference}\n\n*Reflexão:*\n${dailyDevotional.reflection}\n\n_${dailyDevotional.date}_`;
    navigator.clipboard.writeText(text);
    alert('Devocional copiado para compartilhar!');
  };

  useEffect(() => {
    // Greeting logic
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    const fetchData = async () => {
      try {
        // Birthdays from Supabase (Optimized, no base64 images)
        const todaysBdays = await getTodayBirthdays();
        setBirthdays(todaysBdays);

        // Next Event from Supabase
        const allEvents = await loadData<Event>('events');
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = allEvents
          .filter(e => e.status === 'Ativo' && e.dataInicio >= todayStr)
          .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
        if (upcoming.length > 0) setNextEvent(upcoming[0]);
        // Intercessions
        await fetchPrayers();
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando Início...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20 animate-in fade-in duration-700 px-2 md:px-0 text-left">
      {/* Hero Section */}
      <section className="relative bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-16 border border-gray-100 shadow-sm overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 md:p-12 text-lime-50 group-hover:text-lime-100 transition-colors pointer-events-none">
          <Flower2 className="w-40 h-40 md:w-60 md:h-60" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <span className="bg-lime-peregrinas px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-widest text-black shadow-sm">
              Geração de Luz
            </span>
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-gray-900 leading-tight mb-4 md:mb-6">
            {greeting}, <br className="md:hidden" /><span className="text-lime-600">Peregrina!</span>
          </h1>
          <p className="text-sm md:text-lg text-gray-400 font-medium mb-8 md:mb-10 leading-relaxed italic max-w-md">
            "Levando a luz por onde passar, discipulando com amor e graça."
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <button
              onClick={() => navigate('/discipulas')}
              className="bg-black text-white px-6 py-4 md:px-8 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl"
            >
              Gerenciar Rede <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white border border-gray-200 text-gray-900 px-6 py-4 md:px-8 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Ver Estatísticas
            </button>
          </div>
        </div>
      </section>

      {/* Quick Actions Portal */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <ActionCard icon={Plus} title="Cadastro" color="bg-blue-50 text-blue-600" onClick={() => navigate('/discipulas')} />
        <ActionCard icon={ClipboardList} title="Ata Célula" color="bg-purple-50 text-purple-600" onClick={() => navigate('/atas')} />
        <ActionCard icon={Sprout} title="Colheita" color="bg-orange-50 text-orange-600" onClick={() => navigate('/colheita')} />
        <ActionCard icon={DollarSign} title="Financeiro" color="bg-green-50 text-green-600" onClick={() => navigate('/financeiro')} />
      </section>

      {/* Daily Devotional (Pão Diário) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-2 bg-gradient-to-br from-lime-50 to-lime-peregrinas/30 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-lime-100 relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 text-lime-600/5 rotate-12 group-hover:scale-110 transition-transform">
            <Quote className="w-40 h-40 md:w-60 md:h-60" />
          </div>
          <div className="relative z-10 space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-lime-600 animate-pulse" />
                <span className="font-black uppercase tracking-[0.3em] text-[10px] text-lime-800">Pão Diário</span>
              </div>
              <span className="text-[10px] font-bold text-lime-700/60 uppercase tracking-widest">{dailyDevotional.date}</span>
            </div>

            <p className="text-xl md:text-3xl font-serif text-gray-900 font-medium leading-relaxed italic">
              "{dailyDevotional.verse}"
            </p>

            <div className="flex items-center gap-4 py-2">
              <div className="h-[2px] w-8 bg-lime-600/30"></div>
              <p className="text-lime-800 font-black tracking-widest text-xs md:text-sm uppercase">{dailyDevotional.reference}</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-sm mt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-lime-700 mb-2">Para Refletir</h4>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{dailyDevotional.reflection}</p>
            </div>

            <button
              onClick={shareDevotional}
              className="mt-4 flex items-center gap-2 bg-white text-lime-700 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-lime-50 hover:scale-105 transition-all shadow-sm border border-lime-100"
            >
              <Share2 size={14} /> Compartilhar Mensagem
            </button>
          </div>
        </div>

        {/* Intercession Wall (Mural de Intercessão) */}
        <div className="md:col-span-1 space-y-4 md:space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden flex flex-col h-full">
            <div className="absolute -top-6 -right-6 text-indigo-50"><MessageCircleHeart size={80} /></div>
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-6 flex items-center gap-2">
                <Heart size={16} fill="currentColor" /> Mural de Intercessão
              </h3>

              <div className="space-y-4 flex-1">
                {prayers.length === 0 && (
                  <div className="text-center py-6 text-indigo-300 font-medium text-xs">
                    Nenhum pedido hoje. Seja a primeira a compartilhar!
                  </div>
                )}
                {prayers.map(prayer => {
                  const isPraying = prayer.prayingUsers?.includes(user?.id);
                  const prayingCount = prayer.prayingUsers?.length || 0;
                  // Simple logic to show hours ago based on created_at or fallback
                  const timeAgo = prayer.created_at ? (() => {
                    const diffMs = new Date().getTime() - new Date(prayer.created_at).getTime();
                    const hours = Math.floor(diffMs / 3600000);
                    const mins = Math.floor(diffMs / 60000);
                    if (hours > 0) return `Há ${hours}h`;
                    if (mins > 0) return `Há ${mins}m`;
                    return 'Agora mesmo';
                  })() : 'Hoje';

                  return (
                    <div key={prayer.id} className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">
                            {prayer.name.charAt(0)}
                          </div>
                          <span className="text-[11px] font-bold text-gray-900 uppercase">{prayer.name}</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{timeAgo}</span>
                      </div>

                      <p className="text-sm text-gray-600 leading-snug mb-4">"{prayer.request}"</p>

                      <div className="flex items-center justify-between mt-auto">
                        <button
                          onClick={() => handlePray(prayer)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isPraying
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-inner'
                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <span className="text-sm">🙏</span>
                          {isPraying ? 'Orando' : 'Estou orando'}
                        </button>

                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Heart size={10} className={isPraying ? 'text-indigo-400 fill-indigo-400' : ''} />
                          {prayingCount} orando
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 border-t pt-4">
                <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest mb-3">
                  As mensagens são renovadas diariamente para mantermos nosso foco nas orações de hoje.
                </p>
                {showNewPrayerForm ? (
                  <div className="flex gap-2 animate-in slide-in-from-bottom-2">
                    <input
                      value={newPrayerText}
                      onChange={e => setNewPrayerText(e.target.value)}
                      placeholder="Escreva seu pedido..."
                      className="flex-1 bg-gray-50 text-xs p-3 rounded-2xl border font-medium focus:border-indigo-300 outline-none"
                      onKeyDown={e => e.key === 'Enter' && submitPrayer()}
                      autoFocus
                    />
                    <button
                      onClick={submitPrayer}
                      disabled={isSavingPrayer}
                      className="bg-indigo-600 text-white px-5 rounded-2xl text-[10px] uppercase tracking-widest font-black disabled:opacity-50"
                    >
                      {isSavingPrayer ? '...' : 'Enviar'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewPrayerForm(true)} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> Novo Pedido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon: Icon, title, color, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-white p-5 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group text-left w-full"
  >
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
      <Icon size={20} />
    </div>
    <h3 className="text-xs md:text-sm font-black text-gray-900 group-hover:text-lime-600 transition-colors uppercase tracking-tight">{title}</h3>
  </button>
);

export default Home;
