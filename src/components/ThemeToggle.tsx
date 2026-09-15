'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full border border-neutral-800/80 bg-neutral-900/60 p-2 shrink-0" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Chuyển sang chế độ Giao diện Sáng (Warm Alabaster)' : 'Chuyển sang chế độ Giao diện Tối (Dark Luxury)'}
      aria-label="Toggle theme"
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 transition-transform duration-500 hover:rotate-45 cursor-pointer backdrop-blur-md shrink-0 ${
        isDark
          ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-amber-400'
          : 'border-stone-300 bg-white/90 hover:bg-stone-100 text-stone-700 shadow-sm'
      }`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 stroke-[1.75]" />
      ) : (
        <Moon className="w-4 h-4 text-stone-700 stroke-[1.75]" />
      )}
    </button>
  );
}
