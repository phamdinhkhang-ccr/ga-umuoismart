import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const DEFAULT_SHIFTS = [
  { shiftType: 'SANG', shiftName: 'Ca Sáng', startTime: '06:00', endTime: '11:30' },
  { shiftType: 'TRUA', shiftName: 'Ca Trưa', startTime: '11:30', endTime: '17:00' },
  { shiftType: 'TOI', shiftName: 'Ca Tối', startTime: '17:00', endTime: '23:00' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const branchesSetting = await prisma.setting.findUnique({
      where: { key: 'CMS_BRANCHES_JSON' },
    });

    let branchIds = ['cs1', 'cs2', 'cs3', 'cs4', 'cs5', 'cs6'];
    if (branchesSetting && branchesSetting.value) {
      try {
        const parsed = JSON.parse(branchesSetting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          branchIds = parsed.map((b: any, idx: number) => b.id || `cs${idx + 1}`);
        }
      } catch (e) {}
    }

    const targetBranchIds = branchId && branchId !== 'all' ? [branchId] : branchIds;

    // Check existing configs
    const existingConfigs = await prisma.branchShiftConfig.findMany({
      where: {
        branchId: { in: targetBranchIds },
      },
      orderBy: { startTime: 'asc' },
    });

    // If missing for any branch, seed defaults
    const configsByBranch: Record<string, any[]> = {};
    existingConfigs.forEach((c) => {
      if (!configsByBranch[c.branchId]) configsByBranch[c.branchId] = [];
      configsByBranch[c.branchId].push(c);
    });

    const newConfigsToCreate: any[] = [];
    for (const bId of targetBranchIds) {
      if (!configsByBranch[bId] || configsByBranch[bId].length === 0) {
        for (const def of DEFAULT_SHIFTS) {
          newConfigsToCreate.push({
            branchId: bId,
            shiftType: def.shiftType,
            shiftName: def.shiftName,
            startTime: def.startTime,
            endTime: def.endTime,
          });
        }
      }
    }

    if (newConfigsToCreate.length > 0) {
      for (const item of newConfigsToCreate) {
        try {
          const created = await prisma.branchShiftConfig.create({
            data: item,
          });
          if (!configsByBranch[item.branchId]) configsByBranch[item.branchId] = [];
          configsByBranch[item.branchId].push(created);
        } catch (e) {}
      }
    }

    const allConfigs = await prisma.branchShiftConfig.findMany({
      where: {
        branchId: { in: targetBranchIds },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      success: true,
      configs: allConfigs,
      defaultShifts: DEFAULT_SHIFTS,
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
        { success: false, error: 'Chỉ Admin hoặc Quản lý mới có quyền cấu hình ca làm việc.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { branchId, shiftType, shiftName, startTime, endTime } = body;

    if (!branchId || !shiftType || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin chi nhánh, loại ca hoặc khung giờ!' },
        { status: 400 }
      );
    }

    const upserted = await prisma.branchShiftConfig.upsert({
      where: {
        branchId_shiftType: {
          branchId,
          shiftType,
        },
      },
      update: {
        shiftName: shiftName || (shiftType === 'SANG' ? 'Ca Sáng' : shiftType === 'TRUA' ? 'Ca Trưa' : 'Ca Tối'),
        startTime,
        endTime,
      },
      create: {
        branchId,
        shiftType,
        shiftName: shiftName || (shiftType === 'SANG' ? 'Ca Sáng' : shiftType === 'TRUA' ? 'Ca Trưa' : 'Ca Tối'),
        startTime,
        endTime,
      },
    });

    return NextResponse.json({
      success: true,
      config: upserted,
      message: `Đã cập nhật khung giờ ${upserted.shiftName} (${upserted.startTime} - ${upserted.endTime}) thành công!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
