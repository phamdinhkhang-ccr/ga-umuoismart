'use client';

// Central Business Store for Automated Business Logic (Expenses, Inventory Audit, Order Deductions & Restorations)

import { Order, OrderItem, OrderStatus } from '@/types/database';

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
  category: string;
  amount: number;
  description: string;
  payer: string;
  branch: string;
  created_at: string;
}

// Key Constants for LocalStorage
const KEYS = {
  EXPENSES: 'gum_smart_expenses_v2',
  LOGS: 'gum_smart_inventory_logs_v2',
  INITIAL_STOCK: 'gum_smart_initial_stock_v2',
  WASTED_STOCK: 'gum_smart_wasted_stock_v2',
  IMPORTED_STOCK: 'gum_smart_imported_stock_v2'
};

// Default Mock Expenses
const DEFAULT_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-101',
    category: 'Mua Nguyên Liệu Phụ',
    amount: 150000,
    description: 'Mua 3 bao đá bi + 2 bịch túi nilon đóng gà',
    payer: 'Trần Thị Thu Ngân',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'exp-100',
    category: 'Tiền Ship Ngoài (Ahamove/Grab)',
    amount: 45000,
    description: 'Bù ship đơn hỏa tốc giao Thủ Đức',
    payer: 'Lê Văn Cơ Sở 1',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  },
  {
    id: 'exp-99',
    category: 'Điện Nước & Khác',
    amount: 80000,
    description: 'Thay bóng đèn hỏng khu vực bếp',
    payer: 'Phạm Thị Cơ Sở 2',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 3',
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
  }
];

// Base Inventory Items Schema
const BASE_INVENTORY_ITEMS = [
  { id: 'm1111111-1111-1111-1111-111111111111', name: 'Gà Ủ Muối Nguyên Con', unit: 'Con', initialStock: 120, totalImported: 50, totalWasted: 2 },
  { id: 'm2222222-2222-2222-2222-222222222222', name: 'Gà Ủ Muối Nửa Con', unit: 'Khay', initialStock: 80, totalImported: 30, totalWasted: 1 },
  { id: 'm3333333-3333-3333-3333-333333333333', name: 'Chân Gà Rút Xương Sốt Thái', unit: 'Hộp', initialStock: 150, totalImported: 40, totalWasted: 0 },
  { id: 'm4444444-4444-4444-4444-444444444444', name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', unit: 'Phần', initialStock: 90, totalImported: 20, totalWasted: 1 },
  { id: 'm5555555-5555-5555-5555-555555555555', name: 'Nước Chấm Thần Thánh Extra', unit: 'Chai', initialStock: 200, totalImported: 100, totalWasted: 3 },
  { id: 'm6666666-6666-6666-6666-666666666666', name: 'Trà Tắc Khổng Lồ', unit: 'Ly', initialStock: 300, totalImported: 150, totalWasted: 5 },
  { id: 'm7777777-7777-7777-7777-777777777777', name: 'Trà Đào Cam Sả', unit: 'Ly', initialStock: 250, totalImported: 100, totalWasted: 2 }
];

// Helper to safely access LocalStorage
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
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

export function addExpense(exp: Omit<ExpenseRecord, 'id' | 'created_at'>): ExpenseRecord {
  const current = getExpenses();
  const newRecord: ExpenseRecord = {
    ...exp,
    id: `exp-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  const updated = [newRecord, ...current];
  setItem(KEYS.EXPENSES, updated);
  return newRecord;
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

// Deduct inventory when order is completed / paid
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

// Restore inventory when order is cancelled
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

// Build Audit Table matching formula:
// Tồn cuối = Tồn đầu ngày + Nhập kho - Bán thành công + Hoàn hàng do hủy - Xuất hao hụt
export function calculateInventoryAudit(ordersList: Order[]): InventoryAuditItem[] {
  const logs = getInventoryLogs();

  return BASE_INVENTORY_ITEMS.map(base => {
    // 1. Calculate sold & restored from active orders list
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

    // 2. Extra imports & waste from logs
    const extraImports = logs
      .filter(l => l.type === 'IMPORT' && l.itemName.toLowerCase().includes(base.name.toLowerCase()))
      .reduce((sum, l) => sum + Math.abs(l.quantityChange), 0);

    const extraWasted = logs
      .filter(l => l.type === 'WASTE' && l.itemName.toLowerCase().includes(base.name.toLowerCase()))
      .reduce((sum, l) => sum + Math.abs(l.quantityChange), 0);

    const totalImported = base.totalImported + extraImports;
    const totalWasted = base.totalWasted + extraWasted;

    // Formula: Tồn cuối = Tồn đầu ngày + Nhập kho - Bán thành công + Hoàn hàng do hủy - Xuất hao hụt
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
      currentStock: Math.max(0, currentStock)
    };
  });
}
