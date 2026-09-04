'use client';

import { useState } from 'react';
import { 
  Printer, QrCode, CheckCircle2, X, Check, Share2, 
  Store, Phone, MapPin, Sparkles, Building2
} from 'lucide-react';
import { Order } from '@/types/database';
import { updateOrderStatus } from '@/actions/orders';
import { deductInventoryForOrder, addNotification } from '@/lib/store';

interface ReceiptModalProps {
  order: Order | any;
  onClose: () => void;
  onPaymentConfirmed?: () => void;
}

export default function ReceiptModal({ order, onClose, onPaymentConfirmed }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(order.status === 'PAID');

  // Branch bank configuration fallback
  const bankId = order.branch?.bank_name || 'MB';
  const accountNo = order.branch?.bank_account || '0889018221';
  const accountName = order.branch?.bank_holder || 'GA U MUOI SMART';

  const orderCode = order.order_code || 'OD9673';
  const finalAmount = order.final_amount || 0;
  const subtotal = order.subtotal || finalAmount;
  const discount = order.discount_amount || 0;
  const branchName = order.branch?.name || 'CƠ SỞ VIN SMART CITY';
  const customerName = order.customer_name || 'Khách Hàng';
  const customerPhone = order.customer_phone || '';
  const shippingAddress = order.shipping_address || '';
  const note = order.note || '';
  const items = order.items || [];
  const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

  // Dynamic VietQR API URL
  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${finalAmount}&addInfo=${orderCode}&accountName=${encodeURIComponent(accountName)}`;

  // Copy Zalo bill summary
  const handleCopyZalo = () => {
    let text = `🍗 GÀ Ủ MUỐI SMART - HÓA ĐƠN #${orderCode}\n`;
    text += `📍 Chi nhánh: ${branchName}\n`;
    text += `👤 Khách hàng: ${customerName} - ${customerPhone}\n`;
    text += `🏠 Địa chỉ: ${shippingAddress}\n`;
    text += `-------------------------\n`;
    items.forEach((i: any) => {
      text += `• ${i.item_name} (x${i.quantity}): ${(i.subtotal || i.unit_price * i.quantity).toLocaleString('vi-VN')}đ\n`;
    });
    text += `-------------------------\n`;
    if (discount > 0) text += `Giảm giá: -${discount.toLocaleString('vi-VN')}đ\n`;
    text += `💰 TỔNG KHÁCH THANH TOÁN: ${finalAmount.toLocaleString('vi-VN')} VNĐ\n\n`;
    text += `📲 QUÉT MÃ VIETQR THANH TOÁN:\n${vietQrUrl}\n`;
    text += `STK: ${accountNo} (${bankId}) - Chủ TK: ${accountName}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Confirm Paid 1-Tap action
  const handleConfirmPaid = async () => {
    setIsPaid(true);
    if (order.id) {
      await updateOrderStatus(order.id, 'PAID');
    }
    deductInventoryForOrder(order);

    addNotification({
      type: 'ORDER',
      title: `🟢 Đã thanh toán đơn #${orderCode}`,
      message: `Khách hàng ${customerName} đã thanh toán ${finalAmount.toLocaleString('vi-VN')} VNĐ qua VietQR.`,
      link: '/admin/orders',
      actionText: 'Xem đơn'
    });

    if (onPaymentConfirmed) {
      onPaymentConfirmed();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 print-receipt-container animate-in zoom-in-95 duration-200">
        
        {/* Header (K80 thermal bill styling) */}
        <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
          <div className="flex items-center justify-between print-hidden">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
              ✓ Khổ Giấy In K80
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="font-black text-xl text-slate-900 tracking-wide pt-1">GÀ Ủ MUỐI SMART</h2>
          <p className="text-[11px] text-slate-600 font-medium">Hotline: 0988.123.456 · Chuỗi F&amp;B Khép Kín</p>
          <p className="text-[11px] text-slate-700 font-extrabold">{branchName}</p>
          
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600 font-bold border-t border-slate-100">
            <span>Mã đơn: <strong className="text-orange-600 text-xs font-black">#{orderCode}</strong></span>
            <span>{createdAt}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="text-xs text-slate-800 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>Khách hàng: <strong>{customerName}</strong> ({customerPhone})</div>
          {shippingAddress && <div>Địa chỉ: <span className="font-medium text-slate-700">{shippingAddress}</span></div>}
          {note && <div>Ghi chú: <span className="italic text-orange-700 font-semibold">{note}</span></div>}
        </div>

        {/* Itemized Table */}
        <div className="border-y border-dashed border-slate-300 py-3 text-xs space-y-2">
          <div className="grid grid-cols-12 font-bold text-slate-600 text-[10px] uppercase pb-1 border-b border-slate-100">
            <span className="col-span-6">Tên món</span>
            <span className="col-span-2 text-center">SL</span>
            <span className="col-span-4 text-right">Thành tiền</span>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="grid grid-cols-12 text-slate-900 font-medium text-xs">
              <span className="col-span-6 font-bold truncate">{item.item_name}</span>
              <span className="col-span-2 text-center font-extrabold">{item.quantity}</span>
              <span className="col-span-4 text-right font-extrabold text-slate-900">
                {(item.subtotal || item.unit_price * item.quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}

          <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Tổng tiền hàng (Subtotal):</span>
              <span>{subtotal.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-orange-700 font-bold">
                <span>Giảm giá (Discount):</span>
                <span>-{discount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            )}
            <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-300">
              <span>TỔNG KHÁCH THANH TOÁN:</span>
              <span className="text-orange-600 text-base">{finalAmount.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>
        </div>

        {/* Dynamic VietQR Payment Section */}
        <div className="bg-slate-50 border border-sky-300 rounded-2xl p-4 text-center space-y-2">
          <div className="text-[11px] font-extrabold text-sky-950 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <QrCode className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Mã Thanh Toán VietQR Tự Động</span>
          </div>

          <div className="flex justify-center py-1">
            <img
              src={vietQrUrl}
              alt={`VietQR ${orderCode}`}
              className="w-44 h-44 object-contain rounded-xl border border-slate-300 shadow-xs bg-white p-1"
            />
          </div>

          <div className="text-xs text-slate-800 font-medium">
            Ngân hàng: <strong className="text-slate-900">{bankId}</strong> · STK: <strong className="text-emerald-700 font-bold">{accountNo}</strong>
            <br />
            Chủ TK: <strong className="text-slate-900">{accountName}</strong>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            * Quét mã QR bằng App ngân hàng bất kỳ để thanh toán chính xác 100% không cần nhập tay.
          </p>
        </div>

        {/* Payment Status Indicator */}
        <div className="text-center">
          {isPaid ? (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ĐÃ THANH TOÁN THÀNH CÔNG (PAID)</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 animate-pulse">
              <span>🟡 CHỜ THANH TOÁN (RECEIVED)</span>
            </span>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 print-hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>In Hóa Đơn K80</span>
          </button>

          <button
            type="button"
            onClick={handleCopyZalo}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Đã Copy Bill!' : 'Copy Gửi Zalo'}</span>
          </button>

          {!isPaid && (
            <button
              type="button"
              onClick={handleConfirmPaid}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Đã Trả</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
