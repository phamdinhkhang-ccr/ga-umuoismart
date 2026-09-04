'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Upload, Store, MapPin, Phone, Clock, 
  ExternalLink, CheckCircle2, Flame, Share2, Globe, ShieldCheck, 
  X, Check, AlertCircle, Utensils, Plus, Trash2, Star, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { 
  getCmsSettings, saveCmsSettings, StorefrontCmsSettings, CmsBranchItem,
  getProducts, saveProduct, deleteProduct, ProductRecord 
} from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

export default function AdminCmsPage() {
  const [settings, setSettings] = useState<StorefrontCmsSettings>({
    hero_title: 'GÀ Ủ MUỐI SMART',
    hero_slogan: 'Gà ủ muối da giòn sần sật - Thơm ngon đậm đà giao nóng tận nơi',
    hero_hotline: '0988.123.456',
    hotline: '0988.123.456',
    hotlineBadgeText: 'Hotline Đặt Ngay:',
    promoBannerText: '🔥 Khuyến mãi đặc biệt: Đồng giá Gà Ủ Muối Nguyên Con 190.000đ - Giao hỏa tốc 20 phút!',
    brandName: 'Gà Ủ Muối Smart',
    branches: [],
    social_facebook: 'https://facebook.com',
    social_tiktok: 'https://tiktok.com',
    social_zalo: 'https://zalo.me',
    hotline_complaints: '1900.6868',
    bankInfo: {
      bankName: 'MB Bank',
      accountNumber: '0988123456',
      accountHolder: 'CHI NHANH VIN SMART CITY'
    }
  });

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<ProductRecord>>({
    name: '',
    category: 'Món Gà Ủ Muối',
    price: 100000,
    original_price: 120000,
    unit: 'Phần',
    description: '',
    is_storefront_visible: true,
    is_best_seller: false,
    image_url: ''
  });

  const reloadData = async () => {
    const localSettings = getCmsSettings();
    setSettings(localSettings);
    setProducts(getProducts());

    try {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('id', 'default_config')
        .single();
      if (data && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (e) {}
  };

  useEffect(() => {
    reloadData();
    const handleStoreUpdate = () => reloadData();
    window.addEventListener('gum_store_update', handleStoreUpdate);
    return () => window.removeEventListener('gum_store_update', handleStoreUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const notifyUpdate = () => {
    window.dispatchEvent(new Event('gum_store_update'));
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveCmsSettings({
      ...settings,
      hotline: settings.hero_hotline
    });
    setSettings(updated);

    try {
      Promise.resolve(
        supabase
          .from('storefront_settings')
          .upsert([
            {
              id: 'default_config',
              settings: updated,
              updated_at: new Date().toISOString()
            }
          ])
      ).catch(() => {});
    } catch (err) {}

    notifyUpdate();
    showToast('✅ Đã lưu và cập nhật giao diện trang chủ thành công!');
  };

  const handleBranchChange = (index: number, field: keyof CmsBranchItem, value: any) => {
    setSettings((prev) => {
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value };
      return { ...prev, branches: newBranches };
    });
  };

  // Product Operations
  const handleUpdateProductField = (id: string, field: keyof ProductRecord, value: any) => {
    const target = products.find(p => p.id === id);
    if (!target) return;

    const updatedData = { ...target, [field]: value };
    const updatedList = saveProduct(updatedData);
    setProducts(updatedList);
    notifyUpdate();
  };

  const handleProductImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      handleUpdateProductField(id, 'image_url', base64Url);
      showToast('📸 Đã cập nhật ảnh món ăn thành công!');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProductClick = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn trang chủ?`)) {
      const updated = deleteProduct(id);
      setProducts(updated);
      notifyUpdate();
      showToast(`🗑️ Đã xóa món "${name}" thành công!`);
    }
  };

  const handleSaveNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name?.trim()) return;

    const updated = saveProduct({
      name: newProduct.name.trim(),
      category: newProduct.category as any || 'Món Gà Ủ Muối',
      price: Number(newProduct.price) || 0,
      original_price: newProduct.original_price ? Number(newProduct.original_price) : undefined,
      description: newProduct.description || '',
      unit: newProduct.unit || 'Phần',
      is_storefront_visible: newProduct.is_storefront_visible !== undefined ? newProduct.is_storefront_visible : true,
      is_best_seller: !!newProduct.is_best_seller,
      image_url: newProduct.image_url || '',
      is_available: true
    });

    setProducts(updated);
    notifyUpdate();
    setIsAddModalOpen(false);
    setNewProduct({
      name: '',
      category: 'Món Gà Ủ Muối',
      price: 100000,
      original_price: 120000,
      unit: 'Phần',
      description: '',
      is_storefront_visible: true,
      is_best_seller: false,
      image_url: ''
    });
    showToast(`✨ Đã thêm món "${newProduct.name}" vào thực đơn trang chủ!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              Quản Trị Nội Dung Trang Chủ (Storefront CMS)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cấu hình Banner Hero, Slogan, thực đơn món ngoài trang chủ, 5 cơ sở &amp; kênh truyền thông.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSaveAll()}
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>💾 Lưu Cấu Hình Trang Chủ</span>
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        
        {/* 1. KHỐI CẤU HÌNH BANNER & KHẨU HIỆU (HERO SECTION) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Flame className="w-5 h-5 text-orange-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">A. Cấu Hình Banner Đầu Trang &amp; Khẩu Hiệu (Hero Section)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tiêu đề thương hiệu chính (*)</label>
              <input
                type="text"
                required
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tiền tố Badge Hotline (VD: Hotline Đặt Ngay:)</label>
              <input
                type="text"
                value={settings.hotlineBadgeText || 'Hotline Đặt Ngay:'}
                onChange={(e) => setSettings({ ...settings, hotlineBadgeText: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số điện thoại Hotline gọi nhanh (*)</label>
              <input
                type="text"
                required
                value={settings.hero_hotline}
                onChange={(e) => setSettings({ ...settings, hero_hotline: e.target.value, hotline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-orange-600 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Thông báo ưu đãi nổi bật (Chạy thanh Banner)</label>
              <input
                type="text"
                value={settings.promoBannerText || ''}
                onChange={(e) => setSettings({ ...settings, promoBannerText: e.target.value })}
                placeholder="VD: 🔥 Khuyến mãi đặc biệt: Đồng giá Gà Ủ Muối Nguyên Con 190.000đ!"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-orange-700 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Câu khẩu hiệu / Slogan thương hiệu (*)</label>
              <textarea
                rows={2}
                required
                value={settings.hero_slogan}
                onChange={(e) => setSettings({ ...settings, hero_slogan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            {/* Banner Background Image Drag & Drop */}
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">Ảnh nền Banner chính (Hero Background / Banner Món)</label>
              {settings.hero_banner_image ? (
                <div className="flex items-center gap-3 bg-orange-50/60 p-3 rounded-2xl border border-orange-200">
                  <img src={settings.hero_banner_image} alt="Banner Preview" className="w-32 h-20 object-cover rounded-xl border border-orange-300 shadow-2xs shrink-0" />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-orange-800 block">✓ Đã tải ảnh banner lên thành công</span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, hero_banner_image: '' })}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px] cursor-pointer transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Xóa ảnh banner</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-orange-50/30 transition group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setSettings({ ...settings, hero_banner_image: ev.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 text-orange-600 mb-1 group-hover:scale-110 transition" />
                  <span className="font-bold text-slate-800 text-xs">Bấm để chọn tệp từ máy hoặc kéo thả ảnh Banner</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Hỗ trợ JPG, PNG, WebP (Tự động lưu Base64 Data URL)</span>
                </label>
              )}
            </div>

          </div>
        </div>

        {/* 1.5. KHỐI CẤU HÌNH NGÂN HÀNG THANH TOÁN (VIETQR) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-orange-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">B. Cấu Hình Tài Khoản Ngân Hàng Thanh Toán (Chuyển Khoản / VietQR)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên Ngân hàng (VD: MB Bank, Vietcombank)</label>
              <input
                type="text"
                value={settings.bankInfo?.bankName || 'MB Bank'}
                onChange={(e) => setSettings({
                  ...settings,
                  bankInfo: { ...(settings.bankInfo || { accountNumber: '', accountHolder: '' }), bankName: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Số tài khoản nhận tiền (*)</label>
              <input
                type="text"
                value={settings.bankInfo?.accountNumber || '0988123456'}
                onChange={(e) => setSettings({
                  ...settings,
                  bankInfo: { ...(settings.bankInfo || { bankName: 'MB Bank', accountHolder: '' }), accountNumber: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-orange-600 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên chủ tài khoản (*)</label>
              <input
                type="text"
                value={settings.bankInfo?.accountHolder || 'CHI NHANH VIN SMART CITY'}
                onChange={(e) => setSettings({
                  ...settings,
                  bankInfo: { ...(settings.bankInfo || { bankName: 'MB Bank', accountNumber: '' }), accountHolder: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* 2. KHỐI QUẢN LÝ 5 CƠ SỞ HIỂN THỊ TRANG CHỦ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 justify-between">
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-orange-600" />
              <h2 className="font-extrabold text-slate-900 text-sm">C. Quản Lý Danh Sách 5 Cơ Sở Hiển Thị Ngoài Trang Chủ</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">Cơ sở bật/tắt sẽ tự động cập nhật ngoài trang chủ</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {settings.branches.map((b, idx) => (
              <div key={b.id || idx} className={`border rounded-2xl p-4 space-y-3 transition ${b.is_active ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    Cơ sở #{idx + 1}: {b.name}
                  </span>

                  {/* Toggle Switch */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.is_active}
                      onChange={(e) => handleBranchChange(idx, 'is_active', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                    <span className={`text-[10px] font-bold ${b.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {b.is_active ? 'Hiển thị' : 'Đang ẩn'}
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Tên cơ sở:</label>
                    <input
                      type="text"
                      value={b.name}
                      onChange={(e) => handleBranchChange(idx, 'name', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Địa chỉ hiển thị:</label>
                    <input
                      type="text"
                      value={b.address}
                      onChange={(e) => handleBranchChange(idx, 'address', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Hotline:</label>
                      <input
                        type="text"
                        value={b.phone}
                        onChange={(e) => handleBranchChange(idx, 'phone', e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-orange-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Giờ mở cửa:</label>
                      <input
                        type="text"
                        value={b.hours}
                        onChange={(e) => handleBranchChange(idx, 'hours', e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Link Google Maps:</label>
                    <input
                      type="text"
                      value={b.maps_url}
                      onChange={(e) => handleBranchChange(idx, 'maps_url', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 outline-none"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* 3. KHỐI CẤU HÌNH & QUẢN LÝ THỰC ĐƠN MENU HIỂN THỊ NGOÀI TRANG CHỦ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-orange-600" />
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">
                  C. Cấu Hình &amp; Quản Lý Thực Đơn Menu Hiển Thị Ngoài Trang Chủ
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Admin toàn quyền tải ảnh món, điều chỉnh giá bán, bật/tắt hiển thị món hoặc ghim món nổi bật (Best Seller) lên đầu trang chủ khách hàng.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-orange-600 rounded" />
                <span>Đồng bộ giá &amp; món với POS</span>
              </label>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Món Ăn Mới Vào Trang Chủ</span>
              </button>
            </div>
          </div>

          {/* Inline Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {products.map((p) => (
              <div
                key={p.id}
                className={`border rounded-2xl p-4 space-y-3 transition flex flex-col justify-between ${
                  p.is_storefront_visible !== false
                    ? 'bg-white border-slate-200 shadow-2xs hover:border-orange-300'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Top Image Preview & Upload Header */}
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      {p.image_url ? (
                        <div className="relative group">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-2xs"
                          />
                          <label className="absolute inset-0 bg-black/50 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-xl cursor-pointer">
                            <span>Đổi ảnh</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleProductImageUpload(p.id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="w-24 h-24 border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/40 rounded-xl flex flex-col items-center justify-center text-center p-1 cursor-pointer transition">
                          <Upload className="w-5 h-5 text-orange-600 mb-0.5" />
                          <span className="text-[10px] font-bold text-slate-700">Tải ảnh món</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProductImageUpload(p.id, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Inputs: Name, Category */}
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Tên món (*):</label>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdateProductField(p.id, 'name', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Danh mục món:</label>
                        <select
                          value={p.category}
                          onChange={(e) => handleUpdateProductField(p.id, 'category', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-orange-500"
                        >
                          <option value="Món Gà Ủ Muối">Món Gà Ủ Muối</option>
                          <option value="Món Ăn Kèm">Món Ăn Kèm</option>
                          <option value="Nước Uống">Nước Uống</option>
                          <option value="Gia Vị &amp; Extra">Gia Vị &amp; Extra</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Inputs: Retail Price & Original Price */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Giá bán (*):</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={p.price}
                          onChange={(e) => handleUpdateProductField(p.id, 'price', Number(e.target.value))}
                          className="w-full p-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg font-black text-orange-600 outline-none focus:border-orange-500 focus:bg-white"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">đ</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Giá gốc (gạch):</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={p.original_price || ''}
                          onChange={(e) => handleUpdateProductField(p.id, 'original_price', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="220.000"
                          className="w-full p-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-500 line-through outline-none focus:border-orange-500 focus:bg-white"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Mô tả ngắn hương vị:</label>
                    <input
                      type="text"
                      value={p.description || ''}
                      onChange={(e) => handleUpdateProductField(p.id, 'description', e.target.value)}
                      placeholder="VD: Da giòn sần sật, thịt ngọt tự nhiên..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                </div>

                {/* Bottom Toggles & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                  
                  <div className="flex items-center space-x-3">
                    {/* Toggle 1: Visible on Storefront */}
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.is_storefront_visible !== false}
                        onChange={(e) => handleUpdateProductField(p.id, 'is_storefront_visible', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                      <span className={`font-bold text-[10px] ${p.is_storefront_visible !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {p.is_storefront_visible !== false ? 'Hiện' : 'Ẩn'}
                      </span>
                    </label>

                    {/* Toggle 2: Best Seller */}
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!p.is_best_seller}
                        onChange={(e) => handleUpdateProductField(p.id, 'is_best_seller', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 relative"></div>
                      <span className={`font-bold text-[10px] flex items-center gap-0.5 ${p.is_best_seller ? 'text-amber-800' : 'text-slate-400'}`}>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        <span>Ghim</span>
                      </span>
                    </label>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteProductClick(p.id, p.name)}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Xóa khỏi danh sách trang chủ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>
            ))}
          </div>
        </div>

        {/* 4. KHỐI CẤU HÌNH KÊNH TRUYỀN THÔNG & MẠNG XÃ HỘI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Globe className="w-5 h-5 text-orange-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">D. Cấu Hình Kênh Truyền Thông &amp; Mạng Xã Hội (Social Links)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Link Fanpage Facebook (*)</label>
              <input
                type="text"
                required
                value={settings.social_facebook}
                onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Link Kênh TikTok Official (*)</label>
              <input
                type="text"
                required
                value={settings.social_tiktok}
                onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Link / Số Zalo OA Đặt Hàng (*)</label>
              <input
                type="text"
                required
                value={settings.social_zalo}
                onChange={(e) => setSettings({ ...settings, social_zalo: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Hotline Phản Ánh Chất Lượng (*)</label>
              <input
                type="text"
                required
                value={settings.hotline_complaints}
                onChange={(e) => setSettings({ ...settings, hotline_complaints: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-orange-600 outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE BAR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black px-8 py-3.5 rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>💾 Lưu Cấu Hình Trang Chủ</span>
          </button>
        </div>

      </form>

      {/* QUICK ADD NEW PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                Thêm Món Ăn Mới Vào Thực Đơn Trang Chủ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProductSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên món ăn (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Gà Ủ Muối Nguyên Con..."
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Danh mục món:</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    <option value="Món Gà Ủ Muối">Món Gà Ủ Muối</option>
                    <option value="Món Ăn Kèm">Món Ăn Kèm</option>
                    <option value="Nước Uống">Nước Uống</option>
                    <option value="Gia Vị &amp; Extra">Gia Vị &amp; Extra</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đơn vị tính:</label>
                  <input
                    type="text"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giá bán thực tế (*):</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-orange-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giá gốc niêm yết (gạch):</label>
                  <input
                    type="number"
                    value={newProduct.original_price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="VD: 220000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả ngắn hương vị:</label>
                <input
                  type="text"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="VD: Da giòn sần sật, thơm lừng hoa tiêu..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ảnh món ăn (Upload file Base64):</label>
                {newProduct.image_url ? (
                  <div className="flex items-center gap-3 bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                    <img src={newProduct.image_url} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setNewProduct({ ...newProduct, image_url: '' })}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-orange-50/30 transition">
                    <Upload className="w-5 h-5 text-orange-600 mb-1" />
                    <span className="font-bold text-slate-700 text-[11px]">Bấm để chọn file ảnh món</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setNewProduct({ ...newProduct, image_url: ev.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newProduct.is_storefront_visible}
                    onChange={(e) => setNewProduct({ ...newProduct, is_storefront_visible: e.target.checked })}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Hiển thị ngoài trang chủ</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-800">
                  <input
                    type="checkbox"
                    checked={newProduct.is_best_seller}
                    onChange={(e) => setNewProduct({ ...newProduct, is_best_seller: e.target.checked })}
                    className="accent-amber-500 rounded"
                  />
                  <span>Ghim Best Seller 🌟</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-xs"
                >
                  + Thêm Món Vào Menu
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
