import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, username, password, phone, role, branchId, branchIds, avatar, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (username !== undefined) updateData.username = username.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (role !== undefined) updateData.role = role;

    if (branchIds !== undefined && Array.isArray(branchIds)) {
      updateData.branchIds = JSON.stringify(branchIds);
      if (branchIds.length > 0) {
        updateData.branchId = branchIds[0];
      }
    } else if (branchId !== undefined) {
      updateData.branchId = branchId;
      updateData.branchIds = JSON.stringify([branchId]);
    }

    if (avatar !== undefined) updateData.avatar = avatar;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { branch: true },
    });

    let parsedBranchIds: string[] = [];
    try {
      if (updatedUser.branchIds) parsedBranchIds = JSON.parse(updatedUser.branchIds);
    } catch (e) {
      parsedBranchIds = [];
    }
    if ((!parsedBranchIds || parsedBranchIds.length === 0) && updatedUser.branchId) {
      parsedBranchIds = [updatedUser.branchId];
    }

    return NextResponse.json({
      success: true,
      staff: {
        ...updatedUser,
        branchIds: parsedBranchIds,
      },
      message: 'Cập nhật thông tin nhân viên thành công!',
    });
  } catch (error: any) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài khoản nhân viên thành công',
    });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
