import React from 'react'
import { NAV } from '../lib/constants.js'
import { T, makeS } from '../lib/theme.js'

export default function Sidebar({ active, setActive, onLogout, collapsed, setCollapsed, theme, onToggleTheme }) {
  const s = makeS()
  return (
    <div style={{
      width: collapsed ? 56 : 210,
      background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      transition: 'width .2s'
    }}>
      <div style={{
        padding: collapsed ? '12px 0 8px' : '16px 14px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: collapsed ? 6 : 0
      }}>
        {collapsed && (
          <img src="/icons/icon.png" alt="FinançasPro" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover' }} />
        )}
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>💰 FinançasPro</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: T.muted, fontSize: 16, padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '10px 6px' }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setActive(n.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '10px 0' : '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8,
              marginBottom: 2,
              cursor: 'pointer',
              background: active === n.id ? T.green + '22' : 'transparent',
              color: active === n.id ? T.green : T.muted2,
              fontWeight: active === n.id ? 600 : 400,
              fontSize: 13,
              border: 'none'
            }}
          >
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
          </button>
        ))}
      </nav>

      <div style={{ padding: collapsed ? '10px 0' : '10px 8px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          style={{
            width: '100%', padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 6, cursor: 'pointer',
            background: T.surface2, color: T.muted2, fontSize: 12, border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: collapsed ? 'center' : 'flex-start'
          }}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {!collapsed && (theme === 'dark' ? 'Modo claro' : 'Modo escuro')}
        </button>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(248,113,113,.1)', color: T.red, fontSize: 12, border: 'none',
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: collapsed ? 'center' : 'flex-start'
          }}
        >
          <span>🚪</span>
          {!collapsed && 'Sair'}
        </button>
      </div>
    </div>
  )
}
