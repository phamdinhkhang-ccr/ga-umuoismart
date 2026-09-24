import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

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
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    if (!userPayload || (userPayload.role !== 'ADMIN' && userPayload.role !== 'MANAGER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản nhân viên không có quyền thực hiện xuất kho (403 Forbidden).' },
        { status: 403 }
      );
    }

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

    // Validate Branch Stock for each item
    for (const item of items) {
      if (item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        const branchInv = await prisma.branchInventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: branchId || 'cs1',
            },
          },
        });
        const availableBranchStock = branchInv ? branchInv.stock : 0;
        const exportQty = Number(item.quantity) || 0;

        if (exportQty > availableBranchStock) {
          const branchObj = await prisma.branch.findUnique({ where: { id: branchId } });
          const branchName = branchObj ? branchObj.name : branchId;
          return NextResponse.json(
            {
              success: false,
              error: `Không thể xuất kho! Số lượng xuất (${exportQty} ${item.unit || 'món'}) vượt quá tồn kho thực tế tại cơ sở ${branchName} (${availableBranchStock} ${item.unit || 'món'}) của sản phẩm ${prod?.name || item.productName}.`,
            },
            { status: 400 }
          );
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

      // 2. Loop items to update per-branch stock
      for (const item of formattedItems) {
        if (item.productId) {
          // Trừ tồn kho BranchInventory tại Kho Xuất (Nguồn)
          await tx.branchInventory.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: branchId,
              },
            },
            update: {
              stock: { decrement: item.quantity },
            },
            create: {
              productId: item.productId,
              branchId: branchId,
              stock: -item.quantity,
            },
          });

          // Nếu không phải ĐIỀU CHUYỂN, mới trừ tồn kho tổng Product.stockQuantity
          if (reasonCategory !== 'TRANSFER') {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else if (targetBranchId) {
            // NẾU LÀ ĐIỀU CHUYỂN: Cộng tồn kho BranchInventory tại Kho Nhận (Đích)
            await tx.branchInventory.upsert({
              where: {
                productId_branchId: {
                  productId: item.productId,
                  branchId: targetBranchId,
                },
              },
              update: {
                stock: { increment: item.quantity },
              },
              create: {
                productId: item.productId,
                branchId: targetBranchId,
                stock: item.quantity,
              },
            });
          }
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

        // If TRANSFER: Cộng tồn kho InventoryItem tại Kho Nhận (Đích)
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
