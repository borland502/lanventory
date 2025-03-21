/** @type {import('next').NextConfig} */

import { ChildProcess } from 'node:child_process';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3000"]
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "**",
      },
    ],
  },
  "webpack": (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false
      };
    }
    return config;
  }
};



export default nextConfig;
