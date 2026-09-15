import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_CMS_SETTINGS: Record<string, string> = {
  CMS_HEADER_JSON: JSON.stringify({
    logoText1: 'GÀ Ủ MUỐI',
    logoText2: 'SMART',
    hotline: '0988.888.999',
    facebook_url: 'https://facebook.com',
    zalo_url: 'https://zalo.me',
    tiktok_url: 'https://tiktok.com',
  }),
  CMS_HERO_JSON: JSON.stringify({
    line1: 'Gà Ủ Muối Smart',
    line2: 'Giao Hỏa Tốc Nội Thành',
  }),
  CMS_PROMO_JSON: JSON.stringify({
    card1Title: 'Hỗ Trợ 35K Ship Từ Bill 355K',
    card1Desc: 'Tự động áp dụng khi chốt đơn trực tiếp',
    card2Title: 'Giao Hỏa Tốc 30-40 Phút',
    card2Desc: 'Đảm bảo độ lạnh giòn và chuẩn vị khi giao tới',
  }),
  CMS_BRANCHES_JSON: JSON.stringify([
    {
      id: 'cs1',
      badge: 'CƠ SỞ 01',
      name: 'Cơ Sở Cầu Giấy',
      district: 'Q. Cầu Giấy',
      address: '12 Đường Cầu Giấy, Q. Cầu Giấy, Hà Nội',
      phone: '0988.888.901',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=12+C%E1%BA%A7u+Gi%E1%BA%A5y+H%C3%A0+N%E1%BB%99i',
    },
    {
      id: 'cs2',
      badge: 'CƠ SỞ 02',
      name: 'Cơ Sở Đống Đa',
      district: 'Q. Đống Đa',
      address: '88 Phố Xã Đàn, Q. Đống Đa, Hà Nội',
      phone: '0988.888.902',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=88+X%C3%A3+%C4%90%C3%A0n+H%C3%A0+N%E1%BB%99i',
    },
    {
      id: 'cs3',
      badge: 'CƠ SỞ 03',
      name: 'Cơ Sở Hai Bà Trưng',
      district: 'Q. Hai Bà Trưng',
      address: '156 Phố Huế, Q. Hai Bà Trưng, Hà Nội',
      phone: '0988.888.903',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=156+Ph%E1%BB%91+Hu%E1%BA%BF+H%C3%A0+N%E1%BB%99i',
    },
    {
      id: 'cs4',
      badge: 'CƠ SỞ 04',
      name: 'Cơ Sở Thanh Xuân',
      district: 'Q. Thanh Xuân',
      address: '45 Đường Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',
      phone: '0988.888.904',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=45+Nguy%E1%BB%85n+Tr%C3%A3i+H%C3%A0+N%E1%BB%99i',
    },
    {
      id: 'cs5',
      badge: 'CƠ SỞ 05',
      name: 'Cơ Sở Tây Hồ',
      district: 'Q. Tây Hồ',
      address: '210 Đường Lạc Long Quân, Q. Tây Hồ, Hà Nội',
      phone: '0988.888.905',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=210+L%E1%BA%A1c+Long+Qu%C3%A2n+H%C3%A0+N%E1%BB%99i',
    },
    {
      id: 'cs6',
      badge: 'CƠ SỞ 06',
      name: 'Cơ Sở Nam Từ Liêm',
      district: 'Q. Nam Từ Liêm',
      address: '18 Đường Lê Đức Thọ, Q. Nam Từ Liêm, Hà Nội',
      phone: '0988.888.906',
      hours: '09:00 - 22:00',
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80',
      mapsUrl: 'https://maps.google.com/?q=18+L%C3%AA+%C4%90%E1%BB%A9c+Th%E1%BB%8D+H%C3%A0+N%E1%BB%99i',
    },
  ]),
  CMS_STORY_JSON: JSON.stringify({
    tag: 'Artisan Heritage',
    title: 'Câu Chuyện Vị Giác Gà Ủ Muối Smart',
    desc: 'Mỗi con gà tại Gà Ủ Muối Smart được tuyển chọn khắt khe từ nguồn gà ta thả vườn đồi. Qua quy trình thẩm thấu muối hồng và thảo mộc tự nhiên theo công thức bí truyền 24 giờ, lớp da gà chuyển màu vàng óng giòn sần sật, giữ trọn vị ngọt đậm đà mọng nước từng thớ thịt.',
    stat1Val: '100%',
    stat1Label: 'Gà Ta Thả Vườn Đồi',
    stat2Val: '24h',
    stat2Label: 'Ủ Thảo Mộc Tự Nhiên',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
    badgeTitle: 'Độc Quyền Sốt Ớt Xanh',
    badgeSub: 'Chua cay mặn ngọt chuẩn vị',
  }),
  CMS_FACEBOOK_URL: 'https://facebook.com',
  CMS_ZALO_URL: 'https://zalo.me',
  CMS_TIKTOK_URL: 'https://tiktok.com',
  facebook_url: 'https://facebook.com',
  zalo_url: 'https://zalo.me',
  tiktok_url: 'https://tiktok.com',
};

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { group: 'CMS' },
    });

    const settingsMap: Record<string, string> = { ...DEFAULT_CMS_SETTINGS };
    settings.forEach((s) => {
      if (s.value && s.value !== 'null' && s.value !== 'undefined') {
        settingsMap[s.key] = s.value;
      }
    });

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    console.error('API GET /api/settings/cms error:', error);
    return NextResponse.json({ success: true, settings: DEFAULT_CMS_SETTINGS });
  }
}
