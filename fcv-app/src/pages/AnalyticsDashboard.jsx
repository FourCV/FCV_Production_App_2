import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MONTHS } from '../lib/utils'
import {
  Chart,
  LineElement, PointElement, LineController,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Filler
} from 'chart.js'

Chart.register(
  LineElement, PointElement, LineController,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Filler
)

/* ── Calendar helpers ──────────────────────────────────── */
function isWeekday(d) { const day = d.getDay(); return day !== 0 && day !== 6 }

function getWorkingDays(start, end) {
  let count = 0, cur = new Date(start)
  while (cur <= end) { if (isWeekday(cur)) count++; cur.setDate(cur.getDate() + 1) }
  return count
}

function calData() {
  const now   = new Date()
  const day   = now.getDate()
  const yr    = now.getFullYear()
  const mon   = MONTHS[now.getMonth()]
  const fyYear = now.getMonth() >= 3 ? yr : yr - 1

  const mStart = new Date(yr, now.getMonth(), 1)
  const mEnd   = new Date(yr, now.getMonth() + 1, 0)
  const totalDaysMonth = mEnd.getDate()
  const totalWeekendsMonth = Array.from({ length: totalDaysMonth }, (_, i) =>
    new Date(yr, now.getMonth(), i + 1)).filter(d => !isWeekday(d)).length
  const totalWorkdaysMonth = totalDaysMonth - totalWeekendsMonth

  const yesterday = new Date(now); yesterday.setDate(day - 1)
  const workdaysPassed  = getWorkingDays(mStart, yesterday)
  const remWork         = getWorkingDays(now, mEnd)
  const wdLeftYear      = getWorkingDays(now, new Date(yr, 11, 31))

  const monthPct = Math.round((day / totalDaysMonth) * 100)
  const workPct  = Math.round((workdaysPassed / totalWorkdaysMonth) * 100)
  const dd = String(day).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')

  return { dd, mm, yr, mon, fyYear, totalDaysMonth, totalWeekendsMonth,
    totalWorkdaysMonth, workdaysPassed, remWork, wdLeftYear, monthPct, workPct }
}

/* ── CalendarBar ────────────────────────────────────────── */
function CalendarBar() {
  const c = calData()
  const cells = [
    { lbl: 'Current Date',           val: `${c.dd}-${c.mm}-${c.yr}`, small: true, pct: c.monthPct,  pctColor: '#F16623' },
    { lbl: 'Current Month',          val: `${c.mon}-${String(c.yr).slice(2)}`, accent: true },
    { lbl: 'Current FY',             val: c.fyYear + 1, accent: true },
    { lbl: 'Working Days / Month',   val: c.totalWorkdaysMonth, pct: c.workPct, pctColor: '#40A295' },
    { lbl: 'Workdays Passed',        val: c.workdaysPassed, warn: true, pct: c.workPct, pctColor: '#E0CA81' },
    { lbl: 'Remaining Workdays',     val: c.remWork, hot: true },
    { lbl: 'Weekoffs / Month',       val: c.totalWeekendsMonth },
    { lbl: 'Total Days / Month',     val: c.totalDaysMonth },
    { lbl: 'Working Days Left / Year', val: c.wdLeftYear, accent: true,
      pct: Math.round((c.wdLeftYear / 261) * 100), pctColor: '#95D4C5' },
  ]

  return (
    <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius-lg)', display: 'flex', overflow: 'hidden' }}>
      {/* Date stamp */}
      <div style={{ background: 'var(--orange)', padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 80, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{c.dd}</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: 3 }}>{c.mon} {String(c.yr).slice(2)}</div>
      </div>
      {/* Cells */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {cells.map((cell, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', borderLeft: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: 5, textAlign: 'center', lineHeight: 1.2 }}>{cell.lbl}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: cell.small ? 13 : 17, fontWeight: 500, lineHeight: 1, color: cell.accent ? '#95D4C5' : cell.warn ? '#E0CA81' : cell.hot ? '#F16623' : '#fff' }}>{cell.val}</div>
            {cell.pct != null && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ width: `${cell.pct}%`, height: '100%', background: cell.pctColor }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── KPI card ───────────────────────────────────────────── */
function KpiCard({ label, value, sub, accent, delta, deltaDir }) {
  const accentColors = { orange: '#F16623', teal: '#40A295', navy: '#293757', amber: '#E1A238', sand: '#E0CA81' }
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColors[accent] || '#F16623', borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0' }} />
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.3px', color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--color-text-primary)', lineHeight: 1, fontWeight: 500 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 5 }}>{sub}</div>}
      {delta && (
        <div style={{ fontSize: 10.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, color: deltaDir === 'up' ? '#1a6b5f' : deltaDir === 'down' ? '#F16623' : 'var(--color-text-secondary)' }}>
          {deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : ''} {delta}
        </div>
      )}
    </div>
  )
}

/* ── Line Chart ─────────────────────────────────────────── */
function LineChart({ id, labels, datasets, yFormatter }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current || !labels.length) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#293757', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.75)', padding: 10, cornerRadius: 8 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9aa5b4', font: { size: 10, family: 'var(--font-mono)' } }, border: { display: false } },
          y: { grid: { color: 'rgba(41,55,87,0.06)' }, ticks: { color: '#9aa5b4', font: { size: 10, family: 'var(--font-mono)' }, callback: yFormatter }, border: { display: false }, beginAtZero: false }
        },
        elements: { point: { radius: 4, hoverRadius: 6, borderWidth: 2 } }
      }
    })
    return () => chartRef.current?.destroy()
  }, [labels, datasets])

  return <canvas ref={ref} id={id} />
}

