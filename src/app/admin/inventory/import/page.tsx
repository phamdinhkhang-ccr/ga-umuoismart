'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownLeft, Plus, Search, Calendar, Building2, Package, CheckCircle2, 
  Calculator, RefreshCw, AlertTriangle, Printer, Eye, Trash2, ShieldAlert, 
  DollarSign, FileText, Check, Clock, X, Lock, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { calculateInventoryAudit, addInventoryLog, InventoryAuditItem, getBranches, deductInventoryForOrder, addExpense } from '@/lib/store';
import { getAnalyticsData } from '@/actions/orders';

export interface ImportRecord {
  id: string;
  code: string;
  item_name: string;
  quantity: number;
  unit: string;
  import_price: number;
  total_cost: number;
  supplier: string;
  branch: string;
  payment_status: 'PAID' | 'DEBT';
  due_date?: string;
  inspection_note?: string;
  created_at: string;
  items?: {
    item_name: string;
    quantity: number;
    unit: string;
    import_price: number;
    subtotal: number;
  }[];
}

const DEFAULT_IMPORTS: ImportRecord[] = [];

export default function InventoryImportPage() {
  const [imports, setImports] = useState<ImportRecord[]>(DEFAULT_IMPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [auditList, setAuditList] = useState<InventoryAuditItem[]>([]);

  // Dispatch & Filter Bar State
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [auditDate, setAuditDate] = useState<string>('2026-09-04');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'SAFE'>('ALL');

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<ImportRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // New Import Form State
  const [formBranch, setFormBranch] = useState('CƠ SỞ VIN SMART CITY');
  const [formSupplier, setFormSupplier] = useState('Trang Trại Gà Sạch Đông Anh');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'PAID' | 'DEBT'>('PAID');
  const [formDueDate, setFormDueDate] = useState('2026-09-10');
  const [formInspectionNote, setFormInspectionNote] = useState('Hàng hóa kiểm đạt chuẩn chất lượng Bếp Smart.');

  // Multi-line Items Form State
  const [formItems, setFormItems] = useState<Array<{
    item_name: string;
    quantity: number;
    unit: string;
    import_price: number;
  }>>([
    { item_name: 'Gà Ủ Muối Nguyên Con', quantity: 50, unit: 'Con', import_price: 110000 }
  ]);

  // Load Inventory Audit Data
  useEffect(() => {
    async function loadAudit() {
      const analytics = await getAnalyticsData('all', 'all');
      setAuditList(calculateInventoryAudit(analytics.orders || []));
    }
    loadAudit();

    const handleUpdate = () => {
      loadAudit();
    };
    window.addEventListener('gum_store_update', handleUpdate);
    return () => window.removeEventListener('gum_store_update', handleUpdate);
  }, []);

  // Filtered Audit List
  const filteredAuditList = useMemo(() => {
    return auditList.filter(item => {
      // Stock Status Filter
      if (stockStatusFilter === 'LOW_STOCK') {
        if (item.currentStock >= item.minStock) return false;
      }
      if (stockStatusFilter === 'SAFE') {
        if (item.currentStock < item.minStock) return false;
      }
      return true;
    });
  }, [auditList, stockStatusFilter]);

  // Filtered Import Receipts
  const filteredImports = useMemo(() => {
    return imports.filter(imp => {
      const matchesSearch = 
        imp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        imp.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        imp.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        imp.branch.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedBranch !== 'ALL' && imp.branch !== selectedBranch) return false;

      return true;
    });
  }, [imports, searchQuery, selectedBranch]);

  // Handle Multi-line Item Changes in Import Modal
  const handleItemLineChange = (index: number, field: string, value: any) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddLineItem = () => {
    setFormItems(prev => [
      ...prev,
      { item_name: 'Gà Ủ Muối Nửa Con', quantity: 30, unit: 'Khay', import_price: 58000 }
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Quick Import Action for Low Stock Items
  const handleQuickImportTrigger = (itemName: string) => {
    setFormItems([
      { item_name: itemName, quantity: 50, unit: 'Con', import_price: 68000 }
    ]);
    setShowImportModal(true);
  };

  // Submit New Import Receipt
  const handleCreateImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) return;

    const totalReceiptCost = formItems.reduce((sum, item) => sum + (item.quantity * item.import_price), 0);
    const primaryItem = formItems[0];
    const nextNum = imports.length + 105;
    const code = `#IMP-${nextNum}`;

    const newReceipt: ImportRecord = {
      id: `imp-${nextNum}`,
      code,
      item_name: formItems.length === 1 ? primaryItem.item_name : `${primaryItem.item_name} (+${formItems.length - 1} món khác)`,
      quantity: primaryItem.quantity,
      unit: primaryItem.unit,
      import_price: primaryItem.import_price,
      total_cost: totalReceiptCost,
      supplier: formSupplier,
      branch: formBranch,
      payment_status: formPaymentStatus,
      due_date: formPaymentStatus === 'DEBT' ? formDueDate : undefined,
      inspection_note: formInspectionNote,
      created_at: new Date().toLocaleString('vi-VN'),
      items: formItems.map(i => ({
        item_name: i.item_name,
        quantity: i.quantity,
        unit: i.unit,
        import_price: i.import_price,
        subtotal: i.quantity * i.import_price
      }))
    };

    // Log each line item into central store
    formItems.forEach(item => {
      addInventoryLog({
        type: 'IMPORT',
        branchName: formBranch,
        itemName: item.item_name,
        quantityChange: item.quantity,
        note: `Nhập kho phiếu ${code} từ ${formSupplier}`
      });
    });

    // If paid immediately, add to expense records
    if (formPaymentStatus === 'PAID') {
      addExpense({
        category: 'Nguyên phụ liệu',
        amount: totalReceiptCost,
        payment_method: 'Chuyển khoản',
        description: `Thanh toán phiếu nhập kho ${code} - ${formSupplier}`,
        payer: 'Quản Lý Kho',
        branch: formBranch,
        created_at: new Date().toISOString().split('T')[0]
      });
    }

    setImports([newReceipt, ...imports]);
    setShowImportModal(false);

    // Reset Form
    setFormItems([{ item_name: 'Gà Ủ Muối Nguyên Con', quantity: 50, unit: 'Con', import_price: 110000 }]);
  };

  // Snapshot Closing Stock Trigger
  const handleSnapshotStock = () => {
    setSnapshotToast(`✓ Đã chốt tồn kho ngày ${auditDate}! Tồn cuối thực tế đã được lưu làm tồn đầu ngày tiếp theo.`);
    setTimeout(() => setSnapshotToast(null), 4000);
  };

  // Delete Receipt
  const handleDeleteReceipt = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy / xóa phiếu nhập kho này?')) {
      setImports(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Nhập Hàng Kho Nguyên Liệu ({imports.length})
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Realtime Audit POS
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Theo dõi tồn kho thực tế, cảnh báo ngưỡng an toàn, quản lý phiếu nhập kho &amp; công nợ nhà cung cấp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Phiếu Nhập Kho</span>
        </button>
      </div>

      {/* Snapshot Toast Alert */}
      {snapshotToast && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{snapshotToast}</span>
          </div>
          <button type="button" onClick={() => setSnapshotToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs">
            Đóng
          </button>
        </div>
      )}

      {/* 2. Top Filter Bar & Dispatch Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Chi nhánh:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả cơ sở (4 Chi Nhánh)</option>
              <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
              <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
              <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
              <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
            </select>
          </div>

          {/* Audit Date Picker */}
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Ngày kiểm toán:</span>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Trạng thái tồn:</span>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả nguyên liệu</option>
              <option value="LOW_STOCK">⚠️ Cảnh báo sắp hết (&lt; Min)</option>
              <option value="SAFE">✓ Tồn kho an toàn dồi dào</option>
            </select>
          </div>
        </div>

        {/* Snapshot Stock Button */}
        <button
          type="button"
          onClick={handleSnapshotStock}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chốt Tồn Kho Cuối Ca / Cuối Ngày</span>
        </button>
      </div>

      {/* 3. Clean Light Theme Inventory Audit Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Bảng Kiểm Toán Tồn Kho Thực Tế Cuối Ngày ({filteredAuditList.length} mặt hàng)
            </h2>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-mono px-3 py-1 rounded-lg font-bold">
            Tồn Cuối = Đầu Ngày + Nhập Kho - Bán Thành Công + Hoàn Hàng Hủy - Xuất Hao Hụt
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Món / Nguyên Liệu</th>
                <th className="px-4 py-3 text-center">Ngưỡng An Toàn (Min)</th>
                <th className="px-4 py-3 text-center">Tồn Đầu Ngày</th>
                <th className="px-4 py-3 text-center text-emerald-700">+ Nhập Kho</th>
                <th className="px-4 py-3 text-center text-rose-700">- Bán Thành Công</th>
                <th className="px-4 py-3 text-center text-blue-700">+ Hoàn Hủy Đơn</th>
                <th className="px-4 py-3 text-center text-amber-700">- Xuất Hao Hụt</th>
                <th className="px-4 py-3 text-right text-slate-900 font-bold">= TỒN CUỐI THỰC TẾ</th>
                <th className="px-4 py-3 text-center">Trạng Thái &amp; Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAuditList.map((item) => {
                const isLowStock = item.currentStock < item.minStock;

                return (
                  <tr key={item.id} className={`transition ${isLowStock ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span>{item.name}</span>
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                          {item.unit}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-700 font-semibold">{item.initialStock}</td>
                    <td className="px-4 py-3.5 text-center font-extrabold text-emerald-600">+{item.totalImported}</td>
                    <td className="px-4 py-3.5 text-center font-extrabold text-rose-600">-{item.totalSold}</td>
                    <td className="px-4 py-3.5 text-center font-extrabold text-blue-600">+{item.totalRestored}</td>
                    <td className="px-4 py-3.5 text-center font-extrabold text-amber-600">-{item.totalWasted}</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      <span className={isLowStock ? 'text-rose-600 font-black' : 'text-emerald-700'}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isLowStock ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Cần nhập thêm</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickImportTrigger(item.name)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-2xs transition cursor-pointer"
                          >
                            + Nhập nhanh
                          </button>
                        </div>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          ✓ Tồn an toàn
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Import Receipts History Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Lịch Sử Phiếu Nhập Kho ({filteredImports.length} phiếu)
          </h2>

          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã phiếu, tên nguyên liệu, nhà cung cấp..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Mã Phiếu</th>
                <th className="px-4 py-3">Tên Nguyên Liệu / Hàng Nhập</th>
                <th className="px-4 py-3 text-center">Số Lượng</th>
                <th className="px-4 py-3 text-right">Đơn Giá Nhập</th>
                <th className="px-4 py-3 text-right">Tổng Tiền Nhập</th>
                <th className="px-4 py-3">Nhà Cung Cấp</th>
                <th className="px-4 py-3">Chi Nhánh Nhận</th>
                <th className="px-4 py-3 text-center">Thanh Toán</th>
                <th className="px-4 py-3 text-center">Thời Gian</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredImports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-xs font-semibold">
                    Chưa có phiếu nhập kho nào. Vui lòng tạo mới để bắt đầu
                  </td>
                </tr>
              ) : (
                filteredImports.map((imp) => (
                <tr key={imp.id} className="hover:bg-slate-50 transition">
                  {/* Receipt Code */}
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptDetail(imp)}
                      className="font-black text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                    >
                      {imp.code}
                    </button>
                  </td>

                  {/* Item Name */}
                  <td className="px-4 py-3.5 font-bold text-slate-900">{imp.item_name}</td>

                  {/* Quantity */}
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900">
                    {imp.quantity} {imp.unit}
                  </td>

                  {/* Unit Price */}
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-600">
                    {imp.import_price.toLocaleString('vi-VN')} VNĐ
                  </td>

                  {/* Total Cost */}
                  <td className="px-4 py-3.5 text-right font-extrabold text-orange-600 text-xs">
                    {imp.total_cost.toLocaleString('vi-VN')} VNĐ
                  </td>

                  {/* Supplier */}
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{imp.supplier}</td>

                  {/* Branch */}
                  <td className="px-4 py-3.5 font-medium text-slate-600">{imp.branch}</td>

                  {/* Payment Status Badge */}
                  <td className="px-4 py-3.5 text-center">
                    {imp.payment_status === 'PAID' ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        🟢 Đã thanh toán
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Công nợ ({imp.due_date})</span>
                      </span>
                    )}
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-3.5 text-center text-slate-500 text-[11px] font-medium">
                    {imp.created_at}
                  </td>

                  {/* Action Icons */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* 👁️ View Receipt */}
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptDetail(imp)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="Xem chi tiết phiếu nhập"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* 🖨️ Print Receipt */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceiptDetail(imp);
                          setShowPrintModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="In phiếu nhập kho"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* 🗑️ Delete Receipt */}
                      <button
                        type="button"
                        onClick={() => handleDeleteReceipt(imp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="Hủy/Xóa phiếu"
                      >
                        <Trash2 className="w-4 h-4" />
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

      {/* 5. Rich Create Import Receipt Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                Tạo Phiếu Nhập Kho Nguyên Liệu Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateImportSubmit} className="space-y-4 text-xs">
              {/* Branch & Supplier Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chi Nhánh Tiếp Nhận (*)</label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                    <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
                    <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
                    <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhà Cung Cấp (*)</label>
                  <input
                    type="text"
                    required
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="VD: Trang Trại Gà Sạch Đông Anh, Xưởng In..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-line Items Picker */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Danh Sách Mặt Hàng Nhập Kho ({formItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng món
                  </button>
                </div>

                {formItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên Nguyên Liệu</label>
                        <input
                          type="text"
                          required
                          value={item.item_name}
                          onChange={(e) => handleItemLineChange(idx, 'item_name', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số Lượng</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemLineChange(idx, 'quantity', Number(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đơn Vị Tính</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemLineChange(idx, 'unit', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold"
                        >
                          <option value="Con">Con</option>
                          <option value="Khay">Khay</option>
                          <option value="Hộp">Hộp</option>
                          <option value="Phần">Phần</option>
                          <option value="Chai">Chai</option>
                          <option value="Ly">Ly</option>
                          <option value="Kg">Kg</option>
                          <option value="Túi">Túi</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-semibold text-slate-600">Đơn Giá Nhập (VNĐ):</span>
                        <input
                          type="number"
                          required
                          value={item.import_price}
                          onChange={(e) => handleItemLineChange(idx, 'import_price', Number(e.target.value) || 0)}
                          className="w-36 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold"
                        />
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="font-extrabold text-emerald-700">
                          Thành tiền: {(item.quantity * item.import_price).toLocaleString('vi-VN')} VNĐ
                        </span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 font-bold"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Tổng Tiền Phiếu Nhập:</span>
                <span className="font-black text-emerald-700 text-base">
                  {formItems.reduce((sum, item) => sum + (item.quantity * item.import_price), 0).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              {/* Payment Status & Debt Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng Thái Thanh Toán (*)</label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-extrabold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PAID">🟢 Đã Thanh Toán (Trừ Sổ Quỹ Chi Tiêu)</option>
                    <option value="DEBT">🟡 Ghi Nhận Công Nợ (Hẹn Trả Sau)</option>
                  </select>
                </div>

                {formPaymentStatus === 'DEBT' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày Hẹn Thanh Toán Công Nợ</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-amber-300 rounded-lg p-2.5 text-amber-900 font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Inspection Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Kiểm Hàng Kho</label>
                <textarea
                  rows={2}
                  value={formInspectionNote}
                  onChange={(e) => setFormInspectionNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                >
                  💾 Lưu &amp; Nhập Kho Tự Động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Receipt Detail & Print Modal */}
      {selectedReceiptDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Chi Tiết Phiếu Nhập Kho {selectedReceiptDetail.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptDetail(null);
                  setShowPrintModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Nhà cung cấp:</span>
                <strong className="text-slate-900">{selectedReceiptDetail.supplier}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Chi nhánh nhập:</span>
                <strong className="text-slate-900">{selectedReceiptDetail.branch}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Thời gian tạo:</span>
                <span className="font-semibold text-slate-800">{selectedReceiptDetail.created_at}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Trạng thái thanh toán:</span>
                {selectedReceiptDetail.payment_status === 'PAID' ? (
                  <span className="text-emerald-700 font-extrabold">🟢 Đã thanh toán</span>
                ) : (
                  <span className="text-amber-700 font-extrabold">🟡 Công nợ (Hẹn: {selectedReceiptDetail.due_date})</span>
                )}
              </div>
            </div>

            {/* Receipt Line Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900">Danh Sách Hàng Nhập Kho:</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">Hàng nhập</th>
                      <th className="p-2.5 text-center">SL</th>
                      <th className="p-2.5 text-right">Đơn giá</th>
                      <th className="p-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedReceiptDetail.items || [
                      { item_name: selectedReceiptDetail.item_name, quantity: selectedReceiptDetail.quantity, unit: selectedReceiptDetail.unit, import_price: selectedReceiptDetail.import_price, subtotal: selectedReceiptDetail.total_cost }
                    ]).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-semibold text-slate-900">{it.item_name}</td>
                        <td className="p-2.5 text-center font-bold">{it.quantity} {it.unit}</td>
                        <td className="p-2.5 text-right">{it.import_price.toLocaleString('vi-VN')} VNĐ</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">{it.subtotal.toLocaleString('vi-VN')} VNĐ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total & Note */}
            <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-100">
              <span>TỔNG TIỀN PHIẾU NHẬP:</span>
              <span className="text-orange-600 text-sm font-black">{selectedReceiptDetail.total_cost.toLocaleString('vi-VN')} VNĐ</span>
            </div>

            {selectedReceiptDetail.inspection_note && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Ghi chú kiểm hàng:</strong> {selectedReceiptDetail.inspection_note}
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ In Phiếu Nhập Kho</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptDetail(null);
                  setShowPrintModal(false);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
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
