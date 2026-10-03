import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderCode: id },
          { orderCode: `DH-${id}` },
        ],
      },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;
    const userRole = (userPayload?.role || '').toUpperCase();
    const isKitchen = userRole === 'KITCHEN' || userRole === 'CHEF' || userRole === 'BEP';
    const isTelesales = userRole === 'TELESALES' || userRole === 'CS' || userRole === 'TONG_DAI';

    if (isKitchen) {
      return NextResponse.json(
        { success: false, error: 'Nhân viên Bếp không có quyền chỉnh sửa thông tin đơn hàng!' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 1. KIỂM TRA ĐƠN HÀNG CŨ
    const oldOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderCode: id },
          { orderCode: `DH-${id}` },
        ],
      },
      include: { items: true },
    });

    if (!oldOrder) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const isSuperAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

    // RBAC validation: Orders in CLOSED shifts cannot be modified by staff
    if (oldOrder.shiftId && !isSuperAdminOrManager) {
      const associatedShift = await prisma.shift.findUnique({
        where: { id: oldOrder.shiftId },
      });
      if (associatedShift && associatedShift.status === 'CLOSED') {
        return NextResponse.json(
          { success: false, error: 'Không thể chỉnh sửa đơn hàng thuộc ca làm việc đã đóng!' },
          { status: 403 }
        );
      }
    }

    if (!isSuperAdminOrManager && body.paymentStatus && body.paymentStatus !== oldOrder.paymentStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nhân viên không có quyền tự ý chuyển đổi trạng thái thanh toán Đã/Chưa thanh toán! Hệ thống sẽ tự động cập nhật qua chuyển khoản ngân hàng hoặc Admin/Quản lý phê duyệt.',
        },
        { status: 403 }
      );
    }

    // 2. TÍNH TOÁN LẠI TỔNG TIỀN MỚI
    const itemsInput = Array.isArray(body.items) ? body.items : [];
    const formattedItems = itemsInput.map((item: any) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const subtotal = price * quantity;
      return {
        productId: item.productId || null,
        productName: item.productName || item.name || 'Món ăn',
        quantity,
        price,
        subtotal,
      };
    });

    const subTotal = formattedItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const shippingFee = Number(body.shippingFee) || 0;
    const discountAmount = Number(body.discountAmount) || 0;
    const totalAmount = Math.max(0, subTotal + shippingFee - discountAmount);

    // 3. XỬ LÝ PHÂN BỔ THANH TOÁN (NẾU DÙNG SPLIT / CASH / BANK_TRANSFER)
    const paymentMethod = body.paymentMethod || oldOrder.paymentMethod || 'CASH';
    let cashAmount = Number(body.cashAmount) || 0;
    let transferAmount = Number(body.transferAmount) || 0;

    if (paymentMethod === 'CASH' || paymentMethod === 'COD') {
      cashAmount = totalAmount;
      transferAmount = 0;
    } else if (paymentMethod === 'BANK_TRANSFER') {
      transferAmount = totalAmount;
      cashAmount = 0;
    } else if (paymentMethod === 'SPLIT') {
      const inputCash = body.cashAmountInput !== undefined ? body.cashAmountInput : body.cashAmount;
      cashAmount = Math.max(0, Number(inputCash) || 0);
      transferAmount = body.transferAmount !== undefined 
        ? Math.max(0, Number(body.transferAmount) || 0)
        : Math.max(0, totalAmount - cashAmount);
    }

    const deliveryAddress = body.deliveryAddress || body.shippingAddress || oldOrder.deliveryAddress;
    const status = body.status || body.lifecycleStatus || oldOrder.status;
    const paymentStatus = body.paymentStatus || oldOrder.paymentStatus;

    // Timestamps
    const shippedAt = status === 'DELIVERING' ? (oldOrder.shippedAt || new Date()) : oldOrder.shippedAt;
    const completedAt = (status === 'COMPLETED' || status === 'DELIVERED') ? (oldOrder.completedAt || new Date()) : oldOrder.completedAt;
    const paidAt = paymentStatus === 'PAID' ? (oldOrder.paidAt || new Date()) : oldOrder.paidAt;

    // 4. THỰC HIỆN UPDATE TRONG TRANSACTION (TUYỆT ĐỐI KHÔNG GHI ĐÈ createdAt)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Xóa toàn bộ items cũ và tạo lại danh sách items mới
      await tx.orderItem.deleteMany({ where: { orderId: oldOrder.id } });

      const order = await tx.order.update({
        where: { id: oldOrder.id },
        data: {
          customerName: body.customerName !== undefined ? body.customerName : oldOrder.customerName,
          customerPhone: body.customerPhone !== undefined ? body.customerPhone : oldOrder.customerPhone,
          deliveryAddress,
          note: body.note !== undefined ? body.note : oldOrder.note,
          branchId: body.branchId !== undefined ? body.branchId : oldOrder.branchId,
          subTotal,
          shippingFee,
          discountAmount,
          totalAmount,
          paymentMethod,
          cashAmount,
          transferAmount,
          paymentStatus,
          status,
          shippedAt,
          completedAt,
          paidAt,
          // TUYỆT ĐỐI KHÔNG GHI ĐÈ createdAt
          items: {
            create: formattedItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { items: true },
      });

      return order;
    });

    // Revalidate shifts and orders
    try {
      revalidatePath('/admin/shifts');
      revalidatePath('/admin/shifts/active');
      revalidatePath('/admin/shifts/open-close');
      revalidatePath('/admin/shift-pos');
      revalidatePath('/admin/orders');
    } catch (e) {}

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Lỗi cập nhật đơn hàng:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi hệ thống khi cập nhật đơn hàng' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Lọc bỏ triệt để createdAt / created_at ra khỏi payload update để không bao giờ bị ghi đè ngày tạo gốc
    const { createdAt, created_at, id: _id, ...cleanBody } = body;
    const { status, paymentStatus, autoMarkPaid, paymentMethod, cashAmount, transferAmount, carrierName, driverName, driverPhone, trackingUrl } = cleanBody;

    // Tìm đơn hàng theo id gốc hoặc mã đơn orderCode (DH-XXXXX)
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderCode: id },
          { orderCode: `DH-${id}` },
        ],
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;
    const userRole = (userPayload?.role || '').toUpperCase();
    const isKitchen = userRole === 'KITCHEN' || userRole === 'CHEF' || userRole === 'BEP';
    const isTelesales = userRole === 'TELESALES' || userRole === 'CS' || userRole === 'TONG_DAI';

    if (isKitchen) {
      if (status === 'CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'Nhân viên Bếp không có quyền hủy đơn hàng!' },
          { status: 403 }
        );
      }
      if (paymentStatus !== undefined || autoMarkPaid) {
        return NextResponse.json(
          { success: false, error: 'Nhân viên Bếp không có quyền thay đổi trạng thái thanh toán!' },
          { status: 403 }
        );
      }
    }

    if (isTelesales) {
      if (paymentStatus !== undefined || autoMarkPaid) {
        return NextResponse.json(
          { success: false, error: 'Nhân viên Tổng Đài không có quyền thay đổi trạng thái thanh toán!' },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'DELIVERING') {
        updateData.shippedAt = new Date();
      }
      if (status === 'COMPLETED' || status === 'DELIVERED') {
        updateData.completedAt = existingOrder.completedAt || new Date();
      }
      if (status === 'CANCELLED') {
        const cancelReason = cleanBody.cancelReason || cleanBody.note;
        if (cancelReason) {
          updateData.note = existingOrder.note 
            ? `${existingOrder.note} [Lý do hủy: ${cancelReason}]`
            : `[Lý do hủy: ${cancelReason}]`;
        }
      }
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === 'PAID') {
        updateData.paidAt = existingOrder.paidAt || new Date();
      }
    }
    if (autoMarkPaid) {
      updateData.paymentStatus = 'PAID';
      updateData.paidAt = existingOrder.paidAt || new Date();
    }

    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
      const effectiveTotal = existingOrder.totalAmount || 0;
      if (paymentMethod === 'BANK_TRANSFER') {
        updateData.cashAmount = 0;
        updateData.transferAmount = effectiveTotal;
      } else if (paymentMethod === 'SPLIT') {
        const cAmount = Math.min(effectiveTotal, Number(cashAmount) || 0);
        updateData.cashAmount = cAmount;
        updateData.transferAmount = Math.max(0, effectiveTotal - cAmount);
      } else {
        updateData.cashAmount = effectiveTotal;
        updateData.transferAmount = 0;
      }
    } else if (cashAmount !== undefined || transferAmount !== undefined) {
      if (cashAmount !== undefined) updateData.cashAmount = Number(cashAmount) || 0;
      if (transferAmount !== undefined) updateData.transferAmount = Number(transferAmount) || 0;
    }

    if (carrierName !== undefined) updateData.carrierName = carrierName;
    if (driverName !== undefined) updateData.driverName = driverName;
    if (driverPhone !== undefined) updateData.driverPhone = driverPhone;
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;

    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: { items: true },
    });

    // Revalidate shifts and orders
    try {
      revalidatePath('/admin/shifts');
      revalidatePath('/admin/shifts/active');
      revalidatePath('/admin/shifts/open-close');
      revalidatePath('/admin/shift-pos');
      revalidatePath('/admin/orders');
    } catch (e) {}

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft Delete - Bảo tồn dữ liệu đơn hàng (Chuyển trạng thái CANCELLED)
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    try {
      revalidatePath('/admin/shifts');
      revalidatePath('/admin/shifts/active');
      revalidatePath('/admin/shifts/open-close');
      revalidatePath('/admin/shift-pos');
      revalidatePath('/admin/orders');
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Đã hủy đơn hàng an toàn (Soft Delete)', order: cancelledOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
