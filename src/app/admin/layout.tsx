'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  History,
  Camera,
  ShoppingBag,
  Receipt,
  Store,
  BarChart3,
  TrendingUp,
  UtensilsCrossed,
  Globe,
  Bot,
  CreditCard,
  Users,
  CalendarCheck,
  UserCheck,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Menu,
  X,
  Flame,
  ChevronRight,
  LogOut,
} from 'lucide-react';

import ThemeToggle from '@/components/ThemeToggle';
import NotificationCenter from '@/components/NotificationCenter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: SidebarItem[] = [
  { name: '📊 Báo Cáo', href: '/admin', icon: TrendingUp },
  { name: 'Đóng / Mở Ca', href: '/admin/shifts/active', icon: Clock },
  { name: 'Quản Lý Các Ca', href: '/admin/shifts', icon: History },
  { name: 'Chấm Công (Check-in)', href: '/admin/attendance', icon: Camera, badge: 'Live Cam' },
  { name: 'Đơn Hàng', href: '/admin/orders', icon: ShoppingBag, badge: 'POS' },
  { name: 'Chi Tiêu (Sổ Quỹ)', href: '/admin/expenses', icon: Receipt },
  { name: 'Hệ Thống Cơ Sở', href: '/admin/store', icon: Store, badge: '6 Điểm' },
  { name: 'Thống Kê Sản Phẩm', href: '/admin/product-analytics', icon: BarChart3, badge: 'Menu Eng' },
  { name: 'Sản Phẩm (Menu)', href: '/admin/products', icon: UtensilsCrossed, badge: 'HSD' },
  { name: 'Cấu Hình Trang Chủ (CMS)', href: '/admin/cms', icon: Globe },
  { name: 'Cấu Hình Thanh Toán', href: '/admin/payment-settings', icon: CreditCard, badge: 'VietQR' },
  { name: 'Cấu Hình AI (Trọng tâm)', href: '/admin/ai-config', icon: Bot, badge: 'Gemini' },
  { name: 'Nhân Sự', href: '/admin/staff', icon: Users },
  { name: 'Quản Lý Chấm Công', href: '/admin/attendance-management', icon: CalendarCheck, badge: 'Admin' },
  { name: 'Khách Hàng (CRM)', href: '/admin/customers', icon: UserCheck },
  { name: 'Nhập Hàng Kho', href: '/admin/inventory/inbound', icon: PackagePlus },
  { name: 'Xuất Hàng Kho', href: '/admin/inventory/outbound', icon: PackageMinus },
  { name: 'Kiểm Tra Tồn Kho', href: '/admin/inventory/stock', icon: AlertTriangle },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser, loading: authLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Fetch low stock count dynamically
  useEffect(() => {
    fetch(`/api/inventory?lowStock=true&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setLowStockCount(data.items.length);
        } else if (data.lowStockCount !== undefined) {
          setLowStockCount(data.lowStockCount);
        }
      })
      .catch((err) => console.error(err));
  }, [pathname]);

  // Compute filtered nav items strictly based on authenticated role
  const filteredNavItems = useMemo(() => {
    if (authLoading || !currentUser) return [];

    const userRole = currentUser.role || 'STAFF';

    if (userRole === 'TELESALES') {
      return navItems.filter((item) => item.href === '/admin/orders');
    }

    if (userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'USER') {
      const allowedPaths = [
        '/admin/orders',
        '/admin/shifts/active',
        '/admin/shifts',
        '/admin/inventory/stock',
        '/admin/expenses',
        '/admin/attendance',
      ];
      return navItems.filter((item) => allowedPaths.includes(item.href));
    }

    if (userRole === 'MANAGER') {
      const forbiddenPaths = ['/admin/store', '/admin/branches'];
      return navItems.filter((item) => !forbiddenPaths.includes(item.href));
    }

    // ADMIN has full access
    return navItems;
  }, [currentUser, authLoading]);

  // Route protection redirect
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const role = currentUser.role;
    if (role === 'TELESALES') {
      if (pathname !== '/admin/orders') {
        router.push('/admin/orders');
      }
    } else if (role === 'STAFF' || role === 'CASHIER' || role === 'USER') {
      const allowedPaths = [
        '/admin/orders',
        '/admin/shift-pos',
        '/admin/shifts/active',
        '/admin/shifts/open-close',
        '/admin/shifts',
        '/admin/attendance',
        '/admin/expenses',
        '/admin/inventory/stock',
        '/admin/inventory-check',
      ];
      if (!allowedPaths.includes(pathname)) {
        router.push('/admin/orders');
      }
    } else if (role === 'MANAGER') {
      const forbiddenPaths = ['/admin/store', '/admin/branches'];
      if (forbiddenPaths.includes(pathname)) {
        router.push('/admin/orders');
      }
    }
  }, [currentUser, authLoading, pathname, router]);

  return (
    <div className="min-h-screen dark:bg-[#0F1115] bg-[#FBF9F5] dark:text-[#FAFAF9] text-stone-900 flex font-sans transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 dark:bg-[#0B0D11] bg-white dark:text-neutral-300 text-stone-700 flex-col justify-between border-r dark:border-neutral-800/80 border-stone-200/80 shrink-0">
        <div>
          {/* Logo & Header */}
          <div className="p-6 border-b dark:border-neutral-800/80 border-stone-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(217,119,6,0.2)]">
              <Flame className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="font-extrabold dark:text-[#FAFAF9] text-stone-900 text-base leading-none tracking-tight">
                GÀ Ủ MUỐI SMART
              </h1>
              <span className="text-[10px] font-semibold dark:text-amber-400/90 text-amber-600 tracking-widest uppercase mt-1 block">
                POS & CRM Management
              </span>
            </div>
          </div>

          {/* Navigation Links or Skeleton Loading */}
          <nav className="p-3 space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin">
            {authLoading ? (
              // Polished Skeleton Loading for Sidebar
              <div className="space-y-2 p-1">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg animate-pulse bg-slate-100 dark:bg-neutral-900/60"
                  >
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-neutral-800 shrink-0"></div>
                    <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isStockCheckItem =
                  item.href.includes('/inventory/stock') || item.href.includes('/inventory-check');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs tracking-wider transition-all duration-200 ${
                      isActive
                        ? 'dark:bg-neutral-900 dark:text-amber-400 bg-amber-500/10 text-amber-700 font-bold border-l-2 border-amber-500 shadow-xs'
                        : 'dark:text-neutral-400 dark:hover:text-amber-300 dark:hover:bg-neutral-900/50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 stroke-[1.25] ${
                          isActive ? 'dark:text-amber-400 text-amber-600' : 'dark:text-neutral-400 text-stone-500'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isStockCheckItem && lowStockCount > 0 ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {lowStockCount} sắp hết
                      </span>
                    ) : (
                      item.badge && (
                        <span className="text-[9px] font-semibold dark:bg-amber-500/10 dark:text-amber-400 bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full border dark:border-amber-500/30 border-amber-500/40">
                          {item.badge}
                        </span>
                      )
                    )}
                  </Link>
                );
              })
            )}
          </nav>
        </div>

        {/* Footer User Info & Logout Button */}
        <div className="p-4 border-t dark:border-neutral-800/80 border-stone-200/80 dark:bg-[#0B0D11] bg-stone-50 space-y-3">
          <div className="flex items-center justify-between">
            {authLoading ? (
              <div className="flex items-center gap-2.5 animate-pulse w-full">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-800 shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-2/3"></div>
                  <div className="h-2.5 bg-slate-200 dark:bg-neutral-800 rounded w-1/3"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                    {currentUser?.role === 'ADMIN' ? 'AD' : 'ST'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold dark:text-white text-stone-900 text-xs truncate block">
                      {currentUser?.fullName || currentUser?.username || 'Người Dùng'}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm inline-block ${
                        currentUser?.role === 'ADMIN'
                          ? 'bg-amber-500/20 dark:text-amber-300 text-amber-700 border border-amber-500/30'
                          : 'bg-emerald-500/20 dark:text-emerald-300 text-emerald-700 border border-emerald-500/30'
                      }`}
                    >
                      {currentUser?.role || 'STAFF'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Đăng xuất khỏi hệ thống"
                  className="p-2 dark:text-neutral-400 text-stone-500 hover:text-rose-500 dark:hover:bg-neutral-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4 stroke-[1.75]" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] dark:text-neutral-500 text-stone-500 pt-2 border-t dark:border-neutral-800/60 border-stone-200">
            <span>Modern POS v2.0</span>
            <Link
              href="/"
              className="dark:hover:text-amber-400 hover:text-amber-600 font-bold dark:text-amber-500/90 text-amber-700 transition"
            >
              Trang Khách ↗
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm lg:hidden flex">
          <div className="w-72 dark:bg-[#0B0D11] bg-white dark:text-neutral-300 text-stone-800 h-full p-4 flex flex-col justify-between overflow-y-auto border-r dark:border-neutral-800 border-stone-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b dark:border-neutral-800 border-stone-200 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-6 h-6 text-amber-500 stroke-[1.5]" />
                  <span className="font-extrabold dark:text-white text-stone-900 text-base tracking-tight">
                    Gà Ủ Muối Smart
                  </span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="dark:text-neutral-400 text-stone-500">
                  <X className="w-6 h-6 stroke-[1.5]" />
                </button>
              </div>

              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs ${
                        isActive
                          ? 'dark:bg-neutral-900 dark:text-amber-400 bg-amber-500/10 text-amber-700 font-bold border-l-2 border-amber-500'
                          : 'dark:text-neutral-400 text-stone-600 hover:text-amber-600 dark:hover:bg-neutral-900/50 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-amber-500 stroke-[1.25]" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t dark:border-neutral-800 border-stone-200 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold dark:text-white text-stone-900 block">
                  {currentUser?.fullName || currentUser?.username || 'Người Dùng'}
                </span>
                <span className="text-[10px] text-amber-500">{currentUser?.role || 'STAFF'}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden dark:bg-[#0F1115] bg-[#FBF9F5]">
        {/* Topbar */}
        <header className="dark:bg-[#0B0D11] bg-white border-b dark:border-neutral-800/80 border-stone-200/80 h-16 px-6 flex items-center justify-between shadow-xs transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 dark:text-neutral-400 text-stone-600 hover:text-stone-900 rounded-lg dark:hover:bg-neutral-900 hover:bg-stone-100"
            >
              <Menu className="w-6 h-6 stroke-[1.5]" />
            </button>
            <div className="text-xs font-semibold dark:text-neutral-400 text-stone-500 hidden sm:flex items-center gap-2">
              <span>Admin POS</span>
              <ChevronRight className="w-3.5 h-3.5 dark:text-neutral-600 text-stone-400 stroke-[1.25]" />
              <span className="dark:text-[#FAFAF9] text-stone-900 font-bold">
                {navItems.find((i) => i.href === pathname)?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              target="_blank"
              className="px-3.5 py-1.5 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-neutral-800 dark:border-amber-500/30 bg-stone-100 text-amber-700 hover:bg-stone-200 border border-amber-600/30 font-semibold rounded-lg transition text-xs tracking-wider"
            >
              🌐 Xem Trang Khách
            </Link>

            <ThemeToggle />

            <NotificationCenter />

            <div className="flex items-center gap-3 pl-3 border-l dark:border-neutral-800 border-stone-200">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-800 animate-pulse"></div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-black flex items-center justify-center text-xs shadow-xs">
                    {currentUser?.role === 'ADMIN' ? 'AD' : 'ST'}
                  </div>
                  <div className="hidden md:block">
                    <span className="font-bold dark:text-[#FAFAF9] text-stone-900 block leading-tight">
                      {currentUser?.fullName || currentUser?.username || 'Người Dùng'}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {currentUser?.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Nhân viên vận hành'}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Đăng xuất"
                    className="hidden md:flex p-2 dark:text-neutral-400 text-stone-500 hover:text-rose-500 dark:hover:bg-neutral-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 stroke-[1.75]" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}
