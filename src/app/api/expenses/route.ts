import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const paymentMethod = searchParams.get('paymentMethod')?.trim();
    const categoryParam = searchParams.get('category')?.trim();
    const branchId = searchParams.get('branchId')?.trim();
    const fromDate = searchParams.get('fromDate')?.trim();
    const toDate = searchParams.get('toDate')?.trim();

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { note: { contains: search } },
        { expenseCode: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      whereClause.paymentMethod = paymentMethod;
    }

    if (categoryParam && categoryParam !== 'ALL') {
      if (categoryParam.includes('Gà') || categoryParam === 'CHICKEN') {
        whereClause.OR = [
          { category: { contains: 'Gà' } },
          { category: 'CHICKEN' },
        ];
      } else if (categoryParam.includes('Nem') || categoryParam === 'SPRING_ROLL') {
        whereClause.OR = [
          { category: { contains: 'Nem' } },
          { category: 'SPRING_ROLL' },
        ];
      } else {
        whereClause.AND = [
          { category: { not: { contains: 'Gà' } } },
          { category: { not: { contains: 'Nem' } } },
          { category: { not: 'CHICKEN' } },
          { category: { not: 'SPRING_ROLL' } },
        ];
      }
    }

    if (userPayload && userPayload.role === 'MANAGER' && userPayload.branchIds && userPayload.branchIds.length > 0) {
      if (branchId && branchId !== 'ALL' && userPayload.branchIds.includes(branchId)) {
        whereClause.branchId = branchId;
      } else {
        whereClause.branchId = { in: userPayload.branchIds };
      }
    } else if (userPayload && (userPayload.role === 'STAFF' || userPayload.role === 'CASHIER') && userPayload.branchId) {
      whereClause.branchId = userPayload.branchId;
    } else if (branchId && branchId !== 'ALL') {
      whereClause.branchId = branchId;
    }

    if (fromDate || toDate) {
      whereClause.date = {};
      if (fromDate) {
        whereClause.date.gte = new Date(`${fromDate}T00:00:00.000+07:00`);
      }
      if (toDate) {
        whereClause.date.lte = new Date(`${toDate}T23:59:59.999+07:00`);
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const userPayload = token ? await verifyJWT(token) : null;

    const body = await request.json();
    const {
      title,
      amount,
      paymentMethod = 'CASH',
      paymentSource,
      category = 'CHICKEN',
      branchId = 'cs1',
      note = '',
      creatorName = 'Quản trị viên',
      receiptPhoto = null,
    } = body;

    const effectiveBranchId = (userPayload && userPayload.role !== 'ADMIN' && userPayload.branchId)
      ? userPayload.branchId
      : (branchId || 'cs1');

    if (!title || !amount) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền đầy đủ Nội dung chi và Số tiền chi!' },
        { status: 400 }
      );
    }

    // Auto-generate expense code #EXP-0012
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const expenseCode = `#EXP-${randomDigits}`;

    // Detect payment source (CASH or BANK_TRANSFER)
    const effectiveSource = paymentSource || (paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH');

    // Find active shift at branch
    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN', branchId: effectiveBranchId },
      orderBy: { createdAt: 'desc' },
    });

    const expense = await prisma.expense.create({
      data: {
        expenseCode,
        title,
        amount: Number(amount),
        paymentMethod,
        paymentSource: effectiveSource,
        category,
        branchId: effectiveBranchId,
        shiftId: activeShift ? activeShift.id : null,
        note: note || title,
        creatorName: creatorName || 'Quản trị viên',
        receiptPhoto: receiptPhoto || null,
        date: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo phiếu chi ${expenseCode} thành công!`,
      expense,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
