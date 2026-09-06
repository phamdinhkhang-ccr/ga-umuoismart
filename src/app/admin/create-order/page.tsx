'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Bot, Sparkles, Send, CheckCircle2, AlertCircle, ShoppingBag, Plus, Minus, 
  Trash2, MapPin, User, Ticket, Edit3, ArrowRight, UserCheck, Tag, QrCode, CreditCard, DollarSign, Printer
} from 'lucide-react';
import { getBranches, getMenuItems, createOrder } from '@/actions/orders';
import { Branch, MenuItem } from '@/types/database';
import { findCustomerByPhone, addOrUpdateCustomerFromOrder, CustomerRecord } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import { useBranches } from '@/context/BranchContext';
import ReceiptModal from '@/components/ReceiptModal';
import { supabase } from '@/lib/supabaseClient';
import { assignBranch } from '@/lib/routing';

const DEFAULT_SYSTEM_BRANCHES: Branch[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'CƠ SỞ VIN SMART CITY (NAM TỪ LIÊM)',
    address: 'Tòa S2.01 Vin Smart City, Phường Tây Mỗ',
    district: 'Quận Nam Từ Liêm',
    city: 'Hà Nội',
    phone: '0984.263.340',
    is_active: true
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'CHI NHÁNH GÀ Ủ MUỐI CẦU GIẤY',
    address: '88 Đường Cầu Giấy, Phường Quan Hoa',
    district: 'Quận Cầu Giấy',
    city: 'Hà Nội',
    phone: '0902.345.678',
    is_active: true
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'CHI NHÁNH GÀ Ủ MUỐI ĐỐNG ĐA',
    address: '12 Phố Đặng Văn Ngữ, Phường Trung Tự',
    district: 'Quận Đống Đa',
    city: 'Hà Nội',
    phone: '0903.456.789',
    is_active: true
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    name: 'CHI NHÁNH GÀ Ủ MUỐI QUẬN 1 (TP.HCM)',
    address: '145 Đường Lê Thị Riêng, Phường Bến Thành',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    phone: '0283.811.1111',
    is_active: true
  },
  {
    id: 'b5555555-5555-5555-5555-555555555555',
    name: 'CHI NHÁNH GÀ Ủ MUỐI QUẬN 3 (TP.HCM)',
    address: '456 Điện Biên Phủ, Phường 11',
    district: 'Quận 3',
    city: 'Hồ Chí Minh',
    phone: '0283.822.2222',
    is_active: true
  },
  {
    id: 'b6666666-6666-6666-6666-666666666666',
    name: 'CHI NHÁNH GÀ Ủ MUỐI THANH TRÌ',
    address: 'Số 25 Tựu Liệt, Phụ Khánh',
    district: 'Huyện Thanh Trì',
    city: 'Hà Nội',
    phone: '0977.888.999',
    is_active: true
  }
];

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { activeBranches: contextActiveBranches } = useBranches();

  // Mode Selection: 'AI' or 'MANUAL'
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');

  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrderData, setCreatedOrderData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [branches, setBranches] = useState<Branch[]>(DEFAULT_SYSTEM_BRANCHES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  // Update branches when contextActiveBranches updates
  useEffect(() => {
    if (contextActiveBranches && contextActiveBranches.length > 0) {
      setBranches(contextActiveBranches);
    }
  }, [contextActiveBranches]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { id: string; name: string; price: number; quantity: number; total: number; menu_item_id?: string }[]
  >([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'CASH'>('QR');
  const [cashGiven, setCashGiven] = useState<string>('');

  // Matched CRM Customer
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerRecord | null>(null);

  // Fetch Available Products from Supabase or Fallback
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          setAvailableProducts(data);
        } else {
          setAvailableProducts([
            { id: 'p1', name: 'Gà Ủ Muối Nguyên Con', price: 270000 },
            { id: 'p2', name: 'Set 1/2 gà + 1 hộp chân gà', price: 230000 },
            { id: 'p3', name: 'Set 1 gà + 1 hộp chân', price: 355000 },
            { id: 'p4', name: 'Set 1/2 gà + 1 nem ngựa', price: 240000 },
            { id: 'p5', name: 'Set 1 gà + 1 nem ngựa', price: 360000 },
            { id: 'p6', name: '1/2 gà ủ muối', price: 150000 },
            { id: 'p7', name: 'Trà Tắc Khổng Lồ', price: 20000 }
          ]);
        }
      } catch (e) {
        setAvailableProducts([
          { id: 'p1', name: 'Gà Ủ Muối Nguyên Con', price: 270000 },
          { id: 'p2', name: 'Set 1/2 gà + 1 hộp chân gà', price: 230000 },
          { id: 'p3', name: 'Set 1 gà + 1 hộp chân', price: 355000 },
          { id: 'p4', name: 'Set 1/2 gà + 1 nem ngựa', price: 240000 },
          { id: 'p5', name: 'Set 1 gà + 1 nem ngựa', price: 360000 },
          { id: 'p6', name: '1/2 gà ủ muối', price: 150000 },
          { id: 'p7', name: 'Trà Tắc Khổng Lồ', price: 20000 }
        ]);
      }
    };
    fetchProducts();
  }, []);

  // Read URL Search Parameters (from CRM 🛒 action)
  useEffect(() => {
    const paramPhone = searchParams.get('phone');
    const paramName = searchParams.get('name');
    const paramAddress = searchParams.get('address');

    if (paramPhone) setCustomerPhone(paramPhone);
    if (paramName) setCustomerName(paramName);
    if (paramAddress) setShippingAddress(paramAddress);
  }, [searchParams]);

  // Load branches & menu items from Supabase DB with safe fallback
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (contextActiveBranches && contextActiveBranches.length > 0 && isMounted) {
        setBranches(contextActiveBranches);
      } else {
        try {
          const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
            setBranches(data);
          } else {
            const local = (await getBranches()).filter(b => b.is_active !== false);
            if (local.length > 0 && isMounted) setBranches(local);
          }
        } catch (e) {
          const local = (await getBranches()).filter(b => b.is_active !== false);
          if (local.length > 0 && isMounted) setBranches(local);
        }
      }

      const mList = await getMenuItems();
      if (isMounted) {
        setMenuItems(mList);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [contextActiveBranches]);

  // Set default selected branch based on user or first branch
  useEffect(() => {
    if (branches.length > 0) {
      if (user && user.role !== 'SUPER_ADMIN' && user.branch_id) {
        const matchStaffBranch = branches.find(b => b.id === user.branch_id);
        if (matchStaffBranch) {
          setSelectedBranchId(matchStaffBranch.id);
        } else if (!selectedBranchId) {
          setSelectedBranchId(branches[0].id);
        }
      } else if (!selectedBranchId) {
        setSelectedBranchId(branches[0].id);
      }
    }
  }, [branches, user, selectedBranchId]);

  // Auto match nearest branch when shippingAddress / district / city changes
  useEffect(() => {
    if (branches.length > 0 && (shippingAddress || district)) {
      const matched = assignBranch(district, shippingAddress, branches, city);
      if (matched && (!user || user.role === 'SUPER_ADMIN')) {
        setSelectedBranchId(matched.id);
      }
    }
  }, [shippingAddress, district, city, branches, user]);

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

  const handleAddNewRow = () => {
    const prods = availableProducts.length > 0 ? availableProducts : menuItems;
    if (prods.length === 0) return;
    const defaultProd = prods[0];
    const price = Number(defaultProd.price || 0);
    setSelectedItems((prev) => [
      ...prev,
      {
        id: defaultProd.id,
        name: defaultProd.name,
        price: price,
        quantity: 1,
        total: price,
        menu_item_id: defaultProd.id
      }
    ]);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveRow(index);
      return;
    }
    setSelectedItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index].quantity = newQty;
      updated[index].total = updated[index].price * newQty;
      return updated;
    });
  };

  const handleSelectProductRow = (index: number, productId: string) => {
    const prods = availableProducts.length > 0 ? availableProducts : menuItems;
    const prod = prods.find((p) => p.id === productId);
    if (!prod) return;
    setSelectedItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const qty = updated[index]?.quantity || 1;
      const price = Number(prod.price || 0);
      updated[index] = {
        id: prod.id,
        name: prod.name,
        price: price,
        quantity: qty,
        total: price * qty,
        menu_item_id: prod.id
      };
      return updated;
    });
  };

  const handleRemoveRow = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParseOrder = useCallback(async (textToParse?: string) => {
    const text = textToParse || rawText;
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập hoặc dán nội dung tin nhắn của khách hàng');
      return;
    }

    setIsParsing(true);
    setErrorMsg('');
    setCreatedOrderData(null);

    let parsedSuccess = false;

    try {
      const res = await fetch('/api/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.parsed_data) {
          const p = data.parsed_data;
          setCustomerName(p.customer_name || 'Khách Đặt POS');
          setCustomerPhone(p.customer_phone || '');
          setShippingAddress(p.shipping_address || '');
          setDistrict(p.district || '');
          setCity(p.city || 'Hồ Chí Minh');
          if (p.branch_id) setSelectedBranchId(p.branch_id);
          setVoucherCode(p.voucher_code || '');
          setNote(p.note || '');

          if (p.items && p.items.length > 0) {
            const prods = availableProducts.length > 0 ? availableProducts : menuItems;
            const parsedItems = p.items.map((i: any) => {
              const matchedProd = prods.find(ap => ap.id === i.menu_item_id || ap.name.toLowerCase().includes((i.name || '').toLowerCase()));
              const name = matchedProd ? matchedProd.name : (i.name || 'Món ăn');
              const price = matchedProd ? Number(matchedProd.price || 0) : Number(i.unit_price || i.price || 0);
              const qty = Number(i.quantity || 1);
              return {
                id: matchedProd?.id || i.menu_item_id || `item-${Date.now()}`,
                name: name,
                price: price,
                quantity: qty,
                total: price * qty,
                menu_item_id: matchedProd?.id || i.menu_item_id
              };
            });
            setSelectedItems(parsedItems);
          }
          parsedSuccess = true;
        }
      }
    } catch (err: any) {
      console.warn('API parse failed, running client regex fallback:', err);
    }

    // Client-side Fallback Regex Parser if API failed
    if (!parsedSuccess) {
      const phoneMatch = text.match(/(?:0|\+84)[35789]\d{8}/) || text.match(/\b0\d{9,10}\b/) || text.match(/\b\d{10,11}\b/);
      const extractedPhone = phoneMatch ? phoneMatch[0] : '';

      let extractedName = 'Khách Đặt POS';
      const nameMatch = text.match(/\((?:anh|chị|bạn|em|khách)?\s*([A-Za-zĐđÀ-ỹ\s]{2,20})\)/i) || text.match(/(?:tên là|tên|gặp|giao cho|anh|chị|bạn|em)\s+([A-ZÀ-Ỹa-zà-ỹ]{2,15})/i);
      if (nameMatch && nameMatch[1]) extractedName = nameMatch[1].trim();

      let extractedAddr = text;
      const kwMatch = text.match(/(?:giao qua|giao đến|giao tới|ship đến|ship qua|địa chỉ:|địa chỉ|ở tại|ở|tại|d\/c|đ\/c|dc)\s+([^.\n]+)/i);
      if (kwMatch && kwMatch[1]) extractedAddr = kwMatch[1].trim();

      setCustomerName(extractedName);
      setCustomerPhone(extractedPhone);
      setShippingAddress(extractedAddr);

      // Auto-pick items by scanning menuItems/availableProducts
      const matchedItems: any[] = [];
      const prodsToScan = availableProducts.length > 0 ? availableProducts : menuItems;
      prodsToScan.forEach((m) => {
        const mName = m.name.toLowerCase();
        if (text.toLowerCase().includes(mName.slice(0, 6))) {
          const price = Number(m.price || 0);
          matchedItems.push({
            id: m.id,
            name: m.name,
            price: price,
            quantity: 1,
            total: price,
            menu_item_id: m.id
          });
        }
      });

      if (matchedItems.length === 0 && prodsToScan.length > 0) {
        const defaultM = prodsToScan[0];
        const price = Number(defaultM.price || 0);
        matchedItems.push({
          id: defaultM.id,
          name: defaultM.name,
          price: price,
          quantity: 1,
          total: price,
          menu_item_id: defaultM.id
        });
      }

      setSelectedItems(matchedItems);

      // Match branch
      if (branches.length > 0) {
        const matchedB = assignBranch(district, extractedAddr, branches, city);
        if (matchedB) setSelectedBranchId(matchedB.id);
      }
    }

    setIsParsing(false);
  }, [rawText, menuItems, availableProducts, branches, district, city]);

  const handleItemQuantityChange = useCallback((itemId: string, delta: number) => {
    const prods = availableProducts.length > 0 ? availableProducts : menuItems;
    const prod = prods.find((p) => p.id === itemId);
    const prodName = prod ? prod.name : 'Món ăn';
    const prodPrice = prod ? Number(prod.price || 0) : 0;

    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === itemId || i.menu_item_id === itemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + delta;
        if (newQty <= 0) {
          updated.splice(existingIdx, 1);
        } else {
          updated[existingIdx].quantity = newQty;
          updated[existingIdx].total = updated[existingIdx].price * newQty;
        }
        return updated;
      }
      if (delta > 0) {
        return [
          ...prev,
          {
            id: itemId,
            name: prodName,
            price: prodPrice,
            quantity: 1,
            total: prodPrice,
            menu_item_id: itemId
          }
        ];
      }
      return prev;
    });
  }, [availableProducts, menuItems]);

  const totals = useMemo(() => {
    let subtotal = selectedItems.reduce((acc, curr) => acc + (curr.total || (curr.price * curr.quantity) || 0), 0);
    let totalCost = Math.round(subtotal * 0.55);

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
  }, [selectedItems, voucherCode]);

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

    const finalPhone = customerPhone.trim() || '0984263340';
    const finalName = customerName.trim() || 'Khách Vãng Lai';

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createOrder({
        customer_name: finalName,
        customer_phone: finalPhone,
        shipping_address: shippingAddress,
        district: district,
        city: city,
        branch_id: selectedBranchId,
        items: selectedItems.map(i => ({
          menu_item_id: i.menu_item_id || i.id,
          id: i.id || i.menu_item_id,
          item_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
          subtotal: i.total || (i.price * i.quantity)
        })),
        voucher_code: voucherCode,
        note: note
      });

      if (res.success && res.order) {
        const branchObj = branches.find(b => b.id === selectedBranchId);
        const orderDataWithBranch = {
          ...res.order,
          branch: branchObj || { name: 'CƠ SỞ VIN SMART CITY', bank_name: 'MB', bank_account: '0988123456', bank_holder: 'GA U MUOI SMART' }
        };

        setCreatedOrderData(orderDataWithBranch);
        setShowReceiptModal(true);

        // Auto Sync with CRM Customer Database
        const summary = selectedItems.map(i => {
          const m = menuItems.find(item => item.id === i.menu_item_id);
          return `${i.quantity}x ${m?.name || 'Món ăn'}`;
        }).join(', ');

        addOrUpdateCustomerFromOrder({
          customer_name: finalName,
          customer_phone: finalPhone,
          shipping_address: shippingAddress,
          total_amount: totals.finalAmount,
          order_code: res.order.order_code,
          items_summary: summary
        });
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
                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-sky-600" /> VietQR Dynamic POS
                </span>
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Hỗ trợ 2 chế độ lên đơn AI Quick Parser / Thủ công &amp; bung Hóa đơn VietQR K80 tự động.
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
                    Đã tạo mã VietQR động &amp; đồng bộ vào danh bạ CRM. Đã sẵn sàng in hóa đơn K80!
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xem &amp; In Bill K80</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/branch/${createdOrderData.branch_id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Xem Tại Bếp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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

              {/* Payment Method Selection */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Hình Thức Thanh Toán Kê Khai:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QR')}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'QR'
                        ? 'bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <span>Chuyển Khoản VietQR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Tiền Mặt (POS)</span>
                  </button>
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
                  className="w-full px-4 py-2.5 border-2 border-orange-500 rounded-xl bg-white text-gray-900 font-medium focus:outline-none text-sm cursor-pointer"
                >
                  <option value="">-- Bấm để chọn cơ sở tiếp nhận --</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Items List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  Danh Sách Món Ăn Đã Chọn ({selectedItems.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="px-3.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  + Thêm món dòng mới
                </button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 border border-dashed rounded-xl">
                  Chưa có món ăn nào. Bấm nút "+ Thêm món dòng mới" ở trên để chọn món.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 text-xs md:text-sm"
                    >
                      {/* Dropdown chọn món */}
                      <select
                        value={item.id || item.menu_item_id}
                        onChange={(e) => handleSelectProductRow(idx, e.target.value)}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 focus:outline-none"
                      >
                        {(availableProducts.length > 0 ? availableProducts : menuItems).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - {Number(p.price).toLocaleString('vi-VN')}đ
                          </option>
                        ))}
                      </select>

                      {/* Cụm chỉnh số lượng */}
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                          className="px-2.5 py-1 hover:bg-gray-100 text-gray-600 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-semibold text-gray-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                          className="px-2.5 py-1 hover:bg-gray-100 text-gray-600 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Thành tiền */}
                      <div className="w-24 text-right font-bold text-orange-600">
                        {(item.total || (item.price * item.quantity)).toLocaleString('vi-VN')}đ
                      </div>

                      {/* Nút xóa dòng */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Xóa dòng"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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

                {paymentMethod === 'CASH' && (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-900">Tiền Khách Đưa:</span>
                      <input
                        type="number"
                        placeholder="Ví dụ: 300000"
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        className="w-32 p-1.5 bg-white border border-emerald-300 font-extrabold text-right text-emerald-800 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-extrabold border-t border-emerald-200 pt-2">
                      <span className="text-emerald-950">Tiền Thừa Trả Khách:</span>
                      <span className={(parseFloat(cashGiven) || 0) >= totals.finalAmount ? "text-emerald-700 text-sm" : "text-rose-600 text-xs font-semibold"}>
                        {cashGiven ? (((parseFloat(cashGiven) || 0) - totals.finalAmount >= 0) ? `${((parseFloat(cashGiven) || 0) - totals.finalAmount).toLocaleString('vi-VN')} VNĐ` : 'Chưa đủ tiền đưa') : '0 VNĐ'}
                      </span>
                    </div>
                  </div>
                )}

                {!(user?.role === 'STAFF' || user?.role === 'BRANCH_STAFF') && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Lợi Nhuận Dự Tính:</span>
                    <span className="font-bold text-emerald-700 text-sm">+{totals.profit.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang Tạo Mã VietQR &amp; Lưu Đơn...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>LƯU &amp; XUẤT BILL VIETQR K80</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>

      {/* DYNAMIC RECEIPT MODAL */}
      {showReceiptModal && createdOrderData && (
        <ReceiptModal
          order={createdOrderData}
          onClose={() => setShowReceiptModal(false)}
          onPaymentConfirmed={() => {
            setShowReceiptModal(false);
            router.push(`/branch/${createdOrderData.branch_id}`);
          }}
        />
      )}
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
