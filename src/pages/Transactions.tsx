import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { fmtDate, rupiah, todayStr } from '../lib/format'
import { liabilityRemaining } from '../lib/calc'
import { TX_TYPES, toOpts } from '../lib/consts'
import { exportTransactionsCsv } from '../lib/export'

export default function Transactions() {
  const d = useData(); const base = d.profile.base_currency
  const [params, setParams] = useSearchParams()
  const [edit, setEdit] = useState<any | null>(null)
  const [q, setQ] = useState(''); const [ft, setFt] = useState(''); const [fa, setFa] = useState(''); const [fc, setFc] = useState('')
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [sort, setSort] = useState('date_desc'); const [limit, setLimit] = useState(50)

  useEffect(() => { if (params.get('baru')) { setEdit({ type: 'expense', date: todayStr() }); setParams({}, { replace: true }) } }, [params, setParams])

  const acc = (id: string | null) => d.accounts.find((a) => a.id === id)
  const cat = (id: string | null) => d.categories.find((c) => c.id === id)
  const list = useMemo(() => {
    const r = d.transactions.filter((t) => {
      if (ft && t.type !== ft) return false
      if (fa && t.account_id !== fa && t.to_account_id !== fa) return false
      if (fc && t.category_id !== fc) return false
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      if (q) { const hay = `${t.description || ''} ${cat(t.category_id)?.name || ''} ${acc(t.account_id)?.name || ''}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false }
      return true
    })
    const cmp: Record<string, (a: any, b: any) => number> = {
      date_desc: (a, b) => b.date.localeCompare(a.date), date_asc: (a, b) => a.date.localeCompare(b.date),
      amt_desc: (a, b) => b.amount_base - a.amount_base, amt_asc: (a, b) => a.amount_base - b.amount_base,
    }
    return [...r].sort(cmp[sort])
  }, [d.transactions, d.accounts, d.categories, q, ft, fa, fc, from, to, sort]) // eslint-disable-line

  const accOpts = (v: any) => d.accounts.filter((a) => !a.is_archived || a.id === v.account_id || a.id === v.to_account_id).map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))
  const cur = (v: any) => acc(v.account_id)?.currency
  const fields: FieldDef[] = [
    { name: 'type', label: 'Jenis transaksi', type: 'select', required: true, options: toOpts(TX_TYPES) },
    { name: 'date', label: 'Tanggal', type: 'date', required: true },
    { name: 'account_id', label: 'Akun (asal)', type: 'select', required: true, options: accOpts },
    { name: 'to_account_id', label: 'Akun tujuan', type: 'select', options: accOpts, show: (v) => v.type === 'transfer' },
    { name: 'amount', label: 'Jumlah', type: 'number', required: true, hint: 'Penyesuaian saldo: isi positif untuk menambah, negatif untuk mengurangi.' },
    { name: 'to_amount', label: 'Jumlah diterima (mata uang akun tujuan)', type: 'number', show: (v) => v.type === 'transfer' && !!acc(v.to_account_id) && !!cur(v) && acc(v.to_account_id)!.currency !== cur(v) },
    { name: 'exchange_rate', label: `Kurs ke ${base}`, type: 'number', show: (v) => !!cur(v) && cur(v) !== base, hint: 'Kosongkan untuk memakai kurs yang tersimpan di akun. Kurs disimpan agar laporan tidak berubah.' },
    { name: 'category_id', label: 'Kategori', type: 'select', show: (v) => v.type === 'income' || v.type === 'expense', options: (v) => d.categories.filter((c) => c.type === v.type).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'liability_id', label: 'Utang yang dibayar', type: 'select', show: (v) => v.type === 'debt_payment', options: (v) => d.liabilities.filter((l) => liabilityRemaining(l, d.transactions) > 0 || l.id === v.liability_id).map((l) => ({ value: l.id, label: l.name })) },
    { name: 'description', label: 'Deskripsi', type: 'text' },
  ]

  async function save(v: any) {
    const a = acc(v.account_id)!
    if (v.type === 'adjustment' ? v.amount === 0 : v.amount <= 0) return v.type === 'adjustment' ? 'Jumlah penyesuaian tidak boleh 0.' : 'Jumlah harus lebih besar dari 0.'
    let to_amount: number | null = null
    if (v.type === 'transfer') {
      const t = acc(v.to_account_id)
      if (!t) return 'Akun tujuan wajib dipilih.'
      if (t.id === a.id) return 'Akun asal dan tujuan harus berbeda.'
      to_amount = t.currency === a.currency ? v.amount : v.to_amount
      if (!to_amount || to_amount <= 0) return 'Jumlah diterima wajib diisi untuk transfer beda mata uang.'
    }
    if (v.type === 'debt_payment') {
      const l = d.liabilities.find((x) => x.id === v.liability_id)
      if (!l) return 'Pilih utang yang dibayar.'
      if (l.currency !== a.currency) return `Mata uang utang (${l.currency}) harus sama dengan mata uang akun (${a.currency}).`
    }
    const rate = a.currency === base ? 1 : v.exchange_rate || a.rate_to_base
    if (!(rate > 0)) return 'Kurs harus lebih besar dari 0.'
    return d.submit('transactions', { type: v.type, date: v.date, account_id: v.account_id, to_account_id: v.type === 'transfer' ? v.to_account_id : null, amount: v.amount, to_amount, currency: a.currency, exchange_rate: rate, category_id: v.category_id, liability_id: v.liability_id, description: v.description }, edit.id)
  }

  const shown = list.slice(0, limit)
  return (
    <>
      <PageHeader title="Transaksi" sub={`${list.length} transaksi`} action={<div style={{ display: 'flex', gap: 8 }}><Button onClick={() => exportTransactionsCsv(d, list)}><Download size={16} />CSV</Button><Button variant="primary" onClick={() => setEdit({ type: 'expense', date: todayStr() })} disabled={!d.accounts.length}><Plus size={16} />Tambah</Button></div>} />
      {!d.accounts.length && <div className="notice" style={{ marginBottom: 12 }}>Buat minimal satu akun dulu di menu Akun sebelum mencatat transaksi.</div>}
      <div className="toolbar">
        <input type="text" placeholder="Cari deskripsi, kategori, akun..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
        <select value={ft} onChange={(e) => setFt(e.target.value)} aria-label="Jenis"><option value="">Semua jenis</option>{toOpts(TX_TYPES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={fa} onChange={(e) => setFa(e.target.value)} aria-label="Akun"><option value="">Semua akun</option>{d.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select value={fc} onChange={(e) => setFc(e.target.value)} aria-label="Kategori"><option value="">Semua kategori</option>{d.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan"><option value="date_desc">Terbaru</option><option value="date_asc">Terlama</option><option value="amt_desc">Jumlah terbesar</option><option value="amt_asc">Jumlah terkecil</option></select>
      </div>
      <Card>
        {shown.length === 0 ? <Empty text={d.transactions.length ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi. Klik "Tambah" untuk mencatat yang pertama.'} /> : (
          <div className="list">{shown.map((t) => {
            const a = acc(t.account_id); const sign = t.type === 'income' ? '+' : t.type === 'adjustment' ? (t.amount > 0 ? '+' : '−') : t.type === 'transfer' ? '' : '−'
            const tone = t.type === 'income' || (t.type === 'adjustment' && t.amount > 0) ? 'pos' : t.type === 'transfer' ? 'muted' : 'neg'
            return (
              <div className="row click" key={t.id} onClick={() => setEdit({ ...t, exchange_rate: t.exchange_rate === 1 ? '' : t.exchange_rate })}>
                <div className="grow">
                  <div className="title">{t.description || cat(t.category_id)?.name || TX_TYPES[t.type]}</div>
                  <div className="meta"><span className="badge">{TX_TYPES[t.type]}</span>{fmtDate(t.date)} · {a?.name}{t.to_account_id ? ` → ${acc(t.to_account_id)?.name}` : ''}{cat(t.category_id) ? ` · ${cat(t.category_id)!.name}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}><div className={tone} style={{ fontWeight: 600 }}>{sign}{rupiah(Math.abs(t.amount), t.currency)}</div>{t.currency !== base && <div className="meta">≈ {rupiah(t.amount_base, base)}</div>}</div>
              </div>)
          })}</div>
        )}
        {list.length > limit && <div style={{ textAlign: 'center', marginTop: 12 }}><Button onClick={() => setLimit(limit + 50)}>Muat lebih banyak</Button></div>}
      </Card>
      {edit && <FormModal title={edit.id ? 'Edit transaksi' : 'Transaksi baru'} fields={fields} initial={edit} onSubmit={save} onDelete={edit.id ? () => d.del('transactions', edit.id) : undefined} onClose={() => setEdit(null)} />}
    </>
  )
}
