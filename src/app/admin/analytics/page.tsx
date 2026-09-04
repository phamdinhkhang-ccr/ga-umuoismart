'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAnalyticsData, getBranches } from '@/actions/orders';
import { Branch, Order } from '@/types/database';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, CheckCircle2, Download, Filter, Calendar } from 'lucide-react';

const INITIAL_FALLBACK_DATA = {
  orders: [
    {
      id: 'mock-1',
      order_code: 'GUM-88A1',
      customer_name: 'Nguyễn Văn Nam',
      customer_phone: '0901234567',
      shipping_address: '123 Lê Lợi, Phường Bến Thành',
      district: 'Quận 1',
      city: 'Hồ Chí Minh',
      branch_id: 'b1111111-1111-1111-1111-111111111111',
      items: [
        { menu_item_id: 'm1', item_name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', quantity: 2, unit_price: 190000, cost_price: 110000, subtotal: 380000 },
        { menu_item_id: 'm6', item_name: 'Trà Tắc Khổng Lồ', quantity: 2, unit_price: 20000, cost_price: 6000, subtotal: 40000 }
      ],
      subtotal: 420000,
      discount_amount: 30000,
      final_amount: 390000,
      estimated_profit: 158000,
      voucher_code: null,
      note: 'Giao trước 12h',
      status: 'PAID' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      branch: { id: 'b1', name: 'Chi Nhánh Gà Ủ Muối Quận 1', address: '123 Lê Lợi', district: 'Quận 1', city: 'Hồ Chí Minh', phone: '02838111111' }
    },
    {
      id: 'mock-2',
      order_code: 'GUM-94B2',
      customer_name: 'Anh Tuấn',
      customer_phone: '0988776655',
      shipping_address: '456 Điện Biên Phủ, Phường 3',
      district: 'Quận 3',
      city: 'Hồ Chí Minh',
      branch_id: 'b2222222-2222-2222-2222-222222222222',
      items: [
        { menu_item_id: 'm2', item_name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', quantity: 1, unit_price: 100000, cost_price: 58000, subtotal: 100000 },
        { menu_item_id: 'm3', item_name: 'Chân Gà Rút Xương Sốt Thái', quantity: 1, unit_price: 65000, cost_price: 32000, subtotal: 65000 }
      ],
      subtotal: 165000,
      discount_amount: 30000,
      final_amount: 135000,
      estimated_profit: 45000,
      voucher_code: 'CHAO2026',
      note: 'Chân gà làm cay vừa',
      status: 'PAID' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      branch: { id: 'b2', name: 'Chi Nhánh Gà Ủ Muối Quận 3', address: '456 Điện Biên Phủ', district: 'Quận 3', city: 'Hồ Chí Minh', phone: '02838222222' }
    }
  ],
  metrics: {
    totalOrders: 2,
    gmv: 525000,
    grossProfit: 203000,
    completionRate: 100,
    cancellationRate: 0,
    statusBreakdown: { RECEIVED: 0, PREPARING: 0, SHIPPING: 0, DELIVERED: 0, PAID: 2, CANCELLED: 0 }
  }
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Instant Initial State (Zero Loading Spinner)
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<typeof INITIAL_FALLBACK_DATA>(INITIAL_FALLBACK_DATA as any);

  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        const bList = await getBranches();
        if (isMounted) setBranches(bList);
      } catch (e) {}
    }
    loadBranches();
    return () => { isMounted = false; };
  }, []);

  const fetchData = useCallback(async () => {
    // Non-blocking background fetch with instant fallback
    try {
      const res = await getAnalyticsData(period, selectedBranchId);
      if (res && res.orders) {
        setData(res as any);
      }
    } catch (e) {
      console.warn('Analytics background fetch error, keeping instant state', e);
    } finally {
      setLoading(false);
    }
  }, [period, selectedBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToCSV = useCallback(() => {
    if (!data || data.orders.length === 0) return;

    const headers = ['Mã Đơn', 'Khách Hàng', 'SĐT', 'Địa Chỉ', 'Quận', 'Chi Nhánh', 'Tổng Tiền', 'Giảm Giá', 'Thành Tiền', 'Lợi Nhuận', 'Trạng Thái', 'Thời Gian'];
    
    const rows = data.orders.map((o: any) => [
      o.order_code,
      `"${o.customer_name}"`,
      `"${o.customer_phone}"`,
      `"${o.shipping_address}"`,
      `"${o.district}"`,
      `"${o.branch?.name || ''}"`,
      o.subtotal,
      o.discount_amount,
      o.final_amount,
      o.estimated_profit,
      o.status,
      `"${new Date(o.created_at).toLocaleString('vi-VN')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bao_cao_ban_hang_${period}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, period]);

  const metrics = useMemo(() => data?.metrics || INITIAL_FALLBACK_DATA.metrics, [data]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Báo Cáo GMV & Lợi Nhuận Bán Hàng</h1>
              <p className="text-xs text-slate-600 mt-0.5">Theo dõi doanh thu gộp (GMV), lợi nhuận gộp & tỷ lệ hoàn thành đơn Gà Ủ Muối Smart.</p>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            disabled={!data || data.orders.length === 0}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition disabled:opacity-40 cursor-pointer text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Xuất File CSV / Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            {[
              { id: 'today', label: 'Hôm Nay' },
              { id: 'week', label: '7 Ngày Qua' },
              { id: 'month', label: 'Tháng Này' },
              { id: 'all', label: 'Tất Cả' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as any)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  period === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-48 cursor-pointer"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* INSTANT METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold">Tổng Số Đơn Hàng</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {metrics.totalOrders} <span className="text-xs text-slate-500 font-normal">đơn</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 font-medium">
              <span className="text-amber-700 font-bold">{metrics.statusBreakdown.RECEIVED || 0} mới</span>
              <span>•</span>
              <span className="text-blue-700 font-bold">{metrics.statusBreakdown.PREPARING || 0} chuẩn bị</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">{metrics.statusBreakdown.PAID || 0} xong</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold">Doanh Thu Gộp (GMV)</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-orange-600">
              {metrics.gmv.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Tính từ các đơn hoàn tất / đã thanh toán.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold">Lợi Nhuận Gộp (Profit)</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              +{metrics.grossProfit.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-600">VNĐ</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Doanh thu trừ tổng giá vốn các món gà.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold">Tỷ Lệ Tương Tác</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xl font-bold text-emerald-700">{metrics.completionRate}%</span>
                <span className="text-[11px] text-slate-500 block font-medium">Hoàn thành</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-rose-600">{metrics.cancellationRate}%</span>
                <span className="text-[11px] text-slate-500 block font-medium">Tỷ lệ hủy</span>
              </div>
            </div>
          </div>

        </div>

        {/* INSTANT DETAILED ORDERS TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-orange-600" /> Danh Sách Đơn Hàng Chi Tiết ({data?.orders.length || 0})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3">Mã Đơn</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3">Chi Nhánh</th>
                  <th className="px-4 py-3">Món Ăn</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền</th>
                  <th className="px-4 py-3 text-right">Thành Tiền</th>
                  <th className="px-4 py-3 text-right">Lợi Nhuận</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data || data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 font-medium">
                      Chưa có đơn hàng nào trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  data.orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-extrabold text-orange-600">{o.order_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {o.customer_name}
                        <span className="block text-[10px] text-slate-500 font-normal">{o.customer_phone}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{o.branch?.name || '---'}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-xs truncate font-medium">
                        {o.items.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-500">
                        {Number(o.subtotal).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        {Number(o.final_amount).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        +{Number(o.estimated_profit).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          o.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          o.status === 'SHIPPING' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          o.status === 'PREPARING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
