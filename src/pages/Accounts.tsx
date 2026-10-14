import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader, Stat } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { balances, sum } from '../lib/calc'
import { rupiah } from '../lib/format'
import { ACCOUNT_TYPES, CURRENCIES, toOpts } from '../lib/consts'

export default function Accounts() {
  const d = useData(); const base = d.profile.base_currency; const [edit, setEdit] = useState<any | null>(null)
  const bal = balances(d.accounts, d.transactions)
  const active = d.accounts.filter((a) => !a.is_archived); const archived = d.accounts.filter((a) => a.is_archived)
  const total = sum(active.map((a) => bal[a.id] * a.rate_to_base))
  const fields: FieldDef[] = [
    { name: 'name', label: 'Nama akun', type: 'text', required: true, placeholder: 'mis. BCA, Dompet, GoPay' },
    { name: 'type', label: 'Jenis', type: 'select', required: true, options: toOpts(ACCOUNT_TYPES) },
    { name: 'currency', label: 'Mata uang', type: 'select', required: true, options: CURRENCIES },
    { name: 'opening_balance', label: 'Saldo awal', type: 'number', required: true, hint: 'Saldo sebelum transaksi pertama yang Anda catat.' },
    { name: 'rate_to_base', label: `Kurs ke ${base}`, type: 'number', required: true, show: (v) => v.currency !== base, hint: 'Contoh: 1 USD = 16000 IDR. Dipakai untuk menghitung total dan kekayaan bersih.' },
    { name: 'is_liquid', label: 'Dana likuid (bisa dipakai kapan saja)', type: 'checkbox' },
    { name: 'is_emergency_fund', label: 'Ini dana darurat', type: 'checkbox', hint: 'Saldo akun ini dihitung sebagai dana darurat.' },
    { name: 'is_archived', label: 'Arsipkan akun', type: 'checkbox', hint: 'Akun yang punya transaksi tidak bisa dihapus, tetapi bisa diarsipkan.' },
  ]
  const submit = (v: any) => d.submit('accounts', { ...v, rate_to_base: v.currency === base ? 1 : v.rate_to_base }, edit.id)
  const Row = ({ a }: { a: (typeof d.accounts)[number] }) => (
    <div className="row click" onClick={() => setEdit(a)}>
      <div className="grow"><div className="title">{a.name}</div><div className="meta"><span className="badge">{ACCOUNT_TYPES[a.type]}</span>{a.is_emergency_fund && <span className="badge pos">Dana darurat</span>}{!a.is_liquid && <span className="badge">Non-likuid</span>}</div></div>
      <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600 }} className={bal[a.id] < 0 ? 'neg' : ''}>{rupiah(bal[a.id], a.currency)}</div>{a.currency !== base && <div className="meta">≈ {rupiah(bal[a.id] * a.rate_to_base, base)}</div>}</div>
    </div>
  )
  return (
    <>
      <PageHeader title="Akun" sub="Saldo dihitung otomatis dari saldo awal dan transaksi." action={<Button variant="primary" onClick={() => setEdit({ type: 'bank', currency: base, opening_balance: 0, rate_to_base: 1, is_liquid: true })}><Plus size={16} />Akun baru</Button>} />
      <div className="grid stats"><Stat label="Total saldo semua akun aktif" value={rupiah(total, base)} /></div>
      <Card>{active.length ? active.map((a) => <Row key={a.id} a={a} />) : <Empty text="Belum ada akun. Tambahkan akun tunai, rekening bank, atau dompet digital Anda." />}</Card>
      {archived.length > 0 && <><h3 style={{ margin: '16px 0 8px' }} className="muted">Diarsipkan</h3><Card>{archived.map((a) => <Row key={a.id} a={a} />)}</Card></>}
      {edit && <FormModal title={edit.id ? 'Edit akun' : 'Akun baru'} fields={fields} initial={edit} onSubmit={submit} onDelete={edit.id ? () => d.del('accounts', edit.id) : undefined} onClose={() => setEdit(null)} />}
    </>
  )
}
