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

export function getServerStore() {
  return {
    users: globalStore.__operatask_users!,
    workspaces: globalStore.__operatask_workspaces!,
    projects: globalStore.__operatask_projects!,
    tasks: globalStore.__operatask_tasks!,
  };
}
