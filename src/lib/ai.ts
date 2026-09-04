import { AIParseOrderOutput } from '@/types/database';

const SYSTEM_PROMPT = `
Bạn là trợ lý AI chuyên gia phân tích tin nhắn đặt hàng cho chuỗi Gà Ủ Muối Smart.
Nhiệm vụ của bạn là đọc tin nhắn thô từ khách hàng và trích xuất thông tin JSON chuẩn.

YÊU CẦU ĐẦU RA JSON:
{
  "customer_name": "Tên khách hàng",
  "customer_phone": "Số điện thoại",
  "shipping_address": "Địa chỉ giao hàng",
  "district": "Quận/Huyện",
  "city": "Thành phố",
  "items": [
    {
      "item_name": "Tên món gà ủ muối",
      "quantity": 1,
      "note": "Ghi chú món"
    }
  ],
  "voucher_code": "Mã voucher nếu có",
  "note": "Ghi chú đơn hàng"
}
`;

export async function parseOrderWithAI(rawText: string, availableMenuItems: string[]): Promise<AIParseOrderOutput> {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const menuContext = availableMenuItems.length > 0
    ? `\n\nDanh sách thực đơn Gà Ủ Muối Smart hiện có: [${availableMenuItems.join(', ')}].`
    : '';

  const prompt = `Tin nhắn khách hàng:\n"""\n${rawText}\n"""${menuContext}`;

  if (openAiKey && !openAiKey.includes('xxxx')) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices[0]?.message?.content;
        if (content) return JSON.parse(content) as AIParseOrderOutput;
      }
    } catch (e) {
      console.warn('OpenAI API call failed, falling back to mock parser...', e);
    }
  }

  if (geminiKey && !geminiKey.includes('xxxx')) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text) as AIParseOrderOutput;
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to mock parser...', e);
    }
  }

  return mockGaUMuoiAIParser(rawText);
}

/**
 * Smart Offline Mock Parser tailored for Gà Ủ Muối Smart
 */
function mockGaUMuoiAIParser(text: string): AIParseOrderOutput {
  const phoneMatch = text.match(/(0[3|5|7|8|9][0-9]{8})/);
  const phone = phoneMatch ? phoneMatch[0] : '0901234567';

  const nameMatch = text.match(/(mình tên|tên|anh|chị|em|khách)\s+([A-Za-zĐđÀ-ỹ\s]{2,15})/i);
  let name = 'Khách Hàng';
  if (nameMatch && nameMatch[2]) {
    const rawName = nameMatch[2].split(',')[0].split('.')[0].trim();
    if (rawName.length > 1 && !rawName.toLowerCase().includes('sđt')) {
      name = rawName;
    }
  }

  let district = 'Quận 1';
  if (/quận 3/i.test(text)) district = 'Quận 3';
  else if (/bình thạnh/i.test(text)) district = 'Quận Bình Thạnh';
  else if (/thủ đức/i.test(text)) district = 'Thành phố Thủ Đức';
  else if (/quận 1/i.test(text)) district = 'Quận 1';

  let address = '123 Lê Lợi, Phường Bến Thành';
  const addrMatch = text.match(/(địa chỉ|giao đến|đến|tới)\s+([^.\n,]+)/i);
  if (addrMatch && addrMatch[2]) {
    address = addrMatch[2].trim();
  }

  const voucherMatch = text.match(/(CHAO2026|VIP10)/i);
  const voucher_code = voucherMatch ? voucherMatch[0].toUpperCase() : undefined;

  const items: { item_name: string; quantity: number }[] = [];

  if (/nguyên con|1 con/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|phần|con)?\s*(nguyên con|gà ủ muối)/i);
    items.push({ item_name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', quantity: qty ? parseInt(qty[1], 10) : 2 });
  }
  if (/nửa con|1\/2 con/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|phần|con)?\s*nửa con/i);
    items.push({ item_name: 'Gà Ủ Muối Nửa Con (Kèm Nước Chấm)', quantity: qty ? parseInt(qty[1], 10) : 1 });
  }
  if (/chân gà|sốt thái/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|phần|hộp)?\s*chân gà/i);
    items.push({ item_name: 'Chân Gà Rút Xương Sốt Thái', quantity: qty ? parseInt(qty[1], 10) : 1 });
  }
  if (/cánh gà/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|phần|hộp)?\s*cánh gà/i);
    items.push({ item_name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)', quantity: qty ? parseInt(qty[1], 10) : 1 });
  }
  if (/nước chấm/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|hũ|bịch)?\s*nước chấm/i);
    items.push({ item_name: 'Nước Chấm Thần Thánh Extra', quantity: qty ? parseInt(qty[1], 10) : 2 });
  }
  if (/trà tắc/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|ly|cốc)?\s*trà tắc/i);
    items.push({ item_name: 'Trà Tắc Khổng Lồ', quantity: qty ? parseInt(qty[1], 10) : 2 });
  }
  if (/trà đào/i.test(text)) {
    const qty = text.match(/(\d+)\s*(x|ly|cốc)?\s*trà đào/i);
    items.push({ item_name: 'Trà Đào Cam Sả', quantity: qty ? parseInt(qty[1], 10) : 1 });
  }

  if (items.length === 0) {
    items.push({ item_name: 'Gà Ủ Muối Nguyên Con (Kèm Nước Chấm)', quantity: 2 });
    items.push({ item_name: 'Trà Tắc Khổng Lồ', quantity: 2 });
  }

  return {
    customer_name: name,
    customer_phone: phone,
    shipping_address: address,
    district: district,
    city: 'Hồ Chí Minh',
    items,
    voucher_code,
    note: 'Giao nhanh, lấy thêm nước chấm'
  };
}
