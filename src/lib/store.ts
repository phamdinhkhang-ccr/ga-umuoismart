'use client';

// Central Business Store for Automated Business Logic (Expenses, Inventory Audit, Order Deductions & Restorations)

import { Order, OrderItem, OrderStatus, Branch } from '@/types/database';

export interface InventoryAuditItem {
  id: string;
  name: string;
  unit: string;
  initialStock: number;   // Tồn đầu ngày
  totalImported: number;  // Nhập kho
  totalSold: number;      // Bán thành công
  totalRestored: number;  // Hoàn hàng do hủy
  totalWasted: number;    // Xuất hao hụt
  currentStock: number;   // Tồn cuối = đầu + nhập - bán + hoàn - hao hụt
  minStock: number;       // Ngưỡng an toàn (Min)
}

export interface InventoryLog {
  id: string;
  timestamp: string;
  type: 'IMPORT' | 'DEDUCT_SALE' | 'RESTORE_CANCEL' | 'WASTE';
  orderCode?: string;
  branchName: string;
  itemName: string;
  quantityChange: number;
  note: string;
}

export interface ExpenseRecord {
  id: string;
  code: string;            // e.g. '#EX1418'
  category: string;        // e.g. 'Tiền ship', 'Nước & Đá', 'Ăn uống', 'Mua rau', 'Mua giấy'
  amount: number;          // e.g. 26000
  payment_method: string;  // 'Tiền mặt' | 'Chuyển khoản'
  description: string;     // e.g. 'Trả ship', 'Nước', 'Ăn trưa', 'Mua rau'
  payer: string;           // e.g. 'Đức', 'Admin'
  branch: string;          // e.g. 'CƠ SỞ VIN SMART CITY'
  created_at: string;      // e.g. '2026-09-04'
}

// Key Constants for LocalStorage
const KEYS = {
  EXPENSES: 'gum_smart_expenses_v3',
  LOGS: 'gum_smart_inventory_logs_v3',
  INITIAL_STOCK: 'gum_smart_initial_stock_v3',
  WASTED_STOCK: 'gum_smart_wasted_stock_v3',
  IMPORTED_STOCK: 'gum_smart_imported_stock_v3',
  BRANCHES: 'gum_smart_branches_v3',
  PRODUCTS: 'gum_smart_products_v3',
  CUSTOMERS: 'gum_smart_customers_v3',
  NOTIFICATIONS: 'pos_notifications_data',
  CMS: 'gum_smart_storefront_cms_v1',
  ORDERS: 'pos_orders_data'
};

export const ORDER_STORAGE_KEY = 'pos_orders_data';
export const NOTIFICATION_STORAGE_KEY = 'pos_notifications_data';

export function getPosOrders(): any[] {
  return getItem<any[]>(ORDER_STORAGE_KEY, []);
}

