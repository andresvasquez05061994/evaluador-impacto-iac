export const THEME_STORAGE_KEY = 'iac-theme'

export const THEME_VARS = {
  dark: {
    '--bg': '#0F1419',
    '--bg2': '#151C26',
    '--bg3': '#1A2332',
    '--bg4': '#243044',
    '--text': '#F4F6F8',
    '--text-muted': 'rgba(244,246,248,.55)',
    '--text-subtle': 'rgba(244,246,248,.78)',
    '--text-faint': 'rgba(244,246,248,.38)',
    '--border': 'rgba(244,246,248,.08)',
    '--border-strong': 'rgba(244,246,248,.16)',
    '--header-divider': 'rgba(244,246,248,.12)',
    '--input-bg': '#1A2332',
    '--input-border': 'rgba(244,246,248,.12)',
    '--scrollbar': '#243044',
    '--scrollbar-hover': '#2E3D52',
    '--overlay': 'rgba(15,20,25,.92)',
    '--tab-inactive-bg': 'transparent',
    '--tab-inactive-text': 'rgba(244,246,248,.55)',
    '--chart-grid': 'rgba(244,246,248,.07)',
    '--accent-text-on': '#F4F6F8',
    '--accent': '#4A8BC2',
    '--accent-subtle': 'rgba(74,139,194,.12)',
  },
  light: {
    '--bg': '#F4F6F8',
    '--bg2': '#FFFFFF',
    '--bg3': '#FFFFFF',
    '--bg4': '#EEF1F5',
    '--text': '#051C2C',
    '--text-muted': '#5A6B7B',
    '--text-subtle': '#1B365D',
    '--text-faint': '#8896A6',
    '--border': 'rgba(5,28,44,.1)',
    '--border-strong': 'rgba(5,28,44,.18)',
    '--header-divider': 'rgba(5,28,44,.12)',
    '--input-bg': '#FFFFFF',
    '--input-border': 'rgba(5,28,44,.15)',
    '--scrollbar': '#C8CDD4',
    '--scrollbar-hover': '#A8AFB8',
    '--overlay': 'rgba(244,246,248,.94)',
    '--tab-inactive-bg': 'transparent',
    '--tab-inactive-text': '#5A6B7B',
    '--chart-grid': 'rgba(5,28,44,.08)',
    '--accent-text-on': '#FFFFFF',
    '--accent': '#003A70',
    '--accent-subtle': 'rgba(0,58,112,.06)',
  },
}

export function applyTheme(mode) {
  const vars = THEME_VARS[mode] || THEME_VARS.light
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))
}
