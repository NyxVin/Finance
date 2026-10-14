import { balances, summarize, liabilityRemaining, netWorth } from '../src/lib/calc'
const eq = (a: any, b: any, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('GAGAL:', m, a, '!=', b); process.exit(1) } else console.log('OK  :', m) }
const acc = (id: string, ob: number, cur = 'IDR', rate = 1): any => ({ id, opening_balance: ob, currency: cur, rate_to_base: rate, is_archived: false, is_liquid: true, is_emergency_fund: false })
const tx = (o: any): any => ({ currency: 'IDR', exchange_rate: 1, to_account_id: null, to_amount: null, category_id: null, liability_id: null, ...o, amount_base: o.amount_base ?? o.amount })
const accounts = [acc('bank', 1000), acc('cash', 0), acc('usd', 0, 'USD', 16000)]
const txs = [
  tx({ id: 1, type: 'income', date: '2026-10-01', amount: 500, account_id: 'bank' }),
  tx({ id: 2, type: 'expense', date: '2026-10-02', amount: 200, account_id: 'bank' }),
  tx({ id: 3, type: 'transfer', date: '2026-10-03', amount: 100, account_id: 'bank', to_account_id: 'cash' }),
  tx({ id: 4, type: 'debt_payment', date: '2026-10-04', amount: 300, account_id: 'bank', liability_id: 'L' }),
  tx({ id: 5, type: 'adjustment', date: '2026-10-05', amount: -50, account_id: 'cash' }),
  tx({ id: 6, type: 'transfer', date: '2026-10-06', amount: 160000, account_id: 'bank', to_account_id: 'usd', to_amount: 10 }),
]
const b = balances(accounts, txs)
eq(b.bank, 1000 + 500 - 200 - 100 - 300 - 160000, 'saldo bank')
eq(b.cash, 100 - 50, 'saldo tunai (transfer masuk, penyesuaian negatif)')
eq(b.usd, 10, 'transfer beda mata uang memakai to_amount')
const s = summarize(txs, '2026-10-01', '2026-10-31')
eq([s.income, s.expense, s.debt, s.net], [500, 200, 300, 0], 'transfer & penyesuaian tidak masuk arus kas; bayar utang terpisah')
eq(s.savingsRate, 0, 'rasio tabungan')
const store: any = { accounts, transactions: txs, assets: [], liabilities: [{ id: 'L', principal: 1000, currency: 'IDR', rate_to_base: 1 }] }
eq(liabilityRemaining(store.liabilities[0], txs), 700, 'sisa utang')
eq(netWorth(store).total, b.bank + b.cash + 10 * 16000 - 700, 'kekayaan bersih = akun + aset - utang')
eq(summarize([], '2026-10-01', '2026-10-31').savingsRate, null, 'rasio tabungan null tanpa pemasukan')
