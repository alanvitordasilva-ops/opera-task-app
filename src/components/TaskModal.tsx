import React, { useState, useEffect, useRef } from 'react';
import {
  Task,
  Project,
  Tag,
  Priority,
  User,
  ChecklistItem,
  Comment,
  TaskAttachment,
  WorkspaceRole,
  FichaTecnica,
  ProductionRecord,
} from '../types/index.ts';
import {
  X,
  Calendar,
  Flag,
  Folder,
  Tag as TagIcon,
  Trash2,
  Plus,
  Users,
  CheckSquare,
  MessageSquare,
  History,
  Paperclip,
  Send,
  AtSign,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileText,
  Copy,
  Archive,
  FileSpreadsheet,
  Scale,
  ChefHat,
  Sparkles,
  Factory,
  Lock,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  COLOR_PALETTE,
  getInitials,
  formatDueDatePTBR,
  parseTaskDueDate,
  calculateChecklistProgress,
  formatTimeAgoPTBR,
  canDeleteTask,
  canDeleteChecklist,
  canDeleteComment,
  canDeleteAttachment,
  canManageFichaTecnica,
  canAccessProduction,
  isUserMaster,
  canModifyCompletedTask,
  isTaskInDoneColumn,
} from '../utils/helpers.ts';
import { MediaUploader } from './MediaUploader.tsx';
import { MediaItemCard } from './MediaItemCard.tsx';
import { MediaLightbox } from './MediaLightbox.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { MediaStorageService } from '../services/mediaStorage.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { ColorPicker } from './ColorPicker.tsx';
import { FichaTecnicaModal } from './FichaTecnicaModal.tsx';
import { ProductionModal } from './ProductionModal.tsx';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultColumnId?: string;
  defaultProjectId?: string;
  projects: Project[];
  tags: Tag[];
  workspaceMembers: User[];
  currentUser: User;
  currentUserRole?: WorkspaceRole;
  onSaveTask: (taskData: Partial<Task> & { id?: string }) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (task: Task) => void;
  onArchiveTask?: (taskId: string) => void;
  onCreateTag: (newTag: Tag) => void;
  onAddComment?: (taskId: string, commentText: string, mentionedUserIds: string[]) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultColumnId,
  defaultProjectId,
  projects,
  tags,
  workspaceMembers,
  currentUser,
  currentUserRole = 'member',
  onSaveTask,
  onDeleteTask,
  onDuplicateTask,
  onArchiveTask,
  onCreateTag,
  onAddComment,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [projectId, setProjectId] = useState<string>('');
  const [columnId, setColumnId] = useState<string>('');
  const [dueDateDate, setDueDateDate] = useState<string>('');
  const [dueDateTime, setDueDateTime] = useState<string>('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'task' | 'checklist' | 'comment';
    id: string;
    name?: string;
  } | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [frameColor, setFrameColor] = useState<string | undefined>(undefined);

  // Helper para computar data e hora sem forçar padrões
  const computeFinalDueDate = (dateStr: string, timeStr: string): string => {
    const d = dateStr ? dateStr.trim() : '';
    const t = timeStr ? timeStr.trim() : '';
    if (d && t) return `${d}T${t}`;
    if (d) return d;
    if (t) return `T${t}`;
    return '';
  };

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Comentários & Menções
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Anexos & Lightbox
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activeLightboxAttachment, setActiveLightboxAttachment] = useState<TaskAttachment | null>(null);
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Criação rápida de tag
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0]);

  // Ficha Técnica
  const [fichaTecnica, setFichaTecnica] = useState<FichaTecnica | null | undefined>(
    taskToEdit?.fichaTecnica
  );
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);

  // Produção & Cálculo Automático
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>(
    taskToEdit?.productionRecords || []
  );
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [noFichaAlert, setNoFichaAlert] = useState<string | null>(null);
  const [productionSuccessAlert, setProductionSuccessAlert] = useState<string | null>(null);

  // Permissões de Ficha Técnica e Produção
  const isMaster = isUserMaster(currentUser);
  const canManageFicha = canManageFichaTecnica(currentUserRole, isMaster);
  const canProduce = canAccessProduction(currentUserRole, isMaster);

  // Projeto selecionado atual
  const currentProject = projects.find((p) => p.id === projectId) || projects[0];

  // Regras de bloqueio de card concluído
  const canModifyCompleted = canModifyCompletedTask(currentUserRole, isMaster);
  const isTaskCompleted = taskToEdit
    ? isTaskInDoneColumn(taskToEdit, currentProject?.columns)
    : false;
  const isCompletedBlocked = isTaskCompleted && !canModifyCompleted;

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority || 'none');
      setProjectId(taskToEdit.projectId);
      setColumnId(taskToEdit.columnId);

      const parsed = parseTaskDueDate(taskToEdit.dueDate);
      if (parsed) {
        setDueDateDate(parsed.datePart || '');
        setDueDateTime(parsed.hasSpecificTime ? parsed.timePart : '');
      } else if (taskToEdit.dueDate) {
        setDueDateDate(taskToEdit.dueDate.split('T')[0] || '');
        setDueDateTime('');
      } else {
        setDueDateDate('');
        setDueDateTime('');
      }

      setAssigneeIds(taskToEdit.assigneeIds || []);
      setSelectedTagIds(taskToEdit.tags?.map((t) => t.id) || []);
      setChecklist(taskToEdit.checklist || []);
      setComments(taskToEdit.comments || []);
      setAttachments(taskToEdit.attachments || []);
      setFrameColor(taskToEdit.frameColor);
      setFichaTecnica(taskToEdit.fichaTecnica || null);
      setProductionRecords(taskToEdit.productionRecords || []);
    } else {
      const activeProj = defaultProjectId && defaultProjectId !== 'all'
        ? projects.find((p) => p.id === defaultProjectId) || projects[0]
        : projects[0];

      setTitle('');
      setDescription('');
      setPriority('none');
      setProjectId(activeProj?.id || '');
      setColumnId(defaultColumnId || activeProj?.columns[0]?.id || '');
      setDueDateDate('');
      setDueDateTime('');
      setAssigneeIds([currentUser.id]);
      setSelectedTagIds([]);
      setChecklist([]);
      setComments([]);
      setAttachments([]);
      setFrameColor(undefined);
      setFichaTecnica(null);
      setProductionRecords([]);
    }
    setIsCreatingTag(false);
    setShowMentionMenu(false);
    setNoFichaAlert(null);
  }, [taskToEdit, isOpen, defaultColumnId, defaultProjectId, projects, currentUser]);

  // Salvamento Automático em tempo real para cards já existentes (com debounce suave para digitação)
  const autoSaveTimerRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Pequeno atraso para não disparar auto-save na hidratação inicial do modal
      const t = setTimeout(() => {
        isLoadedRef.current = true;
      }, 300);
      return () => {
        clearTimeout(t);
        isLoadedRef.current = false;
      };
    }
  }, [isOpen, taskToEdit?.id]);

  useEffect(() => {
    if (!isOpen || !taskToEdit || !isLoadedRef.current || !title.trim()) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
      const targetCol = currentProject?.columns.find((c) => c.id === columnId);
      const isCompleted = targetCol?.isCompletedColumn || false;
      const finalDueDate = computeFinalDueDate(dueDateDate, dueDateTime);

      const effectiveProjectId = isCompletedBlocked && taskToEdit ? taskToEdit.projectId : (projectId || projects[0]?.id || '');
      const effectiveColumnId = isCompletedBlocked && taskToEdit ? taskToEdit.columnId : (columnId || currentProject?.columns[0]?.id || '');

      onSaveTask({
        id: taskToEdit.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        projectId: effectiveProjectId,
        columnId: effectiveColumnId,
        dueDate: finalDueDate,
        assigneeIds,
        tags: selectedTags,
        checklist,
        attachments,
        comments,
        isCompleted,
        frameColor: frameColor || undefined,
        fichaTecnica: fichaTecnica || undefined,
        productionRecords: productionRecords || undefined,
      });
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    title,
    description,
    priority,
    projectId,
    columnId,
    dueDateDate,
    dueDateTime,
    assigneeIds,
    selectedTagIds,
    checklist,
    attachments,
    comments,
    frameColor,
    fichaTecnica,
    productionRecords,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
    const effectiveProjectId = isCompletedBlocked && taskToEdit ? taskToEdit.projectId : (projectId || projects[0]?.id || '');
    const effectiveColumnId = isCompletedBlocked && taskToEdit ? taskToEdit.columnId : (columnId || currentProject?.columns[0]?.id || '');
    const targetCol = currentProject?.columns.find((c) => c.id === effectiveColumnId);
    const isCompleted = targetCol?.isCompletedColumn || false;

    const finalDueDate = computeFinalDueDate(dueDateDate, dueDateTime);

    onSaveTask({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      title: title.trim(),
      description: description.trim(),
      priority,
      projectId: effectiveProjectId,
      columnId: effectiveColumnId,
      dueDate: finalDueDate,
      assigneeIds,
      tags: selectedTags,
      checklist,
      attachments,
      comments,
      isCompleted,
      frameColor: frameColor || undefined,
      fichaTecnica: fichaTecnica || undefined,
      productionRecords: productionRecords || undefined,
    });
    onClose();
  };

  // Handlers para Ficha Técnica
  const handleSaveFichaTecnica = (savedFicha: FichaTecnica) => {
    setFichaTecnica(savedFicha);
    setNoFichaAlert(null);
    if (taskToEdit) {
      const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
      const targetCol = currentProject?.columns.find((c) => c.id === columnId);
      const isCompleted = targetCol?.isCompletedColumn || false;
      const finalDueDate = computeFinalDueDate(dueDateDate, dueDateTime);

      onSaveTask({
        id: taskToEdit.id,
        title: title.trim() || taskToEdit.title,
        description: description.trim(),
        priority,
        projectId: projectId || projects[0]?.id || '',
        columnId: columnId || currentProject?.columns[0]?.id || '',
        dueDate: finalDueDate,
        assigneeIds,
        tags: selectedTags,
        checklist,
        attachments,
        comments,
        isCompleted,
        frameColor: frameColor || undefined,
        fichaTecnica: savedFicha,
        productionRecords,
      });
    }
  };

  const handleDeleteFichaTecnica = () => {
    setFichaTecnica(null);
    if (taskToEdit) {
      const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
      const targetCol = currentProject?.columns.find((c) => c.id === columnId);
      const isCompleted = targetCol?.isCompletedColumn || false;
      const finalDueDate = computeFinalDueDate(dueDateDate, dueDateTime);

      onSaveTask({
        id: taskToEdit.id,
        title: title.trim() || taskToEdit.title,
        description: description.trim(),
        priority,
        projectId: projectId || projects[0]?.id || '',
        columnId: columnId || currentProject?.columns[0]?.id || '',
        dueDate: finalDueDate,
        assigneeIds,
        tags: selectedTags,
        checklist,
        attachments,
        comments,
        isCompleted,
        frameColor: frameColor || undefined,
        fichaTecnica: undefined,
        productionRecords,
      });
    }
  };

  // Handlers para Produção
  const handleOpenProduction = () => {
    if (!fichaTecnica || !fichaTecnica.ingredientes || fichaTecnica.ingredientes.length === 0) {
      setNoFichaAlert('Preencha a Ficha Técnica antes de produzir.');
      setTimeout(() => {
        setNoFichaAlert(null);
      }, 4000);
      return;
    }
    setNoFichaAlert(null);
    setIsProductionModalOpen(true);
  };

  const handleConfirmProduction = (record: ProductionRecord) => {
    const updatedRecords = [record, ...productionRecords];
    setProductionRecords(updatedRecords);

    // Encontra a coluna de Concluído do projeto atual
    const targetCompletedCol =
      currentProject?.columns.find(
        (c) =>
          c.isCompletedColumn ||
          c.title.toLowerCase().includes('conclu') ||
          c.title.toLowerCase().includes('pronto') ||
          c.title.toLowerCase().includes('done')
      ) || (currentProject?.columns && currentProject.columns.length > 0 ? currentProject.columns[currentProject.columns.length - 1] : null);

    const finalColumnId = targetCompletedCol?.id || columnId;
    setColumnId(finalColumnId);

    // Feedback visual de sucesso
    setNoFichaAlert(null);
    setProductionSuccessAlert('Produção registrada e card concluído!');
    setTimeout(() => {
      setProductionSuccessAlert(null);
    }, 5000);

    // Registro visual no histórico de comentários
    const newCommentContent = `🏭 Ordem de Produção Confirmada: ${record.quantidadeDesejada} ${record.unidadeProducao} de "${record.nomeItem}" (Fator ${record.fator.toFixed(2)}x) por ${record.producedByUserName || currentUser.name}. Card movido automaticamente para "${targetCompletedCol?.title || 'Concluído'}".`;
    const newCom: Comment = {
      id: `com-prod-${Date.now()}`,
      authorId: currentUser.id,
      content: newCommentContent,
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [...comments, newCom];
    setComments(updatedComments);

    if (taskToEdit) {
      const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
      const finalDueDate = computeFinalDueDate(dueDateDate, dueDateTime);

      onSaveTask({
        id: taskToEdit.id,
        title: title.trim() || taskToEdit.title,
        description: description.trim(),
        priority,
        projectId: projectId || projects[0]?.id || '',
        columnId: finalColumnId,
        dueDate: finalDueDate,
        assigneeIds,
        tags: selectedTags,
        checklist,
        attachments,
        comments: updatedComments,
        isCompleted: true,
        completedAt: new Date().toISOString(),
        frameColor: frameColor || undefined,
        fichaTecnica: fichaTecnica || undefined,
        productionRecords: updatedRecords,
      });

      if (onAddComment) {
        onAddComment(taskToEdit.id, newCommentContent, []);
      }
    }
  };

  // Checklist handlers
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `check-${Date.now()}`,
      title: newChecklistText.trim(),
      isCompleted: false,
    };
    setChecklist((prev) => [...prev, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Comentários & Menções
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Detectar menções
    const mentionedUserIds: string[] = [];
    workspaceMembers.forEach((m) => {
      if (newComment.includes(`@${m.name}`)) {
        mentionedUserIds.push(m.id);
      }
    });

    const newCom: Comment = {
      id: `com-${Date.now()}`,
      authorId: currentUser.id,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      mentions: mentionedUserIds,
    };

    setComments((prev) => [...prev, newCom]);

    if (taskToEdit && onAddComment) {
      onAddComment(taskToEdit.id, newComment.trim(), mentionedUserIds);
    }

    setNewComment('');
  };

  const handleInsertMention = (member: User) => {
    setNewComment((prev) => `${prev}@${member.name} `);
    setShowMentionMenu(false);
    commentInputRef.current?.focus();
  };

  // Gestão de Anexos
  const handleAttachmentAdded = (newAtt: TaskAttachment) => {
    setAttachments((prev) => [...prev, newAtt]);
  };

  const handleDeleteAttachment = async (id: string) => {
    await MediaStorageService.deleteMedia(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMoveAttachmentUp = (index: number) => {
    if (index === 0) return;
    setAttachments((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveAttachmentDown = (index: number) => {
    setAttachments((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleToggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateNewTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
    };
    onCreateTag(newTag);
    setSelectedTagIds((prev) => [...prev, newTag.id]);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const checklistProgress = calculateChecklistProgress(checklist);
  const getMemberUser = (id: string) => workspaceMembers.find((m) => m.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentProject?.color }}
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentProject?.name}
            </span>
            <span aria-hidden="true">/</span>
            <span>{currentProject?.columns.find((c) => c.id === columnId)?.title || 'Quadro'}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Botão de Ficha Técnica: exclusivo para Master, Dono e Administrador */}
            {canManageFicha && (
              <button
                type="button"
                onClick={() => setIsFichaModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  fichaTecnica
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
                }`}
                title={fichaTecnica ? `Ficha Técnica: ${fichaTecnica.nomeItem}` : 'Adicionar ou visualizar Ficha Técnica'}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${fichaTecnica ? 'text-teal-600 dark:text-teal-400' : 'text-teal-500'}`} />
                <span>Ficha Técnica</span>
                {fichaTecnica && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-teal-600 text-white rounded-full text-[10px] font-bold">
                    {fichaTecnica.ingredientes?.length || 0}
                  </span>
                )}
              </button>
            )}

            {/* Botão Produzir integrado com Ficha Técnica: Master, Dono, Administrador e Produção */}
            {canProduce && (
              <button
                type="button"
                onClick={handleOpenProduction}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  fichaTecnica && fichaTecnica.ingredientes && fichaTecnica.ingredientes.length > 0
                    ? 'bg-linear-to-r from-teal-600 to-emerald-600 text-white border-teal-500 hover:from-teal-700 hover:to-emerald-700 shadow-xs active:scale-98'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
                title={
                  fichaTecnica && fichaTecnica.ingredientes && fichaTecnica.ingredientes.length > 0
                    ? 'Abrir ordem de produção com cálculo automático de ingredientes'
                    : 'Preencha a Ficha Técnica antes de produzir'
                }
              >
                <Factory className={`w-3.5 h-3.5 ${fichaTecnica ? 'text-white' : 'text-slate-400'}`} />
                <span>Produzir</span>
                {productionRecords.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                    {productionRecords.length}
                  </span>
                )}
              </button>
            )}

            {taskToEdit && onDuplicateTask && (
              <button
                type="button"
                onClick={() => {
                  onDuplicateTask(taskToEdit);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                title="Criar cópia desta tarefa na mesma coluna"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Copiar card</span>
              </button>
            )}

            {taskToEdit && onArchiveTask && !isCompletedBlocked && (
              <button
                type="button"
                onClick={() => {
                  onArchiveTask(taskToEdit.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                title="Arquivar card (some do quadro e vai para Arquivados)"
              >
                <Archive className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Arquivar</span>
              </button>
            )}

            {taskToEdit && onDeleteTask && !isCompletedBlocked && canDeleteTask(currentUserRole, isMaster) && (
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmState({
                    isOpen: true,
                    type: 'task',
                    id: taskToEdit.id,
                    name: title || taskToEdit.title,
                  })
                }
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                title="Excluir tarefa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Faixa de Proteção para Cards Concluídos */}
        {isCompletedBlocked && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 font-medium animate-in fade-in duration-200">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Card Concluído:</strong> Apenas Master, Dono e Administrador possuem permissão para mover, arquivar ou excluir este card.
            </span>
          </div>
        )}

        {/* Alerta de Ficha Técnica ausente ao tentar produzir */}
        {noFichaAlert && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{noFichaAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNoFichaAlert(null);
                setIsFichaModalOpen(true);
              }}
              className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 shadow-2xs"
            >
              + Preencher Ficha Técnica
            </button>
          </div>
        )}

        {/* Corpo Principal: Grid de 2 colunas estilo Trello / Notion */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Título, Descrição, Checklist, Comentários, Histórico (8 colunas) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Título Principal */}
              <div>
                <input
                  type="text"
                  required
                  autoFocus={!taskToEdit}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título da tarefa..."
                  className="w-full text-lg sm:text-xl font-bold px-3 py-2 rounded-xl border border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden transition-all"
                />
              </div>

              {/* Descrição Rica */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Descrição & Detalhes
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escreva detalhes técnicos, requisitos de aceitação ou anotações para a equipe..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all resize-none"
                />
              </div>

              {/* Checklist com Barra de Progresso (%) - mesmo estilo e fundo de Descrição & Detalhes */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Checklist de Entregas
                    </h3>
                  </div>
                  {checklist.length > 0 && (
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {checklistProgress.percentage}% ({checklistProgress.completed}/{checklistProgress.total})
                    </span>
                  )}
                </div>

                {/* Barra de Progresso */}
                {checklist.length > 0 && (
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${checklistProgress.percentage}%` }}
                    />
                  </div>
                )}

                {/* Itens do Checklist */}
                <div className="space-y-1.5 mb-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => handleToggleChecklistItem(item.id)}
                          className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
                        />
                        <span
                          className={`text-xs ${
                            item.isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          } break-words`}
                        >
                          {item.title}
                        </span>
                      </label>
                      {canDeleteChecklist(currentUserRole) && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmState({
                              isOpen: true,
                              type: 'checklist',
                              id: item.id,
                              name: item.title,
                            })
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          title="Excluir item do checklist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Adicionar Item ao Checklist */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem(e);
                      }
                    }}
                    placeholder="Adicionar subtarefa ou item de verificação..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Seção de Ficha Técnica de Produção (Visível para Master, Admin, Dono e Produção com ficha) */}
              {(canManageFicha || (canProduce && fichaTecnica)) && (
                <div className="p-4 rounded-xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span>Ficha Técnica</span>
                        {fichaTecnica && (
                          <span className="text-[10px] normal-case font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs">
                            {fichaTecnica.nomeItem}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {fichaTecnica
                          ? `${fichaTecnica.ingredientes.length} ingrediente(s) cadastrado(s) com medidas em Kg e Litros`
                          : 'Lista de ingredientes e quantidades (Kg ou Litros)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {fichaTecnica && (
                      <>
                        {canProduce && (
                          <button
                            type="button"
                            onClick={handleOpenProduction}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                            title="Abrir ordem de produção e cálculo automático de ingredientes"
                          >
                            <Factory className="w-3.5 h-3.5" />
                            <span>Produzir</span>
                          </button>
                        )}

                        {canManageFicha && (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsFichaModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>Editar Ficha</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDeleteFichaTecnica}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Remover Ficha Técnica deste card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {!fichaTecnica && canManageFicha && (
                      <button
                        type="button"
                        onClick={() => setIsFichaModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>+ Preencher Ficha Técnica</span>
                      </button>
                    )}
                  </div>
                </div>

                {fichaTecnica ? (
                  <div className="space-y-2.5 pt-1">
                    {/* Grade de ingredientes com medidas em Kg ou Litros */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {fichaTecnica.ingredientes.map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-800/40 text-xs shadow-2xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                            {ing.nome}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                            {ing.quantidade} {ing.unidade}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(fichaTecnica.rendimento || fichaTecnica.observacoes) && (
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-teal-200/40 dark:border-teal-900/30">
                        {fichaTecnica.rendimento && (
                          <span>
                            <strong className="text-slate-800 dark:text-slate-200">Rendimento:</strong> {fichaTecnica.rendimento}
                          </span>
                        )}
                        {fichaTecnica.observacoes && (
                          <span className="truncate">
                            <strong className="text-slate-800 dark:text-slate-200">Obs:</strong> {fichaTecnica.observacoes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Histórico recente de produções do card */}
                    {productionRecords.length > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-teal-200/50 dark:border-teal-800/50 text-[11px]">
                        <div className="flex items-center gap-1.5 text-teal-900 dark:text-teal-200 font-semibold truncate">
                          <Factory className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="truncate">
                            Última produção: {productionRecords[0].quantidadeDesejada} {productionRecords[0].unidadeProducao}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal shrink-0">
                            ({new Date(productionRecords[0].createdAt).toLocaleDateString('pt-BR')})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenProduction}
                          className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline shrink-0 ml-2 cursor-pointer"
                        >
                          Histórico ({productionRecords.length}) →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsFichaModalOpen(true)}
                    className="p-3.5 rounded-lg border border-dashed border-teal-300 dark:border-teal-800/70 bg-white/60 dark:bg-slate-900/40 flex items-center justify-between gap-3 flex-wrap cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nenhuma ficha técnica vinculada a este card.
                      </p>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preencha os ingredientes para liberar o botão de cálculo de produção.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProduction();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-all cursor-pointer"
                        title="Preencha a Ficha Técnica antes de produzir"
                      >
                        <Factory className="w-3.5 h-3.5" />
                        <span>Produzir</span>
                      </button>
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                        + Preencher Ficha
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* Galeria de Anexos e Mídia - mesmo estilo e fundo de Descrição & Detalhes */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Arquivos de Mídia & Anexos ({attachments.length})
                    </h3>
                  </div>
                </div>

                {/* Uploader com Drag & Drop */}
                <MediaUploader onAttachmentAdded={handleAttachmentAdded} />

                {/* Lista de Itens de Mídia com Reordenação e Miniaturas */}
                {attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {attachments.map((att, idx) => (
                      <MediaItemCard
                        key={att.id}
                        attachment={att}
                        index={idx}
                        totalCount={attachments.length}
                        onOpenLightbox={(item) => setActiveLightboxAttachment(item)}
                        onDelete={handleDeleteAttachment}
                        onMoveUp={handleMoveAttachmentUp}
                        onMoveDown={handleMoveAttachmentDown}
                        canDelete={canDeleteAttachment(currentUserRole)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Seção de Comentários com Menções (@nome) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Comentários & Colaboração ({comments.length})
                  </h3>
                </div>

                {/* Lista de Comentários */}
                <div className="space-y-3">
                  {comments.map((com) => {
                    const author = getMemberUser(com.authorId);
                    const isAuthor = com.authorId === currentUser.id;
                    const canRemoveComment = canDeleteComment(currentUserRole, isAuthor);

                    return (
                      <div
                        key={com.id}
                        className="group flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 transition-all"
                      >
                        <UserAvatar user={author} size="md" className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {author?.name || 'Membro'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">
                                {formatTimeAgoPTBR(com.createdAt)}
                              </span>
                              {canRemoveComment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteConfirmState({
                                      isOpen: true,
                                      type: 'comment',
                                      id: com.id,
                                      name: 'este comentário',
                                    })
                                  }
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                  title="Excluir comentário"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {com.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Caixa para novo comentário - mesmo formato e fundo de Descrição & Detalhes */}
                <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                  <textarea
                    ref={commentInputRef}
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário... Use @ para mencionar um colega de equipe"
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden resize-none"
                  />

                  {/* Menu popup de menção */}
                  {showMentionMenu && (
                    <div className="absolute bottom-12 left-2 z-20 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                        Mencionar Colega:
                      </div>
                      {workspaceMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleInsertMention(m)}
                          className="w-full flex items-center gap-2 p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: m.avatarColor }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setShowMentionMenu(!showMentionMenu)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors font-medium"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                      Mencionar
                    </button>

                    <button
                      type="button"
                      onClick={handleSendComment}
                      disabled={!newComment.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-all"
                    >
                      <Send className="w-3 h-3" />
                      Comentar
                    </button>
                  </div>
                </div>
              </div>

              {/* Histórico de Atividades da Tarefa */}
              {taskToEdit?.activities && taskToEdit.activities.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Histórico de Auditoria
                    </h3>
                  </div>
                  <div className="space-y-1.5 pl-6 border-l-2 border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                    {taskToEdit.activities.map((act) => {
                      const u = getMemberUser(act.userId);
                      return (
                        <div key={act.id} className="relative py-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {u?.name || 'Membro'}
                          </span>{' '}
                          {act.action} ·{' '}
                          <span className="text-slate-400">
                            {formatTimeAgoPTBR(act.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: Metadados, Responsáveis, Status, Prioridade, Tags (4 colunas) */}
            <div className="lg:col-span-4 space-y-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {/* Projeto e Coluna */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      Projeto
                    </label>
                    {isCompletedBlocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        <Lock className="w-2.5 h-2.5" /> Fixo
                      </span>
                    )}
                  </div>
                  <select
                    value={projectId}
                    disabled={isCompletedBlocked}
                    onChange={(e) => {
                      if (isCompletedBlocked) return;
                      const nextProjId = e.target.value;
                      setProjectId(nextProjId);
                      const p = projects.find((proj) => proj.id === nextProjId);
                      if (p && p.columns.length > 0) {
                        setColumnId(p.columns[0].id);
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                      isCompletedBlocked ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80' : ''
                    }`}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Coluna do Fluxo
                    </label>
                    {isCompletedBlocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        <Lock className="w-2.5 h-2.5" /> Bloqueado
                      </span>
                    )}
                  </div>
                  <select
                    value={columnId}
                    disabled={isCompletedBlocked}
                    onChange={(e) => {
                      if (isCompletedBlocked) return;
                      setColumnId(e.target.value);
                    }}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                      isCompletedBlocked ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800/80' : ''
                    }`}
                    title={isCompletedBlocked ? 'Card concluído: apenas Dono e Administrador podem alterar a coluna' : undefined}
                  >
                    {currentProject?.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} {c.isCompletedColumn ? '(Conclusão)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsáveis da Tarefa (Multi-Assignee) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Responsáveis ({assigneeIds.length})
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {workspaceMembers.map((member) => {
                    const isAssigned = assigneeIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleToggleAssignee(member.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                          isAssigned
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <UserAvatar user={member} size="sm" />
                          <span className="truncate">{member.name}</span>
                        </div>
                        {isAssigned && <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prioridade (Sem prioridade, Baixa, Média, Alta, Urgente) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    <span>Nível de Prioridade</span>
                  </label>
                  {priority && priority !== 'none' ? (
                    <button
                      type="button"
                      onClick={() => setPriority('none')}
                      className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Limpar prioridade (deixar sem prioridade)"
                    >
                      <X className="w-3 h-3" />
                      <span>Limpar prioridade</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic font-normal">
                      Sem prioridade
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPriority('none')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      priority === 'none' || !priority
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Sem prioridade</span>
                  </button>
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(isSelected ? 'none' : p)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Moldura do Card / Cor de Destaque com Pincel */}
              <div>
                <ColorPicker
                  label="Cor da Moldura do Card"
                  description="Borda de destaque no quadro"
                  value={frameColor || currentProject?.color || '#2563eb'}
                  onChange={(newColor) => setFrameColor(newColor)}
                  allowClear={true}
                  defaultColor={currentProject?.color || '#2563eb'}
                  clearLabel="Herdar do Projeto"
                  size="md"
                  showPaletteStrip={true}
                  quickPaletteCount={5}
                />
              </div>

              {/* Data e Horário de Execução / Vencimento */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Data e Horário</span>
                  </label>
                  {(dueDateDate || dueDateTime) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {formatDueDatePTBR(computeFinalDueDate(dueDateDate, dueDateTime)).fullText}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDueDateDate('');
                          setDueDateTime('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Limpar data e horário (voltar a ficar vazio)"
                      >
                        <X className="w-3 h-3" />
                        <span>Limpar prazo</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic font-normal">
                      Definir data e hora (opcional)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Seletor de Data */}
                  <div className="sm:col-span-7 relative">
                    <input
                      type="date"
                      value={dueDateDate}
                      onChange={(e) => setDueDateDate(e.target.value)}
                      placeholder="Definir data"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                    {dueDateDate && (
                      <button
                        type="button"
                        onClick={() => setDueDateDate('')}
                        title="Limpar data"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Seletor de Horário */}
                  <div className="sm:col-span-5 relative">
                    <input
                      type="time"
                      value={dueDateTime}
                      onChange={(e) => setDueDateTime(e.target.value)}
                      placeholder="Definir hora"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                    {dueDateTime && (
                      <button
                        type="button"
                        onClick={() => setDueDateTime('')}
                        title="Limpar hora"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Atalhos Rápidos de Horário */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium mr-0.5">Atalhos:</span>
                  {[
                    { label: '09:00', value: '09:00' },
                    { label: '12:00', value: '12:00' },
                    { label: '15:00', value: '15:00' },
                    { label: '18:00', value: '18:00' },
                    { label: '23:59', value: '23:59' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDueDateTime(dueDateTime === preset.value ? '' : preset.value)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                        dueDateTime === preset.value
                          ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {dueDateTime && (
                    <button
                      type="button"
                      onClick={() => setDueDateTime('')}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    >
                      Limpar hora
                    </button>
                  )}
                </div>

                {/* Feedback dinâmico de status da data/hora */}
                {(dueDateDate || dueDateTime) && (
                  <div className="mt-2 text-[11px]">
                    {(() => {
                      const finalStr = computeFinalDueDate(dueDateDate, dueDateTime);
                      const info = formatDueDatePTBR(finalStr);
                      if (info.isOverdue) {
                        return (
                          <div className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-lg border border-red-200/60 dark:border-red-900/60">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Horário já expirado! Esta tarefa será marcada como atrasada.</span>
                          </div>
                        );
                      }
                      if (info.isToday) {
                        return (
                          <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Execução para hoje {dueDateTime ? `às ${dueDateTime}` : '(dia inteiro)'}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Agendada para <strong>{info.fullText}</strong></span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Tags / Etiquetas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />
                    Etiquetas
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTag(!isCreatingTag)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    + Criar
                  </button>
                </div>

                {isCreatingTag && (
                  <div className="p-3 mb-2 rounded-xl border border-blue-200/80 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da etiqueta..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <ColorPicker
                        value={newTagColor}
                        onChange={(newColor) => setNewTagColor(newColor)}
                        size="sm"
                        showPaletteStrip={true}
                        quickPaletteCount={4}
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewTag}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        Salvar Etiqueta
                      </button>
                    </div>
                  </div>
                )}


                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs font-bold'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé fixo de Salvar e Ações */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 mt-6">
            <div className="flex items-center gap-2">
              {taskToEdit && onDuplicateTask && (
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateTask(taskToEdit);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 rounded-xl transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Duplicar card</span>
                </button>
              )}

              {taskToEdit && onArchiveTask && (
                <button
                  type="button"
                  onClick={() => {
                    onArchiveTask(taskToEdit.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-750 rounded-xl transition-colors"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Arquivar</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenProduction}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  fichaTecnica && fichaTecnica.ingredientes && fichaTecnica.ingredientes.length > 0
                    ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 shadow-2xs'
                    : 'text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
                title={
                  fichaTecnica && fichaTecnica.ingredientes && fichaTecnica.ingredientes.length > 0
                    ? 'Produzir este item'
                    : 'Preencha a Ficha Técnica antes de produzir'
                }
              >
                <Factory className="w-3.5 h-3.5" />
                <span>Produzir</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {taskToEdit && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline mr-2">
                  ✓ Alterações salvas automaticamente
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {taskToEdit ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all"
              >
                {taskToEdit ? 'Concluir & Salvar' : 'Criar Card'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Lightbox para Visualização Ampliada de Mídias */}
      {activeLightboxAttachment && (
        <MediaLightbox
          attachment={activeLightboxAttachment}
          onClose={() => setActiveLightboxAttachment(null)}
        />
      )}

      {/* Modal de Ficha Técnica */}
      <FichaTecnicaModal
        isOpen={isFichaModalOpen}
        onClose={() => setIsFichaModalOpen(false)}
        fichaTecnica={fichaTecnica}
        taskTitle={title || taskToEdit?.title || 'Tarefa'}
        onSave={handleSaveFichaTecnica}
        onDelete={handleDeleteFichaTecnica}
      />

      {/* Modal de Ordem de Produção com Cálculo Automático */}
      <ProductionModal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        fichaTecnica={fichaTecnica}
        taskId={taskToEdit?.id || 'new-task'}
        taskTitle={title || taskToEdit?.title || 'Tarefa'}
        currentUser={currentUser}
        productionRecords={productionRecords}
        onConfirmProduction={handleConfirmProduction}
      />

      {/* Modal de Confirmação Padronizado */}
      {deleteConfirmState?.isOpen && (
        <ConfirmDeleteModal
          isOpen={deleteConfirmState.isOpen}
          onClose={() => setDeleteConfirmState(null)}
          onConfirm={() => {
            if (!deleteConfirmState) return;
            if (deleteConfirmState.type === 'task') {
              onDeleteTask?.(deleteConfirmState.id);
              onClose();
            } else if (deleteConfirmState.type === 'checklist') {
              handleDeleteChecklistItem(deleteConfirmState.id);
            } else if (deleteConfirmState.type === 'comment') {
              setComments((prev) => prev.filter((c) => c.id !== deleteConfirmState.id));
            }
            setDeleteConfirmState(null);
          }}
          title={
            deleteConfirmState.type === 'task'
              ? 'Excluir card de tarefa?'
              : deleteConfirmState.type === 'checklist'
              ? 'Excluir item do checklist?'
              : 'Excluir comentário?'
          }
          itemName={deleteConfirmState.name}
          itemType={
            deleteConfirmState.type === 'task'
              ? 'este card'
              : deleteConfirmState.type === 'checklist'
              ? 'este item'
              : 'este comentário'
          }
          message={
            deleteConfirmState.type === 'task'
              ? `Tem certeza que deseja excluir permanentemente o card "${deleteConfirmState.name}"? Esta ação não pode ser desfeita.`
              : deleteConfirmState.type === 'checklist'
              ? `Tem certeza que deseja remover o item "${deleteConfirmState.name}" do checklist?`
              : 'Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.'
          }
          onArchiveInstead={
            deleteConfirmState.type === 'task' && onArchiveTask && taskToEdit
              ? () => {
                  onArchiveTask(taskToEdit.id);
                  onClose();
                }
              : undefined
          }
          archiveButtonText="Arquivar card"
        />
      )}
    </div>
  );
};
