'use client';

import React, { useState } from 'react';
import Header from './Header';
import Banner from './Banner';
import MenuSection, { Category, Product } from './MenuSection';
import CartDrawer, { CartItem } from './CartDrawer';
import OrderLookupModal from './OrderLookupModal';
import AIChatbotWidget from './AIChatbotWidget';
import { PhoneCall, MapPin, Clock, Navigation } from 'lucide-react';
import { useBranches } from '../hooks/useBranches';

const STORES = [
  {
    id: 'cs1',
    badge: 'CƠ SỞ 01',
    name: 'Cơ Sở Cầu Giấy',
    district: 'Q. Cầu Giấy',
    address: '12 Đường Cầu Giấy, Q. Cầu Giấy, Hà Nội',
    phone: '0988.888.901',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=12+C%E1%BA%A7u+Gi%E1%BA%A5y+H%C3%A0+N%E1%BB%99i',
  },
  {
    id: 'cs2',
    badge: 'CƠ SỞ 02',
    name: 'Cơ Sở Đống Đa',
    district: 'Q. Đống Đa',
    address: '88 Phố Xã Đàn, Q. Đống Đa, Hà Nội',
    phone: '0988.888.902',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=88+X%C3%A3+%C4%90%C3%A0n+H%C3%A0+N%E1%BB%99i',
  },
  {
    id: 'cs3',
    badge: 'CƠ SỞ 03',
    name: 'Cơ Sở Hai Bà Trưng',
    district: 'Q. Hai Bà Trưng',
    address: '156 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
    phone: '0988.888.903',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=156+Ph%E1%BB%91+Hu%E1%BA%BF+H%C3%A0+N%E1%BB%99i',
  },
  {
    id: 'cs4',
    badge: 'CƠ SỞ 04',
    name: 'Cơ Sở Thanh Xuân',
    district: 'Q. Thanh Xuân',
    address: '45 Đường Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',
    phone: '0988.888.904',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=45+Nguy%E1%BB%85n+Tr%C3%A3i+H%C3%A0+N%E1%BB%99i',
  },
  {
    id: 'cs5',
    badge: 'CƠ SỞ 05',
    name: 'Cơ Sở Tây Hồ',
    district: 'Q. Tây Hồ',
    address: '210 Đường Lạc Long Quân, Q. Tây Hồ, Hà Nội',
    phone: '0988.888.905',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=210+L%E1%BA%A1c+Long+Qu%C3%A2n+H%C3%A0+N%E1%BB%99i',
  },
  {
    id: 'cs6',
    badge: 'CƠ SỞ 06',
    name: 'Cơ Sở Nam Từ Liêm',
    district: 'Q. Nam Từ Liêm',
    address: '18 Đường Lê Đức Thọ, Q. Nam Từ Liêm, Hà Nội',
    phone: '0988.888.906',
    hours: '09:00 - 22:00',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80',
    mapsUrl: 'https://maps.google.com/?q=18+L%C3%AA+%C4%90%E1%BB%A9c+Th%E1%BB%8D+H%C3%A0+N%E1%BB%99i',
  },
];

interface ClientStorefrontProps {
  categories: Category[];
  products: Product[];
  settings: Record<string, string>;
}

