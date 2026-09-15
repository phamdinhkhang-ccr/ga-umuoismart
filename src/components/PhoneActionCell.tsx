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

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 1500);
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

      {/* Line 2: Phone + Copy Button (Aligned vertically with Address line) */}
      {phone ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400 font-mono">
          <div className="flex items-center gap-1.5 w-[145px]">
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
