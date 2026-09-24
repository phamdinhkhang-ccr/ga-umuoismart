import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const status = searchParams.get('status') || ''; // 'active', 'closed', ''

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { hotline: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (city && city !== 'ALL') {
      where.city = city;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'closed') {
      where.isActive = false;
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    const totalCount = await prisma.branch.count();
    const activeCount = await prisma.branch.count({ where: { isActive: true } });
    const closedCount = await prisma.branch.count({ where: { isActive: false } });

    return NextResponse.json({
      success: true,
      branches,
      counts: {
        total: totalCount,
        active: activeCount,
        closed: closedCount,
      },
    });
  } catch (error: any) {
    console.error('API GET /api/branches error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi tải danh sách cơ sở' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, city, address, hotline, openingHours, managerName, googleMapsUrl, image, isActive, code } = body;

    if (!name || !address || !hotline) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ Tên cơ sở, Địa chỉ và Hotline' },
        { status: 400 }
      );
    }

    const count = await prisma.branch.count();
    const branchCode = code || `cs${count + 1}`;

    const newBranch = await prisma.branch.create({
      data: {
        code: branchCode,
        name,
        city: city || 'Hà Nội',
        address,
        hotline,
        openingHours: openingHours || '08:00 - 22:00',
        managerName: managerName || 'Quản lý cơ sở',
        googleMapsUrl: googleMapsUrl || null,
        image: image || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: count + 1,
      },
    });

    try {
      revalidatePath('/');
      revalidatePath('/admin/branches');
      revalidatePath('/admin/store');
      revalidatePath('/admin/inventory/import');
      revalidatePath('/admin/inventory/export');
      revalidatePath('/checkout');
    } catch (e) {}

    return NextResponse.json({ success: true, branch: newBranch });
  } catch (error: any) {
    console.error('API POST /api/branches error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi tạo cơ sở mới' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { reorderedItems } = body;

    if (Array.isArray(reorderedItems)) {
      for (const item of reorderedItems) {
        await prisma.branch.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }

      try {
        revalidatePath('/');
        revalidatePath('/admin/branches');
        revalidatePath('/admin/store');
        revalidatePath('/admin/inventory/import');
        revalidatePath('/admin/inventory/export');
        revalidatePath('/checkout');
      } catch (e) {}

      return NextResponse.json({ success: true, message: 'Đã cập nhật thứ tự sắp xếp thành công' });
    }

    return NextResponse.json({ success: false, message: 'Dữ liệu không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('API PUT /api/branches reorder error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi sắp xếp lại cơ sở' },
      { status: 500 }
    );
  }
}
