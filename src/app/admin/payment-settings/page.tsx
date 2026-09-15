'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Building2,
  QrCode,
  Save,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Info,
  MapPin,
  Key,
  Lock,
  Webhook,
  CheckSquare,
  Square
} from 'lucide-react';
import { useBranches, BranchRecord } from '@/hooks/useBranches';

interface PaymentConfigData {
  branchId: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string;
  transferSyntax: string;
  note: string;
  web2mToken: string;
  web2mPassword: string;
  isAutoConfirm: boolean;
}

const SUPPORTED_BANKS = [
  { id: 'MB', name: 'MBBank (Ngân hàng Quân Đội)', bin: '970422', logo: '🏦 MBBank' },
  { id: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)', bin: '970436', logo: '🟢 Vietcombank' },
  { id: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)', bin: '970407', logo: '🔴 Techcombank' },
  { id: 'ACB', name: 'ACB (Ngân hàng Á Châu)', bin: '970416', logo: '🔵 ACB' },
  { id: 'VPB', name: 'VPBank (Thịnh Vượng)', bin: '970432', logo: '🟢 VPBank' },
  { id: 'TPB', name: 'TPBank (Tiên Phong)', bin: '970423', logo: '🟣 TPBank' },
  { id: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển Việt Nam)', bin: '970418', logo: '🔷 BIDV' },
  { id: 'CTG', name: 'VietinBank (Công Thương Việt Nam)', bin: '970415', logo: '🔹 VietinBank' },
  { id: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)', bin: '970403', logo: '🔷 Sacombank' },
  { id: 'HDB', name: 'HDBank (Phát Triển TP.HCM)', bin: '970437', logo: '🟡 HDBank' },
  { id: 'VIB', name: 'VIB (Quốc Tế Việt Nam)', bin: '970441', logo: '🔵 VIB' },
  { id: 'MSB', name: 'MSB (Hàng Hải Việt Nam)', bin: '970426', logo: '🟠 MSB' },
  { id: 'OCB', name: 'OCB (Phương Đông)', bin: '970448', logo: '🟢 OCB' },
  { id: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)', bin: '970443', logo: '🟠 SHB' },
  { id: 'VAB', name: 'VietA Bank (Việt Á)', bin: '970427', logo: '🔴 VietABank' },
  { id: 'Agribank', name: 'Agribank (Nông Nghiệp & PTNT)', bin: '970405', logo: '🌾 Agribank' },
];

function removeAccentsUpper(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}

