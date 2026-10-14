import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader, Stat } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { liabilityRemaining, netWorth } from '../lib/calc'
import { fmtDate, fmtDateTime, rupiah } from '../lib/format'
import { ASSET_TYPES, CURRENCIES, toOpts } from '../lib/consts'

export default function AssetsLiabilities() {
  const d = useData(); const base = d.profile.base_currency
  const [asset, setAsset] = useState<any | null>(null); const [debt, setDebt] = useState<any | null>(null)
  const nw = netWorth(d)
  const cur = (v: any) => v.currency && v.currency !== base
  const common: FieldDef[] = [
    { name: 'currency', label: 'Mata uang', type: 'select', required: true, options: CURRENCIES },
    { name: 'rate_to_base', label: `Kurs ke ${base}`, type: 'number', required: true, show: cur, hint: 'Contoh: 1 USD = 16000 IDR.' },
  ]
  const assetFields: FieldDef[] = [
    { name: 'name', label: 'Nama aset', type: 'text', required: true, placeholder: 'mis. Emas 10 gram, Motor' },
    { name: 'type', label: 'Jenis', type: 'select', required: true, options: toOpts(ASSET_TYPES) },
    { name: 'value', label: 'Nilai saat ini', type: 'number', required: true }, ...common,
  ]
  const debtFields: FieldDef[] = [
    { name: 'name', label: 'Nama utang', type: 'text', required: true, placeholder: 'mis. Cicilan motor, Kartu kredit' },
    { name: 'principal', label: 'Pokok utang awal', type: 'number', required: true, hint: 'Sisa utang = pokok awal − pembayaran yang dicatat sebagai transaksi "Bayar utang".' },
    { name: 'due_date', label: 'Jatuh tempo berikutnya', type: 'date' }, ...common,
  ]
  const stamp = (v: any) => ({ ...v, rate_to_base: v.currency === base ? 1 : v.rate_to_base, value_updated_at: new Date().toISOString() })
  return (
    <>
      <PageHeader title="Aset & utang" sub="Kekayaan bersih = saldo akun + aset lain − sisa utang." />
      <div className="grid stats">
        <Stat label="Kekayaan bersih" value={rupiah(nw.total, base)} tone={nw.total < 0 ? 'neg' : 'pos'} />
        <Stat label="Saldo akun" value={rupiah(nw.accounts, base)} sub="Otomatis dari menu Akun" />
        <Stat label="Aset lain" value={rupiah(nw.assets, base)} />
        <Stat label="Sisa utang" value={rupiah(nw.liabilities, base)} tone={nw.liabilities ? 'neg' : undefined} />
      </div>
      <div className="notice" style={{ marginBottom: 12 }}>Saldo akun sudah dihitung sebagai aset. Isi aset di sini hanya untuk harta di luar akun (emas, kendaraan, properti) agar tidak terhitung dua kali.</div>
      <div className="grid cols">
        <Card title="Aset lain" action={<Button small variant="primary" onClick={() => setAsset({ type: 'other', currency: base, rate_to_base: 1 })}><Plus size={14} />Aset</Button>}>
          {d.assets.length ? d.assets.map((a) => (
            <div className="row click" key={a.id} onClick={() => setAsset(a)}>
              <div className="grow"><div className="title">{a.name}</div><div className="meta"><span className="badge">{ASSET_TYPES[a.type]}</span>Diperbarui {fmtDateTime(a.value_updated_at)}</div></div>
              <strong>{rupiah(a.value, a.currency)}</strong>
            </div>)) : <Empty text="Belum ada aset lain." />}
        </Card>
        <Card title="Utang & kewajiban" action={<Button small variant="primary" onClick={() => setDebt({ currency: base, rate_to_base: 1 })}><Plus size={14} />Utang</Button>}>
          {d.liabilities.length ? d.liabilities.map((l) => {
            const rem = liabilityRemaining(l, d.transactions)
            return (
              <div className="row click" key={l.id} onClick={() => setDebt(l)}>
                <div className="grow"><div className="title">{l.name}</div><div className="meta">Pokok {rupiah(l.principal, l.currency)} · Jatuh tempo {fmtDate(l.due_date)} · Diperbarui {fmtDateTime(l.value_updated_at)}</div></div>
                <strong className={rem ? 'neg' : 'pos'}>{rem ? rupiah(rem, l.currency) : 'Lunas'}</strong>
              </div>)
          }) : <Empty text="Belum ada utang. Bagus!" />}
          <div className="meta" style={{ marginTop: 8 }}>Catat pembayaran lewat Transaksi → jenis "Bayar utang".</div>
        </Card>
      </div>
      {asset && <FormModal title={asset.id ? 'Edit aset' : 'Aset baru'} fields={assetFields} initial={asset} onSubmit={(v) => d.submit('assets', stamp(v), asset.id)} onDelete={asset.id ? () => d.del('assets', asset.id) : undefined} onClose={() => setAsset(null)} />}
      {debt && <FormModal title={debt.id ? 'Edit utang' : 'Utang baru'} fields={debtFields} initial={debt} onSubmit={(v) => d.submit('liabilities', stamp(v), debt.id)} onDelete={debt.id ? () => d.del('liabilities', debt.id) : undefined} onClose={() => setDebt(null)} />}
    </>
  )
}
