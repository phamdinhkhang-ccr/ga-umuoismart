import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exportRecord = await prisma.inventoryExport.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!exportRecord) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiếu xuất kho!' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      exportRecord,
    });
  } catch (error: any) {
    console.error('Error fetching inventory export detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
