'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  FileText,
  RotateCcw,
  Check,
  PhoneCall,
  ArrowUpDown,
  History,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import PhoneActionCell from '@/components/PhoneActionCell';
import * as XLSX from 'xlsx';
import { useBranches } from '@/hooks/useBranches';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  branchId: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastCareAt: string | null;
  careStatus: string | null; // NEW, CONTACTED, NEED_FOLLOW_UP
  isActive: boolean;
  tasteNotes: string | null;
  favoriteDish: string | null;
  lastContactedAt: string | null;
  contactCount: number;
  reorderNotes: string | null;
  createdAt: string;
  daysSinceLastOrder?: number | null;
  daysSinceLastCare?: number | null;
  isChurnRisk?: boolean;
  isCareNeeded?: boolean;
  tier?: 'VIP' | 'REGULAR' | 'NEW';
}

interface CareScript {
  id: string;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export default function CustomerCRMPage() {
  const { branches } = useBranches();
  const BRANCHES = useMemo(() => {
    return branches.length > 0
      ? branches.map((b) => ({ id: b.id, name: `📍 ${b.code ? b.code + ' - ' : ''}${b.name}` }))
      : [
          { id: 'cs1', name: '📍 CS1 - Cầu Giấy' },
          { id: 'cs2', name: '📍 CS2 - Đống Đa' },
          { id: 'cs3', name: '📍 CS3 - Hai Bà Trưng' },
          { id: 'cs4', name: '📍 CS4 - Thanh Xuân' },
          { id: 'cs5', name: '📍 CS5 - Tây Hồ' },
          { id: 'cs6', name: '📍 CS6 - Nam Từ Liêm' },
        ];
  }, [branches]);

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalCount: 0,
    vipCount: 0,
    retentionRate: 0,
    newThisMonthCount: 0,
    churnRiskCount: 0,
    needCareCount: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, VIP, REGULAR, NEW, CHURN_RISK, NEED_CARE_7D, NEED_CARE_14D
  const [careStatusFilter, setCareStatusFilter] = useState('ALL'); // ALL, NEW, CONTACTED, NEED_FOLLOW_UP
  const [branchFilter, setBranchFilter] = useState('all');

  // Care Scripts State
  const [careScripts, setCareScripts] = useState<CareScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');

  // Modals & Drawer States
  const [selectedDrawerCustomer, setSelectedDrawerCustomer] = useState<CustomerRecord | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<{ customer: any; orders: any[] } | null>(null);

  // Add / Edit Customer Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [formCustId, setFormCustId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBranchId, setFormBranchId] = useState('cs1');
  const [formTasteNotes, setFormTasteNotes] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCareStatus, setFormCareStatus] = useState('NEW');
  const [phoneDuplicateNotice, setPhoneDuplicateNotice] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Zalo Outreach Modal State
  const [zaloModalOpen, setZaloModalOpen] = useState(false);
  const [zaloCustomer, setZaloCustomer] = useState<CustomerRecord | null>(null);
  const [customZaloMessage, setCustomZaloMessage] = useState('');
  const [updatingCare, setUpdatingCare] = useState(false);

  // Script Manager Modal State
  const [scriptManagerOpen, setScriptManagerOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<CareScript | null>(null);
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptType, setScriptType] = useState('RE_ENGAGE');
  const [savingScript, setSavingScript] = useState(false);

