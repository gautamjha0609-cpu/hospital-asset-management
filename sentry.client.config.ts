// Client-side Sentry init. Truly no-op when NEXT_PUBLIC_SENTRY_DSN is
// unset, so free-tier deploys without a Sentry account pay no cost.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    // Session replay is off by default — hospital screens may show PHI
    // and we don't want to record it. Turn on manually if you review the
    // privacy implications for your deployment.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES ?? 0.05),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
    // Scrub common PII fields defensively.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });
}
