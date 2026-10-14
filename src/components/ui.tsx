import { createContext, useCallback, useContext, useState } from 'react'
import type { FormEvent, ReactNode, ButtonHTMLAttributes } from 'react'
import { X } from 'lucide-react'

// ---------- Toast ----------
const ToastCtx = createContext<(m: string, kind?: 'ok' | 'err') => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; m: string; kind: string }[]>([])
  const push = useCallback((m: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, m, kind }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status">{items.map((i) => <div key={i.id} className={`toast ${i.kind}`}>{i.m}</div>)}</div>
    </ToastCtx.Provider>
  )
}

// ---------- Dasar ----------
export const Spinner = () => <div className="spinner" aria-label="Memuat" />
export const Empty = ({ text, children }: { text: string; children?: ReactNode }) => <div className="empty"><p>{text}</p>{children}</div>
export function Button({ variant = 'default', small, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' | 'default'; small?: boolean }) {
  const cls = ['btn', variant !== 'default' ? `btn-${variant}` : '', small ? 'btn-sm' : '', p.className || ''].join(' ')
  return <button type="button" {...p} className={cls} />
}
export const Card = ({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) => (
  <section className="card">
    {(title || action) && <div className="card-head"><h2>{title}</h2>{action}</div>}
    {children}
  </section>
)
export const PageHeader = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{action}</div>
)
export const Stat = ({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: 'pos' | 'neg' | 'warn'; sub?: ReactNode }) => (
  <div className="card stat"><div className="label">{label}</div><div className={`value ${tone || ''}`}>{value}</div>{sub && <div className="sub">{sub}</div>}</div>
)
export const Progress = ({ value, tone }: { value: number; tone?: 'pos' | 'neg' | 'warn' }) => {
  const c = tone === 'neg' ? 'var(--negative)' : tone === 'warn' ? 'var(--warning)' : tone === 'pos' ? 'var(--positive)' : 'var(--accent)'
  return <div className="progress"><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: c }} /></div>
}
export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return <div className="seg">{options.map((o) => <button key={o.value} type="button" className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><Button variant="ghost" onClick={onClose} aria-label="Tutup"><X size={18} /></Button></div>
        {children}
      </div>
    </div>
  )
}

// ---------- Form generik ----------
export interface Opt { value: string; label: string }
export interface FieldDef {
  name: string; label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'days'
  options?: Opt[] | ((v: any) => Opt[])
  required?: boolean; show?: (v: any) => boolean; hint?: string; placeholder?: string
}
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export function FormModal({ title, fields, initial, onSubmit, onDelete, onClose }: {
  title: string; fields: FieldDef[]; initial: any
  onSubmit: (v: any) => Promise<string | null>; onDelete?: () => Promise<string | null>; onClose: () => void
}) {
  const [v, setV] = useState<any>(initial)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x }))

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null)
    const out: any = {}
    for (const f of fields) {
      if (f.show && !f.show(v)) { out[f.name] = f.type === 'checkbox' ? false : null; continue }
      let x = v[f.name]
      if (f.type === 'checkbox') x = !!x
      else if (f.type === 'days') x = Array.isArray(x) ? x : []
      else if (f.type === 'number') x = x === '' || x == null ? null : Number(x)
      else x = x == null || String(x).trim() === '' ? null : String(x).trim()
      if (f.required && (x === null || (f.type === 'days' && !x.length))) return setErr(`${f.label} wajib diisi.`)
      if (f.type === 'number' && x !== null && !Number.isFinite(x)) return setErr(`${f.label} harus berupa angka.`)
      out[f.name] = x
    }
    setBusy(true)
    const r = await onSubmit(out)
    setBusy(false)
    if (r) setErr(r); else onClose()
  }
  async function remove() {
    if (!onDelete || !window.confirm('Hapus data ini? Tindakan ini tidak bisa dibatalkan.')) return
    setBusy(true); const r = await onDelete(); setBusy(false)
    if (r) setErr(r); else onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {err && <div className="err" role="alert">{err}</div>}
        {fields.map((f) => {
          if (f.show && !f.show(v)) return null
          const id = `f-${f.name}`
          if (f.type === 'checkbox') return (
            <div className="field" key={f.name}>
              <label className="check"><input type="checkbox" checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />{f.label}</label>
              {f.hint && <span className="hint">{f.hint}</span>}
            </div>)
          const opts = typeof f.options === 'function' ? f.options(v) : f.options
          return (
            <div className="field" key={f.name}>
              <label htmlFor={id}>{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select id={id} value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">{f.required ? 'Pilih...' : '-'}</option>
                  {(opts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea id={id} value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === 'days' ? (
                <div className="days">{DAYS.map((n, i) => {
                  const on = (v[f.name] || []).includes(i)
                  return <button type="button" key={i} className={on ? 'on' : ''} onClick={() => set(f.name, on ? v[f.name].filter((x: number) => x !== i) : [...(v[f.name] || []), i])}>{n}</button>
                })}</div>
              ) : (
                <input id={id} type={f.type} step={f.type === 'number' ? 'any' : undefined} inputMode={f.type === 'number' ? 'decimal' : undefined}
                  value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
              )}
              {f.hint && <span className="hint">{f.hint}</span>}
            </div>
          )
        })}
        <div className="modal-actions">
          {onDelete && <Button variant="danger" onClick={remove} disabled={busy}>Hapus</Button>}
          <span className="spacer" />
          <Button onClick={onClose} disabled={busy}>Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  )
}
