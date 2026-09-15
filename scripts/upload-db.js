const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function uploadDatabase() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  client.timeout = 180000;

  try {
    console.log("==========================================");
    console.log("-> Starting SQLite Database Upload to Hostinger");
    console.log("-> Host: 45.130.228.25:21");
    console.log("==========================================");

    const rootDir = path.join(__dirname, "..");
    const localDbPath = path.join(rootDir, "prisma", "dev.db");
    const localSchemaPath = path.join(rootDir, "prisma", "schema.prisma");

    if (!fs.existsSync(localDbPath)) {
      console.error("-> Error: prisma/dev.db missing!");
      process.exit(1);
    }

    console.log("-> Connecting to Hostinger FTP...");
    await client.access({
      host: "45.130.228.25",
      port: 21,
      user: "u692070809",
      password: "Quocvietle2000@",
      secure: false
    });
    console.log("-> FTP Hostinger connection successful!");

    const remoteTargetDir = "domains/gaumuoismart.io/public_html";
    try {
      await client.cd(remoteTargetDir);
    } catch (e) {
      await client.cd("public_html");
    }

    console.log("-> 1. Uploading dev.db to public_html root...");
    await client.uploadFrom(localDbPath, "dev.db");

    console.log("-> 2. Uploading dev.db & schema.prisma to public_html/prisma...");
    await client.ensureDir("prisma");
    await client.uploadFrom(localDbPath, "dev.db");
    await client.uploadFrom(localSchemaPath, "schema.prisma");

    console.log("-> 3. Setting CHMOD permissions (666/755) for dev.db...");
    try {
      try {
        await client.cd("/domains/gaumuoismart.io/public_html");
      } catch (e) {
        await client.cd("/public_html");
      }
      await client.send("SITE CHMOD 666 dev.db");
      await client.send("SITE CHMOD 755 prisma");
      await client.send("SITE CHMOD 666 prisma/dev.db");
      await client.send("SITE CHMOD 644 prisma/schema.prisma");
      console.log("-> CHMOD permissions for database set successfully!");
    } catch (chmodErr) {
      console.warn("-> Notice setting CHMOD for DB:", chmodErr.message);
    }

    console.log("==========================================");
    console.log("-> 🎉 UPLOAD DATABASE (dev.db) HOÀN TẤT LÊN GAUMUOISMART.IO!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Upload Database Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

uploadDatabase();
