import React, { useState, useRef, useMemo } from 'react';
import {
  Workspace,
  Project,
  User,
  ViewMode,
  Task,
  WorkspaceRole,
} from '../types/index.ts';
import {
  Kanban,
  List,
  CheckSquare,
  BarChart3,
  Activity,
  Plus,
  Moon,
  Sun,
  Download,
  Upload,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronRight,
  Building,
  Users,
  Shield,
  Edit2,
  X,
  UserCheck,
  Archive,
  Trash2,
  Database,
  LogOut,
  User as UserIcon,
  Crown,
  UserPlus,
  CreditCard,
} from 'lucide-react';
import { ProjectIcon } from './ProjectIcon.tsx';
import { getInitials, ROLE_CONFIG, isUserMaster, canAccessDashboard } from '../utils/helpers.ts';
import { PWAInstallPrompt } from './PWAInstallPrompt.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { UserAvatar } from './UserAvatar.tsx';

interface SidebarProps {
  onLogout?: () => void;
  onOpenUserProfile?: () => void;
  onOpenMasterPanel?: () => void;
  onOpenRegisterUserModal?: () => void;
  onOpenBillingPlans?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  onSelectWorkspace: (workspaceId: string) => void;
  onOpenCreateWorkspaceModal: () => void;
  onOpenWorkspaceSettingsModal: () => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  activeView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  myTasksCount: number;
  taskCountsByProject: Record<string, { pending: number; total: number }>;
  archivedTasks: Task[];
  onRestoreTask: (taskId: string, targetColumnId?: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  onSelectArchivedTask?: (task: Task) => void;
  currentUser: User;
  allUsers: User[];
  onSelectCurrentUser: (user: User) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewProjectModal: () => void;
  onEditProject: (project: Project) => void;
  onExportBackup: () => void;
  onImportBackup: (fileContent: string) => void;
  onResetData: () => void;
  onOpenSyncSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenCreateWorkspaceModal,
  onOpenWorkspaceSettingsModal,
  projects,
  selectedProjectId,
  onSelectProject,
  activeView,
  onChangeView,
  myTasksCount,
  taskCountsByProject,
  archivedTasks,
  onRestoreTask,
  onPermanentDeleteTask,
  onSelectArchivedTask,
  currentUser,
  allUsers,
  onSelectCurrentUser,
  theme,
  onToggleTheme,
  onOpenNewProjectModal,
  onEditProject,
  onExportBackup,
  onImportBackup,
  onResetData,
  onOpenSyncSettings,
  onLogout,
  onOpenUserProfile,
  onOpenMasterPanel,
  onOpenRegisterUserModal,
  onOpenBillingPlans,
}) => {
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const isMaster = isUserMaster(currentUser);
  const [expandedArchivedProjects, setExpandedArchivedProjects] = useState<Record<string, boolean>>({});
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificação de papel (role) e permissões no workspace atual
  const currentMember = currentWorkspace?.members?.find((m) => m.userId === currentUser.id);
  const userRole: WorkspaceRole =
    currentMember?.role || (currentWorkspace?.ownerId === currentUser.id ? 'owner' : 'member');
  const roleInfo = ROLE_CONFIG[userRole] || ROLE_CONFIG.member;

  // Lógica de verificação de permissão estrita:
  // Apenas usuários com a role 'owner' ou 'admin' no workspace atual podem visualizar a seção de itens arquivados
  const canViewArchived = Boolean(userRole === 'owner' || userRole === 'admin');

  // Lista de usuários estritamente filtrada para troca rápida de sessão no workspace/empresa ativo
  const switchableUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // 1. Oculta contas globais/Master se o usuário atual for um cliente comum
      if (!isMaster) {
        if (
          isUserMaster(u) ||
          u.systemRole === 'master' ||
          u.isSuperAdmin ||
          u.email?.toLowerCase().includes('alanvitordasilva') ||
          u.username?.toLowerCase() === 'alan'
        ) {
          return false;
        }
      }

      // 2. Deve pertencer ao workspace ativo ou à empresa/tenant ativa
      const isMember = currentWorkspace?.members?.some((member) => member.userId === u.id);
      const isOwner = currentWorkspace?.ownerId === u.id;
      const wsCompanyId = currentWorkspace?.companyId || (currentWorkspace as any)?.tenantId;
      const isSameCompany = Boolean(
        wsCompanyId && (u.companyId === wsCompanyId || u.tenantId === wsCompanyId)
      );

      if (isMaster && isUserMaster(u)) return true;

      return Boolean(isMember || isOwner || isSameCompany);
    });
  }, [allUsers, currentWorkspace, isMaster]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onImportBackup(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Cabeçalho da Aplicação com Ícone Oficial */}
        <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center p-0.5 overflow-hidden shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="OperaTask"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                Opera<span className="text-[#34B1AC]">Task</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Gestão de Projetos</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg shrink-0"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Workspace no topo */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-1 min-w-0 text-left"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: currentWorkspace.logoColor }}
              >
                {getInitials(currentWorkspace.name)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">
                  {currentWorkspace.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {currentWorkspace.members.length} membros · {roleInfo.label}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dropdown de Workspaces */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Meus Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors text-left ${
                    ws.id === currentWorkspace.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ws.logoColor }}
                  />
                  <span className="truncate flex-1">{ws.name}</span>
                </button>
              ))}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    onOpenCreateWorkspaceModal();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Novo Workspace
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    onOpenWorkspaceSettingsModal();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Users className="w-3.5 h-3.5" />
                  Gerenciar Membros & Permissões
                </button>

                {(isMaster || userRole === 'owner' || userRole === 'admin') && onOpenRegisterUserModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      onOpenRegisterUserModal();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-[#173653] dark:text-[#34B1AC] bg-[#34B1AC]/10 hover:bg-[#34B1AC]/20 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#34B1AC]" />
                    Cadastrar Novo Usuário
                  </button>
                )}

                {(isMaster || userRole === 'owner' || userRole === 'admin') && onOpenBillingPlans && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceDropdownOpen(false);
                      onOpenBillingPlans();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-[#34B1AC]" />
                      <span>Planos & Cobrança</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#34B1AC]/15 text-[#34B1AC] font-bold">
                      Stripe
                    </span>
                  </button>
                )}

                {isMaster && onOpenMasterPanel && (
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        onOpenMasterPanel();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Painel Master (Macro)</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black uppercase">
                        Super Admin
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navegação Principal */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          {/* Seção de Vistas Globais */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Visões do Workspace
            </div>

            {/* Minhas Tarefas */}
            <button
              type="button"
              onClick={() => {
                onChangeView('my_tasks');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeView === 'my_tasks'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Minhas Tarefas</span>
              </div>
              {myTasksCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {myTasksCount}
                </span>
              )}
            </button>

            {/* Kanban */}
            <button
              type="button"
              onClick={() => {
                onChangeView('kanban');
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeView === 'kanban'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Kanban className="w-4 h-4 text-indigo-500" />
              <span>Quadros</span>
            </button>

            {/* Lista */}
            <button
              type="button"
              onClick={() => {
                onChangeView('list');
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeView === 'list'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4 text-emerald-500" />
              <span>Visualização em Lista</span>
            </button>

            {/* Dashboard da Equipe (visível apenas para Dono e Administrador) */}
            {canAccessDashboard(userRole, isMaster) && (
              <button
                type="button"
                onClick={() => {
                  onChangeView('dashboard');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <span>Dashboard da Equipe</span>
              </button>
            )}

            {/* Feed de Atividades */}
            <button
              type="button"
              onClick={() => {
                onChangeView('activity_feed');
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeView === 'activity_feed'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-500" />
              <span>Feed de Atividades</span>
            </button>
          </div>

          {/* Projetos do Workspace */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Projetos ({projects.length})
              </span>
              <button
                type="button"
                onClick={onOpenNewProjectModal}
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Criar novo projeto"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Nenhum quadro criado ainda.</p>
                <button
                  type="button"
                  onClick={onOpenNewProjectModal}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Criar Quadro</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {projects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                const stats = taskCountsByProject[proj.id] || { pending: 0, total: 0 };
                const projectArchivedTasks = archivedTasks.filter((t) => t.projectId === proj.id);
                const isArchivedExpanded = !!expandedArchivedProjects[proj.id];

                return (
                  <div key={proj.id} className="space-y-0.5">
                    {/* Item do Projeto Ativo */}
                    <div
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          if (activeView !== 'kanban' && activeView !== 'list') {
                            onChangeView('kanban');
                          }
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">
                          {stats.pending}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(proj);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-opacity"
                          title="Configurar projeto e colunas"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Seção de Arquivados do Projeto - Visível APENAS para Dono (Owner) e Administrador */}
                    {canViewArchived && (
                      <div className="ml-3 pl-2.5 border-l border-slate-200 dark:border-slate-800 space-y-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedArchivedProjects((prev) => ({
                              ...prev,
                              [proj.id]: !prev[proj.id],
                            }));
                          }}
                          className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors group/arch select-none"
                          title={`${isArchivedExpanded ? 'Recolher' : 'Expandir'} arquivados de ${proj.name}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Archive className="w-3 h-3 text-slate-400 group-hover/arch:text-amber-500 transition-colors shrink-0" />
                            <span className="font-normal truncate">
                              Arquivados
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              ({projectArchivedTasks.length})
                            </span>
                          </div>

                          <div className="p-0.5 text-slate-400">
                            {isArchivedExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </div>
                        </button>

                        {/* Itens arquivados do projeto quando expandido */}
                        {isArchivedExpanded && (
                          <div className="space-y-1 pl-1 pt-0.5">
                            {projectArchivedTasks.length === 0 ? (
                              <div className="px-2 py-1.5 text-[10px] text-slate-400 italic">
                                Nenhum card arquivado
                              </div>
                            ) : (
                              projectArchivedTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="group/item flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => onSelectArchivedTask?.(task)}
                                    className="min-w-0 flex-1 text-left"
                                    title={`Visualizar "${task.title}"`}
                                  >
                                    <p className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 truncate hover:text-blue-600 dark:hover:text-blue-400">
                                      {task.title}
                                    </p>
                                    <p className="text-[9px] font-medium text-zinc-600 dark:text-zinc-300 truncate">
                                      {task.archivedAt
                                        ? new Date(task.archivedAt).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Arquivado'}
                                    </p>
                                  </button>

                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRestoreTask(task.id, task.columnId);
                                      }}
                                      className="p-1 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-750 rounded transition-colors"
                                      title="Restaurar para o quadro"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmTask(task);
                                      }}
                                      className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-750 rounded transition-colors"
                                      title="Excluir permanentemente"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Rodapé: Troca Rápida de Usuário & Configurações */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 relative">
          {/* Alternador de Usuário (Simulação de Colaboração em Equipe) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group relative"
            >
              <div className="relative">
                <UserAvatar user={currentUser} size="md" />
                {isMaster && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow-xs">
                    <Crown className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {currentUser.name}
                  </span>
                  {isMaster && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm bg-amber-400 text-slate-950 uppercase shrink-0">
                      Master
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {isMaster ? 'Super Admin · Acesso Total' : (currentUser.title || `Papel: ${roleInfo.label}`)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            </button>

            {/* Menu Popup para alternar entre membros da equipe */}
            {isUserSwitcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 space-y-1">
                {/* Opção Exclusiva: Painel Master para Super Administradores */}
                {isMaster && onOpenMasterPanel && (
                  <div className="pb-1 border-b border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        onOpenMasterPanel();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-extrabold text-amber-900 dark:text-amber-200 bg-linear-to-r from-amber-500/20 via-amber-400/20 to-teal-500/20 hover:from-amber-500/30 hover:to-teal-500/30 border border-amber-400/50 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Painel Master (Super Admin)</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black uppercase">
                        Master
                      </span>
                    </button>
                  </div>
                )}

                {/* Opção de Acessar Minha Conta / Perfil */}
                {onOpenUserProfile && (
                  <div className="pb-1 mb-1 border-b border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        onOpenUserProfile();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-[#173653] dark:text-[#34B1AC] bg-blue-50/70 dark:bg-slate-700/60 hover:bg-blue-100/70 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Minha Conta (Perfil & Senha)</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  <span>Alternar Usuário Ativo</span>
                  <span className="text-[9px] font-semibold text-slate-400">
                    {switchableUsers.length} {switchableUsers.length === 1 ? 'membro' : 'membros'}
                  </span>
                </div>
                {switchableUsers.length === 0 ? (
                  <div className="p-2.5 my-1 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    Nenhum outro usuário disponível
                  </div>
                ) : (
                  switchableUsers.map((u) => {
                    const m = currentWorkspace?.members?.find((member) => member.userId === u.id);
                    const isUMaster = isUserMaster(u);
                    const role: WorkspaceRole =
                      m?.role || (currentWorkspace?.ownerId === u.id ? 'owner' : 'member');
                    const rInfo = ROLE_CONFIG[role] || ROLE_CONFIG.member;

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectCurrentUser(u);
                          setIsUserSwitcherOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left ${
                          u.id === currentUser.id
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar user={u} size="xs" />
                          <span className="truncate">{u.name}</span>
                          {isUMaster && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {isUMaster ? 'Super Admin' : rInfo.label}
                        </span>
                      </button>
                    );
                  })
                )}

                {onLogout && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Atalho para Instalação PWA */}
          <div className="pt-2">
            <PWAInstallPrompt variant="button" className="w-full justify-center py-2" />
          </div>

          {/* Ferramentas de Tema e Backup */}
          <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-500">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px]">Tema Escuro</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1">
              {onOpenSyncSettings && (
                <button
                  type="button"
                  onClick={onOpenSyncSettings}
                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                  title="Configurações de Banco de Dados & Supabase"
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onExportBackup}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                title="Exportar backup completo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                title="Importar backup"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                title="Restaurar dados padrão"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Confirmação Padronizado para Tarefas Arquivadas */}
        {deleteConfirmTask && (
          <ConfirmDeleteModal
            isOpen={!!deleteConfirmTask}
            onClose={() => setDeleteConfirmTask(null)}
            onConfirm={() => {
              onPermanentDeleteTask(deleteConfirmTask.id);
              setDeleteConfirmTask(null);
            }}
            title="Excluir permanentemente este card?"
            itemName={deleteConfirmTask.title}
            itemType="este card"
            message={`Tem certeza que deseja excluir permanentemente o card arquivado "${deleteConfirmTask.title}"? Esta ação não pode ser desfeita.`}
            confirmButtonText="Excluir Definitivamente"
          />
        )}

        {/* Modal de Confirmação para Reset de Demonstração */}
        {isResetConfirmOpen && (
          <ConfirmDeleteModal
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            onConfirm={() => {
              onResetData();
              setIsResetConfirmOpen(false);
            }}
            title="Restaurar dados de demonstração?"
            itemType="os dados atuais"
            message="Tem certeza que deseja redefinir os dados para o padrão de demonstração? Todas as alterações não exportadas serão perdidas."
            confirmButtonText="Restaurar Dados"
          />
        )}
      </aside>
    </>
  );
};
