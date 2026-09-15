import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Bắt đầu dọn dẹp dữ liệu demo, chuẩn bị vận hành sản xuất (Production Ready)...');

  // 1. Delete transactional records in foreign key dependency order
  console.log('  1. Xóa toàn bộ lịch sử đơn hàng...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  console.log('  2. Xóa toàn bộ phiếu chi sổ quỹ...');
  await prisma.expense.deleteMany({});

  console.log('  3. Xóa toàn bộ lịch sử đóng/mở ca...');
  await prisma.shift.deleteMany({});

  console.log('  4. Xóa toàn bộ dữ liệu chấm công...');
  await prisma.attendance.deleteMany({});

  console.log('  5. Xóa toàn bộ danh bạ khách hàng thử nghiệm...');
  await prisma.customer.deleteMany({});

  console.log('  6. Xóa toàn bộ phiếu nhập/xuất kho & nhật ký giao dịch...');
  await prisma.inventoryReceiptItem.deleteMany({});
  await prisma.inventoryReceipt.deleteMany({});
  await prisma.inventoryExportItem.deleteMany({});
  await prisma.inventoryExport.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});

  // 2. Ensure Super Admin user exists & clean test staff accounts
  console.log('  7. Dọn dẹp tài khoản nhân viên test, giữ lại 01 Super Admin...');
  await prisma.user.deleteMany({
    where: {
      username: {
        notIn: ['admin.pos', 'admin'],
      },
    },
  });

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'admin.pos' }, { username: 'admin' }],
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        staffCode: 'NV-ADMIN',
        name: 'Super Admin Quản Trị',
        username: 'admin.pos',
        password: hashedPassword,
        phone: '0988.888.888',
        role: 'ADMIN',
        branchId: 'cs1',
        isActive: true,
      },
    });
    console.log('    -> Đã tạo tài khoản Super Admin (admin.pos / admin123)');
  }

  // 3. Reset product stock quantities to 0 (awaiting real inbound inventory receipts)
  console.log('  8. Đưa toàn bộ tồn kho sản phẩm & vật tư về 0 (chờ nhập mẻ đầu)...');
  await prisma.product.updateMany({
    data: {
      stockQuantity: 0,
      isAvailable: false,
    },
  });

  await prisma.inventoryItem.updateMany({
    data: {
      currentQuantity: 0,
    },
  });

  console.log('\n✨ Đã dọn sạch 100% dữ liệu demo!');
  console.log('🚀 Hệ thống Gà Ủ Muối Smart đã sẵn sàng cho ngày mở bán đầu tiên (Production Ready)!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi dọn dẹp CSDL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
