'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Store, Calendar, Menu, Bell, Check, X, ArrowRight, ShoppingBag, 
  AlertTriangle, Clock, DollarSign, Volume2, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { 
  getNotifications, addNotification, markAllNotificationsRead, 
  markNotificationRead, playBeep, SystemNotification 
} from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
}

export default function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Notifications State
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'ALL' | 'ORDER' | 'STOCK_EXPIRY' | 'SHIFT'>('ALL');
  
  // Floating Toast State
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync Notifications from store wrapped in useCallback
  const syncNotifs = useCallback(() => {
    try {
      const notifs = getNotifications();
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (e) {
      setNotifications([]);
    }
  }, []);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialPollRef = useRef<boolean>(true);

  // Load Notifications & Listen to Cross-Tab & Internal Order Events
  useEffect(() => {
    let isMounted = true;
    syncNotifs();

    // Bulletproof Cloud Polling Engine (Every 3 Seconds)
    const pollCloudOrders = async () => {
      try {
        const res = await fetch('/api/orders?limit=10', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;

        const data = await res.json();
        if (!isMounted || !data || !data.success || !Array.isArray(data.orders)) return;

        const cloudOrders = data.orders;
        let hasNewIncomingOrder = false;
        let latestNewOrder: any = null;

        cloudOrders.forEach((o: any) => {
          const oId = o.id || o.order_code;
          if (oId) {
            if (!knownOrderIdsRef.current.has(oId)) {
              knownOrderIdsRef.current.add(oId);
              if (!isInitialPollRef.current) {
                hasNewIncomingOrder = true;
                latestNewOrder = o;
              }
            }
          }
        });

        // If initial load completed, store known order IDs
        if (isInitialPollRef.current) {
          isInitialPollRef.current = false;
        }

        // Sync cloud orders & notifications into localStorage safely
        if (data.orders.length > 0) {
          try {
            const currentLocal = JSON.parse(localStorage.getItem('pos_orders_data') || '[]');
            const mergedMap = new Map();
            data.orders.forEach((o: any) => mergedMap.set(o.id || o.order_code, o));
            currentLocal.forEach((o: any) => {
              const idKey = o.id || o.order_code;
              if (!mergedMap.has(idKey)) mergedMap.set(idKey, o);
            });
            const mergedArr = Array.from(mergedMap.values());
            localStorage.setItem('pos_orders_data', JSON.stringify(mergedArr));
          } catch (e) {}
        }

        if (Array.isArray(data.notifications) && data.notifications.length > 0) {
          try {
            localStorage.setItem('pos_notifications_data', JSON.stringify(data.notifications));
            if (isMounted) setNotifications(data.notifications);
          } catch (e) {}
        }

        // Trigger Alert & Toast if a new order arrived from cloud
        if (hasNewIncomingOrder && latestNewOrder && isMounted) {
          playBeep();
          setIsShaking(true);
          setTimeout(() => { if (isMounted) setIsShaking(false); }, 1200);

          const custName = latestNewOrder.customerName || latestNewOrder.customer_name || 'Khách Vãng Lai';
          const code = latestNewOrder.order_code || latestNewOrder.code || latestNewOrder.id || '';
          const totalStr = Number(latestNewOrder.totalAmount || latestNewOrder.final_amount || 0).toLocaleString('vi-VN');

          const toastNotif: SystemNotification = {
            id: `toast-${Date.now()}`,
            type: 'ORDER',
            title: `🍗 ĐƠN MỚI TỪ WEB! Khách ${custName}`,
            message: `Đơn #${code} (${totalStr}đ) - Tự động cập nhật vào Bảng Quản Lý Đơn.`,
            timestamp: 'Vừa xong',
            read: false,
            link: '/admin/orders',
            actionText: 'Xem đơn'
          };
          setActiveToast(toastNotif);
          setTimeout(() => { if (isMounted) setActiveToast(null); }, 6000);

          window.dispatchEvent(new Event('gum_store_update'));
          window.dispatchEvent(new CustomEvent('new_order_event', { detail: latestNewOrder }));
        }
      } catch (err) {
        console.warn('Polling silent bypass:', err);
      }
    };

    pollCloudOrders();
    const intervalId = setInterval(pollCloudOrders, 3000);

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'pos_notify_ping' ||
        e.key === 'pos_notifications_data' ||
        e.key === 'pos_new_order_event' ||
        e.key === 'pos_orders_data' ||
        e.key === 'gum_smart_notifications_v3'
      ) {
        syncNotifs();
        playBeep();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 1200);

        let orderInfo;
        try {
          if (e.key === 'pos_new_order_event' && e.newValue) {
            orderInfo = JSON.parse(e.newValue);
          }
        } catch (err) {}

        const custName = orderInfo?.customerName || orderInfo?.customer_name || 'Khách';
        const code = orderInfo?.orderCode || orderInfo?.order_code || orderInfo?.id || '';

        const toastNotif: SystemNotification = {
          id: `toast-${Date.now()}`,
          type: 'ORDER',
          title: `🔔 ĐƠN HÀNG MỚI! Khách ${custName} vừa đặt món`,
          message: `Đơn #${code} - Tự động cập nhật vào Quản lý đơn.`,
          timestamp: 'Vừa xong',
          read: false,
          link: '/admin/orders',
          actionText: 'Xem đơn'
        };
        setActiveToast(toastNotif);
        setTimeout(() => setActiveToast(null), 6000);
      }
    };

    const handleCustomNotif = (e: Event) => {
      syncNotifs();
      playBeep();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 1200);

      const detail = (e as CustomEvent).detail;
      if (detail) {
        const custName = detail.customerName || detail.customer_name || 'Khách';
        const code = detail.orderCode || detail.order_code || detail.id || '';
        const toastNotif: SystemNotification = {
          id: `toast-${Date.now()}`,
          type: 'ORDER',
          title: `🔔 ĐƠN HÀNG MỚI! Khách ${custName} vừa đặt món`,
          message: detail.message || (detail as any).content || `Đơn #${code} - Tự động cập nhật vào Quản lý đơn.`,
          timestamp: 'Vừa xong',
          read: false,
          link: '/admin/orders',
          actionText: 'Xem đơn'
        };
        setActiveToast(toastNotif);
        setTimeout(() => setActiveToast(null), 6000);
      }
    };

    // Supabase Realtime Notification Subscription
    const notifSubscription = supabase
      .channel('realtime_notifications_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new) {
            const newNotif = payload.new;
            const formattedNotif: SystemNotification = {
              id: newNotif.id || `notif_${Date.now()}`,
              type: (newNotif.type || 'ORDER').toUpperCase() as any,
              title: newNotif.title || 'Thông báo mới',
              message: newNotif.content || newNotif.message || '',
              timestamp: newNotif.created_at ? 'Vừa xong' : 'Vừa xong',
              read: false,
              link: newNotif.link || '/admin/orders',
              actionText: 'Xem đơn'
            };

            if (isMounted) {
              setNotifications(prev => [formattedNotif, ...(Array.isArray(prev) ? prev : [])]);
              playBeep();
              setIsShaking(true);
              setTimeout(() => { if (isMounted) setIsShaking(false); }, 1200);

              setActiveToast(formattedNotif);
              setTimeout(() => { if (isMounted) setActiveToast(null); }, 6000);

              window.dispatchEvent(new Event('gum_store_update'));
            }
          }
        }
      )
      .subscribe();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pos_notify_event', handleCustomNotif);
    window.addEventListener('new_order_event', handleCustomNotif);
    window.addEventListener('new_order_placed', handleCustomNotif);
    window.addEventListener('gum_store_update', syncNotifs);

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(notifSubscription);
      } catch (e) {}
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pos_notify_event', handleCustomNotif);
      window.removeEventListener('new_order_event', handleCustomNotif);
      window.removeEventListener('new_order_placed', handleCustomNotif);
      window.removeEventListener('gum_store_update', syncNotifs);
    };
  }, [syncNotifs]);

  // Backdrop click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = useMemo(() => {
    return (notifications || []).filter(n => !(n.read || (n as any).isRead)).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return (notifications || []).filter(n => {
      const t = (n.type || '').toString().toUpperCase();
      if (activeNotifTab === 'ORDER') return t === 'ORDER';
      if (activeNotifTab === 'STOCK_EXPIRY') return t === 'STOCK_EXPIRY' || t === 'INVENTORY';
      if (activeNotifTab === 'SHIFT') return t === 'SHIFT';
      return true;
    });
  }, [notifications, activeNotifTab]);

  // Mark all read
  const handleMarkAllRead = () => {
    const updated = markAllNotificationsRead();
    setNotifications(updated);
  };

  // Click single notification
  const handleNotificationClick = (notif: SystemNotification) => {
    const updated = markNotificationRead(notif.id);
    setNotifications(updated);
    setDropdownOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Fast Trigger Test Notification ("Thử chuông" button)
  const handleTriggerTestNotification = () => {
    playBeep();

    const sampleOrders = [
      { id: 'OD9718', customerName: 'Anh Đức (Hà Nội)', summaryText: '2 Gà Ủ Muối Nguyên Con + 3 Trà Tắc', totalAmount: 440000 },
      { id: 'OD9719', customerName: 'Chị Mai (Cầu Giấy)', summaryText: '1 Chân Gà Sốt Thái + 2 Trà Đào', totalAmount: 115000 },
      { id: 'OD9720', customerName: 'Anh Tuấn (TP.HCM)', summaryText: '3 Cánh Gà Ủ Muối + 1 Nước Chấm', totalAmount: 270000 }
    ];

    const sample = sampleOrders[Math.floor(Math.random() * sampleOrders.length)];

    const created = addNotification({
      type: 'ORDER',
      title: `🍗 Đơn hàng mới #${sample.id}`,
      message: `Khách ${sample.customerName} vừa đặt ${sample.summaryText} - ${Number(sample.totalAmount).toLocaleString('vi-VN')} đ`,
      link: '/admin/orders',
      actionText: 'Xem đơn'
    });

    syncNotifs();
    setDropdownOpen(true);

    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 1200);

    setActiveToast(created);
    setTimeout(() => setActiveToast(null), 5000);
  };

  const getBreadcrumbTitle = () => {
    if (pathname === '/') return 'Trang Chủ Hệ Thống';
    if (pathname.startsWith('/admin/analytics')) return 'Báo Cáo GMV & Lợi Nhuận';
    if (pathname.startsWith('/admin/orders')) return 'Quản Lý Đơn Hàng Tập Trung';
    if (pathname.startsWith('/admin/create-order')) return 'Tổng Đài Lên Đơn AI Parser';
    if (pathname.startsWith('/admin/customers')) return 'Danh Bạ Khách Hàng CRM';
    if (pathname.startsWith('/admin/inventory/import')) return 'Quản Lý Nhập Kho';
    if (pathname.startsWith('/admin/inventory/export')) return 'Xuất Kho & Điều Chuyển';
    if (pathname.startsWith('/admin/inventory')) return 'Quản Lý Kho Nguyên Liệu';
    if (pathname.startsWith('/admin/products')) return 'Quản Lý Thực Đơn & HSD';
    if (pathname.startsWith('/admin/branches')) return 'Trung Tâm Điều Phối Chi Nhánh';
    if (pathname.startsWith('/admin/shifts')) return 'Quản Lý Ca Làm Việc & Két Tiền';
    if (pathname.startsWith('/admin/expenses')) return 'Quản Lý Chi Tiêu & Sổ Quỹ';
    if (pathname.startsWith('/admin/users')) return 'Quản Lý Nhân Sự & Phân Quyền';
    if (pathname.startsWith('/branch')) return 'Dashboard Điều Phối Chi Nhánh';
    if (pathname.startsWith('/track')) return 'Tra Cứu Đơn Hàng Cho Khách';
    if (pathname.startsWith('/login')) return 'Cổng Đăng Nhập Nội Bộ';
    return 'Gà Ủ Muối Smart';
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-orange-600" />;
      case 'STOCK_EXPIRY':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'SHIFT':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'EXPENSE':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        
        {/* Left: Mobile Hamburger & Breadcrumb */}
        <div className="flex items-center space-x-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              aria-label="Mở Menu"
            >
              <Menu className="w-5 h-5 text-orange-600" />
            </button>
          )}

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <Store className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="hidden sm:inline">/</span>
            <span className="text-slate-900 font-extrabold truncate max-w-[180px] sm:max-w-none">
              {getBreadcrumbTitle()}
            </span>
          </div>
        </div>

        {/* Right Controls: Test Trigger Button + Date + Bell Notification Center + Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-medium text-slate-600">
          
          {/* Test Trigger Sound & Toast Button */}
          <button
            type="button"
            onClick={handleTriggerTestNotification}
            className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-2xs transition cursor-pointer"
            title="Bấm để phát âm thanh chuông ting-ting & thử nghiệm popup thông báo mới"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Thử chuông</span>
          </button>

          {/* Date Display */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
          </div>

          {/* REALTIME NOTIFICATION BELL CENTER */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`p-2 rounded-xl border transition cursor-pointer relative ${
                dropdownOpen 
                  ? 'bg-orange-50 border-orange-300 text-orange-600' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              } ${isShaking ? 'animate-bounce text-orange-600' : ''}`}
              aria-label="Thông báo hệ thống"
            >
              <Bell className="w-4 h-4" />
              
              {/* Unread Count Red Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN MENU */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-[360px] sm:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Dropdown Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <h3 className="font-extrabold text-sm text-slate-900">Thông Báo Hệ Thống</h3>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.2 rounded-full border border-rose-200">
                        {unreadCount} chưa đọc
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                {/* Sub-Filter Tabs inside Dropdown */}
                <div className="flex items-center space-x-1 p-2 bg-slate-100/60 border-b border-slate-100 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveNotifTab('ALL')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeNotifTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotifTab('ORDER')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeNotifTab === 'ORDER' ? 'bg-white text-orange-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đơn hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotifTab('STOCK_EXPIRY')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeNotifTab === 'STOCK_EXPIRY' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kho &amp; HSD
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotifTab('SHIFT')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      activeNotifTab === 'SHIFT' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ca làm
                  </button>
                </div>

                {/* Notifications Item List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      Không có thông báo nào trong mục này.
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 transition cursor-pointer flex items-start space-x-3 ${
                          notif.read ? 'bg-white hover:bg-slate-50' : 'bg-orange-50/40 hover:bg-orange-50/70 font-semibold'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`p-2 rounded-xl border shrink-0 ${
                          notif.type === 'ORDER' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          notif.type === 'STOCK_EXPIRY' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          notif.type === 'SHIFT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {getNotifIcon(notif.type)}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span className="truncate">{notif.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-2 shrink-0">{notif.timestamp}</span>
                          </div>

                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 font-normal">
                            {notif.message}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1">
                            {notif.actionText && (
                              <span className="text-[11px] text-sky-600 font-bold flex items-center gap-1 hover:underline">
                                <span>{notif.actionText}</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            )}

                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 ml-auto" title="Chưa đọc" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Dropdown Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push('/admin/orders');
                    }}
                    className="text-xs text-slate-700 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                  >
                    Xem tất cả đơn hàng &amp; hoạt động &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* POS Status Badge */}
          <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
            <span className="hidden sm:inline">POS System</span> Active
          </div>
        </div>
      </header>

      {/* FLOATING TOAST POPUP ALERT (Bottom Right / Top Right) */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white border-2 border-orange-400 rounded-2xl shadow-2xl p-4 space-y-2 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
                {getNotifIcon(activeToast.type)}
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">{activeToast.title}</h4>
                <span className="text-[10px] text-slate-400 font-semibold">{activeToast.timestamp}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-700 font-medium pl-1">
            {activeToast.message}
          </p>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleNotificationClick(activeToast)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
            >
              <span>{activeToast.actionText || 'Xem chi tiết'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
