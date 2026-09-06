'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getBranches, getProducts, calculateInventoryAudit, addInventoryLog, getItem } from '@/lib/store';
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
  Boxes
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  stock_quantity: number;
  min_alert_threshold?: number;
  branch_id?: string;
  total_sold?: number;
}

export interface BranchItem {
  id: string;
  name: string;
}

export default function InventoryCheckPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Audit / Stock Edit Modal State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active branches safely
      let branchList: BranchItem[] = [];
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('id, name')
          .eq('is_active', true);
        if (Array.isArray(branchData) && branchData.length > 0) {
          branchList = branchData;
        } else {
          branchList = getBranches()
            .filter(b => b.is_active !== false)
            .map(b => ({ id: b.id, name: b.name }));
        }
      } catch (e) {
        branchList = getBranches()
          .filter(b => b.is_active !== false)
          .map(b => ({ id: b.id, name: b.name }));
      }
      setBranches(branchList || []);

      // Default selected branch for staff / manager
      if (user?.branch_id && selectedBranchId === 'all') {
        setSelectedBranchId(user.branch_id);
      }

      // 2. Fetch products / inventory list safely
      let inventoryList: InventoryItem[] = [];

      try {
        const { data: prodData, error } = await supabase
          .from('products')
          .select('*');

        if (!error && Array.isArray(prodData) && prodData.length > 0) {
          inventoryList = prodData.map((p: any) => ({
            id: p.id,
            name: p.name || 'Chưa đặt tên',
            sku: p.sku || `SP-${String(p.id).slice(0, 5)}`,
            category: p.category || 'Món ăn',
            unit: p.unit || 'Phần',
            stock_quantity: Number(p.stock_quantity ?? p.stock ?? 0),
            min_alert_threshold: Number(p.min_alert_threshold ?? 10),
            branch_id: p.branch_id || ''
          }));
        } else {
          // Fallback to calculateInventoryAudit or local products store
          const allOrders = getItem<any[]>('pos_orders_data', []);
          const auditData = calculateInventoryAudit(allOrders);

          if (Array.isArray(auditData) && auditData.length > 0) {
            inventoryList = auditData.map(a => ({
              id: a.id,
              name: a.name,
              sku: `SP-${a.id}`,
              category: 'Đặc sản Gà',
              unit: a.unit,
              stock_quantity: a.currentStock,
              min_alert_threshold: a.minStock || 10,
              total_sold: a.totalSold
            }));
          } else {
            const products = getProducts();
            if (Array.isArray(products)) {
              inventoryList = products.map(p => ({
                id: p.id,
                name: p.name,
                sku: `SP-${p.id}`,
                category: p.category || 'Món ăn',
                unit: 'Phần',
                stock_quantity: Number((p as any).stock ?? 50),
                min_alert_threshold: 10
              }));
            }
          }
        }
      } catch (e) {
        console.warn('Fallback loading store audit data:', e);
        const allOrders = getItem<any[]>('pos_orders_data', []);
        const auditData = calculateInventoryAudit(allOrders);
        if (Array.isArray(auditData)) {
          inventoryList = auditData.map(a => ({
            id: a.id,
            name: a.name,
            sku: `SP-${a.id}`,
            category: 'Đặc sản Gà',
            unit: a.unit,
            stock_quantity: a.currentStock,
            min_alert_threshold: a.minStock || 10,
            total_sold: a.totalSold
          }));
        }
      }

      setItems(inventoryList || []);
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu kiểm kho:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.filter((item) => {
      if (!item) return false;
      const matchBranch = selectedBranchId === 'all' || !item.branch_id || item.branch_id === selectedBranchId;
      const matchSearch = !searchTerm.trim() || (item.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [items, selectedBranchId, searchTerm]);

  // Statistics memo
  const stats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const safeItems = Array.isArray(items) ? items : [];
    safeItems.forEach((item) => {
      if (!item) return;
      const qty = item.stock_quantity ?? 0;
      const min = item.min_alert_threshold ?? 10;
      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= min) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return {
      total: safeItems.length,
      inStock,
      lowStock,
      outOfStock
    };
  }, [items]);

  const handleOpenAuditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewStockVal(String(item.stock_quantity ?? 0));
    setNote('Kiểm kê điều chỉnh kho thực tế');
    setSuccessMsg('');
  };

  const handleSaveStockAudit = async () => {
    if (!selectedItem) return;
    const targetVal = parseInt(newStockVal, 10);
    if (isNaN(targetVal) || targetVal < 0) {
      alert('Vui lòng nhập số lượng tồn kho hợp lệ (>= 0)');
      return;
    }

    setIsUpdating(true);
    try {
      const currentBranchObj = (branches || []).find(b => b.id === selectedBranchId);
      const branchName = currentBranchObj ? currentBranchObj.name : (user?.branch_name || 'Chi Nhánh Kiểm Kho');
      const diff = targetVal - (selectedItem.stock_quantity ?? 0);

      // Attempt Supabase update
      try {
        await supabase
          .from('products')
          .update({ stock_quantity: targetVal, stock: targetVal })
          .eq('id', selectedItem.id);
      } catch (e) {}

      if (diff > 0) {
        addInventoryLog({
          type: 'IMPORT',
          branchName,
          itemName: selectedItem.name,
          quantityChange: diff,
          note: note.trim() || `Cập nhật tăng tồn kho thủ công (+${diff} ${selectedItem.unit || 'Phần'})`
        });
      } else if (diff < 0) {
        addInventoryLog({
          type: 'WASTE',
          branchName,
          itemName: selectedItem.name,
          quantityChange: Math.abs(diff),
          note: note.trim() || `Điều chỉnh giảm tồn kho thủ công (-${Math.abs(diff)} ${selectedItem.unit || 'Phần'})`
        });
      }

      setSuccessMsg(`Đã cập nhật tồn kho món "${selectedItem.name}" thành ${targetVal} ${selectedItem.unit || 'Phần'}`);
      await loadData();

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
          {/* Top Banner Header */}
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
                Theo dõi số lượng tồn, ngưỡng cảnh báo và đối soát kho theo từng cơ sở
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
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Tổng Mặt Hàng</span>
                <span className="text-xl font-extrabold text-slate-900">{stats.total}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 block uppercase">🟢 Đủ Hàng</span>
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
                <span className="text-[11px] font-bold text-rose-600 block uppercase">🔴 Hết Hàng</span>
                <span className="text-xl font-extrabold text-rose-700">{stats.outOfStock}</span>
              </div>
            </div>
          </div>

          {/* Filter Controls Row */}
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
                <option value="all">-- Tất cả chi nhánh --</option>
                {(branches || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên món / nguyên liệu..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Safe Inventory Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-xs font-semibold">
                Đang tải dữ liệu tồn kho...
              </div>
            ) : (filteredItems || []).length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                Chưa có mặt hàng nào trong kho. Dữ liệu kho đang ở trạng thái sẵn sàng cho đợt nhập hàng đầu tiên.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Tên Món / Mặt Hàng</th>
                      <th className="py-3.5 px-4">Đơn Vị</th>
                      <th className="py-3.5 px-4 text-center">Tồn Kho Hiện Tại</th>
                      <th className="py-3.5 px-4 text-center">Cảnh Báo (Tối Thiểu)</th>
                      <th className="py-3.5 px-4 text-center">Trạng Thái Kho</th>
                      <th className="py-3.5 px-4 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filteredItems || []).map((item) => {
                      if (!item) return null;
                      const qty = item.stock_quantity ?? 0;
                      const minAlert = item.min_alert_threshold ?? 10;
                      const isOutOfStock = qty <= 0;
                      const isLowStock = !isOutOfStock && qty <= minAlert;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{item.name}</div>
                            {item.sku && <span className="text-[10px] text-slate-400 font-normal">{item.sku}</span>}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">
                            {item.unit || 'Phần'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-sm text-slate-900">
                            {qty} <span className="text-slate-400 text-xs font-normal">{item.unit || 'Phần'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">
                            {minAlert} {item.unit || 'Phần'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-rose-100 text-rose-700 font-bold animate-pulse">
                                Hết hàng
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-bold">
                                Sắp hết
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                Đủ hàng
                              </span>
                            )}
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
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                      {selectedItem.stock_quantity ?? 0} {selectedItem.unit || 'Phần'}
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
