'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getBranches } from '@/lib/store';
import { Branch } from '@/types/database';
import { UserRole, UserAccount, UserPermissions } from '@/types/auth';
import { 
  Users, UserPlus, Trash2, Shield, MapPin, CheckCircle2, 
  AlertCircle, KeyRound, Eye, Edit3, Lock, Check, X, Phone, 
  Mail, Calendar, Briefcase, Clock, Sparkles, UserCheck, ShieldAlert, Key,
  DollarSign, FileSpreadsheet, Download, AlertTriangle, Calculator,
  TrendingUp, Award, Layers, CheckSquare
} from 'lucide-react';

export default function UserManagementPage() {
  const { user, accounts, addUserAccount, updateUserAccount, deleteUserAccount } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);

  // Navigation Tab State: USERS | ATTENDANCE | PAYROLL
  const [activeTab, setActiveTab] = useState<'USERS' | 'ATTENDANCE' | 'PAYROLL'>('USERS');

  // Create Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [branchId, setBranchId] = useState('');
  const [createPermissions, setCreatePermissions] = useState<UserPermissions>({
    can_view_revenue: true,
    can_create_expense: true,
    can_cancel_order: false,
    can_edit_price: false
  });

  // Modals & Selected Account
  const [activeModal, setActiveModal] = useState<'VIEW' | 'EDIT' | 'PASSWORD' | 'DELETE' | null>(null);
  const [profileSubTab, setProfileSubTab] = useState<'INFO' | 'SALARY_CONFIG' | 'KPI' | 'CASH_AUDIT'>('INFO');
  const [selectedAcc, setSelectedAcc] = useState<(UserAccount & { password?: string }) | null>(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    role: 'OPERATOR' as UserRole,
    branch_id: '',
    branch_name: '',
    new_password: '',
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED',
    hourly_rate: 25000,
    monthly_salary: 7500000,
    commission_per_order: 2000,
    permissions: {
      can_view_revenue: false,
      can_create_expense: true,
      can_cancel_order: false,
      can_edit_price: false
    }
  });

  // Quick Password Form State
  const [quickPassword, setQuickPassword] = useState('');

  // Payroll Filter State
  const [payrollMonth, setPayrollMonth] = useState('2026-09');

  // Toast / Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const bList = getBranches();
    setBranches(bList);
    if (bList.length > 0) setBranchId(bList[0].id);
  }, []);

  const showToast = (m: string) => {
    setToastMessage(m);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Truy Cập Bị Từ Chối</h2>
          <p className="text-xs text-slate-600">Trang quản lý nhân sự chỉ dành riêng cho Admin Tối Cao.</p>
        </div>
      </div>
    );
  }

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim() || !name.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin nhân viên');
      return;
    }

    if (accounts.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setErrorMsg('Tên đăng nhập này đã tồn tại trong hệ thống');
      return;
    }

    const selectedBranch = branches.find((b) => b.id === branchId);

    addUserAccount({
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      phone: phone.trim() || '0988.xxx.xxx',
      role,
      status: 'ACTIVE',
      branch_id: role === 'BRANCH_STAFF' ? branchId : undefined,
      branch_name: role === 'BRANCH_STAFF' ? selectedBranch?.name : 'Toàn Chuỗi / Tất Cả',
      email: `${username.trim().toLowerCase()}@gaumuoismart.vn`,
      dob: '15/05/1996',
      id_card: '001096009999',
      position: role === 'SUPER_ADMIN' ? 'Admin Tối Cao' : role === 'OPERATOR' ? 'Tổng Đài Lên Đơn' : 'Thu Ngân / Bếp',
      date_joined: new Date().toLocaleDateString('vi-VN'),
      orders_count: 0,
      shifts_count: 0,
      hourly_rate: 25000,
      commission_per_order: 2000,
      permissions: createPermissions
    });

    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    showToast(`Đã tạo thành công tài khoản "${username.trim()}" (${role})`);
  };

  // Open View Profile Modal
  const openViewModal = (acc: UserAccount & { password?: string }) => {
    setSelectedAcc(acc);
    setProfileSubTab('INFO');
    setActiveModal('VIEW');
  };

  // Open Edit Modal
  const openEditModal = (acc: UserAccount & { password?: string }) => {
    setSelectedAcc(acc);
    setEditFormData({
      name: acc.name,
      phone: acc.phone || '',
      role: acc.role,
      branch_id: acc.branch_id || (branches.length > 0 ? branches[0].id : ''),
      branch_name: acc.branch_name || 'Toàn Chuỗi / Tất Cả',
      new_password: '',
      status: acc.status || 'ACTIVE',
      hourly_rate: acc.hourly_rate || 25000,
      monthly_salary: acc.monthly_salary || 7500000,
      commission_per_order: acc.commission_per_order || 2000,
      permissions: acc.permissions || {
        can_view_revenue: acc.role === 'SUPER_ADMIN' || acc.role === 'OPERATOR',
        can_create_expense: true,
        can_cancel_order: acc.role === 'SUPER_ADMIN',
        can_edit_price: acc.role === 'SUPER_ADMIN'
      }
    });
    setActiveModal('EDIT');
  };

  // Submit Edit Form
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc || !editFormData.name.trim()) return;

    const selectedBranch = branches.find(b => b.id === editFormData.branch_id);

    updateUserAccount(selectedAcc.id, {
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim(),
      role: editFormData.role,
      status: editFormData.status,
      hourly_rate: Number(editFormData.hourly_rate),
      monthly_salary: Number(editFormData.monthly_salary),
      commission_per_order: Number(editFormData.commission_per_order),
      permissions: editFormData.permissions,
      branch_id: editFormData.role === 'BRANCH_STAFF' ? editFormData.branch_id : undefined,
      branch_name: editFormData.role === 'BRANCH_STAFF' ? selectedBranch?.name : 'Toàn Chuỗi / Tất Cả',
      password: editFormData.new_password.trim() ? editFormData.new_password.trim() : undefined
    });

    setActiveModal(null);
    showToast(`Đã lưu cập nhật thông tin tài khoản "${selectedAcc.username}"`);
  };

  // Open Quick Password Reset Modal
  const openPasswordModal = (acc: UserAccount & { password?: string }) => {
    setSelectedAcc(acc);
    setQuickPassword('');
    setActiveModal('PASSWORD');
  };

  // Submit Quick Password Reset
  const handleSaveQuickPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcc || !quickPassword.trim()) return;

    updateUserAccount(selectedAcc.id, {
      password: quickPassword.trim()
    });

    setActiveModal(null);
    showToast(`Đã cấp lại mật khẩu mới cho tài khoản "${selectedAcc.username}"`);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (acc: UserAccount & { password?: string }) => {
    if (acc.username === user?.username || acc.username === 'admin') {
      showToast('⚠️ Không thể tự xóa tài khoản Super Admin đang đăng nhập!');
      return;
    }
    setSelectedAcc(acc);
    setActiveModal('DELETE');
  };

  // Confirm Delete User
  const handleConfirmDelete = () => {
    if (!selectedAcc) return;
    deleteUserAccount(selectedAcc.id);
    setActiveModal(null);
    showToast(`Đã xóa tài khoản "${selectedAcc.username}" khỏi hệ thống`);
  };

  // Helper Initials Avatar
  const getInitials = (fullName: string) => {
    if (!fullName) return 'NV';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Mock Shift Attendance Dataset (Tab 2)
  const mockAttendanceList = [
    {
      id: 'att-1',
      staffName: 'Nguyễn Văn Đức',
      branchName: 'CƠ SỞ VIN SMART CITY',
      date: '04/09/2026',
      openedAt: '07:00',
      closedAt: '15:30',
      totalHours: 8.5,
      status: '🟢 Đúng giờ',
      note: 'Mở ca đúng giờ, bàn giao đủ két'
    },
    {
      id: 'att-2',
      staffName: 'Hoàng Văn Nam',
      branchName: 'Chi Nhánh Cầu Giấy',
      date: '03/09/2026',
      openedAt: '15:00',
      closedAt: '23:00',
      totalHours: 8.0,
      status: '🟢 Đúng giờ',
      note: 'Ca tối cao điểm, doanh thu đạt KPI'
    },
    {
      id: 'att-3',
      staffName: 'Nguyễn Văn Admin',
      branchName: 'Chi Nhánh Đống Đa',
      date: '02/09/2026',
      openedAt: '07:15',
      closedAt: '15:15',
      totalHours: 8.0,
      status: '🟡 Vào muộn 15p',
      note: 'Hỗ trợ kiểm kê đầu ngày'
    },
    {
      id: 'att-4',
      staffName: 'Trần Thị Tổng Đài',
      branchName: 'Trung Tâm Điều Phối',
      date: '04/09/2026',
      openedAt: '08:00',
      closedAt: '17:00',
      totalHours: 9.0,
      status: '🟢 Đúng giờ',
      note: 'Trực tổng đài xử lý 85 đơn hàng'
    },
    {
      id: 'att-5',
      staffName: 'Phạm Thị Cơ Sở 2',
      branchName: 'Chi Nhánh Quận 3 (TP.HCM)',
      date: '03/09/2026',
      openedAt: '08:00',
      closedAt: '16:30',
      totalHours: 8.5,
      status: '🟢 Đúng giờ',
      note: 'Phát sinh lệch nhẹ két 20.000đ'
    }
  ];

  // Mock Payroll Dataset (Tab 3)
  const mockPayrollList = useMemo(() => {
    return accounts.map((acc) => {
      const hourly = acc.hourly_rate || (acc.role === 'SUPER_ADMIN' ? 40000 : acc.role === 'OPERATOR' ? 28000 : 25000);
      const hoursWorked = acc.role === 'SUPER_ADMIN' ? 180 : acc.role === 'OPERATOR' ? 168 : 160;
      const baseSalary = hourly * hoursWorked;
      const commissionRate = acc.commission_per_order || (acc.role === 'OPERATOR' ? 2000 : 1500);
      const orders = acc.orders_count || (acc.role === 'SUPER_ADMIN' ? 350 : acc.role === 'OPERATOR' ? 280 : 120);
      const commissionAmount = orders * commissionRate;
      const cashPenalty = acc.role === 'BRANCH_STAFF' && acc.username === 'chinhanh2' ? 50000 : 0;
      const kpiBonus = acc.role === 'OPERATOR' ? 500000 : acc.role === 'SUPER_ADMIN' ? 1000000 : 300000;
      const netPayroll = baseSalary + commissionAmount + kpiBonus - cashPenalty;

      return {
        id: acc.id,
        name: acc.name,
        username: acc.username,
        role: acc.role,
        branch_name: acc.branch_name || 'Toàn Chuỗi / Tất Cả',
        hourly,
        hoursWorked,
        baseSalary,
        orders,
        commissionRate,
        commissionAmount,
        cashPenalty,
        kpiBonus,
        netPayroll
      };
    });
  }, [accounts]);

  // Export Payroll CSV Handler
  const handleExportPayrollCSV = () => {
    const headers = [
      'STT', 'Họ & Tên Nhân Viên', 'Username', 'Chức Vụ', 'Chi Nhánh',
      'Định Mức (đ/h)', 'Giờ Công (Giờ)', 'Lương Cứng (VNĐ)', 'Số Đơn KPI',
      'Hoa Hồng (VNĐ)', 'Phạt Lệch Két (VNĐ)', 'Thưởng KPI (VNĐ)', 'TỔNG THU NHẬP TẠM TÍNH (VNĐ)'
    ];

    const rows = mockPayrollList.map((p, idx) => [
      idx + 1,
      `"${p.name}"`,
      `"${p.username}"`,
      `"${p.role}"`,
      `"${p.branch_name}"`,
      p.hourly,
      p.hoursWorked,
      p.baseSalary,
      p.orders,
      p.commissionAmount,
      p.cashPenalty,
      p.kpiBonus,
      p.netPayroll
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bang_luong_nhan_su_thang_${payrollMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce border border-slate-700">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header Banner & Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3.5 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 shrink-0">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  Quản Lý Nhân Sự &amp; Phân Quyền F&amp;B
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {accounts.length} Tài khoản
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chấm công tự động từ ca làm việc, tính lương &amp; hoa hồng KPI, ma trận phân quyền nâng cao.
                </p>
              </div>
            </div>
          </div>

          {/* 3 TOP NAVIGATION TABS */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => setActiveTab('USERS')}
              className={`px-4 py-2 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'USERS'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Danh Sách Tài Khoản &amp; Nhân Sự</span>
            </button>

            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`px-4 py-2 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>2. Bảng Chấm Công &amp; Giờ Làm</span>
            </button>

            <button
              onClick={() => setActiveTab('PAYROLL')}
              className={`px-4 py-2 rounded-xl font-extrabold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'PAYROLL'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>3. Bảng Tính Lương &amp; Hoa Hồng KPI</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DANH SÁCH TÀI KHOẢN & PHÂN QUYỀN (FULL CRUD) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'USERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column (lg:col-span-4): Form Cấp Tài Khoản Mới */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 self-start">
              <h2 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-700" /> Cấp Tài Khoản Mới
              </h2>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Họ &amp; Tên Nhân Viên *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn C"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Số Điện Thoại Nhân Viên *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0988.123.456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Tên Đăng Nhập (Username) *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ví dụ: chinhanh3, tongdai2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-purple-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Mật Khẩu (Password) *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Vai Trò / Phân Quyền (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="OPERATOR">☎️ Tổng Đài Lên Đơn (Operator)</option>
                    <option value="BRANCH_STAFF">🏪 Nhân Viên Chi Nhánh / Bếp (Branch Staff)</option>
                    <option value="SUPER_ADMIN">👑 Admin Tối Cao (Super Admin)</option>
                  </select>
                </div>

                {role === 'BRANCH_STAFF' ? (
                  <div className="space-y-1 p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                    <label className="block text-purple-900 font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" /> Gán Chi Nhánh Trực Thuộc
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          🏢 {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-[11px] font-medium">
                    🌐 Phạm vi hoạt động: <strong className="text-slate-700 font-bold">Toàn Chuỗi / Tất Cả Cơ Sở</strong>
                  </div>
                )}

                {/* MA TRẬN PHÂN QUYỀN BỔ SUNG (ADVANCED PERMISSION CHECKBOXES) */}
                <div className="space-y-2 p-3 bg-purple-50/40 rounded-xl border border-purple-200/60 text-slate-800">
                  <label className="font-bold flex items-center gap-1.5 text-purple-900">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> Quyền hạn bổ sung (Advanced Permissions)
                  </label>
                  <div className="space-y-1.5 pt-1 text-[11px] font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createPermissions.can_view_revenue}
                        onChange={(e) => setCreatePermissions({ ...createPermissions, can_view_revenue: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Được xem Doanh thu &amp; Lợi nhuận</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createPermissions.can_create_expense}
                        onChange={(e) => setCreatePermissions({ ...createPermissions, can_create_expense: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Được tạo phiếu Chi tiêu tiền mặt</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createPermissions.can_cancel_order}
                        onChange={(e) => setCreatePermissions({ ...createPermissions, can_cancel_order: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Được phép Hủy đơn hàng đã tạo</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createPermissions.can_edit_price}
                        onChange={(e) => setCreatePermissions({ ...createPermissions, can_edit_price: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Được phép Đổi giá bán trên Menu</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-extrabold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cấp Tài Khoản Mới</span>
                </button>
              </form>
            </div>

            {/* Right Column (lg:col-span-8): User Accounts Table */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-700" /> Danh Sách Tài Khoản Nội Bộ ({accounts.length})
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  Click vào biểu tượng thao tác để Xem, Sửa hoặc Đổi mật khẩu
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                    <tr>
                      <th className="px-4 py-3">Nhân Viên</th>
                      <th className="px-3 py-3">Username</th>
                      <th className="px-3 py-3">Vai Trò</th>
                      <th className="px-4 py-3">Chi Nhánh Phụ Trách</th>
                      <th className="px-3 py-3 text-center">Trạng Thái</th>
                      <th className="px-4 py-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => {
                      const initials = getInitials(acc.name);
                      const isLocked = acc.status === 'LOCKED';

                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                          {/* Column 1: Staff Avatar & Info */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 text-purple-800 font-black flex items-center justify-center text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block leading-snug">{acc.name}</span>
                                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" /> {acc.phone || '0988.xxx.xxx'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Username */}
                          <td className="px-3 py-3.5">
                            <span className="font-mono font-extrabold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              {acc.username}
                            </span>
                          </td>

                          {/* Column 3: Role Badge */}
                          <td className="px-3 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              acc.role === 'SUPER_ADMIN' 
                                ? 'bg-purple-50 text-purple-800 border-purple-200' 
                                : acc.role === 'OPERATOR' 
                                ? 'bg-sky-50 text-sky-800 border-sky-200' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {acc.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : acc.role === 'OPERATOR' ? 'TỔNG ĐÀI' : 'CHI NHÁNH'}
                            </span>
                          </td>

                          {/* Column 4: Assigned Branch */}
                          <td className="px-4 py-3.5 font-semibold text-slate-700">
                            {acc.branch_name || 'Toàn Chuỗi / Tất Cả'}
                          </td>

                          {/* Column 5: Account Status */}
                          <td className="px-3 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              isLocked 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {isLocked ? '🔴 Tạm Khóa' : '🟢 Hoạt Động'}
                            </span>
                          </td>

                          {/* Column 6: Action Buttons */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Detail Icon */}
                              <button
                                onClick={() => openViewModal(acc)}
                                title="Xem chi tiết hồ sơ & KPI"
                                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Icon */}
                              <button
                                onClick={() => openEditModal(acc)}
                                title="Chỉnh sửa thông tin &amp; phân quyền"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Reset Password Icon */}
                              <button
                                onClick={() => openPasswordModal(acc)}
                                title="Đổi / Cấp lại mật khẩu"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Delete Icon */}
                              {acc.username !== 'admin' && acc.username !== user?.username && (
                                <button
                                  onClick={() => openDeleteModal(acc)}
                                  title="Xóa tài khoản"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: BẢNG CHẤM CÔNG & GIỜ LÀM (ATTENDANCE FROM SHIFTS) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'ATTENDANCE' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Bảng Chấm Công &amp; Giờ Làm Tự Động Từ Ca Vận Hành
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu giờ vào/giờ ra được tổng hợp tự động từ mỗi phiếu Mở ca và Đóng ca POS.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
                {mockAttendanceList.length} Lượt chấm công
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-3">Tên Nhân Viên</th>
                    <th className="px-4 py-3">Cơ Sở Trực Thuộc</th>
                    <th className="px-3 py-3 text-center">Ngày Làm</th>
                    <th className="px-3 py-3 text-center">Giờ Vào (Mở ca)</th>
                    <th className="px-3 py-3 text-center">Giờ Ra (Đóng ca)</th>
                    <th className="px-3 py-3 text-center">Tổng Số Giờ Làm</th>
                    <th className="px-3 py-3 text-center">Trạng Thái</th>
                    <th className="px-4 py-3">Ghi Chú Ca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockAttendanceList.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{att.staffName}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{att.branchName}</td>
                      <td className="px-3 py-3.5 text-center font-bold text-slate-800">{att.date}</td>
                      <td className="px-3 py-3.5 text-center font-semibold text-slate-600">{att.openedAt}</td>
                      <td className="px-3 py-3.5 text-center font-semibold text-slate-600">{att.closedAt}</td>
                      <td className="px-3 py-3.5 text-center font-extrabold text-purple-800 bg-purple-50/50">
                        {att.totalHours} giờ
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {att.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-medium italic">{att.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: BẢNG TÍNH LƯƠNG & HOA HỒNG KPI (PAYROLL) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'PAYROLL' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Bảng Tính Lương &amp; Thưởng Hoa Hồng KPI Nhân Sự
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lương cứng (giờ/tháng) + Hoa hồng đơn hàng (KPI) - Phạt lệch két (nếu có) = Tổng thu nhập tạm tính.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none"
                >
                  <option value="2026-09">🗓️ Tháng 09/2026</option>
                  <option value="2026-08">🗓️ Tháng 08/2026</option>
                </select>

                <button
                  onClick={handleExportPayrollCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Bảng Lương Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-3">Nhân Viên</th>
                    <th className="px-3 py-3 text-right">Định Mức Lương</th>
                    <th className="px-3 py-3 text-center">Giờ Công</th>
                    <th className="px-4 py-3 text-right">Lương Cứng</th>
                    <th className="px-4 py-3 text-right">Hoa Hồng KPI</th>
                    <th className="px-3 py-3 text-right text-rose-600">Phạt Lệch Két</th>
                    <th className="px-3 py-3 text-right text-emerald-700">Thưởng Hiệu Suất</th>
                    <th className="px-4 py-3 text-right bg-emerald-50/50 font-black text-emerald-900">
                      TỔNG THU NHẬP TẠM TÍNH
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockPayrollList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-extrabold text-slate-900 block leading-snug">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">@{p.username} • {p.branch_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium text-slate-600">
                        {p.hourly.toLocaleString('vi-VN')}đ/h
                      </td>
                      <td className="px-3 py-3.5 text-center font-extrabold text-slate-800">
                        {p.hoursWorked} giờ
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {p.baseSalary.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-sky-700">
                        +{p.commissionAmount.toLocaleString('vi-VN')}đ
                        <span className="block text-[10px] text-slate-400 font-normal">({p.orders} đơn × {p.commissionRate}đ)</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-rose-600">
                        {p.cashPenalty > 0 ? `-${p.cashPenalty.toLocaleString('vi-VN')}đ` : '0đ'}
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-emerald-700">
                        +{p.kpiBonus.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-sm text-emerald-800 bg-emerald-50/30">
                        {p.netPayroll.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CHI TIẾT HỒ SƠ NHÂN SỰ & KPI (DRAWER 4 TABS) */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'VIEW' && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black text-base flex items-center justify-center border border-purple-200 shrink-0">
                  {getInitials(selectedAcc.name)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedAcc.name}</h3>
                  <span className="font-mono text-xs text-purple-700 font-bold">@{selectedAcc.username}</span>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs Navigation for Staff Profile Drawer */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-xs">
              <button
                onClick={() => setProfileSubTab('INFO')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  profileSubTab === 'INFO' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                1. Thông tin chung
              </button>
              <button
                onClick={() => setProfileSubTab('SALARY_CONFIG')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  profileSubTab === 'SALARY_CONFIG' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2. Lương &amp; Thưởng
              </button>
              <button
                onClick={() => setProfileSubTab('KPI')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  profileSubTab === 'KPI' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                3. Hiệu suất KPI
              </button>
              <button
                onClick={() => setProfileSubTab('CASH_AUDIT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  profileSubTab === 'CASH_AUDIT' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                4. Lịch sử két tiền
              </button>
            </div>

            {/* Tab 1 Content: Thông tin chung */}
            {profileSubTab === 'INFO' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <span className="font-bold text-slate-900 text-[11px] block border-b border-slate-200/60 pb-1">
                    🪪 Thông tin định danh &amp; Liên hệ:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p><span className="text-slate-400">SĐT:</span> <strong className="text-slate-800">{selectedAcc.phone || '0988.123.456'}</strong></p>
                    <p><span className="text-slate-400">Email:</span> <strong className="text-slate-800">{selectedAcc.email || 'nhansu@gaumuoismart.vn'}</strong></p>
                    <p><span className="text-slate-400">Ngày sinh:</span> <strong className="text-slate-800">{selectedAcc.dob || '08/04/1995'}</strong></p>
                    <p><span className="text-slate-400">CCCD:</span> <strong className="text-slate-800">{selectedAcc.id_card || '001095001234'}</strong></p>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-xl space-y-2 border border-purple-100">
                  <span className="font-bold text-purple-900 text-[11px] block border-b border-purple-200/60 pb-1">
                    🏢 Vị trí làm việc &amp; Phân quyền:
                  </span>
                  <div className="space-y-1 text-slate-800 font-medium">
                    <p>• Chức vụ: <strong className="text-purple-900">{selectedAcc.position || 'Nhân viên vận hành'}</strong></p>
                    <p>• Trực thuộc: <strong className="text-slate-900">{selectedAcc.branch_name || 'Toàn Chuỗi / Tất Cả'}</strong></p>
                    <p>• Ngày vào làm: <strong className="text-slate-700">{selectedAcc.date_joined || '01/01/2025'}</strong></p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Cấu hình lương thưởng */}
            {profileSubTab === 'SALARY_CONFIG' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50/50 rounded-xl space-y-2 border border-emerald-100">
                  <span className="font-bold text-emerald-900 text-[11px] block border-b border-emerald-200/60 pb-1">
                    💵 Định Mức Lương &amp; Thưởng KPI:
                  </span>
                  <div className="space-y-2">
                    <p>• Lương cứng theo giờ: <strong className="text-emerald-800 font-extrabold">{(selectedAcc.hourly_rate || 25000).toLocaleString('vi-VN')} đ/giờ</strong></p>
                    <p>• Hoa hồng thưởng/đơn hoàn thành: <strong className="text-sky-800 font-extrabold">{(selectedAcc.commission_per_order || 2000).toLocaleString('vi-VN')} đ/đơn</strong></p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 Content: Hiệu suất KPI */}
            {profileSubTab === 'KPI' && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Tổng đơn đã xử lý</span>
                  <p className="text-base font-extrabold text-purple-800 mt-0.5">{selectedAcc.orders_count || 320} đơn</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Doanh số mang lại</span>
                  <p className="text-base font-extrabold text-emerald-800 mt-0.5">45.2Mđ</p>
                </div>

                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Số giờ công tháng này</span>
                  <p className="text-base font-extrabold text-sky-800 mt-0.5">160 giờ</p>
                </div>
              </div>
            )}

            {/* Tab 4 Content: Lịch sử chênh lệch tiền két */}
            {profileSubTab === 'CASH_AUDIT' && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 text-[11px] block">Lịch sử bàn giao két ca làm việc:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Ca 1 (04/09/2026) - Cơ sở Smart City</span>
                    <span className="text-emerald-600 font-extrabold">0đ (Khớp két 100%)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Ghi chú: Bàn giao két đủ 211.000đ</p>
                </div>
                {selectedAcc.username === 'chinhanh2' && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5 text-rose-900">
                    <div className="flex justify-between font-bold">
                      <span>Ca 2 (03/09/2026) - Cơ sở Q3</span>
                      <span className="text-rose-600 font-extrabold">-50.000đ (Thối nhầm)</span>
                    </div>
                    <p className="text-[11px] text-rose-700">Khấu trừ lương vào kỳ tính lương tháng 09</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CHỈNH SỬA & CẤP LẠI MẬT KHẨU (WITH PERMISSIONS) */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'EDIT' && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Sửa Hồ Sơ &amp; Phân Quyền: {selectedAcc.name}
                  </h3>
                  <p className="text-xs text-slate-500">Tài khoản: @{selectedAcc.username}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Họ &amp; Tên nhân viên *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="0988.xxx.xxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Vai trò / Phân quyền</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                  >
                    <option value="OPERATOR">☎️ Tổng Đài Lên Đơn (Operator)</option>
                    <option value="BRANCH_STAFF">🏪 Nhân Viên Chi Nhánh (Branch Staff)</option>
                    <option value="SUPER_ADMIN">👑 Admin Tối Cao (Super Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Trạng thái tài khoản</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                  >
                    <option value="ACTIVE">🟢 Hoạt động bình thường</option>
                    <option value="LOCKED">🔴 Tạm khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* Salary Configuration Inputs */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900">Lương cứng (đ/giờ)</label>
                  <input
                    type="number"
                    value={editFormData.hourly_rate}
                    onChange={(e) => setEditFormData({ ...editFormData, hourly_rate: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-900">Thưởng/Đơn (đ/đơn)</label>
                  <input
                    type="number"
                    value={editFormData.commission_per_order}
                    onChange={(e) => setEditFormData({ ...editFormData, commission_per_order: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold outline-none"
                  />
                </div>
              </div>

              {/* Custom Permissions Matrix */}
              <div className="space-y-2 p-3 bg-purple-50/40 rounded-xl border border-purple-200/60 text-slate-800">
                <label className="font-bold flex items-center gap-1.5 text-purple-900">
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> Ma trận phân quyền bổ sung
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-medium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.can_view_revenue}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        permissions: { ...editFormData.permissions, can_view_revenue: e.target.checked }
                      })}
                      className="rounded text-purple-600"
                    />
                    <span>Được xem Doanh thu</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.can_create_expense}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        permissions: { ...editFormData.permissions, can_create_expense: e.target.checked }
                      })}
                      className="rounded text-purple-600"
                    />
                    <span>Được tạo phiếu Chi</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.can_cancel_order}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        permissions: { ...editFormData.permissions, can_cancel_order: e.target.checked }
                      })}
                      className="rounded text-purple-600"
                    />
                    <span>Được Hủy đơn hàng</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.can_edit_price}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        permissions: { ...editFormData.permissions, can_edit_price: e.target.checked }
                      })}
                      className="rounded text-purple-600"
                    />
                    <span>Được Đổi giá Menu</span>
                  </label>
                </div>
              </div>

              {/* Reset Password Field */}
              <div className="space-y-1 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                <label className="font-bold text-amber-900 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-600" /> Đổi Mật Khẩu Mới (Reset Password)
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới (bỏ trống nếu giữ nguyên)"
                  value={editFormData.new_password}
                  onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: ĐỔI NHANH MẬT KHẨU */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'PASSWORD' && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-600">
              <Key className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-slate-900">Cấp Lại Mật Khẩu Nhanh</h3>
            </div>

            <p className="text-xs text-slate-600">
              Tài khoản: <strong className="text-slate-900 font-bold">@{selectedAcc.username}</strong> ({selectedAcc.name})
            </p>

            <form onSubmit={handleSaveQuickPassword} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: XÁC NHẬN XÓA TÀI KHOẢN */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'DELETE' && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Xóa Tài Khoản Nhân Viên</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản <strong className="text-slate-900">@{selectedAcc.username}</strong> ({selectedAcc.name}) khỏi hệ thống không?
            </p>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
              >
                Xóa Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
