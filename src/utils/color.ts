export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorPreset {
  id: string;
  name: string;
  nameEn: string;
  fg: string;
  bg: string;
}

export const MATERIAL_COLOR_PRESETS: ColorPreset[] = [
  { id: 'classic', name: 'Классический ч/б', nameEn: 'Classic B/W', fg: '#000000', bg: '#ffffff' },
  { id: 'mint', name: 'Мятный M3', nameEn: 'Mint M3', fg: '#003a0f', bg: '#e8f5e9' },
  { id: 'sapphire', name: 'Сапфир M3', nameEn: 'Sapphire M3', fg: '#00325b', bg: '#e3f2fd' },
  { id: 'amethyst', name: 'Аметист M3', nameEn: 'Amethyst M3', fg: '#381e72', bg: '#f3e5f5' },
  { id: 'amoled', name: 'AMOLED Тёмный', nameEn: 'AMOLED Dark', fg: '#a8f09b', bg: '#121316' },
];

export function clampByte(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(255, Math.round(val)));
}

export function normalizeHexColor(input: string, fallback = '#000000'): string {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${r}${g}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned}`.toLowerCase();
  }
  return fallback;
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: parseInt(norm.slice(0, 2), 16),
    g: parseInt(norm.slice(2, 4), 16),
    b: parseInt(norm.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function getColorContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}
