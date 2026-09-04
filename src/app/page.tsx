'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Bot, Kanban, BarChart3, Search, ArrowRight, CheckCircle2, Zap, Sparkles, LogIn, Lock, Users, ClipboardList } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  const allModules = [
    {
      title: 'Quản Lý Đơn Hàng Tập Trung',
      route: '/admin/orders',
      icon: ClipboardList,
      bgColor: 'bg-orange-50 text-orange-600 border-orange-200',
      badge: 'Order Manager',
      roles: ['SUPER_ADMIN', 'OPERATOR'],
      desc: 'Quản lý toàn bộ danh sách đơn hàng từ tất cả các chi nhánh, tìm kiếm theo SĐT, lọc trạng thái, chuyển giao cơ sở & in phiếu giao hàng.'
    },
    {
      title: 'Tổng Đài Lên Đơn AI / Manual',
      route: '/admin/create-order',
      icon: Bot,
      bgColor: 'bg-amber-50 text-amber-600 border-amber-200',
      badge: 'AI Smart Parser',
      roles: ['SUPER_ADMIN', 'OPERATOR'],
      desc: 'Dán tin nhắn thô từ Zalo/Facebook ➔ AI tự bóc tách món gà ủ muối, tự áp dụng giảm 30k (đơn ≥ 355k) hoặc lên đơn thủ công từ menu.'
    },
    {
      title: 'Dashboard Điều Phối Chi Nhánh',
      route: user?.role === 'BRANCH_STAFF' && user.branch_id ? `/branch/${user.branch_id}` : '/branch/b1111111-1111-1111-1111-111111111111',
      icon: Kanban,
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badge: 'Realtime Kanban',
      roles: ['SUPER_ADMIN', 'BRANCH_STAFF'],
      desc: 'Màn hình nhà bếp / cơ sở nhận đơn gà ủ muối tức thì qua Supabase Realtime WebSocket kèm âm thanh chuông báo và chuyển tiến độ 1-click.'
    },
    {
      title: 'Báo Cáo GMV & Lợi Nhuận Analytics',
      route: '/admin/analytics',
      icon: BarChart3,
      bgColor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badge: 'Financial Analytics',
      roles: ['SUPER_ADMIN'],
      desc: 'Thống kê chi tiết số đơn gà bán ra, doanh thu gộp GMV, lợi nhuận gộp (trừ giá vốn) và hỗ trợ xuất dữ liệu file CSV / Excel.'
    },
    {
      title: 'Quản Lý Nhân Sự & Phân Quyền',
      route: '/admin/users',
      icon: Users,
      bgColor: 'bg-purple-50 text-purple-600 border-purple-200',
      badge: 'User Management',
      roles: ['SUPER_ADMIN'],
      desc: 'Cấp mới tài khoản, phân quyền Role (Admin, Tổng đài, Bếp) và gán chi nhánh trực thuộc cho từng nhân sự.'
    },
    {
      title: 'Tra Cứu Tiến Độ Đơn Hàng Cho Khách',
      route: '/track',
      icon: Search,
      bgColor: 'bg-blue-50 text-blue-600 border-blue-200',
      badge: 'Public Client Portal',
      roles: ['SUPER_ADMIN', 'OPERATOR', 'BRANCH_STAFF', 'PUBLIC'],
      desc: 'Khách hàng nhập số điện thoại để xem timeline món gà đang ở bước: Nhận đơn ➔ Đóng gói ➔ Đang giao ➔ Giao thành công.'
    }
  ];

  const visibleModules = user
    ? allModules.filter((m) => m.roles.includes(user.role) || m.roles.includes('PUBLIC'))
    : allModules;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans space-y-8">
      
      {/* HERO SECTION */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs text-center space-y-6">
        <div className="max-w-4xl mx-auto space-y-5">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
            <span>Hệ Thống Quản Lý Bán Hàng Gà Ủ Muối Smart v2.0</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Quản Lý Vận Hành Bán Hàng <br className="hidden sm:inline" />
            <span className="text-orange-600">Đa Chi Nhánh Tự Động &amp; AI Smart POS</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed font-normal">
            Bóc tách đơn hàng từ tin nhắn Zalo/Facebook bằng AI, tự động áp dụng ưu đãi, điều phối đơn về đúng bếp chi nhánh gần nhất và theo dõi doanh thu gộp GMV realtime.
          </p>

          {/* Quick Demo CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {user ? (
              <>
                <Link
                  href="/admin/orders"
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Quản Lý Đơn Hàng</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/admin/create-order"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-orange-400" />
                  <span>+ Tạo Đơn Hàng Mới</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Trải Nghiệm Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/track"
                  className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold px-6 py-3 rounded-xl transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Tra Cứu Đơn Hàng (Khách)</span>
                </Link>
              </>
            )}
          </div>

        </div>
      </section>

      {/* SYSTEM MODULES GRID */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Các Phân Hệ Quản Lý Hệ Thống</h2>
            <p className="text-xs text-slate-500 mt-0.5">Lựa chọn phân hệ làm việc theo quyền hạn được phân công.</p>
          </div>
          {user && (
            <span className="text-xs bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 self-start sm:self-auto">
              Quyền: {user.role}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleModules.map((mod, idx) => {
            const Icon = mod.icon;
            const isAccessible = !user || mod.roles.includes(user.role) || mod.roles.includes('PUBLIC');

            return (
              <div
                key={idx}
                className={`bg-white border rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 ${
                  isAccessible
                    ? 'border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300'
                    : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl border ${mod.bgColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {mod.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{mod.title}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
                      {mod.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-100 mt-5">
                  {isAccessible ? (
                    <Link
                      href={mod.route}
                      className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                    >
                      <span>Truy Cập Phân Hệ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <div className="w-full bg-slate-100 text-slate-400 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cần Quyền Admin / Operator</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
