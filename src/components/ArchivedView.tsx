import React, { useState } from 'react';
import { Task, Project, BoardColumn, User } from '../types/index.ts';
import {
  Archive,
  ArrowLeft,
  RotateCcw,
  Trash2,
  Columns3,
  FileSpreadsheet,
  Factory,
  Calendar,
  CheckSquare,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { PRIORITY_CONFIG, calculateChecklistProgress } from '../utils/helpers.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface ArchivedViewProps {
  project: Project;
  archivedColumns: BoardColumn[];
  archivedTasks: Task[];
  allProjectTasks: Task[];
  workspaceMembers: User[];
  onSelectTask: (task: Task) => void;
  onRestoreTask: (taskId: string, targetColumnId?: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  onRestoreColumn: (projectId: string, columnId: string) => void;
  onPermanentDeleteColumn: (projectId: string, columnId: string) => void;
  onBackToBoard: () => void;
}

export const ArchivedView: React.FC<ArchivedViewProps> = ({
  project,
  archivedColumns,
  archivedTasks,
  allProjectTasks,
  workspaceMembers,
  onSelectTask,
  onRestoreTask,
  onPermanentDeleteTask,
  onRestoreColumn,
  onPermanentDeleteColumn,
  onBackToBoard,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'column' | 'task';
    id: string;
    name: string;
    cardCount?: number;
  } | null>(null);

  const sortedColumns = [...archivedColumns].sort((a, b) => {
    const tA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
    const tB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
    return tB - tA;
  });

  const sortedTasks = [...archivedTasks].sort((a, b) => {
    const tA = new Date(a.archivedAt || a.updatedAt || a.createdAt).getTime();
    const tB = new Date(b.archivedAt || b.updatedAt || b.createdAt).getTime();
    return tB - tA;
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

  const totalCount = sortedColumns.length + sortedTasks.length;

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Barra superior da aba Arquivados do Projeto */}
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs font-bold text-amber-800 dark:text-amber-200">
            <Archive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {sortedColumns.length}{' '}
              {sortedColumns.length === 1 ? 'quadro' : 'quadros'} · {sortedTasks.length}{' '}
              {sortedTasks.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhum quadro ou card arquivado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Todos os <strong>quadros</strong> e <strong>cards</strong> arquivados em{' '}
              <strong>{project.name}</strong> aparecerão automaticamente nesta aba para consulta, restauração ou exclusão permanente.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
          {/* Seção 1: Quadros Arquivados */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Columns3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Quadros Arquivados ({sortedColumns.length})
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ao restaurar um quadro, todos os seus cards retornam automaticamente para o projeto.
                  </p>
                </div>
              </div>
            </div>

            {sortedColumns.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 text-xs text-slate-400 italic text-center">
                Nenhum quadro arquivado neste projeto.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {sortedColumns.map((col) => {
                  const colTasks = allProjectTasks.filter(
                    (t) => t.columnId === col.id && !t.isArchived
                  );

                  return (
                    <div
                      key={col.id}
                      className="rounded-2xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col"
                    >
                      <div
                        className="h-1.5 w-full shrink-0"
                        style={{ backgroundColor: col.color || '#d97706' }}
                      />
                      <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: col.color || '#d97706' }}
                            />
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {col.title}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                            {colTasks.length} {colTasks.length === 1 ? 'card' : 'cards'}
                          </span>
                        </div>

                        {col.archivedAt && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Arquivado em {formatDateTime(col.archivedAt)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onRestoreColumn(project.id, col.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar Quadro</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: 'column',
                                id: col.id,
                                name: col.title,
                                cardCount: colTasks.length,
                              })
                            }
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Excluir quadro permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Prévia dos cards dentro do quadro arquivado */}
                      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {colTasks.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">
                            Quadro sem cards vinculados
                          </p>
                        ) : (
                          colTasks.map((task) => {
                            const latestProd =
                              task.productionRecords && task.productionRecords.length > 0
                                ? task.productionRecords[0]
                                : null;
                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => onSelectTask(task)}
                                className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer space-y-1"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {task.isCompleted && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {task.title}
                                  </span>
                                </div>
                                {task.fichaTecnica && (
                                  <div className="flex items-center gap-2 text-[10px] text-teal-700 dark:text-teal-300 truncate">
                                    <FileSpreadsheet className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{task.fichaTecnica.nomeItem}</span>
                                    {latestProd && (
                                      <span className="font-bold shrink-0">
                                        · {String(latestProd.quantidadeDesejada).replace('.', ',')}{' '}
                                        {latestProd.unidadeProducao}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Seção 2: Cards Arquivados */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Cards Arquivados ({sortedTasks.length})
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cards individuais arquivados neste projeto. Clique para visualizar ou restaurar.
                </p>
              </div>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 text-xs text-slate-400 italic text-center">
                Nenhum card individual arquivado neste projeto.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedTasks.map((task) => {
                  const priorityInfo = PRIORITY_CONFIG[task.priority || 'none'];
                  const checklistInfo = calculateChecklistProgress(task.checklist || []);
                  const origCol = project.columns.find((c) => c.id === task.columnId);
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
                      onClick={() => onSelectTask(task)}
                      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden"
                      style={
                        task.frameColor
                          ? { borderLeftWidth: '4px', borderLeftColor: task.frameColor }
                          : undefined
                      }
                    >
                      <div className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {task.title}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              Quadro original: <strong>{origCol?.title || 'Padrão'}</strong>
                            </p>
                          </div>

                          {task.priority && task.priority !== 'none' && priorityInfo && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${priorityInfo.bgLight} ${priorityInfo.textLight} ${priorityInfo.darkBg} ${priorityInfo.darkText}`}
                            >
                              {priorityInfo.label}
                            </span>
                          )}
                        </div>

                        {task.fichaTecnica && (
                          <div className="p-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/35 border border-teal-200/70 dark:border-teal-800/60 text-[11px] space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 font-bold text-teal-900 dark:text-teal-200 truncate">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span className="truncate">{task.fichaTecnica.nomeItem}</span>
                              </span>
                            </div>
                            {latestProd && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <Factory className="w-3 h-3 shrink-0" />
                                <span>
                                  {String(latestProd.quantidadeDesejada).replace('.', ',')}{' '}
                                  {latestProd.unidadeProducao}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {((task.tags && task.tags.length > 0) ||
                          (task.checklist && task.checklist.length > 0)) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
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

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            {task.archivedAt && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{formatDateTime(task.archivedAt)}</span>
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
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onRestoreTask(task.id, task.columnId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                              title="Restaurar card para o quadro"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'task',
                                  id: task.id,
                                  name: task.title,
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Excluir card permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === 'column') {
              onPermanentDeleteColumn(project.id, confirmDelete.id);
            } else {
              onPermanentDeleteTask(confirmDelete.id);
            }
            setConfirmDelete(null);
          }}
          title={
            confirmDelete.type === 'column'
              ? 'Excluir quadro arquivado permanentemente?'
              : 'Excluir card permanentemente?'
          }
          itemName={confirmDelete.name}
          itemType={confirmDelete.type === 'column' ? 'este quadro' : 'este card'}
          message={
            confirmDelete.type === 'column'
              ? `Tem certeza que deseja excluir permanentemente o quadro "${confirmDelete.name}"${
                  confirmDelete.cardCount && confirmDelete.cardCount > 0
                    ? ` e seus ${confirmDelete.cardCount} card(s)`
                    : ''
                }? Esta ação não pode ser desfeita.`
              : `Tem certeza que deseja excluir permanentemente o card "${confirmDelete.name}"? Esta ação não pode ser desfeita.`
          }
        />
      )}
    </div>
  );
};
