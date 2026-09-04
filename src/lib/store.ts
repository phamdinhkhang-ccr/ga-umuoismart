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
  NOTIFICATIONS: 'gum_smart_notifications_v3',
  CMS: 'gum_smart_storefront_cms_v1',
  ORDERS: 'pos_orders_data'
};

export const ORDER_STORAGE_KEY = 'pos_orders_data';

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
      localStorage.setItem('pos_new_order_event', JSON.stringify({
        orderId: formattedOrder.id,
        orderCode: formattedOrder.order_code,
        customerName: formattedOrder.customerName,
        branchName: formattedOrder.branchName,
        timestamp: Date.now()
      }));
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

// Rich Pre-Populated Mock Expenses matching user request screenshot
const DEFAULT_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1418',
    code: '#EX1418',
    category: 'Tiền ship',
    amount: 26000,
    payment_method: 'Tiền mặt',
    description: 'Trả ship hỏa tốc đơn #OD9672',
    payer: 'Đức',
    branch: 'CƠ SỞ VIN SMART CITY',
    created_at: '2026-09-04'
  },
  {
    id: 'exp-1417',
    code: '#EX1417',
    category: 'Nước & Đá',
    amount: 160000,
    payment_method: 'Chuyển khoản',
    description: 'Nước uống giải khát bếp',
    payer: 'Đức',
    branch: 'CƠ SỞ VIN SMART CITY',
    created_at: '2026-09-04'
  },
  {
    id: 'exp-1414',
    code: '#EX1414',
    category: 'Ăn uống nội bộ',
    amount: 200000,
    payment_method: 'Tiền mặt',
    description: 'Ăn trưa ca làm việc',
    payer: 'Đức',
    branch: 'CƠ SỞ VIN SMART CITY',
    created_at: '2026-09-04'
  },
  {
    id: 'exp-1411',
    code: '#EX1411',
    category: 'Nguyên phụ liệu',
    amount: 45000,
    payment_method: 'Tiền mặt',
    description: 'Mua rau răm + sả tắc tươi',
    payer: 'Nam',
    branch: 'Chi Nhánh Cầu Giấy',
    created_at: '2026-09-04'
  },
  {
    id: 'exp-1409',
    code: '#EX1409',
    category: 'Nước & Đá',
    amount: 120000,
    payment_method: 'Tiền mặt',
    description: 'mua nc+ đá bi 5 bao',
    payer: 'Admin',
    branch: 'Chi Nhánh Đống Đa',
    created_at: '2026-09-03'
  },
  {
    id: 'exp-1408',
    code: '#EX1408',
    category: 'Bao bì & VPP',
    amount: 85000,
    payment_method: 'Chuyển khoản',
    description: 'mua giấy in K80 bill',
    payer: 'Đức',
    branch: 'CƠ SỞ VIN SMART CITY',
    created_at: '2026-09-03'
  }
];

