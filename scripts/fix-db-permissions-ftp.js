const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function fixDbPermissionsAndUpload() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  client.timeout = 180000;

  try {
    console.log("==========================================");
    console.log("-> Uploading dev.db & Setting CHMOD 777 Write Permissions");
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
    try {
      await client.remove(".in.dev.db.");
    } catch (_) {}
    try {
      await client.remove("dev.db");
    } catch (_) {}
    await client.uploadFrom(localDbPath, "dev.db");

    console.log("-> 2. Uploading dev.db & schema.prisma to public_html/prisma...");
    await client.ensureDir("prisma");
    try {
      await client.remove(".in.dev.db.");
    } catch (_) {}
    try {
      await client.remove(".in.schema.prisma.");
    } catch (_) {}
    await client.uploadFrom(localDbPath, "dev.db");
    await client.uploadFrom(localSchemaPath, "schema.prisma");

    console.log("-> 3. Granting CHMOD 777 write permissions for SQLite lock files...");
    try {
      try {
        await client.cd("/domains/gaumuoismart.io/public_html");
      } catch (e) {
        await client.cd("/public_html");
      }

      // Grant write permissions on root directory, prisma directory, and dev.db files
      await client.send("SITE CHMOD 777 .");
      await client.send("SITE CHMOD 777 dev.db");
      await client.send("SITE CHMOD 777 prisma");
      await client.send("SITE CHMOD 777 prisma/dev.db");
      await client.send("SITE CHMOD 644 prisma/schema.prisma");
      console.log("-> CHMOD 777 write permissions granted successfully!");
    } catch (chmodErr) {
      console.warn("-> Notice on CHMOD 777:", chmodErr.message);
    }

    console.log("==========================================");
    console.log("-> 🎉 UPLOAD DATABASE & GRANT WRITE PERMISSIONS (777) HOÀN TẤT!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Fix DB Permissions Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

fixDbPermissionsAndUpload();
