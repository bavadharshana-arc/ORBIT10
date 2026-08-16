import nodemailer from "nodemailer";

/* ============================================================
   EMAIL SERVICE (Phase 19 Frontend Integration follow-up — Real
   Password Reset Email)

   A small provider abstraction so ORBIT can send a real email in
   production without hardcoding any specific vendor. Everything is
   configured through environment variables — nothing here reads a
   provider-specific API key format or bakes in a vendor SDK beyond the
   generic SMTP protocol every major transactional-email provider
   (SES, Postmark, SendGrid, Mailgun, Gmail, a self-hosted relay, …)
   already speaks, so swapping providers is an env-var change, not a
   code change.

   - EMAIL_SMTP_HOST / EMAIL_SMTP_PORT / EMAIL_SMTP_SECURE /
     EMAIL_SMTP_USER / EMAIL_SMTP_PASSWORD / EMAIL_FROM configure the
     real SmtpEmailProvider.
   - When EMAIL_SMTP_HOST isn't set, ORBIT falls back to
     ConsoleEmailProvider (development-safe: logs the email instead of
     sending, same "no email infra required to run locally" property
     the previous devResetToken-only flow had). This fallback is not
     used when EMAIL_SMTP_HOST *is* set, in development or production —
     if it's configured, it's used.
============================================================ */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Development-safe fallback — logs instead of sending. Used whenever no real provider is configured (see getEmailProvider below). */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `[email.service] No EMAIL_SMTP_HOST configured — logging email instead of sending.\n` +
        `  To: ${message.to}\n  Subject: ${message.subject}\n  Body:\n${message.text}`,
    );
  }
}

/** Real delivery via SMTP — works with any provider that exposes an SMTP endpoint (see this file's doc comment). */
class SmtpEmailProvider implements EmailProvider {
  private transporter: ReturnType<typeof nodemailer.createTransport>;
  private from: string;

  constructor(config: { host: string; port: number; secure: boolean; user: string | undefined; password: string | undefined; from: string }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
    this.from = config.from;
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

let cachedProvider: EmailProvider | null = null;

/**
 * Resolves the active email provider from environment variables, cached
 * for the process lifetime (a fresh SMTP transport per email would be
 * wasteful). Call resetEmailProviderCache() after changing env vars
 * mid-process (tests only — normal operation never does this).
 */
export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const host = process.env.EMAIL_SMTP_HOST;
  if (!host) {
    cachedProvider = new ConsoleEmailProvider();
    return cachedProvider;
  }

  cachedProvider = new SmtpEmailProvider({
    host,
    port: Number(process.env.EMAIL_SMTP_PORT ?? 587),
    secure: process.env.EMAIL_SMTP_SECURE === "true",
    user: process.env.EMAIL_SMTP_USER,
    password: process.env.EMAIL_SMTP_PASSWORD,
    from: process.env.EMAIL_FROM ?? "ORBIT <no-reply@orbit.local>",
  });
  return cachedProvider;
}

/** Test-only escape hatch — lets a test flip EMAIL_SMTP_HOST and re-resolve the provider instead of reusing whatever the process started with. */
export function resetEmailProviderCache(): void {
  cachedProvider = null;
}

/** Whether a real (non-console-fallback) provider is configured — auth.controller.ts uses this to decide whether the dev-only devResetToken fallback is still needed. */
export function isRealEmailProviderConfigured(): boolean {
  return Boolean(process.env.EMAIL_SMTP_HOST);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const provider = getEmailProvider();
  await provider.send({
    to,
    subject: "Reset your ORBIT password",
    text: `We received a request to reset your ORBIT password. Use the link below within the next hour to choose a new one:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    html: `<p>We received a request to reset your ORBIT password. Use the link below within the next hour to choose a new one:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
  });
}
