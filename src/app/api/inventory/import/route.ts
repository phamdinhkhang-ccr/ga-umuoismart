import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const branchId = searchParams.get('branchId') || 'all';
    const supplierName = searchParams.get('supplier') || 'all';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const whereClause: any = {};

    if (branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    if (supplierName !== 'all') {
      whereClause.supplierName = { contains: supplierName };
    }

    if (fromDate || toDate) {
      whereClause.receivedAt = {};
      if (fromDate) {
        whereClause.receivedAt.gte = new Date(`${fromDate}T00:00:00.000+07:00`);
      }
      if (toDate) {
        whereClause.receivedAt.lte = new Date(`${toDate}T23:59:59.999+07:00`);
      }
    }

    if (search) {
      whereClause.OR = [
        { receiptCode: { contains: search } },
        { supplierName: { contains: search } },
        { creatorName: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const receipts = await prisma.inventoryReceipt.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReceiptsCount = receipts.length;
    const totalImportValue = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const cashTotal = receipts.filter((r) => r.paymentMethod === 'CASH').reduce((sum, r) => sum + r.totalAmount, 0);
    const bankTotal = receipts.filter((r) => r.paymentMethod === 'BANK_TRANSFER').reduce((sum, r) => sum + r.totalAmount, 0);
    const creditTotal = receipts.filter((r) => r.paymentMethod === 'CREDIT' || r.paymentStatus === 'UNPAID').reduce((sum, r) => sum + r.totalAmount, 0);

    return NextResponse.json({
      success: true,
      receipts,
      summary: {
        totalReceiptsCount,
        totalImportValue,
        cashTotal,
        bankTotal,
        creditTotal,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory import receipts:', error);
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
        { success: false, error: 'Tài khoản nhân viên không có quyền tạo phiếu nhập kho (403 Forbidden).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      branchId = 'cs1',
      supplierName,
      receivedAt,
      creatorName = userPayload.fullName || userPayload.username || 'Quản lý kho',
      paymentMethod = 'CASH', // CASH, BANK_TRANSFER, CREDIT
      notes,
      items,
    } = body;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền tên Nhà Cung Cấp và chọn ít nhất 1 mặt hàng nhập kho!' },
        { status: 400 }
      );
    }

    const rawBranchId = (branchId || 'cs1').trim();
    let validBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { id: rawBranchId },
          { code: rawBranchId },
          { code: rawBranchId.toLowerCase() },
          { code: rawBranchId.toUpperCase() },
          { name: rawBranchId },
        ],
      },
    });

    if (!validBranch) {
      validBranch = await prisma.branch.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (!validBranch) {
        validBranch = await prisma.branch.findFirst();
      }
    }

    if (!validBranch) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy cơ sở chi nhánh hợp lệ trong hệ thống. Vui lòng tạo chi nhánh trước khi nhập kho!' },
        { status: 400 }
      );
    }

    const validBranchId = validBranch.id;

    // Auto-generate receipt code #NK-XXXXX
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const receiptCode = `#NK-${randomDigits}`;

    let totalAmount = 0;
    const preppedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const subtotal = qty * price;
      totalAmount += subtotal;

      return {
        productId: item.productId || null,
        productName: (item.productName || 'Món ăn/Nguyên liệu').trim(),
        unit: item.unit || 'Con',
        batchCode: item.batchCode || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    const paymentStatus = paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID';

    // Execute full stock receipt & multi-branch stock update atomically via Prisma Transaction
    const newReceipt = await prisma.$transaction(async (tx) => {
      // 1. Ensure all Products exist first to get valid productIds
      const receiptItemsData = [];
      for (const item of preppedItems) {
        let targetProduct = null;
        if (item.productId) {
          targetProduct = await tx.product.findUnique({ where: { id: item.productId } });
        }
        if (!targetProduct && item.productName) {
          targetProduct = await tx.product.findFirst({ where: { name: item.productName } });
        }

        if (!targetProduct) {
          targetProduct = await tx.product.create({
            data: {
              name: item.productName,
              price: item.unitPrice > 0 ? Math.round(item.unitPrice * 1.5) : 60000,
              costPrice: item.unitPrice > 0 ? item.unitPrice : 0,
              stockQuantity: 0,
              unit: item.unit || 'Kg',
              isAvailable: true,
            },
          });
        }

        receiptItemsData.push({
          ...item,
          productId: targetProduct.id,
        });

        // Update total stockQuantity and costPrice in Product table
        await tx.product.update({
          where: { id: targetProduct.id },
          data: {
            stockQuantity: { increment: item.quantity },
            costPrice: item.unitPrice > 0 ? item.unitPrice : targetProduct.costPrice,
            isAvailable: true,
            ...(item.unit && { unit: item.unit }),
          },
        });

        // Sync Per-Branch Stock in BranchInventory Table (Upsert with guaranteed valid foreign keys)
        await tx.branchInventory.upsert({
          where: {
            productId_branchId: {
              productId: targetProduct.id,
              branchId: validBranchId,
            },
          },
          update: {
            stock: { increment: item.quantity },
          },
          create: {
            productId: targetProduct.id,
            branchId: validBranchId,
            stock: item.quantity,
          },
        });

        // Sync InventoryItem Table
        let targetInvItem = await tx.inventoryItem.findFirst({
          where: {
            OR: [{ name: item.productName }, { name: { contains: item.productName } }],
          },
        });

        if (targetInvItem) {
          await tx.inventoryItem.update({
            where: { id: targetInvItem.id },
            data: {
              currentQuantity: Math.max(0, targetInvItem.currentQuantity + item.quantity),
              costPerUnit: item.unitPrice > 0 ? item.unitPrice : targetInvItem.costPerUnit,
              supplier: supplierName || targetInvItem.supplier,
            },
          });

          // Create InventoryTransaction IN
          await tx.inventoryTransaction.create({
            data: {
              itemId: targetInvItem.id,
              type: 'IN',
              quantity: item.quantity,
              note: `Nhập kho từ phiếu ${receiptCode} tại ${validBranch.name} (NCC: ${supplierName})`,
            },
          });
        } else {
          // Create new InventoryItem if not existing
          const createdInvItem = await tx.inventoryItem.create({
            data: {
              name: item.productName,
              unit: item.unit || 'Kg',
              currentQuantity: item.quantity,
              minQuantity: 10,
              costPerUnit: item.unitPrice,
              supplier: supplierName,
              branchId: validBranchId,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              itemId: createdInvItem.id,
              type: 'IN',
              quantity: item.quantity,
              note: `Nhập kho ban đầu từ phiếu ${receiptCode} tại ${validBranch.name} (NCC: ${supplierName})`,
            },
          });
        }
      }

      // 2. Save InventoryReceipt with validated productIds
      const receipt = await tx.inventoryReceipt.create({
        data: {
          receiptCode,
          branchId: validBranchId,
          supplierName,
          totalAmount,
          paymentMethod,
          paymentStatus,
          creatorName: creatorName || 'Quản lý kho',
          notes: notes || '',
          receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
          items: {
            create: receiptItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return receipt;
    });

    // 3. Revalidate stock check pages for instant sync
    try {
      revalidatePath('/admin/inventory/stock');
      revalidatePath('/admin/inventory-check');
      revalidatePath('/admin/inventory/inbound');
      revalidatePath('/admin/inventory/import');
      revalidatePath('/admin/products');
      revalidatePath('/');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Tạo phiếu nhập kho ${receiptCode} thành công với ${preppedItems.length} mặt hàng!`,
      receipt: newReceipt,
    });
  } catch (error: any) {
    console.error('Error creating inventory import receipt:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
