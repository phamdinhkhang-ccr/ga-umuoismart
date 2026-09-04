'use client';

import { useState } from 'react';
import { getOrdersByPhone } from '@/actions/orders';
import { Order, OrderStatus } from '@/types/database';
import { Search, Phone, Clock, CheckCircle2, Truck, Utensils, MapPin, AlertCircle } from 'lucide-react';

export default function OrderTrackingPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) return;

    setLoading(true);
    setSearched(true);
    const result = await getOrdersByPhone(phone.trim());
    setOrders(result);
    setLoading(false);
  };

  const getTimelineSteps = (currentStatus: OrderStatus) => {
    const steps = [
      { key: 'RECEIVED', label: 'Đã nhận đơn', icon: Clock },
      { key: 'PREPARING', label: 'Đang chuẩn bị gà', icon: Utensils },
      { key: 'SHIPPING', label: 'Đang giao hàng', icon: Truck },
      { key: 'PAID', label: 'Giao thành công', icon: CheckCircle2 },
    ];

    let activeIndex = 0;
    if (currentStatus === 'PREPARING') activeIndex = 1;
    if (currentStatus === 'SHIPPING') activeIndex = 2;
    if (currentStatus === 'PAID' || currentStatus === 'DELIVERED') activeIndex = 3;

    return { steps, activeIndex };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-orange-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-sm">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tra Cứu Đơn Hàng Gà Ủ Muối Smart</h1>
          <p className="text-xs text-slate-600">Nhập số điện thoại của bạn để kiểm tra tiến độ chế biến & giao hàng theo thời gian thực.</p>
        </div>

        {/* Search Input Card */}
        <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-900">Nhập Số Điện Thoại Đặt Hàng:</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0901234567"
                required
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-400 font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition cursor-pointer text-xs flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra Cứu</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* RESULTS SECTION */}
        {searched && (
          <div className="space-y-5">
            {orders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
                <AlertCircle className="w-8 h-8 text-orange-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Không Tìm Thấy Đơn Hàng Gà</h3>
                <p className="text-xs text-slate-600">Không tìm thấy đơn hàng nào gắn với số điện thoại <span className="text-orange-600 font-bold">{phone}</span>.</p>
              </div>
            ) : (
              orders.map((order) => {
                const { steps, activeIndex } = getTimelineSteps(order.status);
                const isCancelled = order.status === 'CANCELLED';

                return (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                    
                    {/* Order Top Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs text-slate-500 block">Mã đơn hàng:</span>
                        <span className="font-extrabold text-orange-600 text-base">{order.order_code}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Cơ sở chế biến:</span>
                        <span className="font-semibold text-emerald-700 text-xs">{order.branch?.name || 'Chi nhánh'}</span>
                      </div>
                    </div>

                    {/* VISUAL TIMELINE */}
                    {isCancelled ? (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold text-center">
                        Đơn hàng này đã bị hủy.
                      </div>
                    ) : (
                      <div className="py-2">
                        <div className="relative flex items-center justify-between">
                          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                          <div
                            className="absolute top-1/2 left-0 h-1 bg-orange-600 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                          />

                          {steps.map((step, idx) => {
                            const isPassed = idx <= activeIndex;
                            const isCurrent = idx === activeIndex;
                            const StepIcon = step.icon;

                            return (
                              <div key={step.key} className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                    isCurrent
                                      ? 'bg-orange-600 border-white text-white font-bold shadow-md scale-110'
                                      : isPassed
                                      ? 'bg-orange-50 border-orange-500 text-orange-600'
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}
                                >
                                  <StepIcon className="w-4 h-4" />
                                </div>
                                <span className={`text-[11px] font-semibold mt-2 text-center max-w-[80px] ${
                                  isCurrent ? 'text-orange-600 font-bold' : isPassed ? 'text-slate-800' : 'text-slate-400'
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Items Summary */}
                    <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-3 text-xs">
                      <div className="space-y-1.5 border-b border-slate-200 pb-2.5">
                        <span className="font-bold text-slate-800 block mb-1">Món Đã Đặt:</span>
                        {order.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-slate-800 font-medium">
                            <span>{it.quantity}x {it.item_name}</span>
                            <span className="text-slate-600">{(it.subtotal || 0).toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1 font-bold text-xs">
                        <span className="text-slate-700">Tổng Thanh Toán:</span>
                        <span className="text-orange-600 text-sm">{Number(order.final_amount).toLocaleString('vi-VN')} VNĐ</span>
                      </div>

                      <div className="text-slate-600 pt-2 flex items-start gap-1.5 border-t border-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span>Giao đến: {order.shipping_address}, {order.district}</span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
