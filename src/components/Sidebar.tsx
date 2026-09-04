'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Store, 
  TrendingUp, 
  Clock, 
  History, 
  ClipboardList, 
  Wallet, 
  Building2, 
  BarChart3, 
  UtensilsCrossed, 
  Users, 
  UserCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  LogOut, 
  ChevronRight,
  X,
  Search,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNavLinks = () => {
    if (!user) {
      return [
        { href: '/', label: 'Trang Chủ', icon: Store },
        { href: '/track', label: 'Tra Cứu Đơn Hàng', icon: Search },
      ];
    }

    if (user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR') {
      return [
        { href: '/admin/dashboard', label: 'Dashboard', icon: TrendingUp },
        { href: '/admin/shifts/active', label: 'Đóng / Mở Ca', icon: Clock },
        { href: '/admin/shifts', label: 'Quản Lý Các Ca', icon: History },
        { href: '/admin/orders', label: 'Đơn Hàng', icon: ClipboardList },
        { href: '/admin/expenses', label: 'Chi Tiêu (Sổ Quỹ)', icon: Wallet },
        { href: '/admin/branches', label: 'Cửa Hàng', icon: Building2 },
        { href: '/admin/product-analytics', label: 'Thống Kê Sản Phẩm', icon: BarChart3 },
        { href: '/admin/products', label: 'Sản Phẩm (Menu)', icon: UtensilsCrossed },
        { href: '/admin/cms', label: 'Cấu Hình Trang Chủ (CMS)', icon: Sparkles },
        { href: '/admin/users', label: 'Nhân Sự', icon: Users },
        { href: '/admin/customers', label: 'Khách Hàng (CRM)', icon: UserCheck },
        { href: '/admin/inventory/import', label: 'Nhập Hàng Kho', icon: ArrowDownLeft },
        { href: '/admin/inventory/export', label: 'Xuất Hàng Kho', icon: ArrowUpRight },
      ];
    }

    if (user.role === 'BRANCH_STAFF') {
      const bId = user.branch_id || 'b1111111-1111-1111-1111-111111111111';
      return [
        { href: `/branch/${bId}`, label: 'Điều Phối Bếp Chi Nhánh', icon: ClipboardList },
        { href: '/admin/shifts/active', label: 'Đóng / Mở Ca Cửa Hàng', icon: Clock },
        { href: '/admin/inventory/import', label: 'Phiếu Nhập Kho', icon: ArrowDownLeft },
        { href: '/track', label: 'Tra Cứu Đơn Khách', icon: Search },
      ];
    }

    return [{ href: '/track', label: 'Tra Cứu Đơn Khách', icon: Search }];
  };

  const navLinks = getNavLinks();
  const canCreateOrder = user && (user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR');

  const SidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white text-slate-800">
      <div className="p-4 space-y-4 overflow-y-auto">
        
        {/* Logo & Brand Header */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-600 group-hover:bg-orange-700 flex items-center justify-center text-white font-bold shadow-sm transition">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                Gà Ủ Muối Smart
              </span>
              <span className="text-[10px] block text-orange-600 font-bold uppercase tracking-wider mt-0.5">
                {user ? user.role.replace('_', ' ') : 'Hệ Thống Bán Hàng'}
              </span>
            </div>
          </Link>

          {/* Close button for Mobile Drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Prominent Quick Action Button (+ Lên Đơn Mới AI) */}
        {canCreateOrder && (
          <Link
            href="/admin/create-order"
            onClick={onCloseMobile}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-2.5 px-3.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Lên Đơn Mới (AI)</span>
          </Link>
        )}

        {/* Navigation Items List */}
        <nav className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-3 tracking-wider block mb-1.5 pt-1">
            Danh Mục F&amp;B POS
          </span>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-orange-600" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 text-orange-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                {(user?.name || 'A').charAt(0)}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 block truncate">{user?.name || 'Nhân viên'}</span>
                <span className="text-[10px] text-slate-500 block truncate font-medium">
                  {user?.branch_name || (user as any)?.branchName || user?.role || 'Toàn hệ thống'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                logout();
              }}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onCloseMobile}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <span>Đăng Nhập Nội Bộ</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP FIXED SIDEBAR (lg:flex w-64) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 shadow-xs sticky top-0 h-screen z-40">
        {SidebarContent}
      </aside>

      {/* MOBILE OVERLAY DRAWER (< lg) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Sliding Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
