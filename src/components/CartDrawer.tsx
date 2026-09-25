'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, CheckCircle2, MapPin, Sparkles, UserCheck, CreditCard, ShieldCheck, QrCode, PhoneCall, Loader2 } from 'lucide-react';
import { Product } from './MenuSection';

import { useBranches, detectBranchIdFromText } from '../hooks/useBranches';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenTracking?: (phone: string) => void;
}

const FALLBACK_BRANCH_MAPPINGS = [
  {
    id: 'cs1',
    code: 'CS1',
    name: 'Cơ Sở Vin Smart city (6 - A20 Geleximco An Khánh - Tây Mỗ)',
    shortName: 'CS1 - Vin Smart City / Hoài Đức',
    keywords: ['smart city', 'vinsmart', 'vin smart', 'geleximco', 'an khánh', 'tây mỗ', 'đại mỗ', 'hoài đức', 'nam từ liêm', 'lê trọng tấn', 'hà đông'],
  },
  {
    id: 'cs2',
    code: 'CS2',
    name: 'Cơ Sở Trần Cung - Cầu Giấy (5 - 208 Trần Cung)',
    shortName: 'CS2 - Trần Cung / Cầu Giấy',
    keywords: ['trần cung', 'cầu giấy', 'nghĩa tân', 'hoàng quốc việt', 'phạm văn đồng', 'bắc từ liêm', 'xuân thủy', 'cổ nhuế', 'mỹ đình'],
  },
  {
    id: 'cs3',
    code: 'CS3',
    name: 'Cơ Sở Bán Đảo Linh Đàm (Kiot 4 Nơ 7B Bán Đảo Linh Đàm)',
    shortName: 'CS3 - Bán Đảo Linh Đàm / Hoàng Mai',
    keywords: ['linh đàm', 'hoàng mai', 'đại thanh', 'thanh trì', 'bán đảo linh đàm', 'nơ 7b', 'giải phóng', 'ngọc hồi', 'định công', 'kim văn kim lũ'],
  },
  {
    id: 'cs4',
    code: 'CS4',
    name: 'Cơ Sở Hai Bà Trưng (51 Yên Lạc - Vĩnh Tuy)',
    shortName: 'CS4 - Hai Bà Trưng / Vĩnh Tuy',
    keywords: ['yên lạc', 'vĩnh tuy', 'hai bà trưng', 'minh khai', 'times city', 'kim ngưu', 'lạc trung', 'bạch mai', 'hoàn kiếm', 'đại la'],
  },
  {
    id: 'cs5',
    code: 'CS5',
    name: 'Cơ Sở Vin Ocean Park 1 (SP10.11 Hải Âu 9 - Vin Ocean Park 1)',
    shortName: 'CS5 - Vin Ocean Park 1 / Gia Lâm',
    keywords: ['ocean park', 'hải âu', 'gia lâm', 'long biên', 'vin ocean park', 'trâu quỳ', 'bát tràng', 'vinhomes ocean park', 'hải âu 9'],
  },
  {
    id: 'cs6',
    code: 'CS6',
    name: 'Cơ Sở Vũng Tàu - HCM (Phú Mỹ - Vũng Tàu)',
    shortName: 'CS6 - Phú Mỹ / Vũng Tàu',
    keywords: ['vũng tàu', 'phú mỹ', 'bà rịa', 'tân thành', 'hồ chí minh', 'thủ đức', 'đồng nai'],
  },
];