export function savePosOrder(newOrderData: any): any[] {
  const current = getPosOrders();
  const rawId = newOrderData.id || newOrderData.order_code || `OD${Math.floor(1000 + Math.random() * 9000)}`;
  const orderCode = newOrderData.order_code || newOrderData.id || `OD${Math.floor(1000 + Math.random() * 9000)}`;
  
  const formattedOrder = {
    id: rawId,
    order_code: orderCode,
    customerName: newOrderData.customerName || newOrderData.customer_name || 'Khách Đặt Web',
    customer_name: newOrderData.customer_name || newOrderData.customerName || 'Khách Đặt Web',
    phone: newOrderData.phone || newOrderData.customer_phone || '',
    customer_phone: newOrderData.customer_phone || newOrderData.phone || '',
    address: newOrderData.address || newOrderData.shipping_address || '',
    shipping_address: newOrderData.shipping_address || newOrderData.address || '',
    district: newOrderData.district || 'Hà Nội',
    city: newOrderData.city || 'Hà Nội',
    branchId: newOrderData.branchId || newOrderData.branch_id || 'b1',
    branch_id: newOrderData.branch_id || newOrderData.branchId || 'b1',
    branchName: newOrderData.branchName || newOrderData.branch?.name || 'CƠ SỞ VIN SMART CITY',
    branch: newOrderData.branch || { id: newOrderData.branch_id || 'b1', name: newOrderData.branchName || 'CƠ SỞ VIN SMART CITY' },
    items: newOrderData.items || [],
    cutOption: newOrderData.cutOption || 'Chặt sẵn',
    note: newOrderData.note || '',
    totalAmount: newOrderData.totalAmount || newOrderData.final_amount || 0,
    subtotal: newOrderData.subtotal || newOrderData.totalAmount || newOrderData.final_amount || 0,
    final_amount: newOrderData.final_amount || newOrderData.totalAmount || 0,
    estimated_profit: newOrderData.estimated_profit || Math.round((newOrderData.totalAmount || newOrderData.final_amount || 0) * 0.45),
    status: newOrderData.status || 'RECEIVED',
    source: newOrderData.source || 'Website Khách Đặt',
    createdAt: newOrderData.createdAt || newOrderData.created_at || new Date().toISOString(),
    created_at: newOrderData.created_at || newOrderData.createdAt || new Date().toISOString(),
    isRead: false
  };

  const updated = [formattedOrder, ...current.filter(o => o.id !== formattedOrder.id && o.order_code !== formattedOrder.order_code)];
  setItem(ORDER_STORAGE_KEY, updated);
  setItem('gum_smart_orders_v3', updated);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pos_last_order_ping', Date.now().toString());
      localStorage.setItem('pos_new_order_event', JSON.stringify({
        orderId: formattedOrder.id,
        orderCode: formattedOrder.order_code,
        customerName: formattedOrder.customerName,
        branchName: formattedOrder.branchName,
        timestamp: Date.now()
      }));
      window.dispatchEvent(new CustomEvent('new_order_event', { detail: formattedOrder }));
      window.dispatchEvent(new CustomEvent('new_order_placed', { detail: formattedOrder }));
    } catch (e) {}
  }

  addNotification({
    type: 'ORDER',
    title: `🔔 ĐƠN HÀNG MỚI #${formattedOrder.order_code}`,
    message: `Khách ${formattedOrder.customerName} (${formattedOrder.phone}) vừa đặt đơn (${formattedOrder.totalAmount.toLocaleString('vi-VN')}đ) từ Website.`,
    link: '/admin/orders',
    actionText: 'Xem đơn'
  });

  return updated;
}

// Production Empty Default Arrays
const DEFAULT_EXPENSES: ExpenseRecord[] = [];

// Base Inventory Items Schema
const BASE_INVENTORY_ITEMS: any[] = [];

export function safeGetJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null' || item.trim() === '') return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
}

// Helper to safely access LocalStorage
export function getItem<T>(key: string, fallback: T): T {
  return safeGetJSON<T>(key, fallback);
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('gum_store_update'));
  } catch (e) {
    console.warn(`Error writing localStorage key "${key}":`, e);
  }
}

let hasUserInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    hasUserInteracted = true;
    try {
      window.removeEventListener('pointerdown', markInteracted);
      window.removeEventListener('keydown', markInteracted);
    } catch (e) {}
  };
  window.addEventListener('pointerdown', markInteracted);
  window.addEventListener('keydown', markInteracted);
}

export function playBeep(): void {
  if (typeof window === 'undefined' || !hasUserInteracted) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Bỏ qua nếu user chưa tương tác với trang, tuyệt đối không throw lỗi crash React
  }
}

export function playSoundSafe(): void {
  playBeep();
}

// -------------------------------------------------------------
// EXPENSES FUNCTIONS
// -------------------------------------------------------------
export function getExpenses(): ExpenseRecord[] {
  return getItem<ExpenseRecord[]>(KEYS.EXPENSES, DEFAULT_EXPENSES);
}

export function addExpense(exp: Omit<ExpenseRecord, 'id' | 'code'>): ExpenseRecord {
  const current = getExpenses();
  const nextNum = current.length > 0 ? Math.max(...current.map(e => Number(e.code?.replace('#EX', '')) || 1400)) + 1 : 1419;
  const code = `#EX${nextNum}`;
  const newRecord: ExpenseRecord = {
    ...exp,
    id: `exp-${nextNum}`,
    code,
    created_at: exp.created_at || new Date().toISOString().split('T')[0]
  };
  const updated = [newRecord, ...current];
  setItem(KEYS.EXPENSES, updated);
  return newRecord;
}

