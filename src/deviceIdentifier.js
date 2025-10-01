import os from "os";
import crypto from "crypto";

export function getDeviceId() {
  const interfaces = os.networkInterfaces();

  let macAddress = null;
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const config of iface) {
      if (!config.internal && config.mac && config.mac !== "00:00:00:00:00:00") {
        macAddress = config.mac;
        break;
      }
    }
    if (macAddress) break;
  }

  if (!macAddress) {
    macAddress = os.hostname();
  }

  const deviceId = crypto
    .createHash("sha256")
    .update(macAddress + os.hostname())
    .digest("hex");

  return { deviceId, macAddress };
}

const { deviceId, macAddress } = getDeviceId();
console.log("Generated Device ID:", deviceId);
console.log("MAC Address:", macAddress);
