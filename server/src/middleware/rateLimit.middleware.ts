import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

/**
 * Auth rate limiting (ORBIT Step 4 — Authentication Rate Limiting).
 *
 * Only /login and /forgot-password are limited here — the two endpoints
 * a credential-stuffing or reset-token-enumeration attempt would
 * actually hammer repeatedly. /register and /reset-password are
 * deliberately left unlimited (see the Step 4 inspection report this
 * middleware follows).
 *
 * Limits are configurable via environment variables, following the same
 * `process.env.X ?? <default>` convention already used elsewhere (see
 * email.service.ts, auth.controller.ts). `limit` is read as a function
 * evaluated per-request (express-rate-limit supports this) rather than
 * once at startup, so a test can lower it for its own process without
 * needing to control module-import order — mirrors email.service.ts's
 * process.env-at-call-time pattern (getEmailProvider/
 * isRealEmailProviderConfigured), just for a number instead of a host.
 *
 * Keyed by IP (express-rate-limit's default `keyGenerator`) — this
 * project has no per-account request identity before login succeeds, so
 * IP is the only signal available at this point in the request.
 */

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/** Generic 429 body — never mentions the endpoint, the email, or how many attempts remain, so it can't be used to distinguish a real account/token from a fake one. */
const sendTooManyAttempts = (_req: Request, res: Response): void => {
  res.status(429).json({ error: "Too many attempts. Please try again later." });
};

export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: () => Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: sendTooManyAttempts,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: () => Number(process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: sendTooManyAttempts,
});
