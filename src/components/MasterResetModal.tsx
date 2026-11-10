import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  Database,
  RefreshCw,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../services/storage.ts';

interface MasterResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const MasterResetModal: React.FC<MasterResetModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'sql'>('interactive');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const SQL_SCRIPT = `-- ============================================================================
-- OPERATASK - SCRIPT DE LIMPEZA GERAL DE DADOS DE TESTE (RESET PARA PRODUÇÃO)
-- ============================================================================
-- Execute este bloco no SQL Editor do Supabase antes do lançamento oficial.

BEGIN;

-- 1. Apagar Tarefas, Cards e Itens de Produção de teste
DELETE FROM public.tasks 
WHERE workspace_id != 'ws-principal';

DELETE FROM public.cards 
WHERE workspace_id != 'ws-principal';

-- 2. Apagar Fichas Técnicas de workspaces de teste
DELETE FROM public.fichas_tecnicas 
WHERE workspace_id IS NOT NULL 
  AND workspace_id != 'ws-principal';

-- 3. Apagar Quadros / Projetos secundários de teste
DELETE FROM public.projects 
WHERE workspace_id != 'ws-principal';

-- 4. Apagar vínculos de membros nos workspaces de teste
DELETE FROM public.workspace_members 
WHERE workspace_id != 'ws-principal';

-- No workspace principal, manter exclusivamente o Master
DELETE FROM public.workspace_members 
WHERE workspace_id = 'ws-principal' 
  AND user_id NOT IN ('user-master-alan', (SELECT id::text FROM auth.users WHERE email ILIKE 'alanvitordasilva@gmail.com%'));

-- 5. Apagar Workspaces de teste (mantendo apenas o ws-principal)
DELETE FROM public.workspaces 
WHERE id != 'ws-principal';

-- 6. Apagar Empresas / Tenants de teste (mantendo apenas a Matriz)
DELETE FROM public.tenants 
WHERE id NOT IN ('tenant-matriz', 'client-matriz');

-- 7. Apagar Perfis de Utilizadores de teste na tabela profiles
DELETE FROM public.profiles 
WHERE id NOT IN (
  'user-master-alan',
  COALESCE((SELECT id FROM auth.users WHERE email = 'alanvitordasilva@gmail.com.br'), '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE((SELECT id FROM auth.users WHERE email = 'alanvitordasilva@gmail.com'), '00000000-0000-0000-0000-000000000000'::uuid)
)
AND email NOT IN ('alanvitordasilva@gmail.com.br', 'alanvitordasilva@gmail.com');

-- 8. Garantir que a Matriz e o Workspace Principal estão ativos
INSERT INTO public.tenants (id, name, legal_name, plan, status, payment_status, owner_id, owner_name, owner_email, max_users)
VALUES ('tenant-matriz', 'OperaTask Matriz', 'OperaTask Tecnologia Ltda', 'profissional', 'active', 'paid', 'user-master-alan', 'Alan Silva (Master)', 'alanvitordasilva@gmail.com.br', 9999)
ON CONFLICT (id) DO UPDATE SET status = 'active', payment_status = 'paid';

INSERT INTO public.workspaces (id, tenant_id, name, slug, description, logo_color, owner_id)
VALUES ('ws-principal', 'tenant-matriz', 'Meu Workspace', 'meu-workspace', 'Espaço de trabalho corporativo', '#173653', 'user-master-alan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, workspace_id, name, description, color, icon, columns, member_ids, is_archived)
VALUES (
  'proj-ws-principal-principal',
  'ws-principal',
  'Quadro Principal',
  'Quadro de tarefas e fluxo operacional do espaço Meu Workspace',
  '#2563eb',
  'folder',
  '[{"id":"col-ws-principal-backlog","title":"Backlog","color":"#64748b","order":0},{"id":"col-ws-principal-progress","title":"Em Andamento","color":"#2563eb","order":1},{"id":"col-ws-principal-review","title":"Revisão / QA","color":"#d97706","order":2},{"id":"col-ws-principal-done","title":"Concluído","color":"#059669","order":3,"isCompletedColumn":true}]'::jsonb,
  '[]'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- INSTRUÇÃO auth.users (Limpeza no Supabase Auth):
-- DELETE FROM auth.users WHERE email NOT IN ('alanvitordasilva@gmail.com.br', 'alanvitordasilva@gmail.com');`;

  const handleCopySql = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
      onShowToast({
        type: 'success',
        message: 'Script SQL de limpeza copiado com sucesso para a área de transferência!',
      });
    }
  };

  const handleExecuteInteractiveReset = async () => {
    if (confirmationInput.trim().toUpperCase() !== 'RESETAR') {
      onShowToast({
        type: 'error',
        message: 'Por favor, digite exatamente "RESETAR" para confirmar a limpeza geral de dados de teste.',
      });
      return;
    }

    setIsResetting(true);
    try {
      await StorageService.resetTestDataToProduction();
      onShowToast({
        type: 'success',
        message: 'Limpeza geral concluída! Todos os dados de teste foram apagados. Apenas a conta Master e Matriz permanecem ativas.',
      });
      onResetComplete();
      onClose();
    } catch (err: any) {
      onShowToast({
        type: 'error',
        message: err.message || 'Erro ao executar limpeza de dados.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/60 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header no Padrão Alerta Máximo */}
        <div className="bg-red-700 dark:bg-red-950 text-white px-6 py-4 flex items-center justify-between border-b border-red-800 dark:border-red-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Limpeza Geral de Teste (Reset para Lançamento)
              </h3>
              <p className="text-[11px] text-red-100/80">
                Preparação oficial do banco de dados para arranque de vendas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Alternativas: Ação Automática vs Script SQL */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('interactive')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'interactive'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Limpeza Automática no App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Script SQL Supabase
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'interactive' ? (
            <div className="space-y-4">
              {/* Box de Preservação Segura */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200">
                    O que será estritamente PRESERVADO:
                  </h4>
                  <ul className="mt-1 space-y-0.5 text-emerald-700 dark:text-emerald-400">
                    <li>✓ <strong>Administrador Master (Alan Silva)</strong> com acesso total</li>
                    <li>✓ <strong>Empresa Matriz Padrão</strong> e Workspace Principal</li>
                    <li>✓ <strong>Tabela de Planos de Assinatura</strong> (Gratuito, Básico, etc.)</li>
                    <li>✓ Estrutura de colunas Kanban e tags do sistema</li>
                  </ul>
                </div>
              </div>

              {/* Box de Exclusão */}
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-extrabold text-red-900 dark:text-red-200">
                    O que será APAGADO permanentemente:
                  </h4>
                  <ul className="mt-1 space-y-0.5 text-red-700 dark:text-red-400">
                    <li>✕ Todas as empresas/clientes criadas durante os testes</li>
                    <li>✕ Todos os usuários, donos e membros não-master</li>
                    <li>✕ Todos os quadros, cards, tarefas e fichas técnicas secundárias</li>
                    <li>✕ Notificações e histórico de atividades de teste</li>
                  </ul>
                </div>
              </div>

              {/* Confirmação com digitação */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Para confirmar, digite a palavra <span className="text-red-600 font-mono">RESETAR</span> no campo abaixo:
                </label>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="Digite RESETAR em maiúsculas..."
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={confirmationInput.trim().toUpperCase() !== 'RESETAR' || isResetting}
                  onClick={handleExecuteInteractiveReset}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-98"
                >
                  {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Confirmar Limpeza e Reset para Produção</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Você pode executar este comando SQL diretamente no <strong>SQL Editor</strong> do painel do seu projeto Supabase. Ele utiliza transação segura (`BEGIN ... COMMIT`) e cascateamento respeitando chaves estrangeiras.
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 select-all leading-relaxed">
                  {SQL_SCRIPT}
                </pre>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-slate-700"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300">
                <strong>Dica de Autenticação:</strong> O arquivo completo também foi salvo em <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-[11px]">/supabase-reset-test-data.sql</code>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
