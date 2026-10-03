import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, type, isActive } = body;

    const script = await prisma.careScript.findUnique({ where: { id } });
    if (!script) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy kịch bản' }, { status: 404 });
    }

    const updated = await prisma.careScript.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : script.title,
        content: content !== undefined ? content.trim() : script.content,
        type: type !== undefined ? type : script.type,
        isActive: isActive !== undefined ? Boolean(isActive) : script.isActive,
      },
    });

    return NextResponse.json({ success: true, script: updated });
  } catch (error: any) {
    console.error('Error updating care script:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete: set isActive = false
    const updated = await prisma.careScript.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Đã ẩn kịch bản thành công', script: updated });
  } catch (error: any) {
    console.error('Error deleting care script:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
