/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the app directory for Next.js 13+
  experimental: {
    // Enable any experimental features if needed
  },
  
  // Configure turbopack root to avoid warnings
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      '@': './',
    },
  },
  
  // Environment variables
  env: {
    // Add any client-side environment variables here if needed
  },
  
  // Ensure HMR is properly configured
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
