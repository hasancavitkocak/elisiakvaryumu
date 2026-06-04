import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aaavmwmwczuyuuarhzrv.supabase.co'
const supabaseKey = 'sb_publishable_BaQdJr7P_tNSEvBumVSTzQ_dJi0fuvG'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  orders: {
    id: string
    customer_name: string
    phone: string
    product_id: string
    quantity: number
    design_name: string
    design_text: string
    delivery_date: string
    notes: string
    total_price: number
    status: 'bekliyor' | 'hazırlanıyor' | 'tamamlandı' | 'teslim edildi'
    created_at: string
  }
  products: {
    id: string
    name: string
    unit_price: number
    description: string
    created_at: string
  }
  costs: {
    id: string
    title: string
    amount: number
    category: string
    date: string
    notes: string
    created_at: string
  }
}
