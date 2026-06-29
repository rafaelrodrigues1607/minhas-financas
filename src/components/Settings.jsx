import React, { useState, useEffect } from 'react'
import { supabase, IS_NATIVE, registerPush, getVapidPublicKey } from '../lib/supabase.js'
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

  // Notification settings
  const [notif, setNotif] = useState({
    enabled: true,
    alert_day_before: true,
    alert_overdue: true,
    overdue_days: 5
  })
  const [pushRegistered, setPushRegistered] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)

  useEffect(() => {
    supabase.from('user_profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setForm(f => ({ ...f, ...data }))
    })

    // Load notification settings
    supabase.from('notification_settings').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setNotif({ enabled: data.enabled, alert_day_before: data.alert_day_before, alert_overdue: data.alert_overdue, overdue_days: data.overdue_days })
    })

    // Check if push is already registered on this device
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushRegistered(!!sub)
        }).catch(() => {})
      }).catch(() => {})
    }
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

  const saveNotif = async (updated) => {
    setNotifSaving(true)
    await supabase.from('notification_settings').upsert({
      user_id: user.id,
      ...updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    setNotifSaving(false)
  }

  const handleNotifChange = (field, value) => {
    const updated = { ...notif, [field]: value }
    setNotif(updated)
    saveNotif(updated)
  }

  const handleRegisterPush = async () => {
    setPushLoading(true)
    const vapidKey = getVapidPublicKey()
    if (!vapidKey) {
      alert('Chave VAPID não configurada. Adicione VAPID_PUBLIC_KEY nas variáveis de ambiente do Vercel.')
      setPushLoading(false)
      return
    }
    const ok = await registerPush(vapidKey)
    setPushRegistered(ok)
    setPushLoading(false)
    if (!ok) alert('Não foi possível ativar as notificações. Verifique se o seu navegador suporta notificações push.')
  }

  const total = +form.essential_target_pct + +form.investment_target_pct + +form.leisure_target_pct + +form.education_target_pct

  const toggleRow = (label, field, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: T.text }}>{label}</span>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
        <div
          onClick={() => handleNotifChange(field, !value)}
          style={{
            width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
            background: value ? T.green : T.border,
            position: 'relative', transition: 'background .2s'
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: value ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left .2s'
          }} />
        </div>
      </label>
    </div>
  )

  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window

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

      {/* Push Notifications section */}
      <div style={s.card}>
        <div style={{ fontSize: 11, color: T.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Notificações Push {notifSaving && <span style={{ color: T.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — salvando...</span>}
        </div>

        {!pushSupported && (
          <div style={{ fontSize: 12, color: T.muted2, background: T.surface2, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            Seu navegador não suporta notificações push.
          </div>
        )}

        {pushSupported && (
          <>
            {toggleRow('Notificações ativas', 'enabled', notif.enabled)}

            {notif.enabled && (
              <>
                {toggleRow('Avisar 1 dia antes do vencimento', 'alert_day_before', notif.alert_day_before)}
                {toggleRow('Avisar sobre despesas atrasadas', 'alert_overdue', notif.alert_overdue)}

                {notif.alert_overdue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13, color: T.text }}>Por quantos dias avisar atraso</span>
                    <select
                      value={notif.overdue_days}
                      onChange={e => handleNotifChange('overdue_days', +e.target.value)}
                      style={{ ...s.input, width: 'auto', padding: '6px 10px' }}
                    >
                      {[1, 2, 3, 4, 5].map(d => (
                        <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  {pushRegistered ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.green }}>
                      <span>✓</span>
                      <span>Notificações ativas neste dispositivo</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterPush}
                      disabled={pushLoading}
                      style={{ ...s.btnS, opacity: pushLoading ? .6 : 1 }}
                    >
                      {pushLoading ? 'Ativando...' : 'Ativar notificações neste dispositivo'}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

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