// Base Inventory Items Schema
const BASE_INVENTORY_ITEMS = [
  { id: 'm1111111-1111-1111-1111-111111111111', name: 'Gà Ủ Muối Nguyên Con', unit: 'Con', initialStock: 120, totalImported: 50, totalWasted: 2, minStock: 50 },
  { id: 'm2222222-2222-2222-2222-222222222222', name: 'Gà Ủ Muối Nửa Con', unit: 'Khay', initialStock: 80, totalImported: 30, totalWasted: 1, minStock: 40 },
  { id: 'm3333333-3333-3333-3333-333333333333', name: 'Chân Gà Rút Xương Sốt Thái', unit: 'Hộp', initialStock: 150, totalImported: 40, totalWasted: 0, minStock: 60 },
  { id: 'm4444444-4444-4444-4444-444444444444', name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', unit: 'Phần', initialStock: 90, totalImported: 20, totalWasted: 1, minStock: 30 },
  { id: 'm5555555-5555-5555-5555-555555555555', name: 'Nước Chấm Thần Thánh Extra', unit: 'Chai', initialStock: 200, totalImported: 100, totalWasted: 3, minStock: 100 },
  { id: 'm6666666-6666-6666-6666-666666666666', name: 'Trà Tắc Khổng Lồ', unit: 'Ly', initialStock: 300, totalImported: 150, totalWasted: 5, minStock: 150 },
  { id: 'm7777777-7777-7777-7777-777777777777', name: 'Trà Đào Cam Sả', unit: 'Ly', initialStock: 250, totalImported: 100, totalWasted: 2, minStock: 100 }
];

// Helper to safely access LocalStorage
export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('gum_store_update'));
  } catch (e) {}
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
  return getItem<InventoryLog[]>(KEYS.LOGS, [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleString('vi-VN'),
      type: 'IMPORT',
      branchName: 'Chi Nhánh Gà Ủ Muối Quận 1',
      itemName: 'Gà Ủ Muối Nguyên Con',
      quantityChange: 50,
      note: 'Nhập kho từ nông trang Đông Anh'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toLocaleString('vi-VN'),
      type: 'DEDUCT_SALE',
      orderCode: 'GUM-88A1',
      branchName: 'Chi Nhánh Gà Ủ Muối Quận 1',
      itemName: 'Gà Ủ Muối Nguyên Con',
      quantityChange: -2,
      note: 'Trừ kho tự động theo đơn #GUM-88A1'
    }
  ]);
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
const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b-vinsmart',
    name: 'CƠ SỞ VIN SMART CITY',
    address: 'Tòa S2.02 Vinhomes Smart City, Tây Mỗ',
    district: 'Nam Từ Liêm',
    city: 'Hà Nội',
    phone: '0988.123.456',
    manager: 'Nguyễn Văn Đức',
    status: 'ACTIVE',
    coverage_zones: ['Nam Từ Liêm', 'Hoài Đức', 'Hà Đông', 'Bắc Từ Liêm'],
    capacity_per_hour: 45,
    bank_name: 'MB Bank',
    bank_account: '0988123456',
    bank_holder: 'CHI NHANH VIN SMART CITY',
    orders_pending: 5,
    orders_total_today: 24,
    revenue_today: 3420000,
    main_stock: 42
  },
  {
    id: 'b-caugiay',
    name: 'Chi Nhánh Cầu Giấy',
    address: '102 Trần Thái Tông, Dịch Vọng',
    district: 'Cầu Giấy',
    city: 'Hà Nội',
    phone: '0977.888.999',
    manager: 'Hoàng Văn Nam',
    status: 'ACTIVE',
    coverage_zones: ['Cầu Giấy', 'Đống Đa', 'Tây Hồ', 'Thanh Xuân'],
    capacity_per_hour: 40,
    bank_name: 'Vietcombank',
    bank_account: '1012345678',
    bank_holder: 'CHI NHANH CAU GIAY',
    orders_pending: 3,
    orders_total_today: 18,
    revenue_today: 2580000,
    main_stock: 35
  },
  {
    id: 'b-thanhtri',
    name: 'Chi Nhánh Thanh Trì',
    address: 'Số 9 Thượng Phúc, Đại Thanh',
    district: 'Huyện Thanh Trì',
    city: 'Hà Nội',
    phone: '0243.855.5555',
    manager: 'Hoàng Văn Hà Nội',
    status: 'ACTIVE',
    coverage_zones: ['Thanh Trì', 'Hoàng Mai', 'Hà Đông', 'Gia Lâm'],
    capacity_per_hour: 35,
    bank_name: 'Techcombank',
    bank_account: '190333444555',
    bank_holder: 'CHI NHANH THANH TRI',
    orders_pending: 2,
    orders_total_today: 15,
    revenue_today: 2150000,
    main_stock: 28
  },
  {
    id: 'b-quan1',
    name: 'Chi Nhánh Quận 1 (TP.HCM)',
    address: '123 Lê Lợi, Phường Bến Thành',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    phone: '0283.811.1111',
    manager: 'Lê Văn Cơ Sở 1',
    status: 'ACTIVE',
    coverage_zones: ['Quận 1', 'Quận 3', 'Quận 4', 'Bình Thạnh', 'Phú Nhuận'],
    capacity_per_hour: 30,
    bank_name: 'ACB',
    bank_account: '888999111',
    bank_holder: 'CHI NHANH QUAN 1',
    orders_pending: 4,
    orders_total_today: 20,
    revenue_today: 2890000,
    main_stock: 32
  }
];

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

