import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderForm from './pages/OrderForm'
import Products from './pages/Products'
import Ingredients from './pages/Ingredients'
import Costs from './pages/Costs'
import Reports from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/new" element={<OrderForm />} />
            <Route path="/orders/:id/edit" element={<OrderForm />} />
            <Route path="/products" element={<Products />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/costs" element={<Costs />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
