import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Archive } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  message?: string;
  onArchiveInstead?: () => void;
  archiveButtonText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'este item',
  message,
  onArchiveInstead,
  archiveButtonText = 'Arquivar em vez de excluir',
  confirmButtonText = 'Excluir',
  cancelButtonText = 'Cancelar',
}) => {
  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultTitle = title || `Excluir ${itemType}?`;
  const defaultMessage =
    message ||
    (itemName
      ? `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`
      : `Tem certeza que deseja excluir ${itemType}? Esta ação não pode ser desfeita.`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="confirm-delete-title"
                className="text-base font-bold text-slate-900 dark:text-white leading-tight"
              >
                {defaultTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Confirmação de segurança
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com Mensagem */}
        <div className="px-5 py-3 space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {defaultMessage}
          </p>

          {/* Dica de Arquivamento (quando aplicável a projetos ou cards) */}
          {onArchiveInstead && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5 flex-1">
                <p className="font-semibold">Prefere arquivar em vez de excluir?</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                  Arquivar retira o item do quadro ativo mas preserva o histórico e permite restaurá-lo a qualquer momento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onArchiveInstead();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded-lg transition-colors mt-1"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{archiveButtonText}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação Padronizados */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-750 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors active:scale-98"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-xs hover:shadow-md transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
