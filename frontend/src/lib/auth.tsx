"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { apiFetch } from "./api";

type AuthCtx = {
  /** Whether the user currently has a valid session (httpOnly cookie). */
  authed: boolean;
  /** True once the initial session check has completed. */
  ready: boolean;
  /** Re-check the session against the backend (used after login/signup). */
  refreshAuth: () => Promise<void>;
  /** Optimistically mark the session as authenticated. */
  setAuthed: (v: boolean) => void;
  /** Clear the session (revokes refresh token server-side). */
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      // Cookies are sent automatically; a 401 will trigger a silent refresh
      // inside apiFetch, so reaching here means we have a valid session.
      await apiFetch("/users/me");
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore — we clear local state regardless
    }
    setAuthed(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authed, ready, refreshAuth, setAuthed, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
