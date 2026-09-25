'use client';

import React, { useState } from 'react';
import { Phone, Copy, Check, MapPin, ExternalLink } from 'lucide-react';

interface PhoneActionCellProps {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  className?: string;
  showName?: boolean;
  showAddress?: boolean;
}

export default function PhoneActionCell({
  name,
  phone,
  address,
  className = '',
  showName = true,
  showAddress = true,
}: PhoneActionCellProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [openedZalo, setOpenedZalo] = useState(false);

  const normalizePhone = (p?: string | null) => {
    if (!p) return '';
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('84') && clean.length > 9) {
      clean = '0' + clean.slice(2);
    }
    return clean;
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    const clean = normalizePhone(phone);
    navigator.clipboard.writeText(clean || phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 1500);
  };

  const handleOpenZalo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    const clean = normalizePhone(phone);
    if (!clean) return;
    navigator.clipboard.writeText(clean);
    setOpenedZalo(true);
    setTimeout(() => setOpenedZalo(false), 2000);
    window.open(`https://zalo.me/${clean}`, '_blank');
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1500);
  };

  return (
    <div className={`flex flex-col gap-1 items-start text-xs ${className}`}>
      {/* Line 1: Customer Name */}
      {showName && (
        <span className="font-semibold dark:text-white text-stone-900 tracking-wide block leading-tight text-xs sm:text-sm">
          {name || 'Khách Hàng'}
        </span>
      )}

      {/* Line 2: Phone + Copy Button + Zalo Quick Button */}
      {phone ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400 font-mono">
          <div className="flex items-center gap-1.5 w-[140px]">
            <Phone className="shrink-0" size={13} />
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-medium hover:underline truncate"
              title="Bấm để gọi ngay"
            >
              {phone}
            </a>
          </div>
          <button
            type="button"
            onClick={handleCopyPhone}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Sao chép số điện thoại"
          >
            {copiedPhone ? (
              <Check className="text-emerald-500 dark:text-emerald-400" size={13} />
            ) : (
              <Copy size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={handleOpenZalo}
            className="px-1.5 py-0.5 rounded bg-blue-600/15 hover:bg-blue-600/30 text-blue-500 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer shrink-0"
            title="Tìm Zalo & Tự động copy SĐT"
          >
            <span>💬</span>
            <span>{openedZalo ? 'Đang mở' : 'Zalo'}</span>
          </button>
        </div>
      ) : (
        <span className="text-neutral-500 text-xs italic">Chưa có SĐT</span>
      )}

      {/* Line 3: Delivery Address + Copy Button (Aligned perfectly with Phone Copy button) */}
      {showAddress && (
        address ? (
          <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-400 text-stone-600 text-xs">
            <div className="flex items-center gap-1.5 w-[145px]">
              <MapPin className="text-amber-500 shrink-0" size={13} />
              <span
                className="truncate hover:text-stone-900 dark:hover:text-neutral-200 transition-colors cursor-pointer font-normal text-[11px]"
                title={address}
                onClick={handleCopyAddress}
              >
                {address}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Sao chép địa chỉ nhận hàng"
            >
              {copiedAddress ? (
                <Check className="text-emerald-500 dark:text-emerald-400" size={13} />
              ) : (
                <Copy size={13} />
              )}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer shrink-0"
              title="Mở Google Maps kiểm tra vị trí & tuyến đường"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <span className="text-neutral-500 italic text-[10px]">Mua tại quầy / Không địa chỉ</span>
        )
      )}
    </div>
  );
}
