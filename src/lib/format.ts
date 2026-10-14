export const TZ = 'Asia/Jakarta'
const d = (s: string) => new Date(s + 'T00:00:00Z')
const ds = (x: Date) => x.toISOString().slice(0, 10)

export const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })
export const isoToDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
export const addDays = (s: string, n: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return ds(x) }
export const monthStart = (s: string) => s.slice(0, 8) + '01'
export const addMonths = (s: string, n: number) => { const x = d(monthStart(s)); x.setUTCMonth(x.getUTCMonth() + n); return ds(x) }
export const monthEnd = (s: string) => addDays(addMonths(s, 1), -1)
export const dow = (s: string) => d(s).getUTCDay()
export const weekStart = (s: string) => addDays(s, -((dow(s) + 6) % 7)) // Senin
export const daysBetween = (a: string, b: string) => Math.round((d(b).getTime() - d(a).getTime()) / 86400000)

const f = (s: string, o: Intl.DateTimeFormatOptions) => d(s).toLocaleDateString('id-ID', { ...o, timeZone: 'UTC' })
export const fmtDate = (s?: string | null) => (s ? f(s, { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
export const fmtDayLong = (s: string) => f(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const fmtDayShort = (s: string) => f(s, { day: 'numeric', month: 'short' })
export const fmtMonth = (s: string) => f(s, { month: 'long', year: 'numeric' })
export const fmtMonthShort = (s: string) => f(s, { month: 'short', year: '2-digit' })
export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')

export const rupiah = (n: number, cur = 'IDR') =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'IDR' ? 0 : 2 }).format(n || 0)
export const compact = (n: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)
export const pct = (n: number) => `${Math.round(n)}%`
export const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function download(name: string, content: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
