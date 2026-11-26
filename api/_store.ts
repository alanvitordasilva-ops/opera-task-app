// Central mock/in-memory state for Vercel serverless functions
export interface ServerUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  avatarColor?: string;
  title?: string;
  systemRole?: 'master' | 'admin' | 'member';
  isSuperAdmin?: boolean;
  tipo?: string;
  companyId?: string;
  tenantId?: string;
  workspaceId?: string;
  workspaceIds?: string[];
  status: 'active' | 'pending' | 'inactive';
  isActive: boolean;
  createdAt: string;
  bio?: string;
}

export const INITIAL_USERS: ServerUser[] = [
  {
    id: 'user-master-alan',
    name: 'Alan Silva (Master)',
    username: 'alan',
    email: 'alanvitordasilva@gmail.com.br',
    avatarColor: '#173653',
    title: 'Super Administrador / Master',
    systemRole: 'master',
    isSuperAdmin: true,
    status: 'active',
    isActive: true,
    password: '273021',
    createdAt: '2026-01-01T00:00:00.000Z',
    bio: 'Conta Master com acesso total e irrestrito a todas as configurações, workspaces e dados do OperaTask.',
  },
];

export const INITIAL_WORKSPACES = [
  {
    id: 'ws-principal',
    name: 'Meu Workspace',
    slug: 'meu-workspace',
    description: 'Espaço de trabalho corporativo',
    logoColor: '#173653',
    ownerId: 'user-master-alan',
    members: [
      { userId: 'user-master-alan', role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// In-memory store for serverless environment
const globalStore = global as unknown as {
  __operatask_users?: ServerUser[];
  __operatask_workspaces?: any[];
  __operatask_projects?: any[];
  __operatask_tasks?: any[];
  __operatask_tags?: any[];
  __operatask_activities?: any[];
  __operatask_notifications?: any[];
  __operatask_fichas_tecnicas?: any[];
  __operatask_clients?: any[];
  __operatask_deleted_task_ids?: string[];
  __operatask_deleted_project_ids?: string[];
  __operatask_deleted_workspace_ids?: string[];
  __operatask_version?: number;
  __operatask_last_reset_at?: string | null;
};

if (!globalStore.__operatask_users) {
  globalStore.__operatask_users = [...INITIAL_USERS];
}
if (!globalStore.__operatask_workspaces) {
  globalStore.__operatask_workspaces = [...INITIAL_WORKSPACES];
}
if (!globalStore.__operatask_projects) {
  globalStore.__operatask_projects = [];
}
if (!globalStore.__operatask_tasks) {
  globalStore.__operatask_tasks = [];
}
if (!globalStore.__operatask_tags) {
  globalStore.__operatask_tags = [
    { id: 'tag-frontend', name: 'Frontend', color: '#2563eb' },
    { id: 'tag-design', name: 'Design & UX', color: '#db2777' },
    { id: 'tag-backend', name: 'Backend & API', color: '#ea580c' },
    { id: 'tag-bug', name: 'Bug Crítico', color: '#dc2626' },
    { id: 'tag-feature', name: 'Nova Feature', color: '#059669' },
    { id: 'tag-devops', name: 'Infra / Cloud', color: '#7c3aed' },
  ];
}
if (!globalStore.__operatask_activities) {
  globalStore.__operatask_activities = [];
}
if (!globalStore.__operatask_notifications) {
  globalStore.__operatask_notifications = [];
}
if (!globalStore.__operatask_fichas_tecnicas) {
  globalStore.__operatask_fichas_tecnicas = [];
}
if (!globalStore.__operatask_clients) {
  globalStore.__operatask_clients = [];
}
if (!globalStore.__operatask_deleted_task_ids) {
  globalStore.__operatask_deleted_task_ids = [];
}
if (!globalStore.__operatask_deleted_project_ids) {
  globalStore.__operatask_deleted_project_ids = [];
}
if (!globalStore.__operatask_deleted_workspace_ids) {
  globalStore.__operatask_deleted_workspace_ids = [];
}
if (typeof globalStore.__operatask_version !== 'number') {
  globalStore.__operatask_version = Date.now();
}
if (globalStore.__operatask_last_reset_at === undefined) {
  globalStore.__operatask_last_reset_at = null;
}

export function getServerStore() {
  return {
    get users() {
      return globalStore.__operatask_users!;
    },
    set users(val: ServerUser[]) {
      globalStore.__operatask_users = val;
    },
    get workspaces() {
      return globalStore.__operatask_workspaces!;
    },
    set workspaces(val: any[]) {
      globalStore.__operatask_workspaces = val;
    },
    get projects() {
      return globalStore.__operatask_projects!;
    },
    set projects(val: any[]) {
      globalStore.__operatask_projects = val;
    },
    get tasks() {
      return globalStore.__operatask_tasks!;
    },
    set tasks(val: any[]) {
      globalStore.__operatask_tasks = val;
    },
    get tags() {
      return globalStore.__operatask_tags!;
    },
    set tags(val: any[]) {
      globalStore.__operatask_tags = val;
    },
    get activities() {
      return globalStore.__operatask_activities!;
    },
    set activities(val: any[]) {
      globalStore.__operatask_activities = val;
    },
    get notifications() {
      return globalStore.__operatask_notifications!;
    },
    set notifications(val: any[]) {
      globalStore.__operatask_notifications = val;
    },
    get fichas_tecnicas() {
      return globalStore.__operatask_fichas_tecnicas!;
    },
    set fichas_tecnicas(val: any[]) {
      globalStore.__operatask_fichas_tecnicas = val;
    },
    get clients() {
      return globalStore.__operatask_clients!;
    },
    set clients(val: any[]) {
      globalStore.__operatask_clients = val;
    },
    get deletedTaskIds() {
      return globalStore.__operatask_deleted_task_ids!;
    },
    set deletedTaskIds(val: string[]) {
      globalStore.__operatask_deleted_task_ids = val;
    },
    get deletedProjectIds() {
      return globalStore.__operatask_deleted_project_ids!;
    },
    set deletedProjectIds(val: string[]) {
      globalStore.__operatask_deleted_project_ids = val;
    },
    get deletedWorkspaceIds() {
      return globalStore.__operatask_deleted_workspace_ids!;
    },
    set deletedWorkspaceIds(val: string[]) {
      globalStore.__operatask_deleted_workspace_ids = val;
    },
    get version() {
      return globalStore.__operatask_version!;
    },
    bumpVersion() {
      const next = Math.max(Date.now(), (globalStore.__operatask_version || 0) + 1);
      globalStore.__operatask_version = next;
      return next;
    },
    get lastResetAt() {
      return globalStore.__operatask_last_reset_at ?? null;
    },
    set lastResetAt(val: string | null) {
      globalStore.__operatask_last_reset_at = val;
    },
  };
}
