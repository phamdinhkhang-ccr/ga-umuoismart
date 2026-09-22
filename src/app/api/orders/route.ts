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
    const search = searchParams.get('search')?.trim();
    const phone = searchParams.get('phone')?.trim();
    const orderCode = searchParams.get('orderCode')?.trim();
    const status = searchParams.get('status')?.trim();
    const paymentMethod = searchParams.get('paymentMethod')?.trim();
    const branchId = searchParams.get('branchId')?.trim();
    const fromDate = searchParams.get('fromDate')?.trim();
    const toDate = searchParams.get('toDate')?.trim();

    const whereCondition: any = {};

    if (search) {
      whereCondition.OR = [
        { orderCode: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    } else {
      if (orderCode) whereCondition.orderCode = { contains: orderCode };
      if (phone) whereCondition.customerPhone = { contains: phone };
    }

    if (status && status !== 'ALL') {
      whereCondition.status = status;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      whereCondition.paymentMethod = paymentMethod;
    }

    if (userPayload && userPayload.role === 'MANAGER' && userPayload.branchIds && userPayload.branchIds.length > 0) {
      if (branchId && branchId !== 'ALL' && userPayload.branchIds.includes(branchId)) {
        whereCondition.branchId = branchId;
      } else {
        whereCondition.branchId = { in: userPayload.branchIds };
      }
    } else if (userPayload && (userPayload.role === 'STAFF' || userPayload.role === 'CASHIER') && userPayload.branchId) {
      whereCondition.branchId = userPayload.branchId;
    } else if (branchId && branchId !== 'ALL') {
      whereCondition.branchId = branchId;
    }

    if (fromDate || toDate) {
      whereCondition.createdAt = {};
      if (fromDate) {
        whereCondition.createdAt.gte = new Date(`${fromDate}T00:00:00.000+07:00`);
      }
      if (toDate) {
        whereCondition.createdAt.lte = new Date(`${toDate}T23:59:59.999+07:00`);
      }
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
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
      customerName,
      customerPhone,
      deliveryAddress,
      note,
      paymentMethod = 'CASH',
      branchId = 'cs1',
      discountAmount = 0,
      shippingFee = 0,
      sellerName = 'Thu ngân POS',
      sourceTag = 'Đơn Mới Web',
      items,
      cashAmountInput,
      cashAmount,
      transferAmount,
    } = body;

    const effectiveBranchId = (userPayload && userPayload.role !== 'ADMIN' && userPayload.branchId)
      ? userPayload.branchId
      : (branchId || 'cs1');

    if (!customerName || !customerPhone || !deliveryAddress || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin người nhận hoặc danh sách món' }, { status: 400 });
    }

    // Generate unique order code DH-XXXXX
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const orderCode = `DH-${randomDigits}`;

    // Calculate subTotal & finalTotal
    let itemsTotal = 0;
    const formattedItems = items.map((item: any) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
      itemsTotal += subtotal;
      return {
        productId: item.productId || null,
        productName: item.productName || item.name || 'Món ăn',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        subtotal,
      };
    });

    const finalTotal = Math.max(0, itemsTotal + Number(shippingFee) - Number(discountAmount));

    // Calculate Cash vs Transfer Amounts
    let finalCashAmount = 0;
    let finalTransferAmount = 0;

    if (paymentMethod === 'BANK_TRANSFER') {
      finalCashAmount = 0;
      finalTransferAmount = finalTotal;
    } else if (paymentMethod === 'SPLIT') {
      const inputCash = cashAmountInput !== undefined ? cashAmountInput : cashAmount;
      finalCashAmount = Math.max(0, Number(inputCash) || 0);
      finalTransferAmount = transferAmount !== undefined 
        ? Math.max(0, Number(transferAmount) || 0)
        : Math.max(0, finalTotal - finalCashAmount);
    } else {
      // CASH or COD
      finalCashAmount = finalTotal;
      finalTransferAmount = 0;
    }

    // Find active shift at branch
    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN', branchId: effectiveBranchId },
      orderBy: { createdAt: 'desc' },
    });

    // 1. Pre-validation of Stock at Branch
    for (const item of formattedItems) {
      if (!item.productId) continue;
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
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
      });

      if (!prod) continue;

      if (prod.type === 'COMBO') {
        if (!prod.comboItems || prod.comboItems.length === 0) {
          return NextResponse.json(
            { success: false, error: `Món combo "${item.productName}" chưa có thành phần cấu hình.` },
            { status: 400 }
          );
        }
        for (const ci of prod.comboItems) {
          const reqQty = (ci.quantity || 1) * (item.quantity || 1);
          const childProd = ci.product;
          const bi = childProd?.branchInventories?.find((b) => b.branchId === effectiveBranchId);
          const currentStock = bi ? bi.stock : 0;
          if (currentStock < reqQty) {
            return NextResponse.json(
              {
                success: false,
                error: `Không đủ tồn kho cho Combo "${item.productName}". Thành phần "${childProd?.name || 'nguyên liệu'}" tại chi nhánh chỉ còn ${currentStock}, yêu cầu ${reqQty}.`,
              },
              { status: 400 }
            );
          }
        }
      } else {
        const reqQty = item.quantity || 1;
        const bi = prod.branchInventories?.find((b) => b.branchId === effectiveBranchId);
        const currentStock = bi ? bi.stock : 0;
        if (currentStock < reqQty) {
          return NextResponse.json(
            {
              success: false,
              error: `Sản phẩm "${item.productName}" không đủ tồn kho tại chi nhánh (Còn ${currentStock}, yêu cầu ${reqQty}).`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 2. Create Order & Deduct Stock in Transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderCode,
          customerName,
          customerPhone,
          deliveryAddress,
          note: note || '',
          paymentMethod,
          subTotal: itemsTotal,
          discountAmount: Number(discountAmount) || 0,
          shippingFee: Number(shippingFee) || 0,
          totalAmount: finalTotal,
          cashAmount: finalCashAmount,
          transferAmount: finalTransferAmount,
          branchId: effectiveBranchId,
          sellerName: sellerName || 'Thu ngân POS',
          sourceTag: sourceTag || 'TỔNG ĐÀI TELESALES',
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          shiftId: activeShift ? activeShift.id : null,
          createdById: userPayload?.username || userPayload?.fullName || 'Telesales',
          items: {
            create: formattedItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Stock Deduction for SINGLE & COMBO products
      for (const item of formattedItems) {
        if (!item.productId) continue;
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            comboItems: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!prod) continue;

        if (prod.type === 'COMBO' && prod.comboItems && prod.comboItems.length > 0) {
          for (const ci of prod.comboItems) {
            const childQtyToDeduct = (ci.quantity || 1) * (item.quantity || 1);

            // 1. Deduct from BranchInventory for component product
            const existingBranchInv = await tx.branchInventory.findUnique({
              where: {
                productId_branchId: {
                  productId: ci.productId,
                  branchId: effectiveBranchId,
                },
              },
            });
            const defaultStock = ci.product ? ci.product.stockQuantity : 0;
            const currentStock = existingBranchInv ? existingBranchInv.stock : defaultStock;
            const newStock = Math.max(0, currentStock - childQtyToDeduct);

            await tx.branchInventory.upsert({
              where: {
                productId_branchId: {
                  productId: ci.productId,
                  branchId: effectiveBranchId,
                },
              },
              update: {
                stock: { decrement: childQtyToDeduct },
              },
              create: {
                productId: ci.productId,
                branchId: effectiveBranchId,
                stock: newStock,
              },
            });

            // 2. Deduct from Product.stockQuantity for component product
            await tx.product.update({
              where: { id: ci.productId },
              data: {
                stockQuantity: { decrement: childQtyToDeduct },
              },
            });
          }
        } else {
          const qtyToDeduct = item.quantity || 1;

          // 1. Deduct from BranchInventory for single product
          const existingBranchInv = await tx.branchInventory.findUnique({
            where: {
              productId_branchId: {
                productId: prod.id,
                branchId: effectiveBranchId,
              },
            },
          });
          const currentStock = existingBranchInv ? existingBranchInv.stock : prod.stockQuantity;
          const newStock = Math.max(0, currentStock - qtyToDeduct);

          await tx.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: prod.id,
                branchId: effectiveBranchId,
              },
            },
            update: {
              stock: { decrement: qtyToDeduct },
            },
            create: {
              productId: prod.id,
              branchId: effectiveBranchId,
              stock: newStock,
            },
          });

          // 2. Deduct from Product.stockQuantity
          await tx.product.update({
            where: { id: prod.id },
            data: {
              stockQuantity: { decrement: qtyToDeduct },
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