export function updateExpense(id: string, updatedExp: Partial<ExpenseRecord>): ExpenseRecord[] {
  const current = getExpenses();
  const updated = current.map(e => e.id === id ? { ...e, ...updatedExp } : e);
  setItem(KEYS.EXPENSES, updated);
  return updated;
}

export function deleteExpense(id: string): ExpenseRecord[] {
  const current = getExpenses();
  const updated = current.filter(e => e.id !== id);
  setItem(KEYS.EXPENSES, updated);
  return updated;
}

export function getTotalPettyExpenses(): number {
  const exps = getExpenses();
  return exps.reduce((sum, item) => sum + item.amount, 0);
}

// -------------------------------------------------------------
// INVENTORY LOGS & AUDIT CALCULATIONS
// -------------------------------------------------------------
export function getInventoryLogs(): InventoryLog[] {
  return getItem<InventoryLog[]>(KEYS.LOGS, []);
}

export function addInventoryLog(log: Omit<InventoryLog, 'id' | 'timestamp'>): InventoryLog {
  const current = getInventoryLogs();
  const newLog: InventoryLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleString('vi-VN')
  };
  const updated = [newLog, ...current];
  setItem(KEYS.LOGS, updated);
  return newLog;
}

export function deductInventoryForOrder(order: Order): void {
  if (!order.items || order.items.length === 0) return;
  order.items.forEach(item => {
    addInventoryLog({
      type: 'DEDUCT_SALE',
      orderCode: order.order_code,
      branchName: order.branch?.name || 'Chi Nhánh Phụ Trách',
      itemName: item.item_name,
      quantityChange: -Math.abs(item.quantity),
      note: `Trừ kho tự động do tạo/bán đơn hàng #${order.order_code}`
    });
  });
}

export function restoreInventoryForOrder(order: Order): void {
  if (!order.items || order.items.length === 0) return;
  order.items.forEach(item => {
    addInventoryLog({
      type: 'RESTORE_CANCEL',
      orderCode: order.order_code,
      branchName: order.branch?.name || 'Chi Nhánh Phụ Trách',
      itemName: item.item_name,
      quantityChange: Math.abs(item.quantity),
      note: `Hoàn kho tự động do HỦY ĐƠN hàng #${order.order_code}`
    });
  });
}

export function calculateInventoryAudit(ordersList: Order[]): InventoryAuditItem[] {
  const logs = getInventoryLogs();

  return BASE_INVENTORY_ITEMS.map(base => {
    let totalSold = 0;
    let totalRestored = 0;

    ordersList.forEach(order => {
      const matchedItem = order.items?.find(i => 
        i.menu_item_id === base.id || i.item_name.toLowerCase().includes(base.name.toLowerCase())
      );
      if (matchedItem) {
        if (order.status === 'PAID' || order.status === 'DELIVERED' || order.status === 'SHIPPING' || order.status === 'PREPARING' || order.status === 'RECEIVED') {
          totalSold += matchedItem.quantity;
        } else if (order.status === 'CANCELLED') {
          totalRestored += matchedItem.quantity;
        }
      }
    });

    const extraImports = logs
      .filter(l => l.type === 'IMPORT' && l.itemName.toLowerCase().includes(base.name.toLowerCase()))
      .reduce((sum, l) => sum + Math.abs(l.quantityChange), 0);

    const extraWasted = logs
      .filter(l => l.type === 'WASTE' && l.itemName.toLowerCase().includes(base.name.toLowerCase()))
      .reduce((sum, l) => sum + Math.abs(l.quantityChange), 0);

    const totalImported = base.totalImported + extraImports;
    const totalWasted = base.totalWasted + extraWasted;

    const currentStock = base.initialStock + totalImported - totalSold + totalRestored - totalWasted;

    return {
      id: base.id,
      name: base.name,
      unit: base.unit,
      initialStock: base.initialStock,
      totalImported,
      totalSold,
      totalRestored,
      totalWasted,
      currentStock: Math.max(0, currentStock),
      minStock: base.minStock || 30
    };
  });
}

// -------------------------------------------------------------
// BRANCHES MANAGEMENT FUNCTIONS & DATA
// -------------------------------------------------------------
const DEFAULT_BRANCHES: Branch[] = [];

export function getBranches(): Branch[] {
  return getItem<Branch[]>(KEYS.BRANCHES, DEFAULT_BRANCHES);
}

