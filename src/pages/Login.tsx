import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!email.includes('@')) return setMsg({ t: 'err', m: 'Email tidak valid.' })
    if (password.length < 8) return setMsg({ t: 'err', m: 'Kata sandi minimal 8 karakter.' })
    setBusy(true)
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ t: 'err', m: error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg({ t: 'err', m: error.message })
      else if (!data.session) setMsg({ t: 'ok', m: 'Akun dibuat. Cek email Anda untuk konfirmasi, lalu masuk.' })
    }
    setBusy(false)
  }
  return (
    <div className="center-page">
      <h1 style={{ marginBottom: 4 }}>Life &amp; Finance</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{mode === 'in' ? 'Masuk ke akun Anda.' : 'Buat akun pertama Anda.'}</p>
      <form className="card" onSubmit={submit} noValidate>
        {msg && <div className={msg.t === 'err' ? 'err' : 'notice'} style={{ marginBottom: 12 }} role="alert">{msg.m}</div>}
        <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="pw">Kata sandi</label><input id="pw" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button variant="primary" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Memproses...' : mode === 'in' ? 'Masuk' : 'Buat akun'}</Button>
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          {mode === 'in' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>{mode === 'in' ? 'Daftar' : 'Masuk'}</a>
        </p>
      </form>
    </div>
  )
}
