import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Coordinates for standard Hanoi locations / districts
const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Branches
  'cs1': { lat: 21.0333, lng: 105.7983 }, // 12 Cầu Giấy
  'cs2': { lat: 21.0167, lng: 105.8333 }, // 88 Xã Đàn
  'cs3': { lat: 21.0150, lng: 105.8520 }, // 156 Phố Huế
  'cs4': { lat: 20.9980, lng: 105.8120 }, // 45 Nguyễn Trãi
  'cs5': { lat: 21.0550, lng: 105.8100 }, // 210 Lạc Long Quân
  'cs6': { lat: 21.0250, lng: 105.7680 }, // 18 Lê Đức Thọ / Nam Từ Liêm

  // Districts & Areas
  'cau giay': { lat: 21.033, lng: 105.798 },
  'duy tan': { lat: 21.031, lng: 105.783 },
  'xuan thuy': { lat: 21.037, lng: 105.789 },
  'tran duy hung': { lat: 21.009, lng: 105.798 },
  'trung hoa': { lat: 21.012, lng: 105.799 },
  'dich vong': { lat: 21.034, lng: 105.793 },
  'nghia tan': { lat: 21.042, lng: 105.794 },
  'my dinh': { lat: 21.028, lng: 105.772 },
  'me tri': { lat: 21.014, lng: 105.780 },
  'phu do': { lat: 21.010, lng: 105.768 },
  'smart city': { lat: 21.002, lng: 105.742 },
  'vinsmart': { lat: 21.002, lng: 105.742 },
  'tay mo': { lat: 21.005, lng: 105.745 },
  'dai mo': { lat: 20.992, lng: 105.758 },
  'nam tu liem': { lat: 21.020, lng: 105.765 },
  'bac tu liem': { lat: 21.065, lng: 105.765 },
  'pham van dong': { lat: 21.055, lng: 105.778 },
  'co nhue': { lat: 21.068, lng: 105.776 },
  'dong da': { lat: 21.018, lng: 105.828 },
  'xa dan': { lat: 21.016, lng: 105.833 },
  'chua boc': { lat: 21.008, lng: 105.828 },
  'thai ha': { lat: 21.014, lng: 105.819 },
  'lang ha': { lat: 21.019, lng: 105.814 },
  'o cho dua': { lat: 21.021, lng: 105.827 },
  'kham thien': { lat: 21.020, lng: 105.837 },
  'ton duc thang': { lat: 21.024, lng: 105.833 },
  'thanh xuan': { lat: 20.996, lng: 105.810 },
  'nguyen trai': { lat: 20.998, lng: 105.812 },
  'khuong trung': { lat: 20.998, lng: 105.820 },
  'kim giang': { lat: 20.985, lng: 105.815 },
  'le van luong': { lat: 21.006, lng: 105.802 },
  'nhan chinh': { lat: 21.004, lng: 105.805 },
  'hai ba trung': { lat: 21.010, lng: 105.850 },
  'pho hue': { lat: 21.015, lng: 105.852 },
  'bach mai': { lat: 21.002, lng: 105.849 },
  'minh khai': { lat: 20.998, lng: 105.862 },
  'dai la': { lat: 20.999, lng: 105.845 },
  'times city': { lat: 20.994, lng: 105.867 },
  'hoan kiem': { lat: 21.028, lng: 105.854 },
  'trang tien': { lat: 21.025, lng: 105.856 },
  'ba trieu': { lat: 21.018, lng: 105.851 },
  'hang bai': { lat: 21.022, lng: 105.853 },
  'pho co': { lat: 21.035, lng: 105.852 },
  'ba dinh': { lat: 21.035, lng: 105.830 },
  'doi can': { lat: 21.036, lng: 105.820 },
  'lieu giai': { lat: 21.033, lng: 105.814 },
  'kim ma': { lat: 21.031, lng: 105.821 },
  'giang vo': { lat: 21.028, lng: 105.822 },
  'tay ho': { lat: 21.060, lng: 105.820 },
  'lac long quan': { lat: 21.055, lng: 105.810 },
  'thuy khue': { lat: 21.044, lng: 105.822 },
  'vo chi cong': { lat: 21.068, lng: 105.805 },
  'ciputra': { lat: 21.075, lng: 105.795 },
  'ha dong': { lat: 20.970, lng: 105.775 },
  'tran phu': { lat: 20.982, lng: 105.788 },
  'quang trung': { lat: 20.965, lng: 105.768 },
  'van quan': { lat: 20.980, lng: 105.790 },
  'mo lao': { lat: 20.985, lng: 105.786 },
  'duong noi': { lat: 20.975, lng: 105.748 },
  'hoang mai': { lat: 20.975, lng: 105.845 },
  'linh dam': { lat: 20.966, lng: 105.828 },
  'giai phong': { lat: 20.985, lng: 105.840 },
  'dinh cong': { lat: 20.988, lng: 105.832 },
  'thanh tri': { lat: 20.950, lng: 105.830 },
  'dai thanh': { lat: 20.955, lng: 105.815 },
  'thuong phuc': { lat: 20.952, lng: 105.818 },
  'long bien': { lat: 21.040, lng: 105.880 },
  'nguyen van cu': { lat: 21.045, lng: 105.875 },
  'sai dong': { lat: 21.035, lng: 105.905 },
  'gia lam': { lat: 21.010, lng: 105.930 },
  'ocean park': { lat: 20.995, lng: 105.945 },
};

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

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const birdDistance = R * c;
  // Road winding factor in Hanoi (typically 1.35x crow flies)
  return Math.max(1.0, Math.round(birdDistance * 1.35 * 10) / 10);
}

