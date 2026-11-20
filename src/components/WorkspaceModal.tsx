import React, { useState, useEffect, useMemo } from 'react';
import { Workspace, User, WorkspaceRole } from '../types/index.ts';
import { X, Users, UserPlus, Shield, Trash2, Check, Mail, Building, Lock, AlertTriangle, ShieldAlert, Search, UserCheck, Loader2 } from 'lucide-react';
import {
  ROLE_CONFIG,
  COLOR_PALETTE,
  getInitials,
  canRegisterUser,
  canRemoveWorkspaceMember,
  isUserMaster,
  getUserRoleInWorkspace,
  canManageWorkspace,
} from '../utils/helpers.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { ColorPicker } from './ColorPicker.tsx';
import { RegisterUserModal } from './RegisterUserModal.tsx';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  allUsers: User[];
  registeredUsers?: User[];
  currentUserId: string;
  currentUser?: User;
  allWorkspaces?: Workspace[];
  onSaveWorkspace: (data: Partial<Workspace>) => void;
  onInviteMember: (email: string, role: WorkspaceRole) => void;
  onEnrollUsers?: (entries: Array<{ userId: string; role: WorkspaceRole }>) => Promise<void> | void;
  onChangeMemberRole: (userId: string, newRole: WorkspaceRole) => void;
  onRemoveMember: (userId: string) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
  onUserCreated?: (newUser: User, role: WorkspaceRole, workspaceId: string, workspaceIds?: string[]) => void;
}

