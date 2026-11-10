import React, { useState } from 'react';
import {
  SubscriptionPlan,
  PlanId,
  PlanModulesConfig,
  DEFAULT_SUBSCRIPTION_PLANS,
} from '../types/index.ts';
import { StorageService } from '../services/storage.ts';
import {
  CreditCard,
  Edit2,
  Users,
  Layers,
  ShieldCheck,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  FileSpreadsheet,
  Zap,
  Award,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface MasterPlansTabProps {
  onShowToast: (params: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const MasterPlansTab: React.FC<MasterPlansTabProps> = ({ onShowToast }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() =>
    StorageService.getSubscriptionPlans()
  );
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    // Clona o plano para edição segura
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setNewFeatureText('');
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    if (!editingPlan.name.trim()) {
      onShowToast({ type: 'error', message: 'O nome do plano é obrigatório.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedList = plans.map((p) =>
        p.id === editingPlan.id ? { ...editingPlan, updatedAt: new Date().toISOString() } : p
      );
      setPlans(updatedList);
      StorageService.saveSubscriptionPlans(updatedList, true);

      onShowToast({
        type: 'success',
        message: `Parâmetros do plano ${editingPlan.name} atualizados e sincronizados em tempo real!`,
      });
      setEditingPlan(null);
    } catch (err: any) {
      onShowToast({
        type: 'error',
        message: err.message || 'Erro ao salvar alterações do plano.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja restaurar os 4 planos para os valores e limites padrão de fábrica? Todas as customizações feitas serão substituídas.'
    );
    if (!confirmed) return;

    setPlans(DEFAULT_SUBSCRIPTION_PLANS);
    StorageService.saveSubscriptionPlans(DEFAULT_SUBSCRIPTION_PLANS, true);
    onShowToast({
      type: 'success',
      message: 'Planos restaurados com sucesso para as configurações originais!',
    });
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeatureText.trim()],
    });
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    const nextFeatures = [...editingPlan.features];
    nextFeatures.splice(index, 1);
    setEditingPlan({ ...editingPlan, features: nextFeatures });
  };

  const toggleModule = (moduleKey: keyof PlanModulesConfig) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      modules: {
        ...editingPlan.modules,
        [moduleKey]: !editingPlan.modules[moduleKey],
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Descrição e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#173653] dark:text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#34B1AC]" />
              Gestão de Tiers & Limites de Assinatura
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Multi-tenant Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure livremente os limites de usuários, quadros permitidos, preços e módulos liberados para cada tier do OperaTask. As alterações surtem efeito imediato para todas as empresas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
          title="Restaurar planos originais"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      {/* Grid com os 4 Planos Configuráveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isFree = plan.priceMonthly === 0;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-white dark:bg-slate-800/90 p-5 flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${
                plan.popular
                  ? 'border-[#34B1AC] dark:border-[#34B1AC] ring-2 ring-[#34B1AC]/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700/80 shadow-xs'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#34B1AC] text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-bl-xl tracking-wider shadow-xs">
                  Mais Popular
                </div>
              )}

              <div>
                {/* Nome e Badge */}
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-[#173653] dark:text-white">
                    {plan.name}
                  </h4>
                  {plan.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px] line-clamp-2">
                  {plan.description}
                </p>

                {/* Preço */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/70">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#173653] dark:text-white">
                      {isFree ? 'R$ 0' : `R$ ${plan.priceMonthly}`}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      /mês
                    </span>
                  </div>
                  {!isFree && plan.priceAnnual > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      ou R$ {plan.priceAnnual}/ano (à vista)
                    </span>
                  )}
                </div>

                {/* Parâmetros Críticos / Limites */}
                <div className="mt-4 space-y-2 py-3 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-[#34B1AC]" />
                      Limite de Usuários:
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {plan.maxUsers >= 999 ? 'Ilimitado' : `Até ${plan.maxUsers}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      Limite de Quadros:
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {plan.maxBoards >= 999 ? 'Ilimitado' : `Até ${plan.maxBoards}`}
                    </span>
                  </div>

                  {plan.stripeMonthlyPriceId && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[10px]">
                      <span className="text-slate-500 truncate max-w-[120px]" title={plan.stripeMonthlyPriceId}>
                        Stripe: {plan.stripeMonthlyPriceId}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Integrado</span>
                    </div>
                  )}
                </div>

                {/* Módulos Habilitados (Pílulas visuais) */}
                <div className="mt-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Módulos Liberados:
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      {plan.modules.advancedReports ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={plan.modules.advancedReports ? 'font-medium' : 'text-slate-400 line-through'}>
                        Relatórios Avançados
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      {plan.modules.customAttachments ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={plan.modules.customAttachments ? 'font-medium' : 'text-slate-400 line-through'}>
                        Uploads e Anexos Ilimitados
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      {plan.modules.automations ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={plan.modules.automations ? 'font-medium' : 'text-slate-400 line-through'}>
                        Automações de Status
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      {plan.modules.unlimitedFichas ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={plan.modules.unlimitedFichas ? 'font-medium' : 'text-slate-400 line-through'}>
                        Fichas Técnicas Ilimitadas
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      {plan.modules.prioritySupport ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={plan.modules.prioritySupport ? 'font-medium' : 'text-slate-400 line-through'}>
                        Suporte VIP WhatsApp
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Edição */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(plan)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#173653] text-slate-700 hover:text-white dark:bg-slate-700 dark:hover:bg-[#34B1AC] dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Parâmetros</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Interno de Edição do Plano */}
      {editingPlan && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-[#173653] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-[#11273c] dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[#34B1AC]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Editar Plano: {editingPlan.name}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Ajuste os preços, limites e funcionalidades operacionais
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Nome e Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Badge de Destaque
                  </label>
                  <input
                    type="text"
                    value={editingPlan.badge}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    placeholder="Ex: Mais Popular, Iniciante..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Plano
                </label>
                <input
                  type="text"
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Resumo exibido nos cards da tela de planos..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              {/* Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingPlan.priceMonthly}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, priceMonthly: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">0 = Plano Gratuito</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Preço Anual (R$ à vista)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingPlan.priceAnnual}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, priceAnnual: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Cobrança única anual</span>
                </div>
              </div>

              {/* Limites Operacionais (Requisito Crítico) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    Limite Máximo de Usuários *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    required
                    value={editingPlan.maxUsers}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, maxUsers: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Bloqueia convites quando a equipe atinge esse total.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Limite Máximo de Quadros (Boards) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    required
                    value={editingPlan.maxBoards}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, maxBoards: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#34B1AC]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Bloqueia criação de novos quadros após o limite.
                  </span>
                </div>
              </div>

              {/* Stripe Price IDs */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#34B1AC]" />
                    IDs de Preço do Stripe (Checkout Real)
                  </span>
                  <span className="text-[10px] text-slate-400">Opcional para modo sandbox</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                      Stripe Monthly Price ID
                    </label>
                    <input
                      type="text"
                      value={editingPlan.stripeMonthlyPriceId || ''}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, stripeMonthlyPriceId: e.target.value.trim() })
                      }
                      placeholder="price_1P..."
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                      Stripe Annual Price ID
                    </label>
                    <input
                      type="text"
                      value={editingPlan.stripeAnnualPriceId || ''}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, stripeAnnualPriceId: e.target.value.trim() })
                      }
                      placeholder="price_1P..."
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    />
                  </div>
                </div>
              </div>

              {/* Módulos e Funcionalidades (Toggles) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Módulos e Recursos Liberados no Plano
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.advancedReports}
                      onChange={() => toggleModule('advancedReports')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Relatórios Avançados
                      </span>
                      <span className="text-[10px] text-slate-500">Métricas de tempo e produtividade</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.customAttachments}
                      onChange={() => toggleModule('customAttachments')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Uploads e Mídias Ilimitadas
                      </span>
                      <span className="text-[10px] text-slate-500">Fotos, vídeos e arquivos nos cards</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.automations}
                      onChange={() => toggleModule('automations')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Automações de Status
                      </span>
                      <span className="text-[10px] text-slate-500">Movimentação automática de cards</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.unlimitedFichas}
                      onChange={() => toggleModule('unlimitedFichas')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Fichas Técnicas com Custos
                      </span>
                      <span className="text-[10px] text-slate-500">Cálculo de custos e receitas</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.exportData}
                      onChange={() => toggleModule('exportData')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Exportação de Dados
                      </span>
                      <span className="text-[10px] text-slate-500">Downloads em PDF e planilhas</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750">
                    <input
                      type="checkbox"
                      checked={editingPlan.modules.prioritySupport}
                      onChange={() => toggleModule('prioritySupport')}
                      className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Suporte VIP via WhatsApp
                      </span>
                      <span className="text-[10px] text-slate-500">Atendimento prioritário pela equipe</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lista de Features Textuais (Bullets) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Destaques Exibidos no Card (Bullets)
                </label>

                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  {editingPlan.features.map((feat, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 text-xs">
                      <span className="text-slate-700 dark:text-slate-200 flex-1 truncate">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="Adicionar novo item de destaque..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#34B1AC]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Opções de Destaque */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.popular}
                    onChange={(e) => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                    className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                  />
                  <span>Destaque "Mais Popular"</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isActive}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#34B1AC] rounded border-slate-300 focus:ring-[#34B1AC]"
                  />
                  <span>Plano Ativo para Novas Empresas</span>
                </label>
              </div>

              {/* Footer Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#173653] hover:bg-[#234d74] active:scale-98 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações do Plano</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
