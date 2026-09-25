'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Eye,
  Bell,
  BellRing,
  Clock,
  Sparkles,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Check,
  ChevronDown,
  Pencil,
  QrCode,
  Share2,
  Copy,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import PhoneActionCell from '@/components/PhoneActionCell';
import * as XLSX from 'xlsx';
import { useBranches, detectBranchIdFromText } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OrderRecord {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  note: string | null;
  status: string; // PENDING, CONFIRMED, DELIVERING, COMPLETED, CANCELLED
  paymentStatus: string; // UNPAID, PAID
  paymentMethod: string; // COD, BANK_TRANSFER, SPLIT
  totalAmount: number;
  cashAmount?: number | null;
  transferAmount?: number | null;
  discountAmount?: number | null;
  shippingFee?: number | null;
  branchId?: string | null;
  sellerName?: string | null;
  sourceTag?: string | null;
  carrierName?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

const formatOrderDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch (e) {
    return dateStr;
  }
};

export default function CentralizedOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [paymentConfig, setPaymentConfig] = useState<{
    bankId: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    qrTemplate: string;
    transferSyntax: string;
  }>({
    bankId: 'MB',
    bankName: 'MBBank',
    accountNumber: '0988888888',
    accountName: 'NGUYEN VAN KHANG',
    qrTemplate: 'compact2',
    transferSyntax: 'GMS [Mã_Đơn]'
  });

  const fetchPaymentConfigForBranch = useCallback(async (bId?: string) => {
    try {
      const url = bId && bId !== 'ALL'
        ? `/api/settings/payment?branchId=${bId}`
        : '/api/settings/payment';
      const res = await fetch(url);
      const data = await res.json();
      if (data.config) {
        setPaymentConfig(data.config);
      }
    } catch (e) {
      console.error('Error loading branch payment config:', e);
    }
  }, []);

  useEffect(() => {
    fetchPaymentConfigForBranch(branchFilter);
  }, [branchFilter, fetchPaymentConfigForBranch]);

  // Toast message
  const [toastMessage, setToastMessage] = useState('');

  const [statusTab, setStatusTab] = useState('ALL'); // ALL, PENDING, CONFIRMED, DELIVERING, COMPLETED, CANCELLED

  const { user: currentUser } = useAuth();
  const { branches } = useBranches();

  // Role matrix definitions
  const userRole = (currentUser?.role || '').toUpperCase();
  const isKitchen = userRole === 'KITCHEN' || userRole === 'CHEF' || userRole === 'BEP';
  const isTelesales = userRole === 'TELESALES' || userRole === 'CS' || userRole === 'TONG_DAI';
  const canEditPaymentStatus = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'CASHIER' || userRole === 'THU_NGAN' || userRole === 'STAFF';
  const canEditOrder = userRole === 'ADMIN' || userRole === 'MANAGER' || isTelesales;
  const canCreateOrder = !isKitchen;
  const canCancelOrder = userRole === 'ADMIN' || userRole === 'MANAGER' || isTelesales;

  const availableBranches = isKitchen && currentUser?.branchId
    ? branches.filter((b) => b.id === currentUser.branchId || b.code === currentUser.branchId)
    : (currentUser?.role === 'MANAGER' && currentUser.branchIds && currentUser.branchIds.length > 0)
    ? branches.filter((b) => currentUser.branchIds!.includes(b.id) || currentUser.branchIds!.includes(b.code))
    : branches;

  useEffect(() => {
    if (isKitchen && currentUser?.branchId) {
      setBranchFilter(currentUser.branchId);
    }
  }, [isKitchen, currentUser?.branchId]);

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [printBillOrder, setPrintBillOrder] = useState<OrderRecord | null>(null);
  const [smartBillOrder, setSmartBillOrder] = useState<OrderRecord | null>(null);
  const [copiedBillLink, setCopiedBillLink] = useState(false);
  const [copiedZaloMsg, setCopiedZaloMsg] = useState(false);
  const [confirmPaidOrderModal, setConfirmPaidOrderModal] = useState<{ id: string; targetStatus: string } | null>(null);

  // Shipping Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<OrderRecord | null>(null);
  const [shippingCarrierName, setShippingCarrierName] = useState('GrabExpress');
  const [shippingDriverName, setShippingDriverName] = useState('');
  const [shippingDriverPhone, setShippingDriverPhone] = useState('');
  const [shippingTrackingUrl, setShippingTrackingUrl] = useState('');
  const [submittingShipping, setSubmittingShipping] = useState(false);

  // AI Parser & Order Form State inside Modal
  const [rawAiMessage, setRawAiMessage] = useState('');
  const [parsingAi, setParsingAi] = useState(false);
  const [aiToast, setAiToast] = useState('');

  // Form Fields
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');
  const [formBranchId, setFormBranchId] = useState('cs1');
  const [formSellerName, setFormSellerName] = useState('Thu ngân POS');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'SPLIT'>('COD');
  const [formCashAmount, setFormCashAmount] = useState<number>(0);
  const [formTransferAmount, setFormTransferAmount] = useState<number>(0);
  const [formSourceTag, setFormSourceTag] = useState('Đơn Mới Web');
  const [formNotes, setFormNotes] = useState('');
  const [formShippingFee, setFormShippingFee] = useState(35000);
  const [formDiscountAmount, setFormDiscountAmount] = useState(0);
  const [formItems, setFormItems] = useState<OrderItem[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');

  const [formError, setFormError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Edit Order Modal States & Logic
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editBranchId, setEditBranchId] = useState('cs1');
  const [editNote, setEditNote] = useState('');
  const [editShippingFee, setEditShippingFee] = useState<number>(0);
  const [editDiscountAmount, setEditDiscountAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'SPLIT'>('COD');
  const [editCashAmount, setEditCashAmount] = useState<number>(0);
  const [editTransferAmount, setEditTransferAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('UNPAID');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editSelectedProductId, setEditSelectedProductId] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  const editSubtotal = useMemo(() => {
    return editItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [editItems]);

  const editFinalTotal = useMemo(() => {
    return Math.max(0, editSubtotal + (Number(editShippingFee) || 0) - (Number(editDiscountAmount) || 0));
  }, [editSubtotal, editShippingFee, editDiscountAmount]);

  const handleSelectEditSplit = () => {
    setEditPaymentMethod('SPLIT');
    setEditCashAmount(0);
    setEditTransferAmount(editFinalTotal);
  };

  const handleEditCashChange = (val: number) => {
    setEditCashAmount(val);
    setEditTransferAmount(Math.max(0, editFinalTotal - val));
  };

  const handleEditTransferChange = (val: number) => {
    setEditTransferAmount(val);
    setEditCashAmount(Math.max(0, editFinalTotal - val));
  };

  useEffect(() => {
    if (editingOrder && editPaymentMethod === 'SPLIT') {
      setEditTransferAmount(Math.max(0, editFinalTotal - editCashAmount));
    }
  }, [editFinalTotal]);

  const handleEditIncreaseQty = (index: number) => {
    const newItems = [...editItems];
    newItems[index].quantity += 1;
    newItems[index].subtotal = newItems[index].quantity * newItems[index].price;
    setEditItems(newItems);
  };

  const handleEditDecreaseQty = (index: number) => {
    const newItems = [...editItems];
    if (newItems[index].quantity > 1) {
      newItems[index].quantity -= 1;
      newItems[index].subtotal = newItems[index].quantity * newItems[index].price;
      setEditItems(newItems);
    }
  };

  const handleEditRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleEditAddProduct = () => {
    if (!editSelectedProductId) return;
    const prod = dbProducts.find((p) => p.id === editSelectedProductId);
    if (!prod) return;
    const existingIndex = editItems.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      const newItems = [...editItems];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].price;
      setEditItems(newItems);
    } else {
      setEditItems([
        ...editItems,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          price: prod.price,
          subtotal: prod.price,
        },
      ]);
    }
    setEditSelectedProductId('');
  };

  const handleOpenEditModal = (order: OrderRecord) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName || '');
    setEditCustomerPhone(order.customerPhone || '');
    setEditDeliveryAddress(order.deliveryAddress || '');
    setEditBranchId(order.branchId || 'cs1');
    setEditNote(order.note || '');
    setEditShippingFee(order.shippingFee || 0);
    setEditDiscountAmount(order.discountAmount || 0);
    setEditPaymentMethod((order.paymentMethod as 'COD' | 'BANK_TRANSFER' | 'SPLIT') || 'COD');
    setEditCashAmount((order as any).cashAmount !== undefined ? (order as any).cashAmount : (order.paymentMethod === 'COD' ? order.totalAmount : 0));
    setEditTransferAmount((order as any).transferAmount !== undefined ? (order as any).transferAmount : (order.paymentMethod === 'BANK_TRANSFER' ? order.totalAmount : 0));
    setEditStatus(order.status || 'PENDING');
    setEditPaymentStatus(order.paymentStatus || 'UNPAID');
    setEditItems((order.items || []).map((i) => ({ ...i })));
    setEditFormError('');
  };

  const handleSubmitEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    if (!editCustomerName.trim() || !editCustomerPhone.trim() || !editDeliveryAddress.trim()) {
      setEditFormError('Vui lòng điền đầy đủ Tên, SĐT và Địa chỉ giao hàng.');
      return;
    }
    if (editItems.length === 0) {
      setEditFormError('Đơn hàng phải có ít nhất 1 sản phẩm.');
      return;
    }

    setSubmittingEdit(true);
    setEditFormError('');

    try {
      const payload = {
        customerName: editCustomerName.trim(),
        customerPhone: editCustomerPhone.trim(),
        deliveryAddress: editDeliveryAddress.trim(),
        shippingAddress: editDeliveryAddress.trim(),
        branchId: editBranchId,
        note: editNote.trim(),
        shippingFee: Number(editShippingFee) || 0,
        discountAmount: Number(editDiscountAmount) || 0,
        paymentMethod: editPaymentMethod,
        cashAmount: editCashAmount,
        transferAmount: editTransferAmount,
        status: editStatus,
        lifecycleStatus: editStatus,
        paymentStatus: editPaymentStatus,
        items: editItems.map((item) => ({
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật đơn hàng thất bại');
      }

      const updatedRecord: OrderRecord = {
        ...editingOrder,
        customerName: data.order.customerName,
        customerPhone: data.order.customerPhone,
        deliveryAddress: data.order.deliveryAddress || data.order.shippingAddress,
        branchId: data.order.branchId,
        note: data.order.note,
        shippingFee: data.order.shippingFee,
        discountAmount: data.order.discountAmount,
        totalAmount: data.order.totalAmount,
        paymentMethod: data.order.paymentMethod,
        cashAmount: data.order.cashAmount,
        transferAmount: data.order.transferAmount,
        status: data.order.status,
        paymentStatus: data.order.paymentStatus,
        items: data.order.items || editItems,
      };

      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? updatedRecord : o)));
      showToast(`Cập nhật đơn hàng #${editingOrder.orderCode} thành công!`);
      setEditingOrder(null);
    } catch (err: any) {
      console.error('Error updating order:', err);
      setEditFormError(err.message || 'Lỗi hệ thống khi cập nhật đơn hàng.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Show Toast Auto Dismiss
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Sound Bell Test
  const handleTestBell = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio Context Error:', e);
    }
  };

  // 2. Fetch Orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (paymentFilter !== 'ALL') params.append('paymentMethod', paymentFilter);
      if (branchFilter !== 'ALL') params.append('branchId', branchFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (statusTab !== 'ALL') params.append('status', statusTab);
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/orders?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Products for Order Form
  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setDbProducts(data.products.filter((p: any) => p.isAvailable));
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  // Filter Trigger
  const handleApplyFilter = () => {
    fetchOrders();
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setPaymentFilter('ALL');
    setBranchFilter('ALL');
    setFromDate('');
    setToDate('');
    setStatusTab('ALL');
    setTimeout(() => {
      fetchOrders();
    }, 50);
  };

  const handleCopyBillLink = (ord: OrderRecord) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gaumuoismart.vn';
    const link = `${origin}/don-hang/${ord.orderCode || ord.id}`;
    navigator.clipboard.writeText(link);
    setCopiedBillLink(true);
    showToast('📋 Đã sao chép link hóa đơn điện tử!');
    setTimeout(() => setCopiedBillLink(false), 2500);
  };

  const handleShareZalo = (ord: OrderRecord) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gaumuoismart.vn';
    const billLink = `${origin}/don-hang/${ord.orderCode || ord.id}`;
    const cleanPhone = (ord.customerPhone || '').replace(/\D/g, '');
    const zaloMsg = `🍗 GÀ Ủ MUỐI SMART - HÓA ĐƠN BÁN HÀNG #${ord.orderCode}\n\n👤 Khách hàng: ${ord.customerName} - ${ord.customerPhone}\n📍 Giao đến: ${ord.deliveryAddress}\n🛒 Số lượng: ${ord.items.reduce((s, i) => s + i.quantity, 0)} món\n💰 Tổng thanh toán: ${ord.totalAmount.toLocaleString('vi-VN')} đ\n\n👉 Quý khách vui lòng xem chi tiết hóa đơn & quét mã VietQR tự động tại link sau:\n${billLink}\n\n🙏 Trân trọng cảm ơn quý khách đã ủng hộ Gà Ủ Muối Smart!`;

    navigator.clipboard.writeText(zaloMsg);
    setCopiedZaloMsg(true);
    showToast('💬 Đã sao chép tin nhắn hóa đơn kèm link VietQR!');
    setTimeout(() => setCopiedZaloMsg(false), 2500);

    if (cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    }
  };

  // Update Status & Payment Status Handler
  const handleUpdateOrderStatus = async (
    id: string,
    newStatus: string,
    paymentStatusChoice?: 'PAID' | 'UNPAID' | string
  ) => {
    if (isKitchen && newStatus === 'CANCELLED') {
      alert('Nhân viên Bếp không có quyền hủy đơn hàng!');
      return;
    }

    let cancelReason: string | null = null;
    if (newStatus === 'CANCELLED') {
      cancelReason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
      if (cancelReason === null) {
        return;
      }
    }

    // If selecting DELIVERING, open Shipping Info Modal
    if (newStatus === 'DELIVERING') {
      const targetOrd = orders.find((o) => o.id === id) || (selectedOrder?.id === id ? selectedOrder : null);
      if (targetOrd) {
        setShippingModalOrder(targetOrd);
        setShippingCarrierName(targetOrd.carrierName || 'GrabExpress');
        setShippingDriverName(targetOrd.driverName || '');
        setShippingDriverPhone(targetOrd.driverPhone || '');
        setShippingTrackingUrl(targetOrd.trackingUrl || '');
      }
      return;
    }

    // If selecting COMPLETED:
    // Only ask payment status popup if user has permission to edit payment status (ADMIN / CASHIER)
    if (newStatus === 'COMPLETED' && canEditPaymentStatus && paymentStatusChoice === undefined) {
      setConfirmPaidOrderModal({ id, targetStatus: 'COMPLETED' });
      return;
    }

    try {
      const payload: any = {
        status: newStatus,
      };
      if (canEditPaymentStatus && paymentStatusChoice) {
        payload.paymentStatus = paymentStatusChoice;
      }
      if (cancelReason) {
        payload.note = cancelReason;
      }

      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        showToast(
          `Đã cập nhật đơn hàng sang "${
            newStatus === 'COMPLETED'
              ? `Hoàn thành${paymentStatusChoice ? ` (${paymentStatusChoice === 'PAID' ? 'Đã nhận tiền' : 'Chờ thanh toán'})` : ''}`
              : newStatus === 'CANCELLED'
              ? 'Đã hủy đơn'
              : newStatus
          }"!`
        );
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(data.order);
        }
        if (printBillOrder && printBillOrder.id === id) {
          setPrintBillOrder(data.order);
        }
        if (smartBillOrder && smartBillOrder.id === id) {
          setSmartBillOrder(data.order);
        }
      } else {
        alert(data.error || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ');
    }
  };

  // Submit Shipping Info Handler
  const handleSubmitShippingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder) return;

    if (!shippingCarrierName.trim()) {
      alert('Vui lòng chọn hoặc nhập đơn vị vận chuyển!');
      return;
    }

    setSubmittingShipping(true);
    try {
      const res = await fetch(`/api/orders/${shippingModalOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERING',
          carrierName: shippingCarrierName,
          driverName: shippingDriverName,
          driverPhone: shippingDriverPhone,
          trackingUrl: shippingTrackingUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShippingModalOrder(null);
        fetchOrders();
        showToast(`🛵 Đã xuất bếp & bắt đầu giao đơn hàng #${shippingModalOrder.orderCode}!`);
        if (selectedOrder && selectedOrder.id === shippingModalOrder.id) {
          setSelectedOrder(data.order);
        }
      } else {
        alert(data.error || 'Lỗi khi cập nhật vận chuyển');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSubmittingShipping(false);
    }
  };

  // Confirm Order from K80 Modal button
  const handleConfirmOrderFromK80Modal = async () => {
    if (!printBillOrder) return;
    await handleUpdateOrderStatus(printBillOrder.id, 'CONFIRMED');
    showToast(`✓ Đã xác nhận đơn #${printBillOrder.orderCode}! Chuyển trạng thái sang Bếp đang làm món.`);
    setPrintBillOrder(null);
  };

  // Update Payment Status (UNPAID / PAID)
  const handleUpdatePaymentStatus = async (id: string, newPaymentStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        showToast(`Đã cập nhật thanh toán: ${newPaymentStatus === 'PAID' ? 'Đã nhận tiền ✅' : 'Chưa thanh toán ❌'}`);
      } else {
        alert(data.error || 'Cập nhật thanh toán thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setRawAiMessage('');
    setAiToast('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormDeliveryAddress('');
    setFormBranchId('cs1');
    setFormPaymentMethod('COD');
    setFormSellerName('Thu ngân POS');
    setFormSourceTag('Đơn Mới Web');
    setFormNotes('');
    setFormShippingFee(0);
    setFormDiscountAmount(0);
    setFormError('');
    setFormItems([]);

    setShowCreateModal(true);
  };

  // AI Parse Message Handler
  const handleAiParseMessage = async () => {
    if (!rawAiMessage.trim()) {
      alert('Vui lòng dán nội dung tin nhắn của khách vào ô văn bản trước!');
      return;
    }

    setParsingAi(true);
    setAiToast('');
    try {
      const res = await fetch('/api/ai/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawAiMessage }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const parsed = data.data;
        const extractedName = parsed.customerName?.trim();
        setFormCustomerName(extractedName && extractedName !== '' && extractedName !== 'Khách Đặt Qua Tin Nhắn' ? extractedName : 'Khách Chưa Đặt Tên');
        if (parsed.phone) setFormCustomerPhone(parsed.phone);
        if (parsed.address) {
          setFormDeliveryAddress(parsed.address);
          const autoBranch = detectBranchIdFromText(parsed.address, branches);
          setFormBranchId(autoBranch || parsed.branchSuggested || (branches[0]?.id || 'cs1'));
        } else if (parsed.branchSuggested) {
          setFormBranchId(parsed.branchSuggested);
        }
        if (parsed.note !== undefined && parsed.note !== null) {
          setFormNotes(parsed.note);
        } else if (parsed.notes !== undefined && parsed.notes !== null) {
          setFormNotes(parsed.notes);
        }

        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const itemsMap: OrderItem[] = parsed.items.map((it: any) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: Math.max(1, Number(it.quantity) || 1),
            price: Number(it.price) || 0,
            subtotal: (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
          }));
          setFormItems(itemsMap);
        }

        setFormSourceTag('AI Bot Chat');
        setAiToast('✨ Đã phân tích thành công thông tin khách hàng và tự động điền giỏ hàng!');
      } else {
        alert(data.error || 'Không thể phân tích tin nhắn');
      }
    } catch (err: any) {
      alert('Lỗi khi gọi AI Parser: ' + err.message);
    } finally {
      setParsingAi(false);
    }
  };

  // Quantity change inside form items
  const handleItemQtyChange = (index: number, delta: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const newQty = Math.max(1, updated[index].quantity + delta);
      updated[index].quantity = newQty;
      updated[index].subtotal = newQty * updated[index].price;
      return updated;
    });
  };

  // Remove item from form
  const handleRemoveFormItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add item manually to form
  const handleAddManualProduct = () => {
    if (!selectedAddProductId) return;
    const prod = dbProducts.find((p) => p.id === selectedAddProductId);
    if (!prod) return;

    setFormItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].subtotal = updated[existingIdx].quantity * updated[existingIdx].price;
        return updated;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          price: prod.price,
          subtotal: prod.price,
        },
      ];
    });
    setSelectedAddProductId('');
  };

  // Form Totals Calculation
  const formSubtotal = useMemo(() => {
    return formItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [formItems]);

  useEffect(() => {
    if (formSubtotal >= 355000 && formSubtotal > 0) {
      setFormShippingFee(0);
    } else if (formSubtotal === 0) {
      setFormShippingFee(0);
    } else {
      setFormShippingFee(35000);
    }
  }, [formSubtotal]);

  const formFinalTotal = useMemo(() => {
    return Math.max(0, formSubtotal + formShippingFee - formDiscountAmount);
  }, [formSubtotal, formShippingFee, formDiscountAmount]);

  // Split payment auto-reconcile handlers
  const handleSelectSplit = () => {
    setFormPaymentMethod('SPLIT');
    setFormCashAmount(0);
    setFormTransferAmount(formFinalTotal);
  };

  const handleCashChange = (val: number) => {
    const cleanCash = Math.max(0, val);
    setFormCashAmount(cleanCash);
    setFormTransferAmount(Math.max(0, formFinalTotal - cleanCash));
  };

  const handleTransferChange = (val: number) => {
    const cleanTransfer = Math.max(0, val);
    setFormTransferAmount(cleanTransfer);
    setFormCashAmount(Math.max(0, formFinalTotal - cleanTransfer));
  };

  useEffect(() => {
    if (formPaymentMethod === 'SPLIT') {
      setFormTransferAmount(Math.max(0, formFinalTotal - formCashAmount));
    }
  }, [formFinalTotal, formPaymentMethod]);

  // Submit Order & Print Bill K80
  const handleSubmitCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formCustomerName.trim()) {
      setFormError('Vui lòng nhập Tên khách hàng!');
      return;
    }
    if (!formCustomerPhone.trim()) {
      setFormError('Vui lòng nhập Số điện thoại!');
      return;
    }
    if (!formDeliveryAddress.trim()) {
      setFormError('Vui lòng nhập Địa chỉ giao hàng!');
      return;
    }
    if (formItems.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 món ăn trong đơn hàng!');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formCustomerName,
          customerPhone: formCustomerPhone,
          deliveryAddress: formDeliveryAddress,
          note: formNotes,
          paymentMethod: formPaymentMethod,
          cashAmountInput: formCashAmount,
          cashAmount: formCashAmount,
          transferAmount: formTransferAmount,
          branchId: formBranchId,
          discountAmount: formDiscountAmount,
          shippingFee: formShippingFee,
          sellerName: formSellerName,
          sourceTag: formSourceTag,
          items: formItems,
        }),
      });

      const data = await res.json();

      if (data.success && data.order) {
        setShowCreateModal(false);
        fetchOrders();
        setPrintBillOrder(data.order);
        showToast(`🎉 Đã tạo đơn thành công #${data.order.orderCode}!`);
      } else {
        setFormError(data.error || 'Lỗi khi tạo đơn hàng!');
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối máy chủ!');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (orders.length === 0) {
      alert('Không có dữ liệu đơn hàng để xuất file Excel!');
      return;
    }

    const excelData = orders.map((o, idx) => {
      const branchObj = branches.find((b) => b.id === o.branchId || b.code === o.branchId);
      const branchName = branchObj ? `${branchObj.code ? branchObj.code.toUpperCase() + ' - ' : ''}${branchObj.name}` : (o.branchId || 'Chi Nhánh POS');
      const itemsText = o.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ');

      let statusText = 'Mới tạo';
      if (o.status === 'CONFIRMED') statusText = 'Đã xác nhận';
      if (o.status === 'DELIVERING') statusText = 'Đang giao hàng';
      if (o.status === 'COMPLETED') statusText = 'Thành công';
      if (o.status === 'CANCELLED') statusText = 'Đã hủy';

      return {
        'STT': idx + 1,
        'Mã Đơn': o.orderCode,
        'Nguồn Đơn': o.sourceTag || 'Đơn Mới Web',
        'Cửa Hàng': branchName,
        'Khách Hàng': o.customerName,
        'Số Điện Thoại': o.customerPhone,
        'Địa Chỉ': o.deliveryAddress,
        'Danh Sách Món': itemsText,
        'Tiền Hàng': o.items.reduce((a, b) => a + b.subtotal, 0),
        'Phí Ship': o.shippingFee || 0,
        'Giảm Giá': o.discountAmount || 0,
        'Thành Tiền': o.totalAmount,
        'PT Thanh Toán': o.paymentMethod === 'COD' ? 'Tiền mặt' : 'Chuyển khoản QR',
        'TT Thanh Toán': o.paymentStatus === 'PAID' ? 'Đã nhận tiền' : 'Chưa thanh toán',
        'Người Bán': o.sellerName || 'Thu ngân POS',
        'Trạng Thái Đơn': statusText,
        'Ngày Tạo': new Date(o.createdAt).toLocaleString('vi-VN'),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 30 },
      { wch: 35 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Đơn Hàng');
    XLSX.writeFile(workbook, `Danh_Sach_Don_Hang_GaUMuoiSmart_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'PENDING').length, [orders]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 relative">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Top Control Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b dark:border-neutral-800 border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold dark:text-white text-stone-900 tracking-tight">
                  Quản Lý Đơn Hàng Tập Trung
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {orders.length} đơn tổng
                </span>
              </div>
              <p className="text-xs dark:text-neutral-400 text-stone-500 mt-0.5">
                Bảng danh sách đơn đa chi nhánh, trạng thái dòng tiền & in bill K80 hỏa tốc.
              </p>
            </div>
          </div>
        </div>

        {/* Top Status & Controls */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Sound Bell Test */}
          <button
            onClick={handleTestBell}
            className="px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-100 dark:text-neutral-300 text-stone-700 hover:text-amber-500 border dark:border-neutral-800 border-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Kiểm tra âm thanh chuông báo đơn mới"
          >
            <BellRing className="w-4 h-4 text-amber-500" />
            <span>Thử chuông</span>
          </button>

          {/* Realtime Date */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-100 dark:text-neutral-300 text-stone-700 border dark:border-neutral-800 border-stone-200 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentDateStr}</span>
          </div>

          {/* Notification Bell */}
          <div className="relative p-2 rounded-xl dark:bg-neutral-900 bg-stone-100 border dark:border-neutral-800 border-stone-200">
            <Bell className="w-4 h-4 dark:text-neutral-300 text-stone-700" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>

          {/* POS Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>POS System Active</span>
          </div>

          {/* Prominent Action Button: Create New Order */}
          {canCreateOrder && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Tạo Đơn Hàng Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Multi-Dimensional Filter Controls */}
      <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tên khách hàng, SĐT hoặc Mã đơn #OD / #DH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              className="w-full pl-9 pr-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">💳 PTTT: Tất Cả</option>
              <option value="COD">💵 Tiền mặt (COD)</option>
              <option value="BANK_TRANSFER">📱 Chuyển khoản QR</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              disabled={isKitchen && !!currentUser?.branchId}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {!isKitchen && currentUser?.role !== 'MANAGER' && <option value="ALL">🏢 Cửa Hàng: Tất Cả ({branches.length}) Cơ Sở</option>}
              {!isKitchen && currentUser?.role === 'MANAGER' && <option value="ALL">🏢 Các cơ sở phụ trách ({availableBranches.length})</option>}
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.code ? `${b.code.toUpperCase()} – ${b.name}` : b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="Từ ngày"
              className="w-1/2 px-2 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-[11px] font-medium focus:outline-none focus:border-amber-500"
            />
            <span className="text-neutral-500 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="Đến ngày"
              className="w-1/2 px-2 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-[11px] font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t dark:border-neutral-800 border-stone-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-1.5 dark:bg-amber-500/20 bg-amber-500 text-amber-600 dark:text-amber-400 font-bold rounded-lg text-xs hover:opacity-90 transition cursor-pointer"
            >
              Lọc Dữ Liệu
            </button>
            <button
              onClick={handleResetFilter}
              className="px-3 py-1.5 dark:bg-neutral-800 bg-stone-200 dark:text-neutral-300 text-stone-700 font-semibold rounded-lg text-xs hover:bg-neutral-700 transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Dãy Tab trạng thái nhanh (Quick Filter Pills - 5 Order Lifecycle Steps) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { key: 'ALL', label: 'Tất cả đơn', count: orders.length },
          { key: 'PENDING', label: '🟡 Chờ xác nhận', count: orders.filter((o) => o.status === 'PENDING').length },
          { key: 'CONFIRMED', label: '🔵 Đã xác nhận (Bếp làm)', count: orders.filter((o) => o.status === 'CONFIRMED').length },
          { key: 'DELIVERING', label: '🟣 Đang giao hàng', count: orders.filter((o) => o.status === 'DELIVERING').length },
          { key: 'COMPLETED', label: '🟢 Thành công', count: orders.filter((o) => o.status === 'COMPLETED').length },
          { key: 'CANCELLED', label: '🔴 Đã hủy', count: orders.filter((o) => o.status === 'CANCELLED').length },
        ].map((tab) => {
          const isActive = statusTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setStatusTab(tab.key);
                setTimeout(() => fetchOrders(), 50);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md font-black'
                  : 'dark:bg-[#141820] bg-white dark:text-neutral-300 text-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-800 border-stone-200 dark:border-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-stone-950 text-amber-400 font-extrabold' : 'dark:bg-neutral-800 bg-stone-100 text-neutral-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Bảng Danh Sách Đơn Hàng (Orders Table with Interactive Status & Payment Selects) */}
      <div className="rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
            <p className="text-xs dark:text-neutral-400 text-stone-500">Đang tải danh sách đơn hàng tập trung...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-neutral-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold dark:text-neutral-300 text-stone-700">Chưa tìm thấy đơn hàng phù hợp</p>
            <p className="text-xs dark:text-neutral-500 text-stone-500 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "+ Tạo Đơn Hàng Mới".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-neutral-900/90 bg-stone-100 dark:text-neutral-400 text-stone-600 font-semibold border-b dark:border-neutral-800 border-stone-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4"># MÃ ĐƠN</th>
                  <th className="py-3.5 px-4">TRẠNG THÁI (LIFECYCLE)</th>
                  <th className="py-3.5 px-4">CỬA HÀNG</th>
                  <th className="py-3.5 px-4">SẢN PHẨM</th>
                  <th className="py-3.5 px-4 min-w-[220px] max-w-[260px]">KHÁCH HÀNG & ĐỊA CHỈ GIAO</th>
                  <th className="py-3.5 px-4 text-center">SL</th>
                  <th className="py-3.5 px-4">TIỀN HÀNG</th>
                  <th className="py-3.5 px-4">GIẢM GIÁ</th>
                  <th className="py-3.5 px-4">THÀNH TIỀN</th>
                  <th className="py-3.5 px-4">NGƯỜI BÁN</th>
                  <th className="py-3.5 px-4">THANH TOÁN</th>
                  <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-200 font-medium">
                {orders.map((order) => {
                  const branchObj = branches.find((b) => b.id === order.branchId || b.code === order.branchId);
                  const branchName = branchObj ? `${branchObj.code ? branchObj.code.toUpperCase() + ' - ' : ''}${branchObj.name}` : (order.branchId || 'Chi Nhánh POS');

                  const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
                  const subtotalAmount = order.items.reduce((acc, item) => acc + item.subtotal, 0);

                  return (
                    <tr key={order.id} className="dark:hover:bg-neutral-900/50 hover:bg-stone-50 transition-colors">
                      {/* Order Code & Creation Date Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-amber-500">
                            #{order.orderCode}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-medium mt-0.5">
                            {formatOrderDateTime(order.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Interactive Status Select Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold focus:outline-none cursor-pointer border ${
                              order.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                : order.status === 'CONFIRMED'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                : order.status === 'DELIVERING'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                : order.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                            }`}
                          >
                            {!isKitchen && <option value="PENDING">🟡 Chờ xác nhận</option>}
                            <option value="CONFIRMED">🔵 Đã xác nhận (Bếp làm)</option>
                            <option value="DELIVERING">🟣 Đang giao hàng</option>
                            <option value="COMPLETED">🟢 Thành công</option>
                            {!isKitchen && <option value="CANCELLED">🔴 Đã hủy đơn</option>}
                          </select>
                          <span className="block text-[9px] font-semibold text-neutral-400">
                            {order.sourceTag || 'Đơn Mới Web'}
                          </span>

                          {order.status === 'DELIVERING' && (
                            <div className="mt-1 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setShippingModalOrder(order);
                                  setShippingCarrierName(order.carrierName || 'GrabExpress');
                                  setShippingDriverName(order.driverName || '');
                                  setShippingDriverPhone(order.driverPhone || '');
                                  setShippingTrackingUrl(order.trackingUrl || '');
                                }}
                                className={`px-2 py-0.5 border rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                  (order.carrierName || '').toLowerCase().includes('be')
                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-400'
                                    : (order.carrierName || '').toLowerCase().includes('xanh')
                                    ? 'bg-teal-500/20 hover:bg-teal-500/30 border-teal-500/40 text-teal-300'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-400'
                                }`}
                                title={`Đơn vị: ${order.carrierName || 'GrabExpress'} | Tài xế: ${order.driverName || 'Chưa có'} ${order.driverPhone ? `(${order.driverPhone})` : ''}`}
                              >
                                <span>
                                  {(order.carrierName || '').toLowerCase().includes('be')
                                    ? '🟡'
                                    : (order.carrierName || '').toLowerCase().includes('xanh')
                                    ? '🌿'
                                    : '🟢'}
                                </span>
                                <span className="truncate max-w-[90px]">{order.carrierName || 'GrabExpress'}</span>
                              </button>
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                                  title="Xem hành trình hỏa tốc thời gian thực"
                                >
                                  📍
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Store */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg dark:bg-neutral-800 bg-stone-100 text-stone-700 dark:text-neutral-300 text-[11px] font-medium border border-stone-200 dark:border-neutral-700">
                          {branchName}
                        </span>
                      </td>

                      {/* Products */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="text-[11px] dark:text-neutral-200 text-stone-800 line-clamp-2">
                          {order.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 min-w-[220px] max-w-[260px]">
                        <PhoneActionCell
                          name={order.customerName}
                          phone={order.customerPhone}
                          address={order.deliveryAddress}
                        />
                      </td>

                      {/* Qty */}
                      <td className="py-3.5 px-4 text-center font-bold dark:text-white text-stone-900">
                        {totalQty}
                      </td>

                      {/* Subtotal */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium dark:text-neutral-300 text-stone-700">
                        {subtotalAmount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Discount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-rose-500 font-medium">
                        -{(order.discountAmount || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-black text-emerald-500 text-sm">
                        {order.totalAmount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Seller */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 text-[11px]">
                        {order.sellerName || 'Thu ngân POS'}
                      </td>

                      {/* Interactive Payment Status Select & Method Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {canEditPaymentStatus ? (
                            <select
                              value={order.paymentStatus || 'UNPAID'}
                              onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-extrabold focus:outline-none cursor-pointer border ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              }`}
                            >
                              <option value="UNPAID">❌ Chưa thanh toán</option>
                              <option value="PAID">✅ Đã nhận tiền</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {order.paymentStatus === 'PAID' ? '✅ Đã nhận tiền' : '❌ Chưa thanh toán'}
                            </span>
                          )}

                          {/* Payment Method Badge */}
                          <div className="text-[10px] font-medium">
                            {order.paymentMethod === 'SPLIT' ? (
                              <div className="px-2 py-1 bg-purple-500/15 border border-purple-500/30 rounded-lg text-purple-300 flex flex-col gap-0.5 shadow-2xs">
                                <span className="font-extrabold flex items-center gap-1 text-[10px] text-purple-300">
                                  🔀 Hỗn hợp:
                                </span>
                                <span className="text-[9px] text-amber-400 font-semibold">
                                  💵 TM: {(order.cashAmount || 0).toLocaleString('vi-VN')}đ
                                </span>
                                <span className="text-[9px] text-blue-400 font-semibold">
                                  🏦 CK: {(order.transferAmount || 0).toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            ) : order.paymentMethod === 'BANK_TRANSFER' ? (
                              <span className="text-blue-400 font-bold flex items-center gap-1">📱 Chuyển khoản QR</span>
                            ) : (
                              <span className="text-amber-500 font-bold flex items-center gap-1">💵 Tiền mặt</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fast Actions: Smart VietQR Bill, Edit, K80 Print & Detail View */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Smart Dynamic VietQR Bill Button */}
                          <button
                            onClick={() => setSmartBillOrder(order)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title="Gửi Bill Thanh Toán Tự Động (VietQR)"
                          >
                            <QrCode className="w-3.5 h-3.5 stroke-[2]" />
                            <span>Bill QR</span>
                          </button>

                          {/* Edit Order Button (Telesales & Admin only) */}
                          {canEditOrder && (
                            <button
                              onClick={() => handleOpenEditModal(order)}
                              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/40 font-bold rounded-lg text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                              title="Chỉnh sửa đơn hàng"
                            >
                              <Pencil className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Sửa</span>
                            </button>
                          )}

                          {/* Fast K80 Print Button */}
                          <button
                            onClick={() => setPrintBillOrder(order)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title="In hóa đơn K80 nhanh"
                          >
                            <Printer className="w-3.5 h-3.5 stroke-[2]" />
                            <span>In K80</span>
                          </button>

                          {/* Detail view */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 dark:bg-neutral-800 bg-stone-100 hover:bg-stone-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition cursor-pointer"
                            title="Xem chi tiết đơn"
                          >
                            <Eye className="w-4 h-4 stroke-[1.5]" />
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

      {/* 5. Modal "Tạo Đơn Hàng Mới & AI Smart Parser" */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg dark:hover:bg-neutral-800 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <h3 className="text-lg font-extrabold dark:text-white text-stone-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              <span>Tạo Đơn Hàng POS Mới & AI Smart Order Autofill</span>
            </h3>
            <p className="text-xs dark:text-neutral-400 text-stone-500 mb-4">
              Dán nội dung tin nhắn của khách để AI tự động trích xuất Tên, SĐT, Địa chỉ và Danh mục giỏ hàng!
            </p>

            {/* PART A: AI SMART PARSER */}
            <div className="p-4 rounded-xl dark:bg-neutral-900/90 bg-stone-50 border border-amber-500/30 mb-6 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Smart Order Parser (Zalo / Facebook / SMS Message)</span>
                </span>
                <span className="text-[10px] text-neutral-400">Powered by Gemini AI</span>
              </div>

              <textarea
                rows={3}
                value={rawAiMessage}
                onChange={(e) => setRawAiMessage(e.target.value)}
                placeholder="Dán tin nhắn khách tại đây... (Ví dụ: 'Ship cho anh Tuấn 0912345678 đến Tòa S2.05 Vin Smart City nhé, lấy 2 con gà ủ muối nguyên con với 1 hộp chân gà rút xương, giao tầm 6h tối')"
                className="w-full px-3 py-2 rounded-lg dark:bg-[#141820] bg-white border dark:border-neutral-700 border-stone-300 text-xs dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
              ></textarea>

              <div className="flex items-center justify-between">
                {aiToast ? (
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>{aiToast}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-500 italic">
                    AI sẽ tự động nhận diện tên, SĐT, địa chỉ & món ăn trong thực đơn.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleAiParseMessage}
                  disabled={parsingAi}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {parsingAi ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-stone-950"></div>
                      <span>Đang phân tích tin nhắn...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>✨ AI Phân Tích & Tự Điền Form</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PART B: DETAILED ORDER FORM */}
            <form onSubmit={handleSubmitCreateOrder} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Tên Khách Hàng (*)
                  </label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="VD: Anh Tuấn"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Số Điện Thoại (*)
                  </label>
                  <input
                    type="text"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Cơ Sở Xuất Hàng (*)
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 {b.code ? `${b.code.toUpperCase()} – ${b.name}` : b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Địa Chỉ Nhận Hàng Chi Tiết (*)
                </label>
                <input
                  type="text"
                  value={formDeliveryAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormDeliveryAddress(val);
                    const autoBranch = detectBranchIdFromText(val, branches);
                    if (autoBranch) setFormBranchId(autoBranch);
                  }}
                  placeholder="VD: Tòa S2.05 Vin Smart City, Tây Mỗ, Nam Từ Liêm, Hà Nội"
                  className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Order Notes Field & 4 Quick Tags */}
              <div>
                <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  📝 Ghi Chú Đơn Hàng / Yêu Cầu Thêm:
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ví dụ: Để nguyên con không chặt, xin thêm 2 bịch sốt ớt xanh, giao ngoài giờ hành chính..."
                  className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                />

                {/* 4 Quick Tags */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setFormNotes((prev) => (prev.trim() ? `${prev}, Để nguyên con không chặt` : 'Để nguyên con không chặt'))
                    }
                    className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-200 dark:text-amber-400 text-amber-800 font-medium hover:opacity-80 transition cursor-pointer"
                  >
                    🍗 Để nguyên con (Không chặt)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormNotes((prev) => (prev.trim() ? `${prev}, Chặt sẵn vừa ăn` : 'Chặt sẵn vừa ăn'))
                    }
                    className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-200 dark:text-amber-400 text-amber-800 font-medium hover:opacity-80 transition cursor-pointer"
                  >
                    🔪 Chặt sẵn vừa ăn
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormNotes((prev) => (prev.trim() ? `${prev}, Xin thêm sốt chấm` : 'Xin thêm sốt chấm'))
                    }
                    className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-200 dark:text-amber-400 text-amber-800 font-medium hover:opacity-80 transition cursor-pointer"
                  >
                    🌶️ Xin thêm sốt chấm
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormNotes((prev) => (prev.trim() ? `${prev}, Giao gấp / Giờ cụ thể` : 'Giao gấp / Giờ cụ thể'))
                    }
                    className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-200 dark:text-amber-400 text-amber-800 font-medium hover:opacity-80 transition cursor-pointer"
                  >
                    ⏰ Giao gấp / Giờ cụ thể
                  </button>
                </div>
              </div>

              {/* Items Selected Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-amber-500 uppercase tracking-wider block">
                    🛒 DANH SÁCH MÓN ĐÃ CHỌN ({formItems.length} MÓN)
                  </label>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedAddProductId}
                      onChange={(e) => setSelectedAddProductId(e.target.value)}
                      className="px-2 py-1 rounded-lg dark:bg-neutral-900 bg-stone-100 border border-stone-300 dark:border-neutral-700 text-xs dark:text-white text-stone-900"
                    >
                      <option value="">+ Chọn món thêm thủ công...</option>
                      {dbProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price.toLocaleString('vi-VN')}đ)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddManualProduct}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold"
                    >
                      Thêm
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border dark:border-neutral-800 border-stone-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="dark:bg-neutral-900 bg-stone-100 dark:text-neutral-400 text-stone-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">TÊN MÓN</th>
                        <th className="py-2.5 px-3">ĐƠN GIÁ</th>
                        <th className="py-2.5 px-3 text-center">SỐ LƯỢNG</th>
                        <th className="py-2.5 px-3">THÀNH TIỀN</th>
                        <th className="py-2.5 px-3 text-right">XÓA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-neutral-800 divide-stone-200 font-medium">
                      {formItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-neutral-500 italic">
                            Chưa có món nào được chọn. Vui lòng chọn món từ menu bên trên hoặc dùng AI Phân Tích Tin Nhắn.
                          </td>
                        </tr>
                      ) : (
                        formItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-bold dark:text-white text-stone-900">
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-3 dark:text-neutral-300 text-stone-700">
                              {item.price.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center border border-stone-300 dark:border-neutral-700 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(idx, -1)}
                                  className="px-2 py-0.5 dark:bg-neutral-800 bg-stone-200 font-bold hover:bg-neutral-700"
                                >
                                  -
                                </button>
                                <span className="px-2.5 text-xs font-bold">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(idx, 1)}
                                  className="px-2 py-0.5 dark:bg-neutral-800 bg-stone-200 font-bold hover:bg-neutral-700"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-amber-500">
                              {item.subtotal.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFormItem(idx)}
                                className="text-rose-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary Calculations */}
              <div className="p-4 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-800 border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between dark:text-neutral-300 text-stone-700">
                  <span>Tiền hàng ({formItems.length} món):</span>
                  <span className="font-bold">{formSubtotal.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between items-center dark:text-neutral-300 text-stone-700">
                  <span>
                    Phí vận chuyển:
                    {formSubtotal >= 355000 && formSubtotal > 0 && (
                      <span className="text-[10px] text-emerald-500 ml-1.5 font-bold">
                        (Miễn phí ship bill ≥ 355k)
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    value={formShippingFee}
                    onChange={(e) => setFormShippingFee(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border dark:border-neutral-700 border-stone-300 font-bold dark:bg-[#141820] bg-white"
                  />
                </div>

                <div className="flex justify-between items-center dark:text-neutral-300 text-stone-700">
                  <span>Giảm giá / Chiết khấu:</span>
                  <input
                    type="number"
                    value={formDiscountAmount}
                    onChange={(e) => setFormDiscountAmount(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border dark:border-neutral-700 border-stone-300 font-bold text-rose-500 dark:bg-[#141820] bg-white"
                  />
                </div>

                <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t dark:border-neutral-800 border-stone-200">
                  <span className="dark:text-white text-stone-900">TỔNG CỘNG THANH TOÁN:</span>
                  <span className="text-xl font-black text-emerald-500">
                    {formFinalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Payment Method & Source Tag */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                      Hình Thức Thanh Toán
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormPaymentMethod('COD')}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          formPaymentMethod === 'COD'
                            ? 'bg-amber-500/20 text-amber-500 border-amber-500 shadow-2xs font-extrabold'
                            : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                      >
                        💵 Tiền Mặt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPaymentMethod('BANK_TRANSFER')}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          formPaymentMethod === 'BANK_TRANSFER'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500 shadow-2xs font-extrabold'
                            : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                      >
                        📱 Chuyển Khoản
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectSplit}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          formPaymentMethod === 'SPLIT'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500 shadow-2xs font-extrabold'
                            : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                      >
                        🔄 Tiền Mặt + CK
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                      Nguồn Đơn / Ghi Chú
                    </label>
                  <select
                    value={formSourceTag}
                    onChange={(e) => setFormSourceTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Đơn Mới Web">🌐 Đơn Mới Web</option>
                    <option value="AI Bot Chat">🤖 AI Bot Chat</option>
                    <option value="POS Tại Quầy">🏪 POS Tại Quầy</option>
                    <option value="Hotline Zalo">📞 Hotline Zalo</option>
                  </select>
                </div>
              </div>

              {/* 2 Parallel Inputs for SPLIT Payment Method */}
              {formPaymentMethod === 'SPLIT' && (
                <div className="p-3.5 rounded-xl dark:bg-purple-950/20 bg-purple-50/60 border dark:border-purple-500/30 border-purple-200 space-y-2 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-amber-500 block mb-1">
                        💵 Tiền Mặt (VNĐ):
                      </label>
                      <input
                        type="number"
                        value={formCashAmount}
                        onChange={(e) => handleCashChange(Number(e.target.value) || 0)}
                        placeholder="VD: 200,000"
                        className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-white border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block font-medium">
                        {formCashAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-blue-400 block mb-1">
                        📱 Chuyển Khoản (VNĐ):
                      </label>
                      <input
                        type="number"
                        value={formTransferAmount}
                        onChange={(e) => handleTransferChange(Number(e.target.value) || 0)}
                        placeholder="VD: 125,000"
                        className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-white border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block font-medium">
                        {formTransferAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {/* Validation Alert */}
                  {formCashAmount + formTransferAmount !== formFinalTotal && (
                    <p className="text-[11px] font-bold text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                      <span>⚠️ Tổng 2 khoản ({(formCashAmount + formTransferAmount).toLocaleString('vi-VN')} đ) chưa khớp với tổng thanh toán ({formFinalTotal.toLocaleString('vi-VN')} đ).</span>
                    </p>
                  )}
                </div>
              )}
            </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t dark:border-neutral-800 border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder || formItems.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  <span>{submittingOrder ? 'Đang tạo đơn...' : '💾 TẠO ĐƠN & IN BILL K80'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5.5. Modal "Chỉnh Sửa Đơn Hàng" */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg dark:hover:bg-neutral-800 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <h3 className="text-lg font-extrabold dark:text-white text-stone-900 mb-1 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              <span>Chỉnh Sửa Đơn Hàng #{editingOrder.orderCode}</span>
            </h3>
            <p className="text-xs dark:text-neutral-400 text-stone-500 mb-4">
              Cập nhật thông tin khách hàng, số lượng món ăn, hình thức thanh toán và trạng thái đơn hàng.
            </p>

            {editFormError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEditOrder} className="space-y-4">
              {/* 1. Customer & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Tên Khách Hàng (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder="VD: Anh Minh"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Số Điện Thoại (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    placeholder="VD: 0988 123 456"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Địa Chỉ Chi Tiết (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editDeliveryAddress}
                    onChange={(e) => setEditDeliveryAddress(e.target.value)}
                    placeholder="VD: Số 12 Ngõ 34 Cầu Giấy, Q. Cầu Giấy, Hà Nội"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Cơ Sở Xuất Hàng (*)
                  </label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code ? b.code.toUpperCase() + ' - ' : ''}{b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Ghi Chú Đơn Hàng
                  </label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Ghi chú đóng gói, giao nhận..."
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 2. Items & Quantities */}
              <div className="space-y-2 pt-2 border-t dark:border-neutral-800 border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-500" />
                    <span>Danh Sách Món Ăn Trong Đơn ({editItems.length} món)</span>
                  </label>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl dark:bg-neutral-900/80 bg-stone-50 border dark:border-neutral-800 border-stone-200 text-xs"
                    >
                      <div className="font-bold dark:text-white text-stone-900 max-w-[220px] truncate">
                        {item.productName}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditDecreaseQty(idx)}
                          className="w-6 h-6 rounded-lg dark:bg-neutral-800 bg-stone-200 flex items-center justify-center font-bold text-xs hover:bg-stone-300 dark:hover:bg-neutral-700 transition"
                        >
                          -
                        </button>
                        <span className="font-extrabold px-1 dark:text-white text-stone-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleEditIncreaseQty(idx)}
                          className="w-6 h-6 rounded-lg dark:bg-neutral-800 bg-stone-200 flex items-center justify-center font-bold text-xs hover:bg-stone-300 dark:hover:bg-neutral-700 transition"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-extrabold text-amber-500 whitespace-nowrap min-w-[80px] text-right">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditRemoveItem(idx)}
                        className="p-1 text-rose-500 hover:text-rose-400 transition"
                        title="Xóa món khỏi đơn"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add product to edit list */}
                <div className="flex gap-2 pt-1">
                  <select
                    value={editSelectedProductId}
                    onChange={(e) => setEditSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Chọn món để thêm vào đơn --</option>
                    {dbProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.price.toLocaleString('vi-VN')} đ
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleEditAddProduct}
                    disabled={!editSelectedProductId}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Món</span>
                  </button>
                </div>
              </div>

              {/* 3. Totals, Shipping & Discount */}
              <div className="p-3.5 rounded-xl dark:bg-neutral-900 bg-stone-100 border dark:border-neutral-800 border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between dark:text-neutral-300 text-stone-700">
                  <span>Tiền hàng ({editItems.length} món):</span>
                  <span className="font-bold">{editSubtotal.toLocaleString('vi-VN')} đ</span>
                </div>

                <div className="flex justify-between items-center dark:text-neutral-300 text-stone-700">
                  <span>Phí vận chuyển:</span>
                  <input
                    type="number"
                    value={editShippingFee}
                    onChange={(e) => setEditShippingFee(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border dark:border-neutral-700 border-stone-300 font-bold dark:bg-[#141820] bg-white"
                  />
                </div>

                <div className="flex justify-between items-center dark:text-neutral-300 text-stone-700">
                  <span>Giảm giá / Chiết khấu:</span>
                  <input
                    type="number"
                    value={editDiscountAmount}
                    onChange={(e) => setEditDiscountAmount(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right rounded border dark:border-neutral-700 border-stone-300 font-bold text-rose-500 dark:bg-[#141820] bg-white"
                  />
                </div>

                <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t dark:border-neutral-800 border-stone-200">
                  <span className="dark:text-white text-stone-900">TỔNG CỘNG THANH TOÁN:</span>
                  <span className="text-xl font-black text-emerald-500">
                    {editFinalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* 4. Payment Method & Statuses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Hình Thức Thanh Toán
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditPaymentMethod('COD')}
                      className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        editPaymentMethod === 'COD'
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500 font-extrabold'
                          : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                      }`}
                    >
                      💵 Tiền Mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentMethod('BANK_TRANSFER')}
                      className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        editPaymentMethod === 'BANK_TRANSFER'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500 font-extrabold'
                          : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                      }`}
                    >
                      📱 CK
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectEditSplit}
                      className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        editPaymentMethod === 'SPLIT'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500 font-extrabold'
                          : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                      }`}
                    >
                      🔄 Hỗn Hợp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Trạng Thái Đơn Hàng
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="PENDING">🟡 Chờ xác nhận</option>
                    <option value="CONFIRMED">🔵 Đã xác nhận (Bếp làm)</option>
                    <option value="DELIVERING">🟣 Đang giao hàng</option>
                    <option value="COMPLETED">🟢 Thành công</option>
                    <option value="CANCELLED">🔴 Đã hủy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Trạng Thái Thanh Toán
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="UNPAID">❌ Chưa thanh toán</option>
                    <option value="PAID">✅ Đã nhận tiền</option>
                  </select>
                </div>
              </div>

              {/* Split Payment inputs if selected */}
              {editPaymentMethod === 'SPLIT' && (
                <div className="p-3.5 rounded-xl dark:bg-purple-950/20 bg-purple-50/60 border dark:border-purple-500/30 border-purple-200 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-amber-500 block mb-1">
                        💵 Tiền Mặt (VNĐ):
                      </label>
                      <input
                        type="number"
                        value={editCashAmount}
                        onChange={(e) => handleEditCashChange(Number(e.target.value) || 0)}
                        placeholder="VD: 200,000"
                        className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-white border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block font-medium">
                        {editCashAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-blue-400 block mb-1">
                        📱 Chuyển Khoản (VNĐ):
                      </label>
                      <input
                        type="number"
                        value={editTransferAmount}
                        onChange={(e) => handleEditTransferChange(Number(e.target.value) || 0)}
                        placeholder="VD: 125,000"
                        className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-white border dark:border-neutral-700 border-stone-300 text-xs font-bold dark:text-white text-stone-900 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block font-medium">
                        {editTransferAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {editCashAmount + editTransferAmount !== editFinalTotal && (
                    <p className="text-[11px] font-bold text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                      <span>⚠️ Tổng 2 khoản ({(editCashAmount + editTransferAmount).toLocaleString('vi-VN')} đ) chưa khớp với tổng thanh toán ({editFinalTotal.toLocaleString('vi-VN')} đ).</span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t dark:border-neutral-800 border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || editItems.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-xs shadow-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Pencil className="w-4 h-4 stroke-[2.5]" />
                  <span>{submittingEdit ? 'Đang cập nhật...' : '💾 LƯU THAY ĐỔI & CẬP NHẬT'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Detail Order View */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b dark:border-neutral-800 border-stone-200 pb-3">
              <h3 className="font-black text-base text-amber-500 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span>Chi Tiết Đơn Hàng #{selectedOrder.orderCode}</span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="text-xs space-y-1.5 dark:text-neutral-300 text-stone-700">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0D11] border border-slate-200 dark:border-neutral-800 mb-2">
                <PhoneActionCell name={selectedOrder.customerName} phone={selectedOrder.customerPhone} />
              </div>
              <p>
                <strong className="dark:text-white text-stone-900">Địa chỉ giao:</strong> {selectedOrder.deliveryAddress}
              </p>
              <p>
                <strong className="dark:text-white text-stone-900">Nguồn đơn:</strong> {selectedOrder.sourceTag || 'Web POS'}
              </p>
              {selectedOrder.note && (
                <p>
                  <strong className="dark:text-white text-stone-900">Ghi chú:</strong> {selectedOrder.note}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-800 border-stone-200 space-y-2">
              <h4 className="font-extrabold text-xs text-amber-500 uppercase tracking-wider">Danh Sách Món</h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs font-semibold">
                  <span>
                    {item.productName} x <strong className="text-amber-500">{item.quantity}</strong>
                  </span>
                  <span>{item.subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t dark:border-neutral-800 border-stone-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs dark:text-neutral-400 text-stone-600">Tổng Tiền Thanh Toán:</span>
                <span className="font-black text-xl text-emerald-500">
                  {selectedOrder.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="dark:text-neutral-400 text-stone-600 font-medium">Hình thức thanh toán:</span>
                <span className="font-bold dark:text-white text-stone-900">
                  {selectedOrder.paymentMethod === 'SPLIT' ? (
                    <span className="text-purple-400">
                      🔀 Hỗn hợp (💵 TM: {(selectedOrder.cashAmount || 0).toLocaleString('vi-VN')}đ + 📱 CK: {(selectedOrder.transferAmount || 0).toLocaleString('vi-VN')}đ)
                    </span>
                  ) : selectedOrder.paymentMethod === 'BANK_TRANSFER' ? (
                    <span className="text-blue-400">📱 Chuyển khoản QR</span>
                  ) : (
                    <span className="text-amber-500">💵 Tiền mặt</span>
                  )}
                </span>
              </div>
            </div>

            {/* Quick Status Change Action Buttons inside Detail Modal */}
            <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
              {/* Smart Dynamic VietQR Bill Button */}
              <button
                type="button"
                onClick={() => setSmartBillOrder(selectedOrder)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer mr-auto"
              >
                <QrCode className="w-4 h-4" />
                <span>🧾 Gửi Bill VietQR Tự Động</span>
              </button>

              {selectedOrder.status === 'PENDING' && (
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED');
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
                >
                  ✓ Xác Nhận Đơn (Bếp làm)
                </button>
              )}
              {selectedOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, 'DELIVERING');
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs"
                >
                  🚚 Giao Hàng (Delivering)
                </button>
              )}
              {selectedOrder.status === 'DELIVERING' && (
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, 'COMPLETED');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  🟢 Hoàn Thành Đơn
                </button>
              )}
              {canCancelOrder && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELLED')}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Hủy Đơn
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal In Bill K80 Thermal Receipt (With 3 Bottom Buttons: Close, Print K80, Confirm Order) */}
      {printBillOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white text-stone-900 rounded-2xl shadow-2xl p-6 relative font-mono text-xs my-6 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPrintBillOrder(null)}
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-900 font-bold text-sm"
            >
              ✕
            </button>

            {/* K80 Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400 space-y-1">
              <div className="font-black text-lg text-stone-950 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-600" />
                <span>GÀ Ủ MUỐI SMART</span>
              </div>
              <p className="text-[10px] text-stone-600 font-sans">Đỉnh Cao Vị Giác - Giòn Rụm Đậm Đà</p>
              <p className="text-[10px] text-stone-600">
                {branches.find((b) => b.id === printBillOrder.branchId)?.address || '12 Đường Cầu Giấy, Q. Cầu Giấy, HN'}
              </p>
              <p className="text-[10px] text-stone-600 font-bold">Hotline: 0988.888.901</p>
            </div>

            {/* Bill Details */}
            <div className="py-3 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>HÓA ĐƠN BÁN HÀNG:</span>
                <span className="text-amber-700">#{printBillOrder.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày:</span>
                <span>{new Date(printBillOrder.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Khách hàng:</span>
                <span className="font-bold">{printBillOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>SĐT:</span>
                <span>{printBillOrder.customerPhone}</span>
              </div>
              <div className="text-[10px] text-stone-700 line-clamp-2">
                <span>Đ/C: </span>
                <span>{printBillOrder.deliveryAddress}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-stone-400 space-y-2">
              <div className="flex justify-between font-bold text-[10px] text-stone-500 uppercase border-b border-stone-200 pb-1">
                <span>Tên Món</span>
                <span>SL x Giá</span>
                <span>T.Tiền</span>
              </div>
              {printBillOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <div className="w-1/2">
                    <span className="font-bold block">{item.productName}</span>
                  </div>
                  <div className="w-1/4 text-center">
                    {item.quantity} x {item.price.toLocaleString('vi-VN')}
                  </div>
                  <div className="w-1/4 text-right font-bold">
                    {item.subtotal.toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Note Section in K80 for Kitchen & Shipper */}
            {printBillOrder.note && (
              <div className="py-2 px-2.5 bg-amber-50 rounded-lg border border-amber-300 my-2 text-[11px] text-amber-950 font-sans">
                <strong className="text-amber-900 font-extrabold block uppercase tracking-wider text-[10px] mb-0.5">
                  📝 GHI CHÚ BẾP & SHIPPER:
                </strong>
                <p className="font-bold italic text-stone-900 leading-tight">
                  {printBillOrder.note}
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="py-3 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Phí Ship:</span>
                <span>{(printBillOrder.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span>Giảm Giá:</span>
                <span>-{(printBillOrder.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-stone-300">
                <span>TỔNG THÀNH TIỀN:</span>
                <span className="text-amber-700">{printBillOrder.totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex flex-col gap-1 text-[10px] text-stone-600">
                <div className="flex justify-between">
                  <span>Hình thức:</span>
                  <span className="font-bold">
                    {printBillOrder.paymentMethod === 'COD'
                      ? 'Tiền mặt (COD)'
                      : printBillOrder.paymentMethod === 'BANK_TRANSFER'
                      ? 'Chuyển khoản QR'
                      : 'Hỗn hợp (Tiền mặt + Chuyển khoản)'}
                  </span>
                </div>
                {printBillOrder.paymentMethod === 'SPLIT' && (
                  <div className="p-1.5 bg-stone-100 rounded text-stone-800 space-y-0.5">
                    <div className="flex justify-between">
                      <span>• Tiền mặt thu:</span>
                      <span className="font-bold text-amber-800">
                        {(printBillOrder.cashAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Chuyển khoản QR:</span>
                      <span className="font-bold text-blue-800">
                        {(printBillOrder.transferAmount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Transfer QR Code if Bank Transfer or Split with transferAmount > 0 */}
            {(printBillOrder.paymentMethod === 'BANK_TRANSFER' ||
              (printBillOrder.paymentMethod === 'SPLIT' && (printBillOrder.transferAmount || 0) > 0)) && (
              <div className="my-3 text-center space-y-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <p className="text-[10px] font-bold text-amber-800">
                  {printBillOrder.paymentMethod === 'SPLIT'
                    ? `QUÉT MÃ QR THANH TOÁN PHẦN CK (${(printBillOrder.transferAmount || 0).toLocaleString('vi-VN')} đ)`
                    : 'QUÉT MÃ QR CHUYỂN KHOẢN HỎA TỐC'}
                </p>
                <img
                  src={`https://img.vietqr.io/image/${paymentConfig.bankId || 'MB'}-${paymentConfig.accountNumber || '0988888888'}-${paymentConfig.qrTemplate || 'compact2'}.png?amount=${printBillOrder.paymentMethod === 'SPLIT' ? (printBillOrder.transferAmount || 0) : printBillOrder.totalAmount}&addInfo=${encodeURIComponent((paymentConfig.transferSyntax || 'GUM [Mã_Đơn]').replace('[Mã_Đơn]', printBillOrder.orderCode).replace('[SĐT]', printBillOrder.customerPhone || ''))}&accountName=${encodeURIComponent(paymentConfig.accountName || 'GA U MUOI SMART')}`}
                  alt="VietQR"
                  className="w-32 h-32 mx-auto rounded border border-amber-300 object-contain bg-white"
                />
                <p className="text-[9px] text-stone-600 font-mono font-bold">
                  {paymentConfig.bankName || paymentConfig.bankId} - STK: {paymentConfig.accountNumber}
                </p>
                <p className="text-[9px] text-stone-500 font-bold uppercase">
                  Chủ TK: {paymentConfig.accountName}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 text-center space-y-1">
              <p className="font-bold text-[11px]">CẢM ƠN QUÝ KHÁCH HÀNG & HẸN GẶP LẠI!</p>
              <p className="text-[9px] text-stone-500">Website: gaumuoismart.vn • Hotline: 0988.888.901</p>
            </div>

            {/* 3 Bottom Action Buttons */}
            <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-stone-200">
              {/* Button 1 (Left): Close */}
              <button
                type="button"
                onClick={() => setPrintBillOrder(null)}
                className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {/* Button 2 (Right): Print K80 */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>In K80</span>
                </button>

                {/* Button 3 (Right Prominent): Confirm Order */}
                {printBillOrder.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={handleConfirmOrderFromK80Modal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>✓ Xác Nhận Đơn</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Confirmation Popup: Ask Payment Status when changing status to COMPLETED */}
      {confirmPaidOrderModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-bold dark:text-white text-stone-900 mb-1">
              Xác Nhận Thanh Toán Khi Hoàn Thành Đơn
            </h3>
            <p className="text-xs dark:text-neutral-400 text-stone-600 mb-6">
              Khách hàng đã thanh toán tiền cho đơn hàng này chưa?
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const targetId = confirmPaidOrderModal.id;
                  setConfirmPaidOrderModal(null);
                  handleUpdateOrderStatus(targetId, 'COMPLETED', 'PAID');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                ✅ Có, Đã Nhận Đủ Tiền (PAID)
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = confirmPaidOrderModal.id;
                  setConfirmPaidOrderModal(null);
                  handleUpdateOrderStatus(targetId, 'COMPLETED', 'UNPAID');
                }}
                className="w-full py-2.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/30 font-bold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                ❌ Chưa, Vẫn Chờ Thanh Toán (UNPAID)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal "Cập Nhật Thông Tin Vận Chuyển (Shipper / Tracking)" */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md dark:bg-[#141820] bg-white rounded-2xl border border-purple-500/40 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShippingModalOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl border border-purple-500/30">
                🛵
              </div>
              <div>
                <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                  Cập Nhật Thông Tin Vận Chuyển
                </h3>
                <p className="text-xs text-purple-400 font-mono font-bold">
                  Mã Đơn: #{shippingModalOrder.orderCode}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitShippingInfo} className="space-y-4 text-xs">
              {/* Carrier Selection */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Đơn Vị Vận Chuyển (*)
                </label>
                <select
                  value={shippingCarrierName}
                  onChange={(e) => setShippingCarrierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="GrabExpress">🟢 GrabExpress</option>
                  <option value="BeDelivery">🟡 BeDelivery</option>
                  <option value="Xanh SM">🌿 Xanh SM Delivery</option>
                </select>
              </div>

              {/* Driver Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Tên Tài Xế / Shipper
                  </label>
                  <input
                    type="text"
                    value={shippingDriverName}
                    onChange={(e) => setShippingDriverName(e.target.value)}
                    placeholder="VD: Bác Tuấn Grab"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                    Số Điện Thoại Tài Xế
                  </label>
                  <input
                    type="text"
                    value={shippingDriverPhone}
                    onChange={(e) => setShippingDriverPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Tracking URL */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Link Theo Dõi Hành Trình Đơn Hàng (Tracking URL) (*)
                </label>
                <input
                  type="url"
                  value={shippingTrackingUrl}
                  onChange={(e) => setShippingTrackingUrl(e.target.value)}
                  placeholder="Dán link Grab / Be / Xanh SM tracking... (VD: https://grab.com/express/track/...)"
                  className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                />
              </div>

              {/* Quick Presets */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 space-y-1.5">
                <span className="font-bold block">💡 Gợi Ý Nhanh Tracking Link:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShippingCarrierName('GrabExpress');
                      setShippingTrackingUrl(`https://grab.com/express/track/${shippingModalOrder.orderCode}`);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1 transition"
                  >
                    <span>🟢 Grab Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShippingCarrierName('BeDelivery');
                      setShippingTrackingUrl(`https://be.com.vn/track/${shippingModalOrder.orderCode}`);
                    }}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-[10px] font-bold text-amber-300 border border-amber-500/40 cursor-pointer flex items-center gap-1 transition"
                  >
                    <span>🟡 Be Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShippingCarrierName('Xanh SM');
                      setShippingTrackingUrl(`https://xanhsm.com/track/${shippingModalOrder.orderCode}`);
                    }}
                    className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 rounded-lg text-[10px] font-bold text-teal-300 border border-teal-500/40 cursor-pointer flex items-center gap-1 transition"
                  >
                    <span>🌿 Xanh SM Link</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-neutral-800 border-stone-200">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:bg-neutral-800 font-semibold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingShipping}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{submittingShipping ? 'Đang cập nhật...' : '🚀 Xác Nhận Xuất Bếp & Bắt Đầu Giao'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal "Hóa Đơn Điện Tử & Mã VietQR Tự Động (Smart Dynamic Bill)" */}
      {smartBillOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg dark:bg-[#141820] bg-white rounded-3xl border border-blue-500/40 shadow-2xl p-6 relative my-6 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <button
              type="button"
              onClick={() => setSmartBillOrder(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b dark:border-neutral-800 border-stone-200 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center text-2xl shadow-lg shrink-0">
                🍗
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base dark:text-white text-stone-900">
                    Hóa Đơn Điện Tử & Mã VietQR Tự Động
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-extrabold border border-blue-500/30">
                    Napas 247
                  </span>
                </div>
                <p className="text-xs text-amber-500 font-mono font-bold mt-0.5">
                  Đơn Hàng: #{smartBillOrder.orderCode} • {formatOrderDateTime(smartBillOrder.createdAt)}
                </p>
              </div>
            </div>

            {/* Customer & Delivery Summary */}
            <div className="p-3.5 rounded-2xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-800 border-stone-200 text-xs space-y-1.5 dark:text-neutral-300 text-stone-700">
              <div className="flex justify-between items-center">
                <span className="font-bold dark:text-white text-stone-900 text-sm">
                  {smartBillOrder.customerName}
                </span>
                <span className="font-mono text-amber-500 font-bold">
                  {smartBillOrder.customerPhone}
                </span>
              </div>
              <p className="text-neutral-400">
                <strong className="dark:text-neutral-300 text-stone-700">Địa chỉ:</strong> {smartBillOrder.deliveryAddress}
              </p>
              {smartBillOrder.note && (
                <p className="text-amber-400 italic bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-1">
                  <strong>Ghi chú:</strong> {smartBillOrder.note}
                </p>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="rounded-2xl border dark:border-neutral-800 border-stone-200 overflow-hidden text-xs">
              <div className="dark:bg-neutral-900 bg-stone-100 p-2.5 font-bold uppercase tracking-wider text-[10px] text-neutral-400 flex justify-between">
                <span>Danh Sách Món ({smartBillOrder.items.length} món)</span>
                <span>Thành Tiền</span>
              </div>
              <div className="divide-y dark:divide-neutral-800 divide-stone-200 p-2 space-y-1">
                {smartBillOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2">
                    <div>
                      <span className="font-bold dark:text-white text-stone-900 block">{item.productName}</span>
                      <span className="text-[11px] text-neutral-400">
                        {item.quantity} x {item.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <span className="font-bold text-amber-500 font-mono">
                      {item.subtotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-stone-50 dark:bg-neutral-900/60 border-t dark:border-neutral-800 border-stone-200 space-y-1">
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Phí vận chuyển:</span>
                  <span>{(smartBillOrder.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>Giảm giá:</span>
                  <span>-{(smartBillOrder.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t dark:border-neutral-800 border-stone-200 text-sm font-black">
                  <span className="dark:text-white text-stone-900">TỔNG THANH TOÁN:</span>
                  <span className="text-xl font-black text-emerald-500 font-mono">
                    {smartBillOrder.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Napas VietQR Card */}
            {(() => {
              const qrPayAmount =
                smartBillOrder.paymentMethod === 'SPLIT' && (smartBillOrder.transferAmount || 0) > 0
                  ? smartBillOrder.transferAmount || smartBillOrder.totalAmount
                  : smartBillOrder.totalAmount;
              const transferSyntax = (paymentConfig.transferSyntax || 'GMS [Mã_Đơn]')
                .replace('[Mã_Đơn]', smartBillOrder.orderCode)
                .replace('[SĐT]', smartBillOrder.customerPhone || '');
              const qrUrl = `https://img.vietqr.io/image/${paymentConfig.bankId || 'MB'}-${paymentConfig.accountNumber || '0988888888'}-${paymentConfig.qrTemplate || 'compact2'}.png?amount=${qrPayAmount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(paymentConfig.accountName || 'GA U MUOI SMART')}`;

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-2 border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" />
                      <span>MÃ VIETQR ĐỘNG TỰ ĐIỀN TIỀN & NỘI DUNG</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      Khớp lệnh tức thì
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white/5 p-3 rounded-xl border border-blue-500/20">
                    <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg">
                      <img
                        src={qrUrl}
                        alt="VietQR Gà Ủ Muối Smart"
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                    <div className="text-xs space-y-1 text-neutral-300 flex-1 w-full font-medium">
                      <p className="flex justify-between border-b dark:border-neutral-800 border-stone-200 pb-0.5">
                        <span className="text-neutral-400">Ngân hàng:</span>
                        <strong className="text-white">{paymentConfig.bankName || paymentConfig.bankId}</strong>
                      </p>
                      <p className="flex justify-between border-b dark:border-neutral-800 border-stone-200 pb-0.5">
                        <span className="text-neutral-400">Số tài khoản:</span>
                        <strong className="text-amber-400 font-mono">{paymentConfig.accountNumber}</strong>
                      </p>
                      <p className="flex justify-between border-b dark:border-neutral-800 border-stone-200 pb-0.5">
                        <span className="text-neutral-400">Chủ tài khoản:</span>
                        <strong className="text-white uppercase">{paymentConfig.accountName}</strong>
                      </p>
                      <p className="flex justify-between border-b dark:border-neutral-800 border-stone-200 pb-0.5">
                        <span className="text-neutral-400">Số tiền QR:</span>
                        <strong className="text-emerald-400 font-mono font-bold">{qrPayAmount.toLocaleString('vi-VN')} đ</strong>
                      </p>
                      <p className="flex justify-between pt-0.5">
                        <span className="text-neutral-400">Cú pháp CK:</span>
                        <strong className="text-amber-300 font-mono font-extrabold">{transferSyntax}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons: Copy Link & Share Zalo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t dark:border-neutral-800 border-stone-200">
              <button
                type="button"
                onClick={() => handleCopyBillLink(smartBillOrder)}
                className="py-3 px-4 rounded-xl dark:bg-neutral-800 bg-stone-200 hover:bg-stone-300 dark:hover:bg-neutral-700 text-stone-900 dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span>{copiedBillLink ? '✓ Đã Sao Chép Link!' : '📋 Sao Chép Link Bill'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareZalo(smartBillOrder)}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{copiedZaloMsg ? '✓ Đã Copy & Mở Zalo!' : '💬 Gửi Zalo / SMS Cho Khách'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
