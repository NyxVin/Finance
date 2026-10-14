import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/data'
import { Button, Card, Empty, FormModal, PageHeader, Progress, Stat } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { TaskRow, useTaskModal, PRIORITY, STATUS, PRIO_ORDER } from '../components/TaskTools'
import { addDays, addMonths, dow, fmtDate, fmtDayLong, fmtDayShort, fmtMonth, isoToDate, monthStart, todayStr, weekStart } from '../lib/format'
import { agendaItems } from '../lib/agenda'
import { consistency, scheduled, streak, weekCount } from '../lib/habits'
import type { Task } from '../lib/types'

const byDue = (a: Task, b: Task) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]

// ---------------- MY DAY ----------------
export function MyDay() {
  const d = useData(); const today = todayStr(); const { open, modal } = useTaskModal()
  const [quick, setQuick] = useState('')
  const todo = d.tasks.filter((t) => t.status !== 'done' && ((t.due_date && t.due_date <= today) || t.start_date === today || t.status === 'in_progress')).sort(byDue)
  const done = d.tasks.filter((t) => t.status === 'done' && t.completed_at && isoToDate(t.completed_at) === today)
  const habits = d.habits.filter((h) => !h.is_archived && scheduled(h, today))
  const logged = (id: string) => d.habitLogs.find((l) => l.habit_id === id && l.log_date === today)
  async function add() {
    if (!quick.trim()) return
    const r = await d.submit('tasks', { title: quick.trim(), due_date: today })
    if (!r) setQuick('')
  }
  return (
    <>
      <PageHeader title="My Day" sub={fmtDayLong(today)} action={<Button variant="primary" onClick={() => open({ status: 'todo', priority: 'medium', due_date: today })}><Plus size={16} />Tugas baru</Button>} />
      <div className="toolbar"><input type="text" placeholder="Tambah tugas cepat untuk hari ini, lalu tekan Enter" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /><Button onClick={add}>Tambah</Button></div>
      <div className="grid cols">
        <Card title={`Perlu dikerjakan (${todo.length})`}>
          {todo.length ? todo.map((t) => <TaskRow key={t.id} t={t} onOpen={open} />) : <Empty text="Tidak ada tugas untuk hari ini. Tambahkan tugas di atas." />}
          {done.length > 0 && <><div className="meta" style={{ margin: '12px 0 4px' }}>Selesai hari ini</div>{done.map((t) => <TaskRow key={t.id} t={t} onOpen={open} />)}</>}
        </Card>
        <Card title="Kebiasaan hari ini">
          {habits.length ? habits.map((h) => {
            const l = logged(h.id)
            return <div className="row" key={h.id}><button className={`tick ${l ? 'on' : ''}`} aria-label={`Tandai ${h.name}`} onClick={() => toggleLog(d, h.id, today)}>{l && '✓'}</button><div className="grow title">{h.name}</div></div>
          }) : <Empty text="Belum ada kebiasaan untuk hari ini." />}
        </Card>
      </div>
      {modal}
    </>
  )
}

