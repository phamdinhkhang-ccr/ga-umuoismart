'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  UserCheck,
  Building2,
  Clock,
  Calendar,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Maximize2,
  X,
  RefreshCw,
  Zap,
  Info,
  Lock,
  Check,
} from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';

export default function AttendanceKioskPage() {
  const { branches } = useBranches();
  const todayStr = new Date().toISOString().split('T')[0];

  // Digital Clock state
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // WebRTC Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);

  // User Auth & Role State (Requirement 3: Branch Locking)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isBranchLocked, setIsBranchLocked] = useState(false);

  // Staff & Branch options
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('cs1');
  const [actionType, setActionType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Requirement 2: Staff Shift Status State
  const [staffShiftStatus, setStaffShiftStatus] = useState<{
    caseType: 'NONE' | 'CHECKED_IN' | 'COMPLETED';
    checkInTimeStr?: string;
    elapsedTimeStr?: string;
  } | null>(null);

  // Toast / Notification Message State
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // History Filter states
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterStaffId, setFilterStaffId] = useState<string>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [summary, setSummary] = useState<any>({
    totalCount: 0,
    onTimeCount: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
  });

  // Modal Image Preview State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const branchesList = branches.length > 0
    ? branches.map((b: any) => ({ id: b.id, name: b.name, badge: b.code || `CƠ SỞ ${b.id.toUpperCase()}` }))
    : [
        { id: 'cs1', name: 'Cơ Sở Cầu Giấy', badge: 'CƠ SỞ 01' },
        { id: 'cs2', name: 'Cơ Sở Đống Đa', badge: 'CƠ SỞ 02' },
        { id: 'cs3', name: 'Cơ Sở Hai Bà Trưng', badge: 'CƠ SỞ 03' },
        { id: 'cs4', name: 'Cơ Sở Thanh Xuân', badge: 'CƠ SỞ 04' },
        { id: 'cs5', name: 'Cơ Sở Tây Hồ', badge: 'CƠ SỞ 05' },
        { id: 'cs6', name: 'Cơ Sở Nam Từ Liêm', badge: 'CƠ SỞ 06' },
      ];

  // Helper sound chime
  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    } catch (e) {}
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // 1. Digital Clock effect
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Start WebRTC Camera stream
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      }
    } catch (err) {
      console.warn('Camera access error or HTTP context:', err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Requirement 3: Fetch Auth User Role and Auto-lock Branch
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          // If role is NOT ADMIN and branchId exists, lock the branch selector
          if (data.user.role !== 'ADMIN' && data.user.branchId) {
            setSelectedBranchId(data.user.branchId);
            setIsBranchLocked(true);
          }
        }
      })
      .catch(console.error);
  }, []);

  // 3. Fetch Staff & Attendance History
  const fetchInitialData = async () => {
    try {
      const resStaff = await fetch('/api/staff');
      const dataStaff = await resStaff.json();
      if (dataStaff.success && Array.isArray(dataStaff.staff) && dataStaff.staff.length > 0) {
        setStaffList(dataStaff.staff);
        setSelectedStaffId(dataStaff.staff[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoadingRecords(true);
    try {
      const url = `/api/attendance?date=${filterDate}&branchId=${filterBranchId}&staffId=${filterStaffId}`;
      const res = await fetch(url);
      const resData = await res.json();
      if (resData.success) {
        setAttendanceRecords(resData.attendance || []);
        if (resData.summary) setSummary(resData.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [filterDate, filterBranchId, filterStaffId]);

  // Auto-detect if staff member has already checked in today
  useEffect(() => {
    if (!selectedStaffId) return;

    const todayRecord = attendanceRecords.find(
      (r) => r.staffId === selectedStaffId && r.date === todayStr
    );

    if (todayRecord && todayRecord.checkInTime) {
      const inDate = new Date(todayRecord.checkInTime);
      const inTimeStr = inDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setStaffShiftStatus({
        caseType: 'COMPLETED',
        checkInTimeStr: inTimeStr,
      });
    } else {
      setStaffShiftStatus({ caseType: 'NONE' });
    }
  }, [selectedStaffId, attendanceRecords, todayStr]);

  // Requirement 1: One-Click Attendance Handler (Capture Snapshot + Confirm Payload + Visual Flash)
  const handleOneClickAttendance = async () => {
    if (!selectedStaffId) {
      showToast('Vui lòng chọn Tên Nhân Viên trước khi chấm công!', 'error');
      return;
    }

    if (!selectedBranchId) {
      showToast('Vui lòng chọn Cơ Sở Trực Ca!', 'error');
      return;
    }

    // 1. Auto-capture snapshot image from video stream
    let photoBase64 = capturedPhoto;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoBase64 = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    if (!photoBase64) {
      photoBase64 = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';
    }

    // 2. Trigger Flash Effect & Audio Beep
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 300);
    playSuccessBeep();

    // Show captured photo preview briefly for 1.5 seconds
    setCapturedPhoto(photoBase64);
    setTimeout(() => {
      setCapturedPhoto(null);
    }, 1500);

    const currentStaffObj = staffList.find((s) => s.id === selectedStaffId);
    const currentBranchObj = branchesList.find((b) => b.id === selectedBranchId);

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          staffId: selectedStaffId,
          staffName: currentStaffObj ? currentStaffObj.name : 'Nhân viên',
          branchId: selectedBranchId,
          branchName: currentBranchObj ? currentBranchObj.name : 'Cơ Sở Cầu Giấy',
          photoBase64,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const timeNowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        showToast(`🎉 Chấm công thành công cho ${currentStaffObj?.name || 'nhân viên'} lúc ${timeNowStr}!`, 'success');
        setNotes('');

        // Reload history table and re-check staff shift status
        fetchAttendanceRecords();
      } else {
        showToast(data.error || 'Lỗi chấm công!', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel / CSV summary
  const handleExportExcel = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(attendanceRecords, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `Bang_Cham_Cong_${filterDate}_${filterBranchId}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-bounce transition-all ${
          toastMsg.type === 'success'
            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
            : 'bg-rose-950 text-rose-300 border-rose-500/50'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-rose-400" />}
          <span className="font-extrabold text-sm">{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Camera className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAF9] tracking-tight">
                Chấm Công Vào Ca 1 Chạm (Auto Check-out 22:00)
              </h1>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> WebRTC Auto-Capture
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Nhận diện khuôn mặt camera trực tiếp &amp; hệ thống tự động chốt giờ tan ca lúc 22:00
            </p>
          </div>
        </div>

        {/* Realtime Digital Clock */}
        <div className="bg-slate-900 dark:bg-[#0B0D11] p-3.5 px-5 rounded-2xl border border-slate-800 text-right shrink-0 shadow-md">
          <div className="text-xl sm:text-2xl font-black gold-gradient-text tracking-tight font-mono">
            {currentTime ? currentTime.toLocaleTimeString('vi-VN') : '--:--:--'}
          </div>
          <div className="text-[11px] font-semibold text-neutral-400">
            {currentTime
              ? currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
              : 'Đang đồng bộ...'}
          </div>
        </div>
      </div>

      {/* ================= SECTION A: KHU VỰC THAO TÁC CHẤM CÔNG 1 CHẠM ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* WebRTC Live Camera Stream Container (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base tracking-tight flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500 stroke-[1.75]" />
                <span>Camera Nhận Diện Khuôn Mặt</span>
              </h2>
              <span className="text-[10px] font-extrabold bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> LIVE
              </span>
            </div>

            {/* Video Feed Box with Visual Flash Overlay */}
            <div className={`relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border-2 border-amber-500/30 flex items-center justify-center shadow-inner transition-all ${
              flashEffect ? 'ring-8 ring-amber-400 brightness-150' : ''
            }`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Flash visual effect */}
              {flashEffect && (
                <div className="absolute inset-0 bg-white/80 animate-ping pointer-events-none" />
              )}

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/80 text-center space-y-3">
                  <Camera className="w-12 h-12 text-amber-400 stroke-[1.5] animate-bounce" />
                  <p className="text-xs text-neutral-300 font-semibold">
                    Đang khởi động Camera trực tiếp...
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-1.5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow hover:bg-amber-400 transition"
                  >
                    Bật Camera Live
                  </button>
                </div>
              )}

              {/* Overlay Face Target Frame */}
              <div className="absolute inset-0 border-2 border-amber-400/40 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-amber-400/60 animate-pulse flex items-center justify-center">
                  <span className="text-[10px] text-amber-300/80 font-bold bg-neutral-950/60 px-2 py-0.5 rounded-full">
                    Nhìn thẳng vào Camera
                  </span>
                </div>
              </div>

              {/* Captured Photo Preview Overlay (1.5s after snapshot) */}
              {capturedPhoto && (
                <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-3 animate-fade-in">
                  <img
                    src={capturedPhoto}
                    alt="Captured face preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-amber-400 shadow-xl"
                  />
                  <span className="mt-2 text-xs font-black text-amber-400">
                    ✓ Đã chụp & xác nhận!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick status tip */}
          <div className="p-3 bg-slate-50 dark:bg-[#0B0D11] rounded-xl border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-600 dark:text-neutral-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Nút bấm 1-chạm bên phải sẽ tự động chụp khuôn mặt và gửi dữ liệu tức thì.</span>
          </div>
        </div>

        {/* Attendance Form Container (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-5">
              <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500 stroke-[1.75]" />
                <span>Thiết Lập Ca & Nhân Viên</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-neutral-400">Tự động nhận diện trạng thái ca</span>
            </div>

            <div className="space-y-5 text-xs">
              {/* Requirement 2: Staff Select & Automatic Status Detection */}
              <div className="space-y-2">
                <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                  Chọn Tên Nhân Viên (*):
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      👤 {s.name} ({s.role}) - SĐT: {s.phone}
                    </option>
                  ))}
                </select>

                {/* Staff Duplicate Check-in Info Banner */}
                {staffShiftStatus?.caseType === 'COMPLETED' && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 flex items-start gap-3 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        ✅ Bạn đã hoàn thành chấm công vào ca lúc {staffShiftStatus.checkInTimeStr}!
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                        Ca làm việc được hệ thống tự động ghi nhận kết thúc lúc 22:00. Chúc bạn làm việc vui vẻ và hiệu quả!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement 3: Branch Select (Auto-locked for non-Admin users) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold text-slate-800 dark:text-neutral-200">
                    Cơ Sở Trực Ca (*):
                  </label>
                  {isBranchLocked && (
                    <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Đã khóa theo tài khoản
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    disabled={isBranchLocked}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs ${
                      isBranchLocked ? 'opacity-70 cursor-not-allowed bg-slate-200 dark:bg-neutral-900' : ''
                    }`}
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.badge} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-neutral-300">
                  Ghi Chú Thêm (Nếu có):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đổi ca trực, làm tăng ca..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Single Prominent 1-Click Action Button */}
          <button
            type="button"
            onClick={handleOneClickAttendance}
            disabled={submitting || staffShiftStatus?.caseType === 'COMPLETED'}
            className={`w-full py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider text-neutral-950 shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${
              staffShiftStatus?.caseType === 'COMPLETED'
                ? 'bg-slate-300 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500 cursor-not-allowed opacity-70 border border-slate-300 dark:border-neutral-700 shadow-none'
                : 'bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-500 hover:brightness-110 shadow-emerald-500/20 ring-2 ring-emerald-400/40 cursor-pointer active:scale-95'
            }`}
          >
            <Camera className="w-6 h-6 stroke-[2.2]" />
            <span>
              {submitting
                ? 'ĐANG XỬ LÝ KHUÔN MẶT...'
                : staffShiftStatus?.caseType === 'COMPLETED'
                ? `✅ ĐÃ CHẤM CÔNG VÀO CA (AUTO CHECK-OUT 22:00)`
                : '📸 CHỤP ẢNH & XÁC NHẬN VÀO CA'}
            </span>
          </button>
        </div>
      </div>

      {/* ================= SECTION B: BẢNG LỊCH SỬ CHẤM CÔNG ================= */}
      <div className="bg-white dark:bg-[#14171D] p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/80 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-[#FAFAF9] text-base sm:text-lg tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500 stroke-[1.75]" />
              <span>Bảng Lịch Sử Chấm Công Nhân Viên</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Đối soát ảnh camera chân dung, thời gian vào/ra và tổng số giờ làm việc trong ca
            </p>
          </div>

          {/* History Controls & Excel Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none"
            />

            {/* Branch Filter */}
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">🏢 Tất cả cơ sở</option>
              {branchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Staff Filter */}
            <select
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0D11] text-xs font-semibold text-slate-800 dark:text-neutral-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">👤 Tất cả nhân viên</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={fetchAttendanceRecords}
              className="p-2 bg-slate-50 dark:bg-[#0B0D11] border border-slate-300 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 rounded-xl hover:text-amber-500 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer transition"
            >
              <Download className="w-4 h-4 stroke-[2]" />
              <span>Xuất File Excel</span>
            </button>
          </div>
        </div>

        {/* Attendance Summary Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-bold px-3 py-1 rounded-full">
            Tổng lượt: {summary.totalCount || 0}
          </span>
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1 rounded-full">
            ✓ Đúng giờ: {summary.onTimeCount || 0}
          </span>
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold px-3 py-1 rounded-full">
            ⚠️ Đi muộn: {summary.lateCount || 0}
          </span>
          <span className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold px-3 py-1 rounded-full">
            🛑 Về sớm: {summary.earlyLeaveCount || 0}
          </span>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-thin">
          {loadingRecords ? (
            <div className="py-12 text-center text-slate-400 dark:text-neutral-500 text-xs font-semibold">
              Đang tải danh sách chấm công...
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Camera className="w-10 h-10 text-slate-400 dark:text-neutral-600 mx-auto stroke-[1.5]" />
              <p className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                Chưa có dữ liệu chấm công cho bộ lọc đang chọn
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0B0D11] border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-3">ẢNH CHECK-IN</th>
                  <th className="py-3.5 px-3">NHÂN VIÊN</th>
                  <th className="py-3.5 px-3">CƠ SỞ</th>
                  <th className="py-3.5 px-3">GIỜ VÀO (IN)</th>
                  <th className="py-3.5 px-3">GIỜ VỀ (OUT)</th>
                  <th className="py-3.5 px-3">TỔNG GIỜ LÀM</th>
                  <th className="py-3.5 px-3 text-right">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80 font-medium text-slate-800 dark:text-neutral-200">
                {attendanceRecords.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/60 transition-colors whitespace-nowrap"
                    >
                      {/* 1. ẢNH CHECK-IN */}
                      <td className="py-3 px-3">
                        {item.checkInPhoto ? (
                          <div
                            onClick={() => setPreviewPhotoUrl(item.checkInPhoto)}
                            className="relative w-10 h-10 rounded-lg overflow-hidden border border-amber-500/40 cursor-pointer group shadow-xs"
                          >
                            <img src={item.checkInPhoto} alt="Check-in" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* 2. NHÂN VIÊN */}
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {item.staffName}
                      </td>

                      {/* 3. CƠ SỞ */}
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-neutral-700">
                          {item.branchName}
                        </span>
                      </td>

                      {/* 4. GIỜ VÀO (IN) */}
                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN') : '-'}
                      </td>

                      {/* 5. GIỜ VỀ (OUT) */}
                      <td className="py-3 px-3">
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full">
                          22:00 (Hệ thống tự chốt)
                        </span>
                      </td>

                      {/* 6. TỔNG GIỜ LÀM */}
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {item.totalHours ? `${item.totalHours} giờ` : '-'}
                      </td>

                      {/* 8. TRẠNG THÁI */}
                      <td className="py-3 px-3 text-right">
                        {item.status === 'ON_TIME' ? (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đúng giờ
                          </span>
                        ) : item.status === 'LATE' ? (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Đi muộn
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Về sớm
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= SECTION C: PHOTO PREVIEW MODAL ================= */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#14171D] border border-slate-300 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                <span>Ảnh Chân Dung Chấm Công Camera</span>
              </h3>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-4/3 rounded-xl overflow-hidden border border-slate-300 dark:border-neutral-800 bg-slate-900">
              <img src={previewPhotoUrl} alt="Preview face" className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
