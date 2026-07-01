import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, IS_NATIVE } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'
import { fmt, fmtDM, MONTHS, MONTH_NAMES, TYPE, PAY } from '../lib/format.js'
import Modal from './Modal.jsx'

function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: T.muted, fontSize: 13 }}>⏳ Carregando...</div>
}

export default function Transactions({ user }) {
  const s = makeS()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [list, setList] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const SALARY_CATS = ['Salário', 'Salário 13º', 'PLR']
  const EMPLOYERS = ['Poliedro', 'CTIS TECNOLOGIA S.A.', 'SQUADRA TECNOLOGIA S/A']
  const emptyForm = { description: '', amount_actual: '', type: 'expense', category_id: '', payment_method: 'credit_card', status: 'pending', transaction_date: '', empregador: '' }
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [detailTx, setDetailTx] = useState(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyForm, setCopyForm] = useState({ srcMonth: month === 1 ? 12 : month - 1, srcYear: month === 1 ? year - 1 : year, types: ['income', 'expense', 'investment'] })
  const [copying, setCopying] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [years, setYears] = useState([now.getFullYear()])

  useEffect(() => {
    supabase.from('monthly_periods').select('year').eq('user_id', user.id).order('year')
      .then(({ data: ys }) => { if (ys?.length) setYears([...new Set(ys.map(r => r.year))]) })
  }, [user.id])

  const getOrCreatePeriod = async () => {
    let { data: p } = await supabase.from('monthly_periods').select('id').eq('user_id', user.id).eq('year', year).eq('month', month).single()
    if (!p) {
      const { data: created } = await supabase.from('monthly_periods').insert({ user_id: user.id, year, month }).select().single()
      p = created
    }
    return p?.id
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: period }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('monthly_periods').select('id').eq('user_id', user.id).eq('year', year).eq('month', month).single()
    ])
    setCats(c || [])
    if (!period) { setList([]); setLoading(false); return }
    let q = supabase.from('transactions').select('*').eq('user_id', user.id).eq('period_id', period.id).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('type', filter)
    const { data: tx } = await q
    setList(tx || [])
    setLoading(false)
  }, [user.id, year, month, filter])

  const _txLoadRef = useRef(load)
  useEffect(() => { _txLoadRef.current = load }, [load])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('tx-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => _txLoadRef.current())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  const save = async () => {
    if (!form.description) return
    const payload = {
      description: form.description,
      amount_actual: parseFloat(form.amount_actual) || 0,
      type: form.type,
      category_id: form.category_id || null,
      payment_method: form.payment_method,
      status: form.status,
      transaction_date: form.transaction_date || null,
      empregador: form.empregador || null
    }
    if (editId) {
      await supabase.from('transactions').update(payload).eq('id', editId)
    } else {
      const period_id = await getOrCreatePeriod()
      if (!period_id) return
      await supabase.from('transactions').insert({ user_id: user.id, period_id, ...payload })
    }
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm)
    load()
  }

  const downloadCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Status', 'Pagamento']
    const rows = list.map(tx => [
      tx.transaction_date ? new Date(tx.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      '"' + (tx.description || '').replace(/"/g, '""') + '"',
      TYPE[tx.type] || tx.type,
      cats.find(c => c.id === tx.category_id)?.name || '',
      (tx.amount_actual || 0).toFixed(2).replace('.', ','),
      tx.status === 'paid' ? 'Pago' : 'Pendente',
      PAY[tx.payment_method] || tx.payment_method
    ])
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `transacoes-${MONTH_NAMES[month - 1]}-${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const startEdit = tx => {
    setForm({
      description: tx.description || '',
      amount_actual: tx.amount_actual || '',
      type: tx.type || 'expense',
      category_id: tx.category_id || '',
      payment_method: tx.payment_method || 'credit_card',
      status: tx.status || 'pending',
      transaction_date: tx.transaction_date || '',
      empregador: tx.empregador || ''
    })
    setEditId(tx.id)
    setShowModal(true)
  }

  const remove = async id => {
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  const markPaid = async tx => {
    await supabase.from('transactions').update({ status: 'paid', amount_actual: tx.amount_actual }).eq('id', tx.id)
    load()
  }

  const copyFromMonth = async () => {
    if (!copyForm.types.length) return
    setCopying(true)
    const { data: srcPeriod } = await supabase.from('monthly_periods').select('id').eq('user_id', user.id).eq('year', copyForm.srcYear).eq('month', copyForm.srcMonth).single()
    if (!srcPeriod) { alert('Nenhuma transação encontrada no mês de origem.'); setCopying(false); return }
    let q = supabase.from('transactions').select('*').eq('user_id', user.id).eq('period_id', srcPeriod.id)
    if (copyForm.types.length < 3) q = q.in('type', copyForm.types)
    const { data: srcTx } = await q
    if (!srcTx || !srcTx.length) { alert('Nenhuma transação encontrada no mês de origem.'); setCopying(false); return }
    const destPeriodId = await getOrCreatePeriod()
    if (!destPeriodId) { setCopying(false); return }
    const lastDay = new Date(year, month, 0).getDate()
    const inserts = srcTx.map(tx => {
      let newDate = null
      if (tx.transaction_date) {
        const d = new Date(tx.transaction_date + 'T12:00:00')
        const day = Math.min(d.getDate(), lastDay)
        newDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
      return { user_id: user.id, period_id: destPeriodId, description: tx.description, amount_actual: tx.amount_actual, type: tx.type, category_id: tx.category_id || null, payment_method: tx.payment_method, status: 'pending', transaction_date: newDate, notes: tx.notes || null, card_name: tx.card_name || null }
    })
    await supabase.from('transactions').insert(inserts)
    setCopying(false)
    setShowCopyModal(false)
    load()
  }

  const income = list.filter(t => t.type === 'income').reduce((a, t) => a + (t.amount_actual || 0), 0)
  const expense = list.filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount_actual || 0), 0)
  const investments = list.filter(t => t.type === 'investment').reduce((a, t) => a + (t.amount_actual || 0), 0)
  const balance = income - expense - investments

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Transações</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...s.input, width: 110 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...s.input, width: 85 }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} style={s.btnP}>+ Lançar</button>
          <button onClick={() => setShowCopyModal(true)} style={s.btnS}>📋 Copiar mês</button>
          <button onClick={downloadCSV} disabled={!list.length} style={{ ...s.btnS, opacity: list.length ? 1 : 0.4 }}>⬇ CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[['RECEITAS', income, T.green], ['DESPESAS', expense, T.red], ['SALDO', balance, balance >= 0 ? T.green : T.red]].map(([l, v, c]) => (
          <div key={l} className="txsc" style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>{l}</div>
            <div className="txsv" style={{ ...s.mono, color: c, fontSize: 16, fontWeight: 700 }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['all', 'Todos'], ['income', 'Receitas'], ['expense', 'Despesas'], ['investment', 'Invest.']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            background: filter === v ? T.green + '22' : T.surface2,
            color: filter === v ? T.green : T.muted2,
            border: `1px solid ${filter === v ? T.green + '44' : T.border}`
          }}>{l}</button>
        ))}
      </div>

      <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
        {loading ? <Loader /> : list.length === 0 ? (
          <p style={{ color: T.muted, textAlign: 'center', padding: 28, fontSize: 13 }}>Nenhuma transação encontrada.</p>
        ) : (
          [['income', 'Receitas', T.green], ['expense', 'Despesas', T.red], ['investment', 'Investimentos', T.blue]].map(([gType, gLabel, gColor]) => {
            const rawItems = list.filter(t => t.type === gType)
            const gItems = gType === 'expense'
              ? [...rawItems].sort((a, b) => {
                  const aCC = a.payment_method === 'credit_card' ? 0 : 1
                  const bCC = b.payment_method === 'credit_card' ? 0 : 1
                  if (aCC !== bCC) return aCC - bCC
                  const aCat = cats.find(c => c.id === a.category_id)?.name || ''
                  const bCat = cats.find(c => c.id === b.category_id)?.name || ''
                  return aCat.localeCompare(bCat, 'pt-BR')
                })
              : rawItems
            if (!gItems.length) return null
            const gTotal = gItems.reduce((a, t) => a + (t.amount_actual || 0), 0)
            return (
              <div key={gType}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: gColor + '11', borderBottom: `1px solid ${gColor}33` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: gColor, textTransform: 'uppercase', letterSpacing: 1 }}>{gLabel}</span>
                  <span style={{ ...s.mono, fontSize: 12, color: gColor }}>{fmt(gTotal)}</span>
                </div>
                {gItems.map(tx => {
                  const cat = cats.find(c => c.id === tx.category_id)
                  if (IS_NATIVE) {
                    return (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: `1px solid ${T.border}`, gap: 10, background: tx.status !== 'paid' ? T.red + '18' : 'transparent' }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{cat?.icon || '💸'}</span>
                        <div style={{ minWidth: 0, overflow: 'hidden', flexShrink: 1 }}>
                          <div onClick={() => setDetailTx(tx)} style={{ fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: T.border }}>
                            {tx.description}
                          </div>
                          <div style={{ fontSize: 11, color: T.muted }}>{cat?.name || tx.type}{tx.empregador ? ` · ${tx.empregador}` : ''} · {tx.payment_method}</div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <div style={{ ...s.mono, fontSize: 13, color: tx.type === 'income' ? T.green : T.red }}>{fmt(tx.amount_actual)}</div>
                          <div style={{ fontSize: 10, color: tx.status === 'paid' ? T.green : T.yellow }}>{tx.status === 'paid' ? '✓ pago' : 'pendente'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                          {tx.status !== 'paid' && (
                            <button onClick={() => markPaid(tx)} style={{ background: T.green + '22', color: T.green, padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none' }}>✓</button>
                          )}
                          <button onClick={() => startEdit(tx)} title="Editar" style={{ color: T.muted2, fontSize: 15, cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px' }}>✏</button>
                          <button onClick={() => setConfirmDeleteId(tx.id)} style={{ color: T.red, fontSize: 18, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 44px 100px 76px auto', alignItems: 'center', padding: '11px 14px', borderBottom: `1px solid ${T.border}`, gap: 10, background: tx.status !== 'paid' ? T.red + '18' : 'transparent' }}>
                      <span style={{ fontSize: 18 }}>{cat?.icon || '💸'}</span>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div onClick={() => setDetailTx(tx)} style={{ fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: T.border }}>
                          {tx.description}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat?.name || tx.type}{tx.empregador ? ` · ${tx.empregador}` : ''} · {tx.payment_method}</div>
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, textAlign: 'right' }}>{fmtDM(tx.transaction_date)}</div>
                      <div style={{ ...s.mono, fontSize: 13, color: tx.type === 'income' ? T.green : T.red, textAlign: 'right' }}>{fmt(tx.amount_actual)}</div>
                      <div style={{ fontSize: 11, textAlign: 'center', color: tx.status === 'paid' ? T.green : T.yellow }}>{tx.status === 'paid' ? '✓ Pago' : 'Pendente'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {tx.status !== 'paid' && (
                          <button onClick={() => markPaid(tx)} style={{ background: T.green + '22', color: T.green, padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none' }}>✓</button>
                        )}
                        <button onClick={() => startEdit(tx)} title="Editar" style={{ color: T.muted2, fontSize: 15, cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px' }}>✏</button>
                        <button onClick={() => setConfirmDeleteId(tx.id)} style={{ color: T.red, fontSize: 18, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <Modal title={editId ? 'Editar Transação' : 'Nova Transação'} onClose={() => { setShowModal(false); setEditId(null); setForm(emptyForm) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Tipo</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['income', 'Receita', T.green], ['expense', 'Despesa', T.red], ['investment', 'Investimento', T.blue]].map(([v, l, c]) => (
                  <button key={v} onClick={() => setForm({ ...form, type: v })} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: form.type === v ? c + '22' : T.surface2, color: form.type === v ? c : T.muted2, border: `1px solid ${form.type === v ? c + '44' : T.border}` }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={s.label}>Descrição</label>
              <input style={s.input} placeholder="Ex: Cartão Caixa Infinite" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>{form.type === 'income' ? 'Recebimento' : form.type === 'investment' ? 'Data do investimento' : 'Vencimento'}</label>
              <input style={s.input} type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Valor (R$)</label>
              <input style={s.input} type="number" placeholder="0.00" value={form.amount_actual} onChange={e => setForm({ ...form, amount_actual: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Categoria</label>
              <select style={s.input} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Selecionar...</option>
                {cats.filter(c => c.type === form.type).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {SALARY_CATS.includes(cats.find(c => c.id === form.category_id)?.name) && (
              <div>
                <label style={s.label}>Empregador</label>
                <select style={s.input} value={form.empregador} onChange={e => setForm({ ...form, empregador: e.target.value })}>
                  <option value="">Selecionar...</option>
                  {EMPLOYERS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}
            <div className="fmg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Pagamento</label>
                <select style={s.input} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {[['credit_card', 'Crédito'], ['debit_card', 'Débito'], ['pix', 'Pix'], ['cash', 'Dinheiro'], ['bank_transfer', 'TED/DOC'], ['other', 'Outro']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={s.btnS}>Cancelar</button>
              <button onClick={save} style={s.btnP}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {showCopyModal && (
        <Modal title="Copiar transações para este mês" onClose={() => setShowCopyModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={s.label}>Copiar de</label>
              <div className="fmg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <select style={s.input} value={copyForm.srcMonth} onChange={e => setCopyForm({ ...copyForm, srcMonth: +e.target.value })}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select style={s.input} value={copyForm.srcYear} onChange={e => setCopyForm({ ...copyForm, srcYear: +e.target.value })}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={s.label}>Para</label>
              <div style={{ ...s.input, color: T.muted2 }}>{MONTHS[month - 1]} {year}</div>
            </div>
            <div>
              <label style={s.label}>Tipos</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['income', 'Receitas', T.green], ['expense', 'Despesas', T.red], ['investment', 'Investimentos', T.blue]].map(([v, l, c]) => {
                  const checked = copyForm.types.includes(v)
                  return (
                    <button key={v} onClick={() => setCopyForm({ ...copyForm, types: checked ? copyForm.types.filter(t => t !== v) : [...copyForm.types, v] })} style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: checked ? c + '22' : T.surface2, color: checked ? c : T.muted2, border: `1px solid ${checked ? c + '44' : T.border}` }}>{l}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCopyModal(false)} style={s.btnS}>Cancelar</button>
              <button onClick={copyFromMonth} disabled={copying || !copyForm.types.length} style={{ ...s.btnP, opacity: copying || !copyForm.types.length ? 0.6 : 1 }}>
                {copying ? 'Copiando...' : 'Copiar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteId && (
        <Modal title="Excluir transação" onClose={() => setConfirmDeleteId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 14, color: T.muted2, lineHeight: 1.5 }}>Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={s.btnS}>Cancelar</button>
              <button onClick={() => { remove(confirmDeleteId); setConfirmDeleteId(null) }} style={{ ...s.btnP, background: T.red }}>Excluir</button>
            </div>
          </div>
        </Modal>
      )}

      {detailTx && (() => {
        const dc = cats.find(c => c.id === detailTx.category_id)
        const row = (label, value) => value != null && value !== '' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: `1px solid ${T.border}`, gap: 12 }}>
            <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: T.text, textAlign: 'right' }}>{value}</span>
          </div>
        ) : null
        return (
          <Modal title={detailTx.description} onClose={() => setDetailTx(null)}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{dc?.icon || '💸'}</div>
                <div style={{ ...s.mono, fontSize: 24, fontWeight: 700, color: detailTx.type === 'income' ? T.green : detailTx.type === 'investment' ? T.blue : T.red }}>
                  {fmt(detailTx.amount_actual)}
                </div>
                <div style={{ fontSize: 11, color: detailTx.status === 'paid' ? T.green : T.yellow, marginTop: 4 }}>
                  {detailTx.status === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                </div>
              </div>
              {row('Tipo', TYPE[detailTx.type])}
              {row('Categoria', dc ? `${dc.icon} ${dc.name}` : '—')}
              {detailTx.empregador ? row('Empregador', detailTx.empregador) : null}
              {row('Valor', fmt(detailTx.amount_actual))}
              {row('Pagamento', PAY[detailTx.payment_method] || detailTx.payment_method)}
              {detailTx.card_name ? row('Cartão', detailTx.card_name) : null}
              {row(detailTx.type === 'income' ? 'Recebimento' : detailTx.type === 'investment' ? 'Data do investimento' : 'Vencimento', detailTx.transaction_date ? new Date(detailTx.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—')}
              {row('Criado em', new Date(detailTx.created_at).toLocaleString('pt-BR'))}
              {detailTx.notes ? row('Notas', detailTx.notes) : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setDetailTx(null)} style={s.btnS}>Fechar</button>
                <button onClick={() => { setDetailTx(null); startEdit(detailTx) }} style={s.btnP}>✏ Editar</button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
