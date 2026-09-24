'use client';

import React, { useEffect, useState } from 'react';
import {
  Save,
  Layout,
  Sparkles,
  MapPin,
  BookOpen,
  CheckCircle2,
  Image as ImageIcon,
  Share2,
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Search,
  Star,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
} from 'lucide-react';

interface BranchItem {
  id: string;
  badge: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  hours: string;
  image: string;
  mapsUrl: string;
}

export default function CMSConfigPage() {
  const [activeTab, setActiveTab] = useState<'header' | 'hero' | 'branches' | 'story' | 'footer' | 'menu'>('header');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 1: Header & Social Channels
  const [headerConfig, setHeaderConfig] = useState({
    logoText1: 'GÀ Ủ MUỐI',
    logoText2: 'SMART',
    hotline: '0988.888.999',
    facebook_url: 'https://facebook.com',
    zalo_url: 'https://zalo.me',
    tiktok_url: 'https://tiktok.com',
  });

  // Tab 2: Hero & Cam kết
  const [heroConfig, setHeroConfig] = useState({
    line1: 'Gà Ủ Muối Smart',
    line2: 'Giao Hỏa Tốc Nội Thành',
  });

  // Tab 5: Chân Trang & Liên Hệ (Footer)
  const [footerConfig, setFooterConfig] = useState({
    brandName: 'GÀ Ủ MUỐI SMART',
    address: '6 - A20 Geleximco An Khánh - Tây Mỗ, Hoài Đức / Nam Từ Liêm, Hà Nội',
    hotline: '0396637038',
    email: 'cskh@gaumuoismart.vn',
    hours: 'Thứ 2 - Chủ Nhật: 08:00 - 22:00',
  });

  const [promoConfig, setPromoConfig] = useState({
    card1Title: 'Hỗ Trợ 35K Ship Từ Bill 355K',
    card1Desc: 'Tự động áp dụng khi chốt đơn trực tiếp',
    card2Title: 'Giao Hỏa Tốc 30-40 Phút',
    card2Desc: 'Đảm bảo độ lạnh giòn và chuẩn vị khi giao tới',
  });

  // Tab 3: 6 Cơ Sở
  const [branchesConfig, setBranchesConfig] = useState<BranchItem[]>([
    {
      id: 'cs1',
      badge: 'CS1',
      name: 'Cơ Sở Vin Smart city',
      district: 'Hà Nội',
      address: '6 - A20 Geleximco An Khánh - Tây Mỗ, Hoài Đức, Hà Nội',
      phone: '0988.888.901',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=6+A20+Geleximco+An+Khanh+Tay+Mo+Ha+Noi',
    },
    {
      id: 'cs2',
      badge: 'CS2',
      name: 'Cơ Sở Trần Cung - Cầu Giấy',
      district: 'Hà Nội',
      address: '5 - 208 Trần Cung, Q. Cầu Giấy, Hà Nội',
      phone: '0988.888.902',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=208+Tran+Cung+Cau+Giay+Ha+Noi',
    },
    {
      id: 'cs3',
      badge: 'CS3',
      name: 'Cơ Sở Bán Đảo Linh Đàm',
      district: 'Hà Nội',
      address: 'Kiot 4 Nơ 7B Bán Đảo Linh Đàm, Q. Hoàng Mai, Hà Nội',
      phone: '0988.888.903',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Kiot+4+No+7B+Ban+Dao+Linh+Dam+Hoang+Mai+Ha+Noi',
    },
    {
      id: 'cs4',
      badge: 'CS4',
      name: 'Cơ Sở Hai Bà Trưng',
      district: 'Hà Nội',
      address: '51 Yên Lạc - Vĩnh Tuy, Q. Hai Bà Trưng, Hà Nội',
      phone: '0988.888.904',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=51+Yen+Lac+Vinh+Tuy+Hai+Ba+Trung+Ha+Noi',
    },
    {
      id: 'cs5',
      badge: 'CS5',
      name: 'Cơ Sở Vin Ocean Park 1',
      district: 'Hà Nội',
      address: 'SP10.11 Hải Âu 9 - Vin Ocean Park 1, Gia Lâm, Hà Nội',
      phone: '0988.888.905',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Hai+Au+9+Vin+Ocean+Park+1+Gia+Lam+Ha+Noi',
    },
    {
      id: 'cs6',
      badge: 'CS6',
      name: 'Cơ Sở Vũng Tàu - HCM',
      district: 'Bà Rịa - Vũng Tàu',
      address: 'Phú Mỹ - Vũng Tàu',
      phone: '0988.888.906',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Phu+My+Ba+Ria+Vung+Tau',
    },
  ]);

  // Tab 4: Câu Chuyện Vị Giác
  const [storyConfig, setStoryConfig] = useState({
    tag: 'Artisan Heritage',
    title: 'Câu Chuyện Vị Giác Gà Ủ Muối Smart',
    desc: 'Mỗi con gà tại Gà Ủ Muối Smart được tuyển chọn khắt khe từ nguồn gà ta thả vườn đồi. Qua quy trình thẩm thấu muối hồng và thảo mộc tự nhiên theo công thức bí truyền 24 giờ, lớp da gà chuyển màu vàng óng giòn sần sật, giữ trọn vị ngọt đậm đà mọng nước từng thớ thịt.',
    stat1Val: '100%',
    stat1Label: 'Gà Ta Thả Vườn Đồi',
    stat2Val: '24h',
    stat2Label: 'Ủ Thảo Mộc Tự Nhiên',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
    badgeTitle: 'Độc Quyền Sốt Ớt Xanh',
    badgeSub: 'Chua cay mặn ngọt chuẩn vị',
  });

  // Tab 5: Menu Management States
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('ALL');

  // Product Modal State
  const [modalProductOpen, setModalProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState<number | ''>('');
  const [prodCostPrice, setProdCostPrice] = useState<number | ''>('');
  const [prodImage, setProdImage] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodIsAvailable, setProdIsAvailable] = useState(true);
  const [prodIsBestSeller, setProdIsBestSeller] = useState(false);

  // Category Modal State
  const [modalCategoryOpen, setModalCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Fetch CMS Settings safely
  useEffect(() => {
    fetch('/api/settings?group=CMS')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.settings) {
          const s = data.settings;
          if (s.CMS_HEADER_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_HEADER_JSON);
              if (parsed && typeof parsed === 'object') {
                setHeaderConfig((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {}
          }
          if (s.CMS_HERO_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_HERO_JSON);
              if (parsed && typeof parsed === 'object') {
                setHeroConfig((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {}
          }
          if (s.CMS_PROMO_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_PROMO_JSON);
              if (parsed && typeof parsed === 'object') {
                setPromoConfig((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {}
          }
          if (s.CMS_BRANCHES_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_BRANCHES_JSON);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBranchesConfig(parsed);
              }
            } catch (e) {}
          }
          if (s.CMS_STORY_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_STORY_JSON);
              if (parsed && typeof parsed === 'object') {
                setStoryConfig((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {}
          }
          if (s.CMS_FOOTER_JSON) {
            try {
              const parsed = JSON.parse(s.CMS_FOOTER_JSON);
              if (parsed && typeof parsed === 'object') {
                setFooterConfig((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {}
          }
          if (s.CMS_FOOTER_ADDRESS || s.STORE_ADDRESS) {
            setFooterConfig((prev) => ({ ...prev, address: s.CMS_FOOTER_ADDRESS || s.STORE_ADDRESS }));
          }
          if (s.CMS_FOOTER_HOTLINE || s.STORE_HOTLINE) {
            setFooterConfig((prev) => ({ ...prev, hotline: s.CMS_FOOTER_HOTLINE || s.STORE_HOTLINE }));
          }
          if (s.CMS_FOOTER_BRAND || s.STORE_NAME) {
            setFooterConfig((prev) => ({ ...prev, brandName: s.CMS_FOOTER_BRAND || s.STORE_NAME }));
          }
          if (s.CMS_FOOTER_EMAIL || s.STORE_EMAIL) {
            setFooterConfig((prev) => ({ ...prev, email: s.CMS_FOOTER_EMAIL || s.STORE_EMAIL }));
          }
          if (s.CMS_FOOTER_HOURS) {
            setFooterConfig((prev) => ({ ...prev, hours: s.CMS_FOOTER_HOURS }));
          }

          if (s.CMS_FACEBOOK_URL || s.facebook_url) {
            setHeaderConfig((prev) => ({ ...prev, facebook_url: s.CMS_FACEBOOK_URL || s.facebook_url }));
          }
          if (s.CMS_ZALO_URL || s.zalo_url) {
            setHeaderConfig((prev) => ({ ...prev, zalo_url: s.CMS_ZALO_URL || s.zalo_url }));
          }
          if (s.CMS_TIKTOK_URL || s.tiktok_url) {
            setHeaderConfig((prev) => ({ ...prev, tiktok_url: s.CMS_TIKTOK_URL || s.tiktok_url }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load CMS settings:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch Categories & Products when Menu tab selected
  const fetchMenuData = async () => {
    setLoadingMenu(true);
    try {
      const [resCat, resProd] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/products').then((r) => r.json()).catch(() => ({ success: false })),
      ]);
      if (resCat && resCat.success && Array.isArray(resCat.categories)) {
        setCategories(resCat.categories);
      } else {
        setCategories([]);
      }
      if (resProd && resProd.success && Array.isArray(resProd.products)) {
        setProducts(resProd.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching menu data:', err);
      setCategories([]);
      setProducts([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'menu') {
      fetchMenuData();
    }
  }, [activeTab]);

  const handleBranchChange = (index: number, field: keyof BranchItem, value: string) => {
    setBranchesConfig((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const next = [...current];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        CMS_HEADER_JSON: JSON.stringify(headerConfig),
        CMS_HERO_JSON: JSON.stringify(heroConfig),
        CMS_PROMO_JSON: JSON.stringify(promoConfig),
        CMS_BRANCHES_JSON: JSON.stringify(branchesConfig),
        CMS_STORY_JSON: JSON.stringify(storyConfig),
        CMS_FOOTER_JSON: JSON.stringify(footerConfig),
        CMS_FOOTER_BRAND: footerConfig.brandName,
        CMS_FOOTER_ADDRESS: footerConfig.address,
        CMS_FOOTER_HOTLINE: footerConfig.hotline,
        CMS_FOOTER_EMAIL: footerConfig.email,
        CMS_FOOTER_HOURS: footerConfig.hours,
        STORE_NAME: footerConfig.brandName,
        STORE_ADDRESS: footerConfig.address,
        STORE_HOTLINE: footerConfig.hotline || headerConfig.hotline,
        STORE_EMAIL: footerConfig.email,
        CMS_FACEBOOK_URL: headerConfig.facebook_url || 'https://facebook.com',
        CMS_ZALO_URL: headerConfig.zalo_url || 'https://zalo.me',
        CMS_TIKTOK_URL: headerConfig.tiktok_url || 'https://tiktok.com',
        facebook_url: headerConfig.facebook_url || 'https://facebook.com',
        zalo_url: headerConfig.zalo_url || 'https://zalo.me',
        tiktok_url: headerConfig.tiktok_url || 'https://tiktok.com',
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert(data.error || 'Lỗi khi lưu cấu hình');
      }
    } catch (err) {
      alert('Lỗi máy chủ khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  // --- Category Handlers ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setModalCategoryOpen(true);
  };

  const handleOpenEditCategory = (c: any) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatDesc(c.description || '');
    setModalCategoryOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      alert('Vui lòng điền tên danh mục');
      return;
    }

    const payload = {
      id: editingCategory?.id,
      name: catName,
      description: catDesc,
    };

    const method = editingCategory ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setModalCategoryOpen(false);
        fetchMenuData();
      } else {
        alert(data.error || 'Lỗi khi lưu danh mục');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này? Tất cả món thuộc danh mục cần được gán lại.')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchMenuData();
      } else {
        alert(data.error || 'Lỗi khi xóa danh mục');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  // --- Product Handlers ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdCostPrice(0);
    setProdImage('https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80');
    setProdCategoryId(categories[0]?.id || '');
    setProdIsAvailable(true);
    setProdIsBestSeller(false);
    setModalProductOpen(true);
  };

  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description || '');
    setProdPrice(p.price);
    setProdCostPrice(p.costPrice || 0);
    setProdImage(p.image || '');
    setProdCategoryId(p.categoryId);
    setProdIsAvailable(p.isAvailable);
    setProdIsBestSeller(p.isBestSeller || false);
    setModalProductOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategoryId) {
      alert('Vui lòng điền đủ Tên món, Giá bán và Danh mục');
      return;
    }

    const payload = {
      id: editingProduct?.id,
      name: prodName,
      description: prodDesc,
      price: Number(prodPrice),
      costPrice: Number(prodCostPrice) || 0,
      image: prodImage,
      categoryId: prodCategoryId,
      isAvailable: prodIsAvailable,
      isBestSeller: prodIsBestSeller,
    };

    const method = editingProduct ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setModalProductOpen(false);
        fetchMenuData();
      } else {
        alert(data.error || 'Lỗi khi lưu món');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa món này khỏi menu?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchMenuData();
      } else {
        alert(data.error || 'Lỗi khi xóa món');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  const handleToggleProductAvailable = async (product: any) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, isAvailable: !product.isAvailable }),
      });
      const data = await res.json();
      if (data.success) fetchMenuData();
    } catch (e) {}
  };

  const handleToggleProductBestSeller = async (product: any) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, isBestSeller: !product.isBestSeller }),
      });
      const data = await res.json();
      if (data.success) fetchMenuData();
    } catch (e) {}
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(menuSearch.toLowerCase()));
    const matchesCategory = menuCategoryFilter === 'ALL' || p.categoryId === menuCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-neutral-400 text-sm font-medium">
        Đang tải dữ liệu CMS Trang Chủ...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FAFAF9] tracking-tight">
            Quản Lý Cấu Hình Trang Chủ (CMS)
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Chỉnh sửa 100% nội dung Header, Hero, 2 Thẻ Cam Kết, 6 Cơ Sở, Câu Chuyện Vị Giác và Toàn Bộ Thực Đơn Món Ăn.
          </p>
        </div>

        {/* Global Save Button top shortcut */}
        {activeTab !== 'menu' && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="self-start sm:self-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2]" />
            <span>{saving ? 'Đang Lưu...' : 'Lưu Thay Đổi CMS'}</span>
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2]" />
          <span>Đã lưu thành công tất cả cấu hình CMS! Trang khách hàng sẽ tự động cập nhật thông tin mới nhất.</span>
        </div>
      )}

      {/* 5 Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('header')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'header'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Layout className="w-4 h-4 stroke-[1.75]" />
          <span>1. Header & Liên Hệ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'hero'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[1.75]" />
          <span>2. Hero & Cam Kết</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <MapPin className="w-4 h-4 stroke-[1.75]" />
          <span>3. Quản Lý 6 Cơ Sở ({(branchesConfig || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('story')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'story'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <BookOpen className="w-4 h-4 stroke-[1.75]" />
          <span>4. Câu Chuyện Vị Giác</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('footer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'footer'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <MapPin className="w-4 h-4 stroke-[1.75]" />
          <span>5. Chân Trang & Liên Hệ (Footer)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300 shadow-md'
              : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 stroke-[1.75]" />
          <span>🍽️ 6. Quản Lý Thực Đơn (Menu)</span>
        </button>
      </div>

      {/* Main Form Tabs */}
      {activeTab !== 'menu' && (
        <form onSubmit={handleSaveAll} className="space-y-8">
          {/* TAB 1: HEADER & LIÊN HỆ */}
          {activeTab === 'header' && (
            <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
              <div className="border-b border-neutral-800/80 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layout className="w-4 h-4 text-amber-400 stroke-[2]" />
                  Cấu Hình Thanh Header & Hotline Chăm Sóc Sức Khỏe / Đặt Hàng
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Cấu hình tên thương hiệu và số điện thoại hotline 24/7 hiển thị trên Header</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <label className="block font-bold text-neutral-300 mb-2">Tên Thương Hiệu - Dòng 1 (*):</label>
                  <input
                    type="text"
                    required
                    value={headerConfig.logoText1}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, logoText1: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-sm text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Ví dụ: GÀ Ủ MUỐI</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-2">Tên Thương Hiệu - Dòng 2 (Nổi bật vàng) (*):</label>
                  <input
                    type="text"
                    required
                    value={headerConfig.logoText2}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, logoText2: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-sm text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Ví dụ: SMART</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-2">Số Hotline 24/7 (*):</label>
                  <input
                    type="text"
                    required
                    value={headerConfig.hotline}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, hotline: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono font-bold text-sm text-emerald-400 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Hotline đặt hàng hỏa tốc</span>
                </div>
              </div>

              {/* Social Channels Config Section */}
              <div className="border-t border-neutral-800/80 pt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-400 stroke-[2]" />
                    Kênh Truyền Thông Chính Thức (Social Channels Footer)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Cấu hình đường dẫn Fanpage Facebook, Zalo Official OA và TikTok Channel liên kết trực tiếp ở khu vực Footer ngoài trang chủ.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-300 mb-2">1. Link Fanpage Facebook (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="https://facebook.com/gaumuoismart"
                      value={headerConfig.facebook_url}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, facebook_url: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">Key: `facebook_url`</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-300 mb-2">2. Link Zalo Official (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="https://zalo.me/0988888999"
                      value={headerConfig.zalo_url}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, zalo_url: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">Key: `zalo_url`</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-300 mb-2">3. Link TikTok Channel (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="https://tiktok.com/@gaumuoismart"
                      value={headerConfig.tiktok_url}
                      onChange={(e) => setHeaderConfig({ ...headerConfig, tiktok_url: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">Key: `tiktok_url`</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HERO & CAM KẾT */}
          {activeTab === 'hero' && (
            <div className="space-y-6">
              {/* Hero Main Headline */}
              <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
                <div className="border-b border-neutral-800/80 pb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                    Tiêu Đề Banner Chính (Hero Section)
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Tiêu đề chuẩn Sans-Serif sắc nét (Montserrat 800/700) được căn giữa nổi bật ở đầu trang
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-300 mb-2">Dòng 1: Tên Thương Hiệu / Thông Điệp Chính (*):</label>
                    <input
                      type="text"
                      required
                      value={heroConfig.line1}
                      onChange={(e) => setHeroConfig({ ...heroConfig, line1: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-base text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">Mặc định: Gà Ủ Muối Smart</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-300 mb-2">Dòng 2: Thông Điệp Phụ Vàng Hổ Phách (*):</label>
                    <input
                      type="text"
                      required
                      value={heroConfig.line2}
                      onChange={(e) => setHeroConfig({ ...heroConfig, line2: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-base text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">Mặc định: Giao Hỏa Tốc Nội Thành</span>
                  </div>
                </div>
              </div>

              {/* 2 Feature Cards */}
              <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
                <div className="border-b border-neutral-800/80 pb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                    Nội Dung 2 Thẻ Cam Kết Dưới Tiêu Đề
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">Cấu hình 2 ô cam kết vận chuyển và khuyến mãi</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Card 1 */}
                  <div className="bg-[#0B0D11] p-5 rounded-2xl border border-neutral-800 space-y-4">
                    <h3 className="font-extrabold text-amber-400 text-xs uppercase tracking-wider">Thẻ 1: Khuyến Mãi / Ship</h3>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Tiêu Đề Thẻ 1:</label>
                      <input
                        type="text"
                        required
                        value={promoConfig.card1Title}
                        onChange={(e) => setPromoConfig({ ...promoConfig, card1Title: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#14171D] border border-neutral-800 rounded-xl font-bold text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Mô Tả Thẻ 1:</label>
                      <input
                        type="text"
                        required
                        value={promoConfig.card1Desc}
                        onChange={(e) => setPromoConfig({ ...promoConfig, card1Desc: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-[#0B0D11] p-5 rounded-2xl border border-neutral-800 space-y-4">
                    <h3 className="font-extrabold text-amber-400 text-xs uppercase tracking-wider">Thẻ 2: Thời Gian Giao Hàng</h3>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Tiêu Đề Thẻ 2:</label>
                      <input
                        type="text"
                        required
                        value={promoConfig.card2Title}
                        onChange={(e) => setPromoConfig({ ...promoConfig, card2Title: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#14171D] border border-neutral-800 rounded-xl font-bold text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Mô Tả Thẻ 2:</label>
                      <input
                        type="text"
                        required
                        value={promoConfig.card2Desc}
                        onChange={(e) => setPromoConfig({ ...promoConfig, card2Desc: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN LÝ 6 CƠ SỞ */}
          {activeTab === 'branches' && (
            <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
              <div className="border-b border-neutral-800/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400 stroke-[2]" />
                    Danh Sách 6 Cơ Sở Phục Vụ Hỏa Tốc
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Chỉnh sửa tên cơ sở, quận, địa chỉ, hotline riêng, giờ hoạt động, URL hình ảnh mặt tiền và link Google Maps.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                {(Array.isArray(branchesConfig) ? branchesConfig : []).map((branch, idx) => (
                  <div key={branch.id || idx} className="bg-[#0B0D11] border border-neutral-800 rounded-2xl p-5 space-y-4 relative">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-3 py-1 rounded-full text-[11px]">
                        {branch.badge || `CƠ SỞ 0${idx + 1}`}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">ID: {branch.id}</span>
                    </div>

                    {/* Image Preview */}
                    <div className="relative h-32 rounded-xl overflow-hidden border border-neutral-800 group">
                      <img
                        src={branch.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'}
                        alt={branch.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[11px] font-medium flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Xem trước ảnh
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">Badge Hiển Thị:</label>
                        <input
                          type="text"
                          value={branch.badge}
                          onChange={(e) => handleBranchChange(idx, 'badge', e.target.value)}
                          className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">Tên Quận / Khu Vực:</label>
                        <input
                          type="text"
                          value={branch.district}
                          onChange={(e) => handleBranchChange(idx, 'district', e.target.value)}
                          className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-amber-400 font-medium focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Tên Cơ Sở (*):</label>
                      <input
                        type="text"
                        required
                        value={branch.name}
                        onChange={(e) => handleBranchChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl font-bold text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Địa Chỉ Chi Tiết (*):</label>
                      <input
                        type="text"
                        required
                        value={branch.address}
                        onChange={(e) => handleBranchChange(idx, 'address', e.target.value)}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">Hotline Riêng (*):</label>
                        <input
                          type="text"
                          required
                          value={branch.phone}
                          onChange={(e) => handleBranchChange(idx, 'phone', e.target.value)}
                          className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl font-mono text-emerald-400 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">Giờ Hoạt Động:</label>
                        <input
                          type="text"
                          value={branch.hours}
                          onChange={(e) => handleBranchChange(idx, 'hours', e.target.value)}
                          className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">URL Ảnh Mặt Tiền Unsplash (*):</label>
                      <input
                        type="text"
                        required
                        value={branch.image}
                        onChange={(e) => handleBranchChange(idx, 'image', e.target.value)}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-400 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Link Google Maps (*):</label>
                      <input
                        type="text"
                        required
                        value={branch.mapsUrl}
                        onChange={(e) => handleBranchChange(idx, 'mapsUrl', e.target.value)}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-400 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CÂU CHUYỆN VỊ GIÁC */}
          {activeTab === 'story' && (
            <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
              <div className="border-b border-neutral-800/80 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400 stroke-[2]" />
                  Cấu Hình Khối "Câu Chuyện Vị Giác"
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Tùy biến nội dung giới thiệu di sản ẩm thực và các thông số cam kết</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-neutral-300 mb-1">Thẻ Phụ (Tagline Upper):</label>
                    <input
                      type="text"
                      value={storyConfig.tag}
                      onChange={(e) => setStoryConfig({ ...storyConfig, tag: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-amber-400 font-bold focus:border-amber-500 focus:outline-none uppercase tracking-wider"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-300 mb-1">Tiêu Đề Khối (*):</label>
                    <input
                      type="text"
                      required
                      value={storyConfig.title}
                      onChange={(e) => setStoryConfig({ ...storyConfig, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-white font-extrabold text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-300 mb-1">Đoạn Văn Giới Thiệu (*):</label>
                    <textarea
                      rows={4}
                      required
                      value={storyConfig.desc}
                      onChange={(e) => setStoryConfig({ ...storyConfig, desc: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 leading-relaxed focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0B0D11] p-4 rounded-xl border border-neutral-800 space-y-2">
                      <label className="block font-semibold text-neutral-400">Thông Số 1 (Giá trị):</label>
                      <input
                        type="text"
                        value={storyConfig.stat1Val}
                        onChange={(e) => setStoryConfig({ ...storyConfig, stat1Val: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-amber-400 font-extrabold focus:border-amber-500 focus:outline-none"
                      />
                      <label className="block font-semibold text-neutral-400">Nhãn Thông Số 1:</label>
                      <input
                        type="text"
                        value={storyConfig.stat1Label}
                        onChange={(e) => setStoryConfig({ ...storyConfig, stat1Label: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-white font-medium focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-[#0B0D11] p-4 rounded-xl border border-neutral-800 space-y-2">
                      <label className="block font-semibold text-neutral-400">Thông Số 2 (Giá trị):</label>
                      <input
                        type="text"
                        value={storyConfig.stat2Val}
                        onChange={(e) => setStoryConfig({ ...storyConfig, stat2Val: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-amber-400 font-extrabold focus:border-amber-500 focus:outline-none"
                      />
                      <label className="block font-semibold text-neutral-400">Nhãn Thông Số 2:</label>
                      <input
                        type="text"
                        value={storyConfig.stat2Label}
                        onChange={(e) => setStoryConfig({ ...storyConfig, stat2Label: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-white font-medium focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Story Right: Image & Badge */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-neutral-300 mb-1">URL Ảnh Banner Câu Chuyện (*):</label>
                    <input
                      type="text"
                      required
                      value={storyConfig.image}
                      onChange={(e) => setStoryConfig({ ...storyConfig, image: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-400 font-mono text-[11px] focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-[#0B0D11] p-4 rounded-xl border border-neutral-800 space-y-3">
                    <h4 className="font-bold text-amber-400 text-xs">Cấu Hình Badge Nổi Trên Ảnh</h4>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Tiêu Đề Badge:</label>
                      <input
                        type="text"
                        value={storyConfig.badgeTitle}
                        onChange={(e) => setStoryConfig({ ...storyConfig, badgeTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-white font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Mô Tả Phụ Badge:</label>
                      <input
                        type="text"
                        value={storyConfig.badgeSub}
                        onChange={(e) => setStoryConfig({ ...storyConfig, badgeSub: e.target.value })}
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-lg text-neutral-300 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Preview Box */}
                  <div className="relative h-44 rounded-2xl overflow-hidden border border-neutral-800">
                    <img src={storyConfig.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 bg-neutral-950/90 border border-amber-500/40 p-2.5 rounded-xl">
                      <span className="font-extrabold text-[11px] text-amber-300 uppercase block">{storyConfig.badgeTitle}</span>
                      <span className="text-[10px] text-neutral-400">{storyConfig.badgeSub}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FOOTER & LIÊN HỆ */}
          {activeTab === 'footer' && (
            <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-6">
              <div className="border-b border-neutral-800/80 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 stroke-[2]" />
                  Thông Tin Chân Trang & Liên Hệ (Footer Config)
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Cấu hình địa chỉ trụ sở chính, hotline tổng đài khiếu nại, email hỗ trợ và giờ mở cửa hiển thị ở khu vực Footer chân trang Storefront
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="block font-bold text-neutral-300 mb-2">1. Tên Thương Hiệu Footer (*):</label>
                  <input
                    type="text"
                    required
                    value={footerConfig.brandName}
                    onChange={(e) => setFooterConfig({ ...footerConfig, brandName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-sm text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    placeholder="GÀ Ủ MUỐI SMART"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Mặc định: GÀ Ủ MUỐI SMART</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-2">2. Hotline Tổng Đài / Khiếu Nại (*):</label>
                  <input
                    type="text"
                    required
                    value={footerConfig.hotline}
                    onChange={(e) => setFooterConfig({ ...footerConfig, hotline: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono font-bold text-sm text-emerald-400 focus:border-amber-500 focus:outline-none"
                    placeholder="0396637038"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Mặc định: 0396637038</span>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-neutral-300 mb-2">3. Địa Chỉ Trụ Sở / Tổng Đại Bản Doanh (*):</label>
                  <textarea
                    rows={3}
                    required
                    value={footerConfig.address}
                    onChange={(e) => setFooterConfig({ ...footerConfig, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-200 leading-relaxed focus:border-amber-500 focus:outline-none"
                    placeholder="6 - A20 Geleximco An Khánh - Tây Mỗ, Hoài Đức / Nam Từ Liêm, Hà Nội"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Địa chỉ chính của hệ thống hiển thị dưới chân trang</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-2">4. Email Hỗ Trợ (Tùy chọn):</label>
                  <input
                    type="email"
                    value={footerConfig.email}
                    onChange={(e) => setFooterConfig({ ...footerConfig, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 font-mono text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="cskh@gaumuoismart.vn"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Email nhận góp ý và chăm sóc khách hàng</span>
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-2">5. Giờ Phục Vụ Toàn Hệ Thống (*):</label>
                  <input
                    type="text"
                    required
                    value={footerConfig.hours}
                    onChange={(e) => setFooterConfig({ ...footerConfig, hours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-200 font-medium text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Thứ 2 - Chủ Nhật: 08:00 - 22:00"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">Ví dụ: Thứ 2 - Chủ Nhật: 08:00 - 22:00</span>
                </div>
              </div>
            </div>
          )}

          {/* Global Floating Bottom Bar Action */}
          <div className="sticky bottom-4 z-30 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
            <div className="text-xs text-neutral-400 hidden sm:block">
              Nhấn <strong className="text-white font-semibold">"Lưu Thay Đổi CMS"</strong> để áp dụng ngay lập tức ngoài Trang chủ Storefront.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2]" />
              <span>{saving ? 'Đang Cập Nhật Hệ Thống...' : 'Lưu Cấu Hình CMS Trang Chủ'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: QUẢN LÝ THỰC ĐƠN (MENU) */}
      {activeTab === 'menu' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Header Action Bar */}
          <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-400 stroke-[2]" />
                Quản Lý Thực Đơn & Danh Mục Món (Realtime DB Sync)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Tất cả thay đổi giá, ảnh, bật/tắt món hoặc danh mục tại đây sẽ lập tức đồng bộ 100% ngoài Trang chủ, POS & AI Chatbot.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-400 stroke-[2]" />
                <span>Thêm Danh Mục</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>+ Thêm Món Mới Vào Menu</span>
              </button>
            </div>
          </div>

          {/* Section 1: Categories Bar / Cards */}
          <div className="bg-[#14171D] rounded-2xl border border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                1. Danh Mục Phân Loại Món ({categories.length})
              </h3>
              <span className="text-xs text-neutral-500">Bấm nút Sửa/Xóa để quản lý từng danh mục</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#0B0D11] border border-neutral-800 px-4 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold text-neutral-200 group hover:border-amber-500/40 transition-all"
                >
                  <span className="text-white font-bold">{cat.name}</span>
                  <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                    {cat._count?.products ?? 0} món
                  </span>

                  <div className="flex items-center gap-1 border-l border-neutral-800 pl-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1 hover:text-amber-400 text-neutral-400 transition"
                      title="Sửa danh mục"
                    >
                      <Edit2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 hover:text-rose-400 text-neutral-400 transition"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="text-xs text-neutral-500 italic py-2">Chưa có danh mục nào. Hãy bấm "Thêm Danh Mục".</div>
              )}
            </div>
          </div>

          {/* Section 2: Products List Table */}
          <div className="bg-[#14171D] rounded-2xl border border-neutral-800 space-y-4 overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-4 bg-[#0B0D11] border-b border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3 stroke-[1.5]" />
                <input
                  type="text"
                  placeholder="Tìm món theo tên hoặc mô tả..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-neutral-200 focus:border-amber-500 focus:outline-none placeholder:text-neutral-600"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setMenuCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                    menuCategoryFilter === 'ALL'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'bg-[#14171D] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Tất Cả ({products.length})
                </button>

                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setMenuCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                      menuCategoryFilter === c.id
                        ? 'bg-amber-500 text-neutral-950 shadow-sm'
                        : 'bg-[#14171D] text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            {loadingMenu ? (
              <div className="p-12 text-center text-neutral-400 text-sm font-medium">Đang tải danh sách thực đơn...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0B0D11] border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Món Ăn</th>
                      <th className="py-3.5 px-4">Danh Mục</th>
                      <th className="py-3.5 px-4">Giá Bán</th>
                      <th className="py-3.5 px-4">Giá Vốn</th>
                      <th className="py-3.5 px-4">Trạng Thái Phục Vụ</th>
                      <th className="py-3.5 px-4">Bán Chạy</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 font-medium text-neutral-200">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image || 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80'}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-neutral-800 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-[#FAFAF9] block text-sm">{p.name}</span>
                              <span className="text-[11px] text-neutral-400 font-light max-w-xs block truncate mt-0.5">
                                {p.description || 'Không có mô tả'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {p.category?.name || 'Khác'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-amber-400 text-sm">
                          {p.price.toLocaleString('vi-VN')} đ
                        </td>

                        <td className="py-3.5 px-4 text-neutral-400 font-light">
                          {p.costPrice ? `${p.costPrice.toLocaleString('vi-VN')} đ` : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleProductAvailable(p)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              p.isAvailable
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${p.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                            <span>{p.isAvailable ? 'Đang Phục Vụ' : 'Tạm Hết Hàng'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleProductBestSeller(p)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              p.isBestSeller
                                ? 'bg-amber-950/90 text-amber-300 border border-amber-500/40 shadow-xs'
                                : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:text-neutral-300'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${p.isBestSeller ? 'fill-amber-400 text-amber-400' : 'text-neutral-500'}`} />
                            <span>{p.isBestSeller ? 'Best Seller' : 'Thường'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-neutral-300 hover:text-amber-400 border border-neutral-800 transition"
                              title="Chỉnh sửa món"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[1.75]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 bg-rose-950/80 hover:bg-rose-900 rounded-xl text-rose-400 border border-rose-500/30 transition"
                              title="Xóa món"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-500 text-xs italic">
                          Không tìm thấy món ăn nào khớp với bộ lọc. Hãy bấm "+ Thêm Món Mới Vào Menu".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {modalProductOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121419] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-base font-bold text-[#FAFAF9] flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-400 stroke-[2]" />
                {editingProduct ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Mới Vào Menu'}
              </h3>
              <button
                type="button"
                onClick={() => setModalProductOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Tên Món Ăn (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Gà Ủ Muối Hoa Tiêu Nguyên Con"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-sm font-bold text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Danh Mục Phân Loại (*):</label>
                <select
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-bold text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Giá Bán VNĐ (*):</label>
                  <input
                    type="number"
                    required
                    placeholder="Ví dụ: 195000"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Giá Vốn VNĐ (POS):</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 110000"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">URL Đường Dẫn Ảnh Món (*):</label>
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl font-mono text-[11px] text-neutral-300 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Image Preview */}
              {prodImage && (
                <div className="flex items-center gap-3 p-3 bg-[#0B0D11] rounded-xl border border-neutral-800">
                  <img src={prodImage} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-neutral-700 shrink-0" />
                  <span className="text-[11px] text-neutral-400">Xem trước hình ảnh hiển thị trên thực đơn trang chủ</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">Mô Tả Short Hương Vị & Định Lượng:</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Da giòn sần sật, vị hoa tiêu thơm nồng. Kèm sốt ớt xanh độc quyền..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full p-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 leading-relaxed focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                <label className="flex items-center gap-3 p-3 bg-[#0B0D11] rounded-xl border border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsAvailable}
                    onChange={(e) => setProdIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-white">Đang Phục Vụ (Còn Hàng)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[#0B0D11] rounded-xl border border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsBestSeller}
                    onChange={(e) => setProdIsBestSeller(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-amber-300">Nổi Bật (Best Seller)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalProductOpen(false)}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  {editingProduct ? 'Cập Nhật Món Ăn' : 'Thêm Vào Thực Đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT CATEGORY */}
      {modalCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121419] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-[#FAFAF9]">
                {editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCategoryOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Tên Danh Mục (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Combo Tiết Kiệm, Nước Giải Khát..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Mô Tả Danh Mục:</label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn gọn về nhóm món..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalCategoryOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  {editingCategory ? 'Cập Nhật' : 'Tạo Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
