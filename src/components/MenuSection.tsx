'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  description?: string;
  is_best_seller?: boolean;
}

interface MenuSectionProps {
  onSelectProduct?: (product: ProductItem) => void;
}

export default function MenuSection({ onSelectProduct }: MenuSectionProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        if (!error && Array.isArray(data)) {
          setProducts(data);
        }
      } catch (err) {
        console.error('Lỗi nạp menu từ Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  return (
    <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900">Menu Gà Smart</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <p className="text-slate-500 font-bold text-sm">Đang tải thực đơn...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
          <p className="text-slate-500 font-bold text-sm">Thực đơn đang được cập nhật...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((item) => {
            const priceFormatted = Number(item.price || 0).toLocaleString('vi-VN') + 'đ';
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="w-full h-44 bg-amber-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 shadow-2xs">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallbackEl = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallbackEl) fallbackEl.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-4xl ${item.image_url ? 'hidden' : ''}`}>
                        <div className="w-20 h-20 bg-amber-100/90 rounded-2xl flex items-center justify-center">
                          <span className="text-4xl">🍗</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Giá bán</span>
                    <span className="text-xl font-bold text-orange-600">
                      {priceFormatted}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProduct && onSelectProduct(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all whitespace-nowrap cursor-pointer"
                  >
                    <span>Đặt Món Ngay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
