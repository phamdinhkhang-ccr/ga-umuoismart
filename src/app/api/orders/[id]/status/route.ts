import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    const { id } = await params;
    const body = await request.json();
    // Strip createdAt / created_at payload to lock creation date from modification
    const { createdAt, created_at, id: _id, ...cleanBody } = body;
    const {
      status,
      paymentStatus,
      autoMarkPaid,
      discountAmount,
      paymentMethod,
      cashAmount,
      transferAmount,
      carrierName,
      driverName,
      driverPhone,
      trackingUrl,
    } = cleanBody;

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderCode: id },
          { orderCode: `DH-${id}` },
        ],
      },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
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
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === 'PAID') {
        updateData.paidAt = existingOrder.paidAt || new Date();
      }
    } else if (autoMarkPaid) {
      updateData.paymentStatus = 'PAID';
      updateData.paidAt = existingOrder.paidAt || new Date();
    }

    // Handle Manual Discount & Recalculate Totals
    let newDiscount = existingOrder.discountAmount || 0;
    if (discountAmount !== undefined) {
      newDiscount = Number(discountAmount) || 0;
      updateData.discountAmount = newDiscount;

      const subTotal = existingOrder.subTotal || existingOrder.items.reduce((s, i) => s + i.subtotal, 0);
      const shipFee = existingOrder.shippingFee || 0;
      const newTotal = Math.max(0, subTotal + shipFee - newDiscount);
      updateData.totalAmount = newTotal;
    }

    const effectiveTotal = updateData.totalAmount !== undefined ? updateData.totalAmount : existingOrder.totalAmount;

    // Handle Payment Method & Split Cash/Transfer Amounts
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;

      if (paymentMethod === 'BANK_TRANSFER') {
        updateData.cashAmount = 0;
        updateData.transferAmount = effectiveTotal;
      } else if (paymentMethod === 'SPLIT') {
        const cAmount = Math.min(effectiveTotal, Number(cashAmount) || 0);
        updateData.cashAmount = cAmount;
        updateData.transferAmount = Math.max(0, effectiveTotal - cAmount);
      } else {
        // CASH or COD
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

    if (userPayload) {
      updateData.confirmedById = userPayload.username || userPayload.fullName || 'Thu ngân POS';
    }

    // Attach active shift for branch if not already linked
    if (!existingOrder.shiftId && existingOrder.branchId) {
      const activeShift = await prisma.shift.findFirst({
        where: { status: 'OPEN', branchId: existingOrder.branchId },
        orderBy: { createdAt: 'desc' },
      });
      if (activeShift) {
        updateData.shiftId = activeShift.id;
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
