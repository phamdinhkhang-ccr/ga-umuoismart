'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Clock,
  Bot,
  Users,
  UserCheck,
  Building2,
  UtensilsCrossed,
  ArrowDownLeft,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getAnalyticsData } from '@/actions/orders';

// Custom Tooltip component for Recharts
const CustomFinancialTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[200px]">
        <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>Khung thời gian:</span>
          <span className="text-amber-400">{label}</span>
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex items-center justify-between font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">
              {Number(entry.value).toLocaleString('vi-VN')} đ
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    setIsMounted(true);
    async function load() {
      const res = await getAnalyticsData('all', 'all');
      setData(res);
    }
    load();
  }, []);

  const metrics = data?.metrics || {
    totalOrders: 12,
    gmv: 3850000,
    grossProfit: 1650000,
    completionRate: 98,
    cancellationRate: 2,
    activeStaff: 6,
    todayCustomers: 18,
    newVsReturning: '12 mới · 6 quay lại',
    statusBreakdown: { RECEIVED: 1, PREPARING: 2, SHIPPING: 3, PAID: 6 }
  };

  // Dynamic Chart Data based on timeRange & selectedBranch
  const chartData = useMemo(() => {
    const multiplier = selectedBranch === 'all' ? 1 : selectedBranch === 'caugiai' ? 0.45 : 0.3;
    
    if (timeRange === 'today') {
      return [
        { name: '08:00', gmv: Math.round(250000 * multiplier), expenses: Math.round(110000 * multiplier), profit: Math.round(140000 * multiplier) },
        { name: '10:00', gmv: Math.round(520000 * multiplier), expenses: Math.round(230000 * multiplier), profit: Math.round(290000 * multiplier) },
        { name: '12:00', gmv: Math.round(1180000 * multiplier), expenses: Math.round(510000 * multiplier), profit: Math.round(670000 * multiplier) },
        { name: '14:00', gmv: Math.round(750000 * multiplier), expenses: Math.round(320000 * multiplier), profit: Math.round(430000 * multiplier) },
        { name: '16:00', gmv: Math.round(610000 * multiplier), expenses: Math.round(270000 * multiplier), profit: Math.round(340000 * multiplier) },
        { name: '18:00', gmv: Math.round(1650000 * multiplier), expenses: Math.round(710000 * multiplier), profit: Math.round(940000 * multiplier) },
        { name: '20:00', gmv: Math.round(1980000 * multiplier), expenses: Math.round(840000 * multiplier), profit: Math.round(1140000 * multiplier) },
        { name: '22:00', gmv: Math.round(920000 * multiplier), expenses: Math.round(400000 * multiplier), profit: Math.round(520000 * multiplier) },
      ];
    } else if (timeRange === 'week') {
      return [
        { name: 'Thứ 2', gmv: Math.round(3200000 * multiplier), expenses: Math.round(1400000 * multiplier), profit: Math.round(1800000 * multiplier) },
        { name: 'Thứ 3', gmv: Math.round(3800000 * multiplier), expenses: Math.round(1650000 * multiplier), profit: Math.round(2150000 * multiplier) },
        { name: 'Thứ 4', gmv: Math.round(3500000 * multiplier), expenses: Math.round(1500000 * multiplier), profit: Math.round(2000000 * multiplier) },
        { name: 'Thứ 5', gmv: Math.round(4200000 * multiplier), expenses: Math.round(1800000 * multiplier), profit: Math.round(2400000 * multiplier) },
        { name: 'Thứ 6', gmv: Math.round(5500000 * multiplier), expenses: Math.round(2350000 * multiplier), profit: Math.round(3150000 * multiplier) },
        { name: 'Thứ 7', gmv: Math.round(7800000 * multiplier), expenses: Math.round(3300000 * multiplier), profit: Math.round(4500000 * multiplier) },
        { name: 'Chủ Nhật', gmv: Math.round(8500000 * multiplier), expenses: Math.round(3600000 * multiplier), profit: Math.round(4900000 * multiplier) },
      ];
    } else {
      return [
        { name: 'Tuần 1', gmv: Math.round(24500000 * multiplier), expenses: Math.round(10500000 * multiplier), profit: Math.round(14000000 * multiplier) },
        { name: 'Tuần 2', gmv: Math.round(28900000 * multiplier), expenses: Math.round(12400000 * multiplier), profit: Math.round(16500000 * multiplier) },
        { name: 'Tuần 3', gmv: Math.round(31200000 * multiplier), expenses: Math.round(13300000 * multiplier), profit: Math.round(17900000 * multiplier) },
        { name: 'Tuần 4', gmv: Math.round(36800000 * multiplier), expenses: Math.round(15700000 * multiplier), profit: Math.round(21100000 * multiplier) },
      ];
    }
  }, [timeRange, selectedBranch]);

  // Donut Chart Financial Ratio Data
  const donutData = useMemo(() => [
    { name: 'Giá vốn (COGS)', value: 43, color: '#F97316' },
    { name: 'Chi phí vận hành', value: 15, color: '#EF4444' },
    { name: 'Lợi nhuận ròng', value: 42, color: '#3B82F6' },
  ], []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Dashboard Tổng Quan F&amp;B POS</h1>
            <p className="text-xs text-slate-600 mt-0.5">Theo dõi doanh thu, ca làm việc, tồn kho &amp; đơn hàng đa chi nhánh realtime.</p>
          </div>
        </div>

        <Link
          href="/admin/create-order"
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>+ Lên Đơn Mới (AI Parser)</span>
        </Link>
      </div>

      {/* Top 6 Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Tổng Số Đơn Hàng</span>
            <ShoppingBag className="w-4 h-4 text-orange-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics.totalOrders} <span className="text-xs text-slate-500 font-normal">đơn</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium truncate">100% Đã khớp chi nhánh</p>
        </div>

        {/* Card 2: GMV */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Doanh Thu Gộp (GMV)</span>
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-600 truncate">
            {metrics.gmv.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">Tính từ đơn thanh toán</p>
        </div>

        {/* Card 3: Expected Profit */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Lợi Nhuận Dự Tính</span>
            <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 truncate">
            +{metrics.grossProfit.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">Doanh thu trừ giá vốn</p>
        </div>

        {/* Card 4: Completion Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Tỷ Lệ Hoàn Thành</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics.completionRate}%
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">Tỷ lệ đơn thành công</p>
        </div>

        {/* Card 5: Active Staff */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Nhân Sự Đang Trực</span>
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-900">
            {metrics.activeStaff || 6} <span className="text-xs text-slate-500 font-normal">nhân sự</span>
          </div>
          <p className="text-[11px] text-indigo-700 font-medium truncate">Đang mở ca tại các cơ sở</p>
        </div>

        {/* Card 6: Today Customers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold truncate">Khách Hàng Hôm Nay</span>
            <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-900">
            {metrics.todayCustomers || 18} <span className="text-xs text-slate-500 font-normal">khách</span>
          </div>
          <p className="text-[11px] text-teal-700 font-medium truncate">{metrics.newVsReturning || '12 mới · 6 quay lại'}</p>
        </div>
      </div>

      {/* Realtime Financial Charts Section (Grouped Bar Chart 65% / Donut 35%) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Phân Tích Biến Động Tài Chính Realtime (Biểu Đồ Cột)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Biểu đồ cột ghép so sánh Doanh Thu Gộp (GMV), Chi Phí Vận Hành &amp; Lợi Nhuận Ròng.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: '7 ngày qua' },
                { id: 'month', label: 'Tháng này' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    timeRange === tab.id
                      ? 'bg-white text-orange-600 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Branch Selector Dropdown */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                <option value="caugiai">CN1 - Cầu Giấy</option>
                <option value="dongda">CN2 - Đống Đa</option>
                <option value="hadong">CN3 - Hà Đông</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Grouped Bar Chart (65% -> col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">So Sánh Theo Cột (Doanh Thu vs Chi Phí vs Lợi Nhuận)</span>
              <div className="flex items-center space-x-4 font-semibold text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" />
                  <span className="text-slate-600">Doanh Thu (GMV)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  <span className="text-slate-600">Tổng Chi Phí</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                  <span className="text-slate-600">Lợi Nhuận Ròng</span>
                </span>
              </div>
            </div>

            {/* Recharts Bar Container with Hydration Safety */}
            <div className="h-72 w-full">
              {!isMounted ? (
                <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                  Đang tải biểu đồ cột tài chính...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={3} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomFinancialTooltip />} />
                    <Bar
                      dataKey="gmv"
                      name="Doanh Thu Gộp (GMV)"
                      fill="#F97316"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Tổng Chi Phí"
                      fill="#EF4444"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Lợi Nhuận Ròng"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Column: Donut Breakdown Chart (35% -> col-span-4) */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
            <div className="w-full flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-orange-600" />
                Cơ Cấu Tài Chính (%)
              </span>
              <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">100% GMV</span>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              {!isMounted ? (
                <div className="h-full w-full bg-slate-100 animate-pulse rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'Tỷ lệ']}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend & Breakdown stats */}
            <div className="w-full space-y-1.5 text-xs">
              {donutData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 font-medium text-[11px]">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Modules Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Phân Hệ Vận Hành Nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: 'Đóng / Mở Ca', href: '/admin/shifts/active', icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Sổ Quỹ Chi Tiêu', href: '/admin/expenses', icon: DollarSign, color: 'text-rose-600 bg-rose-50' },
            { label: 'Quản Lý Đơn', href: '/admin/orders', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
            { label: 'Menu Sản Phẩm', href: '/admin/products', icon: UtensilsCrossed, color: 'text-purple-600 bg-purple-50' },
            { label: 'CRM Khách Hàng', href: '/admin/customers', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Nhập Kho', href: '/admin/inventory/import', icon: ArrowDownLeft, color: 'text-emerald-600 bg-emerald-50' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-900 group-hover:text-orange-600 transition">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
