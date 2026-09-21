'use client';

import React, { useEffect, useState } from 'react';
import {
  PackageMinus,
  Plus,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Building2,
  Eye,
  X,
  Search,
  Filter,
  TrendingDown,
  ArrowRightLeft,
  Gift,
  Flame,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBranches } from '@/hooks/useBranches';

interface ProductItem {
  id: string;
  name: string;
  type?: string;
  unit: string;
  stockQuantity: number;
  costPrice: number;
}

interface ExportRow {
  productId: string;
  productName: string;
  unit: string;
  quantity: number | '';
  unitCost: number;
  stockQuantity: number;
}

const REASON_CATEGORIES = [
  { id: 'PROCESSING', label: '🍳 Xuất bếp chế biến / Bán hàng ca trực', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'TRANSFER', label: '🚚 Điều chuyển chi nhánh / Kho nội bộ', badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'DAMAGE_EXPIRED', label: '⚠️ Hủy hàng hỏng / Hết hạn / Thất thoát', badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id: 'PROMOTION', label: '🎁 Xuất làm mẫu thử / Marketing / Biếu tặng', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'OTHER', label: '📦 Lý do khác (Ghi chú chi tiết)', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

export default function InventoryOutboundPage() {
  const { branches } = useBranches();
  const BRANCHES = [
    { id: 'bep-tong', name: '🏭 Bếp Tổng / Kho Trung Tâm' },
    ...(branches.length > 0
      ? branches.map((b) => ({ id: b.id, name: `📍 ${b.code ? b.code + ' - ' : ''}${b.name}` }))
      : [
          { id: 'cs1', name: '📍 CS1 - Cầu Giấy' },
          { id: 'cs2', name: '📍 CS2 - Đống Đa' },
          { id: 'cs3', name: '📍 CS3 - Hai Bà Trưng' },
          { id: 'cs4', name: '📍 CS4 - Thanh Xuân' },
          { id: 'cs5', name: '📍 CS5 - Tây Hồ' },
          { id: 'cs6', name: '📍 CS6 - Nam Từ Liêm' },
        ]),
  ];
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isStaff = currentUser?.role === 'STAFF';

  // Form Header States
  const [branchId, setBranchId] = useState('cs1');
  const [reasonCategory, setReasonCategory] = useState('PROCESSING');
  const [targetBranchId, setTargetBranchId] = useState('cs4');
  const [exportedAt, setExportedAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [creatorName, setCreatorName] = useState('Quản lý kho');
  const [notes, setNotes] = useState('');

  // Form Multi-Items Rows State
  const [exportRows, setExportRows] = useState<ExportRow[]>([
    {
      productId: '',
      productName: '',
      unit: 'Con',
      quantity: 1,
      unitCost: 0,
      stockQuantity: 0,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // History Table States
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>({
    totalExportsCount: 0,
    totalExportValue: 0,
    damageWastageTotal: 0,
    processingTotal: 0,
    transferTotal: 0,
    sampleTotal: 0,
  });
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // Selected Detail Modal Record
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // 1. Fetch current logged-in user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setCreatorName(data.user.name || 'Quản lý kho');
          if (data.user.role !== 'ADMIN' && data.user.branchId) {
            setBranchId(data.user.branchId);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. Fetch products for dropdown selection (Filter out COMBO products)
  const fetchProducts = async (selectedBranchId: string = branchId) => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/products?branchId=${selectedBranchId}`);
      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        const singleProds = data.products.filter((p: any) => p.type !== 'COMBO');
        const formatted: ProductItem[] = singleProds.map((p: any) => {
          const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : (p.price ? Math.round(p.price * 0.6) : 60000);
          const bStock = p.branchStock !== undefined ? p.branchStock : (p.stockQuantity ?? 50);
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            unit: p.unit || 'Con',
            stockQuantity: bStock,
            costPrice: cost,
          };
        });
        setProducts(formatted);

        // Pre-fill row 1 if empty
        if (formatted.length > 0 && (!exportRows[0].productId || exportRows[0].unitCost === 0)) {
          setExportRows([
            {
              productId: formatted[0].id,
              productName: formatted[0].name,
              unit: formatted[0].unit,
              quantity: 1,
              unitCost: formatted[0].costPrice,
              stockQuantity: formatted[0].stockQuantity,
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 3. Fetch Export History Receipts
  const fetchExportHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (filterSearch) params.append('search', filterSearch);
      if (filterBranch !== 'all') params.append('branchId', filterBranch);
      if (filterReason !== 'all') params.append('reasonCategory', filterReason);
      if (filterFromDate) params.append('fromDate', filterFromDate);
      if (filterToDate) params.append('toDate', filterToDate);

      const res = await fetch(`/api/inventory/export?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setHistoryRecords(data.exports || []);
        if (data.summary) {
          setSummaryData(data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching export history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProducts(branchId);
  }, [branchId]);

  useEffect(() => {
    fetchExportHistory();
  }, [filterSearch, filterBranch, filterReason, filterFromDate, filterToDate]);

  // Handle product selection change in row (Auto-fill costPrice from product)
  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    const productCost = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : 60000;
    const currentQty = Number(exportRows[index]?.quantity) || 1;

    setExportRows((prevRows) => {
      const updated = [...prevRows];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit || 'Con',
        unitCost: productCost,
        stockQuantity: prod.stockQuantity ?? 50,
        quantity: currentQty,
      };
      return updated;
    });
  };

  // Update row quantity
  const handleRowChange = (index: number, field: keyof ExportRow, value: any) => {
    setExportRows((prevRows) => {
      const updated = [...prevRows];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // Add new empty row (Auto-fill costPrice of default product)
  const handleAddRow = () => {
    const firstProd = products[0];
    const defaultCost = firstProd ? (Number(firstProd.costPrice) > 0 ? Number(firstProd.costPrice) : 60000) : 60000;
    setExportRows((prevRows) => [
      ...prevRows,
      {
        productId: firstProd ? firstProd.id : '',
        productName: firstProd ? firstProd.name : '',
        unit: firstProd ? firstProd.unit : 'Con',
        quantity: 1,
        unitCost: defaultCost,
        stockQuantity: firstProd ? firstProd.stockQuantity : 0,
      },
    ]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (exportRows.length <= 1) {
      alert('Phiếu xuất kho phải chứa ít nhất 1 mặt hàng!');
      return;
    }
    const newRows = exportRows.filter((_, i) => i !== index);
    setExportRows(newRows);
  };

  // Calculate Subtotals & Total Value
  const calculatedTotalValue = exportRows.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const cost = Number(r.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  // Check if any row has stock validation error
  const hasValidationError = exportRows.some((r) => {
    const qty = Number(r.quantity) || 0;
    return qty <= 0 || qty > r.stockQuantity;
  });

  // Submit Export Receipt Form
  const handleSubmitExport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (exportRows.length === 0) {
      alert('Vui lòng chọn ít nhất 1 mặt hàng cần xuất!');
      return;
    }

    if (hasValidationError) {
      alert('Có mặt hàng có số lượng xuất vượt quá tồn kho hiện tại hoặc số lượng bằng 0! Vui lòng kiểm tra lại.');
      return;
    }

    if (reasonCategory === 'TRANSFER' && (!targetBranchId || targetBranchId === branchId)) {
      alert('Kho Nhận Hàng (Đích) phải chọn và phải khác Kho Xuất Hàng (Nguồn)!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        branchId,
        reasonCategory,
        targetBranchId: reasonCategory === 'TRANSFER' ? targetBranchId : undefined,
        exportedAt,
        creatorName,
        notes,
        items: exportRows.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          unit: r.unit,
          quantity: Number(r.quantity) || 1,
          unitCost: Number(r.unitCost) || 0,
        })),
      };

      const res = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(`🎉 ${data.message}`);
        // Reset Form
        setNotes('');
        fetchProducts(); // refresh stock numbers
        fetchExportHistory();
      } else {
        alert(`❌ Error: ${data.error || 'Lỗi xuất kho'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel Report
  const handleExportExcel = () => {
    if (historyRecords.length === 0) {
      alert('Không có dữ liệu phiếu xuất kho để xuất Excel!');
      return;
    }

    const dataToExport = historyRecords.map((rec) => {
      const branchName = BRANCHES.find((b) => b.id === rec.branchId)?.name || rec.branchId;
      const targetName = rec.targetBranchId ? BRANCHES.find((b) => b.id === rec.targetBranchId)?.name || rec.targetBranchId : '-';
      const reasonObj = REASON_CATEGORIES.find((r) => r.id === rec.reasonCategory);

      return {
        'Mã Phiếu': rec.exportCode,
        'Kho Xuất (Nguồn)': branchName,
        'Lý Do Xuất Kho': reasonObj ? reasonObj.label : rec.reasonCategory,
        'Kho Nhận (Đích)': targetName,
        'Số Loại Món': rec.totalItems,
        'Tổng Giá Trị Vốn (đ)': rec.totalValue,
        'Người Lập Phiếu': rec.creatorName,
        'Ngày Xuất Kho': new Date(rec.exportedAt).toLocaleString('vi-VN'),
        'Ghi Chú': rec.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phieu_Xuat_Kho');
    XLSX.writeFile(workbook, `Bao_Cao_Xuat_Kho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getBranchLabel = (bId: string) => {
    return BRANCHES.find((b) => b.id === bId)?.name || bId;
  };

  const getReasonObj = (rId: string) => {
    return REASON_CATEGORIES.find((r) => r.id === rId) || { label: rId, badgeClass: 'bg-neutral-800 text-neutral-300' };
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#14171D] p-6 rounded-2xl border border-neutral-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <PackageMinus className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#FAFAF9] tracking-tight">
                  Xuất Hàng Kho & Kiểm Soát Hao Hụt
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full">
                  F&B Outbound & 2-Way Sync
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-medium">
                Quản lý xuất bếp chế biến, điều chuyển kho 2 chiều tự động, hủy hàng hư hỏng & xuất mẫu thử
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel Báo Cáo
          </button>
        </div>
      </div>

      {/* KPI TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#14171D] p-5 rounded-2xl border border-neutral-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">TỔNG XUẤT KHO</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <PackageMinus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#FAFAF9] font-mono mt-2">
            {summaryData.totalExportsCount || 0} <span className="text-xs font-normal text-neutral-400">phiếu</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Tổng cộng kỳ này</p>
        </div>

        <div className="bg-[#14171D] p-5 rounded-2xl border border-neutral-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">TỔNG GIÁ TRỊ VỐN XUẤT</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono mt-2">
            {isStaff ? '***' : `${Number(summaryData.totalExportValue || 0).toLocaleString('vi-VN')} đ`}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Toàn bộ giá vốn xuất kho</p>
        </div>

        <div className="bg-[#14171D] p-5 rounded-2xl border border-rose-500/30 bg-rose-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-400 uppercase tracking-wider">⚠️ HAO HỤT / HỦY HÀNG</span>
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono mt-2">
            {isStaff ? '***' : `${Number(summaryData.damageWastageTotal || 0).toLocaleString('vi-VN')} đ`}
          </p>
          <p className="text-[11px] text-rose-400/80 mt-1 font-semibold">Tổn thất rách bọc / HSD</p>
        </div>

        <div className="bg-[#14171D] p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider">🚚 ĐIỀU CHUYỂN 2 CHIỀU</span>
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-300 font-mono mt-2">
            {isStaff ? '***' : `${Number(summaryData.transferTotal || 0).toLocaleString('vi-VN')} đ`}
          </p>
          <p className="text-[11px] text-purple-400 mt-1 font-semibold">Tự động cộng/trừ tồn 2 kho</p>
        </div>
      </div>

      {/* CREATE EXPORT RECEIPT FORM SECTION */}
      <form onSubmit={handleSubmitExport} className="bg-[#14171D] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-[#FAFAF9]">Lập Phiếu Xuất Kho / Điều Chuyển Mới</h2>
          </div>
          <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            {reasonCategory === 'TRANSFER' ? '🔄 2-Way Auto Stock Sync' : '⚡ Tự động trừ tồn kho'}
          </span>
        </div>

        {/* SECTION 1: FORM HEADER (4 COLUMNS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Col 1: Reason Dropdown */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-neutral-300">
              Phân Loại / Lý Do Xuất <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-amber-500/50 rounded-xl text-xs font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
            >
              {REASON_CATEGORIES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: Source Branch */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-neutral-300">
              {reasonCategory === 'TRANSFER' ? 'Kho Xuất Hàng (Nguồn) (*)' : 'Cơ Sở Xuất Hàng (*)'}
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                const newBranch = e.target.value;
                setBranchId(newBranch);
                if (targetBranchId === newBranch) {
                  const other = BRANCHES.find((b) => b.id !== newBranch);
                  if (other) setTargetBranchId(other.id);
                }
              }}
              disabled={currentUser && currentUser.role !== 'ADMIN'}
              className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-bold text-[#FAFAF9] focus:border-amber-500 disabled:opacity-60 focus:outline-none"
            >
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 3: Target Branch IF TRANSFER, else Export Date */}
          {reasonCategory === 'TRANSFER' ? (
            <div className="space-y-1.5">
              <label className="block font-extrabold text-purple-400 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>Kho Nhận Hàng (Đích) (*)</span>
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-purple-500/50 rounded-xl text-xs font-bold text-purple-300 focus:border-purple-500 focus:outline-none"
              >
                {BRANCHES.filter((b) => b.id !== branchId).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block font-extrabold text-neutral-300">Ngày Xuất Hàng (*)</label>
              <input
                type="datetime-local"
                value={exportedAt}
                onChange={(e) => setExportedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs font-bold text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Col 4: Creator Name */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-neutral-300">Người Lập Phiếu</label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              disabled={currentUser && currentUser.role !== 'ADMIN'}
              className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs text-[#FAFAF9] font-bold focus:border-amber-500 disabled:opacity-60 focus:outline-none"
            />
          </div>
        </div>

        {/* SECTION 2: DYNAMIC MULTI-ITEMS TABLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider">
              Danh Sách Mặt Hàng Xuất Kho ({exportRows.length} món)
            </h3>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-500" />
              + Thêm Mặt Hàng Cần Xuất
            </button>
          </div>

          <div className="overflow-x-auto border border-neutral-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0B0D11] text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <th className="py-3 px-3 w-8 text-center">#</th>
                  <th className="py-3 px-3 min-w-[240px]">Mặt Hàng Cần Xuất (*)</th>
                  <th className="py-3 px-3 w-20 text-center">Đơn Vị</th>
                  <th className="py-3 px-3 w-32">Số Lượng Xuất (*)</th>
                  <th className="py-3 px-3 w-36 text-right">Giá Vốn (đ)</th>
                  <th className="py-3 px-3 w-36 text-right">Thành Tiền</th>
                  <th className="py-3 px-3 w-12 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-medium">
                {exportRows.map((row, idx) => {
                  const qty = Number(row.quantity) || 0;
                  const isStockExceeded = qty > row.stockQuantity;
                  const subtotal = qty * (Number(row.unitCost) || 0);

                  return (
                    <tr key={idx} className={`bg-[#14171D] hover:bg-[#181C23] ${isStockExceeded ? 'bg-rose-950/20' : ''}`}>
                      <td className="py-2.5 px-3 text-center text-neutral-500 font-mono font-bold">{idx + 1}</td>

                      {/* Product Selector */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0B0D11] border border-neutral-800 rounded-lg font-bold text-[#FAFAF9] text-xs focus:border-amber-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Tồn tại cơ sở xuất: {p.stockQuantity} {p.unit})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-neutral-400">
                            Tồn thực tế tại kho xuất: <strong className="text-amber-400 font-mono">{row.stockQuantity} {row.unit}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Unit Badge */}
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-400">
                        <span className="px-2 py-1 bg-[#0B0D11] border border-neutral-800 rounded-lg text-[11px] font-bold text-neutral-300">
                          {row.unit}
                        </span>
                      </td>

                      {/* Quantity Input with Stock Validation */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          className={`w-full px-2.5 py-1.5 bg-[#0B0D11] border rounded-lg font-bold font-mono text-xs focus:outline-none ${
                            isStockExceeded
                              ? 'border-rose-500 text-rose-400 focus:border-rose-500 bg-rose-950/40'
                              : 'border-neutral-800 text-amber-400 focus:border-amber-500'
                          }`}
                        />
                        {isStockExceeded && (
                          <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" /> Vượt tồn (Tồn: {row.stockQuantity})
                          </span>
                        )}
                      </td>

                      {/* Unit Cost - ReadOnly & RBAC */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={isStaff ? '***' : row.unitCost.toLocaleString('vi-VN')}
                          className="w-28 px-2 py-1.5 bg-[#0B0D11]/60 border border-neutral-800/80 rounded-lg text-right font-mono font-bold text-xs text-neutral-400 cursor-not-allowed select-none"
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-400 whitespace-nowrap">
                        {isStaff ? '***' : `${subtotal.toLocaleString('vi-VN')} đ`}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: SUMMARY & SUBMIT BUTTON */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-800 items-end">
          <div className="md:col-span-2">
            <label className="block font-extrabold text-neutral-300 mb-1.5 text-xs">
              Ghi Chụ Cụ Thể Lý Do Xuất / Điểm Nhận Hàng:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Điều chuyển 50 con gà sang CS4 Thanh Xuân để phục vụ khách tối..."
              className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3 bg-[#0B0D11] p-4 rounded-xl border border-neutral-800 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Tổng số loại mặt hàng:</span>
              <strong className="text-[#FAFAF9] font-mono">{exportRows.length} loại</strong>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-neutral-800 pt-2">
              <span className="font-extrabold text-neutral-200">TỔNG GIÁ TRỊ VỐN:</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">
                {isStaff ? '***' : `${calculatedTotalValue.toLocaleString('vi-VN')} đ`}
              </strong>
            </div>

            <button
              type="submit"
              disabled={submitting || hasValidationError}
              className={`w-full py-3.5 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                reasonCategory === 'TRANSFER'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                  : 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-white'
              }`}
            >
              {reasonCategory === 'TRANSFER' ? <ArrowRightLeft className="w-4 h-4" /> : <PackageMinus className="w-4 h-4" />}
              {submitting
                ? 'ĐANG XỬ LÝ...'
                : reasonCategory === 'TRANSFER'
                ? '📦 XÁC NHẬN ĐIỀU CHUYỂN KHO 2 CHIỀU'
                : '📤 XÁC NHẬN XUẤT KHO / TRỪ KHO'}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 4: EXPORT HISTORY TABLE */}
      <div className="bg-[#14171D] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#FAFAF9] tracking-tight">Lịch Sử Phiếu Xuất Kho & Báo Cáo Hao Hụt</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Tra cứu danh sách các đợt xuất kho, lý do hủy hàng và chuyển kho</p>
          </div>
        </div>

        {/* FILTER TOOLBAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo Mã phiếu, người xuất..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">🏢 Tất cả cơ sở</option>
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
            >
              <option value="all">🏷️ Tất cả lý do</option>
              {REASON_CATEGORIES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xl text-neutral-300 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border border-neutral-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0B0D11] text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <th className="py-3.5 px-4">Mã Phiếu</th>
                <th className="py-3.5 px-4">Lộ Trình / Cơ Sở Xuất</th>
                <th className="py-3.5 px-4">Lý Do Xuất Kho</th>
                <th className="py-3.5 px-4 text-center">Số Loại Món</th>
                <th className="py-3.5 px-4 text-right">Giá Trị Vốn (đ)</th>
                <th className="py-3.5 px-4">Người Xuất</th>
                <th className="py-3.5 px-4">Ngày Xuất</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {loadingHistory ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500 font-bold">
                    Đang tải lịch sử phiếu xuất kho...
                  </td>
                </tr>
              ) : historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500 font-bold">
                    Chưa có dữ liệu phiếu xuất kho nào phù hợp.
                  </td>
                </tr>
              ) : (
                historyRecords.map((rec) => {
                  const reasonObj = getReasonObj(rec.reasonCategory);
                  const isDamage = rec.reasonCategory === 'DAMAGE_EXPIRED';
                  const isTransfer = rec.reasonCategory === 'TRANSFER';

                  return (
                    <tr key={rec.id} className={`hover:bg-[#181C23] ${isDamage ? 'bg-rose-950/10' : 'bg-[#14171D]'}`}>
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-400">{rec.exportCode}</td>
                      <td className="py-3 px-4">
                        {isTransfer && rec.targetBranchId ? (
                          <div className="font-extrabold text-purple-300 flex items-center gap-1.5 font-mono text-[11px]">
                            <span>{getBranchLabel(rec.branchId)}</span>
                            <span className="text-purple-400">➔</span>
                            <span>{getBranchLabel(rec.targetBranchId)}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-200 font-bold">{getBranchLabel(rec.branchId)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] inline-block ${reasonObj.badgeClass}`}>
                          {reasonObj.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-neutral-300">
                        {rec.totalItems} món
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-extrabold ${isDamage ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isStaff ? '***' : `${Number(rec.totalValue).toLocaleString('vi-VN')} đ`}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-bold">{rec.creatorName}</td>
                      <td className="py-3 px-4 text-neutral-400">{new Date(rec.exportedAt).toLocaleString('vi-VN')}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedReceipt(rec)}
                          className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-extrabold text-[11px] rounded-lg mx-auto transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem Chi Tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT DETAIL POPUP MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#14171D] border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-xs text-[#FAFAF9]">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-amber-400 font-mono">{selectedReceipt.exportCode}</span>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-lg ${getReasonObj(selectedReceipt.reasonCategory).badgeClass}`}>
                  {getReasonObj(selectedReceipt.reasonCategory).label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Cơ sở xuất: <strong>{getBranchLabel(selectedReceipt.branchId)}</strong> | Người lập: <strong>{selectedReceipt.creatorName}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-[#0B0D11] p-3.5 rounded-xl border border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 text-[10px] block">THỜI GIAN XUẤT:</span>
                <p className="font-bold">{new Date(selectedReceipt.exportedAt).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">TỔNG GIÁ TRỊ VỐN:</span>
                <p className="font-black text-emerald-400 font-mono text-sm">
                  {isStaff ? '***' : `${Number(selectedReceipt.totalValue).toLocaleString('vi-VN')} đ`}
                </p>
              </div>
              {selectedReceipt.targetBranchId && (
                <div className="col-span-2">
                  <span className="text-purple-400 text-[10px] block font-bold">LỘ TRÌNH ĐIỀU CHUYỂN KHO 2 CHIỀU:</span>
                  <p className="font-extrabold text-purple-300 text-sm">
                    {getBranchLabel(selectedReceipt.branchId)} ➔ {getBranchLabel(selectedReceipt.targetBranchId)}
                  </p>
                </div>
              )}
              {selectedReceipt.notes && (
                <div className="col-span-2">
                  <span className="text-neutral-400 text-[10px] block">GHI CHÚ SỰ CỐ:</span>
                  <p className="text-neutral-300 italic">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-neutral-300 mb-2 uppercase text-[11px]">
                Danh Sách Mặt Hàng Xuất ({selectedReceipt.items?.length || 0} món)
              </h4>
              <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#0B0D11] text-neutral-400 font-bold uppercase text-[10px] border-b border-neutral-800">
                      <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                      <th className="py-2.5 px-3 text-center">Số Lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn Giá Vốn</th>
                      <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {selectedReceipt.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-bold text-neutral-200">{item.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-300">
                          {isStaff ? '***' : `${Number(item.unitCost).toLocaleString('vi-VN')} đ`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                          {isStaff ? '***' : `${Number(item.subtotal).toLocaleString('vi-VN')} đ`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl text-xs cursor-pointer"
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
