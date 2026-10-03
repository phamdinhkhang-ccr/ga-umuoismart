import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action = 'CONTACTED', notes, careStatus } = body;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    let updateData: any = {};

    if (action === 'RESET') {
      updateData = {
        careStatus: 'NEED_FOLLOW_UP',
        lastCareAt: null,
        reorderNotes: notes || 'Đã đặt lại trạng thái cần chăm sóc',
      };
    } else if (action === 'UPDATE_STATUS') {
      updateData = {
        careStatus: careStatus || 'NEW',
        reorderNotes: notes || customer.reorderNotes,
      };
    } else {
      // CONTACTED
      updateData = {
        careStatus: 'CONTACTED',
        lastCareAt: new Date(),
        lastContactedAt: new Date(),
        contactCount: { increment: 1 },
        reorderNotes: notes || customer.reorderNotes || 'Đã gửi Zalo chăm sóc khách hàng',
      };
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message:
        action === 'RESET'
          ? `Đã reset trạng thái chăm sóc cho khách hàng ${updatedCustomer.name}!`
          : `Đã cập nhật trạng thái chăm sóc Zalo cho ${updatedCustomer.name}!`,
      customer: updatedCustomer,
    });
  } catch (error: any) {
    console.error('Error updating customer care status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
