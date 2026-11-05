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
  {
    id: 'user-davi-tantan',
    name: 'Davi',
    username: 'davi.tantan.com.br',
    email: 'davi@tantan.com.br',
    password: 'password123',
    avatarColor: '#34B1AC',
    title: 'Produção',
    tipo: 'producao',
    status: 'active',
    isActive: true,
    createdAt: '2026-11-05T12:00:00.000Z',
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
      { userId: 'user-1793786775388-zb8a', role: 'member', joinedAt: '2026-11-04T10:06:15.388Z' },
      { userId: 'user-1793787546280-fcia', role: 'producao', joinedAt: '2026-11-04T10:19:06.280Z' },
      { userId: 'user-1793788666090-6lfr', role: 'producao', joinedAt: '2026-11-04T10:37:46.090Z' },
      { userId: 'user-1793792108304-72mo', role: 'member', joinedAt: '2026-11-04T11:35:08.304Z' },
      { userId: 'user-davi-tantan', role: 'producao', joinedAt: '2026-11-05T12:00:00.000Z' },
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