function findCoordinates(text: string): { lat: number; lng: number } {
  const clean = removeAccents(text);
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (clean.includes(key)) {
      return coords;
    }
  }
  // Default to central Hanoi (Hoan Kiem/Dong Da)
  return { lat: 21.025, lng: 105.825 };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerAddress = body.customerAddress || body.address || '';
    const targetBranchId = body.branchId || body.targetBranchId || '';

    if (!customerAddress || typeof customerAddress !== 'string' || customerAddress.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp địa chỉ nhận hàng hợp lệ' },
        { status: 400 }
      );
    }

    // 1. Fetch active branches from database
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (branches.length === 0) {
      return NextResponse.json({
        success: true,
        distanceKm: 3.0,
        estimatedFee: 21000,
        nearestBranch: 'Cơ Sở Cầu Giấy',
        nearestBranchId: 'cs1',
      });
    }

    const targetBranch = targetBranchId
      ? branches.find(
          (b) =>
            b.id === targetBranchId ||
            b.code?.toLowerCase() === targetBranchId.toLowerCase() ||
            b.name === targetBranchId
        )
      : null;

    if (targetBranch) {
      const customerCoords = findCoordinates(customerAddress);
      const branchCoords =
        KNOWN_COORDINATES[targetBranch.code?.toLowerCase() || ''] ||
        KNOWN_COORDINATES[targetBranch.id?.toLowerCase() || ''] ||
        findCoordinates(targetBranch.address || targetBranch.name);

      const dist = calculateHaversineKm(
        customerCoords.lat,
        customerCoords.lng,
        branchCoords.lat,
        branchCoords.lng
      );

      const distKm = Math.max(1.0, Math.round(dist * 10) / 10);
      const rawFee = distKm * 7000;
      const estimatedFee = Math.round(rawFee / 1000) * 1000;

      return NextResponse.json({
        success: true,
        distanceKm: distKm,
        estimatedFee,
        nearestBranch: targetBranch.code
          ? `${targetBranch.code.toUpperCase()} - ${targetBranch.name}`
          : targetBranch.name,
        nearestBranchId: targetBranch.id,
      });
    }

    const branchesWithAddress = branches
      .map((b) => `- ID: "${b.id}", Mã: "${b.code}", Tên: "${b.name}", Địa chỉ: "${b.address}"`)
      .join('\n');

    // 2. Fetch AI settings for Gemini API
    const settings = await prisma.setting.findMany({ where: { group: 'AI' } });
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));
    const apiKey = settingsMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '';
    const aiModel = settingsMap['AI_MODEL'] || 'gemini-1.5-flash';

    let resultNearestBranchId = '';
    let resultNearestBranchName = '';
    let resultDistanceKm: number | null = null;

    // 3. Try Gemini AI distance calculation
    if (apiKey) {
      try {
        const prompt = `Bạn là trợ lý tính khoảng cách đường bộ (road driving distance) chuẩn xác cho chuỗi nhà hàng Gà Ủ Muối Smart tại Hà Nội.
Cho địa chỉ khách hàng nhận hàng: "${customerAddress}"
Và danh sách các cơ sở nhà hàng sau:
${branchesWithAddress}

HÃY:
1. Xác định vị trí địa lý của địa chỉ khách hàng tại Hà Nội.
2. Ước tính khoảng cách di chuyển đường bộ xe máy (theo km thực tế) từ địa chỉ khách tới từng cơ sở trong danh sách.
3. Chọn ra Cơ sở gần nhất (Min Distance).
4. Trả về DUY NHẤT một JSON hợp lệ dạng:
{
  "nearestBranchId": "ID cơ sở gần nhất",
  "branchName": "Tên cơ sở gần nhất (VD: CS1 - Cơ Sở Cầu Giấy)",
  "distanceKm": 4.5
}`;

        const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const response = await fetch(modelEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.1,
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = replyText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.distanceKm && typeof parsed.distanceKm === 'number' && parsed.distanceKm > 0) {
              resultDistanceKm = Math.round(parsed.distanceKm * 10) / 10;
              resultNearestBranchId = parsed.nearestBranchId || branches[0].id;
              resultNearestBranchName = parsed.branchName || branches[0].name;
            }
          }
        }
      } catch (geminiErr) {
        console.error('Gemini distance calculation failed, using geospatial fallback:', geminiErr);
      }
    }

    // 4. Fallback: Geospatial Haversine estimation if Gemini didn't return
    if (!resultDistanceKm || resultDistanceKm <= 0) {
      const customerCoords = findCoordinates(customerAddress);

      let minDistance = 9999;
      let closestBranch = branches[0];

      for (const branch of branches) {
        const branchCoords =
          KNOWN_COORDINATES[branch.code?.toLowerCase() || ''] ||
          KNOWN_COORDINATES[branch.id?.toLowerCase() || ''] ||
          findCoordinates(branch.address || branch.name);

        const dist = calculateHaversineKm(
          customerCoords.lat,
          customerCoords.lng,
          branchCoords.lat,
          branchCoords.lng
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestBranch = branch;
        }
      }

      resultDistanceKm = Math.max(1.0, Math.round(minDistance * 10) / 10);
      resultNearestBranchId = closestBranch.id;
      resultNearestBranchName = closestBranch.code
        ? `${closestBranch.code.toUpperCase()} - ${closestBranch.name}`
        : closestBranch.name;
    }

    // 5. Calculate estimated fee: Math.round(distanceKm * 7000) rounded to thousands
    const rawFee = resultDistanceKm * 7000;
    const estimatedFee = Math.round(rawFee / 1000) * 1000;

    return NextResponse.json({
      success: true,
      distanceKm: resultDistanceKm,
      estimatedFee,
      nearestBranch: resultNearestBranchName,
      nearestBranchId: resultNearestBranchId,
    });
  } catch (error: any) {
    console.error('Error in calculate-distance API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi tính khoảng cách' },
      { status: 500 }
    );
  }
}
