import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔑 Bắt đầu tạo/cập nhật tài khoản Super Admin duy nhất...');

  const hashedPassword = await bcrypt.hash('admin@smart123', 10);

  // Upsert 'admin' user
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      name: 'Super Admin Quản Trị',
      staffCode: 'NV-ADMIN-01',
    },
    create: {
      staffCode: 'NV-ADMIN-01',
      name: 'Super Admin Quản Trị',
      username: 'admin',
      password: hashedPassword,
      phone: '0988.888.888',
      role: 'ADMIN',
      branchId: 'cs1',
      isActive: true,
    },
  });

  // Also upsert 'admin.pos' as secondary fallback with same password
  await prisma.user.upsert({
    where: { username: 'admin.pos' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      name: 'Super Admin Quản Trị',
    },
    create: {
      staffCode: 'NV-ADMIN-02',
      name: 'Super Admin Quản Trị',
      username: 'admin.pos',
      password: hashedPassword,
      phone: '0988.888.888',
      role: 'ADMIN',
      branchId: 'cs1',
      isActive: true,
    },
  });

  console.log('✅ Đã tạo thành công tài khoản Super Admin:');
  console.log(`   - Username: ${adminUser.username}`);
  console.log('   - Password: admin@smart123');
  console.log(`   - Role: ${adminUser.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
