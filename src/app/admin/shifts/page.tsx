'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  Save,
  CheckCircle2,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  Lock,
  DoorOpen,
  DollarSign,
  User,
  FileText
} from 'lucide-react';

export interface ShiftReceipt {
  id: number;
  type: 'OPEN' | 'CLOSE';
  branch: string;
  staff: string;
  cash: number;
  date: string;
  note: string;
}

const INITIAL_MOCK_RECEIPTS: ShiftReceipt[] = [
  {
    id: 947,
    type: 'CLOSE',
    branch: 'CƠ SỞ VIN SMART CITY',
    staff: 'Đức',
    cash: 2110000,
    date: '2026-09-04',
    note: '44 gà 7 chân, bàn giao két đủ'
  },
  {
    id: 946,
    type: 'OPEN',
    branch: 'CƠ SỞ VIN SMART CITY',
    staff: 'Đức',
    cash: 2000000,
    date: '2026-09-04',
    note: 'Mở ca sáng chuẩn bị đủ tiền lẻ'
  },
  {
    id: 942,
    type: 'CLOSE',
    branch: 'Chi Nhánh Gà Ủ Muối Cầu Giấy',
    staff: 'Nam',
    cash: 1850000,
    date: '2026-09-03',
    note: 'Gà 51 Chân 10 Nem 19'
  },
  {
    id: 941,
    type: 'OPEN',
    branch: 'Chi Nhánh Gà Ủ Muối Cầu Giấy',
    staff: 'Nam',
    cash: 1500000,
    date: '2026-09-03',
    note: 'Tiền két đầu ca'
  },
  {
    id: 938,
    type: 'CLOSE',
    branch: 'Chi Nhánh Gà Ủ Muối Đống Đa',
    staff: 'Admin',
    cash: 3200000,
    date: '2026-09-02',
    note: 'Chốt ca tối kiểm két khớp 100%'
  },
  {
    id: 937,
    type: 'OPEN',
    branch: 'Chi Nhánh Gà Ủ Muối Đống Đa',
    staff: 'Admin',
    cash: 2000000,
    date: '2026-09-02',
    note: 'Mở ca chiều'
  }
];

