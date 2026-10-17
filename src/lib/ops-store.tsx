"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { daysBetween, TODAY } from "@/lib/format";
import { buildOpsState, docTotal } from "@/lib/mock/ops-data";
import type { BranchName, DocLine, Invoice, Item, OpsState, Planned, StockMove } from "@/lib/mock/ops-types";
import { useSession } from "@/lib/session";

/**
 * Client-side store for the MOCK inventory and sales data. One dataset is
 * shared by both roles; Branch Manager screens filter it to their branch.
 * Changes last for this browser tab (sessionStorage) and are never sent.
 */
type Store = { state: OpsState; update: (change: (draft: OpsState) => void) => void };
const OpsContext = createContext<Store | null>(null);
const VERSION = 1;

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const key = `fs-ops-v${VERSION}-${user?.role ?? "owner"}`;
  const [state, setState] = useState<OpsState>(() => buildOpsState());
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  if (loadedKey !== key) {
    let next = buildOpsState();
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) next = JSON.parse(stored) as OpsState;
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

  const update = useCallback((change: (draft: OpsState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      change(draft);
      return draft;
    });
  }, []);
  const value = useMemo(() => ({ state, update }), [state, update]);
  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used inside <OpsProvider>");
  return ctx;
}

/** Branch the current user is limited to, or null for the Business Owner. */
export function useBranchScope(): BranchName | null {
  const { user } = useSession();
  return user?.role === "manager" ? ((user.branch as BranchName) ?? "Toul Kork") : null;
}

/* ---------- Items ---------- */

export const totalStock = (item: Item, branch?: BranchName | null) =>
  branch ? item.stock[branch] ?? 0 : Object.values(item.stock).reduce((s, n) => s + (n ?? 0), 0);

export type StockLevel = "in" | "low" | "out";
export function branchLevel(item: Item, branch: BranchName): StockLevel | null {
  const qty = item.stock[branch];
  if (qty === undefined) return null;
  if (qty <= 0) return "out";
  if (qty < (item.min[branch] ?? 0)) return "low";
  return "in";
}

/** "Low at 2 branches", "Out at 1 branch", "In Stock" (08.1). */
export function stockSummary(item: Item, branch?: BranchName | null): { label: string; tone: "success" | "warning" | "error" | "neutral" } {
  if (!item.active) return { label: "—", tone: "neutral" };
  if (branch) {
    const level = branchLevel(item, branch);
    return level === "out" ? { label: "Out of Stock", tone: "error" } : level === "low" ? { label: "Low Stock", tone: "warning" } : { label: "In Stock", tone: "success" };
  }
  const branches = Object.keys(item.stock) as BranchName[];
  const out = branches.filter((b) => branchLevel(item, b) === "out").length;
  const low = branches.filter((b) => branchLevel(item, b) === "low").length;
  if (out) return { label: `Out at ${out} branch${out === 1 ? "" : "es"}`, tone: "error" };
  if (low) return { label: `Low at ${low} branch${low === 1 ? "" : "es"}`, tone: "warning" };
  return { label: "In Stock", tone: "success" };
}

/** "case" → "cases", "box" → "boxes". */
export const plural = (unit: string) => (/(x|s|sh|ch)$/.test(unit) ? `${unit}es` : `${unit}s`);
export const unitLabel = (item: Item, qty: number) => `${qty} ${qty === 1 ? item.unit : plural(item.unit)}`;

/* ---------- Invoices ---------- */

export type InvoiceStatus = "draft" | "sent" | "partial" | "overdue" | "paid" | "cancelled";

export const invoiceTotal = (inv: Invoice) => docTotal(inv.lines);
export const invoicePaid = (inv: Invoice) => Math.round(inv.payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
export const invoiceBalance = (inv: Invoice) => Math.max(0, Math.round((invoiceTotal(inv) - invoicePaid(inv)) * 100) / 100);

export function invoiceStatus(inv: Invoice): InvoiceStatus {
  if (inv.stored) return inv.stored;
  if (invoiceBalance(inv) <= 0.004) return "paid";
  if (daysBetween(TODAY, inv.due) < 0) return "overdue";
  return invoicePaid(inv) > 0 ? "partial" : "sent";
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: "neutral" | "sky" | "warning" | "success" | "error" }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "sky" },
  partial: { label: "Partially Paid", tone: "warning" },
  overdue: { label: "Overdue", tone: "error" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const PLANNED_STATUS: Record<Planned["status"], { label: string; tone: "neutral" | "sky" | "success" | "error" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "sky" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
  expired: { label: "Expired", tone: "neutral" },
  converted: { label: "Converted", tone: "info" },
};

/* ---------- Mutations (called inside update) ---------- */

const time = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const nowStamp = () => `${TODAY}T${time()}`;
export const nowMeta = (who: string) => `${who} · 31 Oct 2026, ${time()}`;

/** Changes stock at one branch and records the movement with its balance after. */
export function moveStock(draft: OpsState, input: Omit<StockMove, "id" | "balance" | "at"> & { at?: string }) {
  const item = draft.items.find((i) => i.id === input.itemId);
  if (!item) return;
  const before = item.stock[input.branch] ?? 0;
  const after = before + input.change;
  item.stock[input.branch] = after;
  draft.moves.unshift({ ...input, id: `mv-${draft.next.move++}`, at: input.at ?? nowStamp(), balance: after });
}

/** Sending an invoice locks it, reduces stock at its branch and adds item-sale lines. */
export function sendInvoice(draft: OpsState, id: string, by: string, channels: string) {
  const inv = draft.invoices.find((i) => i.id === id);
  if (!inv) return;
  const customer = draft.customers.find((c) => c.id === inv.customerId);
  inv.stored = null;
  inv.sentAt = TODAY;
  inv.issued = inv.issued || TODAY;
  inv.history.unshift(
    { kind: "submit", title: `Sent by ${channels}`, meta: nowMeta(by) },
    { kind: "status", title: "Status changed to Sent", meta: nowMeta("System"), detail: "Items and amounts locked" },
  );
  for (const line of inv.lines) {
    if (!line.itemId) continue;
    moveStock(draft, { itemId: line.itemId, branch: inv.branch, kind: "sale", change: -line.qty, ref: inv.id, refSub: `Invoice · ${customer?.name ?? ""}`, by });
    draft.saleLines.unshift({ id: `sl-${inv.id}-${line.itemId}`, date: TODAY, itemId: line.itemId, qty: line.qty, price: line.price, branch: inv.branch, source: "invoice", ref: inv.id });
  }
}

export function stockShortfalls(state: OpsState, lines: DocLine[], branch: BranchName) {
  return lines
    .filter((l) => l.itemId)
    .map((l) => {
      const item = state.items.find((i) => i.id === l.itemId)!;
      return { item, line: l, have: item.stock[branch] ?? 0 };
    })
    .filter((x) => x.have < x.line.qty);
}
