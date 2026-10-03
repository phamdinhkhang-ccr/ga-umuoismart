import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const month = searchParams.get('month'); // YYYY-MM
    const branchId = searchParams.get('branchId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let dateWhere: any = {};
    if (fromDate && toDate) {
      dateWhere = {
        gte: fromDate,
        lte: toDate,
      };
    } else if (month) {
      dateWhere = {
        startsWith: month,
      };
    }

    const where: any = {};
    if (Object.keys(dateWhere).length > 0) {
      where.date = dateWhere;
    }
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }
    if (userId && userId !== 'all') {
      where.userId = userId;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          include: {
            salaryConfig: true,
            branch: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Also check legacy Attendance records if AttendanceRecord has fewer records for backward compatibility
    const legacyAttendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      records,
      legacyCount: legacyAttendances.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = 'ADMIN';

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) userRole = payload.role || 'ADMIN';
    }

    const body = await request.json();
    const {
      userId,
      staffName,
      branchId,
      branchName,
      shiftId,
      shiftType,
      date,
      checkInTimeStr,
      checkOutTimeStr,
      workHours,
      workShifts,
      status,
      allowance,
      note,
      checkInPhoto,
      checkOutPhoto,
      logType,
    } = body;

    if (!staffName && !userId) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn nhân viên chấm công!' },
        { status: 400 }
      );
    }

    const recordDate = date || new Date().toISOString().split('T')[0];

    // Fetch user & salary config
    let matchedUser: any = null;
    if (userId) {
      matchedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { salaryConfig: true, branch: true },
      });
    }

    const finalStaffName = matchedUser?.name || staffName || 'Nhân viên';
    const finalStaffCode = matchedUser?.staffCode || null;
    const finalBranchId = branchId || matchedUser?.branchId || 'cs1';
    const finalBranchName = branchName || matchedUser?.branch?.name || 'Chi nhánh POS';

    const salaryType = matchedUser?.salaryConfig?.salaryType || 'HOURLY';
    const baseRate = matchedUser?.salaryConfig?.baseRate || 25000;
    const defaultAllowance = matchedUser?.salaryConfig?.allowance || 0;
    const finalAllowance = allowance !== undefined ? Number(allowance) : defaultAllowance;

    // Calculate hours
    let calcHours = Number(workHours) || 0;
    let inDate: Date | null = null;
    let outDate: Date | null = null;

    if (checkInTimeStr) {
      inDate = new Date(`${recordDate}T${checkInTimeStr}:00`);
    }
    if (checkOutTimeStr) {
      outDate = new Date(`${recordDate}T${checkOutTimeStr}:00`);
    }

    if (inDate && outDate && calcHours <= 0) {
      const diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs > 0) {
        calcHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
    }

    let calcShifts = Number(workShifts) || 0;
    if (calcShifts <= 0 && calcHours > 0) {
      calcShifts = Number((calcHours / 5.5).toFixed(1));
    }
    if (calcShifts <= 0) calcShifts = 1;

    // Calculate earnedAmount
    let earnedAmount = 0;
    if (salaryType === 'HOURLY') {
      earnedAmount = Math.round(calcHours * baseRate);
    } else if (salaryType === 'PER_SHIFT') {
      earnedAmount = Math.round(calcShifts * baseRate);
    } else if (salaryType === 'MONTHLY') {
      // Estimated daily rate = monthly / 26
      earnedAmount = Math.round((baseRate / 26) * (calcShifts >= 1 ? 1 : calcShifts));
    }
    earnedAmount += finalAllowance;

    const newRecord = await prisma.attendanceRecord.create({
      data: {
        userId: matchedUser?.id || null,
        staffName: finalStaffName,
        staffCode: finalStaffCode,
        branchId: finalBranchId,
        branchName: finalBranchName,
        shiftId: shiftId || null,
        shiftType: shiftType || 'SANG',
        date: recordDate,
        checkIn: inDate,
        checkOut: outDate,
        workHours: calcHours,
        workShifts: calcShifts,
        status: status || 'APPROVED',
        salaryType,
        baseRate,
        allowance: finalAllowance,
        earnedAmount,
        note: note || null,
        checkInPhoto: checkInPhoto || null,
        checkOutPhoto: checkOutPhoto || null,
        logType: logType || 'ADMIN_MANUAL',
      },
    });

    return NextResponse.json({
      success: true,
      record: newRecord,
      message: 'Ghi nhận chấm công thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
