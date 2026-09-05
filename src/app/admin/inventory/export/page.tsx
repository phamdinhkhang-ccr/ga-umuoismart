'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, Plus, Search, Package, AlertTriangle, ArrowRightLeft, 
  Calendar, Building2, CheckCircle2, Clock, Printer, Eye, Trash2, X, 
  Truck, ArrowRight, ShieldAlert, Sparkles, FileText, Camera, RefreshCw
} from 'lucide-react';
import { getBranches, getProducts, transferInventoryBetweenBranches, addInventoryLog, addExpense } from '@/lib/store';

export interface ExportRecord {
  id: string;
  code: string;
  item_name: string;
  quantity: number;
  unit: string;
  cost_price: number;
  export_type: 'TRANSFER' | 'DAMAGE';
  reason: string;
  from_branch: string;
  to_branch: string;
  status: 'COMPLETED' | 'IN_TRANSIT' | 'CANCELLED';
  loss_value: number;
  handler: string;
  created_at: string;
  photo_url?: string;
}

const DEFAULT_EXPORTS: ExportRecord[] = [];

export default function InventoryExportPage() {
  const [exports, setExports] = useState<ExportRecord[]>(DEFAULT_EXPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TRANSFER' | 'DAMAGE' | 'IN_TRANSIT'>('ALL');

  // Detailed Filter Bar State
  const [fromBranchFilter, setFromBranchFilter] = useState('ALL');
  const [toBranchFilter, setToBranchFilter] = useState('ALL');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<ExportRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Export Form State
  const [formExportType, setFormExportType] = useState<'TRANSFER' | 'DAMAGE'>('TRANSFER');
  const [formItemName, setFormItemName] = useState('Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)');
  const [formQuantity, setFormQuantity] = useState('10');
  const [formUnit, setFormUnit] = useState('Con');
  const [formCostPrice, setFormCostPrice] = useState('110000');
  const [formFromBranch, setFormFromBranch] = useState('CƠ SỞ VIN SMART CITY');
  const [formToBranch, setFormToBranch] = useState('Chi Nhánh Cầu Giấy');
  const [formReason, setFormReason] = useState('Điều Chuyển Chi Nhánh Nội Bộ');
  const [formHandler, setFormHandler] = useState('Quản Lý Kho');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  // Tab Counters
  const tabCounts = useMemo(() => {
    return {
      all: exports.length,
      transfer: exports.filter(e => e.export_type === 'TRANSFER').length,
      damage: exports.filter(e => e.export_type === 'DAMAGE').length,
      inTransit: exports.filter(e => e.status === 'IN_TRANSIT').length
    };
  }, [exports]);

  // Filtered Receipts
  const filteredExports = useMemo(() => {
    return exports.filter(e => {
      // Search
      const matchesSearch = 
        e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.handler.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'TRANSFER' && e.export_type !== 'TRANSFER') return false;
      if (activeTab === 'DAMAGE' && e.export_type !== 'DAMAGE') return false;
      if (activeTab === 'IN_TRANSIT' && e.status !== 'IN_TRANSIT') return false;

      // Branch filter
      if (fromBranchFilter !== 'ALL' && e.from_branch !== fromBranchFilter) return false;
      if (toBranchFilter !== 'ALL' && e.to_branch !== toBranchFilter) return false;

      return true;
    });
  }, [exports, searchQuery, activeTab, fromBranchFilter, toBranchFilter]);

  // Submit Create Export Receipt
  const handleCreateExportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName || !formQuantity) return;

    const qtyNum = Number(formQuantity) || 0;
    const costNum = Number(formCostPrice) || 0;
    const isDamage = formExportType === 'DAMAGE';
    const nextNum = exports.length + 202;
    const code = `#EXP-${nextNum}`;
    const lossValue = isDamage ? qtyNum * costNum : 0;

    const newReceipt: ExportRecord = {
      id: `exp-${nextNum}`,
      code,
      item_name: formItemName,
      quantity: qtyNum,
      unit: formUnit,
      cost_price: costNum,
      export_type: formExportType,
      reason: formReason,
      from_branch: formFromBranch,
      to_branch: isDamage ? '--- (Hủy Hàng)' : formToBranch,
      status: isDamage ? 'COMPLETED' : 'IN_TRANSIT',
      loss_value: lossValue,
      handler: formHandler,
      created_at: new Date().toLocaleString('vi-VN'),
      photo_url: formPhotoUrl || undefined
    };

    // Log deduct/transfer into central store
    if (isDamage) {
      addInventoryLog({
        type: 'WASTE',
        branchName: formFromBranch,
        itemName: formItemName,
        quantityChange: -qtyNum,
        note: `Xuất hủy hỏng phiếu ${code}: ${formReason}`
      });

      // Record financial loss in expenses
      addExpense({
        category: 'Xuất Hủy & Hao Hụt',
        amount: lossValue,
        payment_method: 'Tiền mặt',
        description: `Hao hụt hàng hỏng ${code} (${qtyNum} ${formUnit} ${formItemName})`,
        payer: formHandler,
        branch: formFromBranch,
        created_at: new Date().toISOString().split('T')[0]
      });

      setToastMsg(`✓ Đã xuất hủy ${qtyNum} ${formUnit} ${formItemName}! Đã tự động trừ kho và ghi nhận hao hụt ${lossValue.toLocaleString('vi-VN')} VNĐ.`);
    } else {
      // Transfer log
      transferInventoryBetweenBranches(
        formFromBranch,
        formToBranch,
        formItemName,
        qtyNum,
        `Phiếu điều chuyển ${code}`
      );
      setToastMsg(`✓ Đã tạo phiếu điều chuyển ${code}! Hàng đang trên đường giao tới ${formToBranch}.`);
    }

    setExports([newReceipt, ...exports]);
    setShowCreateModal(false);

    setTimeout(() => setToastMsg(null), 4500);
  };

  // Confirm Receipt Received Action (for In-Transit items)
  const handleConfirmReceived = (receipt: ExportRecord) => {
    setExports(prev => prev.map(e => e.id === receipt.id ? { ...e, status: 'COMPLETED' } : e));
    setToastMsg(`✓ Chi nhánh ${receipt.to_branch} đã xác nhận nhận đủ ${receipt.quantity} ${receipt.unit} ${receipt.item_name}. Phiếu ${receipt.code} đã hoàn thành!`);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Delete Receipt
  const handleDeleteReceipt = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy phiếu xuất kho này?')) {
      setExports(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Xuất Hàng Kho &amp; Điều Chuyển ({exports.length})
              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Chống Thất Thoát POS
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Tạo phiếu điều chuyển nội bộ giữa các cơ sở, theo dõi hàng đang trên đường giao &amp; kiểm soát giá trị hao hụt xuất hủy.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Phiếu Xuất Kho</span>
        </button>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-xl shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs">
            Đóng
          </button>
        </div>
      )}

      {/* 2. Top Filter Tabs & Detailed Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        {/* Quick Tabs for Export Types */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tất cả phiếu</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSFER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'TRANSFER'
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Điều chuyển nội bộ</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900">
              {tabCounts.transfer}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DAMAGE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'DAMAGE'
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Xuất hủy hỏng / Hết hạn</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900">
              {tabCounts.damage}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IN_TRANSIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'IN_TRANSIT'
                ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-orange-600" />
            <span>Đang vận chuyển (Chờ nhận)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-200 text-orange-900 font-extrabold animate-pulse">
              {tabCounts.inTransit}
            </span>
          </button>
        </div>

        {/* Detailed Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Từ Chi Nhánh:</label>
            <select
              value={fromBranchFilter}
              onChange={(e) => setFromBranchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả chi nhánh xuất</option>
              <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
              <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
              <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
              <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Đến Chi Nhánh:</label>
            <select
              value={toBranchFilter}
              onChange={(e) => setToBranchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả chi nhánh nhận</option>
              <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
              <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
              <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
              <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
              <option value="--- (Hủy Hàng)">--- (Hủy Hàng)</option>
            </select>
          </div>

          <div className="sm:col-span-2 relative">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tìm Kiếm Nhanh:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã phiếu #EXP-..., tên sản phẩm, người tạo..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Rich Export Receipts Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Mã Phiếu</th>
                <th className="px-4 py-3">Sản Phẩm &amp; Số Lượng</th>
                <th className="px-4 py-3">Loại Xuất &amp; Lý Do</th>
                <th className="px-4 py-3">Hành Trình Kho</th>
                <th className="px-4 py-3 text-right">Giá Trị Hao Hụt</th>
                <th className="px-4 py-3 text-center">Trạng Thái Bàn Giao</th>
                <th className="px-4 py-3">Người Tạo</th>
                <th className="px-4 py-3 text-center">Thời Gian</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-xs font-semibold">
                    Chưa có phiếu xuất kho / điều chuyển nào. Vui lòng tạo mới để bắt đầu
                  </td>
                </tr>
              ) : (
                filteredExports.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptDetail(exp)}
                        className="font-black text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                      >
                        {exp.code}
                      </button>
                    </td>

                    {/* Product & Qty */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{exp.item_name}</div>
                      <div className="text-[11px] font-extrabold text-purple-800 mt-0.5">
                        Số lượng: <span className="text-slate-900">{exp.quantity} {exp.unit}</span>
                      </div>
                    </td>

                    {/* Type & Reason */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          exp.export_type === 'DAMAGE'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {exp.export_type === 'DAMAGE' ? '🗑️ Xuất hủy hỏng' : '🔄 Điều chuyển'}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] font-medium truncate" title={exp.reason}>
                        {exp.reason}
                      </div>
                    </td>

                    {/* Journey Route Diagram */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-800">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[110px]" title={exp.from_branch}>
                          {exp.from_branch}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className={`px-2 py-0.5 rounded border truncate max-w-[110px] ${
                          exp.to_branch.includes('Hủy') ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold' : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`} title={exp.to_branch}>
                          {exp.to_branch}
                        </span>
                      </div>
                    </td>

                    {/* Loss Value */}
                    <td className="px-4 py-3.5 text-right font-extrabold text-xs">
                      {exp.export_type === 'DAMAGE' ? (
                        <span className="text-rose-600 font-black">
                          -{exp.loss_value.toLocaleString('vi-VN')} VNĐ
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>

                    {/* Handover Status */}
                    <td className="px-4 py-3.5 text-center">
                      {exp.status === 'COMPLETED' ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          🟢 Đã hoàn thành
                        </span>
                      ) : exp.status === 'IN_TRANSIT' ? (
                        <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center justify-center gap-1 animate-pulse">
                          <Truck className="w-3 h-3 text-orange-600" />
                          <span>Đang vận chuyển</span>
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          🔴 Đã hủy bỏ
                        </span>
                      )}
                    </td>

                    {/* Handler */}
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{exp.handler}</td>

                    {/* Time */}
                    <td className="px-4 py-3.5 text-center text-slate-500 text-[11px] font-medium">
                      {exp.created_at}
                    </td>

                    {/* Quick Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* 📦 Confirm Receipt Button if IN_TRANSIT */}
                        {exp.status === 'IN_TRANSIT' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmReceived(exp)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            title="Xác nhận chi nhánh đã nhận đủ hàng"
                          >
                            <Package className="w-3 h-3" />
                            <span>Nhận hàng</span>
                          </button>
                        )}

                        {/* 👁️ View Receipt Detail */}
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptDetail(exp)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          title="Xem chi tiết phiếu xuất"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 🖨️ Print Receipt */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptDetail(exp);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          title="In biên bản bàn giao"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* 🗑️ Delete Receipt */}
                        <button
                          type="button"
                          onClick={() => handleDeleteReceipt(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          title="Xóa phiếu"
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

      {/* 4. Create Export Receipt Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-600" />
                Tạo Phiếu Xuất Kho / Điều Chuyển Hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExportSubmit} className="space-y-4">
              {/* Purpose Radio Buttons */}
              <div>
                <label className="block font-extrabold text-slate-900 mb-2">1. Chọn Mục Đích Xuất Kho (*)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormExportType('TRANSFER')}
                    className={`p-3 rounded-xl border transition text-left cursor-pointer ${
                      formExportType === 'TRANSFER'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                      <span>Điều chuyển chi nhánh</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Chuyển hàng sang cơ sở khác để đối soát bán.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormExportType('DAMAGE')}
                    className={`p-3 rounded-xl border transition text-left cursor-pointer ${
                      formExportType === 'DAMAGE'
                        ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-extrabold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Xuất hủy hao hụt / Hỏng</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Hàng hỏng rách bao bì, quá hạn bảo quản.</p>
                  </button>
                </div>
              </div>

              {/* Source & Target Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kho Xuất Hàng Đi (*)</label>
                  <select
                    value={formFromBranch}
                    onChange={(e) => setFormFromBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                    <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
                    <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
                    <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {formExportType === 'DAMAGE' ? 'Kho Tiếp Nhận (Xuất Hủy)' : 'Kho Tiếp Nhận Hàng (*)'}
                  </label>
                  <select
                    value={formToBranch}
                    onChange={(e) => setFormToBranch(e.target.value)}
                    disabled={formExportType === 'DAMAGE'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {formExportType === 'DAMAGE' ? (
                      <option value="--- (Hủy Hàng)">--- (Hủy Hàng Tiêu Hủy)</option>
                    ) : (
                      <>
                        <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
                        <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                        <option value="Chi Nhánh Thanh Trì">Chi Nhánh Thanh Trì</option>
                        <option value="Chi Nhánh Quận 1 (TP.HCM)">Chi Nhánh Quận 1 (TP.HCM)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Item & Quantity Selector */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Món / Nguyên Liệu Xuất (*)</label>
                  <input
                    type="text"
                    required
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="VD: Gà Ủ Muối Nguyên Con"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số Lượng Xuất</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đơn Vị Tính</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold"
                    >
                      <option value="Con">Con</option>
                      <option value="Khay">Khay</option>
                      <option value="Hộp">Hộp</option>
                      <option value="Phần">Phần</option>
                      <option value="Chai">Chai</option>
                      <option value="Ly">Ly</option>
                      <option value="Túi">Túi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giá Vốn 1 Đơn Vị (VNĐ)</label>
                    <input
                      type="number"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold"
                    />
                  </div>
                </div>

                {formExportType === 'DAMAGE' && (
                  <div className="bg-rose-100 border border-rose-200 text-rose-900 p-2.5 rounded-lg flex items-center justify-between font-bold">
                    <span>Giá trị thiệt hại hao hụt:</span>
                    <span className="text-rose-700 text-sm font-black">
                      -{(Number(formQuantity) * Number(formCostPrice)).toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                )}
              </div>

              {/* Reason & Handler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý Do Xuất Kho Chi Tiết (*)</label>
                  <input
                    type="text"
                    required
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="VD: Hủy hàng rách bao bì hỏng cấp đông..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người Thực Hiện (*)</label>
                  <input
                    type="text"
                    required
                    value={formHandler}
                    onChange={(e) => setFormHandler(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Photo Proof URL Input for Damage */}
              {formExportType === 'DAMAGE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-rose-600" /> Link Ảnh Chụp Bằng Chứng Hàng Hỏng (Nghiệm thu):
                  </label>
                  <input
                    type="text"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="https://... (Hình ảnh sản phẩm dập hỏng)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-xs transition cursor-pointer"
                >
                  🚀 Xác Nhận Xuất Kho &amp; Trừ Tồn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. View Receipt Detail & Print Modal */}
      {selectedReceiptDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Biên Bản Bàn Giao / Phiếu Xuất Kho {selectedReceiptDetail.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptDetail(null);
                  setShowPrintModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Kho xuất hàng:</span>
                <strong className="text-slate-900">{selectedReceiptDetail.from_branch}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Kho tiếp nhận:</span>
                <strong className="text-slate-900">{selectedReceiptDetail.to_branch}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Loại xuất kho:</span>
                <span className={`font-extrabold ${selectedReceiptDetail.export_type === 'DAMAGE' ? 'text-rose-600' : 'text-blue-600'}`}>
                  {selectedReceiptDetail.export_type === 'DAMAGE' ? 'Xuất Hủy Hao Hụt' : 'Điều Chuyển Nội Bộ'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Trạng thái bàn giao:</span>
                {selectedReceiptDetail.status === 'COMPLETED' ? (
                  <span className="text-emerald-700 font-extrabold">🟢 Đã hoàn thành</span>
                ) : (
                  <span className="text-orange-600 font-extrabold animate-pulse">🟡 Đang trên đường giao</span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2.5">Sản phẩm xuất</th>
                    <th className="p-2.5 text-center">Số lượng</th>
                    <th className="p-2.5 text-right">Đơn giá vốn</th>
                    <th className="p-2.5 text-right">Giá trị thiệt hại</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">{selectedReceiptDetail.item_name}</td>
                    <td className="p-2.5 text-center font-extrabold">{selectedReceiptDetail.quantity} {selectedReceiptDetail.unit}</td>
                    <td className="p-2.5 text-right">{selectedReceiptDetail.cost_price.toLocaleString('vi-VN')} VNĐ</td>
                    <td className="p-2.5 text-right font-extrabold text-rose-600">
                      {selectedReceiptDetail.loss_value > 0 ? `${selectedReceiptDetail.loss_value.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reason & Photo Proof */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div><strong>Lý do xuất:</strong> {selectedReceiptDetail.reason}</div>
              <div><strong>Người lập phiếu:</strong> {selectedReceiptDetail.handler} ({selectedReceiptDetail.created_at})</div>

              {selectedReceiptDetail.photo_url && (
                <div className="pt-2 border-t border-slate-200">
                  <strong className="block text-[11px] text-slate-700 mb-1">Ảnh bằng chứng hàng hỏng nghiệm thu:</strong>
                  <img src={selectedReceiptDetail.photo_url} alt="Bằng chứng" className="h-32 rounded-lg object-cover border border-slate-300 shadow-2xs" />
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ In Biên Bản Bàn Giao</span>
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
