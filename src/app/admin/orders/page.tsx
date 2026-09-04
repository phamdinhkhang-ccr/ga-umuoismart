'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAnalyticsData, getBranches, updateOrderStatus } from '@/actions/orders';
import { Branch, Order, OrderStatus } from '@/types/database';
import { ClipboardList, Search, Filter, Printer, Eye, ArrowRightLeft, XCircle, Clock, CheckCircle2, Truck, Kanban, Store, MapPin, Phone, User, X } from 'lucide-react';

export default function CentralizedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Selected Order for Print Bill Modal
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Selected Order for Branch Transfer Modal
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [targetBranchId, setTargetBranchId] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [bList, analyticsRes] = await Promise.all([
        getBranches(),
        getAnalyticsData('all', 'all')
      ]);
      setBranches(bList || []);
      setOrders(analyticsRes?.orders || []);
    } catch (e) {
      console.warn('Error loading orders:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Quick Status Change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    await updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Handle Branch Transfer
  const handleConfirmTransfer = async () => {
    if (!transferOrder || !targetBranchId) return;

    const targetB = branches.find((b) => b.id === targetBranchId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === transferOrder.id
          ? { ...o, branch_id: targetBranchId, branch: targetB }
          : o
      )
    );

    setTransferOrder(null);
  };

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_code.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.shipping_address.toLowerCase().includes(q);

      // 2. Status Filter
      const matchStatus = selectedStatus === 'ALL' || o.status === selectedStatus;

      // 3. Branch Filter
      const matchBranch = selectedBranch === 'ALL' || o.branch_id === selectedBranch;

      return matchSearch && matchStatus && matchBranch;
    });
  }, [orders, searchQuery, selectedStatus, selectedBranch]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Quản Lý Đơn Hàng Tập Trung
                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {filteredOrders.length} Đơn
                </span>
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Theo dõi, tìm kiếm, đổi trạng thái & chuyển giao cơ sở cho toàn bộ đơn hàng trong hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo SĐT, Tên khách hàng, Mã đơn hàng GUM-..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="RECEIVED">Tiếp nhận (RECEIVED)</option>
              <option value="PREPARING">Chuẩn bị gà (PREPARING)</option>
              <option value="SHIPPING">Đang giao (SHIPPING)</option>
              <option value="PAID">Đã giao / Thanh toán (PAID)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ORDER TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3">Mã Đơn</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3">Chi Nhánh Phụ Trách</th>
                  <th className="px-4 py-3">Món Đặt</th>
                  <th className="px-4 py-3 text-right">Thành Tiền</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 font-medium">
                      Không tìm thấy đơn hàng phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-4 py-3.5 font-extrabold text-orange-600">
                        {order.order_code}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {order.customer_name}
                        <span className="block text-[10px] text-slate-500 font-normal">{order.customer_phone}</span>
                        <span className="block text-[10px] text-slate-500 max-w-xs truncate">{order.shipping_address}</span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {order.branch?.name || 'Chi Nhánh'}
                        <span className="block text-[10px] text-slate-500 font-normal">{order.district}</span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-800 max-w-xs truncate font-medium">
                        {order.items.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ')}
                      </td>

                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                        {Number(order.final_amount).toLocaleString('vi-VN')} VNĐ
                      </td>

                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border focus:outline-none cursor-pointer ${
                            order.status === 'PAID' || order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'SHIPPING'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : order.status === 'PREPARING'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : order.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="RECEIVED">Tiếp nhận</option>
                          <option value="PREPARING">Chuẩn bị gà</option>
                          <option value="SHIPPING">Đang giao</option>
                          <option value="PAID">Đã giao / Thanh toán</option>
                          <option value="CANCELLED">Hủy đơn</option>
                        </select>
                      </td>

                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Xem chi tiết đơn"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setTransferOrder(order);
                              setTargetBranchId(order.branch_id);
                            }}
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Chuyển sang chi nhánh khác"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPrintOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="In hóa đơn / phiếu giao"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL 1: ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  Chi Tiết Đơn Hàng <span className="text-orange-600">{selectedOrder.order_code}</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Tạo lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Shipping */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Khách Hàng:</span>
                <p className="text-slate-800 font-semibold">{selectedOrder.customer_name}</p>
                <p className="text-slate-500">{selectedOrder.customer_phone}</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Giao Đến:</span>
                <p className="text-slate-800 truncate">{selectedOrder.shipping_address}</p>
                <p className="text-slate-500">{selectedOrder.district}, {selectedOrder.city}</p>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 block">Danh Sách Món Đã Đặt:</span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {selectedOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{it.quantity}x {it.item_name}</span>
                      <span className="block text-[10px] text-slate-500">Đơn giá: {it.unit_price.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                    <span className="font-bold text-slate-900">{it.subtotal.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng:</span>
                <span className="font-semibold">{Number(selectedOrder.subtotal).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-orange-700">
                <span>Giảm giá:</span>
                <span className="font-bold">-{Number(selectedOrder.discount_amount).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2">
                <span>Khách Thanh Toán:</span>
                <span className="text-orange-600">{Number(selectedOrder.final_amount).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-xs pt-1">
                <span>Lợi Nhuận Dự Tính (Profit):</span>
                <span>+{Number(selectedOrder.estimated_profit).toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            {selectedOrder.note && (
              <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg font-medium">
                Ghi chú của khách: {selectedOrder.note}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPrintOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Hóa Đơn Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BRANCH TRANSFER MODAL */}
      {transferOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-600" /> Điều Chuyển Chi Nhánh Phụ Trách
              </h3>
              <button onClick={() => setTransferOrder(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Đơn hàng <span className="font-bold text-orange-600">{transferOrder.order_code}</span> đang do <span className="font-bold">{transferOrder.branch?.name || 'Chi Nhánh'}</span> xử lý. Bạn có muốn chuyển sang chi nhánh khác không?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn Chi Nhánh Mới:</label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} - ({b.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setTransferOrder(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-4 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 shadow-sm"
              >
                Xác Nhận Chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINT BILL RECEIPT VIEW */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            
            {/* Thermal Print Receipt Layout */}
            <div className="border border-slate-300 p-4 rounded-xl font-mono text-xs text-slate-900 space-y-3 bg-white">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h2 className="font-extrabold text-sm uppercase">GÀ Ủ MUỐI SMART</h2>
                <p className="text-[10px] text-slate-600">Hóa Đơn Giao Hàng - {printOrder.order_code}</p>
                <p className="text-[10px] text-slate-500">{new Date(printOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <p>Khách: <span className="font-bold">{printOrder.customer_name}</span></p>
                <p>SĐT: <span className="font-bold">{printOrder.customer_phone}</span></p>
                <p>ĐC: {printOrder.shipping_address}, {printOrder.district}</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                {printOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.item_name}</span>
                    <span>{it.subtotal.toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{Number(printOrder.subtotal).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Giảm giá:</span>
                  <span>-{Number(printOrder.discount_amount).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-1">
                  <span>TỔNG THU:</span>
                  <span className="text-orange-600">{Number(printOrder.final_amount).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t border-dashed border-slate-400 pt-2">
                Cảm ơn quý khách đã chọn Gà Ủ Muối Smart!
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setPrintOrder(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  window.print();
                  setPrintOrder(null);
                }}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Phiếu</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
