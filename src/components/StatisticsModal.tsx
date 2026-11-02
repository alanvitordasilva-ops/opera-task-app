import React from 'react';
import { Task, Project } from '../types/index.ts';
import { X, CheckCircle2, Clock, AlertTriangle, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { isTaskOverdue, PRIORITY_CONFIG } from '../utils/helpers.ts';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
}) => {
  if (!isOpen) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const inProgressTasks = tasks.filter((t) => !t.isCompleted).length;
  const todoTasks = inProgressTasks;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t)).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Prioridades
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent').length;
  const highTasks = tasks.filter((t) => t.priority === 'high').length;
  const medTasks = tasks.filter((t) => t.priority === 'medium').length;
  const lowTasks = tasks.filter((t) => t.priority === 'low').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Estatísticas & Produtividade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resumo visual do andamento das suas tarefas e projetos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {totalTasks}
              </div>
              <span className="text-[11px] text-slate-400">tarefas cadastradas</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Concluídas
              </span>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {completedTasks}
              </div>
              <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60">
                {completionRate}% do total
              </span>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Em Andamento
              </span>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {inProgressTasks}
              </div>
              <span className="text-[11px] text-blue-600/70 dark:text-blue-400/60">
                em progresso
              </span>
            </div>

            <div className="bg-red-50/60 dark:bg-red-950/30 p-4 rounded-xl border border-red-200/60 dark:border-red-800/40">
              <span className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Atrasadas
              </span>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                {overdueTasks}
              </div>
              <span className="text-[11px] text-red-600/70 dark:text-red-400/60">
                requer atenção
              </span>
            </div>
          </div>

          {/* Barra de Progresso Geral */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Taxa de Conclusão Global
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{completionRate}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{
                  width: totalTasks > 0 ? `${(inProgressTasks / totalTasks) * 100}%` : '0%',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Concluídas ({completedTasks})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Em Progresso ({inProgressTasks})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /> A Fazer ({todoTasks})
              </span>
            </div>
          </div>

          {/* Distribuição por Prioridade */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Distribuição por Prioridade
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Alta Prioridade</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{highTasks}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: totalTasks > 0 ? `${(highTasks / totalTasks) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Média Prioridade</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{medTasks}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: totalTasks > 0 ? `${(medTasks / totalTasks) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Baixa Prioridade</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{lowTasks}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: totalTasks > 0 ? `${(lowTasks / totalTasks) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Progresso por Projeto */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Progresso por Projeto
            </h3>
            <div className="space-y-3">
              {projects.map((proj) => {
                const projTasks = tasks.filter((t) => t.projectId === proj.id);
                const projCompleted = projTasks.filter((t) => t.isCompleted).length;
                const projRate = projTasks.length > 0 ? Math.round((projCompleted / projTasks.length) * 100) : 0;

                return (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span>{proj.name}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400">
                        {projCompleted}/{projTasks.length} ({projRate}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${projRate}%`,
                          backgroundColor: proj.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
