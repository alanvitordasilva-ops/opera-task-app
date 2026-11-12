import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Users,
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
  Building,
  MessageSquare,
  AtSign,
} from 'lucide-react';
import { WorkspaceRole, User, Workspace } from '../types/index.ts';
import { StorageService, isServerApiAvailable, setServerApiAvailable } from '../services/storage.ts';
import { getProductionAppUrl, createInviteAccessUrl } from '../utils/appUrl.ts';
import { generateUserAccessMessage, formatUserProfileRole, OFFICIAL_APP_ACCESS_URL } from '../utils/userAccessMessage.ts';
import { isUserMaster } from '../utils/helpers.ts';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces?: Workspace[];
  workspaceId?: string;
  onUserCreated?: (newUser: User, role: WorkspaceRole, workspaceId: string, workspaceIds?: string[]) => void;
  currentUser?: User;
}

const ROLE_OPTIONS: { role: WorkspaceRole; label: string; desc: string; badgeColor: string }[] = [
  {
    role: 'administrador',
    label: 'Administrador',
    desc: 'Gerencia membros, quadros, tarefas e permissões',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    role: 'producao',
    label: 'Produção',
    desc: 'Cria tarefas, movimenta cards e executa ordens de produção',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  {
    role: 'membro',
    label: 'Membro',
    desc: 'Cria, edita e movimenta cards, anexa mídias e comenta',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    role: 'visualizador',
    label: 'Visualizador',
    desc: 'Apenas visualiza quadros, projetos e tarefas',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  {
    role: 'dono',
    label: 'Dono',
    desc: 'Controle total sobre o Workspace e seus membros',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  {
    role: 'master',
    label: 'Master (Super Admin)',
    desc: 'Acesso irrestrito a todos os workspaces e configurações',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
];

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  workspaceId,
  onUserCreated,
  currentUser,
}) => {
  const activeUser = currentUser || StorageService.getCurrentUser();
  const isMaster = isUserMaster(activeUser);

  const visibleRoleOptions = useMemo(() => {
    return ROLE_OPTIONS.filter((item) => {
      // A opção "Dono" e "Master" só podem ser vistas e selecionadas pelo Master
      if (item.role === 'dono' || item.role === 'master') {
        return isMaster;
      }
      return true;
    });
  }, [isMaster]);

  const availableWorkspaces = useMemo(() => {
    if (workspaces && workspaces.length > 0) return workspaces;
    return StorageService.getWorkspaces();
  }, [workspaces, isOpen]);

  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(() => {
    if (workspaceId) return [workspaceId];
    if (availableWorkspaces.length > 0) return [availableWorkspaces[0].id];
    return [];
  });

  useEffect(() => {
    if (!isOpen) return;
    if (workspaceId) {
      setSelectedWorkspaceIds((prev) => (prev.length === 0 || !prev.includes(workspaceId) ? [workspaceId] : prev));
    } else if (availableWorkspaces.length > 0) {
      setSelectedWorkspaceIds((prev) => (prev.length === 0 ? [availableWorkspaces[0].id] : prev));
    }
  }, [isOpen, workspaceId]);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('producao');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    user: User;
    rawPassword: string;
    role: WorkspaceRole;
    workspaceName: string;
    workspaceNames: string[];
    accessLink: string;
    companyId?: string;
    workspaceId?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showAllUsersList, setShowAllUsersList] = useState(false);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);

  if (!isOpen) return null;

  const handleToggleWorkspace = (wsId: string) => {
    setSelectedWorkspaceIds((prev) =>
      prev.includes(wsId) ? prev.filter((id) => id !== wsId) : [...prev, wsId]
    );
  };

  const handleSelectAllWorkspaces = () => {
    setSelectedWorkspaceIds(availableWorkspaces.map((w) => w.id));
  };

  const handleClearWorkspaces = () => {
    setSelectedWorkspaceIds([]);
  };

  const handleReset = () => {
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('producao');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setCreatedResult(null);
    setCopiedLink(false);
    setShowAllUsersList(false);
    setSelectedWorkspaceIds(workspaceId ? [workspaceId] : availableWorkspaces[0]?.id ? [availableWorkspaces[0].id] : []);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    // Normaliza login mantendo o caractere @ obrigatório
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = email.trim().toLowerCase() || cleanUsername;

    if (!cleanName) {
      setErrorMessage('Por favor, informe o nome completo do usuário.');
      return;
    }

    if (!cleanUsername) {
      setErrorMessage('Por favor, defina um nome de usuário (Login) para o acesso.');
      return;
    }

    if (!cleanUsername.includes('@')) {
      setErrorMessage(
        'O nome de usuário (login) deve conter obrigatoriamente o caractere @ (pode ser um e-mail fictício, ex: usuario@operatask.app ou seu e-mail corporativo).'
      );
      return;
    }

    if (cleanUsername.length < 5) {
      setErrorMessage('O nome de usuário deve conter pelo menos 5 caracteres (incluindo o @).');
      return;
    }

    if (selectedWorkspaceIds.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um Workspace para vincular o novo usuário (campo obrigatório).');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, defina uma senha de acesso.');
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

    if ((role === 'dono' || role === 'master') && !isMaster) {
      setErrorMessage('Apenas a conta Master tem permissão para cadastrar ou atribuir o perfil Dono.');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetWorkspaces = availableWorkspaces.filter((w) => selectedWorkspaceIds.includes(w.id));
      const firstTargetWs = targetWorkspaces[0];
      const assignedCompId = firstTargetWs?.companyId || (firstTargetWs as any)?.tenantId || activeUser?.companyId || activeUser?.tenantId || firstTargetWs?.id;

      const result = await StorageService.registerUser({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
        role,
        workspaceIds: selectedWorkspaceIds,
        workspaceId: selectedWorkspaceIds[0],
        companyId: assignedCompId,
        tenantId: assignedCompId,
      });

      setIsSubmitting(false);

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Falha ao cadastrar usuário.');
        return;
      }

      const targetWsNames = targetWorkspaces.map((w) => w.name);
      const combinedWsName = targetWsNames.join(', ') || 'Workspaces Vinculados';

      const appLink = createInviteAccessUrl({
        baseUrl: getProductionAppUrl(),
        companyId: assignedCompId,
        workspaceId: selectedWorkspaceIds[0],
        workspaceName: combinedWsName,
        login: cleanUsername || cleanEmail,
      });

      setCreatedResult({
        user: result.user,
        rawPassword: password,
        role,
        workspaceName: combinedWsName,
        workspaceNames: targetWsNames,
        accessLink: appLink,
        companyId: assignedCompId,
        workspaceId: selectedWorkspaceIds[0],
      });

      if (onUserCreated) {
        onUserCreated(result.user, role, selectedWorkspaceIds[0], selectedWorkspaceIds);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Erro inesperado ao cadastrar usuário.');
    }
  };

  const getShareText = () => {
    if (!createdResult) return '';
    const loginUser = createdResult.user.username || createdResult.user.email;
    return generateUserAccessMessage({
      name: createdResult.user.name,
      login: loginUser,
      password: createdResult.rawPassword,
      workspaceName: createdResult.workspaceName,
      role: createdResult.role,
      companyId: createdResult.companyId,
      workspaceId: createdResult.workspaceId,
      customLink: createdResult.accessLink,
    });
  };

  const handleCopyCredentials = () => {
    const textToCopy = getShareText();
    if (!textToCopy) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const textToShare = getShareText();
    if (!textToShare) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
        {/* Cabeçalho no padrão visual OperaTask */}
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
              <p className="text-xs text-slate-300">Cadastrar novo usuário com liberação imediata</p>
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Conta Ativa & 100% Liberada para Acesso Imediato</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  A conta foi criada e vinculada ao workspace <strong>{createdResult.workspaceName}</strong>. O novo membro já pode fazer login tanto no computador quanto no smartphone.
                </p>
              </div>

              {/* Caixa da Mensagem Oficial de Acesso */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>Mensagem Oficial de Acesso</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#34B1AC]">Modelo Obrigatório</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                  {getShareText()}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Login com @</span>
                    <span className="font-mono font-bold text-[#173653] dark:text-[#34B1AC]">
                      {createdResult.user.username || createdResult.user.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Perfil</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatUserProfileRole(createdResult.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação: WhatsApp & Copiar */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-98 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar Acesso no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 shadow-xs transition-all cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Mensagem de Acesso Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Mensagem de Acesso</span>
                    </>
                  )}
                </button>

                {/* Validação da Base de Dados */}
                <button
                  type="button"
                  onClick={async () => {
                    const nextState = !showAllUsersList;
                    setShowAllUsersList(nextState);
                    if (nextState) {
                      let rawUsers: User[] = [];
                      if (isServerApiAvailable()) {
                        try {
                          const resp = await fetch('/api/auth/users');
                          if (resp.ok) {
                            const json = await resp.json();
                            if (Array.isArray(json.users)) {
                              rawUsers = json.users;
                            }
                          } else if (resp.status === 404) {
                            setServerApiAvailable(false);
                          }
                        } catch {
                          setServerApiAvailable(false);
                        }
                      }
                      if (rawUsers.length === 0) {
                        rawUsers = StorageService.getUsers();
                      }
                      const currentWs = availableWorkspaces.find((w) => selectedWorkspaceIds.includes(w.id)) || availableWorkspaces[0];
                      const filteredList = StorageService.getSwitchableUsers(currentWs, activeUser, rawUsers);
                      setAllUsersList(filteredList);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>{showAllUsersList ? 'Ocultar Usuários da Base' : 'Verificar Lista de Usuários na Base'}</span>
                </button>

                {showAllUsersList && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2 max-h-48 overflow-y-auto animate-in fade-in">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <span>Usuários na Base ({allUsersList.length}):</span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Sincronizado</span>
                    </div>
                    {allUsersList.map((u) => (
                      <div key={u.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{u.name}</span>
                          <span className="text-slate-400 font-mono text-[11px] block">@{u.username || u.email.split('@')[0]}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Ativo
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
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

              {/* 1. Nome Completo do Usuário */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nome Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      // Sugere automaticamente o login com @ se ainda estiver vazio
                      if (!username && e.target.value) {
                        const firstWord = e.target.value.trim().toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
                        if (firstWord) {
                          setUsername(`${firstWord}@operatask.app`);
                        }
                      }
                    }}
                    placeholder="Ex: Carlos Silva, Maria Santos..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* 2. Nome de Usuário (Login) com @ obrigatório */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Nome de Usuário (Login) *</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 normal-case">
                      Obrigatório conter @
                    </span>
                  </span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold normal-case">
                    Definido pelo gestor
                  </span>
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Ex: usuario@operatask.app ou seu e-mail"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O login deve conter obrigatoriamente o caractere <strong>@</strong> (pode ser um e-mail fictício usado apenas para cadastro na plataforma, ex: <code>carlos@operatask.app</code>).
                </p>
              </div>

              {/* 3. E-mail de Acesso (Opcional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>E-mail Corporativo (Opcional)</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    Opcional
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`Ex: ${username ? `${username}@empresa.com` : 'carlos@empresa.com'}`}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC] focus:outline-hidden transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Se não informado, o sistema vinculará <strong>{username || 'usuario'}@operatask.app</strong>.
                </p>
              </div>

              {/* 4. Campo Obrigatório de Seleção de Workspace (Múltipla Seleção) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#34B1AC]" />
                    <span>Workspaces Vinculados *</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold normal-case">
                      ({selectedWorkspaceIds.length} selecionado{selectedWorkspaceIds.length === 1 ? '' : 's'})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllWorkspaces}
                      className="text-[11px] font-semibold text-[#34B1AC] hover:underline cursor-pointer"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={handleClearWorkspaces}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  {availableWorkspaces.map((ws) => {
                    const isSelected = selectedWorkspaceIds.includes(ws.id);
                    return (
                      <div
                        key={ws.id}
                        onClick={() => handleToggleWorkspace(ws.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#34B1AC] bg-[#34B1AC]/10 dark:bg-[#34B1AC]/15 shadow-xs'
                            : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ws.logoColor || '#34B1AC' }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                              {ws.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {ws.members?.length || 1} membro{ws.members?.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#34B1AC] border-[#34B1AC] text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  O usuário só terá acesso e visibilidade aos workspaces selecionados. Workspaces não marcados permanecerão 100% invisíveis para ele.
                </p>
              </div>

              {/* 5. Senha e Confirmação de Senha */}
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

              {/* 6. Tipo de Membro */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Tipo de Membro (Nível de Acesso) *</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleRoleOptions.map((item) => (
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
