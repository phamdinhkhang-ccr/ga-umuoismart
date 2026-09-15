import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // 1. Verify Admin authentication
    const cookieHeader = request.headers.get('cookie') || '';
    const authTokenCookie = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('auth_token='));
    const token = authTokenCookie ? authTokenCookie.split('=')[1] : null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập tài khoản Admin.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới có thể dọn dẹp dữ liệu.' },
        { status: 403 }
      );
    }

    // 2. Clear Operational Demo Data
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryReceiptItem.deleteMany({});
    await prisma.inventoryReceipt.deleteMany({});
    await prisma.inventoryExportItem.deleteMany({});
    await prisma.inventoryExport.deleteMany({});
    await prisma.customer.deleteMany({});

    return NextResponse.json({
      success: true,
      message: '🎉 Đã dọn dẹp thành công toàn bộ dữ liệu demo (Đơn hàng, Chi tiêu, Ca làm việc, Chấm công, Khách demo). Tất cả danh mục, sản phẩm, cơ sở và tài khoản được giữ nguyên!',
    });
  } catch (error: any) {
    console.error('Error resetting demo data:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Đã xảy ra lỗi khi dọn dẹp dữ liệu' },
      { status: 500 }
    );
  }
}
