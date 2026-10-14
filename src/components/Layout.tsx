import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Sun, CheckSquare, FolderKanban, CalendarDays, Repeat, BarChart3, Wallet, ArrowLeftRight, Landmark, PieChart, Scale, Target, FileBarChart, Settings, Plus, Menu } from 'lucide-react'
import { Modal } from './ui'

const GROUPS = [
  { title: 'Dashboard', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Produktivitas', items: [
    { to: '/hari-ini', label: 'My Day', icon: Sun }, { to: '/tugas', label: 'Tasks', icon: CheckSquare },
    { to: '/proyek', label: 'Projects', icon: FolderKanban }, { to: '/kalender', label: 'Calendar', icon: CalendarDays },
    { to: '/kebiasaan', label: 'Habits', icon: Repeat }, { to: '/laporan-produktivitas', label: 'Laporan produktivitas', icon: BarChart3 } ] },
  { title: 'Keuangan', items: [
    { to: '/keuangan', label: 'Ringkasan keuangan', icon: Wallet }, { to: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
    { to: '/akun', label: 'Akun', icon: Landmark }, { to: '/anggaran', label: 'Anggaran', icon: PieChart },
    { to: '/aset-utang', label: 'Aset & utang', icon: Scale }, { to: '/tujuan', label: 'Tujuan finansial', icon: Target },
    { to: '/laporan-keuangan', label: 'Laporan keuangan', icon: FileBarChart } ] },
  { title: 'Pengaturan', items: [{ to: '/pengaturan', label: 'Pengaturan', icon: Settings }] },
]
const cls = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '')

export default function Layout({ children }: { children: ReactNode }) {
  const [more, setMore] = useState(false)
  const nav = useNavigate()
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Life &amp; Finance</div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="nav-title">{g.title}</div>
            {g.items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'} className={cls}><i.icon size={18} />{i.label}</NavLink>)}
          </div>
        ))}
      </aside>
      <main className="main">{children}</main>
      <button className="fab" aria-label="Tambah transaksi" onClick={() => nav('/transaksi?baru=1')}><Plus size={24} /></button>
      <nav className="bottomnav">
        <NavLink to="/" end><LayoutDashboard size={20} />Dashboard</NavLink>
        <NavLink to="/tugas"><CheckSquare size={20} />Tugas</NavLink>
        <NavLink to="/transaksi"><ArrowLeftRight size={20} />Transaksi</NavLink>
        <NavLink to="/keuangan"><Wallet size={20} />Keuangan</NavLink>
        <button onClick={() => setMore(true)}><Menu size={20} />Lainnya</button>
      </nav>
      {more && (
        <Modal title="Menu" onClose={() => setMore(false)}>
          {GROUPS.map((g) => (
            <div key={g.title} onClick={() => setMore(false)}>
              <div className="nav-title">{g.title}</div>
              {g.items.map((i) => <NavLink key={i.to} to={i.to} end={i.to === '/'} className={cls}><i.icon size={18} />{i.label}</NavLink>)}
            </div>
          ))}
        </Modal>
      )}
    </div>
  )
}
