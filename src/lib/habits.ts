import type { Habit, HabitLog } from './types'
import { addDays, dow, weekStart } from './format'

export const scheduled = (h: Habit, date: string) => h.frequency_type !== 'days' || (h.target_days || []).includes(dow(date))
const doneSet = (logs: HabitLog[], id: string) => new Set(logs.filter((l) => l.habit_id === id).map((l) => l.log_date))

export function weekCount(h: Habit, logs: HabitLog[], today: string) {
  const s = doneSet(logs, h.id), ws = weekStart(today)
  let n = 0
  for (let i = 0; i < 7; i++) if (s.has(addDays(ws, i))) n++
  return n
}

/** Konsistensi 30 hari terakhir (0-100). */
export function consistency(h: Habit, logs: HabitLog[], today: string) {
  const s = doneSet(logs, h.id)
  let done = 0, due = 0
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i)
    if (s.has(d)) done++
    if (h.frequency_type !== 'weekly_count' && scheduled(h, d)) due++
  }
  if (h.frequency_type === 'weekly_count') due = ((h.target_per_week || 1) * 30) / 7
  return due ? Math.min(100, (done / due) * 100) : 0
}

/** Runtun hari berurutan (hari yang tidak dijadwalkan dilewati; hari ini yang belum dicentang tidak memutus). */
export function streak(h: Habit, logs: HabitLog[], today: string) {
  const s = doneSet(logs, h.id)
  let n = 0
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i)
    if (!scheduled(h, d)) continue
    if (s.has(d)) n++
    else if (i === 0) continue
    else break
  }
  return n
}
