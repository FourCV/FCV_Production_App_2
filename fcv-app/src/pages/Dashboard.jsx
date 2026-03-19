import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt, MONTHS } from '../lib/utils'

export default function Dashboard() {
  const [stats, setStats]   = useState(null)
  const [live, setLive]     = useState(true)
  const yr = new Date().getFullYear().toString()

  useEffect(() => {
    loadStats()
    const ch = supabase.channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, loadStats)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadStats() {
    const { data: all } = await supabase.from('jobs').select('fee,net_fee,fee_collected,fee_collected_date,cancelled,month,year,client_name,job_number,contract_date,appraiser_payment_due')
    if (!all) return
    const yearJobs = all.filter(j => j.year === yr)
    const totalFee = all.reduce((s,j)=>s+(Number(j.fee)||0),0)
    const yearFee  = yearJobs.reduce((s,j)=>s+(Number(j.fee)||0),0)
    const totalCollected = all.reduce((s,j)=>s+(Number(j.fee_collected)||0),0)
    const pending = all.filter(j=>Number(j.fee)>0 && !j.fee_collected_date && !j.cancelled).length
    const monthData = {}
    MONTHS.forEach(m=>monthData[m]=0)
    yearJobs.forEach(j=>{if(j.month && monthData[j.month]!==undefined) monthData[j.month]+=(Number(j.fee)||0)})
    const cancelled = all.filter(j=>j.cancelled).length
    const clientCounts = {}
    all.forEach(j=>{if(j.client_name)clientCounts[j.client_name]=(clientCounts[j.client_name]||0)+1})
    const topClient = Object.entries(clientCounts).sort((a,b)=>b[1]-a[1])[0]
    const recent = [...all].reverse().slice(0,10)
    setStats({ totalJobs:all.length, totalFee, yearFee, totalCollected, pending, monthData, cancelled, topClient, recent, yearJobs:yearJobs.length })
    document.querySelector('.sidebar-stat-val')&&(document.querySelector('.sidebar-stat-val').textContent=all.length.toLocaleString())
  }

  if (!stats) return <div style={{padding:40,color:'var(--text3)',textAlign:'center'}}>Loading dashboard…</div>
  const maxMonth = Math.max(...Object.values(stats.monthData), 1)

  return (
    <>
      {/* Live badge */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <span className="live-badge"><span className="live-dot"></span> Live</span>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Total Jobs</div><div className="kpi-value">{stats.totalJobs.toLocaleString()}</div><div className="kpi-sub">All time</div></div>
        <div className="kpi-card teal"><div className="kpi-label">Total Revenue</div><div className="kpi-value">{fmt(stats.totalFee)}</div><div className="kpi-sub">All time fees</div></div>
        <div className="kpi-card navy"><div className="kpi-label">{yr} Revenue</div><div className="kpi-value">{fmt(stats.yearFee)}</div><div className="kpi-sub">{stats.yearJobs} jobs this year</div></div>
        <div className="kpi-card sand"><div className="kpi-label">Uncollected</div><div className="kpi-value">{stats.pending}</div><div className="kpi-sub">Payments pending</div></div>
      </div>

      <div className="dash-3-1">
        {/* Month bars */}
        <div className="card">
          <div className="card-title">{yr} Revenue by Month</div>
          {MONTHS.map(m => (
            <div className="month-bar" key={m}>
              <span className="month-bar-name">{m}</span>
              <div className="month-bar-track"><div className="month-bar-fill" style={{width:(stats.monthData[m]/maxMonth*100).toFixed(1)+'%'}}/></div>
              <span className="month-bar-val">{stats.monthData[m]>0?fmt(stats.monthData[m]):'—'}</span>
            </div>
          ))}
        </div>
        {/* Quick stats */}
        <div className="card">
          <div className="card-title">Quick Stats</div>
          {[
            ['Total Collected', fmt(stats.totalCollected), 'var(--teal)'],
            ['Cancelled Jobs', stats.cancelled, 'var(--red)'],
            ['Top Client', stats.topClient?stats.topClient[0]:'—', 'var(--navy)'],
            ['Top Client Jobs', stats.topClient?stats.topClient[1]+' jobs':'—', 'var(--navy)'],
          ].map(([lbl,val,col])=>(
            <div key={lbl} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{color:'var(--text2)',fontSize:13}}>{lbl}</span>
              <strong style={{fontFamily:'DM Mono,monospace',fontSize:13,color:col}}>{val}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Recent jobs */}
      <div className="card">
        <div className="card-title">Recent Jobs</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Job #</th><th>Client</th><th>Fee</th><th>Status</th><th>Period</th></tr></thead>
            <tbody>
              {stats.recent.map(j=>(
                <tr key={j.job_number}>
                  <td className="job-id">{j.job_number||'—'}</td>
                  <td>{(j.client_name||'').substring(0,38)}</td>
                  <td className="mono">{fmt(j.fee)}</td>
                  <td>{j.fee_collected_date?<span className="badge badge-green">Collected</span>:<span className="badge badge-sand">Pending</span>}</td>
                  <td className="mono">{j.month} {j.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
