import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, CheckCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Order, Cost } from '../types'

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('costs').select('*'),
    ]).then(([o, c]) => {
      if (o.data) setOrders(o.data as Order[])
      if (c.data) setCosts(c.data as Cost[])
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString().split('T')[0]
  const monthEnd = endOfMonth(now).toISOString().split('T')[0]

  const monthOrders = orders.filter(o => o.delivery_date >= monthStart && o.delivery_date <= monthEnd)
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0)
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total_price), 0)
  const monthCosts = costs.filter(c => c.date >= monthStart && c.date <= monthEnd).reduce((s, c) => s + Number(c.amount), 0)
  const pending = orders.filter(o => ['bekliyor', 'hazırlanıyor', 'hazır', 'kargoya verildi'].includes(o.status)).length
  const completed = orders.filter(o => o.status === 'teslim edildi').length

  const upcoming = orders
    .filter(o => o.delivery_date >= now.toISOString().split('T')[0] && o.status !== 'teslim edildi' && o.status !== 'iptal')
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
    .slice(0, 5)

  const statusBadge = (s: Order['status']) => {
    const map: Record<string, string> = {
      'bekliyor': 'badge-yellow',
      'hazırlanıyor': 'badge-blue',
      'hazır': 'badge-purple',
      'kargoya verildi': 'badge-yellow',
      'teslim edildi': 'badge-green',
      'iptal': 'badge-red',
    }
    return map[s] || 'badge-gray'
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Genel Bakış</h2>
          <p>{format(now, 'MMMM yyyy', { locale: tr })}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Toplam Sipariş</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{orders.length}</div>
          <div className="stat-sub">{monthOrders.length} bu ay</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bu Ay Gelir</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>₺{monthRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div className="stat-sub">Toplam: ₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bu Ay Maliyet</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>₺{monthCosts.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          <div className="stat-sub">Net: ₺{(monthRevenue - monthCosts).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bekleyen / Tamamlanan</div>
          <div className="stat-value">{pending} <span style={{ fontSize: 16, color: 'var(--text2)', fontWeight: 400 }}>/ {completed}</span></div>
          <div className="stat-sub">aktif sipariş</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={18} color="var(--text2)" />
          <span style={{ fontWeight: 600 }}>Yaklaşan Teslimler</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty">
            <CheckCircle style={{ margin: '0 auto 8px', display: 'block' }} size={40} />
            <p>Yaklaşan teslimat yok</p>
          </div>
        ) : (
          <>
            {/* Masaüstü tablo */}
            <div className="dashboard-table">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Müşteri</th>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Teslim Tarihi</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.customer_name}</strong><br /><span style={{ fontSize: 12, color: 'var(--text2)' }}>{o.phone}</span></td>
                        <td>{o.product_name}</td>
                        <td>{o.order_items && o.order_items.length > 0
                          ? o.order_items.reduce((s, i) => s + Number(i.quantity), 0)
                          : o.quantity}
                        </td>
                        <td>{format(new Date(o.delivery_date + 'T00:00:00'), 'd MMM yyyy', { locale: tr })}</td>
                        <td>₺{Number(o.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td><span className={`badge ${statusBadge(o.status)}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobil kartlar */}
            <div className="dashboard-cards">
              {upcoming.map(o => (
                <div key={o.id} className="order-card">
                  <div className="order-card-row">
                    <strong style={{ fontSize: 14 }}>{o.customer_name}</strong>
                    <span className={`badge ${statusBadge(o.status)}`}>{o.status}</span>
                  </div>
                  {o.phone && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{o.phone}</span>}
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {o.product_name} · {o.order_items && o.order_items.length > 0
                      ? o.order_items.reduce((s, i) => s + Number(i.quantity), 0)
                      : o.quantity} adet
                  </div>
                  <div className="order-card-row">
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {format(new Date(o.delivery_date + 'T00:00:00'), 'd MMM yyyy', { locale: tr })}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      ₺{Number(o.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
