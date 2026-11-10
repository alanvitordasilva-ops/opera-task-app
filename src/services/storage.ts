import {
  User,
  Workspace,
  Project,
  Task,
  Tag,
  WorkspaceActivity,
  Notification,
  BoardColumn,
  Priority,
  SaveStatus,
  SaveState,
  FichaTecnica,
  WorkspaceRole,
  ClientCompany,
  ClientStatus,
  ClientPlan,
  PaymentStatus,
  PLAN_CONFIGS,
  SupportModeState,
  SubscriptionPlan,
  DEFAULT_SUBSCRIPTION_PLANS,
  normalizePlan,
} from '../types/index.ts';
import { SupabaseService } from './supabaseService.ts';
import { RealtimeService, SyncEntity } from './realtimeService.ts';
import { isUserMaster } from '../utils/helpers.ts';

const STORAGE_KEYS = {
  USERS: 'operatask_clean_v1_users',
  CURRENT_USER_ID: 'operatask_clean_v1_current_user_id',
  AUTH_STATUS: 'operatask_clean_v1_auth_status',
  WORKSPACES: 'operatask_clean_v1_workspaces',
  CURRENT_WORKSPACE_ID: 'operatask_clean_v1_current_workspace_id',
  PROJECTS: 'operatask_clean_v1_projects',
  TASKS: 'operatask_clean_v1_tasks',
  TAGS: 'operatask_clean_v1_tags',
  ACTIVITIES: 'operatask_clean_v1_activities',
  NOTIFICATIONS: 'operatask_clean_v1_notifications',
  THEME: 'operatask_clean_v1_theme',
  VIEW_MODE: 'operatask_clean_v1_view_mode',
  FICHAS_TECNICAS: 'operatask_clean_v1_fichas_tecnicas',
  CLIENTS: 'operatask_clean_v1_clients',
  SUPPORT_MODE: 'operatask_clean_v1_support_mode',
  SUBSCRIPTION_PLANS: 'operatask_clean_v1_subscription_plans',
};

export const MASTER_USER: User = {
  id: 'user-master-alan',
  name: 'Alan Silva (Master)',
  username: 'alan',
  email: 'alanvitordasilva@gmail.com.br',
  password: '273021',
  avatarColor: '#173653',
  title: 'Super Administrador / Master',
  systemRole: 'master',
  isSuperAdmin: true,
  status: 'active',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  bio: 'Conta Master com acesso total e irrestrito a todas as configurações, workspaces e dados do OperaTask.',
};

export const DEFAULT_USERS: User[] = [
  MASTER_USER,
];

export const DEFAULT_FICHAS_TECNICAS: FichaTecnica[] = [
  {
    id: 'ft-pao-frances',
    nomeItem: 'Pão Francês Tradicional',
    rendimento: '50 unidades (aprox. 5 Kg)',
    observacoes: 'Receita padrão de panificação artesanal com fermentação biológica controlada.',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ingredientes: [
      { id: 'ing-pf-1', nome: 'Farinha de Trigo Especial', quantidade: '5', unidade: 'Kg' },
      { id: 'ing-pf-2', nome: 'Água Gelada Filtrada', quantidade: '3', unidade: 'Litros' },
      { id: 'ing-pf-3', nome: 'Fermento Biológico Fresco', quantidade: '0.15', unidade: 'Kg' },
      { id: 'ing-pf-4', nome: 'Sal Refinado', quantidade: '0.10', unidade: 'Kg' },
      { id: 'ing-pf-5', nome: 'Melhorador de Farinha', quantidade: '0.05', unidade: 'Kg' },
    ],
  },
  {
    id: 'ft-bolo-cenoura',
    nomeItem: 'Bolo de Cenoura Caseiro',
    rendimento: '2 formas de 25cm (aprox. 3 Kg)',
    observacoes: 'Bolo fofinho tradicional com cobertura de chocolate.',
    updatedAt: '2026-01-20T14:30:00.000Z',
    ingredientes: [
      { id: 'ing-bc-1', nome: 'Farinha de Trigo', quantidade: '1.2', unidade: 'Kg' },
      { id: 'ing-bc-2', nome: 'Cenouras Frescas Raladas', quantidade: '0.8', unidade: 'Kg' },
      { id: 'ing-bc-3', nome: 'Açúcar Cristal', quantidade: '0.9', unidade: 'Kg' },
      { id: 'ing-bc-4', nome: 'Óleo Vegetal', quantidade: '0.4', unidade: 'Litros' },
      { id: 'ing-bc-5', nome: 'Leite Integral', quantidade: '0.3', unidade: 'Litros' },
      { id: 'ing-bc-6', nome: 'Fermento Químico em Pó', quantidade: '0.04', unidade: 'Kg' },
    ],
  },
  {
    id: 'ft-pizza-artesanal',
    nomeItem: 'Massa de Pizza Artesanal',
    rendimento: '10 discos grandes (aprox. 4.5 Kg)',
    observacoes: 'Massa leve com maturação de 24h na câmara fria.',
    updatedAt: '2026-02-01T11:15:00.000Z',
    ingredientes: [
      { id: 'ing-pz-1', nome: 'Farinha de Trigo Tipo 00', quantidade: '3.5', unidade: 'Kg' },
      { id: 'ing-pz-2', nome: 'Água Mineral Gelada', quantidade: '2.1', unidade: 'Litros' },
      { id: 'ing-pz-3', nome: 'Azeite de Oliva Extra Virgem', quantidade: '0.15', unidade: 'Litros' },
      { id: 'ing-pz-4', nome: 'Sal Marinho', quantidade: '0.07', unidade: 'Kg' },
      { id: 'ing-pz-5', nome: 'Fermento Biológico Seco', quantidade: '0.02', unidade: 'Kg' },
    ],
  },
  {
    id: 'ft-molho-pomodoro',
    nomeItem: 'Molho de Tomate Rústico Pomodoro',
    rendimento: 'Aprox. 7 Litros',
    observacoes: 'Cozimento lento em fogo brando por 4 horas.',
    updatedAt: '2026-02-10T09:00:00.000Z',
    ingredientes: [
      { id: 'ing-mp-1', nome: 'Tomates San Marzano Frescos', quantidade: '8', unidade: 'Kg' },
      { id: 'ing-mp-2', nome: 'Água Mineral', quantidade: '1.5', unidade: 'Litros' },
      { id: 'ing-mp-3', nome: 'Azeite de Oliva Extra Virgem', quantidade: '0.35', unidade: 'Litros' },
      { id: 'ing-mp-4', nome: 'Alho Fresco Picado', quantidade: '0.12', unidade: 'Kg' },
      { id: 'ing-mp-5', nome: 'Manjericão Fresco', quantidade: '0.10', unidade: 'Kg' },
      { id: 'ing-mp-6', nome: 'Sal Marinho', quantidade: '0.08', unidade: 'Kg' },
    ],
  },
  {
    id: 'ft-recheio-chocolate',
    nomeItem: 'Recheio de Chocolate Trufado',
    rendimento: 'Aprox. 5.5 Kg',
    observacoes: 'Emulsão homogênea a 45°C.',
    updatedAt: '2026-02-15T16:45:00.000Z',
    ingredientes: [
      { id: 'ing-rc-1', nome: 'Chocolate Meio Amargo 54%', quantidade: '2.5', unidade: 'Kg' },
      { id: 'ing-rc-2', nome: 'Creme de Leite Fresco', quantidade: '1.8', unidade: 'Litros' },
      { id: 'ing-rc-3', nome: 'Leite Condensado', quantidade: '1.2', unidade: 'Kg' },
      { id: 'ing-rc-4', nome: 'Manteiga sem Sal', quantidade: '0.25', unidade: 'Kg' },
    ],
  },
];

export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-frontend', name: 'Frontend', color: '#2563eb' },
  { id: 'tag-design', name: 'Design & UX', color: '#db2777' },
  { id: 'tag-backend', name: 'Backend & API', color: '#ea580c' },
  { id: 'tag-bug', name: 'Bug Crítico', color: '#dc2626' },
  { id: 'tag-feature', name: 'Nova Feature', color: '#059669' },
  { id: 'tag-devops', name: 'Infra / Cloud', color: '#7c3aed' },
];

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ws-principal',
    name: 'Meu Workspace',
    slug: 'meu-workspace',
    description: 'Espaço de trabalho corporativo',
    logoColor: '#173653',
    ownerId: MASTER_USER.id,
    members: [
      { userId: MASTER_USER.id, role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_CLIENTS: ClientCompany[] = [
  {
    id: 'client-matriz',
    name: 'OperaTask Matriz (Workspace Principal)',
    legalName: 'OperaTask Tecnologia & Gestão',
    status: 'active',
    plan: 'enterprise',
    paymentStatus: 'paid',
    primaryWorkspaceId: 'ws-principal',
    workspaceIds: ['ws-principal'],
    ownerId: MASTER_USER.id,
    ownerName: MASTER_USER.name,
    ownerEmail: MASTER_USER.email,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastAccessAt: new Date().toISOString(),
    planStartDate: '2026-01-01T00:00:00.000Z',
    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxUsers: 999,
    monthlyFee: 0,
    notes: 'Empresa Matriz principal da plataforma OperaTask (Super Administrador)',
  },
];

// Limpeza total garantida de contas antigas e dados mockados para deixar a plataforma 100% limpa
try {
  if (typeof window !== 'undefined' && localStorage.getItem('operatask_clean_system_v1') !== 'true') {
    const legacyKeys = [
      'taskflow_v2_users',
      'taskflow_v2_current_user_id',
      'taskflow_v2_workspaces',
      'taskflow_v2_current_workspace_id',
      'taskflow_v2_projects',
      'taskflow_v2_tasks',
      'taskflow_v2_tags',
      'taskflow_v2_activities',
      'taskflow_v2_notifications',
      'operatask_v3_auth_status',
      'operatask_v3_cleaned_quadros',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, MASTER_USER.id);
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(DEFAULT_WORKSPACES));
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID, DEFAULT_WORKSPACES[0].id);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'false'); // Inicia deslogado na tela limpa
    localStorage.setItem('operatask_clean_system_v1', 'true');
  }
} catch (e) {
  console.warn('Storage initial cleanup note:', e);
}

// Data e horário relativo auxiliar (formato YYYY-MM-DDTHH:mm)
const getFormattedDate = (offsetDays: number = 0, timeStr: string = '18:00'): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dateStr = d.toISOString().split('T')[0];
  return `${dateStr}T${timeStr}`;
};

