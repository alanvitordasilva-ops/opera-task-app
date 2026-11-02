import React, { useState, useEffect } from 'react';
import { SaveStatus } from '../types/index.ts';
import { StorageService } from '../services/storage.ts';
import {
  CheckCircle2,
  Loader2,
  CloudOff,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SaveStatusIndicatorProps {
  onOpenSyncSettings?: () => void;
  compact?: boolean;
  className?: string;
  label?: string;
  isSavingOverride?: boolean;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  onOpenSyncSettings,
  compact = false,
  className = '',
  label = 'Todas as informações salvas',
  isSavingOverride = false,
}) => {
  const [status, setStatus] = useState<SaveStatus>(() => StorageService.getSaveStatus());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = StorageService.subscribeToSaveStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await StorageService.retrySave();
    } finally {
      setIsRetrying(false);
    }
  };

  const formattedTime = status.lastSavedAt
    ? new Date(status.lastSavedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  // Estado: Salvando...
  if (status.state === 'saving' || isRetrying || isSavingOverride) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#34B1AC]/10 dark:bg-[#34B1AC]/20 text-[#173653] dark:text-[#34B1AC] border border-[#34B1AC]/30 shadow-2xs transition-all ${className}`}
        title="Gravando informações da conta no banco de dados"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34B1AC] shrink-0" />
        <span>Salvando...</span>
      </div>
    );
  }

  // Estado: Erro ao Salvar
  if (status.state === 'error') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/90 dark:border-red-900/60 shadow-2xs transition-all ${className}`}
        title={status.errorMessage || 'Falha ao salvar informações.'}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <span>Erro ao salvar</span>
        <button
          type="button"
          onClick={handleRetry}
          className="ml-1 underline hover:text-red-900 dark:hover:text-red-100 flex items-center gap-0.5 cursor-pointer"
          title="Tentar novamente"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Tentar</span>
        </button>
      </div>
    );
  }

  // Estado: Modo Offline (Salvo localmente)
  if (status.state === 'offline' || !status.isOnline) {
    return (
      <div
        onClick={onOpenSyncSettings}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-900/60 shadow-2xs transition-all ${className}`}
        title="Modo offline: informações salvas localmente no navegador."
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Salvo localmente</span>
      </div>
    );
  }

  // Estado: Salvo com Sucesso (Padrão)
  return (
    <div
      onClick={onOpenSyncSettings}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs transition-all ${className}`}
      title={
        formattedTime
          ? `Todas as informações da conta foram salvas com sucesso às ${formattedTime}.`
          : 'Todas as informações salvas no banco de dados.'
      }
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="font-semibold text-[11px]">{label}</span>
      {formattedTime && !compact && (
        <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
          · {formattedTime}
        </span>
      )}
    </div>
  );
};
