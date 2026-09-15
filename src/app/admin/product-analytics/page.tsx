'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  Flame,
  ChefHat,
  Sparkles,
  HelpCircle,
  Award,
  AlertCircle,
  Zap,
  Gem,
  Info
} from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

interface CategoryItem {
  id: string;
  name: string;
  _count?: {
    products: number;
  };
}

interface AnalyticsItem {
  rank: number;
  id: string;
  name: string;
  categoryName: string;
  image?: string;
  price: number;
  costPrice: number;
  soldQty: number;
  revenue: number;
  profit: number;
  profitMarginPct: number;
  currentStock: number;
  forecastQty: number;
  matrixCategory: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  matrixLabel: string;
  matrixBadgeBg: string;
  matrixAdvice: string;
}

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#6366F1'];

export default function ProductAnalyticsPage() {
  const { branches } = useBranches();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
  const [top5Profit, setTop5Profit] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [counts, setCounts] = useState({ totalProducts: 0, stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 });

  // Filters
  const [timeRange, setTimeRange] = useState('7days'); // 'today', '7days', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      params.append('branchId', branchId);
      params.append('categoryId', categoryId);
      if (timeRange === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/analytics/menu-engineering?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setCategoryChartData(data.categoryChartData || []);
        setTop5Profit(data.top5Profit || []);
        setCategories(data.categories || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load menu engineering analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, branchId, categoryId, startDate, endDate]);

  const handleResetFilters = () => {
    setTimeRange('7days');
    setBranchId('ALL');
    setCategoryId('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Chưa có dữ liệu để xuất Excel');
      return;
    }

    const exportData = items.map((i) => ({
      'Hạng': i.rank,
      'Tên Món': i.name,
      'Danh Mục': i.categoryName,
      'Ma Trận Thực Đơn': i.matrixLabel,
      'Khuyến Nghị': i.matrixAdvice,
      'Giá Bán (VNĐ)': i.price,
      'Giá Vốn (VNĐ)': i.costPrice,
      'Số Lượng Bán': i.soldQty,
      'Doanh Thu Gộp (VNĐ)': i.revenue,
      'Lợi Nhuận Gộp (VNĐ)': i.profit,
      'Tỷ Lệ Lãi (%)': Math.round(i.profitMarginPct * 10) / 10,
      'Tồn Kho Hiển Thị': i.currentStock,
      'Dự Báo Bếp Chuẩn Bị': `Chuẩn bị ~${i.forecastQty} phần`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Engineering');
    XLSX.writeFile(workbook, `Menu_Engineering_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. KHỐI TIÊU ĐỀ & THANH ĐIỀU HƯỚNG BỘ LỌC (TOP CONTROLS) */}
      <div className="bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xs text-purple-400">
                <BarChart3 className="w-5 h-5 stroke-[2]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAFAF9] tracking-tight">
                Báo Cáo Thống Kê & Dự Báo Thực Đơn
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Menu Engineering
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-light">
              Phân tích hiệu suất từng món ăn, phân loại ma trận thực đơn & dự báo số lượng kho bếp chuẩn bị.
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xs shadow-md transition flex items-center gap-2 uppercase tracking-wide self-start sm:self-auto"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>

        {/* Hàng 1: Tabs Khoảng thời gian */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 bg-[#0B0D11] p-1 rounded-xs border border-neutral-800">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition ${
                timeRange === 'today'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition ${
                timeRange === '7days'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition ${
                timeRange === 'month'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setTimeRange('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
                timeRange === 'custom'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Tùy chọn ngày
            </button>
          </div>

          {/* Custom Date Inputs if custom range selected */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 bg-[#0B0D11] p-1.5 rounded-xs border border-neutral-800">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 focus:outline-none"
              />
              <span className="text-neutral-500">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 focus:outline-none"
              />
            </div>
          )}

          {/* Hàng 2: Dropdowns Lọc Chi Nhánh & Danh Mục */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">🏢 Tất cả chi nhánh ({branches.length} CS)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">🍽️ Tất cả danh mục món</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c._count?.products !== undefined ? `(${c._count.products})` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={handleResetFilters}
              className="p-2 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-xs transition"
              title="Reset Bộ Lọc"
            >
              <RefreshCw className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX STATS KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Thẻ 1: 🔥 MÓN CHỦ LỰC */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-amber-500/40 flex items-start justify-between shadow-xs relative group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">🔥 MÓN CHỦ LỰC</span>
            </div>
            <h4 className="text-2xl font-black text-amber-400">{counts.stars} món</h4>
            <p className="text-[11px] text-neutral-300 font-medium">Bán chạy nhất • Lợi nhuận cao</p>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
              Các món cốt lõi mang lại dòng tiền và thương hiệu chính cho chuỗi.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xs bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Thẻ 2: ⚡ MÓN KÉO KHÁCH */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-blue-500/40 flex items-start justify-between shadow-xs relative group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider">⚡ MÓN KÉO KHÁCH</span>
            </div>
            <h4 className="text-2xl font-black text-blue-400">{counts.plowhorses} món</h4>
            <p className="text-[11px] text-neutral-300 font-medium">Sản lượng bán lớn • Lãi mỏng</p>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
              Món thu hút lượng lớn khách hàng, nên bán kèm combo đồ uống hoặc sốt chấm.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xs bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Zap className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Thẻ 3: 💎 MÓN TIỀM NĂNG */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-purple-500/40 flex items-start justify-between shadow-xs relative group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider">💎 MÓN TIỀM NĂNG</span>
            </div>
            <h4 className="text-2xl font-black text-purple-400">{counts.puzzles} món</h4>
            <p className="text-[11px] text-neutral-300 font-medium">Lợi nhuận rất tốt • Sức mua chưa cao</p>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
              Món có biên lãi cao nhưng ít người đặt, cần đẩy mạnh hình ảnh và gợi ý khi chốt đơn.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xs bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Gem className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Thẻ 4: ⚠️ MÓN KÉM HIỆU QUẢ */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-rose-500/40 flex items-start justify-between shadow-xs relative group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider">⚠️ MÓN KÉM HIỆU QUẢ</span>
            </div>
            <h4 className="text-2xl font-black text-rose-400">{counts.dogs} món</h4>
            <p className="text-[11px] text-neutral-300 font-medium">Bán chậm • Lợi nhuận thấp</p>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
              Món tồn kho lâu và không hiệu quả, cân nhắc làm mới công thức hoặc bỏ khỏi thực đơn.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xs bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 2. HAI BIỂU ĐỒ TRỰC QUAN PHÂN TÍCH (RECHARTS CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ tròn: Cơ cấu doanh thu theo nhóm món */}
        <div className="bg-[#14171D] p-5 rounded-xs border border-neutral-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
            <h3 className="font-bold text-sm text-[#FAFAF9] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              Cơ Cấu Doanh Thu Theo Nhóm Món
            </h3>
            <span className="text-[11px] text-neutral-400 font-mono">% Đóng góp</span>
          </div>

          <div className="h-64 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} đ`, 'Doanh Thu']}
                    contentStyle={{ backgroundColor: '#0B0D11', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    formatter={(value) => <span className="text-xs text-neutral-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                Chưa có dữ liệu biểu đồ tròn
              </div>
            )}
          </div>
        </div>

        {/* Biểu đồ cột: Top 5 Món Mang Lại Lợi Nhuận Cao Nhất */}
        <div className="bg-[#14171D] p-5 rounded-xs border border-neutral-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
            <h3 className="font-bold text-sm text-[#FAFAF9] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Top 5 Món Mang Lại Lợi Nhuận Cao Nhất
            </h3>
            <span className="text-[11px] text-emerald-400 font-bold uppercase">Lợi Nhuận Gộp</span>
          </div>

          <div className="h-64 w-full">
            {top5Profit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5Profit} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString('vi-VN')} đ`,
                      name === 'profit' ? 'Lợi Nhuận Gộp' : 'Doanh Thu',
                    ]}
                    labelFormatter={(label) => `Món: ${label}`}
                    contentStyle={{ backgroundColor: '#0B0D11', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <Bar dataKey="profit" name="Lợi Nhuận Gộp" radius={[4, 4, 0, 0]}>
                    {top5Profit.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500 italic">
                Chưa có dữ liệu biểu đồ lợi nhuận
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BẢNG PHÂN TÍCH CHI TIẾT HIỆU SUẤT & CHUẨN BỊ KHO BẾP (TABLE) */}
      <div className="bg-[#14171D] rounded-xs border border-neutral-800 overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-amber-400 stroke-[2]" />
            <h3 className="font-extrabold text-base text-[#FAFAF9]">
              Bảng Phân Tích Chi Tiết Hiệu Suất & Chuẩn Bị Kho Bếp
            </h3>
          </div>
          <span className="text-xs text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            Hiển thị <b className="text-amber-400">{items.length}</b> món trong danh mục chọn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B0D11] text-neutral-400 uppercase text-[11px] font-bold border-b border-neutral-800 tracking-wider">
                <th className="py-3.5 px-3 text-center min-w-[50px]">HẠNG</th>
                <th className="py-3.5 px-4 min-w-[200px] text-amber-400">TÊN MÓN ĂN</th>
                <th className="py-3.5 px-4 min-w-[170px]">MA TRẬN THỰC ĐƠN</th>
                <th className="py-3.5 px-3 text-right min-w-[90px]">ĐƠN GIÁ BÁN</th>
                <th className="py-3.5 px-3 text-right min-w-[90px]">GIÁ VỐN (COGS)</th>
                <th className="py-3.5 px-3 text-center min-w-[70px]">ĐÃ BÁN</th>
                <th className="py-3.5 px-4 text-right min-w-[110px]">DOANH THU GỘP</th>
                <th className="py-3.5 px-4 text-right min-w-[110px] text-emerald-400">LỢI NHUẬN GỘP</th>
                <th className="py-3.5 px-3 text-center min-w-[80px]">TỶ LỆ LÃI</th>
                <th className="py-3.5 px-4 text-center min-w-[110px] bg-amber-500/10 text-amber-400">TỒN KHO HIỆN TẠI</th>
                <th className="py-3.5 px-4 min-w-[180px] bg-emerald-500/10 text-emerald-400">DỰ BÁO BẾP CHUẨN BỊ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Đang tính toán phân tích ma trận thực đơn Menu Engineering...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                /* EMPTY STATE */
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-500">
                    <p className="text-sm font-semibold text-neutral-400">Chưa có dữ liệu bán hàng để phân tích.</p>
                    <p className="text-xs text-neutral-600 mt-1">Thử chọn khoảng thời gian khác hoặc tạo đơn hàng mới trên POS.</p>
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-[#1A1D24] transition">
                    {/* HẠNG */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-xs text-[11px] font-black ${
                          i.rank === 1
                            ? 'bg-amber-400 text-neutral-950'
                            : i.rank === 2
                            ? 'bg-neutral-300 text-neutral-950'
                            : i.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        #{i.rank}
                      </span>
                    </td>

                    {/* TÊN MÓN ĂN */}
                    <td className="py-3.5 px-4 font-bold text-[#FAFAF9]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xs bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700">
                          {i.image ? (
                            <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">
                              F&B
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="line-clamp-1 leading-snug">{i.name}</p>
                          <span className="text-[10px] font-normal text-neutral-400">{i.categoryName}</span>
                        </div>
                      </div>
                    </td>

                    {/* MA TRẬN THỰC ĐƠN */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-xs text-[11px] border font-bold ${i.matrixBadgeBg}`}>
                          {i.matrixLabel}
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-1 italic">{i.matrixAdvice}</p>
                      </div>
                    </td>

                    {/* ĐƠN GIÁ BÁN */}
                    <td className="py-3.5 px-3 text-right font-medium text-neutral-300">
                      {i.price.toLocaleString('vi-VN')} đ
                    </td>

                    {/* GIÁ VỐN (COGS) */}
                    <td className="py-3.5 px-3 text-right font-medium text-neutral-400">
                      {i.costPrice.toLocaleString('vi-VN')} đ
                    </td>

                    {/* ĐÃ BÁN */}
                    <td className="py-3.5 px-3 text-center font-bold text-blue-400">
                      {i.soldQty}
                    </td>

                    {/* DOANH THU GỘP */}
                    <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                      {i.revenue.toLocaleString('vi-VN')} đ
                    </td>

                    {/* LỢI NHUẬN GỘP */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {i.profit.toLocaleString('vi-VN')} đ
                    </td>

                    {/* TỶ LỆ LÃI */}
                    <td className="py-3.5 px-3 text-center font-bold text-neutral-200">
                      {Math.round(i.profitMarginPct)}%
                    </td>

                    {/* TỒN KHO HIỆN TẠI */}
                    <td className="py-3.5 px-4 text-center bg-amber-500/10 font-bold text-amber-400">
                      {i.currentStock} phần
                    </td>

                    {/* DỰ BÁO BẾP CHUẨN BỊ */}
                    <td className="py-3.5 px-4 bg-emerald-500/10 font-semibold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <ChefHat className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Cần chuẩn bị ~<b className="font-black text-white text-xs">{i.forecastQty}</b> phần</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
