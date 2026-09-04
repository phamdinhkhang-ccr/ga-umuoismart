'use client';

import { useState } from 'react';
import { UserCheck, Search, Phone, MapPin, Award, ShoppingBag, DollarSign } from 'lucide-react';

const MOCK_CUSTOMERS = [
  {
    id: 'c1',
    name: 'Nguyễn Văn Nam',
    phone: '0901234567',
    address: '123 Lê Lợi, Phường Bến Thành, Quận 1',
    total_orders: 12,
    total_spend: 4680000,
    tier: 'VIP',
    last_order: '2026-09-04 11:30'
  },
  {
    id: 'c2',
    name: 'Anh Tuấn',
    phone: '0988776655',
    address: '456 Điện Biên Phủ, Phường 3, Quận 3',
    total_orders: 5,
    total_spend: 1250000,
    tier: 'Thân Thiết',
    last_order: '2026-09-03 14:15'
  },
  {
    id: 'c3',
    name: 'Chị Mai',
    phone: '0912345678',
    address: '789 Xô Viết Nghệ Tĩnh, Quận Bình Thạnh',
    total_orders: 8,
    total_spend: 2980000,
    tier: 'VIP',
    last_order: '2026-09-03 18:45'
  },
  {
    id: 'c4',
    name: 'Anh Hoàng (Hà Nội)',
    phone: '0889018221',
    address: 'Mipec 1, Hà Đông, Hà Nội',
    total_orders: 2,
    total_spend: 580000,
    tier: 'Khách Mới',
    last_order: '2026-09-04 16:20'
  }
];

export default function CustomersPage() {
  const [customers] = useState(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Danh Bạ Khách Hàng CRM ({customers.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Tự động lưu lịch sử mua hàng, tổng chi tiêu tích lũy &amp; xếp hạng phân loại khách hàng.</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo SĐT, tên khách hàng, địa chỉ..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Tên Khách Hàng</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Địa Chỉ Giao Mặc Định</th>
                <th className="px-4 py-3 text-center">Số Đơn Hàng</th>
                <th className="px-4 py-3 text-right">Chi Tiêu Tích Lũy</th>
                <th className="px-4 py-3 text-center">Phân Loại VIP</th>
                <th className="px-4 py-3 text-center">Lần Mua Gần Nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 font-bold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3.5 font-semibold text-emerald-700">{c.phone}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate font-medium">{c.address}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900">{c.total_orders} đơn</td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-orange-600">
                    {c.total_spend.toLocaleString('vi-VN')} VNĐ
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      c.tier === 'VIP' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      c.tier === 'Thân Thiết' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {c.tier === 'VIP' ? '⭐ VIP' : c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500 text-[11px] font-medium">{c.last_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
