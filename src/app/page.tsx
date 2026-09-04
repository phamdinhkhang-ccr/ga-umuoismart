'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Store, Search, ShoppingBag, Phone, MapPin, Clock, ExternalLink, 
  CheckCircle2, Sparkles, Truck, ShieldCheck, Flame, MessageCircle, 
  Bot, LogIn, Lock, ArrowRight, UserCheck, Star, Zap, PhoneCall, Headphones
} from 'lucide-react';
import { getAnalyticsData } from '@/actions/orders';
import { getBranches, getProducts } from '@/lib/store';
import { Order } from '@/types/database';

export default function PublicStorefrontHome() {
  const { user } = useAuth();

  // Search Order State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Sample menu items
  const products = [
    {
      id: 'm1',
      name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)',
      price: 190000,
      unit: 'Con',
      desc: 'Gà ủ muối hoa tiêu da giòn sần sật, kèm 2 bịch nước chấm thần thánh gia truyền.',
      badge: '🌟 Bán Chạy Nhất',
      image: '🍗'
    },
    {
      id: 'm2',
      name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)',
      price: 100000,
      unit: 'Nửa con',
      desc: 'Phù hợp 1-2 người ăn, thịt mềm mọng ngọt giòn da chuẩn vị.',
      badge: '👍 Phổ Biến',
      image: '🍗'
    },
    {
      id: 'm3',
      name: 'Chân Gà Rút Xương Sốt Thái',
      price: 65000,
      unit: 'Hộp',
      desc: 'Chân gà rút xương giòn sần sật quyện sốt Thái chua cay đậm đà.',
      badge: '🌶️ Món Hot',
      image: '🌶️'
    },
    {
      id: 'm4',
      name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)',
      price: 85000,
      unit: 'Phần 4 cánh',
      desc: 'Cánh gà ủ muối giòn da dai thịt, đậm đà thấm vị từng thớ thịt.',
      badge: '🍗 Thích Nhất',
      image: '🍗'
    },
    {
      id: 'm5',
      name: 'Nước Chấm Thần Thánh Extra',
      price: 15000,
      unit: 'Chai',
      desc: 'Công thức nước chấm sốt tắc muối ớt cay nồng đậm vị đặc trưng.',
      badge: '🥫 Extra Sốt',
      image: '🥫'
    },
    {
      id: 'm6',
      name: 'Trà Tắc Khổng Lồ (1 Lít)',
      price: 20000,
      unit: 'Ly 1L',
      desc: '100% trà tắc tươi mát lạnh 1 lít giải nhiệt tức thì khi ăn gà.',
      badge: '🥤 Giải Nhiệt 1L',
      image: '🥤'
    }
  ];

  // 5 Branches Data
  const branches = [
    {
      id: 'b-vinsmart',
      name: 'CƠ SỞ VIN SMART CITY',
      address: 'Tòa S2.02 Vinhomes Smart City, Tây Mỗ, Nam Từ Liêm, Hà Nội',
      phone: '0988.123.456',
      hours: '08:00 - 22:30',
      status: '🟢 Đang mở cửa',
      mapsUrl: 'https://maps.google.com/?q=Vin+Smart+City+Hanoi'
    },
    {
      id: 'b-caugiay',
      name: 'Chi Nhánh Cầu Giấy',
      address: '102 Trần Thái Tông, Dịch Vọng, Cầu Giấy, Hà Nội',
      phone: '0977.888.999',
      hours: '08:00 - 22:30',
      status: '🟢 Đang mở cửa',
      mapsUrl: 'https://maps.google.com/?q=Tran+Thai+Tong+Cau+Giay'
    },
    {
      id: 'b-thanhtri',
      name: 'Chi Nhánh Thanh Trì',
      address: 'Số 9 Thượng Phúc, Đại Thanh, Huyện Thanh Trì, Hà Nội',
      phone: '0243.855.5555',
      hours: '08:00 - 22:30',
      status: '🟢 Đang mở cửa',
      mapsUrl: 'https://maps.google.com/?q=Dai+Thanh+Thanh+Tri'
    },
    {
      id: 'b-quan1',
      name: 'Chi Nhánh Quận 1 (TP.HCM)',
      address: '123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
      phone: '0283.811.1111',
      hours: '08:00 - 22:30',
      status: '🟢 Đang mở cửa',
      mapsUrl: 'https://maps.google.com/?q=Le+Loi+Quan+1'
    },
    {
      id: 'b-quan3',
      name: 'Chi Nhánh Quận 3 (TP.HCM)',
      address: '456 Điện Biên Phủ, Phường 3, Quận 3, TP.HCM',
      phone: '0283.822.2222',
      hours: '08:00 - 22:30',
      status: '🟢 Đang mở cửa',
      mapsUrl: 'https://maps.google.com/?q=Dien+Bien+Phu+Quan+3'
    }
  ];

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
                Gà Ủ Muối Smart
                <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
              </span>
              <p className="text-[10px] text-slate-500 font-semibold hidden sm:block">Đặc Sản Da Giòn Sần Sật • Giao Hỏa Tốc</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-extrabold text-slate-700">
            <a href="#menu" className="hover:text-orange-600 transition">Thực Đơn Món</a>
            <a href="#track" className="hover:text-orange-600 transition">Tra Cứu Đơn Hàng</a>
            <a href="#branches" className="hover:text-orange-600 transition">5 Cơ Sở Bếp</a>
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
            <span>Đặc Sản Gà Ủ Muối Hoa Tiêu Đậm Vị Nóng Hổi</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Gà Ủ Muối Da Giòn Sần Sật <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600">
              Thơm Ngon Đậm Đà • Giao Hỏa Tốc
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-600 leading-relaxed font-medium">
            Đặc sản gà ủ muối hoa tiêu chuẩn vị, da giòn sần sật, thịt mọng ngọt đậm đà, kèm hũ nước chấm thần thánh gia truyền. Giao nóng tận nơi trong 20-30 phút tại Hà Nội &amp; TP.HCM.
          </p>

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
                    <div><strong>Hotline bếp:</strong> {searchedOrder.branch?.phone || '0988.123.456'}</div>
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

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-4xl">{p.image}</span>
                  <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black px-2.5 py-1 rounded-full">
                    {p.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{p.desc}</p>
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

      {/* 5. KHỐI HỆ THỐNG 5 CƠ SỞ PHỦ SÓNG (#branches) */}
      <section id="branches" className="bg-slate-100/70 border-y border-slate-200 py-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
              Phủ Sóng Toàn Quốc
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Hệ Thống 5 Cơ Sở Phủ Sóng Hà Nội &amp; TP.HCM</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">Sẵn sàng phục vụ giao hỏa tốc trong 20-30 phút tại các quận nội thành.</p>
          </div>

          {/* Branch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((b) => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5 hover:shadow-md transition">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>{b.name}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    {b.status}
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
                    href={b.mapsUrl}
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
            href="https://facebook.com"
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
            href="https://tiktok.com"
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
            href="https://zalo.me"
            target="_blank"
            rel="noreferrer"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-sky-300 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-lg shrink-0">
              💬
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">Zalo OA Đặt Hàng</h4>
              <p className="text-[11px] text-slate-500 font-medium">Zalo Chăm Sóc Khách Hàng</p>
            </div>
          </a>

          {/* Hotline */}
          <a
            href="tel:19006868"
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-orange-300 hover:shadow-md transition flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-lg shrink-0">
              📞
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900">Tổng Đài Phản Ánh</h4>
              <p className="text-[11px] text-orange-600 font-black">1900.6868 (24/7)</p>
            </div>
          </a>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-900 text-white text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-orange-500" />
            <span className="font-extrabold text-white text-sm">Gà Ủ Muối Smart</span>
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
