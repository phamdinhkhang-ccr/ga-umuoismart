'use client';

interface HeroSectionProps {
  storeSettings?: any;
  onOpenOrderModal?: () => void;
}

export default function HeroSection({ storeSettings, onOpenOrderModal }: HeroSectionProps) {
  const bannerSrc = 
    storeSettings?.banner_url || 
    storeSettings?.hero_banner || 
    storeSettings?.hero_image || 
    storeSettings?.hero_banner_image || 
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';

  const defaultFallback = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-slate-50 pt-10 pb-16 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
        
        {/* Banner Hero Image */}
        <div className="relative w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90 aspect-[4/3] bg-orange-100">
          <img
            src={bannerSrc}
            alt="Banner Gà Ủ Muối Smart"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultFallback;
            }}
          />
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          {storeSettings?.hero_title || storeSettings?.brand_name || 'Gà Ủ Muối Smart'}
        </h1>

        {/* Slogan */}
        <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-600 leading-relaxed font-medium">
          {storeSettings?.hero_slogan || storeSettings?.slogan || 'Đặc Sản Da Giòn Sần Sật • Giao Hỏa Tốc 20-30 Phút'}
        </p>

        {/* CTA Button */}
        {onOpenOrderModal && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={onOpenOrderModal}
              className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center gap-2"
            >
              <span className="text-xl">🍗</span>
              <span>Đặt Hàng Ngay</span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
