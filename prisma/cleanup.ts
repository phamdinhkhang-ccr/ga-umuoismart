import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDemoData() {
  console.log("==========================================");
  console.log("-> Starting Operational Demo Data Cleanup");
  console.log("==========================================");

  try {
    // 1. Delete Order Items & Orders
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`-> Deleted ${deletedOrderItems.count} OrderItems.`);

    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`-> Deleted ${deletedOrders.count} Orders.`);

    // 2. Delete Expenses
    const deletedExpenses = await prisma.expense.deleteMany({});
    console.log(`-> Deleted ${deletedExpenses.count} Expenses.`);

    // 3. Delete Shifts
    const deletedShifts = await prisma.shift.deleteMany({});
    console.log(`-> Deleted ${deletedShifts.count} Shifts.`);

    // 4. Delete Attendance records
    const deletedAttendance = await prisma.attendance.deleteMany({});
    console.log(`-> Deleted ${deletedAttendance.count} Attendance records.`);

    // 5. Delete Inventory Transactions, Receipts, Exports
    const deletedInvTx = await prisma.inventoryTransaction.deleteMany({});
    console.log(`-> Deleted ${deletedInvTx.count} InventoryTransactions.`);

    const deletedReceiptItems = await prisma.inventoryReceiptItem.deleteMany({});
    console.log(`-> Deleted ${deletedReceiptItems.count} InventoryReceiptItems.`);

    const deletedReceipts = await prisma.inventoryReceipt.deleteMany({});
    console.log(`-> Deleted ${deletedReceipts.count} InventoryReceipts.`);

    const deletedExportItems = await prisma.inventoryExportItem.deleteMany({});
    console.log(`-> Deleted ${deletedExportItems.count} InventoryExportItems.`);

    const deletedExports = await prisma.inventoryExport.deleteMany({});
    console.log(`-> Deleted ${deletedExports.count} InventoryExports.`);

    // 6. Delete Demo Customers
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`-> Deleted ${deletedCustomers.count} Demo Customers.`);

    console.log("==========================================");
    console.log("-> 🎉 DEMO DATA CLEANUP COMPLETED SUCCESSFULLY!");
    console.log("-> Preserved: Category, Product, Branch, User, Setting.");
    console.log("==========================================");
  } catch (err: any) {
    console.error("Cleanup error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDemoData();
