import React, { useState } from 'react';
import { User, Workspace, Project, Task, SystemRole, WorkspaceRole } from '../types/index.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { ColorPicker } from './ColorPicker.tsx';
import {
  X,
  Crown,
  Users,
  Building,
  Folder,
  Layers,
  Database,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Edit2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Lock,
  Mail,
  Archive,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { StorageService } from '../services/storage.ts';
import { getProductionAppUrl } from '../utils/appUrl.ts';
import { isUserMaster } from '../utils/helpers.ts';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  workspaces: Workspace[];
  projects: Project[];
  tasks: Task[];
  onUpdateUsers: (users: User[]) => void;
  onUpdateWorkspaces: (workspaces: Workspace[]) => void;
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  workspaces,
  projects,
  tasks,
  onUpdateUsers,
  onUpdateWorkspaces,
  onUpdateProjects,
  onUpdateTasks,
  onSelectWorkspace,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'workspaces' | 'quadros' | 'sistema'>('usuarios');

  // Filtros de busca
  const [userSearch, setUserSearch] = useState('');
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Modais internos
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserWorkspaceIds, setNewUserWorkspaceIds] = useState<string[]>(() =>
    workspaces.length > 0 ? [workspaces[0].id] : []
  );
  const [newUserWorkspaceRole, setNewUserWorkspaceRole] = useState<WorkspaceRole>('producao');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('user');
  const [newUserAvatarColor, setNewUserAvatarColor] = useState('#34B1AC');
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    user: User;
    rawPassword: string;
    role: string;
    workspaceName: string;
    accessLink: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Exclusões com confirmação
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deleteTargetWorkspace, setDeleteTargetWorkspace] = useState<Workspace | null>(null);
  const [deleteTargetProject, setDeleteTargetProject] = useState<Project | null>(null);

  if (!isOpen) return null;

  // Filtragem de dados
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.title && u.title.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      w.slug.toLowerCase().includes(workspaceSearch.toLowerCase())
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Ações de Usuário
  const handleToggleSystemRole = (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      onShowToast({
        type: 'info',
        message: 'Você não pode alterar o nível master da sua própria conta ativa.',
      });
      return;
    }

    const nextRole: SystemRole = targetUser.systemRole === 'master' ? 'user' : 'master';
    const updatedUsers = users.map((u) => {
      if (u.id === targetUser.id) {
        return {
          ...u,
          systemRole: nextRole,
          isSuperAdmin: nextRole === 'master',
          title: nextRole === 'master' ? 'Super Administrador / Master' : u.title || 'Membro da Equipe',
        };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    StorageService.updateUserOnServer({
      id: targetUser.id,
      systemRole: nextRole,
      isSuperAdmin: nextRole === 'master',
      title: nextRole === 'master' ? 'Super Administrador / Master' : targetUser.title || 'Membro da Equipe',
    });
    onShowToast({
      type: 'success',
      message: `Usuário ${targetUser.name} agora possui nível: ${nextRole === 'master' ? 'Super Admin / Master' : 'Usuário Padrão'}.`,
    });
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newTempPassword.trim()) return;

    const newPass = newTempPassword.trim();
    const updatedUsers = users.map((u) => {
      if (u.id === passwordResetUser.id) {
        return { ...u, password: newPass };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    StorageService.updateUserOnServer({ id: passwordResetUser.id, password: newPass });
    onShowToast({
      type: 'success',
      message: `Senha de ${passwordResetUser.name} redefinida com sucesso no banco de dados!`,
    });
    setPasswordResetUser(null);
    setNewTempPassword('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUserName.trim();
    const rawUsername = (newUserUsername || newUserName).trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/^@/, '');
    const cleanEmail = (newUserEmail || (cleanUsername ? `${cleanUsername}@operatask.app` : '')).trim().toLowerCase();
    const cleanPassword = newUserPassword.trim();
    const targetWsId = newUserWorkspaceIds[0] || workspaces[0]?.id || 'ws-principal';

    if (!cleanName) {
      onShowToast({ type: 'error', message: 'Preencha o nome completo do novo usuário.' });
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      onShowToast({ type: 'error', message: 'Defina um nome de usuário (Login) com pelo menos 3 caracteres.' });
      return;
    }
    if (newUserWorkspaceIds.length === 0) {
      onShowToast({ type: 'error', message: 'Por favor, selecione pelo menos um Workspace para o novo usuário.' });
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      onShowToast({ type: 'error', message: 'Defina uma senha de acesso com pelo menos 4 caracteres.' });
      return;
    }
    if (newUserConfirmPassword && cleanPassword !== newUserConfirmPassword.trim()) {
      onShowToast({ type: 'error', message: 'A confirmação de senha não confere com a senha digitada.' });
      return;
    }

    setIsSubmittingNewUser(true);
    try {
      const result = await StorageService.registerUser({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: cleanPassword,
        role: newUserWorkspaceRole,
        workspaceIds: newUserWorkspaceIds,
        workspaceId: newUserWorkspaceIds[0],
      });

      if (!result.success || !result.user) {
        setIsSubmittingNewUser(false);
        onShowToast({ type: 'error', message: result.error || 'Falha ao cadastrar usuário no banco de dados.' });
        return;
      }

      if (newUserRole === 'master') {
        await StorageService.updateUserOnServer({
          id: result.user.id,
          systemRole: 'master',
          isSuperAdmin: true,
          title: 'Super Administrador / Master',
        });
      }

      const freshUsers = StorageService.getUsers();
      onUpdateUsers(freshUsers);

      const targetWorkspaces = workspaces.filter((w) => newUserWorkspaceIds.includes(w.id));
      const combinedWsNames = targetWorkspaces.map((w) => w.name).join(', ') || 'Workspaces Vinculados';

      setCreatedResult({
        user: result.user,
        rawPassword: cleanPassword,
        role: newUserWorkspaceRole,
        workspaceName: combinedWsNames,
        accessLink: getProductionAppUrl(),
      });

      setIsSubmittingNewUser(false);
      onShowToast({
        type: 'success',
        message: `Usuário ${result.user.name} cadastrado e ativo no banco de dados!`,
      });
    } catch (err: any) {
      setIsSubmittingNewUser(false);
      onShowToast({ type: 'error', message: err.message || 'Erro inesperado ao cadastrar usuário.' });
    }
  };

  const getShareText = () => {
    if (!createdResult) return '';
    return `*Acesso ao OperaTask*\n\nOlá, ${createdResult.user.name}! Sua conta foi criada no sistema e já está 100% liberada para acesso imediato.\n\n🔗 *Link do App:* ${createdResult.accessLink}\n👤 *Nome de Usuário (Login):* ${createdResult.user.username || createdResult.user.email}\n📧 *E-mail:* ${createdResult.user.email}\n🔑 *Senha:* ${createdResult.rawPassword}\n🏢 *Workspace:* ${createdResult.workspaceName}\n\nAcesse pelo navegador ou celular e faça login para começar!`;
  };

  const handleCopyCredentials = () => {
    const text = getShareText();
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2500);
      onShowToast({ type: 'success', message: 'Credenciais e link copiados com sucesso!' });
    }
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    if (!text) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.id === currentUser.id) {
      onShowToast({ type: 'error', message: 'A sua própria conta ativa não pode ser excluída.' });
      setDeleteTargetUser(null);
      return;
    }

    const isTargetMaster = isUserMaster(deleteTargetUser);
    if (isTargetMaster) {
      onShowToast({ type: 'error', message: 'Contas com perfil Master não podem ser excluídas.' });
      setDeleteTargetUser(null);
      return;
    }

    const isCurrentMaster = isUserMaster(currentUser);
    const isCurrentAnyOwner = workspaces.some(
      (w) => w.ownerId === currentUser.id || w.members.some((m) => m.userId === currentUser.id && (m.role === 'owner' || m.role === 'dono'))
    );
    const targetIsAdmin = workspaces.some((w) =>
      w.members.some((m) => m.userId === deleteTargetUser.id && (m.role === 'admin' || m.role === 'administrador'))
    );
    const targetIsOwner = workspaces.some(
      (w) => w.ownerId === deleteTargetUser.id || w.members.some((m) => m.userId === deleteTargetUser.id && (m.role === 'owner' || m.role === 'dono'))
    );

    // Requisito 3: Administrador NÃO pode remover outro Administrador, nem o Dono, nem Master.
    // Master e Dono podem remover o acesso de um Administrador.
    if (!isCurrentMaster && !isCurrentAnyOwner && targetIsAdmin) {
      onShowToast({
        type: 'error',
        message: 'Apenas Master ou Dono podem excluir o acesso de um Administrador da plataforma.',
      });
      setDeleteTargetUser(null);
      return;
    }

    if (!isCurrentMaster && targetIsOwner) {
      onShowToast({
        type: 'error',
        message: 'Apenas Master pode excluir a conta de um Dono de Workspace.',
      });
      setDeleteTargetUser(null);
      return;
    }

    const updatedUsers = users.filter((u) => u.id !== deleteTargetUser.id);
    onUpdateUsers(updatedUsers);
    StorageService.deleteUserOnServer(deleteTargetUser.id);
    onShowToast({
      type: 'success',
      message: `Usuário ${deleteTargetUser.name} removido com sucesso do sistema.`,
    });
    setDeleteTargetUser(null);
  };

  const handleConfirmDeleteWorkspace = () => {
    if (!deleteTargetWorkspace) return;
    if (workspaces.length <= 1) {
      onShowToast({ type: 'error', message: 'O sistema deve manter pelo menos um workspace.' });
      setDeleteTargetWorkspace(null);
      return;
    }

    const updatedWorkspaces = workspaces.filter((w) => w.id !== deleteTargetWorkspace.id);
    const updatedProjects = projects.filter((p) => p.workspaceId !== deleteTargetWorkspace.id);
    const updatedTasks = tasks.filter((t) => t.workspaceId !== deleteTargetWorkspace.id);

    onUpdateWorkspaces(updatedWorkspaces);
    onUpdateProjects(updatedProjects);
    onUpdateTasks(updatedTasks);

    onShowToast({
      type: 'success',
      message: `Workspace "${deleteTargetWorkspace.name}" e seus quadros foram excluídos pelo Master.`,
    });
    setDeleteTargetWorkspace(null);
  };

  const handleConfirmDeleteProject = () => {
    if (!deleteTargetProject) return;
    const updatedProjects = projects.filter((p) => p.id !== deleteTargetProject.id);
    const updatedTasks = tasks.filter((t) => t.projectId !== deleteTargetProject.id);

    onUpdateProjects(updatedProjects);
    onUpdateTasks(updatedTasks);
    onShowToast({
      type: 'success',
      message: `Quadro "${deleteTargetProject.name}" excluído pelo Master.`,
    });
    setDeleteTargetProject(null);
  };

  // Métricas do Sistema
  const totalCompletedTasks = tasks.filter((t) => t.isCompleted).length;
  const completionRate = tasks.length > 0 ? Math.round((totalCompletedTasks / tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho de Autoridade Máxima (Estilo Master) */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-linear-to-r from-[#173653] via-[#1a3f63] to-[#0f2438] text-white shrink-0 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Crown className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Painel Master · Super Administrador
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider shadow-xs">
                  Acesso Total
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Governança central: gerencie todos os usuários, permissões, workspaces e configurações globais
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar Painel Master"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação do Painel Master */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'usuarios'
                ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Usuários ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workspaces')}
            className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'workspaces'
                ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Todos os Workspaces ({workspaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quadros')}
            className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quadros'
                ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Quadros Globais ({projects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sistema')}
            className={`flex items-center gap-2 py-3.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sistema'
                ? 'border-[#34B1AC] text-[#173653] dark:text-[#34B1AC]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Métricas & Governança</span>
          </button>
        </div>

        {/* Conteúdo Dinâmico */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ================= ABA 1: USUÁRIOS ================= */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuários por nome, e-mail ou cargo..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Usuário</span>
                </button>
              </div>

              {/* Tabela de Usuários */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/60 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Cargo / Função</th>
                        <th className="px-4 py-3">Nível de Sistema</th>
                        <th className="px-4 py-3 text-right">Ações Master</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {filteredUsers.map((u) => {
                        const isMaster = u.systemRole === 'master' || u.isSuperAdmin || u.email.toLowerCase() === 'alanvitordasilva@gmail.com.br';
                        const isSelf = u.id === currentUser.id;

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 flex items-center gap-2.5">
                              <UserAvatar user={u} size="sm" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                                  {u.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                                    (Você · Sessão Ativa)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {u.email}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {u.title || 'Membro'}
                            </td>
                            <td className="px-4 py-3">
                              {isMaster ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  Master / Super Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Usuário Padrão
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Alternar Papel Master */}
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSystemRole(u)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                      isMaster
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/60'
                                    }`}
                                    title={isMaster ? 'Rebaixar para Usuário Padrão' : 'Promover para Super Admin / Master'}
                                  >
                                    {isMaster ? 'Tornar Usuário' : 'Promover a Master'}
                                  </button>
                                )}

                                {/* Redefinir Senha */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordResetUser(u);
                                    setNewTempPassword('');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Redefinir Senha de Acesso"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                {/* Excluir Usuário */}
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTargetUser(u)}
                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Excluir Usuário do Sistema"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 2: WORKSPACES ================= */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={workspaceSearch}
                    onChange={(e) => setWorkspaceSearch(e.target.value)}
                    placeholder="Filtrar workspaces por nome ou slug..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkspaces.map((ws) => {
                  const wsProjects = projects.filter((p) => p.workspaceId === ws.id);
                  const wsTasks = tasks.filter((t) => t.workspaceId === ws.id);
                  const owner = users.find((u) => u.id === ws.ownerId);

                  return (
                    <div
                      key={ws.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-xs hover:border-[#34B1AC]/60 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: ws.logoColor }}
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {ws.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Slug: {ws.slug} · Dono: {owner?.name || 'Administrador'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectWorkspace(ws.id);
                            onShowToast({
                              type: 'success',
                              message: `Alternado para o workspace "${ws.name}" com privilégios Master!`,
                            });
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#234d74] transition-colors cursor-pointer shrink-0"
                          title="Entrar neste workspace"
                        >
                          <span>Acessar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-center">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Membros</span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {ws.members.length}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Quadros</span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {wsProjects.length}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Cards Totais</span>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {wsTasks.length}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTargetWorkspace(ws)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Workspace</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ABA 3: QUADROS & PROJETOS ================= */}
          {activeTab === 'quadros' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filtrar quadros da plataforma..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/60 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Quadro / Projeto</th>
                      <th className="px-4 py-3">Workspace</th>
                      <th className="px-4 py-3">Colunas</th>
                      <th className="px-4 py-3">Cards</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredProjects.map((p) => {
                      const ws = workspaces.find((w) => w.id === p.workspaceId);
                      const pTasks = tasks.filter((t) => t.projectId === p.id);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-md" style={{ backgroundColor: p.color }} />
                            <span>{p.name}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {ws?.name || p.workspaceId}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {p.columns.length} colunas
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">
                            {pTasks.length} cards
                          </td>
                          <td className="px-4 py-3">
                            {p.isArchived ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Arquivado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteTargetProject(p)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Excluir Quadro Definitivamente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= ABA 4: MÉTRICAS & GOVERNANÇA ================= */}
          {activeTab === 'sistema' && (
            <div className="space-y-6">
              {/* Visão Analítica Global */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium block">Total de Usuários</span>
                  <span className="text-2xl font-black text-[#173653] dark:text-[#34B1AC] mt-1 block">
                    {users.length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium block">Total de Workspaces</span>
                  <span className="text-2xl font-black text-[#173653] dark:text-[#34B1AC] mt-1 block">
                    {workspaces.length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium block">Quadros Cadastrados</span>
                  <span className="text-2xl font-black text-[#173653] dark:text-[#34B1AC] mt-1 block">
                    {projects.length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium block">Cards / Entregas</span>
                  <span className="text-2xl font-black text-[#173653] dark:text-[#34B1AC] mt-1 block">
                    {tasks.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    {completionRate}% concluídos
                  </span>
                </div>
              </div>

              {/* Status do Banco de Dados e Armazenamento */}
              <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#173653] dark:text-[#34B1AC]">
                  <Database className="w-4 h-4" />
                  <span>Camada de Armazenamento e Integridade</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  O sistema OperaTask está operando em modo multi-tier com persistência primária via <strong>IndexedDB</strong> e espelhamento em <strong>LocalStorage</strong>, garantindo tolerância a falhas e capacidade de sincronização em nuvem (Supabase).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>IndexedDB Ativo (operatask_persistence_v2)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Controle RBAC Master Habilitado</span>
                  </div>
                </div>
              </div>

              {/* Informações da Conta Master Conectada */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Credenciais da Conta Master Ativa</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div>Titular: <strong>{currentUser.name}</strong></div>
                  <div>E-mail de autenticação: <strong>{currentUser.email}</strong></div>
                  <div>Poderes: <strong>Acesso total e irrestrito (bypass de todas as restrições)</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Interno: Redefinir Senha de Usuário */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#34B1AC]" />
                Redefinir Senha
              </h3>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Defina a nova senha para o usuário <strong>{passwordResetUser.name}</strong> ({passwordResetUser.email}):
            </p>
            <form onSubmit={handleSaveResetPassword} className="space-y-3">
              <input
                type="text"
                required
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                placeholder="Digite a nova senha (mín. 6 dígitos)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#173653] hover:bg-[#234d74]"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Interno: Cadastrar Novo Usuário pelo Master */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#34B1AC]" />
                {createdResult ? 'Usuário Cadastrado com Sucesso!' : 'Cadastrar Novo Usuário (Acesso Remoto)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewUserModalOpen(false);
                  setCreatedResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Conta ativa no banco de dados central!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      O usuário já pode fazer login imediatamente de qualquer smartphone, celular ou computador com os dados abaixo.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Link Oficial de Produção</span>
                    <a
                      href={createdResult.accessLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-teal-600 dark:text-teal-400 break-all flex items-center gap-1 hover:underline"
                    >
                      {createdResult.accessLink}
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Nome de Usuário (Login)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{createdResult.user.username || createdResult.user.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Senha</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{createdResult.rawPassword}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Workspace Vinculado</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{createdResult.workspaceName}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#173653] hover:bg-[#1f476d] text-white transition-all shadow-xs cursor-pointer"
                  >
                    {copiedCredentials ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCredentials ? 'Copiado!' : 'Copiar Dados de Acesso'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedResult(null);
                      setNewUserName('');
                      setNewUserUsername('');
                      setNewUserEmail('');
                      setNewUserPassword('');
                      setNewUserConfirmPassword('');
                    }}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    + Cadastrar Outro Usuário
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewUserModalOpen(false);
                      setCreatedResult(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => {
                      setNewUserName(e.target.value);
                      if (!newUserUsername) {
                        const sug = e.target.value.toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
                        setNewUserUsername(sug);
                      }
                    }}
                    placeholder="Ex: Carlos Silva"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Nome de Usuário (Login) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="Ex: carlos.silva"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="carlos@empresa.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Senha de Acesso *</label>
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mín. 4 caracteres"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Confirmar Senha *</label>
                    <input
                      type="text"
                      required
                      value={newUserConfirmPassword}
                      onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>
                </div>

                {/* Seleção de Workspaces com Múltipla Escolha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-200">
                      Workspaces Vinculados * ({newUserWorkspaceIds.length} selecionado{newUserWorkspaceIds.length === 1 ? '' : 's'})
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewUserWorkspaceIds(workspaces.map((w) => w.id))}
                        className="text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setNewUserWorkspaceIds([])}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    {workspaces.map((w) => {
                      const isChecked = newUserWorkspaceIds.includes(w.id);
                      return (
                        <div
                          key={w.id}
                          onClick={() => {
                            setNewUserWorkspaceIds((prev) =>
                              prev.includes(w.id) ? prev.filter((id) => id !== w.id) : [...prev, w.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'border-[#34B1AC] bg-[#34B1AC]/10 dark:bg-[#34B1AC]/15'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: w.logoColor || '#34B1AC' }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {w.name}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-[#34B1AC] border-[#34B1AC] text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Tipo de Membro</label>
                    <select
                      value={newUserWorkspaceRole}
                      onChange={(e) => setNewUserWorkspaceRole(e.target.value as WorkspaceRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    >
                      <option value="producao">Produção</option>
                      <option value="membro">Membro</option>
                      <option value="administrador">Administrador</option>
                      <option value="visualizador">Visualizador</option>
                      <option value="dono">Dono</option>
                      <option value="master">Master (Super Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Cargo / Função</label>
                    <input
                      type="text"
                      value={newUserTitle}
                      onChange={(e) => setNewUserTitle(e.target.value)}
                      placeholder="Ex: Operador / Designer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nível de Sistema</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as SystemRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                  >
                    <option value="user">Usuário Padrão</option>
                    <option value="master">Super Administrador / Master</option>
                  </select>
                </div>

                <div>
                  <ColorPicker
                    label="Cor de Destaque do Avatar"
                    description="Exibida no perfil e nos cards"
                    value={newUserAvatarColor}
                    onChange={(newColor) => setNewUserAvatarColor(newColor)}
                    size="sm"
                    showPaletteStrip={true}
                    quickPaletteCount={5}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewUser}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSubmittingNewUser ? 'Salvando no Banco...' : 'Cadastrar e Ativar Usuário'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão de Usuário */}
      {deleteTargetUser && (
        <ConfirmDeleteModal
          isOpen={!!deleteTargetUser}
          onClose={() => setDeleteTargetUser(null)}
          onConfirm={handleConfirmDeleteUser}
          title="Excluir Usuário do Sistema?"
          itemName={deleteTargetUser.name}
          itemType="este usuário"
          message={`Tem certeza que deseja excluir permanentemente o usuário "${deleteTargetUser.name}" (${deleteTargetUser.email})? Esta ação removerá o acesso desta conta em todos os workspaces.`}
          confirmButtonText="Excluir Usuário"
        />
      )}

      {/* Confirmação de Exclusão de Workspace */}
      {deleteTargetWorkspace && (
        <ConfirmDeleteModal
          isOpen={!!deleteTargetWorkspace}
          onClose={() => setDeleteTargetWorkspace(null)}
          onConfirm={handleConfirmDeleteWorkspace}
          title="Excluir Workspace Inteiro?"
          itemName={deleteTargetWorkspace.name}
          itemType="este workspace"
          message={`Tem certeza que deseja excluir o workspace "${deleteTargetWorkspace.name}"? Todos os quadros, colunas e cards associados serão excluídos permanentemente.`}
          confirmButtonText="Excluir Workspace"
        />
      )}

      {/* Confirmação de Exclusão de Projeto */}
      {deleteTargetProject && (
        <ConfirmDeleteModal
          isOpen={!!deleteTargetProject}
          onClose={() => setDeleteTargetProject(null)}
          onConfirm={handleConfirmDeleteProject}
          title="Excluir Quadro Definitivamente?"
          itemName={deleteTargetProject.name}
          itemType="este quadro"
          message={`Tem certeza que deseja excluir o quadro "${deleteTargetProject.name}"? Todos os cards desta lista serão excluídos.`}
          confirmButtonText="Excluir Quadro"
        />
      )}
    </div>
  );
};
