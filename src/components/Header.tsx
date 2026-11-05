import React, { useState } from 'react';
import { ViewMode, Priority, Tag, User } from '../types/index.ts';
import {
  Menu,
  Kanban,
  List,
  Search,
  Plus,
  Bell,
  SlidersHorizontal,
  X,
  Users,
  UserCheck,
  BarChart3,
  Activity,
  Crown,
  Sun,
  Moon,
  UserPlus,
} from 'lucide-react';
import { getInitials, isUserMaster } from '../utils/helpers.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
  subtitle: string;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: Priority | 'all';
  onPriorityFilterChange: (priority: Priority | 'all') => void;
  assigneeFilter: string | 'all';
  onAssigneeFilterChange: (userId: string | 'all') => void;
  selectedTagId: string | 'all';
  onTagFilterChange: (tagId: string | 'all') => void;
  availableTags: Tag[];
  workspaceMembers: User[];
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  onOpenNewTaskModal: () => void;
  onOpenSyncSettings?: () => void;
  currentUser?: User;
  onOpenUserProfile?: () => void;
  onOpenMasterPanel?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  canRegisterUser?: boolean;
  onOpenRegisterUserModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  title,
  subtitle,
  viewMode,
  onChangeViewMode,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  selectedTagId,
  onTagFilterChange,
  availableTags,
  workspaceMembers,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenNewTaskModal,
  onOpenSyncSettings,
  currentUser,
  onOpenUserProfile,
  onOpenMasterPanel,
  theme = 'light',
  onToggleTheme,
  canRegisterUser = false,
  onOpenRegisterUserModal,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const isMaster = isUserMaster(currentUser);

  const hasActiveFilters =
    priorityFilter !== 'all' || assigneeFilter !== 'all' || selectedTagId !== 'all';

  const clearFilters = () => {
    onPriorityFilterChange('all');
    onAssigneeFilterChange('all');
    onTagFilterChange('all');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Título & Botão Mobile */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Campo de Busca Global */}
          <div className="hidden sm:flex items-center relative flex-1 max-w-xs mx-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar cards, pessoas ou tags..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Alternador Kanban / Lista (quando visualizando projetos) */}
            <div className="hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Quadros"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Quadros</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Visualização em Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {/* Botão de Filtros Avançados */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border text-xs font-medium transition-colors relative ${
                showFilters || hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Filtros avançados"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>


            {/* Alternador de Tema Claro / Escuro */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                aria-label="Alternar Tema Claro/Escuro"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            {/* Sino de Notificações da Equipe */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title="Notificações e menções"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Botão Painel Master (Exclusivo Super Admin) */}
            {isMaster && onOpenMasterPanel && (
              <button
                type="button"
                onClick={onOpenMasterPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500/20 via-amber-400/25 to-teal-500/20 border border-amber-400/60 hover:border-amber-400 text-amber-900 dark:text-amber-200 font-extrabold text-xs shadow-xs hover:shadow-amber-500/10 transition-all cursor-pointer animate-in fade-in"
                title="Painel de Controle Master (Super Administrador) - Acesso Total"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Painel Master</span>
              </button>
            )}

            {/* Perfil do Usuário / Minha Conta */}
            {onOpenUserProfile && currentUser && (
              <button
                type="button"
                onClick={onOpenUserProfile}
                className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#34B1AC] dark:hover:border-[#34B1AC] bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-2xs relative"
                title={`Minha Conta (${currentUser.name}) ${isMaster ? '· SUPER ADMIN' : ''}`}
                aria-label="Abrir Minha Conta"
              >
                <div className="relative">
                  <UserAvatar user={currentUser} size="sm" showBorder={false} />
                  {isMaster && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center shadow-xs">
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#173653] dark:group-hover:text-[#34B1AC] max-w-[90px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}

            {/* Botão Cadastrar Novo Usuário (Apenas Dono / Admin / Master) */}
            {canRegisterUser && onOpenRegisterUserModal && (
              <button
                type="button"
                onClick={onOpenRegisterUserModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#173653] dark:text-[#34B1AC] bg-[#34B1AC]/10 hover:bg-[#34B1AC]/20 border border-[#34B1AC]/30 active:scale-98 rounded-xl transition-all cursor-pointer"
                title="Cadastrar novo usuário no workspace"
              >
                <UserPlus className="w-4 h-4 text-[#34B1AC]" />
                <span className="hidden md:inline">Cadastrar Usuário</span>
              </button>
            )}

            {/* Botão Principal Nova Tarefa */}
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 rounded-xl shadow-xs shadow-[#34B1AC]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Card</span>
            </button>
          </div>
        </div>

        {/* Campo de Busca no Mobile */}
        <div className="sm:hidden mt-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar tarefas, tags ou pessoas..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Gaveta de Filtros */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs animate-in slide-in-from-top-1 duration-150">
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              Filtrar por:
            </span>

            {/* Filtro por Responsável */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Responsável:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => onAssigneeFilterChange(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">Todos os Membros</option>
                {workspaceMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Prioridade */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Prioridade:</span>
              <select
                value={priorityFilter}
                onChange={(e) => onPriorityFilterChange(e.target.value as Priority | 'all')}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">Todas</option>
                <option value="none">Sem prioridade</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>

            {/* Filtro por Tag */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Tag:</span>
              <select
                value={selectedTagId}
                onChange={(e) => onTagFilterChange(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">Todas as Tags</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-xs ml-auto"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