export default function PaymentSettingsPage() {
  const { branches, loading: loadingBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const [config, setConfig] = useState<PaymentConfigData>({
    branchId: '',
    bankId: 'MB',
    bankName: 'MBBank (Ngân hàng Quân Đội)',
    accountNumber: '0988888888',
    accountName: 'NGUYEN VAN KHANG',
    qrTemplate: 'compact2',
    transferSyntax: 'GUM [Mã_Đơn]',
    note: 'Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt đơn.',
    web2mToken: '',
    web2mPassword: '',
    isAutoConfirm: false
  });

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSyntax, setCopiedSyntax] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Set default selected branch when branches load
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Fetch payment config whenever selectedBranchId changes
  const fetchConfig = useCallback(async (branchId: string) => {
    if (!branchId) return;
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/settings/payment?branchId=${branchId}`);
      const data = await res.json();
      if (data.config) {
        setConfig({
          branchId: data.config.branchId || branchId,
          bankId: data.config.bankId || 'MB',
          bankName: data.config.bankName || 'MBBank (Ngân hàng Quân Đội)',
          accountNumber: data.config.accountNumber || '',
          accountName: data.config.accountName || '',
          qrTemplate: data.config.qrTemplate || 'compact2',
          transferSyntax: data.config.transferSyntax || 'GUM [Mã_Đơn]',
          note: data.config.note || '',
          web2mToken: data.config.web2mToken || '',
          web2mPassword: data.config.web2mPassword || '',
          isAutoConfirm: Boolean(data.config.isAutoConfirm)
        });
      }
    } catch (e) {
      console.error('Failed to fetch branch payment config:', e);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchConfig(selectedBranchId);
    }
  }, [selectedBranchId, fetchConfig]);

  const handleBankChange = (bankId: string) => {
    const selected = SUPPORTED_BANKS.find((b) => b.id === bankId);
    setConfig((prev) => ({
      ...prev,
      bankId,
      bankName: selected ? selected.name : bankId
    }));
  };

  const handleAccountNameChange = (val: string) => {
    const uppercaseClean = removeAccentsUpper(val);
    setConfig((prev) => ({
      ...prev,
      accountName: uppercaseClean
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert('Vui lòng chọn một cơ sở để lưu cấu hình!');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          branchId: selectedBranchId
        })
      });
      const data = await res.json();

      if (data.success && data.config) {
        setConfig((prev) => ({
          ...prev,
          ...data.config
        }));
        const currentBranch = branches.find((b) => b.id === selectedBranchId);
        setToast({
          type: 'success',
          message: `🎉 Đã lưu & áp dụng cấu hình thanh toán cho "${currentBranch?.name || 'Cơ sở'}" thành công!`
        });
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Lỗi khi lưu cấu hình!'
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        message: 'Lỗi kết nối máy chủ: ' + err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const sampleSyntax = config.transferSyntax.replace('[Mã_Đơn]', 'DH78510').replace('[SĐT]', '0988888888');
  const liveVietQrUrl = config.bankId && config.accountNumber
    ? `https://img.vietqr.io/image/${config.bankId}-${config.accountNumber}-${config.qrTemplate}.png?amount=285000&addInfo=${encodeURIComponent(sampleSyntax)}&accountName=${encodeURIComponent(config.accountName)}`
    : 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GAUMUOISMART';

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pos.yourdomain.com';
  const webhookUrl = `${originUrl}/api/webhooks/web2m?branchId=${selectedBranchId || 'CS_ID'}`;

  const handleCopySyntax = () => {
    navigator.clipboard.writeText(sampleSyntax);
    setCopiedSyntax(true);
    setTimeout(() => setCopiedSyntax(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loadingBranches) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-amber-500 font-bold">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Đang tải danh sách cơ sở & cấu hình thanh toán...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b dark:border-neutral-800 border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-amber-500 via-amber-600 to-purple-600 text-stone-950 rounded-2xl shadow-lg shadow-amber-500/20">
              <CreditCard className="w-7 h-7 stroke-[1.75] text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black dark:text-white text-stone-900 tracking-tight flex items-center gap-2">
                💳 Cấu Hình Thanh Toán & Tài Khoản Ngân Hàng Đa Cơ Sở
              </h1>
              <p className="text-xs dark:text-neutral-400 text-stone-600 mt-1 font-medium">
                Tự động đồng bộ mã VietQR động & tích hợp Web2M Gateway tự động duyệt tiền về cho từng chi nhánh độc lập.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 shadow-2xs">
            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Web2M Auto-Confirm Enabled</span>
          </span>
        </div>
      </div>

      {/* BRANCH SELECTOR TABS BAR */}
      <div className="bg-[#14171D] p-3 rounded-2xl border border-neutral-800 space-y-2 shadow-md">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>CHỌN CƠ SỞ CẤU HÌNH THANH TOÁN & WEB2M:</span>
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">
            {branches.length} Cơ sở hệ thống
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {branches.map((b) => {
            const isSelected = b.id === selectedBranchId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'bg-[#0B0D11] hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>📍 {b.code?.toUpperCase() || 'CS'} - {b.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl text-xs font-extrabold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 dark:text-emerald-400 text-emerald-800'
              : 'bg-rose-500/15 border border-rose-500/40 dark:text-rose-400 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-stone-950 dark:hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* SPLIT VIEW 2 COLUMNS: LEFT 65% FORM | RIGHT 35% LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (65%): FORM CONFIGURATION */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSave}
            className="dark:bg-[#141820] bg-white border dark:border-neutral-800 border-stone-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative"
          >
            {loadingConfig && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-3xl z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 text-amber-400 font-bold text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang tải cấu hình của {selectedBranch?.name}...</span>
                </div>
              </div>
            )}

            {/* Sub-Header: Current Selected Branch */}
            <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-4">
              <div>
                <h2 className="text-sm font-black dark:text-amber-400 text-amber-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG - {selectedBranch?.name?.toUpperCase()}</span>
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Mã CS: <strong className="text-amber-400">{selectedBranch?.code?.toUpperCase()}</strong> | Địa chỉ: {selectedBranch?.address}
                </p>
              </div>
              <span className="text-[11px] text-stone-500 font-semibold shrink-0">Bắt buộc (*)</span>
            </div>

            {/* 1. Bank Select */}
            <div>
              <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-1.5">
                Chọn Ngân Hàng Thụ Hưởng (*)
              </label>
              <select
                value={config.bankId}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-sm font-bold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
              >
                {SUPPORTED_BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Mã VietQR: {b.id})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Account Number & Account Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-1.5">
                  Số Tài Khoản (STK) (*)
                </label>
                <input
                  type="text"
                  required
                  value={config.accountNumber}
                  onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                  placeholder="Ví dụ: 0988888888"
                  className="w-full px-4 py-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-sm font-black dark:text-amber-400 text-amber-800 focus:outline-none focus:border-amber-500 tracking-wider shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Tên Chủ Tài Khoản (*)</span>
                  <span className="text-[10px] text-amber-500 font-semibold">Tự in hoa không dấu</span>
                </label>
                <input
                  type="text"
                  required
                  value={config.accountName}
                  onChange={(e) => handleAccountNameChange(e.target.value)}
                  placeholder="NGUYEN VAN KHANG"
                  className="w-full px-4 py-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-sm font-black dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 uppercase shadow-inner tracking-wide"
                />
              </div>
            </div>

            {/* 3. Transfer Syntax Template */}
            <div>
              <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-1.5 flex items-center justify-between">
                <span>Cú Pháp Nội Dung Chuyển Khoản Mặc Định</span>
                <span className="text-[10px] text-stone-400">Dùng [Mã_Đơn] hoặc [SĐT]</span>
              </label>
              <input
                type="text"
                value={config.transferSyntax}
                onChange={(e) => setConfig({ ...config, transferSyntax: e.target.value })}
                placeholder="VD: GUM [Mã_Đơn]"
                className="w-full px-4 py-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs font-extrabold dark:text-white text-stone-900 focus:outline-none focus:border-amber-500 shadow-inner"
              />
              <p className="text-[11px] text-stone-500 mt-1 font-medium">
                Cú pháp xem trước: <strong className="text-amber-500">{sampleSyntax}</strong>
              </p>
            </div>

            {/* 4. Payment Note Instructions */}
            <div>
              <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-1.5">
                Ghi Chú Hướng Dẫn Thanh Toán (Hiển thị dưới mã QR)
              </label>
              <textarea
                rows={2}
                value={config.note || ''}
                onChange={(e) => setConfig({ ...config, note: e.target.value })}
                placeholder="Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt đơn."
                className="w-full px-4 py-3 rounded-xl dark:bg-neutral-900 bg-stone-50 border dark:border-neutral-700 border-stone-300 text-xs dark:text-neutral-200 text-stone-800 focus:outline-none focus:border-amber-500 shadow-inner"
              ></textarea>
            </div>

            {/* 5. QR Template Select */}
            <div>
              <label className="block text-xs font-bold dark:text-neutral-300 text-stone-700 mb-2">
                Kiểu Dáng Mã VietQR (Template)
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, qrTemplate: 'compact2' })}
                  className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 cursor-pointer ${
                    config.qrTemplate === 'compact2'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'dark:bg-neutral-900 bg-stone-100 border-stone-300 dark:border-neutral-700 text-stone-600 dark:text-neutral-400'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Kèm logo & Tên chủ TK (Kèm Khung)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, qrTemplate: 'qr_only' })}
                  className={`p-3 rounded-xl border transition flex items-center justify-center gap-2 cursor-pointer ${
                    config.qrTemplate === 'qr_only'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'dark:bg-neutral-900 bg-stone-100 border-stone-300 dark:border-neutral-700 text-stone-600 dark:text-neutral-400'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Mã QR Đơn Giản (Chỉ QR)</span>
                </button>
              </div>
            </div>

            {/* 6. KHỐI TÍCH HỢP TỰ ĐỘNG XÁC NHẬN THANH TOÁN (WEB2M GATEWAY) */}
            <div className="bg-[#0B0D11] p-5 rounded-2xl border border-purple-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-xs font-extrabold text-purple-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 fill-purple-400/30" />
                  <span>TÍCH HỢP TỰ ĐỘNG XÁC NHẬN THANH TOÁN (WEB2M GATEWAY)</span>
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {config.isAutoConfirm ? '🟢 LIVE WEBHOOK' : '⚪ MANUAL'}
                </span>
              </div>

              {/* Toggle Auto Confirm */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#14171D] border border-neutral-800 cursor-pointer hover:border-purple-500/50 transition">
                <input
                  type="checkbox"
                  checked={config.isAutoConfirm}
                  onChange={(e) => setConfig({ ...config, isAutoConfirm: e.target.checked })}
                  className="w-5 h-5 accent-purple-500 rounded cursor-pointer shrink-0"
                />
                <div>
                  <p className="font-extrabold text-xs text-[#FAFAF9]">
                    Kích hoạt tự động xác nhận tiền về qua Web2M Gateway
                  </p>
                  <p className="text-[11px] text-neutral-400 font-light">
                    Đơn hàng sẽ tự động đổi trạng thái sang <strong className="text-emerald-400">Đã nhận tiền</strong> & kích hoạt bếp làm ngay khi ngân hàng báo số dư tiền vào.
                  </p>
                </div>
              </label>

              {/* Web2M Token & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>API Key / Token Web2M (*):</span>
                  </label>
                  <input
                    type="text"
                    value={config.web2mToken}
                    onChange={(e) => setConfig({ ...config, web2mToken: e.target.value })}
                    placeholder="Dán Web2M Token tại đây..."
                    className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xl text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mật Khẩu App Bank (Sync Web2M):</span>
                  </label>
                  <input
                    type="password"
                    value={config.web2mPassword}
                    onChange={(e) => setConfig({ ...config, web2mPassword: e.target.value })}
                    placeholder="Mật khẩu đăng nhập app bank..."
                    className="w-full px-3 py-2 bg-[#14171D] border border-neutral-700 rounded-xl text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Webhook Endpoint Copy */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Webhook className="w-3.5 h-3.5 text-amber-400" />
                    Webhook URL Dành Cho Web2M (Read-only):
                  </span>
                  <span className="text-[10px] text-neutral-400">Copy dán vào Webhook Web2M</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-xs font-mono text-amber-400 select-all cursor-text focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="px-3 py-2 bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t dark:border-neutral-800 border-stone-100">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Đang lưu & Đồng bộ cấu hình cơ sở...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 stroke-[2]" />
                    <span>💾 LƯU CẤU HÌNH CHO {selectedBranch?.name?.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN (35%): LIVE VIETQR PREVIEW */}
        <div className="lg:col-span-5 space-y-6">
          <div className="dark:bg-[#141820] bg-white border dark:border-neutral-800 border-stone-200 rounded-3xl p-6 shadow-xl sticky top-20 space-y-5">
            <div className="flex items-center justify-between border-b dark:border-neutral-800 border-stone-100 pb-3">
              <span className="text-xs font-black dark:text-white text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>LIVE PREVIEW MÃ VIETQR ({selectedBranch?.code?.toUpperCase()})</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Napas 247
              </span>
            </div>

            {/* Simulated Digital Card */}
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 text-white shadow-2xl border border-amber-500/30 space-y-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-sm text-amber-400 tracking-wide">
                    {config.bankName.split(' ')[0] || config.bankId}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">VietQR Napas</span>
              </div>

              {/* QR Image Container */}
              <div className="bg-white p-3 rounded-xl flex items-center justify-center shadow-inner my-2">
                <img
                  src={liveVietQrUrl}
                  alt="Live VietQR Code"
                  className="w-52 h-52 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GAUMUOISMART');
                  }}
                />
              </div>

              {/* Card Details */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-stone-400 text-[11px]">Cơ sở:</span>
                  <span className="font-bold text-amber-400 text-xs truncate">
                    {selectedBranch?.name || 'Tất cả cơ sở'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-stone-400 text-[11px]">Chủ TK:</span>
                  <span className="font-bold text-amber-300 text-sm tracking-wider uppercase">
                    {config.accountName || 'CHỦ TÀI KHOẢN'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-stone-400 text-[11px]">STK:</span>
                  <span className="font-bold text-white text-base tracking-widest">
                    {config.accountNumber || '0000000000'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-stone-400 text-[11px]">Số tiền mẫu:</span>
                  <span className="font-black text-emerald-400 text-sm">285.000 đ</span>
                </div>

                <div className="flex justify-between items-center bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-stone-400 text-[11px]">Cú pháp mẫu:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400 text-xs">{sampleSyntax}</span>
                    <button
                      type="button"
                      onClick={handleCopySyntax}
                      className="p-1 hover:bg-neutral-800 rounded text-stone-300 transition"
                      title="Copy cú pháp mẫu"
                    >
                      {copiedSyntax ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Instruction */}
              {config.note && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-200/90 font-sans flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{config.note}</span>
                </div>
              )}
            </div>

            {/* Integration Touchpoints Info */}
            <div className="bg-stone-50 dark:bg-neutral-900/60 p-4 rounded-2xl border dark:border-neutral-800 border-stone-200 space-y-2 text-xs">
              <h4 className="font-extrabold text-stone-800 dark:text-neutral-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Điểm chạm áp dụng theo cơ sở ({selectedBranch?.code?.toUpperCase()}):</span>
              </h4>
              <ul className="space-y-1.5 text-[11px] text-stone-600 dark:text-neutral-400 list-disc list-inside">
                <li>Form Đặt Hàng Checkout khi khách chọn cơ sở này</li>
                <li>Modal Tạo Đơn POS Thu Ngân tại quầy cơ sở này</li>
                <li>Mã QR in trên hóa đơn K80 của cơ sở xuất hàng</li>
                <li>Tự động duyệt Web2M webhook cho cơ sở này</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
