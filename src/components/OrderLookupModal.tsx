'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Search, Clock, CheckCircle2, Truck, XCircle, PackageCheck } from 'lucide-react';
import PhoneActionCell from '@/components/PhoneActionCell';

interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function OrderLookupModal({ isOpen, onClose, initialQuery }: OrderLookupModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (isOpen && initialQuery) {
      const targetQuery = initialQuery.trim();
      setQuery(targetQuery);
      if (targetQuery) {
        setLoading(true);
        setSearched(true);
        const isCode = targetQuery.toUpperCase().startsWith('DH-');
        const url = isCode
          ? `/api/orders?orderCode=${encodeURIComponent(targetQuery)}`
          : `/api/orders?phone=${encodeURIComponent(targetQuery)}`;

        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setOrders(data.orders || []);
            } else {
              setOrders([]);
            }
          })
          .catch(() => setOrders([]))
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const isCode = query.toUpperCase().startsWith('DH-');
      const url = isCode
        ? `/api/orders?orderCode=${encodeURIComponent(query.trim())}`
        : `/api/orders?phone=${encodeURIComponent(query.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 stroke-[1.5]" /> Chờ Xác Nhận
          </span>
        );
      case 'PROCESSING':
      case 'DELIVERING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">
            <Truck className="w-3.5 h-3.5 animate-pulse stroke-[1.5]" /> Đang Giao Hàng
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[1.5]" /> Đã Hoàn Thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 stroke-[1.5]" /> Đã Hủy
          </span>
        );
      default:
        return <span className="text-xs font-semibold bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121419] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-neutral-800 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
        >
          <X className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* 1. Header Title & Description */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Search className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <h2 className="font-extrabold text-xl text-[#FAFAF9] tracking-tight">Tra Cứu Đơn Hàng Hỏa Tốc</h2>
            <p className="text-xs text-neutral-400 font-normal">Nhập số điện thoại người nhận để tra cứu đơn hàng</p>
          </div>
        </div>

        {/* 2. Phone Input + TRA CỨU Button */}
        <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
          <input
            type="text"
            required
            placeholder="Nhập SĐT nhận hàng (VD: 0912345678)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-semibold text-[#FAFAF9] focus:border-amber-500 focus:outline-none transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition"
          >
            {loading ? 'Đang tìm...' : 'TRA CỨU'}
          </button>
        </form>

        {/* Search Results */}
        {searched && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="text-center py-12 bg-[#0B0D11] rounded-xl border border-neutral-800 text-neutral-400 text-xs font-normal">
                <PackageCheck className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.25]" />
                Không tìm thấy đơn hàng nào khớp với dữ liệu tra cứu.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0B0D11] border border-neutral-800 rounded-xl p-5 space-y-3"
                >
                  {/* 3. Khung Thông Tin Người Nhận + Status Badge */}
                  <div className="p-3 rounded-xl bg-[#14171D] border border-neutral-800 flex items-center justify-between gap-3">
                    <PhoneActionCell name={order.customerName} phone={order.customerPhone} />
                    <div className="shrink-0">{getStatusBadge(order.status)}</div>
                  </div>

                  {/* 4. Khung Trạng Thái Giao Hàng Hỏa Tốc */}
                  {order.status === 'DELIVERING' && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/40 text-purple-200 text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛵</span>
                        <strong className="font-extrabold text-white text-xs">
                          Đơn hàng đang trên đường giao tới bạn!
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <p>
                          Đơn vị giao:{' '}
                          <strong className="text-white">
                            {(() => {
                              const cName = order.carrierName || 'GrabExpress';
                              const lower = cName.toLowerCase();
                              if (lower.includes('be')) return `🟡 ${cName}`;
                              if (lower.includes('xanh')) return `🌿 ${cName}`;
                              return `🟢 ${cName}`;
                            })()}
                          </strong>
                        </p>
                        <p>
                          Tài xế:{' '}
                          <strong className="text-white">
                            {order.driverName || 'Chưa cập nhật'} {order.driverPhone ? `(${order.driverPhone})` : ''}
                          </strong>
                        </p>
                      </div>
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-extrabold text-[11px] rounded-lg shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <span>📍 Xem Hành Trình Shipper Thời Gian Thực</span>
                        </a>
                      ) : (
                        <Link
                          href={`/don-hang/${order.orderCode}`}
                          className="block text-center text-purple-300 hover:underline text-[10px] font-bold"
                        >
                          📍 Chi tiết hành trình đơn hàng
                        </Link>
                      )}
                    </div>
                  )}

                  {/* 5. Danh Sách Món Ăn Đã Đặt */}
                  <div className="bg-[#14171D] rounded-lg p-3 border border-neutral-800/80 space-y-1.5">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs font-medium text-neutral-200">
                        <span>
                          {item.productName} x <strong className="text-amber-400 font-bold">{item.quantity}</strong>
                        </span>
                        <span>{item.subtotal?.toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  </div>

                  {/* 6. Tổng Tiền Thanh Toán */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-neutral-500">
                      PTTT: {order.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Chuyển khoản'}
                    </span>
                    <span className="font-extrabold text-base gold-gradient-text tracking-tight">
                      Tổng: {order.totalAmount?.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
