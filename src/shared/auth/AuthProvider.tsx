import React from "react";
import { api, getAuthToken, resolveApiUrl, setAuthToken, setUnauthorizedHandler } from "../api/client";
import { ToastContainerContext } from "../ui/ToastContainer";

type Role = "user" | "admin";

interface AuthUser {
  username: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
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

  React.useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  async function login(username: string, password: string) {
    const res = await fetch(resolveApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const details = data?.fieldErrors || undefined;
      const msg = data?.message || "Не удалось выполнить вход";
      throw { message: msg, fieldErrors: details } as any;
    }
    setAuthToken(data.token);
    setUser(data.user);
  }

  async function register(username: string, password: string) {
    const res = await fetch(resolveApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const details = data?.fieldErrors || undefined;
      const msg = data?.message || "Не удалось зарегистрироваться";
      throw { message: msg, fieldErrors: details } as any;
    }
    setAuthToken(data.token);
    setUser(data.user);
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
    if (!getAuthToken()) {
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const res = await api.get<{ user: AuthUser }>("/api/auth/me");
        if (!cancelled) {
          setUser(res?.user ?? null);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const value: AuthContextValue = React.useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  }), [user, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
