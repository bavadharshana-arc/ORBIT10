import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthContextValue, AuthRole, AuthUser } from "../types/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "../lib/api";
import { loginRequest, registerRequest, type LoginResult, type RegisteredUser } from "../lib/authApi";
import { getMyProfile } from "../lib/userApi";


const DEMO_ROLE_BY_EMAIL: Record<string, AuthRole> = {
  "owner@orbit.dev": "Owner",
  "admin@orbit.dev": "Admin",
  "pm@orbit.dev": "Project Manager",
  "member@orbit.dev": "Member",
  "viewer@orbit.dev": "Viewer",
};

function resolveRole(email: string): AuthRole {
  return DEMO_ROLE_BY_EMAIL[email.trim().toLowerCase()] ?? "Owner";
}

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

function toAuthUser(account: RegisteredUser): AuthUser {
  const name = account.name ?? account.email;
  return {
    id: account.id,
    name,
    email: account.email,
    initials: getInitials(name),
    role: resolveRole(account.email),
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();

    (token ? getMyProfile() : Promise.resolve(null))
      .then((profile) => {
        if (cancelled || !profile) return;
        setUser(toAuthUser(profile));
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const result: LoginResult = await loginRequest(email, password);
    setAuthToken(result.token);
    setUser(toAuthUser(result));
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    await registerRequest(name, email, password);
    
    await login(email, password);
  }

  function logout() {
    clearAuthToken();
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isInitializing,
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
