import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import os from 'os';

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 1. Try local project paths first
  const projectDbPaths = [
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
    path.resolve(__dirname, '..', '..', 'prisma', 'dev.db'),
    path.resolve(__dirname, '..', '..', 'dev.db'),
  ];

  let existingLocalDb = projectDbPaths.find((p) => fs.existsSync(/*turbopackIgnore: true*/ p));

  // 2. On Linux/Hostinger production environment, use /tmp/gaumuoismart_dev.db for guaranteed write permissions (777)
  const isLinux = os.platform() === 'linux';
  const tmpDir = os.tmpdir() || '/tmp';
  const tmpDbPath = path.join(tmpDir, 'gaumuoismart_dev.db');

  if (isLinux && fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath) && existingLocalDb) {
        console.log(`-> Copying database from ${existingLocalDb} to ${tmpDbPath}...`);
        fs.copyFileSync(existingLocalDb, tmpDbPath);
        try { fs.chmodSync(tmpDbPath, 0o777); } catch (e) {}
      }
      if (fs.existsSync(/*turbopackIgnore: true*/ tmpDbPath)) {
        return `file:${tmpDbPath}`;
      }
    } catch (tmpErr: any) {
      console.warn("Notice copying DB to /tmp:", tmpErr.message);
    }
  }

  // 3. Fallback to local project prisma/dev.db
  const defaultDir = path.resolve(process.cwd(), 'prisma');
  if (!fs.existsSync(/*turbopackIgnore: true*/ defaultDir)) {
    try { fs.mkdirSync(defaultDir, { recursive: true }); } catch (e) {}
  }
  const defaultDbPath = existingLocalDb || path.join(defaultDir, 'dev.db');
  return `file:${defaultDbPath}`;
}

process.env.DATABASE_URL = resolveDatabaseUrl();

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
    // 0. Enable WAL Mode and busy_timeout for high SQLite concurrency
    try {
      await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL;`);
      await prisma.$executeRawUnsafe(`PRAGMA busy_timeout = 10000;`);
    } catch (e) {}

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
