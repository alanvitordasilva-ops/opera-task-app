import React from 'react';
import { ViewMode } from '../types/index.ts';
import { Kanban, List, Plus, BarChart3, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenSidebar: () => void;
  canAccessDashboard?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onChangeView,
  onOpenNewTaskModal,
  onOpenSidebar,
  canAccessDashboard = true,
}) => {
  return (
    <nav aria-label="Navegação móvel" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Kanban */}
        <button
          type="button"
          onClick={() => onChangeView('kanban')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
            currentView === 'kanban'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Kanban className="w-5 h-5" />
            {currentView === 'kanban' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Quadros</span>
        </button>

        {/* Lista */}
        <button
          type="button"
          onClick={() => onChangeView('list')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
            currentView === 'list'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <List className="w-5 h-5" />
            {currentView === 'list' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Lista</span>
        </button>

        {/* Action Button: Criar Tarefa */}
        <div className="relative -top-3.5 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenNewTaskModal}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#173653] to-[#34B1AC] text-white shadow-lg shadow-[#34B1AC]/30 flex items-center justify-center transition-all duration-200 active:scale-90 hover:shadow-[#34B1AC]/40 ring-4 ring-white dark:ring-slate-900"
            title="Criar novo card"
            aria-label="Criar novo card"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Dashboard / Métricas (somente visível para administradores e dono) */}
        {canAccessDashboard && (
          <button
            type="button"
            onClick={() => onChangeView('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 ${
              currentView === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <BarChart3 className="w-5 h-5" />
              {currentView === 'dashboard' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Painel</span>
          </button>
        )}

        {/* Menu / Projetos / Sidebar */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          title="Abrir menu de projetos e workspaces"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};
