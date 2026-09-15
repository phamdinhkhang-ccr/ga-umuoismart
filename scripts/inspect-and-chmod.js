const ftp = require("basic-ftp");
const path = require("path");

async function inspectAndChmod() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  client.timeout = 180000;

  try {
    console.log("==========================================");
    console.log("-> FTP Inspection & CHMOD 777 for SQLite Database");
    console.log("-> Host: 45.130.228.25:21");
    console.log("==========================================");

    await client.access({
      host: "45.130.228.25",
      port: 21,
      user: "u692070809",
      password: "Quocvietle2000@",
      secure: false
    });
    console.log("-> FTP Hostinger connection successful!");

    const remoteTargetDir = "domains/gaumuoismart.io/public_html";
    let cwd = remoteTargetDir;
    try {
      await client.cd(remoteTargetDir);
    } catch (e) {
      await client.cd("public_html");
      cwd = "public_html";
    }
    console.log(`-> Remote directory confirmed at: ${cwd}`);

    console.log("\n--- Listing public_html root directory contents ---");
    const rootList = await client.list();
    rootList.forEach(item => {
      console.log(` [${item.isDirectory ? "DIR" : "FILE"}] ${item.name} (${item.size} bytes)`);
    });

    console.log("\n--- Checking prisma directory ---");
    try {
      const prismaList = await client.list("prisma");
      prismaList.forEach(item => {
        console.log(` [${item.isDirectory ? "DIR" : "FILE"}] prisma/${item.name} (${item.size} bytes)`);
      });
    } catch (e) {
      console.log("-> prisma directory not found or cannot list:", e.message);
    }

    console.log("\n--- Granting CHMOD 777 permissions ---");
    try {
      await client.send("SITE CHMOD 777 .");
      console.log(`-> CHMOD 777 granted to directory: ${cwd}`);
    } catch (e) { console.warn("Notice CHMOD root:", e.message); }

    try {
      await client.send("SITE CHMOD 777 dev.db");
      console.log(`-> CHMOD 777 granted to file: ${cwd}/dev.db`);
    } catch (e) { console.warn("Notice CHMOD dev.db:", e.message); }

    try {
      await client.send("SITE CHMOD 777 prisma");
      console.log(`-> CHMOD 777 granted to directory: ${cwd}/prisma`);
    } catch (e) { console.warn("Notice CHMOD prisma dir:", e.message); }

    try {
      await client.send("SITE CHMOD 777 prisma/dev.db");
      console.log(`-> CHMOD 777 granted to file: ${cwd}/prisma/dev.db`);
    } catch (e) { console.warn("Notice CHMOD prisma/dev.db:", e.message); }

    console.log("==========================================");
    console.log("-> 🎉 INSPECTION & CHMOD 777 COMPLETED!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Inspection Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

inspectAndChmod();
