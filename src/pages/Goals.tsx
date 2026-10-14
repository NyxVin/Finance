import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader, Progress } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { sum } from '../lib/calc'
import { fmtDate, pct, rupiah, todayStr } from '../lib/format'
import { GOAL_TYPES, toOpts } from '../lib/consts'

export default function Goals() {
  const d = useData(); const base = d.profile.base_currency
  const [goal, setGoal] = useState<any | null>(null); const [contrib, setContrib] = useState<any | null>(null); const [open, setOpen] = useState<string | null>(null)
  const goalFields: FieldDef[] = [
    { name: 'name', label: 'Nama tujuan', type: 'text', required: true, placeholder: 'mis. Dana darurat 6 bulan' },
    { name: 'type', label: 'Jenis', type: 'select', required: true, options: toOpts(GOAL_TYPES) },
    { name: 'target_amount', label: `Target (${base})`, type: 'number', required: true },
    { name: 'deadline', label: 'Tenggat (opsional)', type: 'date' },
  ]
  const cFields: FieldDef[] = [
    { name: 'date', label: 'Tanggal', type: 'date', required: true },
    { name: 'amount', label: `Jumlah (${base})`, type: 'number', required: true, hint: 'Isi negatif jika mengurangi progres.' },
    { name: 'note', label: 'Catatan', type: 'text' },
  ]
  return (
    <>
      <PageHeader title="Tujuan finansial" action={<Button variant="primary" onClick={() => setGoal({ type: 'savings' })}><Plus size={16} />Tujuan baru</Button>} />
      <div className="notice" style={{ marginBottom: 12 }}>Progres tujuan hanya catatan target. Menambah progres tidak mengubah saldo akun atau kekayaan bersih. Pindahkan uang sungguhan lewat Transaksi.</div>
      {d.goals.length === 0 ? <Card><Empty text="Belum ada tujuan. Mulai dengan dana darurat atau tabungan tertentu." /></Card> : (
        <div className="grid cols">{d.goals.map((g) => {
          const cs = d.contributions.filter((c) => c.goal_id === g.id); const got = sum(cs.map((c) => c.amount)); const p = (got / g.target_amount) * 100
          return (
            <Card key={g.id} title={g.name} action={<div style={{ display: 'flex', gap: 6 }}><Button small variant="primary" onClick={() => setContrib({ goal_id: g.id, date: todayStr() })}>+ Progres</Button><Button small onClick={() => setGoal(g)}>Edit</Button></div>}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span><span className="badge">{GOAL_TYPES[g.type]}</span></span><strong>{pct(p)}</strong></div>
              <Progress value={p} tone={p >= 100 ? 'pos' : undefined} />
              <div className="meta" style={{ marginTop: 6 }}>{rupiah(got, base)} dari {rupiah(g.target_amount, base)} · Sisa {rupiah(Math.max(0, g.target_amount - got), base)}{g.deadline ? ` · Tenggat ${fmtDate(g.deadline)}` : ''}</div>
              {cs.length > 0 && <Button small variant="ghost" onClick={() => setOpen(open === g.id ? null : g.id)} style={{ marginTop: 6 }}>{open === g.id ? 'Sembunyikan riwayat' : `Riwayat (${cs.length})`}</Button>}
              {open === g.id && cs.map((c) => <div className="row click" key={c.id} onClick={() => setContrib(c)}><div className="grow"><div className="title">{rupiah(c.amount, base)}</div><div className="meta">{fmtDate(c.date)}{c.note ? ` · ${c.note}` : ''}</div></div></div>)}
            </Card>)
        })}</div>
      )}
      {goal && <FormModal title={goal.id ? 'Edit tujuan' : 'Tujuan baru'} fields={goalFields} initial={goal} onSubmit={(v) => d.submit('goals', v, goal.id)} onDelete={goal.id ? () => d.del('goals', goal.id) : undefined} onClose={() => setGoal(null)} />}
      {contrib && <FormModal title={contrib.id ? 'Edit progres' : 'Tambah progres'} fields={cFields} initial={contrib} onSubmit={(v) => d.submit('contributions', { ...v, goal_id: contrib.goal_id }, contrib.id)} onDelete={contrib.id ? () => d.del('contributions', contrib.id) : undefined} onClose={() => setContrib(null)} />}
    </>
  )
}
