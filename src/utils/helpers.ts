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
};

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
    user.email?.trim().toLowerCase() === 'alanvitordasilva@gmail.com.br'
  );
}

export function canManageWorkspace(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canCreateProject(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canEditTask(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin' || role === 'member' || role === 'production';
}

export function canManageMembers(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canDeleteTask(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin' || role === 'member' || role === 'production';
}

export function canDeleteColumn(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canDeleteProject(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canDeleteComment(role: WorkspaceRole, isAuthor: boolean, isMaster = false): boolean {
  if (isMaster) return true;
  if (role === 'viewer') return false;
  return role === 'owner' || role === 'admin' || isAuthor;
}

export function canDeleteAttachment(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin' || role === 'member' || role === 'production';
}

export function canDeleteChecklist(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin' || role === 'member' || role === 'production';
}

export function canManageFichaTecnica(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canAccessProduction(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin' || role === 'production';
}

export function canRegisterUser(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
}

export function canAccessFichaTecnicaAndProduction(role: WorkspaceRole, isMaster = false): boolean {
  return canManageFichaTecnica(role, isMaster) || canAccessProduction(role, isMaster);
}

export function canAccessDashboard(role: WorkspaceRole, isMaster = false): boolean {
  if (isMaster) return true;
  return role === 'owner' || role === 'admin';
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
}

export function parseTaskDueDate(dueDateString?: string): ParsedDueDate | null {
  if (!dueDateString || typeof dueDateString !== 'string') return null;

  const trimmed = dueDateString.trim();
  const parts = trimmed.split('T');
  const datePart = parts[0];
  if (!datePart || datePart.length < 10) return null;

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let timePart = '23:59';
  let hasSpecificTime = false;

  if (parts.length > 1 && parts[1]) {
    const rawTime = parts[1].slice(0, 5);
    if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
      const [h, m] = rawTime.split(':');
      timePart = `${h.padStart(2, '0')}:${m}`;
      hasSpecificTime = true;
    }
  }

  const [hours, minutes] = timePart.split(':').map(Number);
  const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return {
    datePart,
    timePart,
    dateTime,
    hasSpecificTime,
  };
}

export function isTaskOverdue(task: Task): boolean {
  if (task.isCompleted || !task.dueDate) return false;
  const parsed = parseTaskDueDate(task.dueDate);
  if (!parsed) return false;

  const now = new Date();
  return parsed.dateTime.getTime() < now.getTime();
}

export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const parsed = parseTaskDueDate(task.dueDate);
  if (!parsed) return false;

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
  if (!parsed) return false;

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
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isYesterday: boolean;
} {
  if (!dueDateString) {
    return {
      text: 'Sem data',
      fullText: 'Sem data de execução',
      formattedDate: '',
      timeText: '',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      isYesterday: false,
    };
  }

  const parsed = parseTaskDueDate(dueDateString);
  if (!parsed) {
    return {
      text: dueDateString,
      fullText: dueDateString,
      formattedDate: dueDateString,
      timeText: '',
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
  const timeStr = parsed.timePart; // "HH:MM"

  // Formato completo requerido: DD/MM/AAAA às HH:MM (ex: 29/10/2026 às 14:30)
  const fullText = `${dayStr}/${monthStr}/${yearStr} às ${timeStr}`;
  const formattedDate = `${dayStr}/${monthStr}/${yearStr}`;

  // Formato compacto para cards (ex: 29/10 • 14:30 ou Hoje • 14:30)
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

  const text = `${datePrefix} • ${timeStr}${isOverdue ? ' (Atrasada)' : ''}`;

  return {
    text,
    fullText: isOverdue ? `${fullText} (Atrasada)` : fullText,
    formattedDate,
    timeText: timeStr,
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

