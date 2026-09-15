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
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StaffItem {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null;
  checkInPhoto: string | null;
  checkOutTime: string | null;
  checkOutPhoto: string | null;
  totalHours: number | null;
  status: string; // ON_TIME, LATE, EARLY_LEAVE, ABSENT
  logType: string; // CAMERA_POS, ADMIN_MANUAL
  notes: string | null;
  createdAt: string;
}

import { useBranches } from '@/hooks/useBranches';

export default function AdminAttendanceManagementPage() {
  const { branches } = useBranches();
  const BRANCHES = branches.length > 0
    ? branches.map((b) => ({ id: b.id, name: `📍 ${b.name}` }))
    : [
        { id: 'cs1', name: '📍 Cơ Sở Cầu Giấy' },
        { id: 'cs2', name: '📍 Cơ Sở Đống Đa' },
        { id: 'cs3', name: '📍 Cơ Sở Hai Bà Trưng' },
        { id: 'cs4', name: '📍 Cơ Sở Thanh Xuân' },
        { id: 'cs5', name: '📍 Cơ Sở Tây Hồ' },
        { id: 'cs6', name: '📍 Cơ Sở Nam Từ Liêm' },
      ];

  const router = useRouter();

  // Auth state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Data state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    totalActualHours: 0,
    onTimeCount: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    lateOrEarlyCount: 0,
    manualCount: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  // Filters state
  const todayMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(todayMonth);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoModalRecord, setPhotoModalRecord] = useState<AttendanceRecord | null>(null);
  const [photoModalType, setPhotoModalType] = useState<'IN' | 'OUT'>('IN');

  // Quick checkout processing ID
  const [quickCheckoutId, setQuickCheckoutId] = useState<string | null>(null);

  // Form state
  const [formStaffId, setFormStaffId] = useState('');
  const [formBranchId, setFormBranchId] = useState('cs1');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCheckIn, setFormCheckIn] = useState('08:00');
  const [formCheckOut, setFormCheckOut] = useState('17:00');
  const [formStatus, setFormStatus] = useState('ON_TIME');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 1. Fetch Auth & Check Role
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUserRole(data.user.role);
        } else {
          setUserRole('STAFF');
        }
      })
      .catch(() => setUserRole('STAFF'))
      .finally(() => setLoadingAuth(false));
  }, []);

  // 2. Fetch Staff List
  useEffect(() => {
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.staff)) {
          setStaffList(data.staff);
        }
      })
      .catch(console.error);
  }, []);

  // 3. Fetch Attendance Records based on filters
  const fetchAttendance = async () => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedStaff !== 'all') params.append('staffId', selectedStaff);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.attendance || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedBranch, selectedStaff, selectedStatus]);

  // Map Staff Hourly Rate based on Role
  const getHourlyRate = (staffId: string, staffName: string) => {
    const staff = staffList.find((s) => s.id === staffId || s.name === staffName);
    if (!staff) return 25000;
    const role = (staff.role || '').toUpperCase();
    if (role.includes('ADMIN')) return 35000;
    if (role.includes('MANAGER') || role.includes('QUẢN LÝ')) return 30000;
    if (role.includes('CASHIER') || role.includes('THU NGÂN')) return 25000;
    return 22000;
  };

  // Calculate Shift Salary
  const calculateShiftSalary = (rec: AttendanceRecord) => {
    if (!rec.checkOutTime || !rec.totalHours || rec.totalHours <= 0) return 0;
    const rate = getHourlyRate(rec.staffId, rec.staffName);
    const baseSalary = rec.totalHours * rate;
    const latePenalty = rec.status === 'LATE' ? 20000 : 0;
    return Math.max(0, Math.round(baseSalary - latePenalty));
  };

  // Total Estimated Salary Summary for current filtered view
  const totalEstimatedSalary = useMemo(() => {
    return records.reduce((acc, rec) => acc + calculateShiftSalary(rec), 0);
  }, [records, staffList]);

  // Elapsed time label for shifts in progress (checkOutTime === null)
  const getElapsedTimeLabel = (checkInTimeStr: string | null) => {
    if (!checkInTimeStr) return 'Đang trực ca';
    const checkInMs = new Date(checkInTimeStr).getTime();
    const diffMs = Math.max(0, Date.now() - checkInMs);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `Đang tính: ${m} phút`;
    return `Đang tính: ${h} giờ ${m} phút`;
  };

  // Quick Check-out Handler
  const handleQuickCheckout = async (rec: AttendanceRecord) => {
    setQuickCheckoutId(rec.id);
    try {
      const res = await fetch(`/api/attendance/${rec.id}`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendance();
      } else {
        alert(data.error || 'Lỗi chốt ca nhanh!');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setQuickCheckoutId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormStaffId(rec.staffId);
    setFormBranchId(rec.branchId || 'cs1');
    setFormDate(rec.date);

    if (rec.checkInTime) {
      const d = new Date(rec.checkInTime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setFormCheckIn(`${h}:${m}`);
    } else {
      setFormCheckIn('08:00');
    }

    if (rec.checkOutTime) {
      const d = new Date(rec.checkOutTime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setFormCheckOut(`${h}:${m}`);
    } else {
      setFormCheckOut('17:00');
    }

    setFormStatus(rec.status || 'ON_TIME');
    setFormNotes(rec.notes || '');
    setFormError('');
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormStaffId(staffList.length > 0 ? staffList[0].id : '');
    setFormBranchId('cs1');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCheckIn('08:00');
    setFormCheckOut('17:00');
    setFormStatus('ON_TIME');
    setFormNotes('');
    setFormError('');
    setShowAddModal(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formStaffId) {
      setFormError('Vui lòng chọn nhân viên!');
      return;
    }
    if (!formDate) {
      setFormError('Vui lòng chọn ngày làm việc!');
      return;
    }
    if (!formNotes || formNotes.trim().length === 0) {
      setFormError('Vui lòng điền ghi chú lý do của Admin!');
      return;
    }

    const selectedStaffObj = staffList.find((s) => s.id === formStaffId);
    const staffName = selectedStaffObj ? selectedStaffObj.name : 'Nhân viên';

    setSubmitting(true);
    try {
      if (editingRecord) {
        const res = await fetch(`/api/attendance/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: formBranchId,
            date: formDate,
            checkInTimeStr: formCheckIn,
            checkOutTimeStr: formCheckOut,
            status: formStatus,
            notes: formNotes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingRecord(null);
          fetchAttendance();
        } else {
          setFormError(data.error || 'Lỗi cập nhật!');
        }
      } else {
        const res = await fetch('/api/attendance/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: formStaffId,
            staffName,
            branchId: formBranchId,
            date: formDate,
            checkInTimeStr: formCheckIn,
            checkOutTimeStr: formCheckOut,
            status: formStatus,
            notes: formNotes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAddModal(false);
          fetchAttendance();
        } else {
          setFormError(data.error || 'Lỗi thêm chấm công!');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        fetchAttendance();
      } else {
        alert(data.error || 'Lỗi khi xóa bản ghi!');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối!');
    }
  };

  // Excel Export Handler (Upgraded with Hourly Rate & Salary Sums)
  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('Không có dữ liệu chấm công để xuất file Excel!');
      return;
    }

    const branchObj = BRANCHES.find((b) => b.id === selectedBranch);
    const branchLabel = branchObj ? branchObj.name.replace('📍 ', '') : 'ToanHeThong';
    const filename = `Bang_Luong_Va_Cham_Cong_GaUMuoiSmart_${selectedMonth}_${branchLabel}.xlsx`;

    let totalHoursSum = 0;
    let totalSalarySum = 0;

    const excelData = records.map((rec, index) => {
      const checkInStr = rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString('vi-VN') : '---';
      const checkOutStr = rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('vi-VN') : '🟡 Đang trực ca';
      const hours = rec.checkOutTime ? rec.totalHours || 0 : 0;
      const rate = getHourlyRate(rec.staffId, rec.staffName);
      const salary = calculateShiftSalary(rec);

      totalHoursSum += hours;
      totalSalarySum += salary;

      let statusText = 'Đúng giờ';
      if (rec.status === 'LATE') statusText = 'Đi muộn (-20.000đ)';
      if (rec.status === 'EARLY_LEAVE') statusText = 'Về sớm';
      if (rec.status === 'ABSENT') statusText = 'Nghỉ không phép';

      const logTypeText = rec.logType === 'ADMIN_MANUAL' ? 'Admin tạo thủ công' : 'Camera POS';

      return {
        'STT': index + 1,
        'Mã NV': rec.staffId.slice(-6).toUpperCase(),
        'Họ và Tên': rec.staffName,
        'Cơ Sở': rec.branchName,
        'Ngày Làm Việc': rec.date,
        'Giờ Vào (Check-in)': checkInStr,
        'Giờ Ra (Check-out)': checkOutStr,
        'Tổng Giờ Làm (Giờ)': hours,
        'Lương Theo Giờ (đ/h)': rate,
        'Thành Tiền Lương Ca (VNĐ)': salary,
        'Trạng Thái': statusText,
        'Ghi Nhận Bởi': logTypeText,
        'Ghi Chú Admin': rec.notes || '',
      };
    });

    // Append Summary Row at the bottom
    excelData.push({
      'STT': 0,
      'Mã NV': 'TỔNG CỘNG',
      'Họ và Tên': '--- TỔNG LƯƠNG & GIỜ CÔNG CẢ KỲ ---',
      'Cơ Sở': '',
      'Ngày Làm Việc': '',
      'Giờ Vào (Check-in)': '',
      'Giờ Ra (Check-out)': '',
      'Tổng Giờ Làm (Giờ)': Number(totalHoursSum.toFixed(1)),
      'Lương Theo Giờ (đ/h)': 0,
      'Thành Tiền Lương Ca (VNĐ)': totalSalarySum,
      'Trạng Thái': '',
      'Ghi Nhận Bởi': '',
      'Ghi Chú Admin': '',
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Format column widths
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 10 }, // Mã NV
      { wch: 24 }, // Họ Tên
      { wch: 20 }, // Cơ sở
      { wch: 14 }, // Ngày
      { wch: 18 }, // Giờ Vào
      { wch: 18 }, // Giờ Ra
      { wch: 18 }, // Tổng Giờ
      { wch: 18 }, // Lương/giờ
      { wch: 22 }, // Thành tiền
      { wch: 18 }, // Trạng Thái
      { wch: 22 }, // Ghi Nhận Bởi
      { wch: 30 }, // Ghi Chú
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Lương & Chấm Công');
    XLSX.writeFile(workbook, filename);
  };

  // Helper formatting total hours
  const formatTotalHoursLabel = (hours: number | null) => {
    if (!hours || hours <= 0) return '0 giờ 0 phút';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
  };

  // Auth Access Check Screen
  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (userRole !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 dark:bg-[#141820] bg-white rounded-2xl border dark:border-rose-500/30 border-rose-200 text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-xl font-bold dark:text-white text-stone-900 mb-2">Quyền Truy Cập Bị Hạn Chế</h2>
        <p className="text-sm dark:text-neutral-400 text-stone-600 mb-6 max-w-md mx-auto">
          Tính năng **Quản Lý Chấm Công Portal** chỉ dành riêng cho tài khoản Quản Trị Viên (ADMIN). Tài khoản Nhân viên vui lòng sử dụng màn hình Chấm Công Camera tại quầy.
        </p>
        <button
          onClick={() => router.push('/admin/attendance')}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 mx-auto cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Chuyển Sang Màn Hình Chấm Công Camera</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b dark:border-neutral-800 border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl dark:bg-amber-500/10 bg-amber-500/15 dark:text-amber-400 text-amber-600 border dark:border-amber-500/30 border-amber-500/40 shadow-xs">
              <CalendarCheck className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold dark:text-white text-stone-900 tracking-tight">
                Quản Lý Chấm Công (Admin Portal)
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-500 mt-0.5">
                Theo dõi ca làm việc, bổ sung công thủ công, duyệt phép và xuất báo cáo bảng lương Excel toàn hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 dark:bg-neutral-900 dark:hover:bg-neutral-800 bg-stone-100 hover:bg-stone-200 dark:text-amber-400 text-amber-700 font-bold rounded-xl border dark:border-amber-500/30 border-amber-500/40 text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>Thêm Chấm Công Bổ Sung</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất File Excel (Bảng Lương)</span>
          </button>
        </div>
      </div>

      {/* Top Controls Filter Bar */}
      <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filter 1: Month/Year */}
        <div>
          <label className="text-[11px] font-semibold dark:text-neutral-400 text-stone-500 block mb-1.5 uppercase tracking-wider">
            📅 Chọn Tháng / Năm
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-800 text-xs font-semibold focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter 2: Branch */}
        <div>
          <label className="text-[11px] font-semibold dark:text-neutral-400 text-stone-500 block mb-1.5 uppercase tracking-wider">
            🏢 Cơ Sở Chi Nhánh
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-800 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">🏢 Tất Cả 6 Cơ Sở</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 3: Staff */}
        <div>
          <label className="text-[11px] font-semibold dark:text-neutral-400 text-stone-500 block mb-1.5 uppercase tracking-wider">
            👤 Chọn Nhân Viên
          </label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-800 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">👥 Tất Cả Nhân Viên</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>

        {/* Filter 4: Status */}
        <div>
          <label className="text-[11px] font-semibold dark:text-neutral-400 text-stone-500 block mb-1.5 uppercase tracking-wider">
            🎯 Trạng Thái Chấm Công
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-800 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">⚡ Tất Cả Trạng Thái</option>
            <option value="ON_TIME">🟢 Đúng Giờ</option>
            <option value="LATE">🟠 Đi Muộn</option>
            <option value="EARLY_LEAVE">🔴 Về Sớm</option>
            <option value="ABSENT">⚪ Nghỉ Không Phép</option>
          </select>
        </div>
      </div>

      {/* Summary Cards (5 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Hours */}
        <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold dark:text-neutral-400 text-stone-500 block uppercase tracking-wider">
              Tổng Giờ Thực Tế
            </span>
            <span className="text-lg font-black dark:text-white text-stone-900 mt-0.5 block">
              {summary.totalActualHours.toLocaleString('vi-VN')} <span className="text-xs font-normal text-amber-500">giờ</span>
            </span>
          </div>
        </div>

        {/* Card 2: On-time shifts */}
        <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold dark:text-neutral-400 text-stone-500 block uppercase tracking-wider">
              Ca Đúng Giờ
            </span>
            <span className="text-lg font-black text-emerald-500 mt-0.5 block">
              {summary.onTimeCount} <span className="text-xs font-normal text-emerald-600">ca</span>
            </span>
          </div>
        </div>

        {/* Card 3: Late/Early shifts */}
        <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold dark:text-neutral-400 text-stone-500 block uppercase tracking-wider">
              Muộn / Về Sớm
            </span>
            <span className="text-lg font-black text-amber-500 mt-0.5 block">
              {summary.lateOrEarlyCount} <span className="text-xs font-normal text-amber-600">ca</span>
            </span>
          </div>
        </div>

        {/* Card 4: Manual Additions */}
        <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <span className="text-[10px] font-semibold dark:text-neutral-400 text-stone-500 block uppercase tracking-wider">
              Thủ Công (Admin)
            </span>
            <span className="text-lg font-black text-purple-400 mt-0.5 block">
              {summary.manualCount} <span className="text-xs font-normal text-purple-400">ca</span>
            </span>
          </div>
        </div>

        {/* Card 5: Total Estimated Salary */}
        <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-emerald-500/40 border-emerald-300 shadow-sm flex items-center gap-3.5 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
              Tổng Lương Dự Kiến
            </span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
              {totalEstimatedSalary.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-emerald-500">đ</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-md overflow-hidden">
        <div className="p-4 border-b dark:border-neutral-800 border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-sm dark:text-white text-stone-900 flex items-center gap-2">
            <span>📋 Bảng Nhật Ký Chấm Công & Bảng Lương Ca Chi Tiết</span>
            <span className="text-xs font-normal dark:bg-neutral-800 bg-stone-100 dark:text-neutral-400 text-stone-600 px-2 py-0.5 rounded-md">
              {records.length} bản ghi
            </span>
          </h3>
        </div>

        {loadingData ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
            <p className="text-xs dark:text-neutral-400 text-stone-500">Đang tải dữ liệu chấm công...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold dark:text-neutral-300 text-stone-700">Không tìm thấy bản ghi chấm công phù hợp</p>
            <p className="text-xs dark:text-neutral-500 text-stone-500 mt-1">
              Thử thay đổi bộ lọc Tháng, Cơ sở hoặc chọn "Thêm Chấm Công Bổ Sung".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-neutral-900/80 bg-stone-100 dark:text-neutral-400 text-stone-600 font-semibold border-b dark:border-neutral-800 border-stone-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">NGÀY</th>
                  <th className="py-3.5 px-4">NHÂN VIÊN</th>
                  <th className="py-3.5 px-4">CƠ SỞ</th>
                  <th className="py-3.5 px-4">GIỜ VÀO (IN)</th>
                  <th className="py-3.5 px-4">GIỜ RA (OUT)</th>
                  <th className="py-3.5 px-4">TỔNG GIỜ LÀM</th>
                  <th className="py-3.5 px-4 text-emerald-400">LƯƠNG TẠM TÍNH</th>
                  <th className="py-3.5 px-4 text-center">ẢNH XÁC THỰC</th>
                  <th className="py-3.5 px-4">LOẠI GHI NHẬN</th>
                  <th className="py-3.5 px-4">GHI CHÚ</th>
                  <th className="py-3.5 px-4 text-right pr-6">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-200">
                {records.map((rec) => {
                  const checkInTimeStr = rec.checkInTime
                    ? new Date(rec.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : '---';

                  const checkOutTimeStr = rec.checkOutTime
                    ? new Date(rec.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : null;

                  const isInProgress = rec.checkInTime && !rec.checkOutTime;
                  const shiftSalary = calculateShiftSalary(rec);
                  const hourlyRate = getHourlyRate(rec.staffId, rec.staffName);

                  return (
                    <tr
                      key={rec.id}
                      className="dark:hover:bg-neutral-900/40 hover:bg-stone-50 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-bold dark:text-white text-stone-900 whitespace-nowrap">
                        {rec.date}
                      </td>

                      {/* Staff */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs shrink-0">
                            {rec.staffName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold dark:text-white text-stone-900 block leading-tight">
                              {rec.staffName}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              ID: {rec.staffId.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-100 border dark:border-neutral-700 border-stone-200 font-medium text-stone-700 dark:text-neutral-300">
                          {rec.branchName}
                        </span>
                      </td>

                      {/* Check-in time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold dark:text-neutral-200 text-stone-800">
                            {checkInTimeStr}
                          </span>
                          {rec.status === 'LATE' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/30 font-semibold">
                              Đi muộn
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-semibold">
                              Đúng giờ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check-out time (Requirement 1: Badge 🟡 Đang trực ca if null) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isInProgress ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            🟡 Đang trực ca
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold dark:text-neutral-200 text-stone-800">
                              {checkOutTimeStr}
                            </span>
                            {rec.status === 'EARLY_LEAVE' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-500 border border-rose-500/30 font-semibold">
                                Về sớm
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Hours (Requirement 1: Elapsed time if in progress) */}
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        {isInProgress ? (
                          <span className="text-amber-400 italic font-mono text-[11px]">
                            {getElapsedTimeLabel(rec.checkInTime)}
                          </span>
                        ) : (
                          <span className="dark:text-amber-400 text-amber-700 font-mono">
                            {formatTotalHoursLabel(rec.totalHours)}
                          </span>
                        )}
                      </td>

                      {/* Shift Salary (Requirement 3: Estimated Salary) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {isInProgress ? (
                          <span className="text-neutral-500 italic text-[11px]">Đang tính...</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-emerald-400 text-xs block">
                              {shiftSalary.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-[9px] text-neutral-500 font-light block">
                              ({hourlyRate.toLocaleString('vi-VN')}đ/h)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Photos Side-by-Side (Requirement 2) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Thumbnail 1: Check-in photo */}
                          {rec.checkInPhoto ? (
                            <img
                              src={rec.checkInPhoto}
                              alt="Check-in"
                              className="w-7 h-7 rounded-full object-cover border-2 border-emerald-500 hover:scale-125 transition cursor-pointer shadow-sm"
                              title={`Ảnh Check-in (${checkInTimeStr})`}
                              onClick={() => {
                                setPhotoModalRecord(rec);
                                setPhotoModalType('IN');
                              }}
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full border-2 border-emerald-500/40 bg-neutral-800 text-emerald-400 flex items-center justify-center cursor-pointer"
                              title="Check-in photo"
                              onClick={() => {
                                setPhotoModalRecord(rec);
                                setPhotoModalType('IN');
                              }}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Thumbnail 2: Check-out photo */}
                          {rec.checkOutPhoto ? (
                            <img
                              src={rec.checkOutPhoto}
                              alt="Check-out"
                              className="w-7 h-7 rounded-full object-cover border-2 border-purple-500 hover:scale-125 transition cursor-pointer shadow-sm"
                              title={`Ảnh Check-out (${checkOutTimeStr})`}
                              onClick={() => {
                                setPhotoModalRecord(rec);
                                setPhotoModalType('OUT');
                              }}
                            />
                          ) : isInProgress ? (
                            <div
                              className="w-7 h-7 rounded-full border-2 border-neutral-700 bg-neutral-800/80 text-neutral-500 flex items-center justify-center cursor-not-allowed"
                              title="Chưa check-out (Đang trực ca)"
                            >
                              <Clock className="w-3.5 h-3.5 text-neutral-500 opacity-60" />
                            </div>
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full border-2 border-purple-500/40 bg-neutral-800 text-purple-400 flex items-center justify-center cursor-pointer"
                              title="Check-out photo"
                              onClick={() => {
                                setPhotoModalRecord(rec);
                                setPhotoModalType('OUT');
                              }}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Log Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rec.logType === 'ADMIN_MANUAL' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            ✏️ Admin tạo thủ công
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            📸 Camera POS
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-[180px] truncate dark:text-neutral-400 text-stone-600">
                        {rec.notes || '---'}
                      </td>

                      {/* Actions (Requirement 4: Quick Check-out button) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Checkout Button for shifts in progress */}
                          {isInProgress && (
                            <button
                              onClick={() => handleQuickCheckout(rec)}
                              disabled={quickCheckoutId === rec.id}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-md text-[10px] transition flex items-center gap-1 shadow cursor-pointer disabled:opacity-50"
                              title="Chốt giờ ra nhanh ngay bây giờ"
                            >
                              {quickCheckoutId === rec.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Clock className="w-3 h-3 stroke-[2.5]" />
                              )}
                              <span>Đóng ca nhanh</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Sửa thông tin chấm công"
                            className="p-1.5 dark:text-neutral-400 text-stone-600 hover:text-amber-400 dark:hover:bg-neutral-800 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 stroke-[1.75]" />
                          </button>
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            title="Xóa bản ghi"
                            className="p-1.5 dark:text-neutral-400 text-stone-600 hover:text-rose-500 dark:hover:bg-neutral-800 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.75]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CHECK-IN & CHECK-OUT PHOTO VERIFICATION (Requirement 2) */}
      {photoModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141820] border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span>Đối Soát Ảnh Xác Thực Khuôn Mặt Nhân Viên</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {photoModalRecord.staffName} • {photoModalRecord.branchName} • {photoModalRecord.date}
                </p>
              </div>
              <button
                onClick={() => setPhotoModalRecord(null)}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Side by side photo view */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-in photo box */}
              <div className="bg-[#0B0D11] p-3 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ảnh Check-in (Vào Ca)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {photoModalRecord.checkInTime
                      ? new Date(photoModalRecord.checkInTime).toLocaleTimeString('vi-VN')
                      : '---'}
                  </span>
                </div>
                {photoModalRecord.checkInPhoto ? (
                  <img
                    src={photoModalRecord.checkInPhoto}
                    alt="Check-in Photo"
                    className="w-full h-48 object-cover rounded-lg border border-neutral-800"
                  />
                ) : (
                  <div className="w-full h-48 bg-neutral-900 rounded-lg flex flex-col items-center justify-center text-neutral-500 text-xs italic">
                    <Camera className="w-8 h-8 opacity-40 mb-1" />
                    <span>Không có ảnh Check-in</span>
                  </div>
                )}
              </div>

              {/* Check-out photo box */}
              <div className="bg-[#0B0D11] p-3 rounded-xl border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Ảnh Check-out (Ra Ca)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {photoModalRecord.checkOutTime
                      ? new Date(photoModalRecord.checkOutTime).toLocaleTimeString('vi-VN')
                      : '🟡 Đang trực ca'}
                  </span>
                </div>
                {photoModalRecord.checkOutPhoto ? (
                  <img
                    src={photoModalRecord.checkOutPhoto}
                    alt="Check-out Photo"
                    className="w-full h-48 object-cover rounded-lg border border-neutral-800"
                  />
                ) : (
                  <div className="w-full h-48 bg-neutral-900 rounded-lg flex flex-col items-center justify-center text-neutral-500 text-xs italic">
                    <Clock className="w-8 h-8 opacity-40 mb-1" />
                    <span>{photoModalRecord.checkOutTime ? 'Không có ảnh' : 'Chưa check-out'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-end">
              <button
                onClick={() => setPhotoModalRecord(null)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM MỚI / CHỈNH SỬA BỔ SUNG CHẤM CÔNG */}
      {(showAddModal || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#141820] border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-amber-400" />
                <span>{editingRecord ? 'Chỉnh Sửa Bản Ghi Chấm Công' : 'Thêm Chấm Công Bổ Sung (Admin)'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRecord(null);
                }}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Staff Select */}
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Nhân Viên (*):</label>
                <select
                  disabled={!!editingRecord}
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-semibold focus:border-amber-500 focus:outline-none disabled:opacity-50"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Cơ Sở Trực (*):</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Ngày Làm Việc (*):</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-semibold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check In Time */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Giờ Vào (HH:mm):</label>
                  <input
                    type="time"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Check Out Time */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Giờ Ra (HH:mm):</label>
                  <input
                    type="time"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Trạng Thái Chấm Công:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ON_TIME">🟢 Đúng Giờ</option>
                    <option value="LATE">🟠 Đi Muộn</option>
                    <option value="EARLY_LEAVE">🔴 Về Sớm</option>
                    <option value="ABSENT">⚪ Nghỉ Không Phép</option>
                  </select>
                </div>
              </div>

              {/* Notes / Reason */}
              <div>
                <label className="block font-semibold text-amber-400 mb-1">
                  Ghi Chú / Lý Do Admin Bổ Sung (*):
                </label>
                <textarea
                  rows={3}
                  required
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ví dụ: Nhân viên bị hỏng xe báo Admin chấm bổ sung..."
                  className="w-full p-3 rounded-xl bg-[#0B0D11] border border-neutral-800 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold rounded-xl shadow-lg transition"
                >
                  {submitting ? 'Đang Lưu...' : editingRecord ? 'Lưu Thay Đổi' : 'Thêm Chấm Công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141820] border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Xác Nhận Xóa Bản Ghi</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Bạn có chắc chắn muốn xóa bản ghi chấm công này? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteRecord(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
              >
                Xóa Bản Ghi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
