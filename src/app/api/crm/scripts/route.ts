import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_SCRIPTS = [
  {
    title: 'Khách quen lâu ngày chưa đặt lại (Tặng mã 15%)',
    type: 'RE_ENGAGE',
    content: `Dạ Gà Smart {co_so} xin chào anh/chị {ten_khach}! 🍗✨
Lâu rồi chưa thấy anh/chị ghé bếp thưởng thức món Gà Ủ Muối da giòn sần sật và Nước chấm ớt xanh trứ danh của quán ạ.
Hôm nay quán xin gửi tặng riêng anh/chị mã giảm giá [TRIANKHACH15] - GIẢM 15% cho đơn đặt hàng hôm nay.
Anh/chị có muốn quán ship ngay 1 phần gà giòn ngon đến địa chỉ {dia_chi} cho bữa cơm/nhậu chiều nay không ạ? 🥰`,
  },
  {
    title: 'Hỏi thăm chất lượng món & Xin đánh giá sau giao hàng',
    type: 'FEEDBACK',
    content: `Dạ Bếp Gà Smart {co_so} xin chào anh/chị {ten_khach}! 🌟
Đơn hàng của anh/chị vừa được giao đến {dia_chi}. Không biết anh/chị đã dùng bữa chưa ạ?
Thịt gà có vừa vị, da có giữ được độ giòn ưng ý và nước sốt có hợp khẩu vị của mình không ạ?
Nếu cần hỗ trợ thêm bất kỳ điều gì, anh/chị cứ nhắn trực tiếp em để bếp phục vụ chu đáo nhất nhé ạ! Chúc anh/chị ngon miệng ạ! ❤️`,
  },
  {
    title: 'Thông báo Combo Mới & Miễn phí ship tuần này',
    type: 'PROMO',
    content: `Gà Smart {co_so} thân gửi anh/chị {ten_khach}! 🔥
Bếp vừa ra mắt COMBO SIÊU HỜI: 1/2 Gà Ủ Muối Hoa Tiêu + Chân Gà Rút Xương Sốt Thái + Nem Ngựa Giòn Rụm với giá dùng thử cực sốc!
Đặc biệt: Áp dụng FREESHIP tận nơi cho khách hàng thân thiết tại khu vực {dia_chi}.
Anh/chị đặt ngay để bếp giữ phần gà nóng giòn ngon nhất phục vụ mình nhé ạ! 🛵💨`,
  },
  {
    title: 'Tri ân khách hàng thân thiết (VIP Care)',
    type: 'VIP',
    content: `Kính gửi anh/chị {ten_khach} - Khách hàng thân thiết của Gà Smart! 👑
Nhân dịp đặc biệt, Menu Gà Smart xin trân trọng gửi tặng anh/chị Voucher GIẢM 20% TOÀN BỘ MENU (Áp dụng trọn tuần này tại tất cả 6 chi nhánh Hà Nội).
Anh/chị có thể liên hệ Zalo này hoặc hotline của cơ sở {co_so} để được chuẩn bị món ăn chu đáo nhất ạ. Chúc anh/chị một tuần thật nhiều niềm vui và may mắn! 🎁🍗`,
  },
];

export async function GET(request: NextRequest) {
  try {
    let scripts = await prisma.careScript.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed defaults if database table is empty
    if (scripts.length === 0) {
      for (const item of DEFAULT_SCRIPTS) {
        await prisma.careScript.create({
          data: {
            title: item.title,
            type: item.type,
            content: item.content,
            isActive: true,
          },
        });
      }
      scripts = await prisma.careScript.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({ success: true, scripts });
  } catch (error: any) {
    console.error('Error fetching care scripts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type = 'RE_ENGAGE' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề và nội dung kịch bản là bắt buộc' },
        { status: 400 }
      );
    }

    const script = await prisma.careScript.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type: type || 'RE_ENGAGE',
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, script });
  } catch (error: any) {
    console.error('Error creating care script:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
