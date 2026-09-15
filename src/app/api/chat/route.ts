import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ success: false, error: 'Tin nhắn không hợp lệ' }, { status: 400 });
    }

    // 1. Fetch AI settings from database
    const settings = await prisma.setting.findMany({
      where: { group: 'AI' },
    });
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));

    const apiKey = settingsMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '';
    const aiModel = settingsMap['AI_MODEL'] || 'gemini-1.5-flash';
    const temperature = parseFloat(settingsMap['AI_TEMPERATURE'] || '0.3');
    const syncMenu = settingsMap['AI_SYNC_MENU'] !== 'false';
    const upsell = settingsMap['AI_UPSELL'] === 'true';
    const discountShip = settingsMap['AI_DISCOUNT_SHIP'] === 'true';
    const syncBranches = settingsMap['AI_SYNC_BRANCHES'] !== 'false';
    const syncPayment = settingsMap['AI_SYNC_PAYMENT'] !== 'false';
    const orderLookup = settingsMap['AI_ORDER_LOOKUP'] !== 'false';
    const systemPromptCustom =
      settingsMap['AI_SYSTEM_PROMPT'] ||
      "Bạn là Trợ Lý Ẩm Thực Thông Minh của 'Gà Ủ Muối Smart'. Giọng điệu nhiệt tình, dạ/vâng lễ phép, tập trung tư vấn thực đơn và chốt đơn nhanh gọn.";

    // 2. Parallel Database Fetching (Real-time Context Assembly)
    const [products, branches, paymentConfigs, activeKnowledge] = await Promise.all([
      syncMenu
        ? prisma.product.findMany({
            where: { isAvailable: true },
            select: { id: true, name: true, price: true, stockQuantity: true, type: true, unit: true, description: true },
          })
        : Promise.resolve([]),
      syncBranches
        ? prisma.branch.findMany({
            where: { isActive: true },
            select: { code: true, name: true, address: true, hotline: true, openingHours: true },
            orderBy: { sortOrder: 'asc' },
          })
        : Promise.resolve([]),
      syncPayment
        ? prisma.paymentConfig.findMany({
            include: { branch: true },
          })
        : Promise.resolve([]),
      prisma.aIKnowledge.findMany({
        where: { isActive: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const userMessage = messages[messages.length - 1]?.content || '';

    // 3. Pre-check Order Lookup if user provided phone number or order code
    let lookedUpOrderContext = '';
    const phoneMatch = userMessage.match(/\b(0[3|5|7|8|9][0-9]{8})\b/);
    const orderCodeMatch = userMessage.match(/DH[-_]?\d+/i) || userMessage.match(/\b\d{5,}\b/);

    if (orderLookup && (phoneMatch || orderCodeMatch || userMessage.toLowerCase().includes('đơn') || userMessage.toLowerCase().includes('tra cứu') || userMessage.toLowerCase().includes('giao'))) {
      const searchTerm = orderCodeMatch ? orderCodeMatch[0] : (phoneMatch ? phoneMatch[0] : '');
      if (searchTerm) {
        const orderData = await lookupOrderInDb(searchTerm);
        if (orderData) {
          lookedUpOrderContext = `\n[KẾT QUẢ TRA CỨU ĐƠN HÀNG THỜI GIAN THỰC]:
- Mã đơn: ${orderData.orderCode}
- Khách hàng: ${orderData.customerName} (${orderData.customerPhone})
- Địa chỉ nhận: ${orderData.deliveryAddress}
- Trạng thái đơn: ${orderData.statusText}
- Trạng thái thanh toán: ${orderData.paymentStatusText} (${orderData.paymentMethod})
- Tổng tiền: ${orderData.totalAmount}
- Cơ sở xuất hàng: ${orderData.branchName}
- Đơn vị vận chuyển: ${orderData.carrierName}
- Tài xế: ${orderData.driverName} (${orderData.driverPhone})
${orderData.trackingUrl ? `- Link theo dõi tài xế (Real-time Tracking): ${orderData.trackingUrl}` : ''}
- Món đặt: ${orderData.itemsText}\n`;
        }
      }
    }

    // 4. Construct Dynamic System Prompt
    let knowledgeContext = '';
    if (activeKnowledge.length > 0) {
      const categoryNames: Record<string, string> = {
        STORAGE: 'Bảo quản & HSD',
        RECIPE: 'Chế biến & Cách ăn',
        POLICY: 'Chính sách & Ship/Đổi trả',
        HEALTH: 'Sức khỏe & Dinh dưỡng',
        GENERAL: 'Thông tin doanh nghiệp',
      };

      knowledgeContext = `\n=== BỘ TRI THỨC DOANH NGHIỆP BẮT BUỘC TUÂN THỦ (GÀ Ủ MUỐI SMART) ===\n` +
        activeKnowledge
          .map((k) => {
            const catLabel = categoryNames[k.category] || k.category;
            if (k.question) {
              return `[Chủ đề: ${catLabel}]\nHỏi: ${k.question}\nĐáp: ${k.answer}`;
            } else {
              return `[Chủ đề: ${catLabel}]\nNội dung: ${k.answer}`;
            }
          })
          .join('\n---\n') +
        `\n=====================================================================\n`;
    }

    let extraInstructions = '';
    if (upsell) {
      extraInstructions += '\n- CHIẾN LƯỢC UPSELL: Hãy chủ động gợi ý khách chọn thêm Nước chấm sốt ớt xanh thần thánh (25.000 đ) hoặc Chân gà rút xương giòn rụm (75.000 đ) khi khách chọn gà.';
    }
    if (discountShip) {
      extraInstructions += '\n- ƯU ĐÃI VẬN CHUYỂN: Nhắc khách đơn từ 355.000 đ sẽ được HỖ TRỢ 35K PHÍ SHIP / FREESHIP hỏa tốc tận nơi.';
    }

    let realTimeContext = `\n=== DỮ LIỆU HỆ THỐNG REAL-TIME CẬP NHẬT TẠI THỜI ĐIỂM NÀY ===\n`;

    if (syncBranches && branches.length > 0) {
      realTimeContext += `\n[DANH SÁCH CHI NHÁNH / CƠ SỞ]:\n` +
        branches.map((b) => `- ${b.code?.toUpperCase() || 'CS'}: ${b.name} | Địa chỉ: ${b.address} | Hotline: ${b.hotline} | Giờ mở: ${b.openingHours}`).join('\n') + `\n`;
    }

    if (syncMenu && products.length > 0) {
      realTimeContext += `\n[MENU MÓN VÀ TÌNH TRẠNG]:\n` +
        products.map((p) => `- ${p.name} (${p.type === 'COMBO' ? 'Combo' : 'Món lẻ'}): ${p.price.toLocaleString('vi-VN')}đ | Tình trạng: ${p.stockQuantity > 0 ? 'Còn Hàng' : 'Tạm Hết Hàng'}`).join('\n') + `\n`;
    }

    if (syncPayment && paymentConfigs.length > 0) {
      realTimeContext += `\n[THÔNG TIN CHUYỂN KHOẢN THEO CƠ SỞ]:\n` +
        paymentConfigs.map((c) => `- ${c.branch?.name || 'Cơ sở'}: Ngân hàng ${c.bankName} (${c.bankId}), STK: ${c.accountNumber}, Chủ TK: ${c.accountName}, Cú pháp: ${c.transferSyntax}`).join('\n') + `\n`;
    }

    if (lookedUpOrderContext) {
      realTimeContext += lookedUpOrderContext;
    }

    realTimeContext += `\n=== QUY TẮC BẢO MẬT THÔNG TIN NỘI BỘ (BẮT BUỘC) ===
- TUYỆT ĐỐI KHÔNG hiển thị số lượng tồn kho (ví dụ: "còn 50 con", "tồn kho 20 cái") trong câu trả lời cho khách.
- Khi tư vấn thực đơn: Chỉ giới thiệu Tên món kèm Giá tiền (ví dụ: "🍗 Gà ủ muối: 100.000đ").
- Chỉ sử dụng dữ liệu kho để nhận biết:
  + Món "Còn Hàng": Tư vấn, nhận order bình thường.
  + Món "Tạm Hết Hàng": Thông báo món hiện đang tạm hết và khéo léo gợi ý khách đổi sang món khác.

=== QUY TẮC PHẢN HỒI THÔNG MINH CHO AI ===
1. Tư vấn chi nhánh: Nếu khách báo ở khu vực nào (VD: Nam Từ Liêm, Tây Mỗ, Cầu Giấy, Đống Đa), gợi ý ngay cơ sở gần nhất theo danh sách trên.
2. Kiểm tra món hết hàng: Nếu món có tình trạng = 'Tạm Hết Hàng', báo khách món đó tạm hết và khéo léo gợi ý sang món khác còn hàng.
3. Hướng dẫn chuyển khoản: Khi khách xin số tài khoản, hỏi khách nhận từ cơ sở nào hoặc kiểm tra cơ sở đang giao để đưa đúng STK của chi nhánh đó, nhắc đúng cú pháp để hệ thống Web2M tự kích hoạt đơn.
4. Tra cứu đơn hàng: Khi khách gửi mã đơn hoặc SĐT, kiểm tra ngay tiến độ (Đang làm bếp, Đang giao kèm link tracking tài xế Grab/Be/Xanh SM nếu có).`;

    const fullSystemPrompt = `${systemPromptCustom}

${knowledgeContext}

${realTimeContext}

${extraInstructions}

HƯỚNG DẪN QUAN TRỌNG:
1. Bạn phải luôn ưu tiên sử dụng DỮ LIỆU HỆ THỐNG REAL-TIME, BỘ TRI THỨC DOANH NGHIỆP và THÔNG TIN TÀI KHOẢN NGÂN HÀNG để giải đáp chính xác câu hỏi của khách.
2. Nếu khách hỏi địa chỉ cơ sở, hãy tư vấn cơ sở gần nhất theo danh sách trên.
3. Nếu khách hàng hỏi STK hoặc chuyển khoản, cung cấp rõ Ngân hàng, STK, Chủ tài khoản của cơ sở tương ứng.
4. Nếu khách hàng muốn đặt hàng, xác nhận đủ 4 thông tin: Tên khách hàng, Số điện thoại, Địa chỉ giao hàng, Danh sách món ăn kèm số lượng.
5. Khi đã có đủ 4 thông tin này, hãy xác nhận tạo đơn cho khách.`;

    const extractedOrder = parseOrderInfo(userMessage, products);

    // Call Gemini API if Key is present
    if (apiKey) {
      try {
        const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        
        const geminiTools = orderLookup
          ? [
              {
                functionDeclarations: [
                  {
                    name: 'lookupOrder',
                    description: 'Tra cứu tiến độ và thông tin vận chuyển của đơn hàng dựa trên số điện thoại khách hàng hoặc mã đơn (VD: DH78510).',
                    parameters: {
                      type: 'OBJECT',
                      properties: {
                        phone: { type: 'STRING', description: 'Số điện thoại khách hàng' },
                        orderCode: { type: 'STRING', description: 'Mã đơn hàng, ví dụ: DH78510 hoặc 78510' },
                      },
                    },
                  },
                ],
              },
            ]
          : undefined;

        const response = await fetch(modelEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature,
            },
            ...(geminiTools && { tools: geminiTools }),
            contents: [
              { role: 'user', parts: [{ text: fullSystemPrompt }] },
              ...messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const call = candidate?.content?.parts?.[0]?.functionCall;

          let replyText = candidate?.content?.parts?.[0]?.text || '';

          // Handle Gemini Function Call for Order Lookup if triggered
          if (call && call.name === 'lookupOrder') {
            const args = call.args || {};
            const orderData = await lookupOrderInDb(args.orderCode || args.phone || userMessage);
            if (orderData) {
              replyText = `Dạ em đã kiểm tra tiến độ đơn hàng trên hệ thống rồi ạ!\n\n` +
                `📦 **MÃ ĐƠN:** ${orderData.orderCode}\n` +
                `👤 **Khách hàng:** ${orderData.customerName} (${orderData.customerPhone})\n` +
                `📍 **Địa chỉ giao:** ${orderData.deliveryAddress}\n` +
                `🏪 **Cơ sở xử lý:** ${orderData.branchName}\n` +
                `🍗 **Món ăn:** ${orderData.itemsText}\n` +
                `💰 **Tổng tiền:** ${orderData.totalAmount} (${orderData.paymentMethod} - ${orderData.paymentStatusText})\n` +
                `⏳ **Trạng thái:** **${orderData.statusText}**\n` +
                `🛵 **Tài xế giao hàng:** ${orderData.carrierName} - ${orderData.driverName} (${orderData.driverPhone})\n` +
                (orderData.trackingUrl ? `🔗 **Link theo dõi tài xế hỏa tốc:** ${orderData.trackingUrl}\n` : '') +
                `\nCảm ơn anh/chị đã kiên nhẫn chờ đợi! Đơn hàng đang được chuẩn bị và giao sớm nhất ạ! 🍗`;
            } else {
              replyText = `Dạ em đã tra cứu trên hệ thống nhưng chưa tìm thấy đơn hàng nào khớp với thông tin "${args.orderCode || args.phone || userMessage}". Anh/chị kiểm tra lại giúp em SĐT hoặc Mã đơn hàng nhé ạ!`;
            }
          }

          if (!replyText) {
            replyText = 'Dạ, Gà Ủ Muối Smart nghe đây ạ! Em có thể tư vấn thực đơn, địa chỉ cơ sở hay kiểm tra đơn hàng cho anh/chị ạ?';
          }

          const latencyMs = Date.now() - startTime;
          const orderCreatedCode = await tryAutoCreateOrderFromChat(userMessage, replyText, products);

          if (orderCreatedCode) {
            return NextResponse.json({
              success: true,
              reply: `${replyText}\n\n🎉 **Hệ thống đã tự động tạo đơn thành công!**\nMã đơn hàng của bạn là: **${orderCreatedCode}**. Bạn có thể dùng mã này để tra cứu trạng thái đơn hàng bất cứ lúc nào!`,
              extractedOrder: extractedOrder || {
                phone: '0988888888',
                name: 'Khách Hàng',
                address: 'Hà Nội',
                items: 'Gà Ủ Muối Hoa Tiêu',
              },
              latencyMs,
            });
          }

          return NextResponse.json({
            success: true,
            reply: replyText,
            extractedOrder,
            latencyMs,
          });
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, falling back to smart concierge:', geminiErr);
      }
    }

    // Smart Concierge Fallback (when API Key is missing or invalid)
    let fallbackReply = '';
    const lower = userMessage.toLowerCase();

    // Check if user is asking for order lookup in Fallback Mode
    if (orderLookup && (phoneMatch || orderCodeMatch || lower.includes('đơn') || lower.includes('tra cứu'))) {
      const searchTerm = orderCodeMatch ? orderCodeMatch[0] : (phoneMatch ? phoneMatch[0] : '');
      if (searchTerm) {
        const orderData = await lookupOrderInDb(searchTerm);
        if (orderData) {
          fallbackReply = `Dạ em đã kiểm tra tiến độ đơn hàng trên hệ thống cho anh/chị rồi ạ!\n\n` +
            `📦 **MÃ ĐƠN:** ${orderData.orderCode}\n` +
            `👤 **Khách hàng:** ${orderData.customerName} (${orderData.customerPhone})\n` +
            `📍 **Địa chỉ:** ${orderData.deliveryAddress}\n` +
            `🏪 **Cơ sở:** ${orderData.branchName}\n` +
            `🍗 **Món đặt:** ${orderData.itemsText}\n` +
            `💰 **Tổng tiền:** ${orderData.totalAmount} (${orderData.paymentStatusText})\n` +
            `⏳ **Trạng thái:** **${orderData.statusText}**\n` +
            `🛵 **Vận chuyển:** ${orderData.carrierName} - ${orderData.driverName} (${orderData.driverPhone})\n` +
            (orderData.trackingUrl ? `🔗 **Link theo dõi tài xế:** ${orderData.trackingUrl}\n` : '');
        }
      }
    }

    // Check Knowledge Base FAQs in Fallback Mode
    if (!fallbackReply) {
      for (const kb of activeKnowledge) {
        if (kb.question && lower.includes(kb.question.toLowerCase().replace('?', '').trim())) {
          fallbackReply = `Dạ em xin phản hồi quý khách theo đúng quy định chuẩn của Gà Ủ Muối Smart ạ:\n\n${kb.answer}`;
          break;
        }
      }
    }

    if (!fallbackReply) {
      if (lower.includes('bảo quản') || lower.includes('ngăn mát') || lower.includes('ngăn đông') || lower.includes('để được bao lâu')) {
        const storageKB = activeKnowledge.find(k => k.category === 'STORAGE' || (k.question && k.question.includes('bảo quản')));
        if (storageKB) {
          fallbackReply = `Dạ thông tin bảo quản gà chuẩn từ bếp Gà Ủ Muối Smart đây ạ:\n\n${storageKB.answer}`;
        } else {
          fallbackReply = 'Dạ gà ủ muối bảo quản trong túi hút chân không ở ngăn mát tủ lạnh được từ 3-5 ngày, ngăn đông đá được tới 3 tháng ạ! Khi ăn anh/chị chỉ cần rã đông tự nhiên, ăn lạnh giòn sần sật cực kỳ ngon không cần quay lò vi sóng làm teo da gà đâu ạ.';
        }
      } else if (lower.includes('đổi trả') || lower.includes('hư hỏng') || lower.includes('rách') || lower.includes('đền bù')) {
        const policyKB = activeKnowledge.find(k => k.category === 'POLICY' || (k.question && k.question.includes('đổi trả')));
        if (policyKB) {
          fallbackReply = `Dạ chính sách đền bù & đổi trả của Gà Ủ Muối Smart như sau ạ:\n\n${policyKB.answer}`;
        } else {
          fallbackReply = 'Dạ em xin lỗi anh/chị về sự cố này ạ! Gà Ủ Muối Smart cam kết chính sách 1 đổi 1 hỏa tốc trong 2 giờ hoặc hoàn tiền 100% nếu sản phẩm bị dập nát hay lỗi hút chân không ạ!';
        }
      }
    }

    if (!fallbackReply) {
      const orderCreatedCode = await tryAutoCreateOrderFromChat(userMessage, '', products);
      if (orderCreatedCode) {
        return NextResponse.json({
          success: true,
          reply: `Dạ em đã ghi nhận thông tin đặt hàng của anh/chị rồi ạ!\n\n🎉 **Đã tạo đơn hàng thành công!**\nMã đơn hàng của quý khách là: **${orderCreatedCode}**.\nCảm ơn quý khách đã ủng hộ Gà Ủ Muối Smart! Bộ phận bếp đang chuẩn bị món hỏa tốc cho mình đây ạ.`,
          extractedOrder: extractedOrder || {
            phone: '0988888888',
            name: 'Khách Hàng',
            address: 'Hà Nội',
            items: 'Gà Ủ Muối Hoa Tiêu',
          },
          latencyMs: Date.now() - startTime,
        });
      }

      if (lower.includes('cơ sở') || lower.includes('địa chỉ') || lower.includes('ở đâu') || lower.includes('quán') || lower.includes('chi nhánh')) {
        const branchLines = branches.length > 0
          ? branches.map((b) => `• **${b.code?.toUpperCase() || 'CS'} - ${b.name}**: ${b.address} (Hotline: ${b.hotline})`).join('\n')
          : '• **CS1 Cầu Giấy**: 12 Đường Cầu Giấy (Hotline: 0988.888.901)\n• **CS2 Đống Đa**: 88 Phố Xã Đàn (Hotline: 0988.888.902)';
        fallbackReply = `Dạ **Gà Ủ Muối Smart** hiện có các cơ sở sẵn sàng phục vụ hỏa tốc:\n\n${branchLines}\n\nQuý khách có thể ghé trực tiếp hoặc đặt giao tận nơi hỏa tốc trong 30 phút ạ!`;
      } else if (lower.includes('stk') || lower.includes('ngân hàng') || lower.includes('chuyển khoản') || lower.includes('tài khoản')) {
        const payLines = paymentConfigs.length > 0
          ? paymentConfigs.map((c) => `• **${c.branch?.name || 'Cơ sở'}**: Ngân hàng **${c.bankName}** - STK: **${c.accountNumber}** (Chủ TK: ${c.accountName})`).join('\n')
          : '• Ngân hàng MBBank - STK: 0988888888 (Chủ TK: NGUYEN VAN KHANG)';
        fallbackReply = `Dạ thông tin tài khoản chuyển khoản của Gà Ủ Muối Smart đây ạ:\n\n${payLines}\n\n💡 *Lưu ý: Giữ nguyên cú pháp GUM [Mã_Đơn] để hệ thống tự động duyệt tiền về hỏa tốc ạ!*`;
      } else if (lower.includes('chào') || lower.includes('hi') || lower.includes('hello')) {
        fallbackReply =
          'Dạ em chào anh/chị ạ! Em là Trợ lý Ẩm thực Smart của Gà Ủ Muối Smart. Anh/chị muốn thưởng thức gà ủ muối hoa tiêu nguyên con, gà nửa con hay chân gà rút xương giòn rụm hôm nay ạ?';
        if (upsell) {
          fallbackReply += ' Quán em đang có món *Chân gà rút xương sốt thái* & *Sốt ớt xanh* ăn kèm cực kỳ cuốn đấy ạ!';
        }
      } else if (lower.includes('món') || lower.includes('menu') || lower.includes('thực đơn') || lower.includes('bán chạy')) {
        const topProducts = products.length > 0
          ? products.slice(0, 5).map((p) => `• **${p.name}**: ${p.price.toLocaleString('vi-VN')}đ${p.stockQuantity <= 0 ? ' *(Tạm Hết Hàng)*' : ''}`).join('\n')
          : '• **Gà Ủ Muối Hoa Tiêu Nguyên Con**: 190.000đ\n• **Gà Ủ Muối Nửa Con**: 100.000đ';
        fallbackReply = `Dạ **Gà Ủ Muối Smart** hiện có các món cực kỳ hot bao gồm:\n\n${topProducts}\n\nAnh/chị thích món nào cứ nhắn em để em hỗ trợ lên đơn hỏa tốc ngay nhé!`;
        if (discountShip) {
          fallbackReply += '\n\n💡 *Bật mí: Đơn hàng từ 355.000 đ sẽ được HỖ TRỢ 35K PHÍ SHIP hỏa tốc ạ!*';
        }
      } else if (lower.includes('freeship') || lower.includes('ship') || lower.includes('phí giao hàng')) {
        fallbackReply = 'Dạ **Gà Ủ Muối Smart** có chính sách giao hàng hỏa tốc trong 30 phút! Đặc biệt với đơn hàng từ **355.000 đ** trở lên, quán em áp dụng **HỖ TRỢ 35K PHÍ SHIP / FREESHIP** cho anh/chị ạ!';
      } else if (lower.includes('đặt') || lower.includes('mua') || lower.includes('giao')) {
        fallbackReply =
          'Dạ để em hỗ trợ tạo đơn giao hàng hỏa tốc ạ! Anh/chị vui lòng cung cấp giúp em:\n1. **Họ tên người nhận**\n2. **Số điện thoại**\n3. **Địa chỉ giao hàng**\n4. **Món chọn và số lượng**\n\nVí dụ: *Minh, 0912345678, 12 Cầu Giấy, 1 Gà Ủ Muối Hoa Tiêu Nguyên Con*';
      } else {
        fallbackReply =
          'Dạ em là Trợ lý AI của Gà Ủ Muối Smart. Anh/chị có thể hỏi em về địa chỉ các cơ sở, STK ngân hàng, tra cứu mã đơn/SĐT hoặc để lại thông tin đặt hàng để em tự động tạo đơn giao hỏa tốc cho mình nhé!';
      }
    }

    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      extractedOrder,
      latencyMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Error in AI chat route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Function to lookup order in DB
async function lookupOrderInDb(phoneOrCode: string) {
  if (!phoneOrCode) return null;
  const cleanInput = phoneOrCode.replace('#', '').trim();

  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { customerPhone: { contains: cleanInput } },
          { orderCode: { contains: cleanInput.toUpperCase() } },
          { id: { contains: cleanInput } },
        ],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) return null;

    let branchName = 'Cơ sở xuất hàng';
    if (order.branchId) {
      const b = await prisma.branch.findUnique({ where: { id: order.branchId } });
      if (b) branchName = b.name;
    }

    const statusMap: Record<string, string> = {
      PENDING: 'Chờ xác nhận (Bếp tiếp nhận)',
      CONFIRMED: 'Đã xác nhận (Bếp đang chế biến)',
      DELIVERING: 'Đang giao hàng hỏa tốc',
      COMPLETED: 'Đã giao thành công',
      CANCELLED: 'Đã hủy đơn',
    };

    const paymentStatusMap: Record<string, string> = {
      UNPAID: 'Chưa thanh toán (Thanh toán COD khi nhận)',
      PAID: 'Đã thanh toán (Tiền về qua ngân hàng)',
    };

    return {
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      statusText: statusMap[order.status] || order.status,
      paymentStatusText: paymentStatusMap[order.paymentStatus] || order.paymentStatus,
      paymentMethod: order.paymentMethod === 'COD' ? 'Tiền mặt' : 'Chuyển khoản QR',
      totalAmount: order.totalAmount.toLocaleString('vi-VN') + ' đ',
      branchName,
      carrierName: order.carrierName || 'Tài xế công nghệ',
      driverName: order.driverName || 'Đang điều tài xế',
      driverPhone: order.driverPhone || 'Đang cập nhật',
      trackingUrl: order.trackingUrl || null,
      itemsText: order.items.map((i) => `${i.quantity}x ${i.productName}`).join(' + '),
      createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '',
    };
  } catch (err) {
    console.error('Error looking up order in DB:', err);
    return null;
  }
}

// Function to extract order info if user provided phone + name / address / item
function parseOrderInfo(userMessage: string, products: any[]) {
  const phoneMatch = userMessage.match(/\b(0[3|5|7|8|9][0-9]{8})\b/);
  if (!phoneMatch) return null;

  const phone = phoneMatch[1];
  const lines = userMessage.split(/,|\n|\./).map((l) => l.trim()).filter(Boolean);

  let name = 'Khách Đặt Qua AI';
  let address = 'Hà Nội';
  let items = 'Gà Ủ Muối Hoa Tiêu';

  if (lines.length >= 1 && !lines[0].match(/\d/)) {
    name = lines[0];
  }

  const remainingText = userMessage.replace(phone, '').replace(name, '');
  if (remainingText.toLowerCase().includes('vin') || remainingText.toLowerCase().includes('cầu giấy') || remainingText.toLowerCase().includes('đường') || remainingText.toLowerCase().includes('phố') || remainingText.toLowerCase().includes('hà nội')) {
    address = remainingText.split(/gà|chân gà|sốt|hũ|lon|hộp/i)[0]?.trim() || 'Địa chỉ giao hỏa tốc';
  }

  if (userMessage.toLowerCase().includes('gà') || userMessage.toLowerCase().includes('con') || userMessage.toLowerCase().includes('chân gà')) {
    items = '1 Gà Ủ Muối Hoa Tiêu Nguyên Con';
    if (userMessage.toLowerCase().includes('chân gà')) items += ', 1 Chân Gà Rút Xương';
  }

  return {
    name,
    phone,
    address,
    items,
  };
}

async function tryAutoCreateOrderFromChat(userMessage: string, replyText: string, products: any[]) {
  const textToParse = `${userMessage} ${replyText}`;
  const phoneMatch = textToParse.match(/\b(0[3|5|7|8|9][0-9]{8})\b/);
  if (!phoneMatch) return null;

  const customerPhone = phoneMatch[1];
  const matchedItems: Array<{ productId: string; productName: string; quantity: number; price: number }> = [];

  products.forEach((p) => {
    if (userMessage.toLowerCase().includes(p.name.toLowerCase())) {
      matchedItems.push({
        productId: p.id,
        productName: p.name,
        quantity: 1,
        price: p.price,
      });
    }
  });

  if (matchedItems.length === 0 && products.length > 0) {
    const topProd = products[0];
    if (topProd) {
      matchedItems.push({
        productId: topProd.id,
        productName: topProd.name,
        quantity: 1,
        price: topProd.price,
      });
    }
  }

  const lines = userMessage.split(/,|\n|\./).map((l) => l.trim()).filter(Boolean);
  let customerName = 'Khách Đặt Qua AI Chat';
  let deliveryAddress = 'Địa chỉ giao hàng qua Chatbot';

  if (lines.length >= 2) {
    if (lines[0] && !lines[0].match(/\d/)) {
      customerName = lines[0];
    }
    if (lines[2]) {
      deliveryAddress = lines[2];
    } else if (lines[1] && !lines[1].match(/^(0[3|5|7|8|9])/)) {
      deliveryAddress = lines[1];
    }
  }

  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const orderCode = `DH-${randomDigits}`;
  let totalAmount = 0;

  const orderItemsData = matchedItems.map((item) => {
    const subtotal = item.price * item.quantity;
    totalAmount += subtotal;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      subtotal,
    };
  });

  try {
    const newOrder = await prisma.order.create({
      data: {
        orderCode,
        customerName,
        customerPhone,
        deliveryAddress,
        note: 'Đơn hàng tự động qua AI Customer Chatbot',
        paymentMethod: 'COD',
        totalAmount,
        status: 'PENDING',
        items: {
          create: orderItemsData,
        },
      },
    });

    await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: {
        name: customerName,
        address: deliveryAddress,
        totalOrders: { increment: 1 },
        totalSpent: { increment: totalAmount },
        lastOrderAt: new Date(),
      },
      create: {
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress,
        totalOrders: 1,
        totalSpent: totalAmount,
        lastOrderAt: new Date(),
      },
    });

    return newOrder.orderCode;
  } catch (err) {
    console.error('Failed auto order creation in chat:', err);
    return null;
  }
}
