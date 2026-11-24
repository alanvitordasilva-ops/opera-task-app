import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Task,
  Project,
  BoardColumn,
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
  isWorkspaceMemberOrOwner,
  getUserRoleInWorkspace,
  ROLE_CONFIG,
  canAccessDashboard,
  canAccessStock,
  canModifyCompletedTask,
  isTaskInDoneColumn,
  canRegisterUser,
  sortWorkspacesByOrder,
  mergeTaskLists,
  getDeletedTaskIds,
  buildUniqueTaskId,
  filterActiveTasksForProjects,
} from './utils/helpers.ts';
import { SplashScreen } from './components/SplashScreen.tsx';
import { RegisterUserModal } from './components/RegisterUserModal.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { KanbanView } from './components/KanbanView.tsx';
import { ListView } from './components/ListView.tsx';
import { StockView } from './components/StockView.tsx';
import { ArchivedView } from './components/ArchivedView.tsx';
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
import { InviteValidationScreen, InviteValidationData } from './components/InviteValidationScreen.tsx';
import { WelcomeEmptyState } from './components/WelcomeEmptyState.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { MasterAdminModal } from './components/MasterAdminModal.tsx';
import { BillingPlansModal } from './components/BillingPlansModal.tsx';
import { PlanLimitExceededModal } from './components/PlanLimitExceededModal.tsx';
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

  // Detecção e Isolamento de Link de Convite na URL (?invite=true)
  const [inviteData] = useState<InviteValidationData | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const search = window.location.search;
      if (!search) return null;
      const params = new URLSearchParams(search);
      if (params.get('invite') === 'true') {
        const token = params.get('token') || `inv-${Date.now().toString(36)}`;
        const companyId = params.get('company_id') || params.get('companyId') || undefined;
        const workspaceId = params.get('workspace_id') || params.get('workspaceId') || undefined;
        const workspaceName = params.get('ws_name') || params.get('workspaceName') || undefined;
        const login = params.get('login') || undefined;

        // Limpeza preventiva imediata de qualquer sessão residual (ex: Master) para evitar login cruzado
        StorageService.setAuthenticated(false);
        try {
          localStorage.removeItem('operatask_auth_status');
          localStorage.removeItem('operatask_current_user_id');
          sessionStorage.clear();
        } catch {}

        return { token, companyId, workspaceId, workspaceName, login };
      }
    } catch {}
    return null;
  });

  const [isInviteValidating, setIsInviteValidating] = useState<boolean>(() => Boolean(inviteData));

  // Tela de Carregamento (Splash Screen) ao acessar o link do app (não exibe se for fluxo de convite)
  const [showSplash, setShowSplash] = useState<boolean>(() => !inviteData);

  // Estado de Autenticação na Tela de Login (link de convite força login isolado)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    inviteData ? false : StorageService.isAuthenticated()
  );

  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);
  const currentUserRef = useRef<User>(currentUser);
  const currentWorkspaceRef = useRef<Workspace>(currentWorkspace);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentWorkspaceRef.current = currentWorkspace;
  }, [currentWorkspace]);

  const handleLoginSuccess = async (user: User) => {
    isAuthenticatedRef.current = true;

    // 1. Sincroniza estado mais recente do servidor central (/api/sync/state) antes de resolver o workspace do usuário
    await StorageService.syncWithServer().catch(() => false);

    // 2. Reconcilia dados do usuário recém-logado com registros salvos (preservando companyId, tenantId e workspaceIds)
    const freshUsers = StorageService.getUsers();
    const matchedStoredUser = freshUsers.find(
      (u) =>
        u.id === user.id ||
        (u.email && user.email && u.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
        (u.username && user.username && u.username.trim().toLowerCase().replace(/^@/, '') === user.username.trim().toLowerCase().replace(/^@/, ''))
    );

    const combinedWsIds = Array.from(
      new Set([
        ...(Array.isArray(matchedStoredUser?.workspaceIds) ? matchedStoredUser!.workspaceIds : []),
        ...(matchedStoredUser?.workspaceId ? [matchedStoredUser.workspaceId] : []),
        ...(Array.isArray(user.workspaceIds) ? user.workspaceIds : []),
        ...(user.workspaceId ? [user.workspaceId] : []),
        ...(inviteData?.workspaceId && !isUserMaster(user) ? [inviteData.workspaceId] : []),
      ].filter(Boolean))
    );

    const resolvedUser: User = {
      ...(matchedStoredUser || {}),
      ...user,
      companyId: user.companyId || matchedStoredUser?.companyId || (!isUserMaster(user) ? inviteData?.companyId : undefined),
      tenantId: user.tenantId || matchedStoredUser?.tenantId || user.companyId || matchedStoredUser?.companyId || (!isUserMaster(user) ? inviteData?.companyId : undefined),
      workspaceId: user.workspaceId || matchedStoredUser?.workspaceId || combinedWsIds[0],
      workspaceIds: combinedWsIds.length > 0 ? combinedWsIds : undefined,
      status: 'active',
      isActive: true,
    };

    const currentUsersList = matchedStoredUser
      ? freshUsers.map((u) => (u.id === matchedStoredUser.id ? resolvedUser : u))
      : [...freshUsers, resolvedUser];
    StorageService.saveUsers(currentUsersList, true);
    setUsers(currentUsersList);
    setCurrentUser(resolvedUser);
    currentUserRef.current = resolvedUser;
    StorageService.setCurrentUserId(resolvedUser.id);

    // 3. Busca workspaces atualizados da nuvem (Supabase) para o usuário recém-logado
    if (SupabaseService.isConfigured()) {
      try {
        await StorageService.fetchWorkspacesCloud(resolvedUser);
      } catch (err) {
        console.warn('[OperaTask] Erro ao buscar workspaces na nuvem durante login:', err);
      }
    }

    let freshWorkspaces = StorageService.getWorkspaces();
    const isMasterUser = isUserMaster(resolvedUser);

    // Se o usuário veio por link de convite com workspaceId e seu novo ID ainda não está listado em members, garante vínculo local
    if (!isMasterUser && inviteData?.workspaceId) {
      const invitedWsIdx = freshWorkspaces.findIndex((w) => w.id === inviteData.workspaceId);
      if (invitedWsIdx !== -1) {
        const ws = freshWorkspaces[invitedWsIdx];
        if (!isWorkspaceMemberOrOwner(ws, resolvedUser, currentUsersList)) {
          freshWorkspaces = freshWorkspaces.map((w, idx) =>
            idx === invitedWsIdx
              ? {
                  ...w,
                  members: [
                    ...(w.members || []),
                    { userId: resolvedUser.id, role: (resolvedUser.tipo as WorkspaceRole) || 'member', joinedAt: new Date().toISOString() },
                  ],
                }
              : w
          );
          StorageService.saveWorkspaces(freshWorkspaces, true);
        }
      }
    }

    const allowedWorkspaces = isMasterUser
      ? freshWorkspaces
      : freshWorkspaces.filter((w) => isWorkspaceMemberOrOwner(w, resolvedUser, currentUsersList));

    // Se o usuário veio de convite para um workspace específico, prioriza esse workspace; senão, prioriza workspaces em que foi inscrito (evitando ws-principal se não for apenas dele)
    const targetInvitedWs = inviteData?.workspaceId
      ? allowedWorkspaces.find((w) => w.id === inviteData.workspaceId) ||
        freshWorkspaces.find((w) => w.id === inviteData.workspaceId)
      : null;
    const savedWsId = StorageService.getCurrentWorkspace()?.id;
    const savedActiveWs = savedWsId
      ? allowedWorkspaces.find((w) => w.id === savedWsId) || null
      : null;
    const preferredNonPrincipalWs =
      allowedWorkspaces.find((w) => w.id !== 'ws-principal') || null;
    const activeWs =
      targetInvitedWs ||
      savedActiveWs ||
      preferredNonPrincipalWs ||
      (allowedWorkspaces.length > 0 ? allowedWorkspaces[0] : null);

    let resolvedActiveWs = activeWs;
    if (resolvedActiveWs) {
      setWorkspaces(freshWorkspaces);
      setCurrentWorkspace(resolvedActiveWs);
      currentWorkspaceRef.current = resolvedActiveWs;
      StorageService.setCurrentWorkspaceId(resolvedActiveWs.id);
      const ensuredProj = StorageService.ensureWorkspaceProject(resolvedActiveWs.id, resolvedActiveWs.name);
      const freshProjs = StorageService.getProjects();
      setProjects(freshProjs);
      setSelectedProjectId((prevProjId) => {
        const wsProjs = freshProjs.filter((p) => p.workspaceId === resolvedActiveWs!.id && !p.isArchived);
        if (wsProjs.some((p) => p.id === prevProjId)) return prevProjId;
        return wsProjs[0]?.id || ensuredProj.id;
      });
      setClients(StorageService.getClients());
      setActivities(StorageService.getActivities());
      setNotifications(StorageService.getNotifications());
    } else {
      const userCompany = resolvedUser.companyId || resolvedUser.tenantId;
      const wsId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newWs: Workspace = {
        id: wsId,
        name: resolvedUser.name ? `Workspace de ${resolvedUser.name.split(' ')[0]}` : 'Meu Workspace',
        slug: `meu-workspace-${wsId.slice(-5)}`,
        description: 'Espaço de trabalho corporativo',
        logoColor: '#173653',
        ownerId: resolvedUser.id,
        companyId: userCompany,
        members: [{ userId: resolvedUser.id, role: 'owner', joinedAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      };
      resolvedActiveWs = newWs;
      const res = await StorageService.createWorkspaceAsync(newWs);
      const createdWs = res.workspace || newWs;
      resolvedActiveWs = createdWs;
      setWorkspaces(StorageService.getWorkspaces());
      setCurrentWorkspace(createdWs);
      currentWorkspaceRef.current = createdWs;
      setProjects(StorageService.getProjects());
      setClients(StorageService.getClients());
      setActivities(StorageService.getActivities());
      setNotifications(StorageService.getNotifications());
    }

    StorageService.setAuthenticated(true);
    setIsAuthenticated(true);

    // Carregar projetos, tarefas e clientes do armazenamento sincronizado e da nuvem (todos os workspaces para Master)
    const finalActiveWs = resolvedActiveWs;
    setTasks(StorageService.getTasks());
    if (SupabaseService.isConfigured() && finalActiveWs) {
      const targetWsScope = isMasterUser ? undefined : finalActiveWs.id;
      Promise.all([
        StorageService.fetchProjectsCloud(targetWsScope),
        StorageService.fetchTasksCloud(targetWsScope),
        StorageService.fetchClientsCloud(),
      ]).then(([pRes, tRes, cRes]) => {
        let restoredFromCloud = false;
        if (pRes.success && Array.isArray(pRes.projects) && pRes.projects.length > 0) {
          const updatedProjs = StorageService.getProjects();
          setProjects(updatedProjs);
          setSelectedProjectId((prevProjId) => {
            const wsProjs = updatedProjs.filter((p) => p.workspaceId === finalActiveWs.id && !p.isArchived);
            if (wsProjs.some((p) => p.id === prevProjId)) return prevProjId;
            return wsProjs[0]?.id || prevProjId;
          });
          restoredFromCloud = true;
        }
        if (tRes.success && Array.isArray(tRes.tasks)) {
          setTasks(StorageService.getTasks());
          if (tRes.tasks.length > 0) restoredFromCloud = true;
        }
        if (cRes.success && Array.isArray(cRes.clients)) {
          setClients(StorageService.getClients());
          if (cRes.clients.length > 0) restoredFromCloud = true;
        }
        if (restoredFromCloud) {
          StorageService.pushLocalStateToServer().catch(() => {});
        }
      });
    }

    showToast({
      type: 'success',
      message: `Bem-vindo(a) ao OperaTask, ${resolvedUser.name}! Acesso liberado.`,
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
  const isTaskModalOpenRef = useRef(isTaskModalOpen);
  isTaskModalOpenRef.current = isTaskModalOpen;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
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
  const [planLimitState, setPlanLimitState] = useState<{
    isOpen: boolean;
    limitType: 'create_board' | 'invite_member' | 'feature_locked';
    currentCount?: number;
    maxLimit?: number;
    planName?: string;
    customMessage?: string;
  } | null>(null);

  const handleOpenCreateBoard = () => {
    const check = StorageService.validateWorkspaceLimit(currentWorkspace.id, 'create_board');
    if (!check.allowed) {
      setPlanLimitState({
        isOpen: true,
        limitType: 'create_board',
        currentCount: check.currentCount,
        maxLimit: check.maxLimit,
        planName: check.planName,
        customMessage: check.reason,
      });
      return;
    }
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

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

  // Sincronização autoritativa inicial com IndexedDB, servidor local e banco de dados remoto (Supabase)
  useEffect(() => {
    const fetchLatestServerState = async () => {
      // 1. Recupera backup automático do IndexedDB caso o localStorage tenha sido reduzido
      await StorageService.rehydrateFromIndexedDBIfNeeded().catch(() => false);

      // 2. Mescla de forma não-destrutiva com o servidor local (nunca sobrescreve dados pós-reset)
      await StorageService.syncWithServer().catch(() => false);

      // 3. Se houver Supabase configurado, carrega TODOS os workspaces, quadros, cards e clientes da nuvem
      if (SupabaseService.isConfigured()) {
        const liveUser = currentUserRef.current;
        const isMastNow = isUserMaster(liveUser);
        let restoredFromCloud = false;

        try {
          const cloudWs = await StorageService.fetchWorkspacesCloud(liveUser);
          if (cloudWs.success && cloudWs.workspaces.length > 0) {
            setWorkspaces(cloudWs.workspaces);
            restoredFromCloud = true;
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar workspaces do Supabase:', e);
        }

        try {
          const cloudProj = await StorageService.fetchProjectsCloud(
            isMastNow ? undefined : currentWorkspaceRef.current?.id
          );
          if (cloudProj.success && cloudProj.projects.length > 0) {
            setProjects(cloudProj.projects);
            restoredFromCloud = true;
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar projetos do Supabase:', e);
        }

        try {
          const cloudRes = await StorageService.fetchTasksCloud(
            isMastNow ? undefined : currentWorkspaceRef.current?.id
          );
          if (cloudRes.success && Array.isArray(cloudRes.tasks)) {
            setTasks((prev) => mergeTaskLists(prev, cloudRes.tasks, getDeletedTaskIds()));
            if (cloudRes.tasks.length > 0) restoredFromCloud = true;
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar tarefas do Supabase:', e);
        }

        try {
          const cloudClients = await StorageService.fetchClientsCloud();
          if (cloudClients.success && Array.isArray(cloudClients.clients) && cloudClients.clients.length > 0) {
            setClients(cloudClients.clients);
            restoredFromCloud = true;
          }
        } catch (e) {
          console.warn('[OperaTask] Aviso ao carregar clientes do Supabase:', e);
        }

        // Se o Supabase restaurou dados, repovoa o servidor central imediatamente
        if (restoredFromCloud) {
          StorageService.pushLocalStateToServer().catch(() => {});
        }
      }

      const freshUsers = StorageService.getUsers();
      const freshWorkspaces = StorageService.getWorkspaces();
      const freshProjects = StorageService.getProjects();
      const freshTasks = StorageService.getTasks();
      const freshTags = StorageService.getTags();
      const freshClients = StorageService.getClients();

      setUsers(freshUsers);
      setWorkspaces(freshWorkspaces);
      setProjects(freshProjects);
      setClients(freshClients);
      setTasks((prev) => mergeTaskLists(prev, freshTasks, getDeletedTaskIds()));
      setTags(freshTags);

      // Nunca sobrescreve o usuário ou workspace antes da autenticação ou com referência desatualizada de closure
      if (!isAuthenticatedRef.current) {
        return;
      }

      const activeUserNow = currentUserRef.current;
      const activeWsNow = currentWorkspaceRef.current;
      const matchedUser = freshUsers.find((u) => u.id === activeUserNow.id) || activeUserNow;
      if (matchedUser) {
        setCurrentUser((prev) => (JSON.stringify(prev) === JSON.stringify(matchedUser) ? prev : matchedUser));
      }

      const isMast = isUserMaster(matchedUser);
      const allowedWs = isMast
        ? freshWorkspaces
        : freshWorkspaces.filter((w) => isWorkspaceMemberOrOwner(w, matchedUser, freshUsers));

      const preferredWs =
        allowedWs.find((w) => w.id === activeWsNow.id) ||
        allowedWs.find((w) => w.id !== 'ws-principal') ||
        allowedWs[0];

      if (preferredWs) {
        setCurrentWorkspace((prev) => (JSON.stringify(prev) === JSON.stringify(preferredWs) ? prev : preferredWs));
        StorageService.ensureWorkspaceProject(preferredWs.id, preferredWs.name);
      }
    };
    fetchLatestServerState();
  }, []);

  // Recarregar projetos e tarefas da nuvem do Supabase ao trocar de Workspace
  useEffect(() => {
    if (currentWorkspace?.id) {
      const ensuredProj = StorageService.ensureWorkspaceProject(currentWorkspace.id, currentWorkspace.name);
      setProjects((prev) => {
        if (prev.some((p) => p.id === ensuredProj.id)) return prev;
        return StorageService.getProjects();
      });
      if (SupabaseService.isConfigured()) {
        StorageService.fetchProjectsCloud(currentWorkspace.id).then((res) => {
          if (res.success && Array.isArray(res.projects) && res.projects.length > 0) {
            setProjects(res.projects);
          }
        });
        StorageService.fetchTasksCloud(currentWorkspace.id).then((res) => {
          if (res.success && Array.isArray(res.tasks)) {
            setTasks((prev) => mergeTaskLists(prev, res.tasks, getDeletedTaskIds()));
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
    StorageService.saveProjects(projects, false, { skipCloudPush: true });
  }, [projects]);

  useEffect(() => {
    StorageService.saveTasks(tasks, false, { skipCloudPush: true });
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

    // Sincronização de Tarefas (Cards) com mesclagem não-destrutiva
    const unsubTasks = RealtimeService.subscribe('tasks', (incomingTasks: Task[], meta) => {
      if (Array.isArray(incomingTasks)) {
        const action = String(meta?.action || '');
        const isDestructive = action.includes('delete') || action.includes('reset');
        const deletedIds = getDeletedTaskIds();

        setTasks((prev) => {
          const next = isDestructive
            ? incomingTasks.filter((t) => t && t.id && !deletedIds.includes(t.id))
            : mergeTaskLists(prev, incomingTasks, deletedIds);
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          return next;
        });

        setTaskToEdit((currentOpen) => {
          if (!currentOpen) return null;
          if (isTaskModalOpenRef.current) return currentOpen;
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
    const unsubWorkspaces = RealtimeService.subscribe('workspaces', (incomingWorkspaces: Workspace[], meta) => {
      if (Array.isArray(incomingWorkspaces) && incomingWorkspaces.length > 0) {
        const action = String(meta?.action || '');
        const isDestructive =
          action.includes('reset') || action.includes('replace') || action.includes('delete');
        setWorkspaces((prev) => {
          if (isDestructive) {
            const next = sortWorkspacesByOrder(incomingWorkspaces);
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
          }
          const map = new Map<string, Workspace>();
          prev.forEach((w) => map.set(w.id, w));
          incomingWorkspaces.forEach((w) => {
            const existing = map.get(w.id);
            if (existing) {
              const mMap = new Map<string, Workspace['members'][number]>();
              (existing.members || []).forEach((m) => m?.userId && mMap.set(m.userId, m));
              (w.members || []).forEach((m) => m?.userId && mMap.set(m.userId, m));
              map.set(w.id, { ...existing, ...w, members: Array.from(mMap.values()) });
            } else {
              map.set(w.id, w);
            }
          });
          const merged = sortWorkspacesByOrder(Array.from(map.values()));
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          return merged;
        });
        setCurrentWorkspace((prev) => {
          const updatedCurrent = incomingWorkspaces.find((w) => w.id === prev.id);
          if (updatedCurrent) {
            if (JSON.stringify(prev) !== JSON.stringify(updatedCurrent)) {
              return updatedCurrent;
            }
            return prev;
          }
          if (isDestructive && incomingWorkspaces[0]) {
            return incomingWorkspaces[0];
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

  // Base completa de usuários cadastrados elegíveis para inscrição em workspaces novos ou existentes
  const enrollableUsers = useMemo(() => {
    return StorageService.getEnrollableUsers(currentUser, users);
  }, [currentUser, users]);

  // Atualiza a lista de usuários cadastrados a partir do banco (servidor central / Supabase) ao abrir modais de gestão
  useEffect(() => {
    if (!isCreateWorkspaceModalOpen && !isWorkspaceModalOpen && !isMasterModalOpen) return;
    let cancelled = false;
    StorageService.fetchRegisteredUsersCloud()
      .then((freshUsers) => {
        if (!cancelled && Array.isArray(freshUsers) && freshUsers.length > 0) {
          setUsers(freshUsers);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isCreateWorkspaceModalOpen, isWorkspaceModalOpen, isMasterModalOpen]);

  // Papel do usuário atual no workspace ativo
  const currentUserRole: WorkspaceRole = useMemo(() => {
    return getUserRoleInWorkspace(currentWorkspace, currentUser, users);
  }, [currentWorkspace, currentUser, users]);

  // Projetos do workspace atual com garantia de persistência e fallback ativo anti-vazio
  const workspaceProjects = useMemo(() => {
    if (!currentWorkspace?.id) return [];
    const allWsProjects = projects.filter((p) => p.workspaceId === currentWorkspace.id);
    const activeList = allWsProjects.filter((p) => !p.isArchived);

    // Se o workspace ainda não possuir nenhum quadro cadastrado, provê imediatamente o Quadro Principal ativo
    if (allWsProjects.length === 0) {
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
    return activeList;
  }, [projects, currentWorkspace]);

  // Quadros arquivados do workspace atual
  const archivedWorkspaceProjects = useMemo(() => {
    if (!currentWorkspace?.id) return [];
    return projects.filter((p) => p.workspaceId === currentWorkspace.id && !!p.isArchived);
  }, [projects, currentWorkspace]);

  // Tarefas ativas do workspace atual (exclui arquivadas, excluídas e órfãs de projetos/colunas excluídos ou arquivados)
  const workspaceTasks = useMemo(() => {
    const wsRawTasks = tasks.filter((t) => t.workspaceId === currentWorkspace.id);
    return filterActiveTasksForProjects(wsRawTasks, workspaceProjects);
  }, [tasks, currentWorkspace, workspaceProjects]);

  // Tarefas arquivadas do workspace atual
  const archivedWorkspaceTasks = useMemo(() => {
    return tasks.filter((t) => t.workspaceId === currentWorkspace.id && !!t.isArchived);
  }, [tasks, currentWorkspace]);

  // Tarefas em Estoque do workspace atual (cards concluídos enviados para o estoque)
  const stockWorkspaceTasks = useMemo(() => {
    const deletedSet = new Set(getDeletedTaskIds());
    const activeProjectIds = new Set(workspaceProjects.map((p) => p.id));
    return tasks.filter(
      (t) =>
        t &&
        t.id &&
        t.workspaceId === currentWorkspace.id &&
        !!t.isInStock &&
        !t.isArchived &&
        !deletedSet.has(t.id) &&
        activeProjectIds.has(t.projectId)
    );
  }, [tasks, currentWorkspace, workspaceProjects]);

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

    const filtered = workspaces.filter((w) => isWorkspaceMemberOrOwner(w, currentUser, users));

    if (filtered.length === 0 && currentWorkspace?.id && currentWorkspace.id !== 'ws-principal') {
      return [currentWorkspace];
    }

    return filtered;
  }, [workspaces, currentUser, users, isMaster, currentWorkspace]);

  const userVisibleWorkspaceIds = useMemo(() => {
    return userVisibleWorkspaces.map((w) => w.id).join(',');
  }, [userVisibleWorkspaces]);

  // Redireciona caso o workspace atual não esteja mais na lista visível
  useEffect(() => {
    if (!isAuthenticated) return;
    if (userVisibleWorkspaces.length > 0 && !userVisibleWorkspaces.some((w) => w.id === currentWorkspace.id)) {
      const fallback = (!isMaster ? userVisibleWorkspaces.find((w) => w.id !== 'ws-principal') : undefined) || userVisibleWorkspaces[0];
      setCurrentWorkspace(fallback);
      StorageService.setCurrentWorkspaceId(fallback.id);
    }
  }, [isAuthenticated, isMaster, userVisibleWorkspaceIds, currentWorkspace.id]);

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
  const canViewStock = canAccessStock(currentUserRole, isMaster);
  const canViewArchived = Boolean(
    isMaster ||
      currentUserRole === 'owner' ||
      currentUserRole === 'dono' ||
      currentUserRole === 'admin' ||
      currentUserRole === 'administrador'
  );

  // Redireciona automaticamente se estiver no Dashboard, Estoque ou Arquivados sem permissão
  useEffect(() => {
    if (viewMode === 'dashboard' && !canViewDashboard) {
      setViewMode('kanban');
      StorageService.saveViewMode('kanban');
    } else if (viewMode === 'stock' && !canViewStock) {
      setViewMode('kanban');
      StorageService.saveViewMode('kanban');
    } else if (viewMode === 'archived' && !canViewArchived) {
      setViewMode('kanban');
      StorageService.saveViewMode('kanban');
    }
  }, [viewMode, canViewDashboard, canViewStock, canViewArchived]);

  // Alternador de visualização com verificação rigorosa de permissões
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'dashboard' && !canViewDashboard) {
      showToast({
        type: 'error',
        message: 'Acesso restrito: Apenas Administradores e o Dono podem visualizar o Dashboard.',
      });
      return;
    }
    if (mode === 'stock' && !canViewStock) {
      showToast({
        type: 'error',
        message: 'Acesso restrito: Apenas Dono, Administrador e Produção podem acessar a aba Estoque.',
      });
      return;
    }
    if (mode === 'archived' && !canViewArchived) {
      showToast({
        type: 'error',
        message: 'Acesso restrito: Apenas Dono e Administradores podem acessar a aba Arquivados.',
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

  // Tarefas filtradas para exibição na aba Estoque (quadro único do projeto ativo)
  const filteredStockTasks = useMemo(() => {
    return stockWorkspaceTasks.filter((task) => {
      if (activeProject && task.projectId !== activeProject.id) {
        return false;
      }
      if (assigneeFilter !== 'all') {
        if (!task.assigneeIds || !task.assigneeIds.includes(assigneeFilter)) {
          return false;
        }
      }
      if (priorityFilter !== 'all') {
        const taskPriority = task.priority || 'none';
        if (taskPriority !== priorityFilter) {
          return false;
        }
      }
      if (selectedTagId !== 'all') {
        const hasTag = task.tags?.some((t) => t.id === selectedTagId);
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesTags = task.tags?.some((t) => t.name.toLowerCase().includes(q));
        const matchesFicha = task.fichaTecnica?.nomeItem?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesFicha) return false;
      }
      return true;
    });
  }, [
    stockWorkspaceTasks,
    activeProject,
    assigneeFilter,
    priorityFilter,
    selectedTagId,
    searchQuery,
  ]);

  // Quadros e Cards filtrados para a aba Arquivados do projeto ativo
  const activeProjectArchivedColumns = useMemo(() => {
    if (!activeProject) return [];
    const cols = (activeProject.columns || []).filter((c) => !!c.isArchived);
    if (!searchQuery.trim()) return cols;
    const q = searchQuery.toLowerCase();
    return cols.filter((c) => c.title.toLowerCase().includes(q));
  }, [activeProject, searchQuery]);

  const activeProjectArchivedTasks = useMemo(() => {
    if (!activeProject) return [];
    const deletedSet = new Set(getDeletedTaskIds());
    return archivedWorkspaceTasks.filter((task) => {
      if (task.projectId !== activeProject.id || deletedSet.has(task.id)) return false;
      if (assigneeFilter !== 'all' && (!task.assigneeIds || !task.assigneeIds.includes(assigneeFilter))) {
        return false;
      }
      if (priorityFilter !== 'all' && (task.priority || 'none') !== priorityFilter) {
        return false;
      }
      if (selectedTagId !== 'all' && !task.tags?.some((t) => t.id === selectedTagId)) {
        return false;
      }
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
    activeProject,
    archivedWorkspaceTasks,
    assigneeFilter,
    priorityFilter,
    selectedTagId,
    searchQuery,
  ]);

  const activeProjectAllNonDeletedTasks = useMemo(() => {
    if (!activeProject) return [];
    const deletedSet = new Set(getDeletedTaskIds());
    return tasks.filter(
      (t) =>
        t &&
        t.id &&
        t.workspaceId === currentWorkspace.id &&
        t.projectId === activeProject.id &&
        !deletedSet.has(t.id)
    );
  }, [tasks, currentWorkspace.id, activeProject]);

  // Título e subtítulo do cabeçalho
  const headerDetails = useMemo(() => {
    if (viewMode === 'archived') {
      const archivedColsCount = activeProject
        ? (activeProject.columns || []).filter((c) => !!c.isArchived).length
        : 0;
      const archivedCardsCount = activeProject
        ? archivedWorkspaceTasks.filter((t) => t.projectId === activeProject.id).length
        : archivedWorkspaceTasks.length;
      return {
        title: `Arquivados · ${activeProject?.name || currentWorkspace.name}`,
        subtitle: `${archivedColsCount} ${archivedColsCount === 1 ? 'quadro' : 'quadros'} · ${archivedCardsCount} ${archivedCardsCount === 1 ? 'card arquivado' : 'cards arquivados'}`,
      };
    }
    if (viewMode === 'stock') {
      const projStockCount = activeProject
        ? stockWorkspaceTasks.filter((t) => t.projectId === activeProject.id).length
        : stockWorkspaceTasks.length;
      return {
        title: `Estoque · ${activeProject?.name || currentWorkspace.name}`,
        subtitle: `${projStockCount} ${projStockCount === 1 ? 'card em estoque' : 'cards em estoque'}`,
      };
    }
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
        subtitle: `${pending} pendentes · ${done} concluídas · ${activeProject.columns.filter((c) => !c.isArchived).length} colunas`,
      };
    }

    return {
      title: currentWorkspace.name,
      subtitle: `${workspaceTasks.length} cards no workspace`,
    };
  }, [viewMode, myTasksCount, workspaceMembers, workspaceProjects, activeProject, workspaceTasks, stockWorkspaceTasks, archivedWorkspaceTasks, currentWorkspace]);

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
    const targetProject =
      projects.find((p) => p.id === projId) ||
      workspaceProjects.find((p) => p.id === projId);

    // Garante que o projeto alvo exista no estado persistido caso tenha vindo do fallback
    if (targetProject && !projects.some((p) => p.id === targetProject.id)) {
      setProjects((prev) => (prev.some((p) => p.id === targetProject.id) ? prev : [...prev, targetProject]));
    }

    const colId = taskData.columnId || targetProject?.columns.find((c) => !c.isArchived)?.id || targetProject?.columns[0]?.id || 'col-1';
    const isCompleted = targetProject?.columns.find((c) => c.id === colId)?.isCompletedColumn || false;

    if (taskData.id) {
      // Edição de tarefa existente (U do CRUD Supabase)
      const existingTask =
        tasksRef.current.find((t) => t.id === taskData.id) ||
        tasks.find((t) => t.id === taskData.id);
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
        projectId: projId,
        columnId: colId,
        isCompleted,
        completedAt: isCompleted && !existingTask?.isCompleted ? new Date().toISOString() : existingTask?.completedAt,
        updatedAt: new Date().toISOString(),
      };

      const mergedSnapshot: Task | undefined = existingTask
        ? { ...existingTask, ...updatedFields }
        : undefined;

      setTasks((prev) => {
        const exists = prev.some((t) => t.id === taskData.id);
        if (!exists && mergedSnapshot) {
          return [mergedSnapshot, ...prev];
        }
        return prev.map((t) => {
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
        });
      });

      // Persistência assíncrona na nuvem do Supabase (com fallback upsert caso ainda não exista remotamente)
      StorageService.updateTaskAsync(taskData.id, updatedFields, mergedSnapshot);
      recordActivity('atualizou os detalhes da tarefa', taskData.title || existingTask?.title, projId, taskData.id);
    } else {
      // Criação de nova tarefa (C do CRUD Supabase)
      const newTaskId = buildUniqueTaskId('task');
      const nowIso = new Date().toISOString();
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
        comments: taskData.comments || [],
        activities: [
          {
            id: `act-init-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            userId: currentUser.id,
            action: `criou a tarefa no projeto ${targetProject?.name || 'Geral'}`,
            timestamp: nowIso,
          },
        ],
        attachments: taskData.attachments || [],
        frameColor: taskData.frameColor,
        fichaTecnica: taskData.fichaTecnica,
        productionRecords: taskData.productionRecords,
        isCompleted,
        isInStock: Boolean(taskData.isInStock),
        stockedAt: taskData.isInStock ? taskData.stockedAt || nowIso : null,
        stockedByUserId: taskData.isInStock ? taskData.stockedByUserId : undefined,
        stockedByUserName: taskData.isInStock ? taskData.stockedByUserName : undefined,
        order: tasksRef.current.filter(
          (t) => t.workspaceId === currentWorkspace.id && !t.isArchived && t.columnId === colId
        ).length,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);

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

    const nowIso = new Date().toISOString();
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    const batchUpdates: Array<{
      id: string;
      columnId: string;
      order: number;
      isCompleted: boolean;
      completedAt?: string | null;
      activities: Task['activities'];
    }> = [];

    tasksRef.current.forEach((t) => {
      const u = updateMap.get(t.id);
      if (!u) return;

      let isCompleted = t.isCompleted;
      let completedAt = t.completedAt;
      let activities = t.activities || [];

      if (u.columnId !== t.columnId) {
        const project = projects.find((p) => p.id === t.projectId);
        const targetCol = project?.columns.find((c) => c.id === u.columnId);
        isCompleted = targetCol?.isCompletedColumn || false;
        completedAt = isCompleted && !t.isCompleted ? nowIso : t.completedAt;
        activities = [
          {
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            userId: currentUser.id,
            action: `moveu para "${targetCol?.title || 'outra coluna'}"`,
            timestamp: nowIso,
          },
          ...(t.activities || []),
        ];
      }

      batchUpdates.push({
        id: t.id,
        columnId: u.columnId,
        order: u.order,
        isCompleted,
        completedAt,
        activities,
      });
    });

    const batchUpdateMap = new Map(batchUpdates.map((b) => [b.id, b]));

    setTasks((prev) =>
      prev.map((t) => {
        const b = batchUpdateMap.get(t.id);
        if (!b) return t;
        return {
          ...t,
          columnId: b.columnId,
          order: b.order,
          isCompleted: b.isCompleted,
          completedAt: b.completedAt,
          activities: b.activities,
          updatedAt: nowIso,
        };
      })
    );

    // Atualização em lote única no armazenamento e Supabase
    StorageService.batchUpdateTasksAsync(
      batchUpdates.length > 0
        ? batchUpdates
        : updates.map((u) => ({ id: u.id, columnId: u.columnId, order: u.order }))
    );

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
    const activeCols = project?.columns.filter((c) => !c.isArchived) || project?.columns || [];
    const completedCol = activeCols.find((c) => c.isCompletedColumn) || activeCols[activeCols.length - 1];
    const initialCol = activeCols[0];
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
    const newTaskId = buildUniqueTaskId('task');
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
      isInStock: false,
      stockedAt: null,
      stockedByUserId: undefined,
      stockedByUserName: undefined,
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
              isInStock: false,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    // Atualização assíncrona no Supabase
    StorageService.updateTaskAsync(taskId, {
      isArchived: true,
      archivedAt,
      isInStock: false,
    });

    recordActivity('arquivou o card', taskToArchive.title, taskToArchive.projectId, taskToArchive.id);

    showToast({
      type: 'info',
      message: `Card "${taskToArchive.title}" enviado para a aba Arquivados.`,
      actionLabel: canViewArchived ? 'Abrir Arquivados' : 'Desfazer',
      onAction: canViewArchived
        ? () => {
            setSelectedProjectId(taskToArchive.projectId);
            handleViewModeChange('archived');
          }
        : () => handleRestoreTask(taskId),
    });
  };

  const handleRemoveFromStock = (taskId: string) => {
    if (!canViewStock) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedAt = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isInStock: false,
              stockedAt: null,
              stockedByUserId: undefined,
              stockedByUserName: undefined,
              updatedAt,
            }
          : t
      )
    );

    StorageService.updateTaskAsync(taskId, {
      isInStock: false,
      stockedAt: null,
      stockedByUserId: undefined,
      stockedByUserName: undefined,
      updatedAt,
    });

    recordActivity('retirou o card do estoque', targetTask.title, targetTask.projectId, targetTask.id);

    showToast({
      type: 'success',
      message: `Card "${targetTask.title}" retirado do Estoque e devolvido ao quadro.`,
    });
  };

  const handleRestoreTask = (taskId: string, targetColumnId?: string) => {
    const taskToRestore = tasks.find((t) => t.id === taskId);
    if (!taskToRestore) return;

    const proj = projects.find((p) => p.id === taskToRestore.projectId);
    const activeCols = (proj?.columns || []).filter((c) => !c.isArchived);
    const preferredColId = targetColumnId || taskToRestore.columnId;
    const isPreferredActive = activeCols.some((c) => c.id === preferredColId);
    const nextColumnId = isPreferredActive
      ? preferredColId
      : activeCols[0]?.id || preferredColId;

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

  const handleOpenMasterPanel = () => {
    if (!isUserMaster(currentUser)) {
      showToast({
        type: 'error',
        message: 'Acesso negado: O Painel Master é de uso exclusivo do Super Administrador.',
      });
      setIsMasterModalOpen(false);
      return;
    }
    const localClients = StorageService.getClients();
    setClients(localClients);
    StorageService.fetchClientsCloud().then((res: any) => {
      if (res && res.success && Array.isArray(res.clients) && res.clients.length > 0) {
        setClients(res.clients);
      }
    });
    setIsMasterModalOpen(true);
  };

  // Proteção do Painel Master contra acessos indevidos
  useEffect(() => {
    if (isMasterModalOpen && !isUserMaster(currentUser)) {
      setIsMasterModalOpen(false);
    }
  }, [isMasterModalOpen, currentUser]);

  const handleCreateWorkspace = async (
    name: string,
    description: string,
    color: string,
    initialMembers?: Array<{ userId: string; role: WorkspaceRole }>
  ) => {
    try {
      const nowIso = new Date().toISOString();
      const newWsId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const assignedCompId = currentUser.companyId || currentUser.tenantId || newWsId;
      const baseSlug =
        name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'workspace';
      const maxOrder = workspaces.reduce(
        (max, w) => (typeof w.orderIndex === 'number' && w.orderIndex > max ? w.orderIndex : max),
        workspaces.length - 1
      );

      const memberEntries: Workspace['members'] = [
        { userId: currentUser.id, role: 'owner' as const, joinedAt: nowIso },
      ];
      const extraMembers = (initialMembers || []).filter(
        (m) => m?.userId && m.userId !== currentUser.id
      );
      extraMembers.forEach((m) => {
        if (!memberEntries.some((existing) => existing.userId === m.userId)) {
          memberEntries.push({
            userId: m.userId,
            role: m.role || 'member',
            joinedAt: nowIso,
          });
        }
      });

      const newWs: Workspace = {
        id: newWsId,
        name,
        slug: `${baseSlug}-${newWsId.slice(-5)}`,
        description,
        logoColor: color || '#173653',
        ownerId: currentUser.id,
        companyId: assignedCompId,
        clientStatus: 'active',
        clientPlan: 'profissional',
        members: memberEntries,
        createdAt: nowIso,
        orderIndex: maxOrder + 1,
      };

      // 1. Salva imediatamente no cache local e no banco de dados Supabase (workspace + workspace_members antes do projeto)
      const res = await StorageService.createWorkspaceAsync(newWs);
      const createdWs = res.workspace || newWs;

      // 2. Atualiza workspaceIds dos usuários inscritos já na criação
      if (extraMembers.length > 0) {
        const enrolledSet = new Set(extraMembers.map((m) => m.userId));
        const updatedUsers = StorageService.getUsers().map((u) => {
          if (!enrolledSet.has(u.id)) return u;
          const prevWsIds = Array.isArray(u.workspaceIds)
            ? u.workspaceIds
            : u.workspaceId
            ? [u.workspaceId]
            : [];
          return {
            ...u,
            workspaceId: u.workspaceId || createdWs.id,
            workspaceIds: Array.from(new Set([...prevWsIds, createdWs.id])),
          };
        });
        StorageService.saveUsers(updatedUsers, true);
        setUsers(updatedUsers);
        extraMembers.forEach((m) => {
          const roleLabel = ROLE_CONFIG[m.role]?.label || m.role;
          sendNotification(
            m.userId,
            'status_change',
            'Novo Workspace Atribuído!',
            `Você foi inscrito no workspace "${createdWs.name}" com o papel ${roleLabel}.`
          );
        });
      }

      // 3. Atualiza estados React (workspaces, workspace ativo, quadros e clientes)
      setWorkspaces((prev) => {
        const exists = prev.some((w) => w.id === createdWs.id);
        return exists ? prev.map((w) => (w.id === createdWs.id ? createdWs : w)) : [...prev, createdWs];
      });
      setCurrentWorkspace(createdWs);
      StorageService.setCurrentWorkspaceId(createdWs.id);
      setProjects(StorageService.getProjects());
      setClients(StorageService.getClients());
      setSelectedProjectId(res.project?.id || 'all');

      recordActivity(
        extraMembers.length > 0
          ? `criou o workspace "${createdWs.name}" e inscreveu ${extraMembers.length} usuário(s)`
          : `criou o workspace "${createdWs.name}"`
      );

      showToast({
        type: 'success',
        message:
          extraMembers.length > 0
            ? `Workspace "${createdWs.name}" criado com ${extraMembers.length} usuário(s) inscrito(s)!`
            : `Workspace "${createdWs.name}" criado com sucesso!`,
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

  const handleSaveWorkspace = (data: Partial<Workspace>, targetWorkspaceId?: string) => {
    const targetId = targetWorkspaceId || currentWorkspace.id;
    const baseWs = workspaces.find((w) => w.id === targetId) || currentWorkspace;

    let nextSlug = data.slug;
    if (typeof data.name === 'string' && data.name.trim() && data.name.trim() !== baseWs.name && !nextSlug) {
      const cleanBase =
        data.name
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'workspace';
      nextSlug = `${cleanBase}-${targetId.slice(-5)}`;
    }

    const nextUpdates: Partial<Workspace> = {
      ...data,
      ...(typeof data.name === 'string' ? { name: data.name.trim() } : {}),
      ...(nextSlug ? { slug: nextSlug } : {}),
    };
    const updatedWs = { ...baseWs, ...nextUpdates };

    setWorkspaces((prev) => {
      const exists = prev.some((w) => w.id === targetId);
      const all = sortWorkspacesByOrder(
        exists ? prev.map((w) => (w.id === targetId ? updatedWs : w)) : [...prev, updatedWs]
      );
      return all;
    });

    if (targetId === currentWorkspace.id) {
      setCurrentWorkspace(updatedWs);
    }

    StorageService.updateWorkspaceAsync(targetId, nextUpdates);

    if (typeof nextUpdates.name === 'string' && nextUpdates.name && nextUpdates.name !== baseWs.name) {
      recordActivity(`renomeou o workspace "${baseWs.name}" para "${nextUpdates.name}"`);
      showToast({
        type: 'success',
        message: `Workspace renomeado para "${nextUpdates.name}"!`,
      });
    } else {
      recordActivity('atualizou as configurações do workspace');
    }
  };

  const handleReorderWorkspaces = (orderedVisibleWorkspaces: Workspace[]) => {
    if (!Array.isArray(orderedVisibleWorkspaces) || orderedVisibleWorkspaces.length === 0) return;

    const visibleIds = new Set(orderedVisibleWorkspaces.map((w) => w.id));
    let nextVisibleCursor = 0;

    // Preserva os slots de workspaces não visíveis ao usuário atual e substitui os visíveis na nova ordem
    const mergedList = workspaces.map((ws) => {
      if (!visibleIds.has(ws.id)) return ws;
      const replacement = orderedVisibleWorkspaces[nextVisibleCursor];
      nextVisibleCursor += 1;
      return replacement || ws;
    });

    // Garante que qualquer item novo da lista visível também esteja incluído
    while (nextVisibleCursor < orderedVisibleWorkspaces.length) {
      const extra = orderedVisibleWorkspaces[nextVisibleCursor];
      nextVisibleCursor += 1;
      if (extra && !mergedList.some((w) => w.id === extra.id)) {
        mergedList.push(extra);
      }
    }

    const indexedList = mergedList.map((w, idx) => ({
      ...w,
      orderIndex: idx,
    }));

    setWorkspaces(indexedList);
    const updatedCurrent = indexedList.find((w) => w.id === currentWorkspace.id);
    if (updatedCurrent) {
      setCurrentWorkspace(updatedCurrent);
    }

    StorageService.reorderWorkspacesAsync(indexedList);
  };

  const handleInviteMember = async (email: string, role: WorkspaceRole) => {
    // Valida limite de membros do plano da empresa
    const limitCheck = StorageService.validateWorkspaceLimit(currentWorkspace.id, 'invite_member');
    if (!limitCheck.allowed) {
      setPlanLimitState({
        isOpen: true,
        limitType: 'invite_member',
        currentCount: limitCheck.currentCount,
        maxLimit: limitCheck.maxLimit,
        planName: limitCheck.planName,
        customMessage: limitCheck.reason,
      });
      return;
    }

    // Procura se usuário já existe com esse e-mail ou cria um novo perfil no banco remoto
    let targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const companyId = currentWorkspace.companyId || (currentWorkspace as any).tenantId || currentWorkspace.id;

    if (!targetUser) {
      const cleanEmail = email.trim().toLowerCase();
      const namePart = cleanEmail.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const reg = await StorageService.registerUser({
        name: formattedName,
        username: cleanEmail,
        email: cleanEmail,
        password: 'Opera@123',
        role,
        workspaceId: currentWorkspace.id,
        workspaceIds: [currentWorkspace.id],
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

  const handleEnrollUsersInWorkspace = async (
    entries: Array<{ userId: string; role: WorkspaceRole }>
  ) => {
    if (!entries || entries.length === 0) return;

    // Valida limite de membros do plano da empresa (Master possui acesso irrestrito)
    if (!isUserMaster(currentUser)) {
      const limitCheck = StorageService.validateWorkspaceLimit(currentWorkspace.id, 'invite_member');
      if (!limitCheck.allowed) {
        setPlanLimitState({
          isOpen: true,
          limitType: 'invite_member',
          currentCount: limitCheck.currentCount,
          maxLimit: limitCheck.maxLimit,
          planName: limitCheck.planName,
          customMessage: limitCheck.reason,
        });
        return;
      }
    }

    const res = await StorageService.enrollUsersInWorkspaceAsync(currentWorkspace.id, entries);
    setWorkspaces(res.workspaces);
    setUsers(res.users);
    if (res.updatedWorkspace) {
      setCurrentWorkspace(res.updatedWorkspace);
    }

    entries.forEach((entry) => {
      const targetUser = res.users.find((u) => u.id === entry.userId);
      const roleLabel = ROLE_CONFIG[entry.role]?.label || entry.role;
      if (targetUser) {
        recordActivity(`inscreveu ${targetUser.name} (${roleLabel}) no workspace "${currentWorkspace.name}"`);
        sendNotification(
          targetUser.id,
          'status_change',
          'Você foi inscrito em um Workspace!',
          `Você agora tem acesso ao workspace "${currentWorkspace.name}" como ${roleLabel}.`
        );
      }
    });

    const enrolledCount = res.enrolledIds.length || entries.length;
    showToast({
      type: 'success',
      message:
        enrolledCount === 1
          ? `Usuário inscrito no workspace "${currentWorkspace.name}" com sucesso!`
          : `${enrolledCount} usuários inscritos no workspace "${currentWorkspace.name}" com sucesso!`,
    });
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
    const updatedUsers = users.map((u) => {
      if (u.id !== userId) return u;
      const nextWsIds = Array.isArray(u.workspaceIds)
        ? u.workspaceIds.filter((id) => id !== currentWorkspace.id)
        : undefined;
      return {
        ...u,
        workspaceId: u.workspaceId === currentWorkspace.id ? nextWsIds?.[0] : u.workspaceId,
        workspaceIds: nextWsIds,
      };
    });
    setUsers(updatedUsers);
    StorageService.saveUsers(updatedUsers, true);
    const targetUser = users.find((u) => u.id === userId);
    recordActivity(`removeu ${targetUser?.name || 'membro'} do workspace`);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    if (!targetWs) return;

    // Verificar rigorosamente se o usuário autenticado tem autonomia (Dono do workspace ou Master)
    const isMaster = isUserMaster(currentUser);
    const member = targetWs.members?.find((m) => m.userId === currentUser.id);
    const isOwner = member?.role === 'owner' || (member as any)?.role === 'dono' || targetWs.ownerId === currentUser.id;

    if (!isOwner && !isMaster) {
      showToast({
        type: 'error',
        message: 'Ação não permitida: Apenas o Dono (Owner) ou o Super Administrador (Master) tem autonomia para excluir este workspace.',
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
      const existingProj = projects.find((p) => p.id === projectData.id);
      if (existingProj && Array.isArray(projectData.columns)) {
        const nextColIds = new Set(projectData.columns.map((c) => c.id));
        const removedColIds = new Set(
          (existingProj.columns || []).filter((c) => !nextColIds.has(c.id)).map((c) => c.id)
        );
        if (removedColIds.size > 0) {
          const orphanedTaskIds = tasks
            .filter((t) => t.projectId === existingProj.id && removedColIds.has(t.columnId))
            .map((t) => t.id);
          if (orphanedTaskIds.length > 0) {
            const orphanSet = new Set(orphanedTaskIds);
            setTasks((prev) => prev.filter((t) => !orphanSet.has(t.id)));
            StorageService.batchDeleteTasksAsync(orphanedTaskIds);
          }
        }
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === projectData.id ? { ...p, ...projectData } : p))
      );
      StorageService.updateProjectAsync(projectData.id, projectData);
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
      StorageService.createProjectAsync(newProj);
      recordActivity(`criou o novo projeto "${newProj.name}"`);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    // Autonomia: Apenas Master, Dono ou Administrador do Workspace podem excluir quadros
    const isMaster = isUserMaster(currentUser);
    const targetWs = workspaces.find((w) => w.id === proj.workspaceId) || currentWorkspace;
    const member = targetWs?.members?.find((m) => m.userId === currentUser.id);
    const role = (member?.role || currentUserRole || '').toLowerCase();
    const canDelete =
      isMaster ||
      role === 'owner' ||
      role === 'dono' ||
      role === 'admin' ||
      role === 'administrador' ||
      targetWs?.ownerId === currentUser.id;

    if (!canDelete) {
      showToast({
        type: 'error',
        message: 'Ação não permitida: Apenas Administradores ou Donos do Workspace têm autonomia para excluir quadros.',
      });
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
    if (selectedProjectId === projectId) setSelectedProjectId('all');
    StorageService.deleteProjectAsync(projectId);
    recordActivity(`excluiu o projeto "${proj.name}"`);
    showToast({
      type: 'info',
      message: `Quadro "${proj.name}" excluído com sucesso.`,
    });
  };

  const handleDeleteColumn = (
    columnId: string,
    targetProjectId?: string,
    deleteTasksWithColumn = false
  ) => {
    const targetProj = targetProjectId
      ? projects.find((p) => p.id === targetProjectId) || activeProject
      : activeProject;
    if (!targetProj) return;

    // Autonomia: Apenas Master, Dono ou Administrador do Workspace podem excluir quadros/colunas
    const isMasterUser = isUserMaster(currentUser);
    const member = currentWorkspace?.members?.find((m) => m.userId === currentUser.id);
    const role = (member?.role || currentUserRole || '').toLowerCase();
    const canDeleteCol =
      isMasterUser ||
      role === 'owner' ||
      role === 'dono' ||
      role === 'admin' ||
      role === 'administrador' ||
      currentWorkspace?.ownerId === currentUser.id;

    if (!canDeleteCol) {
      showToast({
        type: 'error',
        message: 'Ação não permitida: Apenas Administradores ou Donos do Workspace têm autonomia para excluir quadros.',
      });
      return;
    }

    const targetCol = targetProj.columns.find((c) => c.id === columnId);
    const activeColumns = targetProj.columns.filter((c) => !c.isArchived);

    if (activeColumns.length <= 1 && !targetCol?.isArchived) {
      showToast({
        type: 'error',
        message: 'O projeto precisa manter pelo menos um quadro ativo.',
      });
      return;
    }
    const deletedCol = targetCol;
    const remainingCols = targetProj.columns.filter((c) => c.id !== columnId);
    const fallbackCol = remainingCols.find((c) => !c.isArchived) || remainingCols[0];

    if (deleteTasksWithColumn || !fallbackCol) {
      const orphanedIds = tasks
        .filter((t) => t.projectId === targetProj.id && t.columnId === columnId)
        .map((t) => t.id);
      if (orphanedIds.length > 0) {
        const orphanSet = new Set(orphanedIds);
        setTasks((prev) => prev.filter((t) => !orphanSet.has(t.id)));
        StorageService.batchDeleteTasksAsync(orphanedIds);
      }
    } else {
      // Move tarefas do quadro excluído para o quadro remanescente e persiste no servidor/Supabase
      const movedAt = new Date().toISOString();
      const tasksToMove = tasks.filter(
        (t) => t.projectId === targetProj.id && t.columnId === columnId
      );
      if (tasksToMove.length > 0) {
        setTasks((prev) =>
          prev.map((t) =>
            t.projectId === targetProj.id && t.columnId === columnId
              ? { ...t, columnId: fallbackCol.id, updatedAt: movedAt }
              : t
          )
        );
        StorageService.batchUpdateTasksAsync(
          tasksToMove.map((t) => ({ id: t.id, columnId: fallbackCol.id }))
        );
      }
    }

    // Atualiza quadros/colunas do projeto
    const updatedColumns = remainingCols.map((c, idx) => ({ ...c, order: idx }));
    setProjects((prev) =>
      prev.map((p) =>
        p.id === targetProj.id
          ? {
              ...p,
              columns: updatedColumns,
            }
          : p
      )
    );
    StorageService.updateProjectAsync(targetProj.id, { columns: updatedColumns });

    recordActivity(`excluiu o quadro "${deletedCol?.title || 'Quadro'}" do projeto "${targetProj.name}"`);
    showToast({
      type: 'info',
      message: deleteTasksWithColumn
        ? `Quadro "${deletedCol?.title || 'Quadro'}" excluído permanentemente.`
        : `Quadro "${deletedCol?.title || 'Quadro'}" excluído. Tarefas transferidas para "${fallbackCol?.title || 'outro quadro'}".`,
    });
  };

  const buildClonedTask = (
    origTask: Task,
    targetProjectId: string,
    targetColumnId: string,
    indexSuffix: number,
    resetCompletion = false,
    targetWorkspaceId?: string
  ): Task => {
    const nowIso = new Date().toISOString();
    const stamp = `${Date.now()}-${indexSuffix}-${Math.random().toString(36).slice(2, 5)}`;
    const newTaskId = buildUniqueTaskId('task');

    return {
      ...origTask,
      id: newTaskId,
      workspaceId: targetWorkspaceId || origTask.workspaceId || currentWorkspace.id,
      projectId: targetProjectId,
      columnId: targetColumnId,
      order: typeof origTask.order === 'number' ? origTask.order : indexSuffix,
      isCompleted: resetCompletion ? false : origTask.isCompleted,
      completedAt: resetCompletion ? null : (origTask.completedAt ?? null),
      checklist: (origTask.checklist || []).map((item, cIdx) => ({
        ...item,
        id: `check-${stamp}-${cIdx}`,
      })),
      attachments: origTask.attachments
        ? origTask.attachments.map((att, aIdx) => ({
            ...att,
            id: `att-${stamp}-${aIdx}`,
            uploadedAt: att.uploadedAt || nowIso,
          }))
        : [],
      fichaTecnica: origTask.fichaTecnica
        ? {
            ...origTask.fichaTecnica,
            ingredientes: (origTask.fichaTecnica.ingredientes || []).map((ing, iIdx) => ({
              ...ing,
              id: `ing-${stamp}-${iIdx}`,
            })),
          }
        : null,
      productionRecords: origTask.productionRecords ? [...origTask.productionRecords] : [],
      comments: (origTask.comments || []).map((cmt, mIdx) => ({
        ...cmt,
        id: `cmt-${stamp}-${mIdx}`,
      })),
      activities: [
        {
          id: `act-${stamp}`,
          userId: currentUser.id,
          action: `duplicou o card "${origTask.title}"`,
          timestamp: nowIso,
        },
      ],
      tags: [...(origTask.tags || [])],
      assigneeIds: [...(origTask.assigneeIds || [])],
      isArchived: false,
      archivedAt: undefined,
      isInStock: false,
      stockedAt: null,
      stockedByUserId: undefined,
      stockedByUserName: undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const handleDuplicateColumn = (columnId: string, includeCards: boolean) => {
    if (!activeProject) return;
    const cols = activeProject.columns || [];
    const origIdx = cols.findIndex((c) => c.id === columnId);
    if (origIdx === -1) return;

    const origCol = cols[origIdx];
    const newColId = `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCol: BoardColumn = {
      ...origCol,
      id: newColId,
      title: `${origCol.title} (Cópia)`,
      isCompletedColumn: false,
      isArchived: false,
    };

    const nextColsRaw = [...cols];
    nextColsRaw.splice(origIdx + 1, 0, newCol);
    const updatedColumns = nextColsRaw.map((c, idx) => ({ ...c, order: idx }));

    const clonedTasks: Task[] = includeCards
      ? tasks
          .filter((t) => t.projectId === activeProject.id && t.columnId === columnId && !t.isArchived)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((t, idx) =>
            buildClonedTask(t, activeProject.id, newColId, idx, true, activeProject.workspaceId)
          )
      : [];

    // Persiste colunas + cards clonados de forma atômica (localStorage imediato -> servidor -> Supabase sequencial)
    StorageService.duplicateColumnWithTasksAsync(activeProject.id, updatedColumns, clonedTasks);

    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, columns: updatedColumns } : p))
    );

    if (includeCards) {
      if (clonedTasks.length > 0) {
        setTasks((prev) => [...clonedTasks, ...prev]);
      }

      recordActivity(
        `duplicou a coluna "${origCol.title}" com ${clonedTasks.length} card(s) no quadro "${activeProject.name}"`
      );
      showToast({
        type: 'success',
        message: `Coluna "${origCol.title}" duplicada com ${clonedTasks.length} card(s)!`,
      });
    } else {
      recordActivity(`copiou a estrutura da coluna "${origCol.title}" no quadro "${activeProject.name}"`);
      showToast({
        type: 'success',
        message: `Coluna "${origCol.title}" copiada com sucesso!`,
      });
    }
  };

  const handleReorderColumns = (orderedActiveColumnIds: string[]) => {
    if (!activeProject || !Array.isArray(orderedActiveColumnIds) || orderedActiveColumnIds.length === 0) {
      return;
    }

    const currentCols = activeProject.columns || [];
    const activeById = new Map<string, BoardColumn>();
    const archivedCols: BoardColumn[] = [];

    currentCols.forEach((col) => {
      if (col.isArchived) {
        archivedCols.push(col);
      } else {
        activeById.set(col.id, col);
      }
    });

    const reorderedActive: BoardColumn[] = [];
    const seen = new Set<string>();
    orderedActiveColumnIds.forEach((id) => {
      const col = activeById.get(id);
      if (col && !seen.has(id)) {
        seen.add(id);
        reorderedActive.push(col);
      }
    });
    // Garante que nenhuma coluna ativa fique de fora
    currentCols.forEach((col) => {
      if (!col.isArchived && !seen.has(col.id)) {
        seen.add(col.id);
        reorderedActive.push(col);
      }
    });

    const updatedColumns: BoardColumn[] = [...reorderedActive, ...archivedCols].map((c, idx) => ({
      ...c,
      order: idx,
    }));

    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, columns: updatedColumns } : p))
    );
    StorageService.updateProjectAsync(activeProject.id, { columns: updatedColumns });
    recordActivity(`reordenou os quadros em "${activeProject.name}"`);
  };

  const handleUpdateColumn = (
    columnId: string,
    updates: { title: string; color: string }
  ) => {
    if (!activeProject) return;
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) return;

    const prevCol = (activeProject.columns || []).find((c) => c.id === columnId);
    if (!prevCol) return;

    const updatedColumns: BoardColumn[] = (activeProject.columns || []).map((c) =>
      c.id === columnId
        ? { ...c, title: trimmedTitle, color: updates.color || c.color }
        : c
    );

    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, columns: updatedColumns } : p))
    );
    StorageService.updateProjectAsync(activeProject.id, { columns: updatedColumns });

    recordActivity(
      prevCol.title !== trimmedTitle
        ? `renomeou o quadro "${prevCol.title}" para "${trimmedTitle}" em "${activeProject.name}"`
        : `atualizou a cor do quadro "${trimmedTitle}" em "${activeProject.name}"`
    );
    showToast({
      type: 'success',
      message: `Quadro "${trimmedTitle}" atualizado com sucesso!`,
    });
  };

  const handleArchiveColumn = (
    columnId: string,
    restore = false,
    targetProjectId?: string
  ) => {
    const targetProj = targetProjectId
      ? projects.find((p) => p.id === targetProjectId) || activeProject
      : activeProject;
    if (!targetProj) return;

    const isMasterUser = isUserMaster(currentUser);
    const member = currentWorkspace?.members?.find((m) => m.userId === currentUser.id);
    const role = (member?.role || currentUserRole || '').toLowerCase();
    const canArchiveCol =
      isMasterUser ||
      role === 'owner' ||
      role === 'dono' ||
      role === 'admin' ||
      role === 'administrador' ||
      currentWorkspace?.ownerId === currentUser.id;

    if (!canArchiveCol) {
      showToast({
        type: 'error',
        message: 'Ação não permitida: Apenas Administradores ou Donos do Workspace podem arquivar quadros.',
      });
      return;
    }

    const cols = targetProj.columns || [];
    const targetCol = cols.find((c) => c.id === columnId);
    if (!targetCol) return;

    const activeCols = cols.filter((c) => !c.isArchived);
    if (!restore && activeCols.length <= 1) {
      showToast({
        type: 'error',
        message: 'O projeto precisa manter pelo menos um quadro ativo.',
      });
      return;
    }

    const archivedAt = !restore ? new Date().toISOString() : undefined;
    const updatedColumns = cols.map((c) =>
      c.id === columnId ? { ...c, isArchived: !restore, archivedAt } : c
    );

    setProjects((prev) =>
      prev.map((p) => (p.id === targetProj.id ? { ...p, columns: updatedColumns } : p))
    );
    StorageService.updateProjectAsync(targetProj.id, { columns: updatedColumns });

    recordActivity(
      `${restore ? 'restaurou' : 'arquivou'} o quadro "${targetCol.title}" no projeto "${targetProj.name}"`
    );
    showToast({
      type: restore ? 'success' : 'info',
      message: restore
        ? `Quadro "${targetCol.title}" restaurado para o projeto.`
        : `Quadro "${targetCol.title}" enviado para a aba Arquivados do projeto.`,
      actionLabel: !restore ? 'Abrir Arquivados' : undefined,
      onAction: !restore
        ? () => {
            setSelectedProjectId(targetProj.id);
            handleViewModeChange('archived');
          }
        : undefined,
    });
  };

  const handleDuplicateProject = (projectId: string, includeCards: boolean) => {
    const origProj = projects.find((p) => p.id === projectId);
    if (!origProj) return;

    const check = StorageService.validateWorkspaceLimit(origProj.workspaceId, 'create_board');
    if (!check.allowed) {
      setPlanLimitState({
        isOpen: true,
        limitType: 'create_board',
        currentCount: check.currentCount,
        maxLimit: check.maxLimit,
        planName: check.planName,
        customMessage: check.reason,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProjId = `proj-${stamp}`;

    const colIdMap = new Map<string, string>();
    const clonedColumns: BoardColumn[] = (origProj.columns || []).map((col, idx) => {
      const newColId = `col-${stamp}-${idx}`;
      colIdMap.set(col.id, newColId);
      return {
        ...col,
        id: newColId,
      };
    });

    const newProj: Project = {
      ...origProj,
      id: newProjId,
      name: `${origProj.name} (Cópia)`,
      columns: clonedColumns,
      memberIds: [...(origProj.memberIds || [])],
      isArchived: false,
      createdAt: nowIso,
    };

    const activeFirstColId = clonedColumns.find((c) => !c.isArchived)?.id || clonedColumns[0]?.id || 'col-1';
    const clonedTasks: Task[] = includeCards
      ? tasks
          .filter((t) => t.projectId === origProj.id && !t.isArchived)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((t, idx) =>
            buildClonedTask(
              t,
              newProjId,
              colIdMap.get(t.columnId) || activeFirstColId,
              idx,
              false,
              origProj.workspaceId
            )
          )
      : [];

    // Persiste quadro + cards clonados de forma atômica (localStorage imediato -> servidor -> Supabase sequencial)
    StorageService.duplicateProjectWithTasksAsync(newProj, clonedTasks);

    setProjects((prev) => [...prev, newProj]);
    if (origProj.workspaceId === currentWorkspace.id) {
      setSelectedProjectId(newProjId);
    }
    if (clonedTasks.length > 0) {
      setTasks((prev) => [...clonedTasks, ...prev]);
    }

    recordActivity(
      includeCards
        ? `duplicou o quadro "${origProj.name}" com ${clonedTasks.length} card(s)`
        : `copiou a estrutura do quadro "${origProj.name}"`
    );
    showToast({
      type: 'success',
      message: includeCards
        ? `Quadro "${origProj.name}" duplicado com ${clonedTasks.length} card(s)!`
        : `Quadro "${origProj.name}" copiado com sucesso!`,
    });
  };

  const handleArchiveProject = (projectId: string, isArchived: boolean) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isArchived } : p))
    );
    if (isArchived && selectedProjectId === projectId) {
      setSelectedProjectId('all');
    } else if (!isArchived) {
      setSelectedProjectId(projectId);
    }
    StorageService.updateProjectAsync(projectId, { isArchived });
    const proj = projects.find((p) => p.id === projectId);
    recordActivity(`${isArchived ? 'arquivou' : 'desarquivou'} o quadro "${proj?.name || 'Quadro'}"`);
    showToast({
      type: 'info',
      message: isArchived
        ? `Quadro "${proj?.name || 'Quadro'}" arquivado.`
        : `Quadro "${proj?.name || 'Quadro'}" restaurado com sucesso.`,
      actionLabel: isArchived ? 'Desfazer' : undefined,
      onAction: isArchived ? () => handleArchiveProject(projectId, false) : undefined,
    });
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

  // Fluxo Obrigatório de Validação e Isolamento de Sessão de Convite
  if (isInviteValidating && inviteData) {
    return (
      <InviteValidationScreen
        inviteData={inviteData}
        onProceedToLogin={(data) => {
          setIsInviteValidating(false);
          setShowSplash(false);
          setIsAuthenticated(false);
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {}
        }}
      />
    );
  }

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
        initialLogin={inviteData?.login || ''}
        inviteInfo={inviteData}
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
        onRenameWorkspace={(wsId, newName) => handleSaveWorkspace({ name: newName }, wsId)}
        onReorderWorkspaces={handleReorderWorkspaces}
        onOpenCreateWorkspaceModal={() => setIsCreateWorkspaceModalOpen(true)}
        onOpenWorkspaceSettingsModal={() => setIsWorkspaceModalOpen(true)}
        projects={workspaceProjects}
        archivedProjects={archivedWorkspaceProjects}
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
        onOpenNewProjectModal={handleOpenCreateBoard}
        onEditProject={(p) => {
          setProjectToEdit(p);
          setIsProjectModalOpen(true);
        }}
        onDuplicateProject={handleDuplicateProject}
        onArchiveProject={handleArchiveProject}
        onDeleteProject={handleDeleteProject}
        archivedTasks={archivedWorkspaceTasks}
        stockTasks={stockWorkspaceTasks}
        onRestoreTask={handleRestoreTask}
        onPermanentDeleteTask={handlePermanentDeleteTask}
        onSelectArchivedTask={(task) => {
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onRestoreColumn={(projId, colId) => handleArchiveColumn(colId, true, projId)}
        onPermanentDeleteColumn={(projId, colId) => handleDeleteColumn(colId, projId, true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetData={handleResetData}
        onOpenSyncSettings={() => setIsSyncSettingsOpen(true)}
        onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
        onOpenMasterPanel={handleOpenMasterPanel}
        onOpenRegisterUserModal={() => {
          const check = StorageService.validateWorkspaceLimit(currentWorkspace.id, 'invite_member');
          if (!check.allowed) {
            setPlanLimitState({
              isOpen: true,
              limitType: 'invite_member',
              currentCount: check.currentCount,
              maxLimit: check.maxLimit,
              planName: check.planName,
              customMessage: check.reason,
            });
            return;
          }
          setIsRegisterUserOpen(true);
        }}
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
          onOpenMasterPanel={handleOpenMasterPanel}
          canRegisterUser={canRegisterUser(currentUserRole, isMaster)}
          onOpenRegisterUserModal={() => setIsRegisterUserOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          onOpenNewTaskModal={() => {
            setTaskToEdit(null);
            setDefaultColumnId(activeProject?.columns.find((c) => !c.isArchived)?.id || activeProject?.columns[0]?.id);
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
                onCreateFirstBoard={handleOpenCreateBoard}
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
                    onArchiveColumn={(colId) => handleArchiveColumn(colId, false)}
                    onDuplicateColumn={handleDuplicateColumn}
                    onReorderColumns={handleReorderColumns}
                    onUpdateColumn={handleUpdateColumn}
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
                      setDefaultColumnId(activeProject?.columns.find((c) => !c.isArchived)?.id || activeProject?.columns[0]?.id);
                      setIsTaskModalOpen(true);
                    }}
                  />
                )}

                {viewMode === 'stock' && canViewStock && activeProject && (
                  <StockView
                    project={activeProject}
                    tasks={filteredStockTasks}
                    workspaceMembers={workspaceMembers}
                    currentUserRole={currentUserRole}
                    isMaster={isMaster}
                    onEditTask={(task) => {
                      setTaskToEdit(task);
                      setIsTaskModalOpen(true);
                    }}
                    onRemoveFromStock={handleRemoveFromStock}
                    onArchiveTask={handleArchiveTask}
                    onBackToBoard={() => handleViewModeChange('kanban')}
                  />
                )}

                {viewMode === 'archived' && canViewArchived && activeProject && (
                  <ArchivedView
                    project={activeProject}
                    archivedColumns={activeProjectArchivedColumns}
                    archivedTasks={activeProjectArchivedTasks}
                    allProjectTasks={activeProjectAllNonDeletedTasks}
                    workspaceMembers={workspaceMembers}
                    onSelectTask={(task) => {
                      setTaskToEdit(task);
                      setIsTaskModalOpen(true);
                    }}
                    onRestoreTask={handleRestoreTask}
                    onPermanentDeleteTask={handlePermanentDeleteTask}
                    onRestoreColumn={(projId, colId) => handleArchiveColumn(colId, true, projId)}
                    onPermanentDeleteColumn={(projId, colId) =>
                      handleDeleteColumn(colId, projId, true)
                    }
                    onBackToBoard={() => handleViewModeChange('kanban')}
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
            setDefaultColumnId(activeProject?.columns.find((c) => !c.isArchived)?.id || activeProject?.columns[0]?.id);
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
        onCardSentToStock={(taskTitle, projId) => {
          recordActivity('enviou o card para o estoque', taskTitle, projId);
          showToast({
            type: 'success',
            message: `Card "${taskTitle}" direcionado para a aba Estoque!`,
            actionLabel: 'Abrir Estoque',
            onAction: () => {
              if (projId) setSelectedProjectId(projId);
              handleViewModeChange('stock');
            },
          });
        }}
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
        allUsers={users}
        registeredUsers={enrollableUsers}
        currentUserId={currentUser.id}
        currentUser={currentUser}
        allWorkspaces={userVisibleWorkspaces}
        onSaveWorkspace={handleSaveWorkspace}
        onInviteMember={handleInviteMember}
        onEnrollUsers={handleEnrollUsersInWorkspace}
        onChangeMemberRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
        onDeleteWorkspace={handleDeleteWorkspace}
        onUserCreated={(newUser, role, primaryWsId, selectedWsIds) => {
          const freshUsers = StorageService.getUsers();
          setUsers(freshUsers);
          const targetWsIds = selectedWsIds && selectedWsIds.length > 0 ? selectedWsIds : [primaryWsId || currentWorkspace.id];
          const fromStorage = StorageService.getWorkspaces();
          setWorkspaces((prev) => {
            const map = new Map<string, Workspace>();
            for (const ws of prev) map.set(ws.id, ws);
            for (const ws of fromStorage) {
              const existing = map.get(ws.id);
              if (!existing) {
                map.set(ws.id, ws);
              } else {
                const membersMap = new Map<string, Workspace['members'][number]>();
                for (const m of existing.members || []) membersMap.set(m.userId, m);
                for (const m of ws.members || []) membersMap.set(m.userId, m);
                map.set(ws.id, { ...existing, ...ws, members: Array.from(membersMap.values()) });
              }
            }
            const merged = Array.from(map.values()).map((ws) => {
              if (!targetWsIds.includes(ws.id)) return ws;
              if ((ws.members || []).some((m) => m.userId === newUser.id)) return ws;
              return {
                ...ws,
                members: [...(ws.members || []), { userId: newUser.id, role, joinedAt: new Date().toISOString() }],
              };
            });
            StorageService.saveWorkspaces(merged, true);
            const updatedCurrentWs = merged.find((w) => w.id === currentWorkspace.id);
            if (updatedCurrentWs) setCurrentWorkspace(updatedCurrentWs);
            return merged;
          });
          showToast({
            type: 'success',
            message: `Usuário ${newUser.name} cadastrado e vinculado com sucesso!`,
          });
        }}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        availableUsers={enrollableUsers}
        currentUserId={currentUser.id}
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
          const refreshedCurrentWs = updated.find((w) => w.id === currentWorkspace.id);
          if (refreshedCurrentWs) {
            setCurrentWorkspace(refreshedCurrentWs);
          }
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
        onRenameWorkspace={(wsId, newName) => handleSaveWorkspace({ name: newName }, wsId)}
        onReorderWorkspaces={handleReorderWorkspaces}
        onDuplicateProject={handleDuplicateProject}
        onArchiveProject={handleArchiveProject}
        onDeleteProject={handleDeleteProject}
        onEnterSupportMode={handleEnterSupportMode}
        onResetComplete={() => {
          const freshUsers = StorageService.getUsers();
          const freshWorkspaces = StorageService.getWorkspaces();
          const freshProjects = StorageService.getProjects();
          const freshClients = StorageService.getClients();
          const mainWs = freshWorkspaces[0];
          const mainProj = freshProjects.find((p) => p.workspaceId === mainWs?.id) || freshProjects[0];

          setUsers(freshUsers);
          if (freshUsers[0]) {
            setCurrentUser(freshUsers[0]);
            currentUserRef.current = freshUsers[0];
          }
          setWorkspaces(freshWorkspaces);
          if (mainWs) {
            setCurrentWorkspace(mainWs);
            currentWorkspaceRef.current = mainWs;
          }
          setProjects(freshProjects);
          if (mainProj) {
            setSelectedProjectId(mainProj.id);
          }
          setTasks([]);
          setActivities([]);
          setNotifications([]);
          setClients(freshClients);
          setSupportMode(null);
        }}
        onShowToast={showToast}
      />

      {/* Modal de Cadastro de Novos Usuários (Dono e Administrador) */}
      <RegisterUserModal
        isOpen={isRegisterUserOpen}
        onClose={() => setIsRegisterUserOpen(false)}
        workspaces={userVisibleWorkspaces}
        workspaceId={currentWorkspace.id}
        currentUser={currentUser}
        onUserCreated={(newUser, role, primaryWsId, selectedWsIds) => {
          const freshUsers = StorageService.getUsers();
          setUsers(freshUsers);
          const targetWsIds = selectedWsIds && selectedWsIds.length > 0 ? selectedWsIds : [primaryWsId || currentWorkspace.id];
          const fromStorage = StorageService.getWorkspaces();
          setWorkspaces((prev) => {
            const map = new Map<string, Workspace>();
            for (const ws of prev) map.set(ws.id, ws);
            for (const ws of fromStorage) {
              const existing = map.get(ws.id);
              if (!existing) {
                map.set(ws.id, ws);
              } else {
                const membersMap = new Map<string, Workspace['members'][number]>();
                for (const m of existing.members || []) membersMap.set(m.userId, m);
                for (const m of ws.members || []) membersMap.set(m.userId, m);
                map.set(ws.id, { ...existing, ...ws, members: Array.from(membersMap.values()) });
              }
            }
            const merged = Array.from(map.values()).map((ws) => {
              if (!targetWsIds.includes(ws.id)) return ws;
              if ((ws.members || []).some((m) => m.userId === newUser.id)) return ws;
              return {
                ...ws,
                members: [...(ws.members || []), { userId: newUser.id, role, joinedAt: new Date().toISOString() }],
              };
            });
            StorageService.saveWorkspaces(merged, true);
            const updatedCurrentWs = merged.find((w) => w.id === currentWorkspace.id);
            if (updatedCurrentWs) setCurrentWorkspace(updatedCurrentWs);
            return merged;
          });
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

      {/* Modal de Alerta / Limite de Plano Atingido */}
      {planLimitState?.isOpen && (
        <PlanLimitExceededModal
          isOpen={planLimitState.isOpen}
          onClose={() => setPlanLimitState(null)}
          limitType={planLimitState.limitType}
          currentCount={planLimitState.currentCount}
          maxLimit={planLimitState.maxLimit}
          planName={planLimitState.planName}
          customMessage={planLimitState.customMessage}
          onOpenUpgradeModal={() => {
            setPlanLimitState(null);
            setIsBillingPlansOpen(true);
          }}
        />
      )}

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
