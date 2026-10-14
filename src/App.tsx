import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Route, Routes, Navigate } from 'react-router-dom'
import { supabase, configured } from './lib/supabase'
import { DataProvider } from './lib/data'
import { Spinner, ToastProvider } from './components/ui'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import { MyDay, Tasks, Projects, CalendarPage, Habits, ProductivityReports } from './pages/productivity'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Budgets from './pages/Budgets'
import AssetsLiabilities from './pages/AssetsLiabilities'
import Goals from './pages/Goals'
import { FinanceOverview, FinanceReports } from './pages/FinanceViews'
import SettingsPage from './pages/Settings'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) return (
    <div className="center-page"><div className="err">Konfigurasi Supabase belum diisi.</div>
      <p>Salin <code>.env.local</code> menjadi <code>.env</code>, isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>, lalu jalankan ulang <code>npm run dev</code>. Lihat docs/setup.md.</p></div>
  )
  if (session === undefined) return <Spinner />
  if (!session) return <ToastProvider><Login /></ToastProvider>
  return (
    <ToastProvider>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hari-ini" element={<MyDay />} />
            <Route path="/tugas" element={<Tasks />} />
            <Route path="/proyek" element={<Projects />} />
            <Route path="/kalender" element={<CalendarPage />} />
            <Route path="/kebiasaan" element={<Habits />} />
            <Route path="/laporan-produktivitas" element={<ProductivityReports />} />
            <Route path="/keuangan" element={<FinanceOverview />} />
            <Route path="/transaksi" element={<Transactions />} />
            <Route path="/akun" element={<Accounts />} />
            <Route path="/anggaran" element={<Budgets />} />
            <Route path="/aset-utang" element={<AssetsLiabilities />} />
            <Route path="/tujuan" element={<Goals />} />
            <Route path="/laporan-keuangan" element={<FinanceReports />} />
            <Route path="/pengaturan" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </DataProvider>
    </ToastProvider>
  )
}
