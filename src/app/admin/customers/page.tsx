'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Download,
  Phone,
  MapPin,
  ShoppingBag,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  MessageCircle,
  Pencil,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Send,
  Copy,
  ExternalLink,
  Info,
  Calendar,
  Building2,
} from 'lucide-react';
import PhoneActionCell from '@/components/PhoneActionCell';
import * as XLSX from 'xlsx';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  branchId: string | null;
  tasteNotes: string | null;
  favoriteDish: string | null;
  lastContactedAt: string | null;
  contactCount: number;
  reorderNotes: string | null;
  createdAt: string;
  daysSinceLastOrder?: number | null;
  isChurnRisk?: boolean;
  tier?: 'VIP' | 'REGULAR' | 'NEW';
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

import { useBranches } from '@/hooks/useBranches';

export default function CustomerCRMPage() {
  const { branches } = useBranches();
  const BRANCHES = branches.length > 0
    ? branches.map((b) => ({ id: b.id, name: `📍 ${b.code ? b.code + ' - ' : ''}${b.name}` }))
    : [
        { id: 'cs1', name: '📍 CS1 - Cầu Giấy' },
        { id: 'cs2', name: '📍 CS2 - Đống Đa' },
        { id: 'cs3', name: '📍 CS3 - Hai Bà Trưng' },
        { id: 'cs4', name: '📍 CS4 - Thanh Xuân' },
        { id: 'cs5', name: '📍 CS5 - Tây Hồ' },
        { id: 'cs6', name: '📍 CS6 - Nam Từ Liêm' },
      ];
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalCount: 0,
    vipCount: 0,
    retentionRate: 0,
    newThisMonthCount: 0,
    churnRiskCount: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, VIP, REGULAR, NEW, CHURN_RISK
  const [branchFilter, setBranchFilter] = useState('all');

  // Modals & Drawer States
  const [selectedDrawerCustomer, setSelectedDrawerCustomer] = useState<CustomerRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<{ customer: any; orders: any[] } | null>(null);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTasteNotes, setEditTasteNotes] = useState('');
  const [editBranchId, setEditBranchId] = useState('cs1');
  const [savingEdit, setSavingEdit] = useState(false);

  // Zalo Remarketing Modal State (>30 Days Churn Risk)
  const [zaloCustomer, setZaloCustomer] = useState<CustomerRecord | null>(null);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customZaloMessage, setCustomZaloMessage] = useState('');
  const [sendingZalo, setSendingZalo] = useState(false);
  const [zaloToast, setZaloToast] = useState('');

  // Quick POS Order Modal State
  const [quickOrderCustomer, setQuickOrderCustomer] = useState<CustomerRecord | null>(null);
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);
  const [orderItems, setOrderItems] = useState<{ productId: string; productName: string; price: number; quantity: number }[]>([]);
  const [selectedAddProdId, setSelectedAddProdId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderShippingFee, setOrderShippingFee] = useState(35000);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Toast Notification
  const showToast = (msg: string) => {
    setZaloToast(msg);
    setTimeout(() => setZaloToast(''), 4000);
  };

  // 1. Fetch CRM Customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (branchFilter !== 'all') params.append('branchId', branchFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Products for Quick Order
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setDbProducts(data.products.filter((p: any) => p.isAvailable));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, [categoryFilter, branchFilter]);

  const handleApplySearch = () => {
    fetchCustomers();
  };

  // 2. Customer Detail Drawer Fetch
  const handleOpenDrawer = async (cust: CustomerRecord) => {
    setSelectedDrawerCustomer(cust);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/customers/${cust.id}`);
      const data = await res.json();
      if (data.success) {
        setDrawerDetail(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. Edit Customer Handler
  const handleOpenEdit = (cust: CustomerRecord) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditAddress(cust.address || '');
    setEditTasteNotes(cust.tasteNotes || '');
    setEditBranchId(cust.branchId || 'cs1');
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          address: editAddress,
          tasteNotes: editTasteNotes,
          branchId: editBranchId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Cập nhật thông tin khách hàng thành công!');
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        alert(data.error || 'Lỗi cập nhật');
      }
    } catch (e) {
      alert('Lỗi máy chủ');
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. Zalo Remarketing Templates & Handlers
  const messageTemplates = [
    {
      title: '🎁 Mẫu 1: Tặng Mã Freeship 35K',
      text: (name: string) =>
        `Dạ em chào ${name}! Lâu rồi bên em Gà Ủ Muối Smart chưa thấy anh/chị đặt món. Hôm nay bếp vừa ra mẻ gà ủ muối hoa tiêu mới da giòn sần sật, thịt mọng nước đậm vị thảo mộc. Em xin gửi tặng riêng anh/chị mã hỗ trợ 35K phí ship khi đặt món hôm nay qua Hotline 0988.888.999 hoặc link này nha: https://gaumuoismart.vn. Chúc anh/chị một ngày vui vẻ ạ!`,
    },
    {
      title: '🍗 Mẫu 2: Tặng Kèm Phần Ăn Thử Chân Gà / Sốt',
      text: (name: string) =>
        `Dạ em chào ${name}, hôm nay bếp Gà Ủ Muối Smart em có mẻ Chân Gà Rút Xương ủ muối mới rất ngon và mẻ sốt ớt xanh béo ngậy độc quyền. Em gửi tặng anh/chị 1 phần ăn thử kèm đơn hàng hôm nay nhé! Anh/chị xem thực đơn mới và chọn món tại: https://gaumuoismart.vn`,
    },
    {
      title: '💎 Mẫu 3: Tri Ân Khách Hàng Cũ (Giảm 10%)',
      text: (name: string) =>
        `Dạ em chào ${name}, Gà Ủ Muối Smart xin gửi lời tri ân tới quý khách hàng thân thiết. Đặt lại món hôm nay em xin áp dụng giảm ngay 10% trên tổng bill + giao hỏa tốc 30 phút. Anh/chị nhắn lại món em cho bếp làm ngay nhé! Hotline đặt bàn/giao hàng: 0988.888.999.`,
    },
  ];

  const handleOpenZaloModal = (cust: CustomerRecord) => {
    setZaloCustomer(cust);
    setSelectedTemplateIndex(0);
    setCustomZaloMessage(messageTemplates[0].text(cust.name));
  };

  const handleSelectTemplate = (index: number) => {
    if (!zaloCustomer) return;
    setSelectedTemplateIndex(index);
    setCustomZaloMessage(messageTemplates[index].text(zaloCustomer.name));
  };

  const handleCopyAndOpenZalo = async () => {
    if (!zaloCustomer) return;
    try {
      await navigator.clipboard.writeText(customZaloMessage);
      showToast('Đã copy tin nhắn vào Bộ nhớ tạm (Clipboard)! Đang mở Zalo...');
    } catch (e) {
      console.log(e);
    }

    const cleanPhone = zaloCustomer.phone.replace(/[^0-9]/g, '');
    const zaloUrl = `https://zalo.me/${cleanPhone}`;
    window.open(zaloUrl, '_blank');

    // Automatically mark as contacted in DB
    handleMarkContacted();
  };

  const handleMarkContacted = async () => {
    if (!zaloCustomer) return;
    setSendingZalo(true);
    try {
      const res = await fetch(`/api/customers/${zaloCustomer.id}/mark-contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: customZaloMessage }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã đánh dấu đã gửi Zalo chăm sóc cho ${zaloCustomer.name}!`);
        setZaloCustomer(null);
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingZalo(false);
    }
  };

  // 5. Quick Order Handlers
  const handleOpenQuickOrder = (cust: CustomerRecord) => {
    setQuickOrderCustomer(cust);
    setOrderItems([]);
    setOrderNotes(cust.tasteNotes ? `Khẩu vị khách: ${cust.tasteNotes}` : '');
    setOrderShippingFee(35000);
    if (dbProducts.length > 0) {
      setSelectedAddProdId(dbProducts[0].id);
    }
  };

  const handleAddProductToOrder = () => {
    const prod = dbProducts.find((p) => p.id === selectedAddProdId);
    if (!prod) return;

    setOrderItems((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: prod.id, productName: prod.name, price: prod.price, quantity: 1 }];
    });
  };

  const handleCreateQuickOrder = async () => {
    if (!quickOrderCustomer) return;
    if (orderItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 món ăn vào đơn hàng!');
      return;
    }

    setCreatingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: quickOrderCustomer.name,
          customerPhone: quickOrderCustomer.phone,
          deliveryAddress: quickOrderCustomer.address || 'Địa chỉ giao hỏa tốc',
          note: `[CRM Re-order] ${orderNotes}`,
          branchId: quickOrderCustomer.branchId || 'cs1',
          shippingFee: orderShippingFee,
          paymentMethod: 'COD',
          sellerName: 'Thu ngân CRM',
          sourceTag: 'CRM Remarketing Zalo',
          items: orderItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Tạo đơn hàng ${data.order.orderCode} thành công cho ${quickOrderCustomer.name}!`);
        setQuickOrderCustomer(null);
        fetchCustomers();
      } else {
        alert(data.error || 'Lỗi tạo đơn');
      }
    } catch (e) {
      alert('Lỗi máy chủ');
    } finally {
      setCreatingOrder(false);
    }
  };

  // 6. Export Excel Handler
  const handleExportExcel = () => {
    const exportData = customers.map((c, idx) => ({
      STT: idx + 1,
      'Họ và Tên': c.name,
      'Số Điện Thoại': c.phone,
      'Phân Hạng': c.tier === 'VIP' ? '⭐ VIP' : c.totalOrders >= 2 ? '🍗 Khách quen' : 'Khách mới',
      'Cơ Sở Phục Vụ': c.branchId || 'CS1 - Cầu Giấy',
      'Số Đơn Đã Mua': c.totalOrders,
      'Tổng Chi Tiêu (VNĐ)': c.totalSpent,
      'Lần Mua Gần Nhất': c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : 'Chưa phát sinh',
      'Số Ngày Chưa Mua Lại': c.daysSinceLastOrder ?? 0,
      'Cảnh Báo Churn Risk (>30 Ngày)': c.isChurnRisk ? '⚠️ CẦN CHĂM SÓC' : 'BT',
      'Ghi Chú Khẩu Vị': c.tasteNotes || '---',
      'Ngày Nhắn Zalo Gần Nhất': c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString('vi-VN') : 'Chưa nhắn',
      'Số Lần Đã Remarketing': c.contactCount || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_Bạ_Khách_Hàng');
    XLSX.writeFile(workbook, `Danh_Ba_Khach_Hang_CRM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Toast Notification Banner */}
      {zaloToast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span className="font-extrabold text-sm">{zaloToast}</span>
        </div>
      )}

      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAF9] tracking-tight">
                Danh Bạ Khách Hàng (CRM)
              </h1>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> F&B Remarketing Zalo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Lịch sử khách hàng từng mua món gà, số đơn, tổng chi tiêu và tự động kích hoạt lại khách cũ quá 30 ngày.
            </p>
          </div>
        </div>

        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-sm cursor-pointer transition shrink-0"
        >
          <Download className="w-4 h-4 stroke-[2]" />
          <span>Xuất Danh Sách Khách Hàng (Excel)</span>
        </button>
      </div>

      {/* 2. Top 5 CRM KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Customers */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">TỔNG KHÁCH HÀNG</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium">
            Toàn bộ danh bạ CRM
          </div>
        </div>

        {/* Card 2: VIP Customers */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-amber-500/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">⭐ KHÁCH VIP</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black gold-gradient-text font-mono">
            {summary.vipCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-amber-500 dark:text-amber-400/80 font-semibold">
            Chi tiêu &gt;= 1.000.000đ
          </div>
        </div>

        {/* Card 3: Retention Rate */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-blue-500/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">TỶ LỆ ĐẶT LẠI</span>
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {summary.retentionRate}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium">
            Khách mua từ 2 đơn trở lên
          </div>
        </div>

        {/* Card 4: New Customers this Month */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-emerald-500/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">KHÁCH MỚI THÁNG</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {summary.newThisMonthCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium">
            Phát sinh đơn tháng này
          </div>
        </div>

        {/* Card 5: Churn Risk Customers (>30 Days) */}
        <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border-2 border-rose-500/40 shadow-xs space-y-2 bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">⏰ CẦN CHĂM SÓC</span>
            <Clock className="w-4 h-4 text-rose-500 animate-spin" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {summary.churnRiskCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-rose-500 dark:text-rose-400 font-bold">
            &gt; 30 ngày chưa mua lại
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Text Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Tìm theo Tên khách hàng hoặc Số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
              className="w-full bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-900 dark:text-white pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Branch Filter */}
          <div className="relative shrink-0">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 pl-9 pr-8 py-3 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 Tất cả cơ sở</option>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleApplySearch}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
          >
            Tìm kiếm
          </button>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-thin">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-neutral-200 dark:text-neutral-950 shadow'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200'
            }`}
          >
            Tất cả hạng ({summary.totalCount})
          </button>

          <button
            onClick={() => setCategoryFilter('VIP')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              categoryFilter === 'VIP'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>⭐ Khách VIP (&gt;= 1tr) ({summary.vipCount})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('REGULAR')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              categoryFilter === 'REGULAR'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            <span>🍗 Khách quen (&gt;= 2 đơn)</span>
          </button>

          <button
            onClick={() => setCategoryFilter('NEW')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'NEW'
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200'
            }`}
          >
            Khách mới (1 đơn)
          </button>

          {/* Requirement 1: Tab Filter >30 Days Churn Risk */}
          <button
            onClick={() => setCategoryFilter('CHURN_RISK')}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-2 ${
              categoryFilter === 'CHURN_RISK'
                ? 'bg-rose-600 text-white border-rose-500 shadow'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 animate-pulse'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>⏰ Cần Chăm Sóc (&gt;30 Ngày) ({summary.churnRiskCount})</span>
          </button>
        </div>
      </div>

      {/* 4. Practical Customer Table */}
      <div className="bg-white dark:bg-[#14171D] rounded-2xl border border-slate-200 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-neutral-500 text-xs font-semibold">
            Đang tải danh sách khách hàng CRM...
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-400 dark:text-neutral-600 mx-auto stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-600 dark:text-neutral-400">
              Không tìm thấy khách hàng phù hợp bộ lọc
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4">KHÁCH HÀNG</th>
                  <th className="py-3.5 px-4">SỐ ĐIỆN THOẠI</th>
                  <th className="py-3.5 px-4">ĐỊA CHỈ THƯỜNG GIAO</th>
                  <th className="py-3.5 px-4 text-center">SỐ ĐƠN ĐÃ MUA</th>
                  <th className="py-3.5 px-4">TỔNG CHI TIÊU</th>
                  <th className="py-3.5 px-4">LẦN MUA GẦN NHẤT</th>
                  <th className="py-3.5 px-4">GHI CHÚ / KHẨU VỊ</th>
                  <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {customers.map((c) => {
                  const isVIP = c.tier === 'VIP';
                  const isRegular = c.tier === 'REGULAR';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60 transition-colors whitespace-nowrap"
                    >
                      {/* 1. KHÁCH HÀNG & BADGE */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleOpenDrawer(c)}
                            className="font-extrabold text-slate-900 dark:text-white hover:text-amber-500 text-xs text-left cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{c.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                          </button>
                          <div>
                            {isVIP ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/40">
                                ⭐ VIP
                              </span>
                            ) : isRegular ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                🍗 Khách quen
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                                Khách mới
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. SỐ ĐIỆN THOẠI */}
                      <td className="py-3.5 px-4">
                        <PhoneActionCell phone={c.phone} showName={false} />
                      </td>

                      {/* 3. ĐỊA CHỈ THƯỜNG GIAO */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-neutral-400 font-light max-w-xs truncate">
                        {c.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : (
                          '---'
                        )}
                      </td>

                      {/* 4. SỐ ĐƠN ĐÃ MUA */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenDrawer(c)}
                          className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black rounded-lg text-xs hover:bg-blue-500/20 transition cursor-pointer border border-blue-500/20"
                        >
                          {c.totalOrders} Đơn
                        </button>
                      </td>

                      {/* 5. TỔNG CHI TIÊU */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-amber-600 dark:text-amber-400">
                        {c.totalSpent.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 6. LẦN MUA GẦN NHẤT & CHURN WARNING */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="text-slate-700 dark:text-neutral-300 font-semibold block">
                            {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                          </span>
                          {/* Requirement 1: Churn Warning Badge */}
                          {c.isChurnRisk && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-500 border border-rose-500/40 inline-flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> {c.daysSinceLastOrder} ngày chưa mua
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. GHI CHÚ / KHẨU VỊ */}
                      <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-600 dark:text-neutral-400 font-light">
                        {c.tasteNotes ? (
                          <span className="bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                            {c.tasteNotes}
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>

                      {/* 8. THAO TÁC (ACTIONS) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick POS Order Button */}
                          <button
                            onClick={() => handleOpenQuickOrder(c)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Tạo đơn hàng mới pre-fill 100%"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Tạo đơn</span>
                          </button>

                          {/* Requirement 2: Zalo Re-order Button */}
                          <button
                            onClick={() => handleOpenZaloModal(c)}
                            className={`px-2.5 py-1.5 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs ${
                              c.isChurnRisk
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-bounce'
                                : 'bg-slate-100 dark:bg-neutral-800 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                            title="Gửi tin nhắn Zalo remarketing"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Gửi Zalo</span>
                          </button>

                          {/* Edit Customer Button */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-500 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= SECTION A: CUSTOMER DETAIL DRAWER (SLIDE-OVER) ================= */}
      {selectedDrawerCustomer && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white dark:bg-[#14171D] border-l border-slate-300 dark:border-neutral-800 max-w-md w-full h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-extrabold text-base">
                    {selectedDrawerCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <PhoneActionCell name={selectedDrawerCustomer.name} phone={selectedDrawerCustomer.phone} />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDrawerCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Customer Stats Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
                  <span className="text-slate-400 font-semibold block text-[10px]">TỔNG CHI TIÊU</span>
                  <span className="font-black text-amber-500 text-sm font-mono">
                    {selectedDrawerCustomer.totalSpent.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
                  <span className="text-slate-400 font-semibold block text-[10px]">SỐ ĐƠN ĐÃ ĐẶT</span>
                  <span className="font-black text-blue-500 text-sm font-mono">
                    {selectedDrawerCustomer.totalOrders} Đơn
                  </span>
                </div>
              </div>

              {/* Favorite Dish & Address */}
              <div className="space-y-2 text-xs">
                {drawerDetail?.customer?.favoriteDish && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Món yêu thích nhất: {drawerDetail.customer.favoriteDish}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
                  <span className="text-slate-400 font-semibold block text-[10px]">ĐỊA CHỈ GIAO HÀNG QUEN THUỘC</span>
                  <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                    {selectedDrawerCustomer.address || 'Chưa cập nhật địa chỉ'}
                  </span>
                </div>
              </div>

              {/* Order History Timeline */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>Lịch Sử Tất Cả Đơn Hàng ({drawerDetail?.orders?.length || 0})</span>
                </h4>

                {drawerLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Đang tải lịch sử đơn hàng...</div>
                ) : !drawerDetail?.orders || drawerDetail.orders.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Chưa có lịch sử đơn hàng nào</div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {drawerDetail.orders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className="p-3.5 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-amber-500 font-mono">{ord.orderCode}</span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(ord.createdAt).toLocaleDateString('vi-VN')} {new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1 border-t border-b border-slate-200 dark:border-neutral-800 py-2">
                          {ord.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-slate-700 dark:text-neutral-300">
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="font-mono text-slate-500">
                                {item.subtotal?.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold pt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-500">
                            {ord.status}
                          </span>
                          <span className="font-mono text-amber-400">
                            {ord.totalAmount?.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDrawerCustomer(null)}
              className="w-full py-3 bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-extrabold text-xs rounded-xl hover:bg-slate-300 transition cursor-pointer"
            >
              Đóng Drawer
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION B: MODAL REMARKETING ZALO (>30 DAYS) ================= */}
      {zaloCustomer && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <span>Soạn Tin Nhắn Zalo Remarketing Khách Cũ</span>
              </h3>
              <button
                onClick={() => setZaloCustomer(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requirement 3: Customer Info Summary */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>👤 Khách hàng: {zaloCustomer.name}</span>
                <span className="font-mono text-emerald-400">{zaloCustomer.phone}</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-neutral-400">
                Số đơn đã mua: <strong>{zaloCustomer.totalOrders} đơn</strong> • Số ngày chưa mua lại:{' '}
                <strong className="text-rose-500">{zaloCustomer.daysSinceLastOrder} ngày</strong>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2 text-xs">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                Chọn Mẫu Tin Nhắn Gợi Ý:
              </label>
              <div className="space-y-2">
                {messageTemplates.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTemplate(idx)}
                    className={`w-full text-left p-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                      selectedTemplateIndex === idx
                        ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0B0D11] border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-amber-500/40'
                    }`}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Preview Textarea */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                Nội Dung Tin Nhắn (Có Thể Chỉnh Sửa):
              </label>
              <textarea
                rows={5}
                value={customZaloMessage}
                onChange={(e) => setCustomZaloMessage(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyAndOpenZalo}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>🚀 Mở Zalo & Gửi Ngay</span>
              </button>

              <button
                type="button"
                onClick={handleMarkContacted}
                disabled={sendingZalo}
                className="py-3 px-4 bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đánh Dấu Đã Nhắc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION C: EDIT CUSTOMER MODAL ================= */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-500" />
                <span>Sửa Thông Tin Khách Hàng</span>
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-neutral-200">Tên Khách Hàng (*):</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-neutral-200">Địa Chỉ Thường Giao:</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-neutral-200">Ghi Chú Khẩu Vị / Sở Thích:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn cay nhiều ớt xanh, xin thêm rau răm..."
                  value={editTasteNotes}
                  onChange={(e) => setEditTasteNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-neutral-200">Cơ Sở Phục Vụ Gần Nhất:</label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                >
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold text-xs rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION D: QUICK POS ORDER MODAL ================= */}
      {quickOrderCustomer && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span>Tạo Đơn Hàng Nhanh Cho {quickOrderCustomer.name}</span>
              </h3>
              <button
                onClick={() => setQuickOrderCustomer(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-500">
                👤 {quickOrderCustomer.name} - {quickOrderCustomer.phone}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-neutral-400">
                📍 Giao tới: {quickOrderCustomer.address || 'Địa chỉ chưa cập nhật'}
              </div>
            </div>

            {/* Add Product Controls */}
            <div className="space-y-3 text-xs">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                Thêm Món Ăn Vào Đơn Hàng:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAddProdId}
                  onChange={(e) => setSelectedAddProdId(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {dbProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price.toLocaleString('vi-VN')}đ
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddProductToOrder}
                  className="px-4 py-2.5 bg-amber-500 text-neutral-950 font-extrabold rounded-xl hover:bg-amber-400 transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Thêm món
                </button>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-2">
                {orderItems.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-4">Chưa chọn món nào</div>
                ) : (
                  orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold border-b border-slate-100 dark:border-neutral-800 pb-1.5">
                      <span className="text-slate-900 dark:text-white">{item.productName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{item.quantity}x {item.price.toLocaleString('vi-VN')}đ</span>
                        <span className="font-mono text-amber-500">{(item.quantity * item.price).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuickOrderCustomer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold text-xs rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateQuickOrder}
                disabled={creatingOrder}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                {creatingOrder ? 'Đang tạo đơn...' : '🚀 Xác Nhận Tạo Đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
