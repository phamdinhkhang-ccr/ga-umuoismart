import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || 'all';
    const branchId = searchParams.get('branchId') || 'all';

    const isAllDates = !dateParam || dateParam === 'all';
    const isAllBranches = branchId === 'all';

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (!isAllDates) {
      startDate = new Date(`${dateParam}T00:00:00.000+07:00`);
      endDate = new Date(`${dateParam}T23:59:59.999+07:00`);
    }

    // Fetch active branch list from Database
    const dbBranches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const branchList = dbBranches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      badge: b.code ? b.code.toUpperCase() : `CƠ SỞ`,
    }));

    const branchNameMap: Record<string, string> = {};
    dbBranches.forEach((b) => {
      branchNameMap[b.id] = b.name;
      if (b.code) {
        branchNameMap[b.code] = b.name;
      }
    });

    // Determine target branch filter IDs
    let targetBranchIds: string[] = [];
    if (!isAllBranches) {
      const foundBranch = dbBranches.find((b) => b.id === branchId || b.code === branchId);
      if (foundBranch) {
        targetBranchIds = [foundBranch.id, foundBranch.code].filter(Boolean) as string[];
      } else {
        targetBranchIds = [branchId];
      }
    }

    // 1. Fetch Orders for Summary KPI Cards
    const orderWhere: any = {};
    if (startDate && endDate) {
      orderWhere.createdAt = { gte: startDate, lte: endDate };
    }
    if (!isAllBranches) {
      orderWhere.branchId = { in: targetBranchIds };
    }

    const ordersInDay = await prisma.order.findMany({ where: orderWhere });
    const validOrders = ordersInDay.filter((o) => o.status !== 'CANCELLED');

    const totalDayRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Sum cashAmount (includes cash portion of SPLIT orders)
    const cashRevenue = validOrders.reduce((sum, o) => {
      if (o.cashAmount > 0) return sum + o.cashAmount;
      if (o.paymentMethod === 'COD' || o.paymentMethod === 'CASH') return sum + o.totalAmount;
      return sum;
    }, 0);

    // Sum transferAmount (includes transfer portion of SPLIT orders)
    const bankRevenue = validOrders.reduce((sum, o) => {
      if (o.transferAmount > 0) return sum + o.transferAmount;
      if (o.paymentMethod === 'BANK_TRANSFER' || o.paymentMethod === 'BANK') return sum + o.totalAmount;
      return sum;
    }, 0);

    // Sum unpaid orders
    const unpaidRevenue = ordersInDay
      .filter((o) => o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // 2. Fetch Expenses for Summary KPI Cards
    const expenseWhere: any = {};
    if (startDate && endDate) {
      expenseWhere.date = { gte: startDate, lte: endDate };
    }
    if (!isAllBranches) {
      expenseWhere.branchId = { in: targetBranchIds };
    }

    const expensesInDay = await prisma.expense.findMany({ where: expenseWhere });

    let cashExpense = 0;
    let bankExpense = 0;

    expensesInDay.forEach((e) => {
      const source = (e.paymentSource || e.paymentMethod || '').toUpperCase();
      if (source === 'BANK_TRANSFER' || source === 'BANK') {
        bankExpense += e.amount;
      } else {
        cashExpense += e.amount;
      }
    });

    // 3. Query Shifts
    const shiftWhere: any = {};
    if (startDate && endDate) {
      shiftWhere.startTime = { gte: startDate, lte: endDate };
    }
    if (!isAllBranches) {
      shiftWhere.branchId = { in: targetBranchIds };
    }

    const shifts = await prisma.shift.findMany({
      where: shiftWhere,
      orderBy: { startTime: 'desc' },
    });

    const activeShift = await prisma.shift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });

    // Enriched Shifts with Detailed Closeout Reconciliation
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const sEnd = shift.endTime || new Date();

        const shiftOrders = await prisma.order.findMany({
          where: {
            OR: [
              { shiftId: shift.id },
              {
                createdAt: { gte: shift.startTime, lte: sEnd },
                branchId: shift.branchId || undefined,
              },
            ],
          },
        });

        const sValidOrders = shiftOrders.filter((o) => o.status !== 'CANCELLED');

        // Cash sales in shift (including cash component of split orders)
        const shiftCashSales = sValidOrders.reduce((acc, o) => {
          if (o.cashAmount > 0) return acc + o.cashAmount;
          if (o.paymentMethod === 'COD' || o.paymentMethod === 'CASH') return acc + o.totalAmount;
          return acc;
        }, 0);

        // Bank transfer sales in shift (including transfer component of split orders)
        const shiftBankSales = sValidOrders.reduce((acc, o) => {
          if (o.transferAmount > 0) return acc + o.transferAmount;
          if (o.paymentMethod === 'BANK_TRANSFER' || o.paymentMethod === 'BANK') return acc + o.totalAmount;
          return acc;
        }, 0);

        // Unpaid sales in shift
        const shiftUnpaidSales = shiftOrders
          .filter((o) => o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED')
          .reduce((acc, o) => acc + o.totalAmount, 0);

        // Shift Expenses
        const shiftExpenses = await prisma.expense.findMany({
          where: {
            OR: [
              { shiftId: shift.id },
              {
                date: { gte: shift.startTime, lte: sEnd },
                branchId: shift.branchId || undefined,
              },
            ],
          },
        });

        let sCashExpense = 0;
        let sBankExpense = 0;

        shiftExpenses.forEach((e) => {
          const source = (e.paymentSource || e.paymentMethod || '').toUpperCase();
          if (source === 'BANK_TRANSFER' || source === 'BANK') {
            sBankExpense += e.amount;
          } else {
            sCashExpense += e.amount;
          }
        });

        // Theoretical End Cash = Initial Cash + Cash Sales - Cash Expenses
        const expectedCash = shift.initialCash + shiftCashSales - sCashExpense;
        const actualCash = shift.finalCashActual ?? (shift.status === 'CLOSED' ? expectedCash : shift.initialCash);
        const discrepancy = actualCash - expectedCash;

        return {
          id: shift.id,
          shiftName: shift.shiftName || 'Ca Sáng',
          staffName: shift.staffName,
          teamMembers: shift.teamMembers || '',
          branchId: shift.branchId || 'cs1',
          branchName: branchNameMap[shift.branchId || 'cs1'] || 'Cơ Sở Cầu Giấy',
          initialCash: shift.initialCash,
          finalCashExpected: expectedCash,
          finalCashActual: actualCash,
          cashSales: shiftCashSales,
          bankSales: shiftBankSales,
          unpaidSales: shiftUnpaidSales,
          cashExpenses: sCashExpense,
          bankExpenses: sBankExpense,
          discrepancy,
          status: shift.status,
          note: shift.note,
          inventoryNote: shift.inventoryNote || '-',
          startTime: shift.startTime,
          endTime: shift.endTime,
        };
      })
    );

    return NextResponse.json({
      success: true,
      date: dateParam,
      branchId,
      branchList,
      metrics: {
        totalDayRevenue,
        cashRevenue,
        bankRevenue,
        unpaidRevenue,
        cashExpense,
        bankExpense,
      },
      shifts: enrichedShifts,
      activeShift,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, staffName, teamMembers, shiftName, branchId, initialCash, initialInventory, inventoryNote, finalCashActual, finalInventory, note, shiftId } = body;

    if (action === 'START') {
      const targetBranch = branchId || 'cs1';
      const existingOpen = await prisma.shift.findFirst({
        where: {
          status: 'OPEN',
          branchId: targetBranch,
        },
      });
      if (existingOpen) {
        return NextResponse.json(
          {
            success: false,
            error: `Cơ sở này đang có Ca làm việc chưa đóng (Thu ngân: ${existingOpen.staffName}). Vui lòng chốt ca trước khi mở ca mới!`,
            existingShift: existingOpen,
          },
          { status: 400 }
        );
      }

      const initialInvStr = typeof initialInventory === 'object' ? JSON.stringify(initialInventory) : (initialInventory || '');
      const teamMembersStr = typeof teamMembers === 'object' ? JSON.stringify(teamMembers) : (teamMembers || '');
      const invNoteText = inventoryNote || (typeof initialInventory === 'string' ? initialInventory : '');

      const newShift = await prisma.shift.create({
        data: {
          staffName: staffName || 'Nhân viên',
          shiftName: shiftName || 'Ca Sáng',
          branchId: targetBranch,
          teamMembers: teamMembersStr,
          initialCash: Number(initialCash) || 0,
          initialInventory: initialInvStr,
          inventoryNote: invNoteText,
          status: 'OPEN',
          note: note || '',
        },
      });

      return NextResponse.json({ success: true, shift: newShift });
    }

    if (action === 'CLOSE') {
      const targetId = shiftId;
      const targetShift = targetId
        ? await prisma.shift.findUnique({ where: { id: targetId } })
        : await prisma.shift.findFirst({ where: { status: 'OPEN' } });

      if (!targetShift) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy ca làm việc mở để kết thúc' }, { status: 404 });
      }

      const finalInvStr = typeof finalInventory === 'object' ? JSON.stringify(finalInventory) : (finalInventory || '');
      const invNoteText = inventoryNote || (typeof finalInventory === 'string' ? finalInventory : targetShift.inventoryNote);

      const closedShift = await prisma.shift.update({
        where: { id: targetShift.id },
        data: {
          endTime: new Date(),
          finalCashActual: Number(finalCashActual) ?? targetShift.initialCash,
          finalInventory: finalInvStr,
          inventoryNote: invNoteText,
          status: 'CLOSED',
          note: note || targetShift.note,
        },
      });

      return NextResponse.json({ success: true, shift: closedShift });
    }

    return NextResponse.json({ success: false, error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
