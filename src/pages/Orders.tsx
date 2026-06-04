import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Search, Pencil, Trash2, Eye, Calendar, Phone, Package, AtSign } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useToast } from '../context/ToastContext'
import type { Order, OrderItem, Product } from '../types'
import OrderDetailModal from '../components/OrderDetailModal.tsx'

const STATUSES: Order['status'][] = ['bekliyor', 'hazırlanıyor', 'hazır', 'kargoya verildi', 'teslim edildi', 'iptal']

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'bekliyor':        { bg: '#fffbeb', color: '#b45309' },
  'hazırlanıyor':    { bg: '#eff6ff', color: '#1d4ed8' },
  'hazır':           { bg: '#f5f3ff', color: '#6d28d9' },
  'kargoya verildi': { bg: '#fff7ed', color: '#c2410c' },
  'teslim edildi':   { bg: '#f0fdf4', color: '#15803d' },
  'iptal':           { bg: '#fef2f2', color: '#b91c1c' },
}

export function StatusBadge({ status }: { status: Order['status'] }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f4f4f6', color: '#71717a' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showDetail, setShowDetail] = useState<Order | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchAll = async () => {
    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('delivery_date', { ascending: true }),
      supabase.from('products').select('*'),
    ])
    if (ordersRes.data) setOrders(ordersRes.data as Order[])
    if (productsRes.data) setProducts(productsRes.data as Product[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) { showToast('Silinemedi: ' + error.message, 'error'); return }
    showToast('Sipariş silindi')
    fetchAll()
  }

  const handleStatusChange = async (order: Order, status: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
    if (error) { showToast('Durum güncellenemedi', 'error'); return }
    showToast('Durum güncellendi')
    setShowDetail(prev => prev?.id === order.id ? { ...prev, status } : prev)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o))
  }

  const getDisplayItems = (o: Order): OrderItem[] => {
    const its = o.order_items ?? []
    if (its.length > 0) return its
    return [{ id: 'legacy', order_id: o.id, product_id: o.product_id, product_name: o.product_name,
      quantity: o.quantity, unit_price: o.unit_price, total_price: o.total_price,
      design_name: o.design_name, design_text: o.design_text, created_at: o.created_at }]
  }

  const orderSummary = (o: Order) => {
    const its = getDisplayItems(o)
    if (its.length === 1) return its[0].product_name
    return `${its[0].product_name} +${its.length - 1} daha`
  }
  const orderQty = (o: Order) => getDisplayItems(o).reduce((s, i) => s + i.quantity, 0)

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || o.customer_name.toLowerCase().includes(q)
      || (o.order_items ?? []).some(i => i.product_name.toLowerCase().includes(q))
      || o.product_name.toLowerCase().includes(q)
      || o.phone.includes(q)
      || (o.instagram_username ?? '').toLowerCase().includes(q)
    return matchSearch && (!statusFilter || o.status === statusFilter)
  })

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Siparişler</h2>
          <p>{orders.length} toplam sipariş</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}>
          <Plus size={15} />Yeni Sipariş
        </button>
      </div>

      {/* Filtreler */}
      <div className="search-bar">
        <div className="search-input">
          <Search size={15} />
          <input className="form-control" placeholder="Müşteri, ürün, telefon veya instagram..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 170 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Masaüstü tablo */}
      <div className="table-desktop">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Ürünler</th>
                <th>Adet</th>
                <th>Teslim</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th style={{ width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Sipariş bulunamadı</td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{o.customer_name}</div>
                    {o.phone && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{o.phone}</div>}
                    {o.instagram_username && (
                      <div style={{ fontSize: 12, color: '#e1306c', marginTop: 1 }}>@{o.instagram_username}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{orderSummary(o)}</div>
                    {getDisplayItems(o).length > 1 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{getDisplayItems(o).length} kalem</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{orderQty(o)}</td>
                  <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {format(new Date(o.delivery_date + 'T00:00:00'), 'd MMM yy', { locale: tr })}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      ₺{Number(o.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                    {Number(o.shipping_fee) > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        +₺{Number(o.shipping_fee).toFixed(2)} kargo
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <StatusBadge status={o.status} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => setShowDetail(o)} title="Detay"><Eye size={14} /></button>
                      <button className="btn-icon" onClick={() => navigate(`/orders/${o.id}/edit`)} title="Düzenle"><Pencil size={14} /></button>
                      <button className="btn-icon" onClick={() => handleDelete(o.id)} title="Sil" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobil kart listesi */}
      <div className="cards-mobile">
        {filtered.length === 0 && (
          <div className="card empty"><p>Sipariş bulunamadı</p></div>
        )}
        {filtered.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-card-row">
              <div style={{ fontWeight: 600, fontSize: 15 }}>{o.customer_name}</div>
              <StatusBadge status={o.status} />
            </div>
            {o.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                <Phone size={12} />{o.phone}
              </div>
            )}
            {o.instagram_username && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#e1306c' }}>
                <AtSign size={12} />@{o.instagram_username}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
              <Package size={12} />{orderSummary(o)} · {orderQty(o)} adet
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
              <Calendar size={12} />{format(new Date(o.delivery_date + 'T00:00:00'), 'd MMMM yyyy', { locale: tr })}
            </div>
            <div className="order-card-row" style={{ marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }}>
                  ₺{Number(o.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                {Number(o.shipping_fee) > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
                    +₺{Number(o.shipping_fee).toFixed(2)} kargo
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-icon" onClick={() => setShowDetail(o)}><Eye size={14} /></button>
                <button className="btn-icon" onClick={() => navigate(`/orders/${o.id}/edit`)}><Pencil size={14} /></button>
                <button className="btn-icon" onClick={() => handleDelete(o.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detay Modalı */}
      {showDetail && (
        <OrderDetailModal
          order={showDetail}
          products={products}
          onClose={() => setShowDetail(null)}
          onEdit={() => { setShowDetail(null); navigate(`/orders/${showDetail.id}/edit`) }}
          onStatusChange={handleStatusChange}
          getDisplayItems={getDisplayItems}
        />
      )}
    </div>
  )
}
