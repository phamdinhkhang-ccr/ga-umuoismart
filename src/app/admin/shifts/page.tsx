'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  History,
  Calendar,
  Building2,
  Filter,
  RotateCcw,
  ReceiptText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Users,
  ExternalLink,
  X,
  Play,
} from 'lucide-react';

import { useBranches } from '@/hooks/useBranches';

export default function ShiftsManagementPage() {
  const { branches } = useBranches();

  // Compute today's date string in local browser time (YYYY-MM-DD)
  const getLocalTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState<string>(getLocalTodayString());
  const [branchId, setBranchId] = useState<string>('ALL');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showActiveModal, setShowActiveModal] = useState(false);

  const fetchShiftsData = useCallback(() => {
    setLoading(true);
    fetch(`/api/shifts?date=${date}&branchId=${branchId}&_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, branchId]);

  useEffect(() => {
    fetchShiftsData();
  }, [fetchShiftsData]);

  const handleResetFilter = () => {
    setDate(getLocalTodayString());
    setBranchId('ALL');
  };

  const metrics = data?.metrics || {
    totalDayRevenue: 0,
    cashRevenue: 0,
    bankRevenue: 0,
    unpaidRevenue: 0,
    cashExpense: 0,
    bankExpense: 0,
  };

  const allShifts = data?.shifts || [];
  const closedShifts = allShifts.filter((s: any) => s.status === 'CLOSED');
  const openShifts = allShifts.filter((s: any) => s.status === 'OPEN');

  const parseTeamMembers = (teamRaw: any): string[] => {
    if (!teamRaw) return [];
    if (Array.isArray(teamRaw)) return teamRaw;
    try {
      const parsed = JSON.parse(teamRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return typeof teamRaw === 'string' ? teamRaw.split(',').map((s) => s.trim()) : [];
    }
  };

  return (
    <div className="space-y-8 font-sans pb-12 transition-colors duration-300">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white dark:bg-[#14171D] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
            <History className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAF9] tracking-tight">
                Quản lý các ca làm việc
              </h1>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Đối soát ca F&B Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-normal">
              Bóc tách dòng tiền mặt & chuyển khoản đơn hàng, chi từ két & ngân hàng theo từng ca làm việc.
            </p>
          </div>
        </div>

        {/* Filter Controls Right */}
        <div className="flex flex-wrap items-center gap-3">
          {/* All Dates Toggle */}
          <button
            onClick={() => setDate(date === 'all' ? getLocalTodayString() : 'all')}
            className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
              date === 'all'
                ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow'
                : 'bg-slate-50 dark:bg-[#0B0D11] text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-800 hover:border-amber-500/50'
            }`}
            title="Xem tất cả ca làm việc trong lịch sử"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{date === 'all' ? '🗓️ Tất cả ngày' : 'Xem theo ngày'}</span>
          </button>

          {/* Date Picker */}
          {date !== 'all' && (
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-800 hover:border-amber-500/50 focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
            </div>
          )}

          {/* Branch Dropdown */}
          <div className="relative">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-800 hover:border-amber-500/50 focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="ALL">🏢 Tất Cả Cơ Sở (Toàn Hệ Thống)</option>
              {(branches || []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  📍 {branch.name} {branch.code ? `(${branch.code})` : ''}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchShiftsData}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetFilter}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0D11] hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-slate-300 dark:border-neutral-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Dàn 6 Thẻ Thống Kê Dòng Tiền (Financial Metric Cards - 6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        {/* Card 1 - Total Revenue */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-orange-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng doanh thu ngày / kỳ
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-orange-500 dark:text-orange-400 tracking-tight block">
              {(metrics.totalDayRevenue || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Tổng tiền đơn hàng hợp lệ trong kỳ
            </span>
          </div>
        </div>

        {/* Card 2 - Cash Revenue */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-amber-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng tiền mặt đơn
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight block">
              {(metrics.cashRevenue || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Gồm đơn tiền mặt & phần tiền mặt đơn hỗn hợp
            </span>
          </div>
        </div>

        {/* Card 3 - Bank Transfer Revenue */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-blue-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng chuyển khoản đơn
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-blue-500 dark:text-blue-400 tracking-tight block">
              {(metrics.bankRevenue || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Gồm đơn CK & phần CK đơn hỗn hợp
            </span>
          </div>
        </div>

        {/* Card 4 - Unpaid Revenue */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-purple-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng chưa thanh toán / chờ CK
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-purple-500 dark:text-purple-400 tracking-tight block">
              {(metrics.unpaidRevenue || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Các đơn chưa nhận đủ tiền về (paymentStatus != PAID)
            </span>
          </div>
        </div>

        {/* Card 5 - Cash Expenses */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-rose-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng chi tiền mặt
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-rose-500 dark:text-rose-400 tracking-tight block">
              {(metrics.cashExpense || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Phiếu chi xuất két tiền mặt trong kỳ
            </span>
          </div>
        </div>

        {/* Card 6 - Bank Expenses */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 border-l-4 border-l-cyan-500 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tổng chi chuyển khoản
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-cyan-500 dark:text-cyan-400 tracking-tight block">
              {(metrics.bankExpense || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal mt-1 block">
              Phiếu chi ngân hàng trong kỳ
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bảng Chi Tiết "Danh Sách Ca Đã Đóng" (Shifts Table) */}
      <div className="bg-white dark:bg-[#14171D] rounded-2xl border border-slate-200 dark:border-neutral-800/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-neutral-800/80">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base sm:text-lg tracking-tight flex items-center gap-2 flex-wrap">
              <ReceiptText className="w-5 h-5 text-amber-500 dark:text-amber-400 stroke-[1.75]" />
              <span>Danh sách ca đã đóng (Đối soát chốt két)</span>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {closedShifts.length} Ca làm việc
              </span>
              {openShifts.length > 0 && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {openShifts.length} Ca đang mở
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Tiền cuối ca lý thuyết = Tiền đầu ca + Tiền mặt đơn - Chi tiền mặt
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Realtime Modal Button */}
            <button
              onClick={() => setShowActiveModal(true)}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Xem Ca Đang Mở ({openShifts.length}) ↗</span>
            </button>

            {/* Direct Link to Open/Close POS */}
            <a
              href="/admin/shifts/active"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 stroke-[2]" />
              <span>Đóng / Mở Ca POS</span>
            </a>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-slate-400 dark:text-neutral-500 text-xs font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              <span>Đang tải danh sách ca làm việc...</span>
            </div>
          ) : closedShifts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                Chưa có ca làm việc nào được chốt trong ngày đang chọn ({date})
              </p>
              {openShifts.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Hiện đang có {openShifts.length} ca đang hoạt động (Chưa đóng ca). Bấm nút &quot;Xem Ca Đang Mở&quot; để xem chi tiết.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3">CA</th>
                  <th className="py-3 px-3">NHÂN VIÊN</th>
                  <th className="py-3 px-3">CỬA HÀNG</th>
                  <th className="py-3 px-3 text-right">TIỀN ĐẦU CA</th>
                  <th className="py-3 px-3 text-right">TIỀN MẶT ĐƠN</th>
                  <th className="py-3 px-3 text-right">CK ĐƠN</th>
                  <th className="py-3 px-3 text-right">CHƯA THANH TOÁN</th>
                  <th className="py-3 px-3 text-right">CHI TIỀN MẶT</th>
                  <th className="py-3 px-3 text-right">CHI CK</th>
                  <th className="py-3 px-3 text-right">TIỀN CUỐI CA LÝ THUYẾT</th>
                  <th className="py-3 px-3 text-right">THỰC TẾ KIỂM ĐẾM</th>
                  <th className="py-3 px-3 text-center">CHÊNH LỆCH</th>
                  <th className="py-3 px-3">MỞ CA - ĐÓNG CA</th>
                  <th className="py-3 px-3">GHI CHÚ TỒN KHO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {closedShifts.map((shift: any) => {
                  const expectedEndCash =
                    shift.finalCashExpected ||
                    (shift.initialCash || 0) + (shift.cashSales || 0) - (shift.cashExpenses || 0);
                  const disc = shift.discrepancy || 0;

                  return (
                    <tr
                      key={shift.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60 transition-colors whitespace-nowrap"
                    >
                      {/* 1. CA */}
                      <td className="py-3.5 px-3 font-extrabold text-amber-600 dark:text-amber-400">
                        {shift.shiftName}
                      </td>

                      {/* 2. NHÂN VIÊN */}
                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                        {shift.staffName}
                      </td>

                      {/* 3. CỬA HÀNG */}
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-neutral-700">
                          {shift.branchName}
                        </span>
                      </td>

                      {/* 4. TIỀN ĐẦU CA */}
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-neutral-300">
                        {(shift.initialCash || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 5. TIỀN MẶT ĐƠN */}
                      <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        {(shift.cashSales || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 6. CK ĐƠN */}
                      <td className="py-3.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {(shift.bankSales || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 7. CHƯA THANH TOÁN */}
                      <td className="py-3.5 px-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                        {(shift.unpaidSales || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 8. CHI TIỀN MẶT */}
                      <td className="py-3.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {(shift.cashExpenses || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 9. CHI CK */}
                      <td className="py-3.5 px-3 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                        {(shift.bankExpenses || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 10. TIỀN CUỐI CA LÝ THUYẾT */}
                      <td className="py-3.5 px-3 text-right font-black dark:text-emerald-400 text-emerald-600 text-sm">
                        {expectedEndCash.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 11. THỰC TẾ KIỂM ĐẾM */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                        {(shift.finalCashActual || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* 12. CHÊNH LỆCH */}
                      <td className="py-3.5 px-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            disc === 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : disc > 0
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {disc === 0
                            ? 'Khớp (0đ)'
                            : `${disc > 0 ? '+' : ''}${disc.toLocaleString('vi-VN')} đ`}
                        </span>
                      </td>

                      {/* 13. MỞ CA - ĐÓNG CA */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-500 dark:text-neutral-400">
                        <div>
                          {new Date(shift.startTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {shift.endTime
                            ? new Date(shift.endTime).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </div>
                      </td>

                      {/* 14. GHI CHÚ TỒN KHO */}
                      <td className="py-3.5 px-3 text-slate-500 max-w-[200px] truncate" title={shift.inventoryNote}>
                        {shift.inventoryNote || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. MODAL: XEM CÁC CA ĐANG HOẠT ĐỘNG REAL-TIME */}
      {showActiveModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Giám Sát Các Ca Đang Mở Real-time
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Theo dõi trực tiếp doanh thu và két tiền tạm tính tại các cơ sở
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActiveModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {openShifts.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                  Hiện tại không có ca nào đang mở tại các cơ sở.
                </p>
                <a
                  href="/admin/shifts/active"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow hover:bg-amber-400 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Mở Ca Làm Việc Mới</span>
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {openShifts.map((shift: any) => {
                  const currentTeam = parseTeamMembers(shift.teamMembers);
                  const expectedCash =
                    (shift.initialCash || 0) + (shift.cashSales || 0) - (shift.cashExpenses || 0);

                  return (
                    <div
                      key={shift.id}
                      className="bg-slate-50 dark:bg-[#0B0D11] border border-emerald-500/30 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              ĐANG HOẠT ĐỘNG
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {shift.branchName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-neutral-300 font-semibold mt-1">
                            {shift.shiftName} • Thu ngân chính: <span className="text-amber-500 font-bold">{shift.staffName}</span>
                          </div>
                        </div>

                        <div className="text-xs text-right text-slate-500 dark:text-neutral-400">
                          <div>Mở ca: {new Date(shift.startTime).toLocaleTimeString('vi-VN')}</div>
                        </div>
                      </div>

                      {/* Financial Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white dark:bg-[#14171D] p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-bold uppercase block">
                            Tiền Đầu Ca
                          </span>
                          <span className="font-extrabold text-amber-500">
                            {(shift.initialCash || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="bg-white dark:bg-[#14171D] p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-bold uppercase block">
                            Tiền Mặt Đơn
                          </span>
                          <span className="font-extrabold text-emerald-500">
                            +{(shift.cashSales || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="bg-white dark:bg-[#14171D] p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-bold uppercase block">
                            Chi Tiền Mặt
                          </span>
                          <span className="font-extrabold text-rose-500">
                            -{(shift.cashExpenses || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-extrabold uppercase block">
                            Lý Thuyết Trong Két
                          </span>
                          <span className="font-black text-amber-600 dark:text-amber-400">
                            {expectedCash.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {currentTeam.length > 0 && (
                        <div className="text-[11px] text-slate-600 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap">
                          <Users className="w-3.5 h-3.5 text-amber-500" />
                          <span>Cùng trực: {currentTeam.join(', ')}</span>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <a
                          href="/admin/shifts/active"
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          <span>Chuyển Đến Chốt Ca Này</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
