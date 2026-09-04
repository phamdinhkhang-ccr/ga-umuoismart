'use client';

import { useState } from 'react';
import { ArrowDownLeft, Plus, Search, Calendar, Building2, Package, CheckCircle2 } from 'lucide-react';

const MOCK_IMPORTS = [
  {
    id: 'imp-101',
    item_name: 'Gà Sống Làm Sạch Cấp Đóng Thùng (Kg)',
    quantity: 150,
    unit: 'Kg',
    import_price: 68000,
    total_cost: 10200000,
    supplier: 'Trang Trại Gà Sạch Đông Anh',
    branch: 'Chi Nhánh Gà Ủ Muối Hà Nội',
    created_at: '2026-09-04 08:30'
  },
  {
    id: 'imp-100',
    item_name: 'Bao Bì Giấy Hút Chân Không Special',
    quantity: 500,
    unit: 'Túi',
    import_price: 3500,
    total_cost: 1750000,
    supplier: 'Xưởng In Bao Bì Tân Bình',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: '2026-09-03 16:00'
  },
  {
    id: 'imp-99',
    item_name: 'Gia Vị Ủ Muối Truyền Thống Extra (Hũ)',
    quantity: 30,
    unit: 'Hũ',
    import_price: 120000,
    total_cost: 3600000,
    supplier: 'Kho Tổng Gia Vị Bếp',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: '2026-09-02 10:00'
  }
];

export default function InventoryImportPage() {
  const [imports, setImports] = useState(MOCK_IMPORTS);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [importPrice, setImportPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [branch, setBranch] = useState('Chi Nhánh Gà Ủ Muối Quận 1');

  const handleAddImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !quantity || !importPrice) return;

    const qtyNum = Number(quantity) || 0;
    const priceNum = Number(importPrice) || 0;

    const newImp = {
      id: `imp-${Date.now()}`,
      item_name: itemName,
      quantity: qtyNum,
      unit,
      import_price: priceNum,
      total_cost: qtyNum * priceNum,
      supplier: supplier || 'Nhà Cung Cấp Tổng',
      branch,
      created_at: new Date().toLocaleString('vi-VN')
    };

    setImports([newImp, ...imports]);
    setShowModal(false);
    setItemName('');
    setQuantity('');
    setImportPrice('');
  };

  const filteredImports = imports.filter(i =>
    i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Nhập Hàng Kho Nguyên Liệu ({imports.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Tạo phiếu nhập gà tươi, bao bì, gia vị &amp; cập nhật tồn kho khả dụng.</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Phiếu Nhập Kho</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên nguyên liệu, nhà cung cấp, chi nhánh..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Import Receipts Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
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
                <th className="px-4 py-3">Chi Nhánh Nhập</th>
                <th className="px-4 py-3 text-center">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredImports.map((imp) => (
                <tr key={imp.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 font-extrabold text-emerald-700">{imp.id}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{imp.item_name}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900">{imp.quantity} {imp.unit}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-600">{imp.import_price.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">{imp.total_cost.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="px-4 py-3.5 text-slate-700 font-semibold">{imp.supplier}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{imp.branch}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500 text-[11px]">{imp.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE IMPORT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" /> Tạo Phiếu Nhập Hàng Kho
            </h2>

            <form onSubmit={handleAddImport} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Nguyên Liệu / Mặt Hàng (*)</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="Ví dụ: Gà Sống Cấp Đóng Thùng"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Lượng (*)</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    placeholder="100"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Kg, Túi, Hũ..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn Giá Nhập (VNĐ) (*)</label>
                  <input
                    type="number"
                    value={importPrice}
                    onChange={(e) => setImportPrice(e.target.value)}
                    required
                    placeholder="68000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhà Cung Cấp</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Trang Trại Đông Anh"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhập Về Chi Nhánh</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                >
                  <option value="Chi Nhánh Gà Ủ Muối Quận 1">Chi Nhánh Gà Ủ Muối Quận 1</option>
                  <option value="Chi Nhánh Gà Ủ Muối Quận 3">Chi Nhánh Gà Ủ Muối Quận 3</option>
                  <option value="Chi Nhánh Gà Ủ Muối Hà Nội">Chi Nhánh Gà Ủ Muối Hà Nội</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Lưu Phiếu Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
