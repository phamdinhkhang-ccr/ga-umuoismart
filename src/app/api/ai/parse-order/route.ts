import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Utility to remove Vietnamese accents for string matching
function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { rawText } = await request.json();

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nội dung tin nhắn không được để trống' },
        { status: 400 }
      );
    }

    // 1. Fetch available products from DB
    const dbProducts = await prisma.product.findMany({
      where: { isAvailable: true },
    });

    const productsSummary = dbProducts
      .map((p) => `- ID: "${p.id}", Tên: "${p.name}", Giá: ${p.price} VNĐ`)
      .join('\n');

    // 2. Fetch Gemini API Key from Settings or Env
    const settings = await prisma.setting.findMany({ where: { group: 'AI' } });
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));
    const apiKey = settingsMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '';

    let parsedData: any = null;

    if (apiKey) {
      try {
        const systemPrompt = `Bạn là AI trích xuất đơn hàng F&B chính xác 100%. Phân tích đoạn tin nhắn tự do của khách và trả về DUY NHẤT một JSON hợp lệ (không kèm markdown thừa).

DANH SÁCH SẢN PHẨM HIỆN CÓ TRONG DATABASE:
${productsSummary}

DANH SÁCH CƠ SỞ:
- cs1: Cầu Giấy (Cầu Giấy, Dịch Vọng, Nghĩa Tân...)
- cs2: Đống Đa (Xã Đàn, Chùa Bộc, Thái Hà...)
- cs3: Hai Bà Trưng (Phố Huế, Bạch Mai, Minh Khai...)
- cs4: Thanh Xuân (Nguyễn Trãi, Thanh Trì, Đại Thanh, Thượng Phúc, Hà Đông...)
- cs5: Tây Hồ (Lạc Long Quân, Thụy Khuê...)
- cs6: Nam Từ Liêm (Vin Smart City, Lê Đức Thọ, Tây Mỗ...)

QUY TẮC TRÍCH XUẤT NGHIÊM NGẶT:
1. customerName (Tên hoặc danh xưng người đặt):
   - Luôn tìm tên ở đầu câu hoặc đứng trước các động từ "đặt", "lấy", "mua", "ship cho".
   - Ví dụ: "anh khang đặt 1 gà..." -> customerName: "anh khang".
   - Ví dụ: "Anh Tuấn lấy 2 con..." -> customerName: "Anh Tuấn".

2. phone (Số điện thoại):
   - Chuỗi số điện thoại 10 số (bắt đầu bằng 0 hoặc +84).

3. address (Địa chỉ giao hàng chi tiết):
   - Trích xuất toàn bộ phần địa chỉ nhà, ngõ, đường, xã/phường, quận/huyện.

4. items (Danh sách món chính):
   - BẮT BUỘC map chính xác theo đúng món chính khách mua.
   - ƯU TIÊN 1: Khi khách nói "gà ủ muối nguyên con", "gà nguyên con", "cả con", hoặc "1 gà ủ muối" (không có từ "cánh" hay "chân") -> Chọn đúng món "Gà Ủ Muối Hoa Tiêu Nguyên Con". TUYỆT ĐỐI KHÔNG ép sang "Cánh Gà", "Chân Gà", hay "Combo".
   - ƯU TIÊN 2: CHỈ map sang "Cánh Gà" khi trong câu có rõ ràng chữ "cánh".
   - ƯU TIÊN 3: CHỈ map sang "Chân Gà" khi trong câu có rõ chữ "chân".
   - ƯU TIÊN 4: CHỈ map sang "Combo" khi trong câu có chữ "combo".
   - LƯU Ý GIA VỊ XIN THÊM: Các câu xin kèm như "thêm nước chấm nhé", "cho thêm sốt", "cho thêm rau", "cho thêm lá sung" mà không ghi rõ số lượng mua bán lẻ thì đưa vào trường "note", KHÔNG được tự ý chèn sản phẩm sốt bán lẻ hay Combo vào mảng items.

5. QUY TẮC BẮT BUỘC CHO TRƯỜNG "note":
   - Xác định tất cả các câu từ nằm ngoài Tên khách, SĐT, Địa chỉ và Tên món ăn chính.
   - Gom TOÀN BỘ các câu dặn dò, lưu ý của khách thành một chuỗi duy nhất, giữ trọn vẹn mọi yêu cầu.
   - TUYỆT ĐỐI KHÔNG được tóm tắt ngắn cụt, không được bỏ sót bất kỳ chi tiết nào (kể cả yêu cầu về rau thơm, lá sung, ớt, nước chấm, cách chặt hay giờ giao).
   - Ví dụ input: "anh khang đặt 1 gà ủ muối nguyên con, sđt 0889018221, giao tới số 9 thượng phúc, xã đại thanh, hà nội. Thêm nước chấm nhé, cho thêm lá sung"
     -> "note": "Thêm nước chấm nhé, cho thêm lá sung" (giữ trọn vẹn cả 2 vế)

Định dạng JSON bắt buộc trả về:
{
  "customerName": "...",
  "phone": "...",
  "address": "...",
  "branchSuggested": "Mã cơ sở (cs1, cs2, cs3, cs4, cs5, cs6)",
  "items": [
    {
      "productKeyword": "ga_nguyen_con | nua_con | canh_ga | chan_ga | combo | sot",
      "productName": "Gà Ủ Muối Hoa Tiêu Nguyên Con",
      "quantity": 1
    }
  ],
  "note": "..."
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemPrompt}\n\nTIN NHẮN KHÁCH HÀNG:\n"${rawText}"` },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const geminiRes = await response.json();
          const replyText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          const jsonMatch = replyText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (geminiError) {
        console.error('Gemini API call failed in parse-order, fallback to smart NER:', geminiError);
      }
    }

    // 3. Fallback Smart NER Parser if Gemini API was not used or failed
    if (!parsedData || !parsedData.customerName || parsedData.customerName === 'Khách Đặt Qua Tin Nhắn' || parsedData.customerName === 'Khách Chưa Đặt Tên') {
      const fallbackResult = fallbackSmartNERParse(rawText, dbProducts);
      if (!parsedData) {
        parsedData = fallbackResult;
      } else {
        if ((!parsedData.customerName || parsedData.customerName === 'Khách Đặt Qua Tin Nhắn' || parsedData.customerName === 'Khách Chưa Đặt Tên') && fallbackResult.customerName) {
          parsedData.customerName = fallbackResult.customerName;
        }
        if ((!parsedData.address || parsedData.address === 'Địa chỉ giao hàng trong tin nhắn') && fallbackResult.address) {
          parsedData.address = fallbackResult.address;
        }
        if (!parsedData.branchSuggested || parsedData.branchSuggested === 'cs1') {
          parsedData.branchSuggested = fallbackResult.branchSuggested;
        }
        if (fallbackResult.notes) {
          if (!parsedData.note) {
            parsedData.note = fallbackResult.notes;
          } else if (fallbackResult.notes.length > parsedData.note.length) {
            parsedData.note = fallbackResult.notes;
          }
        }
        if (!Array.isArray(parsedData.items) || parsedData.items.length === 0) {
          parsedData.items = fallbackResult.items;
        }
      }
    }

    // Ensure customerName is trimmed properly
    const rawCustomerName = parsedData?.customerName?.trim();
    const finalCustomerName = rawCustomerName && rawCustomerName !== '' && rawCustomerName !== 'Khách Đặt Qua Tin Nhắn' ? rawCustomerName : 'Khách Chưa Đặt Tên';
    parsedData.customerName = finalCustomerName;
    parsedData.note = parsedData.note || parsedData.notes || '';

    // 4. SMART PRODUCT MAPPING WITH STRICT PRIORITY (SINGLE NON-COMBO ITEMS FIRST)
    if (parsedData && Array.isArray(parsedData.items)) {
      const nonComboProducts = dbProducts.filter(
        (p) => !removeAccents(p.name).includes('combo')
      );

      parsedData.items = parsedData.items.map((item: any) => {
        const itemRawName = item.name || item.productName || '';
        const itemClean = removeAccents(itemRawName);
        const rawTextClean = removeAccents(rawText);
        const itemQty = Math.max(1, Number(item.quantity) || 1);

        // Strict Priority Matching Rules:
        // Priority 1: Gà nguyên con / cả con / 1 con / (gà ủ muối & không có cánh/chân)
        const isWholeChickenRequest =
          itemClean.includes('nguyen con') ||
          itemClean.includes('ca con') ||
          rawTextClean.includes('nguyen con') ||
          rawTextClean.includes('ca con') ||
          (rawTextClean.includes('ga u muoi') && !rawTextClean.includes('canh') && !rawTextClean.includes('chan')) ||
          (rawTextClean.includes('1 con ga') && !rawTextClean.includes('canh') && !rawTextClean.includes('chan'));

        let matched: any = null;

        if (isWholeChickenRequest) {
          // MUST search in nonComboProducts FIRST so it NEVER matches Combo or Cánh Gà!
          matched = nonComboProducts.find((p) => removeAccents(p.name).includes('nguyen con'));
        }

        // Priority 2: Cánh gà (chỉ khi có chữ 'cánh')
        if (!matched && !isWholeChickenRequest && (itemClean.includes('canh') || rawTextClean.includes('canh ga') || rawTextClean.includes('canh'))) {
          matched = nonComboProducts.find((p) => removeAccents(p.name).includes('canh ga'));
        }

        // Priority 3: Chân gà (chỉ khi có chữ 'chân')
        if (!matched && !isWholeChickenRequest && (itemClean.includes('chan') || rawTextClean.includes('chan ga') || rawTextClean.includes('chan'))) {
          matched = nonComboProducts.find((p) => removeAccents(p.name).includes('chan ga'));
        }

        // Priority 4: Combo (chỉ khi có chữ 'combo')
        if (!matched && (itemClean.includes('combo') || rawTextClean.includes('combo'))) {
          matched = dbProducts.find((p) => removeAccents(p.name).includes('combo'));
        }

        // Priority 5: Fallback in nonComboProducts
        if (!matched) {
          matched = nonComboProducts.find(
            (p) =>
              p.id === item.productId ||
              removeAccents(p.name).includes(itemClean) ||
              itemClean.includes(removeAccents(p.name))
          );
        }

        const finalProduct = matched || nonComboProducts.find((p) => removeAccents(p.name).includes('nguyen con')) || dbProducts[0];

        return {
          productId: finalProduct?.id || 'custom',
          productName: finalProduct?.name || itemRawName || 'Gà Ủ Muối Hoa Tiêu Nguyên Con',
          quantity: itemQty,
          price: finalProduct?.price || 250000,
        };
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã phân tích thành công thông tin khách hàng và giỏ hàng!',
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in parse-order route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Smart Fallback NER Extraction for Vietnamese Orders
function fallbackSmartNERParse(text: string, dbProducts: any[]) {
  const phoneMatch = text.match(/\b(0[35789]\d{8})\b|\b(0\d{9,10})\b/);
  const phone = phoneMatch ? (phoneMatch[1] || phoneMatch[2]) : '';

  let customerName = extractCustomerName(text);
  let address = extractAddress(text);
  let branchSuggested = detectBranchFromText(address || text);
  const matchedItems = extractProductItems(text, dbProducts);
  let notes = extractNotes(text);

  return {
    customerName,
    phone,
    address,
    branchSuggested,
    items: matchedItems,
    notes,
  };
}

function extractNotes(text: string): string {
  const notesList: string[] = [];
  const lower = removeAccents(text);

  // 1. Sauce requests
  if (lower.includes('them nuoc cham') || lower.includes('xin nuoc cham') || lower.includes('them sot') || lower.includes('cho them sot') || lower.includes('nhieu sot')) {
    notesList.push('Thêm nước chấm nhé');
  }

  // 2. Leaf / Veggie / Lá sung requests
  if (lower.includes('la sung')) {
    notesList.push('cho thêm lá sung');
  }
  if (lower.includes('cho them rau') || lower.includes('them rau') || lower.includes('nhieu rau')) {
    notesList.push('cho thêm rau');
  } else if (lower.includes('dung co bo rau nhieu') || lower.includes('khong bo rau nhieu') || lower.includes('it rau')) {
    notesList.push('không bỏ nhiều rau');
  } else if (lower.includes('khong lay rau') || lower.includes('khong bo rau')) {
    notesList.push('không lấy rau');
  }

  // 3. Sơ chế / Chặt gà
  if (lower.includes('khong chat') || lower.includes('de nguyen con') || lower.includes('de nguyen')) {
    notesList.push('để nguyên con không chặt');
  } else if (lower.includes('chat san') || lower.includes('chat giup')) {
    notesList.push('chặt sẵn vừa ăn');
  }

  // 4. Delivery time
  const timeMatch = text.match(/(?:giao\s*trước|giao\s*lúc|tầm|khoảng|gấp|trước)?\s*(\d{1,2}h|\d{1,2}\s*giờ|\d{1,2}:\d{2}\s*(?:tối|chiều|sáng)?)/i);
  if (timeMatch && !notesList.some((n) => n.includes(timeMatch[1]))) {
    notesList.push(`Giao hàng vào khoảng ${timeMatch[1]}`);
  }

  // 5. Explicit notes or trailing clause after address/phone
  const trailMatch = text.match(/(?:chú|lưu ý|dặn)[:\s]+([^.\n]+)/i);
  if (trailMatch && trailMatch[1].trim()) {
    const rawNote = trailMatch[1].trim();
    if (!notesList.some((n) => removeAccents(n).includes(removeAccents(rawNote)))) {
      notesList.push(rawNote);
    }
  }

  // 6. Sentence-level raw extraction for trailing notes
  const sentences = text.split(/[.\n]/).map(s => s.trim()).filter(Boolean);
  const rawNoteClauses: string[] = [];
  for (const sentence of sentences) {
    const sLower = removeAccents(sentence);
    if (
      !sLower.match(/0[35789]\d{8}/) &&
      !sLower.includes('giao toi') &&
      !sLower.includes('giao den') &&
      !sLower.includes('ship den') &&
      !sLower.includes('dat 1 ga') &&
      !sLower.includes('dat 2 ga') &&
      (sLower.includes('them') || sLower.includes('cho') || sLower.includes('nuoc cham') || sLower.includes('la sung') || sLower.includes('rau'))
    ) {
      rawNoteClauses.push(sentence);
    }
  }

  if (rawNoteClauses.length >= 2) {
    return rawNoteClauses.join(', ');
  } else if (rawNoteClauses.length === 1 && rawNoteClauses[0].length > notesList.join(', ').length) {
    return rawNoteClauses[0];
  }

  return notesList.join(', ');
}

function extractCustomerName(text: string): string {
  const beforeVerbMatch = text.match(/^([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯa-zàáâãèéêìíòóôõùúăđĩũơư\s]{2,30}?)\s+(?:đặt|lấy|mua|cần|ship|giao)\b/i);
  if (beforeVerbMatch && beforeVerbMatch[1].trim()) {
    const candidate = cleanNameCandidate(beforeVerbMatch[1]);
    if (candidate && candidate.length <= 25 && !['ship', 'giao', 'cho', 'em', 'anh', 'chị', 'khách', 'mình'].includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const labelMatch = text.match(/(?:mình\s+là|tôi\s+là|đặt\s+bởi|tên\s+là|tên[:\s]+)\s*([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯa-zàáâãèéêìíòóôõùúăđĩũơư\s]{2,25})(?=\s*[,.\n]|\s+sđt|\s+số|\s+địa|\s+đặt|\s+lấy|$)/i);
  if (labelMatch && labelMatch[1].trim()) {
    const cleaned = cleanNameCandidate(labelMatch[1]);
    if (cleaned) return cleaned;
  }

  const honorificMatch = text.match(/(?:anh|chị|bác|cô|bạn|em)\s+([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯa-zàáâãèéêìíòóôõùúăđĩũơư]+(?:\s+[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯa-zàáâãèéêìíòóôõùúăđĩũơư]+){0,3})/i);
  if (honorificMatch && honorificMatch[1].trim()) {
    const candidate = cleanNameCandidate(honorificMatch[1]);
    if (candidate && !['đặt', 'lấy', 'ship', 'giao', 'cho', 'sđt', 'địa', 'số'].includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const firstPart = text.split(/0[35789]\d{8}|sđt|số điện thoại|địa chỉ|ship đến|giao đến/i)[0]?.trim();
  if (firstPart) {
    const cleaned = cleanNameCandidate(firstPart.replace(/^(giao|ship|cho|lấy|đặt)\s+/gi, ''));
    if (cleaned && cleaned.length >= 2 && cleaned.length <= 25 && !['mình', 'tôi', 'khách'].includes(cleaned.toLowerCase())) {
      return cleaned;
    }
  }

  return 'Khách Chưa Đặt Tên';
}

function cleanNameCandidate(raw: string): string {
  return raw
    .replace(/^(tên|khách|em|bác|bạn|mình|tôi)\s+/gi, '')
    .replace(/[,.!\n].*$/, '')
    .trim();
}

function extractAddress(text: string): string {
  const kwMatch = text.match(/(?:địa\s*chỉ[:\s]*|ship\s*(?:đến|về)|giao\s*(?:đến|về|tới)[:\s]*|ở[:\s]+|tại[:\s]+)(.+?)(?=\s*(?:sđt|số\s+điện|tên|ghi\s+chú|lấy|đặt|chuyển\s+khoản|cod|\.|\n)|$)/i);
  if (kwMatch && kwMatch[1].trim()) {
    let addr = kwMatch[1].trim();
    addr = addr.replace(/^[:\s,-]+|[:\s,-]+$/g, '');
    if (addr.length >= 4) {
      return addr;
    }
  }

  const streetMatch = text.match(/(?:số\s+\d+|tòa\s+[A-Z0-9.\-]+|chung\s+cư|kđt|ngõ\s+\d+|đường\s+[^,.\n]+|phố\s+[^,.\n]+)(?:[^,.\n]+,)*[^,.\n]*/i);
  if (streetMatch && streetMatch[0].trim().length >= 5) {
    return streetMatch[0].trim();
  }

  return 'Địa chỉ giao hàng trong tin nhắn';
}

function detectBranchFromText(text: string): string {
  if (!text) return 'cs1';
  const lower = removeAccents(text);

  if (
    lower.includes('smart city') ||
    lower.includes('vinsmart') ||
    lower.includes('vin smart') ||
    lower.includes('tay mo') ||
    lower.includes('dai mo') ||
    lower.includes('nam tu liem') ||
    lower.includes('le duc tho') ||
    lower.includes('me tri') ||
    lower.includes('phu do')
  ) {
    return 'cs6';
  }

  if (
    lower.includes('thanh xuan') ||
    lower.includes('nguyen trai') ||
    lower.includes('dai thanh') ||
    lower.includes('thuong phuc') ||
    lower.includes('thanh tri') ||
    lower.includes('ha dong') ||
    lower.includes('linh dam') ||
    lower.includes('hoang mai')
  ) {
    return 'cs4';
  }

  if (
    lower.includes('dong da') ||
    lower.includes('xa dan') ||
    lower.includes('chua boc') ||
    lower.includes('thai ha') ||
    lower.includes('lang ha')
  ) {
    return 'cs2';
  }

  if (
    lower.includes('hai ba trung') ||
    lower.includes('pho hue') ||
    lower.includes('bach mai') ||
    lower.includes('minh khai') ||
    lower.includes('le thanh nghi')
  ) {
    return 'cs3';
  }

  if (
    lower.includes('tay ho') ||
    lower.includes('lac long quan') ||
    lower.includes('thuy khue') ||
    lower.includes('vo chi cong')
  ) {
    return 'cs5';
  }

  return 'cs1';
}

function extractProductItems(text: string, dbProducts: any[]) {
  const lowerText = removeAccents(text);
  const matchedItems: Array<{ name: string; quantity: number }> = [];

  const nonComboProducts = dbProducts.filter(
    (p) => !removeAccents(p.name).includes('combo')
  );

  // Check strict order
  if (lowerText.includes('nguyen con') || lowerText.includes('ca con') || (lowerText.includes('1 con ga') && !lowerText.includes('canh') && !lowerText.includes('chan'))) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:con|ga)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const wholeProd = nonComboProducts.find((p) => removeAccents(p.name).includes('nguyen con')) || dbProducts[0];
    matchedItems.push({
      name: wholeProd.name,
      quantity: qty,
    });
  } else if (lowerText.includes('nua con') || lowerText.includes('1/2')) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:con|suat)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const halfProd = nonComboProducts.find((p) => removeAccents(p.name).includes('nua con')) || dbProducts[0];
    matchedItems.push({
      name: halfProd.name,
      quantity: qty,
    });
  } else if (lowerText.includes('canh ga') || lowerText.includes('canh')) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:suat|phut|khay)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const wingProd = nonComboProducts.find((p) => removeAccents(p.name).includes('canh ga')) || dbProducts[0];
    matchedItems.push({
      name: wingProd.name,
      quantity: qty,
    });
  } else if (lowerText.includes('chan ga') || lowerText.includes('chan')) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:hop|suat|khay)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const feetProd = nonComboProducts.find((p) => removeAccents(p.name).includes('chan ga')) || dbProducts[0];
    matchedItems.push({
      name: feetProd.name,
      quantity: qty,
    });
  } else if (lowerText.includes('combo')) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:suat|combo)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const comboProd = dbProducts.find((p) => removeAccents(p.name).includes('combo')) || dbProducts[0];
    matchedItems.push({
      name: comboProd.name,
      quantity: qty,
    });
  }

  // Fallback default
  if (matchedItems.length === 0) {
    let qty = 1;
    const qMatch = lowerText.match(/(\d+)\s*(?:con|ga)/i);
    if (qMatch) qty = parseInt(qMatch[1], 10) || 1;
    const wholeProd = nonComboProducts.find((p) => removeAccents(p.name).includes('nguyen con')) || dbProducts[0];
    matchedItems.push({
      name: wholeProd.name,
      quantity: qty,
    });
  }

  return matchedItems;
}
