'use client';

import React, { useEffect, useState } from 'react';
import {
  PackagePlus,
  Building2,
  Truck,
  Calendar,
  User,
  Plus,
  Trash2,
  DollarSign,
  FileText,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Printer,
  Download,
  X,
  CreditCard,
  Wallet,
  Sparkles,
  AlertTriangle,
  Clock,
  Flame,
} from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';

interface ProductItem {
  id: string;
  name: string;
  type?: string;
  unit?: string;
  stockQuantity: number;
  costPrice: number;
  price: number;
  batchCode?: string | null;
  expiryDate?: string | null;
}

interface ImportRow {
  id: string; // temp unique key
  productId: string;
  productName: string;
  unit: string;
  quantity: number | '';
  unitPrice: number | '';
  subtotal: number;
}

interface InventoryReceipt {
  id: string;
  receiptCode: string;
  branchId: string;
  supplierName: string;
  totalAmount: number;
  paymentMethod: string; // CASH, BANK_TRANSFER, CREDIT
  paymentStatus: string; // PAID, UNPAID
  creatorName: string;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    unit: string;
    batchCode: string | null;
    expiryDate: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

const SUPPLIERS = [
  'Trang Trại Gà Sạch Ba Vì',
  'Nông Sản Việt Đồng Nai',
  'Gia Vị & Thảo Mộc Việt',
  'Nhà Máy Bao Bì Phú Mỹ',
  'Nhập Khẩu Đông Lạnh Hà Nội',
  'Khác (Nhập tùy chỉnh)',
];

export default function InboundReceiptsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-neutral-400 text-sm">Đang tải...</div>}>
      <InboundReceiptsInner />
    </React.Suspense>
  );
}

