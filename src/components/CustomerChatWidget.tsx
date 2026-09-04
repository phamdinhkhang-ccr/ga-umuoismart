'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Minus, Send, Bot, Sparkles, ShoppingBag, 
  PhoneCall, Truck, CheckCircle2, QrCode, MapPin, CreditCard, 
  Plus, RefreshCw, User, Check, Flame, ChevronRight, Headset, MessageSquareHeart
} from 'lucide-react';
import { createOrder } from '@/actions/orders';
import { addNotification, addOrUpdateCustomerFromOrder, deductInventoryForOrder } from '@/lib/store';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  timestamp: string;
  type?: 'text' | 'menu_cards' | 'quick_actions' | 'customer_form' | 'order_summary' | 'vietqr';
  payload?: any;
}

const MENU_RECOMMENDATIONS = [
  {
    id: 'm1',
    name: 'Gà Ủ Muối Nguyên Con',
    price: 190000,
    unit: 'Con',
    desc: 'Ủ muối hoa tiêu giòn da, kèm 2 bịch nước chấm thần thánh',
    badge: '🌟 Bán Chạy Nhất',
    bg: 'from-amber-500 to-orange-500'
  },
  {
    id: 'm2',
    name: 'Gà Ủ Muối Nửa Con',
    price: 100000,
    unit: 'Nửa con',
    desc: 'Phù hợp 1-2 người ăn, thịt mềm mọng giòn sần sật',
    badge: '👍 Phổ Biến',
    bg: 'from-orange-500 to-amber-600'
  },
  {
    id: 'm3',
    name: 'Chân Gà Rút Xương Sốt Thái',
    price: 65000,
    unit: 'Hộp',
    desc: 'Chân gà giòn sần sật sốt Thái chua cay đậm đà',
    badge: '🌶️ Món Hot',
    bg: 'from-rose-500 to-orange-500'
  },
  {
    id: 'm6',
    name: 'Trà Tắc Khổng Lồ (1 Lít)',
    price: 20000,
    unit: 'Ly 1L',
    desc: 'Trà tắc tươi mát lạnh 1 lít giải nhiệt tức thì',
    badge: '🥤 Best Combo',
    bg: 'from-emerald-500 to-teal-600'
  }
];

