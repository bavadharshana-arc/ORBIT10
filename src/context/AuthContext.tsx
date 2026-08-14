import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { AuthContextValue, AuthUser } from "../types/auth";


const MOCK_USER: AuthUser = {
  id: "user-1",
  name: "Maya Chen",
  email: "maya.chen@orbit.dev",
  initials: "MC",
  // Owner, not Admin — this MOCK_USER is the identity workspaceData.ts's
  // resolveCurrentActor() and teamData.ts's resolveCurrentMemberRole()
  // now resolve *from* (they take this AuthUser/role as input, rather
  // than searching for "Maya Chen" themselves), so logging in should
  // grant at least what the app already lets a signed-out visitor do
  // (see permissions.ts's resolveEffectiveRole) rather than narrowing it.
  role: "Owner",
};

/**
 * Dev/test-only mock accounts covering every AuthRole lib/permissions.ts
 * defines (Phase 7 RBAC). Signing in on the Login page with one of these
 * exact emails (any password — mock auth doesn't check it) signs in as
 * that role instead of the default Owner, so each of the 5 roles can be
 * exercised without a real backend or a role picker in the UI. Any other
 * email keeps the pre-existing behavior and signs in as MOCK_USER
 * (Owner) — this doesn't change what "maya.chen@orbit.dev" or the demo
 * login button do.
 */
const MOCK_ROLE_ACCOUNTS: Record<string, AuthUser> = {
  "owner@orbit.dev": MOCK_USER,
  "admin@orbit.dev": {
    id: "user-admin",
    name: "Ari Admin",
    email: "admin@orbit.dev",
    initials: "AA",
    role: "Admin",
  },
  "pm@orbit.dev": {
    id: "user-pm",
    name: "Pat Manager",
    email: "pm@orbit.dev",
    initials: "PM",
    role: "Project Manager",
  },
  "member@orbit.dev": {
    id: "user-member",
    name: "Mo Member",
    email: "member@orbit.dev",
    initials: "MM",
    role: "Member",
  },
  "viewer@orbit.dev": {
    id: "user-viewer",
    name: "Vic Viewer",
    email: "viewer@orbit.dev",
    initials: "VV",
    role: "Viewer",
  },
};

/** Derives display initials from a full name, e.g. "Jordan Avery" -> "JA". */
function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return initials || "?";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  function login(email: string, _password: string) {
    const account = MOCK_ROLE_ACCOUNTS[email.trim().toLowerCase()];
    setUser(account ?? MOCK_USER);
  }

  function register(name: string, email: string, _password: string) {
    

    setUser({
      id: `user-${Date.now()}`,
      name,
      email,
      initials: getInitials(name),
      role: "Member",
    });
  }

  function logout() {
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