export default function ShiftManagementPage() {
  const [receipts, setReceipts] = useState<ShiftReceipt[]>(INITIAL_MOCK_RECEIPTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<'OPEN' | 'CLOSE'>('OPEN');
  const [formBranch, setFormBranch] = useState<string>('CƠ SỞ VIN SMART CITY');
  const [formCash, setFormCash] = useState<string>('2000000');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState<string>('');

  // Filter States
  const [filterType, setFilterType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Save Shift Receipt Handler
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCash || Number(formCash) <= 0) {
      alert('Vui lòng nhập số tiền mặt hợp lệ!');
      return;
    }

    const nextId = receipts.length > 0 ? Math.max(...receipts.map(r => r.id)) + 1 : 948;

    const newReceipt: ShiftReceipt = {
      id: nextId,
      type: formType,
      branch: formBranch,
      staff: 'Admin (Bạn)',
      cash: Number(formCash) || 0,
      date: formDate || new Date().toISOString().split('T')[0],
      note: formNote || (formType === 'OPEN' ? 'Mở ca làm việc' : 'Bàn giao két đóng ca')
    };

    setReceipts([newReceipt, ...receipts]);
    setToastMessage(`Lưu phiếu ${formType === 'OPEN' ? 'MỞ CA' : 'ĐÓNG CA'} #${nextId} thành công!`);
    
    // Clear toast after 3s
    setTimeout(() => setToastMessage(null), 3000);

    // Notify store for dashboard KPI sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('gum_store_update'));
    }

    // Reset fields
    setFormNote('');
  };

  // Filtered Receipts Logic
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchType = filterType === 'ALL' || r.type === filterType;
      const matchStart = !startDate || r.date >= startDate;
      const matchEnd = !endDate || r.date <= endDate;
      return matchType && matchStart && matchEnd;
    });
  }, [receipts, filterType, startDate, endDate]);

  const handleResetFilter = () => {
    setFilterType('ALL');
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
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center justify-between font-bold text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* 2-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FORM TẠO PHIẾU ĐÓNG / MỞ CA (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 h-fit">
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Tạo phiếu đóng / mở ca
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Admin được quản lý toàn bộ. Nhân viên và quản lý chỉ thao tác trên ca của chính mình.
            </p>
          </div>

          <form onSubmit={handleSaveReceipt} className="space-y-4 text-xs">
            {/* Loại phiếu */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Loại phiếu *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="OPEN">🟢 Mở ca (Đầu ca làm việc)</option>
                <option value="CLOSE">🔴 Đóng ca (Bàn giao chốt két)</option>
              </select>
            </div>

            {/* Cửa hàng */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Cửa hàng *</label>
              <select
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="CƠ SỞ VIN SMART CITY">CƠ SỞ VIN SMART CITY</option>
                <option value="Chi Nhánh Gà Ủ Muối Cầu Giấy">Chi Nhánh Gà Ủ Muối Cầu Giấy</option>
                <option value="Chi Nhánh Gà Ủ Muối Đống Đa">Chi Nhánh Gà Ủ Muối Đống Đa</option>
                <option value="Chi Nhánh Gà Ủ Muối Hà Đông">Chi Nhánh Gà Ủ Muối Hà Đông</option>
              </select>
            </div>

            {/* Tiền mặt */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-bold text-slate-700">Tiền mặt (VNĐ) *</label>
                {formCash && (
                  <span className="text-orange-600 font-extrabold text-[11px]">
                    = {Number(formCash).toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
              <input
                type="number"
                placeholder="Ví dụ: 2000000"
                value={formCash}
                onChange={(e) => setFormCash(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900 text-sm outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-600 mt-1 italic leading-tight">
                {formType === 'OPEN'
                  ? 'Khi mở ca, nhập số tiền mặt đầu ca tại cửa hàng.'
                  : 'Khi đóng ca, nhập số tiền mặt thực tế kiểm két.'}
              </p>
            </div>

            {/* Ngày làm việc */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Ngày làm việc *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-600 mt-1 italic">
                Ngày làm việc được mặc định là hôm nay.
              </p>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Ghi chú</label>
              <textarea
                rows={3}
                placeholder="Ghi chú thêm nếu cần (VD: 44 gà 7 chân, bàn giao két...)"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:border-orange-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider"
            >
              <Save className="w-4 h-4" />
              <span>LƯU PHIẾU</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: DANH SÁCH PHIẾU & BỘ LỌC (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Section Header & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Danh sách phiếu ({filteredReceipts.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi lịch sử mở ca và đóng ca realtime.</p>
            </div>

            {/* Filter Bar Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs pt-2 border-t border-slate-100">
              {/* Type Filter */}
              <div className="sm:col-span-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả loại phiếu</option>
                  <option value="OPEN">🟢 Chỉ Mở ca</option>
                  <option value="CLOSE">🔴 Chỉ Đóng ca</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="sm:col-span-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              {/* End Date */}
              <div className="sm:col-span-3">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              {/* Reset Filter Button */}
              <div className="sm:col-span-2 flex items-center">
                <button
                  onClick={handleResetFilter}
                  title="Làm mới bộ lọc"
                  className="w-full py-2.5 px-3 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>
          </div>

          {/* History Receipts Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5 text-center">#</th>
                    <th className="p-3.5">Loại</th>
                    <th className="p-3.5">Cửa hàng</th>
                    <th className="p-3.5">Nhân viên</th>
                    <th className="p-3.5 text-right">Tiền mặt</th>
                    <th className="p-3.5 text-center">Ngày làm việc</th>
                    <th className="p-3.5">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Không tìm thấy phiếu mở/đóng ca phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        {/* ID */}
                        <td className="p-3.5 text-center font-extrabold text-slate-900">{r.id}</td>

                        {/* Type Badge */}
                        <td className="p-3.5">
                          {r.type === 'OPEN' ? (
                            <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                              <DoorOpen className="w-3 h-3 text-emerald-600" />
                              <span>Mở ca</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Đóng ca</span>
                            </span>
                          )}
                        </td>

                        {/* Cửa hàng */}
                        <td className="p-3.5 font-bold text-slate-900">{r.branch}</td>

                        {/* Nhân viên */}
                        <td className="p-3.5 text-slate-700 font-semibold">{r.staff}</td>

                        {/* Tiền mặt */}
                        <td className="p-3.5 text-right font-extrabold text-slate-900">
                          {r.cash.toLocaleString('vi-VN')} đ
                        </td>

                        {/* Ngày làm việc */}
                        <td className="p-3.5 text-center text-slate-600 text-[11px]">
                          {formatDateDisplay(r.date)}
                        </td>

                        {/* Ghi chú */}
                        <td className="p-3.5 text-slate-600 max-w-xs truncate" title={r.note}>
                          {r.note}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
