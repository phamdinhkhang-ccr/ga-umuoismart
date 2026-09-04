'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, Sparkles, Send, CheckCircle2, AlertCircle, ShoppingBag, Plus, Minus, Trash2, MapPin, User, Ticket, Edit3, ArrowRight, UserCheck, Tag } from 'lucide-react';
import { getBranches, getMenuItems, createOrder } from '@/actions/orders';
import { Branch, MenuItem } from '@/types/database';
import { findCustomerByPhone, addOrUpdateCustomerFromOrder, CustomerRecord } from '@/lib/store';

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode Selection: 'AI' or 'MANUAL'
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');

  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrderData, setCreatedOrderData] = useState<any>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ menu_item_id: string; quantity: number }[]>([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');

  // Matched CRM Customer
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerRecord | null>(null);

  // Read URL Search Parameters (from CRM 🛒 action)
  useEffect(() => {
    const paramPhone = searchParams.get('phone');
    const paramName = searchParams.get('name');
    const paramAddress = searchParams.get('address');

    if (paramPhone) setCustomerPhone(paramPhone);
    if (paramName) setCustomerName(paramName);
    if (paramAddress) setShippingAddress(paramAddress);
  }, [searchParams]);

  // Load branches & menu items
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const [bList, mList] = await Promise.all([getBranches(), getMenuItems()]);
      if (isMounted) {
        setBranches(bList);
        setMenuItems(mList);
        if (bList.length > 0) setSelectedBranchId(bList[0].id);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Realtime CRM Customer Lookup
  useEffect(() => {
    if (customerPhone && customerPhone.replace(/\D/g, '').length >= 8) {
      const found = findCustomerByPhone(customerPhone);
      if (found) {
        setMatchedCustomer(found);
        if (!customerName) setCustomerName(found.name);
        if (!shippingAddress) setShippingAddress(found.address);
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  }, [customerPhone, customerName, shippingAddress]);

  const sampleMessages = useMemo(() => [
    `lấy 1 con gà ủ muối + 1 chân gà sốt thái giao qua mipec 1, hà đông, hà nội (Anh Tuấn). Sđt 0889018221`,
    `1 con gà ủ muối, 1 chân gà sốt thái, giao qua số 9 thượng phúc, đại thanh, hà nội, sđt 0889018221`,
    `Chào Gà Ủ Muối Smart, cho mình lấy 2 Gà Ủ Muối Nguyên Con và 2 Trà Tắc Khổng Lồ giao đến địa chỉ 123 Lê Lợi, Phường Bến Thành, Quận 1. Tên Nam, SĐT: 0901234567`
  ], []);

  const handleParseOrder = useCallback(async (textToParse?: string) => {
    const text = textToParse || rawText;
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập hoặc dán nội dung tin nhắn của khách hàng');
      return;
    }

    setIsParsing(true);
    setErrorMsg('');
    setCreatedOrderData(null);

    try {
      const res = await fetch('/api/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể bóc tách dữ liệu');

      const p = data.parsed_data;
      setCustomerName(p.customer_name);
      setCustomerPhone(p.customer_phone);
      setShippingAddress(p.shipping_address);
      setDistrict(p.district);
      setCity(p.city);
      setSelectedBranchId(p.branch_id);
      setVoucherCode(p.voucher_code || '');
      setNote(p.note || '');

      if (p.items && p.items.length > 0) {
        setSelectedItems(p.items.map((i: any) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity
        })));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi phân tích AI');
    } finally {
      setIsParsing(false);
    }
  }, [rawText]);

  const handleQuickAddMenuItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.menu_item_id === itemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { menu_item_id: itemId, quantity: 1 }];
    });
  }, []);

  const handleItemQuantityChange = useCallback((itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.menu_item_id === itemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + delta;
        if (newQty <= 0) {
          updated.splice(existingIdx, 1);
        } else {
          updated[existingIdx].quantity = newQty;
        }
        return updated;
      }
      if (delta > 0) {
        return [...prev, { menu_item_id: itemId, quantity: 1 }];
      }
      return prev;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const handleItemChange = useCallback((index: number, field: 'menu_item_id' | 'quantity', value: any) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalCost = 0;

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    selectedItems.forEach((i) => {
      const item = itemMap.get(i.menu_item_id);
      if (item) {
        subtotal += item.price * i.quantity;
        totalCost += item.cost_price * i.quantity;
      }
    });

    let discount = 0;
    const code = voucherCode.trim().toUpperCase();
    if (code === 'CHAO2026' && subtotal >= 100000) discount = 30000;
    if (code === 'VIP10' && subtotal >= 200000) discount = Math.round((subtotal * 10) / 100);

    let isAutoDiscountApplied = false;
    if (discount === 0 && subtotal >= 355000) {
      discount = 30000;
      isAutoDiscountApplied = true;
    }

    discount = Math.min(discount, subtotal);
    const finalAmount = Math.max(0, subtotal - discount);
    const profit = finalAmount - totalCost;

    return { subtotal, discount, finalAmount, profit, isAutoDiscountApplied };
  }, [menuItems, selectedItems, voucherCode]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg('Vui lòng chọn Chi nhánh tiếp nhận đơn');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Đơn hàng phải có ít nhất 1 món ăn');
      return;
    }
    if (!customerPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại khách hàng');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        district: district,
        city: city,
        branch_id: selectedBranchId,
        items: selectedItems,
        voucher_code: voucherCode,
        note: note
      });

      if (res.success && res.order) {
        setCreatedOrderData(res.order);

        // Auto Sync with CRM Customer Database
        const summary = selectedItems.map(i => {
          const m = menuItems.find(item => item.id === i.menu_item_id);
          return `${i.quantity}x ${m?.name || 'Món ăn'}`;
        }).join(', ');

        addOrUpdateCustomerFromOrder({
          customer_name: customerName,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          total_amount: totals.finalAmount,
          order_code: res.order.order_code,
          items_summary: summary
        });

        // Auto navigate to assigned branch after 2.5s if not clicked
        setTimeout(() => {
          router.push(`/branch/${selectedBranchId}`);
        }, 2500);
      } else {
        throw new Error('Tạo đơn thất bại');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Tạo Đơn Hàng Gà Ủ Muối Smart
                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  Dual Mode + CRM Sync
                </span>
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Hỗ trợ 2 chế độ lên đơn: Bóc tách tự động bằng AI Quick Parser hoặc Lên đơn thủ công từ thực đơn.
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('AI')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
                mode === 'AI' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chế Độ 1: Phân Tích AI</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer ${
                mode === 'MANUAL' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chế Độ 2: Lên Đơn Thủ Công</span>
            </button>
          </div>
        </div>

        {/* MODE 1: AI PARSER TEXTAREA INPUT */}
        {mode === 'AI' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" /> Dán Tin Nhắn Đặt Hàng Của Khách (Zalo/SMS):
              </label>
              <span className="text-xs text-slate-500">Mẫu tin nhắn thử nghiệm:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRawText(sample);
                    handleParseOrder(sample);
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  Mẫu Tin Nhắn {idx + 1}
                </button>
              ))}
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Đặt 2 Gà Ủ Muối Nguyên Con và 2 Trà Tắc Khổng Lồ đến 123 Lê Lợi, Quận 1. Tên Nam 0901234567..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition text-sm"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Rule tự động: Đơn hàng &ge; 355.000 VNĐ tự giảm 30.000 VNĐ</span>
              </div>

              <button
                onClick={() => handleParseOrder()}
                disabled={isParsing}
                className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Đang Phân Tích...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt Đầu Phân Tích AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: MANUAL QUICK MENU PICKER GRID */}
        {mode === 'MANUAL' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShoppingBag className="w-4 h-4 text-orange-600" /> Chọn Món Nhanh Từ Thực Đơn (Bấm + / - Để Tăng Số Lượng):
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {menuItems.map((m) => {
                const selected = selectedItems.find((i) => i.menu_item_id === m.id);
                const quantity = selected ? selected.quantity : 0;

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between ${
                      quantity > 0
                        ? 'bg-orange-50/60 border-orange-300'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{m.name}</h3>
                      <p className="text-xs font-semibold text-orange-600 mt-0.5">{m.price.toLocaleString('vi-VN')} VNĐ</p>
                    </div>

                    <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(m.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(m.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-orange-600 hover:bg-orange-50 rounded transition cursor-pointer font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CRM CUSTOMER MATCHED BANNER */}
        {matchedCustomer && (
          <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-sky-950 shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-600 text-white rounded-lg font-bold text-xs">
                CRM
              </div>
              <div>
                <div className="font-extrabold flex items-center gap-2 text-sm text-sky-900">
                  <span>Khách hàng thành viên: {matchedCustomer.name}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] ${
                    matchedCustomer.tier === 'VIP' ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300' : 'bg-purple-100 text-purple-900 font-bold'
                  }`}>
                    {matchedCustomer.tier === 'VIP' ? '⭐ VIP' : matchedCustomer.tier}
                  </span>
                  <span className="text-slate-500 font-normal">({matchedCustomer.total_orders} đơn đã mua)</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="font-semibold text-slate-600">Khẩu vị:</span>
                  {(matchedCustomer.taste_tags || []).map((t, idx) => (
                    <span key={idx} className="bg-white text-sky-900 border border-sky-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right text-sky-800 font-medium">
              <div>Tích lũy: <strong className="text-orange-600 font-extrabold">{matchedCustomer.total_spend.toLocaleString('vi-VN')} VNĐ</strong></div>
            </div>
          </div>
        )}

        {/* ERROR ALERTS */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SUCCESS TOAST POPUP NOTIFICATION */}
        {createdOrderData && (
          <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-5 rounded-2xl shadow-lg space-y-3 animate-bounce-once">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm text-emerald-900">
                    TẠO ĐƠN THÀNH CÔNG! MÃ ĐƠN: <span className="text-orange-600">{createdOrderData.order_code}</span>
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Đơn hàng đã được đồng bộ vào danh bạ CRM &amp; đẩy về bếp ở trạng thái <span className="font-bold">Tiếp Nhận (RECEIVED)</span>. Đang tự chuyển sang trang bếp...
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/branch/${createdOrderData.branch_id}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Xem Đơn Tại Bếp</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* EDITABLE FORM */}
        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer Details Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-orange-600" /> Thông Tin Khách Hàng &amp; Giao Hàng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Khách Hàng</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại (*)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-emerald-700 focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                    placeholder="0901234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ Giao Hàng</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none font-medium"
                  placeholder="123 Nguyễn Trãi, Phường 2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quận / Huyện</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Quận 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thành Phố</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Branch Assignment */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-orange-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Chi Nhánh Tiếp Nhận (Gán Tự Động / Chọn Thủ Công):
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-orange-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} - ({b.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Items List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-600" /> Danh Sách Món Ăn Đã Chọn ({selectedItems.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (menuItems.length > 0) {
                      setSelectedItems((prev) => [...prev, { menu_item_id: menuItems[0].id, quantity: 1 }]);
                    }
                  }}
                  className="text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm món dòng mới
                </button>
              </div>

              {selectedItems.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Chưa có món ăn nào. Dán tin nhắn để AI bóc tách hoặc chọn món ở bảng trên.</p>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item, idx) => {
                    const currentMenu = menuItems.find((m) => m.id === item.menu_item_id);
                    const itemSubtotal = currentMenu ? currentMenu.price * item.quantity : 0;

                    return (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <select
                            value={item.menu_item_id}
                            onChange={(e) => handleItemChange(idx, 'menu_item_id', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none"
                          >
                            {menuItems.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} - {m.price.toLocaleString('vi-VN')} VNĐ
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center text-slate-900 focus:outline-none font-bold"
                          />
                        </div>

                        <div className="w-28 text-right font-bold text-xs text-slate-900">
                          {itemSubtotal.toLocaleString('vi-VN')} VNĐ
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Voucher & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-orange-600" /> Mã Voucher / Giảm Giá
                  </label>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-orange-700 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                    placeholder="CHAO2026, VIP10..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Đơn Hàng</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Giao trước 12h, lấy thêm nước chấm..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 sticky top-20">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Tổng Kết Đơn Hàng</span>
                <span className="text-xs text-slate-500 font-normal">Calculated</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền hàng (Subtotal):</span>
                  <span className="font-semibold text-slate-900">{totals.subtotal.toLocaleString('vi-VN')} VNĐ</span>
                </div>

                {totals.isAutoDiscountApplied && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-2.5 rounded-lg flex items-center gap-2 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Tự động giảm 30.000 VNĐ (Đơn &ge; 355k)</span>
                  </div>
                )}

                <div className="flex justify-between text-orange-700 font-medium">
                  <span>Giảm giá (Discount):</span>
                  <span className="font-bold">-{totals.discount.toLocaleString('vi-VN')} VNĐ</span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Khách Thanh Toán:</span>
                  <span className="text-orange-600 text-base">{totals.finalAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Lợi Nhuận Dự Tính:</span>
                  <span className="font-bold text-emerald-700 text-sm">+{totals.profit.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang Lưu &amp; Đẩy Đơn...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>LƯU &amp; ĐẨY ĐƠN HÀNG</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-500 font-semibold">
        Đang tải trang tạo đơn hàng...
      </div>
    }>
      <CreateOrderContent />
    </Suspense>
  );
}
