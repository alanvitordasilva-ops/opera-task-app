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
} from '../types/index.ts';
import { SupabaseService } from './supabaseService.ts';
import { RealtimeService, SyncEntity } from './realtimeService.ts';

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
  {
    id: 'user-1793786775388-zb8a',
    name: 'Carlos Silva',
    username: 'carlos',
    email: 'carlos@operatask.app',
    password: '123',
    avatarColor: '#34B1AC',
    title: 'Membro da Equipe',
    status: 'active',
    isActive: true,
    createdAt: '2026-11-04T10:06:15.388Z',
  },
  {
    id: 'user-1793787546280-fcia',
    name: 'Maria Silva',
    username: 'mariasilva',
    email: 'mariasilva@operatask.app',
    password: 'opera123',
    avatarColor: '#34B1AC',
    title: 'Produção',
    status: 'active',
    isActive: true,
    createdAt: '2026-11-04T10:19:06.280Z',
  },
  {
    id: 'user-1793788666090-6lfr',
    name: 'Carlos Eduardo Silva',
    username: 'carlos.silva',
    email: 'carlos.silva@operatask.app',
    password: 'password123',
    avatarColor: '#34B1AC',
    title: 'Produção',
    tipo: 'producao',
    status: 'active',
    isActive: true,
    createdAt: '2026-11-04T10:37:46.090Z',
  },
  {
    id: 'user-1793792108304-72mo',
    name: 'Juliana Costa',
    username: 'juliana',
    email: 'juliana@empresa.com',
    password: 'password123',
    avatarColor: '#34B1AC',
    title: 'Membro da Equipe',
    tipo: 'membro',
    status: 'active',
    isActive: true,
    createdAt: '2026-11-04T11:35:08.304Z',
  },
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
      { userId: 'user-1793786775388-zb8a', role: 'member', joinedAt: '2026-11-04T10:06:15.388Z' },
      { userId: 'user-1793787546280-fcia', role: 'production', joinedAt: '2026-11-04T10:19:06.280Z' },
      { userId: 'user-1793788666090-6lfr', role: 'production', joinedAt: '2026-11-04T10:37:46.090Z' },
      { userId: 'user-1793792108304-72mo', role: 'member', joinedAt: '2026-11-04T11:35:08.304Z' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
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

let _serverApiAvailable: boolean | null = null;

export function isServerApiAvailable(): boolean {
  if (_serverApiAvailable !== null) return _serverApiAvailable;
  // Se estivermos em localhost ou porta de dev, assume true inicialmente; senão falso até comprovar
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    _serverApiAvailable = isLocal;
    return isLocal;
  }
  return false;
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
    if (typeof window === 'undefined' || !isServerApiAvailable()) return false;
    try {
      const res = await fetch('/api/sync/state');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.users) && data.users.length > 0) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
          }
          if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
            localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(data.workspaces));
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
          return true;
        }
      } else if (res.status === 404) {
        setServerApiAvailable(false);
      }
    } catch (e) {
      setServerApiAvailable(false);
      console.warn('[OperaTask] Servidor de sincronização indisponível:', e);
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
      const mockIds = ['user-beatriz', 'user-lucas', 'user-mariana', 'user-rafael', 'user-alan'];
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
      const clean = parsed.filter((w) => w.id !== 'ws-agency' && w.id !== 'ws-acme');
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

  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!data) {
        this.saveProjects(DEFAULT_PROJECTS);
        return DEFAULT_PROJECTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_PROJECTS;
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
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanName = params.name.trim();
    const rawUsername = (params.username || params.usernameOrEmail || '').trim().toLowerCase();
    const cleanUsername = rawUsername.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/^@/, '');
    const cleanEmail = (params.email || (cleanUsername ? `${cleanUsername}@operatask.app` : '')).trim().toLowerCase();
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

    // 1. Grava no servidor via POST /api/auth/register (se a API estiver disponível)
    if (typeof window !== 'undefined' && isServerApiAvailable()) {
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
        } else if (resp.status === 404) {
          setServerApiAvailable(false);
        }
      } catch (e) {
        setServerApiAvailable(false);
        console.warn('[OperaTask] Fallback local para registro offline:', e);
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

