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
  CopyPlus,
  Archive,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Factory,
  Lock,
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
} from 'lucide-react';
import {
  PRIORITY_CONFIG,
  getPriorityInfo,
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
import { ColorPicker } from './ColorPicker.tsx';

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
  workspaceName?: string;
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
  onArchiveColumn?: (columnId: string) => void;
  onDuplicateColumn?: (columnId: string, includeCards: boolean) => void;
  onReorderColumns?: (orderedColumnIds: string[]) => void;
  onUpdateColumn?: (columnId: string, updates: { title: string; color: string }) => void;
  onQuickAddTask: (columnId: string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  project,
  workspaceName,
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
  onArchiveColumn,
  onDuplicateColumn,
  onReorderColumns,
  onUpdateColumn,
  onQuickAddTask,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumnId, setActiveDropColumnId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [columnDropIndicator, setColumnDropIndicator] = useState<{
    targetColumnId: string;
    position: 'before' | 'after';
  } | null>(null);
  const [touchDragGhost, setTouchDragGhost] = useState<{
    columnId: string;
    title: string;
    color: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');
  const [editColumnColor, setEditColumnColor] = useState('#2563eb');
  const [selectedMobileColumn, setSelectedMobileColumn] = useState<string | 'all'>(() => {
    try {
      return sessionStorage.getItem(`operatask_mobile_col_${project.id}`) || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`operatask_mobile_col_${project.id}`, selectedMobileColumn);
    } catch {}
  }, [selectedMobileColumn, project.id]);

  const [activeBoardColIndex, setActiveBoardColIndex] = useState(0);
  // Padrão mobile: visão ampla em duas colunas (60% / 40%). Ao recolher/focar: coluna única (100%).
  const [mobileLayoutMode, setMobileLayoutMode] = useState<'split' | 'single'>('split');
  const [focusedColumnId, setFocusedColumnId] = useState<string | null>(null);
  const [focusZoomMode, setFocusZoomMode] = useState<'amplified' | 'overview'>('amplified');

  const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
  const boardScrollSettleTimerRef = React.useRef<number | null>(null);
  const isProgrammaticBoardScrollRef = React.useRef(false);
  const focusScrollRef = React.useRef<HTMLDivElement | null>(null);
  const focusColumnRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const isProgrammaticFocusScrollRef = React.useRef(false);

  const columns = [...(project.columns || [])]
    .filter((c) => !c.isArchived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const activeColumnIds = new Set(columns.map((c) => c.id));
  const visibleTasks = tasks.filter((t) => !t.isArchived && activeColumnIds.has(t.columnId));
  const canReorderCols = Boolean(onReorderColumns && columns.length > 1);
  const effectiveMobileColumn =
    selectedMobileColumn === 'all' || columns.some((c) => c.id === selectedMobileColumn)
      ? selectedMobileColumn
      : 'all';
  const displayedColumns = columns.filter(
    (col) => effectiveMobileColumn === 'all' || col.id === effectiveMobileColumn
  );
  const isMobileSplitView = mobileLayoutMode === 'split' && displayedColumns.length > 1;

  useEffect(() => {
    setFocusedColumnId(null);
    setActiveBoardColIndex(0);
    setMobileLayoutMode('split');
    try {
      const savedX = sessionStorage.getItem(`operatask_board_scroll_${project.id}`);
      if (savedX && boardScrollRef.current) {
        boardScrollRef.current.scrollLeft = parseFloat(savedX);
      }
    } catch {}
  }, [project.id]);

  useEffect(() => {
    return () => {
      if (boardScrollSettleTimerRef.current !== null) {
        window.clearTimeout(boardScrollSettleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeBoardColIndex >= displayedColumns.length) {
      setActiveBoardColIndex(Math.max(0, displayedColumns.length - 1));
    }
  }, [displayedColumns.length, activeBoardColIndex]);

  useEffect(() => {
    if (!focusedColumnId) return;
    if (!columns.some((c) => c.id === focusedColumnId)) {
      setFocusedColumnId(columns[0]?.id || null);
    }
  }, [columns, focusedColumnId]);

  const alignBoardToColumn = (
    colId: string,
    colIdx: number,
    totalCols: number,
    mode: 'split' | 'single',
    instant = false
  ) => {
    isProgrammaticBoardScrollRef.current = true;
    const runAlign = () => {
      const el = columnRefs.current.get(colId);
      const container = boardScrollRef.current;
      if (el && container) {
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const isLastColInSplit = mode === 'split' && totalCols > 1 && colIdx === totalCols - 1;
        const targetLeft = isLastColInSplit
          ? maxScroll
          : Math.min(maxScroll, Math.max(0, el.offsetLeft));
        container.scrollTo({
          left: targetLeft,
          behavior: instant ? 'auto' : 'smooth',
        });
      }
      window.setTimeout(() => {
        isProgrammaticBoardScrollRef.current = false;
      }, instant ? 90 : 380);
    };
    requestAnimationFrame(() => requestAnimationFrame(runAlign));
  };

  const handleBoardScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    try {
      sessionStorage.setItem(`operatask_board_scroll_${project.id}`, String(container.scrollLeft));
    } catch {}

    if (isProgrammaticBoardScrollRef.current || displayedColumns.length <= 1) return;

    if (boardScrollSettleTimerRef.current !== null) {
      window.clearTimeout(boardScrollSettleTimerRef.current);
    }

    // Aguarda o fim do gesto de rolagem antes de alternar a coluna ativa (evita saltos durante o swipe 60/40)
    boardScrollSettleTimerRef.current = window.setTimeout(() => {
      const elContainer = boardScrollRef.current;
      if (!elContainer || isProgrammaticBoardScrollRef.current) return;

      const atEnd =
        elContainer.scrollWidth - elContainer.clientWidth > 8 &&
        elContainer.scrollLeft + elContainer.clientWidth >= elContainer.scrollWidth - 10;

      let nextIdx = 0;

      if (atEnd) {
        nextIdx = displayedColumns.length - 1;
      } else {
        const containerRect = elContainer.getBoundingClientRect();
        // Em 60%/40%, a coluna principal ocupa os 60% iniciais (centro em ~30%); em coluna única, centro em 50%
        const anchorX =
          mobileLayoutMode === 'split'
            ? containerRect.left + containerRect.width * 0.3
            : containerRect.left + containerRect.width * 0.5;

        let minDist = Number.POSITIVE_INFINITY;

        displayedColumns.forEach((col, idx) => {
          const el = columnRefs.current.get(col.id);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const colCenter = rect.left + rect.width / 2;
          const dist = Math.abs(colCenter - anchorX);
          if (dist < minDist) {
            minDist = dist;
            nextIdx = idx;
          }
        });
      }

      if (nextIdx !== activeBoardColIndex) {
        setActiveBoardColIndex(nextIdx);
        // Em 60%/40%, realinha suavemente após a troca de largura para evitar deslocamento visual
        if (mobileLayoutMode === 'split') {
          const nextCol = displayedColumns[nextIdx];
          if (nextCol) {
            alignBoardToColumn(nextCol.id, nextIdx, displayedColumns.length, 'split', false);
          }
        }
      }
    }, 150);
  };

  const scrollToBoardColumn = (index: number, instant = false) => {
    const targetCol = displayedColumns[index];
    if (!targetCol) return;
    setActiveBoardColIndex(index);
    alignBoardToColumn(targetCol.id, index, displayedColumns.length, mobileLayoutMode, instant);
  };

  // Alternância invertida no mobile:
  // Padrão = visão ampla 2 colunas (60% / 40%). Recolher/Focar = coluna única (100%).
  const toggleMobileColumnMode = (targetColId?: string) => {
    const currentCol =
      (targetColId ? columns.find((c) => c.id === targetColId) : null) ||
      displayedColumns[activeBoardColIndex] ||
      displayedColumns[0] ||
      columns[0];

    if (!currentCol) return;

    const currentlyInSplit = mobileLayoutMode === 'split' && effectiveMobileColumn === 'all' && columns.length > 1;

    if (currentlyInSplit) {
      // Recolher/Focar -> coluna selecionada passa a 100% da largura útil
      const idx = displayedColumns.findIndex((c) => c.id === currentCol.id);
      const safeIdx = idx >= 0 ? idx : 0;
      setMobileLayoutMode('single');
      setActiveBoardColIndex(safeIdx);
      alignBoardToColumn(currentCol.id, safeIdx, displayedColumns.length, 'single', true);
    } else {
      // Restaurar visão ampla -> retorna imediatamente à proporção 60% / 40% em duas colunas
      const allIdx = columns.findIndex((c) => c.id === currentCol.id);
      const safeIdx = allIdx >= 0 ? allIdx : 0;
      setSelectedMobileColumn('all');
      setMobileLayoutMode('split');
      setActiveBoardColIndex(safeIdx);
      alignBoardToColumn(currentCol.id, safeIdx, columns.length, 'split', true);
    }
  };

  const scrollToFocusColumn = (columnId: string, instant = false) => {
    setFocusedColumnId(columnId);
    const runScroll = () => {
      const el = focusColumnRefs.current.get(columnId);
      const container = focusScrollRef.current;
      if (!el || !container) return;
      isProgrammaticFocusScrollRef.current = true;
      const targetLeft =
        focusZoomMode === 'amplified'
          ? el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2
          : el.offsetLeft - 12;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: instant ? 'auto' : 'smooth',
      });
      window.setTimeout(() => {
        isProgrammaticFocusScrollRef.current = false;
      }, instant ? 60 : 380);
    };
    requestAnimationFrame(runScroll);
  };

  const openFocusMode = (columnId: string) => {
    setOpenMenuColumnId(null);
    setOpenMenuTaskId(null);
    setFocusZoomMode('amplified');
    setFocusedColumnId(columnId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = focusColumnRefs.current.get(columnId);
        const container = focusScrollRef.current;
        if (el && container) {
          isProgrammaticFocusScrollRef.current = true;
          const targetLeft = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2;
          container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'auto' });
          window.setTimeout(() => {
            isProgrammaticFocusScrollRef.current = false;
          }, 80);
        }
      });
    });
  };

  const handleFocusScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticFocusScrollRef.current || columns.length <= 1) return;
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const anchorX =
      focusZoomMode === 'amplified'
        ? containerRect.left + containerRect.width / 2
        : containerRect.left + containerRect.width * 0.35;

    let closestColId: string | null = null;
    let minDist = Number.POSITIVE_INFINITY;

    columns.forEach((col) => {
      const el = focusColumnRefs.current.get(col.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const colCenter = rect.left + rect.width / 2;
      const dist = Math.abs(colCenter - anchorX);
      if (dist < minDist) {
        minDist = dist;
        closestColId = col.id;
      }
    });

    if (closestColId && closestColId !== focusedColumnId) {
      setFocusedColumnId(closestColId);
    }
  };

  // Mantém o quadro ativo alinhado ao alternar entre Ampliado e Visão Geral no Modo Foco
  useEffect(() => {
    if (!focusedColumnId) return;
    const timer = window.setTimeout(() => {
      const el = focusColumnRefs.current.get(focusedColumnId);
      const container = focusScrollRef.current;
      if (!el || !container) return;
      isProgrammaticFocusScrollRef.current = true;
      const targetLeft =
        focusZoomMode === 'amplified'
          ? el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2
          : el.offsetLeft - 12;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticFocusScrollRef.current = false;
      }, 320);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [focusZoomMode]);

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

  // Fechar Modo Foco com tecla ESC quando não houver modal superior aberto
  useEffect(() => {
    if (!focusedColumnId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingColumn && !deleteConfirmState?.isOpen) {
        setFocusedColumnId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedColumnId, editingColumn, deleteConfirmState]);

  // Fechar dropdowns de ações (card ou coluna) ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuTaskId(null);
      setOpenMenuColumnId(null);
    };
    if (openMenuTaskId || openMenuColumnId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuTaskId, openMenuColumnId]);

  // Refs para suporte fluido a "apertar e segurar" no topo da coluna em celulares/touch
  const columnRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const touchHoldTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragStateRef = React.useRef<{
    pendingColumnId: string | null;
    activeColumnId: string | null;
    startX: number;
    startY: number;
    title: string;
    color: string;
    count: number;
    dropTargetId: string | null;
    dropPosition: 'before' | 'after';
  }>({
    pendingColumnId: null,
    activeColumnId: null,
    startX: 0,
    startY: 0,
    title: '',
    color: '#2563eb',
    count: 0,
    dropTargetId: null,
    dropPosition: 'before',
  });

  const executeColumnReorder = (
    sourceColumnId: string,
    targetColumnId: string,
    position: 'before' | 'after'
  ) => {
    if (!onReorderColumns || !sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return;
    }
    const orderedIds = columns.map((c) => c.id);
    const fromIdx = orderedIds.indexOf(sourceColumnId);
    if (fromIdx === -1) return;

    const remaining = orderedIds.filter((id) => id !== sourceColumnId);
    const targetIdx = remaining.indexOf(targetColumnId);
    if (targetIdx === -1) return;

    const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx;
    remaining.splice(insertIdx, 0, sourceColumnId);

    const changed = remaining.some((id, idx) => id !== orderedIds[idx]);
    if (changed) {
      onReorderColumns(remaining);
    }
  };

  const handleMoveColumnStep = (columnId: string, direction: 'left' | 'right') => {
    if (!onReorderColumns) return;
    const orderedIds = columns.map((c) => c.id);
    const idx = orderedIds.indexOf(columnId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedIds.length) return;
    const next = [...orderedIds];
    const tmp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = tmp;
    onReorderColumns(next);
  };

  const executeColumnReorderRef = React.useRef(executeColumnReorder);
  executeColumnReorderRef.current = executeColumnReorder;

  const clearTouchColumnDrag = () => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    touchDragStateRef.current.pendingColumnId = null;
    touchDragStateRef.current.activeColumnId = null;
    touchDragStateRef.current.dropTargetId = null;
    setDraggedColumnId(null);
    setColumnDropIndicator(null);
    setTouchDragGhost(null);
  };

  useEffect(() => {
    const handleWindowTouchMove = (e: TouchEvent) => {
      const state = touchDragStateRef.current;
      if (!state.pendingColumnId && !state.activeColumnId) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Se o dedo se moveu antes de completar o "apertar e segurar", cancela para permitir rolagem normal
      if (!state.activeColumnId && state.pendingColumnId) {
        const dx = Math.abs(touch.clientX - state.startX);
        const dy = Math.abs(touch.clientY - state.startY);
        if (dx > 10 || dy > 10) {
          if (touchHoldTimerRef.current) {
            clearTimeout(touchHoldTimerRef.current);
            touchHoldTimerRef.current = null;
          }
          state.pendingColumnId = null;
        }
        return;
      }

      if (!state.activeColumnId) return;
      e.preventDefault();

      const clientX = touch.clientX;
      const clientY = touch.clientY;

      setTouchDragGhost({
        columnId: state.activeColumnId,
        title: state.title,
        color: state.color,
        count: state.count,
        x: clientX,
        y: clientY,
      });

      // Auto-scroll horizontal suave ao aproximar o dedo das bordas do quadro
      const container = boardScrollRef.current;
      if (container) {
        const edgeThreshold = 64;
        if (clientX < edgeThreshold) {
          container.scrollLeft -= 14;
        } else if (clientX > window.innerWidth - edgeThreshold) {
          container.scrollLeft += 14;
        }
      }

      // Detecta qual coluna está sob o dedo e se deve inserir antes ou depois
      let hoveredId: string | null = null;
      let hoveredPos: 'before' | 'after' = 'before';
      let minDist = Infinity;

      columnRefs.current.forEach((el, colId) => {
        if (!el || colId === state.activeColumnId) return;
        const rect = el.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          hoveredId = colId;
          hoveredPos = clientX > rect.left + rect.width / 2 ? 'after' : 'before';
          minDist = 0;
        } else if (minDist > 0) {
          const centerX = rect.left + rect.width / 2;
          const dist = Math.abs(clientX - centerX);
          if (dist < minDist) {
            minDist = dist;
            hoveredId = colId;
            hoveredPos = clientX > centerX ? 'after' : 'before';
          }
        }
      });

      if (hoveredId) {
        state.dropTargetId = hoveredId;
        state.dropPosition = hoveredPos;
        setColumnDropIndicator({ targetColumnId: hoveredId, position: hoveredPos });
      }
    };

    const handleWindowTouchEnd = () => {
      const state = touchDragStateRef.current;
      if (state.activeColumnId && state.dropTargetId) {
        executeColumnReorderRef.current(
          state.activeColumnId,
          state.dropTargetId,
          state.dropPosition
        );
      }
      if (state.pendingColumnId || state.activeColumnId) {
        clearTouchColumnDrag();
      }
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
      }
    };
  }, []);

  const handleColumnHeaderTouchStart = (
    e: React.TouchEvent,
    col: BoardColumn,
    cardCount: number
  ) => {
    if (!canReorderCols || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;

    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
    }

    const state = touchDragStateRef.current;
    state.pendingColumnId = col.id;
    state.activeColumnId = null;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.title = col.title;
    state.color = col.color;
    state.count = cardCount;
    state.dropTargetId = null;
    state.dropPosition = 'before';

    touchHoldTimerRef.current = setTimeout(() => {
      if (touchDragStateRef.current.pendingColumnId !== col.id) return;
      touchDragStateRef.current.activeColumnId = col.id;
      touchDragStateRef.current.pendingColumnId = null;
      setOpenMenuColumnId(null);
      setOpenMenuTaskId(null);
      setSelectedMobileColumn('all');
      setDraggedColumnId(col.id);
      setTouchDragGhost({
        columnId: col.id,
        title: col.title,
        color: col.color,
        count: cardCount,
        x: touchDragStateRef.current.startX,
        y: touchDragStateRef.current.startY,
      });
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(25);
        } catch {}
      }
    }, 260);
  };

  const handleColumnHeaderDragStart = (e: React.DragEvent, colId: string) => {
    if (!canReorderCols) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setOpenMenuColumnId(null);
    setOpenMenuTaskId(null);
    setDraggedTaskId(null);
    setActiveDropColumnId(null);
    setDropIndicator(null);
    setDraggedColumnId(colId);
    e.dataTransfer.setData('application/x-operatask-column', colId);
    e.dataTransfer.setData('text/plain', `col::${colId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnHeaderDragEnd = () => {
    setDraggedColumnId(null);
    setColumnDropIndicator(null);
  };

  const isDraggingColumnEvent = (e?: React.DragEvent): boolean => {
    if (draggedColumnId) return true;
    if (!e?.dataTransfer) return false;
    try {
      return Array.from(e.dataTransfer.types || []).includes('application/x-operatask-column');
    } catch {
      return false;
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask && isTaskInDoneColumn(targetTask, columns) && !canModifyCompletedTask(currentUserRole, isMaster)) {
      e.preventDefault();
      return;
    }
    setDraggedColumnId(null);
    setColumnDropIndicator(null);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleCardDragOver = (e: React.DragEvent, targetTask: Task, columnId: string) => {
    if (isDraggingColumnEvent(e)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const currentDraggedId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (!currentDraggedId || currentDraggedId.startsWith('col::') || currentDraggedId === targetTask.id) {
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

    if (isDraggingColumnEvent(e)) {
      if (draggedColumnId === columnId) {
        setColumnDropIndicator(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const isAfter = e.clientX > rect.left + rect.width / 2;
      setColumnDropIndicator({
        targetColumnId: columnId,
        position: isAfter ? 'after' : 'before',
      });
      return;
    }

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
    if (columnDropIndicator?.targetColumnId === columnId) {
      setColumnDropIndicator(null);
    }
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
    if (isDraggingColumnEvent(e)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || taskId.startsWith('col::')) return;

    const pos = dropIndicator?.targetTaskId === targetTaskId ? dropIndicator.position : 'after';
    executeDrop(taskId, targetColumnId, targetTaskId, pos);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();

    if (isDraggingColumnEvent(e)) {
      const rawPlain = e.dataTransfer.getData('text/plain');
      const sourceColumnId =
        e.dataTransfer.getData('application/x-operatask-column') ||
        (rawPlain.startsWith('col::') ? rawPlain.slice(5) : '') ||
        draggedColumnId;
      if (sourceColumnId && sourceColumnId !== targetColumnId) {
        const rect = e.currentTarget.getBoundingClientRect();
        const fallbackPos: 'before' | 'after' =
          e.clientX > rect.left + rect.width / 2 ? 'after' : 'before';
        const pos =
          columnDropIndicator?.targetColumnId === targetColumnId
            ? columnDropIndicator.position
            : fallbackPos;
        executeColumnReorder(sourceColumnId, targetColumnId, pos);
      }
      setDraggedColumnId(null);
      setColumnDropIndicator(null);
      return;
    }

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId || taskId.startsWith('col::')) return;

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
    setDraggedColumnId(null);
    setColumnDropIndicator(null);
  };

  // Reordenação de cards para cima / para baixo com salvamento automático
  const handleMoveTaskStep = (task: Task, columnId: string, direction: 'up' | 'down') => {
    const isCompleted = isTaskInDoneColumn(task, columns);
    if (isCompleted && !canModifyCompletedTask(currentUserRole, isMaster)) {
      return;
    }

    const colTasks = tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 0;
        const orderB = typeof b.order === 'number' ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt.localeCompare(b.createdAt);
      });

    const currentIndex = colTasks.findIndex((t) => t.id === task.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= colTasks.length) return;

    const reordered = [...colTasks];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const updates: TaskReorderUpdate[] = reordered.map((t, idx) => ({
      id: t.id,
      columnId,
      order: idx,
    }));

    if (onReorderTasks) {
      onReorderTasks(updates, {
        taskId: task.id,
        targetColumnId: columnId,
        prevColumnId: columnId,
      });
    }
  };

  const getMemberUser = (id: string) => workspaceMembers.find((m) => m.id === id);
  const projectBorderColor = project.color || '#2563eb';

  const focusedColIndex = focusedColumnId
    ? Math.max(0, columns.findIndex((c) => c.id === focusedColumnId))
    : 0;
  const activeFocusedCol = focusedColumnId
    ? columns.find((c) => c.id === focusedColumnId) || columns[0] || null
    : null;

  return (
    <div className="flex flex-col h-full md:h-auto md:min-h-[calc(100vh-220px)] min-h-0">
      {/* Barra Compacta Mobile: Seletor Rápido de Quadros + Botão Invertido Recolher (100%) / Ampliar (60/40) */}
      <div className="flex md:hidden items-center gap-1.5 mb-2 shrink-0 select-none">
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => {
              setSelectedMobileColumn('all');
              setMobileLayoutMode('split');
              setActiveBoardColIndex(0);
              if (boardScrollRef.current) {
                boardScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
              effectiveMobileColumn === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>Todas</span>
            <span className="opacity-80 text-[10px] tabular-nums">({visibleTasks.length})</span>
          </button>

          {columns.map((col) => {
            const count = visibleTasks.filter((t) => t.columnId === col.id).length;
            const isSelected = effectiveMobileColumn === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  setSelectedMobileColumn(col.id);
                  setActiveBoardColIndex(0);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                <span className="truncate max-w-[110px]">{col.title}</span>
                <span className="opacity-75 text-[10px] tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>

        {columns.length > 1 && (
          <button
            type="button"
            onClick={() => toggleMobileColumnMode()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
            title={
              isMobileSplitView
                ? 'Coluna única (100%)'
                : 'Duas colunas (60% / 40%)'
            }
            aria-label={
              isMobileSplitView
                ? 'Alternar para coluna única em 100% de largura'
                : 'Alternar para duas colunas 60% e 40%'
            }
          >
            {isMobileSplitView ? (
              <Minimize2 className="w-4 h-4 shrink-0" />
            ) : (
              <Maximize2 className="w-4 h-4 shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Linha das Colunas Kanban - Padrão mobile 60%/40% em 2 colunas, 100% ao recolher, e desktop preservado */}
      <div
        ref={boardScrollRef}
        onScroll={handleBoardScroll}
        className={`flex-1 min-h-0 flex gap-2.5 md:gap-5 pb-1 md:pb-8 overflow-x-auto md:min-h-[calc(100vh-220px)] items-stretch md:items-start select-none scroll-smooth scrollbar-none md:scrollbar-auto ${
          draggedColumnId
            ? 'snap-none'
            : isMobileSplitView
            ? 'snap-x snap-proximity'
            : 'snap-x snap-mandatory'
        }`}
      >
      {displayedColumns.map((col, displayedIdx) => {
        const colIndex = columns.findIndex((c) => c.id === col.id);
        const isPrimarySplitCol = isMobileSplitView && displayedIdx === activeBoardColIndex;
        const isSecondarySplitCol = isMobileSplitView && displayedIdx !== activeBoardColIndex;
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
        const isBeingDraggedColumn = draggedColumnId === col.id;
        const isColumnDropBefore =
          columnDropIndicator?.targetColumnId === col.id &&
          columnDropIndicator.position === 'before' &&
          draggedColumnId !== col.id;
        const isColumnDropAfter =
          columnDropIndicator?.targetColumnId === col.id &&
          columnDropIndicator.position === 'after' &&
          draggedColumnId !== col.id;
        const canManageCol = canDeleteColumn(currentUserRole, isMaster);
        const isColMenuOpen = openMenuColumnId === col.id;

        const mobileColumnWidthClass = isMobileSplitView
          ? isPrimarySplitCol
            ? 'w-[calc(60%-5px)]'
            : 'w-[calc(40%-5px)]'
          : 'w-full';

        return (
          <div
            key={col.id}
            data-column-id={col.id}
            ref={(el) => {
              if (el) {
                columnRefs.current.set(col.id, el);
              } else {
                columnRefs.current.delete(col.id);
              }
            }}
            onDragOver={(e) => handleColumnDragOver(e, col.id)}
            onDragLeave={(e) => handleColumnDragLeave(e, col.id)}
            onDrop={(e) => handleColumnDrop(e, col.id)}
            className={`relative ${mobileColumnWidthClass} md:w-76 shrink-0 snap-start md:snap-align-none flex flex-col h-full md:h-auto md:max-h-[calc(100vh-220px)] bg-slate-100/80 dark:bg-slate-900/55 rounded-2xl ${
              isSecondarySplitCol
                ? 'p-1.5 md:p-2.5'
                : isPrimarySplitCol
                ? 'p-2 md:p-2.5'
                : 'p-2.5'
            } border transition-[width,border-color,background-color,box-shadow] duration-200 ${
              isBeingDraggedColumn
                ? 'opacity-50 scale-[0.98] border-blue-500 ring-2 ring-blue-400/50 shadow-lg'
                : isDropTarget
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-400/20 shadow-md'
                : isColumnDropBefore || isColumnDropAfter
                ? 'border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                : 'border-slate-200/80 dark:border-slate-800/80'
            }`}
          >
            {/* Indicador visual lateral ao arrastar quadro antes ou depois */}
            {isColumnDropBefore && (
              <div className="pointer-events-none absolute -left-2.5 top-2 bottom-2 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.65)] z-30" />
            )}
            {isColumnDropAfter && (
              <div className="pointer-events-none absolute -right-2.5 top-2 bottom-2 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.65)] z-30" />
            )}

            {/* Faixa superior de cor do quadro */}
            <div
              className="h-1 w-full rounded-full mb-1.5 shrink-0 opacity-90"
              style={{ backgroundColor: col.color }}
            />

            {/* Cabeçalho da Coluna: Arrastável no topo para reordenar quadros e adaptado para 60% / 40% no mobile */}
            <div
              draggable={canReorderCols}
              onDragStart={(e) => handleColumnHeaderDragStart(e, col.id)}
              onDragEnd={handleColumnHeaderDragEnd}
              onTouchStart={(e) => handleColumnHeaderTouchStart(e, col, columnTasks.length)}
              onClick={() => {
                if (isSecondarySplitCol && !draggedColumnId) {
                  scrollToBoardColumn(displayedIdx);
                }
              }}
              title={canReorderCols ? 'Pressione e arraste o topo para mover este quadro' : undefined}
              className={`flex ${
                isSecondarySplitCol
                  ? 'flex-col items-stretch gap-1 px-1 py-1 mb-1 md:flex-row md:items-center md:justify-between md:px-2 md:py-1.5 md:mb-1.5'
                  : isPrimarySplitCol
                  ? 'items-center justify-between gap-1 px-1 py-1 mb-1 md:px-2 md:py-1.5 md:mb-1.5'
                  : 'items-center justify-between gap-1.5 px-2 py-1.5 mb-1.5'
              } shrink-0 rounded-xl transition-colors ${
                canReorderCols
                  ? 'cursor-grab active:cursor-grabbing hover:bg-white/70 dark:hover:bg-slate-800/60 select-none'
                  : ''
              } ${isBeingDraggedColumn ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}
            >
              <div className="flex items-start md:items-center gap-1.5 min-w-0 flex-1">
                {canReorderCols && (
                  <GripVertical
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ${
                      isMobileSplitView ? 'hidden md:block' : 'mt-0.5 md:mt-0'
                    }`}
                  />
                )}
                <span
                  className={`${
                    isMobileSplitView ? 'w-2 h-2 mt-1 md:mt-0 md:w-2.5 md:h-2.5' : 'w-2.5 h-2.5 mt-0.5 md:mt-0'
                  } rounded-full shrink-0`}
                  style={{ backgroundColor: col.color }}
                />
                <h3
                  className={`${
                    isSecondarySplitCol
                      ? 'text-[11px] md:text-xs leading-tight break-words md:truncate'
                      : isPrimarySplitCol
                      ? 'text-[11.5px] md:text-xs leading-tight break-words md:truncate'
                      : 'text-xs leading-snug break-words md:truncate'
                  } font-bold text-slate-800 dark:text-slate-200 min-w-0`}
                >
                  {col.title}
                </h3>
                <span
                  className={`${
                    isMobileSplitView
                      ? 'text-[9.5px] md:text-[10px] px-1 md:px-1.5 py-0.5'
                      : 'text-[10px] px-1.5 py-0.5'
                  } font-semibold tabular-nums rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0`}
                >
                  {columnTasks.length}
                </span>
              </div>

              <div
                className={`flex items-center gap-0.5 shrink-0 ${
                  isSecondarySplitCol ? 'justify-end md:justify-normal' : ''
                }`}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {/* Mobile: botão invertido Recolher (100%) / Ampliar (60% / 40%) */}
                {columns.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleMobileColumnMode(col.id)}
                    className={`md:hidden ${
                      isMobileSplitView ? 'p-1' : 'p-1.5'
                    } text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer`}
                    title={
                      isMobileSplitView
                        ? `Recolher e focar "${col.title}" em 100%`
                        : 'Restaurar visão ampla em duas colunas (60% / 40%)'
                    }
                    aria-label={
                      isMobileSplitView
                        ? `Recolher e focar quadro ${col.title} em 100%`
                        : 'Restaurar visão ampla em duas colunas'
                    }
                  >
                    {isMobileSplitView ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {/* Desktop: mantém botão original de Modo Foco em tela cheia */}
                <button
                  type="button"
                  onClick={() => openFocusMode(col.id)}
                  className="hidden md:inline-flex p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={`Ampliar quadro "${col.title}" (Modo Foco)`}
                  aria-label={`Ampliar quadro ${col.title}`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onQuickAddTask(col.id)}
                  className={`${
                    isMobileSplitView ? 'p-1' : 'p-1.5'
                  } md:p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer`}
                  title={`Adicionar cartão em ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {((onUpdateColumn && (isMaster || (currentUserRole !== 'viewer' && currentUserRole !== 'visualizador'))) ||
                  canReorderCols ||
                  onDuplicateColumn ||
                  (canManageCol && (onArchiveColumn || onDeleteColumn))) && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuTaskId(null);
                        setOpenMenuColumnId(isColMenuOpen ? null : col.id);
                      }}
                      className={`${
                        isMobileSplitView ? 'p-1' : 'p-1.5'
                      } md:p-1 rounded-lg transition-colors cursor-pointer ${
                        isColMenuOpen
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                      title={`Opções do quadro ${col.title}`}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isColMenuOpen && (
                      <div
                        className="absolute right-0 top-7 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuColumnId(null);
                              toggleMobileColumnMode(col.id);
                            }}
                            className="md:hidden w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            {isMobileSplitView ? (
                              <>
                                <Minimize2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>Recolher / Focar (100%)</span>
                              </>
                            ) : (
                              <>
                                <Maximize2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>Visão ampla (60% / 40%)</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openFocusMode(col.id)}
                          className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span>Tela cheia (Modo Foco)</span>
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                        {onUpdateColumn &&
                          (isMaster || (currentUserRole !== 'viewer' && currentUserRole !== 'visualizador')) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  setEditingColumn(col);
                                  setEditColumnTitle(col.title);
                                  setEditColumnColor(col.color || '#2563eb');
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>Editar</span>
                              </button>
                              {(canReorderCols || onDuplicateColumn || (canManageCol && (onArchiveColumn || onDeleteColumn))) && (
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                              )}
                            </>
                          )}

                        {canReorderCols && (
                          <>
                            <button
                              type="button"
                              disabled={colIndex <= 0}
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                handleMoveColumnStep(col.id, 'left');
                              }}
                              className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors ${
                                colIndex <= 0
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer'
                              }`}
                            >
                              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                              <span>Mover para esquerda</span>
                            </button>
                            <button
                              type="button"
                              disabled={colIndex === -1 || colIndex >= columns.length - 1}
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                handleMoveColumnStep(col.id, 'right');
                              }}
                              className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors ${
                                colIndex === -1 || colIndex >= columns.length - 1
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer'
                              }`}
                            >
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              <span>Mover para direita</span>
                            </button>
                            {(onDuplicateColumn || (canManageCol && (onArchiveColumn || onDeleteColumn))) && (
                              <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                            )}
                          </>
                        )}

                        {onDuplicateColumn && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                onDuplicateColumn(col.id, false);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>Copiar coluna</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                onDuplicateColumn(col.id, true);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <CopyPlus className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                              <span>Duplicar com todos os cards</span>
                            </button>
                          </>
                        )}

                        {canManageCol && (onArchiveColumn || onDeleteColumn) && (
                          <>
                            {onDuplicateColumn && (
                              <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                            )}

                            {onArchiveColumn && (
                              <button
                                type="button"
                                disabled={columns.length <= 1}
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  onArchiveColumn(col.id);
                                }}
                                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors ${
                                  columns.length <= 1
                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer'
                                }`}
                                title={
                                  columns.length <= 1
                                    ? 'Mantenha pelo menos um quadro ativo no projeto'
                                    : 'Arquivar quadro (direciona para Arquivados do projeto)'
                                }
                              >
                                <Archive className="w-3.5 h-3.5 shrink-0" />
                                <span>Arquivar</span>
                              </button>
                            )}

                            {onDeleteColumn && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  setDeleteConfirmState({
                                    isOpen: true,
                                    type: 'column',
                                    id: col.id,
                                    name: col.title,
                                    message: `Tem certeza que deseja excluir a coluna "${col.title}"? As tarefas desta coluna serão transferidas para outra coluna ou removidas. Esta ação não pode ser desfeita.`,
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-xs text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Cards da Coluna com Rolagem Interna e Reordenação Suave */}
            <div
              onScroll={(e) => {
                try {
                  sessionStorage.setItem(`operatask_col_scroll_${col.id}`, String(e.currentTarget.scrollTop));
                } catch {}
              }}
              ref={(el) => {
                if (el) {
                  try {
                    const savedY = sessionStorage.getItem(`operatask_col_scroll_${col.id}`);
                    if (savedY && !el.dataset.restored) {
                      el.scrollTop = parseFloat(savedY);
                      el.dataset.restored = 'true';
                    }
                  } catch {}
                }
              }}
              className={`${
                isMobileSplitView ? 'space-y-2 px-0.5 md:space-y-2.5 md:px-1' : 'space-y-2.5 px-1'
              } min-h-[120px] flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1 scroll-smooth touch-scroll-y touch-pan-y custom-scrollbar`}
            >
              {columnTasks.map((task, taskIndex) => {
                const priorityInfo = getPriorityInfo(task.priority);
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
                      className={`group bg-white dark:bg-slate-900 rounded-xl ${
                        isSecondarySplitCol
                          ? 'p-1.5 md:p-2.5 border-[1.5px] md:border-[2.5px]'
                          : isPrimarySplitCol
                          ? 'p-2 md:p-2.5 border-2 md:border-[2.5px]'
                          : 'p-3 md:p-2.5 border-[2.5px]'
                      } transition-all duration-200 cursor-pointer relative shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
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
                    <div className={`flex items-center justify-between gap-1 ${isMobileSplitView ? 'mb-1 md:mb-1.5' : 'mb-1.5'}`}>
                      <div className="flex items-center gap-1 flex-wrap min-w-0">
                        {/* Prioridade: formato padronizado com fundo neutro idêntico em todos os cards */}
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isMobileSplitView
                              ? 'text-[8.5px] md:text-[9px] px-1.5 md:px-2 py-0.5'
                              : 'text-[9px] px-2 py-0.5'
                          } font-bold rounded-md whitespace-nowrap ${
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

                        {/* Indicador de Card Concluído / Protegido */}
                        {isCardInDone && (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isMobileSplitView
                                ? 'text-[8.5px] md:text-[9px] px-1.5 md:px-2 py-0.5'
                                : 'text-[9px] px-2 py-0.5'
                            } font-bold rounded-md whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs`}
                            title={
                              isActionBlocked
                                ? 'Card concluído protegido: apenas Dono e Administrador podem mover, arquivar ou excluir'
                                : 'Card concluído'
                            }
                          >
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            <span>Concluído</span>
                          </span>
                        )}

                        {/* Tags: formato padronizado com o mesmo padrão de cor e fundo em todos os cards */}
                        {task.tags &&
                          task.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className={`inline-flex items-center gap-1 ${
                                isMobileSplitView
                                  ? 'text-[8.5px] md:text-[9px] px-1.5 md:px-2 py-0.5'
                                  : 'text-[9px] px-2 py-0.5'
                              } font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs max-w-full`}
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
                                className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{isActionBlocked ? 'Visualizar card' : 'Editar'}</span>
                              </button>

                              {/* Reordenação Rápida no Quadro (1-tap no Mobile e Desktop) */}
                              {!isActionBlocked && (
                                <div className="py-1 my-0.5 border-y border-slate-100 dark:border-slate-750/70">
                                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Ordem no Quadro
                                  </div>
                                  <button
                                    type="button"
                                    disabled={taskIndex === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTaskId(null);
                                      handleMoveTaskStep(task, col.id, 'up');
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    title="Mover card para cima nesta coluna"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ArrowUp className="w-3.5 h-3.5 text-[#34B1AC]" />
                                      <span>Mover para cima</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">↑</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={taskIndex === columnTasks.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuTaskId(null);
                                      handleMoveTaskStep(task, col.id, 'down');
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    title="Mover card para baixo nesta coluna"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ArrowDown className="w-3.5 h-3.5 text-[#34B1AC]" />
                                      <span>Mover para baixo</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">↓</span>
                                  </button>
                                </div>
                              )}

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
                            className={`${
                              isMobileSplitView ? 'hidden md:block' : ''
                            } text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1`}
                            title="Arrastar e reordenar card"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capa de Mídia padronizada (se houver foto anexada) */}
                    {coverImage && (
                      <div className="w-full h-16 md:h-18 rounded-lg overflow-hidden mb-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative group/thumb">
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

                    {/* Título da Tarefa: sempre íntegro e legível (sem truncamento) */}
                    <div className={`flex items-start ${isMobileSplitView ? 'gap-1.5 md:gap-2 mb-1 md:mb-1.5' : 'gap-2 mb-1.5'}`}>
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
                          <CheckCircle2
                            className={`${
                              isMobileSplitView ? 'w-3.5 h-3.5 md:w-4 md:h-4' : 'w-4 h-4'
                            } text-emerald-500 fill-emerald-500/20`}
                          />
                        ) : (
                          <Circle
                            className={`${
                              isMobileSplitView ? 'w-3.5 h-3.5 md:w-4 md:h-4' : 'w-4 h-4'
                            } hover:fill-zinc-100 dark:hover:fill-zinc-800`}
                          />
                        )}
                      </button>

                      <h4
                        className={`${
                          isSecondarySplitCol
                            ? 'text-[11px] md:text-sm leading-tight md:leading-snug'
                            : isPrimarySplitCol
                            ? 'text-[11.5px] md:text-sm leading-snug'
                            : 'text-[13px] md:text-sm leading-snug'
                        } font-bold tracking-tight break-words min-w-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                          task.isCompleted
                            ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal'
                            : 'text-zinc-950 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>

                    {/* Descrição secundária: único elemento com truncamento limpo em 1 linha */}
                    {task.description && (
                      <p
                        className={`${
                          isSecondarySplitCol
                            ? 'text-[9.5px] md:text-[11px] pl-0 md:pl-6 mb-1 md:mb-1.5'
                            : isPrimarySplitCol
                            ? 'text-[10px] md:text-[11px] pl-0 md:pl-6 mb-1.5'
                            : 'text-[11px] pl-6 mb-1.5'
                        } text-zinc-600 dark:text-zinc-300 leading-normal line-clamp-1 overflow-hidden text-ellipsis font-normal`}
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Ficha Técnica: quadro interno de destaque com ação de Produzir */}
                    {task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole) && (
                      <div className={`${isMobileSplitView ? 'mb-1.5 md:mb-2 pl-0 md:pl-6' : 'mb-2 pl-6'}`}>
                        <div className={`${isMobileSplitView ? 'p-1.5 md:p-2' : 'p-2'} rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-850`}>
                          <div className={`flex items-center justify-between gap-1 ${isMobileSplitView ? 'text-[9px] md:text-[10px]' : 'text-[10px]'} text-teal-800 dark:text-teal-200 font-semibold mb-1`}>
                            <span className="flex items-center gap-1 min-w-0">
                              <FileSpreadsheet className="w-3 h-3 md:w-3.5 md:h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="truncate font-bold">{task.fichaTecnica.nomeItem}</span>
                            </span>
                            <span className="text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-teal-600 text-white shrink-0 whitespace-nowrap">
                              {task.fichaTecnica.ingredientes?.length || 0} ing.
                            </span>
                          </div>
                          {task.fichaTecnica.ingredientes && task.fichaTecnica.ingredientes.length > 0 && (
                            <div className="text-[9px] text-teal-700/80 dark:text-teal-300/80 truncate mb-1">
                              {task.fichaTecnica.ingredientes.slice(0, 2).map((ing) => `${ing.nome} (${ing.quantidade}${ing.unidade})`).join(' • ')}
                              {task.fichaTecnica.ingredientes.length > 2 && ' ...'}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between pt-1 border-t border-teal-200/50 dark:border-teal-900/40 text-[9px] gap-1">
                            <span className="text-teal-800 dark:text-teal-200 font-semibold truncate">
                              {task.productionRecords && task.productionRecords.length > 0
                                ? `Produzido: ${String(task.productionRecords[0].quantidadeDesejada).replace('.', ',')} ${task.productionRecords[0].unidadeProducao}${
                                    task.productionRecords.length > 1
                                      ? ` (+${task.productionRecords.length - 1})`
                                      : ''
                                  }`
                                : 'Ficha pronta'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-teal-800 dark:text-teal-200 hover:text-teal-600 shrink-0 whitespace-nowrap">
                              <Factory className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              <span>Produzir</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Checklist: barra e contador sempre legíveis sem corte em 360px-430px */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div className={`${isMobileSplitView ? 'mb-1.5 md:mb-2 pl-0 md:pl-6' : 'mb-2 pl-6'}`}>
                        <div
                          className={`${
                            isMobileSplitView ? 'p-1.5 md:p-2' : 'p-2'
                          } rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700`}
                        >
                          <div
                            className={`flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5 ${
                              isSecondarySplitCol
                                ? 'text-[8.5px] md:text-[10px] mb-1 md:mb-1.5'
                                : isPrimarySplitCol
                                ? 'text-[9.5px] md:text-[10px] mb-1 md:mb-1.5'
                                : 'text-[10px] mb-1.5'
                            } text-zinc-700 dark:text-zinc-200 font-semibold`}
                          >
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <CheckSquare
                                className={`${
                                  isSecondarySplitCol
                                    ? 'w-2.5 h-2.5 md:w-3.5 md:h-3.5'
                                    : isPrimarySplitCol
                                    ? 'w-3 h-3 md:w-3.5 md:h-3.5'
                                    : 'w-3.5 h-3.5'
                                } text-zinc-500 dark:text-zinc-400 shrink-0`}
                              />
                              <span className="tabular-nums">Checklist {checklistInfo.completed}/{checklistInfo.total}</span>
                            </span>
                            <span
                              className={`${
                                isSecondarySplitCol
                                  ? 'text-[8.5px] md:text-[10px]'
                                  : isPrimarySplitCol
                                  ? 'text-[9.5px] md:text-[10px]'
                                  : 'text-[10px]'
                              } font-extrabold tabular-nums text-zinc-900 dark:text-zinc-100 whitespace-nowrap`}
                            >
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

                    {/* Rodapé do Card: Data, contadores e responsável com quebra segura sem sobreposição */}
                    <div
                      className={`flex flex-wrap items-center justify-between ${
                        isMobileSplitView
                          ? 'gap-x-1 gap-y-1 pt-1.5 md:gap-1.5 md:pt-2'
                          : 'gap-1.5 pt-2'
                      } border-t border-zinc-200/80 dark:border-zinc-800 text-[10px]`}
                    >
                      {/* Metadados: Data + Comentários + Anexos em badges com mesmo formato */}
                      <div className="flex items-center gap-1 md:gap-1.5 flex-wrap min-w-0">
                        {/* Data e Horário em badge padronizado */}
                        <div
                          className={`inline-flex items-center gap-1 ${
                            isSecondarySplitCol
                              ? 'px-1 py-0.5 text-[8.5px] md:px-1.5 md:text-[10px]'
                              : isPrimarySplitCol
                              ? 'px-1.5 py-0.5 text-[9px] md:text-[10px]'
                              : 'px-1.5 py-0.5 text-[10px]'
                          } rounded-md border font-semibold whitespace-nowrap transition-colors ${
                            !dueInfo.hasDate && !dueInfo.hasTime
                              ? 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-zinc-200/80 dark:border-zinc-700/60'
                              : dueInfo.isOverdue
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                              : dueInfo.isToday
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80'
                          }`}
                          title={dueInfo.fullText}
                        >
                          <Calendar
                            className={`${
                              isMobileSplitView ? 'w-2.5 h-2.5 md:w-3 md:h-3' : 'w-3 h-3'
                            } shrink-0 ${
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

                        {/* Contador de Comentários em badge padronizado */}
                        {task.comments && task.comments.length > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 ${
                              isMobileSplitView ? 'px-1 py-0.5 text-[8.5px] md:px-1.5 md:text-[10px]' : 'px-1.5 py-0.5 text-[10px]'
                            } rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 font-semibold whitespace-nowrap`}
                            title="Comentários"
                          >
                            <MessageSquare className={`${isMobileSplitView ? 'w-2.5 h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-zinc-500 dark:text-zinc-400`} />
                            <span>{task.comments.length}</span>
                          </div>
                        )}

                        {/* Contador de Anexos em badge padronizado */}
                        {task.attachments && task.attachments.length > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 ${
                              isMobileSplitView ? 'px-1 py-0.5 text-[8.5px] md:px-1.5 md:text-[10px]' : 'px-1.5 py-0.5 text-[10px]'
                            } rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 font-semibold whitespace-nowrap`}
                            title="Anexos de mídia"
                          >
                            <Paperclip className={`${isMobileSplitView ? 'w-2.5 h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-zinc-500 dark:text-zinc-400`} />
                            <span>{task.attachments.length}</span>
                          </div>
                        )}

                        {/* Ficha Técnica em badge padronizado (visível apenas para Produção, Admin e Dono) */}
                        {task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole) && (
                          <div
                            className={`inline-flex items-center gap-1 ${
                              isMobileSplitView ? 'px-1 py-0.5 text-[8.5px] md:px-1.5 md:text-[10px]' : 'px-1.5 py-0.5 text-[10px]'
                            } rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70 font-semibold max-w-full`}
                            title={`Ficha Técnica: ${task.fichaTecnica.nomeItem} (${task.fichaTecnica.ingredientes?.length || 0} ingredientes)`}
                          >
                            <FileSpreadsheet className={`${isMobileSplitView ? 'w-2.5 h-2.5 md:w-3 md:h-3' : 'w-3 h-3'} text-teal-600 dark:text-teal-400 shrink-0`} />
                            <span className="truncate max-w-[56px] md:max-w-[85px]">{task.fichaTecnica.nomeItem}</span>
                          </div>
                        )}
                      </div>

                      {/* Stack de Avatares dos Responsáveis com Foto de Perfil */}
                      <div className="flex items-center -space-x-1.5 shrink-0 ml-auto">
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
                          <span
                            className={`${
                              isSecondarySplitCol
                                ? 'text-[8.5px] md:text-[10px]'
                                : isPrimarySplitCol
                                ? 'text-[9px] md:text-[10px]'
                                : 'text-[10px]'
                            } text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap`}
                          >
                            Sem resp.
                          </span>
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
                <div className="h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center px-2 text-[11px] md:text-xs text-slate-400 dark:text-slate-500 gap-1.5">
                  <Clock className="w-4 h-4 opacity-40" />
                  <span>Nenhum card aqui</span>
                </div>
              )}
            </div>

            {/* Adição Rápida: Fixa no rodapé da coluna e sempre legível em 60% / 40% */}
            <button
              type="button"
              onClick={() => onQuickAddTask(col.id)}
              className={`shrink-0 mt-1.5 md:mt-2 ${
                isSecondarySplitCol
                  ? 'py-2 px-1.5 min-h-[38px] text-[10px] gap-1 md:py-2 md:px-3 md:min-h-0 md:text-xs md:gap-1.5'
                  : isPrimarySplitCol
                  ? 'py-2 px-2 min-h-[38px] text-[11px] gap-1 md:py-2 md:px-3 md:min-h-0 md:text-xs md:gap-1.5'
                  : 'py-2.5 md:py-2 px-3 min-h-[42px] md:min-h-0 text-xs gap-1.5'
              } font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white/75 md:bg-transparent dark:bg-slate-800/60 md:dark:bg-transparent hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200/70 md:border-transparent dark:border-slate-700/60 md:dark:border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-[0.99]`}
            >
              <Plus
                className={`${
                  isSecondarySplitCol
                    ? 'w-3 h-3 md:w-3.5 md:h-3.5'
                    : isPrimarySplitCol
                    ? 'w-3.5 h-3.5'
                    : 'w-4 h-4 md:w-3.5 md:h-3.5'
                } shrink-0`}
              />
              <span>Adicionar cartão</span>
            </button>
          </div>
        );
      })}
      </div>

      {/* Indicadores de Posição Horizontal entre Quadros (Mobile) */}
      {displayedColumns.length > 1 && (
        <div
          className="flex md:hidden items-center justify-center gap-1 pt-1.5 pb-0.5 shrink-0"
          role="tablist"
          aria-label="Navegação entre quadros"
        >
          {displayedColumns.map((col, idx) => {
            const isActive = idx === activeBoardColIndex;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir para quadro ${col.title}`}
                onClick={() => scrollToBoardColumn(idx)}
                className="p-1.5 flex items-center justify-center cursor-pointer"
              >
                <span
                  className={`block rounded-full transition-all duration-200 ${
                    isActive
                      ? 'w-5 h-2 bg-blue-600 dark:bg-blue-400'
                      : 'w-2 h-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* MODO DE VISÃO AMPLIFICADA / FOCO DO QUADRO (Tela Cheia Mobile, Tablet e Desktop) */}
      {focusedColumnId && activeFocusedCol && (
        <div
          className="fixed inset-0 z-[45] flex flex-col h-app-dvh w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label={`Visão ampliada do quadro ${activeFocusedCol.title}`}
        >
          {/* Barra Superior do Modo Foco */}
          <header className="shrink-0 flex items-center justify-between gap-2.5 px-3 sm:px-5 pt-[max(0.7rem,env(safe-area-inset-top))] pb-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFocusedColumnId(null)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition-colors active:scale-95 cursor-pointer"
              title="Fechar visão ampliada"
              aria-label="Fechar visão ampliada"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
                {project.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {workspaceName ? `${workspaceName} · ` : ''}
                {activeFocusedCol.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFocusedColumnId(null)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 shadow-xs shrink-0 active:scale-95 transition-all cursor-pointer"
              title="Voltar para visão padrão"
              aria-label="Voltar para visão padrão"
            >
              <Minimize2 className="w-4 h-4 shrink-0" />
            </button>
          </header>

          {/* Carrossel Horizontal em Altura Máxima */}
          <div
            ref={focusScrollRef}
            onScroll={handleFocusScroll}
            className="flex-1 min-h-0 flex gap-3 overflow-x-auto overflow-y-hidden px-3 py-2.5 sm:py-4 snap-x snap-mandatory scroll-smooth scrollbar-none items-stretch"
          >
            {columns.map((col) => {
              const colTasks = tasks
                .filter((t) => t.columnId === col.id)
                .sort((a, b) => {
                  const orderA = typeof a.order === 'number' ? a.order : 0;
                  const orderB = typeof b.order === 'number' ? b.order : 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.createdAt.localeCompare(b.createdAt);
                });
              const isOverview = focusZoomMode === 'overview';
              const canEditCol = Boolean(
                onUpdateColumn &&
                  (isMaster || (currentUserRole !== 'viewer' && currentUserRole !== 'visualizador'))
              );

              return (
                <section
                  key={col.id}
                  ref={(el) => {
                    if (el) {
                      focusColumnRefs.current.set(col.id, el as HTMLDivElement);
                    } else {
                      focusColumnRefs.current.delete(col.id);
                    }
                  }}
                  className={`${
                    isOverview
                      ? 'w-[68vw] sm:w-[330px] snap-start'
                      : 'w-[calc(100vw-1.5rem)] sm:w-[min(560px,calc(100vw-3rem))] snap-center'
                  } shrink-0 h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg overflow-hidden transition-[width] duration-200`}
                >
                  {/* Faixa de cor do quadro */}
                  <div
                    className="h-1.5 w-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />

                  {/* Cabeçalho do Quadro Focado */}
                  <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <h3
                        className={`${
                          isOverview ? 'text-xs' : 'text-sm sm:text-base'
                        } font-bold text-slate-900 dark:text-white truncate`}
                      >
                        {col.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {colTasks.length}
                      </span>

                      {canEditCol && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumn(col);
                            setEditColumnTitle(col.title);
                            setEditColumnColor(col.color || '#2563eb');
                          }}
                          className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          title={`Editar quadro ${col.title}`}
                          aria-label={`Editar quadro ${col.title}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista Vertical Independente de Cartões com Foco em Legibilidade e Checklists */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-2.5 space-y-2 touch-scroll-y touch-pan-y custom-scrollbar">
                    {colTasks.length === 0 ? (
                      <div className="h-36 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 gap-1.5">
                        <Clock className="w-5 h-5 opacity-40" />
                        <span>Nenhum cartão neste quadro</span>
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const checklistInfo = calculateChecklistProgress(task.checklist);
                        const dueInfo = formatDueDatePTBR(task.dueDate);
                        const isCardInDone = isTaskInDoneColumn(task, columns);
                        const isActionBlocked =
                          isCardInDone && !canModifyCompletedTask(currentUserRole, isMaster);
                        const hasChecklist = Boolean(task.checklist && task.checklist.length > 0);
                        const hasMetaRow =
                          Boolean(task.description) ||
                          hasChecklist ||
                          dueInfo.hasDate ||
                          dueInfo.hasTime ||
                          Boolean(task.comments && task.comments.length > 0) ||
                          Boolean(task.attachments && task.attachments.length > 0) ||
                          Boolean(task.fichaTecnica && canAccessFichaTecnicaAndProduction(currentUserRole));

                        return (
                          <div
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            className={`rounded-xl bg-slate-50 dark:bg-slate-800/85 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/75 transition-all active:scale-[0.99] cursor-pointer ${
                              isOverview ? 'px-2.5 py-2' : 'px-3 py-2.5 min-h-[56px]'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                disabled={isActionBlocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isActionBlocked) return;
                                  onToggleTaskComplete(task.id);
                                }}
                                className={`-ml-1 -mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                  isActionBlocked
                                    ? 'cursor-not-allowed opacity-80'
                                    : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer'
                                }`}
                                title={
                                  isActionBlocked
                                    ? 'Card concluído protegido'
                                    : task.isCompleted
                                    ? 'Desmarcar como concluída'
                                    : 'Marcar como concluída'
                                }
                              >
                                {task.isCompleted || isCardInDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              <div className="min-w-0 flex-1 pt-0.5">
                                <h4
                                  className={`${
                                    isOverview ? 'text-xs' : 'text-[14px] sm:text-[15px]'
                                  } font-semibold leading-snug break-words ${
                                    task.isCompleted
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {hasMetaRow && (
                                  <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {task.description && (
                                      <span
                                        className="inline-flex items-center"
                                        title="Este cartão possui descrição"
                                      >
                                        <AlignLeft className="w-3.5 h-3.5 opacity-80" />
                                      </span>
                                    )}

                                    {hasChecklist && (
                                      <span
                                        className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                                          checklistInfo.percentage === 100
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-600 dark:text-slate-300'
                                        }`}
                                        title={`Checklist: ${checklistInfo.completed} de ${checklistInfo.total} concluídos`}
                                      >
                                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                          {checklistInfo.completed}/{checklistInfo.total}
                                        </span>
                                      </span>
                                    )}

                                    {(dueInfo.hasDate || dueInfo.hasTime) && (
                                      <span
                                        className={`inline-flex items-center gap-1 font-medium ${
                                          dueInfo.isOverdue
                                            ? 'text-red-600 dark:text-red-400 font-semibold'
                                            : dueInfo.isToday
                                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                            : ''
                                        }`}
                                      >
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        <span>{dueInfo.text}</span>
                                      </span>
                                    )}

                                    {task.fichaTecnica &&
                                      canAccessFichaTecnicaAndProduction(currentUserRole) && (
                                        <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-medium truncate max-w-[140px]">
                                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                                          <span className="truncate">{task.fichaTecnica.nomeItem}</span>
                                        </span>
                                      )}

                                    {task.comments && task.comments.length > 0 && (
                                      <span className="inline-flex items-center gap-1 tabular-nums">
                                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                        <span>{task.comments.length}</span>
                                      </span>
                                    )}

                                    {task.attachments && task.attachments.length > 0 && (
                                      <span className="inline-flex items-center gap-1 tabular-nums">
                                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                        <span>{task.attachments.length}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Botão + Adicionar cartão fixo no rodapé do quadro focado */}
                  <div className="shrink-0 px-2.5 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => onQuickAddTask(col.id)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors active:scale-[0.99] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Adicionar cartão</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                        {colTasks.length} {colTasks.length === 1 ? 'card' : 'cards'}
                      </span>
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Barra Inferior do Modo Foco: Indicadores de Posição + Navegação + Alternar Zoom */}
          <footer className="shrink-0 px-3 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800">
            {columns.length > 1 && (
              <div
                className="flex items-center justify-center gap-1 mb-2"
                role="tablist"
                aria-label="Posição dos quadros no modo foco"
              >
                {columns.map((col) => {
                  const isActive = col.id === activeFocusedCol.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Ir para quadro ${col.title}`}
                      onClick={() => scrollToFocusColumn(col.id)}
                      className="p-1.5 flex items-center justify-center cursor-pointer"
                    >
                      <span
                        className={`block rounded-full transition-all duration-200 ${
                          isActive
                            ? 'w-5 h-2 bg-blue-600 dark:bg-blue-400'
                            : 'w-2 h-2 bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
              {/* Navegação Anterior / Próximo Quadro */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  disabled={focusedColIndex <= 0}
                  onClick={() => {
                    const prevCol = columns[focusedColIndex - 1];
                    if (prevCol) scrollToFocusColumn(prevCol.id);
                  }}
                  className="w-10 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Quadro anterior"
                  aria-label="Quadro anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {focusedColIndex + 1} / {columns.length}
                </span>
                <button
                  type="button"
                  disabled={focusedColIndex >= columns.length - 1}
                  onClick={() => {
                    const nextCol = columns[focusedColIndex + 1];
                    if (nextCol) scrollToFocusColumn(nextCol.id);
                  }}
                  className="w-10 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Próximo quadro"
                  aria-label="Próximo quadro"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Alternar entre Visão Ampliada (1 quadro grande) e Visão Compacta (quadros lado a lado) */}
              <button
                type="button"
                onClick={() =>
                  setFocusZoomMode((prev) => (prev === 'amplified' ? 'overview' : 'amplified'))
                }
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors active:scale-95 cursor-pointer"
                title={
                  focusZoomMode === 'amplified'
                    ? 'Alternar para visão compacta lado a lado'
                    : 'Alternar para quadro em foco'
                }
                aria-label={
                  focusZoomMode === 'amplified'
                    ? 'Alternar para visão compacta lado a lado'
                    : 'Alternar para quadro em foco'
                }
              >
                {focusZoomMode === 'amplified' ? (
                  <Minimize2 className="w-4 h-4 shrink-0" />
                ) : (
                  <Maximize2 className="w-4 h-4 shrink-0" />
                )}
              </button>
            </div>
          </footer>
        </div>
      )}

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
              : deleteConfirmState.type === 'column' && onArchiveColumn && columns.length > 1
              ? () => {
                  onArchiveColumn(deleteConfirmState.id);
                  setDeleteConfirmState(null);
                }
              : undefined
          }
          archiveButtonText={deleteConfirmState.type === 'task' ? 'Arquivar card' : 'Arquivar coluna'}
        />
      )}

      {/* Modal: Editar Nomenclatura e Cor do Quadro (Coluna) */}
      {editingColumn && onUpdateColumn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingColumn(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: editColumnColor }}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    Editar Quadro
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Altere a nomenclatura e a cor de identificação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingColumn(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = editColumnTitle.trim();
                if (!trimmed) return;
                onUpdateColumn(editingColumn.id, {
                  title: trimmed,
                  color: editColumnColor,
                });
                setEditingColumn(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Nomenclatura do Quadro *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingColumn(null);
                    }
                  }}
                  placeholder="Ex: Em Produção, Revisão, Concluído..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <ColorPicker
                  label="Cor do Quadro"
                  description="Faixa superior e marcador do quadro"
                  value={editColumnColor}
                  onChange={(newColor) => setEditColumnColor(newColor)}
                  size="md"
                  showPaletteStrip={true}
                  quickPaletteCount={6}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingColumn(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editColumnTitle.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prévia flutuante ao segurar e arrastar o topo de um quadro no celular/touch */}
      {touchDragGhost && (
        <div
          className="fixed z-50 pointer-events-none flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 border-2 border-blue-500 shadow-2xl backdrop-blur-xs"
          style={{
            left: Math.max(12, Math.min(window.innerWidth - 220, touchDragGhost.x - 100)),
            top: Math.max(12, Math.min(window.innerHeight - 60, touchDragGhost.y - 30)),
            maxWidth: '220px',
          }}
        >
          <GripVertical className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: touchDragGhost.color }}
          />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {touchDragGhost.title}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            {touchDragGhost.count}
          </span>
        </div>
      )}
    </div>
  );
};
