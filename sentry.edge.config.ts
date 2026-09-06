import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES ?? 0.05),
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  });
}
