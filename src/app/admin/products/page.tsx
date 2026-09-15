'use client';

import React, { useEffect, useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  RefreshCw,
  Store,
  Tag,
  DollarSign,
  TrendingUp,
  Box
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

interface ComboItemData {
  id?: string;
  comboId?: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    unit?: string;
    costPrice?: number;
    price?: number;
  };
}

interface Product {
  id: string;
  name: string;
  type?: 'SINGLE' | 'COMBO';
  description?: string;
  price: number;
  costPrice: number;
  image?: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  categoryId?: string;
  category?: Category;
  expiryDate?: string;
  effectiveExpiryDate?: string;
  isEstimatedExpiry?: boolean;
  batchCode?: string;
  aiKeywords?: string;
  stockQuantity?: number;
  unit?: string;
  expiryStatus?: 'GOOD' | 'EXPIRING' | 'EXPIRED';
  daysLeft?: number | null;
  createdAt?: string;
  comboItems?: ComboItemData[];
}

import { useBranches } from '@/hooks/useBranches';

export default function AdminProductsPage() {
  const { branches } = useBranches();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, expiring: 0, expired: 0, good: 0 });
  const [userRole, setUserRole] = useState<string>('ADMIN');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUserRole(data.user.role);
        }
      })
      .catch(console.error);
  }, []);

  const isStaff = userRole === 'STAFF' || userRole === 'CASHIER';

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'SINGLE' | 'COMBO'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Expiry Edit State
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [quickBatchCode, setQuickBatchCode] = useState('');
  const [quickExpiryDate, setQuickExpiryDate] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'SINGLE' as 'SINGLE' | 'COMBO',
    name: '',
    description: '',
    price: '' as number | '',
    costPrice: '' as number | '',
    image: '',
    isAvailable: true,
    isBestSeller: false,
    expiryDate: '',
    batchCode: '',
    aiKeywords: '',
    stockQuantity: '' as number | '',
    unit: 'Con',
    comboItems: [] as { productId: string; quantity: number }[],
  });

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleOpenQuickEdit = (p: Product) => {
    setQuickProduct(p);
    setQuickBatchCode(p.batchCode || `LÔ-GUM-${new Date().getMonth() + 1}${new Date().getDate()}`);
    const defaultDate = p.expiryDate
      ? new Date(p.expiryDate).toISOString().slice(0, 10)
      : (p.effectiveExpiryDate
          ? new Date(p.effectiveExpiryDate).toISOString().slice(0, 10)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setQuickExpiryDate(defaultDate);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct) return;

    setSavingQuick(true);
    try {
      const res = await fetch(`/api/products/${quickProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchCode: quickBatchCode,
          expiryDate: quickExpiryDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickProduct(null);
        fetchData();
      } else {
        alert(data.message || 'Lỗi cập nhật HSD');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSavingQuick(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (expiryFilter !== 'all') params.append('expiryFilter', expiryFilter);

      const resProd = await fetch(`/api/products?${params.toString()}`);
      const dataProd = await resProd.json();

      if (dataProd.success) {
        setProducts(dataProd.products || []);
        if (dataProd.counts) setCounts(dataProd.counts);
      }
    } catch (err) {
      console.error('Failed to load menu products data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedType, expiryFilter]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      type: 'SINGLE',
      name: '',
      description: '',
      price: '',
      costPrice: '',
      image: '',
      isAvailable: true,
      isBestSeller: false,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 15 days ahead
      batchCode: `LÔ-GUM-${new Date().getMonth() + 1}${new Date().getDate()}`,
      aiKeywords: 'gà nguyên con, gà cả con, 1 gà, ga u muoi con',
      stockQuantity: 50,
      unit: 'Con',
      comboItems: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      type: product.type === 'COMBO' ? 'COMBO' : 'SINGLE',
      name: product.name,
      description: product.description || '',
      price: product.price,
      costPrice: product.costPrice || 0,
      image: product.image || '',
      isAvailable: product.isAvailable,
      isBestSeller: product.isBestSeller,
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
      batchCode: product.batchCode || '',
      aiKeywords: product.aiKeywords || '',
      stockQuantity: product.stockQuantity ?? 50,
      unit: product.unit || (product.type === 'COMBO' ? 'Combo' : 'Con'),
      comboItems: product.comboItems
        ? product.comboItems.map((ci) => ({ productId: ci.productId, quantity: ci.quantity }))
        : [],
    });
    setModalOpen(true);
  };

  const handleToggleStock = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p))
        );
      } else {
        alert(data.message || 'Lỗi khi cập nhật kho');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price === '') {
      alert('Vui lòng điền đầy đủ Tên món và Giá bán');
      return;
    }

    if (formData.type === 'COMBO' && formData.comboItems.length === 0) {
      alert('Sản phẩm Combo phải chọn ít nhất 1 sản phẩm thường làm thành phần!');
      return;
    }

    setSaving(true);
    const calculatedCost = formData.comboItems.reduce((sum, item) => {
      const child = products.find((p) => p.id === item.productId);
      return sum + (child?.costPrice || 0) * (item.quantity || 1);
    }, 0);

    const payload = {
      id: editingProduct?.id,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      price: Number(formData.price),
      costPrice: formData.type === 'COMBO' ? calculatedCost : (Number(formData.costPrice) || 0),
      image: formData.image,
      isAvailable: formData.isAvailable,
      isBestSeller: formData.isBestSeller,
      expiryDate: null,
      batchCode: null,
      aiKeywords: formData.aiKeywords || null,
      stockQuantity: formData.stockQuantity === '' ? 0 : Number(formData.stockQuantity),
      unit: formData.type === 'COMBO' ? 'Combo' : (formData.unit || 'Phần'),
      comboItems: formData.comboItems,
    };

    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchData();
      } else {
        alert(data.error || data.message || 'Lỗi lưu thông tin sản phẩm');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn không?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.message || data.error || 'Xóa món thất bại');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  // Live calculation for Combo Cost & Profit in Modal
  const calculatedComboCost = formData.comboItems.reduce((sum, item) => {
    const child = products.find((p) => p.id === item.productId);
    return sum + (child?.costPrice || 0) * (item.quantity || 1);
  }, 0);

  const previewPrice = Number(formData.price) || 0;
  const previewCost = formData.type === 'COMBO' ? calculatedComboCost : (Number(formData.costPrice) || 0);
  const previewProfit = Math.max(0, previewPrice - previewCost);
  const previewProfitMargin = previewPrice > 0 ? Math.round(((previewPrice - previewCost) / previewPrice) * 1000) / 10 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. KHỐI HEADER & THAO TÁC HÀNG ĐẦU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xs text-purple-400">
              <UtensilsCrossed className="w-5 h-5 stroke-[2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAFAF9] tracking-tight">
              Quản Lý Menu Món Ăn & Hạn Sử Dụng
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              {counts.total} Món
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Cấu hình thực đơn, theo dõi Hạn Sử Dụng (HSD), từ khóa AI nhận diện & cảnh báo sớm 5 ngày.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-amber-500 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-neutral-950 font-extrabold text-xs rounded-xs shadow-md transition flex items-center gap-2 uppercase tracking-wide shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Món Ăn Mới</span>
        </button>
      </div>

      {/* 2. HỆ THỐNG BỘ LỌC ĐA TẦNG (SEARCH & FILTER TABS) */}
      <div className="bg-[#14171D] p-4 rounded-xs border border-neutral-800 space-y-3.5 shadow-xs">
        {/* Hàng 1: Search & Branch Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Tìm tên món, mã lô (LÔ-GUM-0409), từ khóa AI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">🏪 Tất cả chi nhánh (Toàn hệ thống)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch('');
                setBranchId('ALL');
                setExpiryFilter('all');
                setSelectedType('all');
              }}
              className="p-2 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-xs transition shrink-0"
              title="Reset Bộ Lọc"
            >
              <RefreshCw className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Hàng 2: Expiry Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/80 pt-3">
          <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1 mr-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            ⌛ Lọc Theo Hạn Sử Dụng:
          </span>

          <button
            onClick={() => setExpiryFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition ${
              expiryFilter === 'all'
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Tất cả ({counts.total})
          </button>

          <button
            onClick={() => setExpiryFilter('expiring')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
              expiryFilter === 'expiring'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            ⚠️ Sắp hết hạn (≤ 5 ngày) ({counts.expiring})
          </button>

          <button
            onClick={() => setExpiryFilter('expired')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
              expiryFilter === 'expired'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ⛔ Đã hết hạn ({counts.expired})
          </button>

          <button
            onClick={() => setExpiryFilter('good')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
              expiryFilter === 'good'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 Còn hạn tốt ({counts.good})
          </button>
        </div>

        {/* Hàng 3: Product Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/80 pt-3">
          <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            🏷️ Lọc Theo Loại Món:
          </span>

          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition ${
              selectedType === 'all'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Tất Cả Món ({products.length})
          </button>

          <button
            onClick={() => setSelectedType('SINGLE')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
              selectedType === 'SINGLE'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🍗 Sản Phẩm Thường
          </button>

          <button
            onClick={() => setSelectedType('COMBO')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
              selectedType === 'COMBO'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🍱 Sản Phẩm Combo
          </button>
        </div>
      </div>

      {/* 3. BẢNG QUẢN LÝ SẢN PHẨM & HẠN DÙNG (PRODUCTS TABLE) */}
      <div className="bg-[#14171D] rounded-xs border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B0D11] text-neutral-400 uppercase text-[11px] font-bold border-b border-neutral-800 tracking-wider">
                <th className="py-3.5 px-4 min-w-[260px] text-amber-400">HÌNH ẢNH & MÓN ĂN</th>
                <th className="py-3.5 px-4 min-w-[140px]">LOẠI SẢN PHẨM</th>
                <th className="py-3.5 px-3 text-right min-w-[110px]">GIÁ BÁN LẺ</th>
                {!isStaff && <th className="py-3.5 px-3 text-right min-w-[100px]">GIÁ VỐN</th>}
                {!isStaff && <th className="py-3.5 px-4 text-center min-w-[120px] text-emerald-400">LỢI NHUẬN</th>}
                <th className="py-3.5 px-4 text-center min-w-[120px]">TRẠNG THÁI KHO</th>
                <th className="py-3.5 px-4 text-right min-w-[110px] pr-6">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Đang tải thực đơn món ăn...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <p className="text-sm font-semibold text-neutral-400">Không tìm thấy món ăn nào phù hợp bộ lọc.</p>
                    <p className="text-xs text-neutral-600 mt-1">Thử đổi từ khóa hoặc chọn "Tất cả món".</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const profit = p.price - (p.costPrice || 0);
                  const marginPct = p.price > 0 ? Math.round((profit / p.price) * 1000) / 10 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#1A1D24] transition">
                      {/* HÌNH ẢNH & MÓN ĂN */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80'}
                            alt={p.name}
                            className="w-12 h-12 rounded-xs object-cover border border-neutral-700 shrink-0"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-sm text-[#FAFAF9] tracking-tight leading-snug">
                                {p.name}
                              </span>
                              {p.type === 'COMBO' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-xs bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  🍱 COMBO
                                </span>
                              )}
                              {p.isBestSeller && (
                                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-xs bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                  🔥 BEST
                                </span>
                              )}
                            </div>
                            {p.type === 'COMBO' && p.comboItems && p.comboItems.length > 0 && (
                              <p className="text-[10px] text-purple-300/90 font-mono">
                                <span className="font-bold text-neutral-400">Gồm:</span>{' '}
                                {p.comboItems.map((ci) => `${ci.quantity}x ${ci.product?.name || 'Món'}`).join(' + ')}
                              </p>
                            )}
                            {p.aiKeywords && (
                              <p className="text-[11px] text-purple-300 font-mono flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                                <span>AI tags: {p.aiKeywords}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* LOẠI SẢN PHẨM */}
                      <td className="py-3.5 px-4">
                        {p.type === 'COMBO' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            🍱 Combo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            🍗 Món Thường
                          </span>
                        )}
                      </td>

                      {/* GIÁ BÁN LẺ */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-sm text-amber-400">
                        {p.price.toLocaleString('vi-VN')} đ
                      </td>

                      {/* GIÁ VỐN */}
                      {!isStaff && (
                        <td className="py-3.5 px-3 text-right text-xs font-medium text-neutral-400">
                          {(p.costPrice || 0).toLocaleString('vi-VN')} đ
                        </td>
                      )}

                      {/* LỢI NHUẬN */}
                      {!isStaff && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-xs text-emerald-400 block">
                              +{profit.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-block">
                              {marginPct}% lãi
                            </span>
                          </div>
                        </td>
                      )}

                      {/* TRẠNG THÁI KHO TOGGLE & SỐ LƯỢNG TỒN */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1">
                          <button
                            onClick={() => handleToggleStock(p)}
                            disabled={togglingId === p.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border transition shadow-xs ${
                              p.isAvailable
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                p.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                              }`}
                            ></span>
                            <span>{p.isAvailable ? '🟢 Còn' : '⚪ Hết'}</span>
                          </button>
                          <p className="text-[11px] font-mono text-neutral-400 font-semibold">
                            Tồn: <span className="text-amber-400 font-extrabold">{p.stockQuantity ?? 50}</span> {p.unit || 'Con'}
                          </p>
                        </div>
                      </td>

                      {/* HÀNH ĐỘNG */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-2 bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/30 rounded-xs transition"
                            title="Sửa món"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-2 bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-500/30 rounded-xs transition"
                            title="Xóa món"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL THÊM / CHỈNH SỬA MÓN ĂN (PRODUCT MODAL) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                <span>{editingProduct ? 'Chỉnh Sửa Món Ăn & Hạn Dùng' : 'Thêm Món Ăn Mới Vào Thực Đơn'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-200 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* 1. PRODUCT TYPE TOGGLE SWITCH (CỤM ĐỔI LOẠI SẢN PHẨM) */}
              <div className="bg-[#0B0D11] p-3 rounded-xs border border-neutral-800 space-y-1.5">
                <label className="block font-extrabold text-amber-400 text-xs">Loại Sản Phẩm (*):</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SINGLE' })}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xs border font-extrabold text-xs transition cursor-pointer ${
                      formData.type === 'SINGLE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md'
                        : 'bg-[#14171D] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-sm">🍗</span>
                    <span>Sản Phẩm Thường</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'COMBO' })}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xs border font-extrabold text-xs transition cursor-pointer ${
                      formData.type === 'COMBO'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-md'
                        : 'bg-[#14171D] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-sm">🍱</span>
                    <span>Sản Phẩm Combo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Tên Món Ăn (*):</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.type === 'COMBO' ? 'Ví dụ: Combo Thịnh Vượng (1 Gà + 1 Chân gà + 1 Sốt)' : 'Ví dụ: Gà Ủ Muối Hoa Tiêu Nguyên Con'}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Link Ảnh Thumbnail:</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-300 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. COMBO ITEMS SELECTOR GRID (BẢNG TÍCH CHỌN THÀNH PHẦN COMBO) */}
              {formData.type === 'COMBO' && (
                <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-purple-300 text-xs flex items-center gap-1.5">
                      <span>🍱 Danh Sách Thành Phần Combo (*):</span>
                    </label>
                    <span className="text-[11px] font-mono text-purple-400 font-bold">
                      Đã chọn {formData.comboItems.length} món thành phần
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-light">Tích chọn các món thường có sẵn trong thực đơn và chỉnh số lượng tương ứng trong 1 suất Combo:</p>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-neutral-800 rounded-xs p-2 bg-[#14171D]">
                    {products
                      .filter((p) => p.type !== 'COMBO' && (!editingProduct || p.id !== editingProduct.id))
                      .map((singleP) => {
                        const selectedItem = formData.comboItems.find((ci) => ci.productId === singleP.id);
                        const isSelected = !!selectedItem;

                        const toggleSelect = () => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              comboItems: formData.comboItems.filter((ci) => ci.productId !== singleP.id),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              comboItems: [...formData.comboItems, { productId: singleP.id, quantity: 1 }],
                            });
                          }
                        };

                        const updateQty = (delta: number) => {
                          setFormData({
                            ...formData,
                            comboItems: formData.comboItems.map((ci) => {
                              if (ci.productId === singleP.id) {
                                return { ...ci, quantity: Math.max(1, ci.quantity + delta) };
                              }
                              return ci;
                            }),
                          });
                        };

                        return (
                          <div
                            key={singleP.id}
                            className={`flex items-center justify-between p-2 rounded-xs border transition ${
                              isSelected ? 'bg-purple-950/40 border-purple-500/50' : 'bg-[#0B0D11] border-neutral-800 opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={toggleSelect}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={toggleSelect}
                                className="w-4 h-4 accent-purple-500 cursor-pointer"
                              />
                              <div>
                                <p className="font-bold text-xs text-[#FAFAF9]">
                                  {singleP.name} <span className="text-neutral-400 font-normal">({singleP.unit || 'Con'})</span>
                                </p>
                                <p className="text-[10px] text-neutral-400 font-mono">
                                  Giá vốn gốc: {(singleP.costPrice || 0).toLocaleString('vi-VN')} đ
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-1.5 bg-[#14171D] px-2 py-1 rounded-xs border border-purple-500/30">
                                <button
                                  type="button"
                                  onClick={() => updateQty(-1)}
                                  className="w-5 h-5 flex items-center justify-center text-xs font-black bg-neutral-800 hover:bg-neutral-700 text-purple-300 rounded-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-mono font-extrabold text-xs text-amber-300">
                                  {selectedItem.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(1)}
                                  className="w-5 h-5 flex items-center justify-center text-xs font-black bg-neutral-800 hover:bg-neutral-700 text-purple-300 rounded-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 3. Pricing & Gross Profit Live Preview */}
              <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-neutral-800 space-y-3">
                <div className={`grid ${formData.type === 'COMBO' || isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  <div>
                    <label className="block font-semibold text-amber-400 mb-1">
                      {formData.type === 'COMBO' ? 'Giá Bán Lẻ Combo (VNĐ) (*):' : 'Giá Bán Lẻ (VNĐ) (*):'}
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder={formData.type === 'COMBO' ? '320000' : '190000'}
                      className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  {/* ẨN HOÀN TOÀN Ô GIÁ VỐN NHẬP KHO NẾU LÀ COMBO */}
                  {formData.type === 'SINGLE' && !isStaff && (
                    <div>
                      <label className="block font-semibold text-neutral-300 mb-1">Giá Vốn Nhập Kho (VNĐ):</label>
                      <input
                        type="number"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="110000"
                        className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono text-neutral-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Live Cost calculation for Combo */}
                {formData.type === 'COMBO' && !isStaff && (
                  <div className="p-2.5 bg-purple-950/30 border border-purple-500/30 rounded-xs flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-semibold">Tổng Giá Vốn Combo (Tham chiếu):</span>
                    <span className="font-extrabold text-amber-300 font-mono">
                      {calculatedComboCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}

                {/* Profit Live calculation display */}
                {!isStaff && (
                  <div className="flex items-center justify-between border-t border-neutral-800 pt-2 text-xs">
                    <span className="text-neutral-400">Xem trước Lợi Nhuận Gộp:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-400 font-mono">
                        +{previewProfit.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {previewProfitMargin}% Lãi
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Khung Tồn Kho Gọn Gàng (Stock Quantity Only) */}
              <div className="bg-[#0B0D11] p-3.5 rounded-xs border border-neutral-800 space-y-2.5">
                <div>
                  <label className="block font-semibold text-amber-400 mb-1">
                    Số Lượng Tồn Kho (*):
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stockQuantity: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="50"
                    className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xs font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 bg-purple-950/30 border border-purple-500/30 rounded-xs text-[11px] text-purple-300 font-medium leading-relaxed flex items-center gap-1.5">
                  <span>💡 Thay đổi số lượng tại đây sẽ tự động cập nhật số dư kho của sản phẩm.</span>
                </div>
              </div>

              {/* AI Keywords */}
              <div>
                <label className="block font-semibold text-purple-300 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Từ Khóa AI Nhận Diện (Chatbot & Parse Order):</span>
                </label>
                <input
                  type="text"
                  value={formData.aiKeywords}
                  onChange={(e) => setFormData({ ...formData, aiKeywords: e.target.value })}
                  placeholder="gà nguyên con, gà cả con, 1 gà, ga u muoi con"
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-purple-300 focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Phân cách các từ khóa đồng nghĩa bằng dấu phẩy. AI sẽ tự động phân tích đơn từ tin nhắn tin nhắn lóng/viết tắt của khách.
                </span>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded-xs cursor-pointer"
                  />
                  <span className="font-semibold text-neutral-200">Còn hàng tại cơ sở (Phục vụ khách)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded-xs cursor-pointer"
                  />
                  <span className="font-semibold text-amber-400">🔥 Đánh dấu món Nổi bật / Bán chạy (Best Seller)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 via-amber-500 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-neutral-950 font-extrabold rounded-xs shadow transition"
                >
                  {saving ? 'Đang Lưu...' : editingProduct ? 'Lưu Thay Đổi' : 'Thêm Món Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EXPIRY EDIT MODAL (SỬA NHANH HSD & MÃ LÔ) */}
      {quickProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs text-[#FAFAF9]">
            <button
              onClick={() => setQuickProduct(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-xs cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-[#FAFAF9] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Cập Nhật Nhanh Hạn Sử Dụng & Mã Lô
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Món ăn: <strong className="text-amber-400">{quickProduct.name}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Mã Lô Sản Xuất (Batch Code)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: LÔ-GUM-4169"
                  value={quickBatchCode}
                  onChange={(e) => setQuickBatchCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs font-mono font-bold text-amber-400 text-xs focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Ngày Hết Hạn Thực Tế (HSD)</label>
                <input
                  type="date"
                  required
                  value={quickExpiryDate}
                  onChange={(e) => setQuickExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickProduct(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingQuick}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xs shadow-md transition-colors cursor-pointer"
                >
                  {savingQuick ? 'ĐANG LƯU...' : 'XÁC NHẬN CẬP NHẬT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