export function saveBranch(branchData: Partial<Branch> & { name: string }): Branch[] {
  const current = getBranches();
  if (branchData.id) {
    const updated = current.map(b => b.id === branchData.id ? { ...b, ...branchData } : b);
    setItem(KEYS.BRANCHES, updated);
    return updated;
  } else {
    const newBranch: Branch = {
      id: `b-${Date.now()}`,
      name: branchData.name,
      address: branchData.address || '',
      district: branchData.district || '',
      city: branchData.city || 'Hà Nội',
      phone: branchData.phone || '',
      manager: branchData.manager || 'Quản lý cơ sở',
      status: branchData.status || 'ACTIVE',
      coverage_zones: branchData.coverage_zones || [branchData.district || 'Hà Nội'],
      capacity_per_hour: branchData.capacity_per_hour || 35,
      bank_name: branchData.bank_name || 'MB Bank',
      bank_account: branchData.bank_account || '0988123456',
      bank_holder: branchData.bank_holder || branchData.name.toUpperCase(),
      orders_pending: branchData.orders_pending || 0,
      orders_total_today: branchData.orders_total_today || 0,
      revenue_today: branchData.revenue_today || 0,
      main_stock: branchData.main_stock || 30
    };
    const updated = [...current, newBranch];
    setItem(KEYS.BRANCHES, updated);
    return updated;
  }
}

export function updateBranchStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'OVERLOADED'): Branch[] {
  const current = getBranches();
  const updated = current.map(b => b.id === id ? { ...b, status } : b);
  setItem(KEYS.BRANCHES, updated);
  return updated;
}

export function transferInventoryBetweenBranches(
  fromBranchId: string,
  toBranchId: string,
  itemName: string,
  quantity: number,
  note?: string
): Branch[] {
  const current = getBranches();
  const fromB = current.find(b => b.id === fromBranchId);
  const toB = current.find(b => b.id === toBranchId);

  const updated = current.map(b => {
    if (b.id === fromBranchId) {
      return { ...b, main_stock: Math.max(0, (b.main_stock || 0) - quantity) };
    }
    if (b.id === toBranchId) {
      return { ...b, main_stock: (b.main_stock || 0) + quantity };
    }
    return b;
  });

  setItem(KEYS.BRANCHES, updated);

  // Add Inventory Transfer Logs
  addInventoryLog({
    type: 'WASTE',
    branchName: fromB?.name || 'Chi Nhánh Nguồn',
    itemName: `${itemName} (Xuất chuyển sang ${toB?.name || 'Cơ sở khác'})`,
    quantityChange: -quantity,
    note: note || `Điều chuyển ${quantity} ${itemName} tới ${toB?.name}`
  });

  addInventoryLog({
    type: 'IMPORT',
    branchName: toB?.name || 'Chi Nhánh Nhận',
    itemName: `${itemName} (Nhận chuyển từ ${fromB?.name || 'Cơ sở khác'})`,
    quantityChange: quantity,
    note: note || `Nhận điều chuyển ${quantity} ${itemName} từ ${fromB?.name}`
  });

  return updated;
}

// -------------------------------------------------------------
// PRODUCTS & MENU MANAGEMENT FUNCTIONS & DATA
// -------------------------------------------------------------
export interface ProductRecord {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  category: 'Món Gà Ủ Muối' | 'Món Ăn Kèm' | 'Nước Uống' | 'Gia Vị & Extra';
  unit: string;
  is_available: boolean;
  unavailable_branches?: string[];
  ai_keywords: string[];
  is_best_seller?: boolean;
  image_url?: string;
  original_price?: number;
  description?: string;
  is_storefront_visible?: boolean;
  // Expiry & Batch tracking fields
  production_date?: string;
  shelf_life_days?: number;
  expiry_date?: string;
  batch_code?: string;
}

const DEFAULT_PRODUCTS: ProductRecord[] = [];

