const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log('=== TOTAL ORDERS IN DB:', orders.length, '===');
  orders.forEach((o) => {
    console.log({
      id: o.id,
      orderCode: o.orderCode,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      branchId: o.branchId,
      createdAt: o.createdAt,
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
