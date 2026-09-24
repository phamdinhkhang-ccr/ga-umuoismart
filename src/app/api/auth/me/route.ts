import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const branchIds =
      payload.branchIds && Array.isArray(payload.branchIds) && payload.branchIds.length > 0
        ? payload.branchIds
        : payload.branchId
        ? [payload.branchId]
        : [];

    return new NextResponse(
      JSON.stringify({
        success: true,
        user: {
          userId: payload.userId,
          username: payload.username,
          fullName: payload.fullName,
          role: payload.role,
          branchId: payload.branchId,
          branchIds,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
