"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Role = "owner" | "manager";

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  businessName: string;
  /** Branch a Branch Manager is limited to. Owners see all branches. */
  branch?: string;
  /** True for a newly created business that has no data yet (frame 05.5). */
  firstRun?: boolean;
};

type SessionContextValue = {
  user: SessionUser | null;
  /** False until the stored session has been read on the client. */
  ready: boolean;
  signIn: (user: SessionUser, remember?: boolean) => void;
  signOut: () => void;
};

const STORAGE_KEY = "fs-session";
const SessionContext = createContext<SessionContextValue | null>(null);

function readStored(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

/**
 * Client-side demo session. It only remembers who signed in through the mock
 * auth service; it is not a security boundary.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Storage is only available after hydration, so this sync has to run in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readStored());
    setReady(true);
  }, []);

  const signIn = useCallback((next: SessionUser, remember = true) => {
    setUser(next);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); the session then lasts for this page only.
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