const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: 'm1',
    name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)',
    price: 190000,
    cost_price: 110000,
    category: 'Món Gà Ủ Muối',
    unit: 'Con',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['1 con', 'nguyên con', 'gà ủ cả con', 'ga nguyen con', 'gà ủ muối'],
    is_best_seller: true,
    production_date: '2026-09-02',
    shelf_life_days: 14,
    expiry_date: '2026-09-16',
    batch_code: 'LÔ-GUM-0409'
  },
  {
    id: 'm2',
    name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)',
    price: 100000,
    cost_price: 58000,
    category: 'Món Gà Ủ Muối',
    unit: 'Nửa con',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['nửa con', '1/2 con', 'ga nua con', 'nửa con gà'],
    is_best_seller: false,
    production_date: '2026-09-03',
    shelf_life_days: 14,
    expiry_date: '2026-09-17',
    batch_code: 'LÔ-GUM-0409B'
  },
  {
    id: 'm3',
    name: 'Chân Gà Rút Xương Sốt Thái',
    price: 65000,
    cost_price: 32000,
    category: 'Món Ăn Kèm',
    unit: 'Hộp',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['chân gà', 'sốt thái', 'chân gà rút xương', 'chan ga'],
    is_best_seller: true,
    production_date: '2026-08-31',
    shelf_life_days: 6,
    expiry_date: '2026-09-06', // ⚠️Còn 2 ngày!
    batch_code: 'LÔ-CG-0409'
  },
  {
    id: 'm4',
    name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)',
    price: 85000,
    cost_price: 45000,
    category: 'Món Gà Ủ Muối',
    unit: 'Phần',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['cánh gà', '4 cánh', 'canh ga u muoi'],
    is_best_seller: false,
    production_date: '2026-08-30',
    shelf_life_days: 8,
    expiry_date: '2026-09-07', // ⚠️Còn 3 ngày!
    batch_code: 'LÔ-CGU-0209'
  },
  {
    id: 'm5',
    name: 'Nước Chấm Thần Thánh Extra',
    price: 15000,
    cost_price: 4000,
    category: 'Gia Vị & Extra',
    unit: 'Chai',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['nước chấm', 'hũ nước chấm', 'nuoc cham extra', 'sốt chấm'],
    is_best_seller: false,
    production_date: '2026-09-01',
    shelf_life_days: 30,
    expiry_date: '2026-10-01',
    batch_code: 'LÔ-NC-0109'
  },
  {
    id: 'm6',
    name: 'Trà Tắc Khổng Lồ',
    price: 20000,
    cost_price: 6000,
    category: 'Nước Uống',
    unit: 'Ly',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['trà tắc', 'ly trà tắc', 'tra tac khong lo', 'trà tắc 1 lít'],
    is_best_seller: true,
    production_date: '2026-09-04',
    shelf_life_days: 5,
    expiry_date: '2026-09-09',
    batch_code: 'LÔ-TT-0409'
  },
  {
    id: 'm7',
    name: 'Trà Đào Cam Sả',
    price: 30000,
    cost_price: 10000,
    category: 'Nước Uống',
    unit: 'Ly',
    is_available: true,
    unavailable_branches: [],
    ai_keywords: ['trà đào', 'trà đào cam sả', 'tra dao'],
    is_best_seller: false,
    production_date: '2026-09-04',
    shelf_life_days: 5,
    expiry_date: '2026-09-09',
    batch_code: 'LÔ-TD-0409'
  },
  {
    id: 'm8',
    name: 'Nộm Gà Xé Phay Chua Ngọt',
    price: 60000,
    cost_price: 36000,
    category: 'Món Ăn Kèm',
    unit: 'Hộp',
    is_available: false,
    unavailable_branches: [],
    ai_keywords: ['nộm gà', 'gà xé phay', 'nom ga'],
    is_best_seller: false,
    production_date: '2026-08-25',
    shelf_life_days: 7,
    expiry_date: '2026-09-01', // ⛔ Đã hết hạn!
    batch_code: 'LÔ-NGX-2808'
  }
];

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

