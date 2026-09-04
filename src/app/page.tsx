'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Store, Search, ShoppingBag, Phone, MapPin, Clock, ExternalLink, 
  CheckCircle2, Sparkles, Truck, ShieldCheck, Flame, MessageCircle, 
  Bot, LogIn, Lock, ArrowRight, UserCheck, Star, Zap, PhoneCall, Headphones
} from 'lucide-react';
import { getAnalyticsData } from '@/actions/orders';
import { getProducts, getCmsSettings, StorefrontCmsSettings, ProductRecord } from '@/lib/store';
import { Order } from '@/types/database';

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

  const loadStorefrontData = () => {
    setCmsSettings(getCmsSettings());
    setProductsList(getProducts());
  };

  useEffect(() => {
    loadStorefrontData();

    const handleStoreUpdate = () => {
      loadStorefrontData();
    };

    window.addEventListener('gum_store_update', handleStoreUpdate);
    window.addEventListener('storage', handleStoreUpdate);

    return () => {
      window.removeEventListener('gum_store_update', handleStoreUpdate);
      window.removeEventListener('storage', handleStoreUpdate);
    };
  }, []);

  // Filter active branches only
  const activeBranches = useMemo(() => {
    return cmsSettings.branches?.filter((b) => b.is_active !== false) || [];
  }, [cmsSettings.branches]);

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
          
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs font-extrabold shadow-2xs">
            <Flame className="w-4 h-4 text-orange-600 animate-bounce" />
            <span>Hotline Đặt Ngay: {cmsSettings.hero_hotline}</span>
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
            <a
              href="#menu"
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center space-x-2 cursor-pointer"
            >
              <span>🍗 Đặt Hàng Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </a>

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
          {productsList.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-16 h-16 object-cover rounded-2xl border border-slate-200 shadow-xs" />
                  ) : (
                    <span className="text-4xl">🍗</span>
                  )}
                  <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black px-2.5 py-1 rounded-full">
                    {p.is_best_seller ? '🌟 Bán Chạy Nhất' : p.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {p.ai_keywords ? p.ai_keywords.join(' • ') : 'Gà ủ muối chuẩn vị'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Giá bán:</span>
                  <span className="text-lg font-black text-orange-600">{p.price.toLocaleString('vi-VN')}đ</span>
                </div>

                <button
                  onClick={() => {
                    alert(`Đã chọn ${p.name}! Bạn hãy bấm vào nút Chat AI ở góc phải dưới màn hình để chốt đơn giao hỏa tốc nhé!`);
                  }}
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
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition text-center flex items-center justify-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Chỉ Đường</span>
                  </a>

                  <a
                    href={`tel:${b.phone}`}
                    className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl text-[11px] shadow-2xs transition text-center flex items-center justify-center space-x-1"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Gọi Hotline</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. KHỐI KÊNH TRUYỀN THÔNG & MẠNG XÃ HỘI (#contact) */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 scroll-mt-20">
        <div className="text-center space-y-2">
          <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-sky-200">
            Kênh Truyền Thông Official
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Kết Nối Với Gà Ủ Muối Smart</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">Theo dõi các kênh mạng xã hội chính thức để săn deal &amp; nhận ưu đãi mỗi ngày.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Facebook */}
          <a
            href={cmsSettings.social_facebook}
            target="_blank"
            rel="noreferrer"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
              📘
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">Facebook Fanpage</h4>
              <p className="text-[11px] text-slate-500 font-medium">Gà Ủ Muối Smart Official</p>
            </div>
          </a>

          {/* TikTok */}
          <a
            href={cmsSettings.social_tiktok}
            target="_blank"
            rel="noreferrer"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-400 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0">
              🎵
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">TikTok Official</h4>
              <p className="text-[11px] text-slate-500 font-medium">@gaumuoismart.vn</p>
            </div>
          </a>

          {/* Zalo OA */}
          <a
            href={cmsSettings.social_zalo}
            target="_blank"
            rel="noreferrer"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-sky-300 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-lg shrink-0">
              💬
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">Zalo OA Đặt Hàng</h4>
              <p className="text-[11px] text-slate-500 font-medium">Zalo CSKH Gà Ủ Muối</p>
            </div>
          </a>

          {/* Hotline */}
          <a
            href={`tel:${cmsSettings.hotline_complaints}`}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-orange-300 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-lg shrink-0">
              📞
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">Tổng Đài Phản Ánh</h4>
              <p className="text-[11px] text-orange-600 font-black">{cmsSettings.hotline_complaints} (24/7)</p>
            </div>
          </a>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-900 text-white text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-orange-500" />
            <span className="font-extrabold text-white text-sm">{cmsSettings.hero_title}</span>
            <span>- Thương hiệu Gà Ủ Muối Hoa Tiêu Đa Chi Nhánh</span>
          </div>

          <div className="text-[11px]">
            © 2026 GaUMuoiSmart Inc. All rights reserved. Powered by AI Smart POS Engine.
          </div>
        </div>
      </footer>

    </div>
  );
}
