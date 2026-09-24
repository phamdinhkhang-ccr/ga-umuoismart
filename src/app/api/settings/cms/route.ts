import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      badge: 'CS1',
      name: 'Cơ Sở Vin Smart city',
      district: 'Hà Nội',
      address: '6 - A20 Geleximco An Khánh - Tây Mỗ, Hoài Đức, Hà Nội',
      phone: '0988.888.901',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=6+A20+Geleximco+An+Khanh+Tay+Mo+Ha+Noi',
    },
    {
      id: 'cs2',
      badge: 'CS2',
      name: 'Cơ Sở Trần Cung - Cầu Giấy',
      district: 'Hà Nội',
      address: '5 - 208 Trần Cung, Q. Cầu Giấy, Hà Nội',
      phone: '0988.888.902',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=208+Tran+Cung+Cau+Giay+Ha+Noi',
    },
    {
      id: 'cs3',
      badge: 'CS3',
      name: 'Cơ Sở Bán Đảo Linh Đàm',
      district: 'Hà Nội',
      address: 'Kiot 4 Nơ 7B Bán Đảo Linh Đàm, Q. Hoàng Mai, Hà Nội',
      phone: '0988.888.903',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Kiot+4+No+7B+Ban+Dao+Linh+Dam+Hoang+Mai+Ha+Noi',
    },
    {
      id: 'cs4',
      badge: 'CS4',
      name: 'Cơ Sở Hai Bà Trưng',
      district: 'Hà Nội',
      address: '51 Yên Lạc - Vĩnh Tuy, Q. Hai Bà Trưng, Hà Nội',
      phone: '0988.888.904',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=51+Yen+Lac+Vinh+Tuy+Hai+Ba+Trung+Ha+Noi',
    },
    {
      id: 'cs5',
      badge: 'CS5',
      name: 'Cơ Sở Vin Ocean Park 1',
      district: 'Hà Nội',
      address: 'SP10.11 Hải Âu 9 - Vin Ocean Park 1, Gia Lâm, Hà Nội',
      phone: '0988.888.905',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Hai+Au+9+Vin+Ocean+Park+1+Gia+Lam+Ha+Noi',
    },
    {
      id: 'cs6',
      badge: 'CS6',
      name: 'Cơ Sở Vũng Tàu - HCM',
      district: 'Bà Rịa - Vũng Tàu',
      address: 'Phú Mỹ - Vũng Tàu',
      phone: '0988.888.906',
      hours: '08:00 - 22:00',
      image: '',
      mapsUrl: 'https://maps.google.com/?q=Phu+My+Ba+Ria+Vung+Tau',
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
