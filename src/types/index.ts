export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'production' | 'viewer';

export type SystemRole = 'master' | 'user';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatarColor: string;
  title?: string;
  avatarUrl?: string;
  password?: string;
  createdAt?: string;
  phone?: string;
  bio?: string;
  systemRole?: SystemRole;
  isSuperAdmin?: boolean;
  status?: 'active' | 'inactive';
  isActive?: boolean;
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoColor: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  isCompletedColumn?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  columns: BoardColumn[];
  memberIds: string[];
  isArchived?: boolean;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  mentions?: string[]; // userIds
}

export interface TaskActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export type MediaCategory = 'image' | 'video' | 'audio' | 'document';

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: string;
  bytes: number;
  type: string;
  mediaCategory: MediaCategory;
  uploadedAt: string;
  thumbnailUrl?: string;
  duration?: number;
  order?: number;
}

export type UnidadeMedida = 'Kg' | 'Litros';

export interface Ingrediente {
  id: string;
  nome: string;
  quantidade: string;
  unidade: UnidadeMedida;
}

export interface FichaTecnica {
  id?: string;
  nomeItem: string;
  ingredientes: Ingrediente[];
  rendimento?: string;
  observacoes?: string;
  updatedAt?: string;
}

export interface ProductionIngredientCalculation {
  ingredienteId: string;
  nome: string;
  quantidadeOriginal: string;
  quantidadeCalculada: number;
  quantidadeFormatada: string;
  unidade: UnidadeMedida;
}

export interface ProductionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  nomeItem: string;
  quantidadeDesejada: number;
  unidadeProducao: string;
  quantidadeBase: number;
  fator: number;
  ingredientes: ProductionIngredientCalculation[];
  observacoes?: string;
  producedByUserId?: string;
  producedByUserName?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeIds: string[];
  dueDate: string; // YYYY-MM-DDTHH:mm ou YYYY-MM-DD (data e horário de execução)
  tags: Tag[];
  checklist: ChecklistItem[];
  comments: Comment[];
  activities: TaskActivity[];
  attachments?: TaskAttachment[];
  fichaTecnica?: FichaTecnica | null;
  productionRecords?: ProductionRecord[];
  isCompleted: boolean;
  completedAt?: string | null;
  isArchived?: boolean;
  archivedAt?: string;
  order: number;
  frameColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  taskTitle?: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: string;
}

export type NotificationType =
  | 'assigned'
  | 'mention'
  | 'overdue'
  | 'member_invited'
  | 'status_change';

export interface Notification {
  id: string;
  userId: string; // Destinatário
  actorId: string; // Quem fez a ação
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
}

export type ViewMode =
  | 'kanban'
  | 'list'
  | 'my_tasks'
  | 'dashboard'
  | 'activity_feed';

export type DateFilter = 'all' | 'overdue' | 'today' | 'week' | 'month';

export interface FilterOptions {
  search: string;
  priority: Priority | 'all';
  columnId: string | 'all';
  projectId: string | 'all';
  assigneeId: string | 'all';
  tagId: string | 'all';
  dateFilter: DateFilter;
  sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

export type SaveState = 'saved' | 'saving' | 'offline' | 'error';

export interface SaveStatus {
  state: SaveState;
  lastSavedAt: string | null;
  pendingCount: number;
  errorMessage?: string;
  isOnline: boolean;
  cloudSyncEnabled?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
  lastSyncedAt?: string | null;
}

