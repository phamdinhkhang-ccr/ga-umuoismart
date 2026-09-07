'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useBranches } from '@/context/BranchContext';
import { 
  Store, Search, ShoppingBag, Phone, MapPin, Clock, ExternalLink, 
  CheckCircle2, Sparkles, Truck, ShieldCheck, Flame, MessageCircle, 
  Bot, LogIn, Lock, ArrowRight, UserCheck, Star, Zap, PhoneCall, Headphones,
  X, Check, QrCode, AlertCircle
} from 'lucide-react';
import { getAnalyticsData, addNewMockOrder } from '@/actions/orders';
import { 
  getProducts, getCmsSettings, StorefrontCmsSettings, ProductRecord, 
  addNotification, addOrUpdateCustomerFromOrder, getItem, setItem, savePosOrder, playBeep, formatPrice,
  safeFormatPrice, sanitizeProduct
} from '@/lib/store';
import { Order } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistanceKm } from '@/lib/routing';
import { findBestBranchForAddress } from '@/utils/branchMatcher';

const PRESET_COMBOS: any[] = [];

const BRANCH_KEYWORDS: Record<string, string[]> = {
  'CHI NHÁNH GÀ Ủ MUỐI QUẬN 1 (TP.HCM)': [
    'quận 1', 'q1', 'q.1', 'bến thành', 'bến nghé', 'đằng lữ', 'phạm ngũ lão', 'tân định', 'hồ chí minh', 'sài gòn', 'hcm', 'lê lợi'
  ],
  'CHI NHÁNH GÀ Ủ MUỐI QUẬN 3 (TP.HCM)': [
    'quận 3', 'q3', 'q.3', 'võ thị sáu', 'cách mạng tháng 8', 'cmt8', 'nam kỳ khởi nghĩa', 'điện biên phủ', 'phú nhuận', 'bình thạnh'
  ],
  'CHI NHÁNH BÁN ĐẢO LINH ĐÀM': [
    'linh đàm', 'hoàng mai', 'định công', 'giáp bát', 'bạch mai', 'thanh xuân nam', 'hoàng liệt', 'thanh trì', 'đại thanh', 'thượng phúc'
  ],
  'CHI NHÁNH CẦU GIẤY': [
    'cầu giấy', 'dịch vọng', 'nghĩa tân', 'nghĩa đô', 'xuân thủy', 'mai dịch', 'trần thái tông', 'trung hòa', 'tây hồ', 'thanh xuân'
  ],
  'CHI NHÁNH ĐỐNG ĐA': [
    'đống đa', 'xã đàn', 'chùa bộc', 'ô chợ dừa', 'láng hạ', 'thái hà', 'tôn đức thắng', 'nguyễn lương bằng'
  ],
  'CƠ SỞ VIN SMART CITY (NAM TỪ LIÊM)': [
    'vin smart', 'vinsmart', 'smart city', 'tây mỗ', 'đại mỗ', 'nam từ liêm', 'bắc từ liêm', 'an khánh', 'hoài đức', 'hà đông'
  ]
};

const BRANCH_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'vinsmart': { lat: 21.0028, lng: 105.7485 },
  'linhdam': { lat: 20.9702, lng: 105.8275 },
  'caugiay': { lat: 21.0362, lng: 105.7906 },
  'dongda': { lat: 21.0181, lng: 105.8272 },
  'q1': { lat: 10.7769, lng: 106.7009 },
  'q3': { lat: 10.7844, lng: 106.6844 }
};

