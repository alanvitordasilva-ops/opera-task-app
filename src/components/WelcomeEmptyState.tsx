import React from 'react';
import { Plus, LayoutGrid, Sparkles, CheckCircle2, Columns, Users, ArrowRight } from 'lucide-react';

interface WelcomeEmptyStateProps {
  onCreateFirstBoard: () => void;
  onLoadSampleBoard: () => void;
  workspaceName?: string;
}

export const WelcomeEmptyState: React.FC<WelcomeEmptyStateProps> = ({
  onCreateFirstBoard,
  onLoadSampleBoard,
  workspaceName,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-12 px-4 animate-fadeIn">
      {/* Banner Principal de Boas-vindas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-12 shadow-sm text-center relative overflow-hidden">
        {/* Fundo decorativo sutil com as cores da identidade */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-[#34B1AC]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-[#173653]/10 blur-3xl pointer-events-none" />

        {/* Ícone da Marca com Moldura Circular Suave */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 shadow-lg shadow-slate-900/5 mb-6 flex items-center justify-center">
          <img
            src="/pwa-192x192.png"
            alt="OperaTask Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* 1. Mensagem de Boas-vindas */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#173653] dark:text-white tracking-tight">
          Bem-vindo ao OperaTask
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
          Organize suas tarefas e projetos de forma simples, moderna e eficiente{workspaceName ? ` no workspace "${workspaceName}"` : ''}.
        </p>

        {/* 2. Opções Claras para o Usuário Começar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          {/* Botão Principal de Destaque: Verde-água */}
          <button
            type="button"
            onClick={onCreateFirstBoard}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-[0.98] shadow-lg shadow-[#34B1AC]/25 hover:shadow-[#34B1AC]/35 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Criar meu primeiro quadro</span>
          </button>

          {/* Opção Secundária: Ver um exemplo rápido */}
          <button
            type="button"
            onClick={onLoadSampleBoard}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-bold text-sm text-[#173653] dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/60 dark:border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-[#34B1AC]" />
            <span>Ver um exemplo rápido</span>
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onCreateFirstBoard}
            className="text-xs text-slate-500 hover:text-[#173653] dark:hover:text-[#34B1AC] underline-offset-4 hover:underline transition-colors"
          >
            Ou começar do zero definindo suas próprias colunas
          </button>
        </div>

        {/* 3. Passos Simples de Orientação */}
        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
            Como funciona em 4 passos rápidos
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Passo 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-[#173653]/10 dark:bg-[#173653]/40 text-[#173653] dark:text-[#34B1AC] font-black text-xs flex items-center justify-center mb-3">
                  1
                </div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                  <LayoutGrid className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Crie um quadro</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Defina o nome do seu projeto, selecione uma cor e escolha um ícone identificador.
                </p>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-[#34B1AC]/15 dark:bg-[#34B1AC]/30 text-[#173653] dark:text-[#34B1AC] font-black text-xs flex items-center justify-center mb-3">
                  2
                </div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                  <Columns className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Adicione colunas</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Estruture suas etapas de trabalho (ex: A Fazer, Em Andamento, Revisão e Concluído).
                </p>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-[#173653]/10 dark:bg-[#173653]/40 text-[#173653] dark:text-[#34B1AC] font-black text-xs flex items-center justify-center mb-3">
                  3
                </div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Crie suas tarefas</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Defina prioridades, datas de entrega, checklists de progresso e anexos de mídia.
                </p>
              </div>
            </div>

            {/* Passo 4 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-[#34B1AC]/15 dark:bg-[#34B1AC]/30 text-[#173653] dark:text-[#34B1AC] font-black text-xs flex items-center justify-center mb-3">
                  4
                </div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white mb-1">
                  <Users className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Convide sua equipe</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Atribua responsáveis e colabore em tempo real com controle seguro de permissões.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
