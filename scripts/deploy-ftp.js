const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

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

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  client.timeout = 300000; // 5 minutes timeout

  try {
    console.log("==========================================");
    console.log("-> Starting Direct FTP Upload to Hostinger");
    console.log("-> Host: 45.130.228.25:21");
    console.log("-> User: u692070809");
    console.log("==========================================");

    const rootDir = path.join(__dirname, "..");
    const standaloneDir = path.join(rootDir, ".next", "standalone");
    let uploadSource = standaloneDir;

    if (fs.existsSync(standaloneDir)) {
      console.log("-> Preparing Next.js standalone production build...");
      const staticSrc = path.join(rootDir, ".next", "static");
      const staticDest = path.join(standaloneDir, ".next", "static");
      copyDirSync(staticSrc, staticDest);

      const publicSrc = path.join(rootDir, "public");
      const publicDest = path.join(standaloneDir, "public");
      copyDirSync(publicSrc, publicDest);

      console.log("-> Stripping .map files to minimize transfer size...");
      removeMapFiles(standaloneDir);
    } else {
      console.log("-> Using root directory as build fallback...");
      uploadSource = rootDir;
    }

    console.log("-> Connecting to FTP Hostinger server...");
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

    console.log(`-> Uploading files from ${uploadSource} directly to Hostinger public_html...`);
    
    let retries = 3;
    while (retries > 0) {
      try {
        await client.uploadFromDir(uploadSource);
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

    console.log("==========================================");
    console.log("-> 🎉 UPLOAD FTP HOÀN TẤT LÊN GAUMUOISMART.IO!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> FTP Deploy Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
