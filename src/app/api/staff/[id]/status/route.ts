import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isActive } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
      include: { branch: true },
    });

    return NextResponse.json({
      success: true,
      staff: updatedUser,
      message: `Đã ${updatedUser.isActive ? 'kích hoạt' : 'tạm khóa'} tài khoản nhân viên!`,
    });
  } catch (error: any) {
    console.error('Error toggling staff status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
