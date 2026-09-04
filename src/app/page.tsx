'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Store, Search, ShoppingBag, Phone, MapPin, Clock, ExternalLink, 
  CheckCircle2, Sparkles, Truck, ShieldCheck, Flame, MessageCircle, 
  Bot, LogIn, Lock, ArrowRight, UserCheck, Star, Zap, PhoneCall, Headphones,
  X, Check, QrCode, AlertCircle
} from 'lucide-react';
import { getAnalyticsData, addNewMockOrder } from '@/actions/orders';
import { 
  getProducts, getCmsSettings, StorefrontCmsSettings, ProductRecord, 
  addNotification, addOrUpdateCustomerFromOrder, getItem, setItem, savePosOrder, playBeep 
} from '@/lib/store';
import { Order } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';

const PRESET_COMBOS = [
  { id: 'cb1', name: 'Set nửa ủ muối + 1 hộp chân gà - 230k (Ship nội thành)', price: 230000, isHot: true },
  { id: 'cb2', name: 'Set 1 Gà Ủ Muối + 1 hộp chân gà - 355k', price: 355000, isHot: true },
  { id: 'cb3', name: 'Gà ủ muối nửa con - 150k', price: 150000, isHot: false },
  { id: 'cb4', name: 'Gà ủ muối nguyên con - 270k', price: 270000, isHot: false },
  { id: 'cb5', name: 'Chân gà rút xương ủ muối - 85k', price: 85000, isHot: false },
  { id: 'cb6', name: '1 Nem ngựa - 95k / 2 Nem ngựa - 180k', price: 95000, isHot: false },
  { id: 'cb7', name: 'Set ăn chơi (1/2 Gà & 1 Nem Ngựa) - 240k', price: 240000, isHot: true },
  { id: 'cb8', name: 'Set ăn nhậu (1 Gà Ủ Muối & 1 Nem Ngựa) - 360k', price: 360000, isHot: true }
];

