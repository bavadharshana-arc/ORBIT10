/** Workspace-wide access level for the signed-in user. Mirrors data/teamData.ts's
 *  MemberRole vocabulary but stays decoupled from it — auth doesn't depend on the
 *  team roster data layer. Gated by lib/permissions.ts, not compared directly. */
export type AuthRole = "Owner" | "Admin" | "Project Manager" | "Member" | "Viewer";

/** The signed-in user. Mocked locally until real backend auth is wired up. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: AuthRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** True once a mock login has set `user`. */
  isAuthenticated: boolean;
  /** Convenience mirror of `user?.role` — null when signed out. */
  role: AuthRole | null;
  /** Mock sign-in — accepts any credentials and authenticates as the mock user. */
  login: (email: string, password: string) => void;
  /** Mock account creation — builds a user from the given name/email and signs them in. */
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
}
