'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { Branch, MenuItem, Order, OrderItem, OrderStatus, Voucher } from '@/types/database';

const globalMockOrders: Order[] = [
  {
    id: 'mock-1',
    order_code: 'GUM-88A1',
    customer_name: 'Nguyễn Văn Nam',
    customer_phone: '0901234567',
    shipping_address: '123 Lê Lợi, Phường Bến Thành',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    branch_id: 'b1111111-1111-1111-1111-111111111111',
    items: [
      { menu_item_id: 'm1111111-1111-1111-1111-111111111111', item_name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', quantity: 2, unit_price: 190000, cost_price: 110000, subtotal: 380000 },
      { menu_item_id: 'm6666666-6666-6666-6666-666666666666', item_name: 'Trà Tắc Khổng Lồ', quantity: 2, unit_price: 20000, cost_price: 6000, subtotal: 40000 }
    ],
    subtotal: 420000,
    discount_amount: 30000,
    final_amount: 390000,
    estimated_profit: 158000,
    voucher_code: null,
    note: 'Giao trước 12h, cho thêm 2 bịch nước chấm',
    status: 'PAID',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'mock-2',
    order_code: 'GUM-94B2',
    customer_name: 'Anh Tuấn',
    customer_phone: '0988776655',
    shipping_address: '456 Điện Biên Phủ, Phường 3',
    district: 'Quận 3',
    city: 'Hồ Chí Minh',
    branch_id: 'b2222222-2222-2222-2222-222222222222',
    items: [
      { menu_item_id: 'm2222222-2222-2222-2222-222222222222', item_name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', quantity: 1, unit_price: 100000, cost_price: 58000, subtotal: 100000 },
      { menu_item_id: 'm3333333-3333-3333-3333-333333333333', item_name: 'Chân Gà Rút Xương Sốt Thái', quantity: 1, unit_price: 65000, cost_price: 32000, subtotal: 65000 }
    ],
    subtotal: 165000,
    discount_amount: 30000,
    final_amount: 135000,
    estimated_profit: 45000,
    voucher_code: 'CHAO2026',
    note: 'Chân gà làm cay vừa',
    status: 'PAID',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'mock-3',
    order_code: 'GUM-77C3',
    customer_name: 'Chị Mai',
    customer_phone: '0912345678',
    shipping_address: '789 Xô Viết Nghệ Tĩnh',
    district: 'Quận Bình Thạnh',
    city: 'Hồ Chí Minh',
    branch_id: 'b3333333-3333-3333-3333-333333333333',
    items: [
      { menu_item_id: 'm4444444-4444-4444-4444-444444444444', item_name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', quantity: 4, unit_price: 85000, cost_price: 45000, subtotal: 340000 },
      { menu_item_id: 'm7777777-7777-7777-7777-777777777777', item_name: 'Trà Đào Cam Sả', quantity: 4, unit_price: 30000, cost_price: 10000, subtotal: 120000 }
    ],
    subtotal: 460000,
    discount_amount: 30000,
    final_amount: 430000,
    estimated_profit: 210000,
    voucher_code: null,
    note: 'Gọi trước khi giao',
    status: 'SHIPPING',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  }
];

function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GUM-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Strictly typed timeout helper
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number = 300): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
  });
  return Promise.race([fn(), timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'b1111111-1111-1111-1111-111111111111', name: 'Chi Nhánh Gà Ủ Muối Quận 1', address: '123 Lê Lợi', district: 'Quận 1', city: 'Hồ Chí Minh', phone: '02838111111' },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Chi Nhánh Gà Ủ Muối Quận 3', address: '456 Điện Biên Phủ', district: 'Quận 3', city: 'Hồ Chí Minh', phone: '02838222222' },
  { id: 'b3333333-3333-3333-3333-333333333333', name: 'Chi Nhánh Gà Ủ Muối Bình Thạnh', address: '789 Xô Viết Nghệ Tĩnh', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh', phone: '02838333333' },
  { id: 'b4444444-4444-4444-4444-444444444444', name: 'Chi Nhánh Gà Ủ Muối Thủ Đức', address: '102 Võ Văn Ngân', district: 'Thành phố Thủ Đức', city: 'Hồ Chí Minh', phone: '02838444444' }
];

export async function getBranches(): Promise<Branch[]> {
  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (!isRealSupabase) return DEFAULT_BRANCHES;

  try {
    const res: any = await withTimeout(() => supabaseServer.from('branches').select('*').order('name') as any, 300);
    if (res?.data && res.data.length > 0) return res.data as Branch[];
  } catch (e) {}

  return DEFAULT_BRANCHES;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: 'm1111111-1111-1111-1111-111111111111', name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', price: 190000, cost_price: 110000, is_available: true },
  { id: 'm2222222-2222-2222-2222-222222222222', name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', price: 100000, cost_price: 58000, is_available: true },
  { id: 'm3333333-3333-3333-3333-333333333333', name: 'Chân Gà Rút Xương Sốt Thái', price: 65000, cost_price: 32000, is_available: true },
  { id: 'm4444444-4444-4444-4444-444444444444', name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', price: 85000, cost_price: 45000, is_available: true },
  { id: 'm5555555-5555-5555-5555-555555555555', name: 'Nước Chấm Thần Thánh Extra', price: 15000, cost_price: 4000, is_available: true },
  { id: 'm6666666-6666-6666-6666-666666666666', name: 'Trà Tắc Khổng Lồ', price: 20000, cost_price: 6000, is_available: true },
  { id: 'm7777777-7777-7777-7777-777777777777', name: 'Trà Đào Cam Sả', price: 30000, cost_price: 10000, is_available: true }
];

export async function getMenuItems(): Promise<MenuItem[]> {
  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (!isRealSupabase) return DEFAULT_MENU_ITEMS;

  try {
    const res: any = await withTimeout(() => supabaseServer.from('menu_items').select('*').eq('is_available', true) as any, 300);
    if (res?.data && res.data.length > 0) return res.data as MenuItem[];
  } catch (e) {}

  return DEFAULT_MENU_ITEMS;
}

export async function getVoucherByCode(code: string): Promise<Voucher | null> {
  if (!code) return null;
  const codeUpper = code.trim().toUpperCase();
  if (codeUpper === 'CHAO2026') {
    return { id: 'v1', code: 'CHAO2026', discount_type: 'fixed', discount_value: 30000, min_order_value: 100000 };
  }
  if (codeUpper === 'VIP10') {
    return { id: 'v2', code: 'VIP10', discount_type: 'percent', discount_value: 10, min_order_value: 200000 };
  }
  return null;
}

export interface CreateOrderParams {
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  district: string;
  city: string;
  branch_id: string;
  items: {
    menu_item_id: string;
    quantity: number;
  }[];
  voucher_code?: string;
  note?: string;
}

export async function createOrder(params: CreateOrderParams) {
  const menuItems = await getMenuItems();
  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  let subtotal = 0;
  let totalCost = 0;

  const orderItems: OrderItem[] = params.items.map(item => {
    const menuItem = menuItemMap.get(item.menu_item_id);
    const unitPrice = menuItem ? menuItem.price : 0;
    const costPrice = menuItem ? menuItem.cost_price : 0;
    const itemSubtotal = unitPrice * item.quantity;
    
    subtotal += itemSubtotal;
    totalCost += costPrice * item.quantity;

    return {
      menu_item_id: item.menu_item_id,
      item_name: menuItem ? menuItem.name : 'Gà Ủ Muối',
      quantity: item.quantity,
      unit_price: unitPrice,
      cost_price: costPrice,
      subtotal: itemSubtotal
    };
  });

  let discountAmount = 0;
  if (params.voucher_code) {
    const voucher = await getVoucherByCode(params.voucher_code);
    if (voucher && subtotal >= (voucher.min_order_value || 0)) {
      if (voucher.discount_type === 'fixed') {
        discountAmount = voucher.discount_value;
      } else {
        discountAmount = (subtotal * voucher.discount_value) / 100;
      }
    }
  }

  if (discountAmount === 0 && subtotal >= 355000) {
    discountAmount = 30000;
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const finalAmount = Math.max(0, subtotal - discountAmount);
  const estimatedProfit = finalAmount - totalCost;

  const newOrder: Order = {
    id: `ord-gum-${Date.now()}`,
    order_code: generateOrderCode(),
    customer_name: params.customer_name || 'Khách Vãng Lai',
    customer_phone: params.customer_phone || '0901234567',
    shipping_address: params.shipping_address || 'Địa chỉ mặc định',
    district: params.district || 'Quận 1',
    city: params.city || 'Hồ Chí Minh',
    branch_id: params.branch_id,
    items: orderItems,
    subtotal: subtotal,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    estimated_profit: estimatedProfit,
    voucher_code: params.voucher_code || null,
    note: params.note || null,
    status: 'RECEIVED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isRealSupabase) {
    try {
      const res: any = await withTimeout(() => supabaseServer.from('orders').insert(newOrder).select('*').single() as any, 300);
      if (res?.data) {
        globalMockOrders.unshift(res.data as Order);
        return { success: true, order: res.data as Order };
      }
    } catch (e) {}
  }

  globalMockOrders.unshift(newOrder);
  return { success: true, order: newOrder };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const found = globalMockOrders.find(o => o.id === orderId);
  if (found) {
    found.status = status;
    found.updated_at = new Date().toISOString();
  }

  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isRealSupabase) {
    try {
      const res: any = await withTimeout(
        () => supabaseServer
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .select('*')
          .single() as any,
        300
      );
      if (res?.data) return { success: true, order: res.data as Order };
    } catch (e) {}
  }

  return { success: true, order: found || null };
}

export async function getBranchOrders(branchId: string): Promise<Order[]> {
  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isRealSupabase) {
    try {
      const res: any = await withTimeout(
        () => supabaseServer
          .from('orders')
          .select('*, branch:branches(*)')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false }) as any,
        300
      );
      if (res?.data && res.data.length > 0) return res.data as Order[];
    } catch (e) {}
  }

  const branches = DEFAULT_BRANCHES;
  const bMap = new Map(branches.map(b => [b.id, b]));

  return globalMockOrders
    .filter(o => o.branch_id === branchId)
    .map(o => ({ ...o, branch: bMap.get(o.branch_id) }));
}

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  const cleanPhone = phone.trim();
  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isRealSupabase) {
    try {
      const res: any = await withTimeout(
        () => supabaseServer
          .from('orders')
          .select('*, branch:branches(*)')
          .eq('customer_phone', cleanPhone)
          .order('created_at', { ascending: false }) as any,
        300
      );
      if (res?.data && res.data.length > 0) return res.data as Order[];
    } catch (e) {}
  }

  const branches = DEFAULT_BRANCHES;
  const bMap = new Map(branches.map(b => [b.id, b]));

  return globalMockOrders
    .filter(o => o.customer_phone.includes(cleanPhone) || cleanPhone.includes(o.customer_phone))
    .map(o => ({ ...o, branch: bMap.get(o.branch_id) }));
}

