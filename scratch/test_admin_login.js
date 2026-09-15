const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAdmin() {
  const user = await prisma.user.findFirst({
    where: { username: 'admin' }
  });
  console.log("Admin user found in local DB:", user ? user.username : "NOT FOUND");
  if (user) {
    const isMatch = await bcrypt.compare('GaMuoi@2026', user.password);
    console.log("Password 'GaMuoi@2026' match:", isMatch);
  }
}

testAdmin().finally(() => prisma.$disconnect());
