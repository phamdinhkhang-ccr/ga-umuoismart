'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getAnalyticsData, getBranches, updateOrderStatus } from '@/actions/orders';
import { Branch, Order, OrderStatus } from '@/types/database';
import { restoreInventoryForOrder, deductInventoryForOrder, getItem } from '@/lib/store';
import {
  ClipboardList,
  Search,
  Filter,
  Printer,
  Eye,
  ArrowRightLeft,
  XCircle,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  MapPin,
  Phone,
  User,
  X,
  Plus,
  Download,
  Calendar,
  CreditCard,
  QrCode,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import ReceiptModal from '@/components/ReceiptModal';

const RICH_MOCK_ORDERS: Order[] = [
  {
    id: 'ord-9672',
    order_code: 'OD9672',
    customer_name: 'Hẻm Xéo',
    customer_phone: '0984263340',
    shipping_address: 'Số 12 Ngõ 88 Cầu Giấy, Hà Nội',
    district: 'Quận Cầu Giấy',
    city: 'Hà Nội',
    branch_id: 'b1111111-1111-1111-1111-111111111111',
    branch: { id: 'b1', name: 'CƠ SỞ VIN SMART CITY', address: 'Tòa S2.01 Vin Smart City', district: 'Nam Từ Liêm', city: 'Hà Nội', phone: '0901234567' },
    items: [
      { menu_item_id: 'm1', item_name: 'Gà Ủ Muối Nguyên Con', quantity: 1, unit_price: 190000, cost_price: 110000, subtotal: 190000 },
      { menu_item_id: 'm3', item_name: 'Chân gà sả tắc', quantity: 2, unit_price: 65000, cost_price: 32000, subtotal: 130000 }
    ],
    subtotal: 365000,
    discount_amount: 95000,
    final_amount: 270000,
    estimated_profit: 96000,
    voucher_code: 'KM95K',
    note: 'Giao ngay trước 12h, cho thêm 2 bịch nước chấm',
    status: 'PAID',
    created_at: '2026-09-04 14:15:00',
    updated_at: '2026-09-04 14:15:00'
  },
  {
    id: 'ord-9671',
    order_code: 'OD9671',
    customer_name: 'KH-1788490501',
    customer_phone: '0912888999',
    shipping_address: '456 Nguyễn Trãi, Phường Thanh Xuân',
    district: 'Quận Thanh Xuân',
    city: 'Hà Nội',
    branch_id: 'b2222222-2222-2222-2222-222222222222',
    branch: { id: 'b2', name: 'Chi Nhánh Gà Ủ Muối Cầu Giấy', address: '88 Cầu Giấy', district: 'Cầu Giấy', city: 'Hà Nội', phone: '0902345678' },
    items: [
      { menu_item_id: 'm8', item_name: 'Nem Ngựa 10 Cuốn Special', quantity: 1, unit_price: 117500, cost_price: 60000, subtotal: 117500 }
    ],
    subtotal: 117500,
    discount_amount: 0,
    final_amount: 117500,
    estimated_profit: 57500,
    voucher_code: null,
    note: 'Khách gọi trước khi đến',
    status: 'RECEIVED',
    created_at: '2026-09-04 13:40:00',
    updated_at: '2026-09-04 13:40:00'
  },
  {
    id: 'ord-9670',
    order_code: 'OD9670',
    customer_name: 'Live 4/9',
    customer_phone: '0977665544',
    shipping_address: '789 Xô Viết Nghệ Tĩnh',
    district: 'Quận Bình Thạnh',
    city: 'Hồ Chí Minh',
    branch_id: 'b3333333-3333-3333-3333-333333333333',
    branch: { id: 'b3', name: 'Chi Nhánh Gà Ủ Muối Đống Đa', address: '12 Đống Đa', district: 'Đống Đa', city: 'Hà Nội', phone: '0903456789' },
    items: [
      { menu_item_id: 'm1', item_name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', quantity: 1, unit_price: 190000, cost_price: 110000, subtotal: 190000 }
    ],
    subtotal: 190000,
    discount_amount: 0,
    final_amount: 190000,
    estimated_profit: 80000,
    voucher_code: null,
    note: 'Đơn từ Livestream TikTok 4/9',
    status: 'SHIPPING',
    created_at: '2026-09-04 12:20:00',
    updated_at: '2026-09-04 12:20:00'
  },
  {
    id: 'ord-9669',
    order_code: 'OD9669',
    customer_name: 'Anh Tuấn',
    customer_phone: '0988776655',
    shipping_address: '456 Điện Biên Phủ',
    district: 'Quận 3',
    city: 'Hồ Chí Minh',
    branch_id: 'b1111111-1111-1111-1111-111111111111',
    branch: { id: 'b1', name: 'CƠ SỞ VIN SMART CITY', address: 'Tòa S2.01 Vin Smart City', district: 'Nam Từ Liêm', city: 'Hà Nội', phone: '0901234567' },
    items: [
      { menu_item_id: 'm4', item_name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', quantity: 1, unit_price: 85000, cost_price: 45000, subtotal: 85000 },
      { menu_item_id: 'm6', item_name: 'Trà Tắc Khổng Lồ', quantity: 2, unit_price: 20000, cost_price: 6000, subtotal: 40000 }
    ],
    subtotal: 125000,
    discount_amount: 20000,
    final_amount: 105000,
    estimated_profit: 48000,
    voucher_code: 'HALO20',
    note: 'Đã hủy đơn do khách đổi ý',
    status: 'CANCELLED',
    created_at: '2026-09-04 11:05:00',
    updated_at: '2026-09-04 11:05:00'
  }
];

export default function CentralizedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(RICH_MOCK_ORDERS);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [targetBranchId, setTargetBranchId] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [bList, analyticsRes] = await Promise.all([
        getBranches(),
        getAnalyticsData('all', 'all')
      ]);
      setBranches(bList || []);

      let localOrders = getItem<any[]>('pos_orders_data', []);
      let cloudOrders: any[] = [];

      try {
        const cloudRes = await fetch('/api/orders?limit=10', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (cloudRes.ok) {
          const contentType = cloudRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const cloudData = await cloudRes.json();
            if (cloudData && Array.isArray(cloudData.orders)) {
              cloudOrders = cloudData.orders;
            }
          }
        }
      } catch (e) {
        console.warn('Orders silent fetch bypass:', e);
      }

      // Merge Cloud & Local Orders securely by ID / Code
      const mergedMap = new Map();
      cloudOrders.forEach((o: any) => mergedMap.set(o.id || o.order_code, o));
      (localOrders || []).forEach((o: any) => {
        const key = o.id || o.order_code;
        if (!mergedMap.has(key)) mergedMap.set(key, o);
      });
      const combinedRaw = Array.from(mergedMap.values());

      let mockOrders = analyticsRes?.orders || [];

      // Normalize local & cloud orders to ensure every single required field exists defensively
      const normalizedLocal: Order[] = combinedRaw.map((o: any) => {
        const orderId = o.id || o.order_code || o.code?.replace('#', '') || `OD${Math.floor(1000 + Math.random() * 9000)}`;
        const codeStr = o.order_code || o.code?.replace('#', '') || o.id || orderId;
        const custName = o.customer_name || o.customerName || o.name || 'Khách Vãng Lai';
        const custPhone = o.customer_phone || o.phone || '';
        const custAddr = o.shipping_address || o.address || o.customer_address || '';
        const branchObj = typeof o.branch === 'object' && o.branch !== null ? o.branch : { id: o.branch_id || o.branchId || 'b1', name: o.branchName || o.branch || 'CƠ SỞ VIN SMART CITY' };
        const bId = o.branch_id || o.branchId || branchObj.id || 'b1';
        const itemsList = (o.items || o.order_items || []).map((i: any) => ({
          menu_item_id: i.menu_item_id || i.id || 'm1',
          item_name: i.item_name || i.name || 'Gà Ủ Muối Nguyên Con',
          quantity: i.quantity || 1,
          unit_price: i.unit_price || i.price || 0,
          cost_price: i.cost_price || Math.round((i.price || i.unit_price || 0) * 0.55),
          subtotal: i.subtotal || (i.price || i.unit_price || 0) * (i.quantity || 1)
        }));
        const totalAmt = typeof o.final_amount === 'number' ? o.final_amount : (o.totalAmount || o.total_amount || o.subtotal || 0);

        return {
          ...o,
          id: orderId,
          order_code: codeStr,
          code: `#${codeStr}`,
          customer_name: custName,
          customerName: custName,
          customer_phone: custPhone,
          phone: custPhone,
          shipping_address: custAddr,
          address: custAddr,
          branch_id: bId,
          branchId: bId,
          branch: branchObj,
          branchName: branchObj.name || 'CƠ SỞ VIN SMART CITY',
          items: itemsList,
          subtotal: totalAmt,
          discount_amount: o.discount_amount || 0,
          final_amount: totalAmt,
          totalAmount: totalAmt,
          status: o.status || 'RECEIVED',
          created_at: o.created_at || o.createdAt || new Date().toISOString()
        };
      });

      const localIdSet = new Set(normalizedLocal.map((o: any) => o.id || o.order_code));
      const extraMocks = mockOrders.filter((o: any) => !localIdSet.has(o.id) && !localIdSet.has(o.order_code));

      let allOrders = [...normalizedLocal, ...extraMocks];
      allOrders.sort((a, b) => new Date(b.created_at || (b as any).createdAt || 0).getTime() - new Date(a.created_at || (a as any).createdAt || 0).getTime());
      setOrders(allOrders);
    } catch (e) {
      console.warn('Error loading orders:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    const intervalId = setInterval(() => {
      loadData();
    }, 2500);

    const handleUpdate = () => loadData();
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'pos_orders_data' || 
        e.key === 'pos_order_sync_trigger' || 
        e.key === 'pos_new_order_event' || 
        e.key === 'pos_last_order_ping' || 
        e.key === 'gum_smart_orders_v3'
      ) {
        handleUpdate();
      }
    };

    window.addEventListener('gum_store_update', handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('app_order_created', handleUpdate);
    window.addEventListener('new_order_placed', handleUpdate);
    window.addEventListener('new_order_event', handleUpdate);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('gum_store_update', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app_order_created', handleUpdate);
      window.removeEventListener('new_order_placed', handleUpdate);
      window.removeEventListener('new_order_event', handleUpdate);
    };
  }, [loadData]);

  // Handle Quick Status Change with automatic Inventory restoration/deduction
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      if (newStatus === 'CANCELLED') {
        restoreInventoryForOrder(targetOrder);
      } else if (newStatus === 'PAID' || newStatus === 'DELIVERED') {
        deductInventoryForOrder(targetOrder);
      }
    }

    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    await updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Branch Transfer Handler
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

  // Export Filtered Table to CSV/Excel
  const handleExportExcel = () => {
    const headers = ['Mã đơn', 'Trạng thái', 'Cửa hàng', 'Sản phẩm', 'Khách hàng', 'Số lượng', 'Giá bán', 'Giảm giá', 'Thành tiền', 'Người bán', 'Thanh toán', 'Thời gian'];
    const csvRows = [headers.join(',')];
    filteredOrders.forEach(o => {
      const row = [
        o.order_code,
        o.status,
        `"${o.branch?.name || o.branch_id}"`,
        `"${o.items?.map(i => i.item_name).join(' + ')}"`,
        `"${o.customer_name} (${o.customer_phone})"`,
        o.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
        o.subtotal,
        o.discount_amount,
        o.final_amount,
        `"${o.note ? 'Ghi chú: ' + o.note : 'Đức'}"`,
        o.status === 'PAID' ? 'Đã chuyển khoản' : 'Chưa thanh toán',
        `"${new Date(o.created_at).toLocaleString('vi-VN')}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_don_hang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search Query (Name, Phone, or #OD code)
      const q = searchQuery.toLowerCase().trim();
      const codeStr = (o.order_code || o.id || '').toString().toLowerCase();
      const nameStr = (o.customer_name || (o as any).customerName || '').toString().toLowerCase();
      const phoneStr = (o.customer_phone || (o as any).phone || '').toString();
      const addrStr = (o.shipping_address || (o as any).address || '').toString().toLowerCase();

      const matchSearch =
        !q ||
        codeStr.includes(q) ||
        nameStr.includes(q) ||
        phoneStr.includes(q) ||
        addrStr.includes(q);

      // 2. Status Tab
      const s = (o.status || 'RECEIVED').toString().toUpperCase();
      const matchTab =
        statusTab === 'ALL' ||
        (statusTab === 'RECEIVED' && (s === 'RECEIVED' || s === 'PENDING')) ||
        (statusTab === 'PAID' && (s === 'PAID' || s === 'DELIVERED')) ||
        (statusTab === 'SHIPPING' && s === 'SHIPPING') ||
        (statusTab === 'CANCELLED' && s === 'CANCELLED');

      // 3. Payment Method Filter
      const matchPayment =
        paymentMethod === 'ALL' ||
        (paymentMethod === 'PAID' && o.status === 'PAID') ||
        (paymentMethod === 'CASH' && o.status === 'SHIPPING') ||
        (paymentMethod === 'UNPAID' && o.status === 'RECEIVED');

      // 4. Branch Filter
      const matchBranch = selectedBranch === 'ALL' || o.branch_id === selectedBranch;

      // 5. Date Filters
      const orderDate = o.created_at.split('T')[0];
      const matchStart = !startDate || orderDate >= startDate;
      const matchEnd = !endDate || orderDate <= endDate;

      return matchSearch && matchTab && matchPayment && matchBranch && matchStart && matchEnd;
    });
  }, [orders, searchQuery, statusTab, paymentMethod, selectedBranch, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentMethod('ALL');
    setSelectedBranch('ALL');
    setStatusTab('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* 1. BỘ LỌC TÌM KIẾM ĐA NĂNG & HEADER (FILTER SECTION) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Header & Quick Order Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Quản Lý Đơn Hàng Tập Trung ({orders.length})
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">Bảng danh sách đơn đa chi nhánh, trạng thái dòng tiền &amp; in bill K80.</p>
            </div>
          </div>

          <Link
            href="/admin/create-order"
            className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
            <span>+ Tạo Đơn Hàng Mới</span>
          </Link>
        </div>

        {/* Filter Controls Row 1 & Row 2 */}
        <div className="space-y-3 text-xs">
          
          {/* Row 1: Search Customer + Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tên khách hàng, SĐT hoặc Mã đơn #OD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả hình thức thanh toán</option>
                <option value="PAID">Đã chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
                <option value="UNPAID">Chưa thanh toán (Chờ CK)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Branch + Date Range + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Cửa hàng */}
            <div className="sm:col-span-4">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả cửa hàng / chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Từ ngày */}
            <div className="sm:col-span-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            {/* Đến ngày */}
            <div className="sm:col-span-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            {/* Actions: Lọc, Reset, Xuất Excel */}
            <div className="sm:col-span-4 flex items-center space-x-2">
              <button
                onClick={() => {}}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Lọc</span>
              </button>

              <button
                onClick={handleResetFilters}
                className="py-2.5 px-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="py-2.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-extrabold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </div>

          </div>

        </div>

        {/* Hàng Tab Trạng Thái Đơn Nhanh */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 w-fit">
          {[
            { id: 'ALL', label: 'Tất cả đơn' },
            { id: 'RECEIVED', label: '🔴 Chờ thanh toán' },
            { id: 'PAID', label: '🟢 Thành công' },
            { id: 'SHIPPING', label: '🟣 Đang giao' },
            { id: 'CANCELLED', label: '⚪ Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusTab === tab.id
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* 2. BẢNG DANH SÁCH ĐƠN HÀNG (RESPONSIVE TABLE - 13 CỘT) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 text-center">#</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Cửa hàng</th>
                <th className="p-3.5">Sản phẩm</th>
                <th className="p-3.5">Khách hàng</th>
                <th className="p-3.5 text-center">Số lượng</th>
                <th className="p-3.5 text-right">Giá bán</th>
                <th className="p-3.5 text-right">Giảm giá</th>
                <th className="p-3.5 text-right">Thành tiền</th>
                <th className="p-3.5">Người bán</th>
                <th className="p-3.5">Thanh toán</th>
                <th className="p-3.5 text-center">Thời gian</th>
                <th className="p-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    Không tìm thấy đơn hàng phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const totalQty = o.items?.reduce((sum, i) => sum + i.quantity, 0) || 1;
                  const itemSummary = o.items?.map(i => i.item_name).join(' + ') || 'Gà Ủ Muối';
                  const isNewWebOrder = o.status === 'RECEIVED' || (o.status as string) === 'PENDING' || (o as any).source === 'Website Khách Đặt';

                  return (
                    <tr key={o.id} className={`transition ${isNewWebOrder ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500 font-semibold' : 'hover:bg-slate-50/80'}`}>
                      {/* # Mã Đơn */}
                      <td className="p-3.5 text-center font-extrabold text-slate-900">
                        #{o.order_code || o.id}
                      </td>

                      {/* Trạng Thái Badge */}
                      <td className="p-3.5">
                        {isNewWebOrder ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2.5 py-1 rounded-lg text-[11px] animate-pulse shadow-2xs">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>🟢 Đơn Mới (Web)</span>
                          </span>
                        ) : o.status === 'PAID' ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Thành công</span>
                          </span>
                        ) : o.status === 'SHIPPING' ? (
                          <span className="inline-flex items-center space-x-1 bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                            <Truck className="w-3 h-3 text-purple-600" />
                            <span>Đang giao</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-500 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[11px] line-through">
                            <span>Đã hủy</span>
                          </span>
                        )}
                      </td>

                      {/* Cửa hàng */}
                      <td className="p-3.5 font-bold text-slate-900">
                        {o.branch?.name || 'CƠ SỞ VIN SMART CITY'}
                      </td>

                      {/* Sản phẩm */}
                      <td className="p-3.5 text-slate-700 max-w-xs truncate font-medium" title={itemSummary}>
                        {itemSummary}
                      </td>

                      {/* Khách hàng */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{o.customer_name}</div>
                        <div className="text-[11px] text-slate-500">{o.customer_phone}</div>
                      </td>

                      {/* Số lượng */}
                      <td className="p-3.5 text-center font-extrabold text-slate-900">
                        {totalQty}
                      </td>

                      {/* Giá bán */}
                      <td className="p-3.5 text-right font-medium text-slate-600">
                        {o.subtotal.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Giảm giá */}
                      <td className="p-3.5 text-right font-semibold text-rose-600">
                        -{o.discount_amount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Thành tiền */}
                      <td className="p-3.5 text-right font-extrabold text-blue-700 text-sm">
                        {o.final_amount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Người bán */}
                      <td className="p-3.5 font-semibold text-slate-700">
                        {o.note?.includes('AI') ? 'AI Parser' : 'Đức'}
                      </td>

                      {/* Thanh toán */}
                      <td className="p-3.5">
                        {o.status === 'PAID' ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">Đã chuyển khoản</span>
                        ) : o.status === 'SHIPPING' ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">Tiền mặt</span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">Chưa thanh toán</span>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td className="p-3.5 text-center text-slate-500 text-[11px]">
                        {new Date(o.created_at).toLocaleString('vi-VN')}
                      </td>

                      {/* Thao tác */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="Xem chi tiết đơn"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPrintOrder(o)}
                            title="In Bill Chế Biến K80"
                            className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition cursor-pointer border border-orange-200"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setTransferOrder(o)}
                            title="Chuyển sang cơ sở khác"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer border border-blue-200"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL CHI TIẾT ĐƠN HÀNG (ORDER DETAIL DRAWER) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-orange-600" />
                Chi Tiết Đơn Hàng #{selectedOrder.order_code}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Receiver Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{selectedOrder.customer_name}</span>
                  <span className="font-bold text-orange-600">{selectedOrder.customer_phone}</span>
                </div>
                <div className="text-slate-600 flex items-start space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedOrder.shipping_address}, {selectedOrder.district}, {selectedOrder.city}</span>
                </div>
                {selectedOrder.note && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-900 font-semibold italic">
                    Ghi chú: {selectedOrder.note}
                  </div>
                )}
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Sản Phẩm</th>
                      <th className="p-2.5 text-center">SL</th>
                      <th className="p-2.5 text-right">Đơn Giá</th>
                      <th className="p-2.5 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-900">{item.item_name}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
                        <td className="p-2.5 text-right text-slate-600">{item.unit_price.toLocaleString('vi-VN')} đ</td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">{item.subtotal.toLocaleString('vi-VN')} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính:</span>
                  <span>{selectedOrder.subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Khuyến mãi / Giảm giá:</span>
                  <span>-{selectedOrder.discount_amount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-blue-700 border-t border-slate-200 pt-2">
                  <span>Tổng tiền thanh toán:</span>
                  <span>{selectedOrder.final_amount.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Quick Status Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'PAID')}
                  className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition cursor-pointer text-center text-[11px]"
                >
                  ✓ Đã Thanh Toán
                </button>
                <button
                  onClick={() => {
                    setTransferOrder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer text-center text-[11px]"
                >
                  ⇄ Chuyển Cơ Sở
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'CANCELLED')}
                  className="py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition cursor-pointer text-center text-[11px]"
                >
                  ✕ Hủy Đơn &amp; Hoàn Kho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT BILL & VIETQR MODAL K80 */}
      {printOrder && (
        <ReceiptModal
          order={printOrder}
          onClose={() => setPrintOrder(null)}
          onPaymentConfirmed={() => {
            handleStatusChange(printOrder.id, 'PAID');
          }}
        />
      )}

      {/* BRANCH TRANSFER MODAL */}
      {transferOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">Chuyển Cơ Sở Tiếp Nhận Đơn #{transferOrder.order_code}</h3>
              <button onClick={() => setTransferOrder(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-700">Chọn Chi Nhánh Mới Mới Tiếp Nhận:</label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
              >
                <option value="">-- Chọn cơ sở mới --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setTransferOrder(null)} className="px-4 py-2 bg-slate-100 font-bold rounded-xl">Hủy</button>
                <button onClick={handleConfirmTransfer} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm">Xác Nhận Chuyển</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
