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

    // 0. Auto-reconciliation: ensure previous InventoryReceipt records are synced to BranchInventory & Product
    try {
      const receiptCount = await prisma.inventoryReceipt.count();
      if (receiptCount > 0) {
        const allReceipts = await prisma.inventoryReceipt.findMany({
          include: { items: true },
        });
        for (const rc of allReceipts) {
          const rcBranch = rc.branchId || 'cs1';
          for (const it of rc.items) {
            let prod = it.productId
              ? await prisma.product.findUnique({ where: { id: it.productId } })
              : await prisma.product.findFirst({ where: { name: it.productName } });

            if (!prod) {
              prod = await prisma.product.create({
                data: {
                  name: it.productName,
                  price: it.unitPrice > 0 ? Math.round(it.unitPrice * 1.5) : 60000,
                  costPrice: it.unitPrice > 0 ? it.unitPrice : 0,
                  stockQuantity: it.quantity,
                  unit: it.unit || 'Kg',
                  isAvailable: true,
                },
              });
            }

            // Check if BranchInventory exists for this receipt item
            const existingBi = await prisma.branchInventory.findUnique({
              where: {
                productId_branchId: {
                  productId: prod.id,
                  branchId: rcBranch,
                },
              },
            });

            if (!existingBi) {
              await prisma.branchInventory.create({
                data: {
                  productId: prod.id,
                  branchId: rcBranch,
                  stock: it.quantity,
                },
              });
            }
          }
        }
      }
    } catch (reconcileErr) {
      console.error('Reconciliation error in GET /api/inventory:', reconcileErr);
    }

    // Determine target branch based on RBAC or query param
    let targetBranchId = branchId;
    if (userPayload && (userPayload.role === 'STAFF' || userPayload.role === 'CASHIER') && userPayload.branchId) {
      targetBranchId = userPayload.branchId;
    } else if (userPayload && userPayload.role === 'MANAGER' && userPayload.branchIds && userPayload.branchIds.length > 0) {
      if (branchId !== 'all' && userPayload.branchIds.includes(branchId)) {
        targetBranchId = branchId;
      } else if (branchId === 'all') {
        targetBranchId = 'all';
      }
    }

    // 1. Build master item filter (DO NOT filter branchId on master table!)
    const whereClause: any = {};

    if (category && category !== 'all' && category !== 'Tất cả danh mục') {
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

    // Query all master inventory items
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

    // Also include any Product from menu that might not be in InventoryItem yet
    const allProducts = await prisma.product.findMany();
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const missingProducts = allProducts.filter(
      (p) => !existingNames.has(p.name.toLowerCase().trim()) && p.type !== 'COMBO'
    );

    if (missingProducts.length > 0 && (!category || category === 'all' || category === 'Tất cả danh mục')) {
      const extraItems: any[] = missingProducts
        .filter((p) => !search || p.name.toLowerCase().includes(search))
        .map((p) => ({
          id: p.id,
          code: `#SP-${p.id.slice(-4).toUpperCase()}`,
          name: p.name,
          unit: p.unit || 'Phần',
          category: 'Sản phẩm chế biến & Món ăn',
          branchId: 'all',
          currentQuantity: p.stockQuantity || 0,
          minQuantity: 10,
          costPerUnit: p.costPrice || (p.price ? Math.round(p.price * 0.6) : 50000),
          supplier: 'Bếp trung tâm / Kho',
          hotline: '0988.888.999',
          transactions: [],
        }));
      items = [...items, ...extraItems];
    }

    // 2. Map branch-specific stock (LEFT JOIN logic)
    if (targetBranchId !== 'all') {
      const branchInventories = await prisma.branchInventory.findMany({
        where: { branchId: targetBranchId },
        include: { product: true },
      });

      items = items.map((item) => {
        // Find matching BranchInventory
        const prodMatch = branchInventories.find(
          (bi) =>
            bi.productId === item.id ||
            bi.product.name.toLowerCase().trim() === item.name.toLowerCase().trim() ||
            item.name.toLowerCase().trim().includes(bi.product.name.toLowerCase().trim()) ||
            bi.product.name.toLowerCase().trim().includes(item.name.toLowerCase().trim())
        );

        // If found at this branch, use actual branch stock; otherwise 0
        const branchStock = prodMatch ? prodMatch.stock : (item.branchId === targetBranchId ? item.currentQuantity : 0);
        return {
          ...item,
          branchId: targetBranchId,
          currentQuantity: branchStock,
        };
      });
    } else {
      // 'all' branches: Sum all branch inventories or use total baseline stock
      const allBranchInventories = await prisma.branchInventory.findMany({
        include: { product: true },
      });

      if (allBranchInventories.length > 0) {
        items = items.map((item) => {
          const matches = allBranchInventories.filter(
            (bi) =>
              bi.productId === item.id ||
              bi.product.name.toLowerCase().trim() === item.name.toLowerCase().trim() ||
              item.name.toLowerCase().trim().includes(bi.product.name.toLowerCase().trim()) ||
              bi.product.name.toLowerCase().trim().includes(item.name.toLowerCase().trim())
          );
          if (matches.length > 0) {
            const totalStock = matches.reduce((sum, bi) => sum + (bi.stock || 0), 0);
            return {
              ...item,
              currentQuantity: totalStock,
            };
          }
          return item;
        });
      }
    }

    // 3. Filter by Stock Status if requested
    if (status === 'alert' || lowStockOnly) {
      items = items.filter((item) => (Number(item.currentQuantity) || 0) <= (Number(item.minQuantity) || 0));
    } else if (status === 'safe') {
      items = items.filter((item) => (Number(item.currentQuantity) || 0) > (Number(item.minQuantity) || 0));
    }

    // 4. Calculate KPI metrics based on filtered branch items
    const totalInventoryValue = items.reduce(
      (sum, i) => sum + (Number(i.currentQuantity) || 0) * (Number(i.costPerUnit) || 0),
      0
    );
    const lowStockCount = items.filter((i) => (Number(i.currentQuantity) || 0) <= (Number(i.minQuantity) || 0)).length;
    const safeCount = items.filter((i) => (Number(i.currentQuantity) || 0) > (Number(i.minQuantity) || 0)).length;
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