const DEFAULT_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'c1',
    name: 'Nguyễn Văn Nam',
    phone: '0901234567',
    secondary_phone: '0909888777',
    address: '123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    secondary_address: 'Số 8 Tôn Đức Thắng, Quận 1',
    total_orders: 12,
    avg_frequency_days: 5,
    total_spend: 4680000,
    points: 234,
    tier: 'VIP',
    last_order_date: '2026-09-04 11:30',
    days_since_last_order: 0,
    taste_tags: ['🌶️ Ăn cay', '🥫 Nhiều sốt', '☀️ Ship giờ trưa', '🐓 Thích nguyên con'],
    notes: 'Gia đình hay ăn cay đậm đà, ship trước 12h trưa. Thường xuyên gọi điện đặt combo gà ủ muối nguyên con.',
    favorite_item: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)',
    favorite_branch: 'Chi Nhánh Quận 1 (TP.HCM)',
    avg_order_value: 390000,
    order_history: [
      { id: 'oh-1', order_code: '#OD9672', created_at: '2026-09-04 11:30', items_summary: '2x Gà Ủ Muối Nguyên Con, 2x Trà Tắc', total_amount: 420000, status: 'PAID' },
      { id: 'oh-2', order_code: '#OD9510', created_at: '2026-08-30 12:15', items_summary: '1x Gà Ủ Muối Nguyên Con, 1x Chân Gà Sốt Thái', total_amount: 255000, status: 'DELIVERED' },
      { id: 'oh-3', order_code: '#OD9344', created_at: '2026-08-25 11:45', items_summary: '3x Gà Ủ Muối Nguyên Con, 4x Trà Đào', total_amount: 690000, status: 'DELIVERED' }
    ]
  },
  {
    id: 'c2',
    name: 'Anh Tuấn',
    phone: '0988776655',
    secondary_phone: '0977112233',
    address: '456 Điện Biên Phủ, Phường 3, Quận 3, TP.HCM',
    total_orders: 5,
    avg_frequency_days: 7,
    total_spend: 1250000,
    points: 62,
    tier: 'Thân Thiết',
    last_order_date: '2026-09-01 14:15',
    days_since_last_order: 3,
    taste_tags: ['🍋 Thích chua ngọt', '🥤 Uống trà tắc khổng lồ', '⚡ Ship hỏa tốc'],
    notes: 'Lấy thêm 2 hũ nước chấm extra mỗi đơn. Thường giao buổi chiều.',
    favorite_item: 'Chân Gà Rút Xương Sốt Thái',
    favorite_branch: 'CƠ SỞ VIN SMART CITY',
    avg_order_value: 250000,
    order_history: [
      { id: 'oh-4', order_code: '#OD9488', created_at: '2026-09-01 14:15', items_summary: '2x Chân Gà Sốt Thái, 2x Trà Tắc Khổng Lồ', total_amount: 170000, status: 'DELIVERED' },
      { id: 'oh-5', order_code: '#OD9210', created_at: '2026-08-24 16:00', items_summary: '1x Gà Ủ Muối Nửa Con, 2x Cánh Gà Ủ Muối', total_amount: 270000, status: 'DELIVERED' }
    ]
  },
  {
    id: 'c3',
    name: 'Chị Mai',
    phone: '0912345678',
    secondary_phone: '',
    address: '789 Xô Viết Nghệ Tĩnh, Quận Bình Thạnh, TP.HCM',
    total_orders: 8,
    avg_frequency_days: 4,
    total_spend: 2980000,
    points: 149,
    tier: 'VIP',
    last_order_date: '2026-08-17 18:45',
    days_since_last_order: 18,
    taste_tags: ['🚫 Không lấy hành', '🍗 Thích cánh gà', '📦 Bọc giấy bạc giữ nhiệt'],
    notes: '⚠️ QUÁ 15 NGÀY CHƯA ĐẶT LẠI! Khách có nguy cơ rời bỏ. Cần nhân viên telesale gọi tặng voucher CHAO2026 giảm 30k.',
    favorite_item: 'Cánh Gà Ủ Muối (Phần 4 Cánh)',
    favorite_branch: 'Chi Nhánh Cầu Giấy',
    avg_order_value: 372500,
    order_history: [
      { id: 'oh-6', order_code: '#OD8992', created_at: '2026-08-17 18:45', items_summary: '3x Cánh Gà Ủ Muối, 2x Trà Đào Cam Sả', total_amount: 315000, status: 'DELIVERED' },
      { id: 'oh-7', order_code: '#OD8750', created_at: '2026-08-12 19:10', items_summary: '2x Gà Ủ Muối Nửa Con, 1x Chân Gà Sốt Thái', total_amount: 265000, status: 'DELIVERED' }
    ]
  },
  {
    id: 'c4',
    name: 'Anh Hoàng (Hà Nội)',
    phone: '0889018221',
    secondary_phone: '',
    address: 'Mipec 1, Hà Đông, Hà Nội',
    total_orders: 1,
    avg_frequency_days: 1,
    total_spend: 580000,
    points: 29,
    tier: 'Khách Mới',
    last_order_date: '2026-09-04 16:20',
    days_since_last_order: 0,
    taste_tags: ['🆕 Đơn đầu tiên', '🏢 Đặt văn phòng', '🥢 Lấy thêm đũa thìa'],
    notes: 'Khách mới thử nghiệm đơn đầu tiên cho nhóm văn phòng Hà Đông.',
    favorite_item: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)',
    favorite_branch: 'CƠ SỞ VIN SMART CITY',
    avg_order_value: 580000,
    order_history: [
      { id: 'oh-8', order_code: '#OD9710', created_at: '2026-09-04 16:20', items_summary: '2x Gà Ủ Muối Nguyên Con, 4x Trà Tắc Khổng Lồ', total_amount: 580000, status: 'RECEIVED' }
    ]
  }
];

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
      favorite_item: custData.favorite_item || 'Gà Ủ Muối Nguyên Con',
      favorite_branch: custData.favorite_branch || 'CƠ SỞ VIN SMART CITY',
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

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'n1',
    type: 'ORDER',
    title: '🍗 Đơn hàng mới #OD9673',
    message: 'Khách vừa đặt 2 Gà Ủ Muối Nguyên Con + 2 Trà Tắc qua AI Parser.',
    timestamp: '2 phút trước',
    read: false,
    link: '/admin/orders',
    actionText: 'Xem đơn'
  },
  {
    id: 'n2',
    type: 'STOCK_EXPIRY',
    title: '⚠️ Cảnh báo HSD: Gà Ủ Muối Lô 01',
    message: 'Còn 3 ngày hết hạn! Cần ưu tiên xuất bán hoặc khuyến mãi.',
    timestamp: '15 phút trước',
    read: false,
    link: '/admin/products',
    actionText: 'Xem HSD'
  },
  {
    id: 'n3',
    type: 'SHIFT',
    title: '🕒 Mở ca làm việc mới',
    message: 'Nhân viên Đức vừa Mở Ca 1 tại CƠ SỞ VIN SMART CITY.',
    timestamp: '45 phút trước',
    read: false,
    link: '/admin/shifts',
    actionText: 'Xem ca'
  },
  {
    id: 'n4',
    type: 'EXPENSE',
    title: '💸 Phiếu chi mới #EX1419',
    message: 'Chi 35.000 VNĐ trả tiền ship hỏa tốc đơn #OD9672 (Đức).',
    timestamp: '1 giờ trước',
    read: true,
    link: '/admin/expenses',
    actionText: 'Xem phiếu'
  }
];