export default function PublicStorefrontHome() {
  const { user } = useAuth();
  const { activeBranches: contextActiveBranches } = useBranches();

  // Dynamic Storefront CMS & Products State
  const [cmsSettings, setCmsSettings] = useState<StorefrontCmsSettings>({
    hero_title: '',
    hero_slogan: '',
    hero_hotline: '',
    hotline: '',
    hotlineBadgeText: '',
    branches: [],
    social_facebook: '',
    social_tiktok: '',
    social_zalo: '',
    hotline_complaints: ''
  });

  const [productsList, setProductsList] = useState<ProductRecord[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [selectedItems, setSelectedItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);

  // Search & Order Tracking State
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
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>([]);
  const [cutPreference, setCutPreference] = useState<'Chặt sẵn ăn luôn' | 'Không chặt (để nguyên con)'>('Chặt sẵn ăn luôn');
  const [quantityNote, setQuantityNote] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VIETQR'>('COD');
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectionSource, setDetectionSource] = useState<'address' | 'gps' | 'manual'>('address');

  // Filter active branches only (using contextActiveBranches if available)
  const activeBranches = useMemo(() => {
    if (contextActiveBranches && contextActiveBranches.length > 0) {
      return contextActiveBranches;
    }
    return cmsSettings.branches?.filter((b) => b.is_active !== false) || [];
  }, [contextActiveBranches, cmsSettings.branches]);

  const autoDetectBranchFromAddress = useCallback((addressText: string) => {
    if (!addressText || activeBranches.length === 0) return;
    const matched = findBestBranchForAddress(addressText, activeBranches);
    if (matched && matched.id !== selectedBranchId) {
      setSelectedBranchId(matched.id);
      setDetectionSource('address');
    }
  }, [activeBranches, selectedBranchId]);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const loadActiveProductsAndSettings = async () => {
      try {
        setIsLoadingMenu(true);
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        if (!prodErr && Array.isArray(prodData) && prodData.length > 0) {
          setMenuItems(prodData);
          setProductsList(prodData);
        } else {
          const fallback = getProducts();
          setMenuItems(fallback);
          setProductsList(fallback);
        }
      } catch (err) {
        console.error('Lỗi tải sản phẩm vào form checkout:', err);
        const fallback = getProducts();
        setMenuItems(fallback);
        setProductsList(fallback);
      } finally {
        if (isMounted) setIsLoadingMenu(false);
      }

      const applyCmsData = (loadedSettings: any) => {
        if (!loadedSettings || !isMounted) return;
        const raw = loadedSettings.data ? { ...loadedSettings.data, ...loadedSettings } : loadedSettings;
        setCmsSettings(prev => ({
          ...prev,
          ...raw,
          brandName: raw.brand_name || raw.brandName || prev.brandName,
          hero_title: raw.hero_title || raw.hero_highlight || raw.brand_name || raw.brandName || prev.hero_title,
          hero_slogan: raw.hero_slogan || raw.heroSubtitle || prev.hero_slogan,
          heroHighlightTitle: raw.hero_highlight || raw.heroHighlightTitle || prev.heroHighlightTitle,
          hotline: raw.hotline || raw.hero_hotline || prev.hotline,
          hero_hotline: raw.hero_hotline || raw.hotline || prev.hero_hotline,
          hotlineBadgeText: raw.hotline_badge || raw.hotlineBadgeText || prev.hotlineBadgeText,
          banner_url: raw.banner_url || raw.hero_banner_image || (prev as any).banner_url || '',
          hero_banner_image: raw.banner_url || raw.hero_banner_image || prev.hero_banner_image || '',
          featureTag1: raw.badge_promo !== undefined ? raw.badge_promo : (raw.featureTag1 !== undefined ? raw.featureTag1 : prev.featureTag1),
          featureTag2: raw.badge_ship !== undefined ? raw.badge_ship : (raw.featureTag2 !== undefined ? raw.featureTag2 : prev.featureTag2),
        }));
      };

      try {
        const { data: siteData, error: siteErr } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 'default_config')
          .maybeSingle();

        if (!siteErr && siteData && isMounted) {
          applyCmsData(siteData);
        } else {
          const { data: sfData, error: sfErr } = await supabase
            .from('storefront_settings')
            .select('*')
            .eq('id', 'default_config')
            .maybeSingle();

          if (!sfErr && sfData && isMounted) {
            applyCmsData(sfData);
          }
        }
      } catch (err) {
        console.error('Lỗi tải site_settings từ Supabase:', err);
      }

      if (isMounted) {
        channel = supabase
          .channel('public:site_settings_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'site_settings' },
            (payload: any) => {
              if (payload?.new && isMounted) {
                applyCmsData(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'storefront_settings' },
            (payload: any) => {
              if (payload?.new && isMounted) {
                applyCmsData(payload.new);
              }
            }
          )
          .subscribe();
      }
    };

    loadActiveProductsAndSettings();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    if (!address || address.trim().length < 3) return;
    const matched = findBestBranchForAddress(address, activeBranches);
    if (matched && matched.id !== selectedBranchId) {
      setSelectedBranchId(matched.id);
      setDetectionSource('address');
    }
  }, [address, activeBranches, selectedBranchId]);

  const handleFindNearestBranchByGeo = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị vị trí!');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });
        setDetectionSource('gps');

        let minDistance = Infinity;
        let closestBranch: any = null;

        activeBranches.forEach((b: any) => {
          const coords = (b.latitude && b.longitude) 
            ? { lat: Number(b.latitude), lng: Number(b.longitude) } 
            : Object.entries(BRANCH_COORDINATES).find(([k]) => b.name.toLowerCase().includes(k) || (b.address || '').toLowerCase().includes(k))?.[1];

          if (coords) {
            const dist = calculateDistanceKm(userLat, userLng, coords.lat, coords.lng);
            if (dist < minDistance) {
              minDistance = dist;
              closestBranch = { ...b, distance: Math.round(dist * 10) / 10 };
            }
          }
        });

        if (!closestBranch && activeBranches.length > 0) {
          closestBranch = activeBranches[0];
        }

        if (closestBranch) {
          setSelectedBranchId(closestBranch.id);
          const distLabel = minDistance !== Infinity ? ` (Cách ${closestBranch.distance || (Math.round(minDistance * 10) / 10)} km)` : '';
          alert(`📍 Đã chọn cơ sở gần vị trí hiện tại của thiết bị: ${closestBranch.name}${distLabel}`);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Không thể lấy tọa độ:', error);
        alert('Vui lòng bật quyền truy cập vị trí trên trình duyệt để tìm cơ sở gần nhất!');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Dynamic display products priority: cmsSettings.menuItems -> cmsSettings.products -> productsList
  const displayProducts = useMemo(() => {
    const rawList = (cmsSettings as any)?.menuItems?.length > 0 
      ? (cmsSettings as any).menuItems 
      : (cmsSettings as any)?.products?.length > 0 
        ? (cmsSettings as any).products 
        : productsList;

    if (!Array.isArray(rawList)) return [];

    return rawList
      .filter((p: any) => p && p.isVisible !== false && p.is_storefront_visible !== false)
      .sort((a: any, b: any) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));
  }, [cmsSettings, productsList]);

  // Combined selectable items array (Presets + Products from store)
  const allSelectableItems = useMemo(() => {
    const presets = [...PRESET_COMBOS];
    displayProducts.forEach((p: any) => {
      if (!presets.some(item => item.name.toLowerCase().includes((p.name || '').toLowerCase()))) {
        presets.push({
          id: p.id,
          name: `${p.name} - ${formatPrice(p.price || 0)}`,
          price: p.price || 0,
          isHot: !!p.is_best_seller
        });
      }
    });
    return presets;
  }, [displayProducts]);

  // Computed Branches List with Distance (Haversine formula + fallback coordinates)
  const availableBranchesWithDistance = useMemo(() => {
    if (!activeBranches || activeBranches.length === 0) return [];
    return activeBranches.map((b: any) => {
      let dist: number | undefined = undefined;
      let lat = Number(b.latitude);
      let lng = Number(b.longitude);

      if (!lat || !lng) {
        const fallback = Object.entries(BRANCH_COORDINATES).find(
          ([k]) => b.name.toLowerCase().includes(k) || (b.address || '').toLowerCase().includes(k)
        )?.[1];
        if (fallback) {
          lat = fallback.lat;
          lng = fallback.lng;
        }
      }

      if (userLocation && lat && lng) {
        dist = Math.round(calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng) * 10) / 10;
      }
      return { ...b, distance: dist, latitude: lat || b.latitude, longitude: lng || b.longitude };
    });
  }, [activeBranches, userLocation]);

  // Auto Nearest Branch Suggestion Logic based on Coordinates & Address Keywords
  const suggestedBranch = useMemo(() => {
    if (!availableBranchesWithDistance || availableBranchesWithDistance.length === 0) return null;

    if (userLocation) {
      const sorted = [...availableBranchesWithDistance].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
      return sorted[0];
    }

    const addr = address.toLowerCase().trim();
    if (addr) {
      for (const branch of availableBranchesWithDistance) {
        const keywords = Object.entries(BRANCH_KEYWORDS).find(
          ([bName]) => branch.name.toLowerCase().includes(bName.toLowerCase()) || bName.toLowerCase().includes(branch.name.toLowerCase())
        )?.[1] || [];

        if (keywords.some(kw => addr.includes(kw))) {
          return branch;
        }
      }
    }

    if (selectedBranchId) {
      const currentB = availableBranchesWithDistance.find(x => x.id === selectedBranchId);
      if (currentB) return currentB;
    }

    return availableBranchesWithDistance[0];
  }, [address, availableBranchesWithDistance, selectedBranchId, userLocation]);

  // Sync selectedBranchId when suggestedBranch updates
  useEffect(() => {
    if (suggestedBranch) {
      setSelectedBranchId(suggestedBranch.id);
    }
  }, [suggestedBranch]);

  // Toggle Product Selection
  const handleToggleProduct = (prod: any) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.id === prod.id || item.name.toLowerCase() === (prod.name || '').toLowerCase());
      if (existing) {
        return prev.filter((item) => item.id !== prod.id && item.name.toLowerCase() !== (prod.name || '').toLowerCase());
      } else {
        return [
          ...prev,
          {
            id: prod.id,
            name: prod.name,
            price: Number(prod.price || 0),
            quantity: 1
          }
        ];
      }
    });

    setSelectedComboIds((prev) => {
      if (prev.includes(prod.id)) {
        return prev.filter((x) => x !== prod.id);
      } else {
        return [...prev, prod.id];
      }
    });
  };

  // Update Product Quantity
  const handleUpdateQty = (prodId: string, newQty: number) => {
    if (newQty <= 0) {
      setSelectedItems((prev) => prev.filter((item) => item.id !== prodId));
      setSelectedComboIds((prev) => prev.filter((id) => id !== prodId));
    } else {
      setSelectedItems((prev) => {
        const found = prev.find((item) => item.id === prodId);
        if (found) {
          return prev.map((item) => (item.id === prodId ? { ...item, quantity: newQty } : item));
        } else {
          const prodObj = menuItems.find((p) => p.id === prodId) || allSelectableItems.find((p) => p.id === prodId);
          if (prodObj) {
            return [
              ...prev,
              {
                id: prodObj.id,
                name: prodObj.name,
                price: Number(prodObj.price || 0),
                quantity: newQty
              }
            ];
          }
          return prev;
        }
      });
      if (!selectedComboIds.includes(prodId)) {
        setSelectedComboIds((prev) => [...prev, prodId]);
      }
    }
  };

  // Total Order Amount Calculation
  const totalOrderAmount = useMemo(() => {
    if (selectedItems.length > 0) {
      return selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    }
    let total = 0;
    selectedComboIds.forEach(id => {
      const item = allSelectableItems.find(c => c.id === id);
      if (item) total += item.price;
    });
    return total;
  }, [selectedItems, selectedComboIds, allSelectableItems]);

  // Open Order Modal & Pre-check item
  const handleOpenOrderModal = (product?: ProductRecord | string | any) => {
    setFormError(null);
    setSuccessOrder(null);
    setIsOrderModalOpen(true);

    if (product) {
      const pName = typeof product === 'string' ? product : product.name;
      const matched = menuItems.find((item) => item.name.toLowerCase().includes(pName.toLowerCase())) ||
        allSelectableItems.find((item: any) => item.name.toLowerCase().includes(pName.toLowerCase())) ||
        product;

      if (matched) {
        setSelectedItems([
          {
            id: matched.id || `custom-${Date.now()}`,
            name: matched.name,
            price: Number(matched.price || 0),
            quantity: 1
          }
        ]);
        if (matched.id) {
          setSelectedComboIds([matched.id]);
        }
      }
    } else {
      if (selectedItems.length === 0 && menuItems.length > 0) {
        setSelectedItems([
          {
            id: menuItems[0].id,
            name: menuItems[0].name,
            price: Number(menuItems[0].price || 0),
            quantity: 1
          }
        ]);
        setSelectedComboIds([menuItems[0].id]);
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
    if (selectedItems.length === 0 && selectedComboIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 món ăn hoặc Combo!');
      return;
    }

    const chosenBranch = activeBranches.find(b => b.id === selectedBranchId) || suggestedBranch || activeBranches[0];
    const orderCode = `OD${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedItemsList = selectedItems.length > 0
      ? selectedItems.map(item => ({
          menu_item_id: item.id,
          item_name: item.name,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          price: item.price,
          cost_price: Math.round(item.price * 0.55),
          subtotal: item.price * item.quantity
        }))
      : selectedComboIds.map(id => {
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

    const orderId = orderCode;
    const now = new Date().toISOString();
    const branchName = chosenBranch?.name || 'CƠ SỞ VIN SMART CITY';
    const branchId = chosenBranch?.id || 'b1';

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
      const orderPayload = {
        id: orderId,
        order_code: orderId,
        customer_name: fullName.trim() || 'Khách Vãng Lai',
        customer_phone: phone.trim(),
        phone: phone.trim(),
        customer_address: address.trim(),
        shipping_address: address.trim(),
        address: address.trim(),
        branch_id: branchId,
        branch_name: branchName,
        branch: branchName,
        items: selectedItemsList,
        total_amount: calculatedTotalAmount || 0,
        final_amount: calculatedTotalAmount || 0,
        payment_method: paymentMethod || 'COD',
        status: 'PENDING',
        cut_option: cutPreference || 'Chặt sẵn ăn luôn',
        note: formattedOrder.note || '',
        source: 'Web Khách Đặt',
        created_at: now
      };

      (async () => {
        try {
          const { error: dbErr } = await supabase.from('orders').insert([orderPayload]);
          if (dbErr) console.error('Lỗi lưu đơn hàng vào Supabase DB:', dbErr);
        } catch (err) {
          console.error('Exception khi lưu đơn vào Supabase:', err);
        }
      })();

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
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
                {(cmsSettings as any)?.brand_name || (cmsSettings as any)?.site_title || cmsSettings?.brandName || cmsSettings?.hero_title || 'Gà Ủ Muối Smart'}
                <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold hidden sm:flex">
                <span className="text-orange-500">✨</span>
                <span>{(cmsSettings as any)?.slogan || cmsSettings?.hero_slogan || cmsSettings?.heroSubtitle || 'Đặc Sản Da Giòn Sần Sật • Giao Hỏa Tốc'}</span>
              </div>
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
          
          {/* Promo Banner: render only when non-empty */}
          {cmsSettings?.promoBannerText && cmsSettings.promoBannerText.trim() !== '' && (
            <div className="max-w-4xl mx-auto mb-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-md animate-pulse">
              <span>{cmsSettings.promoBannerText}</span>
            </div>
          )}

          {/* Hotline Badge: render only when hotline number is non-empty */}
          {(cmsSettings?.hotline || cmsSettings?.hero_hotline) && (cmsSettings?.hotline || cmsSettings?.hero_hotline)?.trim() !== '' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs sm:text-sm font-semibold shadow-2xs">
              <span className="text-base">🔥</span>
              <span>{cmsSettings?.hotlineBadgeText && cmsSettings.hotlineBadgeText.trim() !== '' ? cmsSettings.hotlineBadgeText : 'Hotline Đặt Ngay:'}</span>
              <a 
                href={`tel:${(cmsSettings?.hotline || cmsSettings?.hero_hotline || '').replace(/\s+/g, '').replace(/\./g, '')}`} 
                className="font-bold text-orange-900 hover:underline"
              >
                {cmsSettings?.hotline || cmsSettings?.hero_hotline}
              </a>
            </div>
          )}

          {/* Hero Titles: render main title and highlight title conditionally without fallback defaults */}
          {((cmsSettings?.hero_title && cmsSettings.hero_title.trim() !== '') || (cmsSettings?.heroHighlightTitle && cmsSettings.heroHighlightTitle.trim() !== '')) && (
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
              {cmsSettings?.hero_title && cmsSettings.hero_title.trim() !== '' ? (
                <span>{cmsSettings.hero_title}</span>
              ) : null}

              {cmsSettings?.hero_title && cmsSettings.hero_title.trim() !== '' && cmsSettings?.heroHighlightTitle && cmsSettings.heroHighlightTitle.trim() !== '' ? (
                <br />
              ) : null}

              {cmsSettings?.heroHighlightTitle && cmsSettings.heroHighlightTitle.trim() !== '' && (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 block">
                  {cmsSettings.heroHighlightTitle}
                </span>
              )}
            </h1>
          )}

          {/* Slogan / Subtitle: render only when non-empty */}
          {((cmsSettings as any)?.heroSubtitle || cmsSettings?.hero_slogan) && ((cmsSettings as any)?.heroSubtitle || cmsSettings?.hero_slogan)?.trim() !== '' && (
            <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-600 leading-relaxed font-medium">
              {(cmsSettings as any)?.heroSubtitle || cmsSettings.hero_slogan}
            </p>
          )}

          {/* Banner Hero Image */}
          <div className="relative w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90 aspect-[4/3] bg-orange-100 my-4">
            <img
              src={
                (cmsSettings as any)?.banner_url || 
                (cmsSettings as any)?.hero_banner || 
                (cmsSettings as any)?.hero_image || 
                cmsSettings?.hero_banner_image || 
                'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop'
              }
              alt="Banner Gà Ủ Muối Smart"
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';
              }}
            />
          </div>

          {/* Badges / Feature Tags */}
          {(() => {
            const tag1 = cmsSettings.featureTag1 !== undefined ? cmsSettings.featureTag1 : 'Giao hỏa tốc 30-40p';
            const tag2 = cmsSettings.featureTag2 !== undefined ? cmsSettings.featureTag2 : 'Hỗ trợ 35k ship từ Bill 355k';

            const hasTag1 = tag1 && tag1.trim() !== '';
            const hasTag2 = tag2 && tag2.trim() !== '';

            if (!hasTag1 && !hasTag2) return null;

            return (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-bold text-slate-700">
                {hasTag1 && (
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
                    {tag1.startsWith('⚡') ? tag1 : `⚡ ${tag1}`}
                  </span>
                )}
                {hasTag2 && (
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
                    {tag2.startsWith('🚚') ? tag2 : `🚚 ${tag2}`}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            {/* Nút Đặt Hàng Ngay */}
            <button
              onClick={() => handleOpenOrderModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 md:px-8 md:py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base md:text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <span className="text-xl">🍗</span>
              <span>Đặt Hàng Ngay</span>
              <ArrowRight className="w-5 h-5 text-white shrink-0 ml-0.5" />
            </button>

            {/* Nút Tra Cứu Tiến Độ Đơn Hàng */}
            <a
              href="#track"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 md:px-8 md:py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base md:text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Search className="w-5 h-5 text-white shrink-0" />
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
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchOrder} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Nhập số điện thoại (VD: 0984263340)"
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
                        <span>{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                    <span>TỔNG THANH TOÁN:</span>
                    <span className="text-orange-600 text-base">{formatPrice(searchedOrder.final_amount)}</span>
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
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Menu Gà Smart</h2>
        </div>

        {/* Product Grid Dynamic Sync */}
        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProducts
              .filter((p: any) => p && p.is_active !== false)
              .map(sanitizeProduct)
              .map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      {/* Product Image Box with onError Fallback */}
                      <div className="w-full h-44 bg-amber-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 shadow-2xs">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Khối Giá bán & Nút Đặt món - Không lọt bất kỳ ký tự thừa nào */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Giá bán</span>
                      <span className="text-xl font-bold text-orange-600">
                        {safeFormatPrice(item.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenOrderModal(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all whitespace-nowrap cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>Đặt Món Ngay</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <p className="text-slate-500 font-bold text-sm">Cửa hàng đang cập nhật thực đơn món mới...</p>
          </div>
        )}
      </section>

      {/* 5. KHỐI HỆ THỐNG CƠ SỞ PHỦ SÓNG (#branches) */}
      <section id="branches" className="bg-slate-100/70 border-y border-slate-200 py-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Hệ Thống {activeBranches.length || 6} Cơ Sở Phủ Sóng Hà Nội &amp; TP.HCM
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-600">
              Sẵn sàng phục vụ hỏa tốc trong 30-40 phút tại các quận nội thành
            </p>
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
                    <a href={`tel:${(b.phone || '').replace(/\s+/g, '').replace(/\./g, '')}`} className="font-bold text-slate-900 hover:text-orange-600 transition">
                      {b.phone}
                    </a>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Giờ mở cửa: {b.hours || '08:00 - 22:00'}</span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <a
                    href={`tel:${(b.phone || '').replace(/\s+/g, '').replace(/\./g, '')}`}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1 shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Gọi Hotline</span>
                  </a>
                  <a
                    href={b.maps_url || `https://maps.google.com/?q=${encodeURIComponent(b.address || b.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-2 rounded-xl text-center transition flex items-center justify-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chỉ Đường Google Maps</span>
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

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Địa chỉ nhận hàng (*): Số nhà, tên đường, Phường/Xã, Quận/Huyện..."
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          autoDetectBranchFromAddress(e.target.value);
                        }}
                        className="flex-1 px-4 py-2.5 bg-white rounded-full text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleFindNearestBranchByGeo}
                        disabled={isLocating}
                        className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-full text-xs shadow-sm transition whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isLocating ? 'Đang vị trí...' : '📍 Vị trí hiện tại của tôi'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Automatic Nearest Branch Suggestion Box */}
                {suggestedBranch && (
                  <div className="bg-gradient-to-r from-amber-950/80 to-orange-950/80 border-2 border-amber-400/60 rounded-2xl p-3.5 text-xs space-y-2.5 shadow-md">
                    <div className="font-black text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {detectionSource === 'gps'
                            ? '📍 Đã chọn cơ sở gần vị trí hiện tại của thiết bị: '
                            : '📍 Đề xuất cơ sở gần địa chỉ giao nhất: '}
                          <strong className="text-white uppercase tracking-tight">{suggestedBranch.name}</strong>
                        </span>
                        {suggestedBranch.distance !== undefined && suggestedBranch.distance < 999 && (
                          <span className="ml-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-semibold text-xs border border-orange-400/40">
                            Cách bạn {suggestedBranch.distance} km
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-amber-400 font-medium shrink-0">
                        (Dự kiến giao 30-40p)
                      </span>
                    </div>

                    {/* Dropdown đổi cơ sở kèm khoảng cách */}
                    <div className="pt-1.5 border-t border-amber-500/30 text-xs">
                      <label className="text-[11px] text-amber-200/80 block mb-1 font-semibold">Thay đổi cơ sở nhận đơn:</label>
                      <select
                        value={selectedBranchId || suggestedBranch.id}
                        onChange={(e) => {
                          setSelectedBranchId(e.target.value);
                          setDetectionSource('manual');
                        }}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg text-amber-200 px-3 py-1.5 text-xs outline-none font-bold cursor-pointer"
                      >
                        {availableBranchesWithDistance.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name} {b.distance !== undefined && b.distance < 999 ? `(Cách ${b.distance} km)` : `(${b.district || 'Hà Nội'})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Payment Method Selector (VietQR / COD) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-200 block">
                    Phương thức thanh toán:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-extrabold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-2.5 rounded-2xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'COD'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                          : 'bg-slate-900/80 text-amber-200 border-amber-500/30 hover:bg-slate-800'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>💵 Tiền Mặt Khi Nhận (COD)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('VIETQR')}
                      className={`p-2.5 rounded-2xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === 'VIETQR'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                          : 'bg-slate-900/80 text-amber-200 border-amber-500/30 hover:bg-slate-800'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>💳 Chuyển Khoản VietQR</span>
                    </button>
                  </div>
                </div>

                {/* Combos & Items Checkbox List */}
                <div className="mt-3">
                  <label className="block text-xs md:text-sm font-bold text-amber-200 mb-2">
                    Danh sách Combo &amp; Món Ăn chọn mua (Bấm chọn thêm/bớt món):
                  </label>

                  <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-3 max-h-60 overflow-y-auto space-y-2">
                    {isLoadingMenu ? (
                      <div className="py-6 text-center text-xs text-amber-200/60">
                        Đang nạp danh sách món ăn...
                      </div>
                    ) : (menuItems.length === 0 && allSelectableItems.length === 0) ? (
                      <div className="py-6 text-center text-xs text-gray-400">
                        Chưa có món ăn nào trong thực đơn. Vui lòng thêm sản phẩm trong Admin.
                      </div>
                    ) : (
                      (menuItems.length > 0 ? menuItems : allSelectableItems).map((prod) => {
                        const selected = selectedItems.find((item: any) => item.id === prod.id || item.name.toLowerCase() === (prod.name || '').toLowerCase());
                        const isChecked = Boolean(selected && selected.quantity > 0) || selectedComboIds.includes(prod.id);

                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleToggleProduct(prod)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                                : 'bg-neutral-800/60 border-neutral-700/60 text-gray-300 hover:border-neutral-500'
                            }`}
                          >
                            {/* Checkbox + Tên món */}
                            <div className="flex items-center gap-3 select-none flex-1 pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-800 border-neutral-600 cursor-pointer"
                              />
                              <div>
                                <span className="text-xs md:text-sm font-semibold block">{prod.name}</span>
                                <span className="text-xs text-amber-400 font-bold">
                                  {Number(prod.price || 0).toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            </div>

                            {/* Cụm tăng giảm số lượng khi đã chọn */}
                            {isChecked && (
                              <div
                                className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(prod.id, (selected?.quantity || 1) - 1)}
                                  className="w-5 h-5 flex items-center justify-center text-amber-400 font-bold hover:bg-neutral-800 rounded cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-white px-1">
                                  {selected?.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(prod.id, (selected?.quantity || 1) + 1)}
                                  className="w-5 h-5 flex items-center justify-center text-amber-400 font-bold hover:bg-neutral-800 rounded cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
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
                    {formatPrice(totalOrderAmount)}
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
