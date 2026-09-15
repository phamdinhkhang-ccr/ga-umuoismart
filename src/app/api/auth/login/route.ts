import { NextResponse } from 'next/server';
import prisma, { ensureDbInitialized } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();

    // Ensure database tables and default admin account exist
    await ensureDbInitialized();

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { username: cleanUsername.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ Admin.' },
        { status: 403 }
      );
    }

    let branchIds: string[] = [];
    try {
      if (user.branchIds) {
        branchIds = JSON.parse(user.branchIds);
      }
    } catch (e) {
      branchIds = [];
    }
    if ((!branchIds || branchIds.length === 0) && user.branchId) {
      branchIds = [user.branchId];
    }

    const token = await signJWT({
      userId: user.id,
      username: user.username,
      fullName: user.name,
      role: user.role,
      branchId: user.branchId,
      branchIds,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.name,
        role: user.role,
        branchId: user.branchId,
        branchIds,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("LOGIN_FATAL_ERROR:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Đã xảy ra lỗi máy chủ",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
    }, { status: 500 });
  }
}
