'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { getBranchOrders, getBranches, updateOrderStatus } from '@/actions/orders';
import { Branch, Order, OrderStatus } from '@/types/database';
import { Kanban, Bell, CheckCircle2, Clock, Truck, XCircle, ChevronRight, Phone, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

interface PageProps {
  params: { branchId?: string } | Promise<{ branchId?: string }>;
}

export default function BranchDashboardPage({ params }: PageProps) {
  const router = useRouter();

  const [activeBranchId, setActiveBranchId] = useState<string>('b1111111-1111-1111-1111-111111111111');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Safe unwrapping of Next.js dynamic params
  useEffect(() => {
    let isMounted = true;

    async function resolveParams() {
      try {
        let id: string | undefined;
        if (params && typeof (params as any).then === 'function') {
          const resolved = await (params as Promise<{ branchId?: string }>);
          id = resolved?.branchId;
        } else if (params && typeof params === 'object') {
          id = (params as { branchId?: string }).branchId;
        }

        if (isMounted && id) {
          setActiveBranchId(id);
        }
      } catch (e) {
        console.warn('Error resolving branchId params:', e);
      }
    }

    resolveParams();
    return () => { isMounted = false; };
  }, [params]);

  // Audio Player with strict browser API guard
  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio playback safely prevented:', e);
    }
  }, []);

  // Safe data loader with fallback
  const loadBranchData = useCallback(async (bId: string) => {
    setLoading(true);
    setHasError(false);

    try {
      const bList = await getBranches();
      setBranches(bList || []);

      const branch = (bList || []).find((b) => b?.id === bId) || (bList && bList[0]) || {
        id: bId,
        name: 'Chi Nhánh Gà Ủ Muối Quận 1',
        address: '123 Lê Lợi',
        district: 'Quận 1',
        city: 'Hồ Chí Minh',
        phone: '02838111111'
      };

      setCurrentBranch(branch);

      const initialOrders = await getBranchOrders(bId);
      setOrders(initialOrders || []);
    } catch (err) {
      console.error('Error loading branch dashboard:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeBranchId) {
      loadBranchData(activeBranchId);
    }
  }, [activeBranchId, loadBranchData]);

  // Supabase Realtime Listener with safety guards
  useEffect(() => {
    if (!activeBranchId || typeof window === 'undefined') return;

    let channel: any;
    try {
      channel = supabaseClient
        .channel(`orders:branch_id=eq.${activeBranchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `branch_id=eq.${activeBranchId}`,
          },
          (payload) => {
            try {
              if (payload?.eventType === 'INSERT') {
                const newOrder = payload.new as Order;
                if (newOrder) {
                  setOrders((prev) => [newOrder, ...(prev || [])]);
                  if (audioEnabled) playNotificationSound();
                }
              } else if (payload?.eventType === 'UPDATE') {
                const updatedOrder = payload.new as Order;
                if (updatedOrder) {
                  setOrders((prev) =>
                    (prev || []).map((o) => (o?.id === updatedOrder.id ? updatedOrder : o))
                  );
                }
              } else if (payload?.eventType === 'DELETE') {
                setOrders((prev) => (prev || []).filter((o) => o?.id !== payload?.old?.id));
              }
            } catch (e) {
              console.warn('Realtime event processing error:', e);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Supabase Realtime subscription error:', e);
    }

    return () => {
      if (channel) {
        try {
          supabaseClient.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [activeBranchId, audioEnabled, playNotificationSound]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    if (!orderId) return;
    setOrders((prev) => (prev || []).map((o) => (o?.id === orderId ? { ...o, status: newStatus } : o)));
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (e) {
      console.warn('Status update error:', e);
    }
  }, []);

  // Safe Memoized Column Filters with optional chaining
  const columns = useMemo(() => {
    const safeOrders = orders || [];
    const receivedOrders = safeOrders.filter((o) => o?.status === 'RECEIVED');
    const preparingOrders = safeOrders.filter((o) => o?.status === 'PREPARING');
    const shippingOrders = safeOrders.filter((o) => o?.status === 'SHIPPING');
    const paidOrders = safeOrders.filter((o) => o?.status === 'PAID' || o?.status === 'DELIVERED');

    return [
      {
        id: 'RECEIVED',
        title: 'Tiếp Nhận Đơn',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        orders: receivedOrders,
        nextStatus: 'PREPARING' as OrderStatus,
        nextLabel: 'Chuẩn bị gà'
      },
      {
        id: 'PREPARING',
        title: 'Chuẩn Bị Gà',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Kanban,
        orders: preparingOrders,
        nextStatus: 'SHIPPING' as OrderStatus,
        nextLabel: 'Giao hàng'
      },
      {
        id: 'SHIPPING',
        title: 'Đang Giao Hàng',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Truck,
        orders: shippingOrders,
        nextStatus: 'PAID' as OrderStatus,
        nextLabel: 'Hoàn tất / Thanh toán'
      },
      {
        id: 'PAID',
        title: 'Đã Giao & Thanh Toán',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
        orders: paidOrders,
        nextStatus: null,
        nextLabel: ''
      }
    ];
  }, [orders]);

  // Safe Error Recovery View
  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4 max-w-md shadow-sm">
          <AlertCircle className="w-10 h-10 text-orange-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Có Lỗi Khi Tải Chi Nhánh</h2>
          <p className="text-xs text-slate-600">Hệ thống đang tự phục hồi dữ liệu mặc định để bạn tiếp tục thao tác.</p>
          <button
            onClick={() => loadBranchData(activeBranchId)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử Tải Lại Màn Hình</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Dashboard Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
              <Kanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                {currentBranch?.name || 'Chi Nhánh Gà Ủ Muối'}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                  Realtime Active
                </span>
              </h1>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {currentBranch?.address || 'Địa chỉ'}, {currentBranch?.district || 'Quận 1'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={activeBranchId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveBranchId(newId);
                router.push(`/branch/${newId}`);
              }}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
            >
              {(branches || []).map((b) => (
                <option key={b?.id || Math.random()} value={b?.id}>
                  {b?.name || 'Chi nhánh'}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) playNotificationSound();
              }}
              className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                audioEnabled
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
              title="Âm thanh thông báo khi có đơn mới"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{audioEnabled ? 'Chuông Bật' : 'Chuông Tắt'}</span>
            </button>
          </div>
        </div>

        {/* KANBAN BOARD */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(columns || []).map((col) => (
              <div key={col.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[600px] shadow-sm">
                
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <col.icon className="w-4 h-4 text-slate-500" />
                    <h2 className="font-bold text-sm text-slate-900">{col.title}</h2>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${col.badgeColor}`}>
                    {col.orders?.length || 0}
                  </span>
                </div>

                {/* Orders List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {!col.orders || col.orders.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-400 font-medium">Không có đơn hàng</span>
                    </div>
                  ) : (
                    col.orders.map((order) => (
                      <div
                        key={order?.id || Math.random()}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 space-y-3 shadow-xs transition"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {order?.order_code || 'GUM-XXXX'}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">
                            {order?.created_at ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-sm text-slate-900">{order?.customer_name || 'Khách Hàng'}</p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                            <Phone className="w-3 h-3 text-emerald-600" /> {order?.customer_phone || ''}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {order?.shipping_address || ''}
                          </p>
                        </div>

                        {/* Items */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                          {(order?.items || []).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-slate-800 font-medium">
                              <span>{it?.quantity || 1}x {it?.item_name || 'Gà Ủ Muối'}</span>
                              <span className="text-slate-500">{(it?.subtotal || 0).toLocaleString('vi-VN')}</span>
                            </div>
                          ))}
                        </div>

                        {order?.note && (
                          <p className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded font-medium">
                            Ghi chú: {order.note}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <span className="text-slate-500">Thanh toán:</span>
                          <span className="font-extrabold text-orange-600 text-sm">
                            {Number(order?.final_amount || 0).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {col.nextStatus && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleStatusChange(order.id, col.nextStatus!)}
                              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>{col.nextLabel}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                              className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Hủy đơn hàng"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
