
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  User, Shield, Bell, HelpCircle, LogOut, ChevronRight,
  Flower2, X, CheckCircle, Save, Phone, Mail,
  HardDrive, Database, RefreshCcw, Download, Upload, AlertTriangle, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { logAction } from '../services/auditService';
import { loadData, saveRecord, deleteRecord, generateFullSystemBackup } from '../services/dataService';
import { supabaseService } from '../services/supabaseService';
import { Loader2, Key, Smartphone, Mail as MailIcon } from 'lucide-react';

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState({ used: '0 KB', count: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [step, setStep] = useState<'form' | '2fa' | 'success'>('form');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  const [profileData, setProfileData] = useState({
    nome: user?.nome || 'Usuário Peregrina',
    email: user?.email || 'acesso@peregrinas.com',
    whatsapp: user?.whatsapp || '71900000000'
  });

  useEffect(() => {
    // No longer using localStorage for storage info — data is in Supabase
    setStorageInfo({ used: 'Supabase', count: 0 });
  }, []);

  const handleExportBackup = async () => {
    try {
      const data = await generateFullSystemBackup();
      if (!data) return alert("Houve um erro de configuração ao se conectar com o banco. O backup falhou.");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `peregrinas_FULL_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      alert('Erro ao exportar backup.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!confirm("Isso irá importar os dados do backup para o Supabase. Deseja continuar?")) return;

        // Import each module
        const modules = ['disciples', 'finance', 'harvest', 'events'] as const;
        for (const mod of modules) {
          if (data[mod] && Array.isArray(data[mod])) {
            for (const item of data[mod]) {
              await saveRecord(mod, item);
            }
          }
        }
        alert("Dados importados com sucesso para o Supabase!");
        window.location.reload();
      } catch (err) {
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
  };

  const resetDatabase = () => {
    alert("Para limpar dados, acesse o painel Supabase diretamente. Isso garante segurança dos dados.");
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateProfile(profileData);
      logAction(user?.nome || 'Usuário', "Perfil Atualizado", "Dados de contato e nome alterados", "USUARIO");
      setIsSaving(false);
      setActiveModal(null);
    }, 800);
  };

  const handleChangePassword = () => {
    if (!passForm.current || !passForm.next || !passForm.confirm) return alert("Preencha todos os campos.");
    if (passForm.next !== passForm.confirm) return alert("As novas senhas não coincidem.");
    if (passForm.current !== user?.passwordHash) return alert("Senha atual incorreta.");

    if (user?.role === 'Master') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setStep('2fa');
      alert(`[SISTEMA EM MODO TESTE]\nO código de verificação de 2 Etapas é: ${code}\n\n(Aviso: Como o aplicativo ainda não possui um servidor de e-mail configurado para envio de mensagens, o código está sendo exibido aqui na tela para você não ficar bloqueada).`);
      console.log(`[SIMULAÇÃO 2FA] Código enviado para ${user.email}: ${code}`);
      return;
    }

    finalizePasswordChange();
  };

  const finalizePasswordChange = () => {
    updateProfile({ passwordHash: passForm.next });
    logAction(user?.nome || 'Usuário', "Senha Alterada", "Troca de senha realizada com sucesso", "USUARIO");
    setStep('success');
  };

  const handleTwoFactor = () => {
    if (twoFactorCode === sentCode) {
      finalizePasswordChange();
    } else {
      alert("Código de verificação inválido.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-lime-peregrinas"></div>
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border-4 border-white shadow-xl flex items-center justify-center font-black text-4xl text-gray-200">
            {profileData.nome.charAt(0)}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-black text-white p-2.5 rounded-2xl shadow-lg">
            <Flower2 size={16} />
          </div>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{profileData.nome}</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">{user?.role} • Geração de Luz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden divide-y">
          <h3 className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50/50">Preferências</h3>
          <SettingsItem icon={User} label="Meus Dados" desc="Nome e contatos" onClick={() => setActiveModal("Dados")} />
          <SettingsItem icon={Shield} label="Segurança" desc="Alterar senha" onClick={() => setActiveModal("Segurança")} />
          <SettingsItem icon={Bell} label="Notificações" desc="Alertas do sistema" onClick={() => setActiveModal("Avisos")} />
        </div>

        {user?.role === 'Master' && (
          <div className="bg-black rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-white/5 group-hover:scale-110 transition-transform"><Database size={80} /></div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400 mb-6 flex items-center gap-2">
                <Zap size={14} fill="currentColor" /> Controle Master Avançado
              </h3>
              <div className="space-y-4">
                <button onClick={handleExportBackup} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center gap-4 px-6 transition-all border border-white/10">
                  <Download size={18} className="text-lime-400" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">Gerar Backup Completo do Sistema</p>
                    <p className="text-[9px] opacity-40">Exportar base de dados JSON com todas as tabelas</p>
                  </div>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center gap-4 px-6 transition-all border border-white/10">
                  <Upload size={18} className="text-blue-400" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase">Restaurar Sistema</p>
                    <p className="text-[9px] opacity-40">Importar arquivo de backup</p>
                  </div>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />

                <button
                  onClick={async () => {
                    if (!confirm("Isso removerá peregrinas com o mesmo nome (mantendo apenas uma). Deseja continuar?")) return;
                    setIsSaving(true);
                    try {
                      // Usar o supabaseService já importado
                      const all = await supabaseService.getAll('peregrinas');
                      const seen = new Set();
                      const toDelete: string[] = [];
                      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                      all.forEach((d: any) => {
                        const n = normalize(d.nome);
                        if (seen.has(n)) toDelete.push(d.id);
                        else seen.add(n);
                      });

                      if (toDelete.length === 0) {
                        alert("Nenhuma duplicata encontrada.");
                      } else {
                        if (confirm(`Encontradas ${toDelete.length} duplicatas. Confirmar exclusão?`)) {
                          for (const id of toDelete) await deleteRecord('disciples', id);
                          alert(`${toDelete.length} duplicatas removidas com sucesso!`);
                          window.location.reload();
                        }
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Erro ao limpar duplicatas.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="w-full py-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-2xl flex items-center gap-4 px-6 transition-all border border-purple-500/20"
                >
                  <RefreshCcw size={18} className="text-purple-400" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase text-purple-400">Limpar Duplicatas</p>
                    <p className="text-[9px] opacity-40 text-purple-400/60">Remover cadastros com nomes repetidos</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    localStorage.clear();
                    alert("Cache local limpo! O sistema recarregará os dados do servidor.");
                    window.location.reload();
                  }}
                  className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl flex items-center gap-4 px-6 transition-all border border-red-500/20"
                >
                  <HardDrive size={18} className="text-red-500" />
                  <div className="text-left">
                    <p className="text-xs font-black uppercase text-red-500">Limpar Cache Local</p>
                    <p className="text-[9px] opacity-40 text-red-500/60">Forçar recarregamento completo dos dados</p>
                  </div>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Supabase Cloud</span>
                </div>
                <span className="text-[10px] font-black text-lime-600 bg-lime-400/10 px-3 py-1 rounded-full uppercase">Sincronizado</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={logout} className="w-full py-6 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-red-100 transition-all shadow-sm">
        <LogOut size={20} /> Encerrar Sessão no App
      </button>

      {activeModal === "Dados" && (
        <Modal title="Meus Dados" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <InputField label="Nome Visível" value={profileData.nome} onChange={(v: any) => setProfileData({ ...profileData, nome: v })} />
            <InputField label="E-mail de Acesso" value={profileData.email} onChange={(v: any) => setProfileData({ ...profileData, email: v })} />
            <InputField label="WhatsApp Principal" value={profileData.whatsapp} onChange={(v: any) => setProfileData({ ...profileData, whatsapp: v })} />
            <button onClick={handleSaveProfile} disabled={isSaving} className="w-full py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl mt-4 flex items-center justify-center gap-2">
              {isSaving && <Loader2 size={18} className="animate-spin" />}
              {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </div>
        </Modal>
      )}

      {activeModal === "Segurança" && (
        <Modal title="Segurança da Conta" onClose={() => { setActiveModal(null); setStep('form'); setPassForm({ current: '', next: '', confirm: '' }); }}>
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-4">
                Para alterar sua senha, precisamos verificar sua identidade atual.
              </p>
              <InputField label="Senha Atual" type="password" value={passForm.current} onChange={(v: any) => setPassForm({ ...passForm, current: v })} />
              <div className="h-4"></div>
              <InputField label="Nova Senha" type="password" value={passForm.next} onChange={(v: any) => setPassForm({ ...passForm, next: v })} />
              <InputField label="Confirmar Nova Senha" type="password" value={passForm.confirm} onChange={(v: any) => setPassForm({ ...passForm, confirm: v })} />
              <button onClick={handleChangePassword} className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl mt-6 flex items-center justify-center gap-2">
                CONTINUAR <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === '2fa' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-lime-50 rounded-2xl flex items-center justify-center mx-auto text-lime-600">
                <Smartphone size={32} />
              </div>
              <div>
                <h4 className="font-black uppercase text-sm">Verificação em 2 Etapas</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                  Enviamos um código de 6 dígitos para <span className="text-black">{user?.email}</span>
                </p>
              </div>
              <input
                type="text"
                placeholder="000 000"
                maxLength={6}
                className="w-full p-5 bg-gray-50 rounded-2xl text-center text-3xl font-black tracking-[0.2em] outline-none border-2 border-transparent focus:border-lime-200"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
              />
              <button onClick={handleTwoFactor} className="w-full py-4 bg-lime-peregrinas text-black font-black rounded-2xl shadow-xl">
                VERIFICAR E ALTERAR
              </button>
              <button onClick={() => setStep('form')} className="text-[9px] font-black text-gray-400 uppercase">Voltar ao formulário</button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={48} />
              </div>
              <div>
                <h4 className="font-black text-xl uppercase tracking-tight text-gray-900">Senha Alterada!</h4>
                <p className="text-xs text-gray-400 mt-2">Sua segurança foi atualizada com sucesso e registrada no log de auditoria.</p>
              </div>
              <button onClick={() => { setActiveModal(null); setStep('form'); }} className="w-full py-4 bg-black text-white font-black rounded-2xl shadow-xl">FECHAR</button>
            </div>
          )}
        </Modal>
      )}

      {activeModal && activeModal !== "Dados" && activeModal !== "Segurança" && (
        <Modal title={activeModal} onClose={() => setActiveModal(null)}>
          <div className="p-8 bg-gray-50 rounded-3xl border text-center space-y-4">
            <AlertTriangle className="mx-auto text-yellow-500" size={40} />
            <p className="text-sm font-bold text-gray-600 uppercase">Funcionalidade Restrita</p>
            <p className="text-xs text-gray-400">Entre em contato com o suporte técnico para alterar configurações de segurança ou notificações globais.</p>
            <button onClick={() => setActiveModal(null)} className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase">Entendido</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, desc, onClick }: any) => (
  <button onClick={onClick} className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
    <div className="flex items-center gap-5">
      <div className="p-3 bg-gray-50 text-gray-400 group-hover:bg-lime-50 group-hover:text-lime-600 transition-colors rounded-2xl">
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className="font-black text-gray-900 uppercase tracking-tight text-sm">{label}</p>
        <p className="text-[10px] text-gray-400 font-medium italic">{desc}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-gray-200 group-hover:text-lime-600 transition-colors" />
  </button>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
    <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 space-y-6 animate-in zoom-in-95 shadow-2xl">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2"><X size={24} /></button>
      </div>
      {children}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none focus:ring-2 focus:ring-lime-100 transition-all" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default ProfileSettings;
