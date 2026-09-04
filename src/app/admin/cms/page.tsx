'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Upload, Store, MapPin, Phone, Clock, 
  ExternalLink, CheckCircle2, Flame, Share2, Globe, ShieldCheck, 
  X, Check, AlertCircle
} from 'lucide-react';
import { getCmsSettings, saveCmsSettings, StorefrontCmsSettings, CmsBranchItem } from '@/lib/store';

export default function AdminCmsPage() {
  const [settings, setSettings] = useState<StorefrontCmsSettings>({
    hero_title: 'GÀ Ủ MUỐI SMART',
    hero_slogan: 'Gà ủ muối da giòn sần sật - Thơm ngon đậm đà giao nóng tận nơi',
    hero_hotline: '0988.123.456',
    branches: [],
    social_facebook: 'https://facebook.com',
    social_tiktok: 'https://tiktok.com',
    social_zalo: 'https://zalo.me',
    hotline_complaints: '1900.6868'
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getCmsSettings());
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveCmsSettings(settings);
    setSettings(updated);
    showToast('🎉 Đã cập nhật nội dung trang chủ thành công!');
  };

  const handleBranchChange = (index: number, field: keyof CmsBranchItem, value: any) => {
    setSettings((prev) => {
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value };
      return { ...prev, branches: newBranches };
    });
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
              Cấu hình Banner Hero, Slogan, danh sách 5 cơ sở &amp; link truyền thông ngoài trang chủ khách hàng.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
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
              <label className="font-bold text-slate-700">Số điện thoại Hotline gọi nhanh (*)</label>
              <input
                type="text"
                required
                value={settings.hero_hotline}
                onChange={(e) => setSettings({ ...settings, hero_hotline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-orange-600 outline-none focus:border-orange-500 focus:bg-white transition"
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

        {/* 2. KHỐI QUẢN LÝ 5 CƠ SỞ HIỂN THỊ TRANG CHỦ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 justify-between">
            <div className="flex items-center space-x-2">
              <Store className="w-5 h-5 text-orange-600" />
              <h2 className="font-extrabold text-slate-900 text-sm">B. Quản Lý Danh Sách 5 Cơ Sở Hiển Thị Ngoài Trang Chủ</h2>
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

        {/* 3. KHỐI CẤU HÌNH KÊNH TRUYỀN THÔNG & MẠNG XÃ HỘI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Globe className="w-5 h-5 text-orange-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">C. Cấu Hình Kênh Truyền Thông &amp; Mạng Xã Hội (Social Links)</h2>
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
    </div>
  );
}
