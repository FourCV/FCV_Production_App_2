import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calcSplits, STAFF_NAMES, n } from '../lib/utils'
import toast from 'react-hot-toast'
import { X, Trash2 } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt2 = (v) => v != null && !isNaN(v) ? Number(v).toFixed(2) : ''

export default function JobModal({ job = null, onClose, onSaved }) {
  const isNew = !job

  // When editing, commission fields live inside job.splits (JSONB) — spread them
  // into the form so inputs like pct_fcv, marketing1, etc. are populated.
  const [form, setForm] = useState(() => {
    if (!job) return {
      job_number: '', client_name: '', address: '', contract_date: '', due_date: '',
      delivered_date: '', month: 'Jan', year: new Date().getFullYear().toString(),
      fee: '', expenses: 0, modum_fee: 0, subcontractor_fee: 0,
      fee_collected: '', fee_collected_date: '', appraiser_payment_due: '',
      payment_terms: 'Inclusive', expense_terms: 'Inclusive', subcontractor: '',
      qb_payment_date: '', pct_fcv: 0.3, pct_dw: 0, pct_production: 0.6,
      marketing1: '', marketing1_pct: 0.1, marketing2: '', marketing2_pct: 0,
      appraiser1: '', appraiser1_pct: 0, appraiser2: '', appraiser2_pct: 0,
      analyst: '', analyst_pct: 0, ir: '', ir_pct: 0,
      comments: '', cancelled: false, requested: '',
      staff_assigned: [],
    }
    // Flatten DB row: spread splits JSONB into top-level, map is_cancelled → cancelled
    const { splits = {}, is_cancelled, net_fee, ...rest } = job
    return { ...rest, ...splits, cancelled: !!is_cancelled }
  })
  const [saving, setSaving] = useState(false)
  const splits = calcSplits(form)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleStaff(name) {
    setForm(f => ({
      ...f,
      staff_assigned: f.staff_assigned?.includes(name)
        ? f.staff_assigned.filter(s => s !== name)
        : [...(f.staff_assigned || []), name]
    }))
  }

  async function handleSave() {
    if (!form.job_number) { toast.error('Job # is required'); return }
    setSaving(true)

    // Build splits JSONB from current form values + calculated amounts
    const computed = calcSplits(form)
    const splitsPayload = {
      pct_fcv:        n(form.pct_fcv),
      pct_dw:         n(form.pct_dw),
      pct_production: n(form.pct_production),
      ...computed,
      marketing1:     form.marketing1     || '',  marketing1_pct: n(form.marketing1_pct),
      marketing2:     form.marketing2     || '',  marketing2_pct: n(form.marketing2_pct),
      appraiser1:     form.appraiser1     || '',  appraiser1_pct: n(form.appraiser1_pct),
      appraiser2:     form.appraiser2     || '',  appraiser2_pct: n(form.appraiser2_pct),
      analyst:        form.analyst        || '',  analyst_pct:    n(form.analyst_pct),
      ir:             form.ir             || '',  ir_pct:         n(form.ir_pct),
    }

    // Remove fields that are flat commission keys (now live in splits JSONB),
    // the generated net_fee column, and the local `cancelled` alias.
    const {
      cancelled, net_fee, splits: _s,
      pct_fcv, pct_dw, pct_production,
      marketing1, marketing1_pct, marketing2, marketing2_pct,
      appraiser1, appraiser1_pct, appraiser2, appraiser2_pct,
      analyst, analyst_pct, ir, ir_pct,
      ...base
    } = form

    const payload = { ...base, is_cancelled: !!cancelled, splits: splitsPayload }

    let error
    if (isNew) ({ error } = await supabase.from('jobs').insert(payload))
    else       ({ error } = await supabase.from('jobs').update(payload).eq('id', job.id))
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success(isNew ? 'Job added!' : 'Job updated!'); onSaved?.() }
  }

  async function handleDelete() {
    if (!confirm('Delete this job permanently?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', job.id)
    if (error) toast.error(error.message)
    else { toast.success('Job deleted'); onSaved?.() }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isNew ? 'New Job' : `Edit — ${job.job_number}`}</h2>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>

        <div className="modal-body">
          {/* ── Basic Info ── */}
          <div className="form-grid">
            <Fld label="Job #"      id="job_number"   form={form} set={set}/>
            <Fld label="Client Name" id="client_name" form={form} set={set}/>
            <div className="form-group full">
              <Fld label="Address" id="address" form={form} set={set}/>
            </div>
            <Fld label="Contract Date" id="contract_date" type="date" form={form} set={set}/>
            <Fld label="Due Date"      id="due_date"       type="date" form={form} set={set}/>
            <Fld label="Delivered Date" id="delivered_date" type="date" form={form} set={set}/>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-input" value={form.month} onChange={e=>set('month',e.target.value)}>
                {MONTHS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <Fld label="Year" id="year" form={form} set={set} placeholder="2026"/>
          </div>

          {/* ── Fees ── */}
          <div className="form-section">
            <div className="form-section-title">💰 Fees & Payments</div>
            <div className="form-grid">
              <Fld label="Total Fee ($)"          id="fee"                 type="number" form={form} set={set}/>
              <Fld label="Expenses ($)"           id="expenses"            type="number" form={form} set={set}/>
              <Fld label="Modum Fee ($)"          id="modum_fee"           type="number" form={form} set={set}/>
              <Fld label="Subcontractor Fee ($)"  id="subcontractor_fee"   type="number" form={form} set={set}/>
              <div className="form-group">
                <label className="form-label">Net Fee — AUTO</label>
                <input className="form-input calc" readOnly value={fmt2(splits.net_fee)}/>
              </div>
              <Fld label="Fee Collected ($)"      id="fee_collected"       type="number" form={form} set={set}/>
              <Fld label="Fee Collected Date"     id="fee_collected_date"  type="date"   form={form} set={set}/>
              <Fld label="Appraiser Payment Due"  id="appraiser_payment_due" type="date" form={form} set={set}/>
              <Fld label="Payment Terms"          id="payment_terms"       form={form} set={set}/>
              <Fld label="Expense Terms"          id="expense_terms"       form={form} set={set}/>
              <Fld label="Subcontractor"          id="subcontractor"       form={form} set={set}/>
              <Fld label="QB Payment Date"        id="qb_payment_date"     type="date" form={form} set={set}/>
            </div>
          </div>

          {/* ── Splits ── */}
          <div className="form-section">
            <div className="form-section-title">📊 Commission Splits</div>
            <div className="form-grid" style={{marginBottom:12}}>
              <Fld label="% FCV"        id="pct_fcv"        type="number" step="0.01" form={form} set={set}/>
              <div className="form-group"><label className="form-label">FCV $ — AUTO</label><input className="form-input calc" readOnly value={fmt2(splits.fcv)}/></div>
              <Fld label="% DW"         id="pct_dw"         type="number" step="0.01" form={form} set={set}/>
              <div className="form-group"><label className="form-label">DW $ — AUTO</label><input className="form-input calc" readOnly value={fmt2(splits.dw)}/></div>
              <Fld label="% Production" id="pct_production" type="number" step="0.01" form={form} set={set}/>
              <div className="form-group"><label className="form-label">Production $ — AUTO</label><input className="form-input calc" readOnly value={fmt2(splits.production)}/></div>
            </div>
            {[
              ['Marketing 1','marketing1','marketing1_pct','marketing1_amt'],
              ['Marketing 2','marketing2','marketing2_pct','marketing2_amt'],
              ['Appraiser 1','appraiser1','appraiser1_pct','appraiser1_amt'],
              ['Appraiser 2','appraiser2','appraiser2_pct','appraiser2_amt'],
              ['Analyst',    'analyst',   'analyst_pct',   'analyst_amt'],
              ['Internal Review','ir',    'ir_pct',        'ir_amt'],
            ].map(([label, nameKey, pctKey, amtKey]) => (
              <div className="split-3" key={label}>
                <div className="split-3-label">{label}</div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form[nameKey]||''} onChange={e=>set(nameKey,e.target.value)} placeholder="Name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">%</label>
                  <input className="form-input" type="number" step="0.01" value={form[pctKey]||''} onChange={e=>set(pctKey,e.target.value)} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">$ AUTO</label>
                  <input className="form-input calc" readOnly value={fmt2(splits[amtKey])}/>
                </div>
              </div>
            ))}
          </div>

          {/* ── Staff ── */}
          <div className="form-section">
            <div className="form-section-title">👥 Staff Assigned</div>
            <div className="check-grid">
              {STAFF_NAMES.map(name => (
                <label key={name} className="check-item">
                  <input type="checkbox" checked={form.staff_assigned?.includes(name)||false} onChange={()=>toggleStaff(name)}/>
                  {name}
                </label>
              ))}
            </div>
          </div>

          {/* ── Other ── */}
          <div className="form-section">
            <div className="form-section-title">📝 Other</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Comments</label>
                <textarea className="form-input" rows={2} value={form.comments||''} onChange={e=>set('comments',e.target.value)} style={{resize:'vertical'}}/>
              </div>
              <div className="form-group">
                <label className="form-label">Cancelled</label>
                <select className="form-input" value={form.cancelled?'yes':''} onChange={e=>set('cancelled',e.target.value==='yes')}>
                  <option value="">No</option><option value="yes">YES</option>
                </select>
              </div>
              <Fld label="Requested" id="requested" form={form} set={set} placeholder="-"/>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{marginRight:'auto'}}><Trash2 size={13}/> Delete</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Job'}</button>
        </div>
      </div>
    </div>
  )
}

function Fld({ label, id, type='text', form, set, placeholder='', step }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} step={step} value={form[id]??''} placeholder={placeholder}
        onChange={e => set(id, type==='number' ? e.target.value : e.target.value)}/>
    </div>
  )
}
