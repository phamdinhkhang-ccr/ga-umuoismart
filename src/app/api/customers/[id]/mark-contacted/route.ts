import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        lastContactedAt: new Date(),
        contactCount: { increment: 1 },
        reorderNotes: notes || customer.reorderNotes || 'Đã gửi Zalo remarketing khôi phục đơn',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã đánh dấu đã gửi Zalo chăm sóc cho ${updatedCustomer.name}!`,
      customer: updatedCustomer,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
