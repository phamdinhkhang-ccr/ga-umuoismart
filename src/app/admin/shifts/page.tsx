'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

import { useBranches } from '@/hooks/useBranches';

export default function ShiftsManagementPage() {
  const { branches } = useBranches();
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [branchId, setBranchId] = useState<string>('all');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchShiftsData = () => {
    setLoading(true);
    fetch(`/api/shifts?date=${date}&branchId=${branchId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShiftsData();
  }, [date, branchId]);

  const handleResetFilter = () => {
    setDate(todayStr);
    setBranchId('all');
  };

  const metrics = data?.metrics || {
    totalDayRevenue: 0,
    cashRevenue: 0,
    bankRevenue: 0,
    unpaidRevenue: 0,
    cashExpense: 0,
    bankExpense: 0,
  };

  const closedShifts = (data?.shifts || []).filter((s: any) => s.status === 'CLOSED');

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
            onClick={() => setDate(date === 'all' ? todayStr : 'all')}
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
              <option value="all">🏢 Tất cả cơ sở</option>
              {(data?.branchList || branches).map((b: any) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.badge || b.id})
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
          </div>

          {/* Filter Button */}
          <button
            onClick={fetchShiftsData}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
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
            <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base sm:text-lg tracking-tight flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-amber-500 dark:text-amber-400 stroke-[1.75]" />
              <span>Danh sách ca đã đóng (Đối soát chốt két)</span>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {closedShifts.length} Ca làm việc
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Tiền cuối ca lý thuyết = Tiền đầu ca + Tiền mặt đơn - Chi tiền mặt
            </p>
          </div>

          <a
            href="/admin/shifts/active"
            className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>Xem Ca Đang Mở ↗</span>
          </a>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-slate-400 dark:text-neutral-500 text-xs font-semibold">
              Đang tải danh sách ca làm việc...
            </div>
          ) : closedShifts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                Chưa có ca làm việc nào được chốt trong ngày đang chọn
              </p>
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
                  <th className="py-3 px-3">MỞ CA - ĐÓNG CA</th>
                  <th className="py-3 px-3">GHI CHÚ TỒN KHO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {closedShifts.map((shift: any) => {
                  const expectedEndCash = shift.finalCashExpected || (shift.initialCash + shift.cashSales - shift.cashExpenses);
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
                        {shift.initialCash.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 5. TIỀN MẶT ĐƠN */}
                      <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        {shift.cashSales.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 6. CK ĐƠN */}
                      <td className="py-3.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {shift.bankSales.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 7. CHƯA THANH TOÁN */}
                      <td className="py-3.5 px-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                        {shift.unpaidSales.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 8. CHI TIỀN MẶT */}
                      <td className="py-3.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {shift.cashExpenses.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 9. CHI CK */}
                      <td className="py-3.5 px-3 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                        {shift.bankExpenses.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 10. TIỀN CUỐI CA LÝ THUYẾT */}
                      <td className="py-3.5 px-3 text-right font-black dark:text-emerald-400 text-emerald-600 text-sm">
                        {expectedEndCash.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 11. MỞ CA - ĐÓNG CA */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-500 dark:text-neutral-400">
                        <div>
                          {new Date(shift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {shift.endTime
                            ? new Date(shift.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </div>
                      </td>

                      {/* 12. GHI CHÚ TỒN KHO */}
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
    </div>
  );
}
