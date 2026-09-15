import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const category = searchParams.get('category')?.trim() || 'ALL'; // ALL, VIP, REGULAR, NEW, CHURN_RISK
    const branchId = searchParams.get('branchId')?.trim() || 'all';

    const rawCustomers = await prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' },
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalCount = rawCustomers.length;
    let vipCount = 0;
    let repeatCount = 0;
    let newThisMonthCount = 0;
    let churnRiskCount = 0;

    const processedCustomers = rawCustomers.map((c) => {
      let daysSinceLastOrder: number | null = null;
      let isChurnRisk = false;

      if (c.lastOrderAt) {
        const diffMs = now.getTime() - new Date(c.lastOrderAt).getTime();
        daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (daysSinceLastOrder >= 30) {
          isChurnRisk = true;
        }
      }

      let tier: 'VIP' | 'REGULAR' | 'NEW' = 'NEW';
      if (c.totalSpent >= 1000000) {
        tier = 'VIP';
        vipCount++;
      } else if (c.totalOrders >= 2) {
        tier = 'REGULAR';
      }

      if (c.totalOrders >= 2) {
        repeatCount++;
      }

      if (new Date(c.createdAt) >= currentMonthStart || (c.lastOrderAt && new Date(c.lastOrderAt) >= currentMonthStart && c.totalOrders <= 1)) {
        newThisMonthCount++;
      }

      if (isChurnRisk) {
        churnRiskCount++;
      }

      return {
        ...c,
        daysSinceLastOrder,
        isChurnRisk,
        tier,
      };
    });

    // Retention Rate = (Repeat Customers / Total Customers) * 100
    const retentionRate = totalCount > 0 ? Number(((repeatCount / totalCount) * 100).toFixed(1)) : 0;

    // Filter by search, category, and branchId
    let filtered = processedCustomers;

    if (search) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(search) || c.phone.includes(search)
      );
    }

    if (branchId !== 'all') {
      filtered = filtered.filter((c) => c.branchId === branchId || (!c.branchId && branchId === 'cs1'));
    }

    if (category === 'VIP') {
      filtered = filtered.filter((c) => c.tier === 'VIP');
    } else if (category === 'REGULAR') {
      filtered = filtered.filter((c) => c.tier === 'REGULAR');
    } else if (category === 'NEW') {
      filtered = filtered.filter((c) => c.tier === 'NEW');
    } else if (category === 'CHURN_RISK') {
      filtered = filtered.filter((c) => c.isChurnRisk);
    }

    return NextResponse.json({
      success: true,
      customers: filtered,
      summary: {
        totalCount,
        vipCount,
        retentionRate,
        newThisMonthCount,
        churnRiskCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching CRM customers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, address, tasteNotes, branchId = 'cs1' } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Họ tên và Số điện thoại là bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      const updated = await prisma.customer.update({
        where: { phone },
        data: {
          name,
          address: address || existing.address,
          tasteNotes: tasteNotes || existing.tasteNotes,
          branchId: branchId || existing.branchId,
        },
      });
      return NextResponse.json({ success: true, customer: updated });
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        phone,
        address: address || '',
        tasteNotes: tasteNotes || null,
        branchId: branchId || 'cs1',
      },
    });

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
