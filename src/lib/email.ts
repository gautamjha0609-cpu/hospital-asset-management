// Minimal email abstraction. Two drivers:
//   EMAIL_DRIVER=resend  -> POST to Resend's HTTP API (needs RESEND_API_KEY)
//   EMAIL_DRIVER=console -> log the email to server console (dev / no-SMTP)
//
// Both drivers return a common { ok, error, delivered } result so callers
// can present a consistent UI. The console driver is the safe default —
// admin-initiated resets NEVER rely on email working (the admin API
// always returns the link so it can be copy-pasted / WhatsApped).

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailResult =
  | { ok: true; delivered: "resend" | "console" }
  | { ok: false; error: string };

const DRIVER = (process.env.EMAIL_DRIVER as "resend" | "console") ?? "console";
const FROM = process.env.EMAIL_FROM ?? "RBH Assets <onboarding@resend.dev>";

export async function sendEmail(msg: EmailPayload): Promise<EmailResult> {
  if (DRIVER === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return { ok: false, error: "RESEND_API_KEY not set" };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
      }
      return { ok: true, delivered: "resend" };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
  // Console driver
  console.log(
    "\n=== EMAIL (console driver — no SMTP configured) ===\n" +
      `To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n===\n`
  );
  return { ok: true, delivered: "console" };
}

export function isEmailConfigured() {
  return DRIVER === "resend" && !!process.env.RESEND_API_KEY;
}
