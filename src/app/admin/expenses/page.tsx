'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Camera,
  Upload,
  AlertTriangle,
  Building2,
  DollarSign,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  Check,
  CreditCard,
  Wallet,
  Info,
} from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';

interface ExpenseRecord {
  id: string;
  expenseCode: string | null;
  title: string;
  amount: number;
  paymentMethod: string; // CASH, BANK_TRANSFER
  category: string;
  creatorName: string | null;
  receiptPhoto: string | null;
  note: string | null;
  branchId: string | null;
  date: string;
  createdAt: string;
}

const CATEGORIES = [
  '🍗 Gà',
  '🥖 Nem',
  '📦 Khác',
];

export default function ExpensesManagementPage() {
  const { branches } = useBranches();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    branchId?: string | null;
    branchIds?: string[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  const availableBranches = (currentUser?.role === 'MANAGER' && currentUser.branchIds && currentUser.branchIds.length > 0)
    ? branches.filter((b) => currentUser.branchIds!.includes(b.id) || currentUser.branchIds!.includes(b.code))
    : branches;

  const [summary, setSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
    cashExpensesTotal: 0,
    bankExpensesTotal: 0,
    chickenExpensesTotal: 0,
    nemExpensesTotal: 0,
    otherExpensesTotal: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Toast message
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewBillPhoto, setViewBillPhoto] = useState<string | null>(null);

  // Form States
  const [formBranchId, setFormBranchId] = useState('cs1');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH'); // CASH, BANK_TRANSFER
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formCategory, setFormCategory] = useState('🍗 Gà');
  const [formTitle, setFormTitle] = useState('');
  const [formCreatorName, setFormCreatorName] = useState('Quản trị viên');
  const [formReceiptPhoto, setFormReceiptPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch Expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (paymentFilter !== 'ALL') params.append('paymentMethod', paymentFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (branchFilter !== 'ALL') params.append('branchId', branchFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleApplyFilter = () => {
    fetchExpenses();
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setPaymentFilter('ALL');
    setCategoryFilter('ALL');
    setBranchFilter('ALL');
    setFromDate('');
    setToDate('');
    setTimeout(() => {
      fetchExpenses();
    }, 50);
  };

  // Format Number Thousands Separator Helper
  const formatNumberThousands = (val: string | number) => {
    const num = typeof val === 'number' ? val : parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('vi-VN');
  };

  const parseNumberFromFormatted = (valStr: string) => {
    const num = parseInt(valStr.replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormBranchId('cs1');
    setFormPaymentMethod('CASH');
    setFormAmountStr('');
    setFormCategory('🍗 Gà');
    setFormTitle('');
    setFormCreatorName('Quản trị viên');
    setFormReceiptPhoto(null);
    setFormError('');
    setEditingExpense(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setFormBranchId(expense.branchId || 'cs1');
    setFormPaymentMethod(expense.paymentMethod || 'CASH');
    setFormAmountStr(expense.amount ? expense.amount.toLocaleString('vi-VN') : '');
    
    let catVal = '📦 Khác';
    if ((expense.category || '').toLowerCase().includes('gà') || expense.category === 'CHICKEN') catVal = '🍗 Gà';
    else if ((expense.category || '').toLowerCase().includes('nem') || expense.category === 'SPRING_ROLL') catVal = '🥖 Nem';
    setFormCategory(catVal);

    setFormTitle(expense.title || '');
    setFormCreatorName(expense.creatorName || 'Quản trị viên');
    setFormReceiptPhoto(expense.receiptPhoto || null);
    setFormError('');
  };

  // Quick Amount Select Handler
  const handleQuickSelectAmount = (addValue: number) => {
    const currentNum = parseNumberFromFormatted(formAmountStr);
    const newNum = currentNum + addValue;
    setFormAmountStr(newNum.toLocaleString('vi-VN'));
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('Dung lượng ảnh tối đa 4MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormReceiptPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = parseNumberFromFormatted(formAmountStr);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Vui lòng nhập Số tiền chi hợp lệ!');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập Nội dung chi tiết!');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        // PUT edit
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            amount: numericAmount,
            paymentMethod: formPaymentMethod,
            category: formCategory,
            branchId: formBranchId,
            creatorName: formCreatorName,
            receiptPhoto: formReceiptPhoto,
            note: formTitle,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingExpense(null);
          fetchExpenses();
          showToast(`Đã cập nhật phiếu chi ${editingExpense.expenseCode || ''} thành công!`);
        } else {
          setFormError(data.error || 'Lỗi cập nhật phiếu chi');
        }
      } else {
        // POST create
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            amount: numericAmount,
            paymentMethod: formPaymentMethod,
            category: formCategory,
            branchId: formBranchId,
            creatorName: formCreatorName,
            receiptPhoto: formReceiptPhoto,
            note: formTitle,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowCreateModal(false);
          fetchExpenses();
          showToast(`🎉 Tạo phiếu chi thành công ${data.expense?.expenseCode || ''}!`);
        } else {
          setFormError(data.error || 'Lỗi tạo phiếu chi');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Expense Handler
  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        fetchExpenses();
        showToast('Đã xóa phiếu chi thành công!');
      } else {
        alert(data.error || 'Lỗi khi xóa phiếu chi!');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối máy chủ!');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b dark:border-neutral-800 border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <Receipt className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold dark:text-white text-stone-900 tracking-tight">
                Danh sách chi tiêu ({summary.totalCount})
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-500 mt-0.5">
                Sổ quỹ theo dõi phiếu chi tiền mặt & chuyển khoản realtime toàn hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right: Total Expense Pill Badge & Create Button */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Prominent Red Expense Pill Badge */}
          <div className="bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 font-black px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">TỔNG CHI:</span>
            <span className="text-base font-black">-{summary.totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>

          {/* Primary Action Button: Create New Expense */}
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Tạo Phiếu Chi Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Multi-Dimensional Filter Bar */}
      <div className="p-4 rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Nội dung chi (mua gà, nem chua, túi bóng...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              className="w-full pl-9 pr-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Dropdown Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">🏷️ Tất Cả Danh Mục Chi</option>
              <option value="🍗 Gà">🍗 Gà</option>
              <option value="🥖 Nem">🥖 Nem</option>
              <option value="📦 Khác">📦 Khác</option>
            </select>
          </div>

          {/* Payment Type Dropdown */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">💳 Tất Cả Loại Tiền</option>
              <option value="CASH">💵 Tiền mặt (Két thu ngân)</option>
              <option value="BANK_TRANSFER">📱 Chuyển khoản (Ngân hàng)</option>
            </select>
          </div>

          {/* Store / Branch Dropdown */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {currentUser?.role !== 'MANAGER' && <option value="ALL">🏢 Tất Cả Cửa Hàng / Chi Nhánh</option>}
              {currentUser?.role === 'MANAGER' && <option value="ALL">🏢 Các cơ sở phụ trách ({availableBranches.length})</option>}
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker (Date Range) */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-1/2 px-2 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-[11px] font-medium focus:outline-none focus:border-amber-500"
            />
            <span className="text-neutral-500 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-1/2 px-2 py-2 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 text-[11px] font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Action Buttons: Search & Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t dark:border-neutral-800 border-stone-200">
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-1.5 dark:bg-neutral-900 dark:text-amber-400 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>🔍 Lọc Dữ Liệu</span>
            </button>
            <button
              onClick={handleResetFilter}
              className="px-3.5 py-1.5 dark:bg-neutral-800 bg-stone-100 dark:text-neutral-300 text-stone-700 border border-stone-300 dark:border-neutral-700 font-semibold rounded-xl text-xs hover:bg-stone-200 transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🔄 Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-neutral-400 flex-wrap">
            <span>Tiền mặt: <strong className="text-amber-500">-{summary.cashExpensesTotal.toLocaleString('vi-VN')} đ</strong></span>
            <span>Chuyển khoản: <strong className="text-blue-400">-{summary.bankExpensesTotal.toLocaleString('vi-VN')} đ</strong></span>
          </div>
        </div>
      </div>

      {/* 2.5 Summary Breakdown by 3 Core Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Gà */}
        <div className="p-3.5 rounded-2xl dark:bg-[#141820] bg-white border border-amber-500/30 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-base">
              🍗
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-stone-500 dark:text-neutral-400 block uppercase tracking-wider">TỔNG CHI MUA GÀ</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                -{(summary.chickenExpensesTotal || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Hàng Cốt Lõi 01
          </span>
        </div>

        {/* Card 2: Nem */}
        <div className="p-3.5 rounded-2xl dark:bg-[#141820] bg-white border border-emerald-500/30 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-base">
              🥖
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-stone-500 dark:text-neutral-400 block uppercase tracking-wider">TỔNG CHI MUA NEM</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                -{(summary.nemExpensesTotal || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Hàng Cốt Lõi 02
          </span>
        </div>

        {/* Card 3: Khác */}
        <div className="p-3.5 rounded-2xl dark:bg-[#141820] bg-white border border-slate-500/30 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-400 flex items-center justify-center font-bold text-base">
              📦
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-stone-500 dark:text-neutral-400 block uppercase tracking-wider">CHI PHÍ VẬN HÀNH KHÁC</span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                -{(summary.otherExpensesTotal || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
            Điện/Nước/Vật tư...
          </span>
        </div>
      </div>

      {/* 3. Expenses Data Table */}
      <div className="rounded-2xl dark:bg-[#141820] bg-white border dark:border-neutral-800/80 border-stone-200/80 shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
            <p className="text-xs dark:text-neutral-400 text-stone-500">Đang tải danh sách phiếu chi sổ quỹ...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center py-16">
            <Info className="w-10 h-10 text-neutral-500 mx-auto mb-2 opacity-40" />
            <p className="text-xs text-neutral-500 italic">Không tìm thấy phiếu chi phù hợp với bộ lọc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-neutral-900/90 bg-stone-100 dark:text-neutral-400 text-stone-600 font-semibold border-b dark:border-neutral-800 border-stone-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4"># MÃ PHIẾU</th>
                  <th className="py-3.5 px-4">CỬA HÀNG</th>
                  <th className="py-3.5 px-4">SỐ TIỀN CHI</th>
                  <th className="py-3.5 px-4">LOẠI TIỀN</th>
                  <th className="py-3.5 px-4">HẠNG MỤC & NỘI DUNG</th>
                  <th className="py-3.5 px-4">NGƯỜI GHI</th>
                  <th className="py-3.5 px-4">NGÀY CHI</th>
                  <th className="py-3.5 px-4 text-center">ẢNH BILL</th>
                  <th className="py-3.5 px-4 text-right">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800/60 divide-stone-200 font-medium">
                {expenses.map((expense) => {
                  const branchObj = branches.find((b) => b.id === expense.branchId || b.code === expense.branchId);
                  const branchName = branchObj ? `${branchObj.code ? branchObj.code.toUpperCase() + ' - ' : ''}${branchObj.name}` : (expense.branchId || 'Chi Nhánh POS');

                  return (
                    <tr key={expense.id} className="dark:hover:bg-neutral-900/50 hover:bg-stone-50 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-amber-500">
                        {expense.expenseCode || `#EXP-${expense.id.slice(-4).toUpperCase()}`}
                      </td>

                      {/* Store */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg dark:bg-neutral-800 bg-stone-100 text-stone-700 dark:text-neutral-300 text-[11px] font-medium border border-stone-200 dark:border-neutral-700">
                          {branchName}
                        </span>
                      </td>

                      {/* Amount (Bold Red) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-black text-rose-500 text-sm">
                        -{expense.amount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {expense.paymentMethod === 'BANK_TRANSFER' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                            📱 Chuyển khoản
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            💵 Tiền mặt
                          </span>
                        )}
                      </td>

                      {/* Category & Content */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          {(() => {
                            const cat = expense.category || '';
                            if (cat.toLowerCase().includes('gà') || cat === 'CHICKEN') {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-block">
                                  🍗 Gà
                                </span>
                              );
                            }
                            if (cat.toLowerCase().includes('nem') || cat === 'SPRING_ROLL') {
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-block">
                                  🥖 Nem
                                </span>
                              );
                            }
                            return (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 inline-block">
                                📦 Khác
                              </span>
                            );
                          })()}
                          <span className="font-bold dark:text-white text-stone-900 block truncate">
                            {expense.title}
                          </span>
                        </div>
                      </td>

                      {/* Creator Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap dark:text-neutral-300 text-stone-700">
                        {expense.creatorName || 'Quản trị viên'}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                        {new Date(expense.date).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Receipt Bill Photo */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {expense.receiptPhoto ? (
                          <button
                            onClick={() => setViewBillPhoto(expense.receiptPhoto)}
                            className="p-1.5 dark:bg-neutral-800 bg-stone-100 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/30 transition cursor-pointer text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Xem bill</span>
                          </button>
                        ) : (
                          <span className="text-neutral-500 text-[11px] italic">Không ảnh</span>
                        )}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(expense)}
                            className="p-1.5 dark:text-neutral-400 text-stone-600 hover:text-amber-400 dark:hover:bg-neutral-800 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                            title="Sửa phiếu chi"
                          >
                            <Pencil className="w-4 h-4 stroke-[1.75]" />
                          </button>
                          <button
                            onClick={() => setDeletingId(expense.id)}
                            className="p-1.5 dark:text-neutral-400 text-stone-600 hover:text-rose-500 dark:hover:bg-neutral-800 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                            title="Xóa phiếu chi (Admin)"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.75]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal "Tạo Phiếu Chi Mới" & "Sửa Phiếu Chi" */}
      {(showCreateModal || editingExpense) && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingExpense(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg dark:hover:bg-neutral-800 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <h3 className="text-lg font-extrabold dark:text-white text-stone-900 mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              <span>{editingExpense ? 'Chỉnh Sửa Phiếu Chi' : 'Tạo Phiếu Chi Mới Sổ Quỹ'}</span>
            </h3>
            <p className="text-xs dark:text-neutral-400 text-stone-500 mb-4">
              {editingExpense
                ? 'Cập nhật lại số tiền chi, hình thức thanh toán hoặc nội dung.'
                : 'Phiếu chi Tiền mặt sẽ tự động trừ vào két thu ngân ca trực tại cơ sở.'}
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Branch Select */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Chọn Chi Nhánh Xuất Tiền (*)
                </label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Radio */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Hình Thức Chi (*)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('CASH')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      formPaymentMethod === 'CASH'
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                        : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                    }`}
                  >
                    💵 Tiền mặt (Trừ két thu ngân)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('BANK_TRANSFER')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      formPaymentMethod === 'BANK_TRANSFER'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500'
                        : 'dark:bg-neutral-900 bg-stone-100 text-neutral-400 border-transparent'
                    }`}
                  >
                    📱 Chuyển khoản ngân hàng
                  </button>
                </div>
              </div>

              {/* Expense Amount Input + Quick Select Buttons */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Số Tiền Chi (VNĐ) (*)
                </label>
                <input
                  type="text"
                  placeholder="VD: 50.000 đ"
                  value={formAmountStr}
                  onChange={(e) => setFormAmountStr(formatNumberThousands(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-extrabold text-rose-500 text-sm focus:outline-none focus:border-amber-500"
                />

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-neutral-400 font-semibold">Chọn nhanh:</span>
                  {[
                    { label: '+20k', val: 20000 },
                    { label: '+50k', val: 50000 },
                    { label: '+100k', val: 100000 },
                    { label: '+200k', val: 200000 },
                  ].map((btn) => (
                    <button
                      type="button"
                      key={btn.label}
                      onClick={() => handleQuickSelectAmount(btn.val)}
                      className="px-2.5 py-1 rounded-lg dark:bg-neutral-800 bg-stone-200 hover:bg-amber-500/20 hover:text-amber-500 dark:text-neutral-300 text-stone-800 font-extrabold text-xs transition cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Select */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Danh Mục Chi (*)
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 font-semibold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Content */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Nội Dung Chi Chi Tiết (*)
                </label>
                <textarea
                  rows={2}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VD: Mua đá cây ướp gà, mua túi bóng zip..."
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              {/* Creator Name */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Người Ghi Phiếu Phiếu (*)
                </label>
                <input
                  type="text"
                  value={formCreatorName}
                  onChange={(e) => setFormCreatorName(e.target.value)}
                  placeholder="VD: Trần Thị Mai (Thu ngân)"
                  className="w-full px-3.5 py-2.5 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 dark:text-white text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Receipt Photo */}
              <div>
                <label className="font-bold dark:text-neutral-300 text-stone-700 block mb-1">
                  Đính Kèm Ảnh Hóa Đơn / Bill (Tùy Chọn)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl dark:bg-neutral-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 dark:border-neutral-700 text-xs font-bold cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-500" />
                    <span>Tải Ảnh Hóa Đơn</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {formReceiptPhoto && (
                    <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>Đã đính kèm ảnh</span>
                    </span>
                  )}
                </div>

                {formReceiptPhoto && (
                  <div className="mt-2 w-24 h-24 rounded-xl border border-neutral-700 overflow-hidden relative">
                    <img src={formReceiptPhoto} alt="Receipt Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormReceiptPhoto(null)}
                      className="absolute top-1 right-1 bg-neutral-950/80 text-white rounded-full p-1 hover:bg-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t dark:border-neutral-800 border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2.5 rounded-xl font-semibold text-neutral-400 hover:bg-neutral-800 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Phiếu Chi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Delete Confirmation (Admin Only) */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
              <Trash2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-bold dark:text-white text-stone-900 mb-1">Xác Nhận Xóa Phiếu Chi</h3>
            <p className="text-xs dark:text-neutral-400 text-stone-600 mb-6">
              Bạn có chắc chắn muốn xóa bản ghi phiếu chi này? Hành động này chỉ dành riêng cho Admin và không thể hoàn tác.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold dark:text-neutral-400 text-stone-600 hover:bg-stone-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => handleDeleteExpense(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal View Bill Photo */}
      {viewBillPhoto && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg dark:bg-[#141820] bg-white rounded-2xl border dark:border-neutral-800 border-stone-300 shadow-2xl p-6 relative">
            <button
              onClick={() => setViewBillPhoto(null)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg dark:hover:bg-neutral-800 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <h3 className="text-base font-extrabold dark:text-white text-stone-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-500" />
              <span>Ảnh Hóa Đơn / Bill Phiếu Chi</span>
            </h3>

            <div className="max-h-[70vh] rounded-xl overflow-hidden border border-neutral-700 flex items-center justify-center bg-neutral-950">
              <img src={viewBillPhoto} alt="Bill Photo" className="max-w-full max-h-full object-contain" />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewBillPhoto(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs"
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
