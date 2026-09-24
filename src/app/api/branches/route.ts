import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma, ensureDbInitialized } from '@/lib/prisma';

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

    let branches;
    try {
      branches = await prisma.branch.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      });
    } catch (dbErr: any) {
      if (dbErr?.code === 'P2021' || dbErr?.message?.includes('does not exist')) {
        console.warn('Branch table missing in GET, running ensureDbInitialized() auto-recovery...');
        await ensureDbInitialized();
        branches = await prisma.branch.findMany({
          where,
          orderBy: { sortOrder: 'asc' },
        });
      } else {
        throw dbErr;
      }
    }

    const totalCount = branches.length;
    const activeCount = branches.filter((b) => b.isActive).length;
    const closedCount = branches.filter((b) => !b.isActive).length;

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
      { success: false, message: error?.message || 'Lỗi server khi tải danh sách cơ sở' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      city,
      address,
      hotline,
      openingHours,
      managerName,
      googleMapsUrl,
      image,
      imageUrl,
      isActive,
      code,
    } = body;

    const cleanName = (name || '').trim();
    const cleanAddress = (address || '').trim();
    const cleanHotline = (hotline || '').trim();
    const cleanCode = (code || '').trim();

    if (!cleanName || !cleanAddress || !cleanHotline) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ Tên cơ sở, Địa chỉ và Hotline' },
        { status: 400 }
      );
    }

    const executeSave = async () => {
      // 1. Check for existing branch by Code or exact Name (Conflict / Upsert logic)
      let existingBranch = null;
      if (cleanCode || cleanName) {
        existingBranch = await prisma.branch.findFirst({
          where: {
            OR: [
              ...(cleanCode
                ? [
                    { code: cleanCode },
                    { code: cleanCode.toLowerCase() },
                    { code: cleanCode.toUpperCase() },
                  ]
                : []),
              ...(cleanName ? [{ name: cleanName }] : []),
            ],
          },
        });
      }

      const branchData = {
        name: cleanName,
        city: (city || '').trim() || 'Hà Nội',
        address: cleanAddress,
        hotline: cleanHotline,
        openingHours: (openingHours || '').trim() || '08:00 - 22:30',
        managerName: (managerName || '').trim() || 'Quản lý cơ sở',
        googleMapsUrl: (googleMapsUrl || '').trim() || null,
        image: image || imageUrl || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      };

      let targetBranch;

      if (existingBranch) {
        // Update existing branch if code or name matched
        targetBranch = await prisma.branch.update({
          where: { id: existingBranch.id },
          data: {
            ...branchData,
            code: cleanCode || existingBranch.code,
          },
        });
      } else {
        const count = await prisma.branch.count();
        const finalCode = cleanCode || `cs${count + 1}`;
        targetBranch = await prisma.branch.create({
          data: {
            ...branchData,
            code: finalCode,
            sortOrder: count + 1,
          },
        });
      }

      // 2. Auto-initialize empty inventory (BranchInventory) for all existing products
      try {
        const products = await prisma.product.findMany({ select: { id: true } });
        if (products && products.length > 0) {
          for (const prod of products) {
            await prisma.branchInventory.upsert({
              where: {
                productId_branchId: {
                  productId: prod.id,
                  branchId: targetBranch.id,
                },
              },
              update: {},
              create: {
                productId: prod.id,
                branchId: targetBranch.id,
                stock: 0,
              },
            });
          }
        }
      } catch (invErr: any) {
        console.warn('[BRANCH_INV] Notice creating initial branch inventories:', invErr?.message);
      }

      return { targetBranch, isUpdate: Boolean(existingBranch) };
    };

    let result;
    try {
      result = await executeSave();
    } catch (saveErr: any) {
      if (saveErr?.code === 'P2021' || saveErr?.message?.includes('does not exist')) {
        console.warn('Branch table missing in POST, running ensureDbInitialized() auto-recovery...');
        await ensureDbInitialized();
        result = await executeSave();
      } else {
        throw saveErr;
      }
    }

    try {
      revalidatePath('/');
      revalidatePath('/admin/branches');
      revalidatePath('/admin/store');
      revalidatePath('/admin/inventory/import');
      revalidatePath('/admin/inventory/export');
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/checkout');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      branch: result.targetBranch,
      message: result.isUpdate ? 'Cập nhật thông tin cơ sở thành công' : 'Tạo cơ sở mới thành công',
    });
  } catch (error: any) {
    console.error('API POST /api/branches error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Lỗi server khi tạo cơ sở mới',
      },
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