function detectBranch(address: string, branchMappings: any[]) {
  if (!address || address.trim().length < 3) return null;
  const lower = address.toLowerCase();
  for (const branch of branchMappings) {
    if (branch.keywords && branch.keywords.some((kw: string) => lower.includes(kw.toLowerCase()))) {
      return branch;
    }
  }
  return null;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenTracking,
}: CartDrawerProps) {
  const { branches } = useBranches();

  const activeBranchMappings = branches.length > 0
    ? branches.map((b) => {
        const fallback = FALLBACK_BRANCH_MAPPINGS.find(
          (fb) => fb.id.toLowerCase() === b.id.toLowerCase() || fb.id.toLowerCase() === b.code?.toLowerCase()
        );
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          shortName: b.code ? `${b.code.toUpperCase()} - ${b.name}` : b.name,
          keywords: b.keywords || fallback?.keywords || [b.name.toLowerCase(), (b.address || '').toLowerCase()],
        };
      })
    : FALLBACK_BRANCH_MAPPINGS;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [suggestedBranch, setSuggestedBranch] = useState<{ name: string; shortName: string } | null>(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'SPLIT'>('COD');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitTransferAmount, setSplitTransferAmount] = useState<number>(0);

  const [existingCustomer, setExistingCustomer] = useState<{ name: string; totalOrders: number } | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceResult, setDistanceResult] = useState<{
    distanceKm: number;
    estimatedFee: number;
    nearestBranch: string;
    nearestBranchId?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);

  const [paymentConfig, setPaymentConfig] = useState<any>({
    bankId: 'MB',
    bankName: 'MBBank',
    accountNumber: '0988888888',
    accountName: 'NGUYEN VAN KHANG',
    qrTemplate: 'compact2',
    transferSyntax: 'GUM [Mã_Đơn]',
    note: '⚡ Đơn hàng sẽ được tự động chuyển sang bếp chế biến ngay khi ngân hàng báo biến động dư nợ!'
  });

  useEffect(() => {
    const url = selectedStore
      ? `/api/settings/payment?branchId=${selectedStore}`
      : '/api/settings/payment';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setPaymentConfig(data.config);
        }
      })
      .catch(console.error);
  }, [selectedStore]);

  // AI-powered distance & dynamic shipping calculation effect (debounce 800ms)
  useEffect(() => {
    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      setDistanceResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculatingDistance(true);
      try {
        const res = await fetch('/api/shipping/calculate-distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerAddress: deliveryAddress }),
        });
        const data = await res.json();
        if (data.success && data.distanceKm) {
          setDistanceResult({
            distanceKm: data.distanceKm,
            estimatedFee: data.estimatedFee,
            nearestBranch: data.nearestBranch,
            nearestBranchId: data.nearestBranchId,
          });

          // Match branch in activeBranchMappings by ID or code or name
          const matchedBranch = activeBranchMappings.find(
            (b) =>
              b.id === data.nearestBranchId ||
              b.code?.toLowerCase() === data.nearestBranchId?.toLowerCase() ||
              data.nearestBranch?.toLowerCase().includes(b.name.toLowerCase())
          );

          if (matchedBranch) {
            setSelectedStore(matchedBranch.id);
            setSuggestedBranch({ name: matchedBranch.name, shortName: matchedBranch.shortName });
          } else if (data.nearestBranchId) {
            setSelectedStore(data.nearestBranchId);
          }
        }
      } catch (err) {
        console.error('Error calculating distance:', err);
      } finally {
        setIsCalculatingDistance(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [deliveryAddress]);

  const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranchId = e.target.value;
    setSelectedStore(newBranchId);
    const chosen = activeBranchMappings.find((b) => b.id === newBranchId);
    if (chosen) {
      setSuggestedBranch({ name: chosen.name, shortName: chosen.shortName });
    } else {
      setSuggestedBranch(null);
    }

    // If customer has entered address, recalculate distance and fee for the chosen branch
    if (deliveryAddress && deliveryAddress.trim().length >= 5 && newBranchId) {
      setIsCalculatingDistance(true);
      try {
        const res = await fetch('/api/shipping/calculate-distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerAddress: deliveryAddress,
            branchId: newBranchId,
          }),
        });
        const data = await res.json();
        if (data.success && data.distanceKm) {
          setDistanceResult({
            distanceKm: data.distanceKm,
            estimatedFee: data.estimatedFee,
            nearestBranch: data.nearestBranch || (chosen?.shortName || chosen?.name || 'Cơ sở'),
            nearestBranchId: newBranchId,
          });
        }
      } catch (err) {
        console.error('Error recalculating distance for chosen branch:', err);
      } finally {
        setIsCalculatingDistance(false);
      }
    }
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeship = subtotal >= 355000;
  const finalTotalAmount = subtotal; // Quán chỉ thu tiền món, ship trả riêng cho tài xế

  const handlePaymentMethodSelect = (method: 'COD' | 'BANK_TRANSFER' | 'SPLIT') => {
    setPaymentMethod(method);
    if (method === 'SPLIT') {
      const half = Math.round(finalTotalAmount / 2);
      setSplitCashAmount(half);
      setSplitTransferAmount(finalTotalAmount - half);
    }
  };

  const handleSplitCashChange = (val: number) => {
    const cash = Math.max(0, Math.min(finalTotalAmount, isNaN(val) ? 0 : val));
    setSplitCashAmount(cash);
    setSplitTransferAmount(Math.max(0, finalTotalAmount - cash));
  };

  const handleSplitTransferChange = (val: number) => {
    const transfer = Math.max(0, Math.min(finalTotalAmount, isNaN(val) ? 0 : val));
    setSplitTransferAmount(transfer);
    setSplitCashAmount(Math.max(0, finalTotalAmount - transfer));
  };

  useEffect(() => {
    if (paymentMethod === 'SPLIT') {
      if (splitCashAmount + splitTransferAmount !== finalTotalAmount) {
        const cash = Math.min(splitCashAmount, finalTotalAmount);
        setSplitCashAmount(cash);
        setSplitTransferAmount(Math.max(0, finalTotalAmount - cash));
      }
    }
  }, [finalTotalAmount, paymentMethod]);

  if (!isOpen) return null;

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerPhone(val);
    const cleanPhone = val.replace(/\D/g, '');

    if (cleanPhone.length >= 10) {
      setIsLookingUpPhone(true);
      try {
        const res = await fetch(`/api/customers/lookup?phone=${cleanPhone}`);
        const data = await res.json();
        if (data.success && data.customer) {
          if (!customerName) setCustomerName(data.customer.name);
          if (!deliveryAddress && data.customer.address) {
            setDeliveryAddress(data.customer.address);
            const detected = detectBranch(data.customer.address, activeBranchMappings);
            if (detected) {
              setSelectedStore(detected.id);
              setSuggestedBranch({ name: detected.name, shortName: detected.shortName });
            }
          }
          setExistingCustomer({
            name: data.customer.name,
            totalOrders: data.customer.totalOrders || 1,
          });
        } else {
          setExistingCustomer(null);
        }
      } catch (err) {
        console.error('Lookup error:', err);
      } finally {
        setIsLookingUpPhone(false);
      }
    } else {
      setExistingCustomer(null);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setDeliveryAddress(addr);
    const detected = detectBranch(addr, activeBranchMappings);
    if (detected) {
      setSelectedStore(detected.id);
      setSuggestedBranch({ name: detected.name, shortName: detected.shortName });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) {
      alert('Vui lòng nhập đầy đủ Tên, Số điện thoại và Địa chỉ nhận hàng!');
      return;
    }
    if (cart.length === 0) {
      alert('Giỏ hàng của bạn đang trống!');
      return;
    }

    // Validation: Auto-assign valid branchId if still empty
    const finalBranchId =
      selectedStore && selectedStore !== ''
        ? selectedStore
        : distanceResult?.nearestBranchId || activeBranchMappings[0]?.id || 'cs1';

    const branchObj = activeBranchMappings.find((b) => b.id === finalBranchId);
    const branchDisplayName = branchObj ? branchObj.shortName || branchObj.name : finalBranchId;
    const combinedNote = branchDisplayName ? `[Cơ sở chọn: ${branchDisplayName}] ${note}` : note;

    const paymentPayload =
      paymentMethod === 'COD'
        ? { paymentMethod: 'CASH', cashAmount: finalTotalAmount, transferAmount: 0 }
        : paymentMethod === 'BANK_TRANSFER'
        ? { paymentMethod: 'BANK_TRANSFER', cashAmount: 0, transferAmount: finalTotalAmount }
        : { paymentMethod: 'SPLIT', cashAmount: splitCashAmount, transferAmount: splitTransferAmount };

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          deliveryAddress,
          note: combinedNote,
          ...paymentPayload,
          branchId: finalBranchId,
          totalAmount: finalTotalAmount,
          discountAmount: 0,
          shippingFee: 0,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCreatedOrderCode(data.order.orderCode);
        onClearCart();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi tạo đơn hàng');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedOrderCode(null);
    onClose();
  };

  const cleanPhoneForQR = customerPhone.replace(/\D/g, '') || 'ONLINE';
  const dynamicSyntax = (paymentConfig.transferSyntax || 'GUM [Mã_Đơn]')
    .replace('[Mã_Đơn]', cleanPhoneForQR)
    .replace('[SĐT]', cleanPhoneForQR);
  const qrAmount = paymentMethod === 'SPLIT' ? splitTransferAmount : finalTotalAmount;
  const vietQRUrl = `https://img.vietqr.io/image/${paymentConfig.bankId || 'MB'}-${paymentConfig.accountNumber || '0988888888'}-${paymentConfig.qrTemplate || 'compact2'}.png?amount=${qrAmount}&addInfo=${encodeURIComponent(dynamicSyntax)}&accountName=${encodeURIComponent(paymentConfig.accountName || 'GA U MUOI SMART')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#121419] h-full border-l border-neutral-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-[#0B0D11]">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-amber-400 stroke-[1.5]" />
            <h2 className="font-extrabold text-lg text-[#FAFAF9] tracking-tight">Giỏ Hàng Của Bạn</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-6 h-6 stroke-[1.5]" />
          </button>
        </div>

        {/* Modal/Popup Đặt Hàng Thành Công */}
        {createdOrderCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#121212] p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
              {/* Icon Thành Công */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-9 w-9 animate-bounce stroke-[2]" />
              </div>

              {/* Tiêu đề */}
              <h3 className="text-2xl font-black text-white tracking-wide">
                Đặt Đơn Thành Công!
              </h3>

              {/* Hộp ghi chú thời gian gọi & báo phí ship */}
              <div className="my-5 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-left text-amber-200">
                <PhoneCall className="h-5 w-5 shrink-0 text-amber-400 animate-pulse stroke-[2]" />
                <p className="text-sm font-medium leading-snug">
                  Sau 2-3 phút, nhân viên sẽ gọi xác nhận đi đơn và báo phí ship cụ thể ạ.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const phone = customerPhone;
                    handleReset();
                    if (onOpenTracking) {
                      onOpenTracking(phone);
                    }
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔍 Theo Dõi Đơn Hàng</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl border border-neutral-800 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white cursor-pointer"
                >
                  Tiếp Tục Xem Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart items list & checkout form when not created */}
        {!createdOrderCode && (
          <>
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-[1.25]" />
                  <p className="text-sm font-semibold">Chưa có sản phẩm nào trong giỏ hàng</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between bg-[#0B0D11] p-3 rounded-xl border border-neutral-800"
                  >
                    <img
                      src={item.product.image || 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80'}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-lg object-cover border border-neutral-800"
                    />

                    <div className="flex-1 px-3">
                      <h4 className="font-bold text-xs text-[#FAFAF9] tracking-tight line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-xs font-bold text-amber-400 mt-0.5">
                        {item.product.price.toLocaleString('vi-VN')} đ
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center hover:bg-amber-500 hover:text-neutral-950 transition"
                        >
                          <Minus className="w-3 h-3 stroke-[1.5]" />
                        </button>
                        <span className="text-xs font-bold text-[#FAFAF9] w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center hover:bg-amber-500 hover:text-neutral-950 transition"
                        >
                          <Plus className="w-3 h-3 stroke-[1.5]" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.5]" />
                    </button>
                  </div>
                ))
              )}

              {/* Checkout Form */}
              {cart.length > 0 && (
                <form id="order-form" onSubmit={handleSubmitOrder} className="pt-6 border-t border-neutral-800 space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Thông Tin Nhận Hàng
                  </h3>

                  {/* Customer Phone Input with CRM Lookup */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Số Điện Thoại Nhận Hàng (*)
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="Ví dụ: 0912345678"
                        value={customerPhone}
                        onChange={handlePhoneChange}
                        className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-medium text-[#FAFAF9] focus:border-amber-500 focus:outline-none transition-colors"
                      />
                      {isLookingUpPhone && (
                        <div className="absolute right-3 top-2.5 text-[10px] text-amber-400 animate-pulse">
                          Đang tra cứu CRM...
                        </div>
                      )}
                    </div>
                    {existingCustomer && (
                      <div className="mt-1.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                        <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>
                          👋 Chào mừng bạn quay trở lại, <strong className="text-amber-300">{existingCustomer.name}</strong>! ({existingCustomer.totalOrders} đơn hàng trước đó)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Customer Name Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Họ & Tên Người Nhận (*)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Anh Tuấn"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-medium text-[#FAFAF9] focus:border-amber-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Delivery Address Input with Smart Branch Detection & AI Distance */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Địa Chỉ Nhận Hàng Chi Tiết (*)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 12 Đường Cầu Giấy, Q. Cầu Giấy, Hà Nội"
                        value={deliveryAddress}
                        onChange={handleAddressChange}
                        className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-medium text-[#FAFAF9] focus:border-amber-500 focus:outline-none transition-colors"
                      />
                      {isCalculatingDistance && (
                        <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[10px] text-amber-400 font-medium animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Đang đo khoảng cách...</span>
                        </div>
                      )}
                    </div>
                    {distanceResult ? (
                      <div className="mt-1.5 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-emerald-400 text-[11px] font-semibold animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span>
                            🎯 Gần nhất: <strong className="text-amber-300">{distanceResult.nearestBranch}</strong>
                          </span>
                        </div>
                        <span className="text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          ~{distanceResult.distanceKm} km ({distanceResult.estimatedFee.toLocaleString('vi-VN')} đ)
                        </span>
                      </div>
                    ) : suggestedBranch ? (
                      <div className="mt-1.5 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold animate-in fade-in duration-200">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>
                          🎯 Đã chọn: <strong className="text-amber-300">{suggestedBranch.shortName}</strong> (Gần bạn nhất • Giao hỏa tốc 25-35 phút)
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Branch Select */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                      <span>Cơ Sở Giao Hàng Phục Vụ</span>
                      {selectedStore && distanceResult && (
                        <span className="text-[10px] text-amber-400 font-normal">
                          (Đã chọn chi nhánh tối ưu)
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedStore}
                      onChange={handleBranchChange}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-medium text-amber-300 focus:border-amber-500 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-neutral-900 text-neutral-400">
                        {isCalculatingDistance ? '-- ⏳ Đang tìm cơ sở gần bạn nhất... --' : '-- Tự động chọn cơ sở gần nhất --'}
                      </option>
                      {activeBranchMappings.map((b) => {
                        const isNearest =
                          distanceResult?.nearestBranchId === b.id ||
                          (distanceResult?.nearestBranch &&
                            distanceResult.nearestBranch.toLowerCase().includes(b.name.toLowerCase()));
                        return (
                          <option key={b.id} value={b.id} className="bg-neutral-900 text-neutral-100 font-medium">
                            {b.shortName || b.name} {isNearest && distanceResult?.distanceKm ? `⚡ Gần nhất (~${distanceResult.distanceKm} km)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Note Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Ghi Chú Đơn Hàng
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Chặt sẵn gà, nhiều sốt ớt xanh..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-medium text-[#FAFAF9] focus:border-amber-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                      Phương Thức Thanh Toán
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handlePaymentMethodSelect('COD')}
                        className={`py-2 px-1.5 rounded-xl font-semibold border flex items-center justify-center gap-1 transition text-[11px] ${
                          paymentMethod === 'COD'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                            : 'bg-[#0B0D11] border-neutral-800 text-neutral-400'
                        }`}
                      >
                        💵 Tiền mặt
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePaymentMethodSelect('BANK_TRANSFER')}
                        className={`py-2 px-1.5 rounded-xl font-semibold border flex items-center justify-center gap-1 transition text-[11px] ${
                          paymentMethod === 'BANK_TRANSFER'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                            : 'bg-[#0B0D11] border-neutral-800 text-neutral-400'
                        }`}
                      >
                        🏦 Chuyển khoản
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePaymentMethodSelect('SPLIT')}
                        className={`py-2 px-1.5 rounded-xl font-semibold border flex items-center justify-center gap-1 transition text-[11px] ${
                          paymentMethod === 'SPLIT'
                            ? 'bg-purple-500/15 border-purple-500 text-purple-300'
                            : 'bg-[#0B0D11] border-neutral-800 text-neutral-400'
                        }`}
                      >
                        🔀 Hỗn hợp
                      </button>
                    </div>
                  </div>

                  {/* Split Payment Input Section */}
                  {paymentMethod === 'SPLIT' && (
                    <div className="p-3 bg-[#0B0D11] border border-purple-500/30 rounded-xl space-y-3 animate-in fade-in duration-300">
                      <div className="text-[11px] font-bold text-purple-300 flex items-center justify-between">
                        <span>🔀 Phân Bổ Tiền Mặt & Chuyển Khoản</span>
                        <span className="text-neutral-400 font-normal">
                          Tổng: <strong className="text-amber-400">{finalTotalAmount.toLocaleString('vi-VN')} đ</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-amber-400 mb-1">
                            💵 Tiền mặt (đ)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={finalTotalAmount}
                            value={splitCashAmount || ''}
                            onChange={(e) => handleSplitCashChange(Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-blue-400 mb-1">
                            🏦 Chuyển khoản (đ)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={finalTotalAmount}
                            value={splitTransferAmount || ''}
                            onChange={(e) => handleSplitTransferChange(Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {splitTransferAmount > 0 && (
                        <div className="pt-2 border-t border-neutral-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                              Mã QR Chuyển Khoản ({splitTransferAmount.toLocaleString('vi-VN')} đ)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">{paymentConfig.bankName || paymentConfig.bankId || 'MB Bank'}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-md">
                              <img
                                src={vietQRUrl}
                                alt="VietQR Chuyển Khoản Gà Ủ Muối Smart"
                                className="w-24 h-24 object-contain"
                              />
                            </div>
                            <div className="text-[11px] space-y-1 text-neutral-300 flex-1">
                              <p className="text-neutral-400">Ngân hàng: <strong className="text-white">{paymentConfig.bankName || paymentConfig.bankId}</strong></p>
                              <p className="text-neutral-400">Số tài khoản: <strong className="text-amber-400 font-mono">{paymentConfig.accountNumber}</strong></p>
                              <p className="text-neutral-400">Số tiền QR: <strong className="text-emerald-400 font-mono">{splitTransferAmount.toLocaleString('vi-VN')} đ</strong></p>
                              <p className="text-neutral-400">Cú pháp CK: <strong className="text-amber-300 font-mono">{dynamicSyntax}</strong></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VietQR Display Box when Bank Transfer selected */}
                  {paymentMethod === 'BANK_TRANSFER' && (
                    <div className="p-3.5 bg-[#0B0D11] border border-amber-500/30 rounded-xl space-y-3 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                          Mã QR Chuyển Khoản Tự Động (VietQR)
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">MB Bank</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-md">
                          <img
                            src={vietQRUrl}
                            alt="VietQR Chuyển Khoản Gà Ủ Muối Smart"
                            className="w-24 h-24 object-contain"
                          />
                        </div>
                        <div className="text-[11px] space-y-1 text-neutral-300 flex-1">
                          <p className="text-neutral-400">Ngân hàng: <strong className="text-white">{paymentConfig.bankName || paymentConfig.bankId}</strong></p>
                          <p className="text-neutral-400">Số tài khoản: <strong className="text-amber-400 font-mono">{paymentConfig.accountNumber}</strong></p>
                          <p className="text-neutral-400">Chủ tài khoản: <strong className="text-white">{paymentConfig.accountName}</strong></p>
                          <p className="text-neutral-400">Cú pháp CK: <strong className="text-amber-300 font-mono">{dynamicSyntax}</strong></p>
                        </div>
                      </div>

                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300/90 leading-tight">
                        {paymentConfig.note || '⚡ Đơn hàng sẽ được tự động chuyển sang bếp chế biến ngay khi ngân hàng báo biến động dư nợ!'}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Total Financial Breakdown */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-neutral-800 bg-[#0B0D11] space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Tạm tính tiền món:</span>
                    <span className="font-semibold text-neutral-200">{subtotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-neutral-400">
                    <div className="flex justify-between items-center">
                      <span>Phí vận chuyển dự kiến:</span>
                      {isCalculatingDistance ? (
                        <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          Đang đo khoảng cách từ cơ sở gần nhất...
                        </span>
                      ) : distanceResult ? (
                        <span className="font-bold text-amber-300 text-sm">
                          {distanceResult.estimatedFee.toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-300">
                          Đang tính theo địa chỉ... (~7.000đ/km)
                        </span>
                      )}
                    </div>
                    {distanceResult ? (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        (~{distanceResult.distanceKm} km từ {distanceResult.nearestBranch} • 7.000đ/km)
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500">
                        (Số km theo Google Maps x 7.000 vnđ • ~7.000đ/km từ cơ sở gần nhất)
                      </span>
                    )}
                  </div>
                  {isFreeship ? (
                    <div className="flex items-center justify-between text-emerald-400 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        🎁 Đơn từ 355k: Quán hỗ trợ 35k tiền ship (trả bớt cho shipper)
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-center">
                      💡 Đặt thêm <strong className="text-amber-300 font-bold">{ (355000 - subtotal).toLocaleString('vi-VN') } đ</strong> để được <strong>Quán hỗ trợ 35k tiền ship</strong>!
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-sm">
                  <span className="text-neutral-300 font-bold">Tổng Thanh Toán:</span>
                  <span className="font-extrabold text-2xl gold-gradient-text tracking-tight">
                    {finalTotalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="submit"
                  form="order-form"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] transition duration-300 cursor-pointer"
                >
                  {loading ? 'Đang Khởi Tạo Đơn Hàng...' : 'Xác Nhận Đặt Món Ngay'}
                </button>
                <p className="text-[10px] text-neutral-400 text-center italic leading-tight">
                  *(Quý khách thanh toán tiền món cho quán. Cước ship thực tế quý khách thanh toán trực tiếp cho tài xế khi nhận món)*
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

