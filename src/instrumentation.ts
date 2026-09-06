// Registered by Next.js on server startup — wires Sentry into the
// Node.js and Edge runtimes when the SDK is present.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Next.js calls this on any uncaught server-side error. Only forward
// to Sentry when a DSN is configured — otherwise this is a no-op.
export const onRequestError: NonNullable<
  typeof import("@sentry/nextjs").captureRequestError
> = async (err, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
