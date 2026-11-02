import React, { useState } from 'react';
import { WorkspaceActivity, User, Project } from '../types/index.ts';
import { Activity, Clock, Folder, Filter, Calendar } from 'lucide-react';
import { formatTimeAgoPTBR, getInitials } from '../utils/helpers.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface ActivityFeedViewProps {
  activities: WorkspaceActivity[];
  workspaceMembers: User[];
  projects: Project[];
  onSelectTask?: (taskId: string) => void;
}

export const ActivityFeedView: React.FC<ActivityFeedViewProps> = ({
  activities,
  workspaceMembers,
  projects,
  onSelectTask,
}) => {
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

  const getMemberUser = (id: string) => workspaceMembers.find((m) => m.id === id);
  const getProject = (id?: string) => projects.find((p) => p.id === id);

  const filteredActivities = activities.filter((act) => {
    if (selectedMemberFilter !== 'all' && act.userId !== selectedMemberFilter) {
      return false;
    }
    if (selectedProjectFilter !== 'all' && act.projectId !== selectedProjectFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Feed de Atividades da Equipe
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro cronológico e transparente com o mesmo estilo visual dos Quadros
          </p>
        </div>

        {/* Filtros de atividade no mesmo estilo do design system */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <select
            value={selectedMemberFilter}
            onChange={(e) => setSelectedMemberFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            <option value="all">Todos os Membros</option>
            {workspaceMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            <option value="all">Todos os Projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Atividades com Cards e Moldura Colorida do Projeto */}
      <div className="space-y-3">
        {filteredActivities.map((act) => {
          const user = getMemberUser(act.userId);
          const project = getProject(act.projectId);
          const projectBorderColor = project?.color || '#2563eb';

          return (
            <div
              key={act.id}
              onClick={() => {
                if (act.taskId && onSelectTask) {
                  onSelectTask(act.taskId);
                }
              }}
              className={`group bg-white dark:bg-slate-900 rounded-xl p-3.5 sm:p-4 transition-all duration-200 relative border-[2.5px] shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                act.taskId && onSelectTask ? 'cursor-pointer' : ''
              }`}
              style={{
                borderColor: projectBorderColor,
                boxShadow: `0 1px 3px 0 ${projectBorderColor}20`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = projectBorderColor;
                e.currentTarget.style.boxShadow = `0 4px 14px 0 ${projectBorderColor}38`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = projectBorderColor;
                e.currentTarget.style.boxShadow = `0 1px 3px 0 ${projectBorderColor}20`;
              }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar do autor com Foto de Perfil */}
                <UserAvatar user={user} size="lg" showBorder={true} />

                <div className="min-w-0 flex-1">
                  {/* Linha superior: Autor + Horário */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                        {user?.name || 'Membro da Equipe'}
                      </span>
                      {user?.title && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          · {user.title}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 font-medium">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgoPTBR(act.timestamp)}
                    </span>
                  </div>

                  {/* Descrição da Ação + Título da Tarefa em Destaque */}
                  <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {act.action}
                    </span>
                    {act.taskTitle && (
                      <span className="font-bold text-slate-900 dark:text-slate-100 ml-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        "{act.taskTitle}"
                      </span>
                    )}
                  </p>

                  {/* Tag do Projeto associado (mesmo estilo das tags do Kanban) */}
                  {project && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${project.color}15`,
                          color: project.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span>Projeto: {project.name}</span>
                      </span>

                      {act.taskId && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                          Abrir card →
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredActivities.length === 0 && (
          <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30">
            <Activity className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Nenhuma atividade registrada para os filtros selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
