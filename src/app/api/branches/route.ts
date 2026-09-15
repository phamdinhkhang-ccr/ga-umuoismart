import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INITIAL_BRANCHES = [
  {
    code: 'cs1',
    name: 'CS Cầu Giấy - Hà Nội',
    city: 'Hà Nội',
    address: '123 Cầu Giấy, Q. Cầu Giấy, Hà Nội',
    hotline: '0988 123 456',
    openingHours: '08:00 - 22:30',
    managerName: 'Nguyễn Văn Anh',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'cs2',
    name: 'CS Hoàn Kiếm - Hà Nội',
    city: 'Hà Nội',
    address: '45 Lý Thường Kiệt, Q. Hoàn Kiếm, Hà Nội',
    hotline: '0988 234 567',
    openingHours: '08:00 - 23:00',
    managerName: 'Trần Thị Bình',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'cs3',
    name: 'CS Đống Đa - Hà Nội',
    city: 'Hà Nội',
    address: '88 Chùa Bộc, Q. Đống Đa, Hà Nội',
    hotline: '0988 345 678',
    openingHours: '08:00 - 22:00',
    managerName: 'Lê Văn Cường',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
    isActive: true,
    sortOrder: 3,
  },
  {
    code: 'cs4',
    name: 'CS Quận 1 - TP. HCM',
    city: 'TP. Hồ Chí Minh',
    address: '120 Nguyễn Trãi, Phường Bến Thành, Q.1, TP. Hồ Chí Minh',
    hotline: '0909 111 222',
    openingHours: '09:00 - 23:00',
    managerName: 'Phạm Hoàng Dũng',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=500&q=80',
    isActive: true,
    sortOrder: 4,
  },
  {
    code: 'cs5',
    name: 'CS Bình Thạnh - TP. HCM',
    city: 'TP. Hồ Chí Minh',
    address: '54 Đinh Bộ Lĩnh, P.26, Q. Bình Thạnh, TP. Hồ Chí Minh',
    hotline: '0909 333 444',
    openingHours: '08:30 - 22:30',
    managerName: 'Võ Thị Hương',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
    isActive: true,
    sortOrder: 5,
  },
  {
    code: 'cs6',
    name: 'CS Hai Bà Trưng - Hà Nội',
    city: 'Hà Nội',
    address: '210 Trần Khát Chân, Q. Hai Bà Trưng, Hà Nội',
    hotline: '0988 999 888',
    openingHours: '08:00 - 22:00',
    managerName: 'Đỗ Minh Triết',
    googleMapsUrl: 'https://maps.google.com',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=500&q=80',
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