function InboundReceiptsInner() {
  const { branches } = useBranches();
  const BRANCHES = branches.length > 0
    ? [
        ...branches.map((b) => ({ id: b.id, name: `📍 ${b.code ? b.code + ' - ' : ''}${b.name}` })),
        { id: 'center', name: '🏭 Bếp Tổng / Kho Trung Tâm' },
      ]
    : [
        { id: 'cs1', name: '📍 CS1 - Cầu Giấy' },
        { id: 'cs2', name: '📍 CS2 - Đống Đa' },
        { id: 'cs3', name: '📍 CS3 - Hai Bà Trưng' },
        { id: 'cs4', name: '📍 CS4 - Thanh Xuân' },
        { id: 'cs5', name: '📍 CS5 - Tây Hồ' },
        { id: 'cs6', name: '📍 CS6 - Nam Từ Liêm' },
        { id: 'center', name: '🏭 Bếp Tổng / Kho Trung Tâm' },
      ];
  const todayStr = new Date().toISOString().split('T')[0];
  const searchParams = useSearchParams();

  // Auth User State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // DB Products list for selection
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form Header State
  const [branchId, setBranchId] = useState('cs1');
  const [supplierName, setSupplierName] = useState(SUPPLIERS[0]);
  const [customSupplier, setCustomSupplier] = useState('');
  const [receivedAt, setReceivedAt] = useState(todayStr);
  const [creatorName, setCreatorName] = useState('Quản lý kho');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CREDIT'>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Flag to know if URL params have already been applied (one-time pre-fill)
  const [urlParamsApplied, setUrlParamsApplied] = useState(false);

  // Dynamic Item Rows State
  const [rows, setRows] = useState<ImportRow[]>([]);

  // History Receipts State
  const [receipts, setReceipts] = useState<InventoryReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [historyBranchFilter, setHistoryBranchFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalReceiptsCount: 0,
    totalImportValue: 0,
    cashTotal: 0,
    bankTotal: 0,
    creditTotal: 0,
  });

  // Receipt Detail Modal State
  const [viewingReceipt, setViewingReceipt] = useState<InventoryReceipt | null>(null);

  // Toast Banner State
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Pre-fill form from URL query params (from "Nhập Nhanh" on stock check page)
  useEffect(() => {
    if (urlParamsApplied) return;
    const paramBranchId = searchParams.get('branchId');
    const paramProductName = searchParams.get('productName');
    const paramSuggestedQty = searchParams.get('suggestedQty');
    const paramSupplier = searchParams.get('supplier');

    if (paramBranchId) setBranchId(paramBranchId);
    if (paramSupplier) {
      const matchedSupplier = SUPPLIERS.find((s) => s.toLowerCase().includes(paramSupplier.toLowerCase()));
      if (matchedSupplier) {
        setSupplierName(matchedSupplier);
      } else {
        setSupplierName('Khác (Nhập tùy chỉnh)');
        setCustomSupplier(paramSupplier);
      }
    }
    if (paramProductName && paramSuggestedQty) {
      setUrlParamsApplied(true);
    }
  }, [searchParams, urlParamsApplied]);

  // 1. Fetch User & Products
  const fetchProductsForBranch = (bId: string) => {
    setLoadingProducts(true);
    fetch(`/api/products?branchId=${bId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setDbProducts(data.products);
          const singleProds = data.products.filter((p: any) => p.type !== 'COMBO');
          // Only pre-fill if entered via "Nhập Nhanh" with URL search params!
          const paramProductName = searchParams.get('productName');
          const paramSuggestedQty = searchParams.get('suggestedQty');
          if (paramProductName && paramSuggestedQty && rows.length === 0) {
            const matchedProd = singleProds.find((p: any) =>
              p.name.toLowerCase().includes(paramProductName.toLowerCase()) ||
              paramProductName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (matchedProd) {
              const targetCost = Number(matchedProd.costPrice) > 0 ? Number(matchedProd.costPrice) : (matchedProd.price ? Math.round(matchedProd.price * 0.6) : 60000);
              const targetQty = Math.max(1, Number(paramSuggestedQty));
              setRows([
                {
                  id: 'row-1',
                  productId: matchedProd.id,
                  productName: matchedProd.name,
                  unit: matchedProd.unit || '',
                  quantity: targetQty,
                  unitPrice: targetCost,
                  subtotal: targetQty * targetCost,
                },
              ]);
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setCreatorName(data.user.name || 'Quản lý kho');
        }
      })
      .catch(console.error);

    fetchProductsForBranch(branchId);
  }, [branchId]);

  // 2. Fetch History Receipts
  const fetchReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const params = new URLSearchParams();
      if (historyBranchFilter !== 'all') params.append('branchId', historyBranchFilter);
      if (historySearch) params.append('search', historySearch);
      if (historyFromDate) params.append('fromDate', historyFromDate);
      if (historyToDate) params.append('toDate', historyToDate);

      const res = await fetch(`/api/inventory/import?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReceipts(data.receipts || []);
        if (data.summary) setSummaryMetrics(data.summary);
      }
    } catch (e) {
      console.error('Error fetching receipts:', e);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [historyBranchFilter]);

  // Handle row changes in dynamic table (Auto-fill costPrice & recalculate subtotal)
  const handleProductSelectChange = (rowId: string, prodId: string) => {
    if (!prodId) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id === rowId) {
            return {
              ...r,
              productId: '',
              productName: '',
              unit: '',
              unitPrice: 0,
              subtotal: 0,
            };
          }
          return r;
        })
      );
      return;
    }

    const prod = dbProducts.find((p) => p.id === prodId);
    if (!prod) return;

    const uPrice = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : (prod.price ? Math.round(prod.price * 0.6) : 60000);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const qty = Number(r.quantity) || 1;
          return {
            ...r,
            productId: prod.id,
            productName: prod.name,
            unit: prod.unit || '',
            unitPrice: uPrice,
            subtotal: qty * uPrice,
          };
        }
        return r;
      })
    );
  };

  const handleRowInputChange = (rowId: string, field: keyof ImportRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const updated = { ...r, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = Number(updated.quantity) || 0;
            const price = Number(updated.unitPrice) || 0;
            updated.subtotal = qty * price;
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleAddRow = () => {
    const newRow: ImportRow = {
      id: `row-${Date.now()}`,
      productId: '',
      productName: '',
      unit: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
    };

    setRows((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Grand Total Calculation
  const grandTotal = rows.reduce((sum, r) => sum + r.subtotal, 0);

  // Submit Inventory Import Receipt
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSupplier = supplierName === 'Khác (Nhập tùy chỉnh)' ? customSupplier : supplierName;

    if (!activeSupplier || !activeSupplier.trim()) {
      showToast('Vui lòng chọn hoặc nhập tên Nhà Cung Cấp!');
      return;
    }

    if (rows.length === 0) {
      showToast('Vui lòng thêm ít nhất một mặt hàng nhập kho!');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.productId || !r.productName || !r.productName.trim()) {
        showToast(`Dòng thứ ${i + 1}: Vui lòng chọn sản phẩm / nguyên liệu nhập kho!`);
        return;
      }
      if (!r.quantity || Number(r.quantity) <= 0) {
        showToast(`Dòng "${r.productName}": Số lượng nhập phải lớn hơn 0!`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          supplierName: activeSupplier,
          receivedAt,
          creatorName,
          paymentMethod,
          notes,
          items: rows.map((r) => ({
            productId: r.productId,
            productName: r.productName,
            unit: r.unit,
            quantity: Number(r.quantity),
            unitPrice: Number(r.unitPrice),
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Tạo phiếu nhập kho ${data.receipt.receiptCode} thành công! Đã tự động cập nhật tồn kho & tạo phiếu chi.`);
        setNotes('');

        // Reset rows
        const singleProds = dbProducts.filter((p) => p.type !== 'COMBO');
        if (singleProds.length > 0) {
          const firstP = singleProds[0];
          setRows([
            {
              id: `row-${Date.now()}`,
              productId: firstP.id,
              productName: firstP.name,
              unit: firstP.unit || 'Con',
              quantity: 20,
              unitPrice: firstP.costPrice || Math.round(firstP.price * 0.6),
              subtotal: 20 * (firstP.costPrice || Math.round(firstP.price * 0.6)),
            },
          ]);
        }
        fetchReceipts();
      } else {
        alert(data.error || 'Lỗi tạo phiếu nhập');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Receipts List to Excel
  const handleExportReceiptsExcel = () => {
    const exportData = receipts.map((r, idx) => ({
      STT: idx + 1,
      'Mã Phiếu': r.receiptCode,
      'Kho Nhận': BRANCHES.find((b) => b.id === r.branchId)?.name || r.branchId,
      'Nhà Cung Cấp': r.supplierName,
      'Số Mặt Hàng': r.items?.length || 0,
      'Tổng Tiền (VNĐ)': r.totalAmount,
      'Phương Thức Thanh Toán': r.paymentMethod === 'CASH' ? 'Tiền mặt' : r.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Ghi nợ NCC',
      'Trạng Thái Thanh Toán': r.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Ghi nợ',
      'Người Lập Phiếu': r.creatorName,
      'Ngày Nhập': new Date(r.receivedAt).toLocaleDateString('vi-VN'),
      'Ghi Chú': r.notes || '---',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch_Sử_Nhập_Kho');
    XLSX.writeFile(workbook, `Lich_Su_Nhap_Kho_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span className="font-extrabold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <PackagePlus className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAF9] tracking-tight">
                Quản Lý Nhập Hàng Kho
              </h1>
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 2-Way Sync Kho & Sổ Quỹ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Tạo phiếu nhập hàng nhanh, tự động cộng dồn số lượng tồn kho và tạo phiếu chi sổ quỹ.
            </p>
          </div>
        </div>
      </div>

      {/* ================= SECTION 1: FORM TẠO PHIẾU NHẬP (HEADER PHIẾU) ================= */}
      <form onSubmit={handleSubmitReceipt} className="bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
          <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base tracking-tight flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-amber-500 stroke-[1.75]" />
            <span>Tạo Phiếu Nhập Kho Mới</span>
          </h2>
          <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Mã phiếu tự động (#NK-XXXXX)
          </span>
        </div>

        {/* 4 Header Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Col 1: Branch */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Kho / Chi Nhánh Nhận (*):</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: Supplier */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-500" />
              <span>Nhà Cung Cấp (*):</span>
            </label>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              {SUPPLIERS.map((s, idx) => (
                <option key={idx} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {supplierName === 'Khác (Nhập tùy chỉnh)' && (
              <input
                type="text"
                placeholder="Nhập tên Nhà Cung Cấp mới..."
                value={customSupplier}
                onChange={(e) => setCustomSupplier(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white mt-1.5"
              />
            )}
          </div>

          {/* Col 3: Date */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Ngày Nhập Hàng (*):</span>
            </label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Col 4: Creator */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-800 dark:text-neutral-200 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>Người Lập Phiếu:</span>
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ================= SECTION 2: BẢNG DANH SÁCH MẶT HÀNG NHẬP (DYNAMIC TABLE) ================= */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Danh Sách Mặt Hàng Nhập Kho ({rows.length} món)
            </h3>
          </div>

          <div className="overflow-x-auto scrollbar-thin border border-slate-200 dark:border-neutral-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3 min-w-[240px]">SẢN PHẨM / NGUYÊN LIỆU (*)</th>
                  <th className="py-3 px-3 w-28">SL NHẬP (*)</th>
                  <th className="py-3 px-3 w-36">ĐƠN GIÁ NHẬP (VNĐ)</th>
                  <th className="py-3 px-3 text-right w-32">THÀNH TIỀN</th>
                  <th className="py-3 px-3 text-center w-12">XÓA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-neutral-500 text-xs">
                      Chưa có mặt hàng nào. Vui lòng bấm <span className="font-bold text-amber-500">+ Thêm Dòng Mặt Hàng Nhập Kho</span> để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const singleProds = dbProducts.filter((p) => p.type !== 'COMBO');
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60">
                        {/* 1. Product select */}
                        <td className="py-2.5 px-3">
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductSelectChange(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-lg font-bold text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">-- Chọn sản phẩm / nguyên liệu nhập kho --</option>
                            {singleProds.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Quantity input */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity || ''}
                            onChange={(e) => handleRowInputChange(row.id, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-lg font-bold text-xs text-amber-400"
                        />
                      </td>

                      {/* 4. Unit Price input */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) => handleRowInputChange(row.id, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-lg font-bold text-xs text-slate-900 dark:text-white"
                        />
                      </td>

                      {/* 5. Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {row.subtotal.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 6. Delete row */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>+ Thêm Dòng Mặt Hàng Nhập Kho</span>
          </button>
        </div>

        {/* ================= SECTION 3: TỔNG KẾT PHIẾU & THANH TOÁN ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200 dark:border-neutral-800">
          {/* Notes & Info (7 cols) */}
          <div className="lg:col-span-7 space-y-3 text-xs">
            <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
              Ghi Chú Vận Chuyển / Kiểm Đếm:
            </label>
            <textarea
              rows={3}
              placeholder="Nhập biển số xe giao hàng, tình trạng bao bì hút chân không, nhiệt độ xe lạnh..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Tự động đồng bộ số lượng vào kho, cập nhật giá vốn & tạo phiếu chi tương ứng bên Sổ Quỹ.
              </span>
            </div>
          </div>

          {/* Payment Method & Total (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#0B0D11] p-5 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <span className="font-extrabold text-slate-700 dark:text-neutral-300 text-xs">TỔNG TIỀN PHIẾU NHẬP:</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {grandTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Payment Method Radio */}
            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                Phương Thức Thanh Toán (*):
              </label>
              <div className="space-y-2">
                <label className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-[#14171D] border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}>
                  <input
                    type="radio"
                    name="pmRadio"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="hidden"
                  />
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>💵 Đã thanh toán Tiền mặt (Tự tạo Phiếu chi)</span>
                </label>

                <label className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-[#14171D] border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}>
                  <input
                    type="radio"
                    name="pmRadio"
                    checked={paymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMethod('BANK_TRANSFER')}
                    className="hidden"
                  />
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span>🏦 Đã thanh toán Chuyển khoản (Tự tạo Phiếu chi)</span>
                </label>

                <label className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 cursor-pointer transition ${
                  paymentMethod === 'CREDIT'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'bg-white dark:bg-[#14171D] border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}>
                  <input
                    type="radio"
                    name="pmRadio"
                    checked={paymentMethod === 'CREDIT'}
                    onChange={() => setPaymentMethod('CREDIT')}
                    className="hidden"
                  />
                  <Clock className="w-4 h-4 text-rose-500" />
                  <span>📝 Ghi nợ NCC (Thanh toán sau)</span>
                </label>
              </div>
            </div>

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <PackagePlus className="w-5 h-5 stroke-[2.2]" />
              <span>{submitting ? 'ĐANG XỬ LÝ NHẬP KHO...' : '📦 HOÀN TẤT & XÁC NHẬN NHẬP KHO'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ================= SECTION 4: BẢNG LỊCH SỬ PHIẾU NHẬP KHO ================= */}
      <div className="bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base sm:text-lg tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 stroke-[1.75]" />
              <span>Lịch Sử Tất Cả Phiếu Nhập Kho</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Theo dõi lịch sử nhập nguyên liệu, đối soát tiền hàng nhà cung cấp và kiểm tra phiếu chi sổ quỹ.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={historyBranchFilter}
              onChange={(e) => setHistoryBranchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">🏢 Tất cả kho/cơ sở</option>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchReceipts}
              className="p-2 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 rounded-xl hover:text-amber-500 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReceipts ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleExportReceiptsExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer transition"
            >
              <Download className="w-4 h-4 stroke-[2]" />
              <span>Xuất Excel Lịch Sử</span>
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto scrollbar-thin">
          {loadingReceipts ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Đang tải lịch sử nhập kho...</div>
          ) : receipts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-bold">Chưa có phiếu nhập kho nào</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-3">MÃ PHIẾU</th>
                  <th className="py-3.5 px-3">KHO NHẬN</th>
                  <th className="py-3.5 px-3">NHÀ CUNG CẤP</th>
                  <th className="py-3.5 px-3 text-center">TỔNG MẶT HÀNG</th>
                  <th className="py-3.5 px-3">TỔNG TIỀN (VNĐ)</th>
                  <th className="py-3.5 px-3">THANH TOÁN</th>
                  <th className="py-3.5 px-3">NGƯỜI LẬP</th>
                  <th className="py-3.5 px-3">NGÀY NHẬP</th>
                  <th className="py-3.5 px-3 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60 whitespace-nowrap">
                    <td className="py-3 px-3 font-mono font-extrabold text-amber-500">
                      <button
                        onClick={() => setViewingReceipt(r)}
                        className="hover:underline cursor-pointer"
                      >
                        {r.receiptCode}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200 dark:border-neutral-700">
                        {BRANCHES.find((b) => b.id === r.branchId)?.name || r.branchId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {r.supplierName}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {r.items?.length || 0} món
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                      {r.totalAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3">
                      {r.paymentMethod === 'CASH' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          💵 Tiền mặt
                        </span>
                      ) : r.paymentMethod === 'BANK_TRANSFER' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">
                          🏦 Chuyển khoản
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500">
                          📝 Ghi nợ NCC
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600 dark:text-neutral-400">
                      {r.creatorName}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-500">
                      {new Date(r.receivedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setViewingReceipt(r)}
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-neutral-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= SECTION 5: RECEIPT DETAIL MODAL ================= */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Chi Tiết Phiếu Nhập Kho <span className="font-mono text-amber-500">{viewingReceipt.receiptCode}</span>
                </h3>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-400 text-[10px] block">KHO NHẬN:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {BRANCHES.find((b) => b.id === viewingReceipt.branchId)?.name || viewingReceipt.branchId}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-400 text-[10px] block">NHÀ CUNG CẤP:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingReceipt.supplierName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-400 text-[10px] block">NGƯỜI TẠO:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingReceipt.creatorName}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-400 text-[10px] block">NGÀY NHẬP:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(viewingReceipt.receivedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">TÊN MÓN</th>
                    <th className="py-2.5 px-3 text-center">SL</th>
                    <th className="py-2.5 px-3">ĐƠN GIÁ</th>
                    <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                  {viewingReceipt.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{item.productName}</td>
                      <td className="py-2 px-3 text-center font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 font-mono">{item.unitPrice?.toLocaleString('vi-VN')}đ</td>
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-500">
                        {item.subtotal?.toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-neutral-800 pt-3 text-xs">
              <div className="font-bold text-slate-600 dark:text-neutral-400">
                Thanh toán: <strong className="text-amber-500">{viewingReceipt.paymentMethod}</strong> ({viewingReceipt.paymentStatus})
              </div>
              <div className="text-sm font-black text-emerald-500 font-mono">
                Tổng: {viewingReceipt.totalAmount?.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-800 dark:text-neutral-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> In Phiếu A4
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 bg-amber-500 text-neutral-950 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Đóng Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
