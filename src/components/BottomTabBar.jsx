import React from 'react'
import { NAV } from '../lib/constants.js'
import { T } from '../lib/theme.js'

export default function BottomTabBar({ active, setActive }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: T.surface, borderTop: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'stretch', zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      {NAV.map(n => (
        <button
          key={n.id}
          onClick={() => setActive(n.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '6px 0', gap: 2,
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: active === n.id ? T.green : T.muted, fontFamily: 'inherit', minWidth: 0
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{n.icon}</span>
          <span style={{ fontSize: 9, fontWeight: active === n.id ? 700 : 400, marginTop: 2 }}>{n.label}</span>
        </button>
      ))}
    </div>
  )
}