const normalizeEnrollRole = (role?: string): WorkspaceRole => {
  if (role === 'admin' || role === 'administrador') return 'admin';
  if (role === 'production' || role === 'producao') return 'production';
  if (role === 'viewer' || role === 'visualizador') return 'viewer';
  return 'member';
};

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  workspace,
  allUsers,
  registeredUsers,
  currentUserId,
  currentUser,
  allWorkspaces,
  onSaveWorkspace,
  onInviteMember,
  onEnrollUsers,
  onChangeMemberRole,
  onRemoveMember,
  onDeleteWorkspace,
  onUserCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('members');
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [logoColor, setLogoColor] = useState(workspace.logoColor);

  // Confirmação segura de exclusão
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);

  // Modal de cadastro de novos usuários pelo Dono/Admin
  const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);

  // Inscrição de usuários já cadastrados no banco de dados
  const [enrollSearch, setEnrollSearch] = useState('');
  const [defaultEnrollRole, setDefaultEnrollRole] = useState<WorkspaceRole>('member');
  const [selectedToEnroll, setSelectedToEnroll] = useState<Record<string, WorkspaceRole>>({});
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Sincroniza campos quando o modal abre ou o workspace ativo muda
  useEffect(() => {
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setLogoColor(workspace.logoColor || '#173653');
    setIsConfirmingDelete(false);
    setDeleteConfirmText('');
    setEnrollSearch('');
    setSelectedToEnroll({});
    setIsEnrolling(false);
  }, [workspace.id, workspace.name, workspace.description, workspace.logoColor, isOpen]);

  // Base unificada de usuários para exibição de membros e inscrição
  const userLookupPool = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of allUsers || []) {
      if (u?.id) map.set(u.id, u);
    }
    for (const u of registeredUsers || []) {
      if (u?.id) map.set(u.id, { ...map.get(u.id), ...u });
    }
    return Array.from(map.values());
  }, [allUsers, registeredUsers]);

  // Usuários cadastrados no banco que AINDA NÃO estão atribuídos a este workspace
  const unassignedUsers = useMemo(() => {
    const memberIdSet = new Set<string>(
      (workspace.members || []).map((m) => (m.userId || '').trim().toLowerCase()).filter(Boolean)
    );
    if (workspace.ownerId) {
      memberIdSet.add(workspace.ownerId.trim().toLowerCase());
    }
    const sourceList = registeredUsers && registeredUsers.length > 0 ? registeredUsers : allUsers;
    return (sourceList || []).filter((u) => {
      if (!u || !u.id) return false;
      const uid = u.id.trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uUsername = (u.username || '').trim().toLowerCase();
      if (memberIdSet.has(uid)) return false;
      if (uEmail && memberIdSet.has(uEmail)) return false;
      if (uUsername && memberIdSet.has(uUsername)) return false;
      return true;
    });
  }, [registeredUsers, allUsers, workspace.members, workspace.ownerId]);

  const filteredUnassignedUsers = useMemo(() => {
    const q = enrollSearch.trim().toLowerCase();
    if (!q) return unassignedUsers;
    return unassignedUsers.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q)
    );
  }, [unassignedUsers, enrollSearch]);

  if (!isOpen) return null;

  const currentMember = workspace.members.find((m) => m.userId === currentUserId);
  const currentMemberUser = currentUser || allUsers.find((u) => u.id === currentUserId);
  const isMaster = isUserMaster(currentMemberUser);
  const resolvedRole: WorkspaceRole = getUserRoleInWorkspace(workspace, currentMemberUser, allUsers);
  const isOwner = isMaster || resolvedRole === 'owner' || resolvedRole === 'dono' || workspace.ownerId === currentUserId;
  const isAdminOrOwner = canManageWorkspace(resolvedRole, isMaster) || isOwner;
  const currentActorRole: WorkspaceRole = isMaster ? 'owner' : resolvedRole;

  const ownerMember =
    workspace.members.find((m) => m.role === 'owner') ||
    workspace.members.find((m) => m.userId === workspace.ownerId);
  const ownerUser = ownerMember
    ? allUsers.find((u) => u.id === ownerMember.userId)
    : allUsers.find((u) => u.id === workspace.ownerId);
  const currentRoleInfo = currentMember
    ? ROLE_CONFIG[currentMember.role]
    : isOwner
    ? ROLE_CONFIG.owner
    : ROLE_CONFIG.member;

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveWorkspace({
      name: name.trim(),
      description: description.trim(),
      logoColor,
    });
    onClose();
  };



  const getMemberUser = (userId: string) => userLookupPool.find((u) => u.id === userId);

  const toggleEnrollSelection = (user: User) => {
    setSelectedToEnroll((prev) => {
      const next = { ...prev };
      if (next[user.id]) {
        delete next[user.id];
      } else {
        next[user.id] = user.tipo ? normalizeEnrollRole(user.tipo) : defaultEnrollRole;
      }
      return next;
    });
  };

  const handleEnrollEntries = async (entries: Array<{ userId: string; role: WorkspaceRole }>) => {
    if (entries.length === 0 || isEnrolling) return;
    setIsEnrolling(true);
    try {
      if (onEnrollUsers) {
        await onEnrollUsers(entries);
      } else {
        const nowIso = new Date().toISOString();
        const existingIds = new Set((workspace.members || []).map((m) => m.userId));
        const additions = entries
          .filter((e) => !existingIds.has(e.userId))
          .map((e) => ({ userId: e.userId, role: e.role, joinedAt: nowIso }));
        if (additions.length > 0) {
          onSaveWorkspace({ members: [...(workspace.members || []), ...additions] });
        }
      }
      setSelectedToEnroll((prev) => {
        const next = { ...prev };
        entries.forEach((e) => delete next[e.userId]);
        return next;
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const selectedEnrollCount = Object.keys(selectedToEnroll).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
              style={{ backgroundColor: workspace.logoColor }}
            >
              {getInitials(workspace.name)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Gerenciar Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {workspace.name} · {workspace.members.length} membros
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

        {/* Abas */}
        <div className="flex items-center gap-4 px-6 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Membros e Convites ({workspace.members.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            Configurações Gerais
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Botão de Cadastrar Novo Usuário (Apenas Dono / Administrador) */}
              {isAdminOrOwner && (
                <div className="p-4 sm:p-5 rounded-2xl border border-teal-200/80 dark:border-teal-900/50 bg-linear-to-r from-teal-50/60 via-blue-50/40 to-slate-50 dark:from-teal-950/20 dark:via-blue-950/20 dark:to-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#173653] dark:text-[#34B1AC] flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#34B1AC]" />
                      <span>Cadastrar Novo Usuário</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Defina o nome, senha e tipo de membro (Produção, Membro, etc.). O sistema gerará o link de acesso com as credenciais prontas para envio.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegisterUserOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#1f4a73] active:scale-98 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#34B1AC]" />
                    <span>Cadastrar novo usuário</span>
                  </button>
                </div>
              )}

              {/* Inscrever Usuários Já Cadastrados no Banco de Dados */}
              {isAdminOrOwner && (
                <div className="p-4 sm:p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/15 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Inscrever Usuário Já Cadastrado</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300">
                          {unassignedUsers.length} disponíve{unassignedUsers.length === 1 ? 'l' : 'is'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Selecione usuários existentes no banco de dados que ainda não estão atribuídos a este workspace.
                      </p>
                    </div>

                    {selectedEnrollCount > 0 && (
                      <button
                        type="button"
                        disabled={isEnrolling}
                        onClick={() =>
                          handleEnrollEntries(
                            Object.entries(selectedToEnroll).map(([userId, role]) => ({
                              userId,
                              role,
                            }))
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xs transition-all shrink-0 cursor-pointer"
                      >
                        {isEnrolling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>
                          Inscrever Selecionados ({selectedEnrollCount})
                        </span>
                      </button>
                    )}
                  </div>

                  {unassignedUsers.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3.5 py-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Todos os usuários cadastrados no banco de dados já estão inscritos neste workspace.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type="text"
                            value={enrollSearch}
                            onChange={(e) => setEnrollSearch(e.target.value)}
                            placeholder="Buscar usuário cadastrado por nome, login ou e-mail..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <select
                          value={defaultEnrollRole}
                          onChange={(e) => setDefaultEnrollRole(e.target.value as WorkspaceRole)}
                          title="Papel padrão para inscrição rápida"
                          className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium"
                        >
                          <option value="production">Papel: Produção</option>
                          <option value="member">Papel: Membro</option>
                          <option value="admin">Papel: Administrador</option>
                          <option value="viewer">Papel: Visualizador</option>
                        </select>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                        {filteredUnassignedUsers.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            Nenhum usuário cadastrado encontrado para "{enrollSearch}".
                          </div>
                        ) : (
                          filteredUnassignedUsers.map((u) => {
                            const isChecked = Boolean(selectedToEnroll[u.id]);
                            const chosenRole =
                              selectedToEnroll[u.id] ||
                              (u.tipo ? normalizeEnrollRole(u.tipo) : defaultEnrollRole);

                            return (
                              <div
                                key={u.id}
                                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                                  isChecked
                                    ? 'border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 shadow-2xs'
                                    : 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-blue-300 dark:hover:border-blue-800'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleEnrollSelection(u)}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <span
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                      isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </span>
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                                    style={{ backgroundColor: u.avatarColor || '#34B1AC' }}
                                  >
                                    {getInitials(u.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                      {u.name}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                      {u.email || u.username}
                                      {u.title ? ` · ${u.title}` : ''}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isChecked ? (
                                    <select
                                      value={chosenRole}
                                      onChange={(e) =>
                                        setSelectedToEnroll((prev) => ({
                                          ...prev,
                                          [u.id]: e.target.value as WorkspaceRole,
                                        }))
                                      }
                                      className="text-[11px] px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                                    >
                                      <option value="admin">Administrador</option>
                                      <option value="member">Membro</option>
                                      <option value="production">Produção</option>
                                      <option value="viewer">Visualizador</option>
                                    </select>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isEnrolling}
                                      onClick={() =>
                                        handleEnrollEntries([
                                          { userId: u.id, role: defaultEnrollRole },
                                        ])
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
                                      title={`Inscrever ${u.name} como ${ROLE_CONFIG[defaultEnrollRole]?.label || defaultEnrollRole}`}
                                    >
                                      <UserPlus className="w-3 h-3" />
                                      <span>Inscrever</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Lista de Membros Atuais */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Membros no Workspace
                </h4>
                <div className="space-y-2">
                  {workspace.members.map((member) => {
                    const u = getMemberUser(member.userId);
                    if (!u) return null;
                    const roleInfo = ROLE_CONFIG[member.role];
                    const isSelf = member.userId === currentUserId;
                    const isTargetOwner = member.role === 'owner';

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: u.avatarColor }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {u.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {u.email} {u.title ? `· ${u.title}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Seletor de Papel / Permissões */}
                        <div className="flex items-center gap-2">
                          {isAdminOrOwner && !isTargetOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                onChangeMemberRole(member.userId, e.target.value as WorkspaceRole)
                              }
                              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                            >
                              <option value="admin">Administrador</option>
                              <option value="member">Membro</option>
                              <option value="production">Produção</option>
                              <option value="viewer">Visualizador</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${roleInfo.badgeClass}`}
                            >
                              {roleInfo.label}
                            </span>
                          )}

                          {(() => {
                            const canRemove = !isSelf && canRemoveWorkspaceMember(currentActorRole, member.role, isMaster, isOwner);
                            const isTargetAdmin = member.role === 'admin' || member.role === 'administrador';

                            if (canRemove) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setMemberToDelete({ id: member.userId, name: u.name })}
                                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                  title="Remover acesso deste membro do workspace"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              );
                            }

                            if (isTargetAdmin && !isOwner && !isMaster && !isSelf) {
                              return (
                                <span
                                  className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                  title="Apenas Master ou Dono podem remover o acesso de um Administrador"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Guia Explicativo dos Níveis de Acesso */}
                <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-2">
                  <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Shield className="w-3.5 h-3.5 text-[#34B1AC]" />
                    <span>Níveis de Permissão no OperaTask:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <strong className="text-amber-700 dark:text-amber-300">Dono:</strong> Controle total do workspace e exclusão.
                    </div>
                    <div>
                      <strong className="text-blue-700 dark:text-blue-300">Administrador:</strong> Gerencia projetos, colunas e membros.
                    </div>
                    <div>
                      <strong className="text-emerald-700 dark:text-emerald-300">Membro:</strong> Cria, edita e exclui tarefas, move cards e comenta.
                    </div>
                    <div>
                      <strong className="text-teal-700 dark:text-teal-300">Produção:</strong> Mesmo nível do Membro — opera cards, checklists e tarefas.
                    </div>
                    <div className="sm:col-span-2">
                      <strong className="text-slate-700 dark:text-slate-300">Visualizador:</strong> Apenas visualiza e adiciona comentários.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Nome do Workspace
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdminOrOwner}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  disabled={!isAdminOrOwner}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo principal deste workspace..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Cor de Identificação com Pincel e Paleta */}
              <div>
                <ColorPicker
                  label="Cor de Identidade do Workspace"
                  description="Logo e cabeçalho da equipe"
                  value={logoColor}
                  onChange={(newColor) => setLogoColor(newColor)}
                  disabled={!isAdminOrOwner}
                  size="md"
                  showPaletteStrip={true}
                  quickPaletteCount={6}
                />
              </div>


              {isAdminOrOwner && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              )}

              {/* Zona de Perigo - Exclusão de Workspace (Somente Dono) */}
              <div className="mt-8 pt-6 border-t border-red-100 dark:border-red-950/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Zona de Perigo • Exclusão do Workspace
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    Apenas Dono (Owner)
                  </span>
                </div>

                {isOwner && onDeleteWorkspace ? (
                  <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-xl p-4">
                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                      Como <strong>Dono (Owner)</strong> deste workspace, você possui a permissão exclusiva para excluí-lo.
                      Ao excluir, todos os projetos, quadros e tarefas associados serão removidos permanentemente para todos os membros da equipe.
                    </p>

                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingDelete(true);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 border border-red-300 dark:border-red-800 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Este Workspace</span>
                      </button>
                    ) : (
                      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-300 dark:border-red-800 shadow-sm animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Confirmação de Segurança Requerida</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Esta ação não pode ser desfeita. Para confirmar a exclusão definitiva, digite o nome exato do workspace:{' '}
                          <strong className="text-slate-900 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {workspace.name}
                          </strong>
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={`Digite "${workspace.name}" para confirmar`}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfirmingDelete(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deleteConfirmText.trim() !== workspace.name.trim()}
                            onClick={() => {
                              onDeleteWorkspace(workspace.id);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Confirmar Exclusão Definitiva</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Apenas o Dono pode excluir este workspace
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        A exclusão de workspaces é uma ação crítica restrita exclusivamente ao Dono ({ownerUser?.name || 'Proprietário original'}).
                        Você está autenticado no momento como <strong>{currentMemberUser?.name || 'Você'}</strong> com papel de{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{currentRoleInfo.label}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Confirmação Padronizado */}
      {memberToDelete && (
        <ConfirmDeleteModal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          onConfirm={() => {
            onRemoveMember(memberToDelete.id);
            setMemberToDelete(null);
          }}
          title="Remover membro do workspace?"
          itemName={memberToDelete.name}
          itemType="este membro"
          message={`Tem certeza que deseja remover ${memberToDelete.name} deste workspace?`}
          confirmButtonText="Remover"
        />
      )}

      {/* Modal de Cadastro de Novo Usuário */}
      <RegisterUserModal
        isOpen={isRegisterUserOpen}
        onClose={() => setIsRegisterUserOpen(false)}
        workspaces={allWorkspaces}
        workspaceId={workspace.id}
        currentUser={currentMemberUser}
        onUserCreated={(newUser, newRole, primaryWsId, selectedWsIds) => {
          if (onUserCreated) {
            onUserCreated(newUser, newRole, primaryWsId, selectedWsIds);
            return;
          }
          // Fallback caso o pai não forneça onUserCreated
          const memberExists = (workspace.members || []).some((m) => m.userId === newUser.id);
          if (!memberExists && onSaveWorkspace) {
            const updatedMembers = [
              ...(workspace.members || []),
              { userId: newUser.id, role: newRole, joinedAt: new Date().toISOString() },
            ];
            onSaveWorkspace({ members: updatedMembers });
          }
        }}
      />
    </div>
  );
};
