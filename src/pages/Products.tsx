import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, Package, Upload, ImageIcon } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import type { Product, ProductIngredient, Ingredient } from '../types'

const emptyForm = {
  name: '',
  unit_price: 0,
  bulk_threshold: 200 as number | null,
  bulk_price: null as number | null,
  description: '',
  image_url: '',
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [piForm, setPiForm] = useState({ ingredient_id: '', usage_per_unit: 1 })
  const fileRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data as Product[])
    setLoading(false)
  }

  const fetchIngredients = async () => {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setAllIngredients(data as Ingredient[])
  }

  useEffect(() => { fetchProducts(); fetchIngredients() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setImagePreview('')
    setProductIngredients([])
    setShowModal(true)
  }

  const openEdit = async (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      unit_price: p.unit_price,
      bulk_threshold: p.bulk_threshold ?? 200,
      bulk_price: p.bulk_price ?? null,
      description: p.description,
      image_url: p.image_url || '',
    })
    setImagePreview(p.image_url || '')
    // ürünün hammaddelerini çek
    const { data } = await supabase
      .from('product_ingredients')
      .select('*, ingredient:ingredients(*)')
      .eq('product_id', p.id)
    if (data) setProductIngredients(data as ProductIngredient[])
    setShowModal(true)
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (error) { showToast('Görsel yüklenemedi: ' + error.message, 'error'); setUploading(false); return }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: data.publicUrl }))
    setImagePreview(data.publicUrl)
    setUploading(false)
    showToast('Görsel yüklendi')
  }

  const handleSave = async () => {
    if (!form.name) { showToast('Ürün adı zorunludur.', 'error'); return }
    setSaving(true)
    let productId = editing?.id
    if (editing) {
      const { error } = await supabase.from('products').update(form).eq('id', editing.id)
      if (error) { showToast('Hata: ' + error.message, 'error'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('products').insert(form).select().single()
      if (error) { showToast('Hata: ' + error.message, 'error'); setSaving(false); return }
      productId = data.id
    }
    setSaving(false)
    showToast(editing ? 'Ürün güncellendi' : 'Ürün eklendi')
    setShowModal(false)
    fetchProducts()
    void productId
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { showToast('Silinemedi: ' + error.message, 'error'); return }
    showToast('Ürün silindi')
    fetchProducts()
  }

  const addIngredient = async () => {
    if (!piForm.ingredient_id || !editing) return
    const { error } = await supabase.from('product_ingredients').insert({
      product_id: editing.id,
      ingredient_id: piForm.ingredient_id,
      usage_per_unit: piForm.usage_per_unit,
    })
    if (error) { showToast('Eklenemedi: ' + error.message, 'error'); return }
    const { data } = await supabase
      .from('product_ingredients')
      .select('*, ingredient:ingredients(*)')
      .eq('product_id', editing.id)
    if (data) setProductIngredients(data as ProductIngredient[])
    setPiForm({ ingredient_id: '', usage_per_unit: 1 })
    showToast('Hammadde eklendi')
  }

  const removeIngredient = async (id: string) => {
    await supabase.from('product_ingredients').delete().eq('id', id)
    setProductIngredients(prev => prev.filter(p => p.id !== id))
  }

  // Ürün başına maliyet hesabı
  const calcCost = (pis: ProductIngredient[]) => {
    return pis.reduce((sum, pi) => {
      const ing = pi.ingredient as Ingredient
      if (!ing) return sum
      const costPerUnit = ing.purchase_price / ing.purchase_quantity
      return sum + costPerUnit * pi.usage_per_unit
    }, 0)
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Ürünler</h2>
          <p>Fiyat listesi, görsel ve hammadde yönetimi</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />Yeni Ürün</button>
      </div>

      {products.length === 0 ? (
        <div className="card empty">
          <Package size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>Henüz ürün eklenmemiş</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}><Plus size={16} />İlk Ürünü Ekle</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 160, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={40} color="var(--border)" />
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                  ₺{Number(p.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                {p.bulk_price != null && (
                  <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 4, fontWeight: 600 }}>
                    {p.bulk_threshold}+ adet: ₺{Number(p.bulk_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                )}
                {p.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{p.description}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}><Pencil size={13} />Düzenle</button>
                  <button className="btn-icon" onClick={() => handleDelete(p.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Ürünü Düzenle' : 'Yeni Ürün'}</span>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">

              {/* Görsel yükleme */}
              <div className="form-group">
                <label className="form-label">Ürün Görseli</label>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--surface2)',
                    minHeight: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    position: 'relative',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="önizleme" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>Değiştirmek için tıkla</span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} color="var(--text2)" />
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{uploading ? 'Yükleniyor...' : 'Görsel yüklemek için tıkla'}</span>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>JPG, PNG, WEBP</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ürün Adı *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ör. Kolonya" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Satış Fiyatı (₺) *</label>
                  <input className="form-control" type="number" min={0} step={0.01} value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ürün açıklaması" />
                </div>
              </div>

              {/* Toplu fiyat kademesi */}
              <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Toplu Sipariş Fiyatı (opsiyonel)</div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Eşik Adet (bu adetten itibaren)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      placeholder="ör. 200"
                      value={form.bulk_threshold ?? ''}
                      onChange={e => setForm(f => ({ ...f, bulk_threshold: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Toplu Fiyat (₺/adet)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Boş = kademesiz"
                      value={form.bulk_price ?? ''}
                      onChange={e => setForm(f => ({ ...f, bulk_price: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                </div>
                {form.bulk_price != null && form.bulk_threshold != null && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
                    {form.bulk_threshold} adet ve üstü siparişlerde ₺{Number(form.bulk_price).toFixed(2)}/adet uygulanır
                  </div>
                )}
              </div>

              {editing && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    Hammadde Bileşenleri
                    {productIngredients.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>
                        Birim maliyet: ₺{calcCost(productIngredients).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {productIngredients.map(pi => {
                    const ing = pi.ingredient as Ingredient
                    const costPer = ing ? (ing.purchase_price / ing.purchase_quantity) * pi.usage_per_unit : 0
                    return (
                      <div key={pi.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{ing?.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>
                            {pi.usage_per_unit} {ing?.unit} kullanım · ₺{costPer.toFixed(2)} maliyet
                          </span>
                        </div>
                        <button className="btn-icon" onClick={() => removeIngredient(pi.id)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <select
                      className="form-control"
                      style={{ flex: 2 }}
                      value={piForm.ingredient_id}
                      onChange={e => setPiForm(f => ({ ...f, ingredient_id: e.target.value }))}
                    >
                      <option value="">Hammadde seç...</option>
                      {allIngredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input
                      className="form-control"
                      style={{ flex: 1, maxWidth: 100 }}
                      type="number"
                      min={0}
                      step={0.001}
                      placeholder="Miktar"
                      value={piForm.usage_per_unit}
                      onChange={e => setPiForm(f => ({ ...f, usage_per_unit: Number(e.target.value) }))}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={addIngredient}><Plus size={14} />Ekle</button>
                  </div>
                </div>
              )}
              {!editing && (
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Ürünü kaydettikten sonra hammadde ekleyebilirsiniz.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
                {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
