import type { Store } from './types'
import { liabilityRemaining } from './calc'

export interface AgendaItem { date: string; kind: 'task' | 'project' | 'goal' | 'debt'; title: string; sub?: string }

/** Gabungan tenggat tugas, proyek, tujuan, dan utang untuk kalender & agenda. */
export function agendaItems(s: Store): AgendaItem[] {
  const out: AgendaItem[] = []
  s.tasks.forEach((t) => t.due_date && t.status !== 'done' && out.push({ date: t.due_date, kind: 'task', title: t.title, sub: 'Tugas' }))
  s.projects.forEach((p) => p.deadline && p.status === 'active' && out.push({ date: p.deadline, kind: 'project', title: p.name, sub: 'Tenggat proyek' }))
  s.goals.forEach((g) => g.deadline && out.push({ date: g.deadline, kind: 'goal', title: g.name, sub: 'Tenggat tujuan' }))
  s.liabilities.forEach((l) => l.due_date && liabilityRemaining(l, s.transactions) > 0 && out.push({ date: l.due_date, kind: 'debt', title: l.name, sub: 'Jatuh tempo utang' }))
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
