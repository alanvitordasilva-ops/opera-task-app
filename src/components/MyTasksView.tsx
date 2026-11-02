import React, { useState } from 'react';
import { Task, Project, User } from '../types/index.ts';
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckSquare,
  Folder,
  Paperclip,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  formatDueDatePTBR,
  isTaskOverdue,
  isTaskDueToday,
  calculateChecklistProgress,
} from '../utils/helpers.ts';

interface MyTasksViewProps {
  tasks: Task[];
  projects: Project[];
  currentUser: User;
  onToggleTaskComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  tasks,
  projects,
  currentUser,
  onToggleTaskComplete,
  onEditTask,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'overdue' | 'completed'>('all');

  // Filtra apenas as tarefas atribuídas ao usuário logado
  const myTasks = tasks.filter((t) => t.assigneeIds && t.assigneeIds.includes(currentUser.id));

  const overdueTasks = myTasks.filter((t) => isTaskOverdue(t));
  const todayTasks = myTasks.filter((t) => isTaskDueToday(t) && !t.isCompleted);
  const completedTasks = myTasks.filter((t) => t.isCompleted);
  const pendingTasks = myTasks.filter((t) => !t.isCompleted);

  const displayedTasks = myTasks.filter((t) => {
    if (filterTab === 'today') return isTaskDueToday(t) && !t.isCompleted;
    if (filterTab === 'overdue') return isTaskOverdue(t);
    if (filterTab === 'completed') return t.isCompleted;
    return true;
  });

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Banner de Boas-Vindas Pessoal */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Minhas Tarefas · Workspace Ativo
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Olá, {currentUser.name}! Aqui está o seu foco.
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            Você tem <strong>{pendingTasks.length}</strong> tarefas pendentes atribuídas a você em todos os projetos.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-400/30">
            <div>
              <div className="text-xl font-extrabold">{myTasks.length}</div>
              <div className="text-[11px] text-blue-200">Total Atribuídas</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-amber-300">{todayTasks.length}</div>
              <div className="text-[11px] text-blue-200">Para Hoje</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-rose-300">{overdueTasks.length}</div>
              <div className="text-[11px] text-blue-200">Atrasadas</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-emerald-300">{completedTasks.length}</div>
              <div className="text-[11px] text-blue-200">Concluídas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Abas de Filtro de Minhas Tarefas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            filterTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Todas ({myTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('today')}
          className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
            filterTab === 'today'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Para Hoje ({todayTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('overdue')}
          className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
            filterTab === 'overdue'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Atrasadas ({overdueTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('completed')}
          className={`px-3 py-1.5 rounded-xl transition-colors ${
            filterTab === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Concluídas ({completedTasks.length})
        </button>
      </div>

      {/* Lista de Tarefas Pessoais */}
      <div className="space-y-2.5">
        {displayedTasks.map((task) => {
          const project = getProject(task.projectId);
          const currentColumn = project?.columns.find((c) => c.id === task.columnId);
          const priorityInfo = PRIORITY_CONFIG[task.priority];
          const dueInfo = formatDueDatePTBR(task.dueDate);
          const checklistInfo = calculateChecklistProgress(task.checklist);

          const projectBorderColor = project?.color || '#2563eb';
          const cardBorderColor = task.frameColor || projectBorderColor;

          return (
            <div
              key={task.id}
              onClick={() => onEditTask(task)}
              className="group bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 border-[2.5px] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-start sm:items-center justify-between gap-4"
              style={{
                borderColor: cardBorderColor,
                boxShadow: `0 1px 3px 0 ${cardBorderColor}20`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = cardBorderColor;
                e.currentTarget.style.boxShadow = `0 4px 14px 0 ${cardBorderColor}38`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = cardBorderColor;
                e.currentTarget.style.boxShadow = `0 1px 3px 0 ${cardBorderColor}20`;
              }}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskComplete(task.id);
                  }}
                  className="mt-0.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-5 h-5 hover:fill-zinc-100 dark:hover:fill-zinc-800" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-[13px] sm:text-sm font-bold tracking-tight leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                        task.isCompleted
                          ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal'
                          : 'text-zinc-950 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {/* Tags: formato padronizado com o mesmo padrão de cor e fundo em todos os cards */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {task.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs"
                            title={`Tag: ${tag.name}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="truncate max-w-[80px]">{tag.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600 dark:text-zinc-300 flex-wrap">
                    {project && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    )}

                    {currentColumn && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs">
                        {currentColumn.title}
                      </span>
                    )}

                    {task.checklist && task.checklist.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                        <CheckSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                        <span>{checklistInfo.completed}/{checklistInfo.total} ({checklistInfo.percentage}%)</span>
                      </span>
                    )}

                    {task.attachments && task.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                        <Paperclip className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                        <span>{task.attachments.length}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Prioridade + Data com mesmo formato de cores */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                {/* Prioridade: formato padronizado com fundo neutro idêntico */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-md ${priorityInfo.bgLight} ${priorityInfo.textLight} ${priorityInfo.darkBg} ${priorityInfo.darkText} border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs`}
                  title={`Prioridade: ${priorityInfo.label}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: priorityInfo.color }}
                  />
                  <span>{priorityInfo.label}</span>
                </span>

                {/* Vencimento e Horário com formato padronizado */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors ${
                    dueInfo.isOverdue
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                      : dueInfo.isToday
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80'
                  }`}
                  title={dueInfo.fullText}
                >
                  <Calendar
                    className={`w-3.5 h-3.5 shrink-0 ${
                      dueInfo.isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : dueInfo.isToday
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                  <span>
                    {dueInfo.text}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {displayedTasks.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhuma tarefa nesta categoria!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Você está em dia com todas as tarefas atribuídas a você neste filtro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
