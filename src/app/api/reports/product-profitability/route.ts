import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. RBAC Authorization check
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userRole = 'ADMIN';
    let userBranchId: string | null = null;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        userRole = payload.role || 'ADMIN';
        userBranchId = payload.branchId || null;
      }
    }

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'TELESALES') {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền truy cập báo cáo lợi nhuận sản phẩm.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    let branchId = searchParams.get('branchId') || 'all';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Force branch lock for MANAGER
    if (userRole === 'MANAGER' && userBranchId) {
      branchId = userBranchId;
    }

    // 2. Determine Date Range
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'last7days') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const isAllBranches = branchId === 'all';

    // 3. Fetch Branch List
    const branchesSetting = await prisma.setting.findUnique({
      where: { key: 'CMS_BRANCHES_JSON' },
    });

    let branchList = [
      { id: 'cs1', name: 'Cơ Sở Cầu Giấy', badge: 'CƠ SỞ 01' },
      { id: 'cs2', name: 'Cơ Sở Đống Đa', badge: 'CƠ SỞ 02' },
      { id: 'cs3', name: 'Cơ Sở Hai Bà Trưng', badge: 'CƠ SỞ 03' },
      { id: 'cs4', name: 'Cơ Sở Thanh Xuân', badge: 'CƠ SỞ 04' },
      { id: 'cs5', name: 'Cơ Sở Tây Hồ', badge: 'CƠ SỞ 05' },
      { id: 'cs6', name: 'Cơ Sở Nam Từ Liêm', badge: 'CƠ SỞ 06' },
    ];

    if (branchesSetting && branchesSetting.value) {
      try {
        const parsed = JSON.parse(branchesSetting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          branchList = parsed.map((b: any, idx: number) => ({
            id: b.id || `cs${idx + 1}`,
            name: b.name || `Cơ Sở ${b.district || idx + 1}`,
            badge: b.badge || `CƠ SỞ 0${idx + 1}`,
          }));
        }
      } catch (e) {}
    }

    const branchNameMap: Record<string, string> = {};
    branchList.forEach((b) => {
      branchNameMap[b.id] = b.name;
    });

    const selectedBranchObj = branchList.find((b) => b.id === branchId);
    const selectedBranchName = selectedBranchObj ? selectedBranchObj.name : 'Tất Cả Cơ Sở (Toàn Hệ Thống)';

    // 4. Query Valid Orders in Period
    const orderWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        not: 'CANCELLED',
      },
    };
    if (!isAllBranches) {
      orderWhere.branchId = branchId;
    }

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: {
          include: {
            product: {
              include: {
                comboItems: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 5. Query Product Catalog
    const catalogProducts = await prisma.product.findMany({
      include: {
        comboItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Helper to determine category tag
    const getCategoryTag = (name: string, categoryName?: string): 'CHICKEN' | 'SPRING_ROLL' | 'OTHER' => {
      const lower = (name + ' ' + (categoryName || '')).toLowerCase();
      if (lower.includes('gà') || lower.includes('chicken')) return 'CHICKEN';
      if (lower.includes('nem') || lower.includes('nhắm')) return 'SPRING_ROLL';
      return 'OTHER';
    };

    // Consumption map for core single products
    const consumptionMap: Record<
      string,
      {
        id: string;
        name: string;
        unit: string;
        costPrice: number;
        sellingPrice: number;
        directQty: number;
        directRevenue: number;
        comboQty: number;
        totalQty: number;
        categoryTag: 'CHICKEN' | 'SPRING_ROLL' | 'OTHER';
        comboBreakdownMap: Record<string, { comboName: string; comboSoldQty: number; portionPerCombo: number; totalConvertedQty: number }>;
        recentOrderList: Array<{ orderCode: string; createdAt: string; quantity: number; branchName: string; customerName: string }>;
      }
    > = {};

    // Initialize map
    catalogProducts.forEach((p) => {
      if (p.type !== 'COMBO') {
        consumptionMap[p.id] = {
          id: p.id,
          name: p.name,
          unit: p.unit || 'Phần',
          costPrice: p.costPrice || 0,
          sellingPrice: p.price,
          directQty: 0,
          directRevenue: 0,
          comboQty: 0,
          totalQty: 0,
          categoryTag: getCategoryTag(p.name),
          comboBreakdownMap: {},
          recentOrderList: [],
        };
      }
    });

    // Process Order Items
    orders.forEach((o) => {
      const bName = branchNameMap[o.branchId || 'cs1'] || 'Cơ Sở Cầu Giấy';

      o.items.forEach((item) => {
        const prod = item.product;
        const pType = prod?.type || (item.productName.toLowerCase().includes('combo') ? 'COMBO' : 'SINGLE');

        if (pType === 'COMBO') {
          // If COMBO: iterate comboItems and accumulate to child single products
          if (prod?.comboItems && prod.comboItems.length > 0) {
            prod.comboItems.forEach((ci) => {
              const childId = ci.productId;
              const childName = ci.product?.name || 'Món con Combo';
              const childQty = item.quantity * ci.quantity;

              if (!consumptionMap[childId]) {
                consumptionMap[childId] = {
                  id: childId,
                  name: childName,
                  unit: ci.product?.unit || 'Phần',
                  costPrice: ci.product?.costPrice || 0,
                  sellingPrice: ci.product?.price || 0,
                  directQty: 0,
                  directRevenue: 0,
                  comboQty: 0,
                  totalQty: 0,
                  categoryTag: getCategoryTag(childName),
                  comboBreakdownMap: {},
                  recentOrderList: [],
                };
              }

              const targetMap = consumptionMap[childId];
              targetMap.comboQty += childQty;

              const comboKey = item.productName;
              if (!targetMap.comboBreakdownMap[comboKey]) {
                targetMap.comboBreakdownMap[comboKey] = {
                  comboName: comboKey,
                  comboSoldQty: 0,
                  portionPerCombo: ci.quantity,
                  totalConvertedQty: 0,
                };
              }
              targetMap.comboBreakdownMap[comboKey].comboSoldQty += item.quantity;
              targetMap.comboBreakdownMap[comboKey].totalConvertedQty += childQty;

              // Record recent order
              if (targetMap.recentOrderList.length < 10) {
                targetMap.recentOrderList.push({
                  orderCode: o.orderCode,
                  createdAt: o.createdAt.toISOString(),
                  quantity: childQty,
                  branchName: bName,
                  customerName: o.customerName,
                });
              }
            });
          }
        } else {
          // SINGLE core product item
          const pId = prod?.id || item.productId || item.productName;
          if (!consumptionMap[pId]) {
            consumptionMap[pId] = {
              id: pId,
              name: item.productName,
              unit: prod?.unit || 'Phần',
              costPrice: prod?.costPrice || (item.price * 0.6),
              sellingPrice: item.price,
              directQty: 0,
              directRevenue: 0,
              comboQty: 0,
              totalQty: 0,
              categoryTag: getCategoryTag(item.productName),
              comboBreakdownMap: {},
              recentOrderList: [],
            };
          }

          const targetMap = consumptionMap[pId];
          targetMap.directQty += item.quantity;
          targetMap.directRevenue += item.subtotal;

          if (targetMap.recentOrderList.length < 10) {
            targetMap.recentOrderList.push({
              orderCode: o.orderCode,
              createdAt: o.createdAt.toISOString(),
              quantity: item.quantity,
              branchName: bName,
              customerName: o.customerName,
            });
          }
        }
      });
    });

    // Compute total COGS Sum
    let totalCOGS_Sum = 0;
    Object.values(consumptionMap).forEach((item) => {
      item.totalQty = item.directQty + item.comboQty;
      const cogs = item.totalQty * item.costPrice;
      totalCOGS_Sum += cogs;
    });

    // Total Net Order Revenue received (after discount)
    const totalNetRevenue_Sum = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Query Expense Receipts in Period & Branch
    const expenseWhere: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (!isAllBranches) {
      expenseWhere.branchId = branchId;
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
    });

    // Group expenses by category
    const chickenExpensesList: any[] = [];
    const springRollExpensesList: any[] = [];
    const otherExpensesList: any[] = [];

    let expenseChickenTotal = 0;
    let expenseSpringRollTotal = 0;
    let expenseOtherTotal = 0;

    expenses.forEach((e) => {
      const catUpper = (e.category || '').toUpperCase();
      const titleLower = (e.title || '' + ' ' + (e.note || '')).toLowerCase();
      const bName = branchNameMap[e.branchId || 'cs1'] || 'Cơ Sở Cầu Giấy';

      const expItem = {
        id: e.id,
        expenseCode: e.expenseCode || `EXP-${e.id.slice(-4).toUpperCase()}`,
        title: e.title,
        amount: e.amount,
        date: e.date.toISOString(),
        branchName: bName,
        creatorName: e.creatorName || 'Quản trị viên',
        receiptPhoto: e.receiptPhoto || null,
        note: e.note || '-',
      };

      if (catUpper === 'CHICKEN' || titleLower.includes('gà') || titleLower.includes('chicken')) {
        expenseChickenTotal += e.amount;
        chickenExpensesList.push(expItem);
      } else if (catUpper === 'SPRING_ROLL' || titleLower.includes('nem') || titleLower.includes('nhắm')) {
        expenseSpringRollTotal += e.amount;
        springRollExpensesList.push(expItem);
      } else {
        expenseOtherTotal += e.amount;
        otherExpensesList.push(expItem);
      }
    });

    const totalExpenses_Sum = expenseChickenTotal + expenseSpringRollTotal + expenseOtherTotal;

    // Calculate Category COGS Subtotals for Expense Allocation
    let cogsChicken = 0;
    let cogsSpringRoll = 0;
    let cogsOther = 0;

    Object.values(consumptionMap).forEach((item) => {
      const itemCOGS = item.totalQty * item.costPrice;
      if (item.categoryTag === 'CHICKEN') cogsChicken += itemCOGS;
      else if (item.categoryTag === 'SPRING_ROLL') cogsSpringRoll += itemCOGS;
      else cogsOther += itemCOGS;
    });

    // Calculate B_i, D_i, A_i for each product
    const productRows = Object.values(consumptionMap)
      .filter((item) => item.totalQty > 0 || item.costPrice > 0)
      .map((item) => {
        const C_i = Math.round(item.totalQty * item.costPrice);
        const costSharePercent = totalCOGS_Sum > 0 ? Number(((C_i / totalCOGS_Sum) * 100).toFixed(2)) : 0;

        // B_i: Allocated Net Revenue
        const B_i = Math.round(totalNetRevenue_Sum * (costSharePercent / 100));

        // D_i: Allocated Direct Expense & matching Expense Receipts List
        let D_i = 0;
        let matchingExpensesList: any[] = [];

        if (item.categoryTag === 'CHICKEN') {
          if (cogsChicken > 0) D_i = Math.round(expenseChickenTotal * (C_i / cogsChicken));
          matchingExpensesList = chickenExpensesList;
        } else if (item.categoryTag === 'SPRING_ROLL') {
          if (cogsSpringRoll > 0) D_i = Math.round(expenseSpringRollTotal * (C_i / cogsSpringRoll));
          matchingExpensesList = springRollExpensesList;
        } else {
          if (cogsOther > 0) D_i = Math.round(expenseOtherTotal * (C_i / cogsOther));
          matchingExpensesList = otherExpensesList;
        }

        // A_i: Final Net Profit
        const A_i = B_i - C_i - D_i;
        const marginPercent = B_i > 0 ? Number(((A_i / B_i) * 100).toFixed(1)) : 0;

        const comboBreakdown = Object.values(item.comboBreakdownMap);

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          categoryTag: item.categoryTag,
          directQty: item.directQty,
          directRevenue: item.directRevenue,
          sellingPrice: item.sellingPrice,
          comboQty: item.comboQty,
          totalQty: item.totalQty,
          costPrice: item.costPrice,
          cogs: C_i,
          costSharePercent,
          netRevenue: B_i,
          expense: D_i,
          netProfit: A_i,
          marginPercent,
          comboBreakdown,
          recentOrders: item.recentOrderList,
          categoryExpenses: matchingExpensesList,
        };
      })
      .sort((a, b) => b.netRevenue - a.netRevenue);

    // Summary Totals
    const totalNetProfit_Sum = totalNetRevenue_Sum - totalCOGS_Sum - totalExpenses_Sum;
    const overallMarginPercent =
      totalNetRevenue_Sum > 0 ? Number(((totalNetProfit_Sum / totalNetRevenue_Sum) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      period,
      branchId,
      userRole,
      selectedBranchName,
      isAllBranches,
      branchList,
      summary: {
        totalNetRevenue: totalNetRevenue_Sum,
        totalCOGS: totalCOGS_Sum,
        totalExpenses: totalExpenses_Sum,
        totalNetProfit: totalNetProfit_Sum,
        overallMarginPercent,
      },
      products: productRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
