"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { daysBetween, TODAY } from "@/lib/format";
import { buildFinanceState } from "@/lib/mock/finance-data";
import type { Bill, BillStatus, FinanceState, Recon, TillRecord } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

/**
 * Client-side store for the MOCK Banking and Financial Records data. Each role
 * gets its own copy so the Branch Manager sees the "before submit" moment and
 * the owner the "awaiting sign-off" moment from the Figma frames. Changes are
 * kept in sessionStorage for this browser tab only; nothing is sent anywhere.
 */
type Store = { state: FinanceState; update: (change: (draft: FinanceState) => void) => void; reset: () => void };

const FinanceContext = createContext<Store | null>(null);
const VERSION = 1;

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const role = user?.role ?? "owner";
  const key = `fs-finance-v${VERSION}-${role}-${user?.branch ?? "all"}`;
  const [state, setState] = useState<FinanceState>(() => buildFinanceState(role));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  if (loadedKey !== key) {
    // Role changed (sign out / sign in): start from that role's data.
    let next = buildFinanceState(role);
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) next = JSON.parse(stored) as FinanceState;
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

  const update = useCallback((change: (draft: FinanceState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      change(draft);
      return draft;
    });
  }, []);
  const reset = useCallback(() => setState(buildFinanceState(role)), [role]);
  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside <FinanceProvider>");
  return ctx;
}

/* ---------- Derived values ---------- */

export function billTotal(bill: Bill) {
  const subtotal = bill.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  // Round the tax to the cent first (half up), as on the supplier's invoice.
  const tax = Math.round(subtotal * bill.vatRate * 100 + 1e-6) / 100;
  return Math.round((subtotal + tax) * 100) / 100;
}

export function billSubtotal(bill: Bill) {
  return bill.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
}

export function billBalance(bill: Bill) {
  return Math.max(0, Math.round((billTotal(bill) - bill.paid) * 100) / 100);
}

export function billStatus(bill: Bill): BillStatus {
  if (bill.stored) return bill.stored;
  if (billBalance(bill) <= 0) return "paid";
  if (daysBetween(TODAY, bill.due) < 0) return "overdue";
  if (bill.paid > 0) return "partial";
  return "open";
}

export const BILL_STATUS: Record<BillStatus, { label: string; tone: "neutral" | "sky" | "warning" | "success" | "error" }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "sky" },
  partial: { label: "Partially Paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "error" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const REVIEW_STATUS: Record<"draft" | "submitted" | "returned" | "signed", { label: string; tone: "neutral" | "sky" | "warning" | "success" }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "sky" },
  returned: { label: "Returned", tone: "warning" },
  signed: { label: "Signed Off", tone: "success" },
};

export function tillVariance(till: TillRecord) {
  return {
    usd: till.usd === null ? 0 : Math.round((till.usd - till.expectedUsd) * 100) / 100,
    khr: till.khr === null ? 0 : till.khr - till.expectedKhr,
  };
}

/** Recon numbers: lines matched, difference still unexplained, LuyFlow balance. */
export function reconFigures(recon: Recon) {
  const todo = recon.lines.filter((line) => line.state === "todo");
  const excluded = recon.lines.filter((line) => line.state === "excluded").length;
  const missing = recon.lines.filter((line) => line.state === "todo" && line.kind === "missing");
  const difference = missing.reduce((sum, line) => sum + line.amount, 0);
  const matched = Math.min(recon.totalLines - todo.length - excluded, recon.autoMatched + recon.lines.filter((line) => line.state === "matched").length);
  return {
    todo: todo.length,
    suggested: todo.filter((line) => line.kind === "suggested").length,
    unmatched: todo.filter((line) => line.kind !== "suggested").length,
    excluded,
    matched,
    difference,
    luyflowBalance: recon.statementBalance - difference,
    resolved: recon.lines.filter((line) => line.state !== "todo"),
  };
}

export function accountName(state: FinanceState, id: string) {
  return state.accounts.find((account) => account.id === id)?.name ?? id;
}

export const USER_NAMES = { owner: "Sokha Chan", manager: "Dara Sok" };

/** "31 Oct 2026, 17:52" in the demo clock. */
export function stamp(time = "19:12") {
  return `31 Oct 2026, ${time}`;
}
