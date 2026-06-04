import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, ArrowLeft, Truck } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import type { Order, Product } from '../types'

const STATUSES: Order['status'][] = ['bekliyor', 'hazırlanıyor', 'hazır', 'kargoya verildi', 'teslim edildi', 'iptal']

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'bekliyor':        { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'hazırlanıyor':    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'hazır':           { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'kargoya verildi': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'teslim edildi':   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'iptal':           { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

interface ItemRow {
  id?: string
  product_id: string
  product_name: string
  quantity: string
  unit_price: string
  total_price: string
  design_name: string
  design_text: string
}

const emptyItem = (): ItemRow => ({
  product_id: '', product_name: '', quantity: '1',
  unit_price: '0', total_price: '0', design_name: '', design_text: '',
})

const emptyForm = {
  customer_name: '', phone: '', instagram_username: '',
  delivery_date: '', notes: '',
  status: 'bekliyor' as Order['status'],
  shipping_fee: '',
}

export default function OrderForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(emptyForm)
  const [items, setItems] = useState<ItemRow[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    supabase.from('products').select('*').order('name').then(({ data }) => {
      if (data) setProducts(data as Product[])
    })
    if (isEdit && id) {
      supabase.from('orders').select('*, order_items(*)').eq('id', id).single().then(({ data }) => {
        if (!data) { navigate('/orders'); return }
        const o = data as Order
        setForm({
          customer_name: o.customer_name,
          phone: o.phone,
          instagram_username: o.instagram_username ?? '',
          delivery_date: o.delivery_date,
          notes: o.notes,
          status: o.status,
          shipping_fee: o.shipping_fee > 0 ? String(o.shipping_fee) : '',
        })
        const its = o.order_items && o.order_items.length > 0
          ? o.order_items.map(i => ({
              id: i.id, product_id: i.product_id ?? '', product_name: i.product_name,
              quantity: String(i.quantity), unit_price: String(i.unit_price),
              total_price: String(i.total_price), design_name: i.design_name, design_text: i.design_text,
            }))
          : [{ product_id: o.product_id ?? '', product_name: o.product_name,
              quantity: String(o.quantity), unit_price: String(o.unit_price),
              total_price: String(o.total_price), design_name: o.design_name, design_text: o.design_text }]
        setItems(its)
        setLoading(false)
      })
    }
  }, [id, isEdit, navigate])

  const handleItemProduct = (idx: number, pid: string) => {
    const p = products.find(x => x.id === pid)
    if (!p) return
    const qty = parseFloat(items[idx].quantity) || 1
    const price = (p.bulk_price != null && p.bulk_threshold != null && qty >= p.bulk_threshold) ? p.bulk_price : p.unit_price
    updateItem(idx, { product_id: pid, product_name: p.name, unit_price: String(price), total_price: String(price * qty) })
  }

  const handleItemQty = (idx: number, val: string) => {
    const qty = parseFloat(val) || 0
    const row = items[idx]
    const p = products.find(x => x.id === row.product_id)
    let price = parseFloat(row.unit_price) || 0
    if (p) price = (p.bulk_price != null && p.bulk_threshold != null && qty >= p.bulk_threshold) ? p.bulk_price : p.unit_price
    updateItem(idx, { quantity: val, unit_price: String(price), total_price: String(price * qty) })
  }

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setItems(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx: number) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)) }

  const itemsTotal = items.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
  const shippingFee = parseFloat(form.shipping_fee) || 0
  const grandTotal = itemsTotal + shippingFee

  const handleSave = async () => {
    if (!form.customer_name || !form.delivery_date) {
      showToast('Müşteri adı ve teslim tarihi zorunludur.', 'error'); return
    }
    if (items.some(r => !r.product_name)) {
      showToast('Tüm ürün satırlarına ürün adı girilmelidir.', 'error'); return
    }
    setSaving(true)
    const first = items[0]
    const orderPayload = {
      customer_name: form.customer_name,
      phone: form.phone,
      instagram_username: form.instagram_username,
      delivery_date: form.delivery_date,
      notes: form.notes,
      status: form.status,
      shipping_fee: shippingFee,
      product_id: first.product_id || null,
      product_name: first.product_name,
      quantity: parseFloat(first.quantity) || 0,
      unit_price: parseFloat(first.unit_price) || 0,
      total_price: grandTotal,
      design_name: first.design_name,
      design_text: first.design_text,
    }
    let orderId = id
    if (isEdit && id) {
      const { error } = await supabase.from('orders').update(orderPayload).eq('id', id)
      if (error) { showToast('Hata: ' + error.message, 'error'); setSaving(false); return }
      await supabase.from('order_items').delete().eq('order_id', id)
    } else {
      const { data, error } = await supabase.from('orders').insert(orderPayload).select().single()
      if (error) { showToast('Hata: ' + error.message, 'error'); setSaving(false); return }
      orderId = data.id
    }
    const itemPayloads = items.map(r => ({
      order_id: orderId,
      product_id: r.product_id || null, product_name: r.product_name,
      quantity: parseFloat(r.quantity) || 0, unit_price: parseFloat(r.unit_price) || 0,
      total_price: parseFloat(r.total_price) || 0,
      design_name: r.design_name, design_text: r.design_text,
    }))
    const { error: itemErr } = await supabase.from('order_items').insert(itemPayloads)
    if (itemErr) { showToast('Ürün satırları kaydedilemedi: ' + itemErr.message, 'error'); setSaving(false); return }
    setSaving(false)
    showToast(isEdit ? 'Sipariş güncellendi' : 'Sipariş eklendi')
    navigate('/orders')
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Başlık */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={() => navigate('/orders')} style={{ color: 'var(--text2)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2>{isEdit ? 'Siparişi Düzenle' : 'Yeni Sipariş'}</h2>
            <p>{isEdit ? 'Sipariş bilgilerini güncelle' : 'Yeni sipariş oluştur'}</p>
          </div>
        </div>
      </div>

      {/* ── Müşteri Bilgileri ── */}
      <div className="form-section-card">
        <div className="form-section-title">Müşteri Bilgileri</div>
        <div className="form-group">
          <label className="form-label">Ad Soyad *</label>
          <input className="form-control" value={form.customer_name}
            onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
            placeholder="Ad Soyad" />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Telefon</label>
            <input className="form-control" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0555 555 55 55" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Instagram</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#e1306c', fontSize: 14, fontWeight: 600, pointerEvents: 'none',
              }}>@</span>
              <input className="form-control" style={{ paddingLeft: 28 }}
                value={form.instagram_username}
                onChange={e => setForm(f => ({ ...f, instagram_username: e.target.value.replace('@', '') }))}
                placeholder="kullaniciadi" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Ürünler ── */}
      <div className="form-section-card">
        <div className="form-section-title">Ürünler</div>

        {items.map((row, idx) => (
          <div key={idx} style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 14px 10px',
            marginBottom: 10,
          }}>
            {/* Başlık + sil */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Ürün {idx + 1}
              </span>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--danger)', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
                  borderRadius: 6,
                }}>
                  <Trash2 size={13} />Kaldır
                </button>
              )}
            </div>

            {/* Listeden seç */}
            <div className="form-group">
              <label className="form-label">Listeden Seç</label>
              <select className="form-control" value={row.product_id} onChange={e => handleItemProduct(idx, e.target.value)}>
                <option value="">Ürün seç...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₺{Number(p.unit_price).toFixed(2)}
                    {p.bulk_price != null && p.bulk_threshold != null
                      ? ` (${p.bulk_threshold}+ adet: ₺${Number(p.bulk_price).toFixed(2)})`
                      : ''}
                  </option>
                ))}
              </select>
              {/* Seçili ürün görseli */}
              {row.product_id && (() => {
                const p = products.find(x => x.id === row.product_id)
                return p?.image_url ? (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{p.name}</span>
                  </div>
                ) : null
              })()}
            </div>

            {/* Ürün adı */}
            <div className="form-group">
              <label className="form-label">Ürün Adı *</label>
              <input className="form-control" value={row.product_name}
                onChange={e => updateItem(idx, { product_name: e.target.value })}
                placeholder="Ürün adı" />
            </div>

            {/* Adet / birim / toplam */}
            <div className="form-row-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Adet</label>
                <input className="form-control" type="number" min={1} value={row.quantity}
                  onChange={e => handleItemQty(idx, e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Birim (₺)</label>
                <input className="form-control" type="number" min={0} step={0.01} value={row.unit_price}
                  onChange={e => {
                    const val = e.target.value
                    const p = parseFloat(val) || 0
                    const qty = parseFloat(row.quantity) || 0
                    updateItem(idx, { unit_price: val, total_price: String(p * qty) })
                  }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Toplam (₺)</label>
                <input className="form-control" type="number" min={0} step={0.01} value={row.total_price}
                  onChange={e => updateItem(idx, { total_price: e.target.value })} />
              </div>
            </div>

            {/* Toplu fiyat bildirimi */}
            {(() => {
              const p = products.find(x => x.id === row.product_id)
              const qty = parseFloat(row.quantity) || 0
              if (p?.bulk_price != null && p.bulk_threshold != null && qty >= p.bulk_threshold) {
                return (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                    Toplu fiyat uygulandı ({p.bulk_threshold}+ adet)
                  </div>
                )
              }
              return null
            })()}

            {/* Tasarım */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tasarım Adı</label>
                  <input className="form-control" value={row.design_name}
                    onChange={e => updateItem(idx, { design_name: e.target.value })}
                    placeholder="ör. Vintage Gül" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tasarımda Yazacak</label>
                  <input className="form-control" value={row.design_text}
                    onChange={e => updateItem(idx, { design_text: e.target.value })}
                    placeholder="ör. Ayşe & Mehmet" />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button className="btn btn-secondary btn-sm" onClick={addItem} style={{ width: '100%', justifyContent: 'center' }}>
          <Plus size={14} />Ürün Ekle
        </button>
      </div>

      {/* ── Kargo ── */}
      <div className="form-section-card">
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Truck size={15} />Kargo
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Kargo Ücreti (₺)</label>
          <input className="form-control" type="number" min={0} step={0.01}
            value={form.shipping_fee}
            onChange={e => setForm(f => ({ ...f, shipping_fee: e.target.value }))}
            placeholder="0.00 — boş bırakılabilir" />
        </div>
      </div>

      {/* ── Sipariş Bilgileri ── */}
      <div className="form-section-card">
        <div className="form-section-title">Sipariş Bilgileri</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Teslim Tarihi *</label>
            <input className="form-control" type="date" value={form.delivery_date}
              onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Durum</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {STATUSES.map(s => {
                const st = STATUS_STYLE[s]
                const active = form.status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      border: `1.5px solid ${active ? st.border : 'var(--border)'}`,
                      background: active ? st.bg : 'var(--surface)',
                      color: active ? st.color : 'var(--text2)',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Notlar</label>
          <textarea className="form-control" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Özel istekler, notlar..." />
        </div>
      </div>

      {/* ── Özet + Kaydet ── */}
      <div className="form-section-card" style={{ position: 'sticky', bottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14 }}>
            <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 2 }}>
              {items.length > 1 || shippingFee > 0
                ? `Ürünler: ₺${itemsTotal.toFixed(2)}${shippingFee > 0 ? ` + Kargo: ₺${shippingFee.toFixed(2)}` : ''}`
                : ''}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              Toplam: <span style={{ color: 'var(--accent)' }}>
                ₺{grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/orders')}>İptal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 110 }}>
              {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
