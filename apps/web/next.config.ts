import type { NextConfig } from 'next';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');

const nextConfig: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: repositoryRoot,
  },
};

export default nextConfig;
