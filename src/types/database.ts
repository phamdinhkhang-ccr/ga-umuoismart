export type OrderStatus = 
  | 'RECEIVED'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'PAID'
  | 'CANCELLED';

export type VoucherDiscountType = 'fixed' | 'percent';

export interface Branch {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  created_at?: string;
  manager?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'OVERLOADED';
  coverage_zones?: string[];
  capacity_per_hour?: number;
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
  orders_pending?: number;
  orders_total_today?: number;
  revenue_today?: number;
  main_stock?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  is_available: boolean;
  created_at?: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  min_order_value?: number;
  created_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_code: string;
  code?: string;
  customer_name: string;
  customerName?: string;
  customer_phone: string;
  phone?: string;
  shipping_address: string;
  address?: string;
  district: string;
  city: string;
  branch_id: string;
  branchName?: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  final_amount: number;
  totalAmount?: number;
  estimated_profit: number;
  voucher_code?: string | null;
  note?: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at?: string;
  branch?: Branch;
}

export interface AIParseOrderInput {
  raw_text: string;
}

export interface AIParseOrderOutput {
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  district: string;
  city: string;
  items: {
    item_name: string;
    quantity: number;
    note?: string;
  }[];
  voucher_code?: string;
  note?: string;
}
