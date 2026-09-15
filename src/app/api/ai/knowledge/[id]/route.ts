import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, question, answer, isActive, priority } = body;

    const updateData: any = {};
    if (category !== undefined) updateData.category = category;
    if (question !== undefined) updateData.question = question ? question.trim() : null;
    if (answer !== undefined) updateData.answer = answer.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (priority !== undefined) updateData.priority = Number(priority);

    const updated = await prisma.aIKnowledge.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, item: updated, message: 'Đã cập nhật tri thức thành công!' });
  } catch (error: any) {
    console.error('Error updating AI knowledge:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.aIKnowledge.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi tri thức' });
  } catch (error: any) {
    console.error('Error deleting AI knowledge:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
