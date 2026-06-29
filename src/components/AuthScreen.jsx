import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'

export default function AuthScreen({ onAuth }) {
  const s = makeS()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleReset = async () => {
    if (!form.email) { setErr('Informe seu e-mail.'); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: 'https://minhas-financas-wine-sigma.vercel.app'
    })
    if (error) { setErr(error.message) } else {
      setErr('✅ Link de recuperação enviado! Verifique seu e-mail.')
    }
    setLoading(false)
  }

  const handle = async () => {
    if (!form.email || !form.password) { setErr('Preencha e-mail e senha.'); return }
    setLoading(true); setErr('')
    try {
      let error, data
      if (tab === 'login') {
        ({ data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password }))
      } else {
        ({ data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } }))
      }
      if (error) throw error
      if (tab === 'register') {
        if (data?.user && !data?.session) {
          setErr('✅ Conta criada! Verifique seu e-mail para confirmar e depois faça login.')
          setLoading(false)
          return
        }
      }
      if (data?.user) onAuth(data.user)
    } catch (e) {
      var msg = e?.message || e?.error_description || e?.msg
      if (!msg || msg === '{}' || msg === 'undefined') {
        msg = 'Erro ao conectar. Verifique sua conexão e tente novamente.'
      }
      setErr(msg)
    }
    setLoading(false)
  }

  return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>FinançasPro</h1>
          <p style={{ color: T.muted2, fontSize: 13, marginTop: 4 }}>Gestão financeira pessoal</p>
        </div>
        <div style={s.card}>
          <div style={{ display: 'flex', background: T.surface2, borderRadius: 8, padding: 4, marginBottom: 20 }}>
            {tab !== 'reset' && ['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setErr('') }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: tab === t ? T.green : 'transparent',
                  color: tab === t ? '#0f1117' : T.muted2,
                  border: 'none'
                }}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {tab === 'reset' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: T.muted2, marginBottom: 4 }}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
              <div>
                <label style={s.label}>E-mail</label>
                <input
                  style={s.input} type="email" placeholder="seu@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
              </div>
              {err && (
                <div style={{ color: err.startsWith('✅') ? T.green : T.red, fontSize: 12, background: err.startsWith('✅') ? 'rgba(62,207,142,.1)' : 'rgba(248,113,113,.1)', padding: '8px 12px', borderRadius: 6 }}>
                  {err}
                </div>
              )}
              <button onClick={handleReset} disabled={loading} style={{ ...s.btnP, width: '100%', opacity: loading ? .6 : 1 }}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <button onClick={() => { setTab('login'); setErr('') }} style={{ background: 'none', border: 'none', color: T.muted2, fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline' }}>
                ← Voltar ao login
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'register' && (
                <div>
                  <label style={s.label}>Nome</label>
                  <input style={s.input} placeholder="Seu nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              )}
              <div>
                <label style={s.label}>E-mail</label>
                <input style={s.input} type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Senha</label>
                <input
                  style={s.input} type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handle()}
                />
              </div>
              {tab === 'login' && (
                <div style={{ textAlign: 'right', marginTop: -4 }}>
                  <button onClick={() => { setTab('reset'); setErr('') }} style={{ background: 'none', border: 'none', color: T.muted2, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                    Esqueceu a senha?
                  </button>
                </div>
              )}
              {err && (
                <div style={{ color: err.startsWith('✅') ? T.green : T.red, fontSize: 12, background: err.startsWith('✅') ? 'rgba(62,207,142,.1)' : 'rgba(248,113,113,.1)', padding: '8px 12px', borderRadius: 6 }}>
                  {err}
                </div>
              )}
              <button onClick={handle} disabled={loading} style={{ ...s.btnP, width: '100%', opacity: loading ? .6 : 1 }}>
                {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