  // Quick POS Order Modal State
  const [quickOrderCustomer, setQuickOrderCustomer] = useState<CustomerRecord | null>(null);
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);
  const [orderItems, setOrderItems] = useState<{ productId: string; productName: string; price: number; quantity: number }[]>([]);
  const [selectedAddProdId, setSelectedAddProdId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderShippingFee, setOrderShippingFee] = useState(35000);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Fetch CRM Customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (careStatusFilter !== 'ALL') params.append('careStatus', careStatusFilter);
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

  // Fetch Care Scripts
  const fetchCareScripts = async () => {
    try {
      const res = await fetch('/api/crm/scripts');
      const data = await res.json();
      if (data.success && Array.isArray(data.scripts)) {
        setCareScripts(data.scripts);
        if (data.scripts.length > 0 && !selectedScriptId) {
          setSelectedScriptId(data.scripts[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching scripts:', err);
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
    fetchCareScripts();
    fetchProducts();
  }, [categoryFilter, careStatusFilter, branchFilter]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomers();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Helper to get branch name
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return 'CS1 - Cầu Giấy';
    const found = BRANCHES.find((b) => b.id === branchId || b.id.toLowerCase() === branchId.toLowerCase());
    return found ? found.name.replace('📍 ', '') : branchId;
  };

  // 2. Open Add Customer Modal
  const handleOpenAddCustomer = () => {
    setIsEditingCustomer(false);
    setFormCustId('');
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormBranchId('cs1');
    setFormTasteNotes('');
    setFormNotes('');
    setFormCareStatus('NEW');
    setPhoneDuplicateNotice(null);
    setCustomerModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (cust: CustomerRecord) => {
    setIsEditingCustomer(true);
    setFormCustId(cust.id);
    setFormName(cust.name);
    setFormPhone(cust.phone);
    setFormAddress(cust.address || '');
    setFormBranchId(cust.branchId || 'cs1');
    setFormTasteNotes(cust.tasteNotes || '');
    setFormNotes(cust.notes || '');
    setFormCareStatus(cust.careStatus || 'NEW');
    setPhoneDuplicateNotice(null);
    setCustomerModalOpen(true);
  };

  // Check phone duplicate on typing in Add mode
  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormPhone(val);
    const clean = val.trim();
    if (!isEditingCustomer && clean.length >= 9) {
      const existing = customers.find((c) => c.phone === clean);
      if (existing) {
        setPhoneDuplicateNotice(`⚠️ SĐT [${clean}] đã có trong hệ thống (${existing.name}). Bấm lưu sẽ cập nhật thông tin cho khách này.`);
        if (!formName) setFormName(existing.name);
        if (!formAddress && existing.address) setFormAddress(existing.address);
        if (existing.branchId) setFormBranchId(existing.branchId);
      } else {
        setPhoneDuplicateNotice(null);
      }
    } else {
      setPhoneDuplicateNotice(null);
    }
  };

  const handleSaveCustomer = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      alert('Vui lòng nhập Họ tên và Số điện thoại');
      return;
    }

    setSavingCustomer(true);
    try {
      if (isEditingCustomer && formCustId) {
        const res = await fetch(`/api/customers/${formCustId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            phone: formPhone,
            address: formAddress,
            branchId: formBranchId,
            tasteNotes: formTasteNotes,
            notes: formNotes,
            careStatus: formCareStatus,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Cập nhật thông tin khách hàng ${formName} thành công!`);
          setCustomerModalOpen(false);
          fetchCustomers();
        } else {
          alert(data.error || 'Lỗi cập nhật');
        }
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            phone: formPhone,
            address: formAddress,
            branchId: formBranchId,
            tasteNotes: formTasteNotes,
            notes: formNotes,
            careStatus: formCareStatus,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'Lưu thông tin khách hàng thành công!');
          setCustomerModalOpen(false);
          fetchCustomers();
        } else {
          alert(data.error || 'Lỗi thêm mới');
        }
      }
    } catch (e: any) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSavingCustomer(false);
    }
  };

  // 3. Customer Detail Drawer Fetch
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

  // 4. Outreach & Script Rendering Helper
  const renderScriptTemplate = (templateContent: string, cust: CustomerRecord) => {
    const branchName = getBranchName(cust.branchId);
    return templateContent
      .replace(/{ten_khach}/g, cust.name || 'Anh/Chị')
      .replace(/{sdt}/g, cust.phone || '')
      .replace(/{dia_chi}/g, cust.address || 'Hà Nội')
      .replace(/{co_so}/g, branchName)
      .replace(/{mon_da_mua}/g, cust.favoriteDish || 'Gà Ủ Muối');
  };

  const handleOpenZaloModal = (cust: CustomerRecord) => {
    setZaloCustomer(cust);
    const defaultScript = careScripts.length > 0 ? careScripts[0] : null;
    if (defaultScript) {
      setSelectedScriptId(defaultScript.id);
      setCustomZaloMessage(renderScriptTemplate(defaultScript.content, cust));
    } else {
      setCustomZaloMessage(
        `Dạ Gà Smart ${getBranchName(cust.branchId)} xin chào ${cust.name}! Lâu rồi chưa thấy anh/chị ghé bếp thưởng thức món Gà Ủ Muối da giòn sần sật. Bếp xin gửi tặng riêng anh/chị mã giảm 15% cho đơn hôm nay ạ! 🍗✨`
      );
    }
    setZaloModalOpen(true);
  };

  const handleSelectScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    if (!zaloCustomer) return;
    const script = careScripts.find((s) => s.id === scriptId);
    if (script) {
      setCustomZaloMessage(renderScriptTemplate(script.content, zaloCustomer));
    }
  };

  // Copy rendered script only
  const handleCopyScriptOnly = async () => {
    try {
      await navigator.clipboard.writeText(customZaloMessage);
      showToast('📋 Đã copy kịch bản vào bộ nhớ tạm (Clipboard)!');
    } catch (e) {
      console.error(e);
    }
  };

  // Open Zalo Deep Link + Copy Text + Mark Contacted in DB
  const handleOpenZaloAndMarkContacted = async () => {
    if (!zaloCustomer) return;
    setUpdatingCare(true);
    try {
      const cleanPhone = zaloCustomer.phone.replace(/[^0-9]/g, '');
      await navigator.clipboard.writeText(customZaloMessage || cleanPhone);
      showToast('🚀 Đã copy tin nhắn & SĐT! Đang mở tab Zalo...');

      const zaloUrl = `https://zalo.me/${cleanPhone}`;
      window.open(zaloUrl, '_blank');

      // Update care status to CONTACTED in DB
      const res = await fetch(`/api/customers/${zaloCustomer.id}/care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONTACTED',
          notes: customZaloMessage.substring(0, 150),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã đánh dấu đã chăm sóc Zalo cho ${zaloCustomer.name}!`);
        setZaloModalOpen(false);
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingCare(false);
    }
  };

  // Reset Care Status to NEED_FOLLOW_UP
  const handleResetCareStatus = async (cust: CustomerRecord) => {
    if (!confirm(`Xác nhận reset trạng thái chăm sóc cho khách hàng "${cust.name}" về [Cần Chăm Sóc Lại]?`)) return;
    try {
      const res = await fetch(`/api/customers/${cust.id}/care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã reset trạng thái cho ${cust.name}!`);
        if (zaloModalOpen) setZaloModalOpen(false);
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Open Zalo directly from table
  const handleQuickZaloDirect = async (cust: CustomerRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    try {
      await navigator.clipboard.writeText(cleanPhone);
      showToast(`Đã copy SĐT ${cleanPhone} và mở Zalo!`);
    } catch (err) {}
    window.open(`https://zalo.me/${cleanPhone}`, '_blank');
  };

  // 5. Script Manager Handlers
  const handleOpenScriptManager = () => {
    setEditingScript(null);
    setScriptTitle('');
    setScriptContent('');
    setScriptType('RE_ENGAGE');
    setScriptManagerOpen(true);
  };

  const handleEditScriptItem = (script: CareScript) => {
    setEditingScript(script);
    setScriptTitle(script.title);
    setScriptContent(script.content);
    setScriptType(script.type || 'RE_ENGAGE');
  };

  const handleSaveScript = async () => {
    if (!scriptTitle.trim() || !scriptContent.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung kịch bản');
      return;
    }

    setSavingScript(true);
    try {
      if (editingScript) {
        const res = await fetch(`/api/crm/scripts/${editingScript.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: scriptTitle,
            content: scriptContent,
            type: scriptType,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Cập nhật kịch bản mẫu thành công!');
          setEditingScript(null);
          setScriptTitle('');
          setScriptContent('');
          fetchCareScripts();
        }
      } else {
        const res = await fetch('/api/crm/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: scriptTitle,
            content: scriptContent,
            type: scriptType,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Thêm mới kịch bản mẫu thành công!');
          setScriptTitle('');
          setScriptContent('');
          fetchCareScripts();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingScript(false);
    }
  };

  // 6. Quick POS Order Handlers
  const handleOpenQuickOrder = (cust: CustomerRecord) => {
    setQuickOrderCustomer(cust);
    setOrderItems([]);
    setOrderNotes(cust.tasteNotes ? `Khẩu vị: ${cust.tasteNotes}` : '');
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
          note: `[CRM Quick Order] ${orderNotes}`,
          branchId: quickOrderCustomer.branchId || 'cs1',
          shippingFee: orderShippingFee,
          paymentMethod: 'CASH',
          sellerName: 'Thu ngân CRM',
          sourceTag: 'CRM Zalo Outreach',
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

  // 7. Export Excel Handler
  const handleExportExcel = () => {
    const exportData = customers.map((c, idx) => ({
      STT: idx + 1,
      'Họ và Tên': c.name,
      'Số Điện Thoại': c.phone,
      'Địa Chỉ Giao Hàng': c.address || '---',
      'Cơ Sở Phục Vụ': getBranchName(c.branchId),
      'Phân Hạng': c.tier === 'VIP' ? '⭐ VIP' : c.totalOrders >= 2 ? '🍗 Khách Quen' : 'Khách Mới',
      'Số Đơn Đã Mua': c.totalOrders,
      'Tổng Chi Tiêu (VNĐ)': c.totalSpent,
      'Lần Mua Gần Nhất': c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : 'Chưa phát sinh',
      'Số Ngày Chưa Mua': c.daysSinceLastOrder ?? 0,
      'Trạng Thái CSKH': c.careStatus === 'CONTACTED' ? 'Đã chăm sóc' : c.careStatus === 'NEED_FOLLOW_UP' ? 'Cần chăm sóc lại' : 'Mới',
      'Lần CS Gần Nhất': c.lastCareAt ? new Date(c.lastCareAt).toLocaleDateString('vi-VN') : 'Chưa CS',
      'Ghi Chú Khẩu Vị / CRM': c.tasteNotes || c.notes || '---',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_Ba_Khach_Hang');
    XLSX.writeFile(workbook, `Danh_Muc_Khach_Hang_CRM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper formatting currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <span className="font-extrabold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Danh Mục Khách Hàng & Chăm Sóc Cũ (CRM)
              </h1>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" /> Zalo CRM Outreach
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Quản lý danh bạ khách hàng 6 cơ sở Hà Nội, chống trùng SĐT, tự động kích hoạt kịch bản chăm sóc Zalo và khôi phục khách cũ.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenScriptManager}
            className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 transition cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Mẫu Kịch Bản Zalo ({careScripts.length})</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAddCustomer}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* 2. Top CRM KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total Customers */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">TỔNG KHÁCH HÀNG</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Toàn bộ danh bạ</div>
        </div>

        {/* Card 2: VIP */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border border-amber-500/30 shadow-xs space-y-1.5 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-black uppercase tracking-wider">⭐ KHÁCH VIP</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {summary.vipCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-semibold">Chi tiêu ≥ 1.000.000đ</div>
        </div>

        {/* Card 3: Retention Rate */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border border-blue-500/30 shadow-xs space-y-1.5 bg-blue-500/5">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">TỶ LỆ QUAY LẠI</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {summary.retentionRate}%
          </div>
          <div className="text-[10px] text-blue-500/80 font-medium">Khách mua ≥ 2 đơn</div>
        </div>

        {/* Card 4: New This Month */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border border-emerald-500/30 shadow-xs space-y-1.5 bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">KHÁCH MỚI THÁNG</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {summary.newThisMonthCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-emerald-500/80 font-medium">Đơn mới trong tháng</div>
        </div>

        {/* Card 5: Need Care Zalo */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border-2 border-indigo-500/40 shadow-xs space-y-1.5 bg-indigo-500/5">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[11px] font-black uppercase tracking-wider">💬 CẦN CS ZALO</span>
            <MessageCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {summary.needCareCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-bold">&gt;7 ngày chưa CS lại</div>
        </div>

        {/* Card 6: Churn Risk */}
        <div className="bg-white dark:bg-[#14171D] p-4 rounded-2xl border-2 border-rose-500/40 shadow-xs space-y-1.5 bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-black uppercase tracking-wider">⚠️ NGUY CƠ RỜI BỎ</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {summary.churnRiskCount.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-rose-500 font-bold">&gt;30 ngày chưa đặt</div>
        </div>
      </div>

      {/* 3. Multifaceted Filter & Search Bar */}
      <div className="bg-white dark:bg-[#14171D] p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Instant Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo SĐT, Tên, hoặc Địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">📍 Tất Cả 6 Cơ Sở Hà Nội</option>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Segment Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">👥 Tất Cả Phân Khúc Khách</option>
              <option value="VIP">⭐ Khách VIP (Chi tiêu ≥ 1tr)</option>
              <option value="REGULAR">🍗 Khách Quen (≥ 2 đơn)</option>
              <option value="NEW">🌱 Khách Mới (&lt; 2 đơn)</option>
              <option value="NEED_CARE_7D">💬 Cần Chăm Sóc (&gt; 7 ngày)</option>
              <option value="NEED_CARE_14D">💬 Cần Chăm Sóc (&gt; 14 ngày)</option>
              <option value="CHURN_RISK">⚠️ Nguy Cơ Rời Bỏ (&gt; 30 ngày)</option>
            </select>
          </div>

          {/* Care Status Filter */}
          <div>
            <select
              value={careStatusFilter}
              onChange={(e) => setCareStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">🎯 Trạng Thái CSKH: Tất Cả</option>
              <option value="NEW">⚪ Mới / Chưa Chăm Sóc (NEW)</option>
              <option value="CONTACTED">🟢 Đã Nhắn Zalo Chăm Sóc (CONTACTED)</option>
              <option value="NEED_FOLLOW_UP">🟡 Cần Chăm Sóc Lại (NEED_FOLLOW_UP)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-neutral-400 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">Đang hiển thị:</span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              {customers.length} khách hàng
            </span>
            {categoryFilter !== 'ALL' && (
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-lg">
                Phân khúc: {categoryFilter}
              </span>
            )}
            {careStatusFilter !== 'ALL' && (
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-lg">
                CSKH: {careStatusFilter}
              </span>
            )}
            {branchFilter !== 'all' && (
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-lg">
                Cơ sở: {getBranchName(branchFilter)}
              </span>
            )}
          </div>

          <button
            onClick={fetchCustomers}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-neutral-300 hover:text-amber-500 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* 4. Customer Directory Data Table */}
      <div className="bg-white dark:bg-[#14171D] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-neutral-900/80 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                <th className="py-4 px-4">STT</th>
                <th className="py-4 px-4">Khách Hàng & SĐT</th>
                <th className="py-4 px-4">Địa Chỉ & Cơ Sở</th>
                <th className="py-4 px-4">Đơn & Chi Tiêu</th>
                <th className="py-4 px-4">Lần Mua Gần Nhất</th>
                <th className="py-4 px-4">Trạng Thái CSKH</th>
                <th className="py-4 px-4">Ghi Chú Khẩu Vị</th>
                <th className="py-4 px-4 text-center">Thao Tác Chăm Sóc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Đang tải danh bạ khách hàng...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-neutral-600 mb-2" />
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                customers.map((cust, idx) => {
                  // Elapsed days styling
                  const daysOrder = cust.daysSinceLastOrder;
                  let orderBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400';
                  let orderBadgeText = 'Chưa phát sinh';

                  if (daysOrder !== null && daysOrder !== undefined) {
                    if (daysOrder <= 3) {
                      orderBadgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                      orderBadgeText = `${daysOrder === 0 ? 'Hôm nay' : `${daysOrder} ngày trước`}`;
                    } else if (daysOrder <= 7) {
                      orderBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
                      orderBadgeText = `${daysOrder} ngày trước (1 tuần)`;
                    } else if (daysOrder <= 14) {
                      orderBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
                      orderBadgeText = `⚠️ ${daysOrder} ngày (2 tuần)`;
                    } else if (daysOrder <= 30) {
                      orderBadgeClass = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
                      orderBadgeText = `⏰ ${daysOrder} ngày (>2 tuần)`;
                    } else {
                      orderBadgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-extrabold animate-pulse';
                      orderBadgeText = `🚨 ${daysOrder} ngày (Nguy cơ)`;
                    }
                  }

                  // Care Status
                  const status = cust.careStatus || 'NEW';
                  const daysCare = cust.daysSinceLastCare;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-amber-500/[0.02] dark:hover:bg-neutral-800/40 transition group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 font-semibold">{idx + 1}</td>

                      {/* Khách hàng & SĐT */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => handleOpenDrawer(cust)}
                              className="font-bold text-slate-900 dark:text-white hover:text-amber-500 cursor-pointer transition text-sm"
                            >
                              {cust.name}
                            </span>
                            {cust.tier === 'VIP' ? (
                              <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                ⭐ VIP
                              </span>
                            ) : cust.totalOrders >= 2 ? (
                              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                Quen
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                Mới
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-600 dark:text-neutral-300 font-bold">
                              {cust.phone}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(cust.phone);
                                showToast(`Đã copy SĐT: ${cust.phone}`);
                              }}
                              title="Sao chép SĐT"
                              className="text-slate-400 hover:text-amber-500 p-0.5 transition cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`tel:${cust.phone}`}
                              title="Gọi điện"
                              className="text-slate-400 hover:text-emerald-500 p-0.5 transition cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={(e) => handleQuickZaloDirect(cust, e)}
                              title="Mở Zalo ngay"
                              className="text-slate-400 hover:text-blue-500 p-0.5 transition cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Địa chỉ & Cơ sở */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1 text-slate-700 dark:text-neutral-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 text-xs" title={cust.address || 'Chưa cập nhật địa chỉ'}>
                              {cust.address || <span className="italic text-slate-400">Chưa có địa chỉ</span>}
                            </span>
                          </div>
                          <span className="inline-block bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                            {getBranchName(cust.branchId)}
                          </span>
                        </div>
                      </td>

                      {/* Đơn & Chi tiêu */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 dark:text-white font-mono">
                            {cust.totalOrders} đơn
                          </div>
                          <div className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(cust.totalSpent)}
                          </div>
                        </div>
                      </td>

                      {/* Lần Mua Gần Nhất */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="text-slate-600 dark:text-neutral-300 font-medium">
                            {cust.lastOrderAt
                              ? new Date(cust.lastOrderAt).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'Chưa có'}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${orderBadgeClass}`}>
                            {orderBadgeText}
                          </span>
                        </div>
                      </td>

                      {/* Trạng Thái CSKH */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {status === 'CONTACTED' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Đã nhắn Zalo
                            </span>
                          ) : status === 'NEED_FOLLOW_UP' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Cần CS lại
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                              ⚪ Mới
                            </span>
                          )}

                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span>
                              {cust.lastCareAt
                                ? `CS: ${new Date(cust.lastCareAt).toLocaleDateString('vi-VN')}`
                                : cust.lastContactedAt
                                ? `CS: ${new Date(cust.lastContactedAt).toLocaleDateString('vi-VN')}`
                                : 'Chưa CS'}
                            </span>
                            <button
                              onClick={() => handleResetCareStatus(cust)}
                              title="Reset về Cần Chăm Sóc Lại"
                              className="text-slate-400 hover:text-amber-500 p-0.5 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Ghi Chú Khẩu Vị */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-2">
                          {cust.tasteNotes || cust.notes || cust.reorderNotes || (
                            <span className="italic text-slate-400">Chưa có ghi chú</span>
                          )}
                        </div>
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Button Chăm Sóc Zalo */}
                          <button
                            onClick={() => handleOpenZaloModal(cust)}
                            title="Mở kịch bản chăm sóc Zalo"
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Zalo</span>
                          </button>

                          {/* Button Đặt Hàng POS Nhanh */}
                          <button
                            onClick={() => handleOpenQuickOrder(cust)}
                            title="Tạo đơn hàng nhanh cho khách"
                            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Tạo Đơn</span>
                          </button>

                          {/* Button Sửa */}
                          <button
                            onClick={() => handleOpenEditCustomer(cust)}
                            title="Sửa thông tin khách hàng"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Button Xem Lịch Sử */}
                          <button
                            onClick={() => handleOpenDrawer(cust)}
                            title="Xem lịch sử mua hàng"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* MODAL 1: SOẠN & CHỌN KỊCH BẢN CHĂM SÓC ZALO (ZALO CRM OUTREACH MODAL) */}
      {/* ========================================================================= */}
      {zaloModalOpen && zaloCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-amber-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Soạn Kịch Bản Chăm Sóc Zalo: {zaloCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-bold">
                    SĐT: {zaloCustomer.phone} • {getBranchName(zaloCustomer.branchId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setZaloModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Template Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-2">
                  1. Chọn Mẫu Kịch Bản Có Sẵn:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {careScripts.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectScript(sc.id)}
                      className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                        selectedScriptId === sc.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black shadow-xs'
                          : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold'
                      }`}
                    >
                      <div className="text-xs font-bold line-clamp-1">{sc.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Loại: {sc.type || 'RE_ENGAGE'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    2. Nội Dung Tin Nhắn (Đã tự động điền tên & địa chỉ khách):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Hỗ trợ sửa đổi trực tiếp trước khi gửi
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customZaloMessage}
                  onChange={(e) => setCustomZaloMessage(e.target.value)}
                  className="w-full p-3.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* Customer Info Quick Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                  <span>📍 Địa chỉ giao hàng:</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{zaloCustomer.address || 'Chưa có'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                  <span>🍗 Món yêu thích / Hay đặt:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{zaloCustomer.favoriteDish || 'Gà Ủ Muối'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
                  <span>⏰ Lần mua gần nhất:</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">
                    {zaloCustomer.daysSinceLastOrder !== null && zaloCustomer.daysSinceLastOrder !== undefined
                      ? `${zaloCustomer.daysSinceLastOrder} ngày trước`
                      : 'Chưa có'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-neutral-900/50 flex-wrap">
              <button
                type="button"
                onClick={() => handleResetCareStatus(zaloCustomer)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Đánh dấu cần CS lại</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyScriptOnly}
                  className="flex items-center gap-2 bg-slate-200 dark:bg-neutral-800 hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Kịch Bản</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenZaloAndMarkContacted}
                  disabled={updatingCare}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{updatingCare ? 'Đang xử lý...' : '🚀 Mở Zalo & Ghi Nhận CSKH'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM MỚI / CHỈNH SỬA KHÁCH HÀNG (LIVE PHONE DUPLICATE CHECK) */}
      {/* ========================================================================= */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  {isEditingCustomer ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isEditingCustomer ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Mới Khách Hàng CRM'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Tự động chống trùng lặp dữ liệu theo Số Điện Thoại
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Phone Notice if duplicate */}
              {phoneDuplicateNotice && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold">
                  {phoneDuplicateNotice}
                </div>
              )}

              {/* SĐT */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Số Điện Thoại (Khóa chính / Unique) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0988888999"
                  value={formPhone}
                  onChange={handlePhoneChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Họ Tên */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Họ và Tên Khách Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Anh Khang, Chị Lan..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Địa Chỉ */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Địa Chỉ Giao Hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Số 37 Mễ Trì Hạ, Nam Từ Liêm, Hà Nội"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Cơ Sở */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Cơ Sở Phục Vụ Gần Nhất (6 Chi Nhánh Hà Nội)
                </label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trạng Thái CSKH */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Trạng Thái Chăm Sóc Khách Hàng (Care Status)
                </label>
                <select
                  value={formCareStatus}
                  onChange={(e) => setFormCareStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="NEW">⚪ Mới (NEW)</option>
                  <option value="CONTACTED">🟢 Đã Chăm Sóc Zalo (CONTACTED)</option>
                  <option value="NEED_FOLLOW_UP">🟡 Cần Chăm Sóc Lại (NEED_FOLLOW_UP)</option>
                </select>
              </div>

              {/* Ghi chú khẩu vị & CRM */}
              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Ghi Chú Khẩu Vị / Sở Thích Ăn Uống
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Thích nhiều sốt ớt xanh, không ăn cay, thích gà chặt khúc..."
                  value={formTasteNotes}
                  onChange={(e) => setFormTasteNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 dark:text-neutral-300 mb-1">
                  Ghi Chú CSKH & Quản Trị
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú nội bộ dành cho nhân viên..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-neutral-900/50">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {savingCustomer ? 'Đang Lưu...' : isEditingCustomer ? 'Cập Nhật' : 'Tạo Khách Hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUẢN LÝ KỊCH BẢN MẪU CHĂM SÓC (SCRIPT MANAGER MODAL) */}
      {/* ========================================================================= */}
      {scriptManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Quản Lý Danh Sách Kịch Bản Chăm Sóc Zalo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Tùy chỉnh các mẫu tin nhắn chăm sóc khách quen, xin đánh giá, và ưu đãi tháng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScriptManagerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Script Form */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
                    {editingScript ? '✏️ Chỉnh Sửa Kịch Bản' : '➕ Thêm Mới Kịch Bản Mẫu'}
                  </span>
                  {editingScript && (
                    <button
                      onClick={() => {
                        setEditingScript(null);
                        setScriptTitle('');
                        setScriptContent('');
                      }}
                      className="text-slate-400 hover:text-rose-500 font-bold transition cursor-pointer"
                    >
                      Hủy Chỉnh Sửa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                      Tiêu Đề Kịch Bản
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tặng voucher 15% khách quen..."
                      value={scriptTitle}
                      onChange={(e) => setScriptTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#14171D] border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                      Phân Loại Kịch Bản
                    </label>
                    <select
                      value={scriptType}
                      onChange={(e) => setScriptType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#14171D] border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="RE_ENGAGE">Khách Quen Lâu Ngày (RE_ENGAGE)</option>
                      <option value="FEEDBACK">Xin Đánh Giá Sau Giao (FEEDBACK)</option>
                      <option value="PROMO">Khuyến Mãi & Món Mới (PROMO)</option>
                      <option value="VIP">Tri Ân VIP & Sinh Nhật (VIP)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Nội Dung Kịch Bản (Dùng biến: {'{ten_khach}'}, {'{dia_chi}'}, {'{co_so}'}, {'{mon_da_mua}'})
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Nhập nội dung tin nhắn mẫu..."
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-[#14171D] border border-slate-200 dark:border-neutral-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveScript}
                    disabled={savingScript}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {savingScript ? 'Đang Lưu...' : editingScript ? 'Lưu Thay Đổi' : '+ Thêm Kịch Bản'}
                  </button>
                </div>
              </div>

              {/* Existing Scripts List */}
              <div className="space-y-3">
                <span className="font-black text-slate-800 dark:text-neutral-200 uppercase tracking-wider block">
                  Danh Sách Kịch Bản Hiện Có ({careScripts.length}):
                </span>
                <div className="space-y-2">
                  {careScripts.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#14171D] border border-slate-200 dark:border-neutral-800 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{sc.title}</span>
                          <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {sc.type || 'RE_ENGAGE'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-neutral-400 whitespace-pre-line text-xs font-medium">
                          {sc.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditScriptItem(sc)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 font-bold rounded-lg transition cursor-pointer shrink-0"
                      >
                        Sửa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end bg-slate-50 dark:bg-neutral-900/50">
              <button
                onClick={() => setScriptManagerOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TẠO ĐƠN HÀNG NHANH CHO KHÁCH HÀNG CRM (QUICK POS ORDER MODAL) */}
      {/* ========================================================================= */}
      {quickOrderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Tạo Đơn Hàng Nhanh: {quickOrderCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                    {quickOrderCustomer.phone} • {getBranchName(quickOrderCustomer.branchId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickOrderCustomer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Product Selector */}
              <div className="space-y-2">
                <label className="block font-black text-slate-700 dark:text-neutral-300">
                  Chọn Món Ăn Vào Đơn:
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedAddProdId}
                    onChange={(e) => setSelectedAddProdId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {dbProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatCurrency(p.price)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProductToOrder}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-neutral-300 block">
                  Danh Sách Món Trong Đơn ({orderItems.length}):
                </span>
                {orderItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                    Chưa có món nào được chọn.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {orderItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <span className="bg-slate-200 dark:bg-neutral-800 font-bold px-2 py-0.5 rounded-md">
                            x{item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              setOrderItems((prev) => prev.filter((_, idx2) => idx2 !== i))
                            }
                            className="text-rose-500 hover:text-rose-600 font-bold p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shipping fee & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Phí Giao Hàng (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={orderShippingFee}
                    onChange={(e) => setOrderShippingFee(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Ghi Chú Đơn Hàng
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Ghi chú giao hàng..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-900/50">
              <div className="text-xs">
                <span className="text-slate-400">Tổng Tiền: </span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                  {formatCurrency(
                    orderItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0) + orderShippingFee
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickOrderCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 font-bold text-slate-700 dark:text-neutral-300 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateQuickOrder}
                  disabled={creatingOrder}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {creatingOrder ? 'Đang Tạo Đơn...' : '🚀 Xác Nhận Tạo Đơn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: XEM CHI TIẾT KHÁCH HÀNG & LỊCH SỬ ĐƠN HÀNG */}
      {/* ========================================================================= */}
      {selectedDrawerCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#181B20] border-l border-slate-200 dark:border-neutral-800 w-full max-w-xl h-full shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Lịch Sử Khách Hàng: {selectedDrawerCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                    {selectedDrawerCustomer.phone} • {getBranchName(selectedDrawerCustomer.branchId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDrawerCustomer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {drawerLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                  Đang tải chi tiết đơn hàng...
                </div>
              ) : drawerDetail ? (
                <>
                  {/* Summary Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tổng Số Đơn</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                        {drawerDetail.orders?.length || 0}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tổng Chi Tiêu</span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(drawerDetail.customer?.totalSpent || 0)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Món Yêu Thích</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {drawerDetail.customer?.favoriteDish || 'Gà Ủ Muối'}
                      </span>
                    </div>
                  </div>

                  {/* Orders Timeline */}
                  <div className="space-y-3">
                    <span className="font-black text-slate-800 dark:text-neutral-200 uppercase tracking-wider block">
                      Danh Sách Đơn Hàng Đã Mua ({drawerDetail.orders?.length || 0}):
                    </span>
                    {drawerDetail.orders && drawerDetail.orders.length > 0 ? (
                      <div className="space-y-3">
                        {drawerDetail.orders.map((order: any) => (
                          <div
                            key={order.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                                #{order.orderCode}
                              </span>
                              <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-400 text-[11px]">
                              <span>
                                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="font-bold text-slate-600 dark:text-neutral-300">
                                {order.status} • {order.paymentMethod}
                              </span>
                            </div>

                            {/* Items */}
                            {order.items && order.items.length > 0 && (
                              <div className="border-t border-slate-200 dark:border-neutral-800 pt-2 space-y-1">
                                {order.items.map((it: any) => (
                                  <div key={it.id} className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-400">
                                    <span>• {it.productName} (x{it.quantity})</span>
                                    <span>{formatCurrency(it.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                        Khách hàng chưa có lịch sử đơn hàng nào trong hệ thống.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-neutral-800 flex justify-end bg-slate-50 dark:bg-neutral-900/50">
              <button
                onClick={() => setSelectedDrawerCustomer(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
