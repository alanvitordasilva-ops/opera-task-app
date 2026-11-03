import React from 'react';
import { Notification, Task, Project, User } from '../types/index.ts';
import {
  X,
  AlertTriangle,
  AtSign,
  UserCheck,
  CheckCircle2,
  Bell,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { formatTimeAgoPTBR, getInitials } from '../utils/helpers.ts';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  workspaceMembers: User[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  workspaceMembers,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const getActorUser = (id: string) => workspaceMembers.find((m) => m.id === id);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AtSign className="w-3.5 h-3.5 text-blue-500" />;
      case 'assigned':
        return <UserCheck className="w-3.5 h-3.5 text-purple-500" />;
      case 'overdue':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      case 'status_change':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm mt-14 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Notificações da Equipe
              </h3>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} não lidas` : 'Tudo em dia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
              >
                Ler todas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Notificações */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.map((notif) => {
            const actor = getActorUser(notif.actorId);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  onMarkAsRead(notif.id);
                  if (notif.taskId && onSelectTask) {
                    onSelectTask(notif.taskId);
                    onClose();
                  }
                }}
                className={`p-3 rounded-xl border text-xs transition-colors cursor-pointer relative ${
                  notif.read
                    ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                    : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold truncate text-[11px] text-slate-900 dark:text-slate-100">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimeAgoPTBR(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Nenhuma notificação nova
              </p>
              <p className="text-[11px] mt-0.5">
                Você receberá avisos quando for mencionado ou atribuído a tarefas.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">OperaTask Collaboration Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
