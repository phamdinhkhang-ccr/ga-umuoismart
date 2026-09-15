'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Key,
  MessageSquare,
  Save,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Cpu,
  Sliders,
  Send,
  RotateCcw,
  Bot,
  User,
  Zap,
  ShoppingBag,
  TrendingUp,
  Truck,
  AlertTriangle,
  RefreshCw,
  Brain,
  Plus,
  FileText,
  HelpCircle,
  Edit2,
  Trash2,
  BookOpen,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  latencyMs?: number;
  extractedOrder?: {
    name: string;
    phone: string;
    address: string;
    items: string;
  } | null;
}

interface AIKnowledge {
  id: string;
  category: 'STORAGE' | 'RECIPE' | 'POLICY' | 'HEALTH' | 'GENERAL';
  question?: string | null;
  answer: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export default function AIConfigPage() {
  // Config States
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [keyMessage, setKeyMessage] = useState('');

  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.3);

  // Smart Toggles
  const [syncMenu, setSyncMenu] = useState(true);
  const [upsell, setUpsell] = useState(true);
  const [discountShip, setDiscountShip] = useState(true);
  const [syncBranches, setSyncBranches] = useState(true);
  const [syncPayment, setSyncPayment] = useState(true);
  const [orderLookup, setOrderLookup] = useState(true);

  // Prompt State
  const [systemPrompt, setSystemPrompt] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Knowledge Base States
  const [knowledgeList, setKnowledgeList] = useState<AIKnowledge[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbCategoryFilter, setKbCategoryFilter] = useState('ALL');

  // Knowledge Modal States
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [kbModalType, setKbModalType] = useState<'FAQ' | 'DOC'>('FAQ');
  const [editingKb, setEditingKb] = useState<AIKnowledge | null>(null);
  const [kbForm, setKbForm] = useState({
    category: 'STORAGE' as 'STORAGE' | 'RECIPE' | 'POLICY' | 'HEALTH' | 'GENERAL',
    question: '',
    answer: '',
    isActive: true,
    priority: 0,
  });
  const [savingKb, setSavingKb] = useState(false);

