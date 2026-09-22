'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  Building2,
  Calendar,
  Download,
  Bot,
  Globe,
  PieChart as PieChartIcon,
  ChevronDown,
  RefreshCw,
  X,
  Filter,
  BarChart3,
  UtensilsCrossed,
  Receipt,
  Lock,
  ShieldAlert,
  ChevronRight,
  Package,
  Layers,
  Calculator,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useBranches } from '@/hooks/useBranches';

export default function AdminDashboardPage() {
  const { branches } = useBranches();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // User Auth & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'expenses'>('overview');

  // Filters state
  const [period, setPeriod] = useState<string>('today');
  const [branchId, setBranchId] = useState<string>('all');
  const [productType, setProductType] = useState<'ALL' | 'SINGLE' | 'COMBO'>('ALL');
  const [expenseCategory, setExpenseCategory] = useState<'ALL' | 'CHICKEN' | 'SPRING_ROLL' | 'OTHER'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    // Fetch Current User
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.user) {
          setCurrentUser(resData.user);
          const role = resData.user.role;
          if (role === 'STAFF' || role === 'CASHIER' || role === 'TELESALES') {
            setAccessDenied(true);
          } else if (role === 'MANAGER' && resData.user.branchId) {
            setBranchId(resData.user.branchId);
          }
        }
      })
      .catch(console.error);
  }, []);

  const fetchDashboardData = () => {
    if (accessDenied) return;
    setLoading(true);
    let url = `/api/dashboard?period=${period}&branchId=${branchId}&productType=${productType}&expenseCategory=${expenseCategory}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    fetch(url)
      .then((res) => {
        if (res.status === 403) {
          setAccessDenied(true);
          return null;
        }
        return res.json();
      })
      .then((resData) => {
        if (resData && resData.success) {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (mounted && !accessDenied) {
      fetchDashboardData();
    }
  }, [mounted, period, branchId, productType, expenseCategory, startDate, endDate, accessDenied]);

  // Export report CSV / Excel handler
  const handleExportReport = () => {
    if (!data) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    if (activeTab === 'overview') {
      csvContent += 'BÁO CÁO TỔNG QUAN TÀI CHÍNH SYSTEM\n';
      csvContent += `Thời gian xuất,${new Date().toLocaleString('vi-VN')}\n`;
      csvContent += `Kỳ báo cáo,${period}\n`;
      csvContent += `Cơ sở,${data.selectedBranchName}\n\n`;
      csvContent += `Chỉ số,Giá trị\n`;
      csvContent += `Doanh thu thuần,${data.todayRevenue} VNĐ\n`;
      csvContent += `Tăng trưởng doanh thu,${data.revenueGrowth}%\n`;
      csvContent += `Lợi nhuận ròng,${data.netProfit} VNĐ\n`;
      csvContent += `Tỷ suất lợi nhuận (Margin),${data.marginPercent}%\n`;
      csvContent += `Tổng đơn hàng,${data.totalOrdersCount}\n`;
      csvContent += `Đơn Web Form,${data.webOrdersCount}\n`;
      csvContent += `Đơn AI Chatbot,${data.aiOrdersCount}\n`;
      csvContent += `Giá trị đơn trung bình (AOV),${data.avgOrderValue} VNĐ\n`;
    } else if (activeTab === 'sales') {
      csvContent += 'BÁO CÁO BÁN HÀNG & HIỆU SUẤT MÓN ĂN\n';
      csvContent += `Cơ sở,${data.selectedBranchName}\n`;
      csvContent += `Bộ lọc loại món,${productType === 'ALL' ? 'Tất cả' : productType === 'SINGLE' ? 'Món Thường' : 'Combo'}\n\n`;
      csvContent += 'Tên Món Ăn,Loại,Số Lượng Bán,Doanh Thu (VNĐ),Giá Vốn Đơn Vị (VNĐ),Tổng Giá Vốn (VNĐ),Lợi Nhuận Gộp (VNĐ),Tỷ Trọng Doanh Thu (%)\n';

      (data.dishPerformance || []).forEach((d: any) => {
        csvContent += `"${d.name}",${d.type === 'COMBO' ? 'Combo' : 'Món Thường'},${d.quantitySold},${d.revenue},${d.costPrice},${d.totalCost},${d.grossProfit},${d.sharePercent}%\n`;
      });

      if (data.salesSummary) {
        csvContent += `\nTỔNG CỘNG,,${data.salesSummary.totalQuantitySold},${data.salesSummary.totalRevenue},,${data.salesSummary.totalRevenue - data.salesSummary.totalGrossProfit},${data.salesSummary.totalGrossProfit},${data.salesSummary.overallGrossMarginPercent}%\n`;
      }
    } else {
      csvContent += 'BÁO CÁO CHI TIÊU SỔ QUỸ\n';
      csvContent += `Cơ sở,${data.selectedBranchName}\n`;
      csvContent += `Hạng mục chi,${expenseCategory}\n\n`;
      csvContent += 'Mã Phiếu,Tên Chi Phí,Hạng Mục,Cơ Sở,Số Tiền (VNĐ),Người Tạo,Ghi Chú,Thời Gian\n';

      (data.expenseReceipts || []).forEach((e: any) => {
        csvContent += `"${e.expenseCode}","${e.title}","${e.categoryLabel}","${e.branchName}",${e.amount},"${e.creatorName}","${e.note}","${new Date(e.date).toLocaleString('vi-VN')}"\n`;
      });

      if (data.expenseSummary) {
        csvContent += `\nTỔNG CỘNG CHI TIÊU (${data.expenseSummary.totalReceiptsCount} Phiếu),,,,${data.expenseSummary.totalAmount},,,\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_${activeTab.toUpperCase()}_${data.branchId}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) return null;

  // Access Denied Screen for STAFF / TELESALES
  if (accessDenied) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-xl">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight">
            TRUY CẬP BỊ TỪ CHỐI (ACCESS DENIED)
          </h1>
          <p className="text-sm dark:text-neutral-400 text-stone-600 max-w-lg mx-auto">
            Tài khoản của bạn (<span className="font-bold text-amber-500">{currentUser?.role || 'STAFF'}</span>) không có quyền xem module Báo Cáo & Phân Tích Doanh Nghiệp.
          </p>
        </div>
        <div className="pt-4">
          <a
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-md"
          >
            Quay Về Quản Lý Đơn Hàng
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </a>
        </div>
      </div>
    );
  }

  const isManager = currentUser?.role === 'MANAGER';

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* 1. Header Title & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-neutral-800 border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <TrendingUp className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold dark:text-white text-stone-900 tracking-tight flex items-center gap-2">
                📊 Báo Cáo & Phân Tích Doanh Nghiệp
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-500 mt-0.5">
                Hệ thống phân tích tài chính real-time, hiệu suất món ăn và kiểm soát sổ quỹ chi tiêu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2.5 rounded-xl dark:bg-neutral-800 dark:text-neutral-300 bg-white border border-stone-200 dark:border-neutral-700 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={handleExportReport}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2]" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b dark:border-neutral-800 border-stone-200 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
              : 'dark:bg-neutral-900 bg-white dark:text-neutral-300 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-800 border dark:border-neutral-800 border-stone-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 stroke-[2]" />
          <span>📈 Báo Cáo Tổng Quan</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sales'
              ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
              : 'dark:bg-neutral-900 bg-white dark:text-neutral-300 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-800 border dark:border-neutral-800 border-stone-200'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 stroke-[2]" />
          <span>🍗 Báo Cáo Bán Hàng & Món</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
              : 'dark:bg-neutral-900 bg-white dark:text-neutral-300 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-800 border dark:border-neutral-800 border-stone-200'
          }`}
        >
          <Receipt className="w-4 h-4 stroke-[2]" />
          <span>💸 Báo Cáo Chi Tiêu Sổ Quỹ</span>
        </button>

        <a
          href="/admin/reports/product-profitability"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap dark:bg-neutral-900 bg-white dark:text-neutral-300 text-stone-700 hover:bg-amber-500/10 hover:text-amber-500 border dark:border-neutral-800 border-stone-200"
        >
          <Calculator className="w-4 h-4 stroke-[2] text-amber-500" />
          <span>🎯 Báo Cáo Lợi Nhuận Sản Phẩm (Mới)</span>
        </a>
      </div>

      {/* 3. Global Filters Bar (Date Period & Branch Selection) */}
      <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Date Period Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Thời gian:
          </span>
          {[
            { id: 'today', label: 'Hôm Nay' },
            { id: 'yesterday', label: 'Hôm Qua' },
            { id: 'last7days', label: '7 Ngày Qua' },
            { id: 'thisMonth', label: 'Tháng Này' },
            { id: 'custom', label: 'Tùy Chọn' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === p.id
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold'
                  : 'dark:text-neutral-400 text-stone-600 hover:bg-stone-100 dark:hover:bg-neutral-800 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs text-stone-800 dark:text-neutral-200"
              />
              <span className="text-xs text-stone-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs text-stone-800 dark:text-neutral-200"
              />
            </div>
          )}
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Cơ Sở:
          </span>

          <div className="relative">
            {isManager && (
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 z-10" title="Khóa theo cơ sở quản lý">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
            <select
              value={branchId}
              disabled={isManager}
              onChange={(e) => setBranchId(e.target.value)}
              className={`py-1.5 rounded-xl text-xs font-bold dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-stone-900 dark:text-white cursor-pointer focus:outline-none focus:border-amber-500 ${
                isManager ? 'pl-8 pr-4 opacity-90 bg-amber-500/5 cursor-not-allowed border-amber-500/30' : 'px-3.5'
              }`}
            >
              <option value="all">🌐 Tất Cả Cơ Sở (Toàn Hệ Thống)</option>
              {(data?.branchList || branches || []).map((b: any) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.badge || b.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Overlay Spinner */}
      {loading && !data && (
        <div className="p-12 text-center space-y-3 dark:bg-[#12141A] bg-white rounded-2xl border dark:border-neutral-800 border-stone-200">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs dark:text-neutral-400 text-stone-500 font-semibold">Đang tổng hợp dữ liệu báo cáo real-time...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: BÁO CÁO TỔNG QUAN (OVERVIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Doanh Thu Thuần */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  Doanh Thu Thuần
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight">
                  {(data.todayRevenue || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-md ${
                      data.revenueGrowth >= 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {data.revenueGrowth >= 0 ? `+${data.revenueGrowth}%` : `${data.revenueGrowth}%`}
                  </span>
                  <span className="dark:text-neutral-400 text-stone-500">so với kỳ trước</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Lợi Nhuận Ròng */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  Lợi Nhuận Ròng
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black dark:text-emerald-400 text-emerald-600 tracking-tight">
                  {(data.netProfit || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    Margin {data.marginPercent}%
                  </span>
                  <span className="dark:text-neutral-400 text-stone-500">sau giá vốn & chi phí</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Tổng Số Đơn Hàng */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  Tổng Số Đơn Hàng
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight">
                  {data.totalOrdersCount || 0} <span className="text-xs text-stone-500 dark:text-neutral-400 font-normal">đơn</span>
                </h2>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-medium dark:text-neutral-400 text-stone-600">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{data.webOrdersCount} Web</span>
                  <span>•</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{data.aiOrdersCount} AI Chat</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Giá Trị Đơn Trung Bình (AOV) */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  Giá Trị Đơn TB (AOV)
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight">
                  {(data.avgOrderValue || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <div className="mt-2 flex items-center gap-2 text-[11px] dark:text-neutral-400 text-stone-500">
                  <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                    {data.customerCount} Khách
                  </span>
                  <span>mua trong kỳ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue vs Cost vs Net Profit Bar Chart */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-neutral-800 border-stone-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900 flex items-center gap-2">
                  <span>📈 Biểu Đồ So Sánh Doanh Thu - Chi Phí - Lợi Nhuận</span>
                </h3>
                <p className="text-xs dark:text-neutral-400 text-stone-500">
                  Biểu diễn dòng tiền thực tế phân bổ theo thời gian tại {data.selectedBranchName}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500" />
                  <span className="dark:text-neutral-300 text-stone-700">Doanh Thu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span className="dark:text-neutral-300 text-stone-700">Tổng Chi Phí</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="dark:text-neutral-300 text-stone-700">Lợi Nhuận Ròng</span>
                </div>
              </div>
            </div>

            <div className="h-[340px] w-full pt-2">
              {data.chartData && data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#181A20',
                        borderColor: '#262933',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} đ`, '']}
                    />
                    <Bar dataKey="revenue" name="Doanh Thu" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Tổng Chi Phí" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Lợi Nhuận Ròng" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs dark:text-neutral-500 text-stone-400 font-medium">
                  Chưa có dữ liệu giao dịch phát sinh trong khoảng thời gian này.
                </div>
              )}
            </div>
          </div>

          {/* Grid Row: Branch Performance & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Branch Revenue Performance List */}
            <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-3">
                <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Xếp Hạng Doanh Thu 6 Cơ Sở</span>
                </h3>
                <span className="text-[11px] font-semibold text-stone-400">Toàn Chuỗi</span>
              </div>

              <div className="space-y-3">
                {(data.branchPerformance || []).map((b: any, index: number) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border transition-all ${
                      b.isSelected
                        ? 'dark:bg-neutral-900 bg-amber-500/5 dark:border-amber-500/30 border-amber-500/40'
                        : 'dark:bg-neutral-900/40 bg-stone-50 border-stone-100 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-stone-200 dark:bg-neutral-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                          #{index + 1}
                        </span>
                        <span className="font-bold dark:text-white text-stone-900 truncate">{b.name}</span>
                        <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-sm">
                          {b.badge}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-extrabold dark:text-amber-400 text-amber-600 block">
                          {b.revenue.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-stone-400">{b.ordersCount} đơn • {b.sharePercent}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${Math.min(100, b.sharePercent * 2.5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Recent Orders Feed */}
            <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-3">
                <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Đơn Hàng Mới Nhất</span>
                </h3>
                <a href="/admin/orders" className="text-[11px] font-bold text-amber-500 hover:underline">
                  Xem tất cả →
                </a>
              </div>

              <div className="space-y-2.5">
                {(data.recentOrders || []).map((o: any) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-xl dark:bg-neutral-900/60 bg-stone-50 border border-stone-200/60 dark:border-neutral-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-500">{o.orderCode}</span>
                        <span className="font-semibold dark:text-white text-stone-800">{o.customerName}</span>
                        <span className="text-[10px] dark:text-neutral-400 text-stone-500">({o.customerPhone})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] dark:text-neutral-400 text-stone-500">
                        <span>📍 {o.branchName}</span>
                        <span>•</span>
                        <span
                          className={`font-semibold px-1 rounded ${
                            o.source === 'AI Chatbot'
                              ? 'bg-purple-500/15 text-purple-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          {o.source}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold dark:text-white text-stone-900 block">
                        {o.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-block ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-500/20 text-rose-500'
                            : 'bg-amber-500/20 text-amber-500'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO BÁN HÀNG & MÓN (SALES & DISH ANALYSIS) */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Product Type Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Phân Loại Sản Phẩm:
              </span>
              {[
                { id: 'ALL', label: 'Tất Cả Món' },
                { id: 'SINGLE', label: '🍗 Sản Phẩm Thường' },
                { id: 'COMBO', label: '🍱 Sản Phẩm Combo' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProductType(t.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    productType === t.id
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'dark:bg-neutral-900 bg-stone-100 dark:text-neutral-300 text-stone-700 hover:bg-stone-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="text-xs dark:text-neutral-400 text-stone-500 font-medium">
              💡 Giá vốn Combo tự động tính toán tổng từ các sản phẩm con trong gói combo.
            </div>
          </div>

          {/* Top 5 Best Selling Dishes Horizontal List / Chart */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Top 5 Món Ăn Bán Chạy Nhất (Theo Doanh Thu)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {(data.topSellingProducts || []).map((p: any, idx: number) => (
                <div
                  key={p.id || idx}
                  className="p-4 rounded-xl dark:bg-neutral-900/80 bg-stone-50 border border-stone-200 dark:border-neutral-800 space-y-2 relative overflow-hidden"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <h4 className="font-bold text-xs dark:text-white text-stone-900 truncate" title={p.name}>
                    {p.name}
                  </h4>
                  <div className="space-y-0.5">
                    <span className="text-sm font-extrabold text-amber-500 block">
                      {p.revenue.toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-stone-400 block font-medium">
                      Đã bán: <b className="dark:text-neutral-200 text-stone-700">{p.quantitySold}</b> phần ({p.sharePercent}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Dish Performance Table */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-3">
              <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                <span>Bảng Chi Tiết Hiệu Suất Sản Phẩm & Lợi Nhuận Gộp</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-2">SẢN PHẨM / MÓN ĂN</th>
                    <th className="pb-3 px-2">LOẠI</th>
                    <th className="pb-3 px-2 text-center">SL BÁN</th>
                    <th className="pb-3 px-2 text-right">DOANH THU</th>
                    <th className="pb-3 px-2 text-right">GIÁ VỐN NỀN</th>
                    <th className="pb-3 px-2 text-right">TỔNG GIÁ VỐN</th>
                    <th className="pb-3 px-2 text-right">LỢI NHUẬN GỘP</th>
                    <th className="pb-3 px-2 text-right">TỶ TRỌNG (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100">
                  {(data.dishPerformance || []).map((d: any) => (
                    <tr key={d.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-2 font-bold dark:text-white text-stone-900">{d.name}</td>
                      <td className="py-3 px-2">
                        {d.type === 'COMBO' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            🍱 Combo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            🍗 Món Thường
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-extrabold">{d.quantitySold}</td>
                      <td className="py-3 px-2 text-right font-black dark:text-amber-400 text-amber-600">
                        {d.revenue.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-stone-500">
                        {d.costPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-rose-500">
                        {d.totalCost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {d.grossProfit.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-stone-500">{d.sharePercent}%</td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary Footer Row */}
                {data.salesSummary && (
                  <tfoot>
                    <tr className="border-t-2 dark:border-neutral-700 border-stone-300 font-extrabold dark:text-white text-stone-900 bg-amber-500/5">
                      <td className="py-3.5 px-2">TỔNG CỘNG ({data.dishPerformance?.length || 0} sản phẩm)</td>
                      <td className="py-3.5 px-2">-</td>
                      <td className="py-3.5 px-2 text-center text-amber-500 text-sm">
                        {data.salesSummary.totalQuantitySold}
                      </td>
                      <td className="py-3.5 px-2 text-right text-amber-500 text-sm">
                        {data.salesSummary.totalRevenue.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-2 text-right">-</td>
                      <td className="py-3.5 px-2 text-right text-rose-500">
                        {(data.salesSummary.totalRevenue - data.salesSummary.totalGrossProfit).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-2 text-right text-emerald-500 text-sm">
                        {data.salesSummary.totalGrossProfit.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-2 text-right text-emerald-500">
                        {data.salesSummary.overallGrossMarginPercent}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BÁO CÁO CHI TIÊU SỔ QUỸ (EXPENSE ANALYSIS) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Expense Category Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Hạng Mục Chi Tiêu:
              </span>
              {[
                { id: 'ALL', label: 'Tất Cả OPEX' },
                { id: 'SHIPPING', label: '🚚 Cước Ship / Vận Chuyển' },
                { id: 'UTILITIES', label: '⚡ Điện / Nước / Mặt Bằng' },
                { id: 'PACKAGING', label: '📦 Vật Tư Tiêu Hao' },
                { id: 'OTHER', label: '☕ Marketing & Khác' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setExpenseCategory(c.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    expenseCategory === c.id
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'dark:bg-neutral-900 bg-stone-100 dark:text-neutral-300 text-stone-700 hover:bg-stone-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <a
              href="/admin/expenses"
              className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
            >
              + Tạo phiếu chi mới →
            </a>
          </div>

          {/* 4 Cashflow Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng Chi Tiêu */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm">
              <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                Tổng Chi Tiêu Sổ Quỹ
              </span>
              <h2 className="text-2xl font-black dark:text-white text-stone-900 mt-2">
                {(data.cashflowCards?.total || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-1">Toàn bộ chi phí vận hành (OPEX)</p>
            </div>

            {/* Card 2: Tiền Ship / Vận chuyển */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                  Cước Ship / Vận Chuyển
                </span>
                <span className="text-[10px] font-bold bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {data.cashflowCards?.shipping?.percent || 0}%
                </span>
              </div>
              <h2 className="text-2xl font-black text-blue-500 mt-2">
                {(data.cashflowCards?.shipping?.amount || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-1">Giao hàng ngoại thành, ship ngoài</p>
            </div>

            {/* Card 3: Điện Nước Mặt Bằng */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                  Điện / Nước / Mặt Bằng
                </span>
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {data.cashflowCards?.utilities?.percent || 0}%
                </span>
              </div>
              <h2 className="text-2xl font-black text-amber-500 mt-2">
                {(data.cashflowCards?.utilities?.amount || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-1">Thuê mặt bằng, điện nước, internet</p>
            </div>

            {/* Card 4: Vật Tư Tiêu Hao */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                  Vật Tư Tiêu Hao
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {data.cashflowCards?.packaging?.percent || 0}%
                </span>
              </div>
              <h2 className="text-2xl font-black text-emerald-500 mt-2">
                {(data.cashflowCards?.packaging?.amount || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
              </h2>
              <p className="text-[11px] text-stone-400 mt-1">Túi nilong, hộp xốp, màng bọc, đũa</p>
            </div>
          </div>

          {/* Grid: Pie Chart & Expense Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Category Pie Chart */}
            <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-500" />
                <span>Phân Bổ Chi Tiêu Theo Hạng Mục</span>
              </h3>

              <div className="h-[240px] w-full">
                {data.categoryChartData && data.categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.categoryChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181A20',
                          borderColor: '#262933',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} đ`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-400">
                    Chưa có chi tiêu phát sinh.
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs pt-2">
                {(data.categoryChartData || []).map((c: any) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="dark:text-neutral-300 text-stone-700 font-semibold">{c.name}</span>
                    </div>
                    <span className="font-bold dark:text-white text-stone-900">
                      {c.value.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Detailed Expense Receipts Table */}
            <div className="lg:col-span-2 p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4 overflow-hidden">
              <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-3">
                <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span>Danh Sách Phiếu Chi Sổ Quỹ Chi Tiết</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-2">MÃ PHIẾU</th>
                      <th className="pb-3 px-2">HẠNG MỤC CHI</th>
                      <th className="pb-3 px-2">CƠ SỞ</th>
                      <th className="pb-3 px-2 text-right">SỐ TIỀN</th>
                      <th className="pb-3 px-2">NGƯỜI TẠO</th>
                      <th className="pb-3 px-2">GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100">
                    {(data.expenseReceipts || []).map((e: any) => (
                      <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition-colors">
                        <td className="py-3 px-2 font-black text-amber-500">{e.expenseCode}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              e.category === 'SHIPPING'
                                ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                : e.category === 'UTILITIES'
                                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                : e.category === 'PACKAGING'
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {e.categoryLabel}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium dark:text-neutral-300 text-stone-700">{e.branchName}</td>
                        <td className="py-3 px-2 text-right font-extrabold text-rose-500">
                          {e.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-2 font-semibold text-stone-600 dark:text-neutral-400">{e.creatorName}</td>
                        <td className="py-3 px-2 text-stone-500 max-w-[160px] truncate" title={e.title + ' - ' + e.note}>
                          {e.title}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {data.expenseSummary && (
                    <tfoot>
                      <tr className="border-t-2 dark:border-neutral-700 border-stone-300 font-extrabold dark:text-white text-stone-900 bg-rose-500/5">
                        <td className="py-3.5 px-2">TỔNG CỘNG ({data.expenseSummary.totalReceiptsCount} phiếu chi)</td>
                        <td className="py-3.5 px-2" colSpan={2}>-</td>
                        <td className="py-3.5 px-2 text-right text-rose-500 text-sm">
                          {data.expenseSummary.totalAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3.5 px-2" colSpan={2}>-</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
