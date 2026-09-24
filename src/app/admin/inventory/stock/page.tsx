'use client';

import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Search,
  Filter,
  PhoneCall,
  Zap,
  ClipboardCheck,
  Edit,
  Trash2,
  X,
  TrendingDown,
  Building2,
  PackageCheck,
  Layers,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  unit: string;
  category?: string;
  branchId?: string;
  currentQuantity: number;
  minQuantity: number;
  costPerUnit: number;
  supplier: string;
  hotline?: string;
  updatedAt?: string;
}

import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = [
  'Tất cả danh mục',
  'Thịt gà & Phụ phẩm tươi',
  'Gia vị thảo mộc & Sốt',
  'Bao bì / Túi hút chân không / Đũa thìa',
];

export default function StockCheckPage() {
  const { branches } = useBranches();
  const { user: authUser } = useAuth();
  const router = useRouter();

  const BRANCHES = [
    { id: 'all', name: 'Tất cả cơ sở (Toàn hệ thống)' },
    { id: 'bep-tong', name: 'Bếp Tổng / Kho Trung Tâm' },
    ...branches.map((b) => ({ id: b.id, name: `${b.code ? b.code + ': ' : ''}${b.name}` })),
  ];

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = authUser?.role || 'ADMIN';
  const isStaff = userRole === 'STAFF' || userRole === 'CASHIER' || userRole === 'USER';

  const [summary, setSummary] = useState<any>({
    totalInventoryValue: 0,
    totalItemsCount: 0,
    lowStockCount: 0,
    safeCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(authUser?.branchId || 'all');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả danh mục');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'alert' | 'safe'>('all');

  // Auto lock branch for staff
  useEffect(() => {
    if (isStaff && authUser?.branchId) {
      setSelectedBranch(authUser.branchId);
    }
  }, [isStaff, authUser]);

  // Modal State for Add Item
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addUnit, setAddUnit] = useState('Kg');
  const [addCategory, setAddCategory] = useState('Thịt gà & Phụ phẩm tươi');
  const [addBranchId, setAddBranchId] = useState('bep-tong');
  const [addCurrentQty, setAddCurrentQty] = useState<number | ''>(10);
  const [addMinQty, setAddMinQty] = useState<number | ''>(5);
  const [addCost, setAddCost] = useState<number | ''>(50000);
  const [addSupplier, setAddSupplier] = useState('');
  const [addHotline, setAddHotline] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal State for Stocktake / Audit Edit
  const [selectedItemForAudit, setSelectedItemForAudit] = useState<InventoryItem | null>(null);
  const [auditActualQty, setAuditActualQty] = useState<number | ''>(0);
  const [auditMinQty, setAuditMinQty] = useState<number | ''>(0);
  const [auditCost, setAuditCost] = useState<number | ''>(0);
  const [auditSupplier, setAuditSupplier] = useState('');
  const [auditHotline, setAuditHotline] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // Fetch Inventory Data
  const fetchStockData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedCategory !== 'Tất cả danh mục') params.append('category', selectedCategory);
      if (selectedStatusTab !== 'all') params.append('status', selectedStatusTab);
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [searchQuery, selectedBranch, selectedCategory, selectedStatusTab]);

  // Open Stocktake Audit Modal
  const openAuditModal = (item: InventoryItem) => {
    setSelectedItemForAudit(item);
    setAuditActualQty(item.currentQuantity);
    setAuditMinQty(item.minQuantity);
    setAuditCost(item.costPerUnit);
    setAuditSupplier(item.supplier);
    setAuditHotline(item.hotline || '0988.888.999');
    setAuditNote('');
  };

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Submit Add New Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addUnit) {
      showToast('Vui lòng nhập tên vật tư và đơn vị tính!', 'error');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_ITEM',
          code: addCode || undefined,
          name: addName,
          unit: addUnit,
          category: addCategory,
          branchId: addBranchId,
          currentQuantity: Number(addCurrentQty) || 0,
          minQuantity: Number(addMinQty) || 5,
          costPerUnit: Number(addCost) || 0,
          supplier: addSupplier || 'Nhà cung cấp',
          hotline: addHotline || '0988.888.999',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('🎉 Thêm vật tư mới thành công!', 'success');
        setIsAddModalOpen(false);
        // Reset form
        setAddName('');
        setAddCode('');
        setAddSupplier('');
        setAddHotline('');
        fetchStockData();
      } else {
        showToast(`❌ Lỗi: ${data.error || 'Thêm vật tư thất bại'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi kết nối máy chủ!', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Submit Audit Stocktake Adjustment
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAudit) return;

    setSubmittingAudit(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STOCKTAKE',
          itemId: selectedItemForAudit.id,
          name: selectedItemForAudit.name,
          branchId: selectedBranch,
          currentQuantity: Number(auditActualQty) || 0,
          minQuantity: Number(auditMinQty) || 0,
          costPerUnit: Number(auditCost) || 0,
          supplier: auditSupplier,
          hotline: auditHotline,
          note: auditNote || `Cân kho thực tế: ${auditActualQty} ${selectedItemForAudit.unit}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('🎉 Điều chỉnh cân kho thực tế thành công!', 'success');
        setSelectedItemForAudit(null);
        fetchStockData();
      } else {
        showToast(`❌ Lỗi: ${data.error || 'Cân kho thất bại'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi kết nối máy chủ!', 'error');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Delete Item with Optimistic UI Mutation and Toast Notification
  const handleDeleteItem = async (item: InventoryItem) => {
    const isBranchSpecific = selectedBranch !== 'all';
    const confirmMsg = isBranchSpecific
      ? `Bạn có chắc chắn muốn xóa/đặt tồn kho mặt hàng "${item.name}" tại cơ sở này về 0?`
      : `Bạn có chắc chắn muốn xóa hoàn toàn vật tư "${item.name}" khỏi danh sách kho toàn hệ thống?`;

    if (!confirm(confirmMsg)) return;

    // 1. Optimistic UI mutation: filter out immediately
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_ITEM',
          itemId: item.id,
          name: item.name,
          branchId: selectedBranch,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã xóa vật tư khỏi kho thành công!', 'success');
        fetchStockData();
      } else {
        showToast(data.error || 'Không thể xóa vật tư', 'error');
        fetchStockData();
      }
    } catch (err) {
      showToast('❌ Lỗi kết nối máy chủ khi xóa vật tư', 'error');
      fetchStockData();
    }
  };

  // Quick Order Import Redirect
  const handleQuickImport = (item: InventoryItem) => {
    const neededQty = Math.max(1, item.minQuantity - item.currentQuantity);
    const queryParams = new URLSearchParams({
      supplier: item.supplier,
      productName: item.name,
      suggestedQty: neededQty.toString(),
    });
    if (selectedBranch && selectedBranch !== 'all') {
      queryParams.append('branchId', selectedBranch);
    }
    router.push(`/admin/inventory/inbound?${queryParams.toString()}`);
  };

  // Filter out any combo items from display
  const displayItems = items.filter(
    (item) => !item.name.toLowerCase().includes('combo') && !item.category?.toLowerCase().includes('combo')
  );

  // Export Excel File
  const handleExportExcel = () => {
    if (displayItems.length === 0) {
      showToast('Không có dữ liệu tồn kho để xuất Excel!', 'error');
      return;
    }

    const exportData = displayItems.map((item) => {
      const isAlert = item.currentQuantity < item.minQuantity;
      const totalVal = item.currentQuantity * item.costPerUnit;

      return {
        'Mã Vật Tư': item.code || '#VT-00',
        'Tên Vật Tư / Nguyên Liệu': item.name,
        'Danh Mục': item.category || 'Tươi sống',
        'Cơ Sở': BRANCHES.find((b) => b.id === item.branchId)?.name || 'Bếp Tổng',
        'Đơn Vị': item.unit,
        'Tồn Hiện Tại': item.currentQuantity,
        'Định Mức Tối Thiểu': item.minQuantity,
        'Trạng Thái Kho': isAlert ? '⚠️ CHẠM BÁO ĐỘNG SẮP HẾT' : '🟢 AN TOÀN',
        'Đơn Giá Nhập (đ)': item.costPerUnit,
        'Giá Trị Tồn Kho (đ)': totalVal,
        'Nhà Cung Cấp': item.supplier,
        'Hotline Đặt Hàng': item.hotline || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kiem_Tra_Ton_Kho');
    XLSX.writeFile(workbook, `Bang_Can_Kho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xs shadow-2xl flex items-center gap-3 border transition-all animate-bounce ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
            : 'bg-rose-950 text-rose-300 border-rose-500/50'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-bold text-xs">{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#14171D] p-6 rounded-xs border border-neutral-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xs text-amber-400">
            <Boxes className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAF9] tracking-tight">Kiểm Tra Tồn Kho & Cảnh Báo Nguyên Liệu</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xs">
                F&B Par Level Audit
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-light">
              Theo dõi tồn kho thực tế, định mức an toàn tối thiểu và gợi ý đặt hàng nhà cung cấp chuẩn chuỗi F&B
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 rounded-xs text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất File Cân Kho Excel
          </button>

          {!isStaff && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xs shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              Thêm Vật Tư Mới
            </button>
          )}
        </div>
      </div>

      {/* TOP METRICS KPI CARDS */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isStaff ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
        {/* Card 1: Total Inventory Value */}
        {!isStaff && (
          <div className="bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">TỔNG GIÁ TRỊ TỒN KHO</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xs">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono mt-2">
              {Number(summary.totalInventoryValue || 0).toLocaleString('vi-VN')} <span className="text-xs font-normal text-neutral-400">đ</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Tổng Tồn kho x Giá vốn nhập gần nhất</p>
          </div>
        )}

        {/* Card 2: Total Items */}
        <div className="bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">TỔNG MẶT HÀNG VẬT TƯ</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#FAFAF9] font-mono mt-2">
            {summary.totalItemsCount || 0} <span className="text-xs font-normal text-neutral-400">mặt hàng</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Đang theo dõi định mức an toàn</p>
        </div>

        {/* Card 3: Alert Low Stock Count */}
        <div className={`p-5 rounded-xs border shadow-xs ${
          summary.lowStockCount > 0
            ? 'bg-rose-950/20 border-rose-500/40 animate-pulse'
            : 'bg-[#14171D] border-neutral-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">MẶT HÀNG BÁO ĐỘNG (SẮP HẾT)</span>
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono mt-2">
            {summary.lowStockCount || 0} <span className="text-xs font-normal text-rose-300">vật tư</span>
          </p>
          <p className="text-[11px] text-rose-400/80 mt-1 font-semibold">Tồn hiện tại &lt;= Định mức tối thiểu</p>
        </div>

        {/* Card 4: Safe Count */}
        <div className="bg-[#14171D] p-5 rounded-xs border border-emerald-500/30 bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">KHO ĐẠT CHUẨN AN TOÀN</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-2">
            {summary.safeCount || 0} <span className="text-xs font-normal text-emerald-300">mặt hàng</span>
          </p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Đủ cơ số chế biến ca trực</p>
        </div>
      </div>

      {/* FILTER TOOLBAR & TABS */}
      <div className="bg-[#14171D] border border-neutral-800/80 rounded-xs p-5 shadow-xl space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4 text-xs">
          <button
            onClick={() => setSelectedStatusTab('all')}
            className={`px-4 py-2 rounded-xs font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'all'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : 'bg-[#0B0D11] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Tất Cả Vật Tư ({summary.totalItemsCount || 0})
          </button>

          <button
            onClick={() => setSelectedStatusTab('alert')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xs font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'alert'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'bg-[#0B0D11] text-rose-400 hover:bg-rose-500/10 border border-rose-500/30'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            🔴 Báo Động Sắp Hết ({summary.lowStockCount || 0})
          </button>

          <button
            onClick={() => setSelectedStatusTab('safe')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xs font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'safe'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-[#0B0D11] text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            🟢 Tồn Kho An Toàn ({summary.safeCount || 0})
          </button>
        </div>

        {/* Search & Dropdown Filters */}
        <div className="space-y-3">
          {/* Active Branch Context Banner */}
          {selectedBranch !== 'all' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-300 font-semibold">
                Đang xem tồn kho tại: <strong className="text-amber-400">{BRANCHES.find(b => b.id === selectedBranch)?.name || selectedBranch}</strong>
              </span>
              {!isStaff && (
                <button
                  onClick={() => setSelectedBranch('all')}
                  className="ml-auto text-amber-400/70 hover:text-amber-300 text-[10px] underline cursor-pointer"
                >
                  Xem toàn hệ thống
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên nguyên liệu, mã vật tư, nhà cung cấp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xs text-[#FAFAF9] focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Lọc theo Cơ Sở / Chi Nhánh:
              </label>
              <select
                value={selectedBranch}
                disabled={isStaff && Boolean(authUser?.branchId)}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={`w-full px-3 py-2.5 bg-[#0B0D11] rounded-xs focus:outline-none font-semibold ${
                  selectedBranch !== 'all'
                    ? 'border border-amber-500/60 text-amber-400 focus:border-amber-500'
                    : 'border border-neutral-800 text-neutral-300 focus:border-amber-500'
                } ${isStaff && Boolean(authUser?.branchId) ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {!isStaff && <option value="all">Tất cả cơ sở (Toàn hệ thống)</option>}
                {BRANCHES.filter((b) => !isStaff || b.id === authUser?.branchId).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0B0D11] border border-neutral-800 rounded-xs text-amber-400 font-semibold focus:border-amber-500"
              >
                {CATEGORIES.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="overflow-x-auto border border-neutral-800 rounded-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0B0D11] text-neutral-400 font-semibold border-b border-neutral-800">
                <th className="py-3 px-4 min-w-[200px]">TÊN VẬT TƯ / NGUYÊN LIỆU</th>
                <th className="py-3 px-4 text-center">ĐƠN VỊ</th>
                <th className="py-3 px-4 text-center">TỒN HIỆN TẠI</th>
                <th className="py-3 px-4 text-center">ĐỊNH MỨC AN TOÀN</th>
                {!isStaff && <th className="py-3 px-4 text-right">GIÁ TRỊ TỒN KHO</th>}
                {!isStaff && <th className="py-3 px-4 text-right">ĐƠN GIÁ NHẬP</th>}
                <th className="py-3 px-4">NHÀ CUNG CẤP & HOTLINE</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI TỒN KHO</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-500">
                    Đang kiểm tra tồn kho & đối chiếu định mức...
                  </td>
                </tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-neutral-600 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-neutral-300">
                        Chưa có dữ liệu tồn kho.
                      </p>
                      <p className="text-xs text-neutral-500">
                        Vui lòng tạo phiếu nhập kho để bắt đầu theo dõi.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayItems.map((item, idx) => {
                  const isAlert = item.currentQuantity < item.minQuantity;
                  const totalVal = item.currentQuantity * item.costPerUnit;
                  const itemCode = (item.code && item.code !== 'VT-01' && item.code !== '#VT-01')
                    ? item.code
                    : `#VT-${String(idx + 1).padStart(2, '0')}`;

                  return (
                    <tr key={item.id} className={`hover:bg-[#181C23] ${isAlert ? 'bg-rose-950/15' : 'bg-[#14171D]'}`}>
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#0B0D11] border border-amber-500/30 text-amber-400 font-bold rounded-xs">
                            {itemCode}
                          </span>
                          <span className="font-bold text-[#FAFAF9]">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{item.category || 'Tươi sống'}</p>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-1 bg-[#0B0D11] border border-neutral-800 text-neutral-300 rounded-xs text-[11px]">
                          {item.unit}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`text-base font-black ${isAlert ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                          {item.currentQuantity}
                        </span>
                      </td>

                      {/* Min Quantity */}
                      <td className="py-3 px-4 text-center font-mono text-neutral-400">
                        {item.minQuantity}
                      </td>

                      {/* Total Inventory Value */}
                      {!isStaff && (
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          {totalVal.toLocaleString('vi-VN')} đ
                        </td>
                      )}

                      {/* Cost per Unit */}
                      {!isStaff && (
                        <td className="py-3 px-4 text-right font-mono text-neutral-400">
                          {item.costPerUnit.toLocaleString('vi-VN')} đ
                        </td>
                      )}

                      {/* Supplier & Hotline */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-200">{item.supplier}</div>
                        {item.hotline && (
                          <a
                            href={`tel:${item.hotline}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline mt-0.5"
                          >
                            <PhoneCall className="w-3 h-3 text-amber-400" />
                            {item.hotline}
                          </a>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isAlert ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[11px] font-bold rounded-xs flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Cảnh Báo Sắp Hết
                            </span>
                            <span className="text-[10px] text-rose-400/90 font-mono mt-0.5">
                              Thiếu: {item.minQuantity - item.currentQuantity} {item.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold rounded-xs inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Tồn Kho An Toàn
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {isStaff ? (
                          <span className="px-2.5 py-1 bg-neutral-800 text-neutral-400 text-[11px] font-semibold rounded-xs border border-neutral-700">
                            👁️ Chỉ xem
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleQuickImport(item)}
                              title="Tạo phiếu nhập hàng nhanh"
                              className={`px-2.5 py-1 rounded-xs font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs ${
                                isAlert
                                  ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                                  : 'bg-neutral-700 text-neutral-200 hover:bg-amber-500 hover:text-neutral-950'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" /> Nhập Nhanh
                            </button>

                            <button
                              onClick={() => openAuditModal(item)}
                              title="Cân kho thực tế & chỉnh định mức"
                              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xs transition-colors cursor-pointer"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item)}
                              title="Xóa vật tư"
                              className="p-1.5 bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 rounded-xs transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW ITEM MODAL */}
      {!isStaff && isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-xs text-[#FAFAF9]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-[#FAFAF9] flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Thêm Vật Tư / Nguyên Liệu Mới Vào CSDL
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Khai báo nguyên vật liệu, giá vốn nhập và định mức an toàn tối thiểu</p>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Mã Vật Tư (Auto)</label>
                  <input
                    type="text"
                    placeholder="VD: #VT-0103"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-amber-400 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Đơn Vị Tính (*)</label>
                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                  >
                    <option value="Con">Con</option>
                    <option value="Kg">Kg</option>
                    <option value="Hũ">Hũ</option>
                    <option value="Hộp">Hộp</option>
                    <option value="Cuộn">Cuộn</option>
                    <option value="Thùng">Thùng</option>
                    <option value="Chai">Chai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Tên Vật Tư / Nguyên Liệu (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thịt Đùi Gà Rút Xương Hút Chân Không"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] font-bold focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Phân Loại / Danh Mục</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                  >
                    <option value="Thịt gà & Phụ phẩm tươi">Thịt gà & Phụ phẩm tươi</option>
                    <option value="Gia vị thảo mộc & Sốt">Gia vị thảo mộc & Sốt</option>
                    <option value="Bao bì / Túi hút chân không / Đũa thìa">Bao bì / Túi hút chân không / Đũa thìa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Cơ Sở Lưu Trữ</label>
                  <select
                    value={addBranchId}
                    onChange={(e) => setAddBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                  >
                    {BRANCHES.filter((b) => b.id !== 'all').map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Tồn Khởi Tạo</label>
                  <input
                    type="number"
                    value={addCurrentQty}
                    onChange={(e) => setAddCurrentQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono font-bold text-amber-400 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Định Mức An Toàn</label>
                  <input
                    type="number"
                    value={addMinQty}
                    onChange={(e) => setAddMinQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-rose-400 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Đơn Giá Nhập (đ)</label>
                  <input
                    type="number"
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-neutral-200 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Tên Nhà Cung Cấp</label>
                  <input
                    type="text"
                    placeholder="VD: Trang Trại Ba Vì"
                    value={addSupplier}
                    onChange={(e) => setAddSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Hotline Đặt Hàng</label>
                  <input
                    type="text"
                    placeholder="VD: 0988.112.233"
                    value={addHotline}
                    onChange={(e) => setAddHotline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xs shadow-md transition-colors cursor-pointer"
                >
                  {submittingAdd ? 'ĐANG LƯU...' : 'XÁC NHẬN THÊM VẬT TƯ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCKTAKE AUDIT MODAL (CÂN KHO THỰC TẾ) */}
      {!isStaff && selectedItemForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs text-[#FAFAF9]">
            <button
              onClick={() => setSelectedItemForAudit(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-[#FAFAF9]">Cân Kho Thực Tế & Chỉnh Định Mức</h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Vật tư: <strong className="text-amber-400">{selectedItemForAudit.name}</strong> ({selectedItemForAudit.code})
              </p>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-4">
              <div className="bg-[#0B0D11] p-3 rounded-xs border border-neutral-800 flex justify-between items-center text-xs">
                <span>Tồn kho hiện tại trong máy:</span>
                <strong className="text-amber-400 font-mono text-sm">{selectedItemForAudit.currentQuantity} {selectedItemForAudit.unit}</strong>
              </div>

              <div>
                <label className="block font-semibold text-amber-400 mb-1">
                  Số Lượng Cân Kho Thực Tế Tồn Khay/Kho (*)
                </label>
                <input
                  type="number"
                  required
                  value={auditActualQty}
                  onChange={(e) => setAuditActualQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#0B0D11] border border-amber-500 rounded-xs font-mono font-bold text-sm text-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Định Mức An Toàn</label>
                  <input
                    type="number"
                    value={auditMinQty}
                    onChange={(e) => setAuditMinQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-rose-400 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Đơn Giá Nhập (đ)</label>
                  <input
                    type="number"
                    value={auditCost}
                    onChange={(e) => setAuditCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-neutral-300 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Nhà Cung Cấp & Hotline</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={auditSupplier}
                    onChange={(e) => setAuditSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9]"
                  />
                  <input
                    type="text"
                    value={auditHotline}
                    onChange={(e) => setAuditHotline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-[#FAFAF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Ghi Chú Lý Do Điều Chỉnh Cân Kho</label>
                <textarea
                  rows={2}
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="VD: Cân kho cuối ca trực, phát hiện vỡ 1 hũ sốt..."
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForAudit(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingAudit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xs shadow-md transition-colors cursor-pointer"
                >
                  {submittingAudit ? 'ĐANG LƯU...' : 'XÁC NHẬN CÂN KHO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
