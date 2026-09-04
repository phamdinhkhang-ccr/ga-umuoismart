'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bot, Kanban, BarChart3, Search, Store, Users, LogOut, LogIn, UserCheck, PlusCircle, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNavLinks = () => {
    if (!user) {
      return [
        { href: '/', label: 'Trang Chủ', icon: Store },
        { href: '/track', label: 'Tra Cứu Đơn Hàng', icon: Search },
      ];
    }

    if (user.role === 'SUPER_ADMIN') {
      return [
        { href: '/admin/orders', label: 'Quản Lý Đơn Hàng', icon: ClipboardList },
        { href: '/admin/create-order', label: 'Tạo Đơn AI / Manual', icon: Bot },
        { href: '/branch/b1111111-1111-1111-1111-111111111111', label: 'Điều Phối Chi Nhánh', icon: Kanban },
        { href: '/admin/analytics', label: 'Báo Cáo Analytics', icon: BarChart3 },
        { href: '/admin/users', label: 'Quản Lý Nhân Sự', icon: Users },
        { href: '/track', label: 'Tra Cứu Đơn', icon: Search },
      ];
    }

    if (user.role === 'OPERATOR') {
      return [
        { href: '/admin/orders', label: 'Quản Lý Đơn Hàng', icon: ClipboardList },
        { href: '/admin/create-order', label: 'Tạo Đơn AI / Manual', icon: Bot },
        { href: '/track', label: 'Tra Cứu Đơn Hàng', icon: Search },
      ];
    }

    if (user.role === 'BRANCH_STAFF') {
      const bId = user.branch_id || 'b1111111-1111-1111-1111-111111111111';
      return [
        { href: `/branch/${bId}`, label: 'Điều Phối Bếp / Chi Nhánh', icon: Kanban },
        { href: '/track', label: 'Tra Cứu Đơn Hàng', icon: Search },
      ];
    }

    return [{ href: '/track', label: 'Tra Cứu Đơn Hàng', icon: Search }];
  };

  const navLinks = getNavLinks();
  const canCreateOrder = user && (user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR');

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 block">
                Gà Ủ Muối Smart
              </span>
              <span className="text-[11px] block text-orange-600 font-semibold uppercase tracking-wider">
                {user ? user.role.replace('_', ' ') : 'Hệ Thống Bán Hàng'}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-orange-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action / Profile */}
          <div className="flex items-center space-x-3">
            
            {/* Prominent + Tạo Đơn Hàng Mới Button */}
            {canCreateOrder && (
              <Link
                href="/admin/create-order"
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">+ Tạo Đơn Mới</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-orange-600" /> {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {user.branch_name || (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Tổng Đài')}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/track"
                  className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                >
                  <Search className="w-4 h-4" />
                  <span>Tra Cứu Đơn</span>
                </Link>

                <Link
                  href="/login"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Nội Bộ</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
