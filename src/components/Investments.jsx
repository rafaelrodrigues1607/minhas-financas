import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'
import { fmt } from '../lib/format.js'
import Modal from './Modal.jsx'

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

const tLabels = {
  short_term: 'Curto prazo',
  mid_term: 'Médio prazo',
  long_term: 'Longo prazo',
  stocks: 'Ações',
  crypto: 'Cripto',
  real_estate: 'Imóveis',
  other: 'Outro'
}

export default function Investments({ user }) {
  const s = makeS()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const emptyForm = { name: '', type: 'short_term', institution: '', initial_amount: '', current_amount: '', target_amount: '', expected_return_pct: '', goal: '', start_date: '' }
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('inv-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  const save = async () => {
    if (!form.name) return
    await supabase.from('investments').insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      institution: form.institution || null,
      initial_amount: parseFloat(form.initial_amount) || 0,
      current_amount: form.current_amount ? parseFloat(form.current_amount) : null,
      target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
      expected_return_pct: form.expected_return_pct ? parseFloat(form.expected_return_pct) : null,
      goal: form.goal || null,
      start_date: form.start_date || null,
      status: 'active'
    })
    setShowModal(false)
    setForm(emptyForm)
    load()
  }

  const remove = async id => {
    await supabase.from('investments').delete().eq('id', id)
    load()
  }

  const totalI = list.reduce((a, i) => a + i.initial_amount, 0)
  const totalC = list.reduce((a, i) => a + (i.current_amount || i.initial_amount), 0)
  const ret = totalI > 0 ? ((totalC - totalI) / totalI * 100).toFixed(2) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Investimentos</h2>
        <button onClick={() => setShowModal(true)} style={s.btnP}>+ Novo investimento</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <KPI label="Total investido" value={fmt(totalI)} icon="💰" color={T.blue} />
        <KPI label="Saldo atual" value={fmt(totalC)} icon="📊" color={T.green} />
        <KPI label="Retorno" value={`${ret}%`} icon="📈" color={+ret >= 0 ? T.green : T.red} />
      </div>

      <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
        {loading ? <Loader /> : list.length === 0 ? (
          <p style={{ color: T.muted, textAlign: 'center', padding: 28, fontSize: 13 }}>Nenhum investimento cadastrado.</p>
        ) : list.map(inv => {
          const r = inv.initial_amount > 0 ? (((inv.current_amount || inv.initial_amount) - inv.initial_amount) / inv.initial_amount * 100).toFixed(2) : 0
          const prog = inv.target_amount ? Math.min((inv.current_amount || inv.initial_amount) / inv.target_amount * 100, 100).toFixed(0) : null
          return (
            <div key={inv.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{inv.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{tLabels[inv.type]} · {inv.institution || '—'}</div>
                  {inv.goal && <div style={{ fontSize: 11, color: T.blue, marginTop: 2 }}>🎯 {inv.goal}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...s.mono, fontSize: 16, color: T.green, fontWeight: 700 }}>{fmt(inv.current_amount || inv.initial_amount)}</div>
                  <div style={{ fontSize: 11, color: +r >= 0 ? T.green : T.red }}>{r}% retorno</div>
                  <button onClick={() => remove(inv.id)} style={{ color: T.red, fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', marginTop: 4 }}>remover</button>
                </div>
              </div>
              {prog && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>Meta: {fmt(inv.target_amount)}</span>
                    <span style={{ fontSize: 11, color: T.green }}>{prog}%</span>
                  </div>
                  <div style={{ background: T.border, borderRadius: 4, height: 6 }}>
                    <div style={{ width: prog + '%', background: T.green, borderRadius: 4, height: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <Modal title="Novo Investimento" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Nome</label>
              <input style={s.input} placeholder="Ex: Previdência Inter" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Tipo</label>
                <select style={s.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(tLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Instituição</label>
                <input style={s.input} placeholder="Inter, XP, Nubank..." value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Valor inicial (R$)</label>
                <input style={s.input} type="number" value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Saldo atual (R$)</label>
                <input style={s.input} type="number" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Meta (R$)</label>
                <input style={s.input} type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Retorno esperado %</label>
                <input style={s.input} type="number" placeholder="12.5" value={form.expected_return_pct} onChange={e => setForm({ ...form, expected_return_pct: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={s.label}>Objetivo</label>
              <input style={s.input} placeholder="Casa nova, Aposentadoria..." value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={s.btnS}>Cancelar</button>
              <button onClick={save} style={s.btnP}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
