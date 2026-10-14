import type { Store, Tx, Liability, Profile } from './types'
import { addMonths, addDays, monthStart, monthEnd } from './format'

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const N = (x: unknown) => Number(x) || 0

/** Saldo berjalan tiap akun (dalam mata uang akun) = saldo awal + efek semua transaksi. Dihitung, bukan disimpan. */
export function balances(accounts: Store['accounts'], txs: Tx[]) {
  const m: Record<string, number> = {}
  accounts.forEach((a) => (m[a.id] = N(a.opening_balance)))
  for (const t of txs) {
    const amt = N(t.amount)
    if (m[t.account_id] !== undefined) {
      if (t.type === 'income' || t.type === 'adjustment') m[t.account_id] += amt
      else m[t.account_id] -= amt // expense, transfer keluar, bayar utang
    }
    if (t.type === 'transfer' && t.to_account_id && m[t.to_account_id] !== undefined) m[t.to_account_id] += N(t.to_amount ?? t.amount)
  }
  return m
}

/** Ringkasan periode. Transfer & penyesuaian TIDAK dihitung. Bayar utang dipisah dari pengeluaran. */
export function summarize(txs: Tx[], from: string, to: string) {
  let income = 0, expense = 0, debt = 0
  for (const t of txs) {
    if (t.date < from || t.date > to) continue
    if (t.type === 'income') income += N(t.amount_base)
    else if (t.type === 'expense') expense += N(t.amount_base)
    else if (t.type === 'debt_payment') debt += N(t.amount_base)
  }
  const net = income - expense - debt
  return { income, expense, debt, net, savingsRate: income > 0 ? (net / income) * 100 : null }
}

export const liabilityRemaining = (l: Liability, txs: Tx[]) =>
  Math.max(0, N(l.principal) - sum(txs.filter((t) => t.type === 'debt_payment' && t.liability_id === l.id).map((t) => N(t.amount))))

export function expenseByCategory(s: Store, from: string, to: string) {
  const m: Record<string, number> = {}
  for (const t of s.transactions) if (t.type === 'expense' && t.category_id && t.date >= from && t.date <= to) m[t.category_id] = (m[t.category_id] || 0) + N(t.amount_base)
  return m
}

export function netWorth(s: Store) {
  const bal = balances(s.accounts, s.transactions)
  const accounts = sum(s.accounts.map((a) => bal[a.id] * N(a.rate_to_base)))
  const assets = sum(s.assets.map((a) => N(a.value) * N(a.rate_to_base)))
  const liabilities = sum(s.liabilities.map((l) => liabilityRemaining(l, s.transactions) * N(l.rate_to_base)))
  return { accounts, assets, liabilities, total: accounts + assets - liabilities, bal }
}

/** Indikator kesehatan keuangan + estimasi dana siap investasi. */
export function health(s: Store, today: string, profile: Profile) {
  const nw = netWorth(s)
  const active = s.accounts.filter((a) => !a.is_archived)
  const liquid = sum(active.filter((a) => a.is_liquid).map((a) => nw.bal[a.id] * N(a.rate_to_base)))
  const emergencyFund = sum(active.filter((a) => a.is_emergency_fund).map((a) => nw.bal[a.id] * N(a.rate_to_base)))

  // Rata-rata pengeluaran esensial: 3 bulan penuh terakhir (hanya bulan yang punya data pengeluaran)
  const ess = new Set(s.categories.filter((c) => c.is_essential).map((c) => c.id))
  let total = 0, months = 0
  for (let i = 1; i <= 3; i++) {
    const a = addMonths(today, -i), b = monthEnd(a)
    const inMonth = s.transactions.filter((t) => t.type === 'expense' && t.date >= a && t.date <= b)
    if (inMonth.length) months++
    total += sum(inMonth.filter((t) => t.category_id && ess.has(t.category_id)).map((t) => N(t.amount_base)))
  }
  const avgEssential = months ? total / months : 0
  const coverage = avgEssential > 0 ? emergencyFund / avgEssential : null
  const emergencyTarget = avgEssential * profile.emergency_months

  // Sisa anggaran esensial bulan ini
  const ms = monthStart(today)
  const spent = expenseByCategory(s, ms, monthEnd(today))
  const essentialBudgetLeft = sum(s.budgets.filter((b) => b.month === ms && ess.has(b.category_id)).map((b) => Math.max(0, N(b.amount_limit) - (spent[b.category_id] || 0))))

  // Utang jatuh tempo <= 30 hari (termasuk yang sudah lewat)
  const limit = addDays(today, 30)
  const dueSoon = sum(s.liabilities.filter((l) => l.due_date && l.due_date <= limit).map((l) => liabilityRemaining(l, s.transactions) * N(l.rate_to_base)))

  const investable = Math.max(0, liquid - emergencyTarget - essentialBudgetLeft - dueSoon)
  return { ...nw, liquid, emergencyFund, avgEssential, coverage, emergencyTarget, essentialBudgetLeft, dueSoon, investable }
}

/** Deret arus kas kumulatif untuk grafik: harian (<=92 hari) atau bulanan. */
export function cashflowSeries(txs: Tx[], from: string, to: string, today: string) {
  const end = to > today ? today : to
  const daily = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 <= 92
  const keys: string[] = []
  if (daily) for (let x = from; x <= end; x = addDays(x, 1)) keys.push(x)
  else for (let x = monthStart(from); x <= end; x = addMonths(x, 1)) keys.push(x.slice(0, 7))
  const net: Record<string, number> = {}
  for (const t of txs) {
    if (t.date < from || t.date > to) continue
    const k = daily ? t.date : t.date.slice(0, 7)
    if (t.type === 'income') net[k] = (net[k] || 0) + N(t.amount_base)
    else if (t.type === 'expense' || t.type === 'debt_payment') net[k] = (net[k] || 0) - N(t.amount_base)
  }
  let run = 0
  return keys.map((k) => ({ key: k, label: daily ? k.slice(8) + '/' + k.slice(5, 7) : k, net: (run += net[k] || 0) }))
}