export default function PublicStorefrontHome() {
  const { user } = useAuth();

  // Dynamic Storefront CMS & Products State
  const [cmsSettings, setCmsSettings] = useState<StorefrontCmsSettings>({
    hero_title: 'GÀ Ủ MUỐI SMART',
    hero_slogan: 'Gà ủ muối da giòn sần sật - Thơm ngon đậm đà giao nóng tận nơi',
    hero_hotline: '0988.123.456',
    branches: [],
    social_facebook: 'https://facebook.com',
    social_tiktok: 'https://tiktok.com',
    social_zalo: 'https://zalo.me',
    hotline_complaints: '1900.6868'
  });

  const [productsList, setProductsList] = useState<ProductRecord[]>([]);

  // Search Order State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // -------------------------------------------------------------
  // ORDER POPUP MODAL STATE
  // -------------------------------------------------------------
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>(['cb1']);
  const [cutPreference, setCutPreference] = useState<'Chặt sẵn ăn luôn' | 'Không chặt (để nguyên con)'>('Chặt sẵn ăn luôn');
  const [quantityNote, setQuantityNote] = useState('');
  const [extraNote, setExtraNote] = useState('');

  const loadStorefrontData = async () => {
    const localCms = getCmsSettings();
    try {
      const savedBackup = localStorage.getItem('storefront_settings');
      if (savedBackup) {
        const parsed = JSON.parse(savedBackup);
        if (parsed) setCmsSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}

    setProductsList(getProducts());

    try {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .in('id', ['primary_config', 'default_config']);

      if (Array.isArray(data) && data.length > 0) {
        const primary = data.find(d => d.id === 'primary_config') || data[0];
        const configData = primary.data || primary.settings;
        if (configData) {
          setCmsSettings(prev => ({ ...prev, ...configData }));
          try {
            localStorage.setItem('storefront_settings', JSON.stringify(configData));
          } catch (e) {}
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadStorefrontData();

    // Supabase Realtime Listener for Storefront Settings (Live Cross-Device Update)
    const storefrontChannel = supabase
      .channel('realtime_storefront')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'storefront_settings' },
        (payload: any) => {
          if (payload.new) {
            const newConfig = payload.new.data || payload.new.settings;
            if (newConfig) {
              setCmsSettings(prev => ({ ...prev, ...newConfig }));
              try {
                localStorage.setItem('storefront_settings', JSON.stringify(newConfig));
              } catch (e) {}
            }
          }
        }
      )
      .subscribe();

    const handleStoreUpdate = () => {
      loadStorefrontData();
    };

    window.addEventListener('gum_store_update', handleStoreUpdate);
    window.addEventListener('storage', handleStoreUpdate);

    return () => {
      try {
        supabase.removeChannel(storefrontChannel);
      } catch (e) {}
      window.removeEventListener('gum_store_update', handleStoreUpdate);
      window.removeEventListener('storage', handleStoreUpdate);
    };
  }, []);

  // Filter active branches only
  const activeBranches = useMemo(() => {
    return cmsSettings.branches?.filter((b) => b.is_active !== false) || [];
  }, [cmsSettings.branches]);

  // Filter & Sort Storefront Menu Products (Best Seller first, visible only)
  const visibleStorefrontProducts = useMemo(() => {
    return productsList
      .filter((p) => p.is_storefront_visible !== false)
      .sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));
  }, [productsList]);

  // Combined selectable items array (Presets + Products from store)
  const allSelectableItems = useMemo(() => {
    const presets = [...PRESET_COMBOS];
    productsList.forEach(p => {
      if (!presets.some(item => item.name.toLowerCase().includes(p.name.toLowerCase()))) {
        presets.push({
          id: p.id,
          name: `${p.name} - ${p.price.toLocaleString('vi-VN')}đ`,
          price: p.price,
          isHot: !!p.is_best_seller
        });
      }
    });
    return presets;
  }, [productsList]);

  // Auto Nearest Branch Suggestion Logic based on Address
  const suggestedBranch = useMemo(() => {
    if (!activeBranches || activeBranches.length === 0) return null;
    const addr = address.toLowerCase();
    
    if (addr.includes('thanh trì') || addr.includes('đại thanh') || addr.includes('hoàng mai') || addr.includes('thượng phúc')) {
      const b = activeBranches.find(x => x.name.includes('Thanh Trì') || x.address.includes('Thanh Trì'));
      if (b) return b;
    }
    if (addr.includes('cầu giấy') || addr.includes('đống đa') || addr.includes('trần thái tông') || addr.includes('dịch vọng') || addr.includes('tây hồ') || addr.includes('thanh xuân')) {
      const b = activeBranches.find(x => x.name.includes('Cầu Giấy') || x.address.includes('Cầu Giấy'));
      if (b) return b;
    }
    if (addr.includes('quận 1') || addr.includes('lê lợi') || addr.includes('bến thành') || addr.includes('quận 4')) {
      const b = activeBranches.find(x => x.name.includes('Quận 1') || x.address.includes('Quận 1'));
      if (b) return b;
    }
    if (addr.includes('quận 3') || addr.includes('điện biên phủ') || addr.includes('phú nhuận') || addr.includes('bình thạnh')) {
      const b = activeBranches.find(x => x.name.includes('Quận 3') || x.address.includes('Quận 3'));
      if (b) return b;
    }
    if (addr.includes('smart city') || addr.includes('tây mỗ') || addr.includes('nam từ liêm') || addr.includes('hà đông') || addr.includes('hoài đức')) {
      const b = activeBranches.find(x => x.name.includes('SMART CITY') || x.address.includes('Smart City'));
      if (b) return b;
    }

    if (selectedBranchId) {
      const currentB = activeBranches.find(x => x.id === selectedBranchId);
      if (currentB) return currentB;
    }

    return activeBranches[0];
  }, [address, activeBranches, selectedBranchId]);

  // Sync selectedBranchId when suggestedBranch updates if not explicitly selected
  useEffect(() => {
    if (suggestedBranch && !selectedBranchId) {
      setSelectedBranchId(suggestedBranch.id);
    }
  }, [suggestedBranch, selectedBranchId]);

  // Total Order Amount Calculation
  const totalOrderAmount = useMemo(() => {
    let total = 0;
    selectedComboIds.forEach(id => {
      const item = allSelectableItems.find(c => c.id === id);
      if (item) total += item.price;
    });
    return total;
  }, [selectedComboIds, allSelectableItems]);

  // Open Order Modal & Pre-check item
  const handleOpenOrderModal = (product?: ProductRecord | string) => {
    setFormError(null);
    setSuccessOrder(null);
    setIsOrderModalOpen(true);

    if (product) {
      const pName = typeof product === 'string' ? product : product.name;
      const matched = allSelectableItems.find(item => item.name.toLowerCase().includes(pName.toLowerCase()));
      if (matched) {
        setSelectedComboIds([matched.id]);
      } else if (typeof product !== 'string') {
        const customId = `custom-${product.id}`;
        if (!allSelectableItems.some(i => i.id === customId)) {
          allSelectableItems.push({
            id: customId,
            name: `${product.name} - ${product.price.toLocaleString('vi-VN')}đ`,
            price: product.price,
            isHot: !!product.is_best_seller
          });
        }
        setSelectedComboIds([customId]);
      }
    }
  };

  // Toggle Combo Selection Checkbox
  const handleToggleComboCheckbox = (id: string) => {
    setSelectedComboIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one item
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Submit Order Pipeline
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Vui lòng nhập Họ và Tên người nhận!');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setFormError('Vui lòng nhập Số điện thoại hợp lệ (10 chữ số)!');
      return;
    }
    if (!address.trim()) {
      setFormError('Vui lòng nhập Địa chỉ nhận hàng (*)!');
      return;
    }
    if (selectedComboIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 món ăn hoặc Combo!');
      return;
    }

    const chosenBranch = activeBranches.find(b => b.id === selectedBranchId) || suggestedBranch || activeBranches[0];
    const orderCode = `OD${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedItemsSummary = selectedComboIds.map(id => {
      const item = allSelectableItems.find(c => c.id === id);
      return {
        menu_item_id: item?.id || id,
        item_name: item?.name ? item.name.split(' - ')[0] : 'Gà Ủ Muối Đặc Sản',
        quantity: 1,
        unit_price: item?.price || 0,
        cost_price: Math.round((item?.price || 0) * 0.55),
        subtotal: item?.price || 0
      };
    });

    const calculatedTotal = selectedItemsSummary.reduce((sum, i) => sum + i.subtotal, 0);

    const orderId = `OD${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const branchName = chosenBranch.name || 'CƠ SỞ VIN SMART CITY';
    const branchId = chosenBranch.id || 'b1';

    const selectedItemsList = selectedComboIds.map(id => {
      const item = allSelectableItems.find(c => c.id === id);
      const nameStr = item?.name ? item.name.split(' - ')[0] : 'Gà Ủ Muối Đặc Sản';
      return {
        menu_item_id: item?.id || id,
        item_name: nameStr,
        name: nameStr,
        quantity: 1,
        unit_price: item?.price || 0,
        price: item?.price || 0,
        cost_price: Math.round((item?.price || 0) * 0.55),
        subtotal: item?.price || 0
      };
    });

    const calculatedTotalAmount = selectedItemsList.reduce((sum, i) => sum + i.subtotal, 0);

    const formattedOrder = {
      id: orderId,
      code: `#${orderId}`,
      order_code: orderId,
      customerName: fullName.trim() || 'Khách Vãng Lai',
      customer_name: fullName.trim() || 'Khách Vãng Lai',
      phone: phone.trim(),
      customer_phone: phone.trim(),
      address: address.trim(),
      shipping_address: address.trim(),
      customer_address: address.trim(),
      branch: branchName,
      branchName: branchName,
      branch_id: branchId,
      branchId: branchId,
      district: (chosenBranch as any).district || 'Hà Nội',
      city: (chosenBranch as any).city || 'Hà Nội',
      items: selectedItemsList,
      order_items: selectedItemsList,
      totalAmount: calculatedTotalAmount,
      total_amount: calculatedTotalAmount,
      subtotal: calculatedTotalAmount,
      final_amount: calculatedTotalAmount,
      cutOption: cutPreference || 'Chặt sẵn ăn luôn',
      note: `${cutPreference ? `[${cutPreference}] ` : ''}${quantityNote ? `SL: ${quantityNote} | ` : ''}${extraNote || ''}`.trim(),
      status: 'PENDING',
      source: 'Landing Page Trang Chủ',
      createdAt: now,
      created_at: now,
      isRead: false
    };

    // 1. Save directly to pos_orders_data & store helper
    savePosOrder(formattedOrder);
    addNewMockOrder(formattedOrder as any);

    try {
      const existingOrders = getItem<any[]>('pos_orders_data', []);
      const newOrders = [formattedOrder, ...(Array.isArray(existingOrders) ? existingOrders.filter(o => o.id !== orderId) : [])];
      setItem('pos_orders_data', newOrders);
      setItem('gum_smart_orders_v3', newOrders);
    } catch (e) {}

    // Post to Cloud API for Realtime Multi-Device Sync
    try {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedOrder)
      }).catch(() => {});
    } catch (e) {}

    // 1b. Insert into Supabase Realtime Database (orders & notifications)
    try {
      Promise.resolve(
        supabase
          .from('orders')
          .insert([
            {
              id: orderId,
              customer_name: fullName.trim() || 'Khách Vãng Lai',
              phone: phone.trim(),
              address: address.trim(),
              branch_name: branchName,
              items: selectedItemsList,
              cut_option: cutPreference || 'Chặt sẵn ăn luôn',
              note: formattedOrder.note || '',
              total_amount: calculatedTotalAmount || 0,
              status: 'PENDING',
              source: 'Web Khách Đặt',
              created_at: now
            }
          ])
      ).then((res: any) => {
        if (res?.error) console.warn('Supabase orders insert silent bypass:', res.error);
      }).catch(() => {});

      Promise.resolve(
        supabase
          .from('notifications')
          .insert([
            {
              id: `notif_${Date.now()}`,
              type: 'order',
              title: `🍗 Đơn hàng mới #${orderId}`,
              content: `Khách ${fullName.trim()} (${phone.trim()}) vừa đặt đơn ${Number(calculatedTotalAmount).toLocaleString('vi-VN')} đ`,
              link: '/admin/orders',
              is_read: false,
              created_at: now
            }
          ])
      ).then((res: any) => {
        if (res?.error) console.warn('Supabase notifications insert silent bypass:', res.error);
      }).catch(() => {});
    } catch (e) {}

    // 2. Save notification to pos_notifications_data
    const newNotification = {
      id: `notif_${Date.now()}`,
      type: 'order',
      title: `🍗 Đơn hàng mới #${formattedOrder.id}`,
      content: `Khách ${formattedOrder.customerName} (${formattedOrder.phone}) vừa đặt đơn ${Number(formattedOrder.totalAmount).toLocaleString('vi-VN')} đ qua Web.`,
      message: `Khách ${formattedOrder.customerName} (${formattedOrder.phone}) vừa đặt đơn ${Number(formattedOrder.totalAmount).toLocaleString('vi-VN')} đ qua Web.`,
      time: 'Vừa xong',
      timestamp: 'Vừa xong',
      createdAt: now,
      isRead: false,
      read: false,
      link: '/admin/orders'
    };

    try {
      const existingNotifs = getItem<any[]>('pos_notifications_data', []);
      const newNotifs = [newNotification, ...(Array.isArray(existingNotifs) ? existingNotifs : [])];
      setItem('pos_notifications_data', newNotifs);
      setItem('gum_smart_notifications_v3', newNotifs);
    } catch (e) {}

    // 3. Emit triggers & custom events
    try {
      localStorage.setItem('pos_order_sync_trigger', Date.now().toString());
      localStorage.setItem('pos_notify_ping', Date.now().toString());
      window.dispatchEvent(new CustomEvent('app_order_created', { detail: formattedOrder }));
      window.dispatchEvent(new CustomEvent('new_order_placed', { detail: formattedOrder }));
      window.dispatchEvent(new CustomEvent('new_order_event', { detail: formattedOrder }));
      window.dispatchEvent(new CustomEvent('pos_notify_event', { detail: newNotification }));
      window.dispatchEvent(new Event('gum_store_update'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    // 4. Play alert sound
    playBeep();

    // 5. Update Customer Profile
    addOrUpdateCustomerFromOrder({
      customer_name: formattedOrder.customer_name,
      customer_phone: formattedOrder.customer_phone,
      shipping_address: formattedOrder.shipping_address,
      total_amount: calculatedTotalAmount,
      order_code: orderId,
      items_summary: selectedItemsList.map(i => `${i.quantity}x ${i.item_name}`).join(', ')
    });

    // 6. Show Success Screen
    setSuccessOrder(formattedOrder as any);
  };

  // Handle Order Tracking Search
  const handleSearchOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    setSearchError('');
    setSearchedOrder(null);

    const q = searchQuery.trim().toLowerCase();

    try {
      const res = await getAnalyticsData('all', 'all');
      const orders: Order[] = res.orders || [];

      const found = orders.find(
        (o) =>
          o.order_code.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          q.includes(o.customer_phone)
      );

      if (found) {
        setSearchedOrder(found);
      } else {
        setSearchError(`Không tìm thấy đơn hàng nào với từ khóa "${searchQuery}". Vui lòng kiểm tra lại SĐT hoặc mã đơn.`);
      }
    } catch (e) {
      setSearchError('Có lỗi khi tra cứu đơn hàng, vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      
      {/* 1. PUBLIC TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Title */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                {cmsSettings.hero_title || 'Gà Ủ Muối Smart'}
                <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
              </span>
              <p className="text-[10px] text-slate-500 font-semibold hidden sm:block">Đặc Sản Da Giòn Sần Sật • Giao Hỏa Tốc</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-extrabold text-slate-700">
            <a href="#menu" className="hover:text-orange-600 transition">Thực Đơn Món</a>
            <a href="#track" className="hover:text-orange-600 transition">Tra Cứu Đơn Hàng</a>
            <a href="#branches" className="hover:text-orange-600 transition">Hệ Thống Cơ Sở ({activeBranches.length})</a>
            <a href="#contact" className="hover:text-orange-600 transition">Liên Hệ CSKH</a>
          </nav>

          {/* Top-Right Admin Login / Dashboard Button */}
          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                href={user.role === 'BRANCH_STAFF' && user.branch_id ? `/branch/${user.branch_id}` : '/admin/dashboard'}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition flex items-center space-x-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Dashboard ({user.name})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Đăng Nhập Quản Trị</span>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* 2. HERO BANNER SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-slate-50 pt-10 pb-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          
          {cmsSettings?.promoBannerText && (
            <div className="max-w-4xl mx-auto mb-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-md animate-pulse">
              <span>{cmsSettings.promoBannerText}</span>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs sm:text-sm font-semibold shadow-2xs">
            <span className="text-base">🔥</span>
            <span>{cmsSettings?.hotlineBadgeText || 'Hotline Đặt Ngay:'}</span>
            <a 
              href={`tel:${(cmsSettings?.hero_hotline || cmsSettings?.hotline || '0988123456').replace(/\s+/g, '').replace(/\./g, '')}`} 
              className="font-bold text-orange-900 hover:underline"
            >
              {cmsSettings?.hero_hotline || cmsSettings?.hotline || '0988.123.456'}
            </a>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            {cmsSettings.hero_title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600">
              Thơm Ngon Đậm Đà • Giao Hỏa Tốc
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-600 leading-relaxed font-medium">
            {cmsSettings.hero_slogan}
          </p>

          {/* Banner Hero Image if Uploaded */}
          {cmsSettings.hero_banner_image && (
            <div className="max-w-3xl mx-auto my-4 overflow-hidden rounded-3xl border-2 border-orange-200 shadow-xl">
              <img src={cmsSettings.hero_banner_image} alt="Hero Banner" className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-bold text-slate-700">
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
              ⚡ Giao hỏa tốc 20-30p
            </span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
              🚚 Freeship đơn từ 350k
            </span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
              🌟 100% Gà tươi ủ muối hoa tiêu
            </span>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => handleOpenOrderModal()}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center space-x-2 cursor-pointer"
            >
              <span>🍗 Đặt Hàng Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#track"
              className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-extrabold px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-2xs transition flex items-center space-x-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-orange-600" />
              <span>Tra Cứu Tiến Độ Đơn Hàng</span>
            </a>
          </div>

        </div>
      </section>

      {/* 3. KHỐI TRA CỨU ĐƠN HÀNG NHANH (#track) */}
      <section id="track" className="max-w-4xl mx-auto px-4 py-12 scroll-mt-20 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          
          <div className="text-center space-y-1.5">
            <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              Tra Cứu Không Cần Đăng Nhập
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Tra Cứu Tiến Độ Đơn Hàng Nhanh</h2>
            <p className="text-xs text-slate-600 font-medium">
              Nhập Số điện thoại hoặc Mã đơn (#OD...) để kiểm tra tiến độ bếp &amp; shipper giao hàng.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchOrder} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Nhập SĐT (VD: 0984263340) hoặc Mã đơn (#OD9672)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              className="py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Tra Cứu Ngay</span>
            </button>
          </form>

          {/* Quick Demo Search Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span>Gợi ý mẫu:</span>
            <button
              onClick={() => {
                setSearchQuery('OD9672');
                handleSearchOrder();
              }}
              className="bg-slate-100 hover:bg-orange-50 hover:text-orange-700 px-2 py-0.5 rounded-lg transition"
            >
              #OD9672
            </button>
            <button
              onClick={() => {
                setSearchQuery('0984263340');
                handleSearchOrder();
              }}
              className="bg-slate-100 hover:bg-orange-50 hover:text-orange-700 px-2 py-0.5 rounded-lg transition"
            >
              0984263340
            </button>
          </div>

          {/* Search Result Display Card */}
          {hasSearched && (
            <div className="pt-4 border-t border-slate-100 animate-in fade-in duration-200">
              {searchError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl text-center font-bold">
                  {searchError}
                </div>
              ) : searchedOrder ? (
                <div className="bg-gradient-to-b from-orange-50/60 to-white border-2 border-orange-200 rounded-2xl p-5 space-y-4 shadow-xs text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-orange-200 pb-3 gap-2">
                    <div>
                      <span className="font-extrabold text-orange-700 text-sm">ĐƠN HÀNG #{searchedOrder.order_code}</span>
                      <p className="text-[10px] text-slate-500 font-semibold">{new Date(searchedOrder.created_at).toLocaleString('vi-VN')}</p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {searchedOrder.status === 'PAID' && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-3 py-1 rounded-xl text-xs inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          🟢 Báo Kim / Đã Thanh Toán
                        </span>
                      )}
                      {searchedOrder.status === 'SHIPPING' && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-300 font-black px-3 py-1 rounded-xl text-xs inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-purple-600 animate-bounce" />
                          🟣 Đang Giao Hỏa Tốc
                        </span>
                      )}
                      {searchedOrder.status === 'RECEIVED' && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 font-black px-3 py-1 rounded-xl text-xs inline-flex items-center gap-1">
                          🔴 Đang Chuẩn Bị Bếp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-orange-100 text-slate-700 font-medium">
                    <div><strong>Khách hàng:</strong> {searchedOrder.customer_name} ({searchedOrder.customer_phone})</div>
                    <div><strong>Địa chỉ:</strong> {searchedOrder.shipping_address}</div>
                    <div><strong>Cơ sở phụ trách:</strong> {searchedOrder.branch?.name || 'CƠ SỞ VIN SMART CITY'}</div>
                    <div><strong>Hotline bếp:</strong> {searchedOrder.branch?.phone || cmsSettings.hero_hotline}</div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-1 font-semibold">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Sản phẩm trong đơn:</div>
                    {searchedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-900 border-b border-dashed border-slate-200 pb-1">
                        <span>{item.quantity}x {item.item_name}</span>
                        <span>{item.subtotal.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                    <span>TỔNG THANH TOÁN:</span>
                    <span className="text-orange-600 text-base">{searchedOrder.final_amount.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </section>

      {/* 4. KHỐI THỰC ĐƠN MENU MÓN ĂN ĐẶC SẮC (#menu) */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20 space-y-8">
        <div className="text-center space-y-2">
          <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-orange-200">
            Thực Đơn Tươi Nóng
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Thực Đơn Gà Ủ Muối &amp; Món Ăn Kèm Nổi Bật</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl mx-auto">
            Chế biến tươi mới mỗi ngày, ủ muối hoa tiêu chuẩn vị, da giòn sần sật đóng gói giữ nhiệt công nghệ cao.
          </p>
        </div>

        {/* Product Grid Dynamic Sync */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleStorefrontProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl border border-slate-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-4xl shrink-0">
                      🍗
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    {p.is_best_seller && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                        🌟 Bán Chạy Nhất
                      </span>
                    )}
                    <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {p.category}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {p.description || (p.ai_keywords ? p.ai_keywords.join(' • ') : 'Gà ủ muối chuẩn vị da giòn sần sật')}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Giá bán:</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-lg font-black text-orange-600">{p.price.toLocaleString('vi-VN')}đ</span>
                    {p.original_price && (
                      <span className="line-through text-slate-400 font-semibold text-xs">{p.original_price.toLocaleString('vi-VN')}đ</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenOrderModal(p)}
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl text-xs shadow-sm transition flex items-center space-x-1 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Đặt Món Ngay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. KHỐI HỆ THỐNG CƠ SỞ PHỦ SÓNG (#branches) */}
      <section id="branches" className="bg-slate-100/70 border-y border-slate-200 py-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
              Phủ Sóng Toàn Quốc
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              Hệ Thống {activeBranches.length} Cơ Sở Phủ Sóng Hà Nội &amp; TP.HCM
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Sẵn sàng phục vụ giao hỏa tốc trong 20-30 phút tại các quận nội thành.</p>
          </div>

          {/* Branch Cards Dynamic Sync */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeBranches.map((b) => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5 hover:shadow-md transition">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>{b.name}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    🟢 Đang mở cửa
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="font-bold text-slate-900">{b.phone}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Giờ mở cửa: {b.hours}</span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <a
                    href={b.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-2 rounded-xl text-center transition flex items-center justify-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Xem Chỉ Đường Google Maps</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. FOOTER (#contact) */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-white font-black text-lg">
                <Store className="w-6 h-6 text-orange-500" />
                <span>{cmsSettings.hero_title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cmsSettings.hero_slogan}
              </p>
              <p className="text-xs text-orange-400 font-extrabold">
                📞 Hotline phản ánh chất lượng service: {cmsSettings.hotline_complaints}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs">Liên Kết Nhanh</h4>
              <ul className="space-y-1.5 text-slate-400 font-medium">
                <li><a href="#menu" className="hover:text-orange-400 transition">Thực đơn đặc sản gà ủ muối</a></li>
                <li><a href="#track" className="hover:text-orange-400 transition">Tra cứu tiến độ đơn hàng</a></li>
                <li><a href="#branches" className="hover:text-orange-400 transition">Hệ thống cơ sở phủ sóng</a></li>
                <li><Link href="/login" className="hover:text-orange-400 transition">Đăng nhập tài khoản Quản trị nội bộ</Link></li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs">Kênh Truyền Thông Official</h4>
              <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                <a href={cmsSettings.social_facebook} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-orange-600 text-white px-3 py-2 rounded-xl transition">
                  Facebook Fanpage
                </a>
                <a href={cmsSettings.social_tiktok} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-orange-600 text-white px-3 py-2 rounded-xl transition">
                  TikTok Official
                </a>
                <a href={cmsSettings.social_zalo} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-orange-600 text-white px-3 py-2 rounded-xl transition">
                  Zalo OA Đặt Hàng
                </a>
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500 font-medium">
            © 2026 Gà Ủ Muối Smart • Hệ Thống Quản Trị Đặt Hàng &amp; POS Chuyên Nghiệp. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 7. POPUP FORM ĐẶT HÀNG TRỰC TUYẾN MODAL (THEO ĐÚNG THIẾT KẾ MẪU) */}
      {/* ------------------------------------------------------------- */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          
          <div className="relative bg-[#2B1B17] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 max-w-xl w-full text-white shadow-2xl space-y-5 my-auto animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsOrderModalOpen(false);
                setSuccessOrder(null);
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-amber-300 p-1.5 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {successOrder ? (
              /* SUCCESS SCREEN AFTER ORDER SUBMISSION */
              <div className="text-center space-y-4 py-2 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400/50 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight">
                    🎉 ĐẶT HÀNG THÀNH CÔNG!
                  </h3>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black px-3 py-1 rounded-full inline-block">
                    Mã đơn hàng: #{successOrder.order_code}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 text-xs space-y-2 text-amber-100/90 text-left">
                  <p><strong>Khách hàng:</strong> {successOrder.customer_name} ({successOrder.customer_phone})</p>
                  <p><strong>Địa chỉ:</strong> {successOrder.shipping_address}</p>
                  <p><strong>Cơ sở phụ trách:</strong> <span className="text-amber-300 font-bold">{successOrder.branch?.name}</span> ({successOrder.branch?.phone})</p>
                  <p className="text-emerald-400 font-extrabold">🚀 Nhân viên tại cơ sở sẽ gọi điện xác nhận và giao hàng cho bạn trong 20-30 phút!</p>
                </div>

                {/* Dynamic VietQR Payment Code */}
                <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-amber-500/30">
                  <span className="text-xs font-bold text-amber-300 block">Thanh toán chuyển khoản VietQR tự động (Tùy chọn):</span>
                  <img
                    src={`https://img.vietqr.io/image/${(cmsSettings?.bankInfo?.bankName || 'MB').replace(/\s+/g, '')}-${cmsSettings?.bankInfo?.accountNumber || '0988123456'}-compact2.png?amount=${successOrder.final_amount}&addInfo=${successOrder.order_code}&accountName=${encodeURIComponent(cmsSettings?.bankInfo?.accountHolder || 'GA U MUOI SMART')}`}
                    alt="VietQR Code"
                    className="w-44 h-44 object-contain mx-auto rounded-xl border-2 border-amber-400 p-1 bg-white shadow-md"
                  />
                  <span className="text-[10px] text-amber-200/70 block">Số tiền: <strong>{successOrder.final_amount.toLocaleString('vi-VN')} VNĐ</strong> • Nội dung: <strong>{successOrder.order_code}</strong></span>
                </div>

                <button
                  onClick={() => {
                    setIsOrderModalOpen(false);
                    setSuccessOrder(null);
                    setSearchQuery(successOrder.order_code);
                    handleSearchOrder();
                    const trackEl = document.getElementById('track');
                    if (trackEl) trackEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black py-3 rounded-full text-xs shadow-lg uppercase tracking-wider transition cursor-pointer"
                >
                  🔍 Xác Nhận &amp; Theo Dõi Tiến Độ Đơn Hàng
                </button>
              </div>
            ) : (
              /* ORDER FORM INTERFACE (MATCHING USER SCREENSHOT) */
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                
                {/* Form Header */}
                <div className="text-center space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-tight drop-shadow-sm">
                    LIÊN HỆ ĐẶT HÀNG
                  </h2>
                  <p className="text-[11px] text-amber-200/80 font-bold">
                    Giao nóng hỏa tốc 20-30 phút • Nhận hàng kiểm tra rồi thanh toán
                  </p>
                </div>

                {/* Error Banner */}
                {formError && (
                  <div className="bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs p-2.5 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Inputs: Customer Info (Pill-shaped White Inputs) */}
                <div className="space-y-2">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Họ và Tên (*)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white rounded-full text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Số điện thoại giao hàng (*)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white rounded-full text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Địa chỉ nhận hàng (*): Số nhà, tên đường, Phường/Xã, Quận/Huyện..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white rounded-full text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Automatic Nearest Branch Suggestion Box */}
                {suggestedBranch && (
                  <div className="bg-amber-950/60 border border-amber-500/50 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="font-extrabold text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        📍 Cơ sở phục vụ gần nhất: <strong className="text-white ml-1">{suggestedBranch.name}</strong>
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full shrink-0">
                        Giao ~20-30p
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-amber-200/70 pt-0.5">
                      <span>Thay đổi cơ sở nhận đơn:</span>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="bg-slate-900 border border-amber-500/40 rounded-lg text-amber-200 px-2 py-1 text-xs outline-none font-bold cursor-pointer"
                      >
                        {activeBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Combos & Items Checkbox List */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-200 block">
                    Danh sách Combo &amp; Món Ăn chọn mua (Bấm chọn thêm/bớt món):
                  </label>

                  <div className="bg-white rounded-2xl p-3 text-slate-900 space-y-2 max-h-52 overflow-y-auto text-xs shadow-inner">
                    {allSelectableItems.map((combo) => {
                      const isChecked = selectedComboIds.includes(combo.id);
                      return (
                        <label
                          key={combo.id}
                          onClick={() => handleToggleComboCheckbox(combo.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'bg-amber-50 border-amber-400 shadow-2xs font-extrabold'
                              : 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                            />
                            <span className="text-slate-900 font-bold">{combo.name}</span>
                          </div>

                          {combo.isHot && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-300 font-black px-2 py-0.5 rounded-full shrink-0">
                              ★ HOT ★
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Processing Requirements (Radio Pill Buttons) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-200 block">
                    Yêu cầu chế biến gà:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-extrabold">
                    <button
                      type="button"
                      onClick={() => setCutPreference('Chặt sẵn ăn luôn')}
                      className={`py-2 px-3 rounded-full border transition flex items-center justify-center space-x-2 cursor-pointer ${
                        cutPreference === 'Chặt sẵn ăn luôn'
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      <span>(•) Chặt sẵn ăn luôn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCutPreference('Không chặt (để nguyên con)')}
                      className={`py-2 px-3 rounded-full border transition flex items-center justify-center space-x-2 cursor-pointer ${
                        cutPreference === 'Không chặt (để nguyên con)'
                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      <span>( ) Không chặt (để nguyên)</span>
                    </button>
                  </div>
                </div>

                {/* Extra Notes & Quantity Note */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-amber-300 text-center italic border border-amber-500/30 rounded-xl py-1 px-2 bg-amber-500/10">
                    * Giá trên chưa bao gồm phí Ship *
                  </p>

                  <textarea
                    rows={1}
                    placeholder="Số lượng cần mua Ví dụ: 1 con gà ủ muối, 1 hộp chân gà..."
                    value={quantityNote}
                    onChange={(e) => setQuantityNote(e.target.value)}
                    className="w-full px-4 py-2 bg-white rounded-2xl text-slate-900 font-medium text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                  />

                  <input
                    type="text"
                    placeholder="Ghi chú thêm Ví dụ: Thời gian nhận, nhiều rau răm, ớt riêng..."
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                    className="w-full px-4 py-2 bg-white rounded-full text-slate-900 font-medium text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                  />
                </div>

                {/* Total Price Summary Box */}
                <div className="flex justify-between items-center bg-slate-950/90 p-3.5 rounded-2xl border border-amber-500/40">
                  <span className="text-xs font-extrabold text-amber-200 uppercase">
                    TỔNG TIỀN MÓN (TẠM TÍNH):
                  </span>
                  <span className="text-xl font-black text-amber-400">
                    {totalOrderAmount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black py-3.5 rounded-full text-base shadow-xl uppercase tracking-wider transition transform active:scale-95 cursor-pointer"
                  >
                    ⚡ ĐẶT NGAY
                  </button>

                  <a
                    href="tel:0396637038"
                    className="flex items-center justify-center space-x-2 bg-orange-600/90 hover:bg-orange-600 text-white font-extrabold py-2.5 rounded-full text-xs transition border border-orange-400/40"
                  >
                    <span>📞 Hotline: 039 663 7038 (Bấm để gọi trực tiếp)</span>
                  </a>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
