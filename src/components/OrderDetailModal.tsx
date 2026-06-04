import { X, Phone, AtSign, Calendar, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Order, OrderItem, Product } from '../types'
import { StatusBadge } from '../pages/Orders'

const STATUSES: Order['status'][] = ['bekliyor', 'hazırlanıyor', 'hazır', 'kargoya verildi', 'teslim edildi', 'iptal']

interface Props {
  order: Order
  products: Product[]
  onClose: () => void
  onEdit: () => void
  onStatusChange: (order: Order, status: Order['status']) => void
  getDisplayItems: (o: Order) => OrderItem[]
}

export default function OrderDetailModal({ order, products, onClose, onEdit, onStatusChange, getDisplayItems }: Props) {
  const items = getDisplayItems(order)
  const productsTotal = items.reduce((s, i) => s + Number(i.total_price), 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Sipariş Detayı</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">

          {/* Müşteri başlık */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{order.customer_name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {order.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                    <Phone size={12} />{order.phone}
                  </div>
                )}
                {order.instagram_username && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#e1306c' }}>
                    <AtSign size={12} />@{order.instagram_username}
                  </div>
                )}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Tarihler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div className="detail-section">
              <div className="detail-label">Teslim Tarihi</div>
              <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} />
                {format(new Date(order.delivery_date + 'T00:00:00'), 'd MMMM yyyy', { locale: tr })}
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-label">Sipariş Tarihi</div>
              <div className="detail-value">
                {format(new Date(order.created_at), 'd MMMM yyyy', { locale: tr })}
              </div>
            </div>
          </div>

          {/* Ürünler */}
          <div style={{ marginBottom: 14 }}>
            <div className="detail-label" style={{ marginBottom: 8 }}>Ürünler</div>
            {items.map((item, i) => (
              <div key={item.id ?? i} className="detail-section" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  {/* Ürün görseli */}
                  {(() => {
                    const p = products.find(x => x.id === item.product_id)
                    return p?.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }}
                      />
                    ) : null
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.product_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {item.quantity} adet × ₺{Number(item.unit_price).toFixed(2)}
                    </div>
                    {(item.design_name || item.design_text) && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                        {item.design_name && <span style={{ fontWeight: 500 }}>{item.design_name}</span>}
                        {item.design_name && item.design_text && <span> · </span>}
                        {item.design_text && <span style={{ fontStyle: 'italic' }}>"{item.design_text}"</span>}
                      </div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>
                    ₺{Number(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}

            {/* Kargo + toplam */}
            {Number(order.shipping_fee) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Truck size={13} />Kargo</span>
                <span>₺{Number(order.shipping_fee).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', marginTop: 4 }}>
              {Number(order.shipping_fee) > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Ürünler: ₺{productsTotal.toFixed(2)}
                </span>
              )}
              <span style={{ fontWeight: 700, fontSize: 16, marginLeft: 'auto' }}>
                Toplam: <span style={{ color: 'var(--accent)' }}>
                  ₺{Number(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>

          {/* Notlar */}
          {order.notes && (
            <div className="detail-section" style={{ marginBottom: 14 }}>
              <div className="detail-label">Notlar</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{order.notes}</div>
            </div>
          )}

          {/* Durum güncelle */}
          <div>
            <div className="detail-label" style={{ marginBottom: 8 }}>Durumu Güncelle</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(order, s)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: order.status === s ? 'var(--accent)' : 'var(--surface2)',
                    color: order.status === s ? '#fff' : 'var(--text2)',
                    outline: order.status === s ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onEdit}>Düzenle</button>
          <button className="btn btn-primary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
