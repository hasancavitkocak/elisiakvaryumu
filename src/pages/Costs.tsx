import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useToast } from '../context/ToastContext'
import type { Cost } from '../types'

const CATEGORIES = ['Hammadde', 'Ambalaj', 'Kargo', 'Kira', 'Personel', 'Pazarlama', 'Fatura', 'Ekipman', 'Genel']

const emptyForm = {
  title: '',
  amount: 0,
  category: 'Genel',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

const catColors: Record<string, string> = {
  'Hammadde': 'badge-purple',
  'Ambalaj': 'badge-blue',
  'Kargo': 'badge-yellow',
  'Kira': 'badge-red',
  'Personel': 'badge-green',
  'Pazarlama': 'badge-yellow',
  'Fatura': 'badge-gray',
  'Ekipman': 'badge-blue',
  'Genel': 'badge-gray',
}

export default function Costs() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Cost | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const { showToast } = useToast()

  const fetchCosts = async () => {
    const { data } = await supabase.from('costs').select('*').order('date', { ascending: false })
    if (data) setCosts(data as Cost[])
    setLoading(false)
  }

  useEffect(() => { fetchCosts() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: Cost) => {
    setEditing(c)
    setForm({ title: c.title, amount: c.amount, category: c.category, date: c.date, notes: c.notes })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.date) { showToast('Başlık ve tarih zorunludur.', 'error'); return }
    setSaving(true)
    let err
    if (editing) {
      const { error } = await supabase.from('costs').update(form).eq('id', editing.id)
      err = error
    } else {
      const { error } = await supabase.from('costs').insert(form)
      err = error
    }
    setSaving(false)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast(editing ? 'Maliyet güncellendi' : 'Maliyet eklendi')
    setShowModal(false)
    fetchCosts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu maliyeti silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('costs').delete().eq('id', id)
    if (error) { showToast('Silinemedi: ' + error.message, 'error'); return }
    showToast('Maliyet silindi')
    fetchCosts()
  }

  const filteredMonth = monthFilter
    ? costs.filter(c => c.date.startsWith(monthFilter))
    : costs

  const totalMonth = filteredMonth.reduce((s, c) => s + Number(c.amount), 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: filteredMonth.filter(c => c.category === cat).reduce((s, c) => s + Number(c.amount), 0),
  })).filter(x => x.total > 0)

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Maliyetler</h2>
          <p>Gider takibi ve maliyet analizi</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Maliyet Ekle</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Ay filtrele:</label>
        <input className="form-control" type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ width: 180 }} />
        {monthFilter && <button className="btn btn-secondary btn-sm" onClick={() => setMonthFilter('')}>Tümü</button>}
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Toplam Gider</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>₺{totalMonth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div className="stat-sub">{filteredMonth.length} kalem</div>
        </div>
        {byCategory.slice(0, 3).map(x => (
          <div className="stat-card" key={x.cat}>
            <div className="stat-label">{x.cat}</div>
            <div className="stat-value" style={{ fontSize: 20 }}>₺{x.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            <div className="stat-sub">{totalMonth > 0 ? ((x.total / totalMonth) * 100).toFixed(1) : 0}%</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Kategori</th>
              <th>Tarih</th>
              <th>Tutar</th>
              <th>Notlar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredMonth.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Bu dönemde maliyet yok</td></tr>
            )}
            {filteredMonth.map(c => (
              <tr key={c.id}>
                <td><strong>{c.title}</strong></td>
                <td><span className={`badge ${catColors[c.category] || 'badge-gray'}`}>{c.category}</span></td>
                <td>{format(new Date(c.date + 'T00:00:00'), 'd MMM yyyy', { locale: tr })}</td>
                <td><strong style={{ color: 'var(--danger)' }}>₺{Number(c.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></td>
                <td style={{ fontSize: 13, color: 'var(--text2)' }}>{c.notes || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                    <button className="btn-icon" onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Maliyeti Düzenle' : 'Maliyet Ekle'}</span>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Başlık *</label>
                <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ör. Ambalaj alımı" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tutar (₺) *</label>
                  <input className="form-control" type="number" min={0} step={0.01} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tarih *</label>
                <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ek açıklama..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
