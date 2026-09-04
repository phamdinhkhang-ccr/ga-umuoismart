import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.cloud_store');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const NOTIFS_FILE = path.join(DATA_DIR, 'notifications.json');

// Ensure directory exists
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {}
}

function readOrders(): any[] {
  ensureStorage();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {}
  return [];
}

function writeOrders(orders: any[]) {
  ensureStorage();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {}
}

function readNotifs(): any[] {
  ensureStorage();
  try {
    if (fs.existsSync(NOTIFS_FILE)) {
      const data = fs.readFileSync(NOTIFS_FILE, 'utf-8');
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {}
  return [];
}

function writeNotifs(notifs: any[]) {
  ensureStorage();
  try {
    fs.writeFileSync(NOTIFS_FILE, JSON.stringify(notifs, null, 2), 'utf-8');
  } catch (e) {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = Number(searchParams.get('since') || 0);

    const allOrders = readOrders();
    const allNotifs = readNotifs();

    const newOrders = since > 0 
      ? allOrders.filter(o => new Date(o.createdAt || o.created_at || 0).getTime() > since)
      : [];

    return NextResponse.json({
      success: true,
      orders: allOrders,
      notifications: allNotifs,
      newOrders,
      hasNew: newOrders.length > 0,
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const orderId = body.id || body.order_code || `OD${Math.floor(1000 + Math.random() * 9000)}`;

    const custName = body.customerName || body.customer_name || body.name || 'Khách Vãng Lai';
    const custPhone = body.phone || body.customer_phone || '';
    const custAddr = body.address || body.shipping_address || body.customer_address || '';
    const branchName = body.branchName || body.branch || 'CƠ SỞ VIN SMART CITY';
    const branchId = body.branchId || body.branch_id || 'b1';

    const itemsList = body.items || body.order_items || [];
    const totalAmt = body.totalAmount || body.total_amount || body.final_amount || body.subtotal || 0;

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
      cutOption: body.cutOption || 'Chặt sẵn ăn luôn',
      note: body.note || '',
      status: body.status || 'PENDING',
      source: body.source || 'Landing Page Trang Chủ',
      createdAt: now,
      created_at: now
    };

    const currentOrders = readOrders();
    const updatedOrders = [formattedOrder, ...currentOrders.filter(o => o.id !== orderId && o.order_code !== orderId)];
    writeOrders(updatedOrders);

    // Create Notification
    const summaryText = itemsList.length > 0 ? itemsList.map((i: any) => `${i.quantity || 1}x ${i.item_name || i.name || 'món'}`).join(', ') : 'món';
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

    const currentNotifs = readNotifs();
    const updatedNotifs = [newNotification, ...currentNotifs];
    writeNotifs(updatedNotifs);

    return NextResponse.json({
      success: true,
      order: formattedOrder,
      notification: newNotification,
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create cloud order' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId, status } = await request.json();
    const currentOrders = readOrders();
    const updatedOrders = currentOrders.map(o => (o.id === orderId || o.order_code === orderId) ? { ...o, status } : o);
    writeOrders(updatedOrders);

    return NextResponse.json({ success: true, orders: updatedOrders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
}
