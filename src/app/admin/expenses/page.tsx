'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, Search, Filter, Trash2, Calendar, Building2, User, RefreshCw } from 'lucide-react';
import { getExpenses, addExpense, ExpenseRecord } from '@/lib/store';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New expense form
  const [category, setCategory] = useState('Mua Nguyên Liệu Phụ');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('Chi Nhánh Gà Ủ Muối Quận 1');
  const [payer, setPayer] = useState('Nhân Viên Thu Ngân');

  useEffect(() => {
    setExpenses(getExpenses());

    const handleUpdate = () => {
      setExpenses(getExpenses());
    };
    window.addEventListener('gum_store_update', handleUpdate);
    return () => window.removeEventListener('gum_store_update', handleUpdate);
  }, []);

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    addExpense({
      category,
      amount: Number(amount) || 0,
      description: description || 'Chi tiêu phát sinh nội bộ',
      payer,
      branch
    });

    setExpenses(getExpenses());
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
                Tổng Chi: -{totalExpense.toLocaleString('vi-VN')} VNĐ
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Tự động đồng bộ với Biểu Đồ Dashboard &amp; Tính toán Lợi Nhuận Ròng Realtime.</p>
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

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm phiếu chi, nguyên liệu, chi nhánh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>{filteredExpenses.length} Phiếu chi được tìm thấy</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Mã Phiếu</th>
                <th className="p-4">Danh Mục Chi</th>
                <th className="p-4">Số Tiền (VNĐ)</th>
                <th className="p-4">Nội Dung Chi Chi Tiết</th>
                <th className="p-4">Người Chi</th>
                <th className="p-4">Chi Nhánh</th>
                <th className="p-4">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Không tìm thấy phiếu chi phù hợp
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-extrabold text-slate-900">{exp.id}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-rose-600">
                      -{exp.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs">{exp.description}</td>
                    <td className="p-4 flex items-center space-x-1.5 text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exp.payer}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{exp.branch}</td>
                    <td className="p-4 text-slate-600 text-[11px]">
                      {new Date(exp.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Expense */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-rose-600" />
                Tạo Phiếu Chi Tiêu Mới
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Danh Mục Chi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                >
                  <option value="Mua Nguyên Liệu Phụ">Mua Nguyên Liệu Phụ (Đá, Túi, Gia Vị)</option>
                  <option value="Tiền Ship Ngoài (Ahamove/Grab)">Tiền Bù Ship Hỏa Tốc</option>
                  <option value="Điện Nước & Khác">Điện Nước &amp; Bảo Trì Máy POS</option>
                  <option value="Thưởng Nóng Nhân Viên">Thưởng Nóng Ca Làm Việc</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số Tiền (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chi Nhánh</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                >
                  <option value="Chi Nhánh Gà Ủ Muối Quận 1">Chi Nhánh Gà Ủ Muối Quận 1</option>
                  <option value="Chi Nhánh Gà Ủ Muối Quận 3">Chi Nhánh Gà Ủ Muối Quận 3</option>
                  <option value="Chi Nhánh Gà Ủ Muối Bình Thạnh">Chi Nhánh Gà Ủ Muối Bình Thạnh</option>
                  <option value="Chi Nhánh Gà Ủ Muối Hà Nội">Chi Nhánh Gà Ủ Muối Hà Nội</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Người Xuất Quỹ</label>
                <input
                  type="text"
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội Dung Chi Tiết</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả lý do chi tiêu cụ thể..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm transition cursor-pointer"
                >
                  Lưu &amp; Cập Nhật Biểu Đồ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
