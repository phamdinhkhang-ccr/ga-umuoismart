import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const role = searchParams.get('role');
    const status = searchParams.get('status'); // 'ACTIVE', 'INACTIVE', 'ALL'
    const search = searchParams.get('search');

    const where: any = {};
    if (branchId && branchId !== 'ALL') {
      where.branchId = branchId;
    }
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { staffCode: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const staffList = await prisma.user.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedStaffList = staffList.map((u) => {
      let parsedBranchIds: string[] = [];
      try {
        if (u.branchIds) parsedBranchIds = JSON.parse(u.branchIds);
      } catch (e) {
        parsedBranchIds = [];
      }
      if ((!parsedBranchIds || parsedBranchIds.length === 0) && u.branchId) {
        parsedBranchIds = [u.branchId];
      }
      return {
        ...u,
        branchIds: parsedBranchIds,
      };
    });

    // Count statistics
    const totalCount = await prisma.user.count();
    const activeCount = await prisma.user.count({ where: { isActive: true } });
    const inactiveCount = await prisma.user.count({ where: { isActive: false } });

    return NextResponse.json({
      success: true,
      staff: formattedStaffList,
      counts: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching staff list:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, phone, role, branchId, branchIds, avatar } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Họ tên, Tên đăng nhập và Mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập này đã tồn tại trong hệ thống' },
        { status: 400 }
      );
    }

    // Auto generate Staff Code (NV-XXXX)
    const count = await prisma.user.count();
    const staffCode = `NV-${String(count + 101).padStart(4, '0')}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const assignedBranchIds: string[] = Array.isArray(branchIds)
      ? branchIds
      : (branchId ? [branchId] : ['cs1']);

    const primaryBranchId = assignedBranchIds.length > 0 ? assignedBranchIds[0] : (branchId || 'cs1');

    const newUser = await prisma.user.create({
      data: {
        staffCode,
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        phone: phone ? phone.trim() : null,
        role: role || 'CASHIER',
        branchId: primaryBranchId,
        branchIds: JSON.stringify(assignedBranchIds),
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
        isActive: true,
      },
      include: { branch: true },
    });

    return NextResponse.json({
      success: true,
      staff: {
        ...newUser,
        branchIds: assignedBranchIds,
      },
      message: 'Tạo tài khoản nhân viên thành công!',
    });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
