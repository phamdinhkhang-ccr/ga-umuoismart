import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone || phone.length < 9) {
      return NextResponse.json({ success: false, message: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Look up customer by exact phone or containing phone
    const customer = await prisma.customer.findFirst({
      where: {
        phone: {
          contains: cleanPhone,
        },
      },
    });

    if (customer) {
      return NextResponse.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || '',
          totalOrders: customer.totalOrders || 0,
          totalSpent: customer.totalSpent || 0,
          lastOrderAt: customer.lastOrderAt,
        },
      });
    }

    // Fallback search in Order table if not found in Customer model
    const lastOrder = await prisma.order.findFirst({
      where: {
        customerPhone: {
          contains: cleanPhone,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (lastOrder) {
      return NextResponse.json({
        success: true,
        customer: {
          id: lastOrder.id,
          name: lastOrder.customerName,
          phone: lastOrder.customerPhone,
          address: lastOrder.deliveryAddress || '',
          totalOrders: 1,
          totalSpent: lastOrder.totalAmount || 0,
          lastOrderAt: lastOrder.createdAt,
        },
      });
    }

    return NextResponse.json({ success: false, customer: null, message: 'Khách hàng mới' });
  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
