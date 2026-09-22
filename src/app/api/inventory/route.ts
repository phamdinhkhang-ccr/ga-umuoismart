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

    // 1. Query Official Products (SINGLE only, exclude COMBO)
    const officialProducts = await prisma.product.findMany({
      where: {
        type: 'SINGLE',
        NOT: { name: { contains: 'Combo' } },
      },
      include: {
        category: true,
        branchInventories: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Query Master Inventory Items (Raw materials, packaging, spices, etc.)
    const masterInvItems = await prisma.inventoryItem.findMany({
      where: {
        NOT: [
          { name: { contains: 'Combo' } },
          { category: { contains: 'Combo' } },
        ],
      },
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 3. Query all BranchInventories
    const allBranchInventories = await prisma.branchInventory.findMany({
      include: { product: true },
    });

    // 4. Map & Deduplicate by normalized name (1 single row per unique item)
    const itemMap = new Map<string, any>();

    // Step A: Insert all official products first
    for (const p of officialProducts) {
      const normKey = p.name.trim().toLowerCase();

      let currentQty = 0;
      if (targetBranchId !== 'all') {
        const bi = p.branchInventories.find((b) => b.branchId === targetBranchId);
        currentQty = bi ? bi.stock : 0;
      } else {
        const totalBranchStock = p.branchInventories.reduce((sum, b) => sum + (b.stock || 0), 0);
        currentQty = totalBranchStock > 0 ? totalBranchStock : (p.stockQuantity || 0);
      }

      itemMap.set(normKey, {
        id: p.id,
        productId: p.id,
        code: p.batchCode || '',
        name: p.name,
        unit: p.unit || 'Con',
        category: p.category?.name || 'Thịt gà & Phụ phẩm tươi',
        branchId: targetBranchId,
        currentQuantity: currentQty,
        minQuantity: 10,
        costPerUnit: p.costPrice && p.costPrice > 0 ? p.costPrice : (p.price ? Math.round(p.price * 0.6) : 50000),
        supplier: 'Kho Tổng Gà Ủ Muối Smart',
        hotline: '0988.888.999',
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
        transactions: [],
      });
    }

    // Step B: Merge or insert master inventory items
    for (const inv of masterInvItems) {
      const normKey = inv.name.trim().toLowerCase();
      const existing = itemMap.get(normKey);

      if (existing) {
        // Merge metadata (supplier, hotline, custom code) if available
        if (inv.supplier && inv.supplier !== 'Kho Tổng Gà Ủ Muối Smart') existing.supplier = inv.supplier;
        if (inv.hotline) existing.hotline = inv.hotline;
        if (inv.code && inv.code !== 'VT-01') existing.code = inv.code;
        if (inv.minQuantity) existing.minQuantity = inv.minQuantity;
        if (inv.costPerUnit && inv.costPerUnit > 0) existing.costPerUnit = inv.costPerUnit;
        if (inv.category && inv.category !== 'Thịt gà & Phụ phẩm tươi') existing.category = inv.category;
        if (inv.transactions && inv.transactions.length > 0) existing.transactions = inv.transactions;
      } else {
        // Standalone raw material/packaging item
        let currentQty = 0;
        const matchingBranchInvs = allBranchInventories.filter(
          (bi) =>
            bi.product?.name.toLowerCase().trim() === normKey ||
            bi.productId === inv.id
        );

        if (targetBranchId !== 'all') {
          const biMatch = matchingBranchInvs.find((b) => b.branchId === targetBranchId);
          currentQty = biMatch ? biMatch.stock : (inv.branchId === targetBranchId ? inv.currentQuantity : 0);
        } else {
          if (matchingBranchInvs.length > 0) {
            currentQty = matchingBranchInvs.reduce((sum, b) => sum + (b.stock || 0), 0);
          } else {
            currentQty = inv.currentQuantity || 0;
          }
        }

        itemMap.set(normKey, {
          id: inv.id,
          code: inv.code || '',
          name: inv.name,
          unit: inv.unit || 'Kg',
          category: inv.category || 'Gia vị thảo mộc & Sốt',
          branchId: targetBranchId,
          currentQuantity: currentQty,
          minQuantity: inv.minQuantity || 5,
          costPerUnit: inv.costPerUnit || 50000,
          supplier: inv.supplier || 'Kho Tổng Gà Ủ Muối Smart',
          hotline: inv.hotline || '0988.888.999',
          updatedAt: inv.updatedAt ? inv.updatedAt.toISOString() : new Date().toISOString(),
          transactions: inv.transactions || [],
        });
      }
    }

    // Step C: Convert map to array and generate dynamic sequential SKU/Code if empty
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