export async function getAnalyticsData(period: 'today' | 'week' | 'month' | 'all' = 'today', branchId?: string) {
  let ordersList = [...globalMockOrders];

  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isRealSupabase) {
    try {
      let query = supabaseServer.from('orders').select('*, branch:branches(*)');
      if (branchId && branchId !== 'all') query = query.eq('branch_id', branchId);
      const res: any = await withTimeout(() => query.order('created_at', { ascending: false }) as any, 300);
      if (res?.data && res.data.length > 0) ordersList = res.data as Order[];
    } catch (e) {
      console.warn('Supabase fetch timeout/error, returning instant fallback data', e);
    }
  }

  const branches = DEFAULT_BRANCHES;
  const bMap = new Map(branches.map(b => [b.id, b]));
  ordersList = ordersList.map(o => ({ ...o, branch: o.branch || bMap.get(o.branch_id) }));

  if (branchId && branchId !== 'all') {
    ordersList = ordersList.filter(o => o.branch_id === branchId);
  }

  const totalOrders = ordersList.length;
  const paidOrders = ordersList.filter(o => o.status === 'PAID' || o.status === 'DELIVERED');
  const cancelledOrders = ordersList.filter(o => o.status === 'CANCELLED');

  const gmv = paidOrders.reduce((sum, o) => sum + Number(o.final_amount), 0);
  const grossProfit = paidOrders.reduce((sum, o) => sum + Number(o.estimated_profit), 0);

  const completionRate = totalOrders > 0 ? (paidOrders.length / totalOrders) * 100 : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;

  const statusBreakdown = {
    RECEIVED: ordersList.filter(o => o.status === 'RECEIVED').length,
    PREPARING: ordersList.filter(o => o.status === 'PREPARING').length,
    SHIPPING: ordersList.filter(o => o.status === 'SHIPPING').length,
    DELIVERED: ordersList.filter(o => o.status === 'DELIVERED').length,
    PAID: paidOrders.length,
    CANCELLED: cancelledOrders.length,
  };

  return {
    orders: ordersList,
    metrics: {
      totalOrders,
      gmv,
      grossProfit,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      statusBreakdown
    }
  };
}
