'use client';

import { useState } from 'react';
import { Wallet, Plus, Search, Filter, Trash2, Calendar, Building2, User } from 'lucide-react';

const MOCK_EXPENSES = [
  {
    id: 'exp-101',
    category: 'Mua Nguyên Liệu Phụ',
    amount: 150000,
    description: 'Mua 3 bao đá bi + 2 bịch túi nilon đóng gà',
    payer: 'Trần Thị Thu Ngân',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'exp-100',
    category: 'Tiền Ship Ngoài (Ahamove/Grab)',
    amount: 45000,
    description: 'Bù ship đơn hỏa tốc giao Thủ Đức',
    payer: 'Lê Văn Cơ Sở 1',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 1',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  },
  {
    id: 'exp-99',
    category: 'Điện Nước & Khác',
    amount: 80000,
    description: 'Thay bóng đèn hỏng khu vực bếp',
    payer: 'Phạm Thị Cơ Sở 2',
    branch: 'Chi Nhánh Gà Ủ Muối Quận 3',
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
  }
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(MOCK_EXPENSES);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New expense form
  const [category, setCategory] = useState('Mua Nguyên Liệu Phụ');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('Chi Nhánh Gà Ủ Muối Quận 1');
  const [payer, setPayer] = useState('Nhân Viên Thu Ngân');

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newExp = {
      id: `exp-${Date.now()}`,
      category,
      amount: Number(amount) || 0,
      description: description || 'Chi tiêu nội bộ',
      payer,
      branch,
      created_at: new Date().toISOString()
    };

    setExpenses([newExp, ...expenses]);
    setShowModal(false);
    setAmount('');
    setDescription('');
  };

  const filteredExpenses = expenses.filter(e =>
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Sổ Quỹ Chi Tiêu Nội Bộ
              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Tong Chi: -{totalExpense.toLocaleString('vi-VN')} VNĐ
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Quản lý phiếu chi tiền đá, bao bì, gia vị &amp; phát sinh tại cửa hàng.</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo Phiếu Chi Mới</span>
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
            placeholder="Tìm theo nội dung chi, danh mục, chi nhánh..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Expenses Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Mã Phiếu</th>
                <th className="px-4 py-3">Danh Mục Chi</th>
                <th className="px-4 py-3">Nội Dung Chi</th>
                <th className="px-4 py-3">Chi Nhánh</th>
                <th className="px-4 py-3">Người Chi</th>
                <th className="px-4 py-3 text-right">Số Tiền</th>
                <th className="px-4 py-3 text-center">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 font-extrabold text-rose-600">{exp.id}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{exp.category}</td>
                  <td className="px-4 py-3.5 text-slate-800 max-w-xs truncate font-medium">{exp.description}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-semibold">{exp.branch}</td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{exp.payer}</td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-rose-600 text-sm">
                    -{exp.amount.toLocaleString('vi-VN')} VNĐ
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500 text-[11px]">
                    {new Date(exp.created_at).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-rose-600" /> Tạo Phiếu Chi Tiêu Mới
            </h2>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Danh Mục Chi (*)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Mua Nguyên Liệu Phụ">Mua Nguyên Liệu Phụ (Đá bi, bao bì, gia vị)</option>
                  <option value="Tiền Ship Ngoài (Ahamove/Grab)">Tiền Ship Ngoài (Ahamove/Grab)</option>
                  <option value="Điện Nước & Khác">Điện Nước &amp; Dịch Vụ Cửa Hàng</option>
                  <option value="Chi Khác">Chi Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Tiền Chi (VNĐ) (*)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="Ví dụ: 150000"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội Dung / Diễn Giải Chi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Mua 3 bao đá bi + túi nilon"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chi Nhánh Chi</label>
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
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-sm"
                >
                  Lưu Phiếu Chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
