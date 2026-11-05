import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/supabaseService.ts';
import { StorageService } from '../services/storage.ts';
import { SupabaseConfig } from '../types/index.ts';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  HardDrive,
  ShieldCheck,
  Server,
  Code2,
} from 'lucide-react';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported?: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => SupabaseService.getConfig());
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.anonKey);
  const [isEnabled, setIsEnabled] = useState(config.enabled);

  const [testingStatus, setTestingStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Estatísticas do Banco de Dados Local
  const [stats, setStats] = useState({
    tasks: 0,
    projects: 0,
    workspaces: 0,
    users: 0,
    tags: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const cfg = SupabaseService.getConfig();
      setConfig(cfg);
      setUrlInput(cfg.url);
      setKeyInput(cfg.anonKey);
      setIsEnabled(cfg.enabled);

      setStats({
        tasks: StorageService.getTasks().length,
        projects: StorageService.getProjects().length,
        workspaces: StorageService.getWorkspaces().length,
        users: StorageService.getUsers().length,
        tags: StorageService.getTags().length,
      });
      setSyncFeedback(null);
      setTestingStatus({ loading: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingStatus({ loading: true });
    const res = await SupabaseService.testConnection(urlInput.trim(), keyInput.trim());
    setTestingStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleSaveConfig = () => {
    const updated: SupabaseConfig = {
      url: urlInput.trim(),
      anonKey: keyInput.trim(),
      enabled: isEnabled && Boolean(urlInput.trim() && keyInput.trim()),
      lastSyncedAt: config.lastSyncedAt,
    };
    SupabaseService.saveConfig(updated);
    setConfig(updated);
    setSyncFeedback('Configurações salvas com sucesso!');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleTriggerManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await StorageService.syncWithCloud();
      if (res.success) {
        setSyncFeedback('Sincronização com o Supabase concluída com sucesso!');
        setConfig(SupabaseService.getConfig());
      } else {
        setSyncFeedback(`Aviso na sincronização: ${res.error || 'Verifique as tabelas do Supabase'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SupabaseService.getSchemaSQL());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operatask_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Salvamento Automático & Banco de Dados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Garantia de persistência contínua, IndexedDB offline e integração com Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Geral de Armazenamento Local */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Banco Local & Cache Seguro (IndexedDB + LocalStorage)
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Ativo & Protegido
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Todas as ações realizadas no OperaTask (criação, edição, drag and drop, comentários, mídias e checklists) são salvas imediatamente no armazenamento local persistente, garantindo integridade mesmo offline ou ao fechar o navegador.
            </p>

            {/* Contadores */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
                <span className="block text-lg font-extrabold text-blue-600 dark:text-blue-400">{stats.tasks}</span>
                <span className="text-[10px] text-slate-500 font-medium">Tarefas</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
                <span className="block text-lg font-extrabold text-purple-600 dark:text-purple-400">{stats.projects}</span>
                <span className="text-[10px] text-slate-500 font-medium">Projetos</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
                <span className="block text-lg font-extrabold text-amber-600 dark:text-amber-400">{stats.workspaces}</span>
                <span className="text-[10px] text-slate-500 font-medium">Workspaces</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
                <span className="block text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{stats.users}</span>
                <span className="text-[10px] text-slate-500 font-medium">Membros</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
                <span className="block text-lg font-extrabold text-pink-600 dark:text-pink-400">{stats.tags}</span>
                <span className="text-[10px] text-slate-500 font-medium">Tags</span>
              </div>
            </div>
          </div>

          {/* Integração com Nuvem Supabase */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Banco de Dados em Nuvem (Supabase)
                </h3>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {isEnabled ? 'Habilitado' : 'Desabilitado'}
                </span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Conecte seu projeto Supabase para gerenciamento completo e síncrono das tarefas na nuvem. Pode configurar aqui ou definir as variáveis <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project URL do Supabase
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Anon / Public Key do Supabase
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Botões de Ação do Supabase */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingStatus.loading || !urlInput.trim() || !keyInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>{testingStatus.loading ? 'Testando...' : 'Testar Conexão'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  Salvar Credenciais
                </button>

                {isEnabled && config.url && (
                  <button
                    type="button"
                    onClick={handleTriggerManualSync}
                    disabled={isSyncing}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopySQL}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1.5 ml-auto"
                  title="Copiar script SQL para criar as tabelas no Supabase SQL Editor"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">SQL Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mensagem de Feedback de Conexão */}
              {testingStatus.message && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testingStatus.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {testingStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testingStatus.message}</span>
                </div>
              )}

              {syncFeedback && (
                <div className="p-2.5 rounded-lg text-xs bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                  <InfoIcon className="w-4 h-4 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}
            </div>
          </div>

          {/* Backup e Exportação Manual */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Backup Completo dos Dados
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Exporte todo o histórico e entidades em arquivo JSON de segurança.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Salvamento automático ativo e ininterrupto em toda a plataforma
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

function InfoIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
