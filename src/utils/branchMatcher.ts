export interface AreaRule {
  branchKey: string;
  districts: string[];
  landmarks: string[];
}

export const BRANCH_AREAS: AreaRule[] = [
  {
    branchKey: 'vinsmart',
    districts: ['nam từ liêm', 'bắc từ liêm', 'hà đông', 'hoài đức', 'quốc oai'],
    landmarks: ['vin smart', 'vinsmart', 'smart city', 'tây mỗ', 'đại mỗ', 'an khánh', 'mễ trì', 'mỹ đình', 'lê trọng tấn']
  },
  {
    branchKey: 'caugiay',
    districts: ['cầu giấy', 'ba đình', 'tây hồ'],
    landmarks: ['dịch vọng', 'nghĩa tân', 'xuân thủy', 'trần thái tông', 'trung hòa', 'hoàng quốc việt', 'mai dịch', 'nguyên khang', 'nguyễn khang', 'đội cấn', 'kim mã']
  },
  {
    branchKey: 'dongda',
    districts: ['đống đa', 'thanh xuân'],
    landmarks: ['chùa bộc', 'thái hà', 'xã đàn', 'ô chợ dừa', 'láng hạ', 'nguyễn trãi', 'khuất duy tiến', 'tôn đức thắng', 'nguyễn lương bằng']
  },
  {
    branchKey: 'linhdam',
    districts: ['hoàng mai', 'hai bà trưng', 'thanh trì'],
    landmarks: ['linh đàm', 'định công', 'giáp bát', 'bạch mai', 'minh khai', 'trương định', 'tam trinh', 'vĩnh tuy', 'ngọc hồi']
  },
  {
    branchKey: 'q1',
    districts: ['quận 1', 'q1', 'q.1', 'quận 4', 'q4', 'quận 2', 'thành phố thủ đức', 'bình thạnh', 'phú nhuận'],
    landmarks: ['bến thành', 'bến nghé', 'lê lợi', 'nguyễn huệ', 'tân định', 'đakao', 'thảo điền']
  },
  {
    branchKey: 'q3',
    districts: ['quận 3', 'q3', 'q.3', 'quận 10', 'q10', 'quận 5', 'q5', 'tân bình', 'quận 11'],
    landmarks: ['võ thị sáu', 'cách mạng tháng 8', 'cmt8', 'lê văn sỹ', 'bàn cờ', 'nam kỳ khởi nghĩa']
  }
];

export function findBestBranchForAddress(address: string, branches: any[]) {
  if (!address || !branches || branches.length === 0) return null;
  const text = address.toLowerCase().trim();

  // 1. Quét tìm theo mốc địa danh nổi bật trước (landmarks)
  for (const rule of BRANCH_AREAS) {
    if (rule.landmarks.some((lm) => text.includes(lm))) {
      const match = branches.find((b) => 
        b.name.toLowerCase().includes(rule.branchKey) || 
        (b.id && b.id.toLowerCase().includes(rule.branchKey)) ||
        (b.address && b.address.toLowerCase().includes(rule.branchKey))
      );
      if (match) return match;
    }
  }

  // 2. Quét tìm theo Quận / Huyện
  for (const rule of BRANCH_AREAS) {
    if (rule.districts.some((d) => text.includes(d))) {
      const match = branches.find((b) => 
        b.name.toLowerCase().includes(rule.branchKey) || 
        (b.id && b.id.toLowerCase().includes(rule.branchKey)) ||
        (b.address && b.address.toLowerCase().includes(rule.branchKey))
      );
      if (match) return match;
    }
  }

  return null;
}
