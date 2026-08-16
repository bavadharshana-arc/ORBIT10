import { apiPost } from "./api";

/* ============================================================
   AUTH API (Phase 23)

   Mirrors server/src/controllers/auth.controller.ts's register/login
   response shapes exactly. login is the only one that returns a token
   — register does not (see server/src/controllers/auth.controller.ts),
   so AuthContext signs a freshly-registered account in with a follow-up
   login() call, matching the pre-Phase-23 "register creates the account
   and signs the user straight in" behavior.
============================================================ */

export interface RegisteredUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
}

export interface LoginResult extends RegisteredUser {
  token: string;
}

export function registerRequest(name: string, email: string, password: string): Promise<RegisteredUser> {
  return apiPost<RegisteredUser>("/auth/register", { name, email, password });
}

export function loginRequest(email: string, password: string): Promise<LoginResult> {
  return apiPost<LoginResult>("/auth/login", { email, password });
}

/* ============================================================
   PASSWORD RESET (Phase 19 Frontend Integration audit fix)

   Mirrors auth.controller.ts's forgotPassword/resetPassword response
   shapes. devResetToken is only ever present outside production (see
   the controller's doc comment for why — this project has no email
   infrastructure to deliver a real reset link through).
============================================================ */

export interface ForgotPasswordResult {
  message: string;
  devResetToken?: string;
}

export function forgotPasswordRequest(email: string): Promise<ForgotPasswordResult> {
  return apiPost<ForgotPasswordResult>("/auth/forgot-password", { email });
}

export function resetPasswordRequest(token: string, password: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/reset-password", { token, password });
}
