import { useState } from 'react'
import { useJobs } from '../hooks/useJobs'
import { fmt, MONTHS } from '../lib/utils'
import JobModal from '../components/JobModal'

const YEARS = ['2023','2024','2025','2026']
const PER_PAGE = 50

export default function JobsPage() {
  const [year, setYear]     = useState('')
  const [month, setMonth]   = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [editJob, setEditJob] = useState(null)
  const { jobs, loading, total } = useJobs({ year, month, status, search })
  const pages = Math.ceil(total / PER_PAGE)
  const pageData = jobs.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <>
      <div className="filter-bar">
        <select className="filter-select" value={year}   onChange={e=>{setYear(e.target.value);setPage(1)}}>
          <option value="">All Years</option>{YEARS.map(y=><option key={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={month}  onChange={e=>{setMonth(e.target.value);setPage(1)}}>
          <option value="">All Months</option>{MONTHS.map(m=><option key={m}>{m}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
          <option value="">All Status</option>
          <option value="collected">Fee Collected</option>
          <option value="pending">Payment Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input className="filter-select" style={{width:220}} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        <button className="btn btn-ghost btn-sm" onClick={()=>{setYear('');setMonth('');setStatus('');setSearch('');setPage(1)}}>Clear</button>
        <span className="filter-count">{loading ? '…' : total.toLocaleString()+' jobs'}</span>
      </div>

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Job #</th><th>Client</th><th>Address</th><th>Contract</th><th>Due</th>
              <th>Fee</th><th>Collected</th><th>Net Fee</th><th>Status</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>Loading…</td></tr>}
              {!loading && pageData.length === 0 && <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>No jobs found</td></tr>}
              {pageData.map(j => (
                <tr key={j.id} onClick={()=>setEditJob(j)}>
                  <td className="job-id">{j.job_number||'—'}</td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(j.client_name||'').substring(0,38)}</td>
                  <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text3)'}}>{(j.address||'').substring(0,32)}</td>
                  <td className="mono">{j.contract_date||'—'}</td>
                  <td className="mono">{j.due_date||'—'}</td>
                  <td className="mono">{fmt(j.fee)}</td>
                  <td className="mono">{j.fee_collected_date ? fmt(j.fee_collected) : <span style={{color:'var(--text3)'}}>—</span>}</td>
                  <td className="mono">{fmt(j.net_fee)}</td>
                  <td>{j.is_cancelled ? <span className="badge badge-red">Cancelled</span> : j.fee_collected_date ? <span className="badge badge-green">Collected</span> : <span className="badge badge-sand">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>←</button>
            {Array.from({length:Math.min(pages,7)},(_,i)=>{
              const p=page<=4?i+1:page+i-3
              if(p<1||p>pages)return null
              return <button key={p} className={'page-btn'+(p===page?' active':'')} onClick={()=>setPage(p)}>{p}</button>
            })}
            <button className="page-btn" onClick={()=>setPage(p=>p+1)} disabled={page===pages}>→</button>
          </div>
        )}
      </div>

      {editJob && <JobModal job={editJob} onClose={()=>setEditJob(null)} onSaved={()=>setEditJob(null)}/>}
    </>
  )
}
