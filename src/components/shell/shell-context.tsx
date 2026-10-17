"use client";

import { createContext, useContext } from "react";
import type { BranchId, Currency } from "@/lib/mock/dashboard";

export type ShellState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  branch: BranchId;
  setBranch: (branch: BranchId) => void;
  openDrawer: () => void;
};

export const ShellContext = createContext<ShellState | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
