import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    // Fetch all orders placed by this customer phone
    const orders = await prisma.order.findMany({
      where: { customerPhone: customer.phone },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    // Compute most ordered product (Favorite Dish)
    const productFrequency: Record<string, { name: string; count: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const pName = item.productName;
        if (!productFrequency[pName]) {
          productFrequency[pName] = { name: pName, count: 0 };
        }
        productFrequency[pName].count += item.quantity;
      });
    });

    const sortedDishes = Object.values(productFrequency).sort((a, b) => b.count - a.count);
    const favoriteDish = sortedDishes.length > 0 ? `${sortedDishes[0].name} (${sortedDishes[0].count} lần)` : null;

    const firstOrderDate = orders.length > 0 ? orders[orders.length - 1].createdAt : customer.createdAt;
    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : customer.lastOrderAt;

    const now = new Date();
    let daysSinceLastOrder: number | null = null;
    if (lastOrderDate) {
      const diffMs = now.getTime() - new Date(lastOrderDate).getTime();
      daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        favoriteDish: customer.favoriteDish || favoriteDish,
        daysSinceLastOrder,
        firstOrderDate,
        lastOrderDate,
      },
      orders,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, address, tasteNotes, branchId, reorderNotes } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (tasteNotes !== undefined) updateData.tasteNotes = tasteNotes;
    if (branchId) updateData.branchId = branchId;
    if (reorderNotes !== undefined) updateData.reorderNotes = reorderNotes;

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
