import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // 5. Query Product Catalog & DB Categories
    const dbCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const catalogProducts = await prisma.product.findMany({
      include: {
        category: true,
        comboItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
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
        categoryId: string | null;
        categoryName: string;
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
          categoryId: p.categoryId || null,
          categoryName: p.category?.name || 'Khác',
          costPrice: p.costPrice || 0,
          sellingPrice: p.price,
          directQty: 0,
          directRevenue: 0,
          comboQty: 0,
          totalQty: 0,
          categoryTag: getCategoryTag(p.name, p.category?.name),
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
                  categoryId: ci.product?.categoryId || null,
                  categoryName: ci.product?.category?.name || 'Khác',
                  costPrice: ci.product?.costPrice || 0,
                  sellingPrice: ci.product?.price || 0,
                  directQty: 0,
                  directRevenue: 0,
                  comboQty: 0,
                  totalQty: 0,
                  categoryTag: getCategoryTag(childName, ci.product?.category?.name),
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
              categoryId: prod?.categoryId || null,
              categoryName: prod?.category?.name || 'Khác',
              costPrice: prod?.costPrice || (item.price * 0.6),
              sellingPrice: item.price,
              directQty: 0,
              directRevenue: 0,
              comboQty: 0,
              totalQty: 0,
              categoryTag: getCategoryTag(item.productName, prod?.category?.name),
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

    // Compute total COGS Sum and total Gross Revenue Sum
    let totalCOGS_Sum = 0;
    let totalGrossRevenue_Sum = 0;

    Object.values(consumptionMap).forEach((item) => {
      item.totalQty = item.directQty + item.comboQty;
      const cogs = item.totalQty * item.costPrice;
      totalCOGS_Sum += cogs;

      const itemGrossRevenue = (item.directQty * item.sellingPrice) + (item.comboQty * item.sellingPrice) || item.directRevenue;
      totalGrossRevenue_Sum += itemGrossRevenue;
    });

    // Total Net Order Revenue received (after discount)
    const totalNetRevenue_Sum = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Query Expense Receipts in Period & Branch (STRICTLY OPEX ONLY, EXCLUDE STOCK IMPORT)
    const expenseWhere: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      AND: [
        { title: { not: { contains: 'phiếu nhập' } } },
        { title: { not: { contains: '#NK-' } } },
        { note: { not: { contains: '#NK-' } } },
      ],
    };
    if (!isAllBranches) {
      expenseWhere.branchId = branchId;
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
    });

    // Group expenses into Direct Product, Category-level, and General Operating Expenses (OPEX)
    const directProductExpensesMap: Record<string, any[]> = {};
    const categoryExpensesMap: Record<string, any[]> = {};
    const generalExpensesList: any[] = [];

    let totalDirectProductExpenses_Sum = 0;
    let totalCategoryExpenses_Sum = 0;
    let totalGeneralExpenses_Sum = 0;

    expenses.forEach((e: any) => {
      const bName = branchNameMap[e.branchId || 'cs1'] || 'Cơ Sở';
      const expItem = {
        id: e.id,
        expenseCode: e.expenseCode || `EXP-${e.id.slice(-4).toUpperCase()}`,
        title: e.title,
        amount: e.amount,
        targetCategory: e.targetCategory || 'GENERAL',
        productId: e.productId || null,
        date: e.date.toISOString(),
        branchName: bName,
        creatorName: e.creatorName || 'Quản trị viên',
        receiptPhoto: e.receiptPhoto || null,
        note: e.note || '-',
      };

      if (e.productId) {
        if (!directProductExpensesMap[e.productId]) directProductExpensesMap[e.productId] = [];
        directProductExpensesMap[e.productId].push(expItem);
        totalDirectProductExpenses_Sum += e.amount;
      } else if (e.targetCategory && e.targetCategory !== 'GENERAL') {
        const targetCat = e.targetCategory;
        // Match with db category
        const matchedCat = dbCategories.find(
          (c) => c.id === targetCat || c.slug === targetCat || c.name.toLowerCase() === targetCat.toLowerCase()
        );
        const catKey = matchedCat ? matchedCat.id : targetCat;
        if (!categoryExpensesMap[catKey]) categoryExpensesMap[catKey] = [];
        categoryExpensesMap[catKey].push(expItem);
        totalCategoryExpenses_Sum += e.amount;
      } else {
        generalExpensesList.push(expItem);
        totalGeneralExpenses_Sum += e.amount;
      }
    });

    const totalExpenses_Sum = totalDirectProductExpenses_Sum + totalCategoryExpenses_Sum + totalGeneralExpenses_Sum;

    // First pass: Calculate (C_i) COGS and (B_i) Net Revenue for each product
    const preliminaryRows = Object.values(consumptionMap)
      .filter((item) => item.totalQty > 0 || item.costPrice > 0 || item.sellingPrice > 0)
      .map((item) => {
        const C_i = Math.round(item.totalQty * item.costPrice);
        const costSharePercent = totalCOGS_Sum > 0 ? Number(((C_i / totalCOGS_Sum) * 100).toFixed(2)) : 0;

        const itemGrossRevenue = (item.directQty * item.sellingPrice) + (item.comboQty * item.sellingPrice) || item.directRevenue;
        
        let B_i = 0;
        if (totalGrossRevenue_Sum > 0) {
          B_i = Math.round(totalNetRevenue_Sum * (itemGrossRevenue / totalGrossRevenue_Sum));
        } else if (totalCOGS_Sum > 0) {
          B_i = Math.round(totalNetRevenue_Sum * (costSharePercent / 100));
        } else {
          B_i = 0;
        }

        return {
          ...item,
          C_i,
          costSharePercent,
          B_i,
        };
      });

    // Subtotal Net Revenue and COGS by category
    const categoryTotalsMap: Record<string, { netRevenue: number; cogs: number }> = {};
    preliminaryRows.forEach((r) => {
      const catKey = r.categoryId || (r.categoryTag === 'CHICKEN' ? 'GA_U_MUOI' : r.categoryTag === 'SPRING_ROLL' ? 'NEM_NGUA' : 'OTHER');
      if (!categoryTotalsMap[catKey]) {
        categoryTotalsMap[catKey] = { netRevenue: 0, cogs: 0 };
      }
      categoryTotalsMap[catKey].netRevenue += r.B_i;
      categoryTotalsMap[catKey].cogs += r.C_i;

      // Also map for GA_U_MUOI / NEM_NGUA tags
      if (r.categoryTag === 'CHICKEN' && catKey !== 'GA_U_MUOI') {
        if (!categoryTotalsMap['GA_U_MUOI']) categoryTotalsMap['GA_U_MUOI'] = { netRevenue: 0, cogs: 0 };
        categoryTotalsMap['GA_U_MUOI'].netRevenue += r.B_i;
        categoryTotalsMap['GA_U_MUOI'].cogs += r.C_i;
      }
      if (r.categoryTag === 'SPRING_ROLL' && catKey !== 'NEM_NGUA') {
        if (!categoryTotalsMap['NEM_NGUA']) categoryTotalsMap['NEM_NGUA'] = { netRevenue: 0, cogs: 0 };
        categoryTotalsMap['NEM_NGUA'].netRevenue += r.B_i;
        categoryTotalsMap['NEM_NGUA'].cogs += r.C_i;
      }
    });

    // Second pass: Calculate (D_i) Dedicated Direct Expense and Profit
    const productRows = preliminaryRows
      .map((item) => {
        const { C_i, costSharePercent, B_i } = item;

        // 1. Direct product-specific expenses
        const directList = directProductExpensesMap[item.id] || [];
        const directProdExpTotal = directList.reduce((sum: number, e: any) => sum + e.amount, 0);

        // 2. Category-level prorated expenses
        let proratedCatExp = 0;
        let matchedCatExpenses: any[] = [];

        const catKey = item.categoryId || (item.categoryTag === 'CHICKEN' ? 'GA_U_MUOI' : item.categoryTag === 'SPRING_ROLL' ? 'NEM_NGUA' : 'OTHER');
        const catExpenses = [
          ...(categoryExpensesMap[catKey] || []),
          ...(item.categoryTag === 'CHICKEN' && catKey !== 'GA_U_MUOI' ? (categoryExpensesMap['GA_U_MUOI'] || []) : []),
          ...(item.categoryTag === 'SPRING_ROLL' && catKey !== 'NEM_NGUA' ? (categoryExpensesMap['NEM_NGUA'] || []) : []),
        ];

        if (catExpenses.length > 0) {
          matchedCatExpenses = catExpenses;
          const totalCatExpAmount = catExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
          const catTotal = categoryTotalsMap[catKey] || { netRevenue: 0, cogs: 0 };

          if (catTotal.netRevenue > 0) {
            proratedCatExp = Math.round(totalCatExpAmount * (B_i / catTotal.netRevenue));
          } else if (catTotal.cogs > 0) {
            proratedCatExp = Math.round(totalCatExpAmount * (C_i / catTotal.cogs));
          } else {
            proratedCatExp = Math.round(totalCatExpAmount / Math.max(1, preliminaryRows.filter((p) => p.categoryId === item.categoryId).length));
          }
        }

        // Total Dedicated Expense for this product
        const dedicatedExpense = directProdExpTotal + proratedCatExp;

        // Actual Product Profit = Revenue - COGS - Dedicated Expense
        const actualProductProfit = B_i - C_i - dedicatedExpense;
        const marginPercent = B_i > 0 ? Number(((actualProductProfit / B_i) * 100).toFixed(1)) : 0;

        const comboBreakdown = Object.values(item.comboBreakdownMap);

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
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
          expense: dedicatedExpense, // Dedicated expense
          dedicatedExpense,
          directProductExpense: directProdExpTotal,
          categoryProratedExpense: proratedCatExp,
          grossProfit: actualProductProfit,
          grossMarginPercent: marginPercent,
          netProfit: actualProductProfit,
          marginPercent,
          comboBreakdown,
          recentOrders: item.recentOrderList,
          categoryExpenses: [...directList, ...matchedCatExpenses],
        };
      })
      .sort((a, b) => b.netRevenue - a.netRevenue);

    // Grouping summary by Category (Dynamic Categories from DB)
    const categorySummaryList = dbCategories.map((cat) => {
      const catProds = productRows.filter((p) => p.categoryId === cat.id || (cat.name.toLowerCase().includes('gà') && p.categoryTag === 'CHICKEN') || (cat.name.toLowerCase().includes('nem') && p.categoryTag === 'SPRING_ROLL'));
      const catRevenue = catProds.reduce((sum, p) => sum + p.netRevenue, 0);
      const catCogs = catProds.reduce((sum, p) => sum + p.cogs, 0);
      const catDedicatedExpense = catProds.reduce((sum, p) => sum + p.dedicatedExpense, 0);
      const catGrossProfit = catRevenue - catCogs - catDedicatedExpense;
      const catMargin = catRevenue > 0 ? Number(((catGrossProfit / catRevenue) * 100).toFixed(1)) : 0;

      return {
        id: cat.id,
        key: cat.slug || cat.id,
        name: cat.name,
        revenue: catRevenue,
        cogs: catCogs,
        dedicatedExpense: catDedicatedExpense,
        totalDirectCost: catCogs + catDedicatedExpense,
        grossProfit: catGrossProfit,
        marginPercent: catMargin,
      };
    });

    // Legacy structured object for categorySummary card compatibility
    const gaUMuoiObj = categorySummaryList.find((c) => c.name.toLowerCase().includes('gà') || c.key.includes('ga')) || {
      revenue: productRows.filter((p) => p.categoryTag === 'CHICKEN').reduce((sum, p) => sum + p.netRevenue, 0),
      cogs: productRows.filter((p) => p.categoryTag === 'CHICKEN').reduce((sum, p) => sum + p.cogs, 0),
      dedicatedExpense: productRows.filter((p) => p.categoryTag === 'CHICKEN').reduce((sum, p) => sum + p.dedicatedExpense, 0),
      grossProfit: productRows.filter((p) => p.categoryTag === 'CHICKEN').reduce((sum, p) => sum + p.grossProfit, 0),
      marginPercent: 0,
    };
    gaUMuoiObj.marginPercent = gaUMuoiObj.revenue > 0 ? Number(((gaUMuoiObj.grossProfit / gaUMuoiObj.revenue) * 100).toFixed(1)) : 0;

    const nemNguaObj = categorySummaryList.find((c) => c.name.toLowerCase().includes('nem') || c.key.includes('nem')) || {
      revenue: productRows.filter((p) => p.categoryTag === 'SPRING_ROLL').reduce((sum, p) => sum + p.netRevenue, 0),
      cogs: productRows.filter((p) => p.categoryTag === 'SPRING_ROLL').reduce((sum, p) => sum + p.cogs, 0),
      dedicatedExpense: productRows.filter((p) => p.categoryTag === 'SPRING_ROLL').reduce((sum, p) => sum + p.dedicatedExpense, 0),
      grossProfit: productRows.filter((p) => p.categoryTag === 'SPRING_ROLL').reduce((sum, p) => sum + p.grossProfit, 0),
      marginPercent: 0,
    };
    nemNguaObj.marginPercent = nemNguaObj.revenue > 0 ? Number(((nemNguaObj.grossProfit / nemNguaObj.revenue) * 100).toFixed(1)) : 0;

    const otherObj = {
      revenue: productRows.filter((p) => p.categoryTag === 'OTHER').reduce((sum, p) => sum + p.netRevenue, 0),
      cogs: productRows.filter((p) => p.categoryTag === 'OTHER').reduce((sum, p) => sum + p.cogs, 0),
      dedicatedExpense: productRows.filter((p) => p.categoryTag === 'OTHER').reduce((sum, p) => sum + p.dedicatedExpense, 0),
      grossProfit: productRows.filter((p) => p.categoryTag === 'OTHER').reduce((sum, p) => sum + p.grossProfit, 0),
      marginPercent: 0,
    };
    otherObj.marginPercent = otherObj.revenue > 0 ? Number(((otherObj.grossProfit / otherObj.revenue) * 100).toFixed(1)) : 0;

    // Summary Totals
    const totalDedicatedExpenses_Sum = totalDirectProductExpenses_Sum + totalCategoryExpenses_Sum;
    const totalGrossProfit_Sum = totalNetRevenue_Sum - totalCOGS_Sum - totalDedicatedExpenses_Sum;
    const generalOperatingExpenses = totalGeneralExpenses_Sum;
    const totalNetProfit_Sum = totalGrossProfit_Sum - generalOperatingExpenses;
    const overallMarginPercent =
      totalNetRevenue_Sum > 0 ? Number(((totalNetProfit_Sum / totalNetRevenue_Sum) * 100).toFixed(1)) : 0;

    const categorySummary = {
      list: categorySummaryList,
      gaUMuoi: gaUMuoiObj,
      nemNgua: nemNguaObj,
      other: otherObj,
      generalExpenses: generalOperatingExpenses,
      overallMarginPercent,
    };

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
        totalDedicatedExpenses: totalDedicatedExpenses_Sum,
        totalGrossProfit: totalGrossProfit_Sum,
        generalOperatingExpenses,
        totalExpenses: totalExpenses_Sum,
        totalNetProfit: totalNetProfit_Sum,
        overallMarginPercent,
      },
      categorySummary,
      products: productRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
