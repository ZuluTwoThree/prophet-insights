import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
};

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  oauthLogin: (provider: "github" | "google") => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseError = (payload: unknown) =>
  typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Request failed.";

const requestJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, { ...init, credentials: "include" });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(parseError(errorPayload));
  }
  return response.json() as Promise<T>;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await requestJson<{ user: AuthUser | null }>("/api/auth/session");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const data = await requestJson<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Login failed." };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<AuthResult> => {
      try {
        const data = await requestJson<{ user: AuthUser }>("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        setUser(data.user);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Registration failed." };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const oauthLogin = useCallback((provider: "github" | "google") => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      oauthLogin,
    }),
    [user, loading, login, register, logout, refresh, oauthLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
