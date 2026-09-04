'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getBranches } from '@/lib/store';
import { Branch } from '@/types/database';
import { UserRole, UserAccount } from '@/types/auth';
import { 
  Users, UserPlus, Trash2, Shield, MapPin, CheckCircle2, 
  AlertCircle, KeyRound, Eye, Edit3, Lock, Check, X, Phone, 
  Mail, Calendar, Briefcase, Clock, Sparkles, UserCheck, ShieldAlert, Key
} from 'lucide-react';

export default function UserManagementPage() {
  const { user, accounts, addUserAccount, updateUserAccount, deleteUserAccount } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);

  // Create Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [branchId, setBranchId] = useState('');

  // Modals & Selected Account
  const [activeModal, setActiveModal] = useState<'VIEW' | 'EDIT' | 'PASSWORD' | 'DELETE' | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<(UserAccount & { password?: string }) | null>(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    role: 'OPERATOR' as UserRole,
    branch_id: '',
    branch_name: '',
    new_password: '',
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED'
  });

  // Quick Password Form State
  const [quickPassword, setQuickPassword] = useState('');

  // Toast / Messages
  const [msg, setMsg] = useState('');
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
    setMsg('');
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
      shifts_count: 0
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
      status: acc.status || 'ACTIVE'
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

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Quản Lý Nhân Sự &amp; Phân Quyền Tài Khoản
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {accounts.length} Tài khoản
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin toàn quyền CRUD: Thêm mới, chỉnh sửa, xem hồ sơ, đổi mật khẩu &amp; phân quyền chi nhánh.
              </p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
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
                              title="Xem chi tiết hồ sơ"
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Icon */}
                            <button
                              onClick={() => openEditModal(acc)}
                              title="Chỉnh sửa thông tin"
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

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: XEM CHI TIẾT HỒ SƠ NHÂN SỰ */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'VIEW' && selectedAcc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
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

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Số ca đã làm việc</span>
                  <p className="text-base font-extrabold text-sky-800 mt-0.5">{selectedAcc.shifts_count || 42} ca</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Tổng đơn đã xử lý</span>
                  <p className="text-base font-extrabold text-emerald-800 mt-0.5">{selectedAcc.orders_count || 320} đơn</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-center text-slate-500 text-[11px]">
                Lần đăng nhập cuối: <strong className="text-slate-800 font-semibold">{selectedAcc.last_active || '2026-09-04 19:45'}</strong>
              </div>
            </div>

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
      {/* MODAL 2: CHỈNH SỬA & CẤP LẠI MẬT KHẨU */}
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
                    Sửa Hồ Sơ: {selectedAcc.name}
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

              {editFormData.role === 'BRANCH_STAFF' && (
                <div className="space-y-1 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                  <label className="font-bold text-blue-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Gán lại Chi Nhánh Trực Thuộc
                  </label>
                  <select
                    value={editFormData.branch_id}
                    onChange={(e) => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-semibold text-slate-900 outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
