'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Plus,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Camera,
  Search,
  Filter,
  Pencil,
  Trash2,
  X,
  User as UserIcon,
  Building2,
  ShieldAlert,
  Info,
  ChevronDown,
  DollarSign,
  Zap,
  Check,
  Sparkles,
  RefreshCw,
  Printer,
  Calendar,
  Layers,
  Settings,
  Users,
  Eye,
  Award,
  Sliders,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendanceAndPayrollManagementPage() {
  const { branches } = useBranches();
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // Active Main Tab: 'PAYROLL' | 'SALARY_SETTINGS' | 'SHIFT_CONFIG' | 'LOGS'
  const [activeTab, setActiveTab] = useState<'PAYROLL' | 'SALARY_SETTINGS' | 'SHIFT_CONFIG' | 'LOGS'>('PAYROLL');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // TAB 1: PAYROLL REPORT STATES
  // ---------------------------------------------------------------------------
  const todayMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [payrollMonth, setPayrollMonth] = useState(todayMonth);
  const [payrollBranch, setPayrollBranch] = useState('all');
  const [payrollStaff, setPayrollStaff] = useState('all');
  const [payrollData, setPayrollData] = useState<any>(null);
  const [selectedStaffForDrilldown, setSelectedStaffForDrilldown] = useState<any | null>(null);

  // ---------------------------------------------------------------------------
  // TAB 2: STAFF SALARY SETTINGS STATES
  // ---------------------------------------------------------------------------
  const [staffSalaryList, setStaffSalaryList] = useState<any[]>([]);
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryBranchFilter, setSalaryBranchFilter] = useState('all');
  const [editingSalaryStaff, setEditingSalaryStaff] = useState<any | null>(null);
  const [formSalaryType, setFormSalaryType] = useState<'HOURLY' | 'PER_SHIFT' | 'MONTHLY'>('HOURLY');
  const [formBaseRateStr, setFormBaseRateStr] = useState('25000');
  const [formAllowanceStr, setFormAllowanceStr] = useState('0');
  const [formSalaryNotes, setFormSalaryNotes] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 3: BRANCH SHIFT PRESETS STATES
  // ---------------------------------------------------------------------------
  const [shiftBranch, setShiftBranch] = useState('cs1');
  const [branchShiftConfigs, setBranchShiftConfigs] = useState<any[]>([]);
  const [editingShiftConfig, setEditingShiftConfig] = useState<any | null>(null);
  const [formShiftName, setFormShiftName] = useState('');
  const [formStartTime, setFormStartTime] = useState('06:00');
  const [formEndTime, setFormEndTime] = useState('11:30');
  const [savingShiftConfig, setSavingShiftConfig] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 4: TIMESHEET LOGS & MANUAL CHECK-IN STATES
  // ---------------------------------------------------------------------------
  const [logsDate, setLogsDate] = useState(new Date().toISOString().split('T')[0]);
  const [logsBranch, setLogsBranch] = useState('all');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingLogRecord, setEditingLogRecord] = useState<any | null>(null);
  const [formManualStaffId, setFormManualStaffId] = useState('');
  const [formManualBranchId, setFormManualBranchId] = useState('cs1');
  const [formManualDate, setFormManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [formManualShiftType, setFormManualShiftType] = useState('SANG');
  const [formManualCheckIn, setFormManualCheckIn] = useState('06:00');
  const [formManualCheckOut, setFormManualCheckOut] = useState('11:30');
  const [formManualHours, setFormManualHours] = useState('5.5');
  const [formManualAllowance, setFormManualAllowance] = useState('0');
  const [formManualNotes, setFormManualNotes] = useState('');
  const [savingManualLog, setSavingManualLog] = useState(false);

  // Available Branches list
  const availableBranches = useMemo(() => {
    return branches.length > 0
      ? branches.map((b) => ({ id: b.id, name: b.name, code: b.code || b.id.toUpperCase() }))
      : [
          { id: 'cs1', name: 'Cơ Sở Cầu Giấy', code: 'CS01' },
          { id: 'cs2', name: 'Cơ Sở Đống Đa', code: 'CS02' },
          { id: 'cs3', name: 'Cơ Sở Hai Bà Trưng', code: 'CS03' },
          { id: 'cs4', name: 'Cơ Sở Thanh Xuân', code: 'CS04' },
          { id: 'cs5', name: 'Cơ Sở Tây Hồ', code: 'CS05' },
          { id: 'cs6', name: 'Cơ Sở Nam Từ Liêm', code: 'CS06' },
        ];
  }, [branches]);

  // ---------------------------------------------------------------------------
  // FETCHERS
  // ---------------------------------------------------------------------------
  const fetchPayrollReport = async () => {
    try {
      const params = new URLSearchParams();
      if (payrollMonth) params.append('month', payrollMonth);
      if (payrollBranch !== 'all') params.append('branchId', payrollBranch);
      if (payrollStaff !== 'all') params.append('userId', payrollStaff);

      const res = await fetch(`/api/payroll/report?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setPayrollData(data);
      }
    } catch (e) {
      console.error('Error fetching payroll:', e);
    }
  };

  const fetchStaffSalaryList = async () => {
    try {
      const res = await fetch('/api/staff/salary-config', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStaffSalaryList(data.staff || []);
      }
    } catch (e) {
      console.error('Error fetching staff salary list:', e);
    }
  };

  const fetchShiftConfigs = async () => {
    try {
      const res = await fetch(`/api/shifts/configs?branchId=${shiftBranch}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setBranchShiftConfigs(data.configs || []);
      }
    } catch (e) {
      console.error('Error fetching shift configs:', e);
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logsDate) {
        params.append('fromDate', logsDate);
        params.append('toDate', logsDate);
      }
      if (logsBranch !== 'all') params.append('branchId', logsBranch);

      const res = await fetch(`/api/attendance/records?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords(data.records || []);
      }
    } catch (e) {
      console.error('Error fetching attendance logs:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPayrollReport(),
      fetchStaffSalaryList(),
      fetchShiftConfigs(),
      fetchAttendanceLogs(),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'PAYROLL') fetchPayrollReport();
    if (activeTab === 'SALARY_SETTINGS') fetchStaffSalaryList();
    if (activeTab === 'SHIFT_CONFIG') fetchShiftConfigs();
    if (activeTab === 'LOGS') fetchAttendanceLogs();
  }, [activeTab, payrollMonth, payrollBranch, payrollStaff, shiftBranch, logsDate, logsBranch]);

  // ---------------------------------------------------------------------------
  // TAB 2: EDIT SALARY MODAL ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenEditSalary = (staff: any) => {
    setEditingSalaryStaff(staff);
    setFormSalaryType(staff.salaryType || 'HOURLY');
    setFormBaseRateStr(staff.baseRate ? staff.baseRate.toString() : '25000');
    setFormAllowanceStr(staff.allowance ? staff.allowance.toString() : '0');
    setFormSalaryNotes(staff.notes || '');
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalaryStaff) return;
    setSavingSalary(true);
    try {
      const res = await fetch('/api/staff/salary-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingSalaryStaff.id,
          salaryType: formSalaryType,
          baseRate: parseInt(formBaseRateStr.replace(/\D/g, ''), 10) || 0,
          allowance: parseInt(formAllowanceStr.replace(/\D/g, ''), 10) || 0,
          notes: formSalaryNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã cập nhật mức lương cho ${editingSalaryStaff.name} thành công!`);
        setEditingSalaryStaff(null);
        fetchStaffSalaryList();
        fetchPayrollReport();
      } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingSalary(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TAB 3: EDIT SHIFT PRESET ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenEditShift = (config: any) => {
    setEditingShiftConfig(config);
    setFormShiftName(config.shiftName);
    setFormStartTime(config.startTime);
    setFormEndTime(config.endTime);
  };

  const handleSaveShiftConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShiftConfig) return;
    setSavingShiftConfig(true);
    try {
      const res = await fetch('/api/shifts/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: editingShiftConfig.branchId,
          shiftType: editingShiftConfig.shiftType,
          shiftName: formShiftName,
          startTime: formStartTime,
          endTime: formEndTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Cập nhật khung giờ ca thành công!');
        setEditingShiftConfig(null);
        fetchShiftConfigs();
      } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingShiftConfig(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TAB 4: MANUAL TIMESHEET ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenManualLog = () => {
    setFormManualStaffId(staffSalaryList[0]?.id || '');
    setFormManualBranchId(availableBranches[0]?.id || 'cs1');
    setFormManualDate(new Date().toISOString().split('T')[0]);
    setFormManualShiftType('SANG');
    setFormManualCheckIn('06:00');
    setFormManualCheckOut('11:30');
    setFormManualHours('5.5');
    setFormManualAllowance('0');
    setFormManualNotes('');
    setEditingLogRecord(null);
    setShowManualModal(true);
  };

  const handleSaveManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManualLog(true);
    try {
      const payload = {
        userId: formManualStaffId,
        branchId: formManualBranchId,
        date: formManualDate,
        shiftType: formManualShiftType,
        checkInTimeStr: formManualCheckIn,
        checkOutTimeStr: formManualCheckOut,
        workHours: parseFloat(formManualHours) || 5.5,
        workShifts: (parseFloat(formManualHours) || 5.5) >= 5 ? 1 : 0.5,
        allowance: parseInt(formManualAllowance.replace(/\D/g, ''), 10) || 0,
        note: formManualNotes,
        status: 'APPROVED',
        logType: 'ADMIN_MANUAL',
      };

      let res: any;
      if (editingLogRecord) {
        res = await fetch(`/api/attendance/records/${editingLogRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/attendance/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast(editingLogRecord ? 'Đã cập nhật bản ghi chấm công!' : 'Đã thêm lượt chấm công mới!');
        setShowManualModal(false);
        setEditingLogRecord(null);
        fetchAttendanceLogs();
        fetchPayrollReport();
      } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingManualLog(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT EXCEL PAYROLL
  // ---------------------------------------------------------------------------
  const handleExportPayrollExcel = () => {
    if (!payrollData || !payrollData.staffPayroll) return;

    const exportRows = payrollData.staffPayroll.map((s: any, idx: number) => ({
      STT: idx + 1,
      'Mã NV': s.staffCode || `NV-${s.userId?.slice(-4)}`,
      'Họ Và Tên': s.name,
      'Chức Vụ': s.role,
      'Cơ Sở': s.branchName,
      'Hình Thức Lương': s.salaryType === 'HOURLY' ? 'Theo Giờ' : s.salaryType === 'PER_SHIFT' ? 'Theo Ca' : 'Lương Tháng',
      'Đơn Giá Lương (VNĐ)': s.baseRate,
      'Tổng Ca Làm': s.totalShifts,
      'Tổng Giờ Công': s.totalHours,
      'Thành Tiền Lương (VNĐ)': s.grossSalary,
      'Phụ Cấp / Thưởng (VNĐ)': s.totalAllowance,
      'Tổng Thu Nhập Thực Nhận (VNĐ)': s.netIncome,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangLuong');

    XLSX.writeFile(wb, `BangLuong_GaUmuoiSmart_${payrollMonth}_${payrollBranch}.xlsx`);
    showToast('Đã xuất file Excel bảng lương thành công!');
  };

  // ---------------------------------------------------------------------------
  // PRINT PAYSLIP / PAYROLL SHEET
  // ---------------------------------------------------------------------------
  const handlePrintPayroll = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all border animate-in slide-in-from-top-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 backdrop-blur-md bg-white/80 dark:bg-neutral-900/90'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500 backdrop-blur-md bg-white/80 dark:bg-neutral-900/90'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center font-black shadow-md">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black dark:text-white text-stone-900 tracking-tight">
                Phân Hệ Quản Lý Chấm Công & Tính Lương
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-500 font-medium">
                Menu Gà Smart • Cấu hình 3 ca chuẩn 6 cơ sở Hà Nội & Bảng lương tự động
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/admin/attendance')}
            className="px-3.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-100 hover:bg-amber-500/15 border dark:border-neutral-700 border-stone-300 dark:text-neutral-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-500" />
            <span>Kiosk Chụp Ảnh Check-in</span>
          </button>

          {activeTab === 'PAYROLL' && (
            <>
              <button
                onClick={handlePrintPayroll}
                className="px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-100 hover:bg-neutral-800 border dark:border-neutral-700 border-stone-300 dark:text-neutral-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-neutral-400" />
                <span>In Bảng Lương</span>
              </button>
              <button
                onClick={handleExportPayrollExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2]" />
                <span>Xuất Excel Bảng Lương</span>
              </button>
            </>
          )}

          {activeTab === 'LOGS' && (
            <button
              onClick={handleOpenManualLog}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Thêm Công Thủ Công</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl dark:bg-[#12141A] bg-stone-100 border dark:border-neutral-800 border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'PAYROLL'
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'dark:text-neutral-400 text-stone-600 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. 📊 Bảng Lương & Thống Kê Công</span>
        </button>

        <button
          onClick={() => setActiveTab('SALARY_SETTINGS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'SALARY_SETTINGS'
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'dark:text-neutral-400 text-stone-600 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>2. ⚙️ Cài Đặt Lương Nhân Sự</span>
        </button>

        <button
          onClick={() => setActiveTab('SHIFT_CONFIG')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'SHIFT_CONFIG'
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'dark:text-neutral-400 text-stone-600 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. 🕒 Cấu Hình Khung Giờ Ca 6 Cơ Sở</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'LOGS'
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'dark:text-neutral-400 text-stone-600 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>4. 📅 Nhật Ký Chấm Công & Duyệt Công</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BẢNG LƯƠNG & THỐNG KÊ CÔNG (PAYROLL REPORT) */}
      {/* ========================================================================= */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-600">Tháng:</span>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-amber-400 text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-600">Cơ sở:</span>
                <select
                  value={payrollBranch}
                  onChange={(e) => setPayrollBranch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">🏢 Tất Cả 6 Cơ Sở Hà Nội</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-600">Nhân viên:</span>
                <select
                  value={payrollStaff}
                  onChange={(e) => setPayrollStaff(e.target.value)}
                  className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer max-w-[200px]"
                >
                  <option value="all">👥 Tất Cả Nhân Viên</option>
                  {staffSalaryList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode ? `[${s.staffCode}] ` : ''}{s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchPayrollReport}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition border border-amber-500/30 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm Mới Dữ Liệu</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          {payrollData && payrollData.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                    💰 Tổng Quỹ Lương Kỳ Này
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-500 tracking-tight">
                  {(payrollData.summary.totalPayroll || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500">
                  Gồm lương giờ/ca + phụ cấp ăn ca
                </p>
              </div>

              <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                    ⏳ Tổng Giờ Công Thực Tế
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-500 tracking-tight">
                  {payrollData.summary.totalHours || 0} <span className="text-sm font-semibold">giờ</span>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500">
                  Tổng thời gian làm việc toàn hệ thống
                </p>
              </div>

              <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                    📋 Tổng Số Ca Hoàn Thành
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-500 tracking-tight">
                  {payrollData.summary.totalShifts || 0} <span className="text-sm font-semibold">ca</span>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500">
                  Tính theo chuẩn 3 ca Sáng/Trưa/Tối
                </p>
              </div>

              <div className="p-5 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold dark:text-neutral-400 text-stone-500 uppercase">
                    👥 Nhân Sự Hoạt Động
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-500 tracking-tight">
                  {payrollData.summary.activeStaffCount} / {payrollData.summary.totalStaffCount} <span className="text-sm font-semibold">nhân sự</span>
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-stone-500">
                  Nhân viên có phát sinh giờ công
                </p>
              </div>
            </div>
          )}

          {/* Main Payroll Table */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-neutral-800 border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm dark:text-white text-stone-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Bảng Tổng Hợp Tiền Lương & Ngày Công Chi Tiết</span>
                </h3>
                <span className="text-[11px] font-semibold text-neutral-400">
                  Tháng {payrollMonth} • Áp dụng cơ chế tính lương linh hoạt (Theo giờ / Theo ca / Lương tháng)
                </span>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {payrollData?.staffPayroll?.length || 0} nhân sự trong danh sách
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">MÃ NV</th>
                    <th className="pb-3 px-3">HỌ VÀ TÊN</th>
                    <th className="pb-3 px-3">CƠ SỞ TRỰC THUỘC</th>
                    <th className="pb-3 px-3 text-center">TỔNG CA</th>
                    <th className="pb-3 px-3 text-center">TỔNG GIỜ CÔNG</th>
                    <th className="pb-3 px-3 text-right">MỨC LƯƠNG CƠ BẢN</th>
                    <th className="pb-3 px-3 text-right">TIỀN CÔNG CƠ BẢN</th>
                    <th className="pb-3 px-3 text-right">PHỤ CẤP / THƯỞNG</th>
                    <th className="pb-3 px-3 text-right font-black text-emerald-500">TỔNG THỰC NHẬN</th>
                    <th className="pb-3 px-3 text-center">CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100 font-medium">
                  {(payrollData?.staffPayroll || []).map((staff: any) => {
                    const hasWork = staff.totalWorkDays > 0;
                    return (
                      <tr key={staff.userId} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-500">
                          {staff.staffCode || `#${staff.userId.slice(-4).toUpperCase()}`}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold dark:text-white text-stone-900">{staff.name}</div>
                          <span className="text-[10px] text-stone-400">{staff.role} • {staff.phone || '-'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg dark:bg-neutral-800 bg-stone-100 dark:text-neutral-300 text-stone-700 text-[11px] font-semibold border border-stone-200 dark:border-neutral-700">
                            {staff.branchName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-blue-400">
                          {staff.totalShifts} ca
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-500">
                          {staff.totalHours} h
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold dark:text-neutral-200 text-stone-800">
                            {staff.baseRate.toLocaleString('vi-VN')} đ
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {staff.salaryType === 'HOURLY' ? '/ giờ' : staff.salaryType === 'PER_SHIFT' ? '/ ca' : '/ tháng'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold dark:text-neutral-300 text-stone-700">
                          {staff.grossSalary.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right text-amber-500 font-semibold">
                          +{staff.totalAllowance.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm text-emerald-500">
                          {staff.netIncome.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setSelectedStaffForDrilldown(staff)}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold text-[11px] rounded-lg transition border border-amber-500/30 cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem Ngày Công ({staff.totalWorkDays})</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary Footer */}
                <tfoot>
                  <tr className="border-t-2 dark:border-neutral-700 border-stone-300 font-extrabold dark:text-white text-stone-900 bg-amber-500/5 text-xs">
                    <td colSpan={3} className="py-4 px-3">TỔNG CỘNG QUỸ LƯƠNG HỆ THỐNG</td>
                    <td className="py-4 px-3 text-center text-blue-500 font-black">
                      {payrollData?.summary?.totalShifts || 0} ca
                    </td>
                    <td className="py-4 px-3 text-center text-amber-500 font-black">
                      {payrollData?.summary?.totalHours || 0} h
                    </td>
                    <td className="py-4 px-3 text-right">-</td>
                    <td className="py-4 px-3 text-right">
                      {(payrollData?.summary?.totalGrossSalary || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-3 text-right text-amber-500 font-black">
                      +{(payrollData?.summary?.totalAllowance || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-3 text-right text-base font-black text-emerald-500">
                      {(payrollData?.summary?.totalPayroll || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-3 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CÀI ĐẶT LƯƠNG NHÂN SỰ (STAFF SALARY SETTINGS) */}
      {/* ========================================================================= */}
      {activeTab === 'SALARY_SETTINGS' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã nhân viên..."
                  value={salarySearch}
                  onChange={(e) => setSalarySearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs focus:outline-none focus:border-amber-500 w-64"
                />
              </div>

              <select
                value={salaryBranchFilter}
                onChange={(e) => setSalaryBranchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">🏢 Tất Cả Cơ Sở</option>
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-stone-400 font-medium">
              Chỉ Quản trị viên (Admin/Manager) có quyền điều chỉnh đơn giá lương
            </span>
          </div>

          {/* Salary Settings Table */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">MÃ NV</th>
                    <th className="pb-3 px-3">HỌ VÀ TÊN</th>
                    <th className="pb-3 px-3">CƠ SỞ</th>
                    <th className="pb-3 px-3">HÌNH THỨC TRẢ LƯƠNG</th>
                    <th className="pb-3 px-3 text-right">MỨC LƯƠNG CƠ BẢN</th>
                    <th className="pb-3 px-3 text-right">PHỤ CẤP MẶC ĐỊNH</th>
                    <th className="pb-3 px-3">GHI CHÚ</th>
                    <th className="pb-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100 font-medium">
                  {staffSalaryList
                    .filter((s) => {
                      const matchSearch =
                        !salarySearch ||
                        s.name.toLowerCase().includes(salarySearch.toLowerCase()) ||
                        (s.staffCode || '').toLowerCase().includes(salarySearch.toLowerCase());
                      const matchBranch = salaryBranchFilter === 'all' || s.branchId === salaryBranchFilter;
                      return matchSearch && matchBranch;
                    })
                    .map((staff) => (
                      <tr key={staff.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-500">
                          {staff.staffCode || `#${staff.id.slice(-4).toUpperCase()}`}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold dark:text-white text-stone-900">{staff.name}</div>
                          <span className="text-[10px] text-stone-400">{staff.role} • {staff.phone || '-'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg dark:bg-neutral-800 bg-stone-100 dark:text-neutral-300 text-stone-700 text-[11px] font-semibold border border-stone-200 dark:border-neutral-700">
                            {staff.branchName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {staff.salaryType === 'HOURLY' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                              ⏱️ Theo Giờ Công
                            </span>
                          ) : staff.salaryType === 'PER_SHIFT' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              📋 Theo Ca Cố Định
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                              📅 Lương Cứng Tháng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm text-amber-500">
                          {staff.baseRate.toLocaleString('vi-VN')} đ
                          <span className="text-[10px] font-normal text-stone-400 ml-1">
                            {staff.salaryType === 'HOURLY' ? '/h' : staff.salaryType === 'PER_SHIFT' ? '/ca' : '/tháng'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-500">
                          +{staff.allowance.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                          {staff.notes || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleOpenEditSalary(staff)}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold text-[11px] rounded-lg transition border border-amber-500/30 cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Sửa Lương</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CẤU HÌNH KHUNG GIỜ CA THEO CƠ SỞ (BRANCH SHIFT PRESETS) */}
      {/* ========================================================================= */}
      {activeTab === 'SHIFT_CONFIG' && (
        <div className="space-y-6">
          {/* Branch Picker */}
          <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold dark:text-neutral-300 text-stone-700">Chọn cơ sở cần cấu hình:</span>
              <select
                value={shiftBranch}
                onChange={(e) => setShiftBranch(e.target.value)}
                className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-amber-400 text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-stone-400 font-medium">
              3 Khung giờ ca chuẩn áp dụng khi nhân viên mở ca POS và chấm công
            </span>
          </div>

          {/* 3 Shift Preset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branchShiftConfigs.map((config) => {
              const isMorning = config.shiftType === 'SANG';
              const isAfternoon = config.shiftType === 'TRUA';
              const isEvening = config.shiftType === 'TOI';

              return (
                <div
                  key={config.id}
                  className="p-6 rounded-3xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-lg space-y-4 relative overflow-hidden group hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                          isMorning
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : isAfternoon
                            ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {isMorning ? <Sunrise className="w-5 h-5" /> : isAfternoon ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-black text-sm dark:text-white text-stone-900 uppercase">
                          {config.shiftName}
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-400">Mã ca: {config.shiftType}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEditShift(config)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold text-xs flex items-center gap-1 transition border border-amber-500/30 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa Giờ</span>
                    </button>
                  </div>

                  {/* Time Display */}
                  <div className="p-4 rounded-2xl dark:bg-neutral-900/60 bg-stone-50 border dark:border-neutral-800 border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold dark:text-neutral-300 text-stone-700">
                      <span>Giờ bắt đầu:</span>
                      <span className="font-mono text-sm font-black text-amber-500">{config.startTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold dark:text-neutral-300 text-stone-700">
                      <span>Giờ kết thúc:</span>
                      <span className="font-mono text-sm font-black text-rose-500">{config.endTime}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 italic">
                    {isMorning
                      ? 'Phục vụ sơ chế, nấu nước sốt và bán đơn buổi sáng.'
                      : isAfternoon
                      ? 'Phục vụ ca trưa cao điểm và giao đơn qua App.'
                      : 'Phục vụ ca tối, ăn nhậu lai rai và kiểm kê chốt ngày.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NHẬT KÝ CHẤM CÔNG & DUYỆT CÔNG (ATTENDANCE LOGS) */}
      {/* ========================================================================= */}
      {activeTab === 'LOGS' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-600">Ngày:</span>
                <input
                  type="date"
                  value={logsDate}
                  onChange={(e) => setLogsDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-amber-400 text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold dark:text-neutral-400 text-stone-600">Cơ sở:</span>
                <select
                  value={logsBranch}
                  onChange={(e) => setLogsBranch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">🏢 Tất Cả 6 Cơ Sở</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenManualLog}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Thêm Bản Ghi Chấm Công</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className="p-6 rounded-2xl dark:bg-[#12141A] bg-white border dark:border-neutral-800 border-stone-200 shadow-sm space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">NHÂN VIÊN</th>
                    <th className="pb-3 px-3">CƠ SỞ</th>
                    <th className="pb-3 px-3 text-center">CA LÀM</th>
                    <th className="pb-3 px-3 text-center">GIỜ VÀO</th>
                    <th className="pb-3 px-3 text-center">GIỜ RA</th>
                    <th className="pb-3 px-3 text-center">GIỜ CÔNG</th>
                    <th className="pb-3 px-3 text-right">TIỀN CÔNG</th>
                    <th className="pb-3 px-3 text-center">TRẠNG THÁI</th>
                    <th className="pb-3 px-3">GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100 font-medium">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                        Không có lượt chấm công nào trong ngày {logsDate}.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold dark:text-white text-stone-900">{r.staffName}</div>
                          <span className="text-[10px] text-stone-400">{r.staffCode || '-'}</span>
                        </td>
                        <td className="py-3 px-3">{r.branchName || r.branchId}</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-500">
                          {r.shiftType === 'SANG' ? '🌅 Sáng' : r.shiftType === 'TRUA' ? '☀️ Trưa' : '🌙 Tối'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                          {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                          {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-amber-400">
                          {r.workHours} h
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-500">
                          {r.earnedAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            ✓ ĐÃ DUYỆT
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                          {r.note || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DRILLDOWN NGÀY CÔNG CHI TIẾT NHÂN VIÊN */}
      {/* ========================================================================= */}
      {selectedStaffForDrilldown && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl dark:bg-[#141820] bg-white rounded-3xl border border-amber-500/40 shadow-2xl p-6 relative max-h-[90vh] flex flex-col space-y-4">
            <button
              onClick={() => setSelectedStaffForDrilldown(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                  Bảng Chi Tiết Ngày Công: <span className="text-amber-500">{selectedStaffForDrilldown.name}</span>
                </h3>
                <span className="text-xs text-neutral-400">
                  Mã NV: {selectedStaffForDrilldown.staffCode} • Cơ sở: {selectedStaffForDrilldown.branchName} • Tháng {payrollMonth}
                </span>
              </div>
            </div>

            {/* Drilldown Table */}
            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b dark:border-neutral-800 border-stone-200 dark:text-neutral-400 text-stone-500 font-bold uppercase">
                    <th className="pb-2.5 px-3">NGÀY LÀM</th>
                    <th className="pb-2.5 px-3 text-center">CA TRỰC</th>
                    <th className="pb-2.5 px-3 text-center">CHECK IN</th>
                    <th className="pb-2.5 px-3 text-center">CHECK OUT</th>
                    <th className="pb-2.5 px-3 text-center">GIỜ CÔNG</th>
                    <th className="pb-2.5 px-3 text-right">LƯƠNG CƠ BẢN</th>
                    <th className="pb-2.5 px-3 text-right">PHỤ CẤP</th>
                    <th className="pb-2.5 px-3 text-right font-black text-emerald-500">TỔNG NGÀY</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-100 font-medium">
                  {selectedStaffForDrilldown.dailyRecords && selectedStaffForDrilldown.dailyRecords.length > 0 ? (
                    selectedStaffForDrilldown.dailyRecords.map((d: any) => (
                      <tr key={d.id} className="hover:bg-stone-50 dark:hover:bg-neutral-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold dark:text-white text-stone-900">{d.date}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-500">
                          {d.shiftType === 'SANG' ? 'Ca Sáng' : d.shiftType === 'TRUA' ? 'Ca Trưa' : 'Ca Tối'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-400 font-bold">{d.checkIn}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-400 font-bold">{d.checkOut}</td>
                        <td className="py-2.5 px-3 text-center font-black text-amber-400">{d.workHours} h</td>
                        <td className="py-2.5 px-3 text-right">{d.earnedSalary.toLocaleString('vi-VN')} đ</td>
                        <td className="py-2.5 px-3 text-right text-amber-500 font-bold">+{d.allowance.toLocaleString('vi-VN')} đ</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-500">{d.earnedAmount.toLocaleString('vi-VN')} đ</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-400 italic">
                        Chưa có bản ghi chấm công phát sinh trong tháng này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t dark:border-neutral-800 border-stone-200 flex items-center justify-between">
              <div className="text-xs font-semibold dark:text-neutral-300 text-stone-700">
                Tổng cộng: <b className="text-amber-500">{selectedStaffForDrilldown.totalHours} giờ</b> • <b className="text-blue-400">{selectedStaffForDrilldown.totalShifts} ca</b> • Thu nhập: <b className="text-emerald-500">{selectedStaffForDrilldown.netIncome.toLocaleString('vi-VN')} đ</b>
              </div>
              <button
                onClick={() => setSelectedStaffForDrilldown(null)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CÀI ĐẶT LƯƠNG NHÂN VIÊN */}
      {/* ========================================================================= */}
      {editingSalaryStaff && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md dark:bg-[#141820] bg-white rounded-3xl border border-amber-500/40 shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setEditingSalaryStaff(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                  Cài Đặt Mức Lương: {editingSalaryStaff.name}
                </h3>
                <span className="text-xs text-neutral-400">
                  Mã: {editingSalaryStaff.staffCode} • {editingSalaryStaff.role} • {editingSalaryStaff.branchName}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-4 text-xs">
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Hình Thức Tính Lương (*)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSalaryType('HOURLY')}
                    className={`py-2 px-1 rounded-xl font-bold border transition text-center cursor-pointer ${
                      formSalaryType === 'HOURLY'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500'
                        : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                    }`}
                  >
                    ⏱️ Theo Giờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSalaryType('PER_SHIFT')}
                    className={`py-2 px-1 rounded-xl font-bold border transition text-center cursor-pointer ${
                      formSalaryType === 'PER_SHIFT'
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                        : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                    }`}
                  >
                    📋 Theo Ca
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSalaryType('MONTHLY')}
                    className={`py-2 px-1 rounded-xl font-bold border transition text-center cursor-pointer ${
                      formSalaryType === 'MONTHLY'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                    }`}
                  >
                    📅 Lương Tháng
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Mức Lương Cơ Sở (VNĐ) (*)
                </label>
                <input
                  type="text"
                  value={Number(formBaseRateStr.replace(/\D/g, '') || 0).toLocaleString('vi-VN')}
                  onChange={(e) => setFormBaseRateStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-black text-amber-500 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Ví dụ: 25.000 (đ/h) hoặc 120.000 (đ/ca)"
                />
              </div>

              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Phụ Cấp Ăn Ca / Trách Nhiệm (VNĐ / Ca hoặc Ngày)
                </label>
                <input
                  type="text"
                  value={Number(formAllowanceStr.replace(/\D/g, '') || 0).toLocaleString('vi-VN')}
                  onChange={(e) => setFormAllowanceStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-emerald-400 text-stone-900 focus:outline-none focus:border-amber-500"
                  placeholder="Ví dụ: 25.000 đ"
                />
              </div>

              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  value={formSalaryNotes}
                  onChange={(e) => setFormSalaryNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  placeholder="Thử việc 85%, Part-time, Quản lý..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSalaryStaff(null)}
                  className="px-4 py-2.5 rounded-xl dark:bg-neutral-800 bg-stone-200 dark:text-white text-stone-800 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingSalary}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingSalary ? 'Đang Lưu...' : 'Lưu Cài Đặt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CẬP NHẬT KHUNG GIỜ CA CHO CƠ SỞ */}
      {/* ========================================================================= */}
      {editingShiftConfig && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md dark:bg-[#141820] bg-white rounded-3xl border border-amber-500/40 shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setEditingShiftConfig(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                  Sửa Khung Giờ Ca Làm Việc
                </h3>
                <span className="text-xs text-neutral-400">
                  Cơ sở: {editingShiftConfig.branchId.toUpperCase()} • {editingShiftConfig.shiftName}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveShiftConfig} className="space-y-4 text-xs">
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Tên Ca Làm
                </label>
                <input
                  type="text"
                  value={formShiftName}
                  onChange={(e) => setFormShiftName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Giờ Bắt Đầu (*)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-mono font-black text-amber-500 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Giờ Kết Thúc (*)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-mono font-black text-rose-500 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingShiftConfig(null)}
                  className="px-4 py-2.5 rounded-xl dark:bg-neutral-800 bg-stone-200 dark:text-white text-stone-800 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingShiftConfig}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingShiftConfig ? 'Đang Lưu...' : 'Lưu Khung Giờ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: THÊM / SỬA CÔNG THỦ CÔNG */}
      {/* ========================================================================= */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md dark:bg-[#141820] bg-white rounded-3xl border border-amber-500/40 shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                  Ghi Nhận Chấm Công Thủ Công
                </h3>
                <span className="text-xs text-neutral-400">
                  Áp dụng cho trường hợp nhân viên quên check-in hoặc làm ca phát sinh
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveManualLog} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Chọn Nhân Viên (*)
                </label>
                <select
                  value={formManualStaffId}
                  onChange={(e) => setFormManualStaffId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {staffSalaryList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode ? `[${s.staffCode}] ` : ''}{s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Cơ Sở Trực (*)
                  </label>
                  <select
                    value={formManualBranchId}
                    onChange={(e) => setFormManualBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Ngày Làm (*)
                  </label>
                  <input
                    type="date"
                    value={formManualDate}
                    onChange={(e) => setFormManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-amber-400 text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Giờ Vào
                  </label>
                  <input
                    type="time"
                    value={formManualCheckIn}
                    onChange={(e) => setFormManualCheckIn(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-mono font-bold text-emerald-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Giờ Ra
                  </label>
                  <input
                    type="time"
                    value={formManualCheckOut}
                    onChange={(e) => setFormManualCheckOut(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-mono font-bold text-rose-400 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Tổng Giờ
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formManualHours}
                    onChange={(e) => setFormManualHours(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold text-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Ghi Chú Duyệt Công
                </label>
                <input
                  type="text"
                  value={formManualNotes}
                  onChange={(e) => setFormManualNotes(e.target.value)}
                  placeholder="Lý do bổ sung công..."
                  className="w-full px-3.5 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 rounded-xl dark:bg-neutral-800 bg-stone-200 dark:text-white text-stone-800 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingManualLog}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingManualLog ? 'Đang Ghi...' : 'Lưu Chấm Công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
