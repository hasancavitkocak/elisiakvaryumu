import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Order, Cost } from '../types'

export default function Reports() {
  const [orders, setOrders] = useState<Order[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('costs').select('*'),
    ]).then(([o, c]) => {
      if (o.data) setOrders(o.data as Order[])
      if (c.data) setCosts(c.data as Cost[])
      setLoading(false)
    })
  }, [])

  // Son 6 ay
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      label: format(d, 'MMM yy', { locale: tr }),
      start: startOfMonth(d).toISOString().split('T')[0],
      end: endOfMonth(d).toISOString().split('T')[0],
    }
  })

  const monthStats = months.map(m => {
    const mOrders = orders.filter(o => o.delivery_date >= m.start && o.delivery_date <= m.end)
    const mCosts = costs.filter(c => c.date >= m.start && c.date <= m.end)
    const revenue = mOrders.reduce((s, o) => s + Number(o.total_price), 0)
    const cost = mCosts.reduce((s, c) => s + Number(c.amount), 0)
    return { ...m, revenue, cost, profit: revenue - cost, count: mOrders.length }
  })

  const maxRevenue = Math.max(...monthStats.map(m => m.revenue), 1)

  // Ürün bazlı satış
  const productSales: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    if (!productSales[o.product_name]) productSales[o.product_name] = { count: 0, revenue: 0 }
    productSales[o.product_name].count += o.quantity
    productSales[o.product_name].revenue += Number(o.total_price)
  })
  const topProducts = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8)

  // Durum dağılımı
  const statusCounts = {
    'bekliyor': orders.filter(o => o.status === 'bekliyor').length,
    'hazırlanıyor': orders.filter(o => o.status === 'hazırlanıyor').length,
    'hazır': orders.filter(o => o.status === 'hazır').length,
    'teslim edildi': orders.filter(o => o.status === 'teslim edildi').length,
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0)
  const totalCosts = costs.reduce((s, c) => s + Number(c.amount), 0)

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Yükleniyor...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Raporlar</h2>
          <p>Genel performans ve analiz</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Toplam Gelir</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>₺{totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam Maliyet</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>₺{totalCosts.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Kar</div>
          <div className="stat-value" style={{ color: (totalRevenue - totalCosts) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ₺{(totalRevenue - totalCosts).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Toplam Sipariş</div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-sub">Ort. ₺{orders.length ? (totalRevenue / orders.length).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0'} / sipariş</div>
        </div>
      </div>

      {/* Aylık grafik */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 20 }}>Aylık Gelir / Maliyet (Son 6 Ay)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 180, paddingBottom: 8 }}>
          {monthStats.map(m => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 140 }}>
                <div
                  style={{
                    flex: 1,
                    background: 'var(--accent)',
                    borderRadius: '4px 4px 0 0',
                    height: `${(m.revenue / maxRevenue) * 100}%`,
                    minHeight: m.revenue > 0 ? 4 : 0,
                    transition: 'height 0.3s',
                  }}
                  title={`Gelir: ₺${m.revenue.toFixed(2)}`}
                />
                <div
                  style={{
                    flex: 1,
                    background: '#ff3b3055',
                    borderRadius: '4px 4px 0 0',
                    height: `${(m.cost / maxRevenue) * 100}%`,
                    minHeight: m.cost > 0 ? 4 : 0,
                    transition: 'height 0.3s',
                  }}
                  title={`Maliyet: ₺${m.cost.toFixed(2)}`}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>{m.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{m.count} sipariş</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <span style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: 2, display: 'inline-block' }} />Gelir
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <span style={{ width: 12, height: 12, background: '#ff3b3055', borderRadius: 2, display: 'inline-block' }} />Maliyet
          </span>
        </div>
      </div>

      <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top ürünler */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>En Çok Satan Ürünler</div>
          {topProducts.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Henüz veri yok</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topProducts.map(([name, stats]) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{stats.count} adet · ₺{stats.revenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      background: 'var(--accent)',
                      borderRadius: 2,
                      width: `${(stats.revenue / (topProducts[0][1].revenue || 1)) * 100}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Durum dağılımı */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Sipariş Durumları</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const colors: Record<string, string> = {
                'bekliyor': '#ff9f0a',
                'hazırlanıyor': 'var(--accent)',
                'hazır': 'var(--success)',
                'teslim edildi': 'var(--text2)',
              }
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{status}</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{count} sipariş</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      background: colors[status],
                      borderRadius: 2,
                      width: `${orders.length > 0 ? (count / orders.length) * 100 : 0}%`,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Aylık detay tablosu */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Aylık Özet Tablo</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ay</th>
                <th>Sipariş</th>
                <th>Gelir</th>
                <th>Maliyet</th>
                <th>Net Kar</th>
                <th>Kar Marjı</th>
              </tr>
            </thead>
            <tbody>
              {[...monthStats].reverse().map(m => (
                <tr key={m.label}>
                  <td><strong>{m.label}</strong></td>
                  <td>{m.count}</td>
                  <td style={{ color: 'var(--success)' }}>₺{m.revenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ color: 'var(--danger)' }}>₺{m.cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ color: m.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    ₺{m.profit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>{m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
