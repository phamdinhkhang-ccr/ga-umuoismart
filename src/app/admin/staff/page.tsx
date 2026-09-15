'use client';

import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Key,
  Shield,
  UserCheck,
  UserX,
  Building2,
  Phone,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Dices,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface StaffUser {
  id: string;
  staffCode: string;
  name: string;
  username: string;
  phone?: string | null;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'TELESALES' | string;
  branchId?: string | null;
  branchIds?: string[];
  branch?: Branch | null;
  avatar?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar: '',
    branchId: 'cs1',
    branchIds: [] as string[],
    role: 'CASHIER',
    username: '',
    password: '',
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStaff, setResetStaff] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Toggling status tracking ID
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (branchFilter !== 'ALL') params.append('branchId', branchFilter);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const [resStaff, resBranch] = await Promise.all([
        fetch(`/api/staff?${params.toString()}`),
        fetch('/api/branches'),
      ]);

      const dataStaff = await resStaff.json();
      const dataBranch = await resBranch.json();

      if (dataStaff.success) {
        setStaffList(dataStaff.staff || []);
        if (dataStaff.counts) setCounts(dataStaff.counts);
      }

      if (dataBranch.success) {
        setBranches(dataBranch.branches || []);
      }
    } catch (err) {
      console.error('Error loading staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [search, branchFilter, roleFilter, statusFilter]);

  // Random Password Generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let pass = 'GaMuoi@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
      branchId: branches.length > 0 ? branches[0].id : 'cs1',
      branchIds: branches.map((b) => b.id),
      role: 'CASHIER',
      username: '',
      password: generateRandomPassword(),
      isActive: true,
    });
    setShowPassword(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    const assignedIds = staff.branchIds && staff.branchIds.length > 0
      ? staff.branchIds
      : (staff.branchId ? [staff.branchId] : []);
    setFormData({
      name: staff.name,
      phone: staff.phone || '',
      avatar: staff.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
      branchId: staff.branchId || (branches.length > 0 ? branches[0].id : 'cs1'),
      branchIds: assignedIds,
      role: staff.role,
      username: staff.username,
      password: '', // Leave blank unless changing password
      isActive: staff.isActive,
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert('Vui lòng điền đầy đủ Họ tên và Tên đăng nhập');
      return;
    }

    if (!editingStaff && !formData.password) {
      alert('Vui lòng nhập Mật khẩu cho tài khoản mới');
      return;
    }

    setSaving(true);
    const method = editingStaff ? 'PUT' : 'POST';
    const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchStaffData();
      } else {
        alert(data.error || 'Lỗi lưu tài khoản nhân viên');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (staff: StaffUser) => {
    setTogglingId(staff.id);
    try {
      const res = await fetch(`/api/staff/${staff.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staff.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, isActive: !s.isActive } : s))
        );
      } else {
        alert(data.error || 'Lỗi cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    } finally {
      setTogglingId(null);
    }
  };

  // Password Reset Handler
  const handleOpenResetPassword = (staff: StaffUser) => {
    setResetStaff(staff);
    setNewPassword(generateRandomPassword());
    setResetModalOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff || !newPassword.trim()) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/staff/${resetStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Đã cấp lại mật khẩu thành công cho ${resetStaff.name}!\nMật khẩu mới: ${newPassword}`);
        setResetModalOpen(false);
      } else {
        alert(data.error || 'Lỗi reset mật khẩu');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setResetting(false);
    }
  };

  // Delete Staff
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchStaffData();
      } else {
        alert(data.error || 'Xóa nhân viên thất bại');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    const exportData = staffList.map((s) => ({
      'Mã Nhân Viên': s.staffCode,
      'Họ và Tên': s.name,
      'Tên Đăng Nhập': s.username,
      'Số Điện Thoại': s.phone || 'Chưa cập nhật',
      'Vai Trò / Chức Vụ': s.role,
      'Cơ Sở Làm Việc': s.branch?.name || 'Toàn Hệ Thống',
      'Trạng Thái': s.isActive ? '🟢 Đang làm việc' : '🔴 Đã nghỉ / Khóa',
      'Ngày Tạo': new Date(s.createdAt).toLocaleDateString('vi-VN'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Nhân Sự');
    XLSX.writeFile(workbook, `Danh_Sach_Nhan_Su_Ga_U_Muoi_Smart_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const roleBadgeMap: Record<string, { label: string; color: string; desc: string }> = {
    ADMIN: { label: '🔴 ADMIN', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', desc: 'Toàn quyền' },
    MANAGER: { label: '🟣 MANAGER', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', desc: 'Quản lý cơ sở' },
    TELESALES: { label: '🟧 TELESALES', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', desc: 'Tổng đài viên' },
    CASHIER: { label: '🔵 CASHIER', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', desc: 'Thu ngân POS' },
    STAFF: { label: '⚪ STAFF', color: 'bg-neutral-800 text-neutral-300 border-neutral-700', desc: 'Bếp / Nhân viên' },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. HEADER & THAO TÁC TRÊN CÙNG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-amber-400">
              <UserPlus className="w-5 h-5 stroke-[2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAFAF9] tracking-tight">
              Quản Lý Đội Ngũ Nhân Sự & Tài Khoản
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              {counts.total} Nhân viên
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Cấp tài khoản đăng nhập POS, phân quyền theo vai trò và gán chi nhánh làm việc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-emerald-500/30 rounded-xs text-xs font-bold transition flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-extrabold text-xs rounded-xs shadow-md transition flex items-center gap-2 uppercase tracking-wide shrink-0"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Thêm Nhân Viên & Cấp Tài Khoản</span>
          </button>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC TÌM KIẾM ĐA CHIỀU */}
      <div className="bg-[#14171D] p-4 rounded-xs border border-neutral-800 space-y-3.5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT, mã NV (#NV-0102), username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">🏪 Tất cả chi nhánh làm việc</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">🛡️ Tất cả vai trò hệ thống</option>
              <option value="ADMIN">ADMIN (Quản Trị Hệ Thống)</option>
              <option value="MANAGER">MANAGER (Quản Lý Cơ Sở)</option>
              <option value="TELESALES">TELESALES (Tổng Đài Viên / Call Center)</option>
              <option value="CASHIER">CASHIER (Thu Ngân POS)</option>
              <option value="STAFF">STAFF (Bếp / Nhân Viên)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between border-t border-neutral-800/80 pt-3 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 mr-1">Trạng thái:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-xs transition ${
                statusFilter === 'ALL'
                  ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tất cả ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              🟢 Đang làm việc ({counts.active})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'text-neutral-400 hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              🔴 Đã nghỉ / Khóa ({counts.inactive})
            </button>
          </div>

          <button
            onClick={() => {
              setSearch('');
              setBranchFilter('ALL');
              setRoleFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="p-1.5 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-xs transition text-xs flex items-center gap-1"
            title="Reset Bộ Lọc"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH NHÂN SỰ & TÀI KHOẢN (STAFF TABLE) */}
      <div className="bg-[#14171D] rounded-xs border border-neutral-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Đang tải danh sách nhân sự...</div>
        ) : staffList.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm italic">
            Không tìm thấy nhân viên nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0B0D11] border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">MÃ NV & HỌ TÊN</th>
                  <th className="py-3.5 px-4">TÀI KHOẢN ĐĂNG NHẬP</th>
                  <th className="py-3.5 px-4">CƠ SỞ LÀM VIỆC</th>
                  <th className="py-3.5 px-4">VAI TRÒ / CHỨC VỤ</th>
                  <th className="py-3.5 px-4">LIÊN HỆ</th>
                  <th className="py-3.5 px-4 text-center">TRẠNG THÁI TÀI KHOẢN</th>
                  <th className="py-3.5 px-4 text-right pr-6">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-medium text-neutral-200">
                {staffList.map((s) => {
                  const roleBadge = roleBadgeMap[s.role] || roleBadgeMap['STAFF'];
                  return (
                    <tr key={s.id} className="hover:bg-neutral-900/60 transition-colors">
                      {/* Mã NV & Họ Tên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'}
                            alt={s.name}
                            className="w-9 h-9 rounded-full object-cover border border-neutral-700 shrink-0"
                          />
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-sm text-[#FAFAF9] block">
                              {s.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-xs bg-neutral-800 text-amber-400 border border-neutral-700">
                              {s.staffCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tài khoản đăng nhập */}
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                        {s.username}
                      </td>

                      {/* Cơ sở làm việc */}
                      <td className="py-3.5 px-4">
                        {s.role === 'ADMIN' || s.role === 'TELESALES' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Building2 className="w-3 h-3 text-amber-400" />
                            Toàn Hệ Thống ({branches.length || 6} CS)
                          </span>
                        ) : s.branchIds && s.branchIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {s.branchIds.map((bId) => {
                              const bName = branches.find((b) => b.id === bId)?.name || bId;
                              return (
                                <span
                                  key={bId}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700"
                                >
                                  {bName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                            <Building2 className="w-3 h-3 text-amber-400" />
                            {s.branch?.name || 'Chưa phân công'}
                          </span>
                        )}
                      </td>

                      {/* Vai trò / Chức vụ */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${roleBadge.color} inline-block`}>
                            {roleBadge.label}
                          </span>
                          <span className="text-[10px] text-neutral-500 block font-light">
                            {roleBadge.desc}
                          </span>
                        </div>
                      </td>

                      {/* Liên hệ */}
                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {s.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-500" /> {s.phone}
                          </span>
                        ) : (
                          <span className="text-neutral-600 font-light">N/A</span>
                        )}
                      </td>

                      {/* Trạng thái tài khoản (Switch Toggle) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          disabled={togglingId === s.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border transition shadow-xs ${
                            s.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              s.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{s.isActive ? '🟢 Kích hoạt' : '🔴 Đã khóa'}</span>
                        </button>
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenResetPassword(s)}
                            className="p-2 bg-neutral-800 hover:bg-purple-500/20 text-neutral-300 hover:text-purple-400 border border-neutral-700 hover:border-purple-500/30 rounded-xs transition"
                            title="Reset Mật Khẩu"
                          >
                            <Key className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-2 bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/30 rounded-xs transition"
                            title="Sửa nhân viên"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-2 bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-500/30 rounded-xs transition"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
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

      {/* 4. MODAL THÊM MỚI / CHỈNH SỬA NHÂN VIÊN & CẤP TÀI KHOẢN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>{editingStaff ? 'Chỉnh Sửa Thông Tin Nhân Sự & Quyền Hạn' : 'Thêm Nhân Viên Mới & Cấp Tài Khoản'}</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
              <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-neutral-800 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Phần 1: Thông Tin Cá Nhân
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Họ và Tên (*):</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ví dụ: Nguyễn Văn Quyền"
                      className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-bold text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Số Điện Thoại (*):</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0901111222"
                      className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Link Ảnh Đại Diện (Avatar):</label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs text-xs text-neutral-300 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* PHẦN 2: PHÂN BỔ CÔNG VIỆC & CHI NHÁNH */}
              <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-neutral-800 space-y-3">
                <h3 className="font-extrabold text-purple-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Phần 2: Phân Bổ Công Việc & Chi Nhánh
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Vai Trò Hệ Thống (Role) (*):
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none font-bold"
                    >
                      <option value="ADMIN">🔴 ADMIN (Toàn quyền hệ thống)</option>
                      <option value="MANAGER">🟣 MANAGER (Quản lý 1 hoặc nhiều cơ sở)</option>
                      <option value="TELESALES">🟧 TELESALES (Tổng đài viên / Call Center)</option>
                      <option value="CASHIER">🔵 CASHIER (Thu ngân POS & ca làm)</option>
                      <option value="STAFF">⚪ STAFF (Nhân viên bếp / giao hàng)</option>
                    </select>
                  </div>

                  {/* Multi-branch Checkboxes */}
                  <div className="border-t border-neutral-800 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-neutral-300">
                        Cơ Sở Phụ Trách ({formData.branchIds.length}/{branches.length}):
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, branchIds: branches.map((b) => b.id) })}
                          className="text-amber-400 hover:underline font-bold"
                        >
                          [ Tích chọn tất cả ]
                        </button>
                        <span className="text-neutral-600">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, branchIds: [] })}
                          className="text-neutral-400 hover:text-rose-400 hover:underline"
                        >
                          [ Bỏ chọn tất cả ]
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#14171D] p-3 rounded-xs border border-neutral-800">
                      {branches.map((b) => {
                        const checked = formData.branchIds.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center gap-2 p-2 rounded-xs border transition cursor-pointer ${
                              checked
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                                : 'bg-[#0B0D11] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const newIds = checked
                                  ? formData.branchIds.filter((id) => id !== b.id)
                                  : [...formData.branchIds, b.id];
                                setFormData({ ...formData, branchIds: newIds, branchId: newIds[0] || 'cs1' });
                              }}
                              className="w-4 h-4 accent-amber-500 rounded-xs cursor-pointer"
                            />
                            <span className="text-xs truncate">{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 3: THIẾT LẬP TÀI KHOẢN ĐĂNG NHẬP */}
              <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-neutral-800 space-y-3">
                <h3 className="font-extrabold text-emerald-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Phần 3: Thiết Lập Tài Khoản Đăng Nhập (Login Credentials)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Tên Đăng Nhập (Username) (*):</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                      placeholder="mai.pos01"
                      className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono font-bold text-purple-300 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-neutral-300">
                        {editingStaff ? 'Mật Khẩu Mới (Để trống nếu giữ cũ):' : 'Mật Khẩu Đăng Nhập (*):'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pass = generateRandomPassword();
                          setFormData({ ...formData, password: pass });
                          setShowPassword(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <Dices className="w-3 h-3" />
                        <span>Tạo Pass Ngẫu Nhiên</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingStaff}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-10 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono text-emerald-400 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle Kích Hoạt */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded-xs cursor-pointer"
                  />
                  <span className="font-semibold text-neutral-200">Kích hoạt tài khoản ngay khi khởi tạo</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-extrabold rounded-xs shadow transition"
                >
                  {saving ? 'Đang Lưu...' : editingStaff ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản Nhân Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL RESET MẬT KHẨU */}
      {resetModalOpen && resetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <span>Cấp Phục Hồi Mật Khẩu Nhanh</span>
              </h2>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4 text-xs">
              <div className="bg-[#0B0D11] p-3 rounded-xs border border-neutral-800 space-y-1">
                <p className="text-neutral-300">
                  Nhân viên: <strong className="text-[#FAFAF9] font-bold">{resetStaff.name}</strong>
                </p>
                <p className="text-neutral-300">
                  Username: <strong className="text-purple-300 font-mono font-bold">{resetStaff.username}</strong>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-neutral-300">Mật Khẩu Mới (*):</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <Dices className="w-3 h-3" />
                    <span>Tạo Mới Ngẫu Nhiên</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-[#FAFAF9] font-extrabold rounded-xs shadow transition"
                >
                  {resetting ? 'Đang Lưu...' : 'Cấp Mật Khẩu Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
