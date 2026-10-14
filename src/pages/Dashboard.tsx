import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/data'
import { Card, Empty, PageHeader, Progress, Seg, Stat } from '../components/ui'
import { TaskRow, useTaskModal } from '../components/TaskTools'
import { cashflowSeries, health, sum, summarize } from '../lib/calc'
import { addMonths, compact, fmtDayShort, fmtMonth, monthEnd, monthStart, pct, rupiah, todayStr } from '../lib/format'
import { agendaItems } from '../lib/agenda'
import { consistency, scheduled } from '../lib/habits'
import { addDays } from '../lib/format'

export default function Dashboard() {
  const d = useData(); const base = d.profile.base_currency; const today = todayStr(); const { open, modal } = useTaskModal()
  const [mode, setMode] = useState<'this' | 'last' | 'custom'>('this')
  const [cFrom, setCFrom] = useState(monthStart(today)); const [cTo, setCTo] = useState(today)
  const ms = monthStart(today)
  const [from, to] = mode === 'this' ? [ms, monthEnd(ms)] : mode === 'last' ? [addMonths(ms, -1), monthEnd(addMonths(ms, -1))] : [cFrom, cTo >= cFrom ? cTo : cFrom]
  const s = summarize(d.transactions, from, to); const h = health(d, today, d.profile)
  const series = cashflowSeries(d.transactions, from, to, today)
  const todayTasks = d.tasks.filter((t) => t.status !== 'done' && ((t.due_date && t.due_date <= today) || t.start_date === today || t.status === 'in_progress')).slice(0, 5)
  const agenda = agendaItems(d).filter((i) => i.date >= today && i.date <= addDays(today, 14)).slice(0, 5)
  const activeProjects = d.projects.filter((p) => p.status === 'active').slice(0, 3)
  const habits = d.habits.filter((x) => !x.is_archived)
  const habitsToday = habits.filter((x) => scheduled(x, today))
  const doneToday = habitsToday.filter((x) => d.habitLogs.some((l) => l.habit_id === x.id && l.log_date === today)).length
  const goals = d.goals.slice(0, 3)
  const label = mode === 'custom' ? `${from} s/d ${to}` : fmtMonth(from)

  return (
    <>
      <PageHeader title="Dashboard" sub={label} action={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Seg value={mode} onChange={setMode} options={[{ value: 'this', label: 'Bulan ini' }, { value: 'last', label: 'Bulan lalu' }, { value: 'custom', label: 'Rentang' }]} />
          {mode === 'custom' && <div className="range"><input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} aria-label="Dari" /><input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} aria-label="Sampai" /></div>}
        </div>} />
      <div className="grid stats">
        <Stat label="Total dana likuid" value={rupiah(h.liquid, base)} />
        <Stat label="Kekayaan bersih" value={rupiah(h.total, base)} tone={h.total < 0 ? 'neg' : undefined} />
        <Stat label="Pemasukan" value={rupiah(s.income, base)} tone="pos" />
        <Stat label="Pengeluaran" value={rupiah(s.expense, base)} tone="neg" />
        <Stat label="Arus kas bersih" value={rupiah(s.net, base)} tone={s.net < 0 ? 'neg' : 'pos'} sub={s.debt ? `Termasuk bayar utang ${rupiah(s.debt, base)}` : undefined} />
      </div>
      <div className="grid cols">
        <Card title="Arus kas kumulatif">
          {d.transactions.length === 0 ? <Empty text="Belum ada transaksi. Catat transaksi pertama Anda dengan tombol + untuk melihat grafik." /> : (
            <div className="chart"><ResponsiveContainer><LineChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="label" fontSize={12} minTickGap={16} /><YAxis tickFormatter={compact} fontSize={12} width={44} /><Tooltip formatter={(v: number) => rupiah(v)} labelFormatter={(l) => `Periode ${l}`} /><Line type="monotone" dataKey="net" name="Arus kas" stroke="#3B82F6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card title="Tugas hari ini" action={<Link to="/hari-ini">Lihat semua</Link>}>
          {todayTasks.length ? todayTasks.map((t) => <TaskRow key={t.id} t={t} onOpen={open} />) : <Empty text="Tidak ada tugas untuk hari ini." />}
        </Card>
        <Card title="Agenda terdekat" action={<Link to="/kalender">Kalender</Link>}>
          {agenda.length ? agenda.map((i, k) => <div className="row" key={k}><div className="grow"><div className="title">{i.title}</div><div className="meta">{i.sub}</div></div><span className="meta">{fmtDayShort(i.date)}</span></div>) : <Empty text="Tidak ada agenda dalam 14 hari ke depan." />}
        </Card>
        <Card title="Proyek & kebiasaan">
          {activeProjects.map((p) => { const ts = d.tasks.filter((t) => t.project_id === p.id); const n = ts.filter((t) => t.status === 'done').length; return <div key={p.id} style={{ marginBottom: 12 }}><div className="meta">{p.name} · {n}/{ts.length} tugas</div><Progress value={ts.length ? (n / ts.length) * 100 : 0} /></div> })}
          {habitsToday.length > 0 && <div style={{ marginBottom: 12 }}><div className="meta">Kebiasaan hari ini · {doneToday}/{habitsToday.length}</div><Progress value={(doneToday / habitsToday.length) * 100} tone="pos" /></div>}
          {habits.length > 0 && <div className="meta">Rata-rata konsistensi 30 hari: {pct(sum(habits.map((x) => consistency(x, d.habitLogs, today))) / habits.length)}</div>}
          {!activeProjects.length && !habits.length && <Empty text="Belum ada proyek atau kebiasaan." />}
        </Card>
        <Card title="Tujuan finansial" action={<Link to="/tujuan">Kelola</Link>}>
          {goals.length ? goals.map((g) => { const got = sum(d.contributions.filter((c) => c.goal_id === g.id).map((c) => c.amount)); const p = (got / g.target_amount) * 100; return <div key={g.id} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{g.name}</span><span className="muted">{pct(p)}</span></div><Progress value={p} tone={p >= 100 ? 'pos' : undefined} /></div> }) : <Empty text="Belum ada tujuan finansial." />}
        </Card>
      </div>
      {modal}
    </>
  )
}
