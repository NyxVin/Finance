export const CURRENCIES = ['IDR', 'USD', 'SGD', 'EUR', 'MYR', 'JPY', 'AUD', 'GBP', 'SAR', 'CNY'].map((c) => ({ value: c, label: c }))
export const ACCOUNT_TYPES: Record<string, string> = { cash: 'Tunai', bank: 'Rekening bank', ewallet: 'Dompet digital', savings: 'Tabungan', other: 'Lainnya' }
export const TX_TYPES: Record<string, string> = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', debt_payment: 'Bayar utang', adjustment: 'Penyesuaian saldo' }
export const ASSET_TYPES: Record<string, string> = { gold: 'Emas', vehicle: 'Kendaraan', property: 'Properti', receivable: 'Piutang', other: 'Lainnya' }
export const GOAL_TYPES: Record<string, string> = { emergency: 'Dana darurat', savings: 'Tabungan', education: 'Pendidikan', other: 'Lainnya' }
export const toOpts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }))
