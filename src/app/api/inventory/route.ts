import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const branchId = searchParams.get('branchId') || 'all';
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all'; // alert, safe, all
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const whereClause: any = {};

    if (userPayload && userPayload.role === 'MANAGER' && userPayload.branchIds && userPayload.branchIds.length > 0) {
      if (branchId && branchId !== 'all' && userPayload.branchIds.includes(branchId)) {
        whereClause.branchId = branchId;
      } else {
        whereClause.branchId = { in: userPayload.branchIds };
      }
    } else if (userPayload && (userPayload.role === 'STAFF' || userPayload.role === 'CASHIER') && userPayload.branchId) {
      whereClause.branchId = userPayload.branchId;
    } else if (branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    if (category !== 'all') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { supplier: { contains: search } },
        { hotline: { contains: search } },
      ];
    }

    let items = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // If a specific branch is selected, map per-branch stock from BranchInventory
    if (branchId !== 'all') {
      const branchInventories = await prisma.branchInventory.findMany({
        where: { branchId },
        include: { product: true },
      });

      items = items.map((item) => {
        const prodMatch = branchInventories.find(
          (bi) => bi.product.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        const branchStock = prodMatch ? prodMatch.stock : (item.branchId === branchId ? item.currentQuantity : 0);
        return {
          ...item,
          currentQuantity: branchStock,
        };
      });
    }

    // Filter by Stock Status if requested
    if (status === 'alert' || lowStockOnly) {
      items = items.filter((item) => item.currentQuantity < item.minQuantity);
    } else if (status === 'safe') {
      items = items.filter((item) => item.currentQuantity >= item.minQuantity);
    }

    // Calculate KPI metrics based on filtered branch items
    const totalInventoryValue = items.reduce(
      (sum, i) => sum + i.currentQuantity * i.costPerUnit,
      0
    );
    const lowStockCount = items.filter((i) => i.currentQuantity < i.minQuantity).length;
    const safeCount = items.filter((i) => i.currentQuantity >= i.minQuantity).length;
    const totalItemsCount = items.length;

    return NextResponse.json({
      success: true,
      items,
      summary: {
        totalInventoryValue,
        totalItemsCount,
        lowStockCount,
        safeCount,
      },
      lowStockCount,
    });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    const body = await request.json();
    const {
      action = 'CREATE_ITEM',
      itemId,
      id,
      code,
      name,
      unit,
      category = 'Thịt gà & Phụ phẩm tươi',
      branchId = 'bep-tong',
      currentQuantity,
      minQuantity,
      costPerUnit,
      supplier,
      hotline,
      type,
      quantity,
      note,
    } = body;

    const effectiveBranchId = (userPayload && userPayload.role !== 'ADMIN' && userPayload.branchId)
      ? userPayload.branchId
      : (branchId || 'bep-tong');

    const targetId = itemId || id;

    // Action 1: Create New Inventory Item
    if (action === 'CREATE_ITEM') {
      if (!name || !unit) {
        return NextResponse.json(
          { success: false, error: 'Tên vật tư và đơn vị tính là bắt buộc!' },
          { status: 400 }
        );
      }

      const generatedCode = code || `#VT-${Math.floor(1000 + Math.random() * 9000)}`;

      const item = await prisma.inventoryItem.create({
        data: {
          code: generatedCode,
          name,
          unit,
          category,
          branchId: effectiveBranchId,
          currentQuantity: Number(currentQuantity) || 0,
          minQuantity: Number(minQuantity) || 5,
          costPerUnit: Number(costPerUnit) || 0,
          supplier: supplier || 'Nhà cung cấp',
          hotline: hotline || '0988.888.999',
        },
      });

      return NextResponse.json({ success: true, item, message: 'Thêm vật tư mới thành công!' });
    }

    // Action 2: Update / Stocktaking Audit Item (Cân Kho Thực Tế)
    if (action === 'UPDATE_ITEM' || action === 'STOCKTAKE') {
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID mặt hàng cần cập nhật!' },
          { status: 400 }
        );
      }

      const existingItem = await prisma.inventoryItem.findUnique({ where: { id: targetId } });
      if (!existingItem) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy mặt hàng kho!' },
          { status: 404 }
        );
      }

      const newQty = currentQuantity !== undefined ? Number(currentQuantity) : existingItem.currentQuantity;
      const diff = newQty - existingItem.currentQuantity;

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: targetId },
        data: {
          ...(code && { code }),
          ...(name && { name }),
          ...(unit && { unit }),
          ...(category && { category }),
          ...(branchId && { branchId }),
          ...(currentQuantity !== undefined && { currentQuantity: newQty }),
          ...(minQuantity !== undefined && { minQuantity: Number(minQuantity) }),
          ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
          ...(supplier && { supplier }),
          ...(hotline && { hotline }),
        },
      });

      // Log transaction diff if stock was adjusted
      if (diff !== 0) {
        await prisma.inventoryTransaction.create({
          data: {
            itemId: targetId,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff),
            note: note || `Cân kho điều chỉnh thực tế (${diff > 0 ? '+' : ''}${diff} ${updatedItem.unit})`,
          },
        });
      }

      // Sync matching Product stock
      try {
        const matchingProducts = await prisma.product.findMany({
          where: {
            OR: [{ name: { contains: updatedItem.name } }, { name: updatedItem.name }],
          },
        });

        for (const prod of matchingProducts) {
          const finalStock = Math.max(0, updatedItem.currentQuantity);
          await prisma.product.update({
            where: { id: prod.id },
            data: {
              stockQuantity: finalStock,
              isAvailable: finalStock > 0,
            },
          });
        }
      } catch (syncErr) {
        console.error('Failed syncing inventory item to Product:', syncErr);
      }

      return NextResponse.json({
        success: true,
        item: updatedItem,
        message: 'Cập nhật định mức & cân kho thành công!',
      });
    }

    // Action 3: Add Inventory Transaction (IN/OUT)
    if (action === 'TRANSACTION') {
      if (!targetId || !type || !quantity) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID mặt hàng, loại giao dịch hoặc số lượng!' },
          { status: 400 }
        );
      }

      const qty = Number(quantity);
      const adjustment = type === 'IN' ? qty : -qty;

      const transaction = await prisma.inventoryTransaction.create({
        data: {
          itemId: targetId,
          type,
          quantity: qty,
          note: note || (type === 'IN' ? 'Nhập kho bổ sung' : 'Xuất kho hao hụt'),
        },
      });

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: targetId },
        data: {
          currentQuantity: { increment: adjustment },
        },
      });

      return NextResponse.json({ success: true, transaction, item: updatedItem });
    }

    // Action 4: Delete Item
    if (action === 'DELETE_ITEM') {
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID mặt hàng cần xóa!' },
          { status: 400 }
        );
      }

      await prisma.inventoryItem.delete({ where: { id: targetId } });
      return NextResponse.json({ success: true, message: 'Đã xóa mặt hàng khỏi kho!' });
    }

    return NextResponse.json({ success: false, error: 'Action không hợp lệ!' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing inventory item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
