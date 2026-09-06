'use client';

import Link from 'next/link';
import { Store, Sparkles, UserCheck, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  storeSettings?: any;
}

export default function Header({ storeSettings }: HeaderProps) {
  const { user } = useAuth();

  const brandName = 
    storeSettings?.brand_name || 
    storeSettings?.site_title || 
    storeSettings?.brandName || 
    storeSettings?.hero_title || 
    'Gà Ủ Muối Smart';

  const slogan = 
    storeSettings?.slogan || 
    storeSettings?.hero_slogan || 
    storeSettings?.heroSubtitle || 
    'Đặc Sản Da Giòn Sần Sật • Giao Hỏa Tốc';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Brand Title with Fallback */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
              {brandName}
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <span className="text-orange-500">✨</span>
              <span>{slogan}</span>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-extrabold text-slate-700">
          <a href="#menu" className="hover:text-orange-600 transition">Thực Đơn Món</a>
          <a href="#track" className="hover:text-orange-600 transition">Tra Cứu Đơn Hàng</a>
          <a href="#branches" className="hover:text-orange-600 transition">Hệ Thống Cơ Sở</a>
          <a href="#contact" className="hover:text-orange-600 transition">Liên Hệ CSKH</a>
        </nav>

        {/* Top-Right Admin Login / Dashboard Button */}
        <div className="flex items-center space-x-3">
          {user ? (
            <Link
              href={user.role === 'BRANCH_STAFF' && user.branch_id ? `/branch/${user.branch_id}` : '/admin/dashboard'}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition flex items-center space-x-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Dashboard ({user.name})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đăng Nhập Quản Trị</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
