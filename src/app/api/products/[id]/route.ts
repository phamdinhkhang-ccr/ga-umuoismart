import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy món ăn' }, { status: 404 });
    }

    const newStockState = body.isAvailable !== undefined ? Boolean(body.isAvailable) : !existing.isAvailable;

    const updated = await prisma.product.update({
      where: { id },
      data: { isAvailable: newStockState },
      include: { category: true },
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: `Đã chuyển trạng thái kho sang ${newStockState ? 'Còn Hàng' : 'Hết Hàng'}`,
    });
  } catch (error: any) {
    console.error('API PATCH /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi đổi trạng thái kho' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.costPrice !== undefined) updateData.costPrice = Number(body.costPrice);
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isBestSeller !== undefined) updateData.isBestSeller = Boolean(body.isBestSeller);
    if (body.categoryId) updateData.categoryId = body.categoryId;
    if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.batchCode !== undefined) updateData.batchCode = body.batchCode;
    if (body.aiKeywords !== undefined) updateData.aiKeywords = body.aiKeywords;
    if (body.unit !== undefined) updateData.unit = body.unit;

    if (body.stockQuantity !== undefined) {
      const qty = Math.max(0, Number(body.stockQuantity));
      updateData.stockQuantity = qty;
      updateData.isAvailable = qty === 0 ? false : (body.isAvailable !== undefined ? Boolean(body.isAvailable) : true);
    } else if (body.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(body.isAvailable);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    // 2-Way Sync to InventoryItem
    if (body.stockQuantity !== undefined || body.name) {
      try {
        const invItem = await prisma.inventoryItem.findFirst({ where: { name: updated.name } });
        if (invItem) {
          await prisma.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              ...(body.stockQuantity !== undefined && { currentQuantity: Math.max(0, Number(body.stockQuantity)) }),
              ...(body.unit && { unit: body.unit }),
            },
          });
        }
      } catch (e) {
        console.error('Inventory sync error:', e);
      }
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('API PUT /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi cập nhật món ăn' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Đã xóa món ăn thành công' });
  } catch (error: any) {
    console.error('API DELETE /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi xóa món ăn' },
      { status: 500 }
    );
  }
}