const DEFAULT_COLUMNS_1: BoardColumn[] = [
  { id: 'col-backlog', title: 'Backlog', color: '#64748b', order: 0 },
  { id: 'col-progress', title: 'Em Andamento', color: '#2563eb', order: 1 },
  { id: 'col-review', title: 'Revisão / QA', color: '#d97706', order: 2 },
  { id: 'col-done', title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
];

const DEFAULT_COLUMNS_2: BoardColumn[] = [
  { id: 'col-concept', title: 'Pesquisa & Briefing', color: '#64748b', order: 0 },
  { id: 'col-wireframe', title: 'Wireframing & UI', color: '#7c3aed', order: 1 },
  { id: 'col-approved', title: 'Aprovado para Dev', color: '#059669', order: 2, isCompletedColumn: true },
];

export const DEFAULT_PROJECTS: Project[] = [];

export const DEFAULT_TASKS: Task[] = [];

export const DEFAULT_ACTIVITIES: WorkspaceActivity[] = [];

export const DEFAULT_NOTIFICATIONS: Notification[] = [];

export const createSampleBoardData = (workspaceId: string, currentUserId: string): { project: Project; tasks: Task[] } => {
  const sampleProjectId = `proj-sample-${Date.now()}`;
  const columns: BoardColumn[] = [
    { id: `col-${sampleProjectId}-backlog`, title: "Backlog", color: "#64748b", order: 0 },
    { id: `col-${sampleProjectId}-progress`, title: "Em Andamento", color: "#34B1AC", order: 1 },
    { id: `col-${sampleProjectId}-review`, title: "Revisão", color: "#f59e0b", order: 2 },
    { id: `col-${sampleProjectId}-done`, title: "Concluído", color: "#10b981", order: 3, isCompletedColumn: true },
  ];

  const project: Project = {
    id: sampleProjectId,
    workspaceId,
    name: "Quadro Modelo de Demonstração",
    description: "Quadro de exemplo para familiarização com o OperaTask. Sinta-se à vontade para editar ou excluir!",
    color: "#34B1AC",
    icon: "LayoutDashboard",
    columns,
    memberIds: [currentUserId],
    createdAt: new Date().toISOString(),
    isArchived: false,
  };

  const tasks: Task[] = [
    {
      id: `task-${sampleProjectId}-1`,
      workspaceId,
      projectId: sampleProjectId,
      columnId: columns[0].id,
      title: "Mapear primeiras demandas da equipe",
      description: "Criar cartões para as tarefas prioritárias da semana e definir responsáveis.",
      priority: "medium",
      assigneeIds: [currentUserId],
      dueDate: getFormattedDate(2, "18:00"),
      tags: [DEFAULT_TAGS[0] || { id: "tag-sample", name: "Planejamento", color: "#34B1AC" }],
      checklist: [
        { id: "c1", title: "Listar tarefas pendentes", isCompleted: true },
        { id: "c2", title: "Definir prazos e prioridades", isCompleted: false },
      ],
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}-1`,
          userId: currentUserId,
          action: "criou o quadro de exemplo",
          timestamp: new Date().toISOString(),
        },
      ],
      attachments: [],
      isCompleted: false,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-${sampleProjectId}-2`,
      workspaceId,
      projectId: sampleProjectId,
      columnId: columns[1].id,
      title: "Personalizar colunas e cores do quadro",
      description: "Ajuste os nomes das colunas de acordo com as etapas do seu fluxo operacional.",
      priority: "urgent",
      assigneeIds: [currentUserId],
      dueDate: getFormattedDate(1, "12:00"),
      tags: [DEFAULT_TAGS[1] || { id: "tag-sample-2", name: "Configuração", color: "#173653" }],
      checklist: [
        { id: "c3", title: "Renomear colunas", isCompleted: false },
        { id: "c4", title: "Testar arrastar e soltar cartões", isCompleted: false },
      ],
      comments: [],
      activities: [],
      attachments: [],
      isCompleted: false,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `task-${sampleProjectId}-3`,
      workspaceId,
      projectId: sampleProjectId,
      columnId: columns[3].id,
      title: "Boas-vindas ao OperaTask!",
      description: "Sua conta e ambiente foram configurados com sucesso. Comece a gerenciar suas tarefas.",
      priority: "low",
      assigneeIds: [currentUserId],
      dueDate: getFormattedDate(0, "10:00"),
      tags: [],
      checklist: [
        { id: "c5", title: "Acessar o sistema OperaTask", isCompleted: true },
        { id: "c6", title: "Conhecer a interface dos Quadros", isCompleted: true },
      ],
      comments: [],
      activities: [],
      attachments: [],
      isCompleted: true,
      completedAt: new Date().toISOString(),
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return { project, tasks };
};


// ============================================================
// MOTOR DE PERSISTÊNCIA MULTI-TIER (IndexedDB + LocalStorage)
// ============================================================
const IDB_NAME = 'operatask_persistence_v2';
const IDB_STORE = 'app_entities';
const IDB_VERSION = 1;

let idbInstance: IDBDatabase | null = null;

async function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  if (idbInstance) return idbInstance;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = (e: any) => {
        idbInstance = e.target.result;
        resolve(idbInstance);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await getIndexedDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('Falha na gravação IndexedDB:', e);
  }
}

// ============================================================
// GERENCIADOR DE ESTADO DE SALVAMENTO AUTOMÁTICO (Auto-Save State)
// ============================================================
let currentSaveStatus: SaveStatus = {
  state: 'saved',
  lastSavedAt: new Date().toISOString(),
  pendingCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  cloudSyncEnabled: SupabaseService.getConfig().enabled,
};

const statusListeners = new Set<(status: SaveStatus) => void>();

function emitSaveStatus(partial: Partial<SaveStatus>) {
  currentSaveStatus = {
    ...currentSaveStatus,
    ...partial,
  };
  statusListeners.forEach((listener) => {
    try {
      listener(currentSaveStatus);
    } catch (e) {
      console.warn('Erro em listener de salvamento:', e);
    }
  });
}

// Configuração de listeners de conectividade
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    emitSaveStatus({ isOnline: true });
    // Tenta flush imediato para a nuvem
    StorageService.syncWithCloud();
  });

  window.addEventListener('offline', () => {
    emitSaveStatus({ isOnline: false, state: 'offline' });
  });
}

let debounceTimer: any = null;
let pendingCount = 0;

let _serverApiAvailable: boolean = true;

export function isServerApiAvailable(): boolean {
  return _serverApiAvailable;
}

export function setServerApiAvailable(val: boolean): void {
  _serverApiAvailable = val;
}

function handleSaveMutation(entityKey: string, data: any, immediate: boolean = false) {
  pendingCount++;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Broadcast em tempo real para todos os clientes conectados (celular e desktop)
  const keyToEntityMap: Record<string, SyncEntity> = {
    [STORAGE_KEYS.TASKS]: 'tasks',
    [STORAGE_KEYS.PROJECTS]: 'projects',
    [STORAGE_KEYS.WORKSPACES]: 'workspaces',
    [STORAGE_KEYS.FICHAS_TECNICAS]: 'fichas_tecnicas',
    [STORAGE_KEYS.USERS]: 'users',
    [STORAGE_KEYS.TAGS]: 'tags',
    [STORAGE_KEYS.ACTIVITIES]: 'activities',
  };
  const entity = keyToEntityMap[entityKey];
  if (entity) {
    RealtimeService.broadcast(entity, data);
  }

  emitSaveStatus({
    state: isOnline ? 'saving' : 'offline',
    pendingCount,
    isOnline,
  });

  const runPersistence = async () => {
    try {
      // 1. Grava no IndexedDB de forma assíncrona para suporte ilimitado
      await writeIndexedDB(entityKey, data);

      // 2. Se estiver online e Supabase habilitado, sincroniza
      const currentOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const supaConfig = SupabaseService.getConfig();

      if (currentOnline && supaConfig.enabled && supaConfig.url) {
        // Dispara sync em background sem travar
        StorageService.syncWithCloud().catch(() => {});
      }

      // 3. Persistência Centralizada e Compartilhada no Servidor (apenas se API estiver disponível)
      if (currentOnline && typeof window !== 'undefined' && entity && isServerApiAvailable()) {
        fetch('/api/sync/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [entity]: data }),
        }).catch((err) => {
          setServerApiAvailable(false);
          console.warn('[OperaTask] Servidor de sincronização indisponível:', err);
        });
      }

      pendingCount = Math.max(0, pendingCount - 1);
      emitSaveStatus({
        state: currentOnline ? 'saved' : 'offline',
        lastSavedAt: new Date().toISOString(),
        pendingCount,
        isOnline: currentOnline,
        errorMessage: undefined,
      });
    } catch (err: any) {
      console.error('Erro ao persistir dados:', err);
      pendingCount = Math.max(0, pendingCount - 1);
      emitSaveStatus({
        state: 'error',
        errorMessage: err.message || 'Falha ao salvar dados.',
        pendingCount,
      });
    }
  };

  if (immediate) {
    if (debounceTimer) clearTimeout(debounceTimer);
    runPersistence();
  } else {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runPersistence, 300);
  }
}

// Migração única para zerar membros cadastrados mantendo exclusivamente a conta Master (Alan Silva)
if (typeof window !== 'undefined') {
  try {
    const migrationKey = 'operatask_v5_members_zeroed_to_master';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.setItem(migrationKey, 'true');
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([MASTER_USER]));
      const wsData = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
      if (wsData) {
        const parsedWs: Workspace[] = JSON.parse(wsData);
        const cleanedWs = parsedWs.map((w) => ({
          ...w,
          ownerId: MASTER_USER.id,
          members: [{ userId: MASTER_USER.id, role: 'owner' as const, joinedAt: '2026-01-01T00:00:00.000Z' }],
        }));
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(cleanedWs));
      }
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, MASTER_USER.id);
    }
  } catch (e) {
    console.warn('[OperaTask] Migração de membros:', e);
  }
}

