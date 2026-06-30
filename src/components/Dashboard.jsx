import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'
import { fmt, MONTHS, MONTH_NAMES } from '../lib/format.js'

function KPI({ label, value, sub, color, icon }) {
  const s = makeS()
  color = color || T.green
  return (
    <div style={{ ...s.card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
          <div style={{ ...s.mono, fontSize: 20, fontWeight: 700, color }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
    </div>
  )
}

function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: T.muted, fontSize: 13 }}>⏳ Carregando...</div>
}

export default function Dashboard({ user }) {
  const s = makeS()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bal, setBal] = useState(null)
  const [profile, setProfile] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [_dashRt, _setDashRt] = useState(0)
  const [years, setYears] = useState([now.getFullYear()])

  useEffect(() => {
    supabase.from('monthly_periods').select('year').eq('user_id', user.id).order('year')
      .then(({ data: ys }) => { if (ys?.length) setYears([...new Set(ys.map(r => r.year))]) })
  }, [user.id])

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('monthly_balance').select('*').eq('user_id', user.id).eq('year', year).eq('month', month).single()
      ])
      setProfile(p)
      setBal(b)
      const { data: period } = await supabase.from('monthly_periods').select('id').eq('user_id', user.id).eq('year', year).eq('month', month).single()
      if (period) {
        const { data: tx } = await supabase.from('transactions').select('*').eq('user_id', user.id).eq('period_id', period.id).order('created_at', { ascending: false }).limit(7)
        setRecent(tx || [])
      } else setRecent([])
      setLoading(false)
    })()
  }, [user.id, year, month, _dashRt])

  useEffect(() => {
    const ch = supabase.channel('dash-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => _setDashRt(x => x + 1))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  const income = bal?.total_income || 0
  const expenses = bal?.total_expenses || 0
  const investments = bal?.total_investments || 0
  const balance = bal?.balance || 0
  const ePct = income > 0 ? (expenses / income * 100).toFixed(1) : 0
  const iPct = income > 0 ? (investments / income * 100).toFixed(1) : 0
  const tE = profile?.essential_target_pct || 55
  const tI = profile?.investment_target_pct || 30

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Dashboard</h2>
          <p style={{ color: T.muted2, fontSize: 13 }}>{MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...s.input, width: 110 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...s.input, width: 85 }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Loader /> : (
        <>
          {income > 0 && (+ePct > tE || balance < 0 || +iPct < tI) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {+ePct > tE ? <div style={{ background: T.red + '22', border: `1px solid ${T.red}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.red }}>⚠️ Despesas em {ePct}% da receita — meta é {tE}%</div> : null}
              {balance < 0 ? <div style={{ background: T.red + '22', border: `1px solid ${T.red}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.red }}>🚨 Saldo negativo este mês — verifique suas despesas</div> : null}
              {+iPct < tI ? <div style={{ background: T.yellow + '22', border: `1px solid ${T.yellow}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.yellow }}>📉 Investimentos em {iPct}% da receita — meta é {tI}%</div> : null}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            <KPI label="Receita" value={fmt(income)} icon="💰" color={T.green} />
            <KPI label="Despesas" value={fmt(expenses)} sub={`${ePct}% da receita (meta ${tE}%)`} icon="💸" color={+ePct > tE ? T.red : T.yellow} />
            <KPI label="Investimentos" value={fmt(investments)} sub={`${iPct}% (meta ${tI}%)`} icon="📈" color={+iPct < tI ? T.red : T.green} />
            <KPI label="Saldo" value={fmt(balance)} icon={balance >= 0 ? '✅' : '⚠️'} color={balance >= 0 ? T.green : T.red} />
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 11, color: T.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Metas do mês</div>
            {[
              { label: 'Essencial', pct: +ePct, target: tE, color: +ePct > tE ? T.red : T.green },
              { label: 'Investimentos', pct: +iPct, target: tI, color: +iPct < tI ? T.red : T.green }
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: T.muted2 }}>{item.label}</span>
                  <span style={{ ...s.mono, fontSize: 12, color: item.color }}>{item.pct}% / meta {item.target}%</span>
                </div>
                <div style={{ background: T.border, borderRadius: 4, height: 7 }}>
                  <div style={{ width: Math.min(item.pct, 100) + '%', background: item.color, borderRadius: 4, height: '100%', transition: 'width .5s' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 11, color: T.muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Lançamentos recentes</div>
            {recent.length === 0 ? (
              <p style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>Nenhum lançamento neste mês.</p>
            ) : recent.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ ...s.mono, fontSize: 13, color: tx.type === 'income' ? T.green : T.red }}>
                    {fmt(tx.amount_actual)}
                  </div>
                  <div style={{ fontSize: 10, color: tx.status === 'paid' ? T.green : T.yellow }}>
                    {tx.status === 'paid' ? '✓ pago' : 'pendente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
