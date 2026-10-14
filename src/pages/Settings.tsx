import { useState } from 'react'
import { Download, LogOut, Plus } from 'lucide-react'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { Button, Card, Empty, FormModal, PageHeader, useToast } from '../components/ui'
import type { FieldDef } from '../components/ui'
import { exportBackupJson, exportTransactionsCsv } from '../lib/export'

export default function SettingsPage() {
  const d = useData(); const toast = useToast()
  const [name, setName] = useState(d.profile.full_name || ''); const [months, setMonths] = useState(String(d.profile.emergency_months))
  const [cat, setCat] = useState<any | null>(null)
  const fields: FieldDef[] = [
    { name: 'name', label: 'Nama kategori', type: 'text', required: true },
    { name: 'type', label: 'Jenis', type: 'select', required: true, options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }] },
    { name: 'is_essential', label: 'Pengeluaran esensial (kebutuhan pokok)', type: 'checkbox', show: (v) => v.type === 'expense', hint: 'Dipakai untuk menghitung dana darurat dan estimasi dana investasi.' },
  ]
  async function save() {
    const m = Number(months)
    if (!Number.isInteger(m) || m < 1 || m > 36) return toast('Target dana darurat harus 1-36 bulan.', 'err')
    const r = await d.saveProfile({ full_name: name.trim() || null, emergency_months: m }); if (r) toast(r, 'err')
  }
  const list = (type: string) => d.categories.filter((c) => c.type === type)
  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="grid cols">
        <Card title="Profil & preferensi">
          <div className="field"><label htmlFor="nm">Nama</label><input id="nm" type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="em">Target dana darurat (bulan)</label><input id="em" type="number" value={months} onChange={(e) => setMonths(e.target.value)} /><span className="hint">Umumnya 3-12 bulan pengeluaran esensial.</span></div>
          <div className="field"><label>Mata uang utama</label><input type="text" value={d.profile.base_currency} disabled /></div>
          <div className="field"><label>Zona waktu</label><input type="text" value={d.profile.timezone} disabled /></div>
          <Button variant="primary" onClick={save}>Simpan</Button>
        </Card>
        <Card title="Ekspor & pencadangan">
          <p className="muted" style={{ marginBottom: 12 }}>Paket gratis Supabase tidak menjamin backup otomatis. Unduh cadangan JSON secara rutin (misalnya setiap minggu) dan simpan di tempat aman.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => exportBackupJson(d, d.profile)}><Download size={16} />Cadangan lengkap (JSON)</Button>
            <Button onClick={() => exportTransactionsCsv(d)}><Download size={16} />Transaksi (CSV)</Button>
          </div>
        </Card>
        <Card title="Keamanan">
          <p className="muted" style={{ marginBottom: 12 }}>Data Anda dilindungi Row Level Security: hanya akun Anda yang bisa membacanya.</p>
          <Button variant="danger" onClick={() => supabase.auth.signOut()}><LogOut size={16} />Keluar</Button>
        </Card>
      </div>
      <Card title="Kategori" action={<Button small variant="primary" onClick={() => setCat({ type: 'expense', is_essential: false })}><Plus size={14} />Kategori</Button>}>
        <div className="grid cols">
          {(['income', 'expense'] as const).map((t) => (
            <div key={t}><h3 style={{ fontSize: 14, marginBottom: 4 }}>{t === 'income' ? 'Pemasukan' : 'Pengeluaran'}</h3>
              {list(t).length ? list(t).map((c) => <div className="row click" key={c.id} onClick={() => setCat(c)}><div className="grow">{c.name}</div>{c.is_essential && <span className="badge warn">Esensial</span>}</div>) : <Empty text="Belum ada kategori." />}
            </div>))}
        </div>
      </Card>
      {cat && <FormModal title={cat.id ? 'Edit kategori' : 'Kategori baru'} fields={fields} initial={cat} onSubmit={(v) => d.submit('categories', v, cat.id)} onDelete={cat.id ? () => d.del('categories', cat.id) : undefined} onClose={() => setCat(null)} />}
    </>
  )
}
