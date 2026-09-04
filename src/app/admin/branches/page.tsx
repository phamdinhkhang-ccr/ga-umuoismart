'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Phone, Plus, Store, 
  TrendingUp, PackageCheck, ShoppingBag, 
  ArrowLeftRight, Settings, BarChart3, X, 
  CreditCard, Navigation, ShieldCheck, Check, Users, Sparkles
} from 'lucide-react';
import { Branch } from '@/types/database';
import { 
  getBranches, saveBranch, updateBranchStatus, 
  transferInventoryBetweenBranches 
} from '@/lib/store';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeModal, setActiveModal] = useState<'CONFIG' | 'TRANSFER' | 'REPORT' | null>(null);
  
  // Selected Branch state for edit/transfer/report
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form State for Add / Edit Branch Config
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    manager: '',
    status: 'ACTIVE',
    phone: '',
    capacity_per_hour: 40,
    city: 'Hà Nội',
    district: '',
    address: '',
    coverage_zones: [],
    bank_name: 'MB Bank',
    bank_account: '',
    bank_holder: ''
  });
  const [newZoneInput, setNewZoneInput] = useState('');

  // Form State for Transfer Inventory
  const [transferData, setTransferData] = useState({
    targetBranchId: '',
    itemName: 'Gà Ủ Muối Nguyên Con',
    quantity: 10,
    note: ''
  });

  // Success Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadBranches = () => {
    const list = getBranches();
    setBranches(list);
  };

  useEffect(() => {
    reloadBranches();
    const handleStoreUpdate = () => reloadBranches();
    window.addEventListener('gum_store_update', handleStoreUpdate);
    return () => window.removeEventListener('gum_store_update', handleStoreUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Status Change Handler
  const handleStatusChange = (branchId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'OVERLOADED') => {
    const updated = updateBranchStatus(branchId, newStatus);
    setBranches(updated);
    const b = updated.find(x => x.id === branchId);
    showToast(`Đã cập nhật trạng thái chi nhánh "${b?.name}" thành ${newStatus === 'ACTIVE' ? 'Đang hoạt động' : newStatus === 'PAUSED' ? 'Tạm dừng nhận đơn' : 'Quá tải'}`);
  };

  // Open Config Modal (Create or Edit)
  const openConfigModal = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setFormData({
        id: branch.id,
        name: branch.name,
        manager: branch.manager || '',
        status: branch.status || 'ACTIVE',
        phone: branch.phone || '',
        capacity_per_hour: branch.capacity_per_hour || 40,
        city: branch.city || 'Hà Nội',
        district: branch.district || '',
        address: branch.address || '',
        coverage_zones: branch.coverage_zones ? [...branch.coverage_zones] : [],
        bank_name: branch.bank_name || 'MB Bank',
        bank_account: branch.bank_account || '',
        bank_holder: branch.bank_holder || ''
      });
    } else {
      setSelectedBranch(null);
      setFormData({
        name: '',
        manager: 'Quản lý cơ sở',
        status: 'ACTIVE',
        phone: '',
        capacity_per_hour: 40,
        city: 'Hà Nội',
        district: 'Cầu Giấy',
        address: '',
        coverage_zones: ['Cầu Giấy', 'Đống Đa', 'Thanh Xuân'],
        bank_name: 'MB Bank',
        bank_account: '0988123456',
        bank_holder: 'CHU TAI KHOAN CHI NHANH'
      });
    }
    setActiveModal('CONFIG');
  };

  // Coverage Zone Tag Handlers
  const handleAddZone = () => {
    if (!newZoneInput.trim()) return;
    const currentZones = formData.coverage_zones || [];
    if (!currentZones.includes(newZoneInput.trim())) {
      setFormData({ ...formData, coverage_zones: [...currentZones, newZoneInput.trim()] });
    }
    setNewZoneInput('');
  };

  const handleRemoveZone = (zoneToRemove: string) => {
    const currentZones = formData.coverage_zones || [];
    setFormData({
      ...formData,
      coverage_zones: currentZones.filter(z => z !== zoneToRemove)
    });
  };

  // Save Branch Handler
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const updatedList = saveBranch({
      ...formData,
      name: formData.name.trim()
    } as Partial<Branch> & { name: string });

    setBranches(updatedList);
    setActiveModal(null);
    showToast(selectedBranch ? `Đã cập nhật cấu hình "${formData.name}"` : `Đã thêm chi nhánh mới "${formData.name}"`);
  };

  // Open Inventory Transfer Modal
  const openTransferModal = (branch: Branch) => {
    setSelectedBranch(branch);
    const otherBranches = branches.filter(b => b.id !== branch.id);
    setTransferData({
      targetBranchId: otherBranches.length > 0 ? otherBranches[0].id : '',
      itemName: 'Gà Ủ Muối Nguyên Con',
      quantity: 10,
      note: `Xuất điều chuyển từ ${branch.name}`
    });
    setActiveModal('TRANSFER');
  };

  // Submit Inventory Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !transferData.targetBranchId) return;

    const targetBranch = branches.find(b => b.id === transferData.targetBranchId);

    const updatedList = transferInventoryBetweenBranches(
      selectedBranch.id,
      transferData.targetBranchId,
      transferData.itemName,
      Number(transferData.quantity),
      transferData.note
    );

    setBranches(updatedList);
    setActiveModal(null);
    showToast(`Đã điều chuyển ${transferData.quantity} ${transferData.itemName} từ "${selectedBranch.name}" tới "${targetBranch?.name}"`);
  };

  // Open Branch Report Modal
  const openReportModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setActiveModal('REPORT');
  };

  // Overall Stats
  const activeCount = branches.filter(b => b.status === 'ACTIVE').length;
  const totalCapacity = branches.reduce((sum, b) => sum + (b.capacity_per_hour || 35), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce border border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Trung Tâm Điều Phối Chi Nhánh
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {branches.length} Cơ sở
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý mạng lưới chi nhánh, năng lực phục vụ, địa bàn tự động &amp; điều phối tồn kho.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          {/* Quick Stats Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {activeCount}/{branches.length} Chi nhánh đang mở ca
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Năng lực: {totalCapacity} đơn/giờ
            </span>
          </div>

          {/* Top Right Action Button */}
          <button
            onClick={() => openConfigModal()}
            className="bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Chi Nhánh Mới</span>
          </button>
        </div>
      </div>

      {/* Rich Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {branches.map((b) => {
          const isSelected = selectedBranch?.id === b.id;

          return (
            <div
              key={b.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition flex flex-col justify-between ${
                isSelected ? 'border-sky-500 ring-2 ring-sky-500/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3.5">
                {/* Header Card: Store Name, Manager & Status Dropdown */}
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-600 shrink-0" />
                      {b.name}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium mt-0.5 block flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" /> Quản lý: <strong className="text-slate-700">{b.manager || 'Chưa gán'}</strong>
                    </span>
                  </div>

                  {/* Quick Status Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      value={b.status || 'ACTIVE'}
                      onChange={(e) => handleStatusChange(b.id, e.target.value as any)}
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-xl border appearance-none pr-7 cursor-pointer outline-none transition ${
                        b.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : b.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <option value="ACTIVE">🟢 Đang hoạt động</option>
                      <option value="PAUSED">🟡 Tạm dừng nhận đơn</option>
                      <option value="OVERLOADED">🔴 Quá tải đơn</option>
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Body Card: Realtime Operational Metrics (3 Boxes) */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-sky-600" /> Đơn hôm nay
                    </span>
                    <p className="font-extrabold text-xs text-slate-800">
                      <span className="text-sky-600 font-bold">{b.orders_pending || 0}</span> / {b.orders_total_today || 0}
                    </p>
                  </div>

                  <div className="space-y-0.5 border-x border-slate-200/60 px-1">
                    <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" /> Doanh thu ngày
                    </span>
                    <p className="font-extrabold text-xs text-emerald-700">
                      {(b.revenue_today || 0).toLocaleString('vi-VN')}đ
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                      <PackageCheck className="w-3 h-3 text-amber-600" /> Tồn kho chính
                    </span>
                    <p className="font-extrabold text-xs text-amber-800">
                      {b.main_stock || 0} con
                    </p>
                  </div>
                </div>

                {/* Contact Info & Coverage Zones */}
                <div className="space-y-2 text-slate-700">
                  <p className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address}, {b.district}, {b.city}</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>Hotline: {b.phone}</span>
                    </p>
                    {b.bank_name && (
                      <p className="flex items-center gap-1 text-[11px] text-slate-500">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>{b.bank_name}: <strong className="text-slate-700 font-semibold">{b.bank_account}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* Coverage Zones Tags */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1 mb-1.5">
                      <Navigation className="w-3 h-3 text-sky-600" /> Địa bàn phụ trách (Routing):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {b.coverage_zones && b.coverage_zones.length > 0 ? (
                        b.coverage_zones.map((zone, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-100"
                          >
                            📍 {zone}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Chưa gán địa bàn</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Card: Quick Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openTransferModal(b)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>Chuyển Kho</span>
                </button>

                <button
                  onClick={() => openConfigModal(b)}
                  className="flex-1 bg-sky-50 hover:bg-sky-100 active:scale-98 text-sky-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-sky-200/60 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-sky-600" />
                  <span>Cấu Hình</span>
                </button>

                <button
                  onClick={() => openReportModal(b)}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 active:scale-98 text-emerald-700 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-emerald-200/60 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Báo Cáo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: THÊM / CẤU HÌNH CHI NHÁNH */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'CONFIG' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedBranch ? `Cấu Hình Chi Nhánh: ${selectedBranch.name}` : 'Thêm Chi Nhánh Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Cập nhật địa bàn phủ sóng &amp; tài khoản VietQR nhận tiền.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tên chi nhánh / Cơ sở *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chi Nhánh Cầu Giấy"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quản lý cơ sở</label>
                  <input
                    type="text"
                    placeholder="VD: Hoàng Văn Nam"
                    value={formData.manager || ''}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hotline chi nhánh *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 0977.888.999"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Trạng thái vận hành</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 font-medium"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động</option>
                    <option value="PAUSED">🟡 Tạm dừng nhận đơn</option>
                    <option value="OVERLOADED">🔴 Quá tải đơn</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Năng lực (đơn/giờ)</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={formData.capacity_per_hour || 40}
                    onChange={(e) => setFormData({ ...formData, capacity_per_hour: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="font-bold text-slate-700">Tỉnh / Thành phố</label>
                  <select
                    value={formData.city || 'Hà Nội'}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Quận / Huyện chính *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cầu Giấy hoặc Nam Từ Liêm"
                    value={formData.district || ''}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Địa chỉ chi tiết cơ sở *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 102 Trần Thái Tông, Dịch Vọng"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800"
                />
              </div>

              {/* Coverage Zones Tags Input */}
              <div className="space-y-2 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sky-900">
                    <Navigation className="w-3.5 h-3.5 text-sky-600" /> Địa bàn phụ trách (AI Định tuyến tự động)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Nhập quận/huyện rồi ấn Thêm</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Thêm quận/huyện phụ trách (VD: Đống Đa)"
                    value={newZoneInput}
                    onChange={(e) => setNewZoneInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddZone();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddZone}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    + Thêm Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.coverage_zones && formData.coverage_zones.length > 0 ? (
                    formData.coverage_zones.map((zone, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-sky-800 border border-sky-200 shadow-2xs"
                      >
                        📍 {zone}
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Chưa có quận/huyện nào được thêm</span>
                  )}
                </div>
              </div>

              {/* VietQR Bank Payment Info */}
              <div className="space-y-2 p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-amber-900">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Thông tin VietQR Ngân Hàng Chi Nhánh
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Ngân hàng</label>
                    <select
                      value={formData.bank_name || 'MB Bank'}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium outline-none"
                    >
                      <option value="MB Bank">MB Bank</option>
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="Techcombank">Techcombank</option>
                      <option value="VPBank">VPBank</option>
                      <option value="ACB">ACB</option>
                      <option value="BIDV">BIDV</option>
                      <option value="VietinBank">VietinBank</option>
                      <option value="TPBank">TPBank</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Số tài khoản</label>
                    <input
                      type="text"
                      placeholder="0988123456"
                      value={formData.bank_account || ''}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      placeholder="CHI NHANH CAU GIAY"
                      value={formData.bank_holder || ''}
                      onChange={(e) => setFormData({ ...formData, bank_holder: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedBranch ? 'Lưu Cấu Hình' : 'Tạo Chi Nhánh'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CHUYỂN KHO GIỮA CÁC CHI NHÁNH */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'TRANSFER' && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Điều Chuyển Kho Hàng</h3>
                  <p className="text-xs text-slate-500">Từ: <strong className="text-amber-800">{selectedBranch.name}</strong></p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Cơ sở nhận chuyển hàng *</label>
                <select
                  required
                  value={transferData.targetBranchId}
                  onChange={(e) => setTransferData({ ...transferData, targetBranchId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-semibold text-slate-800"
                >
                  {branches
                    .filter(b => b.id !== selectedBranch.id)
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name} (Tồn hiện tại: {b.main_stock || 0} con)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mặt hàng điều chuyển</label>
                  <select
                    value={transferData.itemName}
                    onChange={(e) => setTransferData({ ...transferData, itemName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                  >
                    <option value="Gà Ủ Muối Nguyên Con">Gà Ủ Muối Nguyên Con</option>
                    <option value="Gà Ủ Muối Nửa Con">Gà Ủ Muối Nửa Con</option>
                    <option value="Chân Gà Rút Xương Sốt Thái">Chân Gà Sốt Thái</option>
                    <option value="Cánh Gà Ủ Muối">Cánh Gà Ủ Muối</option>
                    <option value="Nước Chấm Thần Thánh">Nước Chấm Thần Thánh</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số lượng xuất (Con/Khay)</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedBranch.main_stock || 50}
                    required
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500">Tồn tối đa: {selectedBranch.main_stock || 0} con</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ghi chú điều chuyển</label>
                <input
                  type="text"
                  placeholder="VD: Hỗ trợ cơ sở quá tải đơn buổi trưa"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Xác Nhận Chuyển Kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: BÁO CÁO HIỆU SUẤT CHI NHÁNH */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'REPORT' && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Báo Cáo Cơ Sở</h3>
                  <p className="text-xs text-slate-500">{selectedBranch.name}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-600 text-[11px] font-semibold">Doanh Thu Gộp Hôm Nay</span>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">
                    {(selectedBranch.revenue_today || 0).toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                    +14.2% hôm qua
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">Tổng Đơn Hàng</span>
                  <p className="text-base font-extrabold text-slate-900">{selectedBranch.orders_total_today || 0} đơn</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">Đang Chờ Chế Biến</span>
                  <p className="text-base font-extrabold text-sky-700">{selectedBranch.orders_pending || 0} đơn</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Tải Năng Lực Phục Vụ</span>
                  <span className="text-sky-700">
                    {Math.round(((selectedBranch.orders_total_today || 10) / (selectedBranch.capacity_per_hour || 40)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((selectedBranch.orders_total_today || 10) / (selectedBranch.capacity_per_hour || 40)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {selectedBranch.bank_name && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Mã VietQR Chuyển Khoản Riêng:
                  </span>
                  <p className="font-semibold text-xs">
                    {selectedBranch.bank_name} - STK: <strong className="text-slate-900 font-extrabold">{selectedBranch.bank_account}</strong>
                  </p>
                  <p className="text-[11px] text-slate-600 uppercase font-medium">Chủ TK: {selectedBranch.bank_holder}</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900"
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
