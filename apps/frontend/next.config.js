/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Allow images from any host (QR codes are generated client-side)
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
