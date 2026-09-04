'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, Search, Phone, MapPin, Award, ShoppingBag, DollarSign, 
  Plus, Download, MessageSquare, ShoppingCart, Eye, Edit3, Trash2, X, 
  Star, Clock, Utensils, Store, TrendingUp, Sparkles, AlertCircle, Check, Tag, Filter, UserPlus
} from 'lucide-react';
import { getCustomers, saveCustomer, deleteCustomer, CustomerRecord } from '@/lib/store';

export default function CustomersPage() {
  const router = useRouter();

  // Primary Customer State
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'VIP' | 'LOYAL' | 'AT_RISK' | 'NEW'>('ALL');

  // Drawer / Detail Profile Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [drawerSubTab, setDrawerSubTab] = useState<'INFO' | 'HABITS' | 'ORDERS'>('INFO');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<CustomerRecord>>({});
  const [newTasteTagInput, setNewTasteTagInput] = useState('');

  // Add New Customer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    phone: '',
    secondary_phone: '',
    address: '',
    secondary_address: '',
    taste_tags: '🌶️ Ăn cay, 🥫 Nhiều sốt',
    notes: 'Khách hàng tạo mới từ danh bạ POS'
  });

  // Load customer data from central store
  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const reloadCustomers = () => {
    const fresh = getCustomers();
    setCustomers(fresh);
    if (selectedCustomer) {
      const updated = fresh.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    }
  };

  // Lifecycle Grouping & Filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search filter
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.secondary_phone && c.secondary_phone.includes(searchQuery)) ||
        c.address.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'VIP') return c.total_spend >= 2000000 || c.tier === 'VIP';
      if (activeTab === 'LOYAL') return c.total_orders >= 3 || c.tier === 'Thân Thiết';
      if (activeTab === 'AT_RISK') return c.days_since_last_order > 15;
      if (activeTab === 'NEW') return c.total_orders <= 1 || c.tier === 'Khách Mới';
      
      return true;
    });
  }, [customers, searchQuery, activeTab]);

  // Tab Counter Calculations
  const tabCounts = useMemo(() => {
    return {
      all: customers.length,
      vip: customers.filter(c => c.total_spend >= 2000000 || c.tier === 'VIP').length,
      loyal: customers.filter(c => c.total_orders >= 3 || c.tier === 'Thân Thiết').length,
      atRisk: customers.filter(c => c.days_since_last_order > 15).length,
      new: customers.filter(c => c.total_orders <= 1 || c.tier === 'Khách Mới').length
    };
  }, [customers]);

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportExcel = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese support
    csv += 'Mã KH,Tên Khách Hàng,Số Điện Thoại,Địa Chỉ Giao Mặc Định,Số Đơn Hàng,Chi Tiêu VNĐ,Điểm Tích Lũy,Phân Loại,Khẩu Vị,Lần Mua Cuối,Ghi Chú\n';
    
    customers.forEach(c => {
      const tags = (c.taste_tags || []).join('; ');
      const notes = (c.notes || '').replace(/,/g, ' ');
      const addr = (c.address || '').replace(/,/g, ' ');
      csv += `"${c.id}","${c.name}","${c.phone}","${addr}",${c.total_orders},${c.total_spend},${c.points},"${c.tier}","${tags}","${c.last_order_date}","${notes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_khach_hang_crm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Drawer Detail Modal
  const handleOpenDrawer = (cust: CustomerRecord) => {
    setSelectedCustomer(cust);
    setEditFormData(cust);
    setDrawerSubTab('INFO');
    setIsEditingNotes(false);
  };

  // Save Customer Profile Edit
  const handleSaveProfileEdit = () => {
    if (!selectedCustomer || !editFormData.name || !editFormData.phone) return;
    saveCustomer({
      ...selectedCustomer,
      ...editFormData
    });
    setIsEditingNotes(false);
    reloadCustomers();
  };

  // Add Taste Tag to Selected Customer
  const handleAddTasteTag = () => {
    if (!newTasteTagInput.trim() || !selectedCustomer) return;
    const tag = newTasteTagInput.trim();
    const currentTags = editFormData.taste_tags || selectedCustomer.taste_tags || [];
    if (!currentTags.includes(tag)) {
      const updatedTags = [...currentTags, tag];
      setEditFormData({ ...editFormData, taste_tags: updatedTags });
      saveCustomer({ ...selectedCustomer, taste_tags: updatedTags });
      reloadCustomers();
    }
    setNewTasteTagInput('');
  };

  // Remove Taste Tag
  const handleRemoveTasteTag = (tagToRemove: string) => {
    if (!selectedCustomer) return;
    const currentTags = editFormData.taste_tags || selectedCustomer.taste_tags || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    setEditFormData({ ...editFormData, taste_tags: updatedTags });
    saveCustomer({ ...selectedCustomer, taste_tags: updatedTags });
    reloadCustomers();
  };

  // Submit Add Customer Form
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.phone) return;

    const tagsArray = addFormData.taste_tags.split(',').map(t => t.trim()).filter(Boolean);

    saveCustomer({
      name: addFormData.name,
      phone: addFormData.phone,
      secondary_phone: addFormData.secondary_phone,
      address: addFormData.address,
      secondary_address: addFormData.secondary_address,
      total_orders: 1,
      total_spend: 0,
      taste_tags: tagsArray.length > 0 ? tagsArray : ['🆕 Khách mới thủ công'],
      notes: addFormData.notes
    });

    setIsAddModalOpen(false);
    setAddFormData({
      name: '',
      phone: '',
      secondary_phone: '',
      address: '',
      secondary_address: '',
      taste_tags: '🌶️ Ăn cay, 🥫 Nhiều sốt',
      notes: 'Khách hàng tạo mới từ danh bạ POS'
    });
    reloadCustomers();
  };

  // Quick Action: Navigate to Order Creation with Customer Info
  const handleCreateOrderForCustomer = (cust: CustomerRecord) => {
    const query = new URLSearchParams({
      phone: cust.phone,
      name: cust.name,
      address: cust.address
    }).toString();
    router.push(`/admin/create-order?${query}`);
  };

  // Get Avatar Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Danh Bạ Khách Hàng CRM ({customers.length})
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> F&amp;B Remarketing Smart
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Quản lý phân loại vòng đời khách hàng, khẩu vị món ăn, tích điểm chi tiêu &amp; chăm sóc khách hàng tự động.
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Xuất File Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Khách Hàng Thủ Công</span>
          </button>
        </div>
      </div>

      {/* 2. Top Filter Bar & Lifecycle Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo SĐT, tên khách hàng, địa chỉ, khẩu vị..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Lifecycle Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tất cả khách hàng</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VIP')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'VIP'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Khách VIP (Chi tiêu &ge; 2M)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900">
              {tabCounts.vip}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOYAL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'LOYAL'
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Khách Thân Thiết (&ge; 3 đơn)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900">
              {tabCounts.loyal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AT_RISK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'AT_RISK'
                ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>Khách Nguy Cơ Rời Bỏ (&gt; 15 ngày)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-200 text-orange-900 font-extrabold animate-pulse">
              {tabCounts.atRisk}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'NEW'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khách Mới (Đơn đầu tiên)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900">
              {tabCounts.new}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Rich Customer Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3">Khách Hàng &amp; Khẩu Vị</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Địa Chỉ Giao Mặc Định</th>
                <th className="px-4 py-3 text-center">Số Đơn &amp; Tần Suất</th>
                <th className="px-4 py-3 text-right">Chi Tiêu &amp; Điểm</th>
                <th className="px-4 py-3 text-center">Phân Loại</th>
                <th className="px-4 py-3 text-center">Lần Mua Cuối</th>
                <th className="px-4 py-3 text-center">Thao Tác Nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const phoneClean = c.phone.replace(/\D/g, '');
                  const zaloUrl = `https://zalo.me/${phoneClean}`;
                  const isAtRisk = c.days_since_last_order > 15;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      {/* Customer Name & Taste Tags */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs ${
                            c.tier === 'VIP' ? 'bg-gradient-to-tr from-amber-500 to-yellow-400' :
                            c.tier === 'Thân Thiết' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500' :
                            'bg-gradient-to-tr from-sky-500 to-emerald-400'
                          }`}>
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {c.tier === 'VIP' && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                            </div>

                            {/* Taste / Preference Tags */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(c.taste_tags || []).map((tag, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="px-4 py-3.5">
                        <a
                          href={`tel:${c.phone}`}
                          className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline text-xs"
                          title="Click để gọi điện"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.phone}</span>
                        </a>
                        {c.secondary_phone && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            Phụ: {c.secondary_phone}
                          </div>
                        )}
                      </td>

                      {/* Default Address */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="text-slate-800 font-medium truncate" title={c.address}>
                          {c.address}
                        </div>
                      </td>

                      {/* Order Count & Frequency */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-extrabold text-slate-900">{c.total_orders} đơn</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          ~{c.avg_frequency_days || 5} ngày/lần
                        </div>
                      </td>

                      {/* Total Spend & Points */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-extrabold text-orange-600 text-xs">
                          {c.total_spend.toLocaleString('vi-VN')} VNĐ
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                          · {c.points || Math.floor(c.total_spend / 20000)} điểm
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          c.tier === 'VIP' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          c.tier === 'Thân Thiết' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {c.tier === 'VIP' ? '⭐ VIP' : c.tier === 'Thân Thiết' ? '💜 Thân Thiết' : '🌱 Khách Mới'}
                        </span>
                      </td>

                      {/* Last Order Date & Days Counter Status */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="text-slate-700 text-[11px] font-semibold">{c.last_order_date}</div>
                        <div className="mt-1">
                          {c.days_since_last_order === 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              🟢 Hôm nay
                            </span>
                          ) : c.days_since_last_order <= 14 ? (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              🔵 {c.days_since_last_order} ngày trước
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center justify-center gap-1">
                              <AlertCircle className="w-3 h-3 text-orange-600" />
                              <span>{c.days_since_last_order} ngày - Cần gọi lại</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quick Action Icons */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* 💬 Zalo Chat Button */}
                          <a
                            href={zaloUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                            title="Chat qua Zalo"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          {/* 🛒 Create Order Button */}
                          <button
                            type="button"
                            onClick={() => handleCreateOrderForCustomer(c)}
                            className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg border border-orange-200 transition cursor-pointer"
                            title="Lên đơn hàng nhanh cho khách này"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>

                          {/* 👁️ View Profile Drawer Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(c)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                            title="Xem hồ sơ chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

      {/* 4. Customer Profile Drawer / Modal (Slide-Over) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-base shadow-sm ${
                  selectedCustomer.tier === 'VIP' ? 'bg-gradient-to-tr from-amber-500 to-yellow-400' :
                  selectedCustomer.tier === 'Thân Thiết' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500' :
                  'bg-gradient-to-tr from-sky-500 to-emerald-400'
                }`}>
                  {getInitials(selectedCustomer.name)}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    {selectedCustomer.name}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedCustomer.tier === 'VIP' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      selectedCustomer.tier === 'Thân Thiết' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                      'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}>
                      {selectedCustomer.tier === 'VIP' ? '⭐ VIP' : selectedCustomer.tier}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> {selectedCustomer.phone}
                    <span className="text-slate-300">|</span>
                    <span>Tích lũy: <strong className="text-orange-600">{selectedCustomer.total_spend.toLocaleString('vi-VN')} VNĐ</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleCreateOrderForCustomer(selectedCustomer)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>+ Lên Đơn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Sub-Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-white sticky top-[81px] z-10">
              <button
                type="button"
                onClick={() => setDrawerSubTab('INFO')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                  drawerSubTab === 'INFO'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Thông Tin &amp; Khẩu Vị
              </button>
              <button
                type="button"
                onClick={() => setDrawerSubTab('HABITS')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                  drawerSubTab === 'HABITS'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Thống Kê Thói Quen
              </button>
              <button
                type="button"
                onClick={() => setDrawerSubTab('ORDERS')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                  drawerSubTab === 'ORDERS'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                3. Lịch Sử Đơn Hàng ({selectedCustomer.order_history?.length || selectedCustomer.total_orders})
              </button>
            </div>

            {/* Drawer Content Area */}
            <div className="p-6 space-y-6 flex-1">
              {/* SUB-TAB 1: INFO & TASTE TAGS & EDIT */}
              {drawerSubTab === 'INFO' && (
                <div className="space-y-6">
                  {/* Taste Tags Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-orange-600" /> Thẻ Khẩu Vị &amp; Thói Quen Khách Hàng:
                      </span>
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {(editFormData.taste_tags || selectedCustomer.taste_tags || []).map((tag, idx) => (
                        <span key={idx} className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTasteTag(tag)}
                            className="hover:text-rose-600 transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        value={newTasteTagInput}
                        onChange={(e) => setNewTasteTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTasteTag(); }}
                        placeholder="Thêm tag mới (VD: Ăn cay, Không lấy sả...)"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTasteTag}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        + Thêm Tag
                      </button>
                    </div>
                  </div>

                  {/* Personal Details Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Họ &amp; Tên Khách Hàng</label>
                        <input
                          type="text"
                          value={editFormData.name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại Chính</label>
                        <input
                          type="text"
                          value={editFormData.phone || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại Phụ</label>
                        <input
                          type="text"
                          value={editFormData.secondary_phone || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, secondary_phone: e.target.value })}
                          placeholder="Nhập SĐT phụ (nếu có)..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phân Loại VIP</label>
                        <select
                          value={editFormData.tier || 'Khách Mới'}
                          onChange={(e) => setEditFormData({ ...editFormData, tier: e.target.value as any })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="VIP">⭐ VIP (Chi tiêu &ge; 2M)</option>
                          <option value="Thân Thiết">💜 Thân Thiết (&ge; 3 đơn)</option>
                          <option value="Khách Mới">🌱 Khách Mới</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ Giao Hàng Mặc Định</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ Phụ / Văn Phòng</label>
                      <input
                        type="text"
                        value={editFormData.secondary_address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, secondary_address: e.target.value })}
                        placeholder="Nhập địa chỉ phụ (nếu có)..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Đặt Hàng &amp; Dị Ứng</label>
                      <textarea
                        rows={3}
                        value={editFormData.notes || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveProfileEdit}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition cursor-pointer"
                    >
                      💾 Lưu Cập Nhật Hồ Sơ Khách Hàng
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: HABIT ANALYTICS */}
              {drawerSubTab === 'HABITS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Món Ruột Đặt Nhiều Nhất</div>
                      <div className="text-xs font-extrabold text-orange-900 mt-1">
                        {selectedCustomer.favorite_item || 'Gà Ủ Muối Nguyên Con'}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Chi Nhánh Hay Đặt Nhất</div>
                      <div className="text-xs font-extrabold text-blue-900 mt-1">
                        {selectedCustomer.favorite_branch || 'CƠ SỞ VIN SMART CITY'}
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Giá Trị TB 1 Đơn (AOV)</div>
                      <div className="text-xs font-extrabold text-emerald-900 mt-1">
                        {(selectedCustomer.avg_order_value || Math.round(selectedCustomer.total_spend / Math.max(1, selectedCustomer.total_orders))).toLocaleString('vi-VN')} VNĐ
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">Phân Tích Tần Suất &amp; Điểm Tích Lũy</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>Tần suất mua hàng trung bình: <strong>~{selectedCustomer.avg_frequency_days || 5} ngày / 1 đơn hàng</strong>.</li>
                      <li>Tổng số điểm thưởng tích lũy: <strong className="text-orange-600">{selectedCustomer.points || Math.floor(selectedCustomer.total_spend / 20000)} điểm</strong> (Quy đổi voucher giảm giá).</li>
                      <li>Trạng thái đặt hàng lần cuối: <strong>{selectedCustomer.last_order_date}</strong> ({selectedCustomer.days_since_last_order} ngày trước).</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: ORDER HISTORY */}
              {drawerSubTab === 'ORDERS' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-800">
                    Danh Sách Đơn Hàng Đã Mua ({selectedCustomer.order_history?.length || selectedCustomer.total_orders} đơn):
                  </div>

                  <div className="space-y-3">
                    {(selectedCustomer.order_history && selectedCustomer.order_history.length > 0) ? (
                      selectedCustomer.order_history.map((oh) => (
                        <div key={oh.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-orange-600">{oh.order_code}</span>
                            <span className="text-[11px] text-slate-500 font-semibold">{oh.created_at}</span>
                          </div>
                          <div className="text-xs text-slate-800 font-medium">
                            {oh.items_summary}
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              ✓ {oh.status === 'PAID' ? 'Đã Thanh Toán' : 'Đã Giao'}
                            </span>
                            <span className="font-extrabold text-slate-900">
                              {oh.total_amount.toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-6">
                        Chưa có lịch sử đơn hàng chi tiết. Tất cả đơn hàng mới sẽ tự động lưu vào đây.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Add New Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" />
                Thêm Khách Hàng Thủ Công
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Khách Hàng (*)</label>
                <input
                  type="text"
                  required
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  placeholder="Ví dụ: Anh Hoàng (Hà Nội)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại (*)</label>
                  <input
                    type="text"
                    required
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="0901234567"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-emerald-700 font-bold focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SĐT Phụ</label>
                  <input
                    type="text"
                    value={addFormData.secondary_phone}
                    onChange={(e) => setAddFormData({ ...addFormData, secondary_phone: e.target.value })}
                    placeholder="Không bắt buộc"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa Chỉ Giao Hàng</label>
                <input
                  type="text"
                  value={addFormData.address}
                  onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                  placeholder="Ví dụ: 123 Lê Lợi, Phường Bến Thành, Quận 1"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khẩu Vị &amp; Thói Quen (Phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={addFormData.taste_tags}
                  onChange={(e) => setAddFormData({ ...addFormData, taste_tags: e.target.value })}
                  placeholder="Ví dụ: 🌶️ Ăn cay, 🥫 Nhiều sốt, ⚡ Ship hỏa tốc"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <textarea
                  rows={2}
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Lưu Khách Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
