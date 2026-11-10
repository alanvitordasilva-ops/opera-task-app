import React from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  Zap,
  Users,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';

interface PlanLimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'create_board' | 'invite_member' | 'feature_locked';
  currentCount?: number;
  maxLimit?: number;
  planName?: string;
  customMessage?: string;
  onOpenUpgradeModal: () => void;
}

export const PlanLimitExceededModal: React.FC<PlanLimitExceededModalProps> = ({
  isOpen,
  onClose,
  limitType,
  currentCount,
  maxLimit,
  planName = 'Plano Atual',
  customMessage,
  onOpenUpgradeModal,
}) => {
  if (!isOpen) return null;

  const isBoardLimit = limitType === 'create_board';
  const isMemberLimit = limitType === 'invite_member';

  const title = isBoardLimit
    ? 'Limite de Quadros Atingido'
    : isMemberLimit
    ? 'Limite de Membros Atingido'
    : 'Recurso Restrito ao seu Plano';

  const defaultDescription = isBoardLimit
    ? `O plano ${planName} permite até ${maxLimit} quadros ativos. A empresa já atingiu o total de ${currentCount} quadros. Faça upgrade para desbloquear mais quadros operacionais.`
    : isMemberLimit
    ? `O plano ${planName} permite até ${maxLimit} usuários na equipe. A sua empresa já possui ${currentCount} membros cadastrados. Faça upgrade para adicionar novos colaboradores.`
    : `Este módulo ou funcionalidade não está incluso no plano ${planName}. Faça upgrade para liberar o acesso irrestrito.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden flex flex-col animate-in zoom-in-95 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
            {isBoardLimit ? (
              <Layers className="w-6 h-6" />
            ) : isMemberLimit ? (
              <Users className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {planName}
            </span>
            <span className="text-xs text-slate-400">Capacidade Máxima</span>
          </div>

          <h3 className="text-lg font-extrabold text-[#173653] dark:text-white tracking-tight">
            {title}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {customMessage || defaultDescription}
          </p>
        </div>

        {/* Card Resumo do Limite */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Uso atual da empresa:</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {currentCount !== undefined && maxLimit !== undefined ? `${currentCount} / ${maxLimit}` : planName}
          </span>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Entendi, voltar
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenUpgradeModal();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Ver Planos & Upgrade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
