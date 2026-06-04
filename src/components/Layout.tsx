import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ShoppingBag, Package, TrendingDown, BarChart2, Menu, X, Fish, FlaskConical } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Genel Bakış', icon: BarChart2 },
  { to: '/orders', label: 'Siparişler', icon: ShoppingBag },
  { to: '/products', label: 'Ürünler', icon: Package },
  { to: '/ingredients', label: 'Hammaddeler', icon: FlaskConical },
  { to: '/costs', label: 'Giderler', icon: TrendingDown },
  { to: '/reports', label: 'Raporlar', icon: BarChart2 },
]

const pageTitles: Record<string, string> = {
  '/': 'Genel Bakış',
  '/orders': 'Siparişler',
  '/products': 'Ürünler',
  '/ingredients': 'Hammaddeler',
  '/costs': 'Giderler',
  '/reports': 'Raporlar',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Elişi Akvaryumu'

  return (
    <div className="app">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Fish size={20} color="var(--accent)" />
            <h1>Elişi Akvaryumu</h1>
          </div>
          <span>Sipariş Yönetimi</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="topbar-title">{title}</span>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
