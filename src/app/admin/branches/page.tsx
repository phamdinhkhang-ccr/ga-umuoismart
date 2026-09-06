'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, MapPin, Phone, Plus, Store, 
  TrendingUp, PackageCheck, ShoppingBag, 
  ArrowLeftRight, Settings, BarChart3, X, 
  CreditCard, Navigation, ShieldCheck, Check, Users, Sparkles,
  Edit3, Trash2, Power, ExternalLink, Clock, Search, AlertTriangle, AlertCircle, RotateCcw
} from 'lucide-react';
import { Branch } from '@/types/database';
import { 
  getBranches, saveBranch, updateBranchStatus, toggleBranchActive, deleteBranch,
  transferInventoryBetweenBranches, getCmsSettings, saveCmsSettings
} from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');

  // Modals state
  const [activeModal, setActiveModal] = useState<'CONFIG' | 'TRANSFER' | 'DELETE_CONFIRM' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form State for Add / Edit Branch
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    address: '',
    phone: '',
    hours: '08:00 - 22:30',
    display_order: 1,
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    manager: 'Quản lý cơ sở',
    status: 'ACTIVE',
    is_active: true,
    maps_url: '',
    bank_name: 'MB Bank',
    bank_account: '0988123456',
    bank_holder: ''
  });

  // Form State for Transfer Inventory
  const [transferData, setTransferData] = useState({
    targetBranchId: '',
    itemName: 'Gà Ủ Muối Nguyên Con',
    quantity: 10,
    note: ''
  });

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to Supabase Storefront Settings
  const syncBranchesToSupabase = async (branchList: Branch[]) => {
    try {
      const cmsBranches = branchList.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        hours: b.hours || '08:00 - 22:00',
        maps_url: b.maps_url || `https://maps.google.com/?q=${encodeURIComponent(b.address || b.name)}`,
        is_active: b.is_active !== false && b.status !== 'PAUSED',
        district: b.district,
        city: b.city,
        latitude: b.latitude,
        longitude: b.longitude
      }));

      // 1. Update CMS settings local
      saveCmsSettings({ branches: cmsBranches });

      // 2. Fetch current config and update Supabase
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('id', 'default_config')
        .maybeSingle();

      const existingConfig = data?.data || {};
      const updatedConfig = {
        ...existingConfig,
        branches: cmsBranches
      };

      await supabase.from('storefront_settings').upsert({
        id: 'default_config',
        data: updatedConfig,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Lỗi đồng bộ Supabase branches:', e);
    }
  };

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

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Truy Cập Bị Từ Chối</h2>
          <p className="text-xs text-slate-600">Trang quản lý chi nhánh chỉ dành riêng cho Admin Tối Cao.</p>
        </div>
      </div>
    );
  }

  // Filtered Branches List
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (b.name || '').toLowerCase().includes(q);
      const addrMatch = (b.address || '').toLowerCase().includes(q);
      const phoneMatch = (b.phone || '').includes(q);
      const distMatch = (b.district || '').toLowerCase().includes(q);

      const matchSearch = !q || nameMatch || addrMatch || phoneMatch || distMatch;
      const matchCity = selectedCity === 'ALL' || b.city === selectedCity;
      
      const isActive = b.is_active !== false && b.status !== 'PAUSED';
      const matchStatus = 
        statusTab === 'ALL' || 
        (statusTab === 'ACTIVE' && isActive) || 
        (statusTab === 'PAUSED' && !isActive);

      return matchSearch && matchCity && matchStatus;
    }).sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
  }, [branches, searchQuery, selectedCity, statusTab]);

  // Toggle Branch Active State
  const handleToggleActive = async (branch: Branch) => {
    const newActiveState = !(branch.is_active !== false && branch.status !== 'PAUSED');
    const updated = toggleBranchActive(branch.id, newActiveState);
    setBranches(updated);
    await syncBranchesToSupabase(updated);
    showToast(`Đã ${newActiveState ? 'BẬT' : 'TẮT'} trạng thái hoạt động của cơ sở "${branch.name}"`);
  };

  // Open Add / Edit Modal
  const openConfigModal = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setFormData({
        id: branch.id,
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        hours: branch.hours || '08:00 - 22:30',
        display_order: branch.display_order || 1,
        city: branch.city || 'Hà Nội',
        district: branch.district || 'Cầu Giấy',
        manager: branch.manager || 'Quản lý cơ sở',
        status: branch.status || 'ACTIVE',
        is_active: branch.is_active !== false && branch.status !== 'PAUSED',
        maps_url: branch.maps_url || '',
        bank_name: branch.bank_name || 'MB Bank',
        bank_account: branch.bank_account || '',
        bank_holder: branch.bank_holder || '',
        latitude: branch.latitude,
        longitude: branch.longitude
      });
    } else {
      setSelectedBranch(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        hours: '08:00 - 22:30',
        display_order: branches.length + 1,
        city: 'Hà Nội',
        district: 'Cầu Giấy',
        manager: 'Quản lý cơ sở',
        status: 'ACTIVE',
        is_active: true,
        maps_url: '',
        bank_name: 'MB Bank',
        bank_account: '0988123456',
        bank_holder: 'GA U MUOI SMART',
        latitude: undefined,
        longitude: undefined
      });
    }
    setActiveModal('CONFIG');
  };

  // Submit Add / Edit Form
  const handleSaveBranchForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.address?.trim()) {
      showToast('⚠️ Vui lòng điền đầy đủ Tên cơ sở và Địa chỉ chi tiết!');
      return;
    }

    const updatedList = saveBranch({
      ...formData,
      name: formData.name.trim(),
      address: formData.address.trim(),
      phone: formData.phone?.trim() || '0988.xxx.xxx',
      hours: formData.hours?.trim() || '08:00 - 22:00',
      display_order: Number(formData.display_order || 1),
      is_active: formData.is_active ?? true,
      status: formData.is_active ? 'ACTIVE' : 'PAUSED',
      latitude: formData.latitude !== undefined && (formData.latitude as any) !== '' ? Number(formData.latitude) : undefined,
      longitude: formData.longitude !== undefined && (formData.longitude as any) !== '' ? Number(formData.longitude) : undefined
    } as Partial<Branch> & { name: string });

    setBranches(updatedList);
    await syncBranchesToSupabase(updatedList);
    setActiveModal(null);
    showToast(selectedBranch ? `Đã cập nhật thông tin cơ sở "${formData.name}"` : `Đã thêm thành công cơ sở mới "${formData.name}"`);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setActiveModal('DELETE_CONFIRM');
  };

  // Confirm Delete Branch
  const handleConfirmDelete = async () => {
    if (!selectedBranch) return;
    const updatedList = deleteBranch(selectedBranch.id);
    setBranches(updatedList);
    await syncBranchesToSupabase(updatedList);
    setActiveModal(null);
    showToast(`Đã xóa cơ sở "${selectedBranch.name}" khỏi hệ thống!`);
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

  // Stats
  const totalBranches = branches.length;
  const activeCount = branches.filter(b => b.is_active !== false && b.status !== 'PAUSED').length;
  const pausedCount = totalBranches - activeCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-bounce border border-slate-700">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Banner & Quick Action Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-200 shrink-0">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  Quản Lý Hệ Thống Cơ Sở / Chi Nhánh
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    {totalBranches} Điểm bán
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thêm, sửa, xóa, bật/tắt trạng thái hoạt động của cơ sở &amp; tự động đồng bộ ra Landing Page.
                </p>
              </div>
            </div>

            {/* Prominent Orange "+ Thêm Cơ Sở Mới" Button */}
            <button
              onClick={() => openConfigModal()}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
              <span>+ Thêm Cơ Sở Mới</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Tổng Số Cơ Sở:</span>
              </div>
              <span className="font-extrabold text-slate-900 text-sm">{totalBranches}</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Power className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Đang Hoạt Động:</span>
              </div>
              <span className="font-extrabold text-emerald-700 text-sm">{activeCount} điểm</span>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800">Tạm Đóng Cửa:</span>
              </div>
              <span className="font-extrabold text-amber-700 text-sm">{pausedCount} điểm</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên cơ sở, địa chỉ, số điện thoại hotline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-orange-500 transition"
              />
            </div>

            {/* City Select Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả Thành phố</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Hồ Chí Minh">Hồ Chí Minh</option>
              </select>
            </div>

            {/* Status Tabs Filter */}
            <div className="sm:col-span-3 flex bg-slate-100 p-1 rounded-xl font-semibold text-slate-600">
              <button
                onClick={() => setStatusTab('ALL')}
                className={`flex-1 py-1 text-center rounded-lg transition cursor-pointer text-[11px] ${
                  statusTab === 'ALL' ? 'bg-white text-orange-600 shadow-2xs font-bold' : ''
                }`}
              >
                Tất cả ({branches.length})
              </button>
              <button
                onClick={() => setStatusTab('ACTIVE')}
                className={`flex-1 py-1 text-center rounded-lg transition cursor-pointer text-[11px] ${
                  statusTab === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-2xs font-bold' : ''
                }`}
              >
                🟢 Mở ({activeCount})
              </button>
              <button
                onClick={() => setStatusTab('PAUSED')}
                className={`flex-1 py-1 text-center rounded-lg transition cursor-pointer text-[11px] ${
                  statusTab === 'PAUSED' ? 'bg-white text-amber-600 shadow-2xs font-bold' : ''
                }`}
              >
                🔴 Đóng ({pausedCount})
              </button>
            </div>

          </div>
        </div>

        {/* Branches Data Table / Cards (Responsive) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 text-center">Thứ tự</th>
                  <th className="p-3.5">Tên Cơ Sở</th>
                  <th className="p-3.5">Địa Chỉ Chi Tiết</th>
                  <th className="p-3.5">Hotline Cơ Sở</th>
                  <th className="p-3.5">Giờ Hoạt Động</th>
                  <th className="p-3.5">Quản Lý Phụ Trách</th>
                  <th className="p-3.5 text-center">Trạng Thái</th>
                  <th className="p-3.5 text-center">Thao Tác Quản Trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Không tìm thấy cơ sở nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((b, idx) => {
                    const isActive = b.is_active !== false && b.status !== 'PAUSED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        
                        {/* Display Order */}
                        <td className="p-3.5 text-center font-extrabold text-slate-400">
                          #{b.display_order || idx + 1}
                        </td>

                        {/* Name */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>{b.name}</span>
                          </div>
                        </td>

                        {/* Address */}
                        <td className="p-3.5 text-slate-600 max-w-xs truncate" title={b.address}>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{b.address}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <a 
                            href={`tel:${(b.phone || '').replace(/\s+/g, '')}`} 
                            className="flex items-center space-x-1 text-slate-900 hover:text-orange-600 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{b.phone || '0988.xxx.xxx'}</span>
                          </a>
                        </td>

                        {/* Operating Hours */}
                        <td className="p-3.5 font-semibold text-slate-700">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{b.hours || '08:00 - 22:00'}</span>
                          </div>
                        </td>

                        {/* Manager */}
                        <td className="p-3.5 font-medium text-slate-700">
                          {b.manager || 'Quản lý cơ sở'}
                        </td>

                        {/* Active Toggle Status Button */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleActive(b)}
                            title="Click để Bật / Tắt trạng thái hoạt động"
                            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border cursor-pointer transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <Power className={`w-3 h-3 ${isActive ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span>{isActive ? '🟢 Đang hoạt động' : '🔴 Tạm đóng cửa'}</span>
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => openConfigModal(b)}
                              title="Sửa thông tin cơ sở"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer border border-blue-200"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Google Maps External Link */}
                            {b.maps_url && (
                              <a
                                href={b.maps_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Xem chỉ đường Google Maps"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer border border-slate-200"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            {/* Inventory Transfer Button */}
                            <button
                              onClick={() => openTransferModal(b)}
                              title="Điều chuyển hàng kho"
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition cursor-pointer border border-purple-200"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>

                            {/* Delete Button (Super Admin) */}
                            <button
                              onClick={() => openDeleteModal(b)}
                              title="Xóa cơ sở"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer border border-rose-200"
                            >
                              <Trash2 className="w-4 h-4" />
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

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MODAL THÊM & SỬA THÔNG TIN CƠ SỞ (ADD / EDIT FORM MODAL) */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'CONFIG' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                {selectedBranch ? `Chỉnh Sửa Cơ Sở: ${selectedBranch.name}` : 'Thêm Cơ Sở Mới Vào Hệ Thống'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveBranchForm} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Tên Cơ Sở / Chi Nhánh (*)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Cơ Sở 1 - Cầu Giấy, Cơ Sở Vin Smart City..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Địa Chỉ Giao Hàng Chi Tiết (*)</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ví dụ: Tòa S2.01 Vin Smart City, Phường Tây Mỗ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Hotline Cơ Sở (*)</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ví dụ: 0984.263.340"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Thời Gian Mở Cửa (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="Ví dụ: 08:00 - 22:30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Thứ Tự Hiển Thị</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    placeholder="1, 2, 3..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Thành Phố</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none cursor-pointer"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Quận / Huyện</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Cầu Giấy, Quận 1..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Đường Dẫn Google Maps (Chỉ đường)</label>
                <input
                  type="text"
                  value={formData.maps_url}
                  onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium outline-none"
                />
              </div>

              {/* Tọa độ Định Vị GPS (Haversine Distance) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2">
                <div className="space-y-0.5">
                  <label className="block text-slate-900 font-extrabold text-[11px] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-orange-600" />
                    <span>Tọa Độ Định Vị GPS (Dùng để đo khoảng cách Haversine tới khách)</span>
                  </label>
                  <p className="text-[10px] text-amber-800 font-semibold">
                    💡 Mở Google Maps, click chuột phải vào vị trí cơ sở để copy số Tọa độ dán vào đây.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold text-[11px]">Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value as any })}
                      placeholder="Ví dụ: 21.0028"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold text-[11px]">Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value as any })}
                      placeholder="Ví dụ: 105.7485"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">Quản Lý Phụ Trách</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Họ tên quản lý chi nhánh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <span className="font-extrabold text-slate-900 text-xs">
                    🟢 Cho phép cơ sở hoạt động &amp; đồng bộ hiển thị ngoài Trang Chủ (Landing Page)
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-sm transition cursor-pointer"
                >
                  Lưu Thông Tin Cơ Sở
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MODAL XÁC NHẬN XÓA CƠ SỞ (DELETE CONFIRMATION MODAL) */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'DELETE_CONFIRM' && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-slate-900 text-base">Xác Nhận Xóa Cơ Sở</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa cơ sở <strong className="text-slate-900 font-bold">"{selectedBranch.name}"</strong> khỏi hệ thống? 
              Hành động này sẽ xóa cơ sở khỏi danh sách quản trị và trang chủ.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 text-white font-extrabold rounded-xl hover:bg-rose-700 shadow-sm transition"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MODAL ĐIỀU CHUYỂN HÀNG KHO (INVENTORY TRANSFER MODAL) */}
      {/* ------------------------------------------------------------- */}
      {activeModal === 'TRANSFER' && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                Điều Chuyển Kho Từ "{selectedBranch.name}"
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Chọn Chi Nhánh Nhận Hàng (*)</label>
                <select
                  value={transferData.targetBranchId}
                  onChange={(e) => setTransferData({ ...transferData, targetBranchId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                >
                  <option value="">-- Chọn cơ sở nhận --</option>
                  {branches.filter(b => b.id !== selectedBranch.id).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Sản Phẩm Điều Chuyển (*)</label>
                <input
                  type="text"
                  required
                  value={transferData.itemName}
                  onChange={(e) => setTransferData({ ...transferData, itemName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Số Lượng Chuyển (*)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Ghi Chú Phiếu Chuyển</label>
                <input
                  type="text"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white font-extrabold rounded-xl shadow-sm hover:bg-purple-700 transition"
                >
                  Xác Nhận Chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
