import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/data'
import { Button, Card, Empty, PageHeader, Progress, Stat } from '../components/ui'
import { expenseByCategory, health, sum, summarize } from '../lib/calc'
import { addMonths, compact, fmtMonth, fmtMonthShort, monthEnd, monthStart, pct, rupiah, todayStr } from '../lib/format'
import { exportTransactionsCsv } from '../lib/export'

function monthlyData(d: ReturnType<typeof useData>, today: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const m = addMonths(today, i - (n - 1)); const s = summarize(d.transactions, m, monthEnd(m))
    return { m, label: fmtMonthShort(m), Pemasukan: s.income, Pengeluaran: s.expense, 'Bayar utang': s.debt, ...s }
  })
}
const MonthlyChart = ({ data }: { data: any[] }) => (
  <div className="chart"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="label" fontSize={12} /><YAxis tickFormatter={compact} fontSize={12} width={44} /><Tooltip formatter={(v: number) => rupiah(v)} /><Legend /><Bar dataKey="Pemasukan" fill="#16A34A" radius={[4, 4, 0, 0]} /><Bar dataKey="Pengeluaran" fill="#DC2626" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
)

export function FinanceOverview() {
  const d = useData(); const base = d.profile.base_currency; const today = todayStr()
  const ms = monthStart(today); const s = summarize(d.transactions, ms, monthEnd(ms)); const h = health(d, today, d.profile)
  const spent = expenseByCategory(d, ms, monthEnd(ms)); const budgets = d.budgets.filter((b) => b.month === ms)
  const bLimit = sum(budgets.map((b) => b.amount_limit)); const bSpent = sum(budgets.map((b) => spent[b.category_id] || 0))
  return (
    <>
      <PageHeader title="Ringkasan keuangan" sub={`Bulan ${fmtMonth(ms)}`} />
      <div className="grid stats">
        <Stat label="Pemasukan" value={rupiah(s.income, base)} tone="pos" />
        <Stat label="Pengeluaran" value={rupiah(s.expense, base)} tone="neg" />
        <Stat label="Bayar utang" value={rupiah(s.debt, base)} />
        <Stat label="Arus kas bersih" value={rupiah(s.net, base)} tone={s.net < 0 ? 'neg' : 'pos'} sub="Pemasukan − pengeluaran − bayar utang" />
        <Stat label="Rasio tabungan" value={s.savingsRate === null ? '-' : pct(s.savingsRate)} tone={s.savingsRate !== null && s.savingsRate < 0 ? 'neg' : undefined} sub={s.savingsRate === null ? 'Belum ada pemasukan bulan ini' : undefined} />
      </div>
      <div className="grid stats">
        <Stat label="Kekayaan bersih" value={rupiah(h.total, base)} tone={h.total < 0 ? 'neg' : undefined} />
        <Stat label="Dana likuid" value={rupiah(h.liquid, base)} />
        <Stat label="Cakupan dana darurat" value={h.coverage === null ? '-' : `${h.coverage.toFixed(1)} bulan`} sub={h.coverage === null ? 'Perlu data pengeluaran esensial 1-3 bulan terakhir dan akun yang ditandai dana darurat' : `Target ${d.profile.emergency_months} bulan`} />
        <Stat label="Anggaran vs aktual" value={bLimit ? pct((bSpent / bLimit) * 100) : '-'} tone={bLimit && bSpent > bLimit ? 'neg' : undefined} sub={bLimit ? `${rupiah(bSpent, base)} dari ${rupiah(bLimit, base)}` : 'Belum ada anggaran bulan ini'} />
      </div>
      <div className="grid cols">
        <Card title="Pemasukan vs pengeluaran (6 bulan)"><MonthlyChart data={monthlyData(d, today, 6)} /></Card>
        <Card title="Estimasi dana siap investasi">
          <div className="stat"><div className={`value ${h.investable > 0 ? 'pos' : ''}`}>{rupiah(h.investable, base)}</div></div>
          <table style={{ marginTop: 8 }}><tbody>
            <tr><td>Dana likuid</td><td className="num">{rupiah(h.liquid, base)}</td></tr>
            <tr><td>− Target dana darurat ({d.profile.emergency_months} bln × {rupiah(h.avgEssential, base)})</td><td className="num">{rupiah(h.emergencyTarget, base)}</td></tr>
            <tr><td>− Sisa anggaran esensial bulan ini</td><td className="num">{rupiah(h.essentialBudgetLeft, base)}</td></tr>
            <tr><td>− Utang jatuh tempo ≤ 30 hari</td><td className="num">{rupiah(h.dueSoon, base)}</td></tr>
          </tbody></table>
          <p className="meta" style={{ marginTop: 8 }}>Ini hanya estimasi dari data yang Anda catat, bukan nasihat investasi. Satu angka tidak cukup untuk menilai kesehatan keuangan. Lihat juga arus kas, dana darurat, dan utang.</p>
        </Card>
      </div>
    </>
  )
}

export function FinanceReports() {
  const d = useData(); const base = d.profile.base_currency; const today = todayStr()
  const [month, setMonth] = useState(monthStart(today))
  const spent = expenseByCategory(d, month, monthEnd(month)); const total = sum(Object.values(spent))
  const rows = Object.entries(spent).sort((a, b) => b[1] - a[1])
  const data = monthlyData(d, today, 12)
  return (
    <>
      <PageHeader title="Laporan keuangan" action={<Button onClick={() => exportTransactionsCsv(d)}><Download size={16} />Ekspor semua transaksi (CSV)</Button>} />
      <div className="grid cols">
        <Card title="Pengeluaran per kategori" action={<div><Button small variant="ghost" onClick={() => setMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></Button><strong>{fmtMonth(month)}</strong><Button small variant="ghost" onClick={() => setMonth(addMonths(month, 1))} aria-label="Bulan berikutnya"><ChevronRight size={16} /></Button></div>}>
          {rows.length ? rows.map(([id, v]) => (
            <div key={id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{d.categories.find((c) => c.id === id)?.name}</span><span>{rupiah(v, base)} · {pct((v / total) * 100)}</span></div>
              <Progress value={(v / total) * 100} />
            </div>)) : <Empty text="Tidak ada pengeluaran berkategori di bulan ini." />}
        </Card>
        <Card title="Tren 12 bulan"><MonthlyChart data={data} /></Card>
      </div>
      <Card title="Rekap bulanan">
        <div className="table-wrap"><table>
          <thead><tr><th>Bulan</th><th className="num">Pemasukan</th><th className="num">Pengeluaran</th><th className="num">Bayar utang</th><th className="num">Arus kas</th><th className="num">Rasio tabungan</th></tr></thead>
          <tbody>{[...data].reverse().map((r) => (
            <tr key={r.m}><td>{fmtMonth(r.m)}</td><td className="num">{rupiah(r.income, base)}</td><td className="num">{rupiah(r.expense, base)}</td><td className="num">{rupiah(r.debt, base)}</td><td className={`num ${r.net < 0 ? 'neg' : ''}`}>{rupiah(r.net, base)}</td><td className="num">{r.savingsRate === null ? '-' : pct(r.savingsRate)}</td></tr>))}</tbody>
        </table></div>
      </Card>
    </>
  )
}
