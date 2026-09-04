'use client';

import { useState } from 'react';
import { Clock, DollarSign, CreditCard, Wallet, AlertCircle, CheckCircle2, RefreshCw, TrendingUp } from 'lucide-react';

export default function ActiveShiftPage() {
  const [shiftStatus, setShiftStatus] = useState<'CLOSED' | 'OPEN'>('OPEN');
  
  // Shift financials state
  const [openingCash, setOpeningCash] = useState<number>(500000); // 500k tiền mặt đầu ca
  const [inputOpeningCash, setInputOpeningCash] = useState<string>('500000');
  const [closingActualCash, setClosingActualCash] = useState<string>('');
  
  // Sales in current shift (mock)
  const cashSales = 1250000;
  const transferSales = 1890000;
  const cashExpenses = 150000; // Tiền đá + bao bì

  // Calculations
  const expectedEndCash = openingCash + cashSales - cashExpenses;
  const actualEndCashNum = Number(closingActualCash) || 0;
  const variance = closingActualCash !== '' ? actualEndCashNum - expectedEndCash : 0;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(inputOpeningCash) || 0;
    setOpeningCash(cash);
    setShiftStatus('OPEN');
    setClosingActualCash('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Đã đóng ca thành công! Tiền mặt thực tế: ${actualEndCashNum.toLocaleString('vi-VN')} VNĐ. Chênh lệch: ${variance.toLocaleString('vi-VN')} VNĐ.`);
    setShiftStatus('CLOSED');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Ca Làm Việc Trực Tiếp (Active Shift)
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                shiftStatus === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {shiftStatus === 'OPEN' ? '🟢 Ca Đang Mở' : '⚪ Ca Đã Đóng'}
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Đối soát tiền mặt đầu ca, doanh thu tiền mặt / chuyển khoản &amp; chênh lệch két tiền.</p>
          </div>
        </div>
      </div>

      {shiftStatus === 'CLOSED' ? (
        /* OPEN SHIFT FORM */
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-lg mx-auto space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-orange-600" /> Khai Báo Mở Ca Làm Việc Mới
          </h2>

          <form onSubmit={handleOpenShift} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tiền Mặt Đầu Ca Trong Két (*)</label>
              <input
                type="number"
                value={inputOpeningCash}
                onChange={(e) => setInputOpeningCash(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="500000"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Nhập số tiền mặt thối có sẵn trong két tiền khi bắt đầu ca.</span>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>XÁC NHẬN MỞ CA</span>
            </button>
          </form>
        </div>
      ) : (
        /* ACTIVE SHIFT LIVE MONITOR & CLOSE SHIFT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          
          {/* Left Column: Live Sales Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" /> Thống Kê Doanh Thu Ca Hiện Tại
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium">Tiền Mặt Đầu Ca:</span>
                  <div className="text-lg font-extrabold text-slate-900">{openingCash.toLocaleString('vi-VN')} VNĐ</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Doanh Thu Tiền Mặt:
                  </span>
                  <div className="text-lg font-extrabold text-emerald-700">+{cashSales.toLocaleString('vi-VN')} VNĐ</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] text-blue-800 font-medium flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> Chuyển Khoản / Thẻ:
                  </span>
                  <div className="text-lg font-extrabold text-blue-700">+{transferSales.toLocaleString('vi-VN')} VNĐ</div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-slate-700 font-bold block">Chi Tiêu Tiền Mặt Trong Ca:</span>
                  <span className="text-[11px] text-slate-500">Tiền mua đá, bao bì nilon, gia vị bổ sung</span>
                </div>
                <div className="text-base font-extrabold text-rose-600">-{cashExpenses.toLocaleString('vi-VN')} VNĐ</div>
              </div>
            </div>
          </div>

          {/* Right Column: Close Shift Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" /> Báo Cáo Kiểm Đếm Đóng Ca
            </h2>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Tiền mặt két dự tính (Sổ sách):</span>
                <span className="font-bold text-slate-900">{expectedEndCash.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Tiền Mặt Thực Tế Kiểm Trong Két (*)</label>
                <input
                  type="number"
                  value={closingActualCash}
                  onChange={(e) => setClosingActualCash(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="Ví dụ: 1600000"
                />
              </div>

              {closingActualCash !== '' && (
                <div className={`p-3.5 rounded-xl border font-bold flex items-center justify-between ${
                  variance === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : variance > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span>Chênh lệch (Thực tế - Sổ sách):</span>
                  <span className="text-sm font-extrabold">
                    {variance > 0 ? `+${variance.toLocaleString('vi-VN')}` : variance.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>XÁC NHẬN ĐÓNG CA &amp; ĐỐI SOÁT</span>
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
