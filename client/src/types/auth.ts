/** Workspace-wide access level for the signed-in user. Mirrors data/teamData.ts's
 *  MemberRole vocabulary but stays decoupled from it — auth doesn't depend on the
 *  team roster data layer. Gated by lib/permissions.ts, not compared directly.
 *  Deliberately decoupled from the backend too (see AuthContext.tsx) — the
 *  backend has no user-wide "role" column at all, only a per-workspace
 *  WorkspaceRole (OWNER/ADMIN/MEMBER) scoped to membership, a narrower and
 *  differently-shaped vocabulary than this one. */
export type AuthRole = "Owner" | "Admin" | "Project Manager" | "Member" | "Viewer";

/** The signed-in user. Phase 23: id/name/email/initials come from the real
 *  backend session (GET /api/auth/login, /api/users/me); `role` is still
 *  resolved locally (see AuthContext.tsx) since the backend has nothing
 *  equivalent to hand back. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: AuthRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** True once a real session (login, register, or a restored token) has set `user`. */
  isAuthenticated: boolean;
  /** True while a stored token is being validated against the backend on app startup — see AuthContext.tsx's session-restore effect. Route guards should wait for this before deciding to redirect. */
  isInitializing: boolean;
  /** Convenience mirror of `user?.role` — null when signed out. */
  role: AuthRole | null;
  /** Real sign-in — POSTs to /api/auth/login; throws ApiError on invalid credentials or a network failure. */
  login: (email: string, password: string) => Promise<void>;
  /** Real account creation — POSTs to /api/auth/register, then signs the new account in the same way login() does; throws ApiError (e.g. 409 on a taken email) or on a network failure. */
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
