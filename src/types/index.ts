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
  username?: string;
  email: string;
  tipo: ProfileTipo;
  avatar_url?: string;
  tenant_id?: string;
  company_id?: string;
  workspace_id?: string;
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
  workspaceId?: string;
  workspaceIds?: string[];
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export type ClientStatus = 'active' | 'trial' | 'suspended' | 'canceled';
export type TenantStatus = ClientStatus;

export type ClientPlan = 'gratuito' | 'basico' | 'intermediario' | 'profissional' | 'trial' | 'enterprise' | 'starter' | 'pro';
export type TenantPlan = ClientPlan;
export type PlanId = 'gratuito' | 'basico' | 'intermediario' | 'profissional';

export type PaymentStatus = 'paid' | 'past_due' | 'unpaid' | 'trialing' | 'canceled';

export interface PlanModulesConfig {
  advancedReports: boolean;      // Relatórios e métricas avançadas de produtividade
  customAttachments: boolean;    // Upload de mídias e arquivos ilimitados
  automations: boolean;          // Automações de status e fluxos operacionais
  unlimitedFichas: boolean;      // Fichas técnicas ilimitadas com cálculo de custos
  exportData: boolean;           // Exportação de dados (PDF, Excel, CSV)
  auditLog: boolean;             // Histórico completo de auditoria e governança
  prioritySupport: boolean;      // Atendimento prioritário via WhatsApp / Suporte VIP
}

