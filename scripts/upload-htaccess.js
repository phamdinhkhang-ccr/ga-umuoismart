const ftp = require("basic-ftp");
const path = require("path");

async function uploadHtaccess() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  client.timeout = 60000;

  try {
    console.log("==========================================");
    console.log("-> Uploading .htaccess to Hostinger");
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
    try {
      await client.cd(remoteTargetDir);
    } catch (e) {
      await client.cd("public_html");
    }
    console.log("-> Remote directory set to public_html for gaumuoismart.io");

    const localHtaccessPath = path.join(__dirname, "../.htaccess");
    console.log("-> Uploading .htaccess file...");
    await client.uploadFrom(localHtaccessPath, ".htaccess");

    console.log("==========================================");
    console.log("-> 🎉 UPLOAD .HTACCESS HOÀN TẤT LÊN GAUMUOISMART.IO!");
    console.log("==========================================");
  } catch (err) {
    console.error("-> Upload .htaccess Error:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

uploadHtaccess();
