import React, { useState, useMemo } from 'react';
import {
  FichaTecnica,
  Ingrediente,
  UnidadeMedida,
  ProductionRecord,
  ProductionIngredientCalculation,
  User,
} from '../types/index.ts';
import {
  X,
  Factory,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  History,
  Info,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaTecnica: FichaTecnica | null | undefined;
  taskId: string;
  taskTitle: string;
  currentUser?: User;
  productionRecords?: ProductionRecord[];
  onConfirmProduction: (record: ProductionRecord) => void;
}

export const ProductionModal: React.FC<ProductionModalProps> = ({
  isOpen,
  onClose,
  fichaTecnica,
  taskId,
  taskTitle,
  currentUser,
  productionRecords = [],
  onConfirmProduction,
}) => {
  // Quantidade que o usuário deseja produzir
  const [quantidadeDesejadaStr, setQuantidadeDesejadaStr] = useState<string>('1');
  // Unidade de produção (Kg, Litros, Unidades ou Porções)
  const [unidadeProducao, setUnidadeProducao] = useState<string>('Unidades');
  // Quantidade base de referência da receita (padrão: 1 lote/receita)
  const [quantidadeBaseStr, setQuantidadeBaseStr] = useState<string>('1');
  const [isBaseCustomizada, setIsBaseCustomizada] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [copiedList, setCopiedList] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'produce' | 'history'>('produce');

  // Parse numérico seguro com suporte a vírgula e ponto decimal
  const parseSafeNumber = (val: string): number => {
    if (!val) return 0;
    const clean = val.trim().replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Formatação em padrão brasileiro com até 3 casas decimais
  const formatNumberPTBR = (num: number): string => {
    if (isNaN(num)) return '0';
    // Arredondar para até 3 casas decimais
    const rounded = Math.round(num * 1000) / 1000;
    // Se for inteiro, exibe inteiro, caso contrário até 3 casas
    return rounded.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

  // Quantidade desejada e base como números
  const quantidadeDesejada = parseSafeNumber(quantidadeDesejadaStr);
  const quantidadeBase = parseSafeNumber(quantidadeBaseStr) > 0 ? parseSafeNumber(quantidadeBaseStr) : 1;

  // Fator multiplicador = Quantidade desejada ÷ Quantidade base da Ficha Técnica
  const fatorMultiplicador = useMemo(() => {
    if (quantidadeDesejada <= 0 || quantidadeBase <= 0) return 0;
    return quantidadeDesejada / quantidadeBase;
  }, [quantidadeDesejada, quantidadeBase]);

  // Cálculo proporcional de cada ingrediente
  const ingredientesCalculados = useMemo<ProductionIngredientCalculation[]>(() => {
    if (!fichaTecnica || !fichaTecnica.ingredientes) return [];

    return fichaTecnica.ingredientes.map((ing) => {
      const qtdOriginalNum = parseSafeNumber(ing.quantidade);
      const qtdCalculada = qtdOriginalNum * (fatorMultiplicador > 0 ? fatorMultiplicador : 0);
      return {
        ingredienteId: ing.id,
        nome: ing.nome,
        quantidadeOriginal: ing.quantidade,
        quantidadeCalculada: qtdCalculada,
        quantidadeFormatada: formatNumberPTBR(qtdCalculada),
        unidade: ing.unidade,
      };
    });
  }, [fichaTecnica, fatorMultiplicador]);

  // Totais acumulados
  const totais = useMemo(() => {
    let totalKg = 0;
    let totalLitros = 0;

    ingredientesCalculados.forEach((item) => {
      if (item.unidade === 'Kg') {
        totalKg += item.quantidadeCalculada;
      } else if (item.unidade === 'Litros') {
        totalLitros += item.quantidadeCalculada;
      }
    });

    return {
      totalKg: formatNumberPTBR(totalKg),
      totalLitros: formatNumberPTBR(totalLitros),
      totalItens: ingredientesCalculados.length,
    };
  }, [ingredientesCalculados]);

  // Se o modal não estiver aberto, não renderiza
  if (!isOpen) return null;

  // Validação e confirmação de produção
  const handleConfirm = () => {
    if (quantidadeDesejada <= 0) {
      setErrorMsg('Informe uma quantidade válida que deseja produzir (maior que zero).');
      return;
    }

    if (!fichaTecnica) {
      setErrorMsg('Ficha Técnica não encontrada.');
      return;
    }

    setErrorMsg('');

    const newRecord: ProductionRecord = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      taskId,
      taskTitle: taskTitle || fichaTecnica.nomeItem,
      nomeItem: fichaTecnica.nomeItem,
      quantidadeDesejada,
      unidadeProducao,
      quantidadeBase,
      fator: fatorMultiplicador,
      ingredientes: ingredientesCalculados,
      observacoes: observacoes.trim() || undefined,
      producedByUserId: currentUser?.id,
      producedByUserName: currentUser?.name || 'Usuário OperaTask',
      createdAt: new Date().toISOString(),
    };

    onConfirmProduction(newRecord);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  // Copiar lista de ingredientes para área de transferência
  const handleCopyList = () => {
    if (!fichaTecnica) return;
    const lines = [
      `📋 ORDEM DE PRODUÇÃO - ${fichaTecnica.nomeItem.toUpperCase()}`,
      `📦 Quantidade a Produzir: ${quantidadeDesejadaStr} ${unidadeProducao}`,
      `⚡ Fator da Receita: ${formatNumberPTBR(fatorMultiplicador)}x`,
      `📅 Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      currentUser?.name ? `👤 Responsável: ${currentUser.name}` : '',
      `\n--- INGREDIENTES PARA SEPARAÇÃO ---`,
      ...ingredientesCalculados.map(
        (ing, idx) => `${idx + 1}. [ ] ${ing.nome}: ${ing.quantidadeFormatada} ${ing.unidade} (Base: ${ing.quantidadeOriginal} ${ing.unidade})`
      ),
      `\n📊 Totais: ${totais.totalKg} Kg de sólidos | ${totais.totalLitros} Litros de líquidos`,
      observacoes ? `\n📝 Observações: ${observacoes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-teal-500/10 to-blue-500/10 dark:from-teal-950/40 dark:to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Ordem de Produção
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                  Cálculo Automático
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Item: <strong className="text-slate-800 dark:text-slate-200">{fichaTecnica?.nomeItem || taskTitle}</strong>
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

        {/* Abas de Navegação do Modal: Nova Produção vs Histórico */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
          <button
            type="button"
            onClick={() => setActiveTab('produce')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'produce'
                ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>Nova Produção</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Produção</span>
            {productionRecords.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold">
                {productionRecords.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback de Sucesso */}
        {isSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Produção registrada e card concluído!</span>
          </div>
        )}

        {/* Feedback de Erro */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Seção 1: Configuração da Quantidade a Produzir */}
          <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/70 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                1. Quantidade que deseja produzir <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsBaseCustomizada(!isBaseCustomizada)}
                className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Base da receita: {quantidadeBaseStr} {unidadeProducao}</span>
                {isBaseCustomizada ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Campo Quantidade Desejada */}
              <div className="sm:col-span-7">
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    autoFocus
                    required
                    value={quantidadeDesejadaStr}
                    onChange={(e) => {
                      setQuantidadeDesejadaStr(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Ex: 10 ou 2.5"
                    className="w-full text-lg sm:text-xl font-bold px-4 py-2.5 rounded-xl border-2 border-teal-500 dark:border-teal-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 shadow-xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">
                    {unidadeProducao}
                  </span>
                </div>
              </div>

              {/* Seletor de Unidade de Produção */}
              <div className="sm:col-span-5">
                <select
                  value={unidadeProducao}
                  onChange={(e) => setUnidadeProducao(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Unidades">Unidades (porções / peças)</option>
                  <option value="Kg">Kg (Quilos)</option>
                  <option value="Litros">Litros</option>
                  <option value="Lotes">Lotes / Receitas</option>
                  <option value="Caixas">Caixas</option>
                </select>
              </div>
            </div>

            {/* Ajuste avançado da Quantidade Base da Ficha Técnica (se a receita original render > 1) */}
            {isBaseCustomizada && (
              <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/40 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Rendimento base cadastrado na Ficha Técnica:</span>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={quantidadeBaseStr}
                      onChange={(e) => setQuantidadeBaseStr(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-bold text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-[11px] font-semibold">{unidadeProducao}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Fórmula: <strong>Fator = {quantidadeDesejadaStr || 0} ÷ {quantidadeBaseStr || 1} = {formatNumberPTBR(fatorMultiplicador)}x</strong>.
                  Cada ingrediente será multiplicado por este fator.
                </p>
              </div>
            )}

            {/* Resumo Dinâmico do Fator de Produção */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-800/60 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-slate-600 dark:text-slate-400">Fator de Proporção:</span>
                <span className="font-extrabold text-teal-700 dark:text-teal-300 text-sm">
                  {formatNumberPTBR(fatorMultiplicador)}x
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Produzir <strong>{quantidadeDesejadaStr || '0'} {unidadeProducao}</strong> de <strong>{fichaTecnica?.nomeItem}</strong>
              </div>
            </div>
          </div>

          {/* Seção 2: Ingredientes Necessários (Calculados Proporcionalmente) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Ingredientes Necessários ({ingredientesCalculados.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopyList}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 rounded-lg transition-colors"
                title="Copiar lista de ingredientes para área de transferência"
              >
                {copiedList ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Lista</span>
                  </>
                )}
              </button>
            </div>

            {/* Tabela de Ingredientes Calculados */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Ingrediente</th>
                    <th className="px-3.5 py-2.5 text-center">Ficha Base</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-teal-700 dark:text-teal-300">
                      Qtd. a Separar
                    </th>
                    <th className="px-3.5 py-2.5 text-center">Unidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ingredientesCalculados.map((item, idx) => (
                    <tr
                      key={item.ingredienteId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{item.nome}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {item.quantidadeOriginal} {item.unidade}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-bold font-mono text-xs border border-teal-200 dark:border-teal-800 shadow-2xs">
                          {item.quantidadeFormatada}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.unidade === 'Kg'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {item.unidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Rodapé da Tabela: Totais */}
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                  Totais Calculados:
                </span>
                <div className="flex items-center gap-3">
                  {parseFloat(totais.totalKg) > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Total Sólidos: {totais.totalKg} Kg
                    </span>
                  )}
                  {parseFloat(totais.totalLitros) > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Total Líquidos: {totais.totalLitros} Litros
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Observações / Identificação do Lote (Opcional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Observações da Produção (Opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Lote 04/2026 - Turno da manhã, entrega às 16h..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Seção 4: Histórico de Produções Anteriores deste Card */}
          {productionRecords.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-1"
              >
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Histórico de Produções Deste Card ({productionRecords.length})</span>
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="space-y-3 mt-2 max-h-60 overflow-y-auto pr-1">
                  {productionRecords.map((rec) => {
                    const dateObj = new Date(rec.createdAt);
                    const dayStr = String(dateObj.getDate()).padStart(2, '0');
                    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yearStr = dateObj.getFullYear();
                    const hoursStr = String(dateObj.getHours()).padStart(2, '0');
                    const minsStr = String(dateObj.getMinutes()).padStart(2, '0');
                    const formattedDateTime = `${dayStr}/${monthStr}/${yearStr} às ${hoursStr}:${minsStr}`;

                    return (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>{formattedDateTime}</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            Concluído
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-semibold">Produzido:</span>
                          <span className="font-bold text-teal-700 dark:text-teal-300 text-sm">
                            {rec.quantidadeDesejada} {rec.unidadeProducao}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Ingredientes utilizados:
                          </div>
                          {rec.ingredientes && rec.ingredientes.length > 0 ? (
                            <div className="space-y-1 pt-0.5">
                              {rec.ingredientes.map((ing) => (
                                <div
                                  key={ing.ingredienteId}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-700 dark:text-slate-300">
                                    • {ing.nome}:
                                  </span>
                                  <span className="font-bold font-mono text-teal-700 dark:text-teal-300">
                                    {ing.quantidadeFormatada} {ing.unidade}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Ingredientes da Ficha Técnica
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>
                            Responsável: <strong className="text-slate-700 dark:text-slate-300">{rec.producedByUserName || 'Usuário OperaTask'}</strong>
                          </span>
                          {rec.observacoes && (
                            <span className="italic truncate max-w-[180px]" title={rec.observacoes}>
                              "{rec.observacoes}"
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={quantidadeDesejada <= 0 || !fichaTecnica}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                quantidadeDesejada > 0 && fichaTecnica
                  ? 'bg-teal-600 hover:bg-teal-700 active:scale-98 hover:shadow-teal-600/25'
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>Confirmar Produção ({quantidadeDesejadaStr || '0'} {unidadeProducao})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
