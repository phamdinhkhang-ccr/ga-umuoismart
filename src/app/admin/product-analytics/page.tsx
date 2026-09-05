'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Award, ShoppingBag, 
  UtensilsCrossed, Calendar, Filter, Download, 
  ChefHat, AlertTriangle, Sparkles, PieChart as PieChartIcon, 
  Boxes, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';

export interface ProductAnalyticItem {
  id: string;
  rank: number;
  name: string;
  category: 'Gà ủ muối' | 'Món ăn kèm' | 'Đồ uống';
  branch: string;
  unit_price: number;
  cost_price: number;
  sold_qty: number;
  total_gmv: number;
  total_profit: number;
  margin_percent: number;
  stock_qty: number;
  forecast_prep: string;
  matrix_type: 'STAR' | 'CASH_COW' | 'PUZZLE' | 'DOG';
  matrix_label: string;
}

const MOCK_ANALYTICS_DATA: ProductAnalyticItem[] = [];

const DONUT_COLORS = ['#10B981', '#0284C7', '#F59E0B', '#6366F1'];

export default function ProductAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  
  // Filter States
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | 'month' | 'custom'>('7days');
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-09-04');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtered Products Logic
  const filteredProducts = useMemo(() => {
    return MOCK_ANALYTICS_DATA.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      // Branch filter
      if (branchFilter !== 'ALL' && item.branch !== branchFilter) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, branchFilter]);

  // Donut Chart Data: Revenue by Category
  const categoryRevenueData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredProducts.forEach(item => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.total_gmv;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [filteredProducts]);

  // Horizontal Bar Chart Data: Top 5 Profit Items
  const topProfitData = useMemo(() => {
    return [...filteredProducts]
      .sort((a, b) => b.total_profit - a.total_profit)
      .slice(0, 5)
      .map(item => ({
        name: item.name.length > 18 ? item.name.substring(0, 16) + '...' : item.name,
        fullName: item.name,
        profit: item.total_profit,
        gmv: item.total_gmv
      }));
  }, [filteredProducts]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Hạng', 'Tên Món Ăn', 'Danh Mục', 'Cơ Sở', 'Đơn Giá (VNĐ)', 'Giá Vốn (VNĐ)',
      'Số Lượng Bán', 'Doanh Thu Gộp (VNĐ)', 'Lợi Nhuận Gộp (VNĐ)', 'Tỉ Lệ Lãi (%)',
      'Phân Loại Ma Trận', 'Tồn Kho Hiện Tại', 'Dự Báo Bếp Chuẩn Bị'
    ];

    const rows = filteredProducts.map(p => [
      p.rank,
      `"${p.name}"`,
      `"${p.category}"`,
      `"${p.branch}"`,
      p.unit_price,
      p.cost_price,
      p.sold_qty,
      p.total_gmv,
      p.total_profit,
      `${p.margin_percent}%`,
      `"${p.matrix_label}"`,
      p.stock_qty,
      `"${p.forecast_prep}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_hieu_suat_mon_food_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Báo Cáo Thống Kê &amp; Dự Báo Thực Đơn
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Menu Engineering
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tích hiệu suất từng món ăn, phân loại ma trận thực đơn &amp; dự báo số lượng kho bếp chuẩn bị.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP FILTER BAR (BỘ LỌC ĐA CHIỀU) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Time Range Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                timeFilter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeFilter('7days')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                timeFilter === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                timeFilter === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setTimeFilter('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                timeFilter === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Tùy chọn ngày
            </button>
          </div>

          {/* Date Range Selector if Custom */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800"
              />
            </div>
          )}

          {/* Export Excel Button */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>

        {/* Second Filter Row: Branch & Category Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Chi nhánh áp dụng:
            </label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">🏢 Tất cả chi nhánh</option>
              <option value="CƠ SỞ VIN SMART CITY">🏢 CƠ SỞ VIN SMART CITY</option>
              <option value="Chi Nhánh Cầu Giấy">🏢 Chi Nhánh Cầu Giấy</option>
              <option value="Chi Nhánh Thanh Trì">🏢 Chi Nhánh Thanh Trì</option>
              <option value="Chi Nhánh Quận 1 (TP.HCM)">🏢 Chi Nhánh Quận 1 (TP.HCM)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" /> Danh mục nhóm món:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">🍽️ Tất cả danh mục món</option>
              <option value="Gà ủ muối">🍗 Gà Ủ Muối</option>
              <option value="Món ăn kèm">🥗 Món Ăn Kèm</option>
              <option value="Đồ uống">🥤 Đồ Uống &amp; Giải Khát</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-2 flex items-end justify-end gap-2">
            <button
              onClick={() => {
                setBranchFilter('ALL');
                setCategoryFilter('ALL');
                setTimeFilter('7days');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Bộ Lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP 3 BEST SELLERS WITH MATRIX BADGES */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {filteredProducts.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                    item.rank === 1
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : item.rank === 2
                      ? 'bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-orange-50 text-orange-800 border-orange-200'
                  }`}
                >
                  🏆 TOP {item.rank}
                </span>

                {/* Matrix Badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                    item.matrix_type === 'STAR'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.matrix_type === 'CASH_COW'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : item.matrix_type === 'PUZZLE'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.matrix_label}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{item.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Đã bán: <strong className="text-slate-900 font-extrabold">{item.sold_qty} phần</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Doanh Thu Gộp:</span>
                <span className="text-slate-900 font-extrabold">{item.total_gmv.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Lợi Nhuận Gộp:</span>
                <span className="font-extrabold">+{item.total_profit.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RECHARTS VISUAL CHARTS (DONUT + HORIZONTAL BAR) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Donut Chart: 40% (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" /> Cơ Cấu Doanh Thu Theo Nhóm Món
            </h2>
          </div>

          {mounted ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryRevenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryRevenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => `${Number(val || 0).toLocaleString('vi-VN')} VNĐ`}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
          )}
        </div>

        {/* Horizontal Bar Chart: 60% (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" /> Top 5 Món Mang Lại Lợi Nhuận Cao Nhất
            </h2>
          </div>

          {mounted ? (
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProfitData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                    stroke="#64748B"
                  />
                  <YAxis type="category" dataKey="name" width={110} stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <RechartsTooltip
                    formatter={(val: any) => [`${Number(val || 0).toLocaleString('vi-VN')} VNĐ`, 'Lợi Nhuận Gộp']}
                    labelFormatter={(label) => `Món: ${label}`}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="profit" fill="#0284C7" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. FULL DETAILED TABLE WITH KITCHEN PREP & MATRIX BADGES */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-600" /> Bảng Phân Tích Chi Tiết Hiệu Suất &amp; Chuẩn Bị Kho Bếp
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Hiển thị {filteredProducts.length} món trong danh mục chọn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-3 py-3 text-center">Hạng</th>
                <th className="px-4 py-3">Tên Món Ăn</th>
                <th className="px-3 py-3 text-center">Ma Trận thực đơn</th>
                <th className="px-3 py-3 text-right">Đơn Giá Bán</th>
                <th className="px-3 py-3 text-right">Giá Vốn</th>
                <th className="px-3 py-3 text-center">Đã Bán</th>
                <th className="px-4 py-3 text-right">Doanh Thu Gộp</th>
                <th className="px-4 py-3 text-right">Lợi Nhuận Gộp</th>
                <th className="px-3 py-3 text-center">Tỷ Lệ Lãi</th>
                <th className="px-3 py-3 text-center bg-amber-50/50">Tồn Kho Hiện Tại</th>
                <th className="px-4 py-3 bg-sky-50/50">Dự Báo Bếp Chuẩn Bị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500 text-xs font-semibold">
                    Chưa có dữ liệu bán hàng để phân tích
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                const isLowStock = p.stock_qty < 10;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3.5 text-center font-extrabold text-amber-600">#{p.rank}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>
                        <span className="block leading-snug">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{p.branch}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.matrix_type === 'STAR'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.matrix_type === 'CASH_COW'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : p.matrix_type === 'PUZZLE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.matrix_label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-600">{p.unit_price.toLocaleString('vi-VN')}đ</td>
                    <td className="px-3 py-3.5 text-right font-medium text-slate-500">{p.cost_price.toLocaleString('vi-VN')}đ</td>
                    <td className="px-3 py-3.5 text-center font-extrabold text-slate-900">{p.sold_qty}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{p.total_gmv.toLocaleString('vi-VN')}đ</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">+{p.total_profit.toLocaleString('vi-VN')}đ</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.margin_percent}%
                      </span>
                    </td>
                    
                    {/* Operational Columns: Current Stock & Kitchen Prep Forecast */}
                    <td className="px-3 py-3.5 text-center bg-amber-50/20">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isLowStock
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center justify-center gap-1'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
                        {p.stock_qty} {p.category === 'Đồ uống' ? 'ly' : 'phần'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 bg-sky-50/20">
                      <span className="text-xs font-semibold text-sky-900 flex items-center gap-1.5">
                        <ChefHat className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        {p.forecast_prep}
                      </span>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
