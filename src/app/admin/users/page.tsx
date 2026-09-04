'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getBranches } from '@/actions/orders';
import { Branch } from '@/types/database';
import { UserRole } from '@/types/auth';
import { Users, UserPlus, Trash2, Shield, MapPin, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export default function UserManagementPage() {
  const { user, accounts, addUserAccount, deleteUserAccount } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [branchId, setBranchId] = useState('');

  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadBranches() {
      const bList = await getBranches();
      setBranches(bList);
      if (bList.length > 0) setBranchId(bList[0].id);
    }
    loadBranches();
  }, []);

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3 max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Truy Cập Bị Từ Chối</h2>
          <p className="text-xs text-slate-600">Trang quản lý nhân sự chỉ dành riêng cho Admin Tối Cao.</p>
        </div>
      </div>
    );
  }

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
      role,
      branch_id: role === 'BRANCH_STAFF' ? branchId : undefined,
      branch_name: role === 'BRANCH_STAFF' ? selectedBranch?.name : undefined,
    });

    setName('');
    setUsername('');
    setPassword('');
    setMsg(`Đã tạo thành công tài khoản "${username.trim()}" (${role})`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản Lý Nhân Sự & Phân Quyền Tài Khoản</h1>
            <p className="text-xs text-slate-600 mt-0.5">Thêm mới, cấp quyền & gắn chi nhánh hoạt động cho nhân viên tổng đài và cơ sở.</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form: Add User Account */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-700" /> Cấp Tài Khoản Mới
            </h2>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {msg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{msg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Họ & Tên Nhân Viên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn C"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên Đăng Nhập (Username)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="chinhanh3, tongdai2..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mật Khẩu (Password)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Vai Trò / Phân Quyền (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="OPERATOR">Tổng Đài Lên Đơn (Operator)</option>
                  <option value="BRANCH_STAFF">Nhân Viên Chi Nhánh / Bếp (Branch Staff)</option>
                  <option value="SUPER_ADMIN">Admin Tối Cao (Super Admin)</option>
                </select>
              </div>

              {role === 'BRANCH_STAFF' && (
                <div>
                  <label className="block text-purple-700 font-bold mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Gắn Chi Nhánh Trực Thuộc
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cấp Tài Khoản Mới</span>
              </button>
            </form>
          </div>

          {/* Accounts List Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-700" /> Danh Sách Tài Khoản Nội Bộ ({accounts.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-4 py-3">Nhân Viên</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Vai Trò</th>
                    <th className="px-4 py-3">Chi Nhánh</th>
                    <th className="px-4 py-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{acc.name}</td>
                      <td className="px-4 py-3 font-bold text-purple-700">{acc.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          acc.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          acc.role === 'OPERATOR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {acc.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : acc.role === 'OPERATOR' ? 'TỔNG ĐÀI' : 'CHI NHÁNH'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{acc.branch_name || 'Tàn Chuỗi / N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        {acc.username !== 'admin' && (
                          <button
                            onClick={() => deleteUserAccount(acc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md transition cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
