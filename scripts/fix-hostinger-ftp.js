const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

function copyFileSync(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeMapFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removeMapFiles(fullPath);
    } else if (entry.name.endsWith(".map")) {
      fs.unlinkSync(fullPath);
    }
  }
}

async function chmodRecursive(client, remotePath) {
  try {
    const list = await client.list(remotePath);
    for (const item of list) {
      const itemPath = remotePath === "." ? item.name : `${remotePath}/${item.name}`;
      if (item.isDirectory) {
        try {
          await client.send(`SITE CHMOD 755 ${itemPath}`);
        } catch (e) {}
        await chmodRecursive(client, itemPath);
      } else {
        try {
          await client.send(`SITE CHMOD 644 ${itemPath}`);
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn(`-> Notice setting chmod for ${remotePath}: ${err.message}`);
  }
}

async function fixAndDeploy() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  client.timeout = 300000;

  try {
    console.log("==========================================");
    console.log("-> Starting Full Fix & Deploy to Hostinger");
    console.log("-> Host: 45.130.228.25:21");
    console.log("-> User: u692070809");
    console.log("==========================================");

    const rootDir = path.join(__dirname, "..");
    const standaloneDir = path.join(rootDir, ".next", "standalone");

    if (!fs.existsSync(standaloneDir)) {
      console.error("-> Error: .next/standalone folder not found. Please run npm run build first.");
      process.exit(1);
    }

    console.log("-> 1. Copying index.js and .htaccess into standalone build...");
    copyFileSync(path.join(rootDir, "index.js"), path.join(standaloneDir, "index.js"));
    copyFileSync(path.join(rootDir, ".htaccess"), path.join(standaloneDir, ".htaccess"));

    console.log("-> 2. Syncing .next/static and public assets into standalone...");
    copyDirSync(path.join(rootDir, ".next", "static"), path.join(standaloneDir, ".next", "static"));
    copyDirSync(path.join(rootDir, "public"), path.join(standaloneDir, "public"));

    console.log("-> 3. Stripping .map sourcemaps...");
    removeMapFiles(standaloneDir);

    console.log("-> 4. Connecting to FTP Hostinger...");
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
    console.log("-> Remote directory set to public_html for gaumuoismart.io");

    console.log("-> 5. Uploading standalone build, index.js, and .htaccess...");
    let retries = 3;
    while (retries > 0) {
      try {
        await client.uploadFromDir(standaloneDir);
        break;
      } catch (uploadErr) {
        retries--;
        console.warn(`-> Upload interrupted (${uploadErr.message}). Retrying... (${retries} attempts left)`);
        if (retries === 0) throw uploadErr;
        await new Promise((res) => setTimeout(res, 3000));
        await client.access({
          host: "45.130.228.25",
          port: 21,
          user: "u692070809",
          password: "Quocvietle2000@",
          secure: false
        });
        try {
          await client.cd(remoteTargetDir);
        } catch (e) {
          await client.cd("public_html");
        }
      }
    }

    console.log("-> 6. Setting CHMOD permissions (755 for dirs, 644 for files)...");
    try {
      await client.send("SITE CHMOD 755 .");
      await chmodRecursive(client, ".");
      console.log("-> CHMOD permissions set successfully!");
    } catch (chmodErr) {
      console.warn("-> Notice on CHMOD:", chmodErr.message);
    }

    console.log("==========================================");
    console.log("-> 🎉 DEPLOY & FIX 403 HOÀN TẤT CHO GAUMUOISMART.IO!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Fix & Deploy Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

fixAndDeploy();
