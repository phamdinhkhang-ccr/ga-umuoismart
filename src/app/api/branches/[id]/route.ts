import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

function triggerRevalidation() {
  try {
    revalidatePath('/');
    revalidatePath('/admin/branches');
    revalidatePath('/admin/store');
    revalidatePath('/admin/inventory/import');
    revalidatePath('/admin/inventory/export');
    revalidatePath('/checkout');
  } catch (e) {}
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, city, address, hotline, openingHours, managerName, googleMapsUrl, image, isActive, code } = body;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy cơ sở' }, { status: 404 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        code: code || existing.code,
        name: name || existing.name,
        city: city || existing.city,
        address: address || existing.address,
        hotline: hotline || existing.hotline,
        openingHours: openingHours || existing.openingHours,
        managerName: managerName !== undefined ? managerName : existing.managerName,
        googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl : existing.googleMapsUrl,
        image: image !== undefined ? image : existing.image,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    triggerRevalidation();
    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    console.error('API PUT /api/branches/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi cập nhật cơ sở' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy cơ sở' }, { status: 404 });
    }

    const newStatus = body.isActive !== undefined ? Boolean(body.isActive) : !existing.isActive;

    const updated = await prisma.branch.update({
      where: { id },
      data: { isActive: newStatus },
    });

    triggerRevalidation();
    return NextResponse.json({
      success: true,
      branch: updated,
      message: `Đã ${newStatus ? 'mở cửa hoạt động' : 'tạm đóng cửa'} cơ sở thành công`,
    });
  } catch (error: any) {
    console.error('API PATCH /api/branches/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi đổi trạng thái cơ sở' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy cơ sở' }, { status: 404 });
    }

    await prisma.branch.delete({ where: { id } });

    triggerRevalidation();
    return NextResponse.json({ success: true, message: 'Đã xóa cơ sở thành công' });
  } catch (error: any) {
    console.error('API DELETE /api/branches/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi xóa cơ sở' },
      { status: 500 }
    );
  }
}
