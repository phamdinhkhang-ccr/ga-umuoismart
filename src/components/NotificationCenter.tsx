'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  Volume2,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  CheckCheck,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: 'ORDER' | 'EXPIRY' | 'CRM';
  title: string;
  detail: string;
  targetUrl: string;
  createdAt: string;
  isRead?: boolean;
}

export default function NotificationCenter() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDER' | 'EXPIRY' | 'CRM'>('ALL');
  const [loading, setLoading] = useState(true);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Load readIds from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pos_read_notifications');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save readIds to localStorage
  const saveReadIds = (newReadIds: string[]) => {
    setReadIds(newReadIds);
    try {
      localStorage.setItem('pos_read_notifications', JSON.stringify(newReadIds));
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Notifications API
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + Polling every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Outside Click to Close Popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Play Sound Test ("Ting" Web Audio API Chime)
  const playSoundTest = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6 note

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  // Compute Unread Items
  const unreadItems = notifications.filter((n) => !readIds.includes(n.id));
  const unreadCount = unreadItems.length;

  // Filter Items by Selected Tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    return n.type === activeTab;
  });

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const combined = Array.from(new Set([...readIds, ...allIds]));
    saveReadIds(combined);
  };

  // Handle Click Single Notification
  const handleNotificationClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      saveReadIds([...readIds, item.id]);
    }
    setIsOpen(false);
    router.push(item.targetUrl);
  };

  // Format Time Ago
  const formatTimeAgo = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return `${Math.floor(diffSec / 86400)} ngày trước`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* HEADER CONTROLS (TEST SOUND BUTTON + BELL ICON) */}
      <div className="flex items-center gap-2">
        <button
          onClick={playSoundTest}
          type="button"
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-[11px] font-semibold dark:text-amber-400 text-amber-700 transition cursor-pointer"
          title="Thử chuông thông báo quầy thu ngân"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Thử chuông</span>
        </button>

        {/* BELL ICON BUTTON */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className={`relative p-2.5 rounded-lg border transition-all cursor-pointer ${
            isOpen
              ? 'dark:bg-neutral-800 bg-stone-200 dark:border-amber-500/50 border-amber-600/50 text-amber-500'
              : 'dark:bg-neutral-900 bg-stone-100 dark:border-neutral-800 border-stone-200 dark:text-neutral-300 text-stone-700 dark:hover:text-amber-400 hover:text-amber-600'
          }`}
          title="Trung tâm thông báo"
        >
          <Bell className={`w-4 h-4 stroke-[1.75] ${unreadCount > 0 ? 'animate-bounce text-amber-400' : ''}`} />

          {/* UNREAD BADGE COUNT */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-rose-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-[#0B0D11] shadow-lg animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* DROPDOWN NOTIFICATION POPOVER */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 dark:bg-[#14171D] bg-white border dark:border-neutral-800 border-stone-200 rounded-xs shadow-2xl z-50 text-xs overflow-hidden">
          {/* POPOVER HEADER */}
          <div className="p-4 bg-[#0B0D11] dark:bg-[#0B0D11] border-b dark:border-neutral-800 border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-[#FAFAF9] text-sm tracking-tight">
                Trung Tâm Thông Báo ({unreadCount} mới)
              </h3>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* INNER FILTER TABS */}
          <div className="flex items-center gap-1 p-2 bg-[#0F1115] border-b border-neutral-800 text-[11px]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-xs font-bold transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tất cả ({notifications.length})
            </button>

            <button
              onClick={() => setActiveTab('ORDER')}
              className={`px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'ORDER'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold'
                  : 'text-neutral-400 hover:text-blue-400'
              }`}
            >
              <ShoppingBag className="w-3 h-3" /> Đơn Hàng
            </button>

            <button
              onClick={() => setActiveTab('EXPIRY')}
              className={`px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'EXPIRY'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold'
                  : 'text-neutral-400 hover:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Hạn Dùng
            </button>

            <button
              onClick={() => setActiveTab('CRM')}
              className={`px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'CRM'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-neutral-400 hover:text-purple-300'
              }`}
            >
              <UserCheck className="w-3 h-3" /> Khách Hàng
            </button>
          </div>

          {/* NOTIFICATION ITEMS LIST */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-800/80">
            {loading ? (
              <div className="p-8 text-center text-neutral-500">Đang tải thông báo...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 space-y-1">
                <Bell className="w-6 h-6 text-neutral-600 mx-auto stroke-[1.5]" />
                <p className="font-semibold text-neutral-400">Không có thông báo mới nào!</p>
                <p className="text-[11px]">Hệ thống vận hành an toàn & không có cảnh báo.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isRead = readIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                      isRead
                        ? 'bg-[#14171D] hover:bg-[#181C23] text-neutral-400 opacity-75'
                        : 'bg-[#181C23] hover:bg-[#1E232D] text-[#FAFAF9] font-medium border-l-2 border-amber-500'
                    }`}
                  >
                    {/* ICON GROUP */}
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'ORDER' ? (
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xs border border-blue-500/30">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      ) : item.type === 'EXPIRY' ? (
                        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xs border border-rose-500/30">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xs border border-purple-500/30">
                          <UserCheck className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* CONTENT DETAILS */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-xs ${isRead ? 'text-neutral-300' : 'text-amber-400'}`}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-300 leading-relaxed font-light">
                        {item.detail}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-amber-400 hover:underline flex items-center gap-1">
                          Xem chi tiết <ExternalLink className="w-3 h-3" />
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* POPOVER FOOTER */}
          <div className="p-2.5 bg-[#0B0D11] border-t border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-400">Tự động cập nhật realtime mỗi 30 giây</span>
          </div>
        </div>
      )}
    </div>
  );
}
