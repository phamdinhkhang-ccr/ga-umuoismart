import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      amount,
      paymentMethod,
      category,
      targetCategory,
      productId,
      branchId,
      note,
      creatorName,
      receiptPhoto,
    } = body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu chi!' }, { status: 404 });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        title: title || existing.title,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        paymentMethod: paymentMethod || existing.paymentMethod,
        category: category || existing.category,
        targetCategory: targetCategory !== undefined ? targetCategory : existing.targetCategory,
        productId: productId !== undefined ? productId : existing.productId,
        branchId: branchId || existing.branchId,
        note: note !== undefined ? note : existing.note,
        creatorName: creatorName || existing.creatorName,
        receiptPhoto: receiptPhoto !== undefined ? receiptPhoto : existing.receiptPhoto,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật phiếu chi thành công!',
      expense: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy phiếu chi!' }, { status: 404 });
    }

    // Soft Delete - Bảo tồn dữ liệu sổ quỹ (Đặt số tiền về 0 và ghi nhận hủy)
    await prisma.expense.update({
      where: { id },
      data: {
        amount: 0,
        title: existing.title.startsWith('[ĐÃ HỦY]') ? existing.title : `[ĐÃ HỦY] ${existing.title}`,
        note: existing.note ? `[Đã hủy] ${existing.note}` : '[Đã hủy phiếu chi]',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã hủy phiếu chi an toàn (Soft Delete)!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
