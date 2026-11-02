import React, { useState, useRef, useEffect } from 'react';
import { User, Workspace, WorkspaceRole } from '../types/index.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { SaveStatusIndicator } from './SaveStatusIndicator.tsx';
import { ColorPicker } from './ColorPicker.tsx';
import { ROLE_CONFIG, isUserMaster } from '../utils/helpers.ts';
import {
  X,
  User as UserIcon,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Calendar,
  Briefcase,
  Smartphone,
  Save,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Info,
  Crown,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentWorkspace: Workspace;
  onUpdateUser: (updatedUser: User) => void;
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

const AVATAR_COLORS = [
  '#173653', // Brand Navy
  '#34B1AC', // Brand Teal
  '#2563eb', // Royal Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#059669', // Emerald
  '#0891b2', // Cyan
  '#475569', // Slate
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentWorkspace,
  onUpdateUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'seguranca'>('dados');

  // Estados dos Dados Pessoais
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [title, setTitle] = useState(currentUser.title || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor || '#173653');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatarUrl);

  // Estados de Ajuste/Crop da Imagem
  const [imageZoom, setImageZoom] = useState(1);
  const [isPhotoEditing, setIsPhotoEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de Recuperação de Senha
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Estados de Validação e Salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar estado inicial ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setTitle(currentUser.title || '');
      setPhone(currentUser.phone || '');
      setBio(currentUser.bio || '');
      setAvatarColor(currentUser.avatarColor || '#173653');
      setAvatarUrl(currentUser.avatarUrl);
      setImageZoom(1);
      setIsPhotoEditing(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setResetEmailSent(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const isMaster = isUserMaster(currentUser);

  // Papel do usuário no Workspace atual
  const memberInfo = currentWorkspace.members.find((m) => m.userId === currentUser.id);
  const userRole: WorkspaceRole =
    isMaster ? 'owner' : (memberInfo?.role || (currentWorkspace.ownerId === currentUser.id ? 'owner' : 'member'));
  const roleLabel = isMaster ? 'Super Admin / Master' : (ROLE_CONFIG[userRole]?.label || 'Membro');

  // Formatador de data de criação
  const accountCreatedDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '15 de janeiro de 2026';

  // Upload de Imagem de Perfil
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem válido (PNG, JPEG, WebP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast({
        type: 'error',
        message: 'A imagem deve ter no máximo 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);
      setImageZoom(1);
      setIsPhotoEditing(true);
      onShowToast({
        type: 'info',
        message: 'Foto carregada! Ajuste o zoom se desejar e clique em Salvar.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
    setIsPhotoEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onShowToast({
      type: 'info',
      message: 'Foto removida. O avatar exibirá suas iniciais.',
    });
  };

  // Cálculo da Força da Nova Senha
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: 'Não informada', color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-400' };
    if (score <= 25) return { label: 'Muito Fraca', color: 'bg-red-500', text: 'text-red-500' };
    if (score <= 50) return { label: 'Fraca', color: 'bg-orange-500', text: 'text-orange-500' };
    if (score <= 75) return { label: 'Média', color: 'bg-amber-500', text: 'text-amber-500' };
    return { label: 'Forte & Segura', color: 'bg-[#34B1AC]', text: 'text-[#34B1AC]' };
  };

  const strengthInfo = getStrengthLabel(passwordStrength);

  // Salvar Dados Pessoais
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'O nome de exibição deve ter pelo menos 2 caracteres.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Insira um formato de e-mail válido.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onShowToast({
        type: 'error',
        message: 'Por favor, corrija os campos indicados.',
      });
      return;
    }

    setErrors({});
    setIsSaving(true);

    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarColor,
        avatarUrl: avatarUrl || undefined,
      };

      onUpdateUser(updatedUser);
      setIsSaving(false);
      setIsPhotoEditing(false);
      onShowToast({
        type: 'success',
        message: 'Perfil e informações da conta atualizados com sucesso!',
      });
    }, 400);
  };

  // Trocar Senha com Validações
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const passErrors: Record<string, string> = {};

    if (!currentPassword) {
      passErrors.currentPassword = 'Por favor, informe sua senha atual.';
    }

    if (!newPassword || newPassword.length < 8) {
      passErrors.newPassword = 'A nova senha deve ter no mínimo 8 caracteres.';
    } else if (passwordStrength < 50) {
      passErrors.newPassword = 'A nova senha é muito fraca. Adicione números e caracteres especiais.';
    }

    if (newPassword !== confirmPassword) {
      passErrors.confirmPassword = 'As senhas não coincidem.';
    }

    if (Object.keys(passErrors).length > 0) {
      setErrors(passErrors);
      onShowToast({
        type: 'error',
        message: 'Preencha os campos de senha corretamente.',
      });
      return;
    }

    setErrors({});
    setIsSaving(true);

    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        password: newPassword,
      };

      onUpdateUser(updatedUser);
      setIsSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast({
        type: 'success',
        message: 'Sua senha foi alterada com sucesso!',
      });
    }, 500);
  };

  // Recuperar Senha por E-mail
  const handleSendResetEmail = () => {
    setIsSendingResetEmail(true);
    setTimeout(() => {
      setIsSendingResetEmail(false);
      setResetEmailSent(true);
      onShowToast({
        type: 'success',
        message: `Link de redefinição de senha enviado para ${email}!`,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho da Janela de Perfil */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-linear-to-r from-[#173653] to-[#1e4569] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
              <UserAvatar
                name={name}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                size="md"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Minha Conta
                {isMaster ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/25 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40" />
                    Conta Master · Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#34B1AC]/25 text-[#34B1AC] border border-[#34B1AC]/40">
                    {roleLabel}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300">
                Gerencie seus dados pessoais, foto de perfil e segurança de acesso
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação & Status de Salvamento */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dados');
                setErrors({});
              }}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'dados'
                  ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Dados Pessoais</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('seguranca');
                setErrors({});
              }}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'seguranca'
                  ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Segurança & Senha</span>
            </button>
          </div>

          {/* Indicador de Salvamento da Conta */}
          <div className="py-2 flex items-center">
            <SaveStatusIndicator
              isSavingOverride={isSaving}
              label="Todas as informações salvas"
            />
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dados' ? (
            /* ================= ABA 1: DADOS PESSOAIS ================= */
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Banner de Conta Master / Super Administrador */}
              {isMaster && (
                <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-teal-500/10 to-[#173653]/10 border border-amber-500/30 dark:border-amber-400/30 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Crown className="w-5 h-5 fill-amber-500/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Privilégios Globais da Conta Master Ativos
                      </h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 tracking-wider">
                        SUPER ADMIN
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Esta conta possui acesso total e irrestrito a todos os Workspaces, Painel Master, gerenciamento global de membros, redefinição de senhas, projetos, quadros e configurações avançadas do OperaTask.
                    </p>
                  </div>
                </div>
              )}

              {/* Seção da Foto de Perfil */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#173653] dark:text-slate-300 mb-3">
                  Foto de Perfil & Identidade Visual
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Visualizador do Avatar com Zoom Interativo */}
                  <div className="relative group shrink-0">
                    <div
                      className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-lg flex items-center justify-center transition-transform"
                      style={{
                        backgroundColor: avatarUrl ? 'transparent' : avatarColor,
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          className="w-full h-full object-cover transition-transform duration-200"
                          style={{ transform: `scale(${imageZoom})` }}
                        />
                      ) : (
                        <span className="text-3xl font-extrabold text-white">
                          {name.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-[#34B1AC] hover:bg-[#289e99] text-white rounded-full shadow-md transition-all active:scale-95"
                      title="Fazer upload de nova foto"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#173653] hover:bg-[#224b70] text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Nova Foto</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Foto</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Suporta PNG, JPG ou WebP de até 5MB. A imagem será exibida nos seus cards, comentários e barra superior.
                    </p>

                    {/* Controles de Zoom se tiver foto carregada */}
                    {avatarUrl && (
                      <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <ZoomOut className="w-3.5 h-3.5" />
                          Zoom:
                        </span>
                        <input
                          type="range"
                          min="0.8"
                          max="2"
                          step="0.05"
                          value={imageZoom}
                          onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                          className="w-32 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#34B1AC]"
                        />
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <ZoomIn className="w-3.5 h-3.5" />
                          {Math.round(imageZoom * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Paleta de Cores para Iniciais (com Pincel e Categorias) */}
                    <div className="pt-2">
                      <ColorPicker
                        label="Cor de Destaque do Avatar (Iniciais)"
                        description="Exibida quando não há foto"
                        value={avatarColor}
                        onChange={(newColor) => setAvatarColor(newColor)}
                        size="sm"
                        showPaletteStrip={true}
                        quickPaletteCount={5}
                      />
                    </div>

                  </div>
                </div>
              </div>

              {/* Informações Pessoais Principais */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Nome Completo / Exibição *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                          errors.name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* E-mail Cadastrado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      E-mail da Conta *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                          errors.email
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cargo ou Função */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Cargo / Função
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Tech Lead, Designer, Gerente"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all"
                      />
                    </div>
                  </div>

                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Telefone / Contato (opcional)
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Sobre Você / Mini Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Sobre Você / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Breve resumo da sua atuação ou rotina na equipe..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all resize-none"
                  />
                </div>
              </div>

              {/* Informações da Conta no Sistema */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#173653] dark:text-[#34B1AC]">
                  <Info className="w-4 h-4" />
                  <span>Informações do Registro</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Conta criada em: <strong>{accountCreatedDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Workspace atual: <strong>{currentWorkspace.name}</strong> ({roleLabel})</span>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center">
                  <SaveStatusIndicator
                    isSavingOverride={isSaving}
                    label="Todas as informações salvas"
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 shadow-md shadow-[#34B1AC]/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ================= ABA 2: SEGURANÇA & SENHA ================= */
            <div className="space-y-6">
              {/* Formulário de Troca de Senha */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <KeyRound className="w-4 h-4 text-[#34B1AC]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Alterar Senha de Acesso
                  </h3>
                </div>

                {/* Senha Atual */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Senha Atual *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                        errors.currentPassword
                          ? 'border-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.currentPassword}</p>
                  )}
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crie uma nova senha segura"
                      className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                        errors.newPassword
                          ? 'border-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Indicador de Força da Senha */}
                  {newPassword && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Força da senha:</span>
                        <span className={`font-bold ${strengthInfo.text}`}>{strengthInfo.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          {newPassword.length >= 8 ? <Check className="w-3 h-3" /> : '·'} Mínimo 8 dígitos
                        </span>
                        <span className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          {/[A-Z]/.test(newPassword) ? <Check className="w-3 h-3" /> : '·'} Letra maiúscula
                        </span>
                        <span className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          {/[0-9]/.test(newPassword) ? <Check className="w-3 h-3" /> : '·'} Número
                        </span>
                        <span className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          {/[^A-Za-z0-9]/.test(newPassword) ? <Check className="w-3 h-3" /> : '·'} Símbolo (!@#$)
                        </span>
                      </div>
                    </div>
                  )}

                  {errors.newPassword && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirmação da Nova Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                        errors.confirmPassword
                          ? 'border-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center">
                    <SaveStatusIndicator
                      isSavingOverride={isSaving}
                      label="Todas as informações salvas"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#224b70] active:scale-98 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSaving ? 'Alterando...' : 'Atualizar Minha Senha'}</span>
                  </button>
                </div>
              </form>

              {/* Seção de Recuperação de Senha */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#34B1AC]/15 text-[#34B1AC] shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Esqueceu sua senha atual?
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Podemos enviar um link seguro de recuperação para seu e-mail cadastrado (<strong>{email}</strong>) para que você redefina suas credenciais com segurança.
                    </p>
                  </div>
                </div>

                {resetEmailSent ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Instruções e link de recuperação enviados com sucesso para <strong>{email}</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={isSendingResetEmail}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#173653] dark:text-[#34B1AC] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isSendingResetEmail ? 'Enviando...' : 'Enviar Link de Redefinição por E-mail'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
