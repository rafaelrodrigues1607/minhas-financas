import React, { useState, useEffect } from 'react'
import { supabase, IS_NATIVE } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'

export default function Settings({ user, onLogout, theme: settingsTheme, onToggleTheme: settingsToggleTheme }) {
  const s = makeS()
  const [form, setForm] = useState({
    full_name: '',
    monthly_income_base: '',
    essential_target_pct: 55,
    investment_target_pct: 30,
    leisure_target_pct: 10,
    education_target_pct: 5
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('user_profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setForm(f => ({ ...f, ...data }))
    })
  }, [user.id])

  const save = async () => {
    await supabase.from('user_profiles').upsert({
      id: user.id,
      full_name: form.full_name,
      monthly_income_base: parseFloat(form.monthly_income_base) || null,
      essential_target_pct: +form.essential_target_pct,
      investment_target_pct: +form.investment_target_pct,
      leisure_target_pct: +form.leisure_target_pct,
      education_target_pct: +form.education_target_pct
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const total = +form.essential_target_pct + +form.investment_target_pct + +form.leisure_target_pct + +form.education_target_pct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Configurações</h2>

      <div style={s.card}>
        <div style={{ fontSize: 11, color: T.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Perfil</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.label}>Nome</label>
            <input style={s.input} value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label style={s.label}>Renda base mensal (R$)</label>
            <input style={s.input} type="number" value={form.monthly_income_base || ''} onChange={e => setForm({ ...form, monthly_income_base: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Distribuição %</div>
          <span style={{ ...s.mono, fontSize: 12, color: total === 100 ? T.green : T.red }}>{total}% {total !== 100 ? '⚠️ deve ser 100%' : '✓'}</span>
        </div>
        {[
          ['essential_target_pct', '🏠 Essencial'],
          ['investment_target_pct', '📈 Investimentos'],
          ['leisure_target_pct', '🎉 Lazer'],
          ['education_target_pct', '📚 Educação']
        ].map(([k, l]) => (
          <div key={k} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>{l}</label>
              <span style={{ ...s.mono, fontSize: 13, color: T.green }}>{form[k]}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={form[k]}
              onChange={e => setForm({ ...form, [k]: +e.target.value })}
              style={{ width: '100%', accentColor: T.green }}
            />
          </div>
        ))}
      </div>

      <button onClick={save} style={{ ...s.btnP, alignSelf: 'flex-start' }}>
        {saved ? '✓ Salvo!' : 'Salvar configurações'}
      </button>

      {IS_NATIVE && settingsToggleTheme && (
        <button onClick={settingsToggleTheme} style={{ ...s.btnS, alignSelf: 'flex-start' }}>
          {settingsTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo escuro'}
        </button>
      )}

      {IS_NATIVE && onLogout && (
        <button onClick={onLogout} style={{ ...s.btnS, alignSelf: 'flex-start', color: T.red, borderColor: T.red + '44' }}>
          🚪 Sair da conta
        </button>
      )}
    </div>
  )
}
