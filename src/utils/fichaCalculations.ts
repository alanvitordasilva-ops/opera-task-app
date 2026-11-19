import { UnidadeMedida } from '../types/index.ts';

/**
 * Converte strings numéricas em padrão brasileiro (ex: "0,030", "0,30", "1.250,50")
 * ou internacional (ex: "0.030", "2.5") em número válido >= 0.
 */
export function parseSafeMeasure(val: string | number | undefined | null): number {
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) || val < 0 ? 0 : val;
  }
  if (!val) return 0;

  // Remove espaços e caracteres fora de dígitos, vírgula, ponto e sinal
  const trimmed = String(val).trim().replace(/\s+/g, '');
  if (!trimmed) return 0;

  let normalized = trimmed;
  // Se contém ponto e vírgula (ex: "1.250,50"), ponto é separador de milhar
  if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  // Remove eventuais textos de unidade colados no número (ex: "0.30kg")
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;

  const num = parseFloat(match[0]);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return num;
}

/**
 * Formata o fator multiplicador em PT-BR (ex: "10", "2,5", "0,5").
 */
export function formatFactorPTBR(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  const rounded = Math.round(num * 1000) / 1000;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

/**
 * Formata quantidades de ingredientes em padrão brasileiro:
 * - Kg / Litros: sempre 3 casas decimais (padrão de balança e medida: 0,030 / 0,300 / 3,000)
 * - g / ml: até 2 casas decimais sem zeros à direita desnecessários (ex: 30 / 300 / 1.500)
 */
export function formatMeasurePTBR(num: number, unidade: UnidadeMedida): string {
  if (isNaN(num) || !isFinite(num)) {
    return unidade === 'Kg' || unidade === 'Litros' ? '0,000' : '0';
  }

  if (unidade === 'Kg' || unidade === 'Litros') {
    const rounded = Math.round(num * 1000) / 1000;
    return rounded.toLocaleString('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  const rounded = Math.round(num * 100) / 100;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Retorna a equivalência legível entre Kg <-> g e Litros <-> ml
 * para eliminar ambiguidade entre 0,030 (30g/30ml) e 0,300 (300g/300ml).
 */
export function formatEquivalentMeasure(num: number, unidade: UnidadeMedida): string | null {
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;

  if (unidade === 'Kg' && num < 1) {
    return `${formatMeasurePTBR(num * 1000, 'g')} g`;
  }
  if (unidade === 'Litros' && num < 1) {
    return `${formatMeasurePTBR(num * 1000, 'ml')} ml`;
  }
  if (unidade === 'g') {
    return `${formatMeasurePTBR(num / 1000, 'Kg')} Kg`;
  }
  if (unidade === 'ml') {
    return `${formatMeasurePTBR(num / 1000, 'Litros')} Litros`;
  }
  return null;
}

export function isSolidUnit(unidade: UnidadeMedida): boolean {
  return unidade === 'Kg' || unidade === 'g';
}

export function isLiquidUnit(unidade: UnidadeMedida): boolean {
  return unidade === 'Litros' || unidade === 'ml';
}

export function toKgOrLiters(num: number, unidade: UnidadeMedida): number {
  if (unidade === 'g' || unidade === 'ml') {
    return num / 1000;
  }
  return num;
}
