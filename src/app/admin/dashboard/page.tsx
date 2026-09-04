'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ShoppingBag, DollarSign, CheckCircle2, Clock, Bot, Kanban, Users, ArrowUpRight, ArrowDownLeft, Building2, UtensilsCrossed } from 'lucide-react';
import { getAnalyticsData } from '@/actions/orders';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await getAnalyticsData('all', 'all');
      setData(res);
    }
    load();
  }, []);

  const metrics = data?.metrics || {
    totalOrders: 3,
    gmv: 955000,
    grossProfit: 413000,
    completionRate: 100,
    cancellationRate: 0,
    statusBreakdown: { RECEIVED: 0, PREPARING: 0, SHIPPING: 1, PAID: 2 }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Dashboard Tổng Quan F&amp;B POS</h1>
            <p className="text-xs text-slate-600 mt-0.5">Theo dõi doanh thu, ca làm việc, tồn kho &amp; đơn hàng đa chi nhánh realtime.</p>
          </div>
        </div>

        <Link
          href="/admin/create-order"
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>+ Lên Đơn Mới (AI Parser)</span>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Tổng Số Đơn Hàng</span>
            <ShoppingBag className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.totalOrders} <span className="text-xs text-slate-500 font-normal">đơn</span></div>
          <p className="text-[11px] text-emerald-700 font-medium">100% Đã khớp chi nhánh</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Doanh Thu Gộp (GMV)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-orange-600">{metrics.gmv.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Tính từ đơn thanh toán</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Lợi Nhuận Dự Tính</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">+{metrics.grossProfit.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Doanh thu trừ giá vốn</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold">Tỷ Lệ Hoàn Thành</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.completionRate}%</div>
          <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ đơn thành công</p>
        </div>
      </div>

      {/* Quick Access Modules Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Phân Hệ Vận Hành Nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: 'Đóng / Mở Ca', href: '/admin/shifts/active', icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Sổ Quỹ Chi Tiêu', href: '/admin/expenses', icon: DollarSign, color: 'text-rose-600 bg-rose-50' },
            { label: 'Quản Lý Đơn', href: '/admin/orders', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
            { label: 'Menu Sản Phẩm', href: '/admin/products', icon: UtensilsCrossed, color: 'text-purple-600 bg-purple-50' },
            { label: 'CRM Khách Hàng', href: '/admin/customers', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Nhập Kho', href: '/admin/inventory/import', icon: ArrowDownLeft, color: 'text-emerald-600 bg-emerald-50' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-900 group-hover:text-orange-600 transition">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
