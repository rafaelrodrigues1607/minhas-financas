import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, makeS } from '../lib/theme.js'
import { fmt, MONTHS, MONTH_NAMES } from '../lib/format.js'
import Chart from 'chart.js/auto'

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

function CumulativeChart({ data }) {
  const s = makeS()
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    let accI = 0, accE = 0
    const labels = [], incomeData = [], expenseData = []
    ;[...data].sort((a, b) => a.month - b.month).forEach(row => {
      accI += row.total_income || 0
      accE += row.total_expenses || 0
      labels.push(MONTHS[row.month - 1])
      incomeData.push(accI)
      expenseData.push(accE)
    })
    const gridColor = 'rgba(255,255,255,0.06)'
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Receitas acumuladas', data: incomeData, borderColor: T.green, backgroundColor: T.green + '22', fill: true, tension: 0.35, pointBackgroundColor: T.green, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2 },
          { label: 'Despesas acumuladas', data: expenseData, borderColor: T.red, backgroundColor: T.red + '22', fill: true, tension: 0.35, pointBackgroundColor: T.red, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12, padding: 16 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } }
        },
        scales: {
          x: { grid: { color: gridColor }, border: { color: gridColor }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: gridColor }, border: { color: gridColor }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => v >= 1000 ? 'R$' + (v / 1000).toFixed(0) + 'k' : 'R$' + v.toFixed(0) } }
        }
      }
    })
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [data])

  if (!data.length) return null
  return (
    <div style={{ ...s.card, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Evolução acumulada no ano</div>
      <div style={{ height: 240, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

function MonthlyBarChart({ data }) {
  const s = makeS()
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    const sorted = [...data].sort((a, b) => a.month - b.month)
    const labels = sorted.map(r => MONTHS[r.month - 1])
    const incomeData = sorted.map(r => r.total_income || 0)
    const expenseData = sorted.map(r => r.total_expenses || 0)
    const gridColor = 'rgba(255,255,255,0.06)'
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Receitas', data: incomeData, backgroundColor: T.green + 'cc', borderColor: T.green, borderWidth: 1, borderRadius: 4, borderSkipped: false },
          { label: 'Despesas', data: expenseData, backgroundColor: T.red + 'cc', borderColor: T.red, borderWidth: 1, borderRadius: 4, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12, padding: 16 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.raw) } }
        },
        scales: {
          x: { grid: { color: gridColor }, border: { color: gridColor }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: gridColor }, border: { color: gridColor }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => v >= 1000 ? 'R$' + (v / 1000).toFixed(0) + 'k' : 'R$' + v.toFixed(0) } }
        }
      }
    })
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [data])

  if (!data.length) return null
  return (
    <div style={{ ...s.card, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Receitas vs Despesas por mês</div>
      <div style={{ height: 240, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

export default function Reports({ user }) {
  const s = makeS()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [_repRt, _setRepRt] = useState(0)

  useEffect(() => {
    setLoading(true)
    supabase.from('monthly_balance').select('*').eq('user_id', user.id).eq('year', year).order('month').then(({ data: d }) => {
      setData(d || [])
      setLoading(false)
    })
  }, [user.id, year, _repRt])

  useEffect(() => {
    const ch = supabase.channel('rep-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => _setRepRt(x => x + 1))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user.id])

  const totalI = data.reduce((a, r) => a + (r.total_income || 0), 0)
  const totalE = data.reduce((a, r) => a + (r.total_expenses || 0), 0)
  const totalInv = data.reduce((a, r) => a + (r.total_investments || 0), 0)
  const totalB = data.reduce((a, r) => a + (r.balance || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Relatório {year}</h2>
        <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...s.input, width: 85 }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <KPI label="Receita anual" value={fmt(totalI)} icon="💰" color={T.green} />
        <KPI label="Despesas" value={fmt(totalE)} icon="💸" color={T.red} />
        <KPI label="Investido" value={fmt(totalInv)} icon="📈" color={T.blue} />
        <KPI label="Saldo total" value={fmt(totalB)} icon="🏦" color={totalB >= 0 ? T.green : T.red} />
      </div>

      {!loading && <CumulativeChart data={data} />}
      {!loading && <MonthlyBarChart data={data} />}

      <div style={{ ...s.card, padding: 0, overflow: 'auto' }}>
        {loading ? <Loader /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ background: T.surface2 }}>
                {['Mês', 'Receita', 'Despesas', 'Invest.', 'Saldo', 'Ess.%'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>Nenhum dado para {year}.</td></tr>
              ) : data.map(row => {
                const ePct = row.total_income > 0 ? (row.total_expenses / row.total_income * 100).toFixed(1) : '—'
                return (
                  <tr key={row.month} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: '11px 14px', color: T.muted2, fontSize: 13 }}>{MONTH_NAMES[row.month - 1]}</td>
                    <td style={{ padding: '11px 14px', ...s.mono, fontSize: 13, color: T.green }}>{fmt(row.total_income)}</td>
                    <td style={{ padding: '11px 14px', ...s.mono, fontSize: 13, color: T.red }}>{fmt(row.total_expenses)}</td>
                    <td style={{ padding: '11px 14px', ...s.mono, fontSize: 13, color: T.blue }}>{fmt(row.total_investments)}</td>
                    <td style={{ padding: '11px 14px', ...s.mono, fontSize: 13, color: row.balance >= 0 ? T.green : T.red }}>{fmt(row.balance)}</td>
                    <td style={{ padding: '11px 14px', ...s.mono, fontSize: 12, color: +ePct > 55 ? T.red : T.green }}>{ePct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
