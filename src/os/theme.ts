/** Theme tokens, wallpapers and the CSS-variable bridge into the stylesheet. */

import type { OSTheme, ThemeMode } from '../types/os';

export interface Wallpaper {
  id: string;
  name: string;
  /** Any valid CSS `background` value. Also what `os_set_wallpaper` accepts. */
  value: string;
  /** Wallpapers are tuned for one mode; the picker groups by this. */
  mode: ThemeMode | 'both';
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    value: 'radial-gradient(ellipse at 20% 0%, #312e81 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, #4c1d95 0%, transparent 50%), #09090b',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    mode: 'dark',
    value: 'radial-gradient(ellipse at 10% 20%, #0f766e 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, #1e40af 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, #6d28d9 0%, transparent 55%), #060608',
  },
  {
    id: 'ember',
    name: 'Ember',
    mode: 'dark',
    value: 'radial-gradient(ellipse at 80% 20%, #9a3412 0%, transparent 50%), radial-gradient(ellipse at 10% 90%, #7f1d1d 0%, transparent 45%), #0a0708',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    mode: 'dark',
    value: 'linear-gradient(160deg, #1f2937 0%, #0b0f16 60%, #05070a 100%)',
  },
  {
    id: 'abyss',
    name: 'Abyss',
    mode: 'dark',
    value: 'radial-gradient(circle at 50% 120%, #0e7490 0%, transparent 45%), linear-gradient(180deg, #020617 0%, #000 100%)',
  },
  {
    id: 'daybreak',
    name: 'Daybreak',
    mode: 'light',
    value: 'radial-gradient(ellipse at 15% 0%, #bfdbfe 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, #e9d5ff 0%, transparent 50%), #f8fafc',
  },
  {
    id: 'linen',
    name: 'Linen',
    mode: 'light',
    value: 'linear-gradient(150deg, #fefce8 0%, #f5f5f4 55%, #e7e5e4 100%)',
  },
  {
    id: 'mist',
    name: 'Mist',
    mode: 'light',
    value: 'radial-gradient(ellipse at 70% 10%, #ccfbf1 0%, transparent 50%), linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
  },
];

export const ACCENTS = [
  { id: 'indigo', name: 'Indigo', value: '#6366f1' },
  { id: 'violet', name: 'Violet', value: '#8b5cf6' },
  { id: 'sky', name: 'Sky', value: '#0ea5e9' },
  { id: 'emerald', name: 'Emerald', value: '#10b981' },
  { id: 'amber', name: 'Amber', value: '#f59e0b' },
  { id: 'rose', name: 'Rose', value: '#f43f5e' },
];

export const DEFAULT_THEME: OSTheme = {
  mode: 'dark',
  accent: '#6366f1',
  wallpaper: WALLPAPERS[0].value,
  reducedEffects: false,
};

/** Lighten/darken a hex colour by `amount` (-1..1) for hover/active variants. */
function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const num = parseInt(full, 16);
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((channel) => {
    const next = amount >= 0
      ? channel + (255 - channel) * amount
      : channel * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(next)));
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function rgbTuple(hex: string): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

/**
 * Push theme state onto the document root. Components then style against
 * `var(--os-accent)` / `.os-light` instead of hard-coding palette values,
 * which is what lets the whole desktop re-skin from one setting.
 */
export function applyTheme(theme: OSTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--os-accent', theme.accent);
  root.style.setProperty('--os-accent-rgb', rgbTuple(theme.accent));
  root.style.setProperty('--os-accent-hover', shade(theme.accent, -0.15));
  root.style.setProperty('--os-accent-soft', shade(theme.accent, 0.35));
  root.dataset.theme = theme.mode;
  root.classList.toggle('os-light', theme.mode === 'light');
  root.classList.toggle('os-reduced', theme.reducedEffects);
  root.style.colorScheme = theme.mode;
}

/** Accept either a wallpaper id or a raw CSS value (what the agent may send). */
export function resolveWallpaper(value: string): string {
  const known = WALLPAPERS.find((wallpaper) => wallpaper.id === value || wallpaper.name.toLowerCase() === value.toLowerCase());
  return known ? known.value : value;
}
