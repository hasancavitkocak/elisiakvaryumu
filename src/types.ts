export interface Product {
  id: string
  name: string
  unit_price: number
  bulk_threshold: number | null   // kaç adetten itibaren toplu fiyat (ör. 200)
  bulk_price: number | null       // toplu fiyat (null = kademesiz)
  description: string
  image_url: string
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  design_name: string
  design_text: string
  created_at: string
}

export interface Order {
  id: string
  customer_name: string
  phone: string
  instagram_username: string
  shipping_fee: number
  // Geriye dönük uyumluluk (eski tek-ürün alanları)
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  design_name: string
  design_text: string
  delivery_date: string
  notes: string
  total_price: number
  status: 'bekliyor' | 'hazırlanıyor' | 'hazır' | 'kargoya verildi' | 'teslim edildi' | 'iptal'
  created_at: string
  // İlişkili ürün satırları (join ile gelir)
  order_items?: OrderItem[]
}

export interface Ingredient {
  id: string
  name: string
  purchase_price: number
  purchase_quantity: number
  unit: string
  notes: string
  created_at: string
  // hesaplanmış
  cost_per_unit?: number
}

export interface ProductIngredient {
  id: string
  product_id: string
  ingredient_id: string
  usage_per_unit: number
  created_at: string
  ingredient?: Ingredient
}

export interface Cost {
  id: string
  title: string
  amount: number
  category: string
  date: string
  notes: string
  created_at: string
}

export type ToastType = 'success' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
}
