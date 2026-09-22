import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
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

    // 1. Fetch all Stock Receipts with items (Real imports by user)
    const allReceipts = await prisma.inventoryReceipt.findMany({
      include: {
        items: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    // 2. Fetch all BranchInventories
    const allBranchInventories = await prisma.branchInventory.findMany({
      include: { product: true },
    });

    // 3. Fetch custom non-demo InventoryItems with transactions
    const customInvItems = await prisma.inventoryItem.findMany({
      where: {
        transactions: {
          some: {},
        },
      },
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 4. Map & Deduplicate by normalized name (ONLY REAL IMPORTED GOODS)
    const itemMap = new Map<string, any>();

    // Step A: Add items from actual Inbound Stock Receipts (#NK-xxxxx)
    for (const rc of allReceipts) {
      for (const it of rc.items) {
        const normKey = it.productName.trim().toLowerCase();
        if (normKey.includes('combo')) continue;

        if (!itemMap.has(normKey)) {
          // Find matching Product if exists
          const prod = it.productId
            ? await prisma.product.findUnique({
                where: { id: it.productId },
                include: { category: true, branchInventories: true },
              })
            : await prisma.product.findFirst({
                where: { name: it.productName },
                include: { category: true, branchInventories: true },
              });

          let currentQty = 0;
          if (prod && prod.branchInventories) {
            if (targetBranchId !== 'all') {
              const bi = prod.branchInventories.find((b) => b.branchId === targetBranchId);
              currentQty = bi ? bi.stock : 0;
            } else {
              currentQty = prod.branchInventories.reduce((sum, b) => sum + (b.stock || 0), 0);
            }
          } else {
            const matchingBis = allBranchInventories.filter(
              (bi) => bi.product?.name.toLowerCase().trim() === normKey
            );
            if (targetBranchId !== 'all') {
              const bi = matchingBis.find((b) => b.branchId === targetBranchId);
              currentQty = bi ? bi.stock : 0;
            } else {
              currentQty = matchingBis.reduce((sum, b) => sum + (b.stock || 0), 0);
            }
          }

          itemMap.set(normKey, {
            id: prod?.id || it.id,
            productId: prod?.id || it.productId || null,
            code: prod?.batchCode || it.batchCode || '',
            name: it.productName,
            unit: it.unit || prod?.unit || 'Kg',
            category: prod?.category?.name || 'Nguyên liệu nhập kho',
            branchId: targetBranchId,
            currentQuantity: currentQty,
            minQuantity: 5,
            costPerUnit: it.unitPrice > 0 ? it.unitPrice : (prod?.costPrice || 0),
            supplier: rc.supplierName || 'Nhà cung cấp',
            hotline: '',
            updatedAt: rc.receivedAt ? rc.receivedAt.toISOString() : new Date().toISOString(),
            transactions: [],
          });
        }
      }
    }

    // Step B: Add items with actual positive stock in BranchInventory not in receipts
    for (const bi of allBranchInventories) {
      if (!bi.product || bi.stock <= 0) continue;
      const normKey = bi.product.name.trim().toLowerCase();
      if (normKey.includes('combo') || bi.product.type === 'COMBO') continue;

      if (!itemMap.has(normKey)) {
        const prod = bi.product;
        const allBisForProd = allBranchInventories.filter((b) => b.productId === prod.id);

        let currentQty = 0;
        if (targetBranchId !== 'all') {
          const specificBi = allBisForProd.find((b) => b.branchId === targetBranchId);
          currentQty = specificBi ? specificBi.stock : 0;
        } else {
          currentQty = allBisForProd.reduce((sum, b) => sum + (b.stock || 0), 0);
        }

        itemMap.set(normKey, {
          id: prod.id,
          productId: prod.id,
          code: prod.batchCode || '',
          name: prod.name,
          unit: prod.unit || 'Kg',
          category: 'Sản phẩm chế biến',
          branchId: targetBranchId,
          currentQuantity: currentQty,
          minQuantity: 5,
          costPerUnit: prod.costPrice || 0,
          supplier: 'Kho Chi Nhánh',
          hotline: '',
          updatedAt: bi.updatedAt ? bi.updatedAt.toISOString() : new Date().toISOString(),
          transactions: [],
        });
      }
    }

    // Step C: Add custom items with actual transactions
    for (const inv of customInvItems) {
      const normKey = inv.name.trim().toLowerCase();
      if (!itemMap.has(normKey)) {
        let currentQty = 0;
        const matchingBis = allBranchInventories.filter(
          (bi) =>
            bi.product?.name.toLowerCase().trim() === normKey ||
            bi.productId === inv.id
        );

        if (targetBranchId !== 'all') {
          const biMatch = matchingBis.find((b) => b.branchId === targetBranchId);
          currentQty = biMatch ? biMatch.stock : (inv.branchId === targetBranchId ? inv.currentQuantity : 0);
        } else {
          if (matchingBis.length > 0) {
            currentQty = matchingBis.reduce((sum, b) => sum + (b.stock || 0), 0);
          } else {
            currentQty = inv.currentQuantity || 0;
          }
        }

        itemMap.set(normKey, {
          id: inv.id,
          code: inv.code || '',
          name: inv.name,
          unit: inv.unit || 'Kg',
          category: inv.category || 'Vật tư & Nguyên liệu',
          branchId: targetBranchId,
          currentQuantity: currentQty,
          minQuantity: inv.minQuantity || 5,
          costPerUnit: inv.costPerUnit || 0,
          supplier: inv.supplier || '',
          hotline: inv.hotline || '',
          updatedAt: inv.updatedAt ? inv.updatedAt.toISOString() : new Date().toISOString(),
          transactions: inv.transactions || [],
        });
      }
    }

    // Step D: Format code
    let items = Array.from(itemMap.values()).map((item, idx) => {
      const formattedCode = (item.code && item.code !== 'VT-01' && !item.code.includes('VT-01'))
        ? item.code
        : `#VT-${String(idx + 1).padStart(2, '0')}`;
      return {
        ...item,
        code: formattedCode,
      };
    });

    // 5. Filter by Search keyword
    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.code.toLowerCase().includes(search) ||
          (i.supplier && i.supplier.toLowerCase().includes(search)) ||
          (i.hotline && i.hotline.toLowerCase().includes(search))
      );
    }

    // 6. Filter by Category
    if (category && category !== 'all' && category !== 'Tất cả danh mục') {
      items = items.filter((i) => i.category.toLowerCase().includes(category.toLowerCase()));
    }

    // 7. Filter by Stock Status
    if (status === 'alert' || lowStockOnly) {
      items = items.filter((item) => (Number(item.currentQuantity) || 0) <= (Number(item.minQuantity) || 0));
    } else if (status === 'safe') {
      items = items.filter((item) => (Number(item.currentQuantity) || 0) > (Number(item.minQuantity) || 0));
    }

    // 8. Calculate KPI Summary metrics
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

      let existingItem = await prisma.inventoryItem.findUnique({ where: { id: targetId } });
      if (!existingItem) {
        // If not found in inventoryItem, check if it's a Product from menu
        const prod = await prisma.product.findUnique({ where: { id: targetId } });
        if (prod) {
          existingItem = await prisma.inventoryItem.create({
            data: {
              code: `#VT-${prod.id.slice(-4).toUpperCase()}`,
              name: prod.name,
              unit: prod.unit || 'Kg',
              category: 'Sản phẩm chế biến & Món ăn',
              branchId: effectiveBranchId,
              currentQuantity: prod.stockQuantity || 0,
              minQuantity: 10,
              costPerUnit: prod.costPrice || 0,
              supplier: 'Nhà cung cấp',
            },
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Không tìm thấy mặt hàng kho!' },
            { status: 404 }
          );
        }
      }

      const newQty = currentQuantity !== undefined ? Number(currentQuantity) : existingItem.currentQuantity;
      const diff = newQty - existingItem.currentQuantity;

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          ...(code && { code }),
          ...(name && { name }),
          ...(unit && { unit }),
          ...(category && { category }),
          ...(branchId && branchId !== 'all' && { branchId }),
          ...(currentQuantity !== undefined && { currentQuantity: newQty }),
          ...(minQuantity !== undefined && { minQuantity: Number(minQuantity) }),
          ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
          ...(supplier && { supplier }),
          ...(hotline && { hotline }),
        },
      });

      // If stocktake was done at a specific branch, also update BranchInventory
      if (branchId && branchId !== 'all') {
        const prod = await prisma.product.findFirst({
          where: {
            OR: [{ id: targetId }, { name: existingItem.name }],
          },
        });
        if (prod) {
          await prisma.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: prod.id,
                branchId: branchId,
              },
            },
            update: {
              stock: newQty,
            },
            create: {
              productId: prod.id,
              branchId: branchId,
              stock: newQty,
            },
          });
        }
      }

      // Log transaction diff if stock was adjusted
      if (diff !== 0) {
        await prisma.inventoryTransaction.create({
          data: {
            itemId: existingItem.id,
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

      try {
        revalidatePath('/admin/inventory/stock');
        revalidatePath('/admin/inventory-check');
      } catch (_) {}

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

    // Action 4: Safe Delete Item / Branch Stock Reset
    if (action === 'DELETE_ITEM' || action === 'DELETE') {
      if (!targetId && !name) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID hoặc tên mặt hàng cần xóa!' },
          { status: 400 }
        );
      }

      try {
        const invItem = targetId ? await prisma.inventoryItem.findUnique({ where: { id: targetId } }) : null;
        const prodItem = targetId ? await prisma.product.findUnique({ where: { id: targetId } }) : null;
        const targetName = name || invItem?.name || prodItem?.name || '';

        // 1. Branch-specific deletion (Reset stock or delete BranchInventory for that branch)
        if (branchId && branchId !== 'all') {
          if (prodItem) {
            await prisma.branchInventory.deleteMany({
              where: { productId: prodItem.id, branchId },
            });
          }

          if (targetName) {
            const matchingProds = await prisma.product.findMany({
              where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
            });
            for (const mp of matchingProds) {
              await prisma.branchInventory.deleteMany({
                where: { productId: mp.id, branchId },
              });
            }
          }

          if (invItem && invItem.branchId === branchId) {
            await prisma.inventoryTransaction.deleteMany({ where: { itemId: invItem.id } });
            await prisma.inventoryItem.deleteMany({ where: { id: invItem.id } });
          }

          try {
            revalidatePath('/admin/inventory/stock');
            revalidatePath('/admin/inventory-check');
            revalidatePath('/admin/inventory/inbound');
          } catch (_) {}

          return NextResponse.json({
            success: true,
            message: 'Đã xóa tồn kho mặt hàng tại cơ sở thành công!',
          });
        }

        // 2. Global deletion (Toàn hệ thống)
        if (targetId) {
          await prisma.inventoryTransaction.deleteMany({ where: { itemId: targetId } });
          await prisma.inventoryItem.deleteMany({ where: { id: targetId } });
        }

        if (targetName) {
          const matchingInvItems = await prisma.inventoryItem.findMany({
            where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
          });
          for (const mInv of matchingInvItems) {
            await prisma.inventoryTransaction.deleteMany({ where: { itemId: mInv.id } });
            await prisma.inventoryItem.deleteMany({ where: { id: mInv.id } });
          }

          const matchingProds = await prisma.product.findMany({
            where: { OR: [{ id: targetId || '' }, { name: targetName }, { name: { contains: targetName } }] },
          });

          for (const p of matchingProds) {
            await prisma.branchInventory.deleteMany({ where: { productId: p.id } });
            await prisma.comboItem.deleteMany({
              where: { OR: [{ comboId: p.id }, { productId: p.id }] },
            });
            try {
              await prisma.product.deleteMany({ where: { id: p.id } });
            } catch (_) {
              await prisma.product.update({
                where: { id: p.id },
                data: { stockQuantity: 0, isAvailable: false },
              });
            }
          }
        }

        try {
          revalidatePath('/admin/inventory/stock');
          revalidatePath('/admin/inventory-check');
          revalidatePath('/admin/inventory/inbound');
        } catch (_) {}

        return NextResponse.json({
          success: true,
          message: 'Đã xóa hoàn toàn vật tư khỏi hệ thống!',
        });
      } catch (delError: any) {
        console.error('Delete inventory item error:', delError);
        return NextResponse.json({
          success: true,
          message: 'Mục không tồn tại hoặc đã được xóa',
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Action không hợp lệ!' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing inventory item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('itemId');
    const name = searchParams.get('name') || '';
    const branchId = searchParams.get('branchId') || 'all';

    if (!id && !name) {
      return NextResponse.json({ success: false, error: 'Thiếu ID hoặc tên mặt hàng cần xóa' }, { status: 400 });
    }

    const invItem = id ? await prisma.inventoryItem.findUnique({ where: { id } }) : null;
    const prodItem = id ? await prisma.product.findUnique({ where: { id } }) : null;
    const targetName = name || invItem?.name || prodItem?.name || '';

    if (branchId && branchId !== 'all') {
      if (prodItem) {
        await prisma.branchInventory.deleteMany({
          where: { productId: prodItem.id, branchId },
        });
      }

      if (targetName) {
        const matchingProds = await prisma.product.findMany({
          where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
        });
        for (const mp of matchingProds) {
          await prisma.branchInventory.deleteMany({
            where: { productId: mp.id, branchId },
          });
        }
      }

      if (invItem && invItem.branchId === branchId) {
        await prisma.inventoryTransaction.deleteMany({ where: { itemId: invItem.id } });
        await prisma.inventoryItem.deleteMany({ where: { id: invItem.id } });
      }

      try {
        revalidatePath('/admin/inventory/stock');
        revalidatePath('/admin/inventory-check');
        revalidatePath('/admin/inventory/inbound');
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Đã xóa tồn kho mặt hàng tại chi nhánh' });
    }

    if (id) {
      await prisma.inventoryTransaction.deleteMany({ where: { itemId: id } });
      await prisma.inventoryItem.deleteMany({ where: { id } });
    }

    if (targetName) {
      const matchingInvItems = await prisma.inventoryItem.findMany({
        where: { OR: [{ name: targetName }, { name: { contains: targetName } }] },
      });
      for (const mInv of matchingInvItems) {
        await prisma.inventoryTransaction.deleteMany({ where: { itemId: mInv.id } });
        await prisma.inventoryItem.deleteMany({ where: { id: mInv.id } });
      }

      const matchingProds = await prisma.product.findMany({
        where: { OR: [{ id: id || '' }, { name: targetName }, { name: { contains: targetName } }] },
      });

      for (const p of matchingProds) {
        await prisma.branchInventory.deleteMany({ where: { productId: p.id } });
        await prisma.comboItem.deleteMany({
          where: { OR: [{ comboId: p.id }, { productId: p.id }] },
        });
        try {
          await prisma.product.deleteMany({ where: { id: p.id } });
        } catch (_) {
          await prisma.product.update({
            where: { id: p.id },
            data: { stockQuantity: 0, isAvailable: false },
          });
        }
      }
    }

    try {
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/admin/inventory-check');
      revalidatePath('/admin/inventory/inbound');
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Đã xóa hoàn toàn vật tư khỏi hệ thống!' });
  } catch (error: any) {
    console.error('DELETE /api/inventory error:', error);
    return NextResponse.json({ success: true, message: 'Mục không tồn tại hoặc đã được xóa' });
  }
}
