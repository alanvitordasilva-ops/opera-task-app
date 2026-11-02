import React from 'react';
import { Task, Project, User, Workspace } from '../types/index.ts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Folder,
  BarChart3,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { isTaskOverdue, getInitials, ROLE_CONFIG } from '../utils/helpers.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface TeamDashboardViewProps {
  workspace: Workspace;
  tasks: Task[];
  projects: Project[];
  workspaceMembers: User[];
  onSelectProject: (projectId: string) => void;
  onSelectMemberFilter: (memberId: string) => void;
}

export const TeamDashboardView: React.FC<TeamDashboardViewProps> = ({
  workspace,
  tasks,
  projects,
  workspaceMembers,
  onSelectProject,
  onSelectMemberFilter,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t)).length;
  const inProgressTasks = totalTasks - completedTasks;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Carga de trabalho por pessoa (quantas tarefas atribuídas, quantas concluídas)
  const workloadByMember = workspaceMembers.map((member) => {
    const memberTasks = tasks.filter(
      (t) => t.assigneeIds && t.assigneeIds.includes(member.id)
    );
    const memberCompleted = memberTasks.filter((t) => t.isCompleted).length;
    const memberOverdue = memberTasks.filter((t) => isTaskOverdue(t)).length;
    const memberPending = memberTasks.length - memberCompleted;

    // Atividades / comentários / checklists realizados para ranking de atividade
    let activityScore = memberCompleted * 3 + memberPending * 1;
    tasks.forEach((t) => {
      const userComments = t.comments?.filter((c) => c.authorId === member.id).length || 0;
      activityScore += userComments * 2;
    });

    return {
      member,
      total: memberTasks.length,
      pending: memberPending,
      completed: memberCompleted,
      overdue: memberOverdue,
      activityScore,
    };
  });

  // Ranking de membros mais ativos
  const mostActiveMembers = [...workloadByMember].sort(
    (a, b) => b.activityScore - a.activityScore
  );

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Dashboard da Equipe · {workspace.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Métricas de produtividade, carga de trabalho e progresso de entregas da equipe
          </p>
        </div>
      </div>

      {/* 4 Cards de Métricas Chave com Moldura Colorida e Estilo do Quadro Kanban */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Tarefas */}
        <div
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border-[2.5px] transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          style={{
            borderColor: '#2563eb',
            boxShadow: '0 1px 3px 0 rgba(37, 99, 235, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(37, 99, 235, 0.15)';
          }}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Tarefas
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            {totalTasks}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">em todos os projetos</span>
        </div>

        {/* Concluídas */}
        <div
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border-[2.5px] transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          style={{
            borderColor: '#059669',
            boxShadow: '0 1px 3px 0 rgba(5, 150, 105, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(5, 150, 105, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(5, 150, 105, 0.15)';
          }}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Concluídas
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {completedTasks}
          </div>
          <span className="text-xs text-emerald-600/90 dark:text-emerald-400/90 mt-1 block font-semibold">
            {completionRate}% taxa de conclusão
          </span>
        </div>

        {/* Em Andamento */}
        <div
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border-[2.5px] transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          style={{
            borderColor: '#3b82f6',
            boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(59, 130, 246, 0.15)';
          }}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Em Andamento
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
            {inProgressTasks}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">em fluxo de trabalho</span>
        </div>

        {/* Atrasadas */}
        <div
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border-[2.5px] transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5"
          style={{
            borderColor: '#dc2626',
            boxShadow: '0 1px 3px 0 rgba(220, 38, 38, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(220, 38, 38, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(220, 38, 38, 0.15)';
          }}
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Atrasadas
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">
            {overdueTasks}
          </div>
          <span className="text-xs text-red-600/90 dark:text-red-400/90 mt-1 block font-semibold">
            requer atenção do time
          </span>
        </div>
      </div>

      {/* Grid: Carga de Trabalho por Pessoa + Membros Mais Ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Carga de Trabalho por Pessoa (7 colunas) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Carga de Trabalho da Equipe
              </h3>
              <p className="text-xs text-slate-400">
                Distribuição de tarefas pendentes e concluídas por membro
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {workspaceMembers.length} membros
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {workloadByMember.map(({ member, total, pending, completed, overdue }) => {
              const memberRate = total > 0 ? Math.round((completed / total) * 100) : 0;
              const memberBorderColor = member.avatarColor || '#2563eb';
              const memberRole = workspace.members.find((m) => m.userId === member.id)?.role || 'member';
              const roleInfo = ROLE_CONFIG[memberRole] || ROLE_CONFIG.member;

              return (
                <div
                  key={member.id}
                  onClick={() => onSelectMemberFilter(member.id)}
                  className="group bg-white dark:bg-slate-900 p-3 rounded-xl border-[2px] transition-all duration-200 cursor-pointer space-y-2 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  style={{
                    borderColor: `${memberBorderColor}50`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = memberBorderColor;
                    e.currentTarget.style.boxShadow = `0 3px 12px 0 ${memberBorderColor}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${memberBorderColor}50`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={member} size="md" showBorder={true} />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {member.name}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md border ${roleInfo.badgeClass}`}
                          >
                            {roleInfo.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {member.title || 'Membro da Equipe'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right shrink-0">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {pending} pendentes
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {completed} concluídas ({total} total)
                        </span>
                      </div>
                      {overdue > 0 && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">
                          {overdue} atrasada{overdue > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Distribuição de Carga */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200/50 dark:border-slate-700/50">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${memberRate}%` }}
                      title={`${completed} concluídas`}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: total > 0 ? `${(pending / total) * 100}%` : '0%' }}
                      title={`${pending} pendentes`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Membros Mais Ativos (5 colunas) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs space-y-4">
          <div className="pb-1 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Membros Mais Ativos
            </h3>
            <p className="text-xs text-slate-400">
              Engajamento com tarefas, entregas e colaborações
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {mostActiveMembers.slice(0, 5).map(({ member, activityScore, completed }, index) => {
              const medalColors = ['#eab308', '#94a3b8', '#b45309'];
              const isPodium = index < 3;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border-[2px] border-slate-200/80 dark:border-slate-800/80 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        isPodium
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <UserAvatar user={member} size="md" showBorder={true} />
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {completed} entregas concluídas
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40">
                      {activityScore} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progresso por Projeto no Workspace - Moldura com a cor de cada projeto */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs space-y-4">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Folder className="w-4 h-4 text-indigo-500" />
            Progresso por Projeto
          </h3>
          <p className="text-xs text-slate-400">
            Acompanhamento das metas e porcentagem de finalização de cada projeto no mesmo estilo dos Quadros
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {projects.map((proj) => {
            const projTasks = tasks.filter((t) => t.projectId === proj.id);
            const projCompleted = projTasks.filter((t) => t.isCompleted).length;
            const projRate = projTasks.length > 0 ? Math.round((projCompleted / projTasks.length) * 100) : 0;
            const projColor = proj.color || '#2563eb';

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="group bg-white dark:bg-slate-900 p-4 rounded-xl border-[2.5px] transition-all duration-200 cursor-pointer space-y-3 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                style={{
                  borderColor: projColor,
                  boxShadow: `0 1px 3px 0 ${projColor}20`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = projColor;
                  e.currentTarget.style.boxShadow = `0 4px 14px 0 ${projColor}38`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = projColor;
                  e.currentTarget.style.boxShadow = `0 1px 3px 0 ${projColor}20`;
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: projColor }}
                    />
                    <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {proj.name}
                    </span>
                  </div>
                  <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {projRate}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/40">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${projRate}%`,
                      backgroundColor: projColor,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span>
                    <strong>{projCompleted}</strong>/{projTasks.length} tarefas concluídas
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver quadro</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
