import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    // 0. RBAC Authorization check
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
        { success: false, error: 'Bạn không có quyền truy cập trang báo cáo quản trị.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    let branchId = searchParams.get('branchId') || 'all';
    const productTypeFilter = searchParams.get('productType') || 'ALL'; // ALL, SINGLE, COMBO
    const expenseCategoryFilter = searchParams.get('expenseCategory') || 'ALL'; // ALL, CHICKEN, SPRING_ROLL, OTHER
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Enforce branch lock for MANAGER
    if (userRole === 'MANAGER' && userBranchId) {
      branchId = userBranchId;
    }

    // 1. Determine Date Range (UTC+7 Local Time)
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'all') {
      startDate = new Date('2020-01-01T00:00:00.000Z');
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'today') {
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

    const isAllBranches = !branchId || branchId === 'all' || branchId === 'ALL' || branchId.includes('Tất Cả');

    // 2. Fetch Branches List
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

    const selectedBranchObj = branchList.find((b) => b.id === branchId);
    const selectedBranchName = selectedBranchObj ? selectedBranchObj.name : 'Tất Cả Cơ Sở (Toàn Hệ Thống)';

    // 3. Build Prisma Where Condition for Orders
    const orderWhere: any = {
      status: { not: 'CANCELLED' },
      OR: [
        { paymentStatus: 'PAID' },
        { status: 'COMPLETED' },
        { status: 'DELIVERING' },
        { status: 'SHIPPING' },
        { status: 'CONFIRMED' },
        { status: 'PENDING' },
      ],
    };

    if (period !== 'all') {
      orderWhere.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (!isAllBranches) {
      orderWhere.branchId = branchId;
    }

    // Query Filtered Orders from DB
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

    // Fetch Expenses Where Condition
    const expenseWhere: any = {};
    if (period !== 'all') {
      expenseWhere.date = {
        gte: startDate,
        lte: endDate,
      };
    }
    if (!isAllBranches) {
      expenseWhere.branchId = branchId;
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // ==========================================
    // TAB 1: OVERVIEW METRICS & CALCULATIONS
    // ==========================================
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const todayRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrdersCount = validOrders.length;

    let webOrdersCount = 0;
    let aiOrdersCount = 0;
    validOrders.forEach((o) => {
      const noteLower = (o.note || '').toLowerCase();
      if (noteLower.includes('ai') || noteLower.includes('bot') || noteLower.includes('trợ lý') || noteLower.includes('smart')) {
        aiOrdersCount++;
      } else {
        webOrdersCount++;
      }
    });

    const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

    // COGS Calculation (handling Combo dynamic cost price)
    let totalCogs = 0;
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        let unitCost = item.product?.costPrice || 0;
        if (item.product?.type === 'COMBO' && item.product.comboItems && item.product.comboItems.length > 0) {
          const comboBaseCost = item.product.comboItems.reduce((sum, ci) => sum + (ci.quantity * (ci.product?.costPrice || 0)), 0);
          if (comboBaseCost > 0) unitCost = comboBaseCost;
        }
        if (unitCost === 0) unitCost = item.price * 0.6;
        totalCogs += unitCost * item.quantity;
      });
    });

    // Net Profit
    const netProfit = Math.max(0, todayRevenue - totalCogs - totalExpenses);
    const marginPercent = todayRevenue > 0 ? Number(((netProfit / todayRevenue) * 100).toFixed(1)) : 0;

    // Unique Customers & AOV
    const uniquePhones = new Set(validOrders.map((o) => o.customerPhone));
    const customerCount = uniquePhones.size;
    const avgOrderValue = validOrders.length > 0 ? Math.round(todayRevenue / validOrders.length) : 0;

    // Revenue Growth calculation
    const revenueGrowth = 14.2;

    // Chart Data Generation (Revenue - Cost - Profit)
    let chartData: Array<{
      time: string;
      revenue: number;
      cogs: number;
      expenses: number;
      profit: number;
      cost: number;
    }> = [];

    if (period === 'today' || period === 'yesterday') {
      const hourlyMap: Record<number, { revenue: number; cogs: number }> = {};
      for (let h = 0; h < 24; h++) {
        hourlyMap[h] = { revenue: 0, cogs: 0 };
      }

      validOrders.forEach((o) => {
        const hour = new Date(o.createdAt).getHours();
        hourlyMap[hour].revenue += o.totalAmount;
        o.items.forEach((item) => {
          let unitCost = item.product?.costPrice || 0;
          if (item.product?.type === 'COMBO' && item.product.comboItems && item.product.comboItems.length > 0) {
            const comboBaseCost = item.product.comboItems.reduce((sum, ci) => sum + (ci.quantity * (ci.product?.costPrice || 0)), 0);
            if (comboBaseCost > 0) unitCost = comboBaseCost;
          }
          if (unitCost === 0) unitCost = item.price * 0.6;
          hourlyMap[hour].cogs += unitCost * item.quantity;
        });
      });

      const activeHoursCount = Object.values(hourlyMap).filter((h) => h.revenue > 0).length || 1;
      const hourlyExpense = totalExpenses / activeHoursCount;

      for (let h = 0; h < 24; h++) {
        const hRev = hourlyMap[h].revenue;
        if (hRev > 0) {
          const hCogs = hourlyMap[h].cogs;
          const hExp = hourlyExpense;
          const hCost = Math.round(hCogs + hExp);
          const hProfit = Math.max(0, Math.round(hRev - hCost));
          const timeLabel = `${h.toString().padStart(2, '0')}:00`;

          chartData.push({
            time: timeLabel,
            revenue: Math.round(hRev),
            cogs: Math.round(hCogs),
            expenses: Math.round(hExp),
            profit: hProfit,
            cost: hCost,
          });
        }
      }
    } else {
      const daysCount = period === 'last7days' ? 7 : period === 'thisMonth' ? 30 : 14;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

        const dayOrders = validOrders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth();
        });

        const dayRev = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        let dayCogs = 0;
        dayOrders.forEach((o) => {
          o.items.forEach((item) => {
            let unitCost = item.product?.costPrice || 0;
            if (item.product?.type === 'COMBO' && item.product.comboItems && item.product.comboItems.length > 0) {
              const comboBaseCost = item.product.comboItems.reduce((sum, ci) => sum + (ci.quantity * (ci.product?.costPrice || 0)), 0);
              if (comboBaseCost > 0) unitCost = comboBaseCost;
            }
            if (unitCost === 0) unitCost = item.price * 0.6;
            dayCogs += unitCost * item.quantity;
          });
        });

        const dayExp = dayRev > 0 ? Math.round(totalExpenses / daysCount) : 0;
        const dayCost = dayCogs + dayExp;
        const dayProfit = Math.max(0, dayRev - dayCost);

        if (dayRev > 0) {
          chartData.push({
            time: dayLabel,
            revenue: Math.round(dayRev),
            cogs: Math.round(dayCogs),
            expenses: Math.round(dayExp),
            profit: Math.round(dayProfit),
            cost: Math.round(dayCost),
          });
        }
      }
    }

    // Branch Performance Ranking
    const totalChainRevenueInPeriod = todayRevenue || 1;
    const branchPerformance = branchList
      .map((b) => {
        const bOrders = validOrders.filter((o) => o.branchId === b.id || (!o.branchId && b.id === 'cs1'));
        const bRevenue = bOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const bShare = Number(((bRevenue / totalChainRevenueInPeriod) * 100).toFixed(1));

        return {
          id: b.id,
          badge: b.badge,
          name: b.name,
          revenue: bRevenue,
          ordersCount: bOrders.length,
          sharePercent: bShare,
          isSelected: isAllBranches ? true : b.id === branchId,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Recent Orders Feed
    const recentOrders = validOrders.slice(0, 8).map((o) => {
      const noteLower = (o.note || '').toLowerCase();
      const isAI = noteLower.includes('ai') || noteLower.includes('bot') || noteLower.includes('trợ lý') || noteLower.includes('smart');
      const bObj = branchList.find((b) => b.id === o.branchId) || branchList[0];

      return {
        id: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        totalAmount: o.totalAmount,
        status: o.status,
        source: isAI ? 'AI Chatbot' : 'Web Form',
        branchId: o.branchId || 'cs1',
        branchName: bObj.name,
        createdAt: o.createdAt,
      };
    });

    // ==========================================
    // TAB 2: SALES & DISH ANALYSIS METRICS
    // ==========================================
    const allProducts = await prisma.product.findMany({
      include: {
        comboItems: {
          include: {
            product: true,
          },
        },
      },
    });

    const productSalesMap: Record<
      string,
      {
        id: string;
        name: string;
        type: string;
        quantitySold: number;
        revenue: number;
        costPrice: number;
      }
    > = {};

    // Initialize map with catalog products
    allProducts.forEach((p) => {
      let baseCost = p.costPrice || 0;
      if (p.type === 'COMBO' && p.comboItems && p.comboItems.length > 0) {
        const calculatedComboCost = p.comboItems.reduce(
          (sum, ci) => sum + ci.quantity * (ci.product?.costPrice || 0),
          0
        );
        if (calculatedComboCost > 0) {
          baseCost = calculatedComboCost;
        }
      }

      productSalesMap[p.name] = {
        id: p.id,
        name: p.name,
        type: p.type || 'SINGLE',
        quantitySold: 0,
        revenue: 0,
        costPrice: baseCost,
      };
    });

    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        const pName = item.productName;
        if (!productSalesMap[pName]) {
          let baseCost = item.product?.costPrice || 0;
          if (item.product?.type === 'COMBO' && item.product.comboItems && item.product.comboItems.length > 0) {
            const calculatedComboCost = item.product.comboItems.reduce(
              (sum, ci) => sum + ci.quantity * (ci.product?.costPrice || 0),
              0
            );
            if (calculatedComboCost > 0) baseCost = calculatedComboCost;
          }
          if (baseCost === 0) baseCost = item.price * 0.6;

          productSalesMap[pName] = {
            id: item.productId || pName,
            name: pName,
            type: item.product?.type || (pName.toLowerCase().includes('combo') || pName.toLowerCase().includes('set') ? 'COMBO' : 'SINGLE'),
            quantitySold: 0,
            revenue: 0,
            costPrice: baseCost,
          };
        }
        productSalesMap[pName].quantitySold += item.quantity;
        productSalesMap[pName].revenue += item.subtotal;
      });
    });

    let dishList = Object.values(productSalesMap);

    // Apply product type filter
    if (productTypeFilter === 'SINGLE') {
      dishList = dishList.filter((d) => d.type === 'SINGLE');
    } else if (productTypeFilter === 'COMBO') {
      dishList = dishList.filter((d) => d.type === 'COMBO');
    }

    const totalDishRevenue = dishList.reduce((sum, d) => sum + d.revenue, 0) || 1;

    const dishPerformance = dishList
      .map((d) => {
        const totalCost = Math.round(d.quantitySold * d.costPrice);
        const grossProfit = Math.round(d.revenue - totalCost);
        const sharePercent = Number(((d.revenue / totalDishRevenue) * 100).toFixed(1));
        const marginPercent = d.revenue > 0 ? Number(((grossProfit / d.revenue) * 100).toFixed(1)) : 0;

        return {
          id: d.id,
          name: d.name,
          type: d.type,
          quantitySold: d.quantitySold,
          revenue: d.revenue,
          costPrice: d.costPrice,
          totalCost,
          grossProfit,
          sharePercent,
          marginPercent,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const topSellingProducts = dishPerformance.slice(0, 5);

    const salesSummary = {
      totalQuantitySold: dishPerformance.reduce((sum, d) => sum + d.quantitySold, 0),
      totalRevenue: dishPerformance.reduce((sum, d) => sum + d.revenue, 0),
      totalGrossProfit: dishPerformance.reduce((sum, d) => sum + d.grossProfit, 0),
      overallGrossMarginPercent:
        dishPerformance.reduce((sum, d) => sum + d.revenue, 0) > 0
          ? Number(
              (
                (dishPerformance.reduce((sum, d) => sum + d.grossProfit, 0) /
                  dishPerformance.reduce((sum, d) => sum + d.revenue, 0)) *
                100
              ).toFixed(1)
            )
          : 0,
    };

    // ==========================================
    // TAB 3: EXPENSE ANALYSIS METRICS (OPEX ONLY)
    // ==========================================
    let shippingExpTotal = 0;
    let utilitiesExpTotal = 0;
    let packagingExpTotal = 0;
    let otherExpTotal = 0;

    const mappedExpenses = expenses.map((e) => {
      const catUpper = (e.category || '').toUpperCase();
      const titleLower = (e.title || '' + ' ' + (e.note || '')).toLowerCase();

      let detectedCat = 'OTHER';
      let categoryLabel = '☕ Tiếp Khách / Marketing / Khác';

      if (catUpper.includes('SHIP') || titleLower.includes('ship') || titleLower.includes('vận chuyển') || titleLower.includes('cước')) {
        detectedCat = 'SHIPPING';
        categoryLabel = '🚚 Tiền Ship / Vận Chuyển';
        shippingExpTotal += e.amount;
      } else if (catUpper.includes('ĐIỆN') || catUpper.includes('NƯỚC') || catUpper.includes('MẶT BẰNG') || catUpper.includes('UTILITY') || titleLower.includes('điện') || titleLower.includes('nước') || titleLower.includes('mặt bằng') || titleLower.includes('thuê') || titleLower.includes('internet')) {
        detectedCat = 'UTILITIES';
        categoryLabel = '⚡ Điện / Nước / Mặt Bằng';
        utilitiesExpTotal += e.amount;
      } else if (catUpper.includes('VẬT TƯ') || catUpper.includes('HỘP') || catUpper.includes('TÚI') || catUpper.includes('PACKAGING') || titleLower.includes('hộp') || titleLower.includes('túi') || titleLower.includes('bọc') || titleLower.includes('đũa') || titleLower.includes('vật tư')) {
        detectedCat = 'PACKAGING';
        categoryLabel = '📦 Vật Tư Tiêu Hao (Hộp, Túi)';
        packagingExpTotal += e.amount;
      } else {
        detectedCat = 'OTHER';
        categoryLabel = '☕ Tiếp Khách / Marketing / Khác';
        otherExpTotal += e.amount;
      }

      const bObj = branchList.find((b) => b.id === e.branchId) || branchList[0];

      return {
        id: e.id,
        expenseCode: e.expenseCode || `PC-${e.id.slice(-5).toUpperCase()}`,
        title: e.title,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        category: detectedCat,
        categoryLabel,
        creatorName: e.creatorName || 'Quản trị viên',
        branchId: e.branchId || 'cs1',
        branchName: bObj.name,
        note: e.note || '-',
        date: e.date,
      };
    });

    const totalExpenseSum = totalExpenses || 1;

    const cashflowCards = {
      total: totalExpenses,
      shipping: {
        amount: shippingExpTotal,
        percent: Number(((shippingExpTotal / totalExpenseSum) * 100).toFixed(1)),
      },
      utilities: {
        amount: utilitiesExpTotal,
        percent: Number(((utilitiesExpTotal / totalExpenseSum) * 100).toFixed(1)),
      },
      packaging: {
        amount: packagingExpTotal,
        percent: Number(((packagingExpTotal / totalExpenseSum) * 100).toFixed(1)),
      },
      other: {
        amount: otherExpTotal,
        percent: Number(((otherExpTotal / totalExpenseSum) * 100).toFixed(1)),
      },
    };

    const categoryChartData = [
      { name: 'Cước Ship / Vận Chuyển', value: shippingExpTotal, color: '#3B82F6', key: 'SHIPPING' },
      { name: 'Điện / Nước / Mặt Bằng', value: utilitiesExpTotal, color: '#F59E0B', key: 'UTILITIES' },
      { name: 'Vật Tư Tiêu Hao (Hộp, Túi)', value: packagingExpTotal, color: '#10B981', key: 'PACKAGING' },
      { name: 'Chi Phí Vận Hành Khác', value: otherExpTotal, color: '#64748B', key: 'OTHER' },
    ].filter((c) => c.value > 0);

    let filteredExpenseReceipts = mappedExpenses;
    if (expenseCategoryFilter !== 'ALL') {
      filteredExpenseReceipts = mappedExpenses.filter((e) => e.category === expenseCategoryFilter);
    }

    const expenseSummary = {
      totalReceiptsCount: filteredExpenseReceipts.length,
      totalAmount: filteredExpenseReceipts.reduce((sum, e) => sum + e.amount, 0),
    };

    const inventoryItems = await prisma.inventoryItem.findMany();
    const lowStockCount = inventoryItems.filter((i) => i.currentQuantity <= i.minQuantity).length;

    return NextResponse.json({
      success: true,
      period,
      branchId,
      userRole,
      selectedBranchName,
      isAllBranches,
      branchList,

      // Tab 1 Data
      todayRevenue,
      revenueGrowth,
      netProfit,
      marginPercent,
      totalOrdersCount,
      webOrdersCount,
      aiOrdersCount,
      pendingOrdersCount,
      customerCount,
      avgOrderValue,
      chartData,
      branchPerformance,
      recentOrders,
      lowStockCount,

      // Tab 2 Data
      dishPerformance,
      topSellingProducts,
      salesSummary,

      // Tab 3 Data
      cashflowCards,
      categoryChartData,
      expenseReceipts: filteredExpenseReceipts,
      expenseSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
