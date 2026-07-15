// Theme management - color scheme switching
export type ThemePreset = 'amber' | 'coral' | 'violet' | 'sky' | 'emerald' | 'rose' | 'custom';

export const THEME_PRESETS: { key: ThemePreset; label: string; h: number; s: string; l: string }[] = [
  { key: 'amber', label: '暖橙', h: 32, s: '95%', l: '55%' },
  { key: 'coral', label: '珊瑚', h: 14, s: '90%', l: '58%' },
  { key: 'violet', label: '紫罗兰', h: 262, s: '75%', l: '62%' },
  { key: 'sky', label: '天蓝', h: 195, s: '85%', l: '55%' },
  { key: 'emerald', label: '翠绿', h: 155, s: '65%', l: '50%' },
  { key: 'rose', label: '玫瑰', h: 340, s: '80%', l: '60%' },
];

export function getSavedTheme(): { preset: ThemePreset; customH?: number; customS?: string; customL?: string } {
  try {
    const raw = localStorage.getItem('choirai_theme');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { preset: 'violet' }; // default: light blue-purple
}

export function applyTheme(preset: ThemePreset, customH?: number, customS?: string, customL?: string) {
  const root = document.documentElement;
  root.setAttribute('data-theme', preset);

  if (preset === 'custom' && customH !== undefined) {
    root.style.setProperty('--accent-h', String(customH));
    root.style.setProperty('--accent-s', customS || '80%');
    root.style.setProperty('--accent-l', customL || '55%');
  } else {
    const found = THEME_PRESETS.find(p => p.key === preset);
    if (found) {
      root.style.setProperty('--accent-h', String(found.h));
      root.style.setProperty('--accent-s', found.s);
      root.style.setProperty('--accent-l', found.l);
    }
  }

  // Refresh computed accent color
  const h = getComputedStyle(root).getPropertyValue('--accent-h').trim();
  const s = getComputedStyle(root).getPropertyValue('--accent-s').trim();
  const l = getComputedStyle(root).getPropertyValue('--accent-l').trim();
  root.style.setProperty('--accent-color', `hsl(${h}, ${s}, ${l})`);
  root.style.setProperty('--accent-soft', `hsla(${h}, ${s}, ${l}, 0.12)`);
  root.style.setProperty('--accent-medium', `hsla(${h}, ${s}, ${l}, 0.25)`);
  root.style.setProperty('--accent-glow', `hsla(${h}, ${s}, ${l}, 0.4)`);
}

export function saveTheme(preset: ThemePreset, customH?: number, customS?: string, customL?: string) {
  localStorage.setItem('choirai_theme', JSON.stringify({ preset, customH, customS, customL }));
}

export function initTheme() {
  const saved = getSavedTheme();
  applyTheme(saved.preset, saved.customH, saved.customS, saved.customL);
}