export function getNotifications(): SystemNotification[] {
  return getItem<SystemNotification[]>(KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
}

export function addNotification(notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>): SystemNotification {
  const current = getNotifications();
  const newNotif: SystemNotification = {
    ...notif,
    id: `notif-${Date.now()}`,
    timestamp: 'Vừa xong',
    read: false
  };
  const updated = [newNotif, ...current];
  setItem(KEYS.NOTIFICATIONS, updated);
  return newNotif;
}

export function markAllNotificationsRead(): SystemNotification[] {
  const current = getNotifications();
  const updated = current.map(n => ({ ...n, read: true }));
  setItem(KEYS.NOTIFICATIONS, updated);
  return updated;
}

export function markNotificationRead(id: string): SystemNotification[] {
  const current = getNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  setItem(KEYS.NOTIFICATIONS, updated);
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
  hero_slogan: string;
  hero_banner_image?: string;
  hero_hotline: string;
  branches: CmsBranchItem[];
  social_facebook: string;
  social_tiktok: string;
  social_zalo: string;
  hotline_complaints: string;
}

const DEFAULT_CMS_SETTINGS: StorefrontCmsSettings = {
  hero_title: 'GÀ Ủ MUỐI SMART',
  hero_slogan: 'Gà ủ muối da giòn sần sật - Thơm ngon đậm đà giao nóng tận nơi',
  hero_hotline: '0988.123.456',
  branches: [
    {
      id: 'b-vinsmart',
      name: 'CƠ SỞ VIN SMART CITY',
      address: 'Tòa S2.02 Vinhomes Smart City, Tây Mỗ, Nam Từ Liêm, Hà Nội',
      phone: '0988.123.456',
      hours: '08:00 - 22:30',
      maps_url: 'https://maps.google.com/?q=Vin+Smart+City+Hanoi',
      is_active: true
    },
    {
      id: 'b-caugiay',
      name: 'Chi Nhánh Cầu Giấy',
      address: '102 Trần Thái Tông, Dịch Vọng, Cầu Giấy, Hà Nội',
      phone: '0977.888.999',
      hours: '08:00 - 22:30',
      maps_url: 'https://maps.google.com/?q=Tran+Thai+Tong+Cau+Giay',
      is_active: true
    },
    {
      id: 'b-thanhtri',
      name: 'Chi Nhánh Thanh Trì',
      address: 'Số 9 Thượng Phúc, Đại Thanh, Huyện Thanh Trì, Hà Nội',
      phone: '0243.855.5555',
      hours: '08:00 - 22:30',
      maps_url: 'https://maps.google.com/?q=Dai+Thanh+Thanh+Tri',
      is_active: true
    },
    {
      id: 'b-quan1',
      name: 'Chi Nhánh Quận 1 (TP.HCM)',
      address: '123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
      phone: '0283.811.1111',
      hours: '08:00 - 22:30',
      maps_url: 'https://maps.google.com/?q=Le+Loi+Quan+1',
      is_active: true
    },
    {
      id: 'b-quan3',
      name: 'Chi Nhánh Quận 3 (TP.HCM)',
      address: '456 Điện Biên Phủ, Phường 3, Quận 3, TP.HCM',
      phone: '0283.822.2222',
      hours: '08:00 - 22:30',
      maps_url: 'https://maps.google.com/?q=Dien+Bien+Phu+Quan+3',
      is_active: true
    }
  ],
  social_facebook: 'https://facebook.com',
  social_tiktok: 'https://tiktok.com',
  social_zalo: 'https://zalo.me',
  hotline_complaints: '1900.6868'
};

export function getCmsSettings(): StorefrontCmsSettings {
  return getItem<StorefrontCmsSettings>(KEYS.CMS, DEFAULT_CMS_SETTINGS);
}

export function saveCmsSettings(newSettings: Partial<StorefrontCmsSettings>): StorefrontCmsSettings {
  const current = getCmsSettings();
  const updated: StorefrontCmsSettings = {
    ...current,
    ...newSettings,
    branches: newSettings.branches || current.branches
  };

  setItem(KEYS.CMS, updated);

  addNotification({
    type: 'ORDER',
    title: '🎨 Cập nhật giao diện Trang chủ',
    message: 'Super Admin vừa lưu cấu hình mới cho trang chủ bán hàng.',
    link: '/',
    actionText: 'Xem trang chủ'
  });

  return updated;
}





