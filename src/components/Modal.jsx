import React from 'react'
import { T, makeS } from '../lib/theme.js'

export default function Modal({ title, onClose, children }) {
  const s = makeS()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div className="modal-card" style={{ ...s.card, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ color: T.muted, fontSize: 22, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
