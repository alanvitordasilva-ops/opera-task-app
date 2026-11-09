import React, { useState } from 'react';
import {
  ClientCompany,
  ClientPlan,
  PaymentStatus,
  PLAN_CONFIGS,
  normalizePlan,
  User,
} from '../types/index.ts';
import {
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  ChevronRight,
  Zap,
  Building,
  RefreshCw,
} from 'lucide-react';
import { StripeService } from '../services/stripeService.ts';

interface BillingPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: ClientCompany | null;
  currentUser: User;
  onClientUpdated: (updatedClient: ClientCompany) => void;
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const BillingPlansModal: React.FC<BillingPlansModalProps> = ({
  isOpen,
  onClose,
  currentClient,
  currentUser,
  onClientUpdated,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen || !currentClient) return null;

  const currentPlanKey = normalizePlan(currentClient.plan);

  const handleSelectPlan = async (targetPlanKey: 'trial' | 'basico' | 'profissional' | 'enterprise') => {
    if (targetPlanKey === currentPlanKey && currentClient.paymentStatus === 'paid') {
      onShowToast({
        type: 'info',
        message: 'Este já é o plano atualmente ativo da sua empresa.',
      });
      return;
    }

    setIsProcessing(targetPlanKey);

    try {
      const res = await StripeService.createCheckoutSession({
        planId: targetPlanKey,
        tenantId: currentClient.id,
        customerEmail: currentClient.ownerEmail || currentUser.email,
        companyName: currentClient.name,
      });

      if (res.success) {
        if (res.client) {
          onClientUpdated(res.client);
        } else {
          // Busca versão atualizada
          const updated = await StripeService.updateTenantBilling(currentClient.id, targetPlanKey, 'paid');
          if (updated) onClientUpdated(updated);
        }

        onShowToast({
          type: 'success',
          message: `Plano ${PLAN_CONFIGS[targetPlanKey].name} ativado com sucesso!`,
        });

        // Se for URL externa do Stripe real, redireciona
        if (res.mode === 'stripe' && res.url) {
          window.location.href = res.url;
          return;
        }
      } else {
        onShowToast({
          type: 'error',
          message: res.error || 'Não foi possível processar a assinatura.',
        });
      }
    } catch {
      onShowToast({
        type: 'error',
        message: 'Falha na comunicação com o provedor de pagamentos.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenBillingPortal = async () => {
    setIsProcessing('portal');
    try {
      const res = await StripeService.createPortalSession(
        currentClient.id,
        currentClient.stripeCustomerId
      );
      if (res.success && res.url) {
        onShowToast({
          type: 'info',
          message: 'Abrindo portal de autoatendimento da assinatura...',
        });
        if (res.mode === 'stripe') {
          window.location.href = res.url;
        } else {
          onShowToast({
            type: 'success',
            message: 'Portal de faturamento e cartões disponível (Modo Integrado).',
          });
        }
      }
    } catch {
      onShowToast({
        type: 'error',
        message: 'Erro ao abrir o portal de faturamento.',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSimulatePaymentStatus = async (status: PaymentStatus) => {
    const updated = await StripeService.updateTenantBilling(currentClient.id, currentClient.plan, status);
    if (updated) {
      onClientUpdated(updated);
      onShowToast({
        type: status === 'paid' ? 'success' : status === 'past_due' ? 'error' : 'info',
        message:
          status === 'paid'
            ? 'Pagamento regularizado e confirmado com sucesso!'
            : status === 'past_due'
            ? 'Status alterado para Em Atraso (Past Due). Bloqueio preventivo ativado.'
            : `Status de pagamento alterado para ${status}.`,
      });
    }
  };

  const availablePlans: Array<'trial' | 'basico' | 'profissional' | 'enterprise'> = [
    'trial',
    'basico',
    'profissional',
    'enterprise',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Cabeçalho do Modal */}
        <div className="bg-linear-to-r from-[#173653] to-[#1e486d] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#34B1AC] text-white">
                  Planos & Assinatura
                </span>
                <span className="text-xs text-white/70 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {currentClient.name}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Gerenciamento de Assinatura OperaTask
              </h2>
              <p className="text-sm text-white/80 mt-1 max-w-xl">
                Escolha o plano ideal para a operação da sua equipe com suporte a cobrança automática via Stripe e ativação imediata.
              </p>
            </div>

            {/* Status Atual do Cliente */}
            <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 text-right min-w-[200px]">
              <div className="text-xs text-white/70">Status da Conta</div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                {currentClient.paymentStatus === 'paid' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Ativo & Pago
                  </span>
                ) : currentClient.paymentStatus === 'trialing' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    <Clock className="w-3.5 h-3.5" />
                    Período Trial (Teste)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pagamento Pendente
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/60 mt-1">
                {currentClient.nextBillingDate
                  ? `Próxima renovação: ${new Date(currentClient.nextBillingDate).toLocaleDateString('pt-BR')}`
                  : `Até ${currentClient.maxUsers || 10} usuários`}
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de Pagamento Pendente / Vencimento */}
        {currentClient.paymentStatus === 'past_due' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Fatura em atraso (Past Due)
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Renove sua assinatura para manter todas as funcionalidades e acessos da equipe liberados.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectPlan(currentPlanKey)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Regularizar Agora
            </button>
          </div>
        )}

        {/* Conteúdo Principal: Grade de Planos */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Alternador de Ciclo */}
          <div className="flex items-center justify-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  billingCycle === 'yearly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Anual
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                  2 meses off
                </span>
              </button>
            </div>
          </div>

          {/* Cards dos Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availablePlans.map((planKey) => {
              const plan = PLAN_CONFIGS[planKey];
              const isCurrent = currentPlanKey === planKey;
              const isPopular = plan.popular;

              // Preço com desconto anual se aplicável
              const monthlyPrice = billingCycle === 'yearly' && plan.priceMonthly > 0
                ? Math.round(plan.priceMonthly * 0.83)
                : plan.priceMonthly;

              return (
                <div
                  key={planKey}
                  className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
                    isCurrent
                      ? 'border-[#34B1AC] bg-[#34B1AC]/5 dark:bg-[#34B1AC]/10 shadow-lg ring-2 ring-[#34B1AC]'
                      : isPopular
                      ? 'border-[#173653] dark:border-sky-600 shadow-md bg-white dark:bg-slate-800/80 hover:shadow-xl'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Badge de Destaque */}
                  {isCurrent ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#34B1AC] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                      Plano Atual
                    </div>
                  ) : isPopular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#173653] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                      {plan.badge}
                    </div>
                  ) : (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Preço */}
                    <div className="mt-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-slate-500">R$</span>
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {monthlyPrice}
                        </span>
                        <span className="text-xs text-slate-500">/mês</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {plan.maxUsers >= 9999 ? 'Usuários Ilimitados' : `Até ${plan.maxUsers} usuários`}
                      </div>
                    </div>

                    {/* Lista de Recursos */}
                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 flex-1 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#34B1AC] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Botão de Ação */}
                    <button
                      onClick={() => handleSelectPlan(planKey)}
                      disabled={isProcessing !== null || (isCurrent && currentClient.paymentStatus === 'paid')}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCurrent && currentClient.paymentStatus === 'paid'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          : isPopular || isCurrent
                          ? 'bg-[#34B1AC] hover:bg-[#2c9894] text-white shadow-sm'
                          : 'bg-[#173653] hover:bg-[#1f476d] text-white shadow-sm'
                      }`}
                    >
                      {isProcessing === planKey ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Processando...
                        </>
                      ) : isCurrent ? (
                        currentClient.paymentStatus === 'paid' ? (
                          'Plano Ativo'
                        ) : (
                          'Pagar Assinatura'
                        )
                      ) : plan.priceMonthly === 0 ? (
                        'Testar 14 Dias'
                      ) : (
                        <>
                          Assinar Plano
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seção Inferior: Gerenciamento Stripe e Ferramentas */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                <CreditCard className="w-5 h-5 text-[#34B1AC]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Portal de Faturamento & Pagamentos
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Altere seu cartão de crédito cadastrado, baixe faturas e recibos fiscais.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenBillingPortal}
                disabled={isProcessing === 'portal'}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isProcessing === 'portal' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Portal Stripe do Cliente
              </button>
            </div>
          </div>

          {/* Simulador de Estados (Apenas para Dono / Master testar) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-dashed border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Controle de Testes e Simulação de Cobrança (Ambiente Seguro)
              </span>
              <span className="text-[11px] text-slate-500">
                Simula eventos reais do webhook do Stripe
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSimulatePaymentStatus('paid')}
                className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ✓ Simular Pagamento Aprovado (Paid)
              </button>
              <button
                onClick={() => handleSimulatePaymentStatus('past_due')}
                className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ⚠ Simular Pagamento Atrasado (Past Due)
              </button>
              <button
                onClick={() => handleSimulatePaymentStatus('trialing')}
                className="px-3 py-1.5 bg-sky-100 dark:bg-sky-950/60 hover:bg-sky-200 text-sky-800 dark:text-sky-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                ⏳ Simular Período Trial (Trialing)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
