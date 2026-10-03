import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = 'ADMIN';

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) userRole = payload.role || 'ADMIN';
    }

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'TELESALES') {
      return NextResponse.json(
        { success: false, error: 'Chỉ Admin hoặc Quản lý mới có quyền điều chỉnh công.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      workHours,
      workShifts,
      status,
      allowance,
      note,
      checkInTimeStr,
      checkOutTimeStr,
      shiftType,
    } = body;

    const existing = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: { user: { include: { salaryConfig: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bản ghi chấm công!' },
        { status: 404 }
      );
    }

    const baseRate = existing.baseRate || existing.user?.salaryConfig?.baseRate || 25000;
    const salaryType = existing.salaryType || existing.user?.salaryConfig?.salaryType || 'HOURLY';

    const newHours = workHours !== undefined ? Number(workHours) : existing.workHours;
    const newShifts = workShifts !== undefined ? Number(workShifts) : existing.workShifts;
    const newAllowance = allowance !== undefined ? Number(allowance) : existing.allowance || 0;

    let newEarned = 0;
    if (salaryType === 'HOURLY') {
      newEarned = Math.round(newHours * baseRate);
    } else if (salaryType === 'PER_SHIFT') {
      newEarned = Math.round(newShifts * baseRate);
    } else if (salaryType === 'MONTHLY') {
      newEarned = Math.round((baseRate / 26) * (newShifts >= 1 ? 1 : newShifts));
    }
    newEarned += newAllowance;

    let updatedCheckIn = existing.checkIn;
    let updatedCheckOut = existing.checkOut;

    if (checkInTimeStr) {
      updatedCheckIn = new Date(`${existing.date}T${checkInTimeStr}:00`);
    }
    if (checkOutTimeStr) {
      updatedCheckOut = new Date(`${existing.date}T${checkOutTimeStr}:00`);
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        workHours: newHours,
        workShifts: newShifts,
        allowance: newAllowance,
        earnedAmount: newEarned,
        status: status || existing.status,
        note: note !== undefined ? note : existing.note,
        shiftType: shiftType || existing.shiftType,
        checkIn: updatedCheckIn,
        checkOut: updatedCheckOut,
      },
    });

    return NextResponse.json({
      success: true,
      record: updated,
      message: 'Cập nhật bản ghi chấm công thành công!',
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
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = 'ADMIN';

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) userRole = payload.role || 'ADMIN';
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Chỉ Quản trị viên cấp cao mới có quyền từ chối bản ghi công.' },
        { status: 403 }
      );
    }

    // Soft update status to REJECTED instead of hard delete to preserve historical integrity
    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        status: 'REJECTED',
        earnedAmount: 0,
        note: 'Đã hủy bản ghi công',
      },
    });

    return NextResponse.json({
      success: true,
      record: updated,
      message: 'Đã hủy duyệt bản ghi chấm công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
