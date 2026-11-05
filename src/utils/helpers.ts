import { Priority, WorkspaceRole, Task, ChecklistItem, User } from '../types/index.ts';

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    color: string;
    bgLight: string;
    textLight: string;
    darkBg: string;
    darkText: string;
    dotColor: string;
  }
> = {
  urgent: {
    label: 'Urgente',
    color: '#dc2626',
    bgLight: 'bg-zinc-100',
    textLight: 'text-zinc-800',
    darkBg: 'dark:bg-zinc-800',
    darkText: 'dark:text-zinc-100',
    dotColor: 'bg-red-500',
  },
  high: {
    label: 'Alta',
    color: '#ea580c',
    bgLight: 'bg-zinc-100',
    textLight: 'text-zinc-800',
    darkBg: 'dark:bg-zinc-800',
    darkText: 'dark:text-zinc-100',
    dotColor: 'bg-orange-500',
  },
  medium: {
    label: 'Média',
    color: '#2563eb',
    bgLight: 'bg-zinc-100',
    textLight: 'text-zinc-800',
    darkBg: 'dark:bg-zinc-800',
    darkText: 'dark:text-zinc-100',
    dotColor: 'bg-blue-500',
  },
  low: {
    label: 'Baixa',
    color: '#059669',
    bgLight: 'bg-zinc-100',
    textLight: 'text-zinc-800',
    darkBg: 'dark:bg-zinc-800',
    darkText: 'dark:text-zinc-100',
    dotColor: 'bg-emerald-500',
  },
  none: {
    label: 'Sem prioridade',
    color: '#94a3b8',
    bgLight: 'bg-zinc-100',
    textLight: 'text-zinc-500',
    darkBg: 'dark:bg-zinc-800',
    darkText: 'dark:text-zinc-400',
    dotColor: 'bg-zinc-400',
  },
};

export function getPriorityInfo(priority?: Priority | null | string) {
  if (!priority || priority === 'none' || !(priority in PRIORITY_CONFIG)) {
    return PRIORITY_CONFIG.none;
  }
  return PRIORITY_CONFIG[priority as Priority];
}

export const ROLE_CONFIG: Record<
  WorkspaceRole,
  { label: string; description: string; badgeClass: string }
