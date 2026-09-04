'use client';

import { useState } from 'react';
import { UtensilsCrossed, Plus, Search, CheckCircle2, XCircle, Edit3, Trash2 } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: 'm1', name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', price: 190000, cost_price: 110000, category: 'Món Gà Ủ Muối', is_available: true },
  { id: 'm2', name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', price: 100000, cost_price: 58000, category: 'Món Gà Ủ Muối', is_available: true },
  { id: 'm3', name: 'Chân Gà Rút Xương Sốt Thái', price: 65000, cost_price: 32000, category: 'Món Ăn Kèm', is_available: true },
  { id: 'm4', name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', price: 85000, cost_price: 45000, category: 'Món Gà Ủ Muối', is_available: true },
  { id: 'm5', name: 'Nước Chấm Thần Thánh Extra', price: 15000, cost_price: 4000, category: 'Gia Vị & Extra', is_available: true },
  { id: 'm6', name: 'Trà Tắc Khổng Lồ', price: 20000, cost_price: 6000, category: 'Nước Uống', is_available: true },
  { id: 'm7', name: 'Trà Đào Cam Sả', price: 30000, cost_price: 10000, category: 'Nước Uống', is_available: true }
];

export default function ProductsPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('Món Gà Ủ Muối');

  const toggleAvailability = (id: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, is_available: !p.is_available } : p));
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const newP = {
      id: `m-${Date.now()}`,
      name,
      price: Number(price) || 0,
      cost_price: Number(costPrice) || 0,
      category,
      is_available: true
    };

    setProducts([...products, newP]);
    setShowModal(false);
    setName('');
    setPrice('');
    setCostPrice('');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Quản Lý Menu Món Ăn ({products.length})
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Cấu hình thực đơn, giá bán lẻ, giá vốn &amp; bật/tắt trạng thái hết hàng.</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Món Ăn Mới</span>
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
            placeholder="Tìm theo tên món gà, nước uống, danh mục..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Tên Món Ăn</th>
                <th className="px-4 py-3">Danh Mục</th>
                <th className="px-4 py-3 text-right">Giá Bán Lẻ</th>
                <th className="px-4 py-3 text-right">Giá Vốn (Cost)</th>
                <th className="px-4 py-3 text-right">Lợi Nhuận/Đơn Vị</th>
                <th className="px-4 py-3 text-center">Trạng Thái Kho</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const profit = p.price - p.cost_price;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{p.category}</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-orange-600">{p.price.toLocaleString('vi-VN')} VNĐ</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-500">{p.cost_price.toLocaleString('vi-VN')} VNĐ</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">+{profit.toLocaleString('vi-VN')} VNĐ</td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleAvailability(p.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          p.is_available
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.is_available ? '🟢 Còn Hàng' : '🔴 Hết Hàng'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleAvailability(p.id)}
                        className="text-slate-500 hover:text-purple-600 font-semibold text-[11px] underline cursor-pointer"
                      >
                        Đổi Trạng Thái
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-purple-600" /> Thêm Món Ăn Mới Vào Menu
            </h2>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Món Ăn (*)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ví dụ: Gà Ủ Muối Nguyên Con Special"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá Bán Lẻ (VNĐ) (*)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="190000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá Vốn (Cost)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="110000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Danh Mục Món</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none"
                >
                  <option value="Món Gà Ủ Muối">Món Gà Ủ Muối</option>
                  <option value="Món Ăn Kèm">Món Ăn Kèm</option>
                  <option value="Nước Uống">Nước Uống</option>
                  <option value="Gia Vị & Extra">Gia Vị &amp; Extra</option>
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-sm"
                >
                  Thêm Món
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
