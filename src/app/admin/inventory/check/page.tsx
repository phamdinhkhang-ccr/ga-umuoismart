'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { 
  getBranches, 
  calculateInventoryAudit, 
  addInventoryLog, 
  InventoryAuditItem, 
  getItem 
} from '@/lib/store';
import { Order, Branch } from '@/types/database';
import { 
  PackageCheck, 
  Search, 
  Building2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Save, 
  X,
  Boxes,
  TrendingDown
} from 'lucide-react';

export default function InventoryCheckPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditList, setAuditList] = useState<InventoryAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit stock modal state
  const [selectedItem, setSelectedItem] = useState<InventoryAuditItem | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = () => {
    setLoading(true);
    try {
      const allBranches = getBranches();
      setBranches(allBranches);

      // Default selected branch for staff / manager
      if (user?.branch_id && selectedBranchId === 'all') {
        setSelectedBranchId(user.branch_id);
      }

      const allOrders = getItem<Order[]>('pos_orders_data', []);
      // Filter orders by branch if selected
      const filteredOrders = (selectedBranchId && selectedBranchId !== 'all')
        ? allOrders.filter(o => o.branch_id === selectedBranchId)
        : allOrders;

      const auditData = calculateInventoryAudit(filteredOrders);
      setAuditList(auditData);
    } catch (e) {
      console.error('Error loading inventory data:', e);
    } fontComplete();
  };

  function fontComplete() {
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return auditList;
    return auditList.filter(item => 
      item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );
  }, [auditList, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    auditList.forEach(item => {
      if (item.currentStock <= 0) {
        outOfStock++;
      } else if (item.currentStock <= item.minStock) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return {
      total: auditList.length,
      inStock,
      lowStock,
      outOfStock
    };
  }, [auditList]);

  const handleOpenAuditModal = (item: InventoryAuditItem) => {
    setSelectedItem(item);
    setNewStockVal(item.currentStock.toString());
    setNote('Kiểm kê điều chỉnh kho thực tế');
    setSuccessMsg('');
  };

  const handleSaveStockAudit = () => {
    if (!selectedItem) return;
    const targetVal = parseInt(newStockVal, 10);
    if (isNaN(targetVal) || targetVal < 0) {
      alert('Vui lòng nhập số lượng tồn kho hợp lệ (>= 0)');
      return;
    }

    setIsUpdating(true);
    try {
      const diff = targetVal - selectedItem.currentStock;
      const currentBranchObj = branches.find(b => b.id === selectedBranchId);
      const branchName = currentBranchObj ? currentBranchObj.name : (user?.branch_name || 'Chi Nhánh Kiểm Kho');

      if (diff > 0) {
        // Increase stock via IMPORT log
        addInventoryLog({
          type: 'IMPORT',
          branchName,
          itemName: selectedItem.name,
          quantityChange: diff,
          note: note.trim() || `Cập nhật tăng tồn kho thủ công (+${diff} ${selectedItem.unit})`
        });
      } else if (diff < 0) {
        // Decrease stock via WASTE log
        addInventoryLog({
          type: 'WASTE',
          branchName,
          itemName: selectedItem.name,
          quantityChange: Math.abs(diff),
          note: note.trim() || `Điều chỉnh giảm tồn kho thủ công (-${Math.abs(diff)} ${selectedItem.unit})`
        });
      }

      setSuccessMsg(`Đã cập nhật tồn kho món "${selectedItem.name}" thành ${targetVal} ${selectedItem.unit}`);
      loadData();

      setTimeout(() => {
        setSelectedItem(null);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi cập nhật tồn kho!');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Topbar onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />

        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2 text-orange-600 mb-1">
                <PackageCheck className="w-6 h-6" />
                <span className="font-extrabold text-sm uppercase tracking-wider">Vận Hành Kho Chi Nhánh</span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                Kiểm Tra Tồn Kho Thực Tế
              </h1>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Theo dõi tình trạng tồn kho sản phẩm, phát hiện món sắp hết và cập nhật tồn thực tế tức thì.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm Mới Dữ Liệu</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Tổng Loại Món</span>
                <span className="text-xl font-extrabold text-slate-900">{stats.total}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 block uppercase">🟢 Còn Hàng</span>
                <span className="text-xl font-extrabold text-emerald-700">{stats.inStock}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-600 block uppercase">🟡 Sắp Hết</span>
                <span className="text-xl font-extrabold text-amber-700">{stats.lowStock}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-600 block uppercase">🔴 Đã Hết</span>
                <span className="text-xl font-extrabold text-rose-700">{stats.outOfStock}</span>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Branch Filter */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Chi Nhánh:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full md:w-64 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition"
              >
                <option value="all">Toàn Chuỗi (Tất Cả Chi Nhánh)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên món ăn / nguyên liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tên Món / Nguyên Liệu</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái Kho</th>
                    <th className="py-3.5 px-4 text-right">Tồn Kho Hiện Tại</th>
                    <th className="py-3.5 px-4 text-right">Đã Bán</th>
                    <th className="py-3.5 px-4 text-right">Mức Báo Động (Min)</th>
                    <th className="py-3.5 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                        Đang tải dữ liệu kiểm kho...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                        Không tìm thấy món nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      let statusBadge = (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Còn hàng
                        </span>
                      );

                      if (item.currentStock <= 0) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                            <XCircle className="w-3 h-3 mr-1" /> Đã hết hàng
                          </span>
                        );
                      } else if (item.currentStock <= item.minStock) {
                        statusBadge = (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Sắp hết hàng
                          </span>
                        );
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {statusBadge}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-sm text-slate-900">
                            {item.currentStock} <span className="text-slate-400 text-xs font-normal">{item.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-600">
                            {item.totalSold} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500 font-semibold">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenAuditModal(item)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg text-xs transition cursor-pointer border border-orange-200"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Cập Nhật Số Tồn</span>
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
        </main>
      </div>

      {/* Edit Stock Audit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <Edit className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-base">Cập Nhật Số Tồn Thực Tế</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 text-center flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Món / Nguyên Liệu:</label>
                  <div className="p-3 bg-slate-50 rounded-xl font-extrabold text-slate-900 text-sm border border-slate-200">
                    {selectedItem.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Tồn Kho Hiện Tại:</label>
                    <div className="p-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-center">
                      {selectedItem.currentStock} {selectedItem.unit}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Số Tồn Thực Tế Mới *:</label>
                    <input
                      type="number"
                      min="0"
                      value={newStockVal}
                      onChange={(e) => setNewStockVal(e.target.value)}
                      className="w-full p-2.5 bg-orange-50 border-2 border-orange-400 text-slate-900 font-extrabold text-center rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Ghi Chú / Lý Do Điều Chỉnh:</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Đếm thực tế giao ca, hàng hủy hỏng..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 font-semibold rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    onClick={handleSaveStockAudit}
                    disabled={isUpdating}
                    className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold rounded-xl transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isUpdating ? 'Đang Lưu...' : 'Xác Nhận Cập Nhật'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