// ---------------- TASKS ----------------
export function Tasks() {
  const d = useData(); const { open, modal } = useTaskModal()
  const [q, setQ] = useState(''); const [fs, setFs] = useState(''); const [fp, setFp] = useState(''); const [fj, setFj] = useState(''); const [sort, setSort] = useState('due')
  const list = useMemo(() => {
    let r = d.tasks.filter((t) => (!q || (t.title + (t.description || '')).toLowerCase().includes(q.toLowerCase())) && (!fs || t.status === fs) && (!fp || t.priority === fp) && (!fj || t.project_id === fj))
    r = [...r].sort(sort === 'due' ? byDue : sort === 'priority' ? (a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] : (a, b) => (b.completed_at || b.id).localeCompare(a.completed_at || a.id))
    return r
  }, [d.tasks, q, fs, fp, fj, sort])
  return (
    <>
      <PageHeader title="Tasks" sub="Daftar tugas Anda." action={<Button variant="primary" onClick={() => open()}><Plus size={16} />Tugas baru</Button>} />
      <div className="toolbar">
        <input type="text" placeholder="Cari tugas..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
        <select value={fs} onChange={(e) => setFs(e.target.value)} aria-label="Status"><option value="">Semua status</option>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={fp} onChange={(e) => setFp(e.target.value)} aria-label="Prioritas"><option value="">Semua prioritas</option>{Object.entries(PRIORITY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={fj} onChange={(e) => setFj(e.target.value)} aria-label="Proyek"><option value="">Semua proyek</option>{d.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan"><option value="due">Urut: tenggat</option><option value="priority">Urut: prioritas</option><option value="done">Urut: terbaru selesai</option></select>
      </div>
      <Card>{list.length ? list.map((t) => <TaskRow key={t.id} t={t} onOpen={open} />) : <Empty text={d.tasks.length ? 'Tidak ada tugas yang cocok dengan filter.' : 'Belum ada tugas. Klik "Tugas baru" untuk mulai.'} />}</Card>
      {modal}
    </>
  )
}

// ---------------- PROJECTS ----------------
export function Projects() {
  const d = useData(); const [edit, setEdit] = useState<any | null>(null)
  const fields: FieldDef[] = [
    { name: 'name', label: 'Nama proyek', type: 'text', required: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
    { name: 'deadline', label: 'Tenggat', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'active', label: 'Aktif' }, { value: 'done', label: 'Selesai' }, { value: 'archived', label: 'Diarsipkan' }] },
  ]
  return (
    <>
      <PageHeader title="Projects" action={<Button variant="primary" onClick={() => setEdit({ status: 'active' })}><Plus size={16} />Proyek baru</Button>} />
      {d.projects.length === 0 ? <Card><Empty text="Belum ada proyek. Buat proyek lalu hubungkan tugas ke dalamnya." /></Card> : (
        <div className="grid cols">{d.projects.map((p) => {
          const ts = d.tasks.filter((t) => t.project_id === p.id); const done = ts.filter((t) => t.status === 'done').length
          const prog = ts.length ? (done / ts.length) * 100 : 0
          return (
            <Card key={p.id} title={p.name} action={<Button small onClick={() => setEdit(p)}>Edit</Button>}>
              {p.description && <p className="muted" style={{ marginBottom: 8 }}>{p.description}</p>}
              <Progress value={prog} tone={p.status === 'done' ? 'pos' : undefined} />
              <div className="meta" style={{ marginTop: 6 }}>{done}/{ts.length} tugas selesai · Tenggat: {fmtDate(p.deadline)} · {p.status === 'active' ? 'Aktif' : p.status === 'done' ? 'Selesai' : 'Arsip'}</div>
            </Card>)
        })}</div>
      )}
      {edit && <FormModal title={edit.id ? 'Edit proyek' : 'Proyek baru'} fields={fields} initial={edit} onSubmit={(v) => d.submit('projects', v, edit.id)} onDelete={edit.id ? () => d.del('projects', edit.id) : undefined} onClose={() => setEdit(null)} />}
    </>
  )
}

// ---------------- CALENDAR ----------------
export function CalendarPage() {
  const d = useData(); const today = todayStr()
  const [month, setMonth] = useState(monthStart(today)); const [sel, setSel] = useState(today)
  const items = useMemo(() => agendaItems(d), [d])
  const first = month; const offset = (dow(first) + 6) % 7
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - offset))
  const on = (day: string) => items.filter((i) => i.date === day)
  const upcoming = items.filter((i) => i.date >= today && i.date <= addDays(today, 14))
  const dotCls = { task: '', project: 'p', goal: 'g', debt: 'l' }
  return (
    <>
      <PageHeader title="Calendar" sub="Tenggat tugas, proyek, tujuan finansial, dan utang." />
      <div className="grid cols">
        <Card title={fmtMonth(month)} action={<div><Button small variant="ghost" onClick={() => setMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></Button><Button small onClick={() => { setMonth(monthStart(today)); setSel(today) }}>Hari ini</Button><Button small variant="ghost" onClick={() => setMonth(addMonths(month, 1))} aria-label="Bulan berikutnya"><ChevronRight size={16} /></Button></div>}>
          <div className="cal">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((n) => <div className="dh" key={n}>{n}</div>)}
            {cells.map((c) => {
              const it = on(c)
              return <button key={c} className={`${c.slice(0, 7) !== month.slice(0, 7) ? 'out' : ''} ${c === today ? 'today' : ''} ${c === sel ? 'sel' : ''}`} onClick={() => setSel(c)} aria-label={fmtDayLong(c)}>
                <span>{Number(c.slice(8))}</span><span className="dots">{it.slice(0, 4).map((x, i) => <i key={i} className={`dot ${dotCls[x.kind]}`} />)}</span></button>
            })}
          </div>
          <div className="meta" style={{ marginTop: 8 }}>Biru: tugas · Kuning: proyek · Hijau: tujuan · Merah: utang</div>
        </Card>
        <div>
          <Card title={fmtDayLong(sel)}>
            {on(sel).length ? on(sel).map((i, k) => <div className="row" key={k}><div className="grow"><div className="title">{i.title}</div><div className="meta">{i.sub}</div></div></div>) : <Empty text="Tidak ada agenda di tanggal ini." />}
          </Card>
          <div style={{ height: 12 }} />
          <Card title="Agenda 14 hari ke depan">
            {upcoming.length ? upcoming.map((i, k) => <div className="row" key={k}><div className="grow"><div className="title">{i.title}</div><div className="meta">{i.sub}</div></div><span className="meta">{fmtDayShort(i.date)}</span></div>) : <Empty text="Tidak ada agenda terdekat." />}
          </Card>
        </div>
      </div>
    </>
  )
}

