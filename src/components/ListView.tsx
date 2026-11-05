import React, { useState } from 'react';
import { Task, Project, User, WorkspaceRole } from '../types/index.ts';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Edit3,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Copy,
  Archive,
  ArrowUpDown,
  MoreVertical,
  Plus,
  FileSpreadsheet,
  Factory,
  Lock,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  getPriorityInfo,
  formatDueDatePTBR,
  parseTaskDueDate,
  calculateChecklistProgress,
  getInitials,
  canDeleteTask,
  canAccessFichaTecnicaAndProduction,
  canModifyCompletedTask,
  isTaskInDoneColumn,
} from '../utils/helpers.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { UserAvatar } from './UserAvatar.tsx';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  workspaceMembers: User[];
  currentUserRole?: WorkspaceRole;
  isMaster?: boolean;
  onToggleTaskComplete: (taskId: string) => void;
  onUpdateTaskColumn: (taskId: string, columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask?: (task: Task) => void;
  onArchiveTask?: (taskId: string) => void;
  onAddNewTask: () => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  projects,
  workspaceMembers,
  currentUserRole = 'member',
  isMaster = false,
  onToggleTaskComplete,
  onUpdateTaskColumn,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onArchiveTask,
  onAddNewTask,
}) => {
  const [dateSort, setDateSort] = useState<'asc' | 'desc' | 'none'>('none');
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);

  // Fechar dropdown de ações ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setOpenMenuTaskId(null);
    if (openMenuTaskId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuTaskId]);

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId);
  const getMemberUser = (userId: string) => workspaceMembers.find((m) => m.id === userId);

  const sortedTasks = React.useMemo(() => {
    if (dateSort === 'none') return tasks;
    return [...tasks].sort((a, b) => {
      const timeA = parseTaskDueDate(a.dueDate)?.dateTime.getTime() ?? 0;
      const timeB = parseTaskDueDate(b.dueDate)?.dateTime.getTime() ?? 0;
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [tasks, dateSort]);

  if (tasks.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Nenhuma tarefa encontrada
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
          Tente ajustar os filtros selecionados ou crie um novo card de tarefa.
        </p>
        <button
          type="button"
          onClick={onAddNewTask}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Tarefa</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Barra de Controles e Cabeçalho Superior da Lista */}
      <div className="flex items-center justify-between px-2 py-1 select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Tarefas em Lista
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setDateSort((prev) => (prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'));
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            dateSort !== 'none'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-600 dark:text-blue-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Ordenar por data de vencimento"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>
            {dateSort === 'none' && 'Ordenar por Data'}
            {dateSort === 'asc' && 'Data: Mais Antigas'}
            {dateSort === 'desc' && 'Data: Mais Recentes'}
          </span>
        </button>
      </div>

      {/* Cabeçalho da Lista Desktop */}
      <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none bg-slate-100/60 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="col-span-4">Tarefa & Projeto</div>
        <div className="col-span-2">Coluna / Status</div>
        <div className="col-span-2">Responsáveis</div>
        <div className="col-span-1">Prioridade</div>
        <div className="col-span-2">Data & Horário</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>

      {/* Linhas de tarefas no MESMO ESTILO DE MOLDURA dos cards do Kanban */}
      <div className="space-y-2.5">
        {sortedTasks.map((task) => {
          const project = getProject(task.projectId);
          const projectBorderColor = project?.color || '#2563eb';
          const cardBorderColor = task.frameColor || projectBorderColor;
          const priorityInfo = getPriorityInfo(task.priority);
          const dueInfo = formatDueDatePTBR(task.dueDate);
          const checklistInfo = calculateChecklistProgress(task.checklist);
          const isCardInDone = isTaskInDoneColumn(task, project?.columns);
          const isActionBlocked = isCardInDone && !canModifyCompletedTask(currentUserRole, isMaster);
          const isDone = isCardInDone || task.isCompleted;

          return (
            <div
              key={task.id}
              onClick={() => onEditTask(task)}
              className={`group bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-3.5 transition-all duration-200 cursor-pointer relative border-[2.5px] shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center ${
                openMenuTaskId === task.id ? 'z-20 ring-1 ring-blue-400/40' : ''
              }`}
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
              {/* Coluna 1: Checkbox + Título + Metadados + Tags */}
              <div className="lg:col-span-4 flex items-start gap-3 min-w-0 mb-2 lg:mb-0">
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
                      : isDone
                      ? 'Desmarcar como concluída'
                      : 'Marcar como concluída'
                  }
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-4 h-4 hover:fill-zinc-100 dark:hover:fill-zinc-800" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`text-[13px] sm:text-sm font-bold tracking-tight leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                        isDone
                          ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal'
                          : 'text-zinc-950 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h4>

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

                    {/* Tags com formato padronizado idêntico em todos os cards */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        {task.tags.slice(0, 2).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs"
                            title={`Tag: ${t.name}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="truncate max-w-[80px]">{t.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metadados: Projeto + Checklist + Comentários + Anexos padronizados */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-600 dark:text-zinc-300 flex-wrap">
                    {project && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    )}

                    {task.checklist && task.checklist.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                        <CheckSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                        <span>{checklistInfo.completed}/{checklistInfo.total} ({checklistInfo.percentage}%)</span>
                      </span>
                    )}

                    {task.comments && task.comments.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                        <MessageSquare className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                        <span>{task.comments.length}</span>
                      </span>
                    )}

                    {task.attachments && task.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                        <Paperclip className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                        <span>{task.attachments.length}</span>
                      </span>
                    )}

                    {task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole) && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-[10px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70"
                        title={`Ficha Técnica: ${task.fichaTecnica.nomeItem} (${task.fichaTecnica.ingredientes?.length || 0} ingredientes)`}
                      >
                        <FileSpreadsheet className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>Ficha: {task.fichaTecnica.nomeItem}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna 2: Coluna / Status (Select com mesmo estilo do design system) */}
              <div
                className="lg:col-span-2 mb-2 lg:mb-0"
                onClick={(e) => e.stopPropagation()}
              >
                {project ? (
                  <div className="relative">
                    <select
                      value={task.columnId}
                      disabled={isActionBlocked}
                      onChange={(e) => onUpdateTaskColumn(task.id, e.target.value)}
                      className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                        isActionBlocked ? 'opacity-80 cursor-not-allowed bg-slate-100/80 dark:bg-slate-800/80 pr-7' : ''
                      }`}
                      title={isActionBlocked ? 'Card concluído protegido: apenas Dono e Administrador podem alterar coluna' : undefined}
                    >
                      {project.columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                    {isActionBlocked && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Padrão</span>
                )}
              </div>

              {/* Coluna 3: Responsáveis (Avatares com Foto de Perfil) */}
              <div className="lg:col-span-2 flex items-center -space-x-1.5 mb-2 lg:mb-0">
                <span className="lg:hidden text-zinc-500 dark:text-zinc-400 text-xs mr-2 font-medium">
                  Responsáveis:
                </span>
                {task.assigneeIds && task.assigneeIds.length > 0 ? (
                  task.assigneeIds.map((uid) => {
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
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Não atribuído</span>
                )}
              </div>

              {/* Coluna 4: Prioridade (Ponto colorido pontual sem preencher fundo) */}
              <div className="lg:col-span-1 flex items-center gap-1.5 text-xs mb-2 lg:mb-0">
                <span className="lg:hidden text-zinc-500 dark:text-zinc-400 text-xs mr-1 font-medium">
                  Prioridade:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-md ${
                    task.priority && task.priority !== 'none'
                      ? `${priorityInfo.bgLight} ${priorityInfo.textLight} ${priorityInfo.darkBg} ${priorityInfo.darkText} border border-zinc-200/90 dark:border-zinc-700/80`
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200/90 dark:border-zinc-700/80'
                  } shadow-2xs`}
                  title={`Prioridade: ${priorityInfo.label}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: priorityInfo.color }}
                  />
                  <span>{priorityInfo.label}</span>
                </span>
              </div>

              {/* Coluna 5: Data & Horário de Vencimento padronizado */}
              <div
                className="lg:col-span-2 flex items-center gap-1.5 text-xs mb-2 lg:mb-0"
                title={dueInfo.fullText}
              >
                <span className="lg:hidden text-zinc-500 dark:text-zinc-400 text-xs mr-1 font-medium">
                  Execução:
                </span>
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors ${
                    !dueInfo.hasDate && !dueInfo.hasTime
                      ? 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-zinc-200/80 dark:border-zinc-700/60'
                      : dueInfo.isOverdue
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                      : dueInfo.isToday
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80'
                  }`}
                >
                  <Calendar
                    className={`w-3.5 h-3.5 shrink-0 ${
                      !dueInfo.hasDate && !dueInfo.hasTime
                        ? 'text-zinc-400 dark:text-zinc-500'
                        : dueInfo.isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : dueInfo.isToday
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                  <span>{dueInfo.text}</span>
                </div>
              </div>

              {/* Coluna 6: Menu de Ações (3 pontos ou botões rápidos) */}
              <div
                className="lg:col-span-1 flex items-center justify-end gap-1 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botão Copiar rápido */}
                {onDuplicateTask && (
                  <button
                    type="button"
                    onClick={() => onDuplicateTask(task)}
                    className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Copiar card (duplicar)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botão Arquivar rápido */}
                {onArchiveTask && !isActionBlocked && (
                  <button
                    type="button"
                    onClick={() => onArchiveTask(task.id)}
                    className="p-1.5 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Arquivar card"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botões de Ficha Técnica e Produzir (visíveis somente para Produção, Admin e Dono) */}
                {canAccessFichaTecnicaAndProduction(currentUserRole) && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        task.fichaTecnica
                          ? 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30'
                          : 'text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={task.fichaTecnica ? `Ficha Técnica: ${task.fichaTecnica.nomeItem}` : 'Ficha Técnica'}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        task.fichaTecnica && task.fichaTecnica.ingredientes && task.fichaTecnica.ingredientes.length > 0
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                          : 'text-zinc-300 dark:text-zinc-700 hover:text-amber-500'
                      }`}
                      title={
                        task.fichaTecnica && task.fichaTecnica.ingredientes && task.fichaTecnica.ingredientes.length > 0
                          ? `Produzir ${task.fichaTecnica.nomeItem}`
                          : 'Preencha a Ficha Técnica antes de produzir'
                      }
                    >
                      <Factory className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Botão Editar / Visualizar */}
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title={isActionBlocked ? 'Visualizar detalhes' : 'Editar tarefa'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Botão Excluir (oculto se card concluído bloqueado ou para quem não tem permissão) */}
                {!isActionBlocked && canDeleteTask(currentUserRole, isMaster) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmTask(task);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Excluir tarefa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmação Padronizado */}
      {deleteConfirmTask && (
        <ConfirmDeleteModal
          isOpen={!!deleteConfirmTask}
          onClose={() => setDeleteConfirmTask(null)}
          onConfirm={() => {
            onDeleteTask(deleteConfirmTask.id);
            setDeleteConfirmTask(null);
          }}
          title="Excluir card de tarefa?"
          itemName={deleteConfirmTask.title}
          itemType="este card"
          message={`Tem certeza que deseja excluir permanentemente o card "${deleteConfirmTask.title}"? Esta ação não pode ser desfeita.`}
          onArchiveInstead={
            onArchiveTask
              ? () => {
                  onArchiveTask(deleteConfirmTask.id);
                  setDeleteConfirmTask(null);
                }
              : undefined
          }
          archiveButtonText="Arquivar card"
        />
      )}
    </div>
  );
};
