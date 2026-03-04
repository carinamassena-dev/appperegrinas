import React, { useState, useContext } from 'react';
import { Flower2, Lock, User, ArrowRight, AlertCircle, X, CheckCircle, Smartphone, Mail, Loader2 } from 'lucide-react';
import { AuthContext, AuthContextType } from '../App';
import { UserAccount } from '../types';
import { loadData, saveRecord } from '../services/dataService';
import { logAction } from '../services/auditService';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext) as AuthContextType;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Recovery State
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'email' | 'code' | 'reset' | 'success'>('none');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [targetUser, setTargetUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Access Request State
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [requestData, setRequestData] = useState({
    nome: '', email: '', whatsapp: '', username: '', passwordHash: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Login via Vercel Serverless Function (Secure flow)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const textError = await res.text(); // Lê como texto bruto primeiro
        console.error("ERRO BRUTO DA API:", textError);

        // Tenta extrair mensagem amigável se de fato for um JSON formatado por nós (Ex: 401 Senha incorreta)
        try {
          const parsed = JSON.parse(textError);
          if (parsed.error) {
            setError(parsed.error);
            setTimeout(() => setError(''), 3000);
            setIsLoading(false);
            return;
          }
        } catch (e) { }

        throw new Error(`Erro do servidor. Verifique o console.`);
      }

      const data = await res.json();

      if (data && data.user) {
        // Se houver token na resposta, garante que o usuário tenha ele
        if (data.sessionToken && !data.user.sessionToken) {
          data.user.sessionToken = data.sessionToken;
        }
        login(data.user);
      } else {
        setError('Resposta inválida do servidor de autenticação.');
      }
    } catch (err) {
      console.error('API Router Error', err);
      setError('O servidor não respondeu a requisição de segurança.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Load users from Supabase
      const users: UserAccount[] = await loadData<UserAccount>('users');
      const found = users.find(u => u.email === recoveryEmail || u.username === recoveryEmail);

      if (found) {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setSentCode(code);
        setTargetUser(found);
        setRecoveryStep('code');
        console.log(`[SIMULAÇÃO RECUPERAÇÃO] Código para ${found.email}: ${code}`);
      } else {
        alert("Nenhum usuário encontrado com este e-mail/username.");
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      alert("Erro ao buscar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (recoveryCode === sentCode) {
      setRecoveryStep('reset');
    } else {
      alert("Código inválido.");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return alert("Digite a nova senha.");
    if (!targetUser) return;

    const updatedUser = { ...targetUser, passwordHash: newPassword };
    await saveRecord('users', updatedUser);

    logAction(targetUser.nome || 'Sistema', "Recuperação de Senha", `Senha resetada via fluxo de esquecimento para ${targetUser.username}`, "USUARIO");
    setRecoveryStep('success');
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const users: UserAccount[] = await loadData<UserAccount>('users');
      if (users.some(u => u.username === requestData.username)) {
        alert("Este usuário já está em uso.");
        setIsLoading(false);
        return;
      }

      const newUser: UserAccount = {
        id: Math.random().toString(36).substr(2, 9),
        ...requestData,
        role: 'Líder',
        permissions: {
          dashboard: 'view', disciples: 'view', leaders: 'none',
          finance: 'none', events: 'view', harvest: 'view', master: false
        },
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      await saveRecord('users', newUser);
      alert("Solicitação enviada com sucesso! Aguarde a liberação da liderança.");
      setIsRequestingAccess(false);
      setRequestData({ nome: '', email: '', whatsapp: '', username: '', passwordHash: '' });
    } catch (err) {
      console.error('Erro ao solicitar acesso:', err);
      alert("Erro ao enviar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {!isRequestingAccess ? (
          <form onSubmit={handleLogin} className="w-full bg-white md:shadow-2xl md:border border-gray-100 rounded-[3rem] p-10 space-y-8 animate-in zoom-in-95 fade-in duration-500">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-lime-peregrinas rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border-4 border-white">
                <Flower2 size={40} className="text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Peregrinas</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Acesso à Geração de Luz</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text" placeholder="Usuário ou E-mail" required
                    className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 focus:bg-white transition-all"
                    value={username} onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="password" placeholder="Senha" required
                    className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 focus:bg-white transition-all"
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-xs font-black uppercase animate-in">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                Entrar no Sistema <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setRecoveryStep('email')}
                className="w-full text-[10px] font-black uppercase text-gray-400 tracking-widest hover:text-black transition-colors"
              >
                Esqueci minha senha
              </button>

              <div className="pt-4 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setIsRequestingAccess(true)}
                  className="text-[10px] font-black uppercase text-lime-600 tracking-widest hover:text-black transition-colors"
                >
                  Solicitar Acesso à Rede
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestAccess} className="w-full bg-white md:shadow-2xl md:border border-gray-100 rounded-[3rem] p-10 space-y-6 animate-in zoom-in-95 fade-in duration-500">
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-lime-peregrinas/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-lime-600" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Novo Acesso</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Preencha para solicitar liberação</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" placeholder="Nome Completo" required className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 text-sm" value={requestData.nome} onChange={e => setRequestData({ ...requestData, nome: e.target.value })} />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="email" placeholder="E-mail" required className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 text-sm" value={requestData.email} onChange={e => setRequestData({ ...requestData, email: e.target.value })} />
              </div>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="tel" placeholder="WhatsApp" required className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 text-sm" value={requestData.whatsapp} onChange={e => setRequestData({ ...requestData, whatsapp: e.target.value })} />
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" placeholder="Nome de Usuário (ex: maria.silva)" required className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 text-sm" value={requestData.username} onChange={e => setRequestData({ ...requestData, username: e.target.value })} />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="password" placeholder="Defina sua Senha" required className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 text-sm" value={requestData.passwordHash} onChange={e => setRequestData({ ...requestData, passwordHash: e.target.value })} />
              </div>
            </div>

            <button disabled={isLoading} type="submit" className="w-full bg-lime-peregrinas text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : "ENVIAR SOLICITAÇÃO"}
            </button>

            <button type="button" onClick={() => setIsRequestingAccess(false)} className="w-full text-[10px] font-black uppercase text-gray-400 tracking-widest hover:text-black transition-colors">
              Voltar ao Login
            </button>
          </form>
        )}

        {recoveryStep !== 'none' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 md:p-14 shadow-2xl space-y-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Recuperar Conta</h2>
                <button onClick={() => setRecoveryStep('none')}><X size={24} /></button>
              </div>

              {recoveryStep === 'email' && (
                <form onSubmit={handleForgotPass} className="space-y-6">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    Informe seu e-mail ou nome de usuário para enviarmos um código de verificação.
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text" placeholder="E-mail ou Usuário" required
                      className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200"
                      value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}
                    />
                  </div>
                  <button disabled={isLoading} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "ENVIAR CÓDIGO"}
                  </button>
                </form>
              )}

              {recoveryStep === 'code' && (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-lime-50 rounded-2xl flex items-center justify-center mx-auto text-lime-600">
                    <Smartphone size={32} />
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-sm">Validar Código</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                      Enviamos um código de 4 dígitos para seu e-mail.
                    </p>
                  </div>
                  <input
                    type="text" maxLength={4}
                    placeholder="0000"
                    className="w-full p-5 bg-gray-50 rounded-2xl text-center text-3xl font-black tracking-[0.5em] outline-none"
                    value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}
                  />
                  <button onClick={handleVerifyCode} className="w-full bg-lime-peregrinas text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs">
                    VERIFICAR AGORA
                  </button>
                </div>
              )}

              {recoveryStep === 'reset' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                      Olá <span className="text-black">{targetUser?.nome}</span>, defina sua nova senha de acesso abaixo.
                    </p>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="password" placeholder="Nova Senha" required
                        className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <button onClick={handleResetPassword} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">
                    REDEFINIR SENHA
                  </button>
                </div>
              )}

              {recoveryStep === 'success' && (
                <div className="text-center space-y-6 py-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={48} />
                  </div>
                  <h4 className="font-black text-xl uppercase tracking-tight">Tudo pronto!</h4>
                  <p className="text-xs text-gray-400">Sua senha foi redefinida. Você já pode acessar o sistema com sua nova chave.</p>
                  <button onClick={() => setRecoveryStep('none')} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">
                    VOLTAR AO LOGIN
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center pt-8">
          <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest">© 2025 Peregrinas App • V3.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
