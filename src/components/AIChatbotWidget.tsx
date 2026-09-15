'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export default function AIChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Kính chào Quý khách! Em là Trợ lý Ẩm thực Smart. Quý khách cần tư vấn chọn gà hoa tiêu nguyên con, gà nửa con hay các món nhắm giòn sần sật cứ nhắn em nhé!',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const msgText = textToSend || input;
    if (!msgText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'Lỗi xử lý câu trả lời');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Dạ em đang gặp chút gián đoạn kết nối, Quý khách vui lòng thử lại hoặc chọn món trực tiếp trên thực đơn nhé!',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#121419] hover:bg-[#181B20] text-amber-300 p-4 rounded-full shadow-[0_0_25px_rgba(217,119,6,0.2)] flex items-center gap-3 border border-amber-500/40 transition-all duration-300 transform hover:scale-105"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-amber-400 stroke-[1.5]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-neutral-950" />
          </div>
          <span className="font-extrabold text-xs pr-1 hidden sm:inline tracking-tight text-[#FAFAF9]">
            Trợ Lý Ẩm Thực Smart
          </span>
        </button>
      )}

      {/* Popup Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-[#121419] rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-[#0B0D11] text-[#FAFAF9] p-4 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bot className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 gold-gradient-text tracking-tight">
                  Trợ Lý Ẩm Thực Smart <Sparkles className="w-3.5 h-3.5 text-amber-400 stroke-[1.5]" />
                </h3>
                <span className="text-[10px] text-neutral-400 font-normal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Tư vấn & Đặt món tự động
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-[#0B0D11]/60 border-b border-neutral-800 p-2 flex gap-2 overflow-x-auto text-[11px] font-semibold text-neutral-300 scrollbar-none">
            <button
              onClick={() => handleSend('Danh sách địa chỉ 6 cơ sở của Gà Ủ Muối Smart')}
              className="whitespace-nowrap bg-[#181B20] hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl transition text-amber-300/90"
            >
              📍 6 Cơ Sở Trải Khắp
            </button>
            <button
              onClick={() => handleSend('Tư vấn giúp tôi gà nguyên con ngon nhất')}
              className="whitespace-nowrap bg-[#181B20] hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl transition text-amber-300/90"
            >
              🍗 Gà Nguyên Con
            </button>
            <button
              onClick={() => handleSend('Gợi ý combo cho tiệc 4-6 người')}
              className="whitespace-nowrap bg-[#181B20] hover:bg-neutral-800 border border-neutral-800 px-3 py-1.5 rounded-xl transition text-amber-300/90"
            >
              🔥 Combo Tiết Kiệm
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F1115]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 text-xs ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#181B20] border border-neutral-800 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                    <Bot className="w-4 h-4 stroke-[1.5]" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-br-none'
                      : 'bg-[#181B20] text-neutral-200 border border-neutral-800 rounded-bl-none font-normal whitespace-pre-wrap'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span
                    className={`text-[9px] block mt-1.5 text-right ${
                      msg.role === 'user' ? 'text-amber-400/80' : 'text-neutral-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 font-bold">
                    <User className="w-4 h-4 stroke-[1.5]" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 text-xs justify-start items-center text-neutral-400 italic">
                <div className="w-7 h-7 rounded-lg bg-[#181B20] text-amber-400 flex items-center justify-center shrink-0 border border-neutral-800">
                  <Bot className="w-4 h-4 stroke-[1.5]" />
                </div>
                <div className="bg-[#181B20] border border-neutral-800 p-2.5 rounded-2xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-[#0B0D11] border-t border-neutral-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Nhập câu hỏi hoặc đặt món gà..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#14171D] border border-neutral-800 rounded-xl text-xs text-[#FAFAF9] focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold rounded-xl transition"
            >
              <Send className="w-4 h-4 stroke-[1.5]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
