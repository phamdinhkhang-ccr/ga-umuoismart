import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Gà Ủ Muối Smart database...');

  // Clean existing data
  await prisma.user.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.branch.deleteMany();

  // 0. Seed Branch Table
  const branchesSeedData = [
    { id: 'cs1', code: 'CS1', name: 'Cơ Sở Cầu Giấy', city: 'Hà Nội', address: '12 Đường Cầu Giấy, Q. Cầu Giấy, Hà Nội', hotline: '0988.888.901' },
    { id: 'cs2', code: 'CS2', name: 'Cơ Sở Đống Đa', city: 'Hà Nội', address: '88 Phố Xã Đàn, Q. Đống Đa, Hà Nội', hotline: '0988.888.902' },
    { id: 'cs3', code: 'CS3', name: 'Cơ Sở Hai Bà Trưng', city: 'Hà Nội', address: '156 Phố Huế, Q. Hai Bà Trưng, Hà Nội', hotline: '0988.888.903' },
    { id: 'cs4', code: 'CS4', name: 'Cơ Sở Thanh Xuân', city: 'Hà Nội', address: '45 Đường Nguyễn Trãi, Q. Thanh Xuân, Hà Nội', hotline: '0988.888.904' },
    { id: 'cs5', code: 'CS5', name: 'Cơ Sở Tây Hồ', city: 'Hà Nội', address: '210 Đường Lạc Long Quân, Q. Tây Hồ, Hà Nội', hotline: '0988.888.905' },
    { id: 'cs6', code: 'CS6', name: 'Cơ Sở Nam Từ Liêm', city: 'Hà Nội', address: '18 Đường Lê Đức Thọ, Q. Nam Từ Liêm, Hà Nội', hotline: '0988.888.906' },
  ];

  for (const b of branchesSeedData) {
    await prisma.branch.create({ data: b });
  }

  // 1. Seed Categories
  const catGaMain = await prisma.category.create({
    data: {
      name: 'Gà Nguyên Con / Nửa Con',
      slug: 'ga-nguyen-con-nua-con',
      description: 'Gà ủ muối hoa tiêu thịt săn chắc, da vàng giòn ươm sần sật',
    },
  });

  const catSnack = await prisma.category.create({
    data: {
      name: 'Món Ăn Vặt & Nhắm',
      slug: 'mon-an-vat-nham',
      description: 'Chân gà, cánh gà ủ muối giòn thơm nhắm cực đỉnh',
    },
  });

  const catCombo = await prisma.category.create({
    data: {
      name: 'Combo Tiết Kiệm',
      slug: 'combo-tiet-kiem',
      description: 'Combo trọn gói siêu ưu đãi cho gia đình và buổi tiệc',
    },
  });

  const catSauce = await prisma.category.create({
    data: {
      name: 'Sốt & Đồ Ăn Kèm',
      slug: 'sot-do-an-kem',
      description: 'Nước chấm sốt ớt xanh độc quyền và đồ chua thanh mát',
    },
  });

  // 2. Seed Products
  const productsData = [
    {
      name: 'Gà Ủ Muối Hoa Tiêu Nguyên Con (kèm đồ chấm muối tiêu chanh, rau răm)',
      description: 'Gà thả vườn ủ muối hoa tiêu da giòn sần sật, thịt ngọt thơm đậm vị thảo mộc tự nhiên.',
      price: 250000,
      costPrice: 160000,
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
      categoryId: catGaMain.id,
      isAvailable: true,
    },
    {
      name: 'Gà Ủ Muối Hoa Tiêu Nửa Con',
      description: 'Khẩu phần nửa con vừa vặn cho 2 người ăn, kèm rau răm và sốt chấm cay nồng.',
      price: 135000,
      costPrice: 85000,
      image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&q=80',
      categoryId: catGaMain.id,
      isAvailable: true,
    },
    {
      name: 'Chân Gà Rút Xương Ủ Muối',
      description: 'Chân gà rút xương ngấm vị hoa tiêu giòn rụm, món nhắm nhâm nhi hoàn hảo.',
      price: 85000,
      costPrice: 50000,
      image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80',
      categoryId: catSnack.id,
      isAvailable: true,
    },
    {
      name: 'Cánh Gà Ủ Muối Giòn Sần Sật',
      description: 'Cánh gà rưới sốt muối ớt thơm nồng, thịt săn chắc mọng nước.',
      price: 95000,
      costPrice: 60000,
      image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
      categoryId: catSnack.id,
      isAvailable: true,
    },
    {
      name: 'Combo Thịnh Vượng (1 Gà nguyên con + 1 hộp chân gà + sốt chấm đặc biệt)',
      description: 'Combo trọn gói tiết kiệm cho tiệc gia đình 4-6 người ăn no nê.',
      price: 320000,
      costPrice: 200000,
      image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80',
      categoryId: catCombo.id,
      isAvailable: true,
    },
    {
      name: 'Nước chấm sốt ớt xanh độc quyền (hũ 250ml)',
      description: 'Công thức sốt ớt xanh béo ngậy chua cay mặn ngọt chuẩn vị Gà Ủ Muối Smart.',
      price: 35000,
      costPrice: 15000,
      image: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&q=80',
      categoryId: catSauce.id,
      isAvailable: true,
    },
  ];

  for (const p of productsData) {
    await prisma.product.create({ data: p });
  }

  // 3. Seed Settings (CMS, Store, AI)
  const defaultSettings = [
    { key: 'GEMINI_API_KEY', value: '', group: 'AI' },
    {
      key: 'AI_SYSTEM_PROMPT',
      value:
        "Bạn là Trợ lý Ẩm thực Smart của 'Gà Ủ Muối Smart'. Giọng điệu nhiệt tình, thân thiện, dạ/vâng lễ phép.\nNhiệm vụ: Tư vấn các món gà (nguyên con, nửa con, chân gà rút xương, sốt ớt xanh), thông tin 6 cơ sở tại Hà Nội (Cầu Giấy, Đống Đa, Hai Bà Trưng, Thanh Xuân, Tây Hồ, Nam Từ Liêm).\nChủ động xin Tên, Số điện thoại, Địa chỉ giao hàng khi khách có nhu cầu đặt hàng để tự động lên đơn cho khách.",
      group: 'AI',
    },
    {
      key: 'CMS_HEADER_JSON',
      value: JSON.stringify({
        logoText1: 'GÀ Ủ MUỐI',
        logoText2: 'SMART',
        hotline: '0988.888.999',
      }),
      group: 'CMS',
    },
    {
      key: 'CMS_HERO_JSON',
      value: JSON.stringify({
        line1: 'Gà Ủ Muối Smart',
        line2: 'Giao Hỏa Tốc Nội Thành',
      }),
      group: 'CMS',
    },
    {
      key: 'CMS_PROMO_JSON',
      value: JSON.stringify({
        card1Title: 'Hỗ Trợ 35K Ship Từ Bill 355K',
        card1Desc: 'Tự động áp dụng khi chốt đơn trực tiếp',
        card2Title: 'Giao Hỏa Tốc 30-40 Phút',
        card2Desc: 'Đảm bảo độ lạnh giòn và chuẩn vị khi giao tới',
      }),
      group: 'CMS',
    },
    {
      key: 'CMS_BRANCHES_JSON',
      value: JSON.stringify([
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
      group: 'CMS',
    },
    {
      key: 'CMS_STORY_JSON',
      value: JSON.stringify({
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
      group: 'CMS',
    },
    {
      key: 'CMS_HERO_TITLE',
      value: 'Gà Ủ Muối Smart - Da Giòn Thịt Ngọt, Đậm Vị Thảo Mộc Tự Nhiên',
      group: 'CMS',
    },
    {
      key: 'CMS_HERO_SUBTITLE',
      value: 'Cam kết không chất bảo quản, thịt gà thả vườn tươi mới mỗi ngày, giao hỏa tốc tận tay trong 30 phút!',
      group: 'CMS',
    },
    { key: 'STORE_NAME', value: 'Gà Ủ Muối Smart', group: 'STORE' },
    { key: 'STORE_HOTLINE', value: '0988.888.999', group: 'STORE' },
    { key: 'STORE_ADDRESS', value: '88 Đường Phạm Văn Đồng, Q. Bình Thạnh, TP. Hồ Chí Minh', group: 'STORE' },
    { key: 'STORE_BANK_NAME', value: 'MB Bank', group: 'STORE' },
    { key: 'STORE_BANK_ACCOUNT', value: '6868.8888.9999', group: 'STORE' },
    { key: 'STORE_BANK_OWNER', value: 'GA U MUOI SMART CO LTD', group: 'STORE' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.create({ data: s });
  }

  // 4. Seed Staff
  await prisma.staff.createMany({
    data: [
      { name: 'Nguyễn Văn Quyền (Admin)', phone: '0901111222', role: 'Admin', status: 'ACTIVE' },
      { name: 'Trần Thị Mai (Thu ngân)', phone: '0902222333', role: 'Thu ngân', status: 'ACTIVE' },
      { name: 'Lê Hoàng Nam (Bếp chính)', phone: '0903333444', role: 'Pha chế', status: 'ACTIVE' },
    ],
  });

  // 5. Seed Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Anh Tuấn',
      phone: '0912345678',
      address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
      totalOrders: 4,
      totalSpent: 890000,
      lastOrderAt: new Date(),
    },
  });

  // 6. Seed Sample Orders across 6 Branches (30 Orders Total)
  const allProds = await prisma.product.findMany();
  const branchesList = ['cs1', 'cs2', 'cs3', 'cs4', 'cs5', 'cs6'];
  const branchOrderCounts = [7, 6, 5, 4, 4, 4]; // Total 30 orders

  const sampleCustomers = [
    { name: 'Anh Tuấn', phone: '0912345678', address: '12 Cầu Giấy, Q. Cầu Giấy' },
    { name: 'Chị Mai', phone: '0987654321', address: '88 Xã Đàn, Q. Đống Đa' },
    { name: 'Anh Đức', phone: '0905123456', address: '156 Phố Huế, Q. Hai Bà Trưng' },
    { name: 'Chị Lan', phone: '0934567890', address: '45 Nguyễn Trãi, Q. Thanh Xuân' },
    { name: 'Anh Nam', phone: '0978123456', address: '210 Lạc Long Quân, Q. Tây Hồ' },
    { name: 'Chị Hương', phone: '0966888999', address: '18 Lê Đức Thọ, Q. Nam Từ Liêm' },
  ];

  const peakHours = [11, 12, 13, 18, 19, 20];
  let orderCounter = 1001;

  for (let bIdx = 0; bIdx < branchesList.length; bIdx++) {
    const bId = branchesList[bIdx];
    const count = branchOrderCounts[bIdx];

    for (let i = 0; i < count; i++) {
      const cust = sampleCustomers[(bIdx + i) % sampleCustomers.length];
      const hour = peakHours[(bIdx + i) % peakHours.length];
      const isAI = (bIdx + i) % 2 === 0;

      const orderTime = new Date();
      orderTime.setHours(hour, (i * 12) % 60, 0, 0);

      // Pick 1-2 random items
      const item1 = allProds[i % allProds.length];
      const item2 = allProds[(i + 2) % allProds.length];

      const qty1 = 1;
      const qty2 = i % 3 === 0 ? 1 : 0;
      const totalAmount = item1.price * qty1 + (qty2 > 0 ? item2.price * qty2 : 0);

      const statusOptions = ['COMPLETED', 'COMPLETED', 'PROCESSING', 'PENDING'];
      const status = statusOptions[i % statusOptions.length];

      const createdOrder = await prisma.order.create({
        data: {
          orderCode: `DH-${orderCounter++}`,
          customerName: cust.name,
          customerPhone: cust.phone,
          deliveryAddress: cust.address,
          note: isAI ? 'Đặt hàng qua AI Chatbot Smart' : 'Đặt trực tiếp qua Web Form',
          status: status,
          paymentMethod: i % 2 === 0 ? 'COD' : 'BANK_TRANSFER',
          totalAmount: totalAmount,
          branchId: bId,
          createdAt: orderTime,
          items: {
            create: [
              {
                productId: item1.id,
                productName: item1.name,
                quantity: qty1,
                price: item1.price,
                subtotal: item1.price * qty1,
              },
              ...(qty2 > 0
                ? [
                    {
                      productId: item2.id,
                      productName: item2.name,
                      quantity: qty2,
                      price: item2.price,
                      subtotal: item2.price * qty2,
                    },
                  ]
                : []),
            ],
          },
        },
      });
    }
  }

  // 7. Seed Closed Shifts across branches
  const shiftNames = ['Ca Sáng', 'Ca Chiều', 'Ca Tối'];
  const staffList = ['Trần Thị Mai (Thu ngân)', 'Nguyễn Văn Quyền (Admin)', 'Lê Hoàng Nam (Thu ngân)'];

  const nowShift = new Date();

  // Create closed shift 1: cs1 - Ca Sáng
  const s1Start = new Date(nowShift);
  s1Start.setHours(7, 0, 0, 0);
  const s1End = new Date(nowShift);
  s1End.setHours(13, 0, 0, 0);

  await prisma.shift.create({
    data: {
      staffName: staffList[0],
      shiftName: 'Ca Sáng (07:00 - 13:00)',
      branchId: 'cs1',
      startTime: s1Start,
      endTime: s1End,
      initialCash: 1000000,
      finalCashExpected: 2285000,
      finalCashActual: 2285000,
      status: 'CLOSED',
      note: 'Ca làm việc khớp tiền 100%',
    },
  });

  // Create closed shift 2: cs2 - Ca Sáng
  await prisma.shift.create({
    data: {
      staffName: staffList[1],
      shiftName: 'Ca Sáng (07:00 - 13:00)',
      branchId: 'cs2',
      startTime: s1Start,
      endTime: s1End,
      initialCash: 1000000,
      finalCashExpected: 1850000,
      finalCashActual: 1850000,
      status: 'CLOSED',
      note: 'Ca làm việc khớp tiền',
    },
  });

  // Create closed shift 3: cs1 - Ca Chiều
  const s2Start = new Date(nowShift);
  s2Start.setHours(13, 0, 0, 0);
  const s2End = new Date(nowShift);
  s2End.setHours(18, 0, 0, 0);

  await prisma.shift.create({
    data: {
      staffName: staffList[2],
      shiftName: 'Ca Chiều (13:00 - 18:00)',
      branchId: 'cs1',
      startTime: s2Start,
      endTime: s2End,
      initialCash: 1500000,
      finalCashExpected: 2950000,
      finalCashActual: 2950000,
      status: 'CLOSED',
      note: 'Thu ngân kiểm đếm đủ tiền mặt ca chiều',
    },
  });

  // Create active open shift for cs1 - Ca Tối
  const s3Start = new Date(nowShift);
  s3Start.setHours(18, 0, 0, 0);

  await prisma.shift.create({
    data: {
      staffName: staffList[0],
      shiftName: 'Ca Tối (18:00 - 22:00)',
      branchId: 'cs1',
      startTime: s3Start,
      initialCash: 1500000,
      status: 'OPEN',
      note: 'Ca tối đang chạy bán hàng hỏa tốc',
    },
  });

  // 8. Seed Expenses per branch
  await prisma.expense.createMany({
    data: [
      { title: 'Mua túi giấy & hộp đựng bọc bạc', amount: 250000, category: 'Vật tư', note: 'Cơ sở Cầu Giấy', branchId: 'cs1' },
      { title: 'Mua rau răm & chanh tươi', amount: 120000, category: 'Nguyên liệu', note: 'Cơ sở Đống Đa', branchId: 'cs2' },
      { title: 'In thêm hóa đơn POS', amount: 80000, category: 'Vật tư', note: 'Cơ sở Hai Bà Trưng', branchId: 'cs3' },
    ],
  });

  // 9. Seed Inventory Items
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: 'Gà Ta Mái Rạ Tươi Thả Vườn',
        unit: 'Con',
        currentQuantity: 35,
        minQuantity: 10,
        costPerUnit: 120000,
        supplier: 'Trang Trại Gà Sạch Đồng Nai',
      },
      {
        name: 'Muối Tiêu Hoa Tiêu Thảo Mộc',
        unit: 'Kg',
        currentQuantity: 8.5,
        minQuantity: 3.0,
        costPerUnit: 150000,
        supplier: 'Gia Vị Tây Bắc Smart',
      },
      {
        name: 'Chân Gà Tươi Làm Sạch',
        unit: 'Kg',
        currentQuantity: 4,
        minQuantity: 8, // Low stock alert
        costPerUnit: 42000,
        supplier: 'Nông Sản Việt',
      },
    ],
  });

  // 10. Seed Users (Admin, Manager, Cashier, Kitchen, Shipper)
  const defaultPasswordHash = await bcrypt.hash('GaMuoi@2026', 10);

  const seedUsers = [
    {
      staffCode: 'NV-0101',
      name: 'Nguyễn Văn Quyền',
      username: 'admin',
      password: defaultPasswordHash,
      phone: '0901111222',
      role: 'ADMIN',
      branchId: 'cs1',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
      isActive: true,
    },
    {
      staffCode: 'NV-0102',
      name: 'Trần Thị Mai',
      username: 'mai.pos01',
      password: defaultPasswordHash,
      phone: '0902222333',
      role: 'MANAGER',
      branchId: 'cs1',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
      isActive: true,
    },
    {
      staffCode: 'NV-0103',
      name: 'Lê Hoàng Nam',
      username: 'nam.cashier',
      password: defaultPasswordHash,
      phone: '0903333444',
      role: 'CASHIER',
      branchId: 'cs1',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
      isActive: true,
    },
    {
      staffCode: 'NV-0104',
      name: 'Phạm Thị Hương',
      username: 'huong.kitchen',
      password: defaultPasswordHash,
      phone: '0904444555',
      role: 'STAFF',
      branchId: 'cs2',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
      isActive: true,
    },
    {
      staffCode: 'NV-0105',
      name: 'Hoàng Văn Sơn',
      username: 'son.shipper',
      password: defaultPasswordHash,
      phone: '0905555666',
      role: 'STAFF',
      branchId: 'cs3',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
      isActive: false,
    },
  ];

  for (const u of seedUsers) {
    await prisma.user.create({ data: u });
  }

  // 11. Seed Attendance Records
  const todayStr = new Date().toISOString().split('T')[0];
  const staffArray = await prisma.staff.findMany();

  if (staffArray.length > 0) {
    const s1 = staffArray[0];
    const inTime1 = new Date();
    inTime1.setHours(7, 58, 12);
    const outTime1 = new Date();
    outTime1.setHours(15, 0, 45);

    await prisma.attendance.create({
      data: {
        staffId: s1.id,
        staffName: s1.name,
        branchId: 'cs1',
        branchName: 'Cơ Sở Cầu Giấy',
        date: todayStr,
        checkInTime: inTime1,
        checkInPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
        checkOutTime: outTime1,
        checkOutPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
        totalHours: 7.04,
        status: 'ON_TIME',
        notes: 'Chấm công camera đúng giờ',
      },
    });

    if (staffArray.length > 1) {
      const s2 = staffArray[1];
      const inTime2 = new Date();
      inTime2.setHours(8, 14, 0);

      await prisma.attendance.create({
        data: {
          staffId: s2.id,
          staffName: s2.name,
          branchId: 'cs2',
          branchName: 'Cơ Sở Đống Đa',
          date: todayStr,
          checkInTime: inTime2,
          checkInPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
          checkOutTime: null,
          checkOutPhoto: null,
          totalHours: null,
          status: 'LATE',
          notes: 'Đi muộn 14 phút do kẹt xe',
        },
      });
    }

    // 6. Seed Inventory Items (Vật tư & Nguyên liệu)
    const existingInvCount = await prisma.inventoryItem.count();
    if (existingInvCount === 0) {
      const invItemsData = [
        {
          code: '#VT-0101',
          name: 'Gà ta nguyên con hút chân không (Loại 1)',
          unit: 'Con',
          category: 'Thịt gà & Phụ phẩm tươi',
          branchId: 'bep-tong',
          currentQuantity: 4,
          minQuantity: 15,
          costPerUnit: 120000,
          supplier: 'Trang Trại Ba Vì',
          hotline: '0988.112.233',
        },
        {
          code: '#VT-0102',
          name: 'Chân gà sả tắc đóng hộp',
          unit: 'Hộp',
          category: 'Thịt gà & Phụ phẩm tươi',
          branchId: 'cs1',
          currentQuantity: 28,
          minQuantity: 10,
          costPerUnit: 42000,
          supplier: 'Nông Sản Việt',
          hotline: '0977.445.566',
        },
        {
          code: '#VT-0201',
          name: 'Nước sốt chấm ớt xanh đặc biệt (Hũ 500ml)',
          unit: 'Hũ',
          category: 'Gia vị thảo mộc & Sốt',
          branchId: 'bep-tong',
          currentQuantity: 3,
          minQuantity: 12,
          costPerUnit: 35000,
          supplier: 'Xưởng Sốt Kim Long',
          hotline: '0912.888.777',
        },
        {
          code: '#VT-0202',
          name: 'Muối hồng Himalaya & Thảo mộc ủ gà',
          unit: 'Kg',
          category: 'Gia vị thảo mộc & Sốt',
          branchId: 'bep-tong',
          currentQuantity: 18,
          minQuantity: 5,
          costPerUnit: 65000,
          supplier: 'Thảo Dược Bắc Hà',
          hotline: '0933.222.111',
        },
        {
          code: '#VT-0301',
          name: 'Túi hút chân không 2 lớp cao cấp',
          unit: 'Cuộn',
          category: 'Bao bì / Túi hút chân không / Đũa thìa',
          branchId: 'bep-tong',
          currentQuantity: 2,
          minQuantity: 8,
          costPerUnit: 95000,
          supplier: 'Công Ty Bao Bì An Phát',
          hotline: '0904.555.666',
        },
        {
          code: '#VT-0302',
          name: 'Hộp giấy Kraft đựng gà nguyên con',
          unit: 'Thùng',
          category: 'Bao bì / Túi hút chân không / Đũa thìa',
          branchId: 'cs2',
          currentQuantity: 15,
          minQuantity: 6,
          costPerUnit: 180000,
          supplier: 'Bao Bì Xanh Việt Nam',
          hotline: '0966.777.888',
        },
      ];

      for (const item of invItemsData) {
        await prisma.inventoryItem.create({ data: item });
      }
    }
  }

  console.log('Database seeded for Gà Ủ Muối Smart successfully (including Admin & Staff users, Attendance & InventoryItems)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
