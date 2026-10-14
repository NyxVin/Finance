import { useState } from 'react'
import { Check } from 'lucide-react'
import { useData } from '../lib/data'
import type { DataCtx } from '../lib/data'
import type { Task } from '../lib/types'
import { FormModal } from './ui'
import type { FieldDef } from './ui'
import { fmtDate, todayStr } from '../lib/format'

export const PRIORITY: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
export const STATUS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
export const PRIO_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function useTaskModal() {
  const d = useData()
  const [edit, setEdit] = useState<any | null>(null)
  const fields: FieldDef[] = [
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: Object.entries(STATUS).map(([value, label]) => ({ value, label })) },
    { name: 'priority', label: 'Prioritas', type: 'select', required: true, options: Object.entries(PRIORITY).map(([value, label]) => ({ value, label })) },
    { name: 'start_date', label: 'Tanggal mulai', type: 'date' },
    { name: 'due_date', label: 'Tenggat', type: 'date' },
    { name: 'project_id', label: 'Proyek', type: 'select', options: d.projects.filter((p) => p.status !== 'archived').map((p) => ({ value: p.id, label: p.name })) },
  ]
  const modal = edit ? (
    <FormModal title={edit.id ? 'Edit tugas' : 'Tugas baru'} fields={fields} initial={edit}
      onSubmit={(v) => d.submit('tasks', { ...v, completed_at: v.status === 'done' ? edit.completed_at || new Date().toISOString() : null }, edit.id)}
      onDelete={edit.id ? () => d.del('tasks', edit.id) : undefined} onClose={() => setEdit(null)} />
  ) : null
  return { open: (t?: Partial<Task>) => setEdit(t || { status: 'todo', priority: 'medium' }), modal }
}

export const toggleDone = (d: DataCtx, t: Task) =>
  d.submit('tasks', t.status === 'done' ? { status: 'todo', completed_at: null } : { status: 'done', completed_at: new Date().toISOString() }, t.id)

export function TaskRow({ t, onOpen }: { t: Task; onOpen: (t: Task) => void }) {
  const d = useData()
  const proj = d.projects.find((p) => p.id === t.project_id)
  const late = t.status !== 'done' && !!t.due_date && t.due_date < todayStr()
  return (
    <div className="row">
      <button className={`tick ${t.status === 'done' ? 'on' : ''}`} aria-label={t.status === 'done' ? 'Tandai belum selesai' : 'Tandai selesai'} onClick={() => toggleDone(d, t)}>{t.status === 'done' && <Check size={14} />}</button>
      <div className="grow click" style={{ cursor: 'pointer' }} onClick={() => onOpen(t)}>
        <div className="title" style={t.status === 'done' ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : undefined}>{t.title}</div>
        <div className="meta">
          <span className={`badge ${t.priority}`}>{PRIORITY[t.priority]}</span>
          {t.status === 'in_progress' && <span className="badge">In Progress</span>}
          {proj && <span className="badge">{proj.name}</span>}
          {t.due_date && <span className={late ? 'neg' : ''}>{late ? 'Terlambat · ' : ''}{fmtDate(t.due_date)}</span>}
        </div>
      </div>
    </div>
  )
}
