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
} from 'lucide-react';

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
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('user');
  const [newUserAvatarColor, setNewUserAvatarColor] = useState('#34B1AC');

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
    onShowToast({
      type: 'success',
      message: `Usuário ${targetUser.name} agora possui nível: ${nextRole === 'master' ? 'Super Admin / Master' : 'Usuário Padrão'}.`,
    });
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newTempPassword.trim()) return;

    const updatedUsers = users.map((u) => {
      if (u.id === passwordResetUser.id) {
        return { ...u, password: newTempPassword.trim() };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    onShowToast({
      type: 'success',
      message: `Senha de ${passwordResetUser.name} redefinida com sucesso!`,
    });
    setPasswordResetUser(null);
    setNewTempPassword('');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      onShowToast({ type: 'error', message: 'Preencha o nome e e-mail do novo usuário.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      onShowToast({ type: 'error', message: 'Insira um formato de e-mail válido.' });
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase())) {
      onShowToast({ type: 'error', message: 'Já existe um usuário cadastrado com este e-mail.' });
      return;
    }

    const created: User = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      title: newUserTitle.trim() || (newUserRole === 'master' ? 'Super Administrador' : 'Membro'),
      avatarColor: newUserAvatarColor || (newUserRole === 'master' ? '#173653' : '#34B1AC'),
      systemRole: newUserRole,
      isSuperAdmin: newUserRole === 'master',
      createdAt: new Date().toISOString(),
    };

    onUpdateUsers([...users, created]);
    onShowToast({
      type: 'success',
      message: `Usuário ${created.name} cadastrado com sucesso!`,
    });

    setIsNewUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserTitle('');
    setNewUserRole('user');
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteTargetUser) return;
    if (deleteTargetUser.id === currentUser.id) {
      onShowToast({ type: 'error', message: 'A conta master atual não pode ser excluída.' });
      setDeleteTargetUser(null);
      return;
    }

    const updatedUsers = users.filter((u) => u.id !== deleteTargetUser.id);
    onUpdateUsers(updatedUsers);
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#34B1AC]" />
                Cadastrar Novo Usuário
              </h3>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  placeholder="Ex: Engenheiro de Software"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99]"
                >
                  Criar Usuário
                </button>
              </div>
            </form>
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
