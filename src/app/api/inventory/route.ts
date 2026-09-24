import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // 1. Fetch active Products with branch inventories and category
    const products = await prisma.product.findMany({
      include: {
        category: true,
        branchInventories: true,
      },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch custom InventoryItems with transactions
    const customInvItems = await prisma.inventoryItem.findMany({
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 3. Map & Deduplicate by normalized name
    const itemMap = new Map<string, any>();

    // Add Products (excluding pure Combos)
    for (const prod of products) {
      if (prod.type === 'COMBO') continue;
      const normKey = prod.name.trim().toLowerCase();

      let currentQty = 0;
      if (targetBranchId !== 'all') {
        const bi = prod.branchInventories?.find((b) => b.branchId === targetBranchId);
        currentQty = bi ? bi.stock : 0;
      } else {
        currentQty =
          prod.branchInventories && prod.branchInventories.length > 0
            ? prod.branchInventories.reduce((sum, b) => sum + (b.stock || 0), 0)
            : prod.stockQuantity || 0;
      }

      const itemCode = prod.batchCode || (prod.id.length > 8 ? `VT-${prod.id.slice(-4).toUpperCase()}` : `VT-${prod.id}`);

      itemMap.set(normKey, {
        id: prod.id,
        code: itemCode,
        name: prod.name,
        unit: prod.unit || 'Kg',
        category: prod.category?.name || 'Thịt gà & Phụ phẩm tươi',
        branchId: targetBranchId === 'all' ? 'Toàn hệ thống' : targetBranchId,
        currentQuantity: currentQty,
        minQuantity: 5,
        costPerUnit: prod.costPrice || Math.round(prod.price * 0.6) || 0,
        supplier: 'Tổng Kho Chuỗi Gà Ủ Muối Smart',
        hotline: '0988.888.999',
        updatedAt: prod.updatedAt,
      });
    }

    // Merge in standalone InventoryItems
    for (const inv of customInvItems) {
      const normKey = inv.name.trim().toLowerCase();
      if (normKey.includes('combo')) continue;

      if (!itemMap.has(normKey)) {
        if (targetBranchId !== 'all' && inv.branchId !== targetBranchId && inv.branchId !== 'bep-tong') {
          continue;
        }

        itemMap.set(normKey, {
          id: inv.id,
          code: inv.code || (inv.id.length > 8 ? `VT-${inv.id.slice(-4).toUpperCase()}` : `VT-${inv.id}`),
          name: inv.name,
          unit: inv.unit || 'Kg',
          category: inv.category || 'Thịt gà & Phụ phẩm tươi',
          branchId: inv.branchId || 'bep-tong',
          currentQuantity: inv.currentQuantity || 0,
          minQuantity: inv.minQuantity || 5,
          costPerUnit: inv.costPerUnit || 0,
          supplier: inv.supplier || 'Nhà Cung Cấp Chuỗi',
          hotline: inv.hotline || '0988.888.999',
          updatedAt: inv.updatedAt,
        });
      }
    }

    let itemsList = Array.from(itemMap.values());

    // 4. Filtering
    if (search) {
      itemsList = itemsList.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          (i.code && i.code.toLowerCase().includes(search)) ||
          (i.supplier && i.supplier.toLowerCase().includes(search))
      );
    }

    if (category && category !== 'all' && category !== 'Tất cả danh mục') {
      itemsList = itemsList.filter((i) => i.category === category);
    }

    if (status && status !== 'all') {
      if (status === 'alert') {
        itemsList = itemsList.filter((i) => i.currentQuantity <= i.minQuantity);
      } else if (status === 'safe') {
        itemsList = itemsList.filter((i) => i.currentQuantity > i.minQuantity);
      }
    }

    if (lowStockOnly) {
      itemsList = itemsList.filter((i) => i.currentQuantity <= i.minQuantity);
    }

    // 5. Aggregate Summary KPIs
    const totalInventoryValue = itemsList.reduce((sum, i) => sum + i.currentQuantity * i.costPerUnit, 0);
    const totalItemsCount = itemsList.length;
    const lowStockCount = itemsList.filter((i) => i.currentQuantity <= i.minQuantity).length;
    const safeCount = itemsList.filter((i) => i.currentQuantity > i.minQuantity).length;

    return new NextResponse(
      JSON.stringify({
        success: true,
        items: itemsList,
        summary: {
          totalInventoryValue,
          totalItemsCount,
          lowStockCount,
          safeCount,
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
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền thay đổi dữ liệu tồn kho (403 Forbidden).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      action,
      name,
      code,
      unit,
      category,
      branchId,
      currentQuantity,
      minQuantity,
      costPerUnit,
      supplier,
      hotline,
      itemId,
      id,
      type,
      quantity,
      note,
    } = body;

    const targetId = itemId || id;

    // Action 1: Create new Material / Inventory Item
    if (action === 'CREATE_ITEM') {
      if (!name || !unit) {
        return NextResponse.json(
          { success: false, error: 'Tên vật tư và đơn vị tính là bắt buộc!' },
          { status: 400 }
        );
      }

      const generatedCode = code || `VT-${Math.floor(1000 + Math.random() * 9000)}`;

      const newItem = await prisma.inventoryItem.create({
        data: {
          code: generatedCode,
          name: name.trim(),
          unit: unit.trim(),
          category: category || 'Thịt gà & Phụ phẩm tươi',
          branchId: branchId || 'bep-tong',
          currentQuantity: Number(currentQuantity) || 0,
          minQuantity: Number(minQuantity) || 5,
          costPerUnit: Number(costPerUnit) || 0,
          supplier: supplier || 'Tổng Kho Chuỗi Gà Ủ Muối Smart',
          hotline: hotline || '0988.888.999',
        },
      });

      // Create Product counterpart for POS usage
      try {
        const existingProd = await prisma.product.findFirst({ where: { name: name.trim() } });
        if (!existingProd) {
          const newProd = await prisma.product.create({
            data: {
              name: name.trim(),
              price: Number(costPerUnit) > 0 ? Math.round(Number(costPerUnit) * 1.5) : 50000,
              costPrice: Number(costPerUnit) || 0,
              stockQuantity: Number(currentQuantity) || 0,
              unit: unit.trim(),
              isAvailable: Number(currentQuantity) > 0,
            },
          });

          if (branchId && branchId !== 'all') {
            await prisma.branchInventory.upsert({
              where: {
                productId_branchId: { productId: newProd.id, branchId },
              },
              update: { stock: Number(currentQuantity) || 0 },
              create: {
                productId: newProd.id,
                branchId,
                stock: Number(currentQuantity) || 0,
              },
            });
          }
        }
      } catch (prodErr) {
        console.error('Failed syncing new inventory to Product:', prodErr);
      }

      try {
        revalidatePath('/admin/inventory/stock');
        revalidatePath('/admin/inventory-check');
        revalidatePath('/admin/products');
      } catch (_) {}

      return new NextResponse(
        JSON.stringify({ success: true, item: newItem }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Action 2: Stocktake / Physical Count Adjustment
    if (action === 'STOCKTAKE') {
      const targetName = (name || '').trim();
      const actualQty = Number(currentQuantity) >= 0 ? Number(currentQuantity) : 0;
      const effectiveBranch = branchId || 'all';

      // Update BranchInventory or Product
      const matchingProds = await prisma.product.findMany({
        where: {
          OR: [{ id: targetId || '' }, { name: targetName }, { name: { contains: targetName } }],
        },
      });

      for (const prod of matchingProds) {
        if (effectiveBranch !== 'all') {
          await prisma.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: prod.id,
                branchId: effectiveBranch,
              },
            },
            update: { stock: actualQty },
            create: {
              productId: prod.id,
              branchId: effectiveBranch,
              stock: actualQty,
            },
          });
        } else {
          await prisma.product.update({
            where: { id: prod.id },
            data: {
              stockQuantity: actualQty,
              isAvailable: actualQty > 0,
            },
          });
        }
      }

      // Update InventoryItem
      const matchingInvItems = await prisma.inventoryItem.findMany({
        where: {
          OR: [{ id: targetId || '' }, { name: targetName }, { name: { contains: targetName } }],
        },
      });

      for (const inv of matchingInvItems) {
        await prisma.inventoryItem.update({
          where: { id: inv.id },
          data: {
            currentQuantity: actualQty,
            ...(minQuantity !== undefined && { minQuantity: Number(minQuantity) }),
            ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
            ...(supplier && { supplier }),
            ...(hotline && { hotline }),
          },
        });
      }

      try {
        revalidatePath('/admin/inventory/stock');
        revalidatePath('/admin/inventory-check');
        revalidatePath('/admin/products');
      } catch (_) {}

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Cập nhật định mức & cân kho thành công!',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
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

      return new NextResponse(
        JSON.stringify({ success: true, transaction, item: updatedItem }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Action 4: Safe Delete Item / Branch Stock Reset
    if (action === 'DELETE_ITEM' || action === 'DELETE') {
      if (!targetId && !name) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID hoặc tên mặt hàng cần xóa!' },
          { status: 400 }
        );
      }

      const targetName = (name || '').trim();

      await prisma.$transaction(async (tx) => {
        // 1. Branch-specific deletion
        if (branchId && branchId !== 'all') {
          if (targetId) {
            await tx.branchInventory.deleteMany({
              where: { productId: targetId, branchId },
            });
            await tx.inventoryItem.deleteMany({
              where: { id: targetId, branchId },
            });
          }

          if (targetName) {
            const matchingProds = await tx.product.findMany({
              where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
            });
            for (const mp of matchingProds) {
              await tx.branchInventory.deleteMany({
                where: { productId: mp.id, branchId },
              });
            }

            await tx.inventoryItem.deleteMany({
              where: { name: targetName, branchId },
            });
          }
        } else {
          // 2. Global deletion (Toàn hệ thống)
          if (targetId) {
            await tx.inventoryTransaction.deleteMany({ where: { itemId: targetId } });
            await tx.inventoryItem.deleteMany({ where: { id: targetId } });
            await tx.branchInventory.deleteMany({ where: { productId: targetId } });
            await tx.comboItem.deleteMany({
              where: { OR: [{ comboId: targetId }, { productId: targetId }] },
            });
            await tx.inventoryReceiptItem.deleteMany({ where: { productId: targetId } });
            await tx.inventoryExportItem.deleteMany({ where: { productId: targetId } });
            try {
              await tx.product.deleteMany({ where: { id: targetId } });
            } catch (_) {}
          }

          if (targetName) {
            const matchingInvItems = await tx.inventoryItem.findMany({
              where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
            });
            for (const mInv of matchingInvItems) {
              await tx.inventoryTransaction.deleteMany({ where: { itemId: mInv.id } });
              await tx.inventoryItem.deleteMany({ where: { id: mInv.id } });
            }

            const matchingProds = await tx.product.findMany({
              where: { OR: [{ id: targetId || '' }, { name: targetName }, { name: { contains: targetName } }] },
            });

            for (const p of matchingProds) {
              await tx.branchInventory.deleteMany({ where: { productId: p.id } });
              await tx.comboItem.deleteMany({
                where: { OR: [{ comboId: p.id }, { productId: p.id }] },
              });
              await tx.inventoryReceiptItem.deleteMany({
                where: { OR: [{ productId: p.id }, { productName: p.name }] },
              });
              await tx.inventoryExportItem.deleteMany({
                where: { OR: [{ productId: p.id }, { productName: p.name }] },
              });
              try {
                await tx.product.deleteMany({ where: { id: p.id } });
              } catch (_) {}
            }

            // Also clean any orphan receipt items with this name so they don't resurrect
            await tx.inventoryReceiptItem.deleteMany({ where: { productName: targetName } });
            await tx.inventoryExportItem.deleteMany({ where: { productName: targetName } });
          }
        }
      });

      try {
        revalidatePath('/admin/inventory/stock');
        revalidatePath('/admin/inventory-check');
        revalidatePath('/admin/inventory/inbound');
        revalidatePath('/admin/products');
      } catch (_) {}

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Đã xóa hoàn toàn vật tư khỏi hệ thống!',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json({ success: false, error: 'Action không hợp lệ!' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing inventory item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền xóa dữ liệu tồn kho (403 Forbidden).' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('itemId');
    const name = (searchParams.get('name') || '').trim();
    const branchId = searchParams.get('branchId') || 'all';

    if (!id && !name) {
      return NextResponse.json({ success: false, error: 'Thiếu ID hoặc tên mặt hàng cần xóa' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (branchId && branchId !== 'all') {
        if (id) {
          await tx.branchInventory.deleteMany({ where: { productId: id, branchId } });
          await tx.inventoryItem.deleteMany({ where: { id, branchId } });
        }
        if (name) {
          const matchingProds = await tx.product.findMany({
            where: { OR: [{ name }, { name: { contains: name } }] },
          });
          for (const mp of matchingProds) {
            await tx.branchInventory.deleteMany({ where: { productId: mp.id, branchId } });
          }
          await tx.inventoryItem.deleteMany({ where: { name, branchId } });
        }
      } else {
        if (id) {
          await tx.inventoryTransaction.deleteMany({ where: { itemId: id } });
          await tx.inventoryItem.deleteMany({ where: { id } });
          await tx.branchInventory.deleteMany({ where: { productId: id } });
          await tx.comboItem.deleteMany({ where: { OR: [{ comboId: id }, { productId: id }] } });
          await tx.inventoryReceiptItem.deleteMany({ where: { productId: id } });
          await tx.inventoryExportItem.deleteMany({ where: { productId: id } });
          try {
            await tx.product.deleteMany({ where: { id } });
          } catch (_) {}
        }
        if (name) {
          const matchingInvItems = await tx.inventoryItem.findMany({
            where: { OR: [{ name }, { name: { contains: name } }] },
          });
          for (const mInv of matchingInvItems) {
            await tx.inventoryTransaction.deleteMany({ where: { itemId: mInv.id } });
            await tx.inventoryItem.deleteMany({ where: { id: mInv.id } });
          }

          const matchingProds = await tx.product.findMany({
            where: { OR: [{ id: id || '' }, { name }, { name: { contains: name } }] },
          });

          for (const p of matchingProds) {
            await tx.branchInventory.deleteMany({ where: { productId: p.id } });
            await tx.comboItem.deleteMany({ where: { OR: [{ comboId: p.id }, { productId: p.id }] } });
            await tx.inventoryReceiptItem.deleteMany({
              where: { OR: [{ productId: p.id }, { productName: p.name }] },
            });
            await tx.inventoryExportItem.deleteMany({
              where: { OR: [{ productId: p.id }, { productName: p.name }] },
            });
            try {
              await tx.product.deleteMany({ where: { id: p.id } });
            } catch (_) {}
          }

          await tx.inventoryReceiptItem.deleteMany({ where: { productName: name } });
          await tx.inventoryExportItem.deleteMany({ where: { productName: name } });
        }
      }
    });

    try {
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/admin/inventory-check');
      revalidatePath('/admin/inventory/inbound');
      revalidatePath('/admin/products');
    } catch (_) {}

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Đã xóa hoàn toàn vật tư khỏi hệ thống!' }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('DELETE /api/inventory error:', error);
    return NextResponse.json({ success: true, message: 'Mục không tồn tại hoặc đã được xóa' });
  }
}
