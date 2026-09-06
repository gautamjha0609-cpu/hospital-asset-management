import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Register instrumentation.ts (Sentry hook).
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Only apply the Sentry build plugin when a project is configured;
// otherwise it can noisily warn about missing DSN at build time.
const sentryOrgOrProject =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN;

const config = sentryOrgOrProject
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;

export default config;
