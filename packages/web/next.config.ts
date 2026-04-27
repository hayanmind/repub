import type { NextConfig } from "next";
import path from "node:path";

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        basePath: '/repub',
        images: { unoptimized: true },
      }
    : {
        // Vercel / local dev settings
        outputFileTracingRoot: path.join(__dirname, '../../'),
        serverExternalPackages: ['@gov-epub/core'],
      }),
};

export default nextConfig;
