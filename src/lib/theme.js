export const DARK = {
  bg: '#0f1117', surface: '#181c27', surface2: '#1e2335', border: '#272d42',
  green: '#3ecf8e', red: '#f87171', yellow: '#fbbf24', blue: '#60a5fa',
  text: '#e2e8f0', muted: '#64748b', muted2: '#94a3b8'
}

export const LIGHT = {
  bg: '#f1f5f9', surface: '#ffffff', surface2: '#f8fafc', border: '#e2e8f0',
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6',
  text: '#0f172a', muted: '#64748b', muted2: '#475569'
}

// T is a mutable global theme object — mutated in-place so all components
// reading T at render time get the current theme without needing props.
export const T = { ...DARK }

export function applyTheme(name) {
  Object.assign(T, name === 'dark' ? DARK : LIGHT)
}

export function makeS() {
  return {
    page: { minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,sans-serif', color: T.text },
    card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 },
    input: { width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' },
    label: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' },
    btnP: { background: T.green, color: T.bg, fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
    btnS: { background: 'transparent', color: T.muted2, fontWeight: 500, fontSize: 13, padding: '10px 20px', borderRadius: 8, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit' },
    mono: { fontFamily: 'monospace' }
  }
}
