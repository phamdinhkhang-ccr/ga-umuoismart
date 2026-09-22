'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Download,
  RefreshCw,
  Lock,
  ShieldAlert,
  ChevronRight,
  Calculator,
  Receipt,
  Package,
  Sparkles,
  Eye,
  FileSpreadsheet,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShoppingBag,
} from 'lucide-react';

import { useBranches } from '@/hooks/useBranches';

export default function ProductProfitabilityPage() {
  const { branches } = useBranches();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // User Auth & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Filters state
  const [period, setPeriod] = useState<string>('today');
  const [branchId, setBranchId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Drill-down Modal State
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'sales' | 'expenses'>('sales');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch Current User for RBAC
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

  const fetchData = () => {
    if (accessDenied) return;
    setLoading(true);
    let url = `/api/reports/product-profitability?period=${period}&branchId=${branchId}`;
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
      fetchData();
    }
  }, [mounted, period, branchId, startDate, endDate, accessDenied]);

  // Export report CSV / Excel handler
  const handleExportExcel = () => {
    if (!data || !data.products) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += 'BÁO CÁO PHÂN TÍCH LỢI NHUẬN SẢN PHẨM THEO THỜI GIAN\n';
    csvContent += `Thời gian xuất,${new Date().toLocaleString('vi-VN')}\n`;
    csvContent += `Kỳ báo cáo,${period}\n`;
    csvContent += `Cơ sở,${data.selectedBranchName}\n\n`;

    csvContent += 'Sản Phẩm,SL Xuất Bán (Tổng),SL Bán Lẻ,SL Trong Combo,Đơn Giá Vốn (VNĐ),(C) Tổng Giá Vốn (VNĐ),Tỷ Trọng Giá Vốn (%),(B) Doanh Thu Thuần (VNĐ),(D) Chi Phí Sổ Quỹ (VNĐ),(A) Lợi Nhuận Ròng (VNĐ),Tỷ Suất Lợi Nhuận (%)\n';

    data.products.forEach((p: any) => {
      csvContent += `"${p.name}",${p.totalQty},${p.directQty},${p.comboQty},${p.costPrice},${p.cogs},${p.costSharePercent}%,${p.netRevenue},${p.expense},${p.netProfit},${p.marginPercent}%\n`;
    });

    if (data.summary) {
      const s = data.summary;
      const totalQty = data.products.reduce((sum: number, p: any) => sum + p.totalQty, 0);
      csvContent += `\nTỔNG CỘNG,${totalQty},,,${s.totalCOGS},100%,${s.totalNetRevenue},${s.totalExpenses},${s.totalNetProfit},${s.overallMarginPercent}%\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_LoiNhuan_SanPham_${data.branchId}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) return null;

  // Access Denied Screen
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
            Tài khoản của bạn (<span className="font-bold text-amber-500">{currentUser?.role || 'STAFF'}</span>) không có quyền truy cập Báo Cáo Phân Tích Lợi Nhuận Sản Phẩm.
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
  const summary = data?.summary || {
    totalNetRevenue: 0,
    totalCOGS: 0,
    totalExpenses: 0,
    totalNetProfit: 0,
    overallMarginPercent: 0,
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* 1. Header Title & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-neutral-800 border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <Calculator className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold dark:text-white text-stone-900 tracking-tight flex items-center gap-2">
                🎯 Báo Cáo Phân Tích Lợi Nhuận Sản Phẩm Theo Thời Gian
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-500 mt-0.5">
                Công thức phân bổ doanh thu thuần sau giảm giá, bóc tách tiêu thụ Combo và khấu trừ chi phí Sổ Quỹ trực tiếp
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl dark:bg-neutral-800 dark:text-neutral-300 bg-white border border-stone-200 dark:border-neutral-700 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2]" />
            <span>Xuất Excel Phân Tích Lợi Nhuận</span>
          </button>
        </div>
      </div>

      {/* 2. Global Filters Bar */}
      <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Date Period Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Khoảng thời gian:
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
              <option value="all">🌐 Toàn Bộ Hệ Thống</option>
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
          <p className="text-xs dark:text-neutral-400 text-stone-500 font-semibold">Đang tính toán phân bổ lợi nhuận ròng từng sản phẩm...</p>
        </div>
      )}

      {/* 3. Financial KPI Summary Cards */}
      {data && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Tổng Doanh Thu Thuần (B) */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  (∑ B) Doanh Thu Thuần
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight">
                  {(summary.totalNetRevenue || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500 mt-1">
                  Đã trừ giảm giá / voucher thực tế
                </p>
              </div>
            </div>

            {/* KPI 2: Tổng Giá Vốn Hàng Bán (C) */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  (∑ C) Tổng Giá Vốn
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black text-rose-500 tracking-tight">
                  {(summary.totalCOGS || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500 mt-1">
                  Đã bóc tách sản phẩm lẻ & Combo
                </p>
              </div>
            </div>

            {/* KPI 3: Tổng Chi Phí Sổ Quỹ (D) */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  (∑ D) Chi Phí Trực Tiếp
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2 className="text-2xl font-black text-purple-500 tracking-tight">
                  {(summary.totalExpenses || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500 mt-1">
                  Tiền chi Sổ Quỹ (Gà, Nem, Khác)
                </p>
              </div>
            </div>

            {/* KPI 4: Tổng Lợi Nhuận Ròng (A = B - C - D) */}
            <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase tracking-wider">
                  (∑ A) Lợi Nhuận Ròng
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    summary.totalNetProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h2
                  className={`text-2xl font-black tracking-tight ${
                    summary.totalNetProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {(summary.totalNetProfit || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </h2>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded-md ${
                      summary.overallMarginPercent >= 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    Biên ròng: {summary.overallMarginPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Explanation Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs dark:text-amber-200 text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>CƠ CHẾ PHÂN BỔ DOANH THU & LỢI NHUẬN RÒNG SẢN PHẨM:</span>
            </div>
            <p>
              • <b>(A) Lợi Nhuận Ròng Sản Phẩm</b> = (B) Doanh Thu Thuần - (C) Tổng Giá Vốn - (D) Chi Phí Sổ Quỹ.
            </p>
            <p>
              • <b>(B) Doanh Thu Thuần</b> = Doanh thu bán lẻ thực nhận từ đơn hàng (đã trừ voucher/chiết khấu, bóc tách tỷ trọng từ combo).
            </p>
            <p>
              • <b>(C) Tổng Giá Vốn</b> = Đơn Giá Vốn × SL Xuất Bán (Bóc tách lẻ + combo). <b>% Tỷ Trọng Giá Vốn</b> = (C / ∑C) × 100%.
            </p>
            <p>
              • <b>(D) Chi Phí Sổ Quỹ</b> = <b>Chi Phí Đích Danh</b> (khoản chi Sổ Quỹ trực tiếp cho Nem/Gà) + <b>Chi Phí Vận Hành Chung (Khác)</b> được phân bổ theo tỷ trọng doanh thu thuần của món.
            </p>
            <p>
              • <b>(∑ D) Chi Phí Trực Tiếp</b> = Tổng các phiếu chi phát sinh từ phân hệ Sổ Quỹ (hoàn toàn không tính tiền nhập kho hàng).
            </p>
          </div>

          {/* Detailed Product Profitability Table */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800/80 border-stone-200 shadow-sm space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-neutral-800 border-stone-100 pb-3">
              <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span>Bảng Chi Tiết Phân Tích Lợi Nhuận Ròng Từng Sản Phẩm Cốt Lõi</span>
              </h3>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-stone-400 font-medium">Hiển thị {data.products?.length || 0} sản phẩm</span>
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Xuất Excel Báo Cáo</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-2 min-w-[150px]">SẢN PHẨM CỐT LÕI</th>
                    <th className="pb-3 px-2 text-center min-w-[140px]">SL XUẤT BÁN (GỘP LẺ + COMBO)</th>
                    <th className="pb-3 px-2 text-right">ĐƠN GIÁ VỐN</th>
                    <th className="pb-3 px-2 text-right">(C) TỔNG GIÁ VỐN</th>
                    <th className="pb-3 px-2 text-right">TỶ TRỌNG (%)</th>
                    <th className="pb-3 px-2 text-right">(B) DOANH THU THUẦN</th>
                    <th className="pb-3 px-2 text-right">(D) CHI PHÍ SỔ QUỸ</th>
                    <th className="pb-3 px-2 text-right">(A) LỢI NHUẬN RÒNG</th>
                    <th className="pb-3 px-2 text-right">BIÊN LỢI NHUẬN (%)</th>
                    <th className="pb-3 px-2 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100">
                  {(data.products || []).map((p: any) => {
                    const isProfit = p.netProfit > 0;
                    const isLoss = p.netProfit < 0;

                    return (
                      <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition-colors">
                        <td className="py-3.5 px-2">
                          <div className="font-bold dark:text-white text-stone-900">{p.name}</div>
                          <span className="text-[10px] text-stone-400">Đơn vị: {p.unit}</span>
                        </td>

                        {/* Quantity breakdown */}
                        <td className="py-3.5 px-2 text-center">
                          <span className="font-black text-amber-500 text-sm block">{p.totalQty}</span>
                          <div className="text-[10px] dark:text-neutral-400 text-stone-500 font-medium">
                            <span>{p.directQty} lẻ</span>
                            {p.comboQty > 0 && <span className="text-amber-500 font-semibold"> + {p.comboQty} combo</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-2 text-right font-medium text-stone-500">
                          {p.costPrice.toLocaleString('vi-VN')} đ
                        </td>

                        {/* (C) Total COGS */}
                        <td className="py-3.5 px-2 text-right font-bold text-rose-500">
                          {p.cogs.toLocaleString('vi-VN')} đ
                        </td>

                        {/* Cost Share % */}
                        <td className="py-3.5 px-2 text-right font-semibold text-stone-600 dark:text-neutral-300">
                          {p.costSharePercent}%
                        </td>

                        {/* (B) Allocated Net Revenue */}
                        <td className="py-3.5 px-2 text-right font-extrabold dark:text-amber-400 text-amber-600">
                          {p.netRevenue.toLocaleString('vi-VN')} đ
                        </td>

                        {/* (D) Allocated Direct Expense */}
                        <td className="py-3.5 px-2 text-right font-medium text-purple-500">
                          {p.expense.toLocaleString('vi-VN')} đ
                        </td>

                        {/* (A) Final Net Profit with Visual Indicator */}
                        <td className="py-3.5 px-2 text-right">
                          <span
                            className={`font-extrabold text-sm block ${
                              isProfit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isLoss
                                ? 'text-rose-600 dark:text-rose-500 font-black'
                                : 'dark:text-neutral-400 text-stone-400'
                            }`}
                          >
                            {p.netProfit.toLocaleString('vi-VN')} đ
                          </span>
                          {isLoss && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-md border border-rose-500/40 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> ⚠️ Cảnh Báo Lỗ
                            </span>
                          )}
                        </td>

                        {/* Net Margin % with Badge Color Coding */}
                        <td className="py-3.5 px-2 text-right">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                              p.marginPercent >= 40
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : p.marginPercent >= 15
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-500 border-rose-500/30'
                            }`}
                          >
                            {p.marginPercent}%
                          </span>
                        </td>

                        {/* THAO TÁC: Xem Chi Tiết */}
                        <td className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedProductForDetail(p);
                              setModalTab('sales');
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-neutral-950 border border-amber-500/30 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            title="Xem bóc tách dòng tiền chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem Chi Tiết</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary Footer Row */}
                <tfoot>
                  <tr className="border-t-2 dark:border-neutral-700 border-stone-300 font-extrabold dark:text-white text-stone-900 bg-amber-500/5">
                    <td className="py-4 px-2">TỔNG CỘNG HỆ THỐNG</td>
                    <td className="py-4 px-2 text-center text-amber-500 text-sm">
                      {data.products?.reduce((sum: number, p: any) => sum + p.totalQty, 0)}
                    </td>
                    <td className="py-4 px-2 text-right">-</td>
                    <td className="py-4 px-2 text-right text-rose-500 text-sm">
                      {summary.totalCOGS.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-2 text-right text-stone-400">100%</td>
                    <td className="py-4 px-2 text-right text-amber-500 text-sm">
                      {summary.totalNetRevenue.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-2 text-right text-purple-500">
                      {summary.totalExpenses.toLocaleString('vi-VN')} đ
                    </td>
                    <td
                      className={`py-4 px-2 text-right text-base font-black ${
                        summary.totalNetProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {summary.totalNetProfit.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-2 text-right text-emerald-500">
                      {summary.overallMarginPercent}%
                    </td>
                    <td className="py-4 px-2 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRILL-DOWN MODAL: BÓC TÁCH DÒNG TIỀN SẢN PHẨM */}
      {/* ========================================================================= */}
      {selectedProductForDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl dark:bg-[#141820] bg-white rounded-3xl border border-amber-500/40 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProductForDetail(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer transition"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold border border-amber-500/30">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg dark:text-white text-stone-900 flex items-center gap-2">
                  <span>Bóc Tách Dòng Tiền Sản Phẩm:</span>
                  <span className="text-amber-500">{selectedProductForDetail.name}</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Giải trình chi tiết Doanh thu thuần (B), Giá vốn (C) & Chi phí Sổ quỹ (D) trong kỳ
                </p>
              </div>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 pt-4 shrink-0">
              <button
                onClick={() => setModalTab('sales')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'sales'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'dark:bg-neutral-900 bg-stone-100 dark:text-neutral-400 text-stone-600 hover:bg-stone-200 dark:hover:bg-neutral-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>TAB 1: BÁN HÀNG & TIÊU THỤ (GIẢI TRÌNH B & C)</span>
              </button>

              <button
                onClick={() => setModalTab('expenses')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'expenses'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'dark:bg-neutral-900 bg-stone-100 dark:text-neutral-400 text-stone-600 hover:bg-stone-200 dark:hover:bg-neutral-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>TAB 2: KHOẢN CHI SỔ QUỸ (GIẢI TRÌNH D)</span>
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="overflow-y-auto pt-4 space-y-6 scrollbar-thin grow">
              {/* TAB 1: BÁN HÀNG & TIÊU THỤ */}
              {modalTab === 'sales' && (
                <div className="space-y-6">
                  {/* Summary Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl dark:bg-neutral-900/80 bg-stone-50 border border-stone-200 dark:border-neutral-800 text-xs">
                    <div>
                      <span className="text-stone-400 block font-medium">SL Tiêu Thụ Bán Lẻ Direct</span>
                      <b className="text-base text-amber-500 font-extrabold">{selectedProductForDetail.directQty} phần</b>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Doanh thu niêm yết: {selectedProductForDetail.directRevenue.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">SL Tiêu Thụ Qua Combo</span>
                      <b className="text-base text-amber-500 font-extrabold">{selectedProductForDetail.comboQty} phần</b>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Bóc tách từ {selectedProductForDetail.comboBreakdown?.length || 0} gói combo
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-medium">Tổng Doanh Thu Thuần Phân Bổ (B)</span>
                      <b className="text-base text-emerald-400 font-extrabold">
                        {selectedProductForDetail.netRevenue.toLocaleString('vi-VN')} đ
                      </b>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Tỷ trọng giá vốn: {selectedProductForDetail.costSharePercent}%
                      </span>
                    </div>
                  </div>

                  {/* Combo Decomposition Table */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs dark:text-white text-stone-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>1. Bảng kê sản phẩm tiêu thụ qua gói Combo</span>
                    </h4>

                    {selectedProductForDetail.comboBreakdown && selectedProductForDetail.comboBreakdown.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-neutral-800">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-stone-100 dark:bg-neutral-900 text-stone-500 dark:text-neutral-400 font-bold uppercase text-[10px]">
                              <th className="py-2.5 px-3">TÊN COMBO MẸ</th>
                              <th className="py-2.5 px-3 text-center">SL COMBO BÁN</th>
                              <th className="py-2.5 px-3 text-center">ĐỊNH LƯỢNG MÓN CON</th>
                              <th className="py-2.5 px-3 text-right">SL MÓN CON QUY ĐỔI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 dark:divide-neutral-800 font-medium">
                            {selectedProductForDetail.comboBreakdown.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40">
                                <td className="py-2.5 px-3 font-bold dark:text-white text-stone-900">{c.comboName}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-amber-500">{c.comboSoldQty} gói</td>
                                <td className="py-2.5 px-3 text-center text-stone-400">{c.portionPerCombo} món / combo</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">
                                  {c.totalConvertedQty} {selectedProductForDetail.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic p-3 bg-stone-50 dark:bg-neutral-900/40 rounded-xl">
                        Không có tiêu thụ qua gói Combo trong kỳ này.
                      </p>
                    )}
                  </div>

                  {/* 10 Recent Orders Table */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs dark:text-white text-stone-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-amber-500" />
                      <span>2. Danh sách 10 đơn hàng phát sinh gần nhất</span>
                    </h4>

                    {selectedProductForDetail.recentOrders && selectedProductForDetail.recentOrders.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-neutral-800">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-stone-100 dark:bg-neutral-900 text-stone-500 dark:text-neutral-400 font-bold uppercase text-[10px]">
                              <th className="py-2.5 px-3">MÃ ĐƠN HÀNG</th>
                              <th className="py-2.5 px-3">KHÁCH HÀNG</th>
                              <th className="py-2.5 px-3">THỜI GIAN</th>
                              <th className="py-2.5 px-3">CƠ SỞ</th>
                              <th className="py-2.5 px-3 text-right">SL TIÊU THỤ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200 dark:divide-neutral-800 font-medium">
                            {selectedProductForDetail.recentOrders.map((o: any, idx: number) => (
                              <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40">
                                <td className="py-2.5 px-3 font-extrabold text-amber-500">{o.orderCode}</td>
                                <td className="py-2.5 px-3 font-semibold dark:text-white text-stone-900">{o.customerName}</td>
                                <td className="py-2.5 px-3 text-stone-400">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                                <td className="py-2.5 px-3 font-medium text-stone-500">{o.branchName}</td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-amber-400">
                                  {o.quantity} {selectedProductForDetail.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic p-3 bg-stone-50 dark:bg-neutral-900/40 rounded-xl">
                        Chưa có giao dịch đơn hàng.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: KHOẢN CHI SỔ QUỸ */}
              {modalTab === 'expenses' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs">
                    <div>
                      <span className="text-purple-300 font-bold block">
                        Nhóm Chi Phí: {selectedProductForDetail.categoryTag === 'CHICKEN' ? '🍗 Gà' : selectedProductForDetail.categoryTag === 'SPRING_ROLL' ? '🥖 Nem' : '📦 Khác'}
                      </span>
                      <p className="text-[11px] text-purple-400 mt-0.5">
                        Bao gồm: Chi phí đích danh ({(selectedProductForDetail.dedicatedExpense || 0).toLocaleString('vi-VN')} đ) + Chi phí chung phân bổ ({(selectedProductForDetail.generalExpense || 0).toLocaleString('vi-VN')} đ)
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-purple-300 font-medium block">Tổng khấu trừ vào món này (D):</span>
                      <b className="text-lg text-purple-400 font-black">
                        {selectedProductForDetail.expense.toLocaleString('vi-VN')} đ
                      </b>
                    </div>
                  </div>

                  {/* Expense Receipts List */}
                  {selectedProductForDetail.categoryExpenses && selectedProductForDetail.categoryExpenses.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-neutral-800">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-stone-100 dark:bg-neutral-900 text-stone-500 dark:text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">MÃ PHIẾU</th>
                            <th className="py-2.5 px-3">NGÀY GIỜ</th>
                            <th className="py-2.5 px-3 text-right">SỐ TIỀN CHI</th>
                            <th className="py-2.5 px-3">NỘI DUNG / LÝ DO CHI</th>
                            <th className="py-2.5 px-3">CƠ SỞ</th>
                            <th className="py-2.5 px-3">NGƯỜI CHI</th>
                            <th className="py-2.5 px-3 text-center">HÓA ĐƠN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-neutral-800 font-medium">
                          {selectedProductForDetail.categoryExpenses.map((e: any) => (
                            <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40">
                              <td className="py-2.5 px-3 font-extrabold text-amber-500">{e.expenseCode}</td>
                              <td className="py-2.5 px-3 text-stone-400">{new Date(e.date).toLocaleString('vi-VN')}</td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-rose-500">
                                {e.amount.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-2.5 px-3 font-semibold dark:text-white text-stone-900">{e.title}</td>
                              <td className="py-2.5 px-3 font-medium text-stone-500">{e.branchName}</td>
                              <td className="py-2.5 px-3 text-stone-400">{e.creatorName}</td>
                              <td className="py-2.5 px-3 text-center">
                                {e.receiptPhoto ? (
                                  <button
                                    onClick={() => setPreviewPhoto(e.receiptPhoto)}
                                    className="px-2 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold cursor-pointer hover:bg-amber-500 hover:text-neutral-950 transition"
                                  >
                                    🖼️ View Bill
                                  </button>
                                ) : (
                                  <span className="text-stone-500 text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic p-4 bg-stone-50 dark:bg-neutral-900/40 rounded-xl">
                      Chưa có phiếu chi phát sinh thuộc danh mục này trong kỳ.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t dark:border-neutral-800 border-stone-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedProductForDetail(null)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md transition"
              >
                Đóng Cửa Sổ Chi Tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-neutral-900 rounded-3xl p-4 border border-neutral-800 relative space-y-3">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <span>Ảnh Hóa Đơn / Chứng Từ Phiếu Chi</span>
            </h4>
            <div className="rounded-2xl overflow-hidden border border-neutral-800 max-h-[70vh] flex items-center justify-center bg-black">
              <img src={previewPhoto} alt="Receipt Photo" className="max-h-[65vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
