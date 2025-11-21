/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable static exports if needed
  // output: 'export',
  // For Capacitor compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Handle CSS imports
  transpilePackages: ['@mui/material', '@mui/icons-material'],
};

module.exports = nextConfig;


