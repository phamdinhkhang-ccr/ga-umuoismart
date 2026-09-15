import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // 1. Fetch PENDING Orders
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 2. Fetch Products with Shelf Life <= 5 Days
    const products = await prisma.product.findMany({
      where: {
        stockQuantity: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const expiringProducts = products.filter((p) => {
      const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : now.getTime();
      const expDate = p.expiryDate ? new Date(p.expiryDate) : new Date(createdTime + 14 * 24 * 60 * 60 * 1000);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    });

    // 3. Fetch CRM Customers (> 30 Days Since Last Order)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const crmCustomers = await prisma.customer.findMany({
      where: {
        lastOrderAt: {
          lte: thirtyDaysAgo,
        },
        OR: [
          { lastContactedAt: null },
          { lastContactedAt: { lte: sevenDaysAgo } },
        ],
      },
      orderBy: { lastOrderAt: 'asc' },
      take: 10,
    });

    // Formatted Notification Items
    const notifications: any[] = [];

    // Map Orders
    pendingOrders.forEach((o) => {
      const code = o.orderCode || `#${o.id.slice(-6)}`;
      const itemCount = o.items ? o.items.length : 1;
      notifications.push({
        id: `order-${o.id}`,
        type: 'ORDER',
        title: `Đơn Hàng Mới ${code}`,
        detail: `Khách ${o.customerName || 'Khách Vô Danh'} (${o.customerPhone || 'SĐT không có'}) vừa đặt ${itemCount} món - Tổng: ${o.totalAmount.toLocaleString('vi-VN')}đ. Cần xác nhận ngay!`,
        targetUrl: `/admin/orders`,
        createdAt: o.createdAt.toISOString(),
      });
    });

    // Map Expiring Products
    expiringProducts.forEach((p) => {
      const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : now.getTime();
      const expDate = p.expiryDate ? new Date(p.expiryDate) : new Date(createdTime + 14 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expDateFormatted = expDate.toLocaleDateString('vi-VN');

      notifications.push({
        id: `exp-${p.id}`,
        type: 'EXPIRY',
        title: `Cảnh Báo Hạn Dùng Mẻ Gà`,
        detail: `Món "${p.name}" (Lô: ${p.batchCode || 'LÔ-GUM-DEFAULT'}) chỉ còn ${daysLeft <= 0 ? 0 : daysLeft} ngày là hết hạn (HSD: ${expDateFormatted}). Ưu tiên xuất bán trước!`,
        targetUrl: `/admin/products?expiryFilter=expiring`,
        createdAt: p.createdAt ? p.createdAt.toISOString() : now.toISOString(),
      });
    });

    // Map CRM Customers
    crmCustomers.forEach((c) => {
      notifications.push({
        id: `crm-${c.id}`,
        type: 'CRM',
        title: `Nhắc Nhở Chăm Sóc Khách Quen`,
        detail: `Khách ${c.name} (${c.phone}) đã hơn 30 ngày chưa đặt lại món gà. Bấm để gửi ưu đãi Zalo!`,
        targetUrl: `/admin/customers?filter=reorder`,
        createdAt: c.lastOrderAt ? c.lastOrderAt.toISOString() : c.createdAt.toISOString(),
      });
    });

    // Sort all notifications by newest date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      notifications,
      summary: {
        orderCount: pendingOrders.length,
        expiryCount: expiringProducts.length,
        crmCount: crmCustomers.length,
        total: notifications.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