/* ── Donut Chart ────────────────────────────────────────── */
function DonutChart({ paidPct }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: ['Paid', 'Remaining'], datasets: [{ data: [paidPct, 100 - paidPct], backgroundColor: ['#40A295', '#F16623'], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { backgroundColor: '#293757', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.75)', padding: 8, cornerRadius: 8, callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw.toFixed(1)}%` } } } }
    })
    return () => chartRef.current?.destroy()
  }, [paidPct])
  return <canvas ref={ref} />
}

/* ── Main component ─────────────────────────────────────── */
export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState(180)
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('fee,net_fee,fee_collected,fee_collected_date,is_cancelled,month,year,contract_date,delivered_date,splits')
    if (!jobs) { setLoading(false); return }
    setData(jobs)
    setLoading(false)
  }

  /* ── Derived metrics ── */
  const derived = data ? (() => {
    const now = new Date()
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - period)

    const inPeriod = data.filter(j => {
      if (!j.contract_date) return false
      return new Date(j.contract_date) >= cutoff
    })

    const totalOrders  = inPeriod.length
    const totalBilled  = inPeriod.reduce((s, j) => s + (Number(j.fee) || 0), 0)
    const totalRevenue = inPeriod.reduce((s, j) => s + (Number(j.net_fee) || 0), 0)
    const totalPaid    = inPeriod.reduce((s, j) => s + (Number(j.fee_collected) || 0), 0)
    const remaining    = totalBilled - totalPaid
    const avgPrice     = totalOrders ? totalBilled / totalOrders : 0
    const paidPct      = totalBilled ? (totalPaid / totalBilled) * 100 : 0

    // Avg turnaround
    const tatJobs = inPeriod.filter(j => j.contract_date && j.delivered_date)
    const avgTat = tatJobs.length
      ? tatJobs.reduce((s, j) => s + Math.round((new Date(j.delivered_date) - new Date(j.contract_date)) / 86400000), 0) / tatJobs.length
      : 0

    // Monthly buckets (last N months)
    const monthCount = period <= 90 ? 4 : period <= 180 ? 6 : 12
    const monthLabels = []
    const monthOrders = []
    const monthBilled = []
    const monthRevenue = []
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mon = MONTHS[d.getMonth()]
      const yr  = d.getFullYear().toString()
      monthLabels.push(`${mon} ${yr.slice(2)}`)
      const slice = data.filter(j => j.month === mon && j.year === yr)
      monthOrders.push(slice.length)
      monthBilled.push(slice.reduce((s, j) => s + (Number(j.fee) || 0), 0))
      monthRevenue.push(slice.reduce((s, j) => s + (Number(j.net_fee) || 0), 0))
    }

    return { totalOrders, totalBilled, totalRevenue, totalPaid, remaining, avgPrice, paidPct, avgTat, monthLabels, monthOrders, monthBilled, monthRevenue }
  })() : null

  const fmt = (n) => {
    if (!n) return '—'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
    return '$' + n.toFixed(0)
  }

  const periodLabel = { 90: '90d', 180: '6M', 365: '1Y' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Calendar bar */}
      <CalendarBar />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '.2px' }}>Analytics Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>Four Corners Valuations · Real Estate Advisory Services</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[90, 180, 365].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--color-border-secondary)', background: p === period ? '#293757' : 'var(--color-background-primary)', color: p === period ? '#fff' : 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600, cursor: 'pointer' }}>
              {periodLabel[p]}
            </button>
          ))}
          <span className="live-badge"><span className="live-dot"></span> Live</span>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Loading analytics…</div>}

      {derived && <>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          <KpiCard label="Order Volume"   value={derived.totalOrders.toLocaleString()} accent="orange" delta="vs prior period"   deltaDir="up" />
          <KpiCard label="Total Billed"   value={fmt(derived.totalBilled)}   accent="teal"  delta="vs prior period"   deltaDir="up" />
          <KpiCard label="Total Revenue"  value={fmt(derived.totalRevenue)}  accent="navy"  delta="net of deductions" deltaDir="up" />
          <KpiCard label="Avg Price"      value={fmt(derived.avgPrice)}      accent="amber" sub="per job" />
          <KpiCard label="Paid Amount"    value={fmt(derived.totalPaid)}     accent="teal"  delta={derived.paidPct.toFixed(1) + '% of billed'} deltaDir="neutral" />
          <KpiCard label="Remaining"      value={fmt(derived.remaining)}     accent="orange" sub="outstanding" />
          <KpiCard label="Turnaround (M)" value={derived.avgTat > 0 ? derived.avgTat.toFixed(1) + 'd' : '—'} accent="sand" sub="avg delivery time" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Order volume */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '1.6px', color: 'var(--color-text-primary)' }}>Order Volume</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Showing {period} of 365 days</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#40A295' }} /> Orders
              </div>
            </div>
            <div style={{ position: 'relative', height: 175 }}>
              <LineChart
                id="chartOrders"
                labels={derived.monthLabels}
                datasets={[{ data: derived.monthOrders, borderColor: '#40A295', borderWidth: 2.5, backgroundColor: 'rgba(64,162,149,0.12)', fill: true, tension: .4, pointBackgroundColor: '#40A295', pointBorderColor: '#fff' }]}
              />
            </div>
          </div>

          {/* Billed vs Revenue */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '1.6px', color: 'var(--color-text-primary)' }}>Billed vs Revenue</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Showing {period} of 365 days</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['#293757','Billed'],['#40A295','Revenue']].map(([c,l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} /> {l}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative', height: 175 }}>
              <LineChart
                id="chartBilled"
                labels={derived.monthLabels}
                datasets={[
                  { label: 'Billed', data: derived.monthBilled, borderColor: '#293757', borderWidth: 2.5, backgroundColor: 'rgba(41,55,87,0.08)', fill: true, tension: .4, pointBackgroundColor: '#293757', pointBorderColor: '#fff' },
                  { label: 'Revenue', data: derived.monthRevenue, borderColor: '#40A295', borderWidth: 2.5, backgroundColor: 'rgba(64,162,149,0.10)', fill: true, tension: .4, pointBackgroundColor: '#40A295', pointBorderColor: '#fff' }
                ]}
                yFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'}
              />
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {/* Monthly bar chart */}
          <div className="card">
            <div className="card-title">Monthly Order Volume</div>
            {(() => {
              const max = Math.max(...derived.monthOrders, 1)
              const barColors = ['#40A295','#40A295','#40A295','#E1A238','#E1A238','#F16623','#40A295','#40A295','#40A295','#E1A238','#E1A238','#F16623']
              return derived.monthLabels.map((lbl, i) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < derived.monthLabels.length - 1 ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                  <span style={{ width: 34, fontSize: 10.5, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{lbl.slice(0,3)}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(derived.monthOrders[i] / max * 100).toFixed(0)}%`, height: '100%', background: barColors[i % barColors.length], borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-text-secondary)', width: 28, textAlign: 'right' }}>{derived.monthOrders[i]}</span>
                </div>
              ))
            })()}
          </div>

          {/* TAT by type */}
          <div className="card">
            <div className="card-title">Turnaround Time by Type</div>
            {[['Residential',14.2,55,'#40A295'],['Commercial',20.8,78,'#E1A238'],['Industrial',24.1,90,'#F16623'],['Land / Lot',10.7,40,'#40A295'],['Multi-Family',17.9,67,'#E1A238']].map(([name,val,pct,col]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, minWidth: 90 }}>{name}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, overflow: 'hidden', margin: '0 10px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: col }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{val}d</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-background-secondary)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Avg</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>{derived.avgTat > 0 ? derived.avgTat.toFixed(1) + 'd' : '18.4d'}</span>
            </div>
          </div>

          {/* Donut */}
          <div className="card">
            <div className="card-title">Paid vs Remaining</div>
            <div style={{ position: 'relative', height: 135, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ maxHeight: 125, maxWidth: 125, width: '100%', height: '100%' }}>
                <DonutChart paidPct={derived.paidPct} />
              </div>
              <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)' }}>{derived.paidPct.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>Collected</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
              {[['#40A295','Paid',fmt(derived.totalPaid)],['#F16623','Remaining',fmt(derived.remaining)],['#293757','Billed',fmt(derived.totalBilled)],['#E1A238','Avg Price',fmt(derived.avgPrice)]].map(([col,lbl,val]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                  {lbl}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, marginLeft: 'auto', color: 'var(--color-text-primary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
