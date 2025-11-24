import React from "react";
import { api, getAuthToken, setAuthToken, setUnauthorizedHandler } from "../api/client";
import { ToastContainerContext } from "../ui/ToastContainer";

type Role = "user" | "admin";

interface AuthUser {
  username: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AUTH_KEY = "menu-constructor-auth";

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const toast = React.useContext(ToastContainerContext);
  const [user, setUser] = React.useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? (JSON.parse(saved) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = React.useState<boolean>(() => {
    // if we already have a user saved, we can treat auth as ready immediately
    return Boolean(user) || !getAuthToken();
  });

  React.useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  async function login(username: string, password: string) {
    const data = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", { username, password });
    setAuthToken(data?.token || null);
    setUser(data?.user || null);
  }

  async function register(username: string, password: string) {
    const data = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", { username, password });
    setAuthToken(data?.token || null);
    setUser(data?.user || null);
  }

  const logout = React.useCallback(() => {
    setUser(null);
    setAuthToken(null);
  }, []);

  React.useEffect(() => {
    const handler = (status: number) => {
      logout();
      if (status === 401) {
        toast?.notify("Сессия завершена, авторизуйтесь снова", "warning", 4000);
      } else {
        toast?.notify("Нет доступа, авторизуйтесь", "error", 4000);
      }
    };
    setUnauthorizedHandler(handler);
    return () => setUnauthorizedHandler(null);
  }, [logout, toast]);

  React.useEffect(() => {
    if (!getAuthToken() && user) {
      logout();
    }
  }, [user, logout]);

  React.useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }
    // If we already have a user, we can consider auth ready without hitting the API
    if (user) {
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }

    setIsReady(false);
    (async () => {
      try {
        const res = await api.get<{ user: AuthUser }>("/api/auth/me");
        if (!cancelled) {
          setUser(res?.user ?? null);
        }
      } catch (err: any) {
        // Only force logout on explicit auth failures; keep session if server is temporarily unavailable
        if (!cancelled && err?.status === 401) {
          logout();
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logout, user]);

  const value: AuthContextValue = React.useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isReady,
    login,
    register,
    logout,
  }), [user, isReady, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
