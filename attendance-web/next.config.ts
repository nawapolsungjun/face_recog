import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // อนุญาตให้เข้าถึงไฟล์โมเดลขนาดใหญ่
  serverExternalPackages: ['face-api.js'], 
};

export default nextConfig;