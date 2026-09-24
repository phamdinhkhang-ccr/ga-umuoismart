import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const INITIAL_BRANCHES = [
  {
    code: 'cs1',
    name: 'Cơ Sở Vin Smart city',
    city: 'Hà Nội',
    address: '6 - A20 Geleximco An Khánh - Tây Mỗ, Hoài Đức, Hà Nội',
    hotline: '0988.888.901',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Vin Smart City',
    googleMapsUrl: 'https://maps.google.com/?q=6+A20+Geleximco+An+Khanh+Tay+Mo+Ha+Noi',
    image: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'cs2',
    name: 'Cơ Sở Trần Cung - Cầu Giấy',
    city: 'Hà Nội',
    address: '5 - 208 Trần Cung, Q. Cầu Giấy, Hà Nội',
    hotline: '0988.888.902',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Trần Cung',
    googleMapsUrl: 'https://maps.google.com/?q=208+Tran+Cung+Cau+Giay+Ha+Noi',
    image: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'cs3',
    name: 'Cơ Sở Bán Đảo Linh Đàm',
    city: 'Hà Nội',
    address: 'Kiot 4 Nơ 7B Bán Đảo Linh Đàm, Q. Hoàng Mai, Hà Nội',
    hotline: '0988.888.903',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Linh Đàm',
    googleMapsUrl: 'https://maps.google.com/?q=Kiot+4+No+7B+Ban+Dao+Linh+Dam+Hoang+Mai+Ha+Noi',
    image: null,
    isActive: true,
    sortOrder: 3,
  },
  {
    code: 'cs4',
    name: 'Cơ Sở Hai Bà Trưng',
    city: 'Hà Nội',
    address: '51 Yên Lạc - Vĩnh Tuy, Q. Hai Bà Trưng, Hà Nội',
    hotline: '0988.888.904',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Hai Bà Trưng',
    googleMapsUrl: 'https://maps.google.com/?q=51+Yen+Lac+Vinh+Tuy+Hai+Ba+Trung+Ha+Noi',
    image: null,
    isActive: true,
    sortOrder: 4,
  },
  {
    code: 'cs5',
    name: 'Cơ Sở Vin Ocean Park 1',
    city: 'Hà Nội',
    address: 'SP10.11 Hải Âu 9 - Vin Ocean Park 1, Gia Lâm, Hà Nội',
    hotline: '0988.888.905',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Ocean Park 1',
    googleMapsUrl: 'https://maps.google.com/?q=Hai+Au+9+Vin+Ocean+Park+1+Gia+Lam+Ha+Noi',
    image: null,
    isActive: true,
    sortOrder: 5,
  },
  {
    code: 'cs6',
    name: 'Cơ Sở Vũng Tàu - HCM',
    city: 'Bà Rịa - Vũng Tàu',
    address: 'Phú Mỹ - Vũng Tàu',
    hotline: '0988.888.906',
    openingHours: '08:00 - 22:00',
    managerName: 'Quản lý Vũng Tàu',
    googleMapsUrl: 'https://maps.google.com/?q=Phu+My+Ba+Ria+Vung+Tau',
    image: null,
    isActive: true,
    sortOrder: 6,
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const status = searchParams.get('status') || ''; // 'active', 'closed', ''

    let count = await prisma.branch.count();

    // Auto-seed if database is empty
    if (count === 0) {
      await prisma.branch.createMany({
        data: INITIAL_BRANCHES,
      });
    }

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
