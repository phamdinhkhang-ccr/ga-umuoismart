import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;
    const userRole = (userPayload?.role || '').toUpperCase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const category = searchParams.get('category')?.trim() || 'ALL'; // ALL, VIP, REGULAR, NEW, CHURN_RISK, NEED_CARE_7D, NEED_CARE_14D
    let branchId = searchParams.get('branchId')?.trim() || 'all';
    const careStatus = searchParams.get('careStatus')?.trim() || 'ALL'; // ALL, NEW, CONTACTED, NEED_FOLLOW_UP

    if (userPayload && (userRole === 'MANAGER' || userRole === 'STAFF' || userRole === 'CASHIER')) {
      const allowedBranch = userPayload.branchId || (userPayload.branchIds && userPayload.branchIds[0]);
      if (allowedBranch) {
        branchId = allowedBranch;
      }
    }

    const whereClause: any = { isActive: true };
    if (branchId !== 'all') {
      whereClause.OR = [
        { branchId },
        { branchId: branchId.toLowerCase() },
        { branchId: branchId.toUpperCase() },
        ...(branchId === 'cs1' ? [{ branchId: null }] : []),
      ];
    }

    const rawCustomers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { totalSpent: 'desc' },
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalCount = rawCustomers.length;
    let vipCount = 0;
    let repeatCount = 0;
    let newThisMonthCount = 0;
    let churnRiskCount = 0;
    let needCareCount = 0;

    const processedCustomers = rawCustomers.map((c) => {
      let daysSinceLastOrder: number | null = null;
      let daysSinceLastCare: number | null = null;
      let isChurnRisk = false;

      const orderTime = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : null;
      if (orderTime) {
        const diffMs = now.getTime() - orderTime;
        daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (daysSinceLastOrder >= 30) {
          isChurnRisk = true;
        }
      }

      const careTime = c.lastCareAt
        ? new Date(c.lastCareAt).getTime()
        : c.lastContactedAt
        ? new Date(c.lastContactedAt).getTime()
        : null;

      if (careTime) {
        const diffMs = now.getTime() - careTime;
        daysSinceLastCare = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
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

      if (
        new Date(c.createdAt) >= currentMonthStart ||
        (c.lastOrderAt && new Date(c.lastOrderAt) >= currentMonthStart && c.totalOrders <= 1)
      ) {
        newThisMonthCount++;
      }

      if (isChurnRisk) {
        churnRiskCount++;
      }

      // Check if customer needs care: (No care yet OR >7 days without care) AND (has purchased or >7 days since order)
      const isCareNeeded =
        c.careStatus === 'NEED_FOLLOW_UP' ||
        c.careStatus === 'NEW' ||
        (daysSinceLastCare !== null && daysSinceLastCare >= 7) ||
        (daysSinceLastOrder !== null && daysSinceLastOrder >= 7 && (!daysSinceLastCare || daysSinceLastCare >= 7));

      if (isCareNeeded) {
        needCareCount++;
      }

      return {
        ...c,
        daysSinceLastOrder,
        daysSinceLastCare,
        isChurnRisk,
        isCareNeeded,
        tier,
      };
    });

    // Retention Rate = (Repeat Customers / Total Customers) * 100
    const retentionRate = totalCount > 0 ? Number(((repeatCount / totalCount) * 100).toFixed(1)) : 0;

    // Filter by search, category, branchId, and careStatus
    let filtered = processedCustomers;

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          (c.address && c.address.toLowerCase().includes(search))
      );
    }

    if (branchId !== 'all') {
      filtered = filtered.filter((c) => c.branchId === branchId || (!c.branchId && branchId === 'cs1'));
    }

    if (careStatus !== 'ALL') {
      filtered = filtered.filter((c) => (c.careStatus || 'NEW') === careStatus);
    }

    if (category === 'VIP') {
      filtered = filtered.filter((c) => c.tier === 'VIP');
    } else if (category === 'REGULAR') {
      filtered = filtered.filter((c) => c.tier === 'REGULAR');
    } else if (category === 'NEW') {
      filtered = filtered.filter((c) => c.tier === 'NEW');
    } else if (category === 'CHURN_RISK') {
      filtered = filtered.filter((c) => c.isChurnRisk);
    } else if (category === 'NEED_CARE_7D') {
      filtered = filtered.filter(
        (c) =>
          (c.daysSinceLastOrder !== null && c.daysSinceLastOrder >= 7) ||
          (c.daysSinceLastCare !== null && c.daysSinceLastCare >= 7) ||
          c.careStatus === 'NEED_FOLLOW_UP'
      );
    } else if (category === 'NEED_CARE_14D') {
      filtered = filtered.filter(
        (c) =>
          (c.daysSinceLastOrder !== null && c.daysSinceLastOrder >= 14) ||
          (c.daysSinceLastCare !== null && c.daysSinceLastCare >= 14) ||
          c.careStatus === 'NEED_FOLLOW_UP'
      );
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
        needCareCount,
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
    const { name, phone, address, tasteNotes, branchId = 'cs1', notes, careStatus = 'NEW' } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Họ tên và Số điện thoại là bắt buộc' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check duplicate by phone
    const existing = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
    if (existing) {
      const updated = await prisma.customer.update({
        where: { phone: cleanPhone },
        data: {
          name: name.trim(),
          address: address !== undefined ? address.trim() : existing.address,
          tasteNotes: tasteNotes !== undefined ? tasteNotes : existing.tasteNotes,
          notes: notes !== undefined ? notes : existing.notes,
          branchId: branchId || existing.branchId,
          careStatus: careStatus || existing.careStatus || 'NEW',
          isActive: true,
        },
      });
      return NextResponse.json({
        success: true,
        isExisting: true,
        message: 'Đã cập nhật thông tin khách hàng hiện có!',
        customer: updated,
      });
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        address: address ? address.trim() : '',
        tasteNotes: tasteNotes || null,
        notes: notes || null,
        branchId: branchId || 'cs1',
        careStatus: careStatus || 'NEW',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      isExisting: false,
      message: 'Đã tạo mới khách hàng thành công!',
      customer: newCustomer,
    });
  } catch (error: any) {
    console.error('Error creating/updating customer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
