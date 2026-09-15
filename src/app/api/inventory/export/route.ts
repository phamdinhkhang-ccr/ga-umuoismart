import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const branchId = searchParams.get('branchId') || 'all';
    const reasonCategory = searchParams.get('reasonCategory') || 'all';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const whereClause: any = {};

    if (branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    if (reasonCategory !== 'all') {
      whereClause.reasonCategory = reasonCategory;
    }

    if (fromDate || toDate) {
      whereClause.exportedAt = {};
      if (fromDate) {
        whereClause.exportedAt.gte = new Date(`${fromDate}T00:00:00.000+07:00`);
      }
      if (toDate) {
        whereClause.exportedAt.lte = new Date(`${toDate}T23:59:59.999+07:00`);
      }
    }

    if (search) {
      whereClause.OR = [
        { exportCode: { contains: search } },
        { creatorName: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const exports = await prisma.inventoryExport.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalExportsCount = exports.length;
    const totalExportValue = exports.reduce((sum, e) => sum + e.totalValue, 0);

    // Wastage / Damage Total
    const damageWastageTotal = exports
      .filter((e) => e.reasonCategory === 'DAMAGE_EXPIRED')
      .reduce((sum, e) => sum + e.totalValue, 0);

    const processingTotal = exports
      .filter((e) => e.reasonCategory === 'PROCESSING')
      .reduce((sum, e) => sum + e.totalValue, 0);

    const transferTotal = exports
      .filter((e) => e.reasonCategory === 'TRANSFER')
      .reduce((sum, e) => sum + e.totalValue, 0);

    const sampleTotal = exports
      .filter((e) => e.reasonCategory === 'SAMPLE_INTERNAL' || e.reasonCategory === 'PROMOTION')
      .reduce((sum, e) => sum + e.totalValue, 0);

    return NextResponse.json({
      success: true,
      exports,
      summary: {
        totalExportsCount,
        totalExportValue,
        damageWastageTotal,
        processingTotal,
        transferTotal,
        sampleTotal,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory export receipts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      branchId = 'cs1',
      reasonCategory = 'PROCESSING', // PROCESSING, DAMAGE_EXPIRED, TRANSFER, SAMPLE_INTERNAL, PROMOTION, OTHER
      targetBranchId,
      exportedAt,
      creatorName = 'Quản lý kho',
      notes,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn ít nhất 1 mặt hàng cần xuất kho!' },
        { status: 400 }
      );
    }

    if (reasonCategory === 'TRANSFER' && !targetBranchId) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn Kho Nhận Hàng (Đích) khi điều chuyển!' },
        { status: 400 }
      );
    }

    if (reasonCategory === 'TRANSFER' && targetBranchId === branchId) {
      return NextResponse.json(
        { success: false, error: 'Kho Nhận Hàng (Đích) phải khác Kho Xuất Hàng (Nguồn)!' },
        { status: 400 }
      );
    }

    // Validate Stock for each item
    for (const item of items) {
      if (item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod) {
          const exportQty = Number(item.quantity) || 0;
          if (exportQty > prod.stockQuantity) {
            return NextResponse.json(
              {
                success: false,
                error: `Không thể xuất kho! Số lượng xuất (${exportQty} ${item.unit || 'món'}) vượt quá tồn kho hiện tại (${prod.stockQuantity} ${item.unit || 'món'}) của sản phẩm ${prod.name}.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Auto-generate export code #XK-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const exportCode = `#XK-${randomDigits}`;

    let totalValue = 0;
    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unitCost) || 0;
      const subtotal = qty * unitCost;
      totalValue += subtotal;

      return {
        productId: item.productId || null,
        productName: item.productName || 'Sản phẩm không tên',
        unit: item.unit || 'Con',
        batchCode: null,
        quantity: qty,
        unitCost,
        subtotal,
      };
    });

    const reasonLabelMap: Record<string, string> = {
      PROCESSING: 'Xuất bếp chế biến',
      DAMAGE_EXPIRED: 'Xuất hủy / Hao hụt',
      TRANSFER: 'Xuất điều chuyển chi nhánh',
      SAMPLE_INTERNAL: 'Xuất mẫu thử / Nội bộ',
      PROMOTION: 'Xuất làm mẫu thử / Marketing',
      OTHER: 'Xuất kho khác',
    };

    // Execute in Prisma Transaction for 2-way automatic sync & atomicity
    const exportRecord = await prisma.$transaction(async (tx) => {
      // 1. Create InventoryExport record
      const createdRecord = await tx.inventoryExport.create({
        data: {
          exportCode,
          branchId,
          reasonCategory,
          targetBranchId: reasonCategory === 'TRANSFER' ? targetBranchId : null,
          totalItems: formattedItems.length,
          totalValue,
          creatorName,
          notes: notes || null,
          exportedAt: exportedAt ? new Date(exportedAt) : new Date(),
          items: {
            create: formattedItems,
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Loop items to update stock 2-way
      for (const item of formattedItems) {
        if (item.productId) {
          // Trừ tồn kho tại Kho Xuất (Nguồn)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Deduct matching InventoryItem for source branch if exists
        const sourceInvItem =
          (await tx.inventoryItem.findFirst({
            where: {
              branchId: branchId,
              OR: [
                { name: { contains: item.productName } },
                { supplier: { contains: item.productName } },
              ],
            },
          })) ||
          (await tx.inventoryItem.findFirst({
            where: {
              OR: [
                { name: { contains: item.productName } },
                { supplier: { contains: item.productName } },
              ],
            },
          }));

        if (sourceInvItem) {
          await tx.inventoryItem.update({
            where: { id: sourceInvItem.id },
            data: {
              currentQuantity: {
                decrement: item.quantity,
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              itemId: sourceInvItem.id,
              type: 'OUT',
              quantity: item.quantity,
              note: `${reasonLabelMap[reasonCategory] || 'Xuất kho'} (${branchId}) - Phiếu ${exportCode}`,
            },
          });
        }

        // If TRANSFER: Cộng tồn kho tại Kho Nhận (Đích) 2 chiều
        if (reasonCategory === 'TRANSFER' && targetBranchId) {
          let targetInvItem = await tx.inventoryItem.findFirst({
            where: {
              branchId: targetBranchId,
              name: item.productName,
            },
          });

          if (targetInvItem) {
            await tx.inventoryItem.update({
              where: { id: targetInvItem.id },
              data: {
                currentQuantity: {
                  increment: item.quantity,
                },
              },
            });
          } else {
            targetInvItem = await tx.inventoryItem.create({
              data: {
                name: item.productName,
                unit: item.unit || 'Con',
                category: 'Thịt gà & Phụ phẩm tươi',
                branchId: targetBranchId,
                currentQuantity: item.quantity,
                minQuantity: 10,
                costPerUnit: item.unitCost,
                supplier: 'Điều chuyển nội bộ',
              },
            });
          }

          await tx.inventoryTransaction.create({
            data: {
              itemId: targetInvItem.id,
              type: 'IN',
              quantity: item.quantity,
              note: `Nhận điều chuyển 2 chiều từ kho ${branchId} - Phiếu ${exportCode}`,
            },
          });
        }
      }

      return createdRecord;
    });

    return NextResponse.json({
      success: true,
      exportRecord,
      message:
        reasonCategory === 'TRANSFER'
          ? `Tạo phiếu điều chuyển ${exportCode} thành công! Đã tự động cập nhật tồn kho 2 chiều.`
          : `Tạo phiếu xuất kho ${exportCode} thành công!`,
    });
  } catch (error: any) {
    console.error('Error creating inventory export receipt:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
