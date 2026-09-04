'use client';

import { usePathname } from 'next/navigation';
import { Store, Calendar, Menu } from 'lucide-react';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export default function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const pathname = usePathname();

  const getBreadcrumbTitle = () => {
    if (pathname === '/') return 'Trang Chủ Hệ Thống';
    if (pathname.startsWith('/admin/analytics')) return 'Báo Cáo GMV & Lợi Nhuận';
    if (pathname.startsWith('/admin/orders')) return 'Quản Lý Đơn Hàng Tập Trung';
    if (pathname.startsWith('/admin/create-order')) return 'Tổng Đài Lên Đơn AI Parser';
    if (pathname.startsWith('/branch')) return 'Dashboard Điều Phối Chi Nhánh';
    if (pathname.startsWith('/admin/users')) return 'Quản Lý Nhân Sự';
    if (pathname.startsWith('/track')) return 'Tra Cứu Đơn Hàng Cho Khách';
    if (pathname.startsWith('/login')) return 'Cổng Đăng Nhập Nội Bộ';
    return 'Gà Ủ Muối Smart';
  };

  return (
    <header className="bg-white border-b border-slate-200 h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      
      {/* Left: Mobile Hamburger Button & Breadcrumb */}
      <div className="flex items-center space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            aria-label="Mở Menu"
          >
            <Menu className="w-5 h-5 text-orange-600" />
          </button>
        )}

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <Store className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="hidden sm:inline">/</span>
          <span className="text-slate-900 font-bold truncate max-w-[180px] sm:max-w-none">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Right: Date & Indicator */}
      <div className="flex items-center space-x-3 text-xs font-medium text-slate-500">
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
        </div>
        
        <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
          <span className="hidden sm:inline">POS System</span> Active
        </div>
      </div>
    </header>
  );
}