export interface SubscriptionPlan {
  id: PlanId | string;
  name: string;
  badge: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  stripeMonthlyPriceId?: string;
  stripeAnnualPriceId?: string;
  maxUsers: number;              // Limite máximo de utilizadores permitidos na empresa
  maxBoards: number;             // Limite máximo de quadros (boards) criados
  features: string[];            // Bullet points de funcionalidades exibidas
  modules: PlanModulesConfig;    // Módulos operacionais liberados
  popular?: boolean;
  isActive: boolean;
  orderIndex: number;
  updatedAt?: string;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    badge: 'Para Conhecer',
    description: 'Acesso essencial para conhecer e testar a plataforma OperaTask',
    priceMonthly: 0,
    priceAnnual: 0,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    maxUsers: 3,
    maxBoards: 1,
    features: [
      'Até 3 membros na equipe',
      '1 quadro (board) operacional',
      'Visualização Kanban e Lista',
      'Cards com checklists e anexos básicos',
      'Fichas técnicas essenciais',
      'Suporte via FAQ e comunidade',
    ],
    modules: {
      advancedReports: false,
      customAttachments: false,
      automations: false,
      unlimitedFichas: false,
      exportData: false,
      auditLog: false,
      prioritySupport: false,
    },
    popular: false,
    isActive: true,
    orderIndex: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'basico',
    name: 'Básico',
    badge: 'Início da Operação',
    description: 'Estruturação ideal para pequenas equipes e fluxos operacionais',
    priceMonthly: 97,
    priceAnnual: 970,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    maxUsers: 8,
    maxBoards: 3,
    features: [
      'Até 8 membros na equipe',
      'Até 3 quadros (boards) operacionais',
      'Fichas técnicas padrão',
      'Filtros avançados e tags personalizadas',
      'Histórico de atividades recentes',
      'Exportação básica de relatórios',
      'Suporte por e-mail em horário comercial',
    ],
    modules: {
      advancedReports: false,
      customAttachments: true,
      automations: false,
      unlimitedFichas: false,
      exportData: true,
      auditLog: false,
      prioritySupport: false,
    },
    popular: false,
    isActive: true,
    orderIndex: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'intermediario',
    name: 'Intermediário',
    badge: 'Mais Popular',
    description: 'Controle completo de produção para empresas em expansão',
    priceMonthly: 197,
    priceAnnual: 1970,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    maxUsers: 20,
    maxBoards: 8,
    features: [
      'Até 20 membros na equipe',
      'Até 8 quadros (boards) simultâneos',
      'Fichas técnicas completas com cálculo de custos',
      'Relatórios de produtividade e métricas avançadas',
      'Anexos de mídias e fotos ilimitados',
      'Exportação de dados em PDF / Excel',
      'Suporte prioritário via WhatsApp',
    ],
    modules: {
      advancedReports: true,
      customAttachments: true,
      automations: true,
      unlimitedFichas: true,
      exportData: true,
      auditLog: true,
      prioritySupport: true,
    },
    popular: true,
    isActive: true,
    orderIndex: 2,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'profissional',
    name: 'Profissional',
    badge: 'Máxima Potência',
    description: 'Escala corporativa com automações, auditoria e suporte VIP',
    priceMonthly: 347,
    priceAnnual: 3470,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    maxUsers: 50,
    maxBoards: 25,
    features: [
      'Até 50 membros na equipe',
      'Até 25 quadros (boards) de projetos',
      'Automações e gatilhos de produção',
      'Dashboard macro com BI e indicadores operacionais',
      'Registro de auditoria e conformidade',
      'Fichas técnicas e ordens ilimitadas',
      'Gerente de contas dedicado e suporte 24/7',
    ],
    modules: {
      advancedReports: true,
      customAttachments: true,
      automations: true,
      unlimitedFichas: true,
      exportData: true,
      auditLog: true,
      prioritySupport: true,
    },
    popular: false,
    isActive: true,
    orderIndex: 3,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export interface PlanConfig {
  id: PlanId | string;
  name: string;
  badge: string;
  description: string;
  priceMonthly: number;
  maxUsers: number;
  maxBoards?: number;
  trialDays?: number;
  features: string[];
  popular?: boolean;
}

export const normalizePlan = (
  plan?: ClientPlan | string | null
): PlanId => {
  if (!plan) return 'gratuito';
  const p = String(plan).toLowerCase();
  if (p === 'profissional' || p === 'pro' || p === 'enterprise') return 'profissional';
  if (p === 'intermediario' || p === 'intermediate' || p === 'growth') return 'intermediario';
  if (p === 'basico' || p === 'starter') return 'basico';
  return 'gratuito';
};

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  gratuito: {
    id: 'gratuito',
    name: 'Gratuito',
    badge: 'Para Conhecer',
    description: 'Acesso essencial para conhecer e testar a plataforma',
    priceMonthly: 0,
    maxUsers: 3,
    maxBoards: 1,
    features: DEFAULT_SUBSCRIPTION_PLANS[0].features,
  },
  trial: {
    id: 'gratuito',
    name: 'Gratuito (Trial)',
    badge: 'Para Conhecer',
    description: 'Acesso essencial para conhecer e testar a plataforma',
    priceMonthly: 0,
    maxUsers: 3,
    maxBoards: 1,
    features: DEFAULT_SUBSCRIPTION_PLANS[0].features,
  },
  basico: {
    id: 'basico',
    name: 'Básico',
    badge: 'Início da Operação',
    description: 'Estruturação ideal para pequenas equipes',
    priceMonthly: 97,
    maxUsers: 8,
    maxBoards: 3,
    features: DEFAULT_SUBSCRIPTION_PLANS[1].features,
  },
  starter: {
    id: 'basico',
    name: 'Básico',
    badge: 'Início da Operação',
    description: 'Estruturação ideal para pequenas equipes',
    priceMonthly: 97,
    maxUsers: 8,
    maxBoards: 3,
    features: DEFAULT_SUBSCRIPTION_PLANS[1].features,
  },
  intermediario: {
    id: 'intermediario',
    name: 'Intermediário',
    badge: 'Mais Popular',
    popular: true,
    description: 'Controle completo de produção para empresas em expansão',
    priceMonthly: 197,
    maxUsers: 20,
    maxBoards: 8,
    features: DEFAULT_SUBSCRIPTION_PLANS[2].features,
  },
  profissional: {
    id: 'profissional',
    name: 'Profissional',
    badge: 'Máxima Potência',
    description: 'Escala corporativa com automações e suporte VIP',
    priceMonthly: 347,
    maxUsers: 50,
    maxBoards: 25,
    features: DEFAULT_SUBSCRIPTION_PLANS[3].features,
  },
  pro: {
    id: 'profissional',
    name: 'Profissional',
    badge: 'Máxima Potência',
    description: 'Escala corporativa com automações e suporte VIP',
    priceMonthly: 347,
    maxUsers: 50,
    maxBoards: 25,
    features: DEFAULT_SUBSCRIPTION_PLANS[3].features,
  },
  enterprise: {
    id: 'profissional',
    name: 'Profissional (Enterprise)',
    badge: 'Corporativo',
    description: 'Escala corporativa com automações e suporte VIP',
    priceMonthly: 347,
    maxUsers: 50,
    maxBoards: 25,
    features: DEFAULT_SUBSCRIPTION_PLANS[3].features,
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

