import { randomBytes, createHash } from "crypto";

/**
 * Phase 19 Frontend Integration audit fix (Priority 2) — password reset
 * tokens. This project has no email infrastructure (see
 * auth.controller.ts's forgotPassword doc comment), so unlike a typical
 * "email a link" flow, the raw token is only ever handed back once, in
 * the forgot-password response itself. Only its SHA-256 hash is ever
 * persisted (mirrors bcrypt-hashed passwords never being stored raw) —
 * a leaked database row can't be used to reset the account it belongs
 * to, and a leaked raw token can't be reversed back into the stored hash.
 */
export const generateResetToken = (): string => randomBytes(32).toString("hex");

export const hashResetToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
