import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const receipt = await prisma.inventoryReceipt.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu nhập kho' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
