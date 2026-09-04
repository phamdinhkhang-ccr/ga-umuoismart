'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, INITIAL_DEMO_ACCOUNTS } from '@/context/AuthContext';
import { Store, Lock, User, KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = login(username, password);
    if (res.success && res.redirectUrl) {
      router.push(res.redirectUrl);
    } else {
      setErrorMsg(res.message || 'Đăng nhập không thành công');
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    const res = login(u, p);
    if (res.success && res.redirectUrl) {
      router.push(res.redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 mx-auto flex items-center justify-center text-white shadow-sm">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Gà Ủ Muối Smart</h1>
          <p className="text-xs text-slate-600 font-medium">Đăng Nhập Cổng Nội Bộ Quản Lý & Điều Phối Bán Hàng</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-600" /> Xác Thực Tài Khoản Nhân Viên
          </h2>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Tên Đăng Nhập / Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin, tongdai, chinhanh1..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Mật Khẩu / Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-xs pt-3"
            >
              <span>Đăng Nhập Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              ⚡ Đăng nhập nhanh bằng tài khoản Demo:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {INITIAL_DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc.username, acc.password)}
                  className="bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-xl p-2.5 text-left transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{acc.username}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                      acc.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      acc.role === 'OPERATOR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {acc.role === 'SUPER_ADMIN' ? 'ADMIN' : acc.role === 'OPERATOR' ? 'TỔNG ĐÀI' : 'BẾP'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate mt-1">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
