import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// Ensure SQLite DATABASE_URL points to an absolute path so SQLite never fails with error code 14 (SQLITE_CANTOPEN)
if (!process.env.DATABASE_URL) {
  const dbDir = path.resolve(process.cwd(), 'prisma');
  if (!fs.existsSync(dbDir)) {
    try { fs.mkdirSync(dbDir, { recursive: true }); } catch (e) {}
  }
  const dbPath = path.join(dbDir, 'dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let isInitializing = false;

export async function ensureDbInitialized() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    // 1. Create User table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        staffCode TEXT UNIQUE DEFAULT 'NV-0101',
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'ADMIN',
        branchId TEXT DEFAULT 'cs1',
        branchIds TEXT DEFAULT '[]',
        avatar TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Category table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Category (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Product table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Product (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'SINGLE',
        description TEXT,
        price REAL NOT NULL,
        costPrice REAL DEFAULT 0,
        image TEXT,
        isAvailable BOOLEAN DEFAULT 1,
        isBestSeller BOOLEAN DEFAULT 0,
        expiryDate DATETIME,
        batchCode TEXT,
        aiKeywords TEXT,
        stockQuantity REAL DEFAULT 50,
        unit TEXT DEFAULT 'Con',
        categoryId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Order table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
        id TEXT PRIMARY KEY,
        orderCode TEXT UNIQUE NOT NULL,
        customerName TEXT NOT NULL,
        customerPhone TEXT NOT NULL,
        deliveryAddress TEXT NOT NULL,
        note TEXT,
        status TEXT DEFAULT 'PENDING',
        paymentStatus TEXT DEFAULT 'UNPAID',
        paymentMethod TEXT DEFAULT 'CASH',
        subTotal REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        shippingFee REAL DEFAULT 0,
        totalAmount REAL NOT NULL,
        cashAmount REAL DEFAULT 0,
        transferAmount REAL DEFAULT 0,
        branchId TEXT DEFAULT 'cs1',
        sellerName TEXT DEFAULT 'Thu ngân POS',
        sourceTag TEXT DEFAULT 'Đơn Mới Web',
        carrierName TEXT,
        driverName TEXT,
        driverPhone TEXT,
        trackingUrl TEXT,
        shippedAt DATETIME,
        paidAt DATETIME,
        completedAt DATETIME,
        shiftId TEXT,
        createdById TEXT,
        confirmedById TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Check if admin user exists, auto-insert if missing
    const userCount: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM User`);
    const count = Array.isArray(userCount) && userCount[0] ? Number(userCount[0].count) : 0;

    if (count === 0) {
      console.log("-> Auto-creating default admin user in User table...");
      const defaultPasswordHash = await bcrypt.hash('GaMuoi@2026', 10);
      const adminId = 'usr_admin_01';
      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe(`
        INSERT INTO User (id, staffCode, name, username, password, role, branchId, isActive, createdAt, updatedAt)
        VALUES ('${adminId}', 'NV-0101', 'Nguyễn Văn Quyền (Admin)', 'admin', '${defaultPasswordHash}', 'ADMIN', 'cs1', 1, '${now}', '${now}')
      `);
      console.log("-> Admin user created successfully!");
    }
  } catch (err: any) {
    console.warn("Notice in ensureDbInitialized:", err.message);
  } finally {
    isInitializing = false;
  }
}

export default prisma;