// ---------------- HABITS ----------------
export async function toggleLog(d: ReturnType<typeof useData>, habitId: string, date: string) {
  const ex = d.habitLogs.find((l) => l.habit_id === habitId && l.log_date === date)
  return ex ? d.del('habitLogs', ex.id) : d.submit('habitLogs', { habit_id: habitId, log_date: date })
}
export function Habits() {
  const d = useData(); const today = todayStr(); const [edit, setEdit] = useState<any | null>(null)
  const fields: FieldDef[] = [
    { name: 'name', label: 'Nama kebiasaan', type: 'text', required: true },
    { name: 'frequency_type', label: 'Frekuensi', type: 'select', required: true, options: [{ value: 'daily', label: 'Setiap hari' }, { value: 'days', label: 'Hari tertentu' }, { value: 'weekly_count', label: 'X kali per minggu' }] },
    { name: 'target_days', label: 'Hari target', type: 'days', required: true, show: (v) => v.frequency_type === 'days' },
    { name: 'target_per_week', label: 'Target per minggu (1-7)', type: 'number', required: true, show: (v) => v.frequency_type === 'weekly_count' },
    { name: 'is_archived', label: 'Arsipkan kebiasaan ini', type: 'checkbox' },
  ]
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const habits = d.habits.filter((h) => !h.is_archived)
  return (
    <>
      <PageHeader title="Habits" sub="Klik lingkaran untuk menandai. Anda juga bisa mengisi hari sebelumnya." action={<Button variant="primary" onClick={() => setEdit({ frequency_type: 'daily' })}><Plus size={16} />Kebiasaan baru</Button>} />
      {habits.length === 0 ? <Card><Empty text="Belum ada kebiasaan. Buat satu, misalnya 'Olahraga' atau 'Membaca'." /></Card> : (
        <div className="grid cols">{habits.map((h) => (
          <Card key={h.id} title={h.name} action={<Button small onClick={() => setEdit(h)}>Edit</Button>}>
            <div className="hdots" style={{ justifyContent: 'space-between' }}>
              {days.map((x) => {
                const l = d.habitLogs.some((g) => g.habit_id === h.id && g.log_date === x)
                return <div key={x} style={{ textAlign: 'center' }}><div className="meta">{['M', 'S', 'S', 'R', 'K', 'J', 'S'][dow(x)]}</div><button className={l ? 'on' : ''} aria-label={`${h.name} ${fmtDayShort(x)}`} onClick={() => toggleLog(d, h.id, x)} /></div>
              })}
            </div>
            <div style={{ marginTop: 12 }}><Progress value={consistency(h, d.habitLogs, today)} tone="pos" /></div>
            <div className="meta" style={{ marginTop: 6 }}>Konsistensi 30 hari: {Math.round(consistency(h, d.habitLogs, today))}% · {h.frequency_type === 'weekly_count' ? `Minggu ini: ${weekCount(h, d.habitLogs, today)}/${h.target_per_week}` : `Runtun: ${streak(h, d.habitLogs, today)} hari`}</div>
          </Card>))}</div>
      )}
      {edit && <FormModal title={edit.id ? 'Edit kebiasaan' : 'Kebiasaan baru'} fields={fields} initial={edit} onSubmit={(v) => d.submit('habits', v, edit.id)} onDelete={edit.id ? () => d.del('habits', edit.id) : undefined} onClose={() => setEdit(null)} />}
    </>
  )
}