> = {
  owner: {
    label: 'Dono',
    description: 'Controle total do workspace, cobrança e exclusão',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
  },
  dono: {
    label: 'Dono',
    description: 'Controle total do workspace, cobrança e exclusão',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
  },
  admin: {
    label: 'Administrador',
    description: 'Gerencia projetos, colunas e convida membros',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
  },
  administrador: {
    label: 'Administrador',
    description: 'Gerencia projetos, colunas e convida membros',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
  },
  member: {
    label: 'Membro',
    description: 'Cria, edita tarefas e comenta nos projetos',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  },
  membro: {
    label: 'Membro',
    description: 'Cria, edita tarefas e comenta nos projetos',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  },
  production: {
    label: 'Produção',
    description: 'Cria, edita tarefas, move cards e colabora na produção',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300',
  },
  producao: {
    label: 'Produção',
    description: 'Cria, edita tarefas, move cards e colabora na produção',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Apenas visualiza e adiciona comentários',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  },
  visualizador: {
    label: 'Visualizador',
    description: 'Apenas visualiza e adiciona comentários',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  },
  master: {
    label: 'Master (Super Admin)',
    description: 'Acesso total e irrestrito ao sistema',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
  },
};

export function isUserMaster(user?: Partial<User> | null): boolean {
  if (!user) return false;
  return (
    user.systemRole === 'master' ||
    user.isSuperAdmin === true ||
    user.email?.trim().toLowerCase() === 'alanvitordasilva@gmail.com.br' ||
    user.username?.trim().toLowerCase() === 'alan'
  );
}

export function canManageWorkspace(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canCreateProject(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canEditTask(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return (
    role === 'owner' ||
    role === 'dono' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'member' ||
    role === 'membro' ||
    role === 'production' ||
    role === 'producao'
  );
}

export function canManageMembers(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canDeleteTask(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return (
    role === 'owner' ||
    role === 'dono' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'member' ||
    role === 'membro' ||
    role === 'production' ||
    role === 'producao'
  );
}

export function canDeleteColumn(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canDeleteProject(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canDeleteComment(role: WorkspaceRole, isAuthor: boolean, isMaster = false): boolean {
  if (isMaster) return true;
  if (role === 'viewer' || role === 'visualizador') return false;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador' || isAuthor;
}

export function canDeleteAttachment(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return (
    role === 'owner' ||
    role === 'dono' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'member' ||
    role === 'membro' ||
    role === 'production' ||
    role === 'producao'
  );
}

export function canDeleteChecklist(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return (
    role === 'owner' ||
    role === 'dono' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'member' ||
    role === 'membro' ||
    role === 'production' ||
    role === 'producao'
  );
}

export function canManageFichaTecnica(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canAccessProduction(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return (
    role === 'owner' ||
    role === 'dono' ||
    role === 'admin' ||
    role === 'administrador' ||
    role === 'production' ||
    role === 'producao'
  );
}

export function canRegisterUser(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

export function canAccessFichaTecnicaAndProduction(role: WorkspaceRole, isMaster = false): boolean {
  return canManageFichaTecnica(role, isMaster) || canAccessProduction(role, isMaster);
}

export function canAccessDashboard(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'dono' || role === 'admin' || role === 'administrador';
}

/**
 * Regra estrita de permissão para remover membros do Workspace:
 * - Master e Dono podem remover qualquer membro (inclusive Administradores).
 * - Administrador NÃO pode remover outro Administrador nem o Dono.
 * - Ninguém pode remover o Dono ou Master do sistema através do workspace.
 */
export function canRemoveWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  isMaster = false,
  isWorkspaceOwner = false
): boolean {
  if (isMaster) return true;

  const targetIsOwner = targetRole === 'owner' || targetRole === 'dono';
  const targetIsAdmin = targetRole === 'admin' || targetRole === 'administrador';

  // Ninguém remove o dono do workspace
  if (targetIsOwner) return false;

  // Dono do workspace tem poder total sobre o workspace (pode remover administradores e qualquer membro)
  if (isWorkspaceOwner || actorRole === 'owner' || actorRole === 'dono') {
    return true;
  }

  // Administrador pode remover membros operacionais, mas NÃO outros administradores nem o dono
  if (actorRole === 'admin' || actorRole === 'administrador') {
    return !targetIsAdmin;
  }

  return false;
}

/**
 * Normaliza textos de autenticação (remove acentuações, espaços múltiplos, arroba, e caixa)
 */
export function normalizeAuthText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Validação inteligente e tolerante para identificar se o login corresponde a um usuário
 */
export function matchUserIdentifier(user: Partial<User>, searchInput: string): boolean {
  const normSearch = normalizeAuthText(searchInput);
  if (!normSearch) return false;

  const searchWithoutAt = normSearch.replace(/^@/, '');
  const searchSlug = searchWithoutAt.replace(/[^a-z0-9]/g, '');

  const normUser = normalizeAuthText(user.username || '');
  const normUserWithoutAt = normUser.replace(/^@/, '');
  const userSlug = normUserWithoutAt.replace(/[^a-z0-9]/g, '');

  const normEmail = normalizeAuthText(user.email || '');
  const emailPrefix = normEmail.split('@')[0] || '';
  const emailSlug = emailPrefix.replace(/[^a-z0-9]/g, '');
  const emailDotForm = normEmail.replace('@', '.');

  const normName = normalizeAuthText(user.name || '');
  const nameParts = normName.split(' ');
  const firstName = nameParts[0] || '';
  const nameSlug = normName.replace(/[^a-z0-9]/g, '');

  // 1. Username exato ou sem @ ou sem pontuação
  if (normUser && (normUser === normSearch || normUserWithoutAt === searchWithoutAt)) return true;
  if (userSlug && searchSlug && userSlug === searchSlug) return true;

  // 2. Email exato ou prefixo do e-mail
  if (normEmail && normEmail === normSearch) return true;
  if (emailPrefix && (emailPrefix === searchWithoutAt || emailSlug === searchSlug)) return true;

  // 3. Email com ponto em vez de @ (Ex: usuário digita "Davi.tantan.com.br" para o e-mail "davi@tantan.com.br")
  if (normEmail && (emailDotForm === normSearch || emailDotForm === searchWithoutAt)) return true;

  // 4. Se a busca contém um ponto e parece um e-mail sem @ (Ex: "davi.tantan.com.br" -> primeiro ponto vira @: "davi@tantan.com.br")
  if (!normSearch.includes('@') && normSearch.includes('.')) {
    const searchAsEmail = normSearch.replace(/\./, '@');
    if (normEmail && (normEmail === searchAsEmail || normEmail.startsWith(searchAsEmail))) return true;
  }

  // 5. E-mail com domínio padrão da plataforma
  if (!normSearch.includes('@') && normEmail === `${searchWithoutAt}@operatask.app`) return true;
  if (normEmail && normEmail.split('@')[0] === searchWithoutAt) return true;

  // 6. Prefixo antes do primeiro ponto ou domínio (Ex: "davi.tantan.com.br" -> prefixo "davi" acha usuário "davi")
  const searchPrefix = searchWithoutAt.split('.')[0] || '';
  if (searchPrefix && searchPrefix.length >= 3) {
    if (normUser && (normUser === searchPrefix || normUserWithoutAt === searchPrefix || userSlug === searchPrefix)) return true;
    if (emailPrefix && (emailPrefix === searchPrefix || emailSlug === searchPrefix)) return true;
    if (firstName && firstName === searchPrefix) return true;
  }

  // 7. Nome completo ou primeiro nome (ex: "Carlos" acha "Carlos Silva", "Davi" acha "Davi")
  if (normName && (normName === normSearch || nameSlug === searchSlug)) return true;
  if (firstName && firstName.length >= 3 && (firstName === searchWithoutAt || firstName === searchPrefix)) return true;

  return false;
}

export function canModifyCompletedTask(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function isTaskInDoneColumn(
  task: { isCompleted?: boolean; columnId: string },
  columns?: { id: string; title: string; isCompletedColumn?: boolean }[]
): boolean {
  if (task.isCompleted) return true;
  if (!columns || columns.length === 0) return false;
  const col = columns.find((c) => c.id === task.columnId);
  if (!col) return false;
  return !!col.isCompletedColumn || col.title.trim().toLowerCase().includes('conclu');
}

export interface ParsedDueDate {
  datePart: string; // YYYY-MM-DD
  timePart: string; // HH:MM
  dateTime: Date;
  hasSpecificTime: boolean;
  hasSpecificDate: boolean;
}

export function parseTaskDueDate(dueDateString?: string): ParsedDueDate | null {
  if (!dueDateString || typeof dueDateString !== 'string') return null;

  const trimmed = dueDateString.trim();
  if (!trimmed) return null;

  // Se vier apenas horário, ex: "T14:30" ou "14:30"
  if (trimmed.startsWith('T') || /^\d{1,2}:\d{2}$/.test(trimmed)) {
    const rawTime = trimmed.replace(/^T/, '').slice(0, 5);
    const [h, m] = rawTime.split(':');
    const timePart = `${h.padStart(2, '0')}:${m}`;
    const now = new Date();
    const dateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(h, 10), parseInt(m, 10), 0, 0);
    return {
      datePart: '',
      timePart,
      dateTime,
      hasSpecificTime: true,
      hasSpecificDate: false,
    };
  }

  const parts = trimmed.split('T');
  const datePart = parts[0];
  if (!datePart || datePart.length < 10) return null;

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let timePart = '';
  let hasSpecificTime = false;

  if (parts.length > 1 && parts[1]) {
    const rawTime = parts[1].slice(0, 5);
    if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
      const [h, m] = rawTime.split(':');
      timePart = `${h.padStart(2, '0')}:${m}`;
      hasSpecificTime = true;
    }
  }

  // Se não foi definido horário específico, consideramos o fim do dia (23:59:59) para conferência de atraso
  const hours = hasSpecificTime ? parseInt(timePart.split(':')[0], 10) : 23;
  const minutes = hasSpecificTime ? parseInt(timePart.split(':')[1], 10) : 59;
  const seconds = hasSpecificTime ? 0 : 59;
  const dateTime = new Date(year, month - 1, day, hours, minutes, seconds, 0);

  return {
    datePart,
    timePart,
    dateTime,
    hasSpecificTime,
    hasSpecificDate: true,
  };
}

export function isTaskOverdue(task: Task): boolean {
  if (task.isCompleted || !task.dueDate) return false;
  const parsed = parseTaskDueDate(task.dueDate);
  if (!parsed || !parsed.hasSpecificDate) return false;

  const now = new Date();
  return parsed.dateTime.getTime() < now.getTime();
}

export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const parsed = parseTaskDueDate(task.dueDate);
  if (!parsed || !parsed.hasSpecificDate) return false;

  const now = new Date();
  return (
    parsed.dateTime.getFullYear() === now.getFullYear() &&
    parsed.dateTime.getMonth() === now.getMonth() &&
    parsed.dateTime.getDate() === now.getDate()
  );
}

export function isTaskDueSoon(task: Task, days: number = 7): boolean {
  if (task.isCompleted || !task.dueDate) return false;
  const parsed = parseTaskDueDate(task.dueDate);
  if (!parsed || !parsed.hasSpecificDate) return false;

  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + days);

  return parsed.dateTime.getTime() >= now.getTime() && parsed.dateTime.getTime() <= maxDate.getTime();
}

export function calculateChecklistProgress(checklist?: ChecklistItem[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (!checklist || checklist.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  const completed = checklist.filter((c) => c.isCompleted).length;
  const total = checklist.length;
  const percentage = Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

export function formatDueDatePTBR(dueDateString?: string): {
  text: string;
  fullText: string;
  formattedDate: string;
  timeText: string;
  hasDate: boolean;
  hasTime: boolean;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isYesterday: boolean;
} {
  if (!dueDateString || !dueDateString.trim()) {
    return {
      text: 'Definir data',
      fullText: 'Sem data de execução',
      formattedDate: '',
      timeText: 'Definir hora',
      hasDate: false,
      hasTime: false,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
    };
  }

  const parsed = parseTaskDueDate(dueDateString);
  if (!parsed) {
    return {
      text: 'Definir data',
      fullText: 'Sem data de execução',
      formattedDate: '',
      timeText: 'Definir hora',
      hasDate: false,
      hasTime: false,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
    };
  }

  // Apenas horário sem data
  if (!parsed.hasSpecificDate && parsed.hasSpecificTime) {
    return {
      text: `Às ${parsed.timePart}`,
      fullText: `Horário definido: ${parsed.timePart}`,
      formattedDate: '',
      timeText: parsed.timePart,
      hasDate: false,
      hasTime: true,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
    };
  }

  const now = new Date();
  const isOverdue = parsed.dateTime.getTime() < now.getTime();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(parsed.dateTime.getFullYear(), parsed.dateTime.getMonth(), parsed.dateTime.getDate());
  const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isToday = diffDays === 0;
  const isTomorrow = diffDays === 1;
  const isYesterday = diffDays === -1;

  const dayStr = String(parsed.dateTime.getDate()).padStart(2, '0');
  const monthStr = String(parsed.dateTime.getMonth() + 1).padStart(2, '0');
  const yearStr = String(parsed.dateTime.getFullYear());
  const formattedDate = `${dayStr}/${monthStr}/${yearStr}`;

  let datePrefix = `${dayStr}/${monthStr}`;
  if (parsed.dateTime.getFullYear() !== now.getFullYear()) {
    datePrefix = `${dayStr}/${monthStr}/${yearStr.slice(2)}`;
  }

  if (isToday) {
    datePrefix = 'Hoje';
  } else if (isTomorrow) {
    datePrefix = 'Amanhã';
  } else if (isYesterday) {
    datePrefix = 'Ontem';
  }

  const timeSuffix = parsed.hasSpecificTime ? ` • ${parsed.timePart}` : '';
  const text = `${datePrefix}${timeSuffix}${isOverdue ? ' (Atrasada)' : ''}`;

  const fullText = parsed.hasSpecificTime
    ? `${dayStr}/${monthStr}/${yearStr} às ${parsed.timePart}${isOverdue ? ' (Atrasada)' : ''}`
    : `${dayStr}/${monthStr}/${yearStr}${isOverdue ? ' (Atrasada)' : ''}`;

  return {
    text,
    fullText,
    formattedDate,
    timeText: parsed.hasSpecificTime ? parsed.timePart : 'Definir hora',
    hasDate: true,
    hasTime: parsed.hasSpecificTime,
    isOverdue,
    isToday,
    isTomorrow,
    isYesterday,
  };
}

export function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatTimeAgoPTBR(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const AVAILABLE_ICONS = [
  'briefcase',
  'user',
  'book',
  'code',
  'star',
  'target',
  'zap',
  'heart',
  'shopping-bag',
  'folder',
] as const;

export { EXPANDED_PALETTE, FLAT_COLOR_LIST, COLOR_CATEGORIES, getColorName, isLightColor } from './colors.ts';
import { FLAT_COLOR_LIST } from './colors.ts';

export const COLOR_PALETTE = FLAT_COLOR_LIST;

