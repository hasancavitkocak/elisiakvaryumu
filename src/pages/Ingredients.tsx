import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, FlaskConical } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import type { Ingredient } from '../types'

const UNITS = ['adet', 'gram', 'kg', 'ml', 'litre', 'metre', 'paket', 'kutu', 'rulo']

const emptyForm = {
  name: '',
  purchase_price: 0,
  purchase_quantity: 1,
  unit: 'adet',
  notes: '',
}

export default function Ingredients() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const fetch = async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setItems(data as Ingredient[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (i: Ingredient) => {
    setEditing(i)
    setForm({ name: i.name, purchase_price: i.purchase_price, purchase_quantity: i.purchase_quantity, unit: i.unit, notes: i.notes })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name) { showToast('Hammadde adı zorunludur.', 'error'); return }
    if (form.purchase_quantity <= 0) { showToast('Miktar 0\'dan büyük olmalıdır.', 'error'); return }
    setSaving(true)
    let error
    if (editing) {
      const { error: e } = await supabase.from('ingredients').update(form).eq('id', editing.id)
      error = e
    } else {
      const { error: e } = await supabase.from('ingredients').insert(form)
      error = e
    }
    setSaving(false)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast(editing ? 'Hammadde güncellendi' : 'Hammadde eklendi')
    setShowModal(false)
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hammaddeyi silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) { showToast('Silinemedi: ' + error.message, 'error'); return }
    showToast('Hammadde silindi')
    fetch()
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Hammaddeler</h2>
          <p>Alış fiyatları ve birim maliyet hesaplama</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Hammadde Ekle</button>
      </div>

      {items.length === 0 ? (
        <div className="card empty">
          <FlaskConical size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>Henüz hammadde eklenmemiş</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}><Plus size={16} />İlk Hammaddeyi Ekle</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hammadde Adı</th>
                <th>Alış Fiyatı</th>
                <th>Alış Miktarı</th>
                <th>Birim Maliyet</th>
                <th>Notlar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const costPerUnit = i.purchase_quantity > 0 ? i.purchase_price / i.purchase_quantity : 0
                return (
                  <tr key={i.id}>
                    <td><strong>{i.name}</strong></td>
                    <td>₺{Number(i.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    <td>{i.purchase_quantity} {i.unit}</td>
                    <td>
                      <strong style={{ color: 'var(--accent)' }}>
                        ₺{costPerUnit.toLocaleString('tr-TR', { minimumFractionDigits: 4 })} / {i.unit}
                      </strong>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text2)' }}>{i.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(i)}><Pencil size={14} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(i.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Hammaddeyi Düzenle' : 'Hammadde Ekle'}</span>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Hammadde Adı *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ör. Jelatin, Kolonya şişesi, Etiket..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Alış Fiyatı (₺) *</label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.purchase_price}
                    onChange={e => setForm(f => ({ ...f, purchase_price: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Alış Miktarı *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="form-control"
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={form.purchase_quantity}
                      onChange={e => setForm(f => ({ ...f, purchase_quantity: Number(e.target.value) }))}
                    />
                    <select
                      className="form-control"
                      style={{ width: 90 }}
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Birim maliyet önizlemesi */}
              {form.purchase_price > 0 && form.purchase_quantity > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  Birim maliyet:{' '}
                  <strong style={{ color: 'var(--accent)' }}>
                    ₺{(form.purchase_price / form.purchase_quantity).toFixed(4)} / {form.unit}
                  </strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea
                  className="form-control"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Tedarikçi, marka vs."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
