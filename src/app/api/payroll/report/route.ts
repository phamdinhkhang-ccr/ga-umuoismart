import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = 'ADMIN';
    let userBranchId: string | null = null;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        userRole = payload.role || 'ADMIN';
        userBranchId = payload.branchId || null;
      }
    }

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'TELESALES') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền truy cập Báo Cáo Lương & Chấm Công.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const fromDateParam = searchParams.get('fromDate');
    const toDateParam = searchParams.get('toDate');
    let branchId = searchParams.get('branchId') || 'all';
    const userId = searchParams.get('userId');

    // Force branch lock for MANAGER
    if (userRole === 'MANAGER' && userBranchId) {
      branchId = userBranchId;
    }

    // Determine date range
    let fromDate = fromDateParam;
    let toDate = toDateParam;

    if (!fromDate || !toDate) {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const [yearStr, monthStr] = targetMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);

      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);

      fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
      toDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    }

    // Fetch Branch Name Map
    const branchesSetting = await prisma.setting.findUnique({
      where: { key: 'CMS_BRANCHES_JSON' },
    });

    let branchList = [
      { id: 'cs1', name: 'Cơ Sở Cầu Giấy', badge: 'CƠ SỞ 01' },
      { id: 'cs2', name: 'Cơ Sở Đống Đa', badge: 'CƠ SỞ 02' },
      { id: 'cs3', name: 'Cơ Sở Hai Bà Trưng', badge: 'CƠ SỞ 03' },
      { id: 'cs4', name: 'Cơ Sở Thanh Xuân', badge: 'CƠ SỞ 04' },
      { id: 'cs5', name: 'Cơ Sở Tây Hồ', badge: 'CƠ SỞ 05' },
      { id: 'cs6', name: 'Cơ Sở Nam Từ Liêm', badge: 'CƠ SỞ 06' },
    ];

    if (branchesSetting && branchesSetting.value) {
      try {
        const parsed = JSON.parse(branchesSetting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          branchList = parsed.map((b: any, idx: number) => ({
            id: b.id || `cs${idx + 1}`,
            name: b.name || `Cơ Sở ${b.district || idx + 1}`,
            badge: b.badge || `CƠ SỞ 0${idx + 1}`,
          }));
        }
      } catch (e) {}
    }

    const branchNameMap: Record<string, string> = {};
    branchList.forEach((b) => {
      branchNameMap[b.id] = b.name;
    });

    // Fetch users (with salaryConfig and branch)
    const userWhere: any = {};
    if (branchId && branchId !== 'all') {
      userWhere.branchId = branchId;
    }
    if (userId && userId !== 'all') {
      userWhere.id = userId;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        branch: true,
        salaryConfig: true,
      },
      orderBy: { staffCode: 'asc' },
    });

    // Fetch Attendance records in date range
    const attendanceWhere: any = {
      date: {
        gte: fromDate,
        lte: toDate,
      },
      status: {
        not: 'REJECTED',
      },
    };
    if (branchId && branchId !== 'all') {
      attendanceWhere.branchId = branchId;
    }
    if (userId && userId !== 'all') {
      attendanceWhere.userId = userId;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: attendanceWhere,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    // Group records by user/staff
    const recordsByUser: Record<string, any[]> = {};
    records.forEach((r) => {
      const uKey = r.userId || r.staffName;
      if (!recordsByUser[uKey]) recordsByUser[uKey] = [];
      recordsByUser[uKey].push(r);
    });

    // Also check legacy Attendance records if any are missing
    const legacyRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    // Calculate payroll per staff
    const staffPayrollList: any[] = [];
    let grandTotalPayroll = 0;
    let grandTotalGross = 0;
    let grandTotalAllowance = 0;
    let grandTotalHours = 0;
    let grandTotalShifts = 0;

    users.forEach((u) => {
      const uRecords = recordsByUser[u.id] || recordsByUser[u.name] || [];
      const salaryType = u.salaryConfig?.salaryType || 'HOURLY';
      const baseRate = u.salaryConfig?.baseRate || 25000;
      const defaultAllowance = u.salaryConfig?.allowance || 0;

      let totalHours = 0;
      let totalShifts = 0;
      let totalAllowance = 0;
      let grossSalary = 0;

      const dailyRecords = uRecords.map((r) => {
        totalHours += r.workHours || 0;
        totalShifts += r.workShifts || 1;
        totalAllowance += r.allowance || 0;

        let recordPay = 0;
        if (salaryType === 'HOURLY') {
          recordPay = Math.round((r.workHours || 0) * (r.baseRate || baseRate));
        } else if (salaryType === 'PER_SHIFT') {
          recordPay = Math.round((r.workShifts || 1) * (r.baseRate || baseRate));
        } else if (salaryType === 'MONTHLY') {
          recordPay = Math.round(((r.baseRate || baseRate) / 26) * (r.workShifts || 1));
        }
        grossSalary += recordPay;

        return {
          id: r.id,
          date: r.date,
          shiftType: r.shiftType || 'SANG',
          checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-',
          checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-',
          workHours: r.workHours || 0,
          workShifts: r.workShifts || 1,
          baseRate: r.baseRate || baseRate,
          earnedSalary: recordPay,
          allowance: r.allowance || 0,
          earnedAmount: recordPay + (r.allowance || 0),
          status: r.status,
          note: r.note || '',
        };
      });

      // If monthly and worked full month
      if (salaryType === 'MONTHLY' && dailyRecords.length > 0) {
        grossSalary = Math.round(baseRate * Math.min(1, totalShifts / 26));
      }

      const netIncome = grossSalary + totalAllowance;

      grandTotalPayroll += netIncome;
      grandTotalGross += grossSalary;
      grandTotalAllowance += totalAllowance;
      grandTotalHours += totalHours;
      grandTotalShifts += totalShifts;

      const branchName = branchNameMap[u.branchId || 'cs1'] || u.branch?.name || 'Cơ sở';

      staffPayrollList.push({
        userId: u.id,
        staffCode: u.staffCode,
        name: u.name,
        role: u.role,
        phone: u.phone,
        branchId: u.branchId || 'cs1',
        branchName,
        salaryType,
        baseRate,
        defaultAllowance,
        totalWorkDays: dailyRecords.length,
        totalHours: Number(totalHours.toFixed(1)),
        totalShifts: Number(totalShifts.toFixed(1)),
        grossSalary,
        totalAllowance,
        netIncome,
        dailyRecords,
      });
    });

    // Sort by Net Income descending
    staffPayrollList.sort((a, b) => b.netIncome - a.netIncome);

    return NextResponse.json({
      success: true,
      period: {
        fromDate,
        toDate,
        month,
      },
      branchId,
      branchList,
      summary: {
        totalStaffCount: users.length,
        activeStaffCount: staffPayrollList.filter((s) => s.totalWorkDays > 0).length,
        totalHours: Number(grandTotalHours.toFixed(1)),
        totalShifts: Number(grandTotalShifts.toFixed(1)),
        totalGrossSalary: grandTotalGross,
        totalAllowance: grandTotalAllowance,
        totalPayroll: grandTotalPayroll,
      },
      staffPayroll: staffPayrollList,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
