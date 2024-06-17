/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
      config.resolve.fallback.child_process = false
    }
    return config;
  }
};

export default nextConfig;
