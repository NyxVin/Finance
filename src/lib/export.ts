import type { Store } from './types'
import { csvCell, download, todayStr } from './format'
import { TX_TYPES } from './consts'

export function exportTransactionsCsv(s: Store, txs = s.transactions) {
  const acc = (id: string | null) => s.accounts.find((a) => a.id === id)?.name || ''
  const cat = (id: string | null) => s.categories.find((c) => c.id === id)?.name || ''
  const head = ['Tanggal', 'Jenis', 'Akun', 'Akun tujuan', 'Kategori', 'Deskripsi', 'Jumlah', 'Mata uang', 'Kurs ke IDR', 'Jumlah (IDR)']
  const rows = txs.map((t) => [t.date, TX_TYPES[t.type], acc(t.account_id), acc(t.to_account_id), cat(t.category_id), t.description, t.amount, t.currency, t.exchange_rate, t.amount_base])
  download(`transaksi-${todayStr()}.csv`, '\uFEFF' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8')
}
export function exportBackupJson(s: Store, profile: unknown) {
  download(`backup-life-finance-${todayStr()}.json`, JSON.stringify({ exported_at: new Date().toISOString(), profile, ...s }, null, 2), 'application/json')
}