export default function ClientStorefront({ categories, products, settings }: ClientStorefrontProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');

  const handleOpenTrackingWithPhone = (phone: string) => {
    setLookupPhone(phone);
    setIsLookupOpen(true);
  };

  // Parse CMS JSON configs with robust fallbacks
  let headerConfig = {
    logoText1: 'GÀ Ủ MUỐI',
    logoText2: 'SMART',
    hotline: settings['STORE_HOTLINE'] || '0988.888.999',
  };
  if (settings['CMS_HEADER_JSON']) {
    try {
      headerConfig = { ...headerConfig, ...JSON.parse(settings['CMS_HEADER_JSON']) };
    } catch (e) {}
  }

  let heroConfig = {
    line1: settings['CMS_HERO_TITLE'] || 'Gà Ủ Muối Smart',
    line2: settings['CMS_HERO_SUBTITLE'] || 'Giao Hỏa Tốc Nội Thành',
  };
  if (settings['CMS_HERO_JSON']) {
    try {
      heroConfig = { ...heroConfig, ...JSON.parse(settings['CMS_HERO_JSON']) };
    } catch (e) {}
  }

  let promoConfig = {
    card1Title: 'Hỗ Trợ 35K Ship Từ Bill 355K',
    card1Desc: 'Tự động áp dụng khi chốt đơn trực tiếp',
    card2Title: 'Giao Hỏa Tốc 30-40 Phút',
    card2Desc: 'Đảm bảo độ lạnh giòn và chuẩn vị khi giao tới',
  };
  if (settings['CMS_PROMO_JSON']) {
    try {
      promoConfig = { ...promoConfig, ...JSON.parse(settings['CMS_PROMO_JSON']) };
    } catch (e) {}
  }

  let storyConfig = {
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
  };
  if (settings['CMS_STORY_JSON']) {
    try {
      storyConfig = { ...storyConfig, ...JSON.parse(settings['CMS_STORY_JSON']) };
    } catch (e) {}
  }

  const { branches } = useBranches();

  let storeList = branches.length > 0
    ? branches.map((b) => ({
        id: b.id,
        badge: b.code || `CƠ SỞ ${b.id.toUpperCase()}`,
        name: b.name,
        district: b.district || b.address || '',
        address: b.address || '',
        phone: b.phone || '0988.888.901',
        hours: b.hours || '09:00 - 22:00',
        image: b.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
        mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(b.address || b.name)}`,
      }))
    : STORES;

  if (settings['CMS_BRANCHES_JSON']) {
    try {
      const parsed = JSON.parse(settings['CMS_BRANCHES_JSON']);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storeList = parsed;
      }
    } catch (e) {}
  }

  // Parse Social Media URLs with robust fallbacks
  const facebookUrl =
    settings['CMS_FACEBOOK_URL'] ||
    (headerConfig as any).facebook_url ||
    settings['FACEBOOK_URL'] ||
    settings['facebook_url'] ||
    'https://facebook.com';

  const zaloUrl =
    settings['CMS_ZALO_URL'] ||
    (headerConfig as any).zalo_url ||
    settings['ZALO_URL'] ||
    settings['zalo_url'] ||
    'https://zalo.me';

  const tiktokUrl =
    settings['CMS_TIKTOK_URL'] ||
    (headerConfig as any).tiktok_url ||
    settings['TIKTOK_URL'] ||
    settings['tiktok_url'] ||
    'https://tiktok.com';

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen dark:bg-[#0F1115] bg-[#FBF9F5] dark:text-[#FAFAF9] text-stone-900 font-sans flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-300">
      <div>
        <Header
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenLookup={() => setIsLookupOpen(true)}
          onScrollToSection={handleScrollToSection}
          storeName={settings['STORE_NAME']}
          hotline={headerConfig.hotline}
          logoText1={headerConfig.logoText1}
          logoText2={headerConfig.logoText2}
        />

        <Banner
          line1={heroConfig.line1}
          line2={heroConfig.line2}
          card1Title={promoConfig.card1Title}
          card1Desc={promoConfig.card1Desc}
          card2Title={promoConfig.card2Title}
          card2Desc={promoConfig.card2Desc}
          hotline={headerConfig.hotline}
          onOpenLookup={() => setIsLookupOpen(true)}
          onScrollToSection={handleScrollToSection}
        />

        <MenuSection
          categories={categories}
          products={products}
          onAddToCart={handleAddToCart}
        />

        {/* Story Section */}
        <section id="story" className="py-20 dark:bg-[#0B0D11] bg-white border-y dark:border-neutral-800/80 border-stone-200/80 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-[11px] font-semibold tracking-widest uppercase dark:text-amber-400 text-amber-600 block">
                {storyConfig.tag}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight dark:text-[#FAFAF9] text-stone-900 leading-tight">
                {storyConfig.title}
              </h2>
              <p className="text-sm dark:text-neutral-300 text-stone-600 font-normal leading-relaxed">
                {storyConfig.desc}
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2 dark:text-neutral-300 text-stone-700">
                <div className="dark:bg-[#14171D] bg-stone-50 p-5 rounded-2xl border dark:border-neutral-800 border-stone-200 shadow-xs">
                  <span className="gold-gradient-text font-extrabold text-2xl tracking-tight block mb-1">
                    {storyConfig.stat1Val}
                  </span>
                  <span>{storyConfig.stat1Label}</span>
                </div>
                <div className="dark:bg-[#14171D] bg-stone-50 p-5 rounded-2xl border dark:border-neutral-800 border-stone-200 shadow-xs">
                  <span className="gold-gradient-text font-extrabold text-2xl tracking-tight block mb-1">
                    {storyConfig.stat2Val}
                  </span>
                  <span>{storyConfig.stat2Label}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border dark:border-neutral-800 border-stone-200 shadow-2xl">
                <img
                  src={storyConfig.image}
                  alt={storyConfig.title}
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t dark:from-[#0B0D11] from-black/40 via-transparent to-transparent opacity-60" />
              </div>
              <div className="absolute -bottom-6 -left-6 dark:bg-neutral-950 bg-white/95 border dark:border-amber-500/40 border-amber-500/50 p-4 rounded-xl shadow-xl hidden sm:block">
                <span className="font-extrabold text-xs dark:text-amber-300 text-amber-700 uppercase tracking-wider block">
                  {storyConfig.badgeTitle}
                </span>
                <span className="text-[11px] dark:text-neutral-400 text-stone-600 font-normal">{storyConfig.badgeSub}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Locations Section with Radial Glow & Depth */}
        <section id="locations" className="relative overflow-hidden py-24 dark:bg-[#0F1115] bg-[#FBF9F5] border-t dark:border-neutral-800/80 border-stone-200/80 transition-colors duration-300">
          {/* Radial Spotlight Glow Behind Title */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[380px] dark:bg-amber-500/10 bg-amber-500/15 rounded-full blur-[130px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            {/* Section Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(245,158,11,0.35)] py-1">
                Hệ Thống {storeList.length > 0 ? storeList.length : 6} Cơ Sở
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed">
                Phục vụ giao hỏa tốc tận nơi và nhận hàng trực tiếp tại các cơ sở gần bạn nhất.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeList.map((store) => (
                <div
                  key={store.id}
                  className="dark:bg-[#18181b] bg-white border dark:border-neutral-800 border-stone-200/90 rounded-xl p-5 dark:hover:border-amber-500/50 hover:border-amber-500/60 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                >
                  {/* Top Badges: Store Badge + Open Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs px-3 py-1 rounded-full shadow-xs tracking-wider">
                      {store.badge}
                    </span>

                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] text-emerald-400 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Đang mở cửa</span>
                    </span>
                  </div>

                  {/* Title & District */}
                  <div className="space-y-1">
                    {store.district && (
                      <span className="text-[11px] text-amber-400 font-semibold tracking-wider uppercase block">
                        {store.district}
                      </span>
                    )}
                    <h3 className="text-lg font-bold dark:text-white text-stone-900 group-hover:text-amber-400 transition-colors tracking-tight">
                      {store.name}
                    </h3>
                  </div>

                  {/* Address & Hours */}
                  <div className="space-y-3 pt-2 border-t dark:border-neutral-800/80 border-stone-100 flex-1">
                    <div className="flex items-start gap-2.5 text-xs dark:text-neutral-300 text-stone-600 leading-relaxed">
                      <MapPin className="w-4 h-4 dark:text-amber-400 text-amber-600 shrink-0 mt-0.5 stroke-[1.75]" />
                      <span>{store.address}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs dark:text-neutral-400 text-stone-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 stroke-[1.75]" />
                        <span>Giờ mở cửa: <strong className="dark:text-neutral-200 text-stone-700 font-medium">{store.hours}</strong></span>
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Giao 30 phút</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    <a
                      href={`tel:${store.phone}`}
                      className="flex-1 py-2.5 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-700 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600 stroke-[1.75]" />
                      <span>Gọi Hotline</span>
                    </a>

                    <a
                      href={store.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 dark:bg-amber-500/10 dark:hover:bg-amber-500 dark:text-amber-400 dark:hover:text-neutral-950 dark:border-amber-500/30 bg-amber-500/15 hover:bg-amber-500 text-amber-700 hover:text-neutral-950 border border-amber-500/40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5 stroke-[1.75]" />
                      <span>Chỉ Đường</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="dark:bg-[#0B0D11] bg-[#F4F0E6] dark:text-neutral-400 text-stone-600 py-14 border-t dark:border-neutral-800 border-stone-300 text-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Store info */}
          <div>
            <h4 className="font-extrabold dark:text-[#FAFAF9] text-stone-900 text-lg mb-3 tracking-tight">
              {settings['STORE_NAME'] || headerConfig.logoText1 + ' ' + headerConfig.logoText2 || 'GÀ Ủ MUỐI SMART'}
            </h4>
            <p className="dark:text-neutral-400 text-stone-600 font-normal leading-relaxed">
              {settings['STORE_ADDRESS'] || '88 Đường Phạm Văn Đồng, Q. Bình Thạnh, TP. Hồ Chí Minh'}
            </p>
            <p className="mt-3 dark:text-amber-400 text-amber-600 font-bold tracking-wider">
              Hotline: {settings['STORE_HOTLINE'] || headerConfig.hotline || '0988.888.999'}
            </p>
          </div>

          {/* Col 2: Social Media Channels */}
          <div>
            <span className="text-xs font-semibold dark:text-neutral-400 text-stone-500 tracking-wider uppercase mb-3 block">
              KÊNH TRUYỀN THÔNG CHÍNH THỨC
            </span>
            <div className="flex flex-col gap-2.5">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl dark:bg-neutral-900/80 dark:border-neutral-800 dark:hover:border-amber-500/50 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white bg-white border-stone-200 hover:border-amber-500/50 hover:bg-stone-50 text-stone-700 hover:text-stone-900 transition-all duration-300 flex items-center gap-2.5 text-xs font-medium backdrop-blur-md shadow-sm group"
              >
                <svg className="w-4 h-4 text-blue-500 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Fanpage Facebook</span>
              </a>

              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl dark:bg-neutral-900/80 dark:border-neutral-800 dark:hover:border-amber-500/50 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white bg-white border-stone-200 hover:border-amber-500/50 hover:bg-stone-50 text-stone-700 hover:text-stone-900 transition-all duration-300 flex items-center gap-2.5 text-xs font-medium backdrop-blur-md shadow-sm group"
              >
                <div className="w-4 h-4 rounded-full bg-blue-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                  Z
                </div>
                <span>Zalo Official</span>
              </a>

              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl dark:bg-neutral-900/80 dark:border-neutral-800 dark:hover:border-amber-500/50 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white bg-white border-stone-200 hover:border-amber-500/50 hover:bg-stone-50 text-stone-700 hover:text-stone-900 transition-all duration-300 flex items-center gap-2.5 text-xs font-medium backdrop-blur-md shadow-sm group"
              >
                <svg className="w-4 h-4 text-pink-500 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
                <span>TikTok Channel</span>
              </a>
            </div>
          </div>

          {/* Col 3: Service Hours */}
          <div>
            <h4 className="font-extrabold dark:text-[#FAFAF9] text-stone-900 text-sm mb-3 tracking-tight">Thời Gian Phục Vụ</h4>
            <p className="dark:text-neutral-400 text-stone-600 font-normal">Thứ 2 - Chủ Nhật: 08:00 - 22:00</p>
            <p className="dark:text-neutral-400 text-stone-600 font-normal mt-1">Giao chuẩn nhiệt hỏa tốc tận tay trong 30 phút</p>
          </div>

          {/* Col 4: POS & Admin Login */}
          <div>
            <h4 className="font-extrabold dark:text-[#FAFAF9] text-stone-900 text-sm mb-3 tracking-tight">Hệ Thống Đặt Hàng & POS</h4>
            <p className="dark:text-neutral-400 text-stone-600 font-normal leading-relaxed">
              Tích hợp Trợ Lý Ẩm Thực Smart & Quản lý bán hàng F&B POS toàn diện.
            </p>
            <a
              href="/admin"
              className="inline-block mt-4 px-4 py-2.5 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-amber-300 dark:border-amber-500/30 bg-white hover:bg-stone-100 text-amber-700 border border-amber-600/30 font-bold rounded-xl transition text-xs tracking-wider shadow-xs"
            >
              🔐 Đăng Nhập Quản Trị Admin / POS
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-10 border-t dark:border-neutral-900 border-stone-300 text-center dark:text-neutral-600 text-stone-500 text-[11px]">
          © {new Date().getFullYear()} Gà Ủ Muối Smart. All rights reserved. Premium Modern Culinary.
        </div>
      </footer>

      {/* Modals & Widget */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOpenTracking={handleOpenTrackingWithPhone}
      />

      <OrderLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        initialQuery={lookupPhone}
      />

      <AIChatbotWidget />
    </div>
  );
}
