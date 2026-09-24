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

  const existingLocalDb = projectDbPaths.find((p) => fs.existsSync(/*turbopackIgnore: true*/ p));

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

    // 4. Create ComboItem table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ComboItem (
        id TEXT PRIMARY KEY,
        comboId TEXT NOT NULL,
        productId TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create Branch table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Branch (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        city TEXT DEFAULT 'Hà Nội',
        address TEXT NOT NULL,
        hotline TEXT NOT NULL,
        openingHours TEXT DEFAULT '08:00 - 22:00',
        managerName TEXT DEFAULT 'Quản lý cơ sở',
        googleMapsUrl TEXT,
        image TEXT,
        isActive BOOLEAN DEFAULT 1,
        sortOrder INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create Order table if missing
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

    // 7. Create OrderItem table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS OrderItem (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        productId TEXT,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        subtotal REAL NOT NULL
      );
    `);

    // 8. Create Shift table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Shift (
        id TEXT PRIMARY KEY,
        staffName TEXT NOT NULL,
        shiftName TEXT DEFAULT 'Ca Sáng',
        branchId TEXT DEFAULT 'cs1',
        teamMembers TEXT,
        initialCash REAL NOT NULL,
        initialInventory TEXT,
        finalCashExpected REAL,
        finalCashActual REAL,
        finalInventory TEXT,
        inventoryNote TEXT,
        startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        endTime DATETIME,
        status TEXT DEFAULT 'OPEN',
        note TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Create Expense table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Expense (
        id TEXT PRIMARY KEY,
        expenseCode TEXT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        paymentMethod TEXT DEFAULT 'CASH',
        paymentSource TEXT DEFAULT 'CASH',
        category TEXT NOT NULL,
        creatorName TEXT DEFAULT 'Quản trị viên',
        receiptPhoto TEXT,
        note TEXT,
        branchId TEXT DEFAULT 'cs1',
        shiftId TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Create BranchInventory table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BranchInventory (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        branchId TEXT NOT NULL,
        stock REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(productId, branchId)
      );
    `);

    // 11. Create InventoryItem table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryItem (
        id TEXT PRIMARY KEY,
        code TEXT DEFAULT 'VT-01',
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        category TEXT DEFAULT 'Thịt gà & Phụ phẩm tươi',
        branchId TEXT DEFAULT 'bep-tong',
        currentQuantity REAL NOT NULL,
        minQuantity REAL NOT NULL,
        costPerUnit REAL NOT NULL,
        supplier TEXT NOT NULL,
        hotline TEXT DEFAULT '0988.888.999',
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Create InventoryTransaction table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryTransaction (
        id TEXT PRIMARY KEY,
        itemId TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        note TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Create InventoryReceipt & Item if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryReceipt (
        id TEXT PRIMARY KEY,
        receiptCode TEXT UNIQUE NOT NULL,
        branchId TEXT DEFAULT 'cs1',
        supplierName TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        paymentMethod TEXT DEFAULT 'CASH',
        paymentStatus TEXT DEFAULT 'PAID',
        creatorName TEXT DEFAULT 'Quản lý kho',
        notes TEXT,
        receivedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryReceiptItem (
        id TEXT PRIMARY KEY,
        receiptId TEXT NOT NULL,
        productId TEXT,
        productName TEXT NOT NULL,
        unit TEXT DEFAULT 'Con',
        batchCode TEXT,
        expiryDate DATETIME,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        subtotal REAL NOT NULL
      );
    `);

    // 14. Create InventoryExport & Item if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryExport (
        id TEXT PRIMARY KEY,
        exportCode TEXT UNIQUE NOT NULL,
        branchId TEXT DEFAULT 'cs1',
        reasonCategory TEXT DEFAULT 'PROCESSING',
        targetBranchId TEXT,
        totalItems INTEGER DEFAULT 0,
        totalValue REAL DEFAULT 0,
        creatorName TEXT DEFAULT 'Quản lý kho',
        notes TEXT,
        exportedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS InventoryExportItem (
        id TEXT PRIMARY KEY,
        exportId TEXT NOT NULL,
        productId TEXT,
        productName TEXT NOT NULL,
        unit TEXT DEFAULT 'Con',
        batchCode TEXT,
        quantity REAL NOT NULL,
        unitCost REAL NOT NULL,
        subtotal REAL NOT NULL
      );
    `);

    // 15. Create Staff table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'Thu ngân',
        status TEXT DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 16. Create Customer table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Customer (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        address TEXT,
        totalOrders INTEGER DEFAULT 0,
        totalSpent REAL DEFAULT 0,
        lastOrderAt DATETIME,
        branchId TEXT DEFAULT 'cs1',
        tasteNotes TEXT,
        favoriteDish TEXT,
        lastContactedAt DATETIME,
        contactCount INTEGER DEFAULT 0,
        reorderNotes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 17. Create Setting table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Setting (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        "group" TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 18. Create Attendance table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Attendance (
        id TEXT PRIMARY KEY,
        staffId TEXT NOT NULL,
        staffName TEXT NOT NULL,
        branchId TEXT NOT NULL,
        branchName TEXT NOT NULL,
        date TEXT NOT NULL,
        checkInTime DATETIME,
        checkInPhoto TEXT,
        checkOutTime DATETIME,
        checkOutPhoto TEXT,
        totalHours REAL,
        status TEXT DEFAULT 'ON_TIME',
        logType TEXT DEFAULT 'CAMERA_POS',
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 19. Create AIKnowledge table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS AIKnowledge (
        id TEXT PRIMARY KEY,
        category TEXT DEFAULT 'GENERAL',
        question TEXT,
        answer TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        priority INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 20. Create PaymentConfig table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PaymentConfig (
        id TEXT PRIMARY KEY,
        branchId TEXT UNIQUE NOT NULL,
        bankId TEXT DEFAULT 'MB',
        bankName TEXT DEFAULT 'MBBank',
        accountNumber TEXT DEFAULT '',
        accountName TEXT DEFAULT '',
        qrTemplate TEXT DEFAULT 'compact2',
        transferSyntax TEXT DEFAULT 'GUM [Mã_Đơn]',
        note TEXT DEFAULT 'Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt đơn.',
        web2mToken TEXT,
        web2mPassword TEXT,
        isAutoConfirm BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 21. Check if admin user exists, auto-insert if missing
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
      console.log("-> Admin user verified/created successfully!");
    }
  } catch (err: any) {
    console.warn("Notice in ensureDbInitialized:", err.message);
  } finally {
    isInitializing = false;
  }
}

export default prisma;
