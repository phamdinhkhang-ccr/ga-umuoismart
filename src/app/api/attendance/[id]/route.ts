import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      branchId,
      branchName,
      date,
      checkInTimeStr,
      checkOutTimeStr,
      status,
      notes,
    } = body;

    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản ghi chấm công!' },
        { status: 404 }
      );
    }

    const recordDate = date || existing.date;
    let checkInTime: Date | null = existing.checkInTime;
    let checkOutTime: Date | null = existing.checkOutTime;

    if (checkInTimeStr) {
      const [h, m] = checkInTimeStr.split(':').map(Number);
      const d = new Date(recordDate);
      d.setHours(h, m, 0, 0);
      checkInTime = d;
    }

    if (checkOutTimeStr) {
      const [h, m] = checkOutTimeStr.split(':').map(Number);
      const d = new Date(recordDate);
      d.setHours(h, m, 0, 0);
      checkOutTime = d;
    }

    let totalHours: number | null = existing.totalHours;
    if (checkInTime && checkOutTime) {
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      totalHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));
    }

    const branchesMap: Record<string, string> = {
      cs1: 'Cơ Sở Cầu Giấy',
      cs2: 'Cơ Sở Đống Đa',
      cs3: 'Cơ Sở Hai Bà Trưng',
      cs4: 'Cơ Sở Thanh Xuân',
      cs5: 'Cơ Sở Tây Hồ',
      cs6: 'Cơ Sở Nam Từ Liêm',
    };

    const updatedBranchName = branchName || (branchId ? branchesMap[branchId] : existing.branchName);

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        branchId: branchId || existing.branchId,
        branchName: updatedBranchName,
        date: recordDate,
        checkInTime,
        checkOutTime,
        totalHours,
        status: status || existing.status,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật bản ghi chấm công thành công!',
      record: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing || !existing.checkInTime) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản ghi hoặc bản ghi chưa check-in!' },
        { status: 400 }
      );
    }

    const checkOutTime = new Date();
    const diffMs = checkOutTime.getTime() - new Date(existing.checkInTime).getTime();
    const totalHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkOutTime,
        totalHours,
        notes: existing.notes ? `${existing.notes} (Chốt ca nhanh bởi Admin)` : 'Chốt ca nhanh bởi Admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã chốt giờ ra nhanh thành công!',
      record: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản ghi chấm công!' },
        { status: 404 }
      );
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa bản ghi chấm công thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
