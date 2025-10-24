/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@galaos/types'],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
