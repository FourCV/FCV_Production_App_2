import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ClipboardList, DollarSign, BarChart2, TrendingUp, Users, Settings, Search, Plus, Download, Upload, LogOut } from 'lucide-react'
import JobModal from './JobModal'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FcvIcon = () => (
  <svg width="38" height="38" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer gold diamond frame */}
    <rect x="18" y="18" width="84" height="84" rx="4" fill="none" stroke="#E0CA81" strokeWidth="9"
      transform="rotate(45 60 60)"/>
    {/* Inner gold diamond frame (smaller) */}
    <rect x="27" y="27" width="66" height="66" rx="2" fill="none" stroke="#E0CA81" strokeWidth="6"
      transform="rotate(45 60 60)"/>
    {/* 4 navy squares inside (2x2 grid, rotated 45°) */}
    {/* Top */}
    <rect x="43" y="22" width="24" height="24" rx="2" fill="#293757" transform="rotate(45 55 34)"/>
    {/* Left */}
    <rect x="22" y="43" width="24" height="24" rx="2" fill="#293757" transform="rotate(45 34 55)"/>
    {/* Right */}
    <rect x="74" y="43" width="24" height="24" rx="2" fill="#293757" transform="rotate(45 86 55)"/>
    {/* Bottom */}
    <rect x="43" y="74" width="24" height="24" rx="2" fill="#293757" transform="rotate(45 55 86)"/>
    {/* Orange chevron at bottom */}
    <polyline points="40,88 60,108 80,88" fill="none" stroke="#F16623" strokeWidth="9"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [jobModal, setJobModal] = useState(false)
  const [topTitle, setTopTitle] = useState('Dashboard')

  const navItems = [
    { to: '/', label: 'Dashboard',  icon: LayoutDashboard, exact: true },
    { to: '/analytics', label: 'Analytics', icon: TrendingUp },
    { to: '/jobs', label: 'All Jobs', icon: ClipboardList },
    { to: '/payments', label: 'Payments', icon: DollarSign },
    { to: '/reports', label: 'Reports', icon: BarChart2 },
    { to: '/staff', label: 'Staff', icon: Users },
    ...(profile?.role === 'admin' ? [{ to: '/config', label: 'Config', icon: Settings }] : []),
  ]

  async function handleExport() {
    const { data } = await supabase.from('jobs').select('*').order('created_at')
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), jobs: data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `FCV_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${data.length} jobs`)
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    const text = await file.text()
    const parsed = JSON.parse(text)
    const incoming = Array.isArray(parsed) ? parsed : parsed.jobs
    if (!confirm(`Import ${incoming.length} jobs? This will UPSERT existing records.`)) return
    const { error } = await supabase.from('jobs').upsert(incoming, { onConflict: 'job_number' })
    if (error) toast.error('Import failed: ' + error.message)
    else { toast.success(`Imported ${incoming.length} jobs`); navigate(0) }
    e.target.value = ''
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <FcvIcon />
          <div className="logo-wordmark">
            <div className="logo-name">Four Corners</div>
            <div className="logo-tagline">Valuations</div>
          </div>
        </div>
        <nav className="nav-section" style={{flex:1}}>
          <div className="nav-label">Menu</div>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              onClick={() => setTopTitle(label)}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-stat">
            <span className="sidebar-stat-val">—</span>
            <span className="sidebar-stat-lbl">Total Jobs</span>
          </div>
          <div className="sidebar-user" style={{marginTop:12}}>
            <div className="sidebar-avatar">{(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.full_name || profile?.email}</div>
              <div className="sidebar-user-role">{profile?.role || 'user'}</div>
            </div>
            <button className="sidebar-logout" onClick={signOut} title="Sign out"><LogOut size={15}/></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{topTitle}</div>
          <div className="search-box">
            <Search size={14} color="var(--text3)"/>
            <input placeholder="Search jobs, clients…"/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={14}/> Export</button>
          <label className="btn btn-ghost btn-sm" style={{cursor:'pointer'}}>
            <Upload size={14}/> Import
            <input type="file" accept=".json" onChange={handleImport} style={{display:'none'}}/>
          </label>
          <button className="btn btn-primary" onClick={() => setJobModal(true)}><Plus size={14}/> New Job</button>
        </header>
        <main className="content">
          <Outlet context={{ setTopTitle }} />
        </main>
      </div>

      {jobModal && <JobModal onClose={() => setJobModal(false)} onSaved={() => { setJobModal(false); navigate(0) }} />}
    </div>
  )
}
