import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() {
    // Required by FHEVM 
    return Promise.resolve([
      {
        source: '/',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]);
  }, 
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
