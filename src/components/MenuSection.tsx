'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { safeFormatPrice, sanitizeProduct } from '@/lib/store';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  description?: string;
  is_best_seller?: boolean;
  is_active?: boolean;
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
          {(products || [])
            .filter((p) => p && p.is_active !== false)
            .map(sanitizeProduct)
            .map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="w-full h-44 bg-amber-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 shadow-2xs">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md font-semibold">
                      {item.category}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition mt-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block font-medium">Giá bán</span>
                    <span className="text-xl font-bold text-orange-600">
                      {safeFormatPrice(item.price)}
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
            ))}
        </div>
      )}
    </section>
  );
}
