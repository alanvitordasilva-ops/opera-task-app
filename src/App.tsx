import React, { useState, useEffect, useMemo } from 'react';
import {
  Task,
  Project,
  Tag,
  User,
  Workspace,
  WorkspaceRole,
  ViewMode,
  DateFilter,
  Priority,
  WorkspaceActivity,
  Notification,
  ClientCompany,
  SupportModeState,
} from './types/index.ts';
import { StorageService } from './services/storage.ts';
import { SupabaseService } from './services/supabaseService.ts';
import { RealtimeService } from './services/realtimeService.ts';
import {
  isTaskOverdue,
  isTaskDueToday,
  isTaskDueSoon,
  formatDueDatePTBR,
  isUserMaster,
  ROLE_CONFIG,
  canAccessDashboard,
  canModifyCompletedTask,
  isTaskInDoneColumn,
  canRegisterUser,
} from './utils/helpers.ts';
import { SplashScreen } from './components/SplashScreen.tsx';
import { RegisterUserModal } from './components/RegisterUserModal.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { KanbanView } from './components/KanbanView.tsx';
import { ListView } from './components/ListView.tsx';
import { MyTasksView } from './components/MyTasksView.tsx';
import { TeamDashboardView } from './components/TeamDashboardView.tsx';
import { ActivityFeedView } from './components/ActivityFeedView.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { ProjectModal } from './components/ProjectModal.tsx';
import { WorkspaceModal } from './components/WorkspaceModal.tsx';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal.tsx';
import { NotificationPopover } from './components/NotificationPopover.tsx';
import { PWAInstallPrompt } from './components/PWAInstallPrompt.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { SyncSettingsModal } from './components/SyncSettingsModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { WelcomeEmptyState } from './components/WelcomeEmptyState.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { MasterAdminModal } from './components/MasterAdminModal.tsx';
import { BillingPlansModal } from './components/BillingPlansModal.tsx';
import { AlertTriangle, X, CheckCircle2, Info, Headphones, LogOut, ShieldAlert, CreditCard, Sparkles } from 'lucide-react';

