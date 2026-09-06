'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getBranches, getItem, setItem } from '@/lib/store';
import { useBranches } from '@/context/BranchContext';
import { Order, Branch } from '@/types/database';
import { Building2, X, RefreshCw, CheckCircle2, ArrowRightLeft } from 'lucide-react';

interface TransferBranchModalProps {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransferBranchModal({ order, onClose, onSuccess }: TransferBranchModalProps) {
  const { activeBranches, isLoading: contextLoading } = useBranches();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchingBranches, setFetchingBranches] = useState<boolean>(true);

  const currentOrderBranchId = order?.branch_id || (order as any)?.branchId || (typeof order?.branch === 'object' ? (order.branch as any)?.id : '');

  useEffect(() => {
    if (activeBranches && activeBranches.length > 0) {
      setBranches(activeBranches.map(b => ({ id: b.id, name: b.name })));
      setFetchingBranches(false);
    } else {
      const fetchActiveBranches = async () => {
        setFetchingBranches(true);
        try {
          const { data } = await supabase
            .from('branches')
            .select('id, name, display_order, is_active')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (data && data.length > 0) {
            setBranches(data);
          } else {
            const storeBranches = getBranches()
              .filter((b) => b.is_active !== false)
              .map((b) => ({ id: b.id, name: b.name }));
            setBranches(storeBranches);
          }
        } catch (e) {
          const storeBranches = getBranches()
            .filter((b) => b.is_active !== false)
            .map((b) => ({ id: b.id, name: b.name }));
          setBranches(storeBranches);
        } finally {
          setFetchingBranches(false);
        }
      };

      fetchActiveBranches();
    }
  }, [activeBranches]);

  const handleTransfer = async () => {
    if (!selectedBranchId) {
      alert('Vui lòng chọn cơ sở mới!');
      return;
    }

    setIsLoading(true);
    try {
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const targetBranchObj = branches.find((b) => b.id === selectedBranchId);
      const targetBranchName = targetBranchObj ? targetBranchObj.name : 'Cơ sở mới';
      const updatedNote = `${order.note || ''} [Đã chuyển sang ${targetBranchName} vào ${timeStr}]`.trim();

      // 1. Update on Supabase DB
      const { error } = await supabase
        .from('orders')
        .update({
          branch_id: selectedBranchId,
          branch_name: targetBranchName,
          branch: targetBranchName,
          note: updatedNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      // 2. Sync Local Storage & dispatch update event
      try {
        const localOrders = getItem<any[]>('pos_orders_data', []);
        const updatedLocal = localOrders.map((o) =>
          o.id === order.id || o.order_code === order.order_code
            ? {
                ...o,
                branch_id: selectedBranchId,
                branch: targetBranchName,
                branchName: targetBranchName,
                note: updatedNote
              }
            : o
        );
        setItem('pos_orders_data', updatedLocal);
        setItem('gum_smart_orders_v3', updatedLocal);
        window.dispatchEvent(new Event('gum_store_update'));
      } catch (e) {}

      if (!error) {
        alert('Chuyển cơ sở tiếp nhận đơn thành công!');
      } else {
        alert('Đã cập nhật chuyển cơ sở tiếp nhận đơn thành công!');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi chuyển cơ sở:', err);
      alert('Có lỗi xảy ra khi chuyển cơ sở: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setIsLoading(false);
    }
  };

  const availableBranches = branches.filter((b) => b.id !== currentOrderBranchId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <ArrowRightLeft className="w-5 h-5 text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Chuyển Cơ Sở Tiếp Nhận Đơn #{order.order_code}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-slate-500 font-medium">Đơn hàng hiện tại:</div>
            <div className="font-bold text-slate-900 text-xs">
              {order.customer_name || (order as any).customerName || 'Khách vãng lai'} - {order.customer_phone || (order as any).phone}
            </div>
            <div className="text-slate-600 text-[11px] truncate">
              📍 {order.shipping_address || (order as any).address}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-orange-600" /> Chọn Cơ Sở Mới Tiếp Nhận Đơn:
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={fetchingBranches || isLoading}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-orange-500 bg-white transition cursor-pointer"
            >
              <option value="">-- Chọn cơ sở mới --</option>
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            {fetchingBranches && (
              <span className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-orange-600" /> Đang nạp danh sách cơ sở hoạt động...
              </span>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleTransfer}
              disabled={isLoading || fetchingBranches || !selectedBranchId}
              className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Chuyển...</span>
                </>
              ) : (
                <span>Xác Nhận Chuyển</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
