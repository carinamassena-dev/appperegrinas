
import React, { useState, useEffect } from 'react';
// Comentário: Importação de useSearchParams e useNavigate corrigida para garantir compatibilidade com o ambiente.
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flower2, User, Phone, Home, Heart, ShieldAlert, CheckCircle, MessageCircle, Mail, Lock } from 'lucide-react';
import { Disciple, BaptismStatus, Leader } from '../types';
import { loadData, saveRecord } from '../services/dataService';

const AutoCadastro: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tipo = searchParams.get('tipo'); // 'novo' ou 'atualizacao'
  const liderIdParam = searchParams.get('liderId');
  const orgIdParam = searchParams.get('orgId'); // Usado por convites raiz do Super Admin
  const [isValid, setIsValid] = useState<boolean | null>(true); // Assumimos válido a menos que falte params críticos
  const [submitted, setSubmitted] = useState(false);
  const [liderName, setLiderName] = useState<string>('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Disciple> & { passwordHash?: string }>({
    nome: '', email: '', whatsapp: '', dataAniversario: '', statusRelacionamento: 'Solteira',
    profissao: '', coresPreferidas: '', presentesPreferidos: '',
    contatoEmergenciaNome: '', contatoEmergenciaFone: '',
    endereco: '', bairro: '', liderDireta: '', status: 'Ativa', passwordHash: ''
  });

  const [isLoadingDisciple, setIsLoadingDisciple] = useState(false);

  useEffect(() => {
    // Se não tiver líder vinculada no link, é inválido.
    if (!liderIdParam) {
      setIsValid(false);
      return;
    }

    setFormData(prev => ({ ...prev, liderDireta: liderIdParam }));

    // Se tiver orgId direto na URL (convite Super Admin), usa ele.
    if (orgIdParam) {
      setOrgId(orgIdParam);
      setLiderName('Sistema Raiz (Primeira Líder)');
      return;
    }

    // Fetch leader name for the success message
    const fetchLeader = async () => {
      try {
        const leaders = await loadData<Leader>('leaders');
        const lider = leaders.find(l => l.id === liderIdParam);
        if (lider) {
          setLiderName(lider.nome);
          if (lider.organization_id) setOrgId(lider.organization_id);
        } else {
          // Fallback to searching all users just in case
          const users = await loadData<any>('users');
          const user = users.find((u: any) => u.id === liderIdParam);
          if (user) {
            setLiderName(user.nome);
            if (user.organization_id) setOrgId(user.organization_id);
          }
        }
      } catch (e) {
        console.error("Erro ao buscar líder", e);
      }
    };
    fetchLeader();

    // Se for atualização e vier o discipleId, carrega os dados
    const fetchDisciple = async () => {
      const dId = searchParams.get('discipleId');
      if (tipo === 'atualizacao' && dId) {
        setIsLoadingDisciple(true);
        try {
          const { supabase } = await import('../services/supabaseClient');
          const { data, error } = await supabase
            .from('peregrinas')
            .select('record')
            .eq('id', dId)
            .single();

          if (data && data.record) {
            const rec = data.record;
            setFormData(prev => ({
              ...prev,
              nome: rec.nome || '',
              email: rec.email || '',
              whatsapp: rec.whatsapp || '',
              dataAniversario: rec.dataAniversario || '',
              statusRelacionamento: rec.statusRelacionamento || 'Solteira',
              profissao: rec.profissao || '',
              coresPreferidas: rec.coresPreferidas || '',
              presentesPreferidos: rec.presentesPreferidos || '',
              contatoEmergenciaNome: rec.contatoEmergenciaNome || '',
              contatoEmergenciaFone: rec.contatoEmergenciaFone || '',
              endereco: rec.endereco || '',
              bairro: rec.bairro || ''
            }));
          }
        } catch (err) {
          console.error("Erro ao carregar dados da discípula", err);
        } finally {
          setIsLoadingDisciple(false);
        }
      }
    };

    fetchDisciple();

  }, [liderIdParam, tipo, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liderIdParam || !formData.email) return;

    // Email Validation
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      alert("Por favor, digite um e-mail válido.");
      return;
    }

    if (tipo !== 'atualizacao' && (!formData.passwordHash || formData.passwordHash.length < 4)) {
      alert("Por favor, crie uma senha com pelo menos 4 caracteres.");
      return;
    }

    try {
      const pendingRecord = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        tipo_solicitacao: tipo || 'novo',
        liderId_generator: liderIdParam,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        idade: formData.dataAniversario ? calculateAge(formData.dataAniversario) : 0,
        batizada: formData.batizada || BaptismStatus.NAO_BATIZADA,
        fezUV: formData.fezUV || false,
        fezEncontro: formData.fezEncontro || false,
        fezFormatura: formData.fezFormatura || false,
        fezReencontro: formData.fezReencontro || false,
        organization_id: orgId || undefined
      };

      await saveRecord('pendingRegistrations', pendingRecord);

      setSubmitted(true);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar os dados. Tente novamente.');
    }
  };

  const calculateAge = (bday: string) => {
    const today = new Date();
    const birthDate = new Date(bday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const shareViaWhatsApp = () => {
    const text = `*${tipo === 'atualizacao' ? 'ATUALIZAÇÃO' : 'NOVO CADASTRO'} PEREGRINA*\n\n` +
      `*Nome:* ${formData.nome}\n` +
      `*E-mail:* ${formData.email}\n` +
      `*Whats:* ${formData.whatsapp}\n` +
      `*Nasc:* ${formData.dataAniversario}\n` +
      `*Profissão:* ${formData.profissao}\n` +
      `*Bairro:* ${formData.bairro}\n` +
      `*Cores:* ${formData.coresPreferidas}\n` +
      `*Emergência:* ${formData.contatoEmergenciaNome} (${formData.contatoEmergenciaFone})`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md w-full space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-black">Link Expirado</h2>
          <p className="text-gray-500 font-medium italic">Este link de cadastro já foi utilizado ou é inválido. Peça à sua líder para gerar um novo link único para você!</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gray-100 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-lime-peregrinas flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full space-y-8 animate-in zoom-in-95">
          <div className="w-24 h-24 bg-lime-50 text-lime-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={60} />
          </div>
          <div>
            <h2 className="text-3xl font-black">{tipo === 'atualizacao' ? 'Atualizado com sucesso!' : 'Cadastro enviado com sucesso!'}</h2>
            <p className="text-gray-500 mt-2 font-medium italic">
              Sua líder <b>{liderName || 'Responsável'}</b> foi notificada e aprovará seu acesso em breve.
            </p>
          </div>
          <button
            onClick={shareViaWhatsApp}
            className="w-full py-4 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-all"
          >
            <MessageCircle size={20} /> ENVIAR PARA MINHA LÍDER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-6 border-b flex items-center justify-center space-x-3 sticky top-0 z-10 shadow-sm">
        <div className="w-10 h-10 bg-lime-peregrinas rounded-xl flex items-center justify-center shadow-md">
          <Flower2 className="text-black" size={24} />
        </div>
        <h1 className="font-black text-xl tracking-tight uppercase">Peregrinas <span className="text-lime-600">{tipo === 'atualizacao' ? 'Atualização' : 'Cadastro'}</span></h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 mt-8">
        {isLoadingDisciple ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] shadow-sm">
            <div className="w-12 h-12 border-4 border-lime-200 border-t-lime-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Carregando seus dados...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-lime-600 flex items-center gap-2">
                <User size={20} /> Dados Pessoais
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Líder" value={liderName || formData.liderDireta || ''} disabled={true} onChange={() => { }} />
                  <Input label="Seu Nome Completo" value={formData.nome} onChange={v => setFormData({ ...formData, nome: v })} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="WhatsApp" type="tel" value={formData.whatsapp} onChange={v => setFormData({ ...formData, whatsapp: v })} required />
                  <Input label="E-mail" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} required />
                </div>

                {tipo !== 'atualizacao' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Crie sua Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="password" required placeholder="Mínimo 4 caracteres"
                        value={formData.passwordHash} onChange={e => setFormData({ ...formData, passwordHash: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-lime-600/20 transition-all border-none"
                      />
                    </div>
                  </div>
                )}

                <Input label="Data de Nascimento" type="date" value={formData.dataAniversario} onChange={v => setFormData({ ...formData, dataAniversario: v })} required />
                <Input label="Sua Profissão" value={formData.profissao} onChange={v => setFormData({ ...formData, profissao: v })} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Estado Civil</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none" value={formData.statusRelacionamento} onChange={e => setFormData({ ...formData, statusRelacionamento: e.target.value })}>
                    <option>Solteira</option><option>Casada</option><option>Noiva</option><option>Divorciada</option><option>Viúva</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                <Home size={20} /> Onde você mora?
              </h3>
              <div className="space-y-4">
                <Input label="Endereço" value={formData.endereco} onChange={v => setFormData({ ...formData, endereco: v })} />
                <Input label="Bairro" value={formData.bairro} onChange={v => setFormData({ ...formData, bairro: v })} />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-pink-600 flex items-center gap-2">
                <Heart size={20} /> Interesses & Emergência
              </h3>
              <div className="space-y-4">
                <Input label="Cores Favoritas" value={formData.coresPreferidas} onChange={v => setFormData({ ...formData, coresPreferidas: v })} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Presentes que gosta</label>
                  <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold h-20 text-sm outline-none border-none" value={formData.presentesPreferidos} onChange={e => setFormData({ ...formData, presentesPreferidos: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Contato Emergência (Nome)" value={formData.contatoEmergenciaNome} onChange={v => setFormData({ ...formData, contatoEmergenciaNome: v })} />
                  <Input label="WhatsApp Emergência" type="tel" value={formData.contatoEmergenciaFone} onChange={v => setFormData({ ...formData, contatoEmergenciaFone: v })} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-6 bg-lime-peregrinas text-black font-black rounded-[2rem] shadow-2xl hover:scale-105 transition-all uppercase tracking-[0.2em]">
              {tipo === 'atualizacao' ? 'Atualizar Meus Dados' : 'Finalizar Meu Cadastro'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

const Input = ({ label, type = "text", value, onChange, required = false, placeholder = "" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input
      type={type} required={required} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-lime-600/20 transition-all border-none"
    />
  </div>
);

export default AutoCadastro;
