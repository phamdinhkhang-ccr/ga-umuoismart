'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Calendar,
  Building2,
  User,
  RefreshCw,
  CreditCard,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  ExpenseRecord
} from '@/lib/store';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [branch, setBranch] = useState('CƠ SỞ VIN SMART CITY');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
  const [category, setCategory] = useState('Tiền ship');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payer, setPayer] = useState('Đức');

  const loadExpensesData = () => {
    setExpenses(getExpenses());
  };

  useEffect(() => {
    loadExpensesData();
    const handleUpdate = () => loadExpensesData();
    window.addEventListener('gum_store_update', handleUpdate);
    return () => window.removeEventListener('gum_store_update', handleUpdate);
  }, []);

  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  // Open Modal for Create or Edit
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setBranch('CƠ SỞ VIN SMART CITY');
    setAmount('');
    setPaymentMethod('Tiền mặt');
    setCategory('Tiền ship');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setPayer('Đức');
    setShowModal(true);
  };

  const handleOpenEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setBranch(exp.branch || 'CƠ SỞ VIN SMART CITY');
    setAmount(exp.amount.toString());
    setPaymentMethod(exp.payment_method || 'Tiền mặt');
    setCategory(exp.category || 'Tiền ship');
    setDescription(exp.description || '');
    setDate(exp.created_at || new Date().toISOString().split('T')[0]);
    setPayer(exp.payer || 'Đức');
    setShowModal(true);
  };

  // Submit Handler for Add / Edit
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        branch,
        amount: Number(amount) || 0,
        payment_method: paymentMethod,
        category,
        description: description || 'Chi tiêu nội bộ',
        created_at: date,
        payer
      });
    } else {
      addExpense({
        branch,
        amount: Number(amount) || 0,
        payment_method: paymentMethod,
        category,
        description: description || 'Chi tiêu nội bộ',
        created_at: date,
        payer
      });
    }

    loadExpensesData();
    setShowModal(false);
  };

  // Delete Handler
  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteExpense(deleteConfirmId);
      loadExpensesData();
      setDeleteConfirmId(null);
    }
  };

  // Filtered Expenses Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.code.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.branch.toLowerCase().includes(q) ||
        e.payer.toLowerCase().includes(q);

      const matchPayment =
        paymentTypeFilter === 'ALL' || e.payment_method === paymentTypeFilter;

      const matchBranch =
        branchFilter === 'ALL' || e.branch === branchFilter;

      const matchStart = !startDate || e.created_at >= startDate;
      const matchEnd = !endDate || e.created_at <= endDate;

      return matchSearch && matchPayment && matchBranch && matchStart && matchEnd;
    });
  }, [expenses, searchQuery, paymentTypeFilter, branchFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentTypeFilter('ALL');
    setBranchFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Helper format date display DD/MM/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen space-y-6">
      
      {/* 1. KHỐI BỘ LỌC TÌM KIẾM (FILTER SECTION) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Top Header & Quick Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Danh sách chi tiêu ({expenses.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Sổ quỹ theo dõi phiếu chi tiền mặt &amp; chuyển khoản realtime.</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-3 py-1.5 rounded-xl font-extrabold hidden sm:inline-block">
              Tổng chi: -{totalExpenseAmount.toLocaleString('vi-VN')} đ
            </span>

            <button
              onClick={handleOpenCreateModal}
              className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
              <span>Tạo Phiếu Chi Mới</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row 1 & Row 2 */}
        <div className="space-y-3 text-xs">
          
          {/* Row 1: Search + Payment Type + From Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nội dung chi (trả ship, nước, ăn trưa, mua rau...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-sky-500 transition"
              />
            </div>

            {/* Loại tiền Dropdown */}
            <div className="sm:col-span-4">
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả loại tiền</option>
                <option value="Tiền mặt">💵 Tiền mặt</option>
                <option value="Chuyển khoản">💳 Chuyển khoản</option>
              </select>
            </div>

            {/* Từ ngày */}
            <div className="sm:col-span-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Row 2: Cửa hàng + Đến ngày + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Cửa hàng */}
            <div className="sm:col-span-5">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả cửa hàng / chi nhánh</option>
                <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
                <option value="Chi Nhánh Đống Đa">Chi Nhánh Đống Đa</option>
                <option value="Chi Nhánh Hà Đông">Chi Nhánh Hà Đông</option>
              </select>
            </div>

            {/* Đến ngày */}
            <div className="sm:col-span-4">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
              />
            </div>

            {/* Actions: Lọc & Reset */}
            <div className="sm:col-span-3 flex items-center space-x-2">
              <button
                onClick={() => {}}
                className="flex-1 py-2.5 px-3 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Lọc</span>
              </button>

              <button
                onClick={handleResetFilters}
                className="py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* 2. BẢNG DỮ LIỆU CHI TIÊU (EXPENSES TABLE WITH ZEBRA STRIPING) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 text-center">#</th>
                <th className="p-3.5">Cửa hàng</th>
                <th className="p-3.5 text-right">Số tiền</th>
                <th className="p-3.5 text-center">Loại tiền</th>
                <th className="p-3.5">Nội dung</th>
                <th className="p-3.5">Người ghi</th>
                <th className="p-3.5 text-center">Ngày chi</th>
                <th className="p-3.5 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy phiếu chi phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr
                    key={exp.id}
                    className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100/60`}
                  >
                    {/* # Mã phiếu */}
                    <td className="p-3.5 text-center font-extrabold text-slate-900">
                      {exp.code}
                    </td>

                    {/* Cửa hàng */}
                    <td className="p-3.5 font-bold text-slate-900">
                      {exp.branch}
                    </td>

                    {/* Số tiền (Đỏ in đậm) */}
                    <td className="p-3.5 text-right text-red-600 font-extrabold text-sm">
                      -{exp.amount.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Loại tiền Badge */}
                    <td className="p-3.5 text-center">
                      {exp.payment_method === 'Tiền mặt' ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-lg text-[11px] inline-flex items-center space-x-1">
                          <span>💵 Tiền mặt</span>
                        </span>
                      ) : (
                        <span className="bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-lg text-[11px] inline-flex items-center space-x-1">
                          <span>💳 Chuyển khoản</span>
                        </span>
                      )}
                    </td>

                    {/* Nội dung */}
                    <td className="p-3.5 text-slate-800 font-semibold max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>

                    {/* Người ghi */}
                    <td className="p-3.5 text-slate-700 font-bold">
                      {exp.payer}
                    </td>

                    {/* Ngày chi */}
                    <td className="p-3.5 text-center text-slate-600 text-[11px]">
                      {formatDateDisplay(exp.created_at)}
                    </td>

                    {/* Hành động */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          title="Chỉnh sửa phiếu chi"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer border border-blue-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(exp.id)}
                          title="Xóa phiếu chi"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer border border-rose-200"
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

      {/* 3. MODAL "TẠO PHIẾU CHI MỚI" & "CHỈNH SỬA PHIẾU CHI" */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-sky-600" />
                {editingExpense ? `Chỉnh Sửa Phiếu Chi ${editingExpense.code}` : 'Tạo Phiếu Chi Mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              {/* Cửa hàng */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cửa hàng *</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-sky-500"
                >
                  <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                  <option value="Chi Nhánh Cầu Giấy">Chi Nhánh Cầu Giấy</option>
                  <option value="Chi Nhánh Đống Đa">Chi Nhánh Đống Đa</option>
                  <option value="Chi Nhánh Hà Đông">Chi Nhánh Hà Đông</option>
                </select>
              </div>

              {/* Số tiền & Phương thức thanh toán */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Số tiền (VNĐ) *</label>
                  </div>
                  <input
                    type="number"
                    placeholder="Ví dụ: 160000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-red-600 outline-none focus:border-sky-500"
                  />
                  {amount && (
                    <span className="text-[10px] text-red-500 font-bold mt-0.5 block">
                      = {Number(amount).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phương thức *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-sky-500"
                  >
                    <option value="Tiền mặt">💵 Tiền mặt</option>
                    <option value="Chuyển khoản">💳 Chuyển khoản</option>
                  </select>
                </div>
              </div>

              {/* Danh mục chi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Danh mục chi tiêu</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                >
                  <option value="Tiền ship">Tiền ship hỏa tốc / Ahamove</option>
                  <option value="Nước & Đá">Nước uống &amp; Đá bi</option>
                  <option value="Ăn uống nội bộ">Ăn uống ca làm việc</option>
                  <option value="Nguyên phụ liệu">Mua rau / sả / gia vị phụ</option>
                  <option value="Bao bì & VPP">Bao bì &amp; Giấy in K80</option>
                </select>
              </div>

              {/* Nội dung chi tiết */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Trả ship, Nước, Ăn trưa, Mua rau..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:border-sky-500"
                />
              </div>

              {/* Ngày chi & Người lập */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày chi *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người lập phiếu</label>
                  <input
                    type="text"
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-sm transition cursor-pointer"
                >
                  Lưu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Xác Nhận Xóa Phiếu Chi</h3>
            <p className="text-xs text-slate-600">Bạn có chắc chắn muốn xóa phiếu chi này không? Dữ liệu chi phí trên Dashboard sẽ tự động cập nhật lại.</p>

            <div className="flex space-x-2 pt-2 text-xs">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition cursor-pointer shadow-sm"
              >
                Xóa Ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
