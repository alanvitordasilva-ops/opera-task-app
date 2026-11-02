export interface ColorOption {
  hex: string;
  name: string;
  category: 'principais' | 'pasteis' | 'vibrantes' | 'neutros' | 'escuras';
}

export interface ColorCategory {
  id: 'principais' | 'pasteis' | 'vibrantes' | 'neutros' | 'escuras';
  label: string;
  description: string;
}

export const COLOR_CATEGORIES: ColorCategory[] = [
  { id: 'principais', label: 'Principais', description: 'Cores de identidade e alto contraste' },
  { id: 'pasteis', label: 'Tons Pastéis', description: 'Tonalidades suaves, calmas e acolhedoras' },
  { id: 'vibrantes', label: 'Vibrantes', description: 'Cores intensas para destaque imediato' },
  { id: 'neutros', label: 'Tons Neutros', description: 'Elegantes, discretos e terrosos' },
  { id: 'escuras', label: 'Cores Escuras', description: 'Tons profundos e sofisticados' },
];

export const EXPANDED_PALETTE: ColorOption[] = [
  // 1. Cores Principais (10 cores)
  { hex: '#173653', name: 'Azul Opera (Navy)', category: 'principais' },
  { hex: '#34B1AC', name: 'Verde-Água Opera', category: 'principais' },
  { hex: '#2563eb', name: 'Azul Royal', category: 'principais' },
  { hex: '#0284c7', name: 'Azul Oceano', category: 'principais' },
  { hex: '#0d9488', name: 'Azul Petróleo Claro', category: 'principais' },
  { hex: '#059669', name: 'Esmeralda', category: 'principais' },
  { hex: '#16a34a', name: 'Verde Floresta', category: 'principais' },
  { hex: '#d97706', name: 'Âmbar Dourado', category: 'principais' },
  { hex: '#ea580c', name: 'Laranja Opera', category: 'principais' },
  { hex: '#dc2626', name: 'Vermelho Rubi', category: 'principais' },
  { hex: '#7c3aed', name: 'Roxo Violeta', category: 'principais' },
  { hex: '#db2777', name: 'Rosa Magenta', category: 'principais' },

  // 2. Tons Pastéis (8 cores)
  { hex: '#93c5fd', name: 'Azul Céu Pastel', category: 'pasteis' },
  { hex: '#6ee7b7', name: 'Menta Suave', category: 'pasteis' },
  { hex: '#fde047', name: 'Amarelo Manteiga', category: 'pasteis' },
  { hex: '#fdba74', name: 'Pêssego Claro', category: 'pasteis' },
  { hex: '#fca5a5', name: 'Coral Claro', category: 'pasteis' },
  { hex: '#f9a8d4', name: 'Rosa Algodão', category: 'pasteis' },
  { hex: '#c4b5fd', name: 'Lavanda Pastel', category: 'pasteis' },
  { hex: '#a5f3fc', name: 'Ciano Gelado', category: 'pasteis' },

  // 3. Cores Vibrantes (8 cores)
  { hex: '#06b6d4', name: 'Ciano Elétrico', category: 'vibrantes' },
  { hex: '#10b981', name: 'Menta Neon', category: 'vibrantes' },
  { hex: '#84cc16', name: 'Lima Vibrante', category: 'vibrantes' },
  { hex: '#eab308', name: 'Amarelo Solar', category: 'vibrantes' },
  { hex: '#f97316', name: 'Tangerina', category: 'vibrantes' },
  { hex: '#f43f5e', name: 'Carmim Vibrante', category: 'vibrantes' },
  { hex: '#ec4899', name: 'Pink Neon', category: 'vibrantes' },
  { hex: '#8b5cf6', name: 'Índigo Elétrico', category: 'vibrantes' },

  // 4. Tons Neutros & Terrosos (8 cores)
  { hex: '#64748b', name: 'Ardósia (Slate)', category: 'neutros' },
  { hex: '#71717a', name: 'Zinco Grafite', category: 'neutros' },
  { hex: '#78716c', name: 'Areia / Pedra', category: 'neutros' },
  { hex: '#a8a29e', name: 'Cinza Névoa', category: 'neutros' },
  { hex: '#b45309', name: 'Bronze Quente', category: 'neutros' },
  { hex: '#854d0e', name: 'Mostarda Terrosa', category: 'neutros' },
  { hex: '#57534e', name: 'Carvão Mineral', category: 'neutros' },
  { hex: '#3f3f46', name: 'Chumbo Escuro', category: 'neutros' },

  // 5. Cores Escuras & Profundas (8 cores)
  { hex: '#0f172a', name: 'Noite Profunda', category: 'escuras' },
  { hex: '#1e293b', name: 'Azul Escuro Grafite', category: 'escuras' },
  { hex: '#064e3b', name: 'Verde Floresta Escuro', category: 'escuras' },
  { hex: '#1e1b4b', name: 'Índigo Meia-Noite', category: 'escuras' },
  { hex: '#4c1d95', name: 'Uva Profunda', category: 'escuras' },
  { hex: '#881337', name: 'Bordô / Vinho', category: 'escuras' },
  { hex: '#7c2d12', name: 'Terracota Queimada', category: 'escuras' },
  { hex: '#18181b', name: 'Preto Mineral', category: 'escuras' },
];

export const FLAT_COLOR_LIST: string[] = EXPANDED_PALETTE.map((c) => c.hex);

export function getColorName(hex: string): string {
  if (!hex) return 'Sem cor';
  const match = EXPANDED_PALETTE.find(
    (c) => c.hex.toLowerCase() === hex.trim().toLowerCase()
  );
  if (match) return match.name;
  return hex.toUpperCase();
}

export function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false;
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : cleanHex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  // Fórmula de luminância relativa HSP
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp > 155;
}
