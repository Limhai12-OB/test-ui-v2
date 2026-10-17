"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildAdminState, type AdminState, type BranchRec, type ManagerRec } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";

/**
 * Client-side store for the MOCK branch, notification, integration and
 * settings data. Changes last for this browser tab (sessionStorage) and are
 * never sent anywhere: there is no backend in this project.
 */
type Store = { state: AdminState; update: (change: (draft: AdminState) => void) => void };
const AdminContext = createContext<Store | null>(null);
const VERSION = 1;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const role = user?.role ?? "owner";
  const key = `fs-admin-v${VERSION}-${role}`;
  const [state, setState] = useState<AdminState>(() => buildAdminState(role));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  if (loadedKey !== key) {
    let next = buildAdminState(role);
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) next = JSON.parse(stored) as AdminState;
      } catch {}
    }
    setState(next);
    setLoadedKey(key);
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  const update = useCallback((change: (draft: AdminState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      change(draft);
      return draft;
    });
  }, []);
  const value = useMemo(() => ({ state, update }), [state, update]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

/* ---------- Branch helpers ---------- */

/** Active manager running a branch, if any. */
export const branchManager = (state: AdminState, branchId: string) =>
  state.managers.find((m) => m.status === "active" && m.branchId === branchId) ?? null;

/** Invited manager who takes over a branch once they accept. */
export const pendingManager = (state: AdminState, branchId: string) =>
  state.managers.find((m) => m.status === "invited" && m.pendingBranchId === branchId) ?? null;

export const branchLabel = (branch: BranchRec) => (branch.main ? `${branch.name} (Main)` : branch.name);

export const branchName = (state: AdminState, id: string | null | undefined) => state.branches.find((b) => b.id === id)?.name ?? null;

export function firstName(name: string) {
  return name.split(" ")[0];
}

/** "Toul Kork", "Not assigned yet", "Kampot (deactivated)". */
export function managerBranchText(state: AdminState, m: ManagerRec) {
  const id = m.status === "invited" ? m.pendingBranchId : m.branchId;
  const branch = state.branches.find((b) => b.id === id);
  if (!branch) return "Not assigned yet";
  return branch.status === "deactivated" ? `${branch.name} (deactivated)` : branch.name;
}

/** Amount of time left on a Telegram link code, as "09:42". */
export function mmss(seconds: number) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
