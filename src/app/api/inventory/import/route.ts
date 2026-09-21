import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const body = await request.json();
    const {
      branchId = 'cs1',
      supplierName,
      receivedAt,
      creatorName = 'Quản lý kho',
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

    // Auto-generate receipt code #NK-XXXXX
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const receiptCode = `#NK-${randomDigits}`;

    let totalAmount = 0;
    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const subtotal = qty * price;
      totalAmount += subtotal;

      return {
        productId: item.productId || null,
        productName: item.productName || 'Món ăn/Nguyên liệu',
        unit: item.unit || 'Con',
        batchCode: item.batchCode || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        quantity: qty,
        unitPrice: price,
        subtotal,
      };
    });

    const paymentStatus = paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID';

    // 1. Save InventoryReceipt
    const newReceipt = await prisma.inventoryReceipt.create({
      data: {
        receiptCode,
        branchId: branchId || 'cs1',
        supplierName,
        totalAmount,
        paymentMethod,
        paymentStatus,
        creatorName: creatorName || 'Quản lý kho',
        notes: notes || '',
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // 2. 2-Way Sync: Update Products, InventoryItems & InventoryTransactions
    for (const item of formattedItems) {
      try {
        // Sync Product Table
        let targetProduct = item.productId
          ? await prisma.product.findUnique({ where: { id: item.productId } })
          : await prisma.product.findFirst({ where: { name: item.productName } });

        if (targetProduct) {
          // Update total stockQuantity and costPrice in Product table
          await prisma.product.update({
            where: { id: targetProduct.id },
            data: {
              stockQuantity: { increment: item.quantity },
              costPrice: item.unitPrice > 0 ? item.unitPrice : targetProduct.costPrice,
              isAvailable: true,
              ...(item.unit && { unit: item.unit }),
            },
          });

          // Sync Per-Branch Stock in BranchInventory Table
          const targetBranch = branchId || 'cs1';
          await prisma.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: targetProduct.id,
                branchId: targetBranch,
              },
            },
            update: {
              stock: { increment: item.quantity },
            },
            create: {
              productId: targetProduct.id,
              branchId: targetBranch,
              stock: item.quantity,
            },
          });
        }

        // Sync InventoryItem Table
        let targetInvItem = await prisma.inventoryItem.findFirst({
          where: {
            OR: [{ name: item.productName }, { name: { contains: item.productName } }],
          },
        });

        if (targetInvItem) {
          await prisma.inventoryItem.update({
            where: { id: targetInvItem.id },
            data: {
              currentQuantity: Math.max(0, targetInvItem.currentQuantity + item.quantity),
              costPerUnit: item.unitPrice > 0 ? item.unitPrice : targetInvItem.costPerUnit,
              supplier: supplierName || targetInvItem.supplier,
            },
          });

          // Create InventoryTransaction IN
          await prisma.inventoryTransaction.create({
            data: {
              itemId: targetInvItem.id,
              type: 'IN',
              quantity: item.quantity,
              note: `Nhập kho từ phiếu ${receiptCode} (NCC: ${supplierName})`,
            },
          });
        } else {
          // Create new InventoryItem if not existing
          const createdInvItem = await prisma.inventoryItem.create({
            data: {
              name: item.productName,
              unit: item.unit || 'Con',
              currentQuantity: item.quantity,
              minQuantity: 10,
              costPerUnit: item.unitPrice,
              supplier: supplierName,
            },
          });

          await prisma.inventoryTransaction.create({
            data: {
              itemId: createdInvItem.id,
              type: 'IN',
              quantity: item.quantity,
              note: `Tạo mới & Nhập kho từ phiếu ${receiptCode} (NCC: ${supplierName})`,
            },
          });
        }
      } catch (syncErr) {
        console.error('Error syncing inventory item:', syncErr);
      }
    }

    // 3. Auto Expense Voucher creation if paid by CASH or BANK_TRANSFER
    if (paymentMethod === 'CASH' || paymentMethod === 'BANK_TRANSFER') {
      try {
        const expCode = `#EXP-${Math.floor(1000 + Math.random() * 9000)}`;
        await prisma.expense.create({
          data: {
            expenseCode: expCode,
            title: `Thanh toán phiếu nhập kho ${receiptCode} (NCC: ${supplierName})`,
            amount: totalAmount,
            paymentMethod: paymentMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
            category: 'OTHER',
            branchId: branchId || 'cs1',
            creatorName: creatorName || 'Quản lý kho',
            note: notes ? `Ghi chú phiếu nhập ${receiptCode}: ${notes}` : `Thanh toán trực tiếp phiếu nhập ${receiptCode}`,
            date: new Date(),
          },
        });
      } catch (expErr) {
        console.error('Error creating auto expense voucher:', expErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tạo phiếu nhập kho ${receiptCode} thành công với ${formattedItems.length} mặt hàng!`,
      receipt: newReceipt,
    });
  } catch (error: any) {
    console.error('Error creating inventory import receipt:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
