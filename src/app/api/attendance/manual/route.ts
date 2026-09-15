import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      staffId,
      staffName,
      branchId,
      branchName,
      date, // YYYY-MM-DD
      checkInTimeStr, // HH:mm
      checkOutTimeStr, // HH:mm
      status = 'ON_TIME',
      notes,
    } = body;

    if (!staffId || !date || !notes) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền đầy đủ Tên nhân viên, Ngày làm việc và Ghi chú Admin!' },
        { status: 400 }
      );
    }

    let checkInTime: Date | null = null;
    let checkOutTime: Date | null = null;
    let totalHours: number | null = null;

    if (checkInTimeStr) {
      const [h, m] = checkInTimeStr.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      checkInTime = d;
    }

    if (checkOutTimeStr) {
      const [h, m] = checkOutTimeStr.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      checkOutTime = d;
    }

    if (checkInTime && checkOutTime) {
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      totalHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));
    }

    let resolvedBranchName = branchName || 'Cơ Sở Cầu Giấy';
    const branchesMap: Record<string, string> = {
      cs1: 'Cơ Sở Cầu Giấy',
      cs2: 'Cơ Sở Đống Đa',
      cs3: 'Cơ Sở Hai Bà Trưng',
      cs4: 'Cơ Sở Thanh Xuân',
      cs5: 'Cơ Sở Tây Hồ',
      cs6: 'Cơ Sở Nam Từ Liêm',
    };
    if (branchId && branchesMap[branchId]) {
      resolvedBranchName = branchesMap[branchId];
    }

    const record = await prisma.attendance.create({
      data: {
        staffId,
        staffName,
        branchId: branchId || 'cs1',
        branchName: resolvedBranchName,
        date,
        checkInTime,
        checkOutTime,
        totalHours,
        status,
        logType: 'ADMIN_MANUAL',
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm chấm công thủ công thành công cho nhân viên ${staffName}!`,
      record,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
