import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { WorkspaceRole, User } from '../types/index.ts';
import { StorageService } from '../services/storage.ts';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onUserCreated?: (newUser: User, role: WorkspaceRole) => void;
}

const ROLE_OPTIONS: { role: WorkspaceRole; label: string; desc: string; badgeColor: string }[] = [
  {
    role: 'admin',
    label: 'Administrador',
    desc: 'Gerencia membros, quadros, tarefas e permissões',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    role: 'production',
    label: 'Produção',
    desc: 'Cria tarefas, movimenta cards e executa ordens de produção',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  {
    role: 'member',
    label: 'Membro',
    desc: 'Cria, edita e movimenta cards, anexa mídias e comenta',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    role: 'viewer',
    label: 'Visualizador',
    desc: 'Apenas visualiza quadros, projetos e tarefas',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
];

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onUserCreated,
}) => {
  const [name, setName] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('production');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    user: User;
    rawPassword: string;
    role: WorkspaceRole;
    accessLink: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setName('');
    setUsernameOrEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('production');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setCreatedResult(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanIdent = usernameOrEmail.trim();

    if (!cleanName) {
      setErrorMessage('Por favor, informe o nome completo do usuário.');
      return;
    }

    if (!cleanIdent) {
      setErrorMessage('Por favor, informe o nome de usuário ou e-mail de acesso.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, defina uma senha para o novo usuário.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = StorageService.registerUser({
        name: cleanName,
        usernameOrEmail: cleanIdent,
        password,
        role,
        workspaceId,
      });

      setIsSubmitting(false);

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Falha ao cadastrar usuário.');
        return;
      }

      const currentOrigin =
        typeof window !== 'undefined'
          ? window.location.origin || window.location.href.split('?')[0]
          : 'https://operatask.app';

      setCreatedResult({
        user: result.user,
        rawPassword: password,
        role,
        accessLink: currentOrigin,
      });

      if (onUserCreated) {
        onUserCreated(result.user, role);
      }
    }, 350);
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const roleLabel =
      ROLE_OPTIONS.find((r) => r.role === createdResult.role)?.label || 'Membro';

    const textToCopy = `*Acesso ao OperaTask*\n\nOlá, ${createdResult.user.name}! Sua conta foi criada pelo Administrador.\n\n🔗 *Link de Acesso:* ${createdResult.accessLink}\n👤 *Usuário / Login:* ${createdResult.user.email}\n🔑 *Senha:* ${createdResult.rawPassword}\n🛡️ *Perfil:* ${roleLabel}\n\nAcesse o link acima e faça login com suas credenciais.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho no mesmo estilo visual de LoginScreen */}
        <div className="bg-[#173653] dark:bg-slate-950 text-white px-6 py-4.5 border-b border-[#11273c] dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white shadow-xs p-1 flex items-center justify-center shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="OperaTask Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white inline-block">
                  Opera<span className="text-[#34B1AC]">Task</span>
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#34B1AC]/25 text-[#34B1AC] border border-[#34B1AC]/40">
                  Gestão de Equipe
                </span>
              </div>
              <p className="text-xs text-slate-300">Cadastrar novo usuário</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {createdResult ? (
            /* Tela de Sucesso com Link de Acesso Gerado */
            <div className="space-y-5 py-2 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Usuário Cadastrado com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  A conta foi criada com o nome de usuário e a senha definidos. Envie o link de acesso abaixo para o novo membro acessar a plataforma.
                </p>
              </div>

              {/* Caixa de Credenciais Prontas para Envio */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Dados de Acesso Criados</span>
                  <span className="text-[11px] font-semibold text-[#34B1AC]">OperaTask</span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Nome:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {createdResult.user.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Login / E-mail:</span>
                    <span className="font-mono font-bold text-[#173653] dark:text-[#34B1AC]">
                      {createdResult.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Senha:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {createdResult.rawPassword}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">Função:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ROLE_OPTIONS.find((r) => r.role === createdResult.role)?.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Link de Acesso:</span>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all select-all flex items-center justify-between gap-2">
                      <span className="truncate">{createdResult.accessLink}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 shadow-md shadow-[#34B1AC]/30 transition-all cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link e Dados Copiados!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link de Acesso e Credenciais</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    + Cadastrar Outro Usuário
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="py-2.5 px-6 rounded-xl text-xs font-semibold text-white bg-[#173653] hover:bg-[#1f4a73] transition-colors cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Formulário no mesmo padrão visual da tela de login */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Nome do Usuário */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nome do Usuário *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira, Maria Santos..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Identificador: E-mail ou Nome de Usuário */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nome de Usuário / E-mail de Login *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Ex: carlos.producao ou carlos@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Este será o identificador usado pelo usuário para entrar no app.
                </p>
              </div>

              {/* Senha (definida pelo Dono/Admin) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Senha de Acesso *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tipo de Membro */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Tipo de Membro (Nível de Acesso) *</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setRole(item.role)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        role === item.role
                          ? 'border-[#34B1AC] bg-[#34B1AC]/10 ring-2 ring-[#34B1AC]/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </span>
                        {role === item.role && (
                          <Check className="w-3.5 h-3.5 text-[#34B1AC]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#1f4a73] active:scale-98 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-[#34B1AC]" />
                  <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
