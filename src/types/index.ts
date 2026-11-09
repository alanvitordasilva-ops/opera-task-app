export type Priority = 'low' | 'medium' | 'high' | 'urgent' | 'none';

export type ProfileTipo =
  | 'master'
  | 'dono'
  | 'administrador'
  | 'producao'
  | 'membro'
  | 'visualizador';

export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'member'
  | 'production'
  | 'viewer'
  | 'master'
  | 'dono'
  | 'administrador'
  | 'producao'
  | 'membro'
  | 'visualizador';

export type SystemRole = 'master' | 'user';

export interface SupabaseProfile {
  id: string; // uuid
  nome: string;
  email: string;
  tipo: ProfileTipo;
  avatar_url?: string;
  created_at?: string;
}

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
  tipo?: ProfileTipo;
  tenantId?: string; // Tenant isolado da empresa
  companyId?: string;
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export type ClientStatus = 'active' | 'trial' | 'suspended' | 'canceled';
export type TenantStatus = ClientStatus;

export type ClientPlan = 'trial' | 'basico' | 'profissional' | 'enterprise' | 'starter' | 'pro';
export type TenantPlan = ClientPlan;

export type PaymentStatus = 'paid' | 'past_due' | 'unpaid' | 'trialing' | 'canceled';

export interface PlanConfig {
  id: 'trial' | 'basico' | 'profissional' | 'enterprise';
  name: string;
  badge: string;
  description: string;
  priceMonthly: number;
  maxUsers: number;
  trialDays?: number;
  features: string[];
  popular?: boolean;
}

export const normalizePlan = (
  plan?: ClientPlan | string | null
): 'trial' | 'basico' | 'profissional' | 'enterprise' => {
  if (!plan) return 'trial';
  const p = String(plan).toLowerCase();
  if (p === 'pro' || p === 'profissional') return 'profissional';
  if (p === 'starter' || p === 'basico') return 'basico';
  if (p === 'enterprise') return 'enterprise';
  return 'trial';
};

export const PLAN_CONFIGS: Record<ClientPlan, PlanConfig> = {
  trial: {
    id: 'trial',
    name: 'Trial Gratuito',
    badge: '14 Dias Grátis',
    description: 'Teste completo de todos os recursos da plataforma',
    priceMonthly: 0,
    maxUsers: 5,
    trialDays: 14,
    features: [
      'Até 5 usuários na equipe',
      '14 dias de acesso irrestrito',
      'Quadros Kanban e visualização em lista',
      'Fichas técnicas e ordens de produção',
      'Suporte inicial da equipe',
    ],
  },
  basico: {
    id: 'basico',
    name: 'Básico',
    badge: 'Uso Inicial',
    description: 'Ideal para equipes em fase inicial de estruturação',
    priceMonthly: 97,
    maxUsers: 10,
    features: [
      'Até 10 usuários ativos',
      'Workspaces e projetos ilimitados',
      'Quadros Kanban e lista de tarefas',
      'Fichas técnicas padrão',
      'Registro básico de produção',
      'Suporte por e-mail em horário comercial',
    ],
  },
  starter: {
    id: 'basico',
    name: 'Básico (Starter)',
    badge: 'Uso Inicial',
    description: 'Ideal para equipes em fase inicial de estruturação',
    priceMonthly: 97,
    maxUsers: 10,
    features: [
      'Até 10 usuários ativos',
      'Workspaces e projetos ilimitados',
      'Quadros Kanban e lista de tarefas',
      'Fichas técnicas padrão',
      'Registro básico de produção',
      'Suporte por e-mail em horário comercial',
    ],
  },
  profissional: {
    id: 'profissional',
    name: 'Profissional',
    badge: 'Mais Popular',
    popular: true,
    description: 'Para empresas com produção ativa e múltiplos setores',
    priceMonthly: 247,
    maxUsers: 30,
    features: [
      'Até 30 usuários na empresa',
      'Todos os recursos do plano Básico',
      'Dashboard de produtividade avançado',
      'Fichas técnicas completas com cálculo de custos',
      'Histórico de auditoria e métricas em tempo real',
      'Suporte prioritário via WhatsApp',
    ],
  },
  pro: {
    id: 'profissional',
    name: 'Profissional (Pro)',
    badge: 'Mais Popular',
    popular: true,
    description: 'Para empresas com produção ativa e múltiplos setores',
    priceMonthly: 247,
    maxUsers: 30,
    features: [
      'Até 30 usuários na empresa',
      'Todos os recursos do plano Básico',
      'Dashboard de produtividade avançado',
      'Fichas técnicas completas com cálculo de custos',
      'Histórico de auditoria e métricas em tempo real',
      'Suporte prioritário via WhatsApp',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Escala Ilimitada',
    description: 'Solução sob medida para grandes indústrias e redes',
    priceMonthly: 597,
    maxUsers: 9999,
    features: [
      'Usuários e membros ilimitados',
      'Múltiplos workspaces por subsidiária',
      'Isolamento e banco de dados dedicado',
      'SLA garantido de 99.9%',
      'Gerente de contas e suporte 24/7',
      'Integrações customizadas via Webhook/API',
    ],
  },
};

export interface ClientCompany {
  id: string; // ID do Tenant (ex: 'tenant-123' ou 'client-123')
  name: string;
  legalName?: string;
  cnpjOrDoc?: string;
  status: ClientStatus;
  plan: ClientPlan;
  paymentStatus: PaymentStatus;
  primaryWorkspaceId: string;
  workspaceIds: string[];
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  createdAt: string;
  lastAccessAt?: string;
  planStartDate?: string;
  planExpiresAt?: string;
  nextBillingDate?: string;
  maxUsers: number;
  monthlyFee?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentMethodId?: string;
  notes?: string;
}

export type Tenant = ClientCompany;

export interface SupportModeState {
  isActive: boolean;
  clientName: string;
  clientId: string;
  workspaceId: string;
  enteredAt: string;
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
  tenantId?: string;
  companyId?: string;
  clientStatus?: ClientStatus;
  clientPlan?: ClientPlan;
  paymentStatus?: PaymentStatus;
  companyName?: string;
  lastAccessAt?: string;
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
  tenantId?: string;
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
  details?: string;
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
  tenantId?: string;
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
  tenantId?: string;
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
  tenantId?: string;
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

