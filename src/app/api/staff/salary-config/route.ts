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

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) userRole = payload.role || 'ADMIN';
    }

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'TELESALES') {
      return NextResponse.json(
        { success: false, error: 'Chỉ Admin hoặc Quản lý mới có quyền xem thông tin lương.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const users = await prisma.user.findMany({
      where: userId ? { id: userId } : {},
      include: {
        branch: true,
        salaryConfig: true,
      },
      orderBy: { staffCode: 'asc' },
    });

    const staffWithSalary = users.map((u) => {
      const config = u.salaryConfig || {
        salaryType: 'HOURLY',
        baseRate: 25000,
        allowance: 0,
        notes: '',
      };

      return {
        id: u.id,
        staffCode: u.staffCode,
        name: u.name,
        username: u.username,
        role: u.role,
        phone: u.phone,
        branchId: u.branchId,
        branchName: u.branch?.name || u.branchId || 'Cơ sở',
        isActive: u.isActive,
        salaryType: config.salaryType,
        baseRate: config.baseRate,
        allowance: config.allowance,
        notes: config.notes,
      };
    });

    return NextResponse.json({
      success: true,
      staff: staffWithSalary,
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

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'TELESALES') {
      return NextResponse.json(
        { success: false, error: 'Chỉ Admin hoặc Quản lý mới có quyền cài đặt thông tin lương.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, salaryType, baseRate, allowance, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã định danh nhân viên (userId)!' },
        { status: 400 }
      );
    }

    const numericBaseRate = Number(baseRate) || 0;
    const numericAllowance = Number(allowance) || 0;
    const validSalaryType = ['HOURLY', 'PER_SHIFT', 'MONTHLY'].includes(salaryType) ? salaryType : 'HOURLY';

    const updated = await prisma.staffSalaryConfig.upsert({
      where: { userId },
      update: {
        salaryType: validSalaryType,
        baseRate: numericBaseRate,
        allowance: numericAllowance,
        notes: notes || null,
      },
      create: {
        userId,
        salaryType: validSalaryType,
        baseRate: numericBaseRate,
        allowance: numericAllowance,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Cập nhật cấu hình lương nhân sự thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
