'use client';

import { useState } from 'react';
import { History, Calendar, Search, Filter, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const MOCK_SHIFTS = [
  {
    id: 'shift-101',
    cashier_name: 'Trần Thị Thu Ngân',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 1',
    start_time: '2026-09-04 07:00',
    end_time: '2026-09-04 15:00',
    opening_cash: 500000,
    cash_sales: 1450000,
    transfer_sales: 2100000,
    expected_cash: 1950000,
    actual_cash: 1950000,
    variance: 0,
    status: 'CLOSED'
  },
  {
    id: 'shift-100',
    cashier_name: 'Lê Văn Cơ Sở 1',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 1',
    start_time: '2026-09-03 15:00',
    end_time: '2026-09-03 23:00',
    opening_cash: 500000,
    cash_sales: 1800000,
    transfer_sales: 3200000,
    expected_cash: 2300000,
    actual_cash: 2280000,
    variance: -20000,
    status: 'CLOSED'
  },
  {
    id: 'shift-99',
    cashier_name: 'Phạm Thị Cơ Sở 2',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 3',
    start_time: '2026-09-03 07:00',
    end_time: '2026-09-03 15:00',
    opening_cash: 500000,
    cash_sales: 1200000,
    transfer_sales: 1900000,
    expected_cash: 1700000,
    actual_cash: 1700000,
    variance: 0,
    status: 'CLOSED'
  }
];

export default function ShiftHistoryPage() {
  const [shifts] = useState(MOCK_SHIFTS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShifts = shifts.filter(s =>
    s.cashier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Lịch Sử Các Ca Làm Việc</h1>
            <p className="text-xs text-slate-600 mt-0.5">Nhật ký đối soát tiền mặt đầu ca/cuối ca và chênh lệch doanh số thu ngân.</p>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên thu ngân, chi nhánh, mã ca..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Shift Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Mã Ca</th>
                <th className="px-4 py-3">Thu Ngân</th>
                <th className="px-4 py-3">Chi Nhánh</th>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3 text-right">Tiền Đầu Ca</th>
                <th className="px-4 py-3 text-right">Doanh Thu Mặt</th>
                <th className="px-4 py-3 text-right">Chuyển Khoản</th>
                <th className="px-4 py-3 text-right">Chênh Lệch</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-extrabold text-amber-700">{s.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{s.cashier_name}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{s.branch_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-[11px] font-medium">
                    {s.start_time} &rarr; {s.end_time}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {s.opening_cash.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                    +{s.cash_sales.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-blue-700">
                    +{s.transfer_sales.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={s.variance === 0 ? 'text-slate-500' : s.variance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                      {s.variance > 0 ? `+${s.variance.toLocaleString('vi-VN')}` : s.variance.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                      Đã Đóng Ca
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
