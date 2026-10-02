import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Tên danh mục là bắt buộc' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const category = await prisma.category.create({
      data: { name, slug, description, isActive: true },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, isActive } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'Thiếu ID hoặc Tên danh mục' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const updateData: any = { name, slug, description };
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu ID' }, { status: 400 });

    const activeProdCount = await prisma.product.count({
      where: { categoryId: id, isAvailable: true },
    });

    if (activeProdCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể xóa danh mục vì đang có ${activeProdCount} sản phẩm hoạt động. Vui lòng ẩn hoặc đổi danh mục của sản phẩm trước.`,
        },
        { status: 400 }
      );
    }

    // Soft Delete - Bảo tồn dữ liệu tuyệt đối (Zero Data Loss)
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Đã ẩn danh mục an toàn (Soft Delete)' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
