import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Paintbrush,
  Check,
  X,
  Pipette,
  Sparkles,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  COLOR_CATEGORIES,
  EXPANDED_PALETTE,
  getColorName,
  isLightColor,
} from '../utils/colors.ts';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  description?: string;
  defaultColor?: string;
  allowClear?: boolean;
  clearLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  showPaletteStrip?: boolean;
  quickPaletteCount?: number;
  disabled?: boolean;
  className?: string;
  popoverPlacement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  description,
  defaultColor,
  allowClear = false,
  clearLabel = 'Padrão',
  size = 'md',
  showPaletteStrip = true,
  quickPaletteCount = 5,
  disabled = false,
  className = '',
  popoverPlacement = 'bottom-left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customHex, setCustomHex] = useState(value || '#2563eb');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputColorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomHex(value || '#2563eb');
  }, [value]);

  // Atualizar coordenadas do popover em relação à tela com viewport safety
  const updateCoords = () => {
    if (!triggerBtnRef.current) return;
    const rect = triggerBtnRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(380, window.innerWidth - 24);
    const estimatedHeight = 450;

    let left = rect.left;
    if (popoverPlacement.includes('right') || left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(12, rect.right - popoverWidth);
    }
    // Garantir que não saia das bordas horizontais da tela
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));

    let top = rect.bottom + 8;
    // Se não houver espaço suficiente abaixo, posiciona acima
    if (top + estimatedHeight > window.innerHeight - 16 && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 8;
    }
    // Garantir que não saia das bordas verticais da tela
    top = Math.max(12, Math.min(top, window.innerHeight - estimatedHeight - 12));

    setPopoverCoords({ top, left });
  };

  // Recalcular posição ao abrir, dar scroll ou redimensionar a janela
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleWindowEvents = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, popoverPlacement]);

  const activeColor = hoveredColor || value || '#2563eb';
  const activeColorName = getColorName(activeColor);

  const filteredColors =
    selectedCategory === 'all'
      ? EXPANDED_PALETTE
      : EXPANDED_PALETTE.filter((c) => c.category === selectedCategory);

  const handleSelectColor = (hex: string, autoClose = true) => {
    onChange(hex);
    setCustomHex(hex);
    if (autoClose) {
      setIsOpen(false);
    }
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomHex(hex);
    onChange(hex);
  };

  // Cores de atalho rápido para a barra lateral/faixa
  const quickColors = EXPANDED_PALETTE.slice(0, quickPaletteCount).map((c) => c.hex);

  // Configurações de tamanho do botão
  const sizeClasses = {
    sm: {
      swatch: 'w-5 h-5 rounded-md',
      button: 'px-2 py-1 text-xs gap-1.5',
      icon: 'w-3 h-3',
      stripDot: 'w-4 h-4',
    },
    md: {
      swatch: 'w-7 h-7 rounded-xl',
      button: 'px-2.5 py-1.5 text-xs gap-2',
      icon: 'w-3.5 h-3.5',
      stripDot: 'w-6 h-6',
    },
    lg: {
      swatch: 'w-9 h-9 rounded-xl',
      button: 'px-3 py-2 text-sm gap-2.5',
      icon: 'w-4 h-4',
      stripDot: 'w-7 h-7',
    },
  }[size];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
          {description && (
            <span className="text-[11px] text-slate-400">{description}</span>
          )}
        </div>
      )}

      {/* Barra de Seleção Principal: Swatch Atual + Pincel + Faixa Rápida */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Botão de Disparo do Pincel */}
        <button
          ref={triggerBtnRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOpen) updateCoords();
            setIsOpen(!isOpen);
          }}
          className={`flex items-center rounded-xl border transition-all cursor-pointer select-none ${
            isOpen
              ? 'border-[#34B1AC] bg-[#34B1AC]/10 ring-2 ring-[#34B1AC]/30'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#34B1AC]/60 hover:bg-slate-50 dark:hover:bg-slate-750'
          } ${sizeClasses.button} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Clique no pincel para abrir a paleta de cores completa (sobrepõe toda a tela)"
        >
          {/* Swatch com a cor atual */}
          <span
            className={`shadow-xs border border-black/10 dark:border-white/15 shrink-0 transition-transform ${sizeClasses.swatch}`}
            style={{ backgroundColor: value || '#2563eb' }}
          />

          {/* Ícone de Pincel de Destaque */}
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            <Paintbrush className={`${sizeClasses.icon} text-[#34B1AC]`} />
            <span className="hidden sm:inline font-mono text-[11px]">
              {value?.toUpperCase() || '#2563EB'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#34B1AC]' : ''
              }`}
            />
          </div>
        </button>

        {/* Faixa rápida de cores principais ao lado */}
        {showPaletteStrip && (
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {quickColors.map((color) => {
              const isSelected = value?.toLowerCase() === color.toLowerCase();
              const light = isLightColor(color);
              return (
                <button
                  key={color}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectColor(color, false)}
                  className={`rounded-lg transition-all relative flex items-center justify-center cursor-pointer ${
                    sizeClasses.stripDot
                  } ${
                    isSelected
                      ? 'scale-110 ring-2 ring-[#34B1AC] ring-offset-1 dark:ring-offset-slate-900 shadow-xs'
                      : 'hover:scale-110 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`${getColorName(color)} (${color})`}
                >
                  {isSelected && (
                    <Check
                      className={`w-3 h-3 stroke-[3] ${
                        light ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}

            {/* Botão extra de pincel rápido */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!isOpen) updateCoords();
                setIsOpen(!isOpen);
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-[#34B1AC] hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Abrir paleta completa com todas as cores"
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Botão de Restaurar / Padrão (se ativado) */}
        {allowClear && defaultColor && value !== defaultColor && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectColor(defaultColor, false)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={`Restaurar para a cor padrão (${defaultColor})`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{clearLabel}</span>
          </button>
        )}
      </div>

      {/* 
        PALETA DE CORES FLUTUANTE EM PORTAL COM Z-INDEX MÁXIMO
        Renderizada no document.body para sobrepor absolutamente qualquer modal, card ou elemento da tela!
      */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] pointer-events-none">
            {/* Backdrop para fechar ao clicar fora e garantir foco visual */}
            <div
              className="fixed inset-0 pointer-events-auto bg-black/20 backdrop-blur-[0.5px] transition-opacity animate-in fade-in duration-100"
              onClick={() => setIsOpen(false)}
            />

            {/* Caixa Flutuante da Paleta de Cores */}
            <div
              ref={popoverRef}
              style={{
                top: `${popoverCoords.top}px`,
                left: `${popoverCoords.left}px`,
                width: `${Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 24 : 380)}px`,
              }}
              className="fixed pointer-events-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-150 select-none z-[99999]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Seletor */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#34B1AC]/15 text-[#34B1AC] flex items-center justify-center">
                    <Paintbrush className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Paleta de Cores</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-[#34B1AC]/10 text-[#34B1AC] rounded-full">
                        {EXPANDED_PALETTE.length} cores
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Clique em qualquer cor para aplicar e fechar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Fechar paleta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview em Tempo Real da Cor Ativa / Sob o Cursor */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl shadow-xs border border-black/10 dark:border-white/10 shrink-0 transition-colors"
                    style={{ backgroundColor: activeColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeColorName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {activeColor.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Seletor Nativo de Cor (Pipeta/Cores do Sistema) */}
                  <input
                    ref={inputColorRef}
                    type="color"
                    value={
                      activeColor.startsWith('#') && activeColor.length === 7
                        ? activeColor
                        : '#2563eb'
                    }
                    onChange={handleNativeColorChange}
                    className="sr-only"
                    aria-label="Seletor de cor nativo"
                  />
                  <button
                    type="button"
                    onClick={() => inputColorRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#173653] dark:text-[#34B1AC] bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Escolher qualquer tom customizado com a ferramenta de cor"
                  >
                    <Pipette className="w-3 h-3 text-[#34B1AC]" />
                    <span>Personalizar</span>
                  </button>
                </div>
              </div>

              {/* Abas de Categorias */}
              <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#173653] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Todas ({EXPANDED_PALETTE.length})
                </button>
                {COLOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#173653] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={cat.description}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grade de Cores da Paleta */}
              <div className="mt-3 max-h-[190px] overflow-y-auto pr-1">
                <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
                  {filteredColors.map((colorItem) => {
                    const isSelected =
                      value?.toLowerCase() === colorItem.hex.toLowerCase();
                    const light = isLightColor(colorItem.hex);

                    return (
                      <button
                        key={colorItem.hex}
                        type="button"
                        onClick={() => {
                          handleSelectColor(colorItem.hex, true);
                        }}
                        onMouseEnter={() => setHoveredColor(colorItem.hex)}
                        onMouseLeave={() => setHoveredColor(null)}
                        className={`group relative h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-black/10 dark:border-white/10 ${
                          isSelected
                            ? 'ring-2 ring-[#34B1AC] ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-md'
                            : 'hover:scale-110 hover:shadow-sm'
                        }`}
                        style={{ backgroundColor: colorItem.hex }}
                        title={`${colorItem.name} (${colorItem.hex}) - Clique para escolher e fechar`}
                      >
                        {isSelected && (
                          <Check
                            className={`w-4 h-4 stroke-[3] ${
                              light ? 'text-slate-900' : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé: Input HEX direto e botão Concluir */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500">HEX:</span>
                  <input
                    type="text"
                    value={customHex}
                    onChange={handleCustomHexChange}
                    placeholder="#000000"
                    maxLength={7}
                    className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase focus:ring-1 focus:ring-[#34B1AC] focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#34B1AC] hover:bg-[#289e99] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Confirmar Cor
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
