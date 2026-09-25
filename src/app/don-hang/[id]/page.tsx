'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Flame,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  PackageCheck,
  ExternalLink,
  MapPin,
  Phone,
  ShoppingBag,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id?: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OrderRecord {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  note?: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  cashAmount?: number | null;
  transferAmount?: number | null;
  discountAmount?: number | null;
  shippingFee?: number | null;
  branchId?: string | null;
  carrierName?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  items: OrderItem[];
  createdAt: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<any>({
    bankId: 'MB',
    bankName: 'MBBank',
    accountNumber: '0988888888',
    accountName: 'NGUYEN VAN KHANG',
    qrTemplate: 'compact2',
    transferSyntax: 'GMS [Mã_Đơn]'
  });

  const fetchOrderDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (data.order.branchId) {
          fetch(`/api/settings/payment?branchId=${data.order.branchId}`)
            .then((r) => r.json())
            .then((pData) => {
              if (pData.config) setPaymentConfig(pData.config);
            })
            .catch(() => {});
        }
      } else {
        setError(data.error || 'Không tìm thấy thông tin đơn hàng này!');
      }
    } catch (err: any) {
      setError('Lỗi kết nối tới máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 15000); // auto-poll status every 15s
    return () => clearInterval(interval);
  }, [id]);

  const getStepState = (targetStatus: string) => {
    if (!order) return 'upcoming';
    const statusOrder = ['PENDING', 'CONFIRMED', 'DELIVERING', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(order.status);
    const targetIndex = statusOrder.indexOf(targetStatus);

    if (order.status === 'CANCELLED') return 'cancelled';
    if (currentIndex > targetIndex) return 'completed';
    if (currentIndex === targetIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-[#0B0D11] text-stone-100 font-sans selection:bg-amber-500 selection:text-neutral-950 pb-16">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-[#121419]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold text-base text-amber-500 hover:opacity-90 transition"
          >
            <Flame className="w-5 h-5 text-amber-500" />
            <span className="gold-gradient-text tracking-wide uppercase">GÀ Ủ MUỐI SMART</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-400">Hotline:</span>
            <a href="tel:0988888901" className="font-mono font-bold text-amber-400 hover:underline">
              0988.888.901
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft size={14} />
            <span>Trở về Trang chủ</span>
          </Link>

          <button
            onClick={fetchOrderDetails}
            className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
          >
            🔄 Cập nhật trạng thái
          </button>
        </div>

        {loading && !order ? (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto"></div>
            <p className="text-xs text-neutral-400 font-medium">Đang tải thông tin hành trình đơn hàng...</p>
          </div>
        ) : error || !order ? (
          <div className="py-16 text-center bg-[#121419] rounded-2xl border border-neutral-800 p-8 space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto stroke-[1.5]" />
            <h3 className="font-bold text-base text-white">Tra Cứu Không Thấy Đơn Hàng</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">{error}</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-md hover:bg-amber-400 transition"
            >
              Về Trang Chủ Đặt Món
            </Link>
          </div>
        ) : (
          <>
            {/* Top Order Code Card */}
            <div className="bg-[#121419] p-6 rounded-2xl border border-neutral-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-xs text-neutral-400 block mb-0.5">MÃ ĐƠN HÀNG HỎA TỐC</span>
                  <h1 className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                    #{order.orderCode}
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-500 block font-mono">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-black border ${
                      order.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : order.status === 'CONFIRMED'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : order.status === 'DELIVERING'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                        : order.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {order.status === 'PENDING' && '🟡 Chờ Xác Nhận'}
                    {order.status === 'CONFIRMED' && '🔵 Bếp Đang Chế Biến'}
                    {order.status === 'DELIVERING' && '🛵 Đang Giao Hàng Hỏa Tốc'}
                    {order.status === 'COMPLETED' && '🟢 Hoàn Thành Giao Hàng'}
                    {order.status === 'CANCELLED' && '🔴 Đã Hủy Đơn'}
                  </span>
                </div>
              </div>

              {/* STEPPER PROGRESS BAR (4 LIFECYCLE STEPS) */}
              <div className="pt-2 pb-1">
                <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                  {/* Step 1: PENDING */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      getStepState('PENDING') === 'active' || getStepState('PENDING') === 'completed'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm'
                        : 'bg-[#0B0D11] text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>1. Nhận Đơn</span>
                  </div>

                  {/* Step 2: CONFIRMED */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      getStepState('CONFIRMED') === 'active'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm ring-1 ring-blue-500/30'
                        : getStepState('CONFIRMED') === 'completed'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        : 'bg-[#0B0D11] text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>2. Bếp Làm</span>
                  </div>

                  {/* Step 3: DELIVERING */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      getStepState('DELIVERING') === 'active'
                        ? 'bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-md animate-pulse ring-2 ring-purple-500/40'
                        : getStepState('DELIVERING') === 'completed'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        : 'bg-[#0B0D11] text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>3. Đang Giao</span>
                  </div>

                  {/* Step 4: COMPLETED */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      getStepState('COMPLETED') === 'active' || getStepState('COMPLETED') === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#0B0D11] text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>4. Hoàn Thành</span>
                  </div>
                </div>
              </div>
            </div>

            {/* REQUIREMENT 3: PROMINENT HIGHLIGHT SHIPPING BLOCK WHEN STATUS IS DELIVERING */}
            {order.status === 'DELIVERING' && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-purple-900/60 to-indigo-950/80 border-2 border-purple-500/50 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    🛵
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white flex items-center gap-2">
                      <span>Đơn hàng đang trên đường giao tới bạn!</span>
                    </h3>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Bếp đã bàn giao xong cho đối tác vận chuyển hỏa tốc. Vui lòng giữ máy liên lạc.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-purple-500/30 text-purple-100 font-medium">
                  <div className="p-2.5 bg-purple-900/40 rounded-xl border border-purple-500/20">
                    <span className="text-purple-300 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                      🚚 ĐƠN VỊ VẬN CHUYỂN
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {(() => {
                        const cName = order.carrierName || 'GrabExpress';
                        const lower = cName.toLowerCase();
                        if (lower.includes('be')) return <span className="text-amber-400">🟡 {cName}</span>;
                        if (lower.includes('xanh')) return <span className="text-teal-300">🌿 {cName}</span>;
                        return <span className="text-emerald-400">🟢 {cName}</span>;
                      })()}
                    </span>
                  </div>

                  <div className="p-2.5 bg-purple-900/40 rounded-xl border border-purple-500/20">
                    <span className="text-purple-300 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                      👤 TÀI XẾ PHỤ TRÁCH
                    </span>
                    <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                      <span>{order.driverName || 'Tài xế hỏa tốc'}</span>
                      {order.driverPhone && (
                        <a
                          href={`tel:${order.driverPhone}`}
                          className="text-emerald-400 hover:underline font-mono text-xs"
                        >
                          ({order.driverPhone})
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 transition cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <span>📍 Xem Hành Trình Shipper Thời Gian Thực (Live GPS)</span>
                    <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  </a>
                ) : (
                  <div className="text-center text-[11px] text-purple-300 italic py-1">
                    📍 Link định vị vị trí xe chạy trực tiếp đang được cập nhật...
                  </div>
                )}
              </div>
            )}

            {/* Delivery Info & Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#121419] rounded-2xl border border-neutral-800 space-y-2 text-xs">
                <span className="font-extrabold text-amber-500 uppercase tracking-wider text-[10px] block">
                  📍 THÔNG TIN GIAO HÀNG
                </span>
                <p>
                  <strong className="text-white">Người nhận:</strong> {order.customerName}
                </p>
                <p>
                  <strong className="text-white">Số điện thoại:</strong> {order.customerPhone}
                </p>
                <p className="text-neutral-300">
                  <strong className="text-white">Địa chỉ nhận:</strong> {order.deliveryAddress}
                </p>
                {order.note && (
                  <p className="italic text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <strong className="text-amber-400">Ghi chú:</strong> {order.note}
                  </p>
                )}
              </div>

              <div className="p-4 bg-[#121419] rounded-2xl border border-neutral-800 space-y-2 text-xs">
                <span className="font-extrabold text-amber-500 uppercase tracking-wider text-[10px] block">
                  💳 THANH TOÁN
                </span>
                <p>
                  <strong className="text-white">Hình thức:</strong>{' '}
                  {order.paymentMethod === 'COD' ? '💵 Thanh toán khi nhận' : '📱 Thanh toán trước (Chuyển khoản QR)'}
                </p>
                <p>
                  <strong className="text-white">Trạng thái tiền:</strong>{' '}
                  {order.paymentStatus === 'PAID' ? (
                    <span className="text-emerald-400 font-bold">✅ Đã thanh toán</span>
                  ) : (
                    <span className="text-amber-400 font-bold">⏳ Chờ thu tiền khi giao</span>
                  )}
                </p>
              </div>
            </div>

            {/* Items Summary Table */}
            <div className="bg-[#121419] rounded-2xl border border-neutral-800 overflow-hidden shadow-xl p-4 space-y-3">
              <span className="font-extrabold text-amber-500 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <ShoppingBag size={14} />
                <span>CHI TIẾT ĐƠN HÀNG ({order.items.length} MÓN)</span>
              </span>

              <div className="divide-y divide-neutral-800 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">{item.productName}</span>
                      <span className="text-[11px] text-neutral-400">
                        {item.quantity} x {item.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <span className="font-bold text-amber-400 font-mono">
                      {item.subtotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Phí giao hàng:</span>
                  <span>{(order.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Giảm giá:</span>
                  <span>-{(order.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-neutral-800">
                  <span className="text-white">TỔNG THÀNH TIỀN:</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic VietQR Payment Box if Unpaid */}
            {order.paymentStatus !== 'PAID' && (
              <div className="bg-[#121419] rounded-2xl border-2 border-amber-500/40 overflow-hidden shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <span>⚡ QUÉT MÃ VIETQR THANH TOÁN TỰ ĐỘNG</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Napas 247 • Khớp lệnh tức thì
                  </span>
                </div>

                {(() => {
                  const qrPayAmount =
                    order.paymentMethod === 'SPLIT' && (order.transferAmount || 0) > 0
                      ? order.transferAmount || order.totalAmount
                      : order.totalAmount;
                  const transferSyntax = (paymentConfig.transferSyntax || 'GMS [Mã_Đơn]')
                    .replace('[Mã_Đơn]', order.orderCode)
                    .replace('[SĐT]', order.customerPhone || '');
                  const qrUrl = `https://img.vietqr.io/image/${paymentConfig.bankId || 'MB'}-${paymentConfig.accountNumber || '0988888888'}-${paymentConfig.qrTemplate || 'compact2'}.png?amount=${qrPayAmount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(paymentConfig.accountName || 'GA U MUOI SMART')}`;

                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-xl border border-neutral-800">
                      <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg">
                        <img
                          src={qrUrl}
                          alt="VietQR Gà Ủ Muối Smart"
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                      <div className="text-xs space-y-1.5 text-neutral-300 flex-1 w-full">
                        <p className="flex justify-between border-b border-neutral-800/80 pb-1">
                          <span className="text-neutral-400">Ngân hàng:</span>
                          <strong className="text-white">{paymentConfig.bankName || paymentConfig.bankId}</strong>
                        </p>
                        <p className="flex justify-between border-b border-neutral-800/80 pb-1">
                          <span className="text-neutral-400">Số tài khoản:</span>
                          <strong className="text-amber-400 font-mono text-sm">{paymentConfig.accountNumber}</strong>
                        </p>
                        <p className="flex justify-between border-b border-neutral-800/80 pb-1">
                          <span className="text-neutral-400">Chủ tài khoản:</span>
                          <strong className="text-white uppercase">{paymentConfig.accountName}</strong>
                        </p>
                        <p className="flex justify-between border-b border-neutral-800/80 pb-1">
                          <span className="text-neutral-400">Số tiền QR:</span>
                          <strong className="text-emerald-400 font-mono text-sm">{qrPayAmount.toLocaleString('vi-VN')} đ</strong>
                        </p>
                        <p className="flex justify-between pt-0.5">
                          <span className="text-neutral-400">Cú pháp CK:</span>
                          <strong className="text-amber-300 font-mono font-bold">{transferSyntax}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-center text-amber-300/80 italic">
                  💡 Sau khi chuyển khoản thành công, hệ thống ngân hàng sẽ tự động báo cho Bếp để ưu tiên xuất đơn ngay!
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