export default function App() {
  // Estado Persistido
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => StorageService.getCurrentUser());
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => StorageService.getWorkspaces());
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(() =>
    StorageService.getCurrentWorkspace()
  );
  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [tags, setTags] = useState<Tag[]>(() => StorageService.getTags());
  const [activities, setActivities] = useState<WorkspaceActivity[]>(() =>
    StorageService.getActivities()
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    StorageService.getNotifications()
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => StorageService.getTheme());
  const [clients, setClients] = useState<ClientCompany[]>(() => StorageService.getClients());
  const [supportMode, setSupportMode] = useState<SupportModeState | null>(() => StorageService.getSupportMode());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = StorageService.getViewMode() as ViewMode;
    return ['kanban', 'list', 'my_tasks', 'dashboard', 'activity_feed'].includes(saved)
      ? saved
      : 'kanban';
  });

  // Tela de Carregamento (Splash Screen) ao acessar o link do app
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Estado de Autenticação na Tela de Login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    StorageService.isAuthenticated()
  );

  const handleLoginSuccess = (user: User) => {
    // 1. Atualiza lista de usuários com dados mais recentes do armazenamento
    const freshUsers = StorageService.getUsers();
    let currentUsersList = freshUsers;
    if (!currentUsersList.some((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())) {
      currentUsersList = [...freshUsers, user];
      StorageService.saveUsers(currentUsersList, true);
    }
    setUsers(currentUsersList);
    setCurrentUser(user);
    StorageService.setCurrentUserId(user.id);

    // 2. Garante acesso imediato aos workspaces aos quais o usuário foi vinculado ou da sua empresa
    const freshWorkspaces = StorageService.getWorkspaces();
    const isMasterUser = isUserMaster(user);
    const userCompany = user.companyId || user.tenantId;

    let allowedWorkspaces = isMasterUser
      ? freshWorkspaces
      : freshWorkspaces.filter(
          (w) =>
            w.ownerId === user.id ||
            (Array.isArray(w.members) && w.members.some((m) => m.userId === user.id)) ||
            (userCompany && (w.companyId === userCompany || (w as any).tenantId === userCompany || w.id === userCompany))
        );

    // Fallback de segurança: se o filtro estrito não encontrar mas existirem workspaces de clientes, usa-os
    if (allowedWorkspaces.length === 0 && freshWorkspaces.length > 0) {
      const nonMatriz = freshWorkspaces.filter((w) => w.id !== 'ws-principal');
      allowedWorkspaces = nonMatriz.length > 0 ? nonMatriz : freshWorkspaces;
    }

    if (allowedWorkspaces.length > 0) {
      setWorkspaces(freshWorkspaces);
      setCurrentWorkspace(allowedWorkspaces[0]);
      StorageService.setCurrentWorkspaceId(allowedWorkspaces[0].id);
      StorageService.ensureWorkspaceProject(allowedWorkspaces[0].id, allowedWorkspaces[0].name);
    } else {
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name: user.name ? `Workspace de ${user.name.split(' ')[0]}` : 'Meu Workspace',
        slug: 'meu-workspace',
        description: 'Espaço de trabalho corporativo',
        logoColor: '#173653',
        ownerId: user.id,
        companyId: userCompany,
        members: [{ userId: user.id, role: 'owner', joinedAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      };
      const updatedAll = [...freshWorkspaces, newWs];
      setWorkspaces(updatedAll);
      setCurrentWorkspace(newWs);
      StorageService.saveWorkspaces(updatedAll, true);
      StorageService.setCurrentWorkspaceId(newWs.id);
      StorageService.ensureWorkspaceProject(newWs.id, newWs.name);
    }

    StorageService.setAuthenticated(true);
    setIsAuthenticated(true);

    // Carregar projetos e tarefas da nuvem do Supabase para o Workspace ativo
    if (SupabaseService.isConfigured()) {
      const activeWs = allowedWorkspaces[0] || freshWorkspaces[0];
      if (activeWs) {
        StorageService.fetchProjectsCloud(activeWs.id).then((pRes) => {
          if (pRes.success && Array.isArray(pRes.projects) && pRes.projects.length > 0) {
            setProjects(StorageService.getProjects());
          }
        });
        StorageService.fetchTasksCloud(activeWs.id).then((res) => {
          if (res.success && Array.isArray(res.tasks)) {
            setTasks(StorageService.getTasks());
          }
        });
      }
    }

    showToast({
      type: 'success',
      message: `Bem-vindo(a) ao OperaTask, ${user.name}! Acesso liberado.`,
    });
  };

  const handleLogout = () => {
    StorageService.setAuthenticated(false);
    setIsAuthenticated(false);
  };

  const handleLoadSampleBoard = () => {
    const { project, tasks: sampleTasks } = StorageService.loadSampleBoard(
      currentWorkspace.id,
      currentUser.id
    );
    setProjects((prev) => [...prev, project]);
    setTasks((prev) => [...prev, ...sampleTasks]);
    setSelectedProjectId(project.id);
    setViewMode('kanban');
    showToast({
      type: 'success',
      message: 'Quadro demonstrativo criado com sucesso! Explore os cards e as colunas.',
    });
  };

  // Navegação e Filtros
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem('operatask_nav_project_id') || 'all';
    } catch {
      return 'all';
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | 'all'>('all');

  // Persistir projeto ativo na navegação
  useEffect(() => {
    try {
      if (selectedProjectId) {
        localStorage.setItem('operatask_nav_project_id', selectedProjectId);
      }
    } catch {}
  }, [selectedProjectId]);

  // Modais
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<string | undefined>(undefined);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);
  const [isBillingPlansOpen, setIsBillingPlansOpen] = useState(false);
  const [isDismissedBillingWarning, setIsDismissedBillingWarning] = useState(false);

  const handleUpdateUser = (updatedUser: User) => {
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    StorageService.saveUsers(updatedUsers);
    StorageService.setCurrentUserId(updatedUser.id);
  };

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDismissedAlert, setIsDismissedAlert] = useState(false);

  // Feedback Visual (Toasts)
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'info' | 'error';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const showToast = (params: {
    type: 'success' | 'info' | 'error';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => {
    const id = `toast-${Date.now()}`;
    setToast({ ...params, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  // Efeito do Tema
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  // Sincronização autoritativa inicial com o banco de dados remoto (Supabase / Servidor)
  useEffect(() => {
    const fetchLatestServerState = async () => {
      // 1. Se o Supabase estiver configurado, busca Workspaces, Projetos e Tarefas da nuvem de forma assíncrona
      if (SupabaseService.isConfigured()) {
        try {
          const cloudWs = await StorageService.fetchWorkspacesCloud();
          if (cloudWs.success && cloudWs.workspaces.length > 0) {
            setWorkspaces(cloudWs.workspaces);
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar workspaces do Supabase:', e);
        }

        try {
          const cloudProj = await StorageService.fetchProjectsCloud(currentWorkspace.id);
          if (cloudProj.success && cloudProj.projects.length > 0) {
            setProjects(cloudProj.projects);
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar projetos do Supabase:', e);
        }

        try {
          const cloudRes = await StorageService.fetchTasksCloud(currentWorkspace.id);
          if (cloudRes.success && cloudRes.tasks.length > 0) {
            setTasks(cloudRes.tasks);
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar tarefas do Supabase:', e);
        }
      }

      await StorageService.syncWithServer();
      const freshUsers = StorageService.getUsers();
      const freshWorkspaces = StorageService.getWorkspaces();
      const freshProjects = StorageService.getProjects();
      const freshTasks = StorageService.getTasks();
      const freshTags = StorageService.getTags();

      setUsers(freshUsers);
      setWorkspaces(freshWorkspaces);
      setProjects(freshProjects);
      if (!SupabaseService.isConfigured()) {
        setTasks(freshTasks);
      }
      setTags(freshTags);

      const current = freshUsers.find((u) => u.id === currentUser.id);
      if (current) {
        setCurrentUser((prev) => (JSON.stringify(prev) === JSON.stringify(current) ? prev : current));
      }
      const isMast = isUserMaster(current || currentUser);
      const userCompany = (current || currentUser).companyId || (current || currentUser).tenantId;

      let allowedWs = isMast
        ? freshWorkspaces
        : freshWorkspaces.filter(
            (w) =>
              w.ownerId === (current?.id || currentUser.id) ||
              (Array.isArray(w.members) && w.members.some((m) => m.userId === (current?.id || currentUser.id))) ||
              (userCompany && (w.companyId === userCompany || (w as any).tenantId === userCompany || w.id === userCompany))
          );

      if (allowedWs.length === 0 && freshWorkspaces.length > 0) {
        const nonMatriz = freshWorkspaces.filter((w) => w.id !== 'ws-principal');
        allowedWs = nonMatriz.length > 0 ? nonMatriz : freshWorkspaces;
      }

      const curWs = allowedWs.find((w) => w.id === currentWorkspace.id) || allowedWs[0] || freshWorkspaces[0];
      if (curWs) {
        setCurrentWorkspace((prev) => (JSON.stringify(prev) === JSON.stringify(curWs) ? prev : curWs));
        StorageService.ensureWorkspaceProject(curWs.id, curWs.name);
      }
    };
    fetchLatestServerState();
  }, []);

  // Recarregar projetos e tarefas da nuvem do Supabase ao trocar de Workspace
  useEffect(() => {
    if (currentWorkspace?.id) {
      StorageService.ensureWorkspaceProject(currentWorkspace.id, currentWorkspace.name);
      if (SupabaseService.isConfigured()) {
        StorageService.fetchProjectsCloud(currentWorkspace.id).then((res) => {
          if (res.success && Array.isArray(res.projects) && res.projects.length > 0) {
            setProjects(res.projects);
          }
        });
        StorageService.fetchTasksCloud(currentWorkspace.id).then((res) => {
          if (res.success && Array.isArray(res.tasks)) {
            setTasks(res.tasks);
          }
        });
      }
    }
  }, [currentWorkspace?.id]);

  // Detecção de retorno do Stripe Checkout (?checkout_success=true ou ?checkout_canceled=true)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout_success') === 'true') {
        const planParam = params.get('plan') || 'plano';
        showToast({
          type: 'success',
          message: `Assinatura confirmada com sucesso! O plano ${planParam.toUpperCase()} foi ativado para sua empresa.`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('checkout_canceled') === 'true') {
        showToast({
          type: 'info',
          message: 'Processo de assinatura cancelado. Sua conta permanece inalterada.',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, []);

  // Auto-save de estado
  useEffect(() => {
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.setCurrentUserId(currentUser.id);
  }, [currentUser.id]);

  useEffect(() => {
    StorageService.saveWorkspaces(workspaces);
  }, [workspaces]);

  useEffect(() => {
    StorageService.setCurrentWorkspaceId(currentWorkspace.id);
  }, [currentWorkspace.id]);

  useEffect(() => {
    StorageService.saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    StorageService.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    StorageService.saveTags(tags);
  }, [tags]);

  useEffect(() => {
    StorageService.saveActivities(activities);
  }, [activities]);

  useEffect(() => {
    StorageService.saveNotifications(notifications);
  }, [notifications]);

  // Sincronização em Tempo Real (WebSockets + BroadcastChannel + Supabase)
  useEffect(() => {
    RealtimeService.init();

    // Sincronização de Tarefas (Cards)
    const unsubTasks = RealtimeService.subscribe('tasks', (incomingTasks: Task[], meta) => {
      if (Array.isArray(incomingTasks)) {
        setTasks((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(incomingTasks)) return prev;
          return incomingTasks;
        });
        setTaskToEdit((currentOpen) => {
          if (!currentOpen) return null;
          const fresh = incomingTasks.find((t) => t.id === currentOpen.id);
          return fresh || currentOpen;
        });
      }
    });

    // Sincronização de Projetos e Colunas
    const unsubProjects = RealtimeService.subscribe('projects', (incomingProjects: Project[]) => {
      if (Array.isArray(incomingProjects)) {
        setProjects((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(incomingProjects)) return prev;
          return incomingProjects;
        });
      }
    });

    // Sincronização de Workspaces e Membros
    const unsubWorkspaces = RealtimeService.subscribe('workspaces', (incomingWorkspaces: Workspace[]) => {
      if (Array.isArray(incomingWorkspaces)) {
        setWorkspaces((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(incomingWorkspaces)) return prev;
          return incomingWorkspaces;
        });
        setCurrentWorkspace((prev) => {
          const updatedCurrent = incomingWorkspaces.find((w) => w.id === prev.id);
          if (updatedCurrent && JSON.stringify(prev) !== JSON.stringify(updatedCurrent)) {
            return updatedCurrent;
          }
          return prev;
        });
      }
    });

    // Sincronização de Usuários e Permissões
    const unsubUsers = RealtimeService.subscribe('users', (incomingUsers: User[]) => {
      if (Array.isArray(incomingUsers)) {
        setUsers((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(incomingUsers)) return prev;
          return incomingUsers;
        });
        setCurrentUser((prev) => {
          const updatedSelf = incomingUsers.find((u) => u.id === prev.id);
          if (updatedSelf && JSON.stringify(prev) !== JSON.stringify(updatedSelf)) {
            return updatedSelf;
          }
          return prev;
        });
      }
    });

    // Sincronização de Clientes & Empresas
    const unsubClients = RealtimeService.subscribe('clients', (incomingClients: ClientCompany[]) => {
      if (Array.isArray(incomingClients)) {
        setClients(incomingClients);
      }
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubWorkspaces();
      unsubUsers();
      unsubClients();
    };
  }, []);

  // Manter card aberto após recarregar a página (F5)
  useEffect(() => {
    try {
      if (isTaskModalOpen && taskToEdit?.id) {
        sessionStorage.setItem('operatask_nav_open_task_id', taskToEdit.id);
      } else if (!isTaskModalOpen) {
        sessionStorage.removeItem('operatask_nav_open_task_id');
      }
    } catch {}
  }, [isTaskModalOpen, taskToEdit]);

  // Restaurar card aberto após F5 ou reabertura do app
  useEffect(() => {
    try {
      const savedTaskId = sessionStorage.getItem('operatask_nav_open_task_id');
      if (savedTaskId && tasks.length > 0 && !isTaskModalOpen) {
        const found = tasks.find((t) => t.id === savedTaskId);
        if (found) {
          setTaskToEdit(found);
          setIsTaskModalOpen(true);
        }
      }
    } catch {}
  }, [tasks]);

  // Membros do workspace atual com isolamento estrito multi-tenant
  const workspaceMembers = useMemo(() => {
    return StorageService.getSwitchableUsers(currentWorkspace, currentUser, users);
  }, [currentWorkspace, currentUser, users]);

  // Lista estrita de usuários disponíveis para alternância rápida no menu lateral
  const switchableUsers = useMemo(() => {
    return StorageService.getSwitchableUsers(currentWorkspace, currentUser, users);
  }, [currentWorkspace, currentUser, users]);

  // Papel do usuário atual no workspace ativo
  const currentUserRole: WorkspaceRole = useMemo(() => {
    if (isUserMaster(currentUser)) return 'owner';
    const member = currentWorkspace.members.find((m) => m.userId === currentUser.id);
    return member?.role || (currentWorkspace.ownerId === currentUser.id ? 'owner' : 'member');
  }, [currentWorkspace, currentUser]);

  // Projetos do workspace atual com garantia de persistência e fallback ativo anti-vazio
  const workspaceProjects = useMemo(() => {
    if (!currentWorkspace?.id) return [];
    const list = projects.filter((p) => p.workspaceId === currentWorkspace.id && !p.isArchived);

    // Se o workspace não possuir quadros cadastrados, provê imediatamente o Quadro Principal ativo
    if (list.length === 0) {
      const fallbackProject: Project = {
        id: `proj-${currentWorkspace.id}-principal`,
        workspaceId: currentWorkspace.id,
        name: 'Quadro Principal',
        description: `Quadro de tarefas e fluxo operacional do espaço ${currentWorkspace.name || 'Workspace'}`,
        color: '#2563eb',
        icon: 'folder',
        columns: [
          { id: `col-${currentWorkspace.id}-backlog`, title: 'Backlog', color: '#64748b', order: 0 },
          { id: `col-${currentWorkspace.id}-progress`, title: 'Em Andamento', color: '#2563eb', order: 1 },
          { id: `col-${currentWorkspace.id}-review`, title: 'Revisão / QA', color: '#d97706', order: 2 },
          { id: `col-${currentWorkspace.id}-done`, title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
        ],
        memberIds: Array.isArray(currentWorkspace.members) ? currentWorkspace.members.map((m) => m.userId) : [currentWorkspace.ownerId],
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      return [fallbackProject];
    }
    return list;
  }, [projects, currentWorkspace]);

  // Tarefas ativas do workspace atual (exclui arquivados)
  const workspaceTasks = useMemo(() => {
    return tasks.filter((t) => t.workspaceId === currentWorkspace.id && !t.isArchived);
  }, [tasks, currentWorkspace]);

  // Tarefas arquivadas do workspace atual
  const archivedWorkspaceTasks = useMemo(() => {
    return tasks.filter((t) => t.workspaceId === currentWorkspace.id && !!t.isArchived);
  }, [tasks, currentWorkspace]);

  // Projeto ativo para o quadro Kanban
  const activeProject = useMemo(() => {
    if (selectedProjectId !== 'all') {
      const found = workspaceProjects.find((p) => p.id === selectedProjectId);
      if (found) return found;
    }
    return workspaceProjects[0] || null;
  }, [selectedProjectId, workspaceProjects]);

  // Permissão do Dashboard da Equipe: Apenas Administrador e Dono (ocultar completamente para outros papéis)
  const isMaster = isUserMaster(currentUser);

  // Visibilidade estrita de Workspaces:
  // - Master enxerga e acessa todos os workspaces do sistema.
  // - Demais usuários enxergam e acessam os workspaces de sua própria empresa ou aos quais foram vinculados.
  const userVisibleWorkspaces = useMemo(() => {
    if (isMaster) return workspaces;
    const userCompany = currentUser.companyId || currentUser.tenantId;

    const filtered = workspaces.filter((w) => {
      // 1. É o proprietário do workspace
      if (w.ownerId === currentUser.id) return true;
      // 2. É membro registrado na lista de membros
      if (Array.isArray(w.members) && w.members.some((m) => m.userId === currentUser.id)) return true;
      // 3. Vínculo por Empresa / Tenant
      const wsCompany = w.companyId || (w as any).tenantId;
      if (userCompany && wsCompany && (userCompany === wsCompany || userCompany === w.id)) return true;
      if (userCompany && w.id === userCompany) return true;
      return false;
    });

    // Fallback de segurança: nunca deixa o usuário sem nenhum workspace na interface
    if (filtered.length === 0 && workspaces.length > 0) {
      const nonMatriz = workspaces.filter((w) => w.id !== 'ws-principal');
      return nonMatriz.length > 0 ? nonMatriz : workspaces;
    }

    return filtered;
  }, [workspaces, currentUser, isMaster]);

  const userVisibleWorkspaceIds = useMemo(() => {
    return userVisibleWorkspaces.map((w) => w.id).join(',');
  }, [userVisibleWorkspaces]);

  // Redireciona caso o workspace atual não esteja mais na lista visível
  useEffect(() => {
    if (userVisibleWorkspaces.length > 0 && !userVisibleWorkspaces.some((w) => w.id === currentWorkspace.id)) {
      const fallback = userVisibleWorkspaces[0];
      setCurrentWorkspace(fallback);
      StorageService.setCurrentWorkspaceId(fallback.id);
    }
  }, [userVisibleWorkspaceIds, currentWorkspace.id]);

  // Tenant / Empresa do Usuário e Workspace Atual (Isolamento Multi-tenant)
  const currentTenant = useMemo(() => {
    return StorageService.getCurrentTenant(currentUser, currentWorkspace?.id);
  }, [currentUser, currentWorkspace?.id, clients]);

  // Verificação de Empresa Suspensa ou Fatura em Atraso para Usuários Não-Master
  const isCurrentWorkspaceSuspended = useMemo(() => {
    if (isMaster) return false;
    if (currentWorkspace.clientStatus === 'suspended') return true;
    if (currentTenant?.status === 'suspended') return true;
    return false;
  }, [isMaster, currentWorkspace.clientStatus, currentTenant?.status]);

  const isCurrentTenantPastDue = useMemo(() => {
    if (isMaster) return false;
    return currentTenant?.paymentStatus === 'past_due' || currentWorkspace.paymentStatus === 'past_due';
  }, [isMaster, currentTenant?.paymentStatus, currentWorkspace.paymentStatus]);

  const canViewDashboard = canAccessDashboard(currentUserRole, isMaster);

  // Redireciona automaticamente se estiver no Dashboard sem permissão
  useEffect(() => {
    if (viewMode === 'dashboard' && !canViewDashboard) {
      setViewMode('kanban');
      StorageService.saveViewMode('kanban');
    }
  }, [viewMode, canViewDashboard]);

  // Alternador de visualização com verificação rigorosa de permissões
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'dashboard' && !canViewDashboard) {
      showToast({
        type: 'error',
        message: 'Acesso restrito: Apenas Administradores e o Dono podem visualizar o Dashboard.',
      });
      return;
    }
    setViewMode(mode);
    StorageService.saveViewMode(mode);
  };

  // Alternador de tema
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Contadores por projeto
  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, { pending: number; total: number }> = {};
    workspaceProjects.forEach((p) => {
      const pTasks = workspaceTasks.filter((t) => t.projectId === p.id);
      counts[p.id] = {
        pending: pTasks.filter((t) => !t.isCompleted).length,
        total: pTasks.length,
      };
    });
    return counts;
  }, [workspaceProjects, workspaceTasks]);

  // Minhas tarefas pendentes count
  const myTasksCount = useMemo(() => {
    return workspaceTasks.filter(
      (t) => t.assigneeIds && t.assigneeIds.includes(currentUser.id) && !t.isCompleted
    ).length;
  }, [workspaceTasks, currentUser]);

  // Tarefas filtradas para exibição em Kanban ou Lista
  const filteredTasks = useMemo(() => {
    return workspaceTasks.filter((task) => {
      // Filtro de projeto (se selecionado explicitamente)
      if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) {
        return false;
      }

      // Se estiver no Kanban, foca no projeto ativo se não houver filtro 'all'
      if (viewMode === 'kanban' && activeProject && task.projectId !== activeProject.id) {
        return false;
      }

      // Filtro de responsável
      if (assigneeFilter !== 'all') {
        if (!task.assigneeIds || !task.assigneeIds.includes(assigneeFilter)) {
          return false;
        }
      }

      // Filtro de prioridade
      if (priorityFilter !== 'all') {
        const taskPriority = task.priority || 'none';
        if (taskPriority !== priorityFilter) {
          return false;
        }
      }

      // Filtro de tag
      if (selectedTagId !== 'all') {
        const hasTag = task.tags?.some((t) => t.id === selectedTagId);
        if (!hasTag) return false;
      }

      // Busca de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesTags = task.tags?.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [
    workspaceTasks,
    selectedProjectId,
    viewMode,
    activeProject,
    assigneeFilter,
    priorityFilter,
    selectedTagId,
    searchQuery,
  ]);

  // Título e subtítulo do cabeçalho
  const headerDetails = useMemo(() => {
    if (viewMode === 'my_tasks') {
      return {
        title: 'Minhas Tarefas Atribuídas',
        subtitle: `${myTasksCount} tarefas pendentes atribuídas a você`,
      };
    }
    if (viewMode === 'dashboard') {
      return {
        title: 'Dashboard de Produtividade',
        subtitle: `${workspaceMembers.length} membros na equipe · ${workspaceProjects.length} projetos`,
      };
    }
    if (viewMode === 'activity_feed') {
      return {
        title: 'Atividades Recentes',
        subtitle: 'Histórico cronológico e colaborativo da equipe',
      };
    }

    if (activeProject) {
      const pTasks = workspaceTasks.filter((t) => t.projectId === activeProject.id);
      const pending = pTasks.filter((t) => !t.isCompleted).length;
      const done = pTasks.filter((t) => t.isCompleted).length;
      return {
        title: activeProject.name,
        subtitle: `${pending} pendentes · ${done} concluídas · ${activeProject.columns.length} colunas`,
      };
    }

    return {
      title: currentWorkspace.name,
      subtitle: `${workspaceTasks.length} cards no workspace`,
    };
  }, [viewMode, myTasksCount, workspaceMembers, workspaceProjects, activeProject, workspaceTasks, currentWorkspace]);

  // Auditoria e Atividade Helper
  const recordActivity = (action: string, taskTitle?: string, projectId?: string, taskId?: string) => {
    const newAct: WorkspaceActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      workspaceId: currentWorkspace.id,
      projectId,
      taskId,
      taskTitle,
      userId: currentUser.id,
      action,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 99)]);
  };

  // Notificações Helper
  const sendNotification = (
    recipientId: string,
    type: 'assigned' | 'mention' | 'overdue' | 'status_change',
    title: string,
    message: string,
    taskId?: string,
    projectId?: string
  ) => {
    if (recipientId === currentUser.id) return; // Não notifica a si mesmo
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: recipientId,
      actorId: currentUser.id,
      type,
      title,
      message,
      taskId,
      projectId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Ações de Tarefa (Conectadas Assincronamente à Nuvem do Supabase)
  const handleSaveTask = (taskData: Partial<Task> & { id?: string }) => {
    const projId = taskData.projectId || activeProject?.id || workspaceProjects[0]?.id || 'proj-1';
    const targetProject = projects.find((p) => p.id === projId);
    const colId = taskData.columnId || targetProject?.columns[0]?.id || 'col-1';
    const isCompleted = targetProject?.columns.find((c) => c.id === colId)?.isCompletedColumn || false;

    if (taskData.id) {
      // Edição de tarefa existente (U do CRUD Supabase)
      const existingTask = tasks.find((t) => t.id === taskData.id);
      if (existingTask) {
        const wasDone = isTaskInDoneColumn(existingTask, targetProject?.columns);
        if (wasDone && taskData.columnId && taskData.columnId !== existingTask.columnId) {
          if (!canModifyCompletedTask(currentUserRole, isMaster)) {
            showToast({
              type: 'error',
              message: 'Você não tem permissão para alterar cards concluídos.',
            });
            return;
          }
        }
      }

      const updatedFields: Partial<Task> = {
        ...taskData,
        columnId: colId,
        isCompleted,
        completedAt: isCompleted && !existingTask?.isCompleted ? new Date().toISOString() : existingTask?.completedAt,
        updatedAt: new Date().toISOString(),
      };

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskData.id) return t;

          // Detectar novos responsáveis para notificação
          if (taskData.assigneeIds) {
            taskData.assigneeIds.forEach((uid) => {
              if (!t.assigneeIds.includes(uid)) {
                sendNotification(
                  uid,
                  'assigned',
                  'Nova tarefa atribuída a você',
                  `${currentUser.name} atribuiu você à tarefa "${taskData.title || t.title}"`,
                  t.id,
                  projId
                );
              }
            });
          }

          return {
            ...t,
            ...updatedFields,
          };
        })
      );

      // Persistência assíncrona na nuvem do Supabase
      StorageService.updateTaskAsync(taskData.id, updatedFields);
      recordActivity('atualizou os detalhes da tarefa', taskData.title, projId, taskData.id);
    } else {
      // Criação de nova tarefa (C do CRUD Supabase)
      const newTaskId = `task-${Date.now()}`;
      const newTask: Task = {
        id: newTaskId,
        workspaceId: currentWorkspace.id,
        projectId: projId,
        columnId: colId,
        title: taskData.title || 'Nova Tarefa',
        description: taskData.description || '',
        priority: taskData.priority && taskData.priority !== 'none' ? taskData.priority : 'none',
        assigneeIds: taskData.assigneeIds || [currentUser.id],
        dueDate: taskData.dueDate || '',
        tags: taskData.tags || [],
        checklist: taskData.checklist || [],
        comments: [],
        activities: [
          {
            id: `act-init-${Date.now()}`,
            userId: currentUser.id,
            action: `criou a tarefa no projeto ${targetProject?.name || 'Geral'}`,
            timestamp: new Date().toISOString(),
          },
        ],
        attachments: taskData.attachments || [],
        isCompleted,
        order: workspaceTasks.filter((t) => t.columnId === colId).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTasks((prev) => [newTask, ...prev]);

      // Criação assíncrona na nuvem do Supabase
      StorageService.createTaskAsync(newTask);
      recordActivity('criou a nova tarefa', newTask.title, projId, newTaskId);

      // Notificar membros atribuídos
      if (newTask.assigneeIds) {
        const dueInfo = newTask.dueDate ? formatDueDatePTBR(newTask.dueDate) : null;
        const dueText = dueInfo ? ` (Vence: ${dueInfo.fullText})` : '';
        newTask.assigneeIds.forEach((uid) => {
          sendNotification(
            uid,
            'assigned',
            'Nova tarefa atribuída a você',
            `${currentUser.name} atribuiu você à tarefa "${newTask.title}"${dueText}`,
            newTaskId,
            projId
          );
        });
      }
    }
  };

  const handleUpdateTaskColumn = (taskId: string, targetColumnId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.columnId === targetColumnId) return;

    const project = projects.find((p) => p.id === targetTask.projectId);
    const wasCompleted = isTaskInDoneColumn(targetTask, project?.columns);

    if (wasCompleted && !canModifyCompletedTask(currentUserRole, isMaster)) {
      showToast({
        type: 'error',
        message: 'Você não tem permissão para alterar cards concluídos.',
      });
      return;
    }

    const targetCol = project?.columns.find((c) => c.id === targetColumnId);
    const isCompleted = targetCol?.isCompletedColumn || false;
    const completedAt = isCompleted && !targetTask.isCompleted ? new Date().toISOString() : targetTask.completedAt;

    const updatedActivities = [
      {
        id: `act-${Date.now()}`,
        userId: currentUser.id,
        action: `moveu para "${targetCol?.title || 'outra coluna'}"`,
        timestamp: new Date().toISOString(),
      },
      ...(targetTask.activities || []),
    ];

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          columnId: targetColumnId,
          isCompleted,
          completedAt,
          activities: updatedActivities,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Atualização assíncrona na nuvem do Supabase
    StorageService.updateTaskAsync(taskId, {
      columnId: targetColumnId,
      isCompleted,
      completedAt,
      activities: updatedActivities,
    });

    recordActivity(`moveu a tarefa para "${targetCol?.title}"`, targetTask.title, targetTask.projectId, targetTask.id);
  };

  const handleReorderTasks = (
    updates: { id: string; columnId: string; order: number }[],
    meta?: { taskId: string; targetColumnId: string; prevColumnId: string }
  ) => {
    if (meta && meta.targetColumnId !== meta.prevColumnId) {
      const task = tasks.find((t) => t.id === meta.taskId);
      const project = projects.find((p) => p.id === task?.projectId);
      const prevCol = project?.columns.find((c) => c.id === meta.prevColumnId);
      const wasInDoneCol =
        task?.isCompleted ||
        prevCol?.isCompletedColumn ||
        prevCol?.title.toLowerCase().includes('conclu');

      if (wasInDoneCol && !canModifyCompletedTask(currentUserRole, isMaster)) {
        showToast({
          type: 'error',
          message: 'Você não tem permissão para alterar cards concluídos.',
        });
        return;
      }
    }

    setTasks((prev) => {
      const updateMap = new Map(updates.map((u) => [u.id, u]));

      return prev.map((t) => {
        const u = updateMap.get(t.id);
        if (!u) return t;

        let isCompleted = t.isCompleted;
        let completedAt = t.completedAt;
        let activities = t.activities;

        if (u.columnId !== t.columnId) {
          const project = projects.find((p) => p.id === t.projectId);
          const targetCol = project?.columns.find((c) => c.id === u.columnId);
          isCompleted = targetCol?.isCompletedColumn || false;
          completedAt = isCompleted && !t.isCompleted ? new Date().toISOString() : t.completedAt;
          activities = [
            {
              id: `act-${Date.now()}`,
              userId: currentUser.id,
              action: `moveu para "${targetCol?.title || 'outra coluna'}"`,
              timestamp: new Date().toISOString(),
            },
            ...(t.activities || []),
          ];
        }

        return {
          ...t,
          columnId: u.columnId,
          order: u.order,
          isCompleted,
          completedAt,
          activities,
          updatedAt: new Date().toISOString(),
        };
      });
    });

    // Atualização assíncrona de reordenações no Supabase
    updates.forEach((u) => {
      StorageService.updateTaskAsync(u.id, {
        columnId: u.columnId,
        order: u.order,
      });
    });

    if (meta && meta.targetColumnId !== meta.prevColumnId) {
      const task = tasks.find((t) => t.id === meta.taskId);
      const project = projects.find((p) => p.id === task?.projectId);
      const targetCol = project?.columns.find((c) => c.id === meta.targetColumnId);
      if (task && targetCol) {
        recordActivity(`moveu a tarefa para "${targetCol.title}"`, task.title, task.projectId, task.id);
      }
    } else if (meta) {
      const task = tasks.find((t) => t.id === meta.taskId);
      if (task) {
        recordActivity(`reordenou a tarefa no quadro`, task.title, task.projectId, task.id);
      }
    }
  };

  const handleToggleTaskComplete = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const project = projects.find((p) => p.id === targetTask.projectId);
    const isCurrentlyDone = isTaskInDoneColumn(targetTask, project?.columns);

    if (isCurrentlyDone && !canModifyCompletedTask(currentUserRole, isMaster)) {
      showToast({
        type: 'error',
        message: 'Você não tem permissão para alterar cards concluídos.',
      });
      return;
    }

    const nextDone = !targetTask.isCompleted;
    // Encontra coluna de conclusão ou primeira coluna
    const completedCol = project?.columns.find((c) => c.isCompletedColumn) || project?.columns[project.columns.length - 1];
    const initialCol = project?.columns[0];
    const nextColId = nextDone ? completedCol?.id || targetTask.columnId : initialCol?.id || targetTask.columnId;
    const completedAt = nextDone ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          isCompleted: nextDone,
          columnId: nextColId,
          completedAt,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Atualização assíncrona no Supabase
    StorageService.updateTaskAsync(taskId, {
      isCompleted: nextDone,
      columnId: nextColId,
      completedAt,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    const project = projects.find((p) => p.id === taskToDelete.projectId);
    const isDone = isTaskInDoneColumn(taskToDelete, project?.columns);

    if (isDone && !canModifyCompletedTask(currentUserRole, isMaster)) {
      showToast({
        type: 'error',
        message: 'Você não tem permissão para excluir cards concluídos.',
      });
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // Exclusão assíncrona na nuvem do Supabase (D do CRUD)
    StorageService.deleteTaskAsync(taskId);
    recordActivity('excluiu a tarefa', taskToDelete.title, taskToDelete.projectId);
    showToast({
      type: 'info',
      message: `Tarefa "${taskToDelete.title}" excluída.`,
    });
  };

  const handleDuplicateTask = (originalTask: Task) => {
    const newTaskId = `task-${Date.now()}`;
    const targetProject = projects.find((p) => p.id === originalTask.projectId);

    // Duplicar checklist com novos IDs
    const duplicatedChecklist = (originalTask.checklist || []).map((item, idx) => ({
      ...item,
      id: `check-${Date.now()}-${idx}`,
    }));

    // Duplicar anexos
    const duplicatedAttachments = originalTask.attachments
      ? originalTask.attachments.map((att, idx) => ({
          ...att,
          id: `att-${Date.now()}-${idx}`,
          uploadedAt: new Date().toISOString(),
        }))
      : [];

    // Colocar ordem logo após a original
    const nextOrder = (typeof originalTask.order === 'number' ? originalTask.order : 0) + 1;

    const newTask: Task = {
      ...originalTask,
      id: newTaskId,
      title: `${originalTask.title} (cópia)`,
      checklist: duplicatedChecklist,
      attachments: duplicatedAttachments,
      comments: [], // Não copiar comentários
      activities: [
        {
          id: `act-init-${Date.now()}`,
          userId: currentUser.id,
          action: `duplicou esta tarefa a partir de "${originalTask.title}"`,
          timestamp: new Date().toISOString(),
        },
      ], // Não copiar histórico
      isArchived: false,
      archivedAt: undefined,
      order: nextOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);

    // Criação assíncrona na nuvem do Supabase
    StorageService.createTaskAsync(newTask);
    recordActivity('duplicou a tarefa', newTask.title, originalTask.projectId, newTaskId);

    showToast({
      type: 'success',
      message: `Card "${newTask.title}" duplicado na coluna!`,
      actionLabel: 'Editar cópia',
      onAction: () => {
        setTaskToEdit(newTask);
        setIsTaskModalOpen(true);
      },
    });
  };

  const handleArchiveTask = (taskId: string) => {
    const taskToArchive = tasks.find((t) => t.id === taskId);
    if (!taskToArchive) return;

    const project = projects.find((p) => p.id === taskToArchive.projectId);
    const isDone = isTaskInDoneColumn(taskToArchive, project?.columns);

    if (isDone && !canModifyCompletedTask(currentUserRole, isMaster)) {
      showToast({
        type: 'error',
        message: 'Você não tem permissão para arquivar cards concluídos.',
      });
      return;
    }

    const archivedAt = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isArchived: true,
              archivedAt,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    // Atualização assíncrona no Supabase
    StorageService.updateTaskAsync(taskId, {
      isArchived: true,
      archivedAt,
    });

    recordActivity('arquivou o card', taskToArchive.title, taskToArchive.projectId, taskToArchive.id);

    showToast({
      type: 'info',
      message: `Card "${taskToArchive.title}" arquivado.`,
      actionLabel: 'Desfazer',
      onAction: () => handleRestoreTask(taskId),
    });
  };

  const handleRestoreTask = (taskId: string, targetColumnId?: string) => {
    const taskToRestore = tasks.find((t) => t.id === taskId);
    if (!taskToRestore) return;

    const nextColumnId = targetColumnId || taskToRestore.columnId;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          isArchived: false,
          archivedAt: undefined,
          columnId: nextColumnId,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Atualização assíncrona no Supabase
    StorageService.updateTaskAsync(taskId, {
      isArchived: false,
      archivedAt: undefined,
      columnId: nextColumnId,
    });

    recordActivity('restaurou o card para o quadro', taskToRestore.title, taskToRestore.projectId, taskToRestore.id);

    showToast({
      type: 'success',
      message: `Card "${taskToRestore.title}" restaurado para o quadro!`,
    });
  };

  const handlePermanentDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // Exclusão assíncrona no Supabase
    StorageService.deleteTaskAsync(taskId);

    if (taskToDelete) {
      recordActivity('excluiu permanentemente o card', taskToDelete.title, taskToDelete.projectId);
    }
    showToast({
      type: 'info',
      message: 'Card excluído permanentemente.',
    });
  };

  // Comentários & Menções
  const handleAddComment = (taskId: string, commentText: string, mentionedUserIds: string[]) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    recordActivity('comentou na tarefa', task.title, task.projectId, task.id);

    // Notificar cada usuário mencionado
    mentionedUserIds.forEach((uid) => {
      sendNotification(
        uid,
        'mention',
        'Você foi mencionado em um comentário',
        `${currentUser.name} mencionou você na tarefa "${task.title}": "${commentText.slice(0, 50)}..."`,
        task.id,
        task.projectId
      );
    });
  };

  // Gestão de Workspaces
  const handleSelectWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      StorageService.setCurrentWorkspaceId(ws.id);
      setSelectedProjectId('all');
    }
  };

  // Modo Suporte para Super Admin (Acesso ao Workspace do Cliente com isolamento total)
  const handleEnterSupportMode = (client: ClientCompany) => {
    const modeState: SupportModeState = {
      isActive: true,
      clientName: client.name,
      clientId: client.id,
      workspaceId: client.primaryWorkspaceId,
      enteredAt: new Date().toISOString(),
    };
    setSupportMode(modeState);
    StorageService.setSupportMode(modeState);
    handleSelectWorkspace(client.primaryWorkspaceId);
    setIsMasterModalOpen(false);
    showToast({
      type: 'info',
      message: `Modo Suporte ativado para a empresa "${client.name}". Visualizando workspace do cliente.`,
    });
  };

  const handleExitSupportMode = () => {
    setSupportMode(null);
    StorageService.clearSupportMode();
    const defaultWs = workspaces.find((w) => w.id === 'ws-principal') || workspaces[0];
    if (defaultWs) {
      handleSelectWorkspace(defaultWs.id);
    }
    setIsMasterModalOpen(true);
    showToast({
      type: 'success',
      message: 'Modo Suporte encerrado. Retornado ao Painel Master.',
    });
  };

  const handleCreateWorkspace = async (name: string, description: string, color: string) => {
    try {
      const newWs: Workspace = {
        id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        logoColor: color || '#173653',
        ownerId: currentUser.id,
        members: [{ userId: currentUser.id, role: 'owner' as const, joinedAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      };

      // 1. Salva imediatamente no banco de dados Supabase e no cache local
      await StorageService.createWorkspaceAsync(newWs);

      // 2. Atualiza estado da aplicação e seleciona o workspace criado
      setWorkspaces((prev) => {
        const exists = prev.some((w) => w.id === newWs.id);
        return exists ? prev.map((w) => (w.id === newWs.id ? newWs : w)) : [...prev, newWs];
      });
      setCurrentWorkspace(newWs);
      StorageService.setCurrentWorkspaceId(newWs.id);
      setSelectedProjectId('all');

      recordActivity(`criou o workspace "${newWs.name}"`);

      showToast({
        type: 'success',
        message: `Workspace "${newWs.name}" criado com sucesso!`,
      });
    } catch (err: any) {
      console.error('[OperaTask] Erro ao criar workspace:', err);
      showToast({
        type: 'error',
        message: err.message || 'Falha ao salvar workspace no banco de dados.',
      });
      throw err;
    }
  };

  const handleSaveWorkspace = (data: Partial<Workspace>) => {
    const updatedWs = { ...currentWorkspace, ...data };
    const all = workspaces.map((w) => (w.id === currentWorkspace.id ? updatedWs : w));
    setWorkspaces(all);
    setCurrentWorkspace(updatedWs);
    StorageService.saveWorkspaces(all, true);
    if (SupabaseService.isConfigured()) {
      SupabaseService.createWorkspace(updatedWs).catch((err) => {
        console.warn('[OperaTask] Erro ao sincronizar workspace com Supabase:', err);
      });
    }
    recordActivity('atualizou as configurações do workspace');
  };

  const handleInviteMember = async (email: string, role: WorkspaceRole) => {
    // Procura se usuário já existe com esse e-mail ou cria um novo perfil no banco remoto
    let targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const companyId = currentWorkspace.companyId || (currentWorkspace as any).tenantId || currentWorkspace.id;

    if (!targetUser) {
      const namePart = email.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const usernamePart = namePart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      const reg = await StorageService.registerUser({
        name: formattedName,
        username: usernamePart || `user.${Date.now()}`,
        email,
        password: '123',
        role,
        workspaceId: currentWorkspace.id,
        companyId: companyId,
        tenantId: companyId,
      });
      if (reg.user) {
        targetUser = reg.user;
        setUsers(StorageService.getUsers());
      }
    }

    if (!targetUser) return;

    // Adiciona ao workspace se ainda não estiver
    const isAlreadyMember = currentWorkspace.members.some((m) => m.userId === targetUser!.id);
    if (!isAlreadyMember) {
      const updatedMembers = [
        ...currentWorkspace.members,
        { userId: targetUser.id, role, joinedAt: new Date().toISOString() },
      ];
      handleSaveWorkspace({ members: updatedMembers });
      if (SupabaseService.isConfigured()) {
        SupabaseService.upsertWorkspaceMember(currentWorkspace.id, targetUser.id, role).catch(() => {});
      }
      const roleLabel = ROLE_CONFIG[role]?.label || role;
      recordActivity(`convidou ${targetUser.name} (${roleLabel}) para o workspace`);
      sendNotification(
        targetUser.id,
        'status_change',
        'Bem-vindo ao Workspace!',
        `Você foi adicionado à equipe "${currentWorkspace.name}" com o cargo ${roleLabel}`
      );
    }
  };

  const handleChangeMemberRole = (userId: string, newRole: WorkspaceRole) => {
    const updatedMembers = currentWorkspace.members.map((m) =>
      m.userId === userId ? { ...m, role: newRole } : m
    );
    handleSaveWorkspace({ members: updatedMembers });
    if (SupabaseService.isConfigured()) {
      SupabaseService.upsertWorkspaceMember(currentWorkspace.id, userId, newRole).catch(() => {});
    }
    const targetUser = users.find((u) => u.id === userId);
    const roleLabel = ROLE_CONFIG[newRole]?.label || newRole;
    recordActivity(`alterou o papel de ${targetUser?.name || 'membro'} para ${roleLabel}`);
  };

  const handleRemoveMember = (userId: string) => {
    const updatedMembers = currentWorkspace.members.filter((m) => m.userId !== userId);
    handleSaveWorkspace({ members: updatedMembers });
    if (SupabaseService.isConfigured()) {
      SupabaseService.removeWorkspaceMember(currentWorkspace.id, userId).catch(() => {});
    }
    const targetUser = users.find((u) => u.id === userId);
    recordActivity(`removeu ${targetUser?.name || 'membro'} do workspace`);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    if (!targetWs) return;

    // Verificar rigorosamente se o usuário autenticado é o Dono (Owner)
    const member = targetWs.members.find((m) => m.userId === currentUser.id);
    const isOwner = member?.role === 'owner' || targetWs.ownerId === currentUser.id;

    if (!isOwner) {
      showToast({
        type: 'error',
        message: 'Ação não permitida: Apenas o Dono (Owner) pode excluir este workspace.',
      });
      return;
    }

    if (workspaces.length <= 1) {
      showToast({
        type: 'error',
        message: 'Você precisa manter pelo menos um workspace ativo no sistema.',
      });
      return;
    }

    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    setWorkspaces(remaining);
    setCurrentWorkspace(remaining[0]);
    setSelectedProjectId('all');

    // Remove do Supabase e storage local
    StorageService.deleteWorkspaceAsync(workspaceId);

    // Limpar projetos e tarefas associados ao workspace excluído
    setProjects((prev) => prev.filter((p) => p.workspaceId !== workspaceId));
    setTasks((prev) => prev.filter((t) => t.workspaceId !== workspaceId));

    recordActivity(`excluiu permanentemente o workspace "${targetWs.name}"`);
    showToast({
      type: 'info',
      message: `Workspace "${targetWs.name}" foi excluído permanentemente.`,
    });
  };

  // Gestão de Projetos
  const handleSaveProject = (projectData: Partial<Project> & { id?: string }) => {
    if (projectData.id) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectData.id ? { ...p, ...projectData } : p))
      );
      recordActivity(`atualizou o projeto "${projectData.name}"`);
    } else {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        workspaceId: currentWorkspace.id,
        name: projectData.name || 'Novo Projeto',
        description: projectData.description || '',
        color: projectData.color || '#2563eb',
        icon: projectData.icon || 'code',
        columns: projectData.columns || [
          { id: 'col-1', title: 'Backlog', color: '#64748b', order: 0 },
          { id: 'col-2', title: 'Em Andamento', color: '#2563eb', order: 1 },
          { id: 'col-3', title: 'Concluído', color: '#059669', order: 2, isCompletedColumn: true },
        ],
        memberIds: projectData.memberIds || workspaceMembers.map((m) => m.id),
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, newProj]);
      setSelectedProjectId(newProj.id);
      recordActivity(`criou o novo projeto "${newProj.name}"`);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
    if (selectedProjectId === projectId) setSelectedProjectId('all');
    if (proj) {
      recordActivity(`excluiu o projeto "${proj.name}"`);
      showToast({
        type: 'info',
        message: `Projeto "${proj.name}" excluído com sucesso.`,
      });
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!activeProject) return;
    if (activeProject.columns.length <= 1) {
      showToast({
        type: 'error',
        message: 'O projeto precisa manter pelo menos uma coluna no quadro.',
      });
      return;
    }
    const deletedCol = activeProject.columns.find((c) => c.id === columnId);
    const remainingCols = activeProject.columns.filter((c) => c.id !== columnId);
    const fallbackColId = remainingCols[0].id;

    // Move tarefas da coluna excluída para a coluna remanescente
    setTasks((prev) =>
      prev.map((t) =>
        t.projectId === activeProject.id && t.columnId === columnId
          ? { ...t, columnId: fallbackColId, updatedAt: new Date().toISOString() }
          : t
      )
    );

    // Atualiza colunas do projeto
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              columns: remainingCols.map((c, idx) => ({ ...c, order: idx })),
            }
          : p
      )
    );

    recordActivity(`excluiu a coluna "${deletedCol?.title || 'Coluna'}" do projeto "${activeProject.name}"`);
    showToast({
      type: 'info',
      message: `Coluna "${deletedCol?.title || 'Coluna'}" excluída. Tarefas transferidas para "${remainingCols[0].title}".`,
    });
  };

  const handleArchiveProject = (projectId: string, isArchived: boolean) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isArchived } : p))
    );
    const proj = projects.find((p) => p.id === projectId);
    recordActivity(`${isArchived ? 'arquivou' : 'desarquivou'} o projeto "${proj?.name}"`);
  };

  // Gestão de Tags
  const handleCreateTag = (newTag: Tag) => {
    setTags((prev) => [...prev, newTag]);
  };

  // Notificações Read
  const handleMarkNotifRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Backup & Reset
  const handleExportBackup = () => {
    const jsonStr = StorageService.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operatask-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (fileContent: string) => {
    const success = StorageService.importBackup(fileContent);
    if (success) {
      setUsers(StorageService.getUsers());
      setCurrentUser(StorageService.getCurrentUser());
      setWorkspaces(StorageService.getWorkspaces());
      setCurrentWorkspace(StorageService.getCurrentWorkspace());
      setProjects(StorageService.getProjects());
      setTasks(StorageService.getTasks());
      setTags(StorageService.getTags());
      setActivities(StorageService.getActivities());
      setNotifications(StorageService.getNotifications());
      alert('Workspace e dados da equipe importados com sucesso!');
    } else {
      alert('Arquivo de backup inválido.');
    }
  };

  const handleResetData = () => {
    StorageService.resetAll();
    setUsers(StorageService.getUsers());
    setCurrentUser(StorageService.getCurrentUser());
    setWorkspaces(StorageService.getWorkspaces());
    setCurrentWorkspace(StorageService.getCurrentWorkspace());
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
    setTags(StorageService.getTags());
    setActivities(StorageService.getActivities());
    setNotifications(StorageService.getNotifications());
  };

  const overdueCount = workspaceTasks.filter((t) => isTaskOverdue(t)).length;
  const unreadNotificationCount = notifications.filter((n) => !n.read && n.userId === currentUser.id).length;

  // Tela de Carregamento (Splash Screen) ao acessar o link do OperaTask (2 a 3 segundos com transição suave para login)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Tela de Login Obrigatória quando não autenticado
  if (!isAuthenticated) {
    return (
      <LoginScreen
        users={users}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // Se a empresa/workspace atual estiver com acesso suspenso (e usuário não for Master)
  if (isCurrentWorkspaceSuspended) {
    const isPastDue = isCurrentTenantPastDue;
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            {isPastDue ? <CreditCard className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isPastDue ? 'Fatura da Assinatura Pendente' : 'Acesso Temporariamente Suspenso'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isPastDue
              ? `A assinatura da empresa ${currentWorkspace.companyName || currentWorkspace.name} encontra-se em atraso (Past Due). Regularize o pagamento via Stripe para reativar o acesso da equipe.`
              : `O acesso para a empresa ${currentWorkspace.companyName || currentWorkspace.name} encontra-se temporariamente suspenso pela administração da plataforma.`}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBillingPlansOpen(true)}
              className="w-full py-3 px-4 bg-[#34B1AC] hover:bg-[#2da09c] text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Regularizar Assinatura / Ver Planos
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-all cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Modal de Planos para auto-regularização */}
        <BillingPlansModal
          isOpen={isBillingPlansOpen}
          onClose={() => setIsBillingPlansOpen(false)}
          currentClient={currentTenant}
          currentUser={currentUser}
          onClientUpdated={(updated) => {
            const freshClients = StorageService.getClients();
            setClients(freshClients);
            const freshWs = StorageService.getWorkspaces();
            setWorkspaces(freshWs);
          }}
          onShowToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans relative">
      {/* Indicador de Status Offline / PWA */}
      <OfflineIndicator />

      {/* Barra Lateral com Workspaces, Vistas e Membros */}
      <Sidebar
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        workspaces={userVisibleWorkspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenCreateWorkspaceModal={() => setIsCreateWorkspaceModalOpen(true)}
        onOpenWorkspaceSettingsModal={() => setIsWorkspaceModalOpen(true)}
        projects={workspaceProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        activeView={viewMode}
        onChangeView={handleViewModeChange}
        myTasksCount={myTasksCount}
        taskCountsByProject={taskCountsByProject}
        currentUser={currentUser}
        allUsers={switchableUsers}
        onSelectCurrentUser={(u) => {
          setCurrentUser(u);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewProjectModal={() => {
          setProjectToEdit(null);
          setIsProjectModalOpen(true);
        }}
        onEditProject={(p) => {
          setProjectToEdit(p);
          setIsProjectModalOpen(true);
        }}
        archivedTasks={archivedWorkspaceTasks}
        onRestoreTask={handleRestoreTask}
        onPermanentDeleteTask={handlePermanentDeleteTask}
        onSelectArchivedTask={(task) => {
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetData={handleResetData}
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
        onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
        onOpenMasterPanel={() => setIsMasterModalOpen(true)}
        onOpenRegisterUserModal={() => setIsRegisterUserOpen(true)}
        onOpenBillingPlans={() => setIsBillingPlansOpen(true)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Banner Persistente de Modo Suporte */}
        {supportMode && supportMode.isActive && (
          <div className="bg-linear-to-r from-amber-600 via-amber-500 to-teal-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between z-30 text-xs shrink-0 animate-in slide-in-from-top duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-black/20 text-amber-200">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/25 text-amber-200 text-[10px]">
                  Modo Suporte Ativo
                </span>
                <span className="font-medium">
                  Você está visualizando a empresa <strong>{supportMode.clientName}</strong> em modo de auditoria/suporte.
                </span>
                <span className="hidden lg:inline text-amber-100 opacity-80">
                  · Dados isolados com total segurança
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExitSupportMode}
              className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-700" />
              <span>Encerrar Suporte & Voltar ao Painel Master</span>
            </button>
          </div>
        )}

        {/* Cabeçalho */}
        <Header
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          selectedTagId={selectedTagId}
          onTagFilterChange={setSelectedTagId}
          availableTags={tags}
          workspaceMembers={workspaceMembers}
          unreadNotificationCount={unreadNotificationCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
          currentUser={currentUser}
          onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          onOpenMasterPanel={() => setIsMasterModalOpen(true)}
          canRegisterUser={canRegisterUser(currentUserRole, isMaster)}
          onOpenRegisterUserModal={() => setIsRegisterUserOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          onOpenNewTaskModal={() => {
            setTaskToEdit(null);
            setDefaultColumnId(activeProject?.columns[0]?.id);
            setIsTaskModalOpen(true);
          }}
        />

        {/* Banner de Aviso de Cobrança / Período Trial */}
        {currentTenant && (currentTenant.paymentStatus === 'past_due' || currentTenant.paymentStatus === 'trialing' || currentTenant.status === 'trial') && !isDismissedBillingWarning && (
          <div className={`px-4 sm:px-6 py-2 text-xs flex items-center justify-between gap-3 shrink-0 ${
            currentTenant.paymentStatus === 'past_due'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'bg-[#173653] text-white border-b border-[#34B1AC]/30'
          }`}>
            <div className="flex items-center gap-2">
              {currentTenant.paymentStatus === 'past_due' ? (
                <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#34B1AC] shrink-0" />
              )}
              <span>
                {currentTenant.paymentStatus === 'past_due'
                  ? `Fatura pendente da empresa ${currentTenant.name}. Regularize para evitar suspensão do acesso da equipe.`
                  : `Plano Trial Ativo (Empresa ${currentTenant.name} · Limite de ${currentTenant.maxUsers || 5} membros). Aproveite todos os recursos liberados.`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBillingPlansOpen(true)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  currentTenant.paymentStatus === 'past_due'
                    ? 'bg-slate-950 text-white hover:bg-slate-800'
                    : 'bg-[#34B1AC] hover:bg-[#2da09c] text-white shadow-xs'
                }`}
              >
                {currentTenant.paymentStatus === 'past_due' ? 'Pagar Fatura' : 'Ver Planos & Upgrade'}
              </button>
              <button
                type="button"
                onClick={() => setIsDismissedBillingWarning(true)}
                className="p-1 hover:opacity-75 cursor-pointer"
                title="Dispensar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Banner de Instalação PWA (Dispensável / Smart Prompt) */}
        <PWAInstallPrompt variant="banner" />

        {/* Alerta de tarefas atrasadas */}
        {overdueCount > 0 && !isDismissedAlert && (
          <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-red-800 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>
                Aviso de Equipe: Existem <strong>{overdueCount}</strong> tarefas atrasadas no workspace.
              </span>
              <button
                type="button"
                onClick={() => {
                  setViewMode('my_tasks');
                }}
                className="underline font-semibold ml-2 hover:text-red-900 dark:hover:text-red-200"
              >
                Ver minhas pendências
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsDismissedAlert(true)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1 rounded"
              title="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Área Central Conforme ViewMode Selecionado com Espaço Seguro para Mobile Bottom Nav */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto h-full">
            {workspaceProjects.length === 0 ? (
              <WelcomeEmptyState
                onCreateFirstBoard={() => {
                  setProjectToEdit(null);
                  setIsProjectModalOpen(true);
                }}
                onLoadSampleBoard={handleLoadSampleBoard}
                workspaceName={currentWorkspace.name}
              />
            ) : (
              <>
                {viewMode === 'kanban' && activeProject && (
                  <KanbanView
                    tasks={filteredTasks}
                    project={activeProject}
                    workspaceMembers={workspaceMembers}
                    currentUserRole={currentUserRole}
                    isMaster={isMaster}
                    onUpdateTaskColumn={handleUpdateTaskColumn}
                    onReorderTasks={handleReorderTasks}
                    onToggleTaskComplete={handleToggleTaskComplete}
                    onEditTask={(task) => {
                      setTaskToEdit(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDuplicateTask={handleDuplicateTask}
                    onArchiveTask={handleArchiveTask}
                    onDeleteTask={handleDeleteTask}
                    onDeleteColumn={handleDeleteColumn}
                    onQuickAddTask={(colId) => {
                      setDefaultColumnId(colId);
                      setTaskToEdit(null);
                      setIsTaskModalOpen(true);
                    }}
                  />
                )}

                {viewMode === 'list' && (
                  <ListView
                    tasks={filteredTasks}
                    projects={workspaceProjects}
                    workspaceMembers={workspaceMembers}
                    currentUserRole={currentUserRole}
                    isMaster={isMaster}
                    onToggleTaskComplete={handleToggleTaskComplete}
                    onUpdateTaskColumn={handleUpdateTaskColumn}
                    onEditTask={(task) => {
                      setTaskToEdit(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDuplicateTask={handleDuplicateTask}
                    onArchiveTask={handleArchiveTask}
                    onDeleteTask={handleDeleteTask}
                    onAddNewTask={() => {
                      setTaskToEdit(null);
                      setDefaultColumnId(activeProject?.columns[0]?.id);
                      setIsTaskModalOpen(true);
                    }}
                  />
                )}

                {viewMode === 'my_tasks' && (
                  <MyTasksView
                    tasks={workspaceTasks}
                    projects={workspaceProjects}
                    currentUser={currentUser}
                    onToggleTaskComplete={handleToggleTaskComplete}
                    onEditTask={(task) => {
                      setTaskToEdit(task);
                      setIsTaskModalOpen(true);
                    }}
                  />
                )}

                {viewMode === 'dashboard' && (
                  <TeamDashboardView
                    workspace={currentWorkspace}
                    tasks={workspaceTasks}
                    projects={workspaceProjects}
                    workspaceMembers={workspaceMembers}
                    onSelectProject={(projId) => {
                      setSelectedProjectId(projId);
                      setViewMode('kanban');
                    }}
                    onSelectMemberFilter={(memberId) => {
                      setAssigneeFilter(memberId);
                      setViewMode('list');
                    }}
                  />
                )}

                {viewMode === 'activity_feed' && (
                  <ActivityFeedView
                    activities={activities}
                    workspaceMembers={workspaceMembers}
                    projects={workspaceProjects}
                    onSelectTask={(taskId) => {
                      const t = tasks.find((item) => item.id === taskId);
                      if (t) {
                        setTaskToEdit(t);
                        setIsTaskModalOpen(true);
                      }
                    }}
                  />
                )}
              </>
            )}
          </div>
        </main>

        {/* Barra de Navegação Inferior Móvel (Bottom Navigation Bar) */}
        <MobileBottomNav
          currentView={viewMode}
          onChangeView={handleViewModeChange}
          canAccessDashboard={canViewDashboard}
          onOpenNewTaskModal={() => {
            setTaskToEdit(null);
            setDefaultColumnId(activeProject?.columns[0]?.id);
            setIsTaskModalOpen(true);
          }}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        />
      </div>

      {/* Modais Globais */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        defaultColumnId={defaultColumnId}
        defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : activeProject?.id}
        projects={workspaceProjects}
        tags={tags}
        workspaceMembers={workspaceMembers}
        currentUser={currentUser}
        currentUserRole={currentUserRole}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onDuplicateTask={handleDuplicateTask}
        onArchiveTask={handleArchiveTask}
        onCreateTag={handleCreateTag}
        onAddComment={handleAddComment}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projectToEdit={projectToEdit}
        workspaceId={currentWorkspace.id}
        workspaceMembers={workspaceMembers}
        currentWorkspace={currentWorkspace}
        currentUserRole={currentUserRole}
        onSaveProject={handleSaveProject}
        onDeleteProject={handleDeleteProject}
        onArchiveProject={handleArchiveProject}
        taskCount={
          projectToEdit
            ? workspaceTasks.filter((t) => t.projectId === projectToEdit.id).length
            : 0
        }
      />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspace={currentWorkspace}
        allUsers={switchableUsers}
        currentUserId={currentUser.id}
        onSaveWorkspace={handleSaveWorkspace}
        onInviteMember={handleInviteMember}
        onChangeMemberRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
        onDeleteWorkspace={handleDeleteWorkspace}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />

      <NotificationPopover
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications.filter((n) => n.userId === currentUser.id)}
        workspaceMembers={workspaceMembers}
        onMarkAsRead={handleMarkNotifRead}
        onMarkAllAsRead={handleMarkAllNotifsRead}
        onSelectTask={(taskId) => {
          const t = tasks.find((item) => item.id === taskId);
          if (t) {
            setTaskToEdit(t);
            setIsTaskModalOpen(true);
          }
        }}
      />

      <SyncSettingsModal
        isOpen={isSyncSettingsOpen}
        onClose={() => setIsSyncSettingsOpen(false)}
        onDataImported={() => {
          setTasks(StorageService.getTasks());
          setProjects(StorageService.getProjects());
          setWorkspaces(StorageService.getWorkspaces());
          setUsers(StorageService.getUsers());
          setTags(StorageService.getTags());
        }}
      />

      {/* Modal de Minha Conta / Perfil do Usuário */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUser={currentUser}
        currentWorkspace={currentWorkspace}
        onUpdateUser={handleUpdateUser}
        onShowToast={showToast}
      />

      {/* Painel Master / Super Admin */}
      <MasterAdminModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        currentUser={currentUser}
        users={users}
        workspaces={workspaces}
        projects={projects}
        tasks={tasks}
        clients={clients}
        onUpdateUsers={(updated) => {
          setUsers(updated);
          StorageService.saveUsers(updated);
          const refreshedCurrent = updated.find((u) => u.id === currentUser.id);
          if (refreshedCurrent) {
            setCurrentUser(refreshedCurrent);
          }
        }}
        onUpdateWorkspaces={(updated) => {
          setWorkspaces(updated);
          StorageService.saveWorkspaces(updated);
        }}
        onUpdateProjects={(updated) => {
          setProjects(updated);
          StorageService.saveProjects(updated);
        }}
        onUpdateTasks={(updated) => {
          setTasks(updated);
          StorageService.saveTasks(updated);
        }}
        onUpdateClients={(updated) => {
          setClients(updated);
          StorageService.saveClients(updated);
        }}
        onSelectWorkspace={(workspaceId) => {
          handleSelectWorkspace(workspaceId);
          setIsMasterModalOpen(false);
        }}
        onEnterSupportMode={handleEnterSupportMode}
        onShowToast={showToast}
      />

      {/* Modal de Cadastro de Novos Usuários (Dono e Administrador) */}
      <RegisterUserModal
        isOpen={isRegisterUserOpen}
        onClose={() => setIsRegisterUserOpen(false)}
        workspaces={userVisibleWorkspaces}
        workspaceId={currentWorkspace.id}
        currentUser={currentUser}
        onUserCreated={(newUser) => {
          const freshUsers = StorageService.getUsers();
          setUsers(freshUsers);
          const freshWorkspaces = StorageService.getWorkspaces();
          setWorkspaces(freshWorkspaces);
          const updatedCurrentWs = freshWorkspaces.find((w) => w.id === currentWorkspace.id);
          if (updatedCurrentWs) {
            setCurrentWorkspace(updatedCurrentWs);
          }
          showToast({
            type: 'success',
            message: `Usuário ${newUser.name} cadastrado com sucesso! Conta ativa e link liberado para acesso imediato.`,
          });
        }}
      />

      {/* Modal de Planos & Cobrança (Stripe Billing) */}
      <BillingPlansModal
        isOpen={isBillingPlansOpen}
        onClose={() => setIsBillingPlansOpen(false)}
        currentClient={currentTenant}
        currentUser={currentUser}
        onClientUpdated={(updated) => {
          const freshClients = StorageService.getClients();
          setClients(freshClients);
          const freshWs = StorageService.getWorkspaces();
          setWorkspaces(freshWs);
          const updatedCurrentWs = freshWs.find((w) => w.id === currentWorkspace.id);
          if (updatedCurrentWs) {
            setCurrentWorkspace(updatedCurrentWs);
          }
        }}
        onShowToast={showToast}
      />

      {/* Notificação Flutuante / Toast de Feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-300 animate-in slide-in-from-bottom-5 fade-in duration-200 max-w-md">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-blue-400 dark:text-blue-600 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertTriangle className="w-5 h-5 text-red-400 dark:text-red-600 shrink-0" />
          )}

          <p className="text-xs font-medium flex-1">{toast.message}</p>

          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="px-2.5 py-1 text-xs font-bold bg-white/20 hover:bg-white/30 dark:bg-slate-900/10 dark:hover:bg-slate-900/20 text-white dark:text-slate-900 rounded-lg transition-colors shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 rounded-lg"
            title="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
