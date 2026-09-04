'use client';

import { useState } from 'react';
import { ArrowUpRight, Plus, Search, Package, AlertTriangle, ArrowRightLeft } from 'lucide-react';

const MOCK_EXPORTS = [
  {
    id: 'exp-201',
    item_name: 'Gà Ủ Muối Nguyên Con (Thành Phẩm đóng túi)',
    quantity: 30,
    unit: 'Con',
    reason: 'Điều Chuyển Chi Nhánh Nội Bộ',
    from_branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    to_branch: 'Chi Nhánh Gà Ủ Muối Quận 3',
    handler: 'Lê Văn Cơ Sở 1',
    created_at: '2026-09-04 10:15'
  },
  {
    id: 'exp-200',
    item_name: 'Bao Bì Giấy Hút Chân Không Special',
    quantity: 100,
    unit: 'Túi',
    reason: 'Điều Chuyển Chi Nhánh Nội Bộ',
    from_branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    to_branch: 'Chi Nhánh Gà Ủ Muối Hà Nội',
    handler: 'Trần Thị Thu Ngân',
    created_at: '2026-09-03 14:00'
  },
  {
    id: 'exp-199',
    item_name: 'Chân Gà Rút Xương Sốt Thái',
    quantity: 5,
    unit: 'Hộp',
    reason: 'Hủy Hàng Rách Bao Bì Hỏng Cấp Đông',
    from_branch: 'Chi Nhánh Gà Ủ Muối Quận 3',
    to_branch: '--- (Hủy Hàng)',
    handler: 'Phạm Thị Cơ Sở 2',
    created_at: '2026-09-02 17:30'
  }
];

export default function InventoryExportPage() {
  const [exports, setExports] = useState(MOCK_EXPORTS);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Con');
  const [reason, setReason] = useState('Điều Chuyển Chi Nhánh Nội Bộ');
  const [fromBranch, setFromBranch] = useState('Chi Nhánh Gà Ủ Muối Quận 1');
  const [toBranch, setToBranch] = useState('Chi Nhánh Gà Ủ Muối Quận 3');
  const [handler, setHandler] = useState('Nhân Viên Quản Kho');

  const handleAddExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !quantity) return;

    const newExp = {
      id: `exp-${Date.now()}`,
      item_name: itemName,
      quantity: Number(quantity) || 0,
      unit,
      reason,
      from_branch: fromBranch,
      to_branch: reason.includes('Hủy') ? '--- (Hủy Hàng)' : toBranch,
      handler,
      created_at: new Date().toLocaleString('vi-VN')
    };

    setExports([newExp, ...exports]);
    setShowModal(false);
    setItemName('');
    setQuantity('');
  };

  const filteredExports = exports.filter(e =>
    e.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.from_branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Xuất Hàng Kho &amp; Điều Chuyển ({exports.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Tạo phiếu xuất kho điều chuyển nội bộ giữa các cơ sở hoặc phiếu xuất hủy hàng hỏng.</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Phiếu Xuất Kho</span>
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
            placeholder="Tìm theo tên sản phẩm xuất, lý do xuất, chi nhánh..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Export Receipts Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Mã Phiếu</th>
                <th className="px-4 py-3">Tên Sản Phẩm Xuất</th>
                <th className="px-4 py-3 text-center">Số Lượng</th>
                <th className="px-4 py-3">Lý Do Xuất Kho</th>
                <th className="px-4 py-3">Từ Chi Nhánh</th>
                <th className="px-4 py-3">Đến Chi Nhánh</th>
                <th className="px-4 py-3">Người Thực Hiện</th>
                <th className="px-4 py-3 text-center">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 font-extrabold text-purple-700">{exp.id}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{exp.item_name}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900">{exp.quantity} {exp.unit}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{exp.reason}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{exp.from_branch}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{exp.to_branch}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{exp.handler}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500 text-[11px]">{exp.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EXPORT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" /> Tạo Phiếu Xuất Kho / Điều Chuyển
            </h2>

            <form onSubmit={handleAddExport} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Sản Phẩm Xuất (*)</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="Ví dụ: Gà Ủ Muối Nguyên Con Thành Phẩm"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    placeholder="30"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Con, Hộp, Túi..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý Do Xuất Kho</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                >
                  <option value="Điều Chuyển Chi Nhánh Nội Bộ">Điều Chuyển Chi Nhánh Nội Bộ</option>
                  <option value="Hủy Hàng Rách Bao Bì Hỏng Cấp Đông">Hủy Hàng Rách Bao Bì Hỏng Cấp Đông</option>
                  <option value="Xuất Mẫu Thử / Marketing">Xuất Mẫu Thử / Marketing</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Từ Chi Nhánh</label>
                  <select
                    value={fromBranch}
                    onChange={(e) => setFromBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none"
                  >
                    <option value="Chi Nhánh Gà Ủ Muối Quận 1">Chi Nhánh Gà Ủ Muối Quận 1</option>
                    <option value="Chi Nhánh Gà Ủ Muối Quận 3">Chi Nhánh Gà Ủ Muối Quận 3</option>
                    <option value="Chi Nhánh Gà Ủ Muối Hà Nội">Chi Nhánh Gà Ủ Muối Hà Nội</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đến Chi Nhánh</label>
                  <select
                    value={toBranch}
                    onChange={(e) => setToBranch(e.target.value)}
                    disabled={reason.includes('Hủy')}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none disabled:opacity-50"
                  >
                    <option value="Chi Nhánh Gà Ủ Muối Quận 3">Chi Nhánh Gà Ủ Muối Quận 3</option>
                    <option value="Chi Nhánh Gà Ủ Muối Quận 1">Chi Nhánh Gà Ủ Muối Quận 1</option>
                    <option value="Chi Nhánh Gà Ủ Muối Hà Nội">Chi Nhánh Gà Ủ Muối Hà Nội</option>
                  </select>
                </div>
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-sm"
                >
                  Lưu Phiếu Xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
