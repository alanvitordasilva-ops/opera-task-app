import React from 'react';
import { Task, Project, User, WorkspaceRole } from '../types/index.ts';
import {
  Package,
  ArrowLeft,
  RotateCcw,
  Archive,
  FileSpreadsheet,
  Factory,
  CheckCircle2,
  Calendar,
  CheckSquare,
  User as UserIcon,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  calculateChecklistProgress,
  canModifyCompletedTask,
} from '../utils/helpers.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface StockViewProps {
  project: Project;
  tasks: Task[];
  workspaceMembers: User[];
  currentUserRole: WorkspaceRole;
  isMaster?: boolean;
  onEditTask: (task: Task) => void;
  onRemoveFromStock: (taskId: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onBackToBoard: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  project,
  tasks,
  workspaceMembers,
  currentUserRole,
  isMaster = false,
  onEditTask,
  onRemoveFromStock,
  onArchiveTask,
  onBackToBoard,
}) => {
  const canArchive = canModifyCompletedTask(currentUserRole, isMaster);

  const sortedTasks = [...tasks].sort((a, b) => {
    const timeA = new Date(a.stockedAt || a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.stockedAt || b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${mins}`;
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Barra superior da aba Estoque */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToBoard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Quadros</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {project.name}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 text-xs font-bold text-teal-800 dark:text-teal-200">
          <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>
            {sortedTasks.length}{' '}
            {sortedTasks.length === 1 ? 'card em estoque' : 'cards em estoque'}
          </span>
        </div>
      </div>

      {/* Único Quadro de Estoque */}
      <div className="flex-1 min-h-0 flex justify-start">
        <div className="w-full max-w-2xl flex flex-col rounded-2xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden max-h-full">
          {/* Cabeçalho do Quadro Único */}
          <div className="h-1.5 w-full bg-linear-to-r from-teal-500 to-emerald-500 shrink-0" />
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  Estoque
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Cards concluídos enviados para o estoque de {project.name}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-600 text-white shrink-0">
              {sortedTasks.length}
            </span>
          </div>

          {/* Lista de Cards do Quadro Único de Estoque */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {sortedTasks.length === 0 ? (
              <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-500 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Nenhum card no estoque
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Quando um card estiver no quadro <strong>Concluído</strong>, clique no botão <strong>Estoque</strong> ao lado de <strong>Produzir</strong> na <strong>Ficha Técnica</strong> (ou dentro de <strong>Produzir</strong>) para direcioná-lo para cá.
                </p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const priorityInfo = PRIORITY_CONFIG[task.priority || 'none'];
                const checklistInfo = calculateChecklistProgress(task.checklist || []);
                const latestProd =
                  task.productionRecords && task.productionRecords.length > 0
                    ? task.productionRecords[0]
                    : null;
                const assignees = workspaceMembers.filter((m) =>
                  (task.assigneeIds || []).includes(m.id)
                );

                return (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden"
                    style={
                      task.frameColor
                        ? { borderLeftWidth: '4px', borderLeftColor: task.frameColor }
                        : undefined
                    }
                  >
                    <div className="p-3.5 space-y-2.5">
                      {/* Linha Superior: Status + Prioridade */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors truncate">
                            {task.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.priority && task.priority !== 'none' && priorityInfo && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${priorityInfo.bgLight} ${priorityInfo.textLight} ${priorityInfo.darkBg} ${priorityInfo.darkText}`}
                            >
                              {priorityInfo.label}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <Package className="w-3 h-3" />
                            <span>Em Estoque</span>
                          </span>
                        </div>
                      </div>

                      {/* Bloco Ficha Técnica + Produção Registrada */}
                      {task.fichaTecnica && (
                        <div className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/35 border border-teal-200/80 dark:border-teal-800/60 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200 truncate">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="truncate">{task.fichaTecnica.nomeItem}</span>
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-600 text-white shrink-0">
                              {task.fichaTecnica.ingredientes?.length || 0} ing.
                            </span>
                          </div>

                          {latestProd && (
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-teal-200/60 dark:border-teal-800/50 text-[11px] flex-wrap">
                              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800 dark:text-emerald-300">
                                <Factory className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  Produzido:{' '}
                                  {String(latestProd.quantidadeDesejada).replace('.', ',')}{' '}
                                  {latestProd.unidadeProducao}
                                  {task.productionRecords && task.productionRecords.length > 1
                                    ? ` (+${task.productionRecords.length - 1})`
                                    : ''}
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-300">
                                {latestProd.fator.toFixed(2).replace(/\.00$/, '').replace('.', ',')}x
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags e Checklist */}
                      {((task.tags && task.tags.length > 0) ||
                        (task.checklist && task.checklist.length > 0)) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.tags?.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {task.checklist && task.checklist.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <CheckSquare className="w-3 h-3 text-slate-500" />
                              {checklistInfo.completed}/{checklistInfo.total}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadados de Estoque e Ações */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {task.stockedAt && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span>{formatDateTime(task.stockedAt)}</span>
                            </span>
                          )}
                          {task.stockedByUserName && (
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                              <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                                {task.stockedByUserName}
                              </strong>
                            </span>
                          )}
                          {assignees.length > 0 && (
                            <div className="flex -space-x-1.5">
                              {assignees.slice(0, 3).map((member) => (
                                <UserAvatar
                                  key={member.id}
                                  user={member}
                                  size="xs"
                                  className="ring-2 ring-white dark:ring-slate-900"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onRemoveFromStock(task.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Retirar do estoque e devolver ao quadro do projeto"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retirar do Estoque</span>
                          </button>

                          {canArchive && onArchiveTask && (
                            <button
                              type="button"
                              onClick={() => onArchiveTask(task.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Arquivar card"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
