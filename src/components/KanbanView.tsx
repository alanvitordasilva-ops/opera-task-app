import React, { useState, useEffect } from 'react';
import { Task, Project, User, BoardColumn, WorkspaceRole } from '../types/index.ts';
import {
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  GripVertical,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Clock,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Edit3,
  ArrowRight,
  FileSpreadsheet,
  Factory,
  Lock,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  formatDueDatePTBR,
  calculateChecklistProgress,
  getInitials,
  canDeleteTask,
  canDeleteColumn,
  canAccessFichaTecnicaAndProduction,
  canModifyCompletedTask,
  isTaskInDoneColumn,
} from '../utils/helpers.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { UserAvatar } from './UserAvatar.tsx';

export interface TaskReorderUpdate {
  id: string;
  columnId: string;
  order: number;
}

export interface MovedTaskMeta {
  taskId: string;
  targetColumnId: string;
  prevColumnId: string;
}

interface KanbanViewProps {
  tasks: Task[];
  project: Project;
  workspaceMembers: User[];
  currentUserRole?: WorkspaceRole;
  isMaster?: boolean;
  onUpdateTaskColumn: (taskId: string, columnId: string) => void;
  onReorderTasks?: (updates: TaskReorderUpdate[], meta?: MovedTaskMeta) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onQuickAddTask: (columnId: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  project,
  workspaceMembers,
  currentUserRole = 'member',
  isMaster = false,
  onUpdateTaskColumn,
  onReorderTasks,
  onToggleTaskComplete,
  onEditTask,
  onDuplicateTask,
  onArchiveTask,
  onDeleteTask,
  onDeleteColumn,
  onQuickAddTask,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumnId, setActiveDropColumnId] = useState<string | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [selectedMobileColumn, setSelectedMobileColumn] = useState<string | 'all'>('all');
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'task' | 'column';
    id: string;
    name?: string;
    message?: string;
    task?: Task;
  } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    columnId: string;
    targetTaskId: string | null;
    position: 'before' | 'after' | 'end';
  } | null>(null);

  // Fechar dropdown de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuTaskId(null);
    if (openMenuTaskId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuTaskId]);

  const columns = project.columns || [];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask && isTaskInDoneColumn(targetTask, columns) && !canModifyCompletedTask(currentUserRole, isMaster)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleCardDragOver = (e: React.DragEvent, targetTask: Task, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const currentDraggedId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (!currentDraggedId || currentDraggedId === targetTask.id) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const isAfter = offsetY > rect.height / 2;

    setDropIndicator({
      columnId,
      targetTaskId: targetTask.id,
      position: isAfter ? 'after' : 'before',
    });
    setActiveDropColumnId(columnId);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setActiveDropColumnId(columnId);

    // Se estiver sobre o fundo da coluna (sem card específico)
    if (!dropIndicator || dropIndicator.columnId !== columnId || dropIndicator.targetTaskId === null) {
      setDropIndicator({
        columnId,
        targetTaskId: null,
        position: 'end',
      });
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent, columnId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (activeDropColumnId === columnId) {
      setActiveDropColumnId(null);
      setDropIndicator(null);
    }
  };

  const executeDrop = (
    taskId: string,
    targetColumnId: string,
    targetTaskId: string | null,
    position: 'before' | 'after' | 'end'
  ) => {
    const dragged = tasks.find((t) => t.id === taskId);
    if (!dragged) return;

    const prevColumnId = dragged.columnId;

    // Se o card já está na coluna concluído e o usuário não é Master/Dono/Admin, impede mover
    const wasCompleted = isTaskInDoneColumn(dragged, columns);
    if (wasCompleted && prevColumnId !== targetColumnId && !canModifyCompletedTask(currentUserRole, isMaster)) {
      setDraggedTaskId(null);
      setActiveDropColumnId(null);
      setDropIndicator(null);
      return;
    }

    // Tarefas já ordenadas da coluna de destino, excluindo a tarefa arrastada
    const targetColTasks = tasks
      .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 0;
        const orderB = typeof b.order === 'number' ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt.localeCompare(b.createdAt);
      });

    let insertIndex = targetColTasks.length;
    if (targetTaskId && position !== 'end') {
      const idx = targetColTasks.findIndex((t) => t.id === targetTaskId);
      if (idx !== -1) {
        insertIndex = position === 'after' ? idx + 1 : idx;
      }
    }

    // Insere o card na posição calculada
    targetColTasks.splice(insertIndex, 0, { ...dragged, columnId: targetColumnId });

    // Gera lista de updates com as novas ordens numéricas sequenciais
    const updates: TaskReorderUpdate[] = targetColTasks.map((t, index) => ({
      id: t.id,
      columnId: targetColumnId,
      order: index,
    }));

    // Se mudou de coluna, normaliza também as ordens restantes na coluna de origem
    if (prevColumnId !== targetColumnId) {
      const sourceColTasks = tasks
        .filter((t) => t.columnId === prevColumnId && t.id !== taskId)
        .sort((a, b) => {
          const orderA = typeof a.order === 'number' ? a.order : 0;
          const orderB = typeof b.order === 'number' ? b.order : 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.createdAt.localeCompare(b.createdAt);
        });

      sourceColTasks.forEach((t, index) => {
        updates.push({
          id: t.id,
          columnId: prevColumnId,
          order: index,
        });
      });
    }

    if (onReorderTasks) {
      onReorderTasks(updates, {
        taskId,
        targetColumnId,
        prevColumnId,
      });
    } else {
      onUpdateTaskColumn(taskId, targetColumnId);
    }

    setDraggedTaskId(null);
    setActiveDropColumnId(null);
    setDropIndicator(null);
  };

  const handleCardDrop = (e: React.DragEvent, targetTaskId: string, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const pos = dropIndicator?.targetTaskId === targetTaskId ? dropIndicator.position : 'after';
    executeDrop(taskId, targetColumnId, targetTaskId, pos);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    if (dropIndicator && dropIndicator.columnId === targetColumnId && dropIndicator.targetTaskId) {
      executeDrop(taskId, targetColumnId, dropIndicator.targetTaskId, dropIndicator.position);
    } else {
      executeDrop(taskId, targetColumnId, null, 'end');
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropColumnId(null);
    setDropIndicator(null);
  };

  const getMemberUser = (id: string) => workspaceMembers.find((m) => m.id === id);
  const projectBorderColor = project.color || '#2563eb';

  return (
    <div className="flex flex-col min-h-[calc(100vh-220px)]">
      {/* Seletor Rápido de Colunas para Dispositivos Móveis */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 -mx-2 px-2 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => setSelectedMobileColumn('all')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
            selectedMobileColumn === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>Todas ({tasks.length})</span>
        </button>

        {columns.map((col) => {
          const count = tasks.filter((t) => t.columnId === col.id).length;
          const isSelected = selectedMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedMobileColumn(col.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="truncate max-w-[110px]">{col.title}</span>
              <span className="opacity-75 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Linha das Colunas Kanban - Com suporte a touch swipe snap no celular */}
      <div className="flex gap-4 sm:gap-5 pb-8 overflow-x-auto min-h-[calc(100vh-220px)] items-start select-none snap-x snap-mandatory scroll-smooth">
      {columns
        .filter((col) => selectedMobileColumn === 'all' || col.id === selectedMobileColumn)
        .map((col) => {
        // Tarefas ordenadas estritamente pela propriedade 'order'
        const columnTasks = tasks
          .filter((t) => t.columnId === col.id)
          .sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : 0;
            const orderB = typeof b.order === 'number' ? b.order : 0;
            if (orderA !== orderB) return orderA - orderB;
            return a.createdAt.localeCompare(b.createdAt);
          });
        const isDropTarget = activeDropColumnId === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleColumnDragOver(e, col.id)}
            onDragLeave={(e) => handleColumnDragLeave(e, col.id)}
            onDrop={(e) => handleColumnDrop(e, col.id)}
            className={`w-[86vw] sm:w-76 shrink-0 snap-center sm:snap-align-none flex flex-col bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-2.5 border transition-all ${
              isDropTarget
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-400/20 shadow-md'
                : 'border-slate-200/80 dark:border-slate-800/80'
            }`}
          >
            {/* Cabeçalho da Coluna */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {col.title}
                </h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onQuickAddTask(col.id)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  title={`Adicionar tarefa em ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {canDeleteColumn(currentUserRole) && onDeleteColumn && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmState({
                        isOpen: true,
                        type: 'column',
                        id: col.id,
                        name: col.title,
                        message: `Tem certeza que deseja excluir a coluna "${col.title}"? As tarefas desta coluna serão transferidas para outra coluna ou removidas. Esta ação não pode ser desfeita.`,
                      })
                    }
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    title={`Excluir coluna ${col.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Cards da Coluna com Reordenação */}
            <div className="space-y-2 min-h-[120px] flex-1 flex flex-col">
              {columnTasks.map((task) => {
                const priorityInfo = PRIORITY_CONFIG[task.priority];
                const dueInfo = formatDueDatePTBR(task.dueDate);
                const checklistInfo = calculateChecklistProgress(task.checklist);
                const isDragging = draggedTaskId === task.id;
                const coverImage = task.attachments?.find((a) => a.mediaCategory === 'image');
                const cardBorderColor = task.frameColor || projectBorderColor;
                const isCardInDone = isTaskInDoneColumn(task, columns);
                const isActionBlocked = isCardInDone && !canModifyCompletedTask(currentUserRole, isMaster);

                const showIndicatorBefore =
                  dropIndicator?.columnId === col.id &&
                  dropIndicator?.targetTaskId === task.id &&
                  dropIndicator?.position === 'before';

                const showIndicatorAfter =
                  dropIndicator?.columnId === col.id &&
                  dropIndicator?.targetTaskId === task.id &&
                  dropIndicator?.position === 'after';

                return (
                  <React.Fragment key={task.id}>
                    {/* Linha indicadora de inserção ACIMA do card */}
                    {showIndicatorBefore && (
                      <div className="h-1 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse transition-all -my-0.5" />
                    )}

                    <div
                      draggable={!isActionBlocked}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleCardDragOver(e, task, col.id)}
                      onDrop={(e) => handleCardDrop(e, task.id, col.id)}
                      onClick={() => onEditTask(task)}
                      className={`group bg-white dark:bg-slate-900 rounded-xl p-2.5 transition-all duration-200 cursor-pointer relative border-[2.5px] shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                        isDragging ? 'opacity-30 scale-95 border-dashed border-blue-400 shadow-none' : ''
                      } ${openMenuTaskId === task.id ? 'z-20 ring-1 ring-blue-400/40' : ''}`}
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
                    {/* Linha 1: Prioridade com ponto colorido + Tags padronizadas + Menu de Ações (3 pontos) + Drag handle */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Prioridade: formato padronizado com fundo neutro idêntico em todos os cards */}
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

                        {/* Indicador de Card Concluído / Protegido */}
                        {isCardInDone && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs"
                            title={
                              isActionBlocked
                                ? 'Card concluído protegido: apenas Dono e Administrador podem mover, arquivar ou excluir'
                                : 'Card concluído'
                            }
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Concluído</span>
                          </span>
                        )}

                        {/* Tags: formato padronizado com o mesmo padrão de cor e fundo em todos os cards */}
                        {task.tags &&
                          task.tags.slice(0, 2).map((tag) => (
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

                      <div className="flex items-center gap-0.5">
                        {/* Menu de Ações (3 pontos) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-75 group-hover:opacity-100"
                            title="Ações da tarefa"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openMenuTaskId === task.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isActionBlocked && (
                                <div className="px-3 py-1.5 mb-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                  <span>Concluído protegido</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuTaskId(null);
                                  onEditTask(task);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{isActionBlocked ? 'Visualizar card' : 'Editar'}</span>
                              </button>

                              {canAccessFichaTecnicaAndProduction(currentUserRole) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTaskId(null);
                                      onEditTask(task);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center gap-2 transition-colors font-medium"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                    <span>Ficha Técnica</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTaskId(null);
                                      onEditTask(task);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 transition-colors font-medium"
                                  >
                                    <Factory className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Produzir</span>
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuTaskId(null);
                                  onDuplicateTask(task);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors font-medium"
                              >
                                <Copy className="w-3.5 h-3.5 text-blue-500" />
                                <span>Copiar card</span>
                              </button>

                              {!isActionBlocked && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuTaskId(null);
                                    onArchiveTask(task.id);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2 transition-colors font-medium"
                                >
                                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Arquivar</span>
                                </button>
                              )}

                              {/* Mover rápido para outra coluna: somente se não bloqueado */}
                              {!isActionBlocked && columns.filter((c) => c.id !== col.id).length > 0 && (
                                <>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Mover para
                                  </div>
                                  {columns
                                    .filter((c) => c.id !== col.id)
                                    .map((otherCol) => (
                                      <button
                                        key={otherCol.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuTaskId(null);
                                          onUpdateTaskColumn(task.id, otherCol.id);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between gap-1 transition-colors"
                                      >
                                        <span className="flex items-center gap-1.5 truncate">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: otherCol.color }}
                                          />
                                          <span className="truncate">{otherCol.title}</span>
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                      </button>
                                    ))}
                                </>
                              )}

                              {!isActionBlocked && canDeleteTask(currentUserRole, isMaster) && (
                                <>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTaskId(null);
                                      setDeleteConfirmState({
                                        isOpen: true,
                                        type: 'task',
                                        id: task.id,
                                        name: task.title,
                                        task,
                                        message: `Tem certeza que deseja excluir permanentemente o card "${task.title}"? Esta ação não pode ser desfeita.`,
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Drag Handle ou Cadeado de Proteção */}
                        {isActionBlocked ? (
                          <div
                            className="text-amber-500/80 dark:text-amber-400/80 p-0.5"
                            title="Card concluído protegido: apenas Dono e Administrador podem mover, arquivar ou excluir."
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div
                            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab p-0.5"
                            title="Arrastar tarefa"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capa de Mídia padronizada (se houver foto anexada) */}
                    {coverImage && (
                      <div className="w-full h-16 sm:h-18 rounded-lg overflow-hidden mb-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative group/thumb">
                        <img
                          src={coverImage.url}
                          alt={coverImage.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-950/80 text-white backdrop-blur-2xs border border-zinc-700/50">
                          {(task.attachments?.length || 0) > 1 ? `+${task.attachments?.length} mídias` : 'Foto'}
                        </div>
                      </div>
                    )}

                    {/* Título da Tarefa: Preto profundo ou branco puro com alto contraste */}
                    <div className="flex items-start gap-2 mb-1.5">
                      <button
                        type="button"
                        disabled={isActionBlocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActionBlocked) return;
                          onToggleTaskComplete(task.id);
                        }}
                        className={`mt-0.5 transition-colors shrink-0 ${
                          isActionBlocked
                            ? 'cursor-not-allowed opacity-90'
                            : 'text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                        title={
                          isActionBlocked
                            ? 'Card concluído protegido: apenas Dono e Administrador podem alterar status.'
                            : task.isCompleted
                            ? 'Desmarcar como concluída'
                            : 'Marcar como concluída'
                        }
                      >
                        {task.isCompleted || isCardInDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-4 h-4 hover:fill-zinc-100 dark:hover:fill-zinc-800" />
                        )}
                      </button>

                      <h4
                        className={`text-[13px] sm:text-sm font-bold tracking-tight leading-snug break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                          task.isCompleted
                            ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal'
                            : 'text-zinc-950 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>

                    {/* Descrição resumida em 1 linha com tom neutro legível */}
                    {task.description && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-normal line-clamp-1 mb-1.5 pl-6 font-normal">
                        {task.description}
                      </p>
                    )}

                    {/* Ficha Técnica: quadro interno de destaque com ação de Produzir */}
                    {task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole) && (
                      <div className="mb-2 pl-6">
                        <div className="p-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-850">
                          <div className="flex items-center justify-between text-[10px] text-teal-800 dark:text-teal-200 font-semibold mb-1">
                            <span className="flex items-center gap-1.5 truncate">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="truncate font-bold">{task.fichaTecnica.nomeItem}</span>
                            </span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-teal-600 text-white shrink-0 ml-1">
                              {task.fichaTecnica.ingredientes?.length || 0} ing.
                            </span>
                          </div>
                          {task.fichaTecnica.ingredientes && task.fichaTecnica.ingredientes.length > 0 && (
                            <div className="text-[9px] text-teal-700/80 dark:text-teal-300/80 truncate mb-1">
                              {task.fichaTecnica.ingredientes.slice(0, 2).map((ing) => `${ing.nome} (${ing.quantidade}${ing.unidade})`).join(' • ')}
                              {task.fichaTecnica.ingredientes.length > 2 && ' ...'}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-teal-200/50 dark:border-teal-900/40 text-[9px]">
                            <span className="text-teal-700 dark:text-teal-300 font-medium truncate">
                              {task.productionRecords && task.productionRecords.length > 0
                                ? `${task.productionRecords.length} lote(s) produzido(s)`
                                : 'Ficha pronta'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-teal-800 dark:text-teal-200 hover:text-teal-600 shrink-0">
                              <Factory className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              <span>Produzir</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Checklist: quadro interno padronizado para todas as tarefas */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div className="mb-2 pl-6">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-[10px] text-zinc-700 dark:text-zinc-200 font-semibold mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                              <span>Checklist {checklistInfo.completed}/{checklistInfo.total}</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-zinc-900 dark:text-zinc-100">
                              {checklistInfo.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200/80 dark:bg-zinc-700/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                checklistInfo.percentage === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-zinc-800 dark:bg-zinc-200'
                              }`}
                              style={{ width: `${checklistInfo.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rodapé do Card: Data, horário, contadores e avatares padronizados com mesmo formato de cores */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-200/80 dark:border-zinc-800 text-[10px]">
                      {/* Metadados: Data + Comentários + Anexos em badges com mesmo formato */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {/* Data e Horário em badge padronizado */}
                        <div
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold transition-colors ${
                            dueInfo.isOverdue
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                              : dueInfo.isToday
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80'
                          }`}
                          title={dueInfo.fullText}
                        >
                          <Calendar
                            className={`w-3 h-3 shrink-0 ${
                              dueInfo.isOverdue
                                ? 'text-red-600 dark:text-red-400'
                                : dueInfo.isToday
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          />
                          <span>{dueInfo.text}</span>
                        </div>

                        {/* Contador de Comentários em badge padronizado */}
                        {task.comments && task.comments.length > 0 && (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 font-semibold"
                            title="Comentários"
                          >
                            <MessageSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                            <span>{task.comments.length}</span>
                          </div>
                        )}

                        {/* Contador de Anexos em badge padronizado */}
                        {task.attachments && task.attachments.length > 0 && (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 font-semibold"
                            title="Anexos de mídia"
                          >
                            <Paperclip className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                            <span>{task.attachments.length}</span>
                          </div>
                        )}

                        {/* Ficha Técnica em badge padronizado (visível apenas para Produção, Admin e Dono) */}
                        {task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole) && (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70 font-semibold"
                            title={`Ficha Técnica: ${task.fichaTecnica.nomeItem} (${task.fichaTecnica.ingredientes?.length || 0} ingredientes)`}
                          >
                            <FileSpreadsheet className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="truncate max-w-[70px] sm:max-w-[85px]">{task.fichaTecnica.nomeItem}</span>
                          </div>
                        )}
                      </div>

                      {/* Stack de Avatares dos Responsáveis com Foto de Perfil */}
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {task.assigneeIds && task.assigneeIds.length > 0 ? (
                          task.assigneeIds.slice(0, 3).map((uid) => {
                            const u = getMemberUser(uid);
                            return (
                              <UserAvatar
                                key={uid}
                                user={u}
                                size="xs"
                                showBorder={true}
                                title={u?.name || 'Membro'}
                              />
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Sem resp.</span>
                        )}
                        {task.assigneeIds && task.assigneeIds.length > 3 && (
                          <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                            +{task.assigneeIds.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha indicadora de inserção ABAIXO do card */}
                  {showIndicatorAfter && (
                    <div className="h-1 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse transition-all -my-0.5" />
                  )}
                </React.Fragment>
                );
              })}

              {/* Indicador de soltar no final da coluna quando arrastando */}
              {dropIndicator?.columnId === col.id &&
                dropIndicator?.targetTaskId === null &&
                draggedTaskId && (
                  <div className="h-12 border-2 border-dashed border-blue-400/80 dark:border-blue-500/70 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 transition-all">
                    Inserir no final da coluna
                  </div>
                )}

              {columnTasks.length === 0 && (!dropIndicator || dropIndicator.columnId !== col.id) && (
                <div className="h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 gap-1.5">
                  <Clock className="w-4 h-4 opacity-40" />
                  <span>Nenhum card aqui</span>
                </div>
              )}
            </div>

            {/* Adição Rápida */}
            <button
              type="button"
              onClick={() => onQuickAddTask(col.id)}
              className="mt-3 py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Card
            </button>
          </div>
        );
      })}
      </div>

      {/* Modal de Confirmação Padronizado */}
      {deleteConfirmState?.isOpen && (
        <ConfirmDeleteModal
          isOpen={deleteConfirmState.isOpen}
          onClose={() => setDeleteConfirmState(null)}
          onConfirm={() => {
            if (!deleteConfirmState) return;
            if (deleteConfirmState.type === 'task') {
              onDeleteTask(deleteConfirmState.id);
            } else if (deleteConfirmState.type === 'column') {
              onDeleteColumn?.(deleteConfirmState.id);
            }
            setDeleteConfirmState(null);
          }}
          title={deleteConfirmState.type === 'task' ? 'Excluir card de tarefa?' : 'Excluir coluna dos Quadros?'}
          itemName={deleteConfirmState.name}
          itemType={deleteConfirmState.type === 'task' ? 'este card' : 'esta coluna'}
          message={deleteConfirmState.message}
          onArchiveInstead={
            deleteConfirmState.type === 'task'
              ? () => {
                  onArchiveTask(deleteConfirmState.id);
                  setDeleteConfirmState(null);
                }
              : undefined
          }
          archiveButtonText="Arquivar card"
        />
      )}
    </div>
  );
};
