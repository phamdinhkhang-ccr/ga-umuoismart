import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    // Payload tiêu chuẩn từ Web2M:
    // { gateway, transactionDate, accountNumber, subAccount, amount, content, transferType, description }

    const { content, amount, transferType } = payload || {};
    const numAmount = Number(amount) || 0;

    // 1. Chỉ xử lý biến động tiền vào
    if (transferType && transferType !== 'in' && transferType !== 'IN') {
      return NextResponse.json({ success: true, message: 'Bỏ qua giao dịch tiền ra' });
    }

    if (numAmount <= 0) {
      return NextResponse.json({ success: true, message: 'Bỏ qua giao dịch số tiền <= 0' });
    }

    if (!content) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung chuyển khoản' }, { status: 400 });
    }

    // 2. Trích xuất mã đơn hàng từ nội dung chuyển khoản (VD: GUM DH78510 hoặc DH78510 hoặc 78510)
    const orderCodeMatch = content.match(/DH[-_]?\d+/i) || content.match(/\d{5,}/);
    if (!orderCodeMatch) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy cú pháp mã đơn hàng trong nội dung' });
    }

    const orderCode = orderCodeMatch[0].toUpperCase();

    // 3. Tìm đơn hàng khớp mã trong Database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderCode: { contains: orderCode } },
          { id: { contains: orderCode } }
        ],
        paymentStatus: { not: 'PAID' } // Chưa thanh toán
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Đơn hàng không tồn tại hoặc đã được thanh toán trước đó' });
    }

    // 4. Kiểm tra số tiền chuyển có khớp với tổng tiền đơn hàng
    if (numAmount >= order.totalAmount) {
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'BANK_TRANSFER',
          paidAt: new Date(),
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Tự động xác nhận thanh toán thành công cho đơn ${updatedOrder.orderCode}`,
        orderId: updatedOrder.id,
        orderCode: updatedOrder.orderCode,
        amount: numAmount,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus
      });
    }

    return NextResponse.json({
      success: false,
      message: `Số tiền chuyển (${numAmount.toLocaleString('vi-VN')} đ) nhỏ hơn tổng tiền đơn hàng (${order.totalAmount.toLocaleString('vi-VN')} đ)`
    });
  } catch (error: any) {
    console.error('Web2M Webhook Error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý webhook: ' + error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Web2M Webhook Gateway API',
    note: 'Gửi POST payload biến động số dư tới endpoint này để tự động xác nhận đơn hàng.'
  });
}
