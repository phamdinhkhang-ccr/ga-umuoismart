const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

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

async function uploadWithRetry(client, taskFn, maxRetries = 5) {
  let attempts = maxRetries;
  while (attempts > 0) {
    try {
      await taskFn();
      break;
    } catch (err) {
      attempts--;
      console.warn(`-> Upload interrupted (${err.message}). Retrying... (${attempts} attempts left)`);
      if (attempts === 0) throw err;
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await client.access({
          host: "45.130.228.25",
          port: 21,
          user: "u692070809",
          password: "Quocvietle2000@",
          secure: false
        });
      } catch (e) {}
    }
  }
}

async function uploadStaticAssets() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  client.timeout = 300000;

  try {
    console.log("==========================================");
    console.log("-> Starting Robust Static Assets FTP Upload to Hostinger");
    console.log("-> Host: 45.130.228.25:21");
    console.log("==========================================");

    const rootDir = path.join(__dirname, "..");
    const localStaticDir = path.join(rootDir, ".next", "static");
    const localPublicDir = path.join(rootDir, "public");
    const localHtaccess = path.join(rootDir, ".htaccess");

    if (!fs.existsSync(localStaticDir)) {
      console.error("-> Error: .next/static directory missing.");
      process.exit(1);
    }

    console.log("-> Stripping .map files from .next/static...");
    removeMapFiles(localStaticDir);

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

    console.log("-> 1. Uploading .htaccess...");
    await uploadWithRetry(client, async () => {
      try {
        await client.cd("/domains/gaumuoismart.io/public_html");
      } catch (e) {
        await client.cd("/public_html");
      }
      await client.uploadFrom(localHtaccess, ".htaccess");
    });

    console.log("-> 2. Uploading .next/static assets...");
    await uploadWithRetry(client, async () => {
      try {
        await client.cd("/domains/gaumuoismart.io/public_html");
      } catch (e) {
        await client.cd("/public_html");
      }
      await client.ensureDir(".next/static");
      await client.uploadFromDir(localStaticDir);
    });

    console.log("-> 3. Uploading public directory assets...");
    if (fs.existsSync(localPublicDir)) {
      await uploadWithRetry(client, async () => {
        try {
          await client.cd("/domains/gaumuoismart.io/public_html");
        } catch (e) {
          await client.cd("/public_html");
        }
        await client.ensureDir("public");
        await client.uploadFromDir(localPublicDir);
      });
    }

    console.log("-> 4. Setting CHMOD permissions (755 for dirs, 644 for files)...");
    try {
      try {
        await client.cd("/domains/gaumuoismart.io/public_html");
      } catch (e) {
        await client.cd("/public_html");
      }
      await client.send("SITE CHMOD 755 .next");
      await client.send("SITE CHMOD 755 .next/static");
      await chmodRecursive(client, ".next/static");
      await client.send("SITE CHMOD 755 public");
      await chmodRecursive(client, "public");
      await client.send("SITE CHMOD 644 .htaccess");
      console.log("-> CHMOD permissions set successfully!");
    } catch (chmodErr) {
      console.warn("-> Notice setting CHMOD:", chmodErr.message);
    }

    console.log("==========================================");
    console.log("-> 🎉 UPLOAD STATIC ASSETS & .HTACCESS HOÀN TẤT LÊN GAUMUOISMART.IO!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Upload Static Assets Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

uploadStaticAssets();
