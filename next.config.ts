import type { NextConfig } from "next";
import os from "os";

const localIps: string[] = [];
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  for (const net of interfaces[name] || []) {
    if (net.family === "IPv4" && !net.internal) {
      localIps.push(net.address);
      localIps.push(`${net.address}:3000`);
    }
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.18.11',
    '192.168.18.11:3000',
    '192.168.33.130',
    '192.168.33.130:3000',
    '*.lhr.life',
    '*.loca.lt',
    'localhost:3000',
    ...localIps,
  ],
};

export default nextConfig;
