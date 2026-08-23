import type { Request, Response } from "express";
import { createUser, loginUser, requestPasswordReset, resetPasswordWithToken } from "../services/user.service";
import { sendPasswordResetEmail, isRealEmailProviderConfigured } from "../services/email.service";
import { signToken } from "../utils/jwt";
import { isDbUnreachableError, logError } from "../lib/logger";

const MIN_PASSWORD_LENGTH = 8;

/** Where the frontend lives — used to build the link a reset email points at. Configurable so a deployment's real domain never has to be hardcoded. */
const getFrontendUrl = (): string => process.env.FRONTEND_URL ?? "http://localhost:5173";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  try {
    const user = await createUser(name, email, password);

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      return res.status(409).json({ error: error.message });
    }

    logError("auth.register", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await loginUser(email, password);
    const token = signToken(user.id);

    return res.status(200).json({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid email or password") {
      return res.status(401).json({ error: error.message });
    }

    logError("auth.login", error);

    // A database-connectivity failure isn't a bad password and isn't an
    // unexpected server bug either — it's a dependency that's temporarily
    // down. 503 says so honestly (and distinctly from a generic 500)
    // without leaking any connection detail to the client.
    if (isDbUnreachableError(error)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Please try again in a moment." });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/auth/forgot-password — starts a password reset and, when a
 * real email provider is configured (see services/email.service.ts),
 * sends the reset link to it for real.
 *
 * Phase 19 Frontend Integration follow-up (Real Password Reset Email):
 * production readiness now only depends on setting EMAIL_SMTP_HOST (and
 * friends — see server/README.md) — no code change is needed to go from
 * "no email configured" to "sends a real email." When no provider is
 * configured (e.g. a fresh local checkout with nothing set), ORBIT falls
 * back to the same development-safe behavior as before: outside
 * production, the raw token is returned directly in the response (and
 * logged server-side) in place of an emailed link, so the reset flow
 * stays fully testable end to end without standing up a mailbox. That
 * fallback token is *never* included once a real provider is configured
 * (the email is the real channel then) and *never* included in
 * production regardless (NODE_ENV=production) — a deployment can never
 * accidentally ship a page that hands out a working reset token to
 * anyone who knows an email address.
 *
 * The response is identical whether or not the email is registered
 * (aside from the dev-only token, which is simply absent for an unknown
 * email) so this endpoint can't be used to enumerate registered emails.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body ?? {};

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "email is required" });
  }

  const trimmedEmail = email.trim();

  try {
    const token = await requestPasswordReset(trimmedEmail);
    const isProduction = process.env.NODE_ENV === "production";
    const hasRealProvider = isRealEmailProviderConfigured();

    if (token) {
      const resetUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

      if (hasRealProvider) {
        try {
          await sendPasswordResetEmail(trimmedEmail, resetUrl);
        } catch (sendError) {
          // The token is still valid even if delivery failed — surfacing
          // this as a request failure would both leak "this email exists"
          // and strand the user with no dev fallback (a real provider is
          // configured, so devResetToken stays withheld below either way).
          // Ops should watch for this log rather than the caller seeing it.
          console.error("[auth.forgotPassword] Failed to send reset email:", sendError);
        }
      } else if (!isProduction) {
        console.log(`[auth.forgotPassword] Reset token for ${trimmedEmail}: ${token}`);
      }
    }

    return res.status(200).json({
      message: "If that email is registered, a password reset is now available.",
      ...(token && !isProduction && !hasRealProvider ? { devResetToken: token } : {}),
    });
  } catch (error) {
    logError("auth.forgotPassword", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body ?? {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  try {
    await resetPasswordWithToken(token, password);
    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired reset token") {
      return res.status(400).json({ error: error.message });
    }

    logError("auth.resetPassword", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
