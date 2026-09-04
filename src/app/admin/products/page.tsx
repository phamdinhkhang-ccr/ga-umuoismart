'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  UtensilsCrossed, Plus, Search, CheckCircle2, XCircle, 
  Edit3, Trash2, Sparkles, Filter, Building2, Flame, 
  Bot, Check, X, ShieldAlert, Tag, Package, Coffee, Salad, Drumstick,
  Calendar, AlertTriangle, AlertOctagon, Hourglass, Layers, Upload
} from 'lucide-react';
import { 
  getProducts, saveProduct, toggleProductAvailability, 
  deleteProduct, ProductRecord, getBranches, getExpiryDetails 
} from '@/lib/store';
import { Branch } from '@/types/database';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<string>('ALL');
  const [expiryTab, setExpiryTab] = useState<'ALL' | 'WARNING' | 'EXPIRED' | 'SAFE'>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Modal States
  const [activeModal, setActiveModal] = useState<'CREATE_EDIT' | 'DELETE' | 'STOCK_SCOPE' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);

  // Form State for Create / Edit Product
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    category: 'Món Gà Ủ Muối' | 'Món Ăn Kèm' | 'Nước Uống' | 'Gia Vị & Extra';
    unit: string;
    price: number | '';
    cost_price: number | '';
    ai_keywords: string;
    is_best_seller: boolean;
    image_url?: string;
    batch_code: string;
    production_date: string;
    shelf_life_days: number | '';
    expiry_date: string;
  }>({
    name: '',
    category: 'Món Gà Ủ Muối',
    unit: 'Con',
    price: 190000,
    cost_price: 110000,
    ai_keywords: '1 con, nguyên con, gà ủ cả con',
    is_best_seller: true,
    image_url: '',
    batch_code: 'LÔ-GUM-0409',
    production_date: '2026-09-04',
    shelf_life_days: 14,
    expiry_date: '2026-09-18'
  });

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadData = async () => {
    const local = getProducts();
    setBranches(getBranches());

    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          return;
        }
      }
    } catch (e) {}

    setProducts(local);
  };

  useEffect(() => {
    reloadData();
    const handleStoreUpdate = () => reloadData();
    window.addEventListener('gum_store_update', handleStoreUpdate);
    return () => window.removeEventListener('gum_store_update', handleStoreUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Expiry Statistics Calculation
  const expiryStats = useMemo(() => {
    let warningCount = 0;
    let expiredCount = 0;
    let safeCount = 0;

    products.forEach(p => {
      const exp = getExpiryDetails(p.expiry_date);
      if (exp.status === 'EXPIRED') expiredCount++;
      else if (exp.status === 'WARNING') warningCount++;
      else safeCount++;
    });

    return { warningCount, expiredCount, safeCount, total: products.length };
  }, [products]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: products.length,
      'Món Gà Ủ Muối': products.filter(p => p.category === 'Món Gà Ủ Muối').length,
      'Món Ăn Kèm': products.filter(p => p.category === 'Món Ăn Kèm').length,
      'Nước Uống': products.filter(p => p.category === 'Nước Uống').length,
      'Gia Vị & Extra': products.filter(p => p.category === 'Gia Vị & Extra').length,
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category Tab filter
      if (categoryTab !== 'ALL' && p.category !== categoryTab) {
        return false;
      }
      // Expiry Tab filter
      if (expiryTab !== 'ALL') {
        const exp = getExpiryDetails(p.expiry_date);
        if (exp.status !== expiryTab) return false;
      }
      // Search query filter (Name, Category, Batch, or AI Keywords)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const catMatch = p.category.toLowerCase().includes(q);
        const batchMatch = p.batch_code && p.batch_code.toLowerCase().includes(q);
        const tagMatch = p.ai_keywords && p.ai_keywords.some(k => k.toLowerCase().includes(q));
        if (!nameMatch && !catMatch && !batchMatch && !tagMatch) return false;
      }
      return true;
    });
  }, [products, categoryTab, expiryTab, searchQuery]);

  // Handle Toggle Availability Switch
  const handleToggleSwitch = (product: ProductRecord) => {
    if (selectedBranchId && selectedBranchId !== 'ALL') {
      setSelectedProduct(product);
      setActiveModal('STOCK_SCOPE');
    } else {
      const updated = toggleProductAvailability(product.id);
      setProducts(updated);
      const isAvail = updated.find(p => p.id === product.id)?.is_available;
      showToast(`Đã đổi trạng thái "${product.name}" thành ${isAvail ? '🟢 Còn hàng' : '🔴 Hết hàng toàn hệ thống'}`);
    }
  };

  // Execute Toggle Availability for Specific Scope
  const handleConfirmStockScope = (scope: 'GLOBAL' | 'BRANCH') => {
    if (!selectedProduct) return;
    const targetBranch = branches.find(b => b.id === selectedBranchId);

    const updated = toggleProductAvailability(
      selectedProduct.id,
      scope === 'BRANCH' ? selectedBranchId : undefined
    );
    setProducts(updated);
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (e) {}
    setActiveModal(null);

    showToast(
      scope === 'BRANCH'
        ? `Đã đổi trạng thái "${selectedProduct.name}" tại chi nhánh ${targetBranch?.name}`
        : `Đã đổi trạng thái "${selectedProduct.name}" trên toàn hệ thống`
    );
  };

  // Open Create / Edit Modal
  const openCreateEditModal = (product?: ProductRecord) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit || 'Phần',
        price: product.price,
        cost_price: product.cost_price,
        ai_keywords: product.ai_keywords ? product.ai_keywords.join(', ') : '',
        is_best_seller: !!product.is_best_seller,
        image_url: product.image_url || '',
        batch_code: product.batch_code || 'LÔ-GUM-0409',
        production_date: product.production_date || '2026-09-04',
        shelf_life_days: product.shelf_life_days || 7,
        expiry_date: product.expiry_date || '2026-09-11'
      });
    } else {
      setSelectedProduct(null);
      const todayStr = '2026-09-04';
      const defaultExpStr = '2026-09-18';
      setFormData({
        name: '',
        category: 'Món Gà Ủ Muối',
        unit: 'Con',
        price: 190000,
        cost_price: 110000,
        ai_keywords: 'gà nguyên con, 1 con, gà ủ muối',
        is_best_seller: false,
        image_url: '',
        batch_code: `LÔ-GUM-${Date.now().toString().slice(-4)}`,
        production_date: todayStr,
        shelf_life_days: 14,
        expiry_date: defaultExpStr
      });
    }
    setActiveModal('CREATE_EDIT');
  };

  // Auto-calculate Expiry Date when Production Date or Shelf Life Days Change
  const handleProductionOrShelfLifeChange = (prodDate: string, days: number | '') => {
    const daysNum = Number(days) || 0;
    if (prodDate && daysNum > 0) {
      const pDate = new Date(prodDate);
      pDate.setDate(pDate.getDate() + daysNum);
      const calcExpiry = pDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        production_date: prodDate,
        shelf_life_days: days,
        expiry_date: calcExpiry
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        production_date: prodDate,
        shelf_life_days: days
      }));
    }
  };

  // Save Product Handler
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price === '') return;

    const keywordsArray = formData.ai_keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    const updatedList = saveProduct({
      id: formData.id,
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit,
      price: Number(formData.price),
      cost_price: Number(formData.cost_price || 0),
      ai_keywords: keywordsArray.length > 0 ? keywordsArray : [formData.name.toLowerCase()],
      is_best_seller: formData.is_best_seller,
      image_url: formData.image_url,
      batch_code: formData.batch_code || `LÔ-${Date.now().toString().slice(-4)}`,
      production_date: formData.production_date,
      shelf_life_days: Number(formData.shelf_life_days || 7),
      expiry_date: formData.expiry_date
    } as Partial<ProductRecord> & { name: string });

    setProducts(updatedList);
    try {
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      }).catch(() => {});
    } catch (e) {}
    setActiveModal(null);
    showToast(selectedProduct ? `Đã cập nhật món "${formData.name}"` : `Đã thêm món mới "${formData.name}" vào menu`);
  };

  // Open Delete Modal
  const openDeleteModal = (product: ProductRecord) => {
    setSelectedProduct(product);
    setActiveModal('DELETE');
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!selectedProduct) return;
    const updated = deleteProduct(selectedProduct.id);
    setProducts(updated);
    setActiveModal(null);
    showToast(`Đã xóa món "${selectedProduct.name}" khỏi thực đơn`);
  };

  // Live Profit & Margin Calculation for Form Preview
  const livePrice = Number(formData.price) || 0;
  const liveCost = Number(formData.cost_price) || 0;
  const liveProfit = livePrice - liveCost;
  const liveMargin = livePrice > 0 ? ((liveProfit / livePrice) * 100).toFixed(1) : '0';

  // Category Icon Helper
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'Món Gà Ủ Muối':
        return <Drumstick className="w-5 h-5 text-amber-600" />;
      case 'Món Ăn Kèm':
        return <Salad className="w-5 h-5 text-emerald-600" />;
      case 'Nước Uống':
        return <Coffee className="w-5 h-5 text-sky-600" />;
      default:
        return <Package className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce border border-slate-700">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Menu Món Ăn &amp; Hạn Sử Dụng
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {products.length} Món
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình thực đơn, theo dõi Hạn Sử Dụng (HSD), từ khóa AI nhận diện &amp; cảnh báo sớm 5 ngày.
            </p>
          </div>
        </div>

        <button
          onClick={() => openCreateEditModal()}
          className="bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Món Ăn Mới</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP EXPIRY ALERT BANNER (THANH CẢNH BÁO TỔNG HỢP) */}
      {/* ------------------------------------------------------------- */}
      {(expiryStats.warningCount > 0 || expiryStats.expiredCount > 0) && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in border border-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                ⚠️ Chú Ý: Cảnh Báo Hạn Sử Dụng Thực Đơn F&amp;B
              </h3>
              <p className="text-xs text-amber-50 font-medium mt-0.5">
                Có <strong className="text-white underline font-black">{expiryStats.warningCount} món sắp hết hạn (≤ 5 ngày)</strong> 
                {expiryStats.expiredCount > 0 && <span> và <strong className="text-rose-200 font-black">{expiryStats.expiredCount} món đã hết hạn</strong></span>}! Hãy ưu tiên xuất bán hoặc chạy combo xả kho.
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpiryTab('WARNING')}
            className="bg-white hover:bg-amber-50 active:scale-98 text-amber-900 font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Hourglass className="w-4 h-4 text-amber-600" />
            <span>Xem Ngay ({expiryStats.warningCount})</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. BỘ LỌC TÌM KIẾM, ĐIỂM BÁN & TABS HSD / DANH MỤC */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên món, mã lô (LÔ-GUM-0409), từ khóa AI..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          {/* Branch Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="font-bold text-slate-700 flex items-center gap-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Tồn kho chi nhánh:
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">🏢 Tất cả chi nhánh (Toàn hệ thống)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expiry Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
          <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] mr-1">
            <Hourglass className="w-3.5 h-3.5 text-amber-600" /> Lọc Theo Hạn Sử Dụng:
          </span>

          <button
            onClick={() => setExpiryTab('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              expiryTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tất cả ({expiryStats.total})
          </button>

          <button
            onClick={() => setExpiryTab('WARNING')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              expiryTab === 'WARNING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            ⚠️ Sắp hết hạn (≤ 5 ngày)
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-200 text-amber-900 rounded-full font-black">
              {expiryStats.warningCount}
            </span>
          </button>

          <button
            onClick={() => setExpiryTab('EXPIRED')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              expiryTab === 'EXPIRED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            ⛔ Đã hết hạn
            <span className="px-1.5 py-0.2 text-[10px] bg-rose-200 text-rose-900 rounded-full font-black">
              {expiryStats.expiredCount}
            </span>
          </button>

          <button
            onClick={() => setExpiryTab('SAFE')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              expiryTab === 'SAFE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            🟢 Còn hạn tốt
            <span className="px-1.5 py-0.2 text-[10px] bg-emerald-200 text-emerald-900 rounded-full font-black">
              {expiryStats.safeCount}
            </span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setCategoryTab('ALL')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              categoryTab === 'ALL'
                ? 'bg-purple-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả món ({categoryCounts.ALL})
          </button>
          <button
            onClick={() => setCategoryTab('Món Gà Ủ Muối')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              categoryTab === 'Món Gà Ủ Muối'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            🍗 Gà Ủ Muối ({categoryCounts['Món Gà Ủ Muối']})
          </button>
          <button
            onClick={() => setCategoryTab('Món Ăn Kèm')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              categoryTab === 'Món Ăn Kèm'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            🥗 Món Ăn Kèm ({categoryCounts['Món Ăn Kèm']})
          </button>
          <button
            onClick={() => setCategoryTab('Nước Uống')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              categoryTab === 'Nước Uống'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            🥤 Nước Uống ({categoryCounts['Nước Uống']})
          </button>
          <button
            onClick={() => setCategoryTab('Gia Vị & Extra')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              categoryTab === 'Gia Vị & Extra'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            🌶️ Gia Vị &amp; Extra ({categoryCounts['Gia Vị & Extra']})
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RICH PRODUCT TABLE WITH EXPIRY & BATCH COLUMNS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Hình Ảnh &amp; Món Ăn</th>
                <th className="px-3 py-3">Danh Mục</th>
                <th className="px-4 py-3 text-center">Hạn Sử Dụng / Lô</th>
                <th className="px-3 py-3 text-right">Giá Bán Lẻ</th>
                <th className="px-3 py-3 text-right">Giá Vốn</th>
                <th className="px-3 py-3 text-right">Lợi Nhuận</th>
                <th className="px-3 py-3 text-center">Trạng Thái Kho</th>
                <th className="px-3 py-3 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const profit = p.price - p.cost_price;
                const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : '0';
                const expInfo = getExpiryDetails(p.expiry_date);

                // Availability check based on branch selection
                const isBranchUnavailable = selectedBranchId && selectedBranchId !== 'ALL'
                  ? (p.unavailable_branches || []).includes(selectedBranchId)
                  : !p.is_available;

                const isAvailable = !isBranchUnavailable;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    {/* Column 1: Image & Product Details */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            {renderCategoryIcon(p.category)}
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 leading-snug">{p.name}</span>
                            {p.is_best_seller && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5 shrink-0">
                                <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> Best Seller
                              </span>
                            )}
                          </div>

                          {/* AI Recognition Keywords */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Bot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-medium">AI tags:</span>
                            <span className="font-semibold text-slate-700 italic">
                              {p.ai_keywords ? p.ai_keywords.join(', ') : 'Tự động bóc tách'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Category Badge */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                          p.category === 'Món Gà Ủ Muối'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : p.category === 'Món Ăn Kèm'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.category === 'Nước Uống'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}
                      >
                        {p.category}
                      </span>
                    </td>

                    {/* Column 3: Expiry Date & Batch Code Column */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1 text-slate-800 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.expiry_date || 'N/A'}</span>
                          {p.batch_code && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              {p.batch_code}
                            </span>
                          )}
                        </div>

                        {/* Expiry Countdown Badge */}
                        <div className="flex justify-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              expInfo.status === 'EXPIRED'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                                : expInfo.status === 'WARNING'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 font-black animate-pulse'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {expInfo.label}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Retail Price */}
                    <td className="px-3 py-3.5 text-right font-extrabold text-orange-600 text-xs">
                      {p.price.toLocaleString('vi-VN')}đ
                    </td>

                    {/* Column 5: Cost Price */}
                    <td className="px-3 py-3.5 text-right font-semibold text-slate-500">
                      {p.cost_price.toLocaleString('vi-VN')}đ
                    </td>

                    {/* Column 6: Unit Profit & Margin % */}
                    <td className="px-3 py-3.5 text-right">
                      <p className="font-extrabold text-emerald-700 text-xs">
                        +{profit.toLocaleString('vi-VN')}đ
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {margin}%
                      </span>
                    </td>

                    {/* Column 7: Stock Availability Toggle Switch */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSwitch(p)}
                          className={`w-11 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                            isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              isAvailable ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-[10px] font-bold ${isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {isAvailable ? 'Còn' : 'Hết'}
                        </span>
                      </div>
                    </td>

                    {/* Column 8: Actions */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openCreateEditModal(p)}
                          title="Chỉnh sửa món"
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(p)}
                          title="Xóa món"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: THÊM / CHỈNH SỬA MÓN ĂN & CẤU HÌNH HSD */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'CREATE_EDIT' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedProduct ? `Chỉnh Sửa Món: ${selectedProduct.name}` : 'Thêm Món Ăn Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Cấu hình thông tin món, hạn sử dụng (HSD) &amp; mã lô hàng.</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              
              {/* Image Upload Area */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hình ảnh món ăn (Tải ảnh trực tiếp)</label>
                {formData.image_url ? (
                  <div className="flex items-center gap-3 bg-purple-50/50 p-2.5 rounded-xl border border-purple-200">
                    <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-purple-300 shadow-2xs shrink-0" />
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-purple-800 block">✓ Đã tải ảnh Base64 thành công</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[10px] cursor-pointer transition flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Xóa ảnh / Đổi ảnh khác</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-purple-50/40 transition group">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            alert('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)!');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData(prev => ({ ...prev, image_url: ev.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-purple-600 mb-1 group-hover:scale-110 transition" />
                    <span className="font-bold text-slate-800 text-xs">Bấm để chọn file từ máy hoặc kéo thả ảnh</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Hỗ trợ JPG, PNG, WebP (Tự động lưu Base64 Data URL)</span>
                  </label>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên món ăn (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-extrabold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Danh mục món</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-800"
                  >
                    <option value="Món Gà Ủ Muối">🍗 Món Gà Ủ Muối</option>
                    <option value="Món Ăn Kèm">🥗 Món Ăn Kèm</option>
                    <option value="Nước Uống">🥤 Nước Uống</option>
                    <option value="Gia Vị & Extra">🌶️ Gia Vị &amp; Extra</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn vị tính</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-800"
                  >
                    <option value="Con">Con</option>
                    <option value="Nửa con">Nửa con</option>
                    <option value="Phần">Phần</option>
                    <option value="Hộp">Hộp</option>
                    <option value="Ly">Ly</option>
                    <option value="Chai">Chai</option>
                    <option value="Hũ">Hũ</option>
                  </select>
                </div>
              </div>

              {/* Expiry Tracking Fields (Mã Lô, Ngày SX, HSD Days, Ngày Hết Hạn) */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2.5">
                <label className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Hourglass className="w-3.5 h-3.5 text-amber-600" /> Quản Lý Mã Lô &amp; Hạn Sử Dụng (HSD)
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Mã số lô hàng</label>
                    <input
                      type="text"
                      placeholder="LÔ-GUM-0409"
                      value={formData.batch_code}
                      onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Ngày sản xuất</label>
                    <input
                      type="date"
                      value={formData.production_date}
                      onChange={(e) => handleProductionOrShelfLifeChange(e.target.value, formData.shelf_life_days)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Hạn dùng (Số ngày)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="14"
                      value={formData.shelf_life_days}
                      onChange={(e) => handleProductionOrShelfLifeChange(formData.production_date, Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-amber-800 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 font-bold text-slate-800">
                  <span className="text-[11px]">Hạn Sử Dụng Cụ Thể (Expiry Date):</span>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-extrabold outline-none text-xs"
                  />
                </div>
              </div>

              {/* Price & Cost Price with Live Profit Margin Preview */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Giá bán lẻ (VNĐ) (*)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      placeholder="190000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-extrabold text-orange-600 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Giá vốn (Cost)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="110000"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* Live Profit Preview */}
                <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-900">Preview Lợi Nhuận / Đơn Vị:</span>
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    +{liveProfit.toLocaleString('vi-VN')} VNĐ
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                      {liveMargin}% margin
                    </span>
                  </span>
                </div>
              </div>

              {/* AI Recognition Synonyms / Keywords Input */}
              <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="font-bold text-slate-800 flex items-center gap-1 text-purple-900">
                  <Bot className="w-3.5 h-3.5 text-purple-600" /> Từ khóa AI nhận diện (AI Synonyms)
                </label>
                <input
                  type="text"
                  placeholder="Nhập các từ đồng nghĩa ngăn cách bằng dấu phẩy (VD: 1 con, nguyên con, gà ủ cả con)"
                  value={formData.ai_keywords}
                  onChange={(e) => setFormData({ ...formData, ai_keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 font-medium"
                />
              </div>

              {/* Best Seller Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="best_seller_chk"
                  checked={formData.is_best_seller}
                  onChange={(e) => setFormData({ ...formData, is_best_seller: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="best_seller_chk" className="font-bold text-slate-800 cursor-pointer flex items-center gap-1">
                  <Flame className="w-4 h-4 text-rose-500" /> Đánh dấu món chủ lực (Best Seller)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedProduct ? 'Lưu Thay Đổi' : 'Thêm Món Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: XÁC NHẬN CHỌN PHẠM VI HẾT HÀNG */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'STOCK_SCOPE' && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Phạm Vi Tạm Hết Hàng</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đang lọc theo chi nhánh <strong className="text-slate-900">{branches.find(b => b.id === selectedBranchId)?.name}</strong>. Hãy chọn phạm vi áp dụng cho món <strong className="text-purple-700">{selectedProduct.name}</strong>:
            </p>

            <div className="space-y-2 text-xs font-bold pt-1">
              <button
                onClick={() => handleConfirmStockScope('BRANCH')}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl transition text-left flex items-center justify-between"
              >
                <span>📍 Chỉ tạm hết tại {branches.find(b => b.id === selectedBranchId)?.name}</span>
                <span>➔</span>
              </button>

              <button
                onClick={() => handleConfirmStockScope('GLOBAL')}
                className="w-full p-3 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl transition text-left flex items-center justify-between"
              >
                <span>🌐 Tạm hết trên toàn hệ thống tất cả chi nhánh</span>
                <span>➔</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 text-xs"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: XÁC NHẬN XÓA MÓN */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'DELETE' && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Xác Nhận Xóa Món</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa món <strong className="text-slate-900">{selectedProduct.name}</strong> khỏi thực đơn hệ thống không?
            </p>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-xs"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Xóa Món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
