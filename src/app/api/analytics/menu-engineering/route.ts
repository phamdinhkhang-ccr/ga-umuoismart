import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || 'ALL';
    const timeRange = searchParams.get('timeRange') || '7days';
    const categoryId = searchParams.get('categoryId') || 'ALL';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Determine Date Range filter
    const now = new Date();
    let startDate = new Date();
    let daysInPeriod = 7;

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      daysInPeriod = 1;
    } else if (timeRange === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      daysInPeriod = 7;
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Build Order filter
    const orderWhere: any = {
      createdAt: { gte: startDate },
      status: { not: 'CANCELLED' },
    };

    if (branchId && branchId !== 'ALL') {
      orderWhere.branchId = branchId;
    }

    // Fetch Orders with items
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: true,
      },
    });

    // Fetch Products & Categories & Inventory
    const productWhere: any = {};
    if (categoryId && categoryId !== 'ALL') {
      productWhere.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        category: true,
      },
    });

    const inventoryItems = await prisma.inventoryItem.findMany();
    const inventoryMap = new Map<string, number>();
    inventoryItems.forEach((item) => {
      inventoryMap.set(item.name.toLowerCase(), item.currentQuantity);
    });

    // Aggregate sales per product
    const productSalesMap = new Map<
      string,
      {
        product: any;
        soldQty: number;
        revenue: number;
        cogs: number;
      }
    >();

    // Pre-fill with all matching products
    products.forEach((p) => {
      productSalesMap.set(p.id, {
        product: p,
        soldQty: 0,
        revenue: 0,
        cogs: 0,
      });
    });

    // Accumulate sales from orders
    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        if (item.productId && productSalesMap.has(item.productId)) {
          const entry = productSalesMap.get(item.productId)!;
          entry.soldQty += item.quantity;
          entry.revenue += item.subtotal;
          entry.cogs += (entry.product.costPrice || 0) * item.quantity;
        } else {
          // Match by name fallback
          const matchedProd = products.find(
            (p) => p.name.toLowerCase().trim() === item.productName.toLowerCase().trim()
          );
          if (matchedProd && productSalesMap.has(matchedProd.id)) {
            const entry = productSalesMap.get(matchedProd.id)!;
            entry.soldQty += item.quantity;
            entry.revenue += item.subtotal;
            entry.cogs += (matchedProd.costPrice || 0) * item.quantity;
          }
        }
      });
    });

    // Convert map to list and compute key metrics
    const salesList = Array.from(productSalesMap.values()).map((entry) => {
      const p = entry.product;
      const price = p.price;
      const costPrice = p.costPrice || Math.round(p.price * 0.45); // Fallback ~45% cost price if not set
      const soldQty = entry.soldQty;
      const revenue = soldQty > 0 ? entry.revenue : 0;
      const totalCogs = soldQty > 0 ? entry.cogs : 0;
      const profit = revenue - totalCogs;
      const profitMarginPct = price > 0 ? ((price - costPrice) / price) * 100 : 0;

      // Current stock estimation based on Inventory or Product Stock
      const stock = inventoryMap.get(p.name.toLowerCase()) ?? p.stockQuantity ?? 50;

      // Kitchen Forecast formula: Average Daily Sales * 1.15
      const avgDailySales = soldQty / daysInPeriod;
      const forecastQty = Math.ceil(avgDailySales * 1.15);

      return {
        id: p.id,
        name: p.name,
        categoryName: p.category?.name || 'Khác',
        image: p.image,
        price,
        costPrice,
        soldQty,
        revenue,
        profit,
        profitMarginPct,
        currentStock: stock,
        forecastQty,
      };
    });

    // Sort by revenue descending for ranking
    salesList.sort((a, b) => b.revenue - a.revenue);

    // Calculate averages for Menu Engineering threshold classification
    const totalProductsCount = salesList.length || 1;
    const totalQtySold = salesList.reduce((sum, item) => sum + item.soldQty, 0);
    const avgQtySold = totalQtySold / totalProductsCount;

    const totalProfitMarginPct = salesList.reduce((sum, item) => sum + item.profitMarginPct, 0);
    const avgProfitMarginPct = totalProfitMarginPct / totalProductsCount;

    // Classify Matrix
    const itemsWithMatrix = salesList.map((item, index) => {
      const isHighVolume = item.soldQty >= avgQtySold;
      const isHighProfit = item.profitMarginPct >= avgProfitMarginPct;

      let matrixCategory: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG' = 'DOG';
      let matrixLabel = '⚠️ Cần Tối Ưu';
      let matrixBadgeBg = 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
      let matrixAdvice = 'Bán chậm • Lợi nhuận thấp';

      if (isHighVolume && isHighProfit) {
        matrixCategory = 'STAR';
        matrixLabel = '🔥 Món Chủ Lực';
        matrixBadgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black';
        matrixAdvice = 'Bán chạy nhất • Lợi nhuận cao';
      } else if (isHighVolume && !isHighProfit) {
        matrixCategory = 'PLOWHORSE';
        matrixLabel = '⚡ Món Kéo Khách';
        matrixBadgeBg = 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold';
        matrixAdvice = 'Sản lượng bán lớn • Lãi mỏng';
      } else if (!isHighVolume && isHighProfit) {
        matrixCategory = 'PUZZLE';
        matrixLabel = '💎 Món Tiềm Năng';
        matrixBadgeBg = 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
        matrixAdvice = 'Lợi nhuận rất tốt • Sức mua chưa cao';
      }

      return {
        rank: index + 1,
        ...item,
        matrixCategory,
        matrixLabel,
        matrixBadgeBg,
        matrixAdvice,
      };
    });

    // Aggregate revenue by Category for Donut / Pie Chart
    const categoryRevenueMap = new Map<string, number>();
    itemsWithMatrix.forEach((item) => {
      const current = categoryRevenueMap.get(item.categoryName) || 0;
      categoryRevenueMap.set(item.categoryName, current + item.revenue);
    });

    const categoryChartData = Array.from(categoryRevenueMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Top 5 Profit products for Bar Chart
    const top5Profit = [...itemsWithMatrix]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map((item) => ({
        name: item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name,
        fullName: item.name,
        profit: item.profit,
        revenue: item.revenue,
        soldQty: item.soldQty,
      }));

    // Categories list for dropdown filter
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      timeRange,
      daysInPeriod,
      counts: {
        totalProducts: itemsWithMatrix.length,
        stars: itemsWithMatrix.filter((i) => i.matrixCategory === 'STAR').length,
        plowhorses: itemsWithMatrix.filter((i) => i.matrixCategory === 'PLOWHORSE').length,
        puzzles: itemsWithMatrix.filter((i) => i.matrixCategory === 'PUZZLE').length,
        dogs: itemsWithMatrix.filter((i) => i.matrixCategory === 'DOG').length,
      },
      averages: {
        avgQtySold: Math.round(avgQtySold * 10) / 10,
        avgProfitMarginPct: Math.round(avgProfitMarginPct * 10) / 10,
      },
      categoryChartData,
      top5Profit,
      items: itemsWithMatrix,
      categories,
    });
  } catch (error: any) {
    console.error('API GET /api/analytics/menu-engineering error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi tính toán thống kê ma trận thực đơn' },
      { status: 500 }
    );
  }
}
