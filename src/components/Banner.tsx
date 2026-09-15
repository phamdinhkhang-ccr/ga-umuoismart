'use client';

import React from 'react';
import { Gift, Zap, ShoppingBag, Search } from 'lucide-react';

interface BannerProps {
  line1?: string;
  line2?: string;
  card1Title?: string;
  card1Desc?: string;
  card2Title?: string;
  card2Desc?: string;
  title?: string;
  subtitle?: string;
  hotline?: string;
  onOpenLookup?: () => void;
  onScrollToSection?: (id: string) => void;
}

export default function Banner({
  line1 = 'Gà Ủ Muối Smart',
  line2 = 'Giao Hỏa Tốc Nội Thành',
  card1Title = 'Hỗ Trợ 35K Ship Từ Bill 355K',
  card1Desc = 'Tự động áp dụng khi chốt đơn trực tiếp',
  card2Title = 'Giao Hỏa Tốc 30-40 Phút',
  card2Desc = 'Đảm bảo độ lạnh giòn và chuẩn vị khi giao tới',
  title,
  subtitle,
  hotline = '0988.888.999',
  onOpenLookup,
  onScrollToSection,
}: BannerProps) {
  const displayLine1 = line1 || title || 'Gà Ủ Muối Smart';
  const displayLine2 = line2 || subtitle || 'Giao Hỏa Tốc Nội Thành';

  const handleScrollToMenu = () => {
    if (onScrollToSection) {
      onScrollToSection('menu');
    } else {
      const el = document.getElementById('menu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden dark:bg-gradient-to-b dark:from-[#0B0D11] dark:via-[#0F1115] dark:to-[#181B20] bg-gradient-to-b from-[#FBF9F5] via-[#F6F3EB] to-[#EDE8DC] py-24 px-4 sm:px-6 lg:px-8 border-b dark:border-neutral-800/80 border-stone-200/80 transition-colors duration-300">
      {/* 3. Radial Spotlight Effect Behind Title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] dark:bg-[radial-gradient(circle,rgba(245,158,11,0.08)_0%,transparent_70%)] bg-[radial-gradient(circle,rgba(245,158,11,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Main 2-Line Geometric Sans-Serif Headline (Montserrat) */}
        <h1 className="flex flex-col items-center justify-center text-center max-w-5xl mx-auto py-2">
          <span className="font-heavy font-extrabold text-4xl sm:text-6xl lg:text-7xl dark:text-neutral-100 text-stone-900 tracking-tight block py-1.5 leading-[1.25] drop-shadow-[0_4px_24px_rgba(0,0,0,0.06)] whitespace-nowrap">
            {displayLine1}
          </span>
          <span className="font-heavy font-bold text-2xl sm:text-4xl lg:text-5xl dark:text-amber-400 text-amber-600 block py-1.5 leading-[1.25] dark:drop-shadow-[0_4px_30px_rgba(251,191,36,0.35)] drop-shadow-[0_2px_15px_rgba(217,119,6,0.2)] whitespace-nowrap">
            {displayLine2}
          </span>
        </h1>

        {/* 2. Synchronized Bold White CTA Buttons Pair */}
        <div className="mt-9 mb-10 flex flex-wrap items-center justify-center gap-5">
          <button
            onClick={handleScrollToMenu}
            className="rounded-full px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:brightness-110 shadow-[0_4px_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="text-white w-4 h-4 stroke-[2.5]" />
            <span className="font-black text-sm tracking-wider text-white drop-shadow-xs">ĐẶT HÀNG NGAY</span>
          </button>

          <button
            onClick={() => (onOpenLookup ? onOpenLookup() : null)}
            className="rounded-full px-8 py-3.5 dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 dark:border-amber-500/70 dark:hover:border-amber-400 dark:text-white bg-white hover:bg-stone-100 border-2 border-amber-600/70 text-stone-900 shadow-md backdrop-blur-md flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Search className="dark:text-amber-400 text-amber-600 w-4 h-4 stroke-[2.5]" />
            <span className="font-black text-sm tracking-wider dark:text-white text-stone-900 drop-shadow-xs">TRA CỨU ĐƠN HÀNG</span>
          </button>
        </div>

        {/* 2 Rounded-2xl Glassmorphism Feature Cards (2-Column Grid Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto mt-8 text-left">
          {/* Card 1: Hỗ Trợ Ship */}
          <div className="rounded-2xl dark:bg-neutral-900/70 bg-white/90 border dark:border-neutral-800/90 border-stone-200/90 backdrop-blur-md p-6 dark:hover:border-amber-500/40 hover:border-amber-500/50 dark:hover:bg-neutral-900/90 hover:bg-white shadow-sm transition-all duration-300 flex items-center gap-4 sm:gap-5">
            <div className="dark:bg-amber-500/10 bg-amber-500/15 p-3.5 rounded-xl border dark:border-amber-500/20 border-amber-500/30 shrink-0">
              <Gift className="dark:text-amber-400 text-amber-600 stroke-[2] w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold dark:text-white text-stone-900 text-base tracking-[0.02em] [word-spacing:0.12em]">
                {card1Title}
              </h3>
              <p className="text-[13px] dark:text-neutral-400 text-stone-600 mt-1 font-normal leading-relaxed tracking-[0.01em]">
                {card1Desc}
              </p>
            </div>
          </div>

          {/* Card 2: Giao Hỏa Tốc */}
          <div className="rounded-2xl dark:bg-neutral-900/70 bg-white/90 border dark:border-neutral-800/90 border-stone-200/90 backdrop-blur-md p-6 dark:hover:border-amber-500/40 hover:border-amber-500/50 dark:hover:bg-neutral-900/90 hover:bg-white shadow-sm transition-all duration-300 flex items-center gap-4 sm:gap-5">
            <div className="dark:bg-amber-500/10 bg-amber-500/15 p-3.5 rounded-xl border dark:border-amber-500/20 border-amber-500/30 shrink-0">
              <Zap className="dark:text-amber-400 text-amber-600 stroke-[2] w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold dark:text-white text-stone-900 text-base tracking-[0.02em] [word-spacing:0.12em]">
                {card2Title}
              </h3>
              <p className="text-[13px] dark:text-neutral-400 text-stone-600 mt-1 font-normal leading-relaxed tracking-[0.01em]">
                {card2Desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
