'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, LogIn } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl backdrop-blur-xl space-y-8">
      {/* Logo & Emblem Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-amber-500/40 bg-neutral-950 p-1 shadow-[0_0_25px_rgba(245,158,11,0.2)] mb-2">
          <div className="w-full h-full rounded-xl border border-amber-500/20 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center">
            <span className="font-black text-amber-400 text-lg tracking-tighter drop-shadow-md">
              GS
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Cổng Nội Bộ</span>
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Dành riêng cho Quản trị viên & Nhân viên vận hành
          </p>
        </div>
      </div>

      {/* Error Message Box */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl text-xs font-semibold text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5 text-xs">
        <div>
          <label className="block font-bold text-neutral-300 mb-2">Tên Đăng Nhập / Email (*):</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <User className="w-4 h-4 stroke-[1.75]" />
            </div>
            <input
              type="text"
              required
              placeholder="Nhập username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-medium text-sm text-[#FAFAF9] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-neutral-300 mb-2">Mật Khẩu (*):</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <Lock className="w-4 h-4 stroke-[1.75]" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-11 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-medium text-sm text-[#FAFAF9] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-neutral-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-amber-400 transition-colors cursor-pointer"
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 stroke-[1.75]" />
              ) : (
                <Eye className="w-4 h-4 stroke-[1.75]" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 font-black text-neutral-950 text-xs uppercase tracking-wider w-full py-3.5 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <LogIn className="w-4 h-4 stroke-[2]" />
          <span>{loading ? 'Đang Đăng Nhập...' : 'XÁC THỰC & ĐĂNG NHẬP'}</span>
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#FAFAF9] font-sans flex flex-col justify-between relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Central Gold Spotlight Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="relative z-10 p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-amber-400 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full transition-all backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
          <span>Trở về Trang Chủ</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[1.75]" />
          <span className="hidden sm:inline">Hệ Thống Bảo Mật Nội Bộ SSL</span>
        </div>
      </div>

      {/* Main Login Card Container Wrapped in Suspense */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="text-neutral-400 text-xs">Đang tải cổng đăng nhập...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-6 text-center text-neutral-600 text-[11px]">
        © {new Date().getFullYear()} Gà Ủ Muối Smart. Hệ thống quản trị nội bộ bảo mật 256-bit.
      </div>
    </div>
  );
}
