import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'
import { fmt } from '../lib/format.js'
import Modal from './Modal.jsx'

function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: T.muted, fontSize: 13 }}>⏳ Carregando...</div>
}

const catEmoji = {
  emergency_fund: '🛡️',
  property: '🏠',
  vehicle: '🚗',
  travel: '✈️',
  education: '📚',
  retirement: '🏖️',
  other: '🎯'
}

export default function Goals({ user }) {
  const s = makeS()
  const [list, setList] = useState([])
  const [invList, setInvList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const emptyForm = { title: '', target_amount: '', current_amount: '0', deadline: '', category: 'other', investment_id: '' }
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    const [{ data: d }, { data: inv }] = await Promise.all([
      supabase.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('investments').select('id,name').eq('user_id', user.id)
    ])
    setList(d || [])
    setInvList(inv || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('goals-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  const save = async () => {
    if (!form.title) return
    await supabase.from('financial_goals').insert({
      user_id: user.id,
      title: form.title,
      category: form.category,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
      investment_id: form.investment_id || null,
      status: 'active'
    })
    setShowModal(false)
    setForm(emptyForm)
    load()
  }

  const remove = async id => {
    await supabase.from('financial_goals').delete().eq('id', id)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Metas Financeiras</h2>
        <button onClick={() => setShowModal(true)} style={s.btnP}>+ Nova meta</button>
      </div>

      {loading ? <Loader /> : list.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: 32, color: T.muted, fontSize: 13 }}>Nenhuma meta cadastrada.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {list.map(goal => {
            const pct = goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount * 100, 100).toFixed(0) : 0
            return (
              <div key={goal.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 24 }}>{catEmoji[goal.category] || '🎯'}</span>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 4 }}>{goal.title}</div>
                    {goal.deadline && <div style={{ fontSize: 11, color: T.muted }}>até {new Date(goal.deadline).toLocaleDateString('pt-BR')}</div>}
                  </div>
                  <button onClick={() => remove(goal.id)} style={{ color: T.red, fontSize: 18, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ ...s.mono, fontSize: 16, color: T.green, fontWeight: 700 }}>{fmt(goal.current_amount)}</span>
                  <span style={{ ...s.mono, fontSize: 13, color: T.muted }}>{fmt(goal.target_amount)}</span>
                </div>
                <div style={{ background: T.border, borderRadius: 6, height: 8 }}>
                  <div style={{ width: pct + '%', background: +pct >= 100 ? T.green : T.blue, borderRadius: 6, height: '100%', transition: 'width .5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: T.muted2 }}>{pct}%</span>
                  <span style={{ fontSize: 11, color: T.muted }}>Faltam {fmt(goal.target_amount - goal.current_amount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Nova Meta" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Título</label>
              <input style={s.input} placeholder="Ex: Entrada da casa" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Categoria</label>
              <select style={s.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {Object.entries(catEmoji).map(([v, emoji]) => <option key={v} value={v}>{emoji} {v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Valor alvo (R$)</label>
                <input style={s.input} type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Já tenho (R$)</label>
                <input style={s.input} type="number" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={s.label}>Prazo</label>
              <input style={s.input} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
            {invList.length > 0 && (
              <div>
                <label style={s.label}>Vincular aplicação</label>
                <select style={s.input} value={form.investment_id} onChange={e => setForm({ ...form, investment_id: e.target.value })}>
                  <option value="">Nenhuma</option>
                  {invList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
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
