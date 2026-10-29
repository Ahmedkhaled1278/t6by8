import type { NextConfig } from 'next';

const isMobileExport = process.env.MOBILE_BUILD === '1';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isMobileExport
    ? {
        output: 'export' as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
