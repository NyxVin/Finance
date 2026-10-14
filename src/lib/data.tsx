import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import { Button, Spinner, useToast } from '../components/ui'
import type { Key, Profile, Store } from './types'

const T: Record<Key, string> = {
  accounts: 'accounts', categories: 'categories', transactions: 'transactions', budgets: 'budgets', assets: 'assets',
  liabilities: 'liabilities', goals: 'financial_goals', contributions: 'financial_goal_contributions',
  projects: 'projects', tasks: 'tasks', habits: 'habits', habitLogs: 'habit_logs',
}
const ORDER: Partial<Record<Key, [string, boolean]>> = { transactions: ['date', false], contributions: ['date', false], habitLogs: ['log_date', false] }
const EMPTY: Store = { accounts: [], categories: [], transactions: [], budgets: [], assets: [], liabilities: [], goals: [], contributions: [], projects: [], tasks: [], habits: [], habitLogs: [] }
// Data yang ikut berubah saat sebuah baris dihapus (relasi ON DELETE di database)
const AFTER_DELETE: Partial<Record<Key, Key[]>> = { projects: ['tasks'], goals: ['contributions'], habits: ['habitLogs'], categories: ['transactions', 'budgets'] }

export interface DataCtx extends Store {
  profile: Profile
  reload: (keys?: Key[]) => Promise<void>
  submit: (key: Key, values: any, id?: string) => Promise<string | null>
  del: (key: Key, id: string) => Promise<string | null>
  saveProfile: (v: Partial<Profile>) => Promise<string | null>
}
const Ctx = createContext<DataCtx>(null as any)
export const useData = () => useContext(Ctx)

// Supabase membatasi 1000 baris per permintaan, jadi diambil bertahap.
async function fetchAll(table: string, key: Key) {
  const [col, asc] = ORDER[key] || ['created_at', true]
  const out: any[] = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').order(col, { ascending: asc }).order('id').range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if ((data || []).length < 1000) break
  }
  return out
}
function friendly(e: { code?: string; message: string }, deleting = false) {
  if (e.code === '23503') return deleting ? 'Tidak bisa dihapus karena masih dipakai data lain (mis. transaksi). Arsipkan saja jika tersedia.' : 'Data terkait tidak ditemukan atau tidak valid.'
  if (e.code === '23505') return 'Data dengan nilai yang sama sudah ada.'
  if (e.code === '23514') return 'Data tidak memenuhi aturan (cek jumlah, tanggal, atau pilihan yang wajib).'
  return e.message
}

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [store, setStore] = useState<Store>(EMPTY)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')

  const reload = useCallback(async (keys?: Key[]) => {
    const ks = keys || (Object.keys(T) as Key[])
    const res = await Promise.all(ks.map((k) => fetchAll(T[k], k)))
    setStore((s) => { const n = { ...s } as any; ks.forEach((k, i) => (n[k] = res[i])); return n })
  }, [])

  const init = useCallback(async () => {
    setState('loading')
    try {
      const { data: u } = await supabase.auth.getUser()
      let { data: p, error: pe } = await supabase.from('profiles').select('*').maybeSingle()
      if (pe) throw pe
      if (!p && u.user) { const r = await supabase.from('profiles').insert({ id: u.user.id }).select().single(); if (r.error) throw r.error; p = r.data }
      setProfile(p as Profile)
      await reload()
      setState('ok')
    } catch (e: any) { setError(e.message || String(e)); setState('error') }
  }, [reload])
  useEffect(() => { init() }, [init])

  const submit: DataCtx['submit'] = async (key, values, id) => {
    const { error } = id ? await supabase.from(T[key]).update(values).eq('id', id) : await supabase.from(T[key]).insert(values)
    if (error) return friendly(error)
    await reload([key]); toast('Tersimpan'); return null
  }
  const del: DataCtx['del'] = async (key, id) => {
    const { error } = await supabase.from(T[key]).delete().eq('id', id)
    if (error) return friendly(error, true)
    await reload([key, ...(AFTER_DELETE[key] || [])]); toast('Dihapus'); return null
  }
  const saveProfile: DataCtx['saveProfile'] = async (v) => {
    const { data, error } = await supabase.from('profiles').update(v).eq('id', profile!.id).select().single()
    if (error) return friendly(error)
    setProfile(data as Profile); toast('Tersimpan'); return null
  }

  if (state === 'loading') return <Spinner />
  if (state === 'error') return (
    <div className="center-page"><div className="err">Gagal memuat data: {error}</div>
      <p className="muted" style={{ marginBottom: 12 }}>Pastikan migration SQL sudah dijalankan di Supabase dan koneksi internet aktif.</p>
      <Button variant="primary" onClick={init}>Coba lagi</Button></div>
  )
  return <Ctx.Provider value={{ ...store, profile: profile!, reload, submit, del, saveProfile }}>{children}</Ctx.Provider>
}
