'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { Branch, MenuItem, Order, OrderItem, OrderStatus, Voucher } from '@/types/database';

const globalMockOrders: Order[] = [];

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

const DEFAULT_BRANCHES: Branch[] = [];

export async function getBranches(): Promise<Branch[]> {
  const isRealSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (!isRealSupabase) return DEFAULT_BRANCHES;

  try {
    const res: any = await withTimeout(() => supabaseServer.from('branches').select('*').order('name') as any, 300);
    if (res?.data && res.data.length > 0) return res.data as Branch[];
  } catch (e) {}

  return DEFAULT_BRANCHES;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [];

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

export async function addNewMockOrder(newOrder: Order) {
  const existingIdx = globalMockOrders.findIndex(o => o.id === newOrder.id || o.order_code === newOrder.order_code);
  if (existingIdx === -1) {
    globalMockOrders.unshift(newOrder);
  }
}

export async function getAnalyticsData(period: 'today' | 'week' | 'month' | 'all' = 'today', branchId?: string) {
  let ordersList = [...globalMockOrders];

  if (typeof window !== 'undefined') {
    try {
      const posData = localStorage.getItem('pos_orders_data');
      const gumData = localStorage.getItem('gum_smart_orders_v3');
      const raw = posData || gumData;
      if (raw) {
        const parsed: Order[] = JSON.parse(raw);
        const existingIds = new Set(ordersList.map(o => o.id || o.order_code));
        const newLocal = parsed.filter(o => !existingIds.has(o.id) && !existingIds.has(o.order_code));
        ordersList = [...newLocal, ...ordersList];
      }
    } catch (e) {}
  }

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
