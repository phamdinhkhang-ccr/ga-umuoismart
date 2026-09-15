'use client';

import Link from 'next/link';
import { ShoppingBag, Search, PhoneCall, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenLookup: () => void;
  onScrollToSection?: (id: string) => void;
  storeName?: string;
  hotline?: string;
  logoText1?: string;
  logoText2?: string;
}

export default function Header({
  cartCount,
  onOpenCart,
  onOpenLookup,
  onScrollToSection,
  storeName = 'GÀ Ủ MUỐI SMART',
  hotline = '0988.888.999',
  logoText1 = 'GÀ Ủ MUỐI',
  logoText2 = 'SMART',
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 dark:bg-neutral-950/85 bg-white/90 backdrop-blur-md border-b dark:border-neutral-800/80 border-stone-200/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between gap-6">
        {/* 1. Brand Logo & Monogram Emblem (Single Line Layout) */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          {/* Emblem Monogram */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border dark:border-amber-500/40 border-amber-600/30 dark:bg-neutral-900/80 bg-stone-100 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-center p-0.5 relative shrink-0 transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full rounded-full border dark:border-amber-500/20 border-amber-500/30 bg-gradient-to-br dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 from-stone-50 via-stone-100 to-stone-200 flex items-center justify-center">
              <span className="font-black dark:text-amber-400 text-amber-600 text-xs sm:text-sm tracking-tighter drop-shadow-xs">
                GS
              </span>
            </div>
          </div>

          {/* Brand Name on 1 Single Line */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="dark:text-neutral-100 text-stone-900 font-extrabold tracking-wide text-lg sm:text-xl">
              {logoText1}
            </span>
            <span className="dark:text-amber-400 text-amber-600 font-black tracking-wider text-lg sm:text-xl">
              {logoText2}
            </span>
          </div>
        </div>

        {/* 2. Floating Navbar Dock (Nav Items with Vertical Dividers) */}
        <nav className="hidden lg:flex items-center dark:bg-neutral-900/70 bg-stone-100/90 border dark:border-neutral-800/80 border-stone-200/80 rounded-full px-2.5 py-1.5 backdrop-blur-md shadow-sm shrink-0">
          <button
            onClick={() => onScrollToSection?.('menu')}
            className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium dark:text-neutral-300 text-stone-700 dark:hover:text-amber-300 hover:text-amber-600 dark:hover:bg-neutral-800/90 hover:bg-white hover:shadow-xs transition-all duration-300 relative whitespace-nowrap"
          >
            Thực Đơn Tinh Hoa
          </button>

          {/* Divider 1 */}
          <div className="w-[1px] h-3.5 dark:bg-neutral-700/80 bg-stone-300 mx-1 shrink-0" />

          <button
            onClick={() => onScrollToSection?.('story')}
            className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium dark:text-neutral-300 text-stone-700 dark:hover:text-amber-300 hover:text-amber-600 dark:hover:bg-neutral-800/90 hover:bg-white hover:shadow-xs transition-all duration-300 relative whitespace-nowrap"
          >
            Câu Chuyện Vị Giác
          </button>

          {/* Divider 2 */}
          <div className="w-[1px] h-3.5 dark:bg-neutral-700/80 bg-stone-300 mx-1 shrink-0" />

          <button
            onClick={onOpenLookup}
            className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium dark:text-neutral-300 text-stone-700 dark:hover:text-amber-300 hover:text-amber-600 dark:hover:bg-neutral-800/90 hover:bg-white hover:shadow-xs transition-all duration-300 relative flex items-center gap-1.5 whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600 stroke-[1.75]" />
            <span>Tra Cứu Đơn</span>
          </button>

          {/* Divider 3 */}
          <div className="w-[1px] h-3.5 dark:bg-neutral-700/80 bg-stone-300 mx-1 shrink-0" />

          <button
            onClick={() => onScrollToSection?.('locations')}
            className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium dark:text-neutral-300 text-stone-700 dark:hover:text-amber-300 hover:text-amber-600 dark:hover:bg-neutral-800/90 hover:bg-white hover:shadow-xs transition-all duration-300 relative whitespace-nowrap"
          >
            Hệ Thống Cơ Sở
          </button>
        </nav>

        {/* 3. Action Controls & Cart CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <a
            href={`tel:${hotline}`}
            className="hidden md:flex items-center gap-2 text-xs font-medium dark:text-neutral-300 text-stone-700 dark:bg-neutral-900/60 bg-stone-100/80 dark:hover:bg-neutral-800 hover:bg-stone-200 dark:hover:border-amber-500/40 hover:border-amber-500/40 px-4 py-2 rounded-full border dark:border-neutral-800 border-stone-300 transition-all duration-200 whitespace-nowrap"
          >
            <PhoneCall className="w-3.5 h-3.5 dark:text-amber-400 text-amber-600 stroke-[1.75]" />
            <span className="tracking-wider">Hotline: {hotline}</span>
          </a>

          {/* Mobile Lookup Search Button */}
          <button
            onClick={onOpenLookup}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full dark:bg-neutral-900 bg-stone-100 border dark:border-neutral-800 border-stone-300 dark:text-amber-400 text-amber-600 dark:hover:bg-neutral-800 hover:bg-stone-200 transition-colors"
            title="Tra cứu đơn hàng"
          >
            <Search className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Cart CTA Pill */}
          <button
            onClick={onOpenCart}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-4 sm:px-5 py-2.5 rounded-full shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:brightness-110 transition-all flex items-center gap-2 text-xs sm:text-sm tracking-wide whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            <span>Giỏ Hàng</span>
            {cartCount > 0 && (
              <span className="bg-neutral-950 text-amber-400 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-amber-400/50">
                {cartCount}
              </span>
            )}
          </button>

          {/* Internal Login Button Pill */}
          <Link
            href="/login"
            title="Đăng nhập nội bộ"
            className="p-2.5 rounded-full border dark:border-neutral-800 border-stone-300 dark:bg-neutral-900/60 bg-white/90 dark:hover:bg-neutral-800 hover:bg-stone-100 dark:text-neutral-300 text-stone-700 shadow-xs transition-all backdrop-blur-md group flex items-center justify-center shrink-0"
          >
            <User className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 transition-colors stroke-[1.75]" />
          </Link>

          {/* Theme Toggle Button */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

