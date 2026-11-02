import React, { useState, useEffect, useRef } from 'react';
import { FichaTecnica, Ingrediente, UnidadeMedida } from '../types/index.ts';
import { StorageService } from '../services/storage.ts';
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  Info,
  ChevronDown,
  Search,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface FichaTecnicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaTecnica?: FichaTecnica | null;
  initialFicha?: FichaTecnica | null;
  taskTitle: string;
  onSave: (ficha: FichaTecnica) => void;
  onDelete?: () => void;
}

export const FichaTecnicaModal: React.FC<FichaTecnicaModalProps> = ({
  isOpen,
  onClose,
  fichaTecnica: propFicha,
  initialFicha,
  taskTitle,
  onSave,
  onDelete,
}) => {
  const effectiveFicha = propFicha !== undefined ? propFicha : initialFicha;
  const [nomeItem, setNomeItem] = useState('');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [rendimento, setRendimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<{ nomeItem?: string; ingredientes?: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoFilledToast, setAutoFilledToast] = useState<string | null>(null);

  // Busca Inteligente de Fichas Técnicas salvas no banco de dados
  const [savedFichas, setSavedFichas] = useState<FichaTecnica[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Carregar fichas salvas no banco
  useEffect(() => {
    if (isOpen) {
      try {
        const list = StorageService.getFichasTecnicas();
        setSavedFichas(list);
      } catch {
        setSavedFichas([]);
      }
    }
  }, [isOpen]);

  // Fechar dropdown de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inicializar estado quando o modal abre ou initialFicha muda
  useEffect(() => {
    if (isOpen) {
      if (effectiveFicha) {
        setNomeItem(effectiveFicha.nomeItem || '');
        setIngredientes(
          effectiveFicha.ingredientes && effectiveFicha.ingredientes.length > 0
            ? effectiveFicha.ingredientes.map((ing) => ({ ...ing }))
            : [createEmptyIngrediente()]
        );
        setRendimento(effectiveFicha.rendimento || '');
        setObservacoes(effectiveFicha.observacoes || '');
      } else {
        // Novo item baseado no título da tarefa
        setNomeItem(taskTitle || '');
        setIngredientes([createEmptyIngrediente()]);
        setRendimento('');
        setObservacoes('');
      }
      setErrors({});
      setIsDirty(false);
      setShowUnsavedWarning(false);
      setShowSavedToast(false);
      setShowDeleteConfirm(false);
      setShowSuggestions(false);
      setAutoFilledToast(null);
    }
  }, [isOpen, effectiveFicha, taskTitle]);

  if (!isOpen) return null;

  function createEmptyIngrediente(unidade: UnidadeMedida = 'Kg'): Ingrediente {
    return {
      id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nome: '',
      quantidade: '',
      unidade,
    };
  }

  // Filtragem de sugestões pela primeira letra digitada
  const matchingSuggestions =
    nomeItem.trim().length >= 1
      ? savedFichas.filter((f) =>
          f.nomeItem.toLowerCase().includes(nomeItem.trim().toLowerCase())
        )
      : [];

  const handleSelectSuggestion = (suggestion: FichaTecnica) => {
    setNomeItem(suggestion.nomeItem);
    if (suggestion.ingredientes && suggestion.ingredientes.length > 0) {
      setIngredientes(
        suggestion.ingredientes.map((ing) => ({
          id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nome: ing.nome,
          quantidade: ing.quantidade,
          unidade: ing.unidade,
        }))
      );
    }
    if (suggestion.rendimento) {
      setRendimento(suggestion.rendimento);
    }
    if (suggestion.observacoes) {
      setObservacoes(suggestion.observacoes);
    }

    setShowSuggestions(false);
    setIsDirty(true);
    setErrors({});
    setAutoFilledToast(`Ficha Técnica "${suggestion.nomeItem}" carregada com sucesso!`);
    setTimeout(() => setAutoFilledToast(null), 3000);
  };

  const handleAddIngrediente = () => {
    setIngredientes((prev) => [...prev, createEmptyIngrediente()]);
    setIsDirty(true);
  };

  const handleRemoveIngrediente = (id: string) => {
    setIngredientes((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.length > 0 ? filtered : [createEmptyIngrediente()];
    });
    setIsDirty(true);
  };

  const handleIngredienteChange = (
    id: string,
    field: 'nome' | 'quantidade' | 'unidade',
    value: string
  ) => {
    setIngredientes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setIsDirty(true);
  };

  const validate = (): boolean => {
    const newErrors: { nomeItem?: string; ingredientes?: string } = {};

    if (!nomeItem.trim()) {
      newErrors.nomeItem = 'O Nome do Item é obrigatório.';
    }

    // Verificar se há pelo menos 1 ingrediente preenchido
    const filledIngredients = ingredientes.filter(
      (ing) => ing.nome.trim() || ing.quantidade.trim()
    );

    if (filledIngredients.length === 0) {
      newErrors.ingredientes = 'Adicione pelo menos 1 ingrediente à ficha técnica.';
    } else {
      // Validar se ingredientes incompletos foram preenchidos
      const hasIncomplete = filledIngredients.some(
        (ing) => !ing.nome.trim() || !ing.quantidade.trim()
      );
      if (hasIncomplete) {
        newErrors.ingredientes = 'Preencha o nome e a quantidade de todos os ingredientes listados.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validate()) {
      return;
    }

    // Filtrar apenas ingredientes válidos com nome e quantidade
    const validIngredients: Ingrediente[] = ingredientes
      .filter((ing) => ing.nome.trim() && ing.quantidade.trim())
      .map((ing) => ({
        id: ing.id,
        nome: ing.nome.trim(),
        quantidade: ing.quantidade.trim(),
        unidade: ing.unidade,
      }));

    const fichaToSave: FichaTecnica = {
      id: effectiveFicha?.id || initialFicha?.id || `ficha-${Date.now()}`,
      nomeItem: nomeItem.trim(),
      ingredientes: validIngredients,
      rendimento: rendimento.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva e persiste na base de dados (StorageService)
    const saved = StorageService.saveFichaTecnica(fichaToSave, true);

    // 2. Salva e vincula ao card
    onSave(saved);

    setIsDirty(false);
    setShowSavedToast(true);

    setTimeout(() => {
      onClose();
    }, 450);
  };

  // Exclusão de Ficha Técnica
  const handleConfirmDelete = () => {
    const identifier = effectiveFicha?.id || nomeItem.trim();
    if (identifier) {
      StorageService.deleteFichaTecnica(identifier);
    }
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
    setIsDirty(false);
    onClose();
  };

  // Bloqueio de saída sem salvar
  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedWarning(false);
    setIsDirty(false);
    onClose();
  };

  // Totais rápidos
  const totalKg = ingredientes.reduce((acc, ing) => {
    if (ing.unidade === 'Kg') {
      const parsed = parseFloat(ing.quantidade.replace(',', '.'));
      return isNaN(parsed) ? acc : acc + parsed;
    }
    return acc;
  }, 0);

  const totalLitros = ingredientes.reduce((acc, ing) => {
    if (ing.unidade === 'Litros') {
      const parsed = parseFloat(ing.quantidade.replace(',', '.'));
      return isNaN(parsed) ? acc : acc + parsed;
    }
    return acc;
  }, 0);

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-tecnica-title"
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleAttemptClose();
          }
        }}
      >
        <div
          className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho da Ficha Técnica */}
          <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-[#173653] to-[#1f4a73] text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-inner">
                <FileSpreadsheet className="w-5 h-5 text-[#34B1AC]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="ficha-tecnica-title"
                    className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2"
                  >
                    Ficha Técnica do Item
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34B1AC]/25 text-[#34B1AC] border border-[#34B1AC]/40">
                    Produção & Receita
                  </span>
                  {isDirty && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                      Alterações não salvas
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 truncate max-w-md">
                  {taskTitle ? `Card: "${taskTitle}"` : 'Cadastro e controle de ingredientes'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Visual: Notificações de Sucesso ou Preenchimento */}
          {showSavedToast && (
            <div className="px-6 py-2.5 bg-emerald-600 text-white flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ficha Técnica salva com sucesso e persistida no banco de dados!</span>
              </div>
            </div>
          )}

          {autoFilledToast && (
            <div className="px-6 py-2.5 bg-teal-600 text-white flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{autoFilledToast}</span>
              </div>
            </div>
          )}

          {/* Formulário / Corpo */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* 1. Nome do Item com Busca Inteligente */}
            <div
              ref={searchContainerRef}
              className="relative p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#173653] dark:text-slate-200 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#34B1AC]" />
                  <span>Nome do Item / Produto *</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Digite para buscar ou criar nova ficha
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={nomeItem}
                  onFocus={() => {
                    if (nomeItem.trim().length >= 1) setShowSuggestions(true);
                  }}
                  onChange={(e) => {
                    setNomeItem(e.target.value);
                    setIsDirty(true);
                    setShowSuggestions(true);
                    if (errors.nomeItem) setErrors((prev) => ({ ...prev, nomeItem: undefined }));
                  }}
                  placeholder="Ex: Pão Francês Tradicional, Bolo de Cenoura, Massa de Pizza..."
                  className={`w-full px-4 py-2.5 text-sm font-semibold rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC] transition-all ${
                    errors.nomeItem
                      ? 'border-red-500 ring-2 ring-red-400/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />

                {/* Dropdown de Busca Inteligente Flutuante */}
                {showSuggestions && matchingSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150 max-h-64 overflow-y-auto">
                    <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#34B1AC]" />
                        <span>Fichas Técnicas encontradas no banco ({matchingSuggestions.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Clique para preencher
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {matchingSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id || suggestion.nomeItem}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full p-3 text-left hover:bg-teal-50/70 dark:hover:bg-teal-950/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                                {suggestion.nomeItem}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                                {suggestion.ingredientes?.length || 0} ingredientes
                              </span>
                            </div>
                            {suggestion.ingredientes && suggestion.ingredientes.length > 0 && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {suggestion.ingredientes
                                  .slice(0, 3)
                                  .map((i) => `${i.nome} (${i.quantidade} ${i.unidade})`)
                                  .join(', ')}
                                {suggestion.ingredientes.length > 3 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Usar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {errors.nomeItem && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.nomeItem}</span>
                </p>
              )}
            </div>

            {/* 2. Lista de Ingredientes com Kg ou Litros */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#34B1AC]" />
                    <span>Ingredientes da Ficha Técnica ({ingredientes.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Especifique a quantidade e selecione a unidade de medida (<strong>Kg</strong> ou <strong>Litros</strong>).
                  </p>
                </div>

                {/* Resumo de Totais */}
                {(totalKg > 0 || totalLitros > 0) && (
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    {totalKg > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Total: {totalKg.toFixed(2).replace(/\.00$/, '')} Kg
                      </span>
                    )}
                    {totalLitros > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Total: {totalLitros.toFixed(2).replace(/\.00$/, '')} Litros
                      </span>
                    )}
                  </div>
                )}
              </div>

              {errors.ingredientes && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errors.ingredientes}</span>
                </div>
              )}

              {/* Cabeçalho da Tabela em telas maiores */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                <div className="col-span-6">Ingrediente *</div>
                <div className="col-span-3">Quantidade *</div>
                <div className="col-span-2">Unidade</div>
                <div className="col-span-1 text-right">Ação</div>
              </div>

              {/* Linhas de Ingredientes */}
              <div className="space-y-2.5">
                {ingredientes.map((ing, index) => (
                  <div
                    key={ing.id}
                    className="p-3 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 sm:items-center"
                  >
                    {/* Nome do Ingrediente */}
                    <div className="sm:col-span-6">
                      <label className="block sm:hidden text-[11px] font-semibold text-slate-500 mb-1">
                        Ingrediente #{index + 1}
                      </label>
                      <input
                        type="text"
                        required
                        value={ing.nome}
                        onChange={(e) =>
                          handleIngredienteChange(ing.id, 'nome', e.target.value)
                        }
                        placeholder="Ex: Farinha de trigo, Açúcar, Leite..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC]"
                      />
                    </div>

                    {/* Quantidade */}
                    <div className="sm:col-span-3">
                      <label className="block sm:hidden text-[11px] font-semibold text-slate-500 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={ing.quantidade}
                        onChange={(e) =>
                          handleIngredienteChange(ing.id, 'quantidade', e.target.value)
                        }
                        placeholder="Ex: 2.5 ou 10"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC]"
                      />
                    </div>

                    {/* Unidade: Botões de Alternância Kg / Litros */}
                    <div className="sm:col-span-2">
                      <label className="block sm:hidden text-[11px] font-semibold text-slate-500 mb-1">
                        Unidade
                      </label>
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => handleIngredienteChange(ing.id, 'unidade', 'Kg')}
                          className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            ing.unidade === 'Kg'
                              ? 'bg-[#173653] text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Kg
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIngredienteChange(ing.id, 'unidade', 'Litros')}
                          className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            ing.unidade === 'Litros'
                              ? 'bg-[#34B1AC] text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Litros
                        </button>
                      </div>
                    </div>

                    {/* Botão de Remover Ingrediente */}
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngrediente(ing.id)}
                        disabled={ingredientes.length === 1 && !ing.nome && !ing.quantidade}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Remover ingrediente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão + Adicionar Ingrediente */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddIngrediente}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#34B1AC] text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#34B1AC] dark:hover:text-[#34B1AC] bg-white/50 dark:bg-slate-850 hover:bg-[#34B1AC]/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#34B1AC]" />
                  <span>+ Adicionar Ingrediente</span>
                </button>
              </div>
            </div>

            {/* 3. Rendimento e Observações Técnicas (Opcionais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rendimento Base da Receita (Opcional)
                </label>
                <input
                  type="text"
                  value={rendimento}
                  onChange={(e) => {
                    setRendimento(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: 50 unidades, 10 porções, 1 lote de 15 Kg..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Observações de Preparo / Produção
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => {
                    setObservacoes(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: Temperatura de forno 180°C, tempo de mistura 12 min..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#34B1AC]"
                />
              </div>
            </div>

            {/* Dica de usabilidade */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
              <p className="leading-relaxed">
                Após preencher e salvar a Ficha Técnica, ela fica permanentemente vinculada ao card e armazenada no banco de dados. Em seguida, utilize o botão <strong>Produzir</strong> para calcular automaticamente as proporções necessárias para qualquer lote.
              </p>
            </div>
          </div>

          {/* Rodapé / Botões de Ação */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div>
              {/* Botão de Excluir Ficha Técnica */}
              {(effectiveFicha || (onDelete && nomeItem.trim())) && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Excluir Ficha Técnica"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Excluir Ficha Técnica</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-98 shadow-md shadow-[#34B1AC]/30 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Ficha Técnica</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Ficha Técnica */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/60 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tem certeza que deseja excluir esta Ficha Técnica?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  A receita de &quot;{nomeItem}&quot; e seus {ingredientes.length} ingredientes serão removidos deste card e do banco de dados do OperaTask.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 shadow-sm transition-all cursor-pointer"
              >
                Sim, Excluir Ficha Técnica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação quando o usuário tenta sair sem salvar */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Alterações não salvas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Você preencheu ou alterou a Ficha Técnica. O salvamento é obrigatório para não perder os ingredientes informados.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  handleSave();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações Agora</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Continuar Editando
              </button>

              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="w-full py-1.5 px-4 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Descartar alterações e sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
