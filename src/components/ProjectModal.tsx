import React, { useState, useEffect } from 'react';
import { Project, BoardColumn, User, WorkspaceRole, Workspace } from '../types/index.ts';
import { X, Trash2, Plus, Columns, Check, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import { AVAILABLE_ICONS, COLOR_PALETTE, getInitials, canDeleteProject, canDeleteColumn, ROLE_CONFIG } from '../utils/helpers.ts';
import { ProjectIcon } from './ProjectIcon.tsx';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { ColorPicker } from './ColorPicker.tsx';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  workspaceId: string;
  workspaceMembers: User[];
  currentWorkspace?: Workspace;
  currentUserRole?: WorkspaceRole;
  onSaveProject: (projectData: Partial<Project> & { id?: string }) => void;
  onDeleteProject?: (projectId: string) => void;
  onArchiveProject?: (projectId: string, isArchived: boolean) => void;
  taskCount?: number;
}

const DEFAULT_NEW_COLUMNS: BoardColumn[] = [
  { id: 'col-1', title: 'Backlog', color: '#64748b', order: 0 },
  { id: 'col-2', title: 'Em Andamento', color: '#2563eb', order: 1 },
  { id: 'col-3', title: 'Revisão', color: '#d97706', order: 2 },
  { id: 'col-4', title: 'Concluído', color: '#059669', order: 3, isCompletedColumn: true },
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  workspaceId,
  workspaceMembers,
  currentWorkspace,
  currentUserRole = 'admin',
  onSaveProject,
  onDeleteProject,
  onArchiveProject,
  taskCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'columns' | 'members'>('info');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState<string>('code');
  const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_NEW_COLUMNS);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [columnAlert, setColumnAlert] = useState<string | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'project' | 'column';
    id: string;
    name?: string;
    message?: string;
  } | null>(null);

  // Criação rápida de coluna
  const [newColTitle, setNewColTitle] = useState('');
  const [newColColor, setNewColColor] = useState(COLOR_PALETTE[1]);

  useEffect(() => {
    if (!isOpen) return;
    if (projectToEdit) {
      setName(projectToEdit.name);
      setDescription(projectToEdit.description || '');
      setColor(projectToEdit.color);
      setIcon(projectToEdit.icon);
      setColumns(projectToEdit.columns || DEFAULT_NEW_COLUMNS);
      setSelectedMemberIds(projectToEdit.memberIds || workspaceMembers.map((m) => m.id));
    } else {
      setName('');
      setDescription('');
      setColor(COLOR_PALETTE[0]);
      setIcon('code');
      setColumns(DEFAULT_NEW_COLUMNS);
      setSelectedMemberIds(workspaceMembers.map((m) => m.id));
    }
    setActiveTab('info');
  }, [projectToEdit, isOpen, workspaceMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProject({
      ...(projectToEdit ? { id: projectToEdit.id } : {}),
      workspaceId,
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      columns,
      memberIds: selectedMemberIds,
    });
    onClose();
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newCol: BoardColumn = {
      id: `col-${Date.now()}`,
      title: newColTitle.trim(),
      color: newColColor,
      order: columns.length,
    };
    setColumns((prev) => [...prev, newCol]);
    setNewColTitle('');
  };

  const handleRequestRemoveColumn = (colId: string, colTitle: string) => {
    if (columns.length <= 1) {
      setColumnAlert('O projeto precisa manter pelo menos uma coluna no quadro.');
      setTimeout(() => setColumnAlert(null), 4000);
      return;
    }
    setDeleteConfirmState({
      isOpen: true,
      type: 'column',
      id: colId,
      name: colTitle,
      message: `Tem certeza que deseja excluir a coluna "${colTitle}" deste projeto?`,
    });
  };

  const handleToggleCompletedColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        isCompletedColumn: c.id === colId ? !c.isCompletedColumn : false,
      }))
    );
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <ProjectIcon iconName={icon} className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {projectToEdit ? 'Editar Projeto & Quadro' : 'Novo Projeto'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-4 px-6 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Informações Básicas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'columns'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Colunas dos Quadros ({columns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Equipe do Projeto ({selectedMemberIds.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Plataforma SaaS, Design System, Marketing..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos, escopo e metas do projeto..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cor do Projeto com Pincel e Paleta Expandida */}
              <div>
                <ColorPicker
                  label="Cor do Projeto & Quadro"
                  description="Destaque nos quadros e listas"
                  value={color}
                  onChange={(newColor) => setColor(newColor)}
                  size="md"
                  showPaletteStrip={true}
                  quickPaletteCount={6}
                />
              </div>


              {/* Ícone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Ícone Representativo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map((iconKey) => {
                    const isSelected = icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setIcon(iconKey)}
                        className={`flex items-center justify-center p-2.5 rounded-xl border text-sm transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ProjectIcon iconName={iconKey} className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arquivar Projeto */}
              {projectToEdit && onArchiveProject && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Status: {projectToEdit.isArchived ? 'Arquivado' : 'Ativo'}
                  </div>
                  <button
                    type="button"
                    onClick={() => onArchiveProject(projectToEdit.id, !projectToEdit.isArchived)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {projectToEdit.isArchived ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Desarquivar Projeto
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        Arquivar Projeto
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'columns' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Personalize as colunas do fluxo de trabalho (Quadros) deste projeto. Você pode adicionar, renomear e marcar a coluna de conclusão.
              </p>

              {/* Lista de Colunas Atuais */}
              <div className="space-y-2">
                {columns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                      <ColorPicker
                        value={col.color}
                        onChange={(newColor) => {
                          setColumns((prev) =>
                            prev.map((c) => (c.id === col.id ? { ...c, color: newColor } : c))
                          );
                        }}
                        size="sm"
                        showPaletteStrip={false}
                      />
                      <input
                        type="text"
                        value={col.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumns((prev) =>
                            prev.map((c) => (c.id === col.id ? { ...c, title: val } : c))
                          );
                        }}
                        className="text-xs font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden px-1 flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCompletedColumn(col.id)}
                        className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                          col.isCompletedColumn
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700'
                        }`}
                        title="Tarefas nesta coluna são consideradas concluídas"
                      >
                        {col.isCompletedColumn ? '✓ Conclusão' : 'Marcar Conclusão'}
                      </button>

                      {canDeleteColumn(currentUserRole) && (
                        <button
                          type="button"
                          onClick={() => handleRequestRemoveColumn(col.id, col.title)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Excluir coluna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {columnAlert && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{columnAlert}</span>
                </div>
              )}

              {/* Adicionar Nova Coluna */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Adicionar Nova Coluna
                </label>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    placeholder="Nome da coluna (ex: Testes, QA, Ideias)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-w-[140px]"
                  />
                  <ColorPicker
                    value={newColColor}
                    onChange={(newColor) => setNewColColor(newColor)}
                    size="sm"
                    showPaletteStrip={true}
                    quickPaletteCount={4}
                  />
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Selecione os membros do workspace que têm acesso e colaboram neste projeto:
              </p>
              <div className="space-y-2">
                {workspaceMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  const memberRole = currentWorkspace?.members.find((m) => m.userId === member.id)?.role || 'member';
                  const roleInfo = ROLE_CONFIG[memberRole] || ROLE_CONFIG.member;

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {member.name}
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${roleInfo.badgeClass}`}
                            >
                              {roleInfo.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {member.email} {member.title ? `· ${member.title}` : ''}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {projectToEdit && onDeleteProject && canDeleteProject(currentUserRole) ? (
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmState({
                    isOpen: true,
                    type: 'project',
                    id: projectToEdit.id,
                    name: projectToEdit.name,
                    message: `Deseja realmente excluir permanentemente o projeto "${projectToEdit.name}"? ${
                      taskCount > 0 ? `Ele possui ${taskCount} tarefas associadas.` : ''
                    } Esta ação não pode ser desfeita.`,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                title="Excluir projeto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Projeto</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                {projectToEdit ? 'Salvar Projeto' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação Padronizado */}
      {deleteConfirmState?.isOpen && (
        <ConfirmDeleteModal
          isOpen={deleteConfirmState.isOpen}
          onClose={() => setDeleteConfirmState(null)}
          onConfirm={() => {
            if (!deleteConfirmState) return;
            if (deleteConfirmState.type === 'project') {
              onDeleteProject?.(deleteConfirmState.id);
              onClose();
            } else if (deleteConfirmState.type === 'column') {
              setColumns((prev) => prev.filter((c) => c.id !== deleteConfirmState.id));
            }
            setDeleteConfirmState(null);
          }}
          title={deleteConfirmState.type === 'project' ? 'Excluir Projeto?' : 'Excluir Coluna?'}
          itemName={deleteConfirmState.name}
          itemType={deleteConfirmState.type === 'project' ? 'este projeto' : 'esta coluna'}
          message={deleteConfirmState.message}
          onArchiveInstead={
            deleteConfirmState.type === 'project' && onArchiveProject && projectToEdit
              ? () => {
                  onArchiveProject(projectToEdit.id, true);
                  onClose();
                }
              : undefined
          }
          archiveButtonText="Arquivar Projeto"
        />
      )}
    </div>
  );
};
