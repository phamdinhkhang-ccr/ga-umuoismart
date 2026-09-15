import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        comboItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const processedProducts = products.map((p) => {
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

      return {
        ...p,
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

    const stockQtyNum = Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0;
    const availableState = stockQtyNum === 0 ? false : Boolean(isAvailable);

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

    const product = await prisma.product.create({
      data: {
        name,
        type: type === 'COMBO' ? 'COMBO' : 'SINGLE',
        description: description || '',
        price: Number(price),
        costPrice: type === 'COMBO' ? calculatedCostPrice : Number(costPrice) || 0,
        image: image || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80',
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
      },
      include: {
        category: true,
        comboItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Direction 1: Auto-sync to InventoryItem
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

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('API POST /api/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type === 'COMBO' ? 'COMBO' : 'SINGLE';
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
    if (image !== undefined) updateData.image = image;
    if (isBestSeller !== undefined) updateData.isBestSeller = Boolean(isBestSeller);
    if (categoryId) updateData.categoryId = categoryId;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (batchCode !== undefined) updateData.batchCode = batchCode;
    if (aiKeywords !== undefined) updateData.aiKeywords = aiKeywords;
    if (unit !== undefined) updateData.unit = unit;

    if (type === 'COMBO' && Array.isArray(comboItems)) {
      updateData.unit = 'Combo';
      let calculatedCost = 0;
      const validItems: { productId: string; quantity: number }[] = [];
      for (const item of comboItems) {
        if (item.productId && Number(item.quantity) > 0) {
          validItems.push({ productId: item.productId, quantity: Number(item.quantity) || 1 });
          const childProduct = await prisma.product.findUnique({ where: { id: item.productId } });
          if (childProduct) {
            calculatedCost += (childProduct.costPrice || 0) * (Number(item.quantity) || 1);
          }
        }
      }
      updateData.costPrice = calculatedCost;

      // Reset existing combo items and insert new ones
      await prisma.comboItem.deleteMany({ where: { comboId: id } });
      if (validItems.length > 0) {
        await prisma.comboItem.createMany({
          data: validItems.map((ci) => ({
            comboId: id,
            productId: ci.productId,
            quantity: ci.quantity,
          })),
        });
      }
    } else if (type === 'SINGLE') {
      await prisma.comboItem.deleteMany({ where: { comboId: id } });
    }

    if (stockQuantity !== undefined) {
      const qtyNum = Math.max(0, Number(stockQuantity));
      updateData.stockQuantity = qtyNum;
      updateData.isAvailable = qtyNum === 0 ? false : (isAvailable !== undefined ? Boolean(isAvailable) : true);
    } else if (isAvailable !== undefined) {
      updateData.isAvailable = Boolean(isAvailable);
    }

    const product = await prisma.product.update({
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

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('API PUT /api/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
