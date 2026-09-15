import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month'); // YYYY-MM
    const branchId = searchParams.get('branchId') || 'all';
    const staffId = searchParams.get('staffId') || 'all';
    const statusParam = searchParams.get('status') || 'all';
    const logTypeParam = searchParams.get('logType') || 'all';

    const whereClause: any = {};

    if (monthParam) {
      whereClause.date = { startsWith: monthParam };
    } else if (dateParam) {
      whereClause.date = dateParam;
    }

    if (branchId !== 'all') {
      whereClause.branchId = branchId;
    }
    if (staffId !== 'all') {
      whereClause.staffId = staffId;
    }
    if (statusParam !== 'all') {
      whereClause.status = statusParam;
    }
    if (logTypeParam !== 'all') {
      whereClause.logType = logTypeParam;
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    let totalActualHours = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let manualCount = 0;

    attendanceRecords.forEach((a) => {
      // Only sum totalHours for completed shifts (where checkOutTime is not null)
      if (a.checkOutTime && a.totalHours) {
        totalActualHours += a.totalHours;
      }
      if (a.status === 'ON_TIME') onTimeCount++;
      if (a.status === 'LATE') lateCount++;
      if (a.status === 'EARLY_LEAVE') earlyLeaveCount++;
      if (a.logType === 'ADMIN_MANUAL') manualCount++;
    });

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords,
      summary: {
        totalCount: attendanceRecords.length,
        totalActualHours: Number(totalActualHours.toFixed(1)),
        onTimeCount,
        lateCount,
        earlyLeaveCount,
        lateOrEarlyCount: lateCount + earlyLeaveCount,
        manualCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, staffName, branchId, branchName, photoBase64, notes } = body;

    if (!staffId || !photoBase64) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn Tên nhân viên và chụp ảnh khuôn mặt trước khi chấm công!' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if staff member already checked in today
    const existing = await prisma.attendance.findFirst({
      where: {
        staffId,
        date: todayStr,
      },
    });

    if (existing) {
      const checkInTimeStr = existing.checkInTime
        ? new Date(existing.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '';
      return NextResponse.json(
        {
          success: false,
          error: `Nhân viên ${staffName} đã hoàn thành chấm công vào ca lúc ${checkInTimeStr} hôm nay! Ca làm việc được tự động ghi nhận kết thúc lúc 22:00.`,
        },
        { status: 400 }
      );
    }

    // Auto set check-out time to 22:00 of current day
    const defaultCheckOut = new Date(now);
    defaultCheckOut.setHours(22, 0, 0, 0);

    // Calculate total hours = (22:00 - checkInTime)
    const diffMs = Math.max(0, defaultCheckOut.getTime() - now.getTime());
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));

    // Determine status (ON_TIME or LATE)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let status = 'ON_TIME';
    if ((currentHour === 8 && currentMinute > 15) || (currentHour === 15 && currentMinute > 15) || currentHour > 15) {
      status = 'LATE';
    }

    const record = await prisma.attendance.create({
      data: {
        staffId,
        staffName,
        branchId: branchId || 'cs1',
        branchName: branchName || 'Cơ Sở Cầu Giấy',
        date: todayStr,
        checkInTime: now,
        checkInPhoto: photoBase64,
        checkOutTime: defaultCheckOut,
        totalHours,
        status,
        notes: notes || (status === 'LATE' ? 'Vào ca muộn (Tự động chốt 22:00)' : 'Chấm công vào ca (Tự động chốt 22:00)'),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vào ca thành công cho ${staffName}! Hệ thống tự động ghi nhận kết thúc lúc 22:00 (Tổng ${totalHours} giờ).`,
      record,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
