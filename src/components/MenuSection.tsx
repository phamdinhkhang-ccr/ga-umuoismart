'use client';

import React, { useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  type?: 'SINGLE' | 'COMBO' | string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  isBestSeller?: boolean;
  categoryId?: string | null;
  category?: Category;
}

interface MenuSectionProps {
  categories?: Category[];
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function MenuSection({ categories = [], products, onAddToCart }: MenuSectionProps) {
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'COMBO' | 'SINGLE'>('ALL');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const filteredProducts =
    selectedTab === 'ALL'
      ? products
      : selectedTab === 'COMBO'
      ? products.filter((p) => p.type === 'COMBO')
      : products.filter((p) => p.type !== 'COMBO');

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  const comboCount = products.filter((p) => p.type === 'COMBO').length;
  const singleCount = products.filter((p) => p.type !== 'COMBO').length;

  return (
    <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Section Header */}
      <div className="flex flex-col items-center justify-center mb-10 select-none">
        {/* Chữ MENU phát sáng cố định */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.9)] [text-shadow:_0_0_25px_rgba(251,191,36,0.85),_0_0_45px_rgba(245,158,11,0.5)] uppercase">
          MENU
        </h2>

        {/* Thanh gạch dưới phát sáng */}
        <div className="w-16 h-1 mt-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
      </div>

      {/* Menu Tabs: Combo vs Single Products */}
      <div className="flex items-center overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2.5 sm:gap-3 my-8 p-1.5 scrollbar-none pb-3 sm:pb-0">
        {/* All Món Tab */}
        <button
          onClick={() => setSelectedTab('ALL')}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedTab === 'ALL'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold shadow-[0_4px_18px_rgba(245,158,11,0.35)] scale-[1.03]'
              : 'dark:bg-neutral-900/80 bg-white border dark:border-neutral-700/80 border-stone-300 dark:hover:bg-neutral-800 hover:bg-stone-100 dark:text-neutral-200 text-stone-800 hover:text-amber-600 shadow-xs'
          }`}
        >
          <span>Tất Cả Món</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              selectedTab === 'ALL'
                ? 'bg-neutral-950/25 text-neutral-950'
                : 'dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {products.length}
          </span>
        </button>

        {/* Tab 1: Combo Ưu Đãi */}
        <button
          onClick={() => setSelectedTab('COMBO')}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedTab === 'COMBO'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold shadow-[0_4px_18px_rgba(168,85,247,0.35)] scale-[1.03]'
              : 'dark:bg-neutral-900/80 bg-white border dark:border-neutral-700/80 border-stone-300 dark:hover:bg-neutral-800 hover:bg-stone-100 dark:text-neutral-200 text-stone-800 hover:text-purple-400 shadow-xs'
          }`}
        >
          <span>🍱 Combo Ưu Đãi</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              selectedTab === 'COMBO'
                ? 'bg-white/20 text-white'
                : 'dark:bg-neutral-800 dark:text-purple-300 dark:border-purple-500/30 bg-stone-100 text-purple-700 border border-stone-200'
            }`}
          >
            {comboCount}
          </span>
        </button>

        {/* Tab 2: Món Lẻ & Đồ Ăn Kèm */}
        <button
          onClick={() => setSelectedTab('SINGLE')}
          className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedTab === 'SINGLE'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold shadow-[0_4px_18px_rgba(245,158,11,0.35)] scale-[1.03]'
              : 'dark:bg-neutral-900/80 bg-white border dark:border-neutral-700/80 border-stone-300 dark:hover:bg-neutral-800 hover:bg-stone-100 dark:text-neutral-200 text-stone-800 hover:text-amber-600 shadow-xs'
          }`}
        >
          <span>🍗 Món Lẻ & Đồ Ăn Kèm</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              selectedTab === 'SINGLE'
                ? 'bg-neutral-950/25 text-neutral-950'
                : 'dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {singleCount}
          </span>
        </button>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {filteredProducts.map((product) => {
          const isJustAdded = addedIds[product.id];
          return (
            <div
              key={product.id}
              className="group dark:bg-[#14171D] bg-white rounded-2xl border dark:border-neutral-800/80 border-stone-200/90 shadow-xs dark:hover:border-amber-500/50 hover:border-amber-500/60 dark:hover:shadow-[0_8px_30px_rgba(217,119,6,0.12)] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image Showcase */}
                <div className="relative h-60 w-full overflow-hidden dark:bg-neutral-900 bg-stone-100">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t dark:from-neutral-950 from-stone-900/60 via-transparent to-black/20 opacity-80" />

                  {/* Best Seller Badge */}
                  {product.isBestSeller && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-md tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-neutral-950 text-neutral-950" />
                      <span>Best Seller</span>
                    </div>
                  )}

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4 bg-neutral-950/90 backdrop-blur border border-amber-500/40 text-amber-300 text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-lg tracking-wide">
                    {product.price.toLocaleString('vi-VN')} đ
                  </div>

                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center text-neutral-300 font-bold text-sm tracking-widest uppercase">
                      Tạm Hết Hàng
                    </div>
                  )}
                </div>

                {/* Product Content */}
                <div className="p-6 space-y-2">
                  <span className="text-[10px] font-bold dark:text-amber-500/90 text-amber-600 uppercase tracking-widest block">
                    {product.category?.name || 'Đặc Sản'}
                  </span>
                  <h3 className="font-extrabold dark:text-[#FAFAF9] text-stone-900 text-base tracking-tight group-hover:text-amber-600 transition-colors duration-200 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs dark:text-neutral-400 text-stone-600 font-normal leading-relaxed line-clamp-2">
                    {product.description || 'Gà ủ muối thảo mộc tự nhiên, da giòn sần sật đậm đà chuẩn vị.'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-6 pt-0">
                <button
                  disabled={!product.isAvailable}
                  onClick={() => handleAdd(product)}
                  className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
                    isJustAdded
                      ? 'bg-emerald-600 text-white'
                      : product.isAvailable
                      ? 'dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-gradient-to-r dark:hover:from-amber-400 dark:hover:to-amber-500 dark:hover:text-neutral-950 dark:border-amber-500/30 bg-stone-50 text-stone-900 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-neutral-950 border border-stone-300 hover:border-amber-500 shadow-xs'
                      : 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                  }`}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2]" />
                      <span>Đã Thêm Vào Giỏ</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[1.5]" />
                      <span>Thêm Vào Giỏ Hàng</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
