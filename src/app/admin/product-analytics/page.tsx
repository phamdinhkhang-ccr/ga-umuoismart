'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Award, ShoppingBag, UtensilsCrossed } from 'lucide-react';

const MOCK_PRODUCT_ANALYTICS = [
  {
    rank: 1,
    name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)',
    sold_qty: 148,
    unit_price: 190000,
    cost_price: 110000,
    total_gmv: 28120000,
    total_profit: 11840000,
    margin_percent: 42.1
  },
  {
    rank: 2,
    name: 'Chân Gà Rút Xương Sốt Thái',
    sold_qty: 210,
    unit_price: 65000,
    cost_price: 32000,
    total_gmv: 13650000,
    total_profit: 6930000,
    margin_percent: 50.7
  },
  {
    rank: 3,
    name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)',
    sold_qty: 95,
    unit_price: 100000,
    cost_price: 58000,
    total_gmv: 9500000,
    total_profit: 3990000,
    margin_percent: 42.0
  },
  {
    rank: 4,
    name: 'Trà Tắc Khổng Lồ',
    sold_qty: 340,
    unit_price: 20000,
    cost_price: 6000,
    total_gmv: 6800000,
    total_profit: 4760000,
    margin_percent: 70.0
  },
  {
    rank: 5,
    name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)',
    sold_qty: 62,
    unit_price: 85000,
    cost_price: 45000,
    total_gmv: 5270000,
    total_profit: 2480000,
    margin_percent: 47.0
  }
];

export default function ProductAnalyticsPage() {
  const [products] = useState(MOCK_PRODUCT_ANALYTICS);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Báo Cáo Thống Kê Sản Phẩm</h1>
            <p className="text-xs text-slate-600 mt-0.5">Xếp hạng các món gà ủ muối &amp; nước uống bán chạy nhất theo số lượng &amp; lợi nhuận gộp.</p>
          </div>
        </div>
      </div>

      {/* Top 3 Best Sellers Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {products.slice(0, 3).map((item) => (
          <div key={item.rank} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                item.rank === 1 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                item.rank === 2 ? 'bg-slate-100 text-slate-800 border-slate-200' :
                'bg-orange-50 text-orange-800 border-orange-200'
              }`}>
                🏆 TOP {item.rank}
              </span>
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{item.name}</h3>
              <p className="text-xs text-orange-600 font-bold mt-1">
                Đã bán: <span className="text-slate-900 font-extrabold">{item.sold_qty} phần</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Doanh Thu Gộp:</span>
              <span className="text-slate-900 font-extrabold">{item.total_gmv.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>
        ))}
      </div>

      {/* Full Ranking Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-orange-600" /> Bảng Phân Tích Chi Tiết Hiệu Suất Từng Món
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3 text-center">Hạng</th>
                <th className="px-4 py-3">Tên Món Ăn</th>
                <th className="px-4 py-3 text-right">Đơn Giá Bán</th>
                <th className="px-4 py-3 text-right">Giá Vốn</th>
                <th className="px-4 py-3 text-center">Số Lượng Bán</th>
                <th className="px-4 py-3 text-right">Doanh Thu Gộp</th>
                <th className="px-4 py-3 text-right">Lợi Nhuận Gộp</th>
                <th className="px-4 py-3 text-center">Tỷ Tỉ Lợi Nhuận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.rank} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3.5 text-center font-extrabold text-orange-600">#{p.rank}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-600">{p.unit_price.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-500">{p.cost_price.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900">{p.sold_qty}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900">{p.total_gmv.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">+{p.total_profit.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.margin_percent}%
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
