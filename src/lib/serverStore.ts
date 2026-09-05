// In-Memory Cloud Store for Vercel Serverless environment (No Read-Only File System Errors)

declare global {
  var __CLOUD_ORDERS__: any[];
  var __CLOUD_NOTIFS__: any[];
  var __CLOUD_PRODUCTS__: any[];
}

const INITIAL_MOCK_PRODUCTS: any[] = [];

if (!globalThis.__CLOUD_ORDERS__) {
  globalThis.__CLOUD_ORDERS__ = [];
}

if (!globalThis.__CLOUD_NOTIFS__) {
  globalThis.__CLOUD_NOTIFS__ = [];
}

if (!globalThis.__CLOUD_PRODUCTS__) {
  globalThis.__CLOUD_PRODUCTS__ = INITIAL_MOCK_PRODUCTS;
}

export const getCloudOrders = (): any[] => {
  return globalThis.__CLOUD_ORDERS__ || [];
};

export const setCloudOrders = (orders: any[]): any[] => {
  globalThis.__CLOUD_ORDERS__ = Array.isArray(orders) ? orders : [];
  return globalThis.__CLOUD_ORDERS__;
};

export const addCloudOrder = (order: any): { orders: any[]; notification: any } => {
  const currentOrders = getCloudOrders();
  const orderId = order.id || order.order_code || `OD${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const custName = order.customerName || order.customer_name || order.name || 'Khách Vãng Lai';
  const custPhone = order.phone || order.customer_phone || '';
  const custAddr = order.address || order.shipping_address || order.customer_address || '';
  const branchName = order.branchName || order.branch || 'CƠ SỞ VIN SMART CITY';
  const branchId = order.branchId || order.branch_id || 'b1';

  const itemsList = order.items || order.order_items || [];
  const totalAmt = order.totalAmount || order.total_amount || order.final_amount || order.subtotal || 0;

  const formattedOrder = {
    id: orderId,
    code: `#${orderId}`,
    order_code: orderId,
    customerName: custName,
    customer_name: custName,
    phone: custPhone,
    customer_phone: custPhone,
    address: custAddr,
    shipping_address: custAddr,
    customer_address: custAddr,
    branch: branchName,
    branchName: branchName,
    branch_id: branchId,
    branchId: branchId,
    items: itemsList,
    order_items: itemsList,
    totalAmount: totalAmt,
    total_amount: totalAmt,
    subtotal: totalAmt,
    final_amount: totalAmt,
    cutOption: order.cutOption || 'Chặt sẵn ăn luôn',
    note: order.note || '',
    status: order.status || 'PENDING',
    source: order.source || 'Landing Page Trang Chủ',
    createdAt: now,
    created_at: now
  };

  const updatedOrders = [formattedOrder, ...currentOrders.filter(o => o.id !== orderId && o.order_code !== orderId)];
  globalThis.__CLOUD_ORDERS__ = updatedOrders;

  const newNotification = {
    id: `notif_${Date.now()}`,
    type: 'order',
    title: `🍗 Đơn hàng mới #${formattedOrder.id}`,
    content: `Khách ${custName} (${custPhone}) vừa đặt đơn ${Number(totalAmt).toLocaleString('vi-VN')} đ qua Web.`,
    message: `Khách ${custName} (${custPhone}) vừa đặt đơn ${Number(totalAmt).toLocaleString('vi-VN')} đ qua Web.`,
    time: 'Vừa xong',
    timestamp: 'Vừa xong',
    createdAt: now,
    isRead: false,
    read: false,
    link: '/admin/orders'
  };

  globalThis.__CLOUD_NOTIFS__ = [newNotification, ...(globalThis.__CLOUD_NOTIFS__ || [])];

  return { orders: updatedOrders, notification: newNotification };
};

export const getCloudNotifs = (): any[] => {
  return globalThis.__CLOUD_NOTIFS__ || [];
};

export const setCloudNotifs = (notifs: any[]): any[] => {
  globalThis.__CLOUD_NOTIFS__ = Array.isArray(notifs) ? notifs : [];
  return globalThis.__CLOUD_NOTIFS__;
};

export const addCloudNotif = (notif: any): any[] => {
  const current = getCloudNotifs();
  const updated = [notif, ...current];
  globalThis.__CLOUD_NOTIFS__ = updated;
  return updated;
};

export const getCloudProducts = (): any[] => {
  return globalThis.__CLOUD_PRODUCTS__ || [];
};

export const setCloudProducts = (products: any[]): any[] => {
  globalThis.__CLOUD_PRODUCTS__ = Array.isArray(products) ? products : [];
  return globalThis.__CLOUD_PRODUCTS__;
};
