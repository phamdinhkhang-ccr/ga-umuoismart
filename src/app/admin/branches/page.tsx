'use client';

import { useState } from 'react';
import { Building2, MapPin, Phone, Plus, Store, CheckCircle2, Edit3 } from 'lucide-react';

const MOCK_BRANCHES = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'Chi Nhánh Gà Ủ Muối Quận 1',
    address: '123 Lê Lợi, Phường Bến Thành',
    district: 'Quận 1',
    city: 'Hồ Chí Minh',
    phone: '02838111111',
    status: 'ACTIVE',
    manager: 'Lê Văn Cơ Sở 1'
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Chi Nhánh Gà Ủ Muối Quận 3',
    address: '456 Điện Biên Phủ, Phường 3',
    district: 'Quận 3',
    city: 'Hồ Chí Minh',
    phone: '02838222222',
    status: 'ACTIVE',
    manager: 'Phạm Thị Cơ Sở 2'
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    name: 'Chi Nhánh Gà Ủ Muối Bình Thạnh',
    address: '789 Xô Viết Nghệ Tĩnh',
    district: 'Quận Bình Thạnh',
    city: 'Hồ Chí Minh',
    phone: '02838333333',
    status: 'ACTIVE',
    manager: 'Nguyễn Văn Bếp'
  },
  {
    id: 'b5555555-5555-5555-5555-555555555555',
    name: 'Chi Nhánh Gà Ủ Muối Hà Nội (Thanh Trì / Cầu Giấy)',
    address: 'Số 9 Thượng Phúc, Đại Thanh',
    district: 'Huyện Thanh Trì',
    city: 'Hà Nội',
    phone: '02438555555',
    status: 'ACTIVE',
    manager: 'Hoàng Văn Hà Nội'
  }
];

export default function BranchesPage() {
  const [branches] = useState(MOCK_BRANCHES);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Cửa Hàng &amp; Chi Nhánh ({branches.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Danh sách các cơ sở phụ trách chế biến &amp; địa bàn giao hàng phủ sóng.</p>
          </div>
        </div>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {branches.map((b) => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600" /> {b.name}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Quản lý: {b.manager}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đang Hoạt Động
              </span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-slate-700">
              <p className="flex items-center gap-2 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{b.address}, {b.district}, {b.city}</span>
              </p>
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Hotline: {b.phone}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