export const StorageService = {
  // Listener do status de salvamento (usado pelo indicador visual)
  subscribeToSaveStatus(callback: (status: SaveStatus) => void): () => void {
    statusListeners.add(callback);
    callback(currentSaveStatus);
    return () => {
      statusListeners.delete(callback);
    };
  },

  getSaveStatus(): SaveStatus {
    return currentSaveStatus;
  },

  // Forçar nova tentativa de salvamento
  async retrySave(): Promise<void> {
    emitSaveStatus({ state: 'saving', errorMessage: undefined });
    try {
      const tasks = this.getTasks();
      const projects = this.getProjects();
      const workspaces = this.getWorkspaces();

      await Promise.all([
        writeIndexedDB(STORAGE_KEYS.TASKS, tasks),
        writeIndexedDB(STORAGE_KEYS.PROJECTS, projects),
        writeIndexedDB(STORAGE_KEYS.WORKSPACES, workspaces),
      ]);

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (online && SupabaseService.getConfig().enabled) {
        await this.syncWithCloud();
      }

      emitSaveStatus({
        state: online ? 'saved' : 'offline',
        lastSavedAt: new Date().toISOString(),
        pendingCount: 0,
        errorMessage: undefined,
      });
    } catch (err: any) {
      emitSaveStatus({
        state: 'error',
        errorMessage: err.message || 'Erro ao tentar salvar novamente.',
      });
    }
  },

  // Sincronizar dados completos com a nuvem (Supabase)
  async syncWithCloud(): Promise<{ success: boolean; error?: string }> {
    const config = SupabaseService.getConfig();
    if (!config.enabled || !config.url) {
      return { success: true };
    }

    emitSaveStatus({ state: 'saving' });
    const res = await SupabaseService.syncAllToCloud({
      workspaces: this.getWorkspaces(),
      projects: this.getProjects(),
      tasks: this.getTasks(),
      users: this.getUsers(),
      tags: this.getTags(),
      activities: this.getActivities(),
      notifications: this.getNotifications(),
    });

    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (res.success) {
      emitSaveStatus({
        state: online ? 'saved' : 'offline',
        lastSavedAt: new Date().toISOString(),
        errorMessage: undefined,
      });
    } else {
      emitSaveStatus({
        state: 'error',
        errorMessage: res.error || 'Falha ao sincronizar com Supabase',
      });
    }
    return res;
  },

  // Sincronização centralizada e bidirecional com o banco remoto compartilhado
  async syncWithServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('/api/sync/state');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.users) && data.users.length > 0) {
            // Mescla usuários remotos com locais para não perder nenhum cadastro
            const current = this.getUsers();
            const merged = [...data.users];
            current.forEach((cu) => {
              if (!merged.some((mu) => mu.id === cu.id)) {
                merged.push(cu);
              }
            });
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
          }
          if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
            const currentWs = this.getWorkspaces();
            const mergedWs = [...data.workspaces];
            currentWs.forEach((cw) => {
              if (!mergedWs.some((mw) => mw.id === cw.id)) {
                mergedWs.push(cw);
              }
            });
            localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(mergedWs));
          }
          if (Array.isArray(data.projects)) {
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data.projects));
          }
          if (Array.isArray(data.tasks)) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
          }
          if (Array.isArray(data.tags)) {
            localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(data.tags));
          }
          if (Array.isArray(data.activities)) {
            localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(data.activities));
          }
          if (Array.isArray(data.clients) && data.clients.length > 0) {
            const currentClients = this.getClients();
            const mergedClients = [...data.clients];
            currentClients.forEach((cc) => {
              if (!mergedClients.some((mc) => mc.id === cc.id)) {
                mergedClients.push(cc);
              }
            });
            localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(mergedClients));
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('[OperaTask] Servidor de sincronização temporariamente indisponível:', e);
    }
    return false;
  },

  // Atualizar dados de usuário no servidor central
  async updateUserOnServer(userData: Partial<User> & { id: string }): Promise<boolean> {
    if (!isServerApiAvailable()) return false;
    try {
      const resp = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.users)) {
          this.saveUsers(data.users, true);
        }
        return true;
      } else if (resp.status === 404) {
        setServerApiAvailable(false);
      }
    } catch (err) {
      setServerApiAvailable(false);
      console.warn('Erro ao atualizar usuário no servidor:', err);
    }
    return false;
  },

  // Excluir usuário no servidor central
  async deleteUserOnServer(userId: string): Promise<boolean> {
    if (!isServerApiAvailable()) return false;
    try {
      const resp = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.users)) {
          this.saveUsers(data.users, true);
        }
        if (Array.isArray(data.workspaces)) {
          this.saveWorkspaces(data.workspaces, true);
        }
        return true;
      } else if (resp.status === 404) {
        setServerApiAvailable(false);
      }
    } catch (err) {
      setServerApiAvailable(false);
      console.warn('Erro ao excluir usuário no servidor:', err);
    }
    return false;
  },

  getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      let list: User[] = data ? JSON.parse(data) : DEFAULT_USERS;

      // Filtra e remove contas de demonstração antigas
      const mockIds = [
        'user-beatriz',
        'user-lucas',
        'user-mariana',
        'user-rafael',
        'user-alan',
        'user-1793786775388-zb8a',
        'user-1793787546280-fcia',
        'user-1793788666090-6lfr',
        'user-1793792108304-72mo',
        'user-davi-tantan',
      ];
      list = list.filter((u) => !mockIds.includes(u.id) && !u.email.endsWith('@taskflow.dev'));

      // Garante que TODOS os DEFAULT_USERS estejam presentes na lista
      let modified = false;
      DEFAULT_USERS.forEach((defUser) => {
        const hasUser = list.some(
          (u) =>
            u.id === defUser.id ||
            (u.username && defUser.username && u.username.toLowerCase() === defUser.username.toLowerCase()) ||
            u.email.toLowerCase() === defUser.email.toLowerCase()
        );
        if (!hasUser) {
          list.push(defUser);
          modified = true;
        }
      });

      // Garante presença da Conta Master com papel master
      const masterIdx = list.findIndex(
        (u) =>
          u.email.trim().toLowerCase() === 'alanvitordasilva@gmail.com.br' ||
          u.email.trim().toLowerCase() === 'alanvitordasilva@gmail.com'
      );
      if (masterIdx === -1) {
        list = [MASTER_USER, ...list];
        modified = true;
      } else if (!list[masterIdx].systemRole || !list[masterIdx].isSuperAdmin) {
        list[masterIdx] = {
          ...list[masterIdx],
          systemRole: 'master',
          isSuperAdmin: true,
          title: list[masterIdx].title || 'Super Administrador / Master',
        };
        modified = true;
      }

      if (modified || !data) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
      }
      return list;
    } catch {
      return DEFAULT_USERS;
    }
  },

  saveUsers(users: User[], immediate = false): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    handleSaveMutation(STORAGE_KEYS.USERS, users, immediate);
  },

  /**
   * Retorna estritamente os utilizadores elegíveis para alternância de sessão rápida
   * dentro do workspace ou empresa atual, garantindo isolamento total multi-tenant
   * e ocultando totalmente o Master para utilizadores comuns de clientes.
   */
  getSwitchableUsers(
    workspace: Workspace | null | undefined,
    currentViewingUser: User,
    allUsersList?: User[]
  ): User[] {
    const users = allUsersList || this.getUsers();
    const isViewerMaster = isUserMaster(currentViewingUser);

    if (!workspace) {
      if (!isViewerMaster) {
        return users.filter(
          (u) =>
            !isUserMaster(u) &&
            u.systemRole !== 'master' &&
            !u.isSuperAdmin &&
            !u.email?.toLowerCase().includes('alanvitordasilva') &&
            u.username?.toLowerCase() !== 'alan'
        );
      }
      return users;
    }

    const wsCompanyId = workspace.companyId || (workspace as any)?.tenantId;

    return users.filter((u) => {
      // 1. Se o visualizador não for Master, contas com privilégios globais ou Master são 100% ocultas
      if (!isViewerMaster) {
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

      // 2. Se for membro registrado deste workspace
      const isMember = Array.isArray(workspace.members) && workspace.members.some((m) => m.userId === u.id);
      if (isMember) return true;

      // 3. Se for o dono do workspace
      if (workspace.ownerId === u.id) return true;

      // 4. Se pertencer à mesma empresa/tenant do workspace
      if (wsCompanyId) {
        if (u.companyId && (u.companyId === wsCompanyId || u.companyId === workspace.id)) return true;
        if (u.tenantId && (u.tenantId === wsCompanyId || u.tenantId === workspace.id)) return true;
      }

      // 5. Se pertencer à mesma empresa/tenant do usuário atual (equipe da mesma empresa)
      const viewerCompanyId = currentViewingUser.companyId || currentViewingUser.tenantId;
      if (viewerCompanyId) {
        if (u.companyId && u.companyId === viewerCompanyId) return true;
        if (u.tenantId && u.tenantId === viewerCompanyId) return true;
      }

      // 6. O próprio usuário atual
      if (u.id === currentViewingUser.id) return true;

      // Master visualizando pode ver a si próprio
      if (isViewerMaster && isUserMaster(u)) {
        return true;
      }

      return false;
    });
  },

  /**
   * Zera todos os membros cadastrados no sistema, mantendo exclusivamente a conta Master (Alan Silva).
   * Não apaga a estrutura de Workspaces, Quadros, Colunas, Fichas Técnicas ou Cards.
   */
  resetMembersToMasterOnly(): { users: User[]; workspaces: Workspace[] } {
    // 1. Zera a lista de usuários para conter unicamente a conta Master
    const masterOnlyUsers: User[] = [MASTER_USER];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(masterOnlyUsers));
    handleSaveMutation(STORAGE_KEYS.USERS, masterOnlyUsers, true);

    // 2. Limpa membros dos workspaces mantendo a estrutura dos workspaces e apenas o Master como membro/owner
    const currentWorkspaces = this.getWorkspaces();
    const updatedWorkspaces = currentWorkspaces.map((w) => ({
      ...w,
      ownerId: MASTER_USER.id,
      members: [{ userId: MASTER_USER.id, role: 'owner' as const, joinedAt: '2026-01-01T00:00:00.000Z' }],
    }));
    this.saveWorkspaces(updatedWorkspaces, true);

    // 3. Atualiza projetos para que os memberIds contenham apenas o Master
    const currentProjects = this.getProjects();
    const updatedProjects = currentProjects.map((p) => ({
      ...p,
      memberIds: [MASTER_USER.id],
    }));
    this.saveProjects(updatedProjects, true);

    // 4. Se Supabase estiver conectado, limpa membros não-master nas tabelas
    if (SupabaseService.isConfigured()) {
      try {
        const client = SupabaseService.getClient();
        if (client) {
          Promise.resolve(
            client
              .from('profiles')
              .delete()
              .neq('tipo', 'master')
              .not('email', 'in', '("alanvitordasilva@gmail.com.br","alanvitordasilva@gmail.com")')
          ).catch(() => {});
          Promise.resolve(
            client
              .from('workspace_members')
              .delete()
              .neq('user_id', MASTER_USER.id)
          ).catch(() => {});
        }
      } catch (err) {
        console.warn('[OperaTask] Limpeza de membros no Supabase:', err);
      }
    }

    // 5. Broadcast em tempo real para sincronizar todas as telas conectadas
    RealtimeService.broadcast('users', masterOnlyUsers, { action: 'reset_members' });
    RealtimeService.broadcast('workspaces', updatedWorkspaces, { action: 'reset_members' });

    return { users: masterOnlyUsers, workspaces: updatedWorkspaces };
  },

  getCurrentUser(): User {
    const users = this.getUsers();
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const found = users.find((u) => u.id === savedId);
      if (found) return found;
    } catch {}
    this.setCurrentUserId(users[0]?.id || MASTER_USER.id);
    return users[0] || MASTER_USER;
  },

  setCurrentUserId(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  getWorkspaces(): Workspace[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
      if (!data) {
        this.saveWorkspaces(DEFAULT_WORKSPACES);
        return DEFAULT_WORKSPACES;
      }
      const parsed: Workspace[] = JSON.parse(data);
      let clean = parsed.filter((w) => w.id !== 'ws-agency' && w.id !== 'ws-acme');

      // Sanitização multi-tenant: remove Master dos membros de workspaces que pertencem a empresas/clientes
      let sanitized = false;
      clean = clean.map((w) => {
        if (w.id !== 'ws-principal' && (w.companyId || (w as any).tenantId)) {
          const originalLen = w.members?.length || 0;
          const filteredMembers = (w.members || []).filter(
            (m) =>
              m.userId !== MASTER_USER.id &&
              m.userId !== 'user-master-alan' &&
              m.userId !== 'master-alan'
          );
          if (filteredMembers.length !== originalLen) {
            sanitized = true;
            return { ...w, members: filteredMembers };
          }
        }
        return w;
      });
      if (sanitized) {
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(clean));
      }

      if (clean.length === 0) {
        this.saveWorkspaces(DEFAULT_WORKSPACES);
        return DEFAULT_WORKSPACES;
      }
      return clean;
    } catch {
      return DEFAULT_WORKSPACES;
    }
  },

  saveWorkspaces(workspaces: Workspace[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
    handleSaveMutation(STORAGE_KEYS.WORKSPACES, workspaces, immediate);
  },

  getCurrentWorkspace(): Workspace {
    const workspaces = this.getWorkspaces();
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID);
      const found = workspaces.find((w) => w.id === savedId);
      if (found) return found;
    } catch {}
    const defaultWs = workspaces[0] || DEFAULT_WORKSPACES[0];
    this.setCurrentWorkspaceId(defaultWs.id);
    return defaultWs;
  },

  setCurrentWorkspaceId(workspaceId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID, workspaceId);
  },

  /**
   * Buscar lista atualizada de Workspaces do banco de dados na nuvem (Supabase)
   */
  async fetchWorkspacesCloud(): Promise<{ success: boolean; workspaces: Workspace[]; fromCloud: boolean }> {
    if (SupabaseService.isConfigured()) {
      try {
        const user = this.getCurrentUser();
        const isMaster = isUserMaster(user);
        const companyId = user?.companyId || user?.tenantId;
        const currentWs = this.getCurrentWorkspace();

        const res = await SupabaseService.fetchWorkspaces({
          companyId,
          tenantId: companyId,
          workspaceId: currentWs?.id,
          userId: user?.id,
          isSuperAdmin: isMaster,
        });

        if (res.success && Array.isArray(res.workspaces) && res.workspaces.length > 0) {
          const localWs = this.getWorkspaces();
          const merged = [...res.workspaces];
          localWs.forEach((lw) => {
            if (!merged.some((mw) => mw.id === lw.id)) {
              merged.push(lw);
            }
          });
          this.saveWorkspaces(merged, true);
          return { success: true, workspaces: merged, fromCloud: true };
        }
      } catch (err) {
        console.warn('[StorageService] Falha ao carregar workspaces do Supabase:', err);
      }
    }
    return { success: false, workspaces: this.getWorkspaces(), fromCloud: false };
  },

  /**
   * Buscar projetos/quadros da nuvem do Supabase com fallback seguro anti-vazio
   */
  async fetchProjectsCloud(workspaceId?: string): Promise<{ success: boolean; projects: Project[]; fromCloud: boolean }> {
    if (SupabaseService.isConfigured()) {
      try {
        const user = this.getCurrentUser();
        const isMaster = isUserMaster(user);
        const companyId = user?.companyId || user?.tenantId;

        const res = await SupabaseService.fetchProjects({
          workspaceId,
          companyId,
          tenantId: companyId,
          isSuperAdmin: isMaster,
        });

        if (res.success && Array.isArray(res.projects) && res.projects.length > 0) {
          const localProjects = this.getProjects();
          let merged: Project[];
          if (workspaceId) {
            const others = localProjects.filter((p) => p.workspaceId !== workspaceId);
            merged = [...others, ...res.projects];
          } else {
            merged = res.projects;
          }
          this.saveProjects(merged, true);
          return { success: true, projects: merged, fromCloud: true };
        }
      } catch (err) {
        console.warn('[StorageService] Falha ao carregar projetos do Supabase:', err);
      }
    }
    const localProjects = this.getProjects();
    const filtered = workspaceId ? localProjects.filter((p) => p.workspaceId === workspaceId) : localProjects;
    return { success: false, projects: filtered, fromCloud: false };
  },

  /**
   * Garante que um Workspace possua um projeto/quadro ativo com colunas Kanban
   */
  ensureWorkspaceProject(workspaceId: string, workspaceName?: string): Project {
    const projects = this.getProjects();
    const existing = projects.find((p) => p.workspaceId === workspaceId && !p.isArchived);
    if (existing) return existing;

    const newProj: Project = {
      id: `proj-${workspaceId}-principal`,
      workspaceId,
      name: 'Quadro Principal',
      description: `Quadro de tarefas e fluxo operacional do espaço ${workspaceName || 'Workspace'}`,
      color: '#2563eb',
      icon: 'folder',
      columns: [
        { id: `col-${workspaceId}-backlog`, title: 'Backlog', color: '#64748b', order: 0 },
        { id: `col-${workspaceId}-progress`, title: 'Em Andamento', color: '#2563eb', order: 1 },
        { id: `col-${workspaceId}-review`, title: 'Revisão / QA', color: '#d97706', order: 2 },
        { id: `col-${workspaceId}-done`, title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
      ],
      memberIds: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...projects, newProj];
    this.saveProjects(updated, true);
    if (SupabaseService.isConfigured()) {
      SupabaseService.createProject(newProj).catch(() => {});
    }
    return newProj;
  },

  /**
   * Criar Projeto / Quadro com persistência imediata local, no servidor e no Supabase
   */
  async createProjectAsync(project: Project): Promise<{ success: boolean; project: Project; error?: string }> {
    const current = this.getProjects();
    const nextList = [...current.filter((p) => p.id !== project.id), project];
    this.saveProjects(nextList, true);

    RealtimeService.broadcast('projects', nextList, {
      action: 'create_project',
      targetId: project.id,
      userName: project.name,
    });

    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: nextList }),
      }).catch(() => {});
    }

    if (SupabaseService.isConfigured()) {
      try {
        const cloudRes = await SupabaseService.createProject(project);
        if (cloudRes.success && cloudRes.project) {
          return { success: true, project: cloudRes.project };
        }
      } catch (e: any) {
        console.warn('[StorageService] Falha ao criar projeto no Supabase:', e);
      }
    }

    return { success: true, project };
  },

  /**
   * Atualizar Projeto / Quadro com persistência imediata local, no servidor e no Supabase
   */
  async updateProjectAsync(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
    const current = this.getProjects();
    const nextList = current.map((p) => (p.id === projectId ? { ...p, ...updates } : p));
    this.saveProjects(nextList, true);

    RealtimeService.broadcast('projects', nextList, {
      action: 'update_project',
      targetId: projectId,
    });

    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: nextList }),
      }).catch(() => {});
    }

    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.updateProject(projectId, updates);
      } catch (e: any) {
        console.warn('[StorageService] Falha ao atualizar projeto no Supabase:', e);
      }
    }

    return { success: true };
  },

  /**
   * Excluir Projeto / Quadro com remoção imediata de tarefas locais e no Supabase
   */
  async deleteProjectAsync(projectId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Remove do estado local de projetos
    const current = this.getProjects();
    const filteredProjects = current.filter((p) => p.id !== projectId);
    this.saveProjects(filteredProjects, true);

    // 2. Remove tarefas associadas ao projeto
    const currentTasks = this.getTasks();
    const filteredTasks = currentTasks.filter((t) => t.projectId !== projectId);
    this.saveTasks(filteredTasks, true);

    // 3. Notifica em tempo real
    RealtimeService.broadcast('projects', filteredProjects, {
      action: 'delete_project',
      targetId: projectId,
    });
    RealtimeService.broadcast('tasks', filteredTasks, {
      action: 'delete_project_tasks',
      targetId: projectId,
    });

    // 4. Atualiza servidor central
    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: filteredProjects, tasks: filteredTasks }),
      }).catch(() => {});
    }

    // 5. Exclui no Supabase
    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.deleteProject(projectId);
      } catch (e: any) {
        console.warn('[StorageService] Falha ao excluir projeto no Supabase:', e);
      }
    }

    return { success: true };
  },

  /**
   * Criar Workspace com persistência imediata local, no servidor e no Supabase
   */
  async createWorkspaceAsync(workspace: Workspace): Promise<{ success: boolean; workspace: Workspace; error?: string }> {
    // 1. Atualiza lista local imediatamente
    const current = this.getWorkspaces();
    const nextList = [...current.filter((w) => w.id !== workspace.id), workspace];
    this.saveWorkspaces(nextList, true);
    this.setCurrentWorkspaceId(workspace.id);

    // 2. Garante Quadro Principal inicial ativo
    this.ensureWorkspaceProject(workspace.id, workspace.name);

    // 3. Transmite via Realtime para todos os dispositivos conectados
    RealtimeService.broadcast('workspaces', nextList, {
      action: 'create_workspace',
      targetId: workspace.id,
      userName: workspace.name,
    });

    // 4. Salva no servidor de sincronização centralizado
    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces: nextList }),
      }).catch(() => {});
    }

    // 5. Salva imediatamente no banco de dados (Supabase) se configurado
    if (SupabaseService.isConfigured()) {
      try {
        const cloudRes = await SupabaseService.createWorkspace(workspace);
        if (!cloudRes.success) {
          console.warn('[StorageService] Falha na nuvem ao criar workspace:', cloudRes.error);
        }
      } catch (e: any) {
        console.warn('[StorageService] Erro ao gravar workspace no Supabase:', e);
      }
    }

    return { success: true, workspace };
  },

  /**
   * Excluir Workspace localmente e no banco de dados
   */
  async deleteWorkspaceAsync(workspaceId: string): Promise<{ success: boolean }> {
    const current = this.getWorkspaces();
    const filtered = current.filter((w) => w.id !== workspaceId);
    this.saveWorkspaces(filtered, true);

    if (this.getCurrentWorkspace().id === workspaceId && filtered.length > 0) {
      this.setCurrentWorkspaceId(filtered[0].id);
    }

    // Remove também quadros e tarefas associados a este workspace no estado local
    const currentProjects = this.getProjects();
    const filteredProjects = currentProjects.filter((p) => p.workspaceId !== workspaceId);
    this.saveProjects(filteredProjects, true);

    const currentTasks = this.getTasks();
    const filteredTasks = currentTasks.filter((t) => t.workspaceId !== workspaceId);
    this.saveTasks(filteredTasks, true);

    RealtimeService.broadcast('workspaces', filtered, {
      action: 'delete_workspace',
      targetId: workspaceId,
    });
    RealtimeService.broadcast('projects', filteredProjects, {
      action: 'delete_workspace_projects',
      targetId: workspaceId,
    });
    RealtimeService.broadcast('tasks', filteredTasks, {
      action: 'delete_workspace_tasks',
      targetId: workspaceId,
    });

    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces: filtered, projects: filteredProjects, tasks: filteredTasks }),
      }).catch(() => {});
    }

    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.deleteWorkspace(workspaceId);
      } catch (e) {
        console.warn('[StorageService] Erro ao excluir workspace no Supabase:', e);
      }
    }

    return { success: true };
  },

  // ==========================================================================
  // GESTÃO MACRO DE CLIENTES & EMPRESAS (PAINEL MASTER / SUPER ADMIN)
  // ==========================================================================

  getClients(): ClientCompany[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      let list: ClientCompany[] = data ? JSON.parse(data) : [];

      if (!Array.isArray(list) || list.length === 0) {
        list = [...DEFAULT_CLIENTS];
      }

      // Garante que a Empresa Matriz esteja sempre presente
      const hasMatriz = list.some((c) => c.id === 'client-matriz' || c.primaryWorkspaceId === 'ws-principal');
      if (!hasMatriz) {
        list.unshift(DEFAULT_CLIENTS[0]);
      }

      // Sincroniza com workspaces existentes para garantir que todos os workspaces tenham sua empresa mapeada
      const workspaces = this.getWorkspaces();
      const users = this.getUsers();
      let modified = false;

      workspaces.forEach((ws) => {
        if (ws.id === 'ws-principal') return;
        const alreadyLinked = list.some(
          (c) => c.primaryWorkspaceId === ws.id || c.workspaceIds.includes(ws.id)
        );
        if (!alreadyLinked) {
          const ownerUser = users.find((u) => u.id === ws.ownerId);
          const newClient: ClientCompany = {
            id: `client-${ws.id}`,
            name: ws.name || 'Nova Empresa',
            legalName: ws.description || ws.name,
            status: ws.clientStatus || 'active',
            plan: ws.clientPlan || 'profissional',
            paymentStatus: (ws.clientStatus === 'suspended' ? 'past_due' : 'paid') as PaymentStatus,
            primaryWorkspaceId: ws.id,
            workspaceIds: [ws.id],
            ownerId: ws.ownerId || MASTER_USER.id,
            ownerName: ownerUser?.name || 'Administrador',
            ownerEmail: ownerUser?.email || ownerUser?.username || 'admin@empresa.com',
            ownerPhone: ownerUser?.phone,
            createdAt: ws.createdAt || new Date().toISOString(),
            lastAccessAt: ws.lastAccessAt || new Date().toISOString(),
            planStartDate: ws.createdAt || new Date().toISOString(),
            planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            maxUsers: 30,
            notes: `Workspace autovinculado: ${ws.name}`,
          };
          list.push(newClient);
          modified = true;
        }
      });

      if (modified || !data) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(list));
      }
      return list;
    } catch {
      return DEFAULT_CLIENTS;
    }
  },

  /**
   * Buscar lista atualizada de Clientes / Tenants do banco de dados na nuvem (Supabase)
   */
  async fetchClientsCloud(): Promise<{ success: boolean; clients: ClientCompany[]; fromCloud: boolean }> {
    if (SupabaseService.isConfigured()) {
      try {
        const res = await SupabaseService.fetchTenants();
        if (res.success && Array.isArray(res.clients) && res.clients.length > 0) {
          const localClients = this.getClients();
          const merged = [...res.clients];
          localClients.forEach((lc) => {
            if (!merged.some((mc) => mc.id === lc.id)) {
              merged.push(lc);
            }
          });
          const hasMatriz = merged.some((c) => c.id === 'client-matriz' || c.primaryWorkspaceId === 'ws-principal');
          if (!hasMatriz) {
            merged.unshift(DEFAULT_CLIENTS[0]);
          }
          localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(merged));
          return { success: true, clients: merged, fromCloud: true };
        }
      } catch (e) {
        console.warn('[StorageService] Erro ao buscar clientes do Supabase:', e);
      }
    }
    return { success: true, clients: this.getClients(), fromCloud: false };
  },

  saveClients(clients: ClientCompany[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    handleSaveMutation(STORAGE_KEYS.CLIENTS, clients, immediate);

    RealtimeService.broadcast('clients', clients, {
      action: 'update_clients',
      targetId: 'all',
    });

    if (SupabaseService.isConfigured()) {
      SupabaseService.upsertTenants(clients).catch((err) => {
        console.warn('[OperaTask] Erro ao persistir tenants no Supabase:', err);
      });
    }

    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients }),
      }).catch(() => {});
    }
  },

  async createClientCompany(params: {
    name: string;
    legalName?: string;
    cnpjOrDoc?: string;
    plan: ClientPlan;
    status: ClientStatus;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone?: string;
    workspaceName?: string;
    maxUsers?: number;
    monthlyFee?: number;
    notes?: string;
  }): Promise<{
    success: boolean;
    client?: ClientCompany;
    workspace?: Workspace;
    ownerUser?: User;
    rawPassword?: string;
    error?: string;
  }> {
    try {
      const cleanCompanyName = params.name.trim();
      const cleanOwnerName = params.ownerName.trim();
      const rawEmail = params.ownerEmail.trim().toLowerCase();
      const cleanPassword = params.ownerPassword.trim();
      const cleanWsName = (params.workspaceName || cleanCompanyName).trim();

      if (!cleanCompanyName) {
        return { success: false, error: 'O nome da empresa cliente é obrigatório.' };
      }
      if (!cleanOwnerName) {
        return { success: false, error: 'O nome do responsável/dono é obrigatório.' };
      }
      if (!rawEmail || !rawEmail.includes('@')) {
        return { success: false, error: 'O login/e-mail do responsável deve conter o caractere @.' };
      }
      if (!cleanPassword || cleanPassword.length < 4) {
        return { success: false, error: 'A senha inicial deve conter pelo menos 4 caracteres.' };
      }

      const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // 1. Cria usuário Dono
      const cleanUsername = rawEmail.replace(/\s+/g, '');
      const userResult = await this.registerUser({
        name: cleanOwnerName,
        username: cleanUsername,
        email: cleanUsername,
        password: cleanPassword,
        role: 'dono',
        workspaceIds: [workspaceId],
        workspaceId,
      });

      const finalUser = userResult.user || {
        id: userId,
        name: cleanOwnerName,
        username: cleanUsername,
        email: cleanUsername,
        password: cleanPassword,
        avatarColor: '#34B1AC',
        title: 'Dono do Workspace',
        tipo: 'dono',
        status: 'active',
        isActive: true,
        companyId: clientId,
        tenantId: clientId,
        createdAt: new Date().toISOString(),
      };
      finalUser.companyId = clientId;
      finalUser.tenantId = clientId;

      // 2. Cria Workspace inicial do Cliente (sem poluir membros com Master global)
      const newWs: Workspace = {
        id: workspaceId,
        name: cleanWsName,
        slug: cleanWsName.toLowerCase().replace(/\s+/g, '-'),
        description: `Espaço de trabalho corporativo da empresa ${cleanCompanyName}`,
        logoColor: '#34B1AC',
        ownerId: finalUser.id,
        members: [
          { userId: finalUser.id, role: 'owner', joinedAt: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
        companyId: clientId,
        companyName: cleanCompanyName,
        clientStatus: params.status,
        clientPlan: params.plan,
        lastAccessAt: new Date().toISOString(),
      };

      await this.createWorkspaceAsync(newWs);

      // 3. Cria registro ClientCompany / Tenant
      const initialPaymentStatus: PaymentStatus =
        params.status === 'trial' ? 'trialing' : params.status === 'suspended' ? 'past_due' : 'paid';
      const trialDays = 14;
      const initialExpiresAt = params.status === 'trial'
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const newClient: ClientCompany = {
        id: clientId,
        name: cleanCompanyName,
        legalName: params.legalName?.trim() || cleanCompanyName,
        cnpjOrDoc: params.cnpjOrDoc?.trim(),
        status: params.status,
        plan: params.plan,
        paymentStatus: initialPaymentStatus,
        primaryWorkspaceId: workspaceId,
        workspaceIds: [workspaceId],
        ownerId: finalUser.id,
        ownerName: cleanOwnerName,
        ownerEmail: cleanUsername,
        ownerPhone: params.ownerPhone?.trim(),
        createdAt: new Date().toISOString(),
        lastAccessAt: new Date().toISOString(),
        planStartDate: new Date().toISOString(),
        planExpiresAt: initialExpiresAt,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: params.maxUsers || (PLAN_CONFIGS[params.plan]?.maxUsers ?? (params.plan === 'enterprise' ? 9999 : params.plan === 'profissional' ? 30 : params.plan === 'basico' ? 10 : 5)),
        monthlyFee: params.monthlyFee ?? PLAN_CONFIGS[params.plan]?.priceMonthly ?? 0,
        notes: params.notes?.trim(),
      };

      const currentClients = this.getClients();
      const updatedClients = [newClient, ...currentClients.filter((c) => c.id !== clientId)];
      this.saveClients(updatedClients, true);

      return {
        success: true,
        client: newClient,
        workspace: newWs,
        ownerUser: finalUser,
        rawPassword: cleanPassword,
      };
    } catch (err: any) {
      console.error('[StorageService] Erro ao criar cliente/empresa:', err);
      return { success: false, error: err.message || 'Erro inesperado ao criar cliente.' };
    }
  },

  updateClientStatus(clientId: string, status: ClientStatus): ClientCompany | null {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return null;

    clients[idx] = {
      ...clients[idx],
      status,
      lastAccessAt: new Date().toISOString(),
    };
    this.saveClients(clients, true);

    // Atualiza status nos workspaces vinculados
    const workspaces = this.getWorkspaces();
    const wsIds = clients[idx].workspaceIds || [clients[idx].primaryWorkspaceId];
    let wsModified = false;
    const updatedWs = workspaces.map((w) => {
      if (wsIds.includes(w.id) || w.companyId === clientId) {
        wsModified = true;
        return { ...w, clientStatus: status };
      }
      return w;
    });

    if (wsModified) {
      this.saveWorkspaces(updatedWs, true);
    }

    return clients[idx];
  },

  updateClientPlan(
    clientId: string,
    plan: ClientPlan,
    maxUsers?: number,
    notes?: string
  ): ClientCompany | null {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return null;

    const planConfig = PLAN_CONFIGS[plan];
    const calculatedMaxUsers =
      maxUsers !== undefined
        ? maxUsers
        : planConfig?.maxUsers || (plan === 'enterprise' ? 9999 : plan === 'profissional' ? 30 : plan === 'basico' ? 10 : 5);

    clients[idx] = {
      ...clients[idx],
      plan,
      maxUsers: calculatedMaxUsers,
      monthlyFee: planConfig?.priceMonthly ?? clients[idx].monthlyFee ?? 0,
      paymentStatus: clients[idx].paymentStatus === 'past_due' ? 'paid' : (clients[idx].paymentStatus || 'paid'),
      planStartDate: clients[idx].planStartDate || new Date().toISOString(),
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...(notes !== undefined ? { notes } : {}),
    };
    this.saveClients(clients, true);

    // Atualiza nos workspaces
    const workspaces = this.getWorkspaces();
    const wsIds = clients[idx].workspaceIds || [clients[idx].primaryWorkspaceId];
    let wsModified = false;
    const updatedWs = workspaces.map((w) => {
      if (wsIds.includes(w.id) || w.companyId === clientId) {
        wsModified = true;
        return { ...w, clientPlan: plan, paymentStatus: clients[idx].paymentStatus };
      }
      return w;
    });

    if (wsModified) {
      this.saveWorkspaces(updatedWs, true);
    }

    return clients[idx];
  },

  updateClientPaymentStatus(
    clientId: string,
    paymentStatus: PaymentStatus,
    extra?: Partial<ClientCompany>
  ): ClientCompany | null {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return null;

    const newClientStatus: ClientStatus =
      paymentStatus === 'past_due' || paymentStatus === 'canceled'
        ? 'suspended'
        : paymentStatus === 'trialing'
        ? 'trial'
        : 'active';

    clients[idx] = {
      ...clients[idx],
      paymentStatus,
      status: newClientStatus,
      ...extra,
      lastAccessAt: new Date().toISOString(),
    };
    this.saveClients(clients, true);

    // Sincroniza status nos workspaces vinculados
    const workspaces = this.getWorkspaces();
    const wsIds = clients[idx].workspaceIds || [clients[idx].primaryWorkspaceId];
    let wsModified = false;
    const updatedWs = workspaces.map((w) => {
      if (wsIds.includes(w.id) || w.companyId === clientId) {
        wsModified = true;
        return { ...w, clientStatus: newClientStatus, paymentStatus };
      }
      return w;
    });

    if (wsModified) {
      this.saveWorkspaces(updatedWs, true);
    }

    return clients[idx];
  },

  getCurrentTenant(user?: User, currentWsId?: string): ClientCompany | null {
    const clients = this.getClients();
    if (!clients.length) return null;

    if (currentWsId) {
      const matchWs = clients.find(
        (c) =>
          c.primaryWorkspaceId === currentWsId ||
          (Array.isArray(c.workspaceIds) && c.workspaceIds.includes(currentWsId)) ||
          c.id === currentWsId
      );
      if (matchWs) return matchWs;
    }

    if (user) {
      const isMaster = user.systemRole === 'master' || user.email.toLowerCase().includes('alanvitordasilva');
      if (isMaster) {
        const matriz = clients.find((c) => c.id === 'client-matriz' || c.primaryWorkspaceId === 'ws-principal');
        return matriz || clients[0];
      }
      const userTenant = clients.find(
        (c) =>
          c.ownerId === user.id ||
          c.ownerEmail?.toLowerCase() === user.email?.toLowerCase() ||
          (user.tenantId && c.id === user.tenantId)
      );
      if (userTenant) return userTenant;
    }

    return clients[0] || null;
  },

  async deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    if (clientId === 'client-matriz') {
      return { success: false, error: 'A empresa Matriz do OperaTask não pode ser excluída.' };
    }

    const clients = this.getClients();
    const target = clients.find((c) => c.id === clientId);
    if (!target) return { success: false, error: 'Cliente não encontrado.' };

    const remaining = clients.filter((c) => c.id !== clientId);
    this.saveClients(remaining, true);

    if (SupabaseService.isConfigured()) {
      await SupabaseService.deleteTenant(clientId).catch((err) => {
        console.warn('[OperaTask] Erro ao excluir tenant no Supabase:', err);
      });
    }

    return { success: true };
  },

  getSupportMode(): SupportModeState | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPORT_MODE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSupportMode(state: SupportModeState | null): void {
    try {
      if (state) {
        localStorage.setItem(STORAGE_KEYS.SUPPORT_MODE, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SUPPORT_MODE);
      }
    } catch {}
  },

  clearSupportMode(): void {
    this.setSupportMode(null);
  },

  // ==========================================================================
  // GESTÃO DINÂMICA DE PLANOS E ASSINATURAS (CONFIGURADOS PELO MASTER)
  // ==========================================================================

  getSubscriptionPlans(): SubscriptionPlan[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_PLANS);
      let list: SubscriptionPlan[] = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(list) || list.length === 0) {
        list = [...DEFAULT_SUBSCRIPTION_PLANS];
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(list));
      }

      // Garante que os 4 planos pré-definidos essenciais existam
      const requiredPlanIds: ('gratuito' | 'basico' | 'intermediario' | 'profissional')[] = [
        'gratuito',
        'basico',
        'intermediario',
        'profissional',
      ];

      let modified = false;
      for (const reqId of requiredPlanIds) {
        if (!list.some((p) => p.id === reqId)) {
          const defaultPlan = DEFAULT_SUBSCRIPTION_PLANS.find((dp) => dp.id === reqId);
          if (defaultPlan) {
            list.push(defaultPlan);
            modified = true;
          }
        }
      }

      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      if (modified) {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(list));
      }
      return list;
    } catch {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  },

  saveSubscriptionPlans(plans: SubscriptionPlan[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(plans));
    handleSaveMutation(STORAGE_KEYS.SUBSCRIPTION_PLANS, plans, immediate);

    // 1. Broadcast em tempo real para sincronização instantânea
    RealtimeService.broadcast('subscription_plans', plans, {
      action: 'update_subscription_plans',
      targetId: 'all',
    });

    // 2. Persiste em segundo plano no Supabase
    if (SupabaseService.isConfigured()) {
      for (const p of plans) {
        SupabaseService.saveSubscriptionPlan(p).catch((err) => {
          console.warn('[StorageService] Falha ao persistir plano no Supabase:', err);
        });
      }
    }

    // 3. Persiste no servidor backend se disponível
    if (isServerApiAvailable()) {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_plans: plans }),
      }).catch(() => {});
    }
  },

  getPlanById(planId: string): SubscriptionPlan {
    const plans = this.getSubscriptionPlans();
    const normalized = normalizePlan(planId);
    const found = plans.find((p) => p.id === normalized || p.id === planId);
    if (found) return found;
    return DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === normalized) || DEFAULT_SUBSCRIPTION_PLANS[0];
  },

  getPlanForClient(client?: ClientCompany | null, workspaceId?: string): SubscriptionPlan {
    if (client) {
      return this.getPlanById(client.plan);
    }
    if (workspaceId) {
      const tenant = this.getCurrentTenant(undefined, workspaceId);
      if (tenant) return this.getPlanById(tenant.plan);
      const workspaces = this.getWorkspaces();
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws?.clientPlan) return this.getPlanById(ws.clientPlan);
    }
    return this.getPlanById('gratuito');
  },

  /**
   * Validação estrita de limites do plano da empresa
   * Chamado antes de criar novo quadro ou cadastrar novo membro
   */
  validateWorkspaceLimit(
    workspaceId: string,
    action: 'create_board' | 'invite_member'
  ): {
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxLimit: number;
    planName: string;
    planId: string;
  } {
    const currentUser = this.getCurrentUser();
    // Administrador Master tem acesso irrestrito
    if (isUserMaster(currentUser)) {
      return {
        allowed: true,
        currentCount: 0,
        maxLimit: 9999,
        planName: 'Master (Irrestrito)',
        planId: 'master',
      };
    }

    const tenant = this.getCurrentTenant(currentUser, workspaceId);
    const plan = this.getPlanForClient(tenant, workspaceId);

    if (action === 'create_board') {
      const projects = this.getProjects();
      const workspaceProjects = projects.filter((p) => p.workspaceId === workspaceId && !p.isArchived);
      const currentCount = workspaceProjects.length;
      const maxLimit = plan.maxBoards ?? 3;

      if (currentCount >= maxLimit) {
        return {
          allowed: false,
          reason: `Limite de quadros atingido: O plano ${plan.name} permite até ${maxLimit} quadros ativos por workspace. Você já possui ${currentCount}. Faça upgrade do seu plano para criar mais quadros.`,
          currentCount,
          maxLimit,
          planName: plan.name,
          planId: String(plan.id),
        };
      }

      return {
        allowed: true,
        currentCount,
        maxLimit,
        planName: plan.name,
        planId: String(plan.id),
      };
    }

    if (action === 'invite_member') {
      const workspaces = this.getWorkspaces();
      const targetWs = workspaces.find((w) => w.id === workspaceId);
      const members = Array.isArray(targetWs?.members) ? targetWs!.members : [];
      const currentCount = members.length;
      const maxLimit = plan.maxUsers ?? 5;

      if (currentCount >= maxLimit) {
        return {
          allowed: false,
          reason: `Limite de membros atingido: O plano ${plan.name} da sua empresa permite até ${maxLimit} usuários na equipe. A equipe atual já possui ${currentCount} membros. Faça upgrade para adicionar novos colaboradores.`,
          currentCount,
          maxLimit,
          planName: plan.name,
          planId: String(plan.id),
        };
      }

      return {
        allowed: true,
        currentCount,
        maxLimit,
        planName: plan.name,
        planId: String(plan.id),
      };
    }

    return {
      allowed: true,
      currentCount: 0,
      maxLimit: 9999,
      planName: plan.name,
      planId: String(plan.id),
    };
  },

  /**
   * Buscar planos de assinatura atualizados na nuvem do Supabase
   */
  async fetchSubscriptionPlansCloud(): Promise<{ success: boolean; plans: SubscriptionPlan[]; fromCloud: boolean }> {
    if (SupabaseService.isConfigured()) {
      try {
        const res = await SupabaseService.fetchSubscriptionPlans();
        if (res.success && Array.isArray(res.plans) && res.plans.length > 0) {
          this.saveSubscriptionPlans(res.plans, true);
          return { success: true, plans: res.plans, fromCloud: true };
        }
      } catch (err) {
        console.warn('[StorageService] Falha ao carregar subscription_plans do Supabase:', err);
      }
    }
    return { success: false, plans: this.getSubscriptionPlans(), fromCloud: false };
  },

  /**
   * Limpeza Geral de Dados de Teste (Reset para Lançamento Oficial)
   * Apaga todas as empresas, workspaces e usuários criados durante os testes.
   * PRESERVA ESTREITAMENTE:
   * - Master (Super Admin Alan Silva)
   * - Empresa Matriz e Workspace Padrão
   * - Configurações e Tabela de Planos de Assinatura
   */
  async resetTestDataToProduction(): Promise<{
    success: boolean;
    usersCount: number;
    workspacesCount: number;
    clientsCount: number;
  }> {
    // 1. Zera usuários deixando estritamente o Master
    const masterOnlyUsers: User[] = [MASTER_USER];
    this.saveUsers(masterOnlyUsers, true);
    this.setCurrentUserId(MASTER_USER.id);

    // 2. Reseta workspaces mantendo unicamente ws-principal com Master como owner
    const initialWorkspace: Workspace = {
      id: 'ws-principal',
      name: 'Meu Workspace',
      slug: 'meu-workspace',
      description: 'Espaço de trabalho corporativo',
      logoColor: '#173653',
      ownerId: MASTER_USER.id,
      companyId: 'client-matriz',
      companyName: 'OperaTask Matriz',
      clientPlan: 'profissional',
      clientStatus: 'active',
      members: [
        { userId: MASTER_USER.id, role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' }
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const resetWorkspaces: Workspace[] = [initialWorkspace];
    this.saveWorkspaces(resetWorkspaces, true);
    this.setCurrentWorkspaceId(initialWorkspace.id);

    // 3. Reseta projetos mantendo o Quadro Principal ativo no ws-principal
    const initialProject: Project = {
      id: 'proj-ws-principal-principal',
      workspaceId: 'ws-principal',
      name: 'Quadro Principal',
      description: 'Quadro de tarefas e fluxo operacional do espaço Meu Workspace',
      color: '#2563eb',
      icon: 'folder',
      columns: [
        { id: 'col-ws-principal-backlog', title: 'Backlog', color: '#64748b', order: 0 },
        { id: 'col-ws-principal-progress', title: 'Em Andamento', color: '#2563eb', order: 1 },
        { id: 'col-ws-principal-review', title: 'Revisão / QA', color: '#d97706', order: 2 },
        { id: 'col-ws-principal-done', title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
      ],
      memberIds: [MASTER_USER.id],
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.saveProjects([initialProject], true);

    // 4. Limpa tarefas, atividades e notificações
    this.saveTasks([], true);
    this.saveActivities([], true);
    this.saveNotifications([], true);

    // 5. Reseta empresas/clientes mantendo unicamente a Matriz
    const matrizClient: ClientCompany = {
      id: 'client-matriz',
      name: 'OperaTask Matriz',
      legalName: 'OperaTask Tecnologia Ltda',
      status: 'active',
      plan: 'profissional',
      paymentStatus: 'paid',
      primaryWorkspaceId: 'ws-principal',
      workspaceIds: ['ws-principal'],
      ownerId: MASTER_USER.id,
      ownerName: 'Alan Silva (Master)',
      ownerEmail: 'alanvitordasilva@gmail.com.br',
      createdAt: '2026-01-01T00:00:00.000Z',
      planStartDate: '2026-01-01T00:00:00.000Z',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxUsers: 9999,
      notes: 'Empresa Matriz Padrão da Plataforma',
    };
    this.saveClients([matrizClient], true);

    // 6. Broadcast via WebSocket e eventos locais
    RealtimeService.broadcast('users', masterOnlyUsers, { action: 'reset_test_data' });
    RealtimeService.broadcast('workspaces', resetWorkspaces, { action: 'reset_test_data' });
    RealtimeService.broadcast('clients', [matrizClient], { action: 'reset_test_data' });
    RealtimeService.broadcast('projects', [initialProject], { action: 'reset_test_data' });
    RealtimeService.broadcast('tasks', [], { action: 'reset_test_data' });

    // 7. Sincroniza limpeza no Supabase se configurado
    if (SupabaseService.isConfigured()) {
      await SupabaseService.resetTestDataOnSupabase();
    }

    return {
      success: true,
      usersCount: 1,
      workspacesCount: 1,
      clientsCount: 1,
    };
  },

  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      let list: Project[] = data ? JSON.parse(data) : [];
      if (!Array.isArray(list)) list = [];

      // Garante que exista ao menos 1 quadro padrão caso a lista esteja vazia
      if (list.length === 0) {
        const defaultProj: Project = {
          id: 'proj-principal-default',
          workspaceId: 'ws-principal',
          name: 'Quadro Principal',
          description: 'Quadro operacional e gestão de tarefas',
          color: '#2563eb',
          icon: 'folder',
          columns: [
            { id: 'col-backlog', title: 'Backlog', color: '#64748b', order: 0 },
            { id: 'col-progress', title: 'Em Andamento', color: '#2563eb', order: 1 },
            { id: 'col-review', title: 'Revisão / QA', color: '#d97706', order: 2 },
            { id: 'col-done', title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
          ],
          memberIds: [],
          isArchived: false,
          createdAt: new Date().toISOString(),
        };
        list = [defaultProj];
        this.saveProjects(list, true);
      }
      return list;
    } catch {
      return [];
    }
  },

  saveProjects(projects: Project[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    handleSaveMutation(STORAGE_KEYS.PROJECTS, projects, immediate);
  },

  getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) {
        this.saveTasks(DEFAULT_TASKS);
        return DEFAULT_TASKS;
      }
      const parsed: Task[] = JSON.parse(data);
      let needsResave = false;
      const normalized = parsed.map((t) => {
        if (t.dueDate && !t.dueDate.includes('T')) {
          needsResave = true;
          return { ...t, dueDate: `${t.dueDate}T23:59` };
        }
        return t;
      });
      if (needsResave) {
        this.saveTasks(normalized);
      }
      return normalized;
    } catch {
      return DEFAULT_TASKS;
    }
  },

  saveTasks(tasks: Task[], immediate = false): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    handleSaveMutation(STORAGE_KEYS.TASKS, tasks, immediate);
  },

  // ========================================================================
  // OPERAÇÕES ASSÍNCRONAS CONECTADAS DIRETAMENTE AO SUPABASE (CLOUD-FIRST)
  // ========================================================================

  /**
   * Buscar tarefas da nuvem do Supabase de forma assíncrona com fallback local
   */
  async fetchTasksCloud(workspaceId?: string, projectId?: string): Promise<{ success: boolean; tasks: Task[]; fromCloud: boolean }> {
    if (SupabaseService.isConfigured()) {
      try {
        const res = await SupabaseService.fetchTasks(workspaceId, projectId);
        if (res.success && Array.isArray(res.tasks)) {
          // Atualiza o cache local mantendo o estado sincronizado
          const localTasks = this.getTasks();
          // Se buscou filtrado por workspace, mescla
          let merged: Task[];
          if (workspaceId) {
            const others = localTasks.filter((t) => t.workspaceId !== workspaceId);
            merged = [...others, ...res.tasks];
          } else {
            merged = res.tasks;
          }
          this.saveTasks(merged, true);
          return { success: true, tasks: merged, fromCloud: true };
        }
      } catch (err) {
        console.warn('[StorageService] Falha ao carregar tarefas do Supabase:', err);
      }
    }
    // Fallback: retorna dados locais
    const tasks = this.getTasks();
    const filtered = workspaceId ? tasks.filter((t) => t.workspaceId === workspaceId) : tasks;
    return { success: false, tasks: filtered, fromCloud: false };
  },

  /**
   * Criar tarefa diretamente no Supabase e refletir no armazenamento local
   */
  async createTaskAsync(task: Task): Promise<{ success: boolean; task: Task }> {
    // 1. Atualiza estado local imediatamente
    const current = this.getTasks();
    const nextList = [task, ...current.filter((t) => t.id !== task.id)];
    this.saveTasks(nextList, true);

    // 2. Persiste diretamente no Supabase se configurado
    if (SupabaseService.isConfigured()) {
      try {
        const cloudRes = await SupabaseService.createTask(task);
        if (cloudRes.success && cloudRes.task) {
          const updatedList = nextList.map((t) => (t.id === task.id ? cloudRes.task! : t));
          this.saveTasks(updatedList, true);
          return { success: true, task: cloudRes.task };
        }
      } catch (e) {
        console.warn('[StorageService] Erro ao criar tarefa no Supabase:', e);
      }
    }
    return { success: true, task };
  },

  /**
   * Atualizar tarefa diretamente no Supabase e refletir no armazenamento local
   */
  async updateTaskAsync(taskId: string, updates: Partial<Task>): Promise<{ success: boolean }> {
    // 1. Atualiza estado local imediatamente
    const current = this.getTasks();
    const updatedList = current.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    this.saveTasks(updatedList, true);

    // 2. Persiste diretamente no Supabase se configurado
    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.updateTask(taskId, updates);
      } catch (e) {
        console.warn('[StorageService] Erro ao atualizar tarefa no Supabase:', e);
      }
    }
    return { success: true };
  },

  /**
   * Excluir tarefa diretamente no Supabase e refletir no armazenamento local
   */
  async deleteTaskAsync(taskId: string): Promise<{ success: boolean }> {
    // 1. Remove do estado local
    const current = this.getTasks();
    const filtered = current.filter((t) => t.id !== taskId);
    this.saveTasks(filtered, true);

    // 2. Exclui diretamente no Supabase se configurado
    if (SupabaseService.isConfigured()) {
      try {
        await SupabaseService.deleteTask(taskId);
      } catch (e) {
        console.warn('[StorageService] Erro ao excluir tarefa no Supabase:', e);
      }
    }
    return { success: true };
  },

  getTags(): Tag[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TAGS);
      if (!data) {
        this.saveTags(DEFAULT_TAGS);
        return DEFAULT_TAGS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TAGS;
    }
  },

  saveTags(tags: Tag[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    handleSaveMutation(STORAGE_KEYS.TAGS, tags, immediate);
  },

  getActivities(): WorkspaceActivity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (!data) {
        this.saveActivities(DEFAULT_ACTIVITIES);
        return DEFAULT_ACTIVITIES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_ACTIVITIES;
    }
  },

  saveActivities(activities: WorkspaceActivity[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    handleSaveMutation(STORAGE_KEYS.ACTIVITIES, activities, immediate);
  },

  addActivity(activity: Omit<WorkspaceActivity, 'id' | 'timestamp'>): void {
    const list = this.getActivities();
    const newAct: WorkspaceActivity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    this.saveActivities([newAct, ...list.slice(0, 99)], true);
  },

  getNotifications(): Notification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!data) {
        this.saveNotifications(DEFAULT_NOTIFICATIONS);
        return DEFAULT_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: Notification[], immediate = true): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    handleSaveMutation(STORAGE_KEYS.NOTIFICATIONS, notifications, immediate);
  },

  addNotification(notif: Omit<Notification, 'id' | 'read' | 'createdAt'>): void {
    const list = this.getNotifications();
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.saveNotifications([newNotif, ...list], true);
  },

  getTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  },

  saveTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getViewMode(): string {
    return localStorage.getItem(STORAGE_KEYS.VIEW_MODE) || 'kanban';
  },

  saveViewMode(mode: string): void {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  },

  exportBackup(): string {
    const data = {
      version: '2.0-operatask',
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
      workspaces: this.getWorkspaces(),
      projects: this.getProjects(),
      tasks: this.getTasks(),
      tags: this.getTags(),
      activities: this.getActivities(),
      notifications: this.getNotifications(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.tasks) && Array.isArray(parsed.projects)) {
        if (parsed.users) this.saveUsers(parsed.users, true);
        if (parsed.workspaces) this.saveWorkspaces(parsed.workspaces, true);
        this.saveProjects(parsed.projects, true);
        this.saveTasks(parsed.tasks, true);
        if (parsed.tags) this.saveTags(parsed.tags, true);
        if (parsed.activities) this.saveActivities(parsed.activities, true);
        if (parsed.notifications) this.saveNotifications(parsed.notifications, true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  isAuthenticated(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_STATUS) === 'true';
    } catch {
      return false;
    }
  },

  setAuthenticated(status: boolean): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, String(status));
  },

  cleanAllQuadros(): void {
    this.saveProjects([], true);
    this.saveTasks([], true);
    this.saveActivities([], true);
  },

  loadSampleBoard(workspaceId: string, currentUserId: string): { project: Project; tasks: Task[] } {
    const { project, tasks } = createSampleBoardData(workspaceId, currentUserId);
    const existingProjects = this.getProjects();
    const existingTasks = this.getTasks();
    this.saveProjects([...existingProjects, project], true);
    this.saveTasks([...existingTasks, ...tasks], true);
    return { project, tasks };
  },

  // ==========================================
  // Gestão de Fichas Técnicas & Persistência
  // ==========================================
  getFichasTecnicas(): FichaTecnica[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FICHAS_TECNICAS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Se não houver nada salvo ainda, inicializa com receitas padrão e salva
      this.saveFichasTecnicas(DEFAULT_FICHAS_TECNICAS, true);
      return DEFAULT_FICHAS_TECNICAS;
    } catch {
      return DEFAULT_FICHAS_TECNICAS;
    }
  },

  saveFichasTecnicas(fichas: FichaTecnica[], immediate = false): void {
    localStorage.setItem(STORAGE_KEYS.FICHAS_TECNICAS, JSON.stringify(fichas));
    handleSaveMutation(STORAGE_KEYS.FICHAS_TECNICAS, fichas, immediate);
  },

  saveFichaTecnica(ficha: FichaTecnica, immediate = false): FichaTecnica {
    const list = this.getFichasTecnicas();
    const cleanName = ficha.nomeItem.trim();
    const existingIndex = list.findIndex(
      (f) =>
        (ficha.id && f.id === ficha.id) ||
        f.nomeItem.trim().toLowerCase() === cleanName.toLowerCase()
    );

    const updatedFicha: FichaTecnica = {
      ...ficha,
      id: ficha.id || (existingIndex !== -1 ? list[existingIndex].id : `ficha-${Date.now()}`),
      nomeItem: cleanName,
      updatedAt: new Date().toISOString(),
    };

    let updatedList: FichaTecnica[];
    if (existingIndex !== -1) {
      updatedList = [...list];
      updatedList[existingIndex] = updatedFicha;
    } else {
      updatedList = [updatedFicha, ...list];
    }

    this.saveFichasTecnicas(updatedList, immediate);
    return updatedFicha;
  },

  deleteFichaTecnica(idOrName: string): boolean {
    const list = this.getFichasTecnicas();
    const clean = idOrName.trim().toLowerCase();
    const filtered = list.filter(
      (f) => f.id !== idOrName && f.nomeItem.trim().toLowerCase() !== clean
    );

    if (filtered.length !== list.length) {
      this.saveFichasTecnicas(filtered, true);
      return true;
    }
    return false;
  },

  searchFichasTecnicas(query: string): FichaTecnica[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];
    const list = this.getFichasTecnicas();
    return list.filter((f) => f.nomeItem.toLowerCase().includes(clean));
  },

  // ==========================================
  // Cadastro de Novo Usuário (Apenas Dono/Admin)
  // ==========================================
  async registerUser(params: {
    name: string;
    username?: string;
    usernameOrEmail?: string;
    email?: string;
    password?: string;
    role: WorkspaceRole;
    workspaceId?: string;
    workspaceIds?: string[];
    companyId?: string;
    tenantId?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanName = params.name.trim();
    const rawUsername = (params.username || params.usernameOrEmail || '').trim().toLowerCase();
    // Preserva o caractere @ obrigatório para o login, mantendo caracteres válidos de login/email
    const cleanUsername = rawUsername.replace(/\s+/g, '').replace(/[^a-z0-9._@+-]/g, '');
    const cleanEmail = (params.email || (cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@operatask.app`)).trim().toLowerCase();
    const cleanPassword = params.password?.trim() || '';

    const targetWorkspaceIds: string[] = Array.isArray(params.workspaceIds) && params.workspaceIds.length > 0
      ? params.workspaceIds.map((w) => w.trim()).filter(Boolean)
      : params.workspaceId?.trim()
      ? [params.workspaceId.trim()]
      : [];

    if (!cleanName) {
      return { success: false, error: 'O nome completo do usuário é obrigatório.' };
    }
    if (!cleanUsername) {
      return { success: false, error: 'O nome de usuário para login é obrigatório.' };
    }
    if (!cleanUsername.includes('@')) {
      return {
        success: false,
        error: 'O nome de usuário (login) deve conter obrigatoriamente o caractere @ (ex: usuario@operatask.app ou seu e-mail).',
      };
    }
    if (cleanUsername.length < 5) {
      return { success: false, error: 'O nome de usuário deve conter pelo menos 5 caracteres (incluindo o @).' };
    }
    if (targetWorkspaceIds.length === 0) {
      return { success: false, error: 'A seleção de pelo menos um Workspace é obrigatória.' };
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const currentUsers = this.getUsers();
    // Valida se o nome de usuário ou e-mail já existe
    const exists = currentUsers.some(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUsername) ||
        u.email.trim().toLowerCase() === cleanEmail ||
        u.email.trim().toLowerCase().split('@')[0] === cleanUsername
    );

    if (exists) {
      return {
        success: false,
        error: 'Já existe um usuário cadastrado com este nome de usuário ou e-mail.',
      };
    }

    // Cores agradáveis para avatar
    const avatarColors = [
      '#173653',
      '#34B1AC',
      '#059669',
      '#2563eb',
      '#7c3aed',
      '#db2777',
      '#ea580c',
      '#0891b2',
    ];
    const chosenColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const roleTitleMap: Record<string, string> = {
      master: 'Super Administrador / Master',
      dono: 'Dono do Workspace',
      owner: 'Dono do Workspace',
      administrador: 'Administrador',
      admin: 'Administrador',
      producao: 'Produção',
      production: 'Produção',
      membro: 'Membro da Equipe',
      member: 'Membro da Equipe',
      visualizador: 'Visualizador',
      viewer: 'Visualizador',
    };

    const allWorkspaces = this.getWorkspaces();
    const primaryWs = allWorkspaces.find((w) => targetWorkspaceIds.includes(w.id));
    const assignedCompanyId = params.companyId || params.tenantId || primaryWs?.companyId || (primaryWs as any)?.tenantId || primaryWs?.id;

    let newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      avatarColor: chosenColor,
      title: roleTitleMap[params.role] || 'Membro da Equipe',
      tipo: (params.role as any) || 'membro',
      status: 'active',
      isActive: true,
      tenantId: assignedCompanyId,
      companyId: assignedCompanyId,
      createdAt: new Date().toISOString(),
    };

    // 0. Se Supabase estiver configurado, grava no Supabase (auth.users + profiles + workspace_members)
    if (SupabaseService.isConfigured()) {
      try {
        for (const wsId of targetWorkspaceIds) {
          const sbResult = await SupabaseService.registerUser({
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            password: cleanPassword,
            tipo: (params.role as any) || 'membro',
            workspaceId: wsId,
            companyId: assignedCompanyId,
            tenantId: assignedCompanyId,
            avatarColor: chosenColor,
          });
          if (sbResult.success && sbResult.user) {
            newUser = { ...newUser, ...sbResult.user, id: sbResult.user.id };
          }
        }
      } catch (sbErr) {
        console.warn('[OperaTask] Supabase registration notice:', sbErr);
      }
    }

    // 1. Grava no servidor central via POST /api/auth/register para garantir acesso em todos os aparelhos
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newUser.id,
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail,
            password: cleanPassword,
            role: params.role,
            workspaceId: targetWorkspaceIds[0],
            workspaceIds: targetWorkspaceIds,
            avatarColor: chosenColor,
          }),
        });

        if (resp.ok) {
          const resData = await resp.json();
          if (resData.user) {
            newUser = { ...newUser, ...resData.user, status: 'active', isActive: true };
          }
          if (Array.isArray(resData.users)) {
            this.saveUsers(resData.users, true);
          }
          if (Array.isArray(resData.workspaces)) {
            this.saveWorkspaces(resData.workspaces, true);
          }
        }
      } catch (e) {
        console.warn('[OperaTask] Falha ao registrar no servidor central (modo offline):', e);
      }
    }

    // 2. Garante persistência local no navegador atual
    const freshUsers = this.getUsers();
    if (!freshUsers.some((u) => u.id === newUser.id)) {
      freshUsers.push(newUser);
      this.saveUsers(freshUsers, true);
    }

    // 3. Vincula o usuário aos workspaces selecionados localmente
    const workspaces = this.getWorkspaces();
    let workspacesChanged = false;
    for (const wsId of targetWorkspaceIds) {
      const wsIndex = workspaces.findIndex((w) => w.id === wsId);
      if (wsIndex !== -1) {
        const ws = workspaces[wsIndex];
        const memberExists = ws.members.some((m) => m.userId === newUser.id);
        if (!memberExists) {
          ws.members.push({
            userId: newUser.id,
            role: params.role,
            joinedAt: new Date().toISOString(),
          });
          workspacesChanged = true;
        }
      }
    }
    if (workspacesChanged) {
      this.saveWorkspaces(workspaces, true);
      if (SupabaseService.isConfigured()) {
        for (const wsId of targetWorkspaceIds) {
          SupabaseService.upsertWorkspaceMember(wsId, newUser.id, params.role).catch(() => {});
        }
      }
    }

    return { success: true, user: newUser };
  },

  resetAll(): void {
    this.saveUsers(DEFAULT_USERS, true);
    this.setCurrentUserId(DEFAULT_USERS[0].id);
    this.saveWorkspaces(DEFAULT_WORKSPACES, true);
    this.setCurrentWorkspaceId(DEFAULT_WORKSPACES[0].id);
    this.saveProjects(DEFAULT_PROJECTS, true);
    this.saveTasks(DEFAULT_TASKS, true);
    this.saveTags(DEFAULT_TAGS, true);
    this.saveActivities(DEFAULT_ACTIVITIES, true);
    this.saveNotifications(DEFAULT_NOTIFICATIONS, true);
    this.saveFichasTecnicas(DEFAULT_FICHAS_TECNICAS, true);
  },
};

