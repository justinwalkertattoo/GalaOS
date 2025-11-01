/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@galaos/types'],
  output: 'standalone',
};

module.exports = nextConfig;