export function getProducts(): ProductRecord[] {
  return getItem<ProductRecord[]>(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
}

export function getExpiryDetails(expiryDateStr?: string) {
  if (!expiryDateStr) {
    return { status: 'SAFE' as const, daysLeft: 999, label: '✓ Hạn dài' };
  }
  const today = new Date('2026-09-04');
  const exp = new Date(expiryDateStr);
  const diffTime = exp.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: 'EXPIRED' as const, daysLeft, label: `⛔ Đã hết hạn (${Math.abs(daysLeft)} ngày)` };
  } else if (daysLeft <= 5) {
    return { status: 'WARNING' as const, daysLeft, label: `⚠️ Còn ${daysLeft} ngày` };
  } else {
    return { status: 'SAFE' as const, daysLeft, label: `✓ Còn ${daysLeft} ngày` };
  }
}

export function saveProduct(productData: Partial<ProductRecord> & { name: string }): ProductRecord[] {
  const current = getProducts();
  if (productData.id) {
    const updated = current.map(p => p.id === productData.id ? { ...p, ...productData } : p);
    setItem(KEYS.PRODUCTS, updated);
    return updated;
  } else {
    const newP: ProductRecord = {
      id: `m-${Date.now()}`,
      name: productData.name,
      price: productData.price || 0,
      cost_price: productData.cost_price || 0,
      category: productData.category || 'Món Gà Ủ Muối',
      unit: productData.unit || 'Phần',
      is_available: productData.is_available !== undefined ? productData.is_available : true,
      unavailable_branches: productData.unavailable_branches || [],
      ai_keywords: productData.ai_keywords || [productData.name.toLowerCase()],
      is_best_seller: productData.is_best_seller || false,
      image_url: productData.image_url,
      production_date: productData.production_date || '2026-09-04',
      shelf_life_days: productData.shelf_life_days || 7,
      expiry_date: productData.expiry_date || '2026-09-11',
      batch_code: productData.batch_code || `LÔ-${Date.now().toString().slice(-4)}`
    };
    const updated = [...current, newP];
    setItem(KEYS.PRODUCTS, updated);
    return updated;
  }
}

export function toggleProductAvailability(id: string, branchId?: string): ProductRecord[] {
  const current = getProducts();
  const updated = current.map(p => {
    if (p.id !== id) return p;

    if (!branchId || branchId === 'ALL') {
      // Toggle global availability
      return { ...p, is_available: !p.is_available };
    } else {
      // Toggle branch-specific availability
      const currentUnavail = p.unavailable_branches || [];
      const isBranchUnavail = currentUnavail.includes(branchId);
      const updatedUnavail = isBranchUnavail
        ? currentUnavail.filter(b => b !== branchId)
        : [...currentUnavail, branchId];
      return { ...p, unavailable_branches: updatedUnavail };
    }
  });

  setItem(KEYS.PRODUCTS, updated);
  return updated;
}

export function deleteProduct(id: string): ProductRecord[] {
  const current = getProducts();
  const updated = current.filter(p => p.id !== id);
  setItem(KEYS.PRODUCTS, updated);
  return updated;
}

// -------------------------------------------------------------
// CUSTOMERS CRM MANAGEMENT FUNCTIONS & DATA
// -------------------------------------------------------------
export interface CustomerOrderHistory {
  id: string;
  order_code: string;
  created_at: string;
  items_summary: string;
  total_amount: number;
  status: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  secondary_phone?: string;
  address: string;
  secondary_address?: string;
  total_orders: number;
  avg_frequency_days?: number;
  total_spend: number;
  points: number;
  tier: 'VIP' | 'Thân Thiết' | 'Khách Mới';
  last_order_date: string;
  days_since_last_order: number;
  taste_tags: string[];
  notes?: string;
  favorite_item?: string;
  favorite_branch?: string;
  avg_order_value?: number;
  order_history?: CustomerOrderHistory[];
}

const DEFAULT_CUSTOMERS: CustomerRecord[] = [];

