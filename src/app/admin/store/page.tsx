'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Clock,
  UserCheck,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CreditCard,
  Save,
  Store,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { invalidateBranchesCache } from '@/hooks/useBranches';

interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  hotline: string;
  openingHours: string;
  managerName?: string;
  googleMapsUrl?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
}

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, active: 0, closed: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'closed'

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: 'Hà Nội',
    address: '',
    hotline: '',
    openingHours: '08:00 - 22:30',
    managerName: 'Nguyễn Văn Anh',
    googleMapsUrl: '',
    image: '',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Bank Info Tab state
  const [showBankSettings, setShowBankSettings] = useState(false);
  const [bankName, setBankName] = useState('MB Bank');
  const [bankAccount, setBankAccount] = useState('6868.8888.9999');
  const [bankOwner, setBankOwner] = useState('GA U MUOI SMART CO LTD');
  const [savingBank, setSavingBank] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (cityFilter && cityFilter !== 'ALL') params.append('city', cityFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/branches?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [search, cityFilter, statusFilter]);

  // Load Bank settings
  useEffect(() => {
    fetch('/api/settings?group=STORE')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.STORE_BANK_NAME) setBankName(data.settings.STORE_BANK_NAME);
          if (data.settings.STORE_BANK_ACCOUNT) setBankAccount(data.settings.STORE_BANK_ACCOUNT);
          if (data.settings.STORE_BANK_OWNER) setBankOwner(data.settings.STORE_BANK_OWNER);
        }
      })
      .catch(console.error);
  }, []);

  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setFormData({
      code: `cs${branches.length + 1}`,
      name: '',
      city: 'Hà Nội',
      address: '',
      hotline: '',
      openingHours: '08:00 - 22:30',
      managerName: 'Nguyễn Văn Anh',
      googleMapsUrl: '',
      image: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name: branch.name,
      city: branch.city || 'Hà Nội',
      address: branch.address,
      hotline: branch.hotline,
      openingHours: branch.openingHours || '08:00 - 22:30',
      managerName: branch.managerName || 'Quản lý cơ sở',
      googleMapsUrl: branch.googleMapsUrl || '',
      image: branch.image || '',
      isActive: branch.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (branch: Branch) => {
    setTogglingId(branch.id);
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !branch.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateBranchesCache();
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, isActive: !b.isActive } : b))
        );
        setCounts((prev) => ({
          ...prev,
          active: branch.isActive ? prev.active - 1 : prev.active + 1,
          closed: branch.isActive ? prev.closed + 1 : prev.closed - 1,
        }));
      } else {
        alert(data.message || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        invalidateBranchesCache();
        setIsModalOpen(false);
        fetchBranches();
      } else {
        alert(data.message || 'Lỗi khi lưu thông tin cơ sở');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cơ sở "${name}" không?`)) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        invalidateBranchesCache();
        fetchBranches();
      } else {
        alert(data.message || 'Lỗi khi xóa cơ sở');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  const handleMoveSort = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= branches.length) return;

    const updated = [...branches];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate sortOrders
    const reorderedItems = updated.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1,
    }));

    setBranches(updated);

    try {
      await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedItems }),
      });
    } catch (err) {
      console.error('Failed to sync reorder:', err);
    }
  };

  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          STORE_BANK_NAME: bankName,
          STORE_BANK_ACCOUNT: bankAccount,
          STORE_BANK_OWNER: bankOwner,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cập nhật tài khoản ngân hàng thương hiệu thành công!');
      } else {
        alert(data.error || 'Lỗi lưu thông tin');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. KHỐI HEADER & THÀNH PHẦN TOP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAFAF9] tracking-tight">
              Quản Lý Hệ Thống Cơ Sở / Chi Nhánh
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Store className="w-3 h-3 stroke-[2]" />
              {counts.total} Điểm bán
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Thêm, sửa, xóa, bật/tắt trạng thái hoạt động của cơ sở & tự động đồng bộ ra Landing Page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBankSettings(!showBankSettings)}
            className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xs border border-neutral-700 transition flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-amber-400 stroke-[1.5]" />
            <span>{showBankSettings ? 'Ẩn Cấu Hình Ngân Hàng' : 'Số TK Thương Hiệu'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xs shadow-md transition flex items-center gap-2 uppercase tracking-wide"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Cơ Sở Mới</span>
          </button>
        </div>
      </div>

      {/* 2. HÀNG 3 THẺ TỔNG QUAN (TOP KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Thẻ 1: Tổng số cơ sở */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-neutral-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Tổng Số Cơ Sở</p>
            <h3 className="text-2xl font-black text-[#FAFAF9] mt-1">{counts.total}</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Toàn bộ chi nhánh F&B</p>
          </div>
          <div className="w-12 h-12 rounded-xs bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Building2 className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>

        {/* Thẻ 2: Đang Hoạt Động */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-emerald-500/30 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Đang Hoạt Động</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{counts.active} điểm</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Mở cửa đón khách & nhận đơn</p>
          </div>
          <div className="w-12 h-12 rounded-xs bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>

        {/* Thẻ 3: Tạm Đóng Cửa */}
        <div className="bg-[#14171D] p-4 rounded-xs border border-rose-500/30 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Tạm Đóng Cửa</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{counts.closed} điểm</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Tạm dừng nhận đơn online/POS</p>
          </div>
          <div className="w-12 h-12 rounded-xs bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-6 h-6 stroke-[1.5]" />
          </div>
        </div>
      </div>

      {/* BANK SETTINGS COLLAPSIBLE SECTION */}
      {showBankSettings && (
        <form onSubmit={handleSaveBankInfo} className="bg-[#14171D] p-5 rounded-xs border border-amber-500/30 shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              Tài Khoản Ngân Hàng Nhận Chuyển Khoản Thương Hiệu
            </h2>
            <span className="text-[11px] text-neutral-400 italic">Dùng hiển thị QR chuyển khoản mặc định</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Tên Ngân Hàng:</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Số Tài Khoản:</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-amber-400 tracking-wider font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Chủ Tài Khoản:</label>
              <input
                type="text"
                value={bankOwner}
                onChange={(e) => setBankOwner(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] uppercase focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingBank}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xs shadow transition flex items-center justify-center gap-1.5 ml-auto"
          >
            <Save className="w-4 h-4 stroke-[2]" />
            <span>{savingBank ? 'Đang Lưu...' : 'Lưu Tài Khoản Ngân Hàng'}</span>
          </button>
        </form>
      )}

      {/* 3. THANH BỘ LỌC TÌM KIẾM ĐA CHIỀU */}
      <div className="bg-[#14171D] p-4 rounded-xs border border-neutral-800 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Ô Tìm Kiếm Text */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Tên cơ sở, địa chỉ hoặc hotline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Dropdown Thành Phố */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">🌆 Tất cả Thành Phố</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            </select>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1 bg-[#0B0D11] p-1 rounded-xs border border-neutral-800">
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition ${
                  statusFilter === ''
                    ? 'bg-neutral-800 text-amber-400 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Tất cả ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
                  statusFilter === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                    : 'text-neutral-400 hover:text-emerald-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Mở ({counts.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('closed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition flex items-center gap-1 ${
                  statusFilter === 'closed'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-xs'
                    : 'text-neutral-400 hover:text-rose-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Đóng ({counts.closed})
              </button>
            </div>

            <button
              onClick={() => {
                setSearch('');
                setCityFilter('ALL');
                setStatusFilter('');
              }}
              className="p-2 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-xs transition"
              title="Reset Bộ Lọc"
            >
              <RefreshCw className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH CƠ SỞ (FIXED PADDING FOR CƠ SỞ COLUMN) */}
      <div className="bg-[#14171D] rounded-xs border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B0D11] text-neutral-400 uppercase text-[11px] font-bold border-b border-neutral-800 tracking-wider">
                <th className="py-3.5 px-5 min-w-[260px] text-amber-400">CƠ SỞ</th>
                <th className="py-3.5 px-4 min-w-[240px]">ĐỊA CHỈ CHI TIẾT</th>
                <th className="py-3.5 px-4 min-w-[140px]">HOTLINE CƠ SỞ</th>
                <th className="py-3.5 px-4 min-w-[150px]">GIỜ HOẠT ĐỘNG</th>
                <th className="py-3.5 px-4 min-w-[150px]">QUẢN LÝ PHỤ TRÁCH</th>
                <th className="py-3.5 px-4 min-w-[150px] text-center">TRẠNG THÁI</th>
                <th className="py-3.5 px-4 min-w-[140px] text-right pr-6">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Đang tải danh sách cơ sở chi nhánh...</span>
                    </div>
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <p className="text-sm font-semibold">Chưa tìm thấy cơ sở nào phù hợp bộ lọc.</p>
                    <p className="text-xs mt-1 text-neutral-600">Thử thay đổi bộ lọc hoặc thêm cơ sở mới.</p>
                  </td>
                </tr>
              ) : (
                branches.map((b, idx) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-[#1A1D24] transition ${
                      !b.isActive ? 'opacity-75 bg-[#121418]/60' : ''
                    }`}
                  >
                    {/* CƠ SỞ */}
                    <td className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xs bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0">
                          {b.image ? (
                            <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400 font-black text-sm">
                              {b.code.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-[#FAFAF9] tracking-tight leading-snug">
                              {b.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded-xs bg-neutral-800 text-amber-400 font-mono font-bold">
                              #{b.code}
                            </span>
                            <span className="text-neutral-400">{b.city}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ĐỊA CHỈ CHI TIẾT */}
                    <td className="py-4 px-4 text-neutral-300">
                      <div className="flex items-start gap-1.5 max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="line-clamp-2 leading-relaxed">{b.address}</p>
                          {b.googleMapsUrl && (
                            <a
                              href={b.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 mt-1 underline"
                            >
                              <span>Xem trên Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* HOTLINE CƠ SỞ */}
                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{b.hotline}</span>
                      </div>
                    </td>

                    {/* GIỜ HOẠT ĐỘNG */}
                    <td className="py-4 px-4 text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{b.openingHours}</span>
                      </div>
                    </td>

                    {/* QUẢN LÝ PHỤ TRÁCH */}
                    <td className="py-4 px-4 text-neutral-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{b.managerName || 'Chưa phân công'}</span>
                      </div>
                    </td>

                    {/* TRẠNG THÁI TOGGLE */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(b)}
                        disabled={togglingId === b.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border transition shadow-xs ${
                          b.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            b.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span>{b.isActive ? '🟢 Mở Cửa' : '🔴 Tạm Đóng'}</span>
                      </button>
                    </td>

                    {/* THAO TÁC QUẢN TRỊ */}
                    <td className="py-4 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Move Sort Arrows */}
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button
                            onClick={() => handleMoveSort(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-neutral-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-500"
                            title="Lên trên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSort(idx, 'down')}
                            disabled={idx === branches.length - 1}
                            className="p-1 text-neutral-500 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-500"
                            title="Xuống dưới"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-2 bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/30 rounded-xs transition"
                          title="Sửa cơ sở"
                        >
                          <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteBranch(b.id, b.name)}
                          className="p-2 bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-500/30 rounded-xs transition"
                          title="Xóa cơ sở"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
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

      {/* 5. MODAL THÊM & SỬA CƠ SỞ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <span>{editingBranch ? 'Chỉnh Sửa Cơ Sở Chi Nhánh' : 'Thêm Cơ Sở Chi Nhánh Mới'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Mã Cơ Sở (*):</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="cs1, cs2..."
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-300 mb-1">Tên Cơ Sở Chi Nhánh (*):</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: CS Cầu Giấy - Hà Nội"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Thành Phố (*):</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Hotline Liên Hệ (*):</label>
                  <input
                    type="text"
                    required
                    value={formData.hotline}
                    onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                    placeholder="0988 123 456"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Địa Chỉ Chi Tiết (*):</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ví dụ: 123 Cầu Giấy, Q. Cầu Giấy, Hà Nội"
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Giờ Hoạt Động (*):</label>
                  <input
                    type="text"
                    required
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="08:00 - 22:30"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Quản Lý Phụ Trách:</label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="Tên quản lý cơ sở"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Google Maps URL (Tùy chọn):</label>
                <input
                  type="text"
                  value={formData.googleMapsUrl}
                  onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-300 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Link Ảnh Bìa / Avatar Cơ Sở:</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-300 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded-xs cursor-pointer"
                  />
                  <span className="font-semibold text-neutral-200">Bật Hoạt Động (Mở cửa nhận đơn)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xs shadow transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 stroke-[2]" />
                  <span>{saving ? 'Đang Lưu...' : editingBranch ? 'Lưu Thay Đổi' : 'Thêm Cơ Sở'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