  // Playground Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Dạ em chào anh/chị ạ! Em là Trợ lý Ẩm thực Smart của Gà Ủ Muối Smart. Em đã được nạp Bộ Tri Thức Doanh Nghiệp (bảo quản, cách ăn, đổi trả). Anh/chị có thể chat thử nghiệm câu hỏi ngay nhé! 🍗',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch AI Config & Knowledge Base
  const fetchKnowledge = async () => {
    setKbLoading(true);
    try {
      const res = await fetch('/api/ai/knowledge');
      const data = await res.json();
      if (data.success) {
        setKnowledgeList(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI Knowledge Base:', err);
    } finally {
      setKbLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/settings?group=AI').then((r) => r.json()),
      fetch('/api/ai/knowledge').then((r) => r.json()),
    ])
      .then(([dataSettings, dataKb]) => {
        if (dataSettings.success && dataSettings.settings) {
          setApiKey(dataSettings.settings.GEMINI_API_KEY || '');
          setAiModel(dataSettings.settings.AI_MODEL || 'gemini-1.5-flash');
          setTemperature(parseFloat(dataSettings.settings.AI_TEMPERATURE || '0.3'));
          setSyncMenu(dataSettings.settings.AI_SYNC_MENU !== 'false');
          setUpsell(dataSettings.settings.AI_UPSELL === 'true');
          setDiscountShip(dataSettings.settings.AI_DISCOUNT_SHIP === 'true');
          setSyncBranches(dataSettings.settings.AI_SYNC_BRANCHES !== 'false');
          setSyncPayment(dataSettings.settings.AI_SYNC_PAYMENT !== 'false');
          setOrderLookup(dataSettings.settings.AI_ORDER_LOOKUP !== 'false');
          setSystemPrompt(
            dataSettings.settings.AI_SYSTEM_PROMPT ||
              "Bạn là Trợ Lý Ẩm Thực Thông Minh của 'Gà Ủ Muối Smart'. Giọng điệu nhiệt tình, dạ/vâng lễ phép, tập trung tư vấn thực đơn và chốt đơn nhanh gọn."
          );
        }

        if (dataKb.success) {
          setKnowledgeList(dataKb.items || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Prompt Templates
  const applyTemplate = (type: 'FAST' | 'GENZ' | 'VIP') => {
    if (type === 'FAST') {
      setSystemPrompt(
        "Bạn là Trợ Lý Ẩm Thực Thông Minh của 'Gà Ủ Muối Smart'. Giọng điệu nhiệt tình, dạ/vâng lễ phép, tập trung tư vấn thực đơn và chốt đơn nhanh gọn. Hãy thu thập đủ 4 thông tin: Tên khách hàng, Số điện thoại, Địa chỉ nhận hàng và Món chọn kèm số lượng để tự động tạo đơn giao hỏa tốc."
      );
    } else if (type === 'GENZ') {
      setSystemPrompt(
        "Bạn là Trợ Lý Ẩm Thực Gen Z cực kỳ xì-tin, thân thiện, vui vẻ của 'Gà Ủ Muối Smart'. Dùng từ ngữ gần gũi (dạ em nghe nè, gà siêu mọng nước, giòn rụm luôn ạ). Chủ động giới thiệu các món hot trend và hướng dẫn khách chốt đơn 4 thông tin: Tên, SĐT, Địa chỉ, Danh sách món."
      );
    } else if (type === 'VIP') {
      setSystemPrompt(
        "Bạn là Chuyên Viên Tư Vấn Cấp Cao của thương hiệu 'Gà Ủ Muối Smart'. Ngôn từ sang trọng, lịch sự, chuyên nghiệp. Nhấn mạnh chất lượng gà thả vườn ủ muối hồng dược liệu chuẩn thượng hạng, hỗ trợ khách hàng VIP đặt tiệc và giao hỏa tốc tận nơi."
      );
    }
  };

  // Test API Key Connection
  const handleTestKey = async () => {
    if (!apiKey) {
      setKeyStatus('ERROR');
      setKeyMessage('Vui lòng nhập Gemini API Key trước khi thử nghiệm!');
      return;
    }
    setTestingKey(true);
    setKeyStatus('IDLE');
    setKeyMessage('');

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, respond with OK.' }] }],
          }),
        }
      );

      if (res.ok) {
        setKeyStatus('SUCCESS');
        setKeyMessage('🟢 API Key hợp lệ & Kết nối Google Gemini thành công!');
      } else {
        const errData = await res.json();
        setKeyStatus('ERROR');
        setKeyMessage(`🔴 Lỗi kết nối: ${errData.error?.message || 'API Key không hợp lệ'}`);
      }
    } catch (err: any) {
      setKeyStatus('ERROR');
      setKeyMessage('🔴 Lỗi kết nối máy chủ Google API');
    } finally {
      setTestingKey(false);
    }
  };

  // Save Config Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          GEMINI_API_KEY: apiKey,
          AI_MODEL: aiModel,
          AI_TEMPERATURE: String(temperature),
          AI_SYNC_MENU: syncMenu ? 'true' : 'false',
          AI_UPSELL: upsell ? 'true' : 'false',
          AI_DISCOUNT_SHIP: discountShip ? 'true' : 'false',
          AI_SYNC_BRANCHES: syncBranches ? 'true' : 'false',
          AI_SYNC_PAYMENT: syncPayment ? 'true' : 'false',
          AI_ORDER_LOOKUP: orderLookup ? 'true' : 'false',
          AI_SYSTEM_PROMPT: systemPrompt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        alert(data.error || 'Lỗi lưu cấu hình AI');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  // Knowledge Base Actions
  const handleOpenAddKb = (type: 'FAQ' | 'DOC') => {
    setEditingKb(null);
    setKbModalType(type);
    setKbForm({
      category: type === 'FAQ' ? 'STORAGE' : 'POLICY',
      question: '',
      answer: '',
      isActive: true,
      priority: 0,
    });
    setKbModalOpen(true);
  };

  const handleOpenEditKb = (item: AIKnowledge) => {
    setEditingKb(item);
    setKbModalType(item.question ? 'FAQ' : 'DOC');
    setKbForm({
      category: item.category,
      question: item.question || '',
      answer: item.answer,
      isActive: item.isActive,
      priority: item.priority,
    });
    setKbModalOpen(true);
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbForm.answer.trim()) {
      alert('Vui lòng nhập nội dung câu trả lời hoặc đoạn văn bản tri thức');
      return;
    }

    setSavingKb(true);
    const method = editingKb ? 'PUT' : 'POST';
    const url = editingKb ? `/api/ai/knowledge/${editingKb.id}` : '/api/ai/knowledge';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: kbForm.category,
          question: kbModalType === 'FAQ' ? kbForm.question : null,
          answer: kbForm.answer,
          isActive: kbForm.isActive,
          priority: kbForm.priority,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setKbModalOpen(false);
        fetchKnowledge();
      } else {
        alert(data.error || 'Lỗi lưu tri thức AI');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSavingKb(false);
    }
  };

  const handleToggleKbActive = async (item: AIKnowledge) => {
    try {
      const res = await fetch(`/api/ai/knowledge/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeList((prev) =>
          prev.map((k) => (k.id === item.id ? { ...k, isActive: !k.isActive } : k))
        );
      }
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi tri thức này không?')) return;
    try {
      const res = await fetch(`/api/ai/knowledge/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchKnowledge();
      } else {
        alert(data.error || 'Xóa tri thức thất bại');
      }
    } catch (err) {
      alert('Lỗi máy chủ');
    }
  };

  // Playground Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const msg = textToSend || inputMessage;
    if (!msg.trim() || chatLoading) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMessages);
    if (!textToSend) setInputMessage('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            latencyMs: data.latencyMs,
            extractedOrder: data.extractedOrder,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ Có lỗi xảy ra trong quá trình kết nối với AI.' },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Lỗi kết nối mạng đến máy chủ.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredKnowledge = knowledgeList.filter(
    (k) => kbCategoryFilter === 'ALL' || k.category === kbCategoryFilter
  );

  const categoryBadgeMap: Record<string, { label: string; color: string }> = {
    STORAGE: { label: '🧊 Bảo quản & HSD', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    RECIPE: { label: '🍳 Chế biến & Ăn', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    POLICY: { label: '📜 Chính sách & Ship', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    HEALTH: { label: '🌿 Sức khỏe', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
    GENERAL: { label: '📌 Thông tin chung', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  };

  if (loading) return <div className="p-8 text-center text-neutral-400 text-sm">Đang tải trung tâm cấu hình AI...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-xs border border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-amber-400">
              <Bot className="w-6 h-6 stroke-[2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAFAF9] tracking-tight">
              Trung Tâm Điều Khiển Trợ Lý Ẩm Thực Smart
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Brain className="w-3 h-3 text-amber-400" /> Grounding AI 2.0
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Cấu hình Gemini API, nạp Kho Tri Thức Doanh Nghiệp, System Prompt & Live Playground thử nghiệm trực tiếp.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xs text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in fade-in duration-200 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[1.5]" />
          <span>Đã lưu thành công! Cấu hình AI mới đã được kích hoạt trực tiếp cho Trợ lý Ẩm thực trên trang chủ & POS.</span>
        </div>
      )}

      {/* 2-COLUMN SPLIT VIEW LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (60%): CẤU HÌNH, SYSTEM PROMPT & KHO TRI THỨC AI */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Gemini API Key & Model Selection */}
            <div className="bg-[#14171D] rounded-xs border border-neutral-800 p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider border-b border-neutral-800 pb-3">
                <Key className="w-4 h-4 text-amber-400 stroke-[2]" />
                1. Kết Nối Gemini API & Tùy Chọn Model
              </h2>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Google Gemini API Key:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={testingKey}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/30 rounded-xs text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{testingKey ? 'Đang test...' : 'Kiểm Tra Kết Nối'}</span>
                  </button>
                </div>

                {keyMessage && (
                  <p
                    className={`text-[11px] font-semibold mt-1 ${
                      keyStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {keyMessage}
                  </p>
                )}
                <p className="text-[11px] text-neutral-500 italic">
                  Nếu để trống Key, hệ thống tự động chạy bộ quy tắc tư vấn Ẩm thực thông minh (Smart Concierge Fallback).
                </p>
              </div>

              {/* Model & Temperature */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" /> Model AI Áp Dụng:
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="gemini-1.5-flash">
                      Gemini 1.5 Flash (Khuyên dùng - Phản hồi hỏa tốc &lt; 1s, tối ưu chi phí)
                    </option>
                    <option value="gemini-1.5-pro">
                      Gemini 1.5 Pro (Suy luận sâu, xử lý tình huống phức tạp)
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-neutral-300 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" /> Nhiệt Độ Sáng Tạo:
                    </label>
                    <span className="font-mono font-bold text-amber-400">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-500">
                    💡 Mặc định 0.3 giúp AI tập trung tư vấn chính xác thực đơn, tránh bịa đặt thông tin.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Smart Operational Toggles */}
            <div className="bg-[#14171D] rounded-xs border border-neutral-800 p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider border-b border-neutral-800 pb-3">
                <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                2. Công Tắc Chiến Lược Vận Hành Smart
              </h2>

              <div className="space-y-3">
                {/* Toggle 1 */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={syncMenu}
                    onChange={(e) => setSyncMenu(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-[#FAFAF9] flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      Tự động đồng bộ Menu & Tồn kho Real-time
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Khi bật: Hệ thống tự động nạp danh sách các món đang CÒN HÀNG và GIÁ BÁN mới nhất từ Database vào prompt ngầm.
                    </p>
                  </div>
                </label>

                {/* Toggle 2 */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={upsell}
                    onChange={(e) => setUpsell(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      Kích hoạt Upsell Món Kèm Tự Động
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Tự động mời thêm Nước chấm sốt ớt xanh hoặc Chân gà rút xương khi khách mới chỉ gọi món gà.
                    </p>
                  </div>
                </label>

                {/* Toggle 3 */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={discountShip}
                    onChange={(e) => setDiscountShip(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      Tự động áp dụng Hỗ trợ 35k Ship
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Nhắc khách ưu đãi freeship / hỗ trợ 35k ship khi tổng đơn hàng đạt từ 355.000 đ.
                    </p>
                  </div>
                </label>

                {/* Toggle 4: Branches Sync */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={syncBranches}
                    onChange={(e) => setSyncBranches(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      Tự động đồng bộ Hệ Thống Cơ Sở Real-time
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Nạp danh sách các cơ sở kèm địa chỉ, số hotline và trạng thái Mở/Đóng cửa trực tiếp vào context của AI.
                    </p>
                  </div>
                </label>

                {/* Toggle 5: Payment Sync */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={syncPayment}
                    onChange={(e) => setSyncPayment(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Tự động đồng bộ Thông Tin Thanh Toán / STK Ngân Hàng
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Nạp STK, tên chủ tài khoản, ngân hàng của từng cơ sở để AI tự động cung cấp STK chính xác khi khách hỏi chuyển khoản.
                    </p>
                  </div>
                </label>

                {/* Toggle 6: Order Lookup */}
                <label className="flex items-start gap-3 p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={orderLookup}
                    onChange={(e) => setOrderLookup(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded-xs mt-0.5 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Tích hợp Công Cụ Tra Cứu Đơn Hàng (Function Calling / Tool Lookup)
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Cho phép AI tra cứu trạng thái đơn, link tracking xe máy, tiến độ giao hàng khi khách nhập SĐT hoặc mã đơn (#DH-...).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. System Prompt Training */}
            <div className="bg-[#14171D] rounded-xs border border-neutral-800 p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider border-b border-neutral-800 pb-3">
                <MessageSquare className="w-4 h-4 text-amber-400 stroke-[2]" />
                3. Huấn Luyện System Prompt (Chiến Lược Chốt Đơn)
              </h2>

              {/* Quick Prompt Templates */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-400">
                  ⚡ Mẫu Prompt Gợi Ý Nhanh (Quick Prompt Templates):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate('FAST')}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/40 rounded-xs text-xs font-bold transition flex items-center gap-1"
                  >
                    ⚡ Chốt Đơn Nhanh & Lễ Phép
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('GENZ')}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-purple-500/20 text-neutral-300 hover:text-purple-400 border border-neutral-700 hover:border-purple-500/40 rounded-xs text-xs font-bold transition flex items-center gap-1"
                  >
                    🎯 Bán Hàng Thân Mật Gen Z
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('VIP')}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-400 border border-neutral-700 hover:border-emerald-500/40 rounded-xs text-xs font-bold transition flex items-center gap-1"
                  >
                    💎 Chăm Sóc Khách VIP
                  </button>
                </div>
              </div>

              {/* Prompt Textarea */}
              <textarea
                rows={7}
                required
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full p-3.5 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono leading-relaxed text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                placeholder="Bạn là Trợ Lý Ẩm Thực Thông Minh của 'Gà Ủ Muối Smart'..."
              />

              <div className="bg-amber-500/10 p-3.5 rounded-xs border border-amber-500/30 text-[11px] text-neutral-300 leading-relaxed font-light flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-400">Mẹo huấn luyện:</strong> Trợ lý AI sẽ tự động thu thập đủ 4 thông tin: <em className="text-amber-300 font-semibold">Tên khách hàng, Số điện thoại, Địa chỉ nhận hàng, Danh sách món</em> để tự động tạo đơn lưu vào DB.
                </div>
              </div>
            </div>

            {/* Main Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-extrabold text-xs uppercase tracking-widest rounded-xs shadow-lg transition duration-300 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 stroke-[2]" />
              <span>{saving ? 'Đang Lưu Cấu Hình AI...' : '💾 LƯU & ÁP DỤNG NGAY CHO TRỢ LÝ ẨM THỰC'}</span>
            </button>
          </form>

          {/* 4. KHO TRI THỨC AI (AI KNOWLEDGE BASE - GROUNDING CONTEXT) */}
          <div className="bg-[#14171D] rounded-xs border border-neutral-800 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#FAFAF9] flex items-center gap-2 uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span>🧠 Cơ Sở Tri Thức Ẩm Thực (AI Knowledge Base)</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Grounding Context
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Nạp tài liệu, hướng dẫn bảo quản, câu hỏi thường gặp (FAQ) và quy định đổi trả để AI trả lời chuẩn xác.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddKb('FAQ')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xs shadow transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ FAQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddKb('DOC')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-[#FAFAF9] font-extrabold text-xs rounded-xs shadow transition flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📄 Văn Bản Dài</span>
                </button>
                <button
                  type="button"
                  onClick={fetchKnowledge}
                  disabled={kbLoading}
                  className="p-1.5 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xs transition text-xs font-bold"
                  title="Đồng Bộ Kiến Thức Ngay"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${kbLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-semibold text-neutral-400 shrink-0">Lọc chủ đề:</span>
              <button
                type="button"
                onClick={() => setKbCategoryFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition shrink-0 ${
                  kbCategoryFilter === 'ALL'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Tất cả ({knowledgeList.length})
              </button>
              <button
                type="button"
                onClick={() => setKbCategoryFilter('STORAGE')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition shrink-0 ${
                  kbCategoryFilter === 'STORAGE'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'text-neutral-400 hover:text-blue-400'
                }`}
              >
                🧊 Bảo quản & HSD
              </button>
              <button
                type="button"
                onClick={() => setKbCategoryFilter('RECIPE')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition shrink-0 ${
                  kbCategoryFilter === 'RECIPE'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-neutral-400 hover:text-amber-400'
                }`}
              >
                🍳 Chế biến
              </button>
              <button
                type="button"
                onClick={() => setKbCategoryFilter('POLICY')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition shrink-0 ${
                  kbCategoryFilter === 'POLICY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-neutral-400 hover:text-emerald-400'
                }`}
              >
                📜 Chính sách & Ship
              </button>
              <button
                type="button"
                onClick={() => setKbCategoryFilter('HEALTH')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xs transition shrink-0 ${
                  kbCategoryFilter === 'HEALTH'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'text-neutral-400 hover:text-purple-400'
                }`}
              >
                🌿 Sức khỏe
              </button>
            </div>

            {/* Knowledge Base Table */}
            <div className="border border-neutral-800 rounded-xs overflow-hidden bg-[#0B0D11]">
              <div className="max-h-[380px] overflow-y-auto">
                {filteredKnowledge.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-neutral-600 mx-auto stroke-[1.5]" />
                    <p className="text-xs text-neutral-400 italic">
                      Chưa có dữ liệu tri thức nào thuộc nhóm này. Hãy bấm <strong className="text-amber-400">+ FAQ</strong> hoặc <strong className="text-purple-400">📄 Văn Bản Dài</strong> để nạp ngay!
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#14171D] text-neutral-400 font-semibold border-b border-neutral-800 uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3">CHỦ ĐỀ</th>
                        <th className="py-2.5 px-3">CÂU HỎI / NỘI DUNG TRI THỨC</th>
                        <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                        <th className="py-2.5 px-3 text-right pr-4">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredKnowledge.map((item) => {
                        const badgeInfo = categoryBadgeMap[item.category] || categoryBadgeMap['GENERAL'];
                        return (
                          <tr key={item.id} className="hover:bg-neutral-800/40 transition">
                            <td className="py-3 px-3 align-top">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs border ${badgeInfo.color}`}>
                                {badgeInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 align-top space-y-1">
                              {item.question && (
                                <p className="font-bold text-amber-400 flex items-center gap-1 text-xs">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>{item.question}</span>
                                </p>
                              )}
                              <p className="text-neutral-300 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                                {item.answer}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleToggleKbActive(item)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                                  item.isActive
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                                }`}
                              >
                                {item.isActive ? '🟢 Bật' : '⚪ Tắt'}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-right pr-4 align-top">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditKb(item)}
                                  className="p-1.5 bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/30 rounded-xs transition"
                                  title="Sửa tri thức"
                                >
                                  <Edit2 className="w-3 h-3 stroke-[1.5]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKb(item.id)}
                                  className="p-1.5 bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-400 border border-neutral-700 hover:border-rose-500/30 rounded-xs transition"
                                  title="Xóa tri thức"
                                >
                                  <Trash2 className="w-3 h-3 stroke-[1.5]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (40%): KHUNG CHAT THỬ NGHIỆM PLAYGROUND */}
        <div className="lg:col-span-5 flex flex-col bg-[#14171D] rounded-xs border border-neutral-800 shadow-xs h-[850px] p-4 space-y-3">
          {/* Playground Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                <span>Chat Thử Nghiệm Trợ Lý Smart (Live Preview)</span>
              </h2>
              <p className="text-[11px] text-neutral-400">Test hỏi đáp tri thức vừa nạp, tốc độ & chốt đơn</p>
            </div>
            <button
              onClick={() =>
                setChatMessages([
                  {
                    role: 'assistant',
                    content:
                      'Dạ em chào anh/chị ạ! Em là Trợ lý Ẩm thực Smart của Gà Ủ Muối Smart. Em đã được nạp Bộ Tri Thức Doanh Nghiệp (bảo quản, cách ăn, đổi trả). Anh/chị có thể chat thử nghiệm câu hỏi ngay nhé! 🍗',
                  },
                ])
              }
              className="p-1.5 bg-[#0B0D11] hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 rounded-xs transition text-[11px] font-semibold flex items-center gap-1 shrink-0"
              title="Xóa Lịch Sử Chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xóa Lịch Sử</span>
            </button>
          </div>

          {/* Quick Prompt Test Buttons */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-neutral-400">💡 Bấm nhanh tin nhắn để test Tri Thức:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSendMessage('Gà bảo quản thế nào và để được bao lâu?')}
                className="px-2.5 py-1 bg-[#0B0D11] hover:bg-neutral-800 text-amber-400 text-[10px] font-bold border border-amber-500/30 rounded-xs transition"
              >
                "Gà bảo quản thế nào?"
              </button>
              <button
                onClick={() => handleSendMessage('Chính sách đền bù đổi trả nếu rách bọc hút chân không?')}
                className="px-2.5 py-1 bg-[#0B0D11] hover:bg-neutral-800 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 rounded-xs transition"
              >
                "Chính sách đền bù đổi trả?"
              </button>
              <button
                onClick={() => handleSendMessage('Cho mình 1 con gà ship về Vin Smart')}
                className="px-2.5 py-1 bg-[#0B0D11] hover:bg-neutral-800 text-[#FAFAF9] text-[10px] font-medium border border-neutral-800 rounded-xs transition"
              >
                "1 gà ship Vin Smart"
              </button>
            </div>
          </div>

          {/* Chat Bubble Scrollable Area */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#0B0D11] rounded-xs border border-neutral-800/80 text-xs">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] space-y-2 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'bg-[#14171D] border border-neutral-800 text-[#FAFAF9]'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Extracted Order Preview Card */}
                  {msg.extractedOrder && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xs p-3 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 font-extrabold">
                        <Sparkles className="w-4 h-4" />
                        <span>📋 AI đã trích xuất thông tin đơn hàng:</span>
                      </div>
                      <div className="text-neutral-200 font-mono space-y-0.5 pl-5">
                        <p>• <strong>Khách hàng:</strong> {msg.extractedOrder.name}</p>
                        <p>• <strong>SĐT:</strong> {msg.extractedOrder.phone}</p>
                        <p>• <strong>Địa chỉ:</strong> {msg.extractedOrder.address}</p>
                        <p>• <strong>Món:</strong> {msg.extractedOrder.items}</p>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-bold pl-5">
                        ✓ Sẵn sàng tự động khởi tạo đơn trong DB!
                      </p>
                    </div>
                  )}

                  {/* Latency counter */}
                  {msg.latencyMs && (
                    <span className="text-[9px] text-neutral-500 block font-mono">
                      ⚡ Phản hồi: {(msg.latencyMs / 1000).toFixed(2)}s ({aiModel})
                    </span>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 bg-[#14171D] border border-neutral-800 rounded-xs text-neutral-400 text-xs italic flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Trợ lý AI đang tra cứu Kho Tri Thức & tư vấn...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Playground Chat Input Box */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Nhập tin nhắn thử nghiệm (VD: Gà để tủ lạnh được mấy ngày?)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-[#FAFAF9] placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={chatLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xs shadow transition flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL NẠP KHO TRI THỨC (FAQ / VĂN BẢN DÀI) */}
      {kbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#14171D] border border-neutral-800 rounded-xs max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold text-[#FAFAF9] flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span>
                  {editingKb
                    ? 'Chỉnh Sửa Tri Thức AI'
                    : kbModalType === 'FAQ'
                    ? 'Thêm Câu Hỏi & Trả Lời (FAQ)'
                    : 'Nạp Văn Bản / Hướng Dẫn Dài'}
                </span>
              </h2>
              <button
                onClick={() => setKbModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKb} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Chủ Đề / Phân Loại (*):</label>
                  <select
                    value={kbForm.category}
                    onChange={(e) =>
                      setKbForm({
                        ...kbForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="STORAGE">🧊 Bảo quản & HSD (Storage)</option>
                    <option value="RECIPE">🍳 Chế biến & Cách ăn (Recipe)</option>
                    <option value="POLICY">📜 Chính sách & Ship/Đổi trả (Policy)</option>
                    <option value="HEALTH">🌿 Sức khỏe & Dinh dưỡng (Health)</option>
                    <option value="GENERAL">📌 Thông tin chung (General)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Độ Ưu Tiên (Priority):</label>
                  <input
                    type="number"
                    value={kbForm.priority}
                    onChange={(e) => setKbForm({ ...kbForm, priority: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs text-neutral-200 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {kbModalType === 'FAQ' && (
                <div>
                  <label className="block font-semibold text-amber-400 mb-1 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Câu Hỏi Thường Gặp (FAQ Question):</span>
                  </label>
                  <input
                    type="text"
                    value={kbForm.question}
                    onChange={(e) => setKbForm({ ...kbForm, question: e.target.value })}
                    placeholder="Ví dụ: Gà ủ muối bảo quản ngăn mát được bao lâu?"
                    className="w-full px-3 py-2 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-semibold text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-purple-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {kbModalType === 'FAQ' ? 'Nội Dung Trả Lời Chuẩn (*):' : 'Nội Dung Văn Bản / Hướng Dẫn Chi Tiết (*):'}
                  </span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={kbForm.answer}
                  onChange={(e) => setKbForm({ ...kbForm, answer: e.target.value })}
                  placeholder={
                    kbModalType === 'FAQ'
                      ? 'Nhập câu trả lời chi tiết và chính xác mà AI bắt buộc tuân thủ...'
                      : 'Dán nguyên bài viết cẩm nang, quy trình đền bù 1 đổi 1 hoặc hướng dẫn vận hành...'
                  }
                  className="w-full p-3 bg-[#0B0D11] border border-neutral-800 rounded-xs text-xs font-mono leading-relaxed text-[#FAFAF9] focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kbForm.isActive}
                    onChange={(e) => setKbForm({ ...kbForm, isActive: e.target.checked })}
                    className="w-4 h-4 accent-purple-500 rounded-xs cursor-pointer"
                  />
                  <span className="font-semibold text-neutral-200">Bật kích hoạt tri thức này cho Trợ lý AI</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setKbModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingKb}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-[#FAFAF9] font-extrabold rounded-xs shadow transition flex items-center gap-1.5"
                >
                  {savingKb ? 'Đang Lưu...' : editingKb ? 'Lưu Thay Đổi' : 'Nạp Tri Thức Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
