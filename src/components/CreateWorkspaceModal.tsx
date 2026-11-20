import React, { useState, useEffect, useMemo } from 'react';
import { X, Building, AlertCircle, Loader2, Users, Search, Check } from 'lucide-react';
import { COLOR_PALETTE, getInitials } from '../utils/helpers.ts';
import { User, WorkspaceRole } from '../types/index.ts';
import { ColorPicker } from './ColorPicker.tsx';

export interface WorkspaceMemberAssignment {
  userId: string;
  role: WorkspaceRole;
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsers?: User[];
  currentUserId?: string;
  onCreate: (
    name: string,
    description: string,
    color: string,
    initialMembers?: WorkspaceMemberAssignment[]
  ) => Promise<boolean | void> | void;
}

const normalizeAssignableRole = (role?: string): WorkspaceRole => {
  if (role === 'admin' || role === 'administrador') return 'admin';
  if (role === 'production' || role === 'producao') return 'production';
  if (role === 'viewer' || role === 'visualizador') return 'viewer';
  return 'member';
};

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  availableUsers = [],
  currentUserId,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inscrição de usuários cadastrados já na criação do workspace
  const [userSearch, setUserSearch] = useState('');
  const [selectedRolesByUser, setSelectedRolesByUser] = useState<Record<string, WorkspaceRole>>({});
  const [defaultBatchRole, setDefaultBatchRole] = useState<WorkspaceRole>('member');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setColor(COLOR_PALETTE[0]);
      setIsSubmitting(false);
      setErrorMessage(null);
      setUserSearch('');
      setSelectedRolesByUser({});
      setDefaultBatchRole('member');
    }
  }, [isOpen]);

  const selectableUsers = useMemo(() => {
    return availableUsers.filter((u) => u && u.id && u.id !== currentUserId);
  }, [availableUsers, currentUserId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q)
    );
  }, [selectableUsers, userSearch]);

  const selectedCount = Object.keys(selectedRolesByUser).length;

  const toggleUserSelection = (user: User) => {
    setSelectedRolesByUser((prev) => {
      const next = { ...prev };
      if (next[user.id]) {
        delete next[user.id];
      } else {
        next[user.id] = user.tipo ? normalizeAssignableRole(user.tipo) : defaultBatchRole;
      }
      return next;
    });
  };

  const handleToggleAllVisible = () => {
    const allVisibleSelected =
      filteredUsers.length > 0 && filteredUsers.every((u) => Boolean(selectedRolesByUser[u.id]));
    setSelectedRolesByUser((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        filteredUsers.forEach((u) => {
          delete next[u.id];
        });
      } else {
        filteredUsers.forEach((u) => {
          if (!next[u.id]) {
            next[u.id] = u.tipo ? normalizeAssignableRole(u.tipo) : defaultBatchRole;
          }
        });
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Por favor, informe o nome do Workspace.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const initialMembers: WorkspaceMemberAssignment[] = Object.entries(selectedRolesByUser).map(
        ([userId, role]) => ({ userId, role })
      );
      await onCreate(cleanName, description.trim(), color, initialMembers);
      setName('');
      setDescription('');
      setSelectedRolesByUser({});
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Erro ao criar o Workspace. Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Criar Novo Workspace
              </h2>
              <p className="text-xs text-slate-500">
                Espaço compartilhado para sua equipe ou empresa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nome da Equipe ou Empresa *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Engenharia Web, Startup Alpha, Design Ops..."
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
              placeholder="Ex: Projetos corporativos e desenvolvimento de novos produtos"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <ColorPicker
              label="Cor de Identidade do Workspace"
              description="Destaque nos quadros e membros"
              value={color}
              onChange={(newColor) => setColor(newColor)}
              size="md"
              showPaletteStrip={true}
              quickPaletteCount={5}
            />
          </div>

          {/* Seção: Inscrever Usuários Cadastrados no Banco de Dados */}
          {selectableUsers.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#34B1AC]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Inscrever Usuários Cadastrados
                  </span>
                  {selectedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300">
                      {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleAllVisible}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {filteredUsers.length > 0 &&
                  filteredUsers.every((u) => Boolean(selectedRolesByUser[u.id]))
                    ? 'Limpar seleção'
                    : 'Selecionar todos'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione usuários do banco de dados para já entrarem atribuídos a este novo workspace (opcional).
              </p>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuário cadastrado..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>
                <select
                  value={defaultBatchRole}
                  onChange={(e) => setDefaultBatchRole(e.target.value as WorkspaceRole)}
                  title="Papel padrão ao selecionar novos usuários"
                  className="text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                >
                  <option value="production">Padrão: Produção</option>
                  <option value="member">Padrão: Membro</option>
                  <option value="admin">Padrão: Admin</option>
                  <option value="viewer">Padrão: Visualizador</option>
                </select>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Nenhum usuário encontrado para "{userSearch}".
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = Boolean(selectedRolesByUser[u.id]);
                    const assignedRole = selectedRolesByUser[u.id] || defaultBatchRole;
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-[#34B1AC] bg-teal-50/50 dark:bg-teal-950/25'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(u)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#34B1AC] border-[#34B1AC] text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ backgroundColor: u.avatarColor || '#34B1AC' }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {u.email || u.username}
                            </span>
                          </div>
                        </button>

                        {isSelected && (
                          <select
                            value={assignedRole}
                            onChange={(e) =>
                              setSelectedRolesByUser((prev) => ({
                                ...prev,
                                [u.id]: e.target.value as WorkspaceRole,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] px-2 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium shrink-0"
                          >
                            <option value="admin">Administrador</option>
                            <option value="member">Membro</option>
                            <option value="production">Produção</option>
                            <option value="viewer">Visualizador</option>
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no banco...</span>
                </>
              ) : (
                <span>
                  Criar Workspace
                  {selectedCount > 0 ? ` (+${selectedCount} usuário${selectedCount > 1 ? 's' : ''})` : ''}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

