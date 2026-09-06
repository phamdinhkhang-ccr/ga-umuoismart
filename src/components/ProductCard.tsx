'use client';

import { safeFormatPrice, sanitizeProduct } from '@/lib/store';

interface ProductCardProps {
  product: any;
  handleSelectProduct?: (product: any) => void;
}

export default function ProductCard({ product, handleSelectProduct }: ProductCardProps) {
  const item = sanitizeProduct(product);

  return (
    <div className="p-4 bg-white rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-3">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';
            }}
          />
        </div>
        <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md font-semibold">
          {item.category}
        </span>
        <h3 className="font-bold text-gray-900 mt-1 text-base line-clamp-1">{item.name}</h3>
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
          onClick={() => handleSelectProduct?.(item)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Đặt Món Ngay
        </button>
      </div>
    </div>
  );
}
