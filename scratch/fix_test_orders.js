const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Update order DH-90370 (Set 3, 325,000đ, COMPLETED, PAID) to today
  const order90370 = await prisma.order.updateMany({
    where: { orderCode: 'DH-90370' },
    data: {
      createdAt: now,
      updatedAt: now,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
    },
  });

  // Update order DH-57774 (383,633đ) to today
  const order57774 = await prisma.order.updateMany({
    where: { orderCode: 'DH-57774' },
    data: {
      createdAt: now,
      updatedAt: now,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
    },
  });

  // Update order DH-97147 to today
  const order97147 = await prisma.order.updateMany({
    where: { orderCode: 'DH-97147' },
    data: {
      createdAt: now,
      updatedAt: now,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    },
  });

  console.log('Updated orders count:', order90370, order57774, order97147);

  const allOrders = await prisma.order.findMany();
  console.log('=== ALL ORDERS IN DB AFTER SYNC ===');
  allOrders.forEach(o => {
    console.log(o.orderCode, 'Total:', o.totalAmount, 'Status:', o.status, 'Payment:', o.paymentStatus, 'CreatedAt:', o.createdAt);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
