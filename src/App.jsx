import React, { useState, useEffect } from 'react'
import { supabase, IS_NATIVE } from './lib/supabase.js'
import { T, applyTheme, makeS } from './lib/theme.js'
import AuthScreen from './components/AuthScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import BottomTabBar from './components/BottomTabBar.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Investments from './components/Investments.jsx'
import Goals from './components/Goals.jsx'
import Reports from './components/Reports.jsx'
import Settings from './components/Settings.jsx'

const screens = {
  dashboard: Dashboard,
  transactions: Transactions,
  investments: Investments,
  goals: Goals,
  reports: Reports,
  settings: Settings
}

export default function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [active, setActive] = useState('dashboard')
  const [mounted, setMounted] = useState({ dashboard: true })
  const [collapsed, setCollapsed] = useState(true)
  const [newPassMode, setNewPassMode] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassErr, setNewPassErr] = useState('')
  const [newPassLoading, setNewPassLoading] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  // Apply theme to the mutable T object and recompute s
  applyTheme(theme)
  const s = makeS()

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    setTheme(next)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setBooting(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (_e === 'PASSWORD_RECOVERY') setNewPassMode(true)
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { setMounted(m => ({ ...m, [active]: true })) }, [active])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (booting) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: T.muted2 }}>Iniciando...</span>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={u => { setNewPassMode(false); setUser(u) }} />
  }

  if (newPassMode) {
    const saveNewPass = async () => {
      if (!newPass || newPass.length < 6) { setNewPassErr('A senha deve ter pelo menos 6 caracteres.'); return }
      setNewPassLoading(true); setNewPassErr('')
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) { setNewPassErr(error.message) } else {
        setNewPassMode(false); setNewPass(''); setNewPassErr('')
      }
      setNewPassLoading(false)
    }
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Nova senha</h1>
            <p style={{ color: T.muted2, fontSize: 13, marginTop: 4 }}>Defina sua nova senha de acesso</p>
          </div>
          <div style={s.card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={s.label}>Nova senha</label>
                <input
                  style={s.input} type="password" placeholder="Mínimo 6 caracteres"
                  value={newPass} onChange={e => setNewPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveNewPass()}
                />
              </div>
              {newPassErr && (
                <div style={{ color: T.red, fontSize: 12, background: 'rgba(248,113,113,.1)', padding: '8px 12px', borderRadius: 6 }}>
                  {newPassErr}
                </div>
              )}
              <button onClick={saveNewPass} disabled={newPassLoading} style={{ ...s.btnP, width: '100%', opacity: newPassLoading ? .6 : 1 }}>
                {newPassLoading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sideW = IS_NATIVE ? 0 : (collapsed ? 56 : 210)

  return (
    <div style={s.page}>
      <style>{`*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html,body{overflow-x:hidden}
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        select option { background:${T.surface2}; color:${T.text}; }
        @media(max-width:599px){
          .txsc{padding:10px 6px!important}
          .txsv{font-size:12px!important}
          .fmg{grid-template-columns:1fr!important}
          .modal-card{padding:14px!important}
        }`}
      </style>

      {!IS_NATIVE && (
        <Sidebar
          active={active}
          setActive={setActive}
          onLogout={logout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {IS_NATIVE && <BottomTabBar active={active} setActive={setActive} />}

      <main style={{
        marginLeft: sideW,
        padding: IS_NATIVE ? '16px 16px 76px' : '24px 22px',
        minHeight: '100vh',
        transition: IS_NATIVE ? 'none' : 'margin-left .2s'
      }}>
        {Object.entries(screens).map(([id, Comp]) => !mounted[id] ? null : (
          <div key={id} style={{ display: active === id ? 'block' : 'none' }}>
            <Comp
              user={user}
              {...(id === 'settings' ? { onLogout: logout, theme, onToggleTheme: toggleTheme } : {})}
            />
          </div>
        ))}
      </main>
    </div>
  )
}
