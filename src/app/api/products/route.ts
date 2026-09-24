import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma, ensureDbInitialized } from '@/lib/prisma';
import { normalizeImageUrl } from '@/lib/image-helper';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';
    const expiryFilter = searchParams.get('expiryFilter') || 'all'; // 'all', 'expiring', 'expired', 'good'

    const where: any = {};

    if (categoryId && categoryId !== 'ALL' && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (type && type !== 'ALL' && type !== 'all') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { batchCode: { contains: search } },
        { aiKeywords: { contains: search } },
      ];
    }

    const branchId = searchParams.get('branchId');

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        comboItems: {
          include: {
            product: {
              include: {
                branchInventories: true,
              },
            },
          },
        },
        branchInventories: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const allBranches = await prisma.branch.findMany({ select: { id: true } });
    const branchIdsList = allBranches.length > 0 ? allBranches.map((b) => b.id) : ['cs1', 'cs2', 'cs3'];

    const processedProducts = products.map((p) => {
      let branchStock = p.stockQuantity;
      let virtualComboStock = p.stockQuantity;

      if (p.type === 'COMBO') {
        if (p.comboItems && p.comboItems.length > 0) {
          if (branchId && branchId !== 'ALL' && branchId !== 'all') {
            const possibleCombos = p.comboItems.map((ci) => {
              const childProd = ci.product;
              if (!childProd) return 0;
              const bi = childProd.branchInventories?.find((b) => b.branchId === branchId);
              const childStock = bi ? bi.stock : 0;
              const reqQty = Math.max(1, ci.quantity || 1);
              return Math.floor(Math.max(0, childStock) / reqQty);
            });
            virtualComboStock = Math.min(...possibleCombos);
            branchStock = virtualComboStock;
          } else {
            // Calculate total virtual combo stock as the sum of virtual stocks across all branches
            let sumVirtualComboStock = 0;
            for (const bId of branchIdsList) {
              const possibleCombosForBranch = p.comboItems.map((ci) => {
                const childProd = ci.product;
                if (!childProd) return 0;
                const bi = childProd.branchInventories?.find((b) => b.branchId === bId);
                const childStock = bi ? bi.stock : 0;
                const reqQty = Math.max(1, ci.quantity || 1);
                return Math.floor(Math.max(0, childStock) / reqQty);
              });
              const bVirtual = p.comboItems.length > 0 ? Math.min(...possibleCombosForBranch) : 0;
              sumVirtualComboStock += bVirtual;
            }
            virtualComboStock = sumVirtualComboStock;
            branchStock = virtualComboStock;
          }
        } else {
          virtualComboStock = 0;
          branchStock = 0;
        }
      } else {
        if (branchId && branchId !== 'ALL' && branchId !== 'all') {
          const bi = p.branchInventories?.find((b) => b.branchId === branchId);
          branchStock = bi ? bi.stock : 0;
        }
      }

      // Fallback calculation if expiryDate is not explicitly set: createdAt + 14 days
      const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : now.getTime();
      const baseDate = p.expiryDate
        ? new Date(p.expiryDate)
        : new Date(createdTime + 14 * 24 * 60 * 60 * 1000);

      const diffTime = baseDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let expiryStatus: 'GOOD' | 'EXPIRING' | 'EXPIRED' = 'GOOD';
      if (daysLeft < 0) {
        expiryStatus = 'EXPIRED';
      } else if (daysLeft <= 5) {
        expiryStatus = 'EXPIRING';
      } else {
        expiryStatus = 'GOOD';
      }

      // Auto-generate batch code if empty or default
      const d = p.createdAt ? new Date(p.createdAt) : now;
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const dateStr = d.getDate().toString().padStart(2, '0');
      const effectiveBatchCode =
        p.batchCode && p.batchCode !== 'LÔ-GUM-DEFAULT'
          ? p.batchCode
          : `LÔ-GUM-${monthStr}${dateStr}`;

      const effectiveCostPrice =
        p.costPrice && p.costPrice > 0
          ? p.costPrice
          : p.price
          ? Math.round(p.price * 0.6)
          : 60000;

      const isSpecificBranch = Boolean(branchId && branchId !== 'ALL' && branchId !== 'all');
      const effectiveStockQuantity = isSpecificBranch ? branchStock : (p.type === 'COMBO' ? virtualComboStock : p.stockQuantity);
      const dynamicIsAvailable = p.type === 'COMBO' ? (effectiveStockQuantity > 0) : p.isAvailable;

      return {
        ...p,
        stockQuantity: effectiveStockQuantity,
        branchStock,
        isAvailable: dynamicIsAvailable,
        costPrice: effectiveCostPrice,
        batchCode: effectiveBatchCode,
        effectiveExpiryDate: baseDate.toISOString(),
        isEstimatedExpiry: !p.expiryDate,
        expiryStatus,
        daysLeft,
      };
    });

    let filteredProducts = processedProducts;

    if (expiryFilter === 'expiring') {
      filteredProducts = processedProducts.filter((p) => p.expiryStatus === 'EXPIRING');
    } else if (expiryFilter === 'expired') {
      filteredProducts = processedProducts.filter((p) => p.expiryStatus === 'EXPIRED');
    } else if (expiryFilter === 'good') {
      filteredProducts = processedProducts.filter((p) => p.expiryStatus === 'GOOD');
    }

    const totalCount = processedProducts.length;
    const expiringCount = processedProducts.filter((p) => p.expiryStatus === 'EXPIRING').length;
    const expiredCount = processedProducts.filter((p) => p.expiryStatus === 'EXPIRED').length;
    const goodCount = processedProducts.filter((p) => p.expiryStatus === 'GOOD').length;

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      counts: {
        total: totalCount,
        expiring: expiringCount,
        expired: expiredCount,
        good: goodCount,
      },
    });
  } catch (error: any) {
    console.error('API GET /api/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền tạo hoặc chỉnh sửa món ăn (403 Forbidden).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      type = 'SINGLE',
      description,
      price,
      costPrice = 0,
      image,
      isAvailable = true,
      isBestSeller = false,
      categoryId,
      expiryDate,
      batchCode,
      aiKeywords,
      stockQuantity = 50,
      unit = 'Phần',
      comboItems = [],
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Tên món và giá bán là bắt buộc' }, { status: 400 });
    }

    const stockQtyNum = type === 'COMBO' ? 0 : (Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0);
    const availableState = type === 'COMBO' ? true : (stockQtyNum === 0 ? false : Boolean(isAvailable));
    const cleanImage = normalizeImageUrl(image) || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80';

    let calculatedCostPrice = Number(costPrice) || 0;
    const validComboItems: { productId: string; quantity: number }[] = [];

    if (type === 'COMBO' && Array.isArray(comboItems) && comboItems.length > 0) {
      calculatedCostPrice = 0;
      for (const item of comboItems) {
        if (item.productId && Number(item.quantity) > 0) {
          validComboItems.push({
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
          });
          const childProduct = await prisma.product.findUnique({ where: { id: item.productId } });
          if (childProduct) {
            calculatedCostPrice += (childProduct.costPrice || 0) * (Number(item.quantity) || 1);
          }
        }
      }
    }

    const createProductData = {
      name,
      type: type === 'COMBO' ? 'COMBO' : 'SINGLE',
      description: description || '',
      price: Number(price),
      costPrice: type === 'COMBO' ? calculatedCostPrice : Number(costPrice) || 0,
      image: cleanImage,
      isAvailable: availableState,
      isBestSeller: Boolean(isBestSeller),
      categoryId: categoryId || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      batchCode: batchCode || null,
      aiKeywords: aiKeywords || null,
      stockQuantity: stockQtyNum,
      unit: type === 'COMBO' ? 'Combo' : (unit || 'Phần'),
      ...(type === 'COMBO' && validComboItems.length > 0 && {
        comboItems: {
          create: validComboItems.map((ci) => ({
            productId: ci.productId,
            quantity: ci.quantity,
          })),
        },
      }),
    };

    let product;
    try {
      product = await prisma.product.create({
        data: createProductData,
        include: {
          category: true,
          comboItems: {
            include: {
              product: true,
            },
          },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        console.warn('Product table missing, running ensureDbInitialized() auto-recovery...');
        await ensureDbInitialized();
        product = await prisma.product.create({
          data: createProductData,
          include: {
            category: true,
            comboItems: {
              include: {
                product: true,
              },
            },
          },
        });
      } else {
        throw err;
      }
    }

    // Direction 1: Auto-sync to BranchInventory for all branches
    try {
      const branches = await prisma.branch.findMany();
      if (branches && branches.length > 0) {
        for (const b of branches) {
          await prisma.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: product.id,
                branchId: b.id,
              },
            },
            update: {
              stock: stockQtyNum,
            },
            create: {
              productId: product.id,
              branchId: b.id,
              stock: stockQtyNum,
            },
          });
        }
      }
    } catch (bInvErr) {
      console.warn('Auto sync product to BranchInventory failed:', bInvErr);
    }

    // Direction 2: Auto-sync to InventoryItem
    try {
      const invItem = await prisma.inventoryItem.findFirst({ where: { name } });
      if (invItem) {
        await prisma.inventoryItem.update({
          where: { id: invItem.id },
          data: { currentQuantity: stockQtyNum, unit: product.unit || invItem.unit },
        });
      } else if (type === 'SINGLE') {
        await prisma.inventoryItem.create({
          data: {
            name,
            unit: unit || 'Con',
            currentQuantity: stockQtyNum,
            minQuantity: 10,
            costPerUnit: Number(costPrice) || 0,
            supplier: 'Kho Tổng Gà Ủ Muối Smart',
          },
        });
      }
    } catch (e) {
      console.error('Auto sync product to inventory failed:', e);
    }

    try {
      revalidatePath('/');
      revalidatePath('/admin/products');
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/admin/inventory-check');
    } catch (_) {}

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('API POST /api/products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.code === 'P2021'
          ? 'Hệ thống đang tự động khởi tạo bảng dữ liệu, vui lòng thử lại sau vài giây.'
          : (error.message || 'Lỗi khi tạo món ăn'),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền chỉnh sửa món ăn (403 Forbidden).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      type,
      description,
      price,
      costPrice,
      image,
      isAvailable,
      isBestSeller,
      categoryId,
      expiryDate,
      batchCode,
      aiKeywords,
      stockQuantity,
      unit,
      comboItems,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID món cần cập nhật' }, { status: 400 });
    }

    const existingProd = await prisma.product.findUnique({ where: { id } });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type === 'COMBO' ? 'COMBO' : 'SINGLE';
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
    if (image !== undefined) updateData.image = normalizeImageUrl(image);
    if (isBestSeller !== undefined) updateData.isBestSeller = Boolean(isBestSeller);
    if (categoryId) updateData.categoryId = categoryId;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (batchCode !== undefined) updateData.batchCode = batchCode;
    if (aiKeywords !== undefined) updateData.aiKeywords = aiKeywords;
    if (unit !== undefined) updateData.unit = unit;

    const product = await prisma.$transaction(async (tx) => {
      if (type === 'COMBO' && Array.isArray(comboItems)) {
        updateData.unit = 'Combo';
        let calculatedCost = 0;
        const validItems: { productId: string; quantity: number }[] = [];
        for (const item of comboItems) {
          if (item.productId && Number(item.quantity) > 0) {
            validItems.push({ productId: item.productId, quantity: Number(item.quantity) || 1 });
            const childProduct = await tx.product.findUnique({ where: { id: item.productId } });
            if (childProduct) {
              calculatedCost += (childProduct.costPrice || 0) * (Number(item.quantity) || 1);
            }
          }
        }
        updateData.costPrice = calculatedCost;

        // Reset existing combo items and insert new ones inside transaction
        await tx.comboItem.deleteMany({ where: { comboId: id } });
        if (validItems.length > 0) {
          await tx.comboItem.createMany({
            data: validItems.map((ci) => ({
              comboId: id,
              productId: ci.productId,
              quantity: ci.quantity,
            })),
          });
        }
      } else if (type === 'SINGLE') {
        await tx.comboItem.deleteMany({ where: { comboId: id } });
      }

      if (type === 'COMBO' || (existingProd && existingProd.type === 'COMBO')) {
        updateData.stockQuantity = 0;
      } else if (stockQuantity !== undefined) {
        const qtyNum = Math.max(0, Number(stockQuantity));
        updateData.stockQuantity = qtyNum;
        updateData.isAvailable = qtyNum === 0 ? false : (isAvailable !== undefined ? Boolean(isAvailable) : true);

        // Sync BranchInventory
        try {
          const branches = await tx.branch.findMany();
          for (const b of branches) {
            await tx.branchInventory.upsert({
              where: {
                productId_branchId: {
                  productId: id,
                  branchId: b.id,
                },
              },
              update: {
                stock: qtyNum,
              },
              create: {
                productId: id,
                branchId: b.id,
                stock: qtyNum,
              },
            });
          }
        } catch (_) {}
      } else if (isAvailable !== undefined) {
        updateData.isAvailable = Boolean(isAvailable);
      }

      return await tx.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          comboItems: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    try {
      revalidatePath('/');
      revalidatePath('/admin/products');
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/admin/orders');
    } catch (_) {}

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('API PUT /api/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền xóa món ăn (403 Forbidden).' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID món' }, { status: 400 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Đã xóa món thành công' });
  } catch (error: any) {
    console.error('API DELETE /api/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
