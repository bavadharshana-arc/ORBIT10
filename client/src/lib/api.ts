/* ============================================================
   API CLIENT

   Phase 18: the first real network calls this frontend makes anywhere
   (every page before this ran on local/localStorage state — see the
   Phase 18 inspection report). Deliberately minimal — one fetch
   wrapper, not a data-fetching library. Phase 23 adds real
   login/register/logout on top of this (see AuthContext.tsx/authApi.ts).
============================================================ */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000/api";

/** Where the frontend stores the Bearer token. Phase 18–22 only ever read
 *  this (AuthContext was mock/local, so nothing wrote it). Phase 23 is the
 *  first to write/clear it, from AuthContext's real login/register/logout.
 *
 *  Deliberately sessionStorage, not localStorage: localStorage persists
 *  indefinitely across browser restarts, which was silently auto-restoring
 *  the signed-in user (and bouncing straight to /dashboard) on every
 *  reopen of the app. sessionStorage survives refreshes/navigation within
 *  the same tab session (so "stay logged in while using the app" still
 *  works) but is cleared when the browser/tab closes, so a fresh app
 *  session always lands on /login. */
const AUTH_TOKEN_KEY = "orbit-auth-token";

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Storage unavailable (e.g. private browsing) — the session simply
    // won't survive a refresh; nothing else to do here.
  }
}

export function clearAuthToken(): void {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // See setAuthToken — nothing to do if storage itself is unavailable.
  }
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // No/invalid JSON body (e.g. a network-level failure page) — fall
    // through to the generic status-based message below.
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
