'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Play,
  DollarSign,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileText,
  Sparkles,
  UserCheck,
  ShieldAlert,
  UserPlus,
  X,
  RotateCcw,
} from 'lucide-react';

import { useBranches } from '@/hooks/useBranches';

export default function ActiveShiftPage() {
  const { branches } = useBranches();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Shift & Branch States
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [openShiftsByBranch, setOpenShiftsByBranch] = useState<Record<string, any>>({});

  useEffect(() => {
    if (branches.length > 0 && (!selectedBranchId || !branches.some((b) => b.id === selectedBranchId))) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Open Shift Form States
  const [selectedMainCashier, setSelectedMainCashier] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [shiftName, setShiftName] = useState('Ca Sáng');
  const [initialCash, setInitialCash] = useState<number>(1500000);
  const [openNote, setOpenNote] = useState('');

  // Collapsible Inventory Note State
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryNote, setInventoryNote] = useState('');

  // Close Shift Form States
  const [finalCashActual, setFinalCashActual] = useState<number>(0);
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  // Handover Receipt Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastClosedShiftData, setLastClosedShiftData] = useState<any>(null);

  const branchesList = branches.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    badge: b.code || `CƠ SỞ ${b.id.toUpperCase()}`,
  }));

  const fetchShiftData = useCallback(async () => {
    try {
      const [resShifts, resStaff, resUser] = await Promise.all([
        fetch(`/api/shifts?branchId=all&date=all&_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/staff?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch('/api/auth/me').catch(() => null),
      ]);

      const dataShifts = await resShifts.json();
      const dataStaff = await resStaff.json();
      if (resUser) {
        const dataUser = await resUser.json();
        if (dataUser.success) setCurrentUser(dataUser.user);
      }

      if (dataStaff.success && Array.isArray(dataStaff.staff) && dataStaff.staff.length > 0) {
        setStaffList(dataStaff.staff);
        if (!selectedMainCashier) setSelectedMainCashier(dataStaff.staff[0].name);
      }

      if (dataShifts.success && Array.isArray(dataShifts.shifts)) {
        const openMap: Record<string, any> = {};
        dataShifts.shifts.forEach((s: any) => {
          if (s.status === 'OPEN') {
            openMap[s.branchId] = s;
            if (s.branchId) {
              openMap[s.branchId.toLowerCase()] = s;
              openMap[s.branchId.toUpperCase()] = s;
            }
            const bObj = branches.find(
              (b) => b.id === s.branchId || (b.code && b.code.toLowerCase() === s.branchId?.toLowerCase())
            );
            if (bObj) {
              openMap[bObj.id] = s;
              openMap[bObj.id.toLowerCase()] = s;
              if (bObj.code) {
                openMap[bObj.code] = s;
                openMap[bObj.code.toLowerCase()] = s;
                openMap[bObj.code.toUpperCase()] = s;
              }
            }
          }
        });
        setOpenShiftsByBranch(openMap);

        const currentActive =
          openMap[selectedBranchId] ||
          (selectedBranchId ? openMap[selectedBranchId.toLowerCase()] : null) ||
          null;
        setActiveShift(currentActive);

        if (currentActive) {
          const expected =
            (currentActive.initialCash || 0) +
            (currentActive.cashSales || 0) -
            (currentActive.cashExpenses || 0);
          setFinalCashActual(currentActive.finalCashActual ?? expected);
        }
      }
    } catch (err) {
      console.error('Error fetching shift data:', err);
    } finally {
      setLoading(false);
    }
  }, [branches, selectedBranchId, selectedMainCashier]);

  useEffect(() => {
    fetchShiftData();
  }, [selectedBranchId, fetchShiftData]);

  // Keep active shift state in sync when selectedBranchId changes
  useEffect(() => {
    const currentActive =
      openShiftsByBranch[selectedBranchId] ||
      (selectedBranchId ? openShiftsByBranch[selectedBranchId.toLowerCase()] : null) ||
      null;
    setActiveShift(currentActive);
    if (currentActive) {
      const expected =
        (currentActive.initialCash || 0) +
        (currentActive.cashSales || 0) -
        (currentActive.cashExpenses || 0);
      setFinalCashActual(currentActive.finalCashActual ?? expected);
    }
  }, [selectedBranchId, openShiftsByBranch]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Toggle Team Member Checkbox
  const toggleTeamMember = (member: string) => {
    if (selectedTeamMembers.includes(member)) {
      setSelectedTeamMembers(selectedTeamMembers.filter((m) => m !== member));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, member]);
    }
  };

  // Calculate shift duration
  const getShiftDuration = (startTimeStr: string) => {
    if (!startTimeStr) return '0 giờ 0 phút';
    const start = new Date(startTimeStr).getTime();
    const now = Date.now();
    const diffMins = Math.max(0, Math.floor((now - start) / (1000 * 60)));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} giờ ${mins} phút`;
  };

  // Parse team members JSON or string
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

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentActive =
      openShiftsByBranch[selectedBranchId] ||
      (selectedBranchId ? openShiftsByBranch[selectedBranchId.toLowerCase()] : null);
    if (currentActive) {
      alert(`Cơ sở này đang có ca chưa chốt của ${currentActive.staffName}!`);
      return;
    }

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START',
          staffName: selectedMainCashier,
          teamMembers: selectedTeamMembers,
          shiftName,
          branchId: selectedBranchId,
          initialCash,
          inventoryNote,
          note: openNote,
        }),
      });

      const data = await res.json();
      if (data.success && data.shift) {
        const branchName =
          branchesList.find((b) => b.id === selectedBranchId)?.name || 'Cơ sở';
        alert(`Mở ${shiftName} tại ${branchName} thành công!`);

        const newShiftObj = {
          ...data.shift,
          branchName,
          cashSales: 0,
          bankSales: 0,
          cashExpenses: 0,
          finalCashExpected: Number(initialCash) || 0,
          finalCashActual: Number(initialCash) || 0,
          discrepancy: 0,
        };

        setOpenShiftsByBranch((prev) => ({
          ...prev,
          [selectedBranchId]: newShiftObj,
          [selectedBranchId.toLowerCase()]: newShiftObj,
        }));
        setActiveShift(newShiftObj);
        setFinalCashActual(Number(initialCash) || 0);

        // Clear notes
        setOpenNote('');
        setInventoryNote('');

        fetchShiftData();
      } else {
        alert(data.error || 'Lỗi mở ca');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    // Permission check: only main cashier or ADMIN role can close
    const isAdmin = currentUser?.role === 'ADMIN';
    const isMainCashier =
      currentUser?.fullName?.includes(activeShift.staffName) || currentUser?.username === 'admin';

    if (!isAdmin && !isMainCashier) {
      alert(`⛔ Chỉ Thu ngân chính [${activeShift.staffName}] hoặc Quản Trị Viên (Admin) mới có quyền chốt ca!`);
      return;
    }

    const expectedCash =
      (activeShift.initialCash || 0) + (activeShift.cashSales || 0) - (activeShift.cashExpenses || 0);
    const disc = finalCashActual - expectedCash;

    if (disc < 0 && !closeNote.trim()) {
      alert('⚠️ Tiền két bị THIẾU! Bắt buộc nhập lý do chênh lệch vào ô Ghi Chú trước khi chốt ca!');
      return;
    }

    setClosing(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          shiftId: activeShift.id,
          finalCashActual,
          inventoryNote,
          note: closeNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const closedShiftRecord = {
          ...activeShift,
          finalCashActual,
          finalCashExpected: expectedCash,
          discrepancy: disc,
          note: closeNote || activeShift.note,
          inventoryNote: inventoryNote || activeShift.inventoryNote,
          endTime: new Date().toISOString(),
        };

        setLastClosedShiftData(closedShiftRecord);
        setShowPrintModal(true);

        // Immediately remove active shift from local state
        setOpenShiftsByBranch((prev) => {
          const next = { ...prev };
          delete next[selectedBranchId];
          delete next[selectedBranchId.toLowerCase()];
          return next;
        });
        setActiveShift(null);
        setCloseNote('');

        fetchShiftData();
      } else {
        alert(data.error || 'Lỗi đóng ca');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setClosing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading && branches.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400 dark:text-neutral-400 font-semibold text-xs">
        Đang tải giao diện Quản Lý Ca POS...
      </div>
    );
  }

  const activeBranchShift =
    activeShift ||
    openShiftsByBranch[selectedBranchId] ||
    (selectedBranchId ? openShiftsByBranch[selectedBranchId.toLowerCase()] : null) ||
    null;
  const isCurrentBranchOpen = !!activeBranchShift;

  // Permission check for closing shift
  const canCloseShift =
    !currentUser ||
    currentUser?.role === 'ADMIN' ||
    (activeBranchShift &&
      (currentUser?.fullName?.includes(activeBranchShift.staffName) || currentUser?.username === 'admin'));

  // Calculated numbers for open shift
  const initialC = activeBranchShift?.initialCash || 0;
  const cashSales = activeBranchShift?.cashSales || 0;
  const cashExpenses = activeBranchShift?.cashExpenses || 0;
  const expectedCashInDrawer = initialC + cashSales - cashExpenses;
  const discrepancyVal = finalCashActual - expectedCashInDrawer;

  const currentTeamMembersList = activeBranchShift ? parseTeamMembers(activeBranchShift.teamMembers) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* Title & Branch Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAF9] tracking-tight">
              Đóng / Mở Ca Làm Việc POS
            </h1>
            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> F&B Team POS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Phân định rõ Thu Ngân Trưởng giữ két & Đội ngũ nhân sự cùng trực ca
          </p>
        </div>

        {/* Branch Selector */}
        <div className="relative">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="appearance-none bg-slate-50 dark:bg-[#0B0D11] text-xs font-bold text-slate-800 dark:text-neutral-200 pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-800 hover:border-amber-500/50 focus:border-amber-500 focus:outline-none transition-all cursor-pointer shadow-xs"
          >
            {branchesList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.badge} - {b.name}
              </option>
            ))}
          </select>
          <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.75]" />
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ACTIVE SHIFT VIEW VS OPEN SHIFT FORM */}
      {isCurrentBranchOpen && activeBranchShift ? (
        /* ================= 2. QUY TRÌNH CHỐT CA & HIỂN THỊ ĐỘI NGŨ CA ================= */
        <div className="bg-white dark:bg-[#14171D] rounded-2xl border border-emerald-500/40 p-6 sm:p-8 shadow-xl space-y-8 animate-fadeIn">
          <div className="space-y-4 pb-5 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-6 h-6 animate-pulse stroke-[1.75]" />
                </div>
                <div>
                  <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    ĐANG MỞ CA - CHỜ BÀN GIAO
                  </span>
                  <h2 className="font-extrabold text-lg text-slate-900 dark:text-[#FAFAF9] mt-1">
                    {activeBranchShift.shiftName} • Thu ngân chính:{' '}
                    <span className="text-amber-500">{activeBranchShift.staffName}</span>
                  </h2>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium bg-slate-50 dark:bg-[#0B0D11] p-3 rounded-xl border border-slate-200 dark:border-neutral-800">
                <div>
                  Mở ca:{' '}
                  {new Date(activeBranchShift.startTime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Thời gian đã trực: {getShiftDuration(activeBranchShift.startTime)}
                </div>
              </div>
            </div>

            {/* ĐỘI NGŨ TRỰC CA BADGES */}
            <div className="bg-slate-50 dark:bg-[#0B0D11] p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 mr-1">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Đội ngũ trực ca ({currentTeamMembersList.length + 1} người):</span>
              </span>

              {/* Main Cashier Badge */}
              <span className="bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>{activeBranchShift.staffName} (Giữ két)</span>
              </span>

              {/* Team Members Badges */}
              {currentTeamMembersList.map((m, idx) => (
                <span
                  key={idx}
                  className="bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 font-medium px-2.5 py-1 rounded-lg"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Realtime Shift Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-[#0B0D11] p-4 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                TIỀN MẶT ĐẦU CA
              </span>
              <span className="text-xl font-extrabold text-amber-500 dark:text-amber-400 block">
                {formatCurrency(initialC)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0D11] p-4 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                DOANH THU TIỀN MẶT (A)
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 block">
                +{formatCurrency(cashSales)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0D11] p-4 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase">
                TỔNG CHI TIỀN MẶT (C)
              </span>
              <span className="text-xl font-extrabold text-rose-500 dark:text-rose-400 block">
                -{formatCurrency(cashExpenses)}
              </span>
            </div>

            <div className="bg-amber-500/10 dark:bg-amber-500/15 p-4 rounded-xl border border-amber-500/30 space-y-1">
              <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 uppercase">
                LÝ THUYẾT TRONG KÉT
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
                {formatCurrency(expectedCashInDrawer)}
              </span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block">
                (Đầu ca + A - C)
              </span>
            </div>
          </div>

          {/* PERMISSION BANNER IF NOT MAIN CASHIER OR ADMIN */}
          {!canCloseShift && (
            <div className="bg-amber-500/15 border border-amber-500/40 p-4 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <span>
                ℹ️ Bạn đang xem ca làm việc của Thu ngân chính{' '}
                <strong className="underline">{activeBranchShift.staffName}</strong>. Chỉ Thu ngân chính
                giữ két hoặc Admin mới có quyền chốt ca.
              </span>
            </div>
          )}

          {/* Form Chốt Ca & Đếm Tiền Thực Tế */}
          <form
            onSubmit={handleCloseShift}
            className="bg-slate-50 dark:bg-[#0B0D11] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
              <DollarSign className="w-5 h-5 text-amber-500 dark:text-amber-400 stroke-[2]" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#FAFAF9] uppercase tracking-wider">
                Chốt & Kiểm Đếm Tiền Mặt Thực Tế Cuối Ca
              </h3>
            </div>

            {/* Input Tiền Thực Đếm */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800 dark:text-neutral-200">
                Nhập Số Tiền Mặt Thực Tế Kiểm Đếm Trong Két (VNĐ) (*):
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={!canCloseShift}
                  value={finalCashActual}
                  onChange={(e) => setFinalCashActual(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-[#14171D] border-2 border-amber-500/40 rounded-xl text-lg font-extrabold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none transition-all shadow-xs disabled:opacity-60"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">
                  {formatCurrency(finalCashActual)}
                </span>
              </div>
            </div>

            {/* Discrepancy Status Indicator */}
            {discrepancyVal < 0 ? (
              <div className="bg-rose-500/15 border border-rose-500/40 p-4 rounded-xl text-xs space-y-1 text-rose-700 dark:text-rose-300">
                <div className="font-extrabold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>CẢNH BÁO THIẾU TIỀN: Lệch {formatCurrency(Math.abs(discrepancyVal))}</span>
                </div>
                <p>Bắt buộc nhập lý do chênh lệch tiền mặt vào ô Ghi Chú bên dưới trước khi chốt ca!</p>
              </div>
            ) : discrepancyVal === 0 ? (
              <div className="bg-emerald-500/15 border border-emerald-500/40 p-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>✅ KHỚP TIỀN TUYỆT ĐỐI: Tiền thực đếm bằng đúng tiền lý thuyết (0đ)!</span>
              </div>
            ) : (
              <div className="bg-blue-500/15 border border-blue-500/40 p-4 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>ℹ️ DƯ TIỀN KÉT: Thừa +{formatCurrency(discrepancyVal)} so với lý thuyết!</span>
              </div>
            )}

            {/* Note input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Ghi Chú Đóng Ca / Lý Do Chênh Lệch:
              </label>
              <input
                type="text"
                disabled={!canCloseShift}
                placeholder="Ví dụ: Đã thối tiền lẻ nhiều, tiền boa..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:border-amber-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={closing || !canCloseShift}
              className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5 stroke-[2]" />
              <span>{closing ? 'Đang chốt ca...' : '🔴 KẾT THÚC & ĐÓNG CA (CHỐT KÉT)'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* ================= 1. FORM MỞ CA VỚI NHÂN SỰ CÙNG CA ================= */
        <div className="bg-white dark:bg-[#14171D] rounded-2xl border border-slate-200 dark:border-neutral-800/80 p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Play className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-[#FAFAF9]">Mở Ca Làm Việc Mới</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Phân định Thu Ngân Trưởng chịu trách nhiệm két & Đội ngũ nhân sự cùng trực tại cơ sở{' '}
                {branchesList.find((b) => b.id === selectedBranchId)?.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleStartShift} className="space-y-6 text-xs">
            {/* TRƯỜNG 1: Thu Ngân Trưởng / Người Giữ Két */}
            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>Thu Ngân Trưởng / Người Giữ Két (*) (1 người duy nhất):</span>
              </label>
              <select
                value={selectedMainCashier}
                onChange={(e) => setSelectedMainCashier(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-800 dark:text-neutral-200 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.role}) - Chịu trách nhiệm két
                  </option>
                ))}
              </select>
            </div>

            {/* TRƯỜNG 2: Nhân Sự Cùng Ca (Phụ ca / Bếp / Đóng gói) */}
            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>Nhân Sự Cùng Ca (Phụ ca / Bếp / Giao nhận / Đóng gói):</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-[#0B0D11] p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800">
                {staffList
                  .filter((s) => s.name !== selectedMainCashier)
                  .map((staff) => {
                    const isChecked = selectedTeamMembers.includes(`${staff.name} (${staff.role})`);
                    return (
                      <label
                        key={staff.id}
                        className={`p-2.5 rounded-lg border font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#14171D] border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-amber-500/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTeamMember(`${staff.name} (${staff.role})`)}
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                        <span className="line-clamp-1">
                          {staff.name} ({staff.role})
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Tên Ca Radio Buttons */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800 dark:text-neutral-200">
                Tên Ca Làm Việc (*):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Ca Sáng', 'Ca Tối', 'Ca Cả Ngày'].map((nameOption) => (
                  <label
                    key={nameOption}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center cursor-pointer transition-all ${
                      shiftName === nameOption
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0B0D11] border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-amber-500/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shiftNameRadio"
                      checked={shiftName === nameOption}
                      onChange={() => setShiftName(nameOption)}
                      className="hidden"
                    />
                    <span>{nameOption}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Số Tiền Mặt Đầu Ca (VNĐ) */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800 dark:text-neutral-200">
                Số Tiền Mặt Đưa Trước Đầu Ca (VNĐ) (*):
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  value={initialCash}
                  onChange={(e) => setInitialCash(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-extrabold text-sm text-amber-600 dark:text-amber-400 focus:border-amber-500 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-amber-500">
                  {formatCurrency(initialCash)}
                </span>
              </div>

              {/* Quick Money Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[500000, 1000000, 1500000, 2000000].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => setInitialCash(presetVal)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0B0D11] hover:bg-amber-500/20 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-800 font-bold text-[11px] transition cursor-pointer"
                  >
                    {formatCurrency(presetVal)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInitialCash(1500000)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[11px] hover:bg-amber-500/20 transition cursor-pointer"
                >
                  Lấy tiền dư ca trước
                </button>
              </div>
            </div>

            {/* KHỐI BÀN GIAO TỒN KHO ĐẦU CA */}
            <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowInventory(!showInventory)}
                className="w-full p-3.5 bg-slate-50 dark:bg-[#0B0D11] hover:bg-slate-100 dark:hover:bg-neutral-800/60 flex items-center justify-between font-bold text-xs text-slate-800 dark:text-neutral-200 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-500" />
                  <span>📦 Kiểm đếm & Ghi chú tồn kho bàn giao ca (Tùy chọn):</span>
                </div>
                {showInventory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showInventory && (
                <div className="p-4 bg-white dark:bg-[#14171D] border-t border-slate-200 dark:border-neutral-800 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                    Kiểm đếm & Ghi chú tồn kho bàn giao:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nhập ghi chú tồn kho bàn giao (Ví dụ: Gà nguyên con 10, Gà nửa con 15, Chân gà 20kg...)"
                    value={inventoryNote}
                    onChange={(e) => setInventoryNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Ghi chú mở ca */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-neutral-300">
                Ghi Chú Mở Ca:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đã kiểm tra két tiền và phân công xong..."
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              🚀 XÁC NHẬN MỞ CA LÀM VIỆC POS
            </button>
          </form>
        </div>
      )}

      {/* ================= PRINT / HANDOVER RECEIPT MODAL WITH TEAM MEMBERS ================= */}
      {showPrintModal && lastClosedShiftData && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ticket Printable Body */}
            <div id="handover-ticket" className="space-y-4 text-xs font-sans text-slate-900 dark:text-neutral-100">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-neutral-700 space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight">GÀ Ủ MUỐI SMART</h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-neutral-400">
                  PHIẾU BÀN GIAO CA LÀM VIỆC (POS K80)
                </p>
                <p className="text-[10px] text-slate-400">
                  Thời gian in: {new Date().toLocaleString('vi-VN')}
                </p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Ca làm việc:</span>
                  <span className="font-bold">{lastClosedShiftData.shiftName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Người giữ két (Thu ngân chính):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {lastClosedShiftData.staffName}
                  </span>
                </div>
                {parseTeamMembers(lastClosedShiftData.teamMembers).length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-neutral-400">Nhân sự cùng ca:</span>
                    <span className="font-medium text-right max-w-[200px]">
                      {parseTeamMembers(lastClosedShiftData.teamMembers).join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Cơ sở:</span>
                  <span className="font-bold">
                    {branchesList.find((b) => b.id === lastClosedShiftData.branchId)?.name ||
                      lastClosedShiftData.branchName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Mở ca:</span>
                  <span>{new Date(lastClosedShiftData.startTime).toLocaleTimeString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-neutral-400">Đóng ca:</span>
                  <span>{new Date(lastClosedShiftData.endTime).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>

              <div className="py-2 border-t border-b border-dashed border-slate-300 dark:border-neutral-700 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Tiền mặt đầu ca:</span>
                  <span className="font-bold">{formatCurrency(lastClosedShiftData.initialCash)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>(+) Doanh thu tiền mặt:</span>
                  <span>+{formatCurrency(lastClosedShiftData.cashSales)}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>(-) Chi quỹ tiền mặt:</span>
                  <span>-{formatCurrency(lastClosedShiftData.cashExpenses)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-neutral-800">
                  <span>Lý thuyết két phải có:</span>
                  <span>{formatCurrency(lastClosedShiftData.finalCashExpected)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 dark:text-white">
                  <span>Thực tế kiểm đếm:</span>
                  <span>{formatCurrency(lastClosedShiftData.finalCashActual)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1">
                  <span>Trạng thái chênh lệch:</span>
                  <span
                    className={
                      lastClosedShiftData.discrepancy === 0
                        ? 'text-emerald-500'
                        : lastClosedShiftData.discrepancy > 0
                        ? 'text-blue-500'
                        : 'text-rose-500'
                    }
                  >
                    {lastClosedShiftData.discrepancy === 0
                      ? 'Khớp chuẩn (0đ)'
                      : `${lastClosedShiftData.discrepancy > 0 ? 'Dư +' : 'Thiếu '}${formatCurrency(
                          lastClosedShiftData.discrepancy
                        )}`}
                  </span>
                </div>
                {lastClosedShiftData.inventoryNote && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold italic">
                    📦 Tồn kho bàn giao: {lastClosedShiftData.inventoryNote}
                  </div>
                )}
                {lastClosedShiftData.note && (
                  <div className="text-[10px] text-slate-500 dark:text-neutral-400 italic">
                    Ghi chú: {lastClosedShiftData.note}
                  </div>
                )}
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 text-center text-[10px] pt-4 gap-4">
                <div>
                  <span className="font-bold block">Thu Ngân Trưởng (Giữ két)</span>
                  <span className="text-slate-400 block mt-6">(Ký & Họ tên)</span>
                </div>
                <div>
                  <span className="font-bold block">Người Nhận Ca / Quản Lý</span>
                  <span className="text-slate-400 block mt-6">(Ký & Họ tên)</span>
                </div>
              </div>
            </div>

            {/* Print action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>IN PHIẾU BÀN GIAO (K80)</span>
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
