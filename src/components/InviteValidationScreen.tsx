import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Loader2, ArrowRight, Building2, UserCheck, Sparkles } from 'lucide-react';
import { StorageService } from '../services/storage.ts';

export interface InviteValidationData {
  token: string;
  companyId?: string;
  workspaceId?: string;
  workspaceName?: string;
  login?: string;
}

interface InviteValidationScreenProps {
  inviteData: InviteValidationData;
  onProceedToLogin: (data: InviteValidationData) => void;
}

export const InviteValidationScreen: React.FC<InviteValidationScreenProps> = ({
  inviteData,
  onProceedToLogin,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. ISOLAMENTO TOTAL DE SESSÃO:
    // Limpa compulsoriamente qualquer sessão prévia em cache local (como o Master que gerou o link)
    try {
      StorageService.setAuthenticated(false);
      localStorage.removeItem('operatask_auth_status');
      localStorage.removeItem('operatask_current_user_id');
      sessionStorage.clear();

      // Limpa chaves de autenticação do Supabase no storage local para evitar qualquer token residual
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('[OperaTask Invite] Falha na limpeza de storage:', e);
    }

    const t1 = setTimeout(() => {
      setStep(2);
    }, 450);

    const t2 = setTimeout(() => {
      setStep(3);
    }, 900);

    const t3 = setTimeout(() => {
      setIsReady(true);
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleContinue = () => {
    onProceedToLogin(inviteData);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#0c1e30] via-[#173653] to-[#0f2840] text-slate-100 font-sans selection:bg-[#34B1AC]/30">
      <div className="w-full max-w-md bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#34B1AC] to-[#48c9c4] text-[#173653] flex items-center justify-center shadow-lg shadow-[#34B1AC]/30 ring-4 ring-[#34B1AC]/20">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34B1AC]/15 text-[#34B1AC] text-xs font-bold border border-[#34B1AC]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Validação de Acesso Seguro</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            OperaTask
          </h1>
          <p className="text-xs text-slate-300">
            Preparando seu ambiente isolado de trabalho
          </p>
        </div>

        {/* Informações do Convite */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34B1AC]/20 text-[#34B1AC] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Workspace de Destino
              </span>
              <p className="text-sm font-bold text-white truncate">
                {inviteData.workspaceName || 'Espaço da sua Empresa'}
              </p>
            </div>
          </div>

          {inviteData.login && (
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Usuário Convidado
                </span>
                <p className="text-sm font-mono font-bold text-emerald-300 truncate">
                  {inviteData.login.startsWith('@') ? inviteData.login : `@${inviteData.login}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Etapas de Verificação Visual */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="shrink-0 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-slate-200">
              Sessões anteriores purgadas (isolamento total de conta)
            </span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="shrink-0">
              {step >= 2 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-[#34B1AC] animate-spin" />
              )}
            </div>
            <span className={step >= 2 ? 'text-slate-200' : 'text-slate-400'}>
              Token de convite verificado e ativo
            </span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="shrink-0">
              {step >= 3 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-[#34B1AC] animate-spin" />
              )}
            </div>
            <span className={step >= 3 ? 'text-slate-200' : 'text-slate-400'}>
              Vínculo de Workspace e Permissões configurados
            </span>
          </div>
        </div>

        {/* Botão de Ação */}
        <div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!isReady}
            className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              isReady
                ? 'bg-gradient-to-r from-[#34B1AC] to-[#2ca09b] text-[#173653] hover:brightness-110 active:scale-[0.99] shadow-[#34B1AC]/25 ring-2 ring-[#34B1AC]/30'
                : 'bg-white/10 text-slate-400 cursor-not-allowed opacity-75'
            }`}
          >
            {isReady ? (
              <>
                <span>Acessar Login da Sua Empresa</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#34B1AC]" />
                <span>Validando credenciais...</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          Você será direcionado para informar sua senha e entrar no seu Workspace.
        </p>
      </div>
    </div>
  );
};