export function getCustomers(): CustomerRecord[] {
  return getItem<CustomerRecord[]>(KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
}

export function saveCustomer(custData: Partial<CustomerRecord> & { name: string; phone: string }): CustomerRecord[] {
  const current = getCustomers();
  const phoneClean = custData.phone.trim();
  const existingIdx = current.findIndex(c => c.phone.replace(/\D/g, '') === phoneClean.replace(/\D/g, '') || c.id === custData.id);

  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    const totalSpend = (custData.total_spend !== undefined ? custData.total_spend : existing.total_spend);
    const totalOrders = (custData.total_orders !== undefined ? custData.total_orders : existing.total_orders);

    let tier: 'VIP' | 'Thân Thiết' | 'Khách Mới' = existing.tier;
    if (totalSpend >= 2000000) tier = 'VIP';
    else if (totalOrders >= 3) tier = 'Thân Thiết';
    else tier = 'Khách Mới';

    const updatedCust: CustomerRecord = {
      ...existing,
      ...custData,
      tier,
      points: Math.floor(totalSpend / 20000)
    };

    const updated = [...current];
    updated[existingIdx] = updatedCust;
    setItem(KEYS.CUSTOMERS, updated);
    return updated;
  } else {
    const totalSpend = custData.total_spend || 0;
    const totalOrders = custData.total_orders || 1;
    let tier: 'VIP' | 'Thân Thiết' | 'Khách Mới' = 'Khách Mới';
    if (totalSpend >= 2000000) tier = 'VIP';
    else if (totalOrders >= 3) tier = 'Thân Thiết';

    const newCust: CustomerRecord = {
      id: custData.id || `c-${Date.now()}`,
      name: custData.name,
      phone: phoneClean,
      secondary_phone: custData.secondary_phone || '',
      address: custData.address || '',
      secondary_address: custData.secondary_address || '',
      total_orders: totalOrders,
      avg_frequency_days: custData.avg_frequency_days || 7,
      total_spend: totalSpend,
      points: Math.floor(totalSpend / 20000),
      tier,
      last_order_date: custData.last_order_date || new Date().toLocaleString('vi-VN'),
      days_since_last_order: 0,
      taste_tags: custData.taste_tags || ['🆕 Khách mới'],
      notes: custData.notes || 'Hồ sơ tạo mới.',
      favorite_item: custData.favorite_item || '',
      favorite_branch: custData.favorite_branch || '',
      avg_order_value: totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0,
      order_history: custData.order_history || []
    };

    const updated = [newCust, ...current];
    setItem(KEYS.CUSTOMERS, updated);
    return updated;
  }
}

export function deleteCustomer(id: string): CustomerRecord[] {
  const current = getCustomers();
  const updated = current.filter(c => c.id !== id);
  setItem(KEYS.CUSTOMERS, updated);
  return updated;
}

export function findCustomerByPhone(phone: string): CustomerRecord | undefined {
  if (!phone) return undefined;
  const clean = phone.replace(/\D/g, '');
  if (!clean) return undefined;
  const customers = getCustomers();
  return customers.find(c => c.phone.replace(/\D/g, '') === clean || (c.secondary_phone && c.secondary_phone.replace(/\D/g, '') === clean));
}

export function addOrUpdateCustomerFromOrder(order: {
  customer_name: string;
  customer_phone: string;
  shipping_address?: string;
  total_amount?: number;
  order_code?: string;
  items_summary?: string;
}) {
  if (!order.customer_phone) return;
  const existing = findCustomerByPhone(order.customer_phone);

  const amount = order.total_amount || 0;
  const nowStr = new Date().toLocaleString('vi-VN');

  if (existing) {
    const newSpend = existing.total_spend + amount;
    const newOrders = existing.total_orders + 1;
    const newHistory = existing.order_history || [];
    if (order.order_code) {
      newHistory.unshift({
        id: `oh-${Date.now()}`,
        order_code: order.order_code,
        created_at: nowStr,
        items_summary: order.items_summary || 'Đơn hàng mới',
        total_amount: amount,
        status: 'PAID'
      });
    }

    saveCustomer({
      ...existing,
      name: order.customer_name || existing.name,
      address: order.shipping_address || existing.address,
      total_orders: newOrders,
      total_spend: newSpend,
      last_order_date: nowStr,
      days_since_last_order: 0,
      order_history: newHistory
    });
  } else {
    saveCustomer({
      name: order.customer_name || 'Khách Hàng Mới',
      phone: order.customer_phone,
      address: order.shipping_address || '',
      total_orders: 1,
      total_spend: amount,
      last_order_date: nowStr,
      days_since_last_order: 0,
      taste_tags: ['🆕 Đơn tự động từ AI'],
      notes: 'Tự động lưu từ đơn hàng tạo mới.',
      order_history: order.order_code ? [{
        id: `oh-${Date.now()}`,
        order_code: order.order_code,
        created_at: nowStr,
        items_summary: order.items_summary || 'Đơn mới',
        total_amount: amount,
        status: 'PAID'
      }] : []
    });
  }
}