// ---------------- REPORTS ----------------
export function ProductivityReports() {
  const d = useData(); const today = todayStr(); const { open, modal } = useTaskModal()
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), (i - 7) * 7))
  const data = weeks.map((w) => ({ label: fmtDayShort(w), Selesai: d.tasks.filter((t) => t.completed_at && isoToDate(t.completed_at) >= w && isoToDate(t.completed_at) < addDays(w, 7)).length }))
  const overdue = d.tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).sort(byDue)
  const doneMonth = d.tasks.filter((t) => t.completed_at && isoToDate(t.completed_at) >= addDays(today, -29)).length
  const active = d.tasks.filter((t) => t.status !== 'done').length
  const habits = d.habits.filter((h) => !h.is_archived)
  return (
    <>
      <PageHeader title="Laporan produktivitas" />
      <div className="grid stats">
        <Stat label="Selesai (30 hari)" value={doneMonth} tone="pos" />
        <Stat label="Tugas aktif" value={active} />
        <Stat label="Terlambat" value={overdue.length} tone={overdue.length ? 'neg' : undefined} />
      </div>
      <div className="grid cols">
        <Card title="Tugas selesai per minggu">
          <div className="chart"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="label" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} width={28} /><Tooltip /><Bar dataKey="Selesai" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Tugas terlambat">{overdue.length ? overdue.map((t) => <TaskRow key={t.id} t={t} onOpen={open} />) : <Empty text="Tidak ada tugas terlambat." />}</Card>
        <Card title="Progres proyek">{d.projects.filter((p) => p.status === 'active').length ? d.projects.filter((p) => p.status === 'active').map((p) => { const ts = d.tasks.filter((t) => t.project_id === p.id); const n = ts.filter((t) => t.status === 'done').length; return <div key={p.id} style={{ marginBottom: 12 }}><div className="meta">{p.name} · {n}/{ts.length}</div><Progress value={ts.length ? (n / ts.length) * 100 : 0} /></div> }) : <Empty text="Belum ada proyek aktif." />}</Card>
        <Card title="Konsistensi kebiasaan (30 hari)">{habits.length ? habits.map((h) => <div key={h.id} style={{ marginBottom: 12 }}><div className="meta">{h.name} · {Math.round(consistency(h, d.habitLogs, today))}%</div><Progress value={consistency(h, d.habitLogs, today)} tone="pos" /></div>) : <Empty text="Belum ada kebiasaan." />}</Card>
      </div>
      {modal}
    </>
  )
}
