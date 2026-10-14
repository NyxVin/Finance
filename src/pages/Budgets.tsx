import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader, Progress, Stat } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { expenseByCategory, sum } from '../lib/calc'
import { addMonths, fmtMonth, monthEnd, monthStart, pct, rupiah, todayStr } from '../lib/format'

export default function Budgets() {
  const d = useData(); const base = d.profile.base_currency
  const [month, setMonth] = useState(monthStart(todayStr())); const [edit, setEdit] = useState<any | null>(null)
  const spent = expenseByCategory(d, month, monthEnd(month))
  const rows = d.budgets.filter((b) => b.month === month)
  const cat = (id: string) => d.categories.find((c) => c.id === id)
  const totalLimit = sum(rows.map((b) => b.amount_limit)); const totalSpent = sum(rows.map((b) => spent[b.category_id] || 0))
  const unbudgeted = sum(Object.entries(spent).filter(([id]) => !rows.some((b) => b.category_id === id)).map(([, v]) => v))
  const fields: FieldDef[] = [
    { name: 'category_id', label: 'Kategori pengeluaran', type: 'select', required: true, options: d.categories.filter((c) => c.type === 'expense' && (!rows.some((b) => b.category_id === c.id) || c.id === edit?.category_id)).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'amount_limit', label: `Batas anggaran (${base})`, type: 'number', required: true },
  ]
  async function copyPrev() {
    const prev = d.budgets.filter((b) => b.month === addMonths(month, -1) && !rows.some((r) => r.category_id === b.category_id))
    if (!prev.length) return window.alert('Tidak ada anggaran bulan lalu yang bisa disalin.')
    for (const b of prev) { const r = await d.submit('budgets', { category_id: b.category_id, amount_limit: b.amount_limit, month }); if (r) return window.alert(r) }
  }
  return (
    <>
      <PageHeader title="Anggaran" sub="Batas pengeluaran bulanan per kategori." action={<Button variant="primary" onClick={() => setEdit({})}><Plus size={16} />Anggaran baru</Button>} />
      <div className="toolbar" style={{ alignItems: 'center' }}>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}><Button variant="ghost" onClick={() => setMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></Button><strong>{fmtMonth(month)}</strong><Button variant="ghost" onClick={() => setMonth(addMonths(month, 1))} aria-label="Bulan berikutnya"><ChevronRight size={18} /></Button></div>
        <Button onClick={copyPrev}>Salin dari bulan lalu</Button>
      </div>
      <div className="grid stats">
        <Stat label="Total anggaran" value={rupiah(totalLimit, base)} />
        <Stat label="Terpakai" value={rupiah(totalSpent, base)} tone={totalSpent > totalLimit ? 'neg' : undefined} />
        <Stat label="Sisa" value={rupiah(totalLimit - totalSpent, base)} tone={totalLimit - totalSpent < 0 ? 'neg' : 'pos'} />
      </div>
      <Card>
        {rows.length === 0 ? <Empty text="Belum ada anggaran bulan ini. Klik 'Anggaran baru' atau salin dari bulan lalu." /> : rows.map((b) => {
          const s = spent[b.category_id] || 0; const p = (s / b.amount_limit) * 100
          return (
            <div className="row click" key={b.id} onClick={() => setEdit(b)} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="title">{cat(b.category_id)?.name}</span><span className={s > b.amount_limit ? 'neg' : 'muted'}>{pct(p)}</span></div>
              <Progress value={p} tone={p >= 100 ? 'neg' : p >= 80 ? 'warn' : undefined} />
              <div className="meta">Terpakai {rupiah(s, base)} dari {rupiah(b.amount_limit, base)} · {s > b.amount_limit ? `Lebih ${rupiah(s - b.amount_limit, base)}` : `Sisa ${rupiah(b.amount_limit - s, base)}`}</div>
            </div>)
        })}
        {unbudgeted > 0 && <div className="meta" style={{ marginTop: 8 }}>Pengeluaran tanpa anggaran bulan ini: {rupiah(unbudgeted, base)}</div>}
      </Card>
      {edit && <FormModal title={edit.id ? 'Edit anggaran' : 'Anggaran baru'} fields={fields} initial={edit} onSubmit={(v) => d.submit('budgets', { ...v, month }, edit.id)} onDelete={edit.id ? () => d.del('budgets', edit.id) : undefined} onClose={() => setEdit(null)} />}
    </>
  )
}