// -------------------------------------------------------------
// NOTIFICATIONS SYSTEM FUNCTIONS & DATA
// -------------------------------------------------------------
export interface SystemNotification {
  id: string;
  type: 'ORDER' | 'STOCK_EXPIRY' | 'SHIFT' | 'EXPENSE';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link: string;
  actionText?: string;
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [];

export function getNotifications(): SystemNotification[] {
  const notifs = getItem<SystemNotification[]>('pos_notifications_data', []);
  if (notifs && notifs.length > 0) return notifs;
  return getItem<SystemNotification[]>('gum_smart_notifications_v3', []);
}

export function addNotification(notif: Partial<SystemNotification> & { title: string }): SystemNotification {
  const current = getNotifications();
  const newNotif: SystemNotification = {
    id: notif.id || `notif_${Date.now()}`,
    type: (notif.type || 'ORDER').toUpperCase() as any,
    title: notif.title,
    message: notif.message || (notif as any).content || '',
    timestamp: notif.timestamp || (notif as any).time || 'Vừa xong',
    read: notif.read ?? (notif as any).isRead ?? false,
    link: notif.link || '/admin/orders',
    actionText: notif.actionText || 'Xem chi tiết'
  };
  const updated = [newNotif, ...(Array.isArray(current) ? current : [])];
  setItem('pos_notifications_data', updated);
  setItem('gum_smart_notifications_v3', updated);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pos_notify_ping', Date.now().toString());
      window.dispatchEvent(new CustomEvent('pos_notify_event', { detail: newNotif }));
    } catch (e) {}
  }

  return newNotif;
}

export function markAllNotificationsRead(): SystemNotification[] {
  const current = getNotifications();
  const updated = current.map(n => ({ ...n, read: true, isRead: true }));
  setItem('pos_notifications_data', updated);
  setItem('gum_smart_notifications_v3', updated);
  return updated;
}

export function markNotificationRead(id: string): SystemNotification[] {
  const current = getNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true, isRead: true } : n);
  setItem('pos_notifications_data', updated);
  setItem('gum_smart_notifications_v3', updated);
  return updated;
}

// -------------------------------------------------------------
// STOREFRONT CMS SETTINGS FUNCTIONS & DATA
// -------------------------------------------------------------
export interface CmsBranchItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  maps_url: string;
  is_active: boolean;
  district?: string;
  city?: string;
}

export interface StorefrontCmsSettings {
  hero_title: string;
  heroHighlightTitle?: string;
  hero_slogan: string;
  heroSubtitle?: string;
  hero_banner_image?: string;
  hero_hotline: string;
  hotline?: string;
  hotlineBadgeText?: string;
  hotlinePrefix?: string;
  promoBannerText?: string;
  brandName?: string;
  branches: CmsBranchItem[];
  social_facebook: string;
  social_tiktok: string;
  social_zalo: string;
  hotline_complaints: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

const DEFAULT_CMS_SETTINGS: StorefrontCmsSettings = {
  hero_title: '',
  hero_slogan: '',
  hero_hotline: '',
  hotline: '',
  hotlineBadgeText: '',
  promoBannerText: '',
  brandName: '',
  branches: [],
  social_facebook: '',
  social_tiktok: '',
  social_zalo: '',
  hotline_complaints: '',
  bankInfo: {
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  }
};

export function getCmsSettings(): StorefrontCmsSettings {
  const loaded = getItem<StorefrontCmsSettings>(KEYS.CMS, DEFAULT_CMS_SETTINGS);
  return {
    ...DEFAULT_CMS_SETTINGS,
    ...loaded,
    branches: Array.isArray(loaded?.branches) ? loaded.branches : [],
    bankInfo: loaded?.bankInfo || DEFAULT_CMS_SETTINGS.bankInfo
  };
}

export function saveCmsSettings(newSettings: Partial<StorefrontCmsSettings>): StorefrontCmsSettings {
  const current = getCmsSettings();
  const updated: StorefrontCmsSettings = {
    ...current,
    ...newSettings,
    branches: newSettings.branches || current.branches
  };

  setItem(KEYS.CMS, updated);
  return updated;
}