export default function CustomerChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Cart & Order State
  const [chatCart, setChatCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', district: 'Quận 1' });
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Welcome Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome-1',
      sender: 'bot',
      text: 'Chào bạn! 🍗 Mình là Trợ Lý AI Gà Ủ Muối Smart. Bạn cần hỗ trợ món gì hoặc muốn đặt hàng giao hỏa tốc ngay hôm nay?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'quick_actions'
    }
  ]);

  // Auto hide tooltip bubble after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Web Audio API Sound Chime for Bot Response & Orders
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.1); // E6
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Helper to add bot message with delay and sound effect
  const addBotMessage = (text: string, type: ChatMessage['type'] = 'text', payload?: any) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      playChimeSound();
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          type,
          payload
        }
      ]);
    }, 600);
  };

  // Add Item to Chat Cart
  const handleAddToCart = (item: typeof MENU_RECOMMENDATIONS[0]) => {
    setChatCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
      }
    });

    addBotMessage(`Dạ tuyệt vời! Đã thêm **${item.name}** vào giỏ hàng. 🛒\nBạn có muốn đặt thêm Trà Tắc hoặc Chân Gà không ạ? Hoặc bấm nút bên dưới để chốt đơn ngay!`, 'quick_actions');
  };

  // Quick Action Handler
  const handleQuickAction = (actionKey: string) => {
    const actionLabels: Record<string, string> = {
      menu: '🍗 Xem Menu Bán Chạy',
      ga_nguyen: '📦 Đặt 1 Gà Nguyên Con',
      chan_ga: '🌶️ Đặt 1 Chân Gà Sốt Thái',
      ship: '🛵 Kiểm Tra Phí Ship',
      support: '📞 Gặp Nhân Viên Tư Vấn',
      checkout: '💳 Chốt Đơn & Giao Ngay'
    };

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: actionLabels[actionKey] || actionKey,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    switch (actionKey) {
      case 'menu':
        addBotMessage('Dạ đây là danh sách các món **Gà Ủ Muối Smart** đang HOT nhất hôm nay. Bạn chọn món thích hợp bên dưới nhé! 👇', 'menu_cards');
        break;

      case 'ga_nguyen':
        handleAddToCart(MENU_RECOMMENDATIONS[0]);
        break;

      case 'chan_ga':
        handleAddToCart(MENU_RECOMMENDATIONS[2]);
        break;

      case 'ship':
        addBotMessage('🛵 **Chính Sách Giao Hàng Hỏa Tốc:**\n• Nội thành Hà Nội & TP.HCM: Giao hỏa tốc trong 20-30 phút.\n• Đơn từ 350.000đ: **Miễn phí vận chuyển (Freeship 100%)**!\n• Đơn dưới 350.000đ: Đồng giá ship 20.000đ.');
        break;

      case 'support':
        addBotMessage('📞 Hotline tổng đài tư vấn trực tiếp: **0901.234.567** (Hoạt động 8h00 - 22h00 hàng ngày). Bạn cũng có thể để lại SĐT để tổng đài gọi lại ngay!');
        break;

      case 'checkout':
        if (chatCart.length === 0) {
          setChatCart([{ id: 'm1', name: 'Gà Ủ Muối Nguyên Con', price: 190000, quantity: 1 }]);
        }
        setShowOrderForm(true);
        addBotMessage('Dạ bạn cho mình xin Tên, Số điện thoại và Địa chỉ nhận hàng nhé! 👇', 'customer_form');
        break;

      default:
        break;
    }
  };

  // Submit User Chat Input Text
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Simple Smart NLP Parsing
    const textLower = userText.toLowerCase();

    // Phone / Order Parser logic
    const phoneMatch = userText.match(/(0[3|5|7|8|9]\d{8})/);
    if (phoneMatch && (textLower.includes('địa chỉ') || textLower.includes('giao') || textLower.includes('hà nội') || textLower.includes('hồ chí minh') || textLower.includes('số'))) {
      const extractedPhone = phoneMatch[0];
      const extractedName = userText.split(',')[0].replace(/\d+/g, '').trim() || 'Khách Hàng AI';
      
      setCustomerInfo((prev) => ({
        ...prev,
        phone: extractedPhone,
        name: extractedName,
        address: userText
      }));

      if (chatCart.length === 0) {
        setChatCart([{ id: 'm1', name: 'Gà Ủ Muối Nguyên Con', price: 190000, quantity: 1 }]);
      }

      addBotMessage('Dạ em đã bóc tách thông tin giao hàng của anh/chị thành công! Vui lòng kiểm tra thẻ tóm tắt đơn hàng bên dưới để xác nhận nhé: 👇', 'order_summary');
      return;
    }

    if (textLower.includes('gà') || textLower.includes('menu') || textLower.includes('món') || textLower.includes('giá')) {
      addBotMessage('Dạ em gửi anh/chị Menu các món Gà Ủ Muối và Đồ Ăn Kèm nổi bật nhất bếp bên em ạ: 👇', 'menu_cards');
    } else if (textLower.includes('ship') || textLower.includes('phí') || textLower.includes('giao')) {
      addBotMessage('🛵 Bếp em giao hỏa tốc toàn quốc. Đơn từ 350.000đ được **Freeship hỏa tốc** tận cửa ạ!');
    } else if (textLower.includes('chào') || textLower.includes('hi') || textLower.includes('alo')) {
      addBotMessage('Dạ em chào anh/chị! Em có thể giúp anh/chị chọn món Gà Ủ Muối nóng hổi nào hôm nay ạ?', 'quick_actions');
    } else {
      addBotMessage('Dạ em đã ghi nhận yêu cầu của anh/chị. Anh/chị bấm nút chọn món bên dưới hoặc để lại Số điện thoại để bên em giao ngay nhé! 👇', 'quick_actions');
    }
  };

  // Submit Mini Form in Chat
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      alert('Vui lòng điền đủ Tên, Số điện thoại và Địa chỉ giao hàng!');
      return;
    }

    if (chatCart.length === 0) {
      setChatCart([{ id: 'm1', name: 'Gà Ủ Muối Nguyên Con', price: 190000, quantity: 1 }]);
    }

    setShowOrderForm(false);
    addBotMessage('Dạ tuyệt vời! Thông tin đơn hàng đã sẵn sàng. Vui lòng xác nhận bên dưới: 👇', 'order_summary');
  };

  // Final Order Confirmation & VietQR Generator
  const handleConfirmOrderAndGetVietQR = async () => {
    const subtotal = chatCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = subtotal >= 350000 ? 30000 : 0;
    const finalAmount = Math.max(0, subtotal - discount);

    const orderPayload = {
      customer_name: customerInfo.name || 'Khách Web Chatbot',
      customer_phone: customerInfo.phone || '0901234567',
      shipping_address: customerInfo.address || '123 Lê Lợi, TP.HCM',
      district: customerInfo.district || 'Quận 1',
      city: 'Hồ Chí Minh',
      branch_id: 'b-vinsmart',
      items: chatCart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity
      })),
      voucher_code: discount > 0 ? 'FREESHIP30K' : undefined,
      note: 'Đơn hàng chốt tự động từ AI Customer Support Chatbot Widget'
    };

    try {
      const res = await createOrder(orderPayload);
      if (res.success && res.order) {
        setCreatedOrder(res.order);

        // Sync with CRM & Store Notification
        addOrUpdateCustomerFromOrder({
          customer_name: res.order.customer_name,
          customer_phone: res.order.customer_phone,
          shipping_address: res.order.shipping_address,
          total_amount: res.order.final_amount,
          order_code: res.order.order_code,
          items_summary: chatCart.map((i) => `${i.quantity}x ${i.name}`).join(', ')
        });

        deductInventoryForOrder(res.order);

        addNotification({
          type: 'ORDER',
          title: `🤖 Đơn mới từ AI Chatbot #${res.order.order_code}`,
          message: `Khách ${res.order.customer_name} vừa chốt đơn ${finalAmount.toLocaleString('vi-VN')} VNĐ qua Chatbot Widget.`,
          link: '/admin/orders',
          actionText: 'Xem đơn ngay'
        });

        // Add VietQR response message inside chat
        addBotMessage(`🎉 **Xác nhận đơn thành công #${res.order.order_code}!**\nĐơn hàng của bạn đã được chuyển tới bếp **CƠ SỞ VIN SMART CITY** để chuẩn bị.\n\nVui lòng quét mã VietQR bên dưới để thanh toán chuyển khoản: 👇`, 'vietqr', {
          order: res.order,
          vietQrUrl: `https://img.vietqr.io/image/MB-0889018221-compact2.png?amount=${finalAmount}&addInfo=${res.order.order_code}&accountName=GA%20U%20MUOI%20SMART`
        });
      }
    } catch (e) {
      console.error('Error creating order from chatbot:', e);
    }
  };

  const cartSubtotal = chatCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartDiscount = cartSubtotal >= 350000 ? 30000 : 0;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* 1. WELCOME TOOLTIP BUBBLE */}
      {showTooltip && !isOpen && (
        <div className="mb-3 max-w-xs bg-white text-slate-900 text-xs p-3 rounded-2xl shadow-xl shadow-orange-500/10 relative animate-in fade-in slide-in-from-bottom-2 duration-300 border border-orange-200">
          <button 
            onClick={() => setShowTooltip(false)}
            className="absolute -top-1.5 -right-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full p-1 cursor-pointer transition"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center space-x-2 font-bold text-slate-800">
            <span>👋 Bạn cần tư vấn đặt món gà nóng hổi?</span>
          </div>
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white rotate-45 border-r border-b border-orange-200"></div>
        </div>
      )}

      {/* 2. CHAT POPUP WINDOW */}
      {isOpen && (
        <div 
          className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-[92vw] sm:w-[390px] ${
            isMinimized ? 'h-16' : 'h-[570px]'
          } transition-all duration-300 flex flex-col overflow-hidden mb-3 animate-in fade-in zoom-in-95 duration-200`}
        >
          {/* HEADER CHAT */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-rose-500 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-inner">
                  <Headset className="w-5.5 h-5.5 text-white stroke-[2.2]" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-orange-600 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                  <span>Trợ Lý CSKH Gà Ủ Muối Smart</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <p className="text-[10px] text-orange-100 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Đang trực tuyến • Sẵn sàng hỗ trợ 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
                title="Đóng chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN MESSAGE STREAM */}
          {!isMinimized && (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs font-medium">
                
                {/* Cart Bar Header if Items Added */}
                {chatCart.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between text-amber-900 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-orange-600" />
                      <span className="font-bold">Giỏ hàng ({chatCart.reduce((s, i) => s + i.quantity, 0)} món):</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-orange-600">{cartTotal.toLocaleString('vi-VN')}đ</span>
                      <button
                        onClick={() => handleQuickAction('checkout')}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Chốt đơn
                      </button>
                    </div>
                  </div>
                )}

                {/* Render Messages Stream */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    
                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 shadow-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-none font-semibold'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {msg.text && (
                        <div className="whitespace-pre-line text-xs font-medium">{msg.text}</div>
                      )}

                      {/* 2.1 MENU CARDS MINI TYPE */}
                      {msg.type === 'menu_cards' && (
                        <div className="mt-3 space-y-2.5">
                          {MENU_RECOMMENDATIONS.map((item) => (
                            <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 hover:border-orange-300 transition">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="inline-block bg-orange-100 text-orange-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded mb-1">
                                    {item.badge}
                                  </span>
                                  <h4 className="font-bold text-slate-900 text-xs">{item.name}</h4>
                                </div>
                                <span className="font-extrabold text-orange-600 text-xs shrink-0">
                                  {item.price.toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">{item.desc}</p>
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="w-full mt-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Thêm Vào Giỏ</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2.2 QUICK ACTION PILLS TYPE */}
                      {msg.type === 'quick_actions' && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button
                            onClick={() => handleQuickAction('menu')}
                            className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>🍗 Xem Menu Bán Chạy</span>
                          </button>
                          <button
                            onClick={() => handleQuickAction('ga_nguyen')}
                            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>📦 Đặt 1 Gà Nguyên Con</span>
                          </button>
                          <button
                            onClick={() => handleQuickAction('chan_ga')}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>🌶️ Đặt Chân Gà Sốt Thái</span>
                          </button>
                          <button
                            onClick={() => handleQuickAction('ship')}
                            className="bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>🛵 Kiểm Tra Phí Ship</span>
                          </button>
                          <button
                            onClick={() => handleQuickAction('support')}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>📞 Gặp Nhân Viên</span>
                          </button>
                        </div>
                      )}

                      {/* 2.3 CUSTOMER FORM IN CHAT */}
                      {msg.type === 'customer_form' && (
                        <form onSubmit={handleFormSubmit} className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-slate-800">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tên Của Bạn:</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Anh Nam"
                              value={customerInfo.name}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Số Điện Thoại:</label>
                            <input
                              type="tel"
                              required
                              placeholder="Ví dụ: 0901234567"
                              value={customerInfo.phone}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-orange-500 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Địa Chỉ Giao Hàng:</label>
                            <input
                              type="text"
                              required
                              placeholder="Số nhà, Tên đường..."
                              value={customerInfo.address}
                              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-orange-500 font-semibold"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-2 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-lg text-xs shadow-sm transition cursor-pointer"
                          >
                            ✓ Hoàn Tất Thông Tin
                          </button>
                        </form>
                      )}

                      {/* 2.4 ORDER SUMMARY CARD */}
                      {msg.type === 'order_summary' && (
                        <div className="mt-3 bg-gradient-to-b from-orange-50 to-white border border-orange-200 rounded-2xl p-3 space-y-2 text-slate-800 shadow-xs">
                          <div className="border-b border-orange-200 pb-1.5 flex items-center justify-between">
                            <span className="font-extrabold text-orange-700 text-xs flex items-center gap-1">
                              <ShoppingBag className="w-3.5 h-3.5" />
                              TÓM TẮT ĐƠN HÀNG CHỐT TỰ ĐỘNG
                            </span>
                            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded">
                              Bếp Vin Smart City
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="space-y-1 text-[11px] font-semibold">
                            {chatCart.map((i) => (
                              <div key={i.id} className="flex justify-between text-slate-700">
                                <span>{i.quantity}x {i.name}</span>
                                <span>{(i.price * i.quantity).toLocaleString('vi-VN')}đ</span>
                              </div>
                            ))}
                          </div>

                          {/* Customer Summary */}
                          <div className="bg-white/80 p-2 rounded-lg text-[10px] text-slate-600 space-y-0.5 font-medium border border-orange-100">
                            <div><strong className="text-slate-800">Khách hàng:</strong> {customerInfo.name || 'Khách AI'} ({customerInfo.phone || '0901234567'})</div>
                            <div><strong className="text-slate-800">Địa chỉ:</strong> {customerInfo.address || '123 Lê Lợi, TP.HCM'}</div>
                          </div>

                          {/* Financials */}
                          <div className="border-t border-orange-200 pt-1.5 space-y-0.5 text-xs">
                            {cartDiscount > 0 && (
                              <div className="flex justify-between text-rose-600 text-[11px]">
                                <span>Khuyến mãi Freeship:</span>
                                <span>-{cartDiscount.toLocaleString('vi-VN')}đ</span>
                              </div>
                            )}
                            <div className="flex justify-between font-extrabold text-slate-900 text-sm">
                              <span>TỔNG THANH TOÁN:</span>
                              <span className="text-orange-600">{cartTotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-1 flex space-x-2">
                            <button
                              onClick={() => setShowOrderForm(true)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] transition cursor-pointer"
                            >
                              ✏️ Sửa Thông Tin
                            </button>
                            <button
                              onClick={handleConfirmOrderAndGetVietQR}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-[10px] shadow-sm transition flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>💳 Xác Nhận VietQR</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2.5 VIETQR CARD IN CHAT */}
                      {msg.type === 'vietqr' && msg.payload && (
                        <div className="mt-3 bg-white border-2 border-emerald-500 rounded-2xl p-3.5 space-y-3 text-slate-800 text-center shadow-md">
                          <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>ĐƠN ĐÃ TẠO THÀNH CÔNG #{msg.payload.order?.order_code}</span>
                          </div>

                          {/* Dynamic VietQR Image */}
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex justify-center">
                            <img
                              src={msg.payload.vietQrUrl}
                              alt="Mã VietQR Thanh Toán"
                              className="w-48 h-48 object-contain rounded-lg shadow-xs"
                            />
                          </div>

                          <div className="text-[11px] font-mono text-slate-600 space-y-0.5">
                            <div>STK: <strong className="text-slate-900">0889018221</strong> (MB Bank)</div>
                            <div>Chủ TK: <strong className="text-slate-900">GA U MUOI SMART</strong></div>
                            <div>Nội dung CK: <strong className="text-orange-600">{msg.payload.order?.order_code}</strong></div>
                          </div>

                          <button
                            onClick={() => {
                              alert('Cảm ơn bạn! Đơn hàng đã được đánh dấu Đã Thanh Toán và đang được chuẩn bị giao nóng hổi!');
                              setIsOpen(false);
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Xác Nhận Đã Chuyển Khoản</span>
                          </button>
                        </div>
                      )}

                    </div>

                    <span className="text-[9px] text-slate-400 px-1 font-semibold">{msg.timestamp}</span>
                  </div>
                ))}

                {/* Bot Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center space-x-2 text-slate-400 bg-white border border-slate-200 rounded-2xl p-2.5 w-fit">
                    <Bot className="w-4 h-4 text-orange-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-600">Trợ Lý AI đang phản hồi...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BAR */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  placeholder="Hỏi AI menu hoặc nhập Tên, SĐT đặt hàng..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-orange-500 focus:bg-white transition"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="p-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-2xl transition cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. FLOATING CSKH TRIGGER BUTTON */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
          setShowTooltip(false);
        }}
        className="group relative bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white p-4 rounded-full shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border-2 border-white/50"
        title="Tư vấn & CSKH trực tuyến 24/7"
      >
        {/* Glowing Online Status Badge */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white items-center justify-center text-[8px] font-extrabold text-white">✓</span>
        </span>

        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <div className="flex items-center justify-center">
            <Headset className="w-7 h-7 text-white stroke-[2.2] animate-bounce" />
          </div>
        )}
      </button>

    </div>
  );
}
