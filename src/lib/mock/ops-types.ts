import type { Currency } from "@/lib/format";
import type { HistoryEntry } from "./finance-types";

export const BRANCHES_4 = ["Central Market", "Toul Kork", "Siem Reap", "Battambang"] as const;
export type BranchName = (typeof BRANCHES_4)[number];

export type Item = {
  id: string;
  name: string;
  sku: string;
  category: string;
  /** Singular unit, e.g. "case". */
  unit: string;
  cost: number;
  price: number;
  active: boolean;
  /** Stock per branch; a branch missing from the map does not stock the item. */
  stock: Partial<Record<BranchName, number>>;
  min: Partial<Record<BranchName, number>>;
  created: string;
  createdBy: string;
};

export type MovementKind = "sale" | "increase" | "decrease" | "correction" | "initial";

export type StockMove = {
  id: string;
  at: string; // "2026-10-31T17:12"
  itemId: string;
  branch: BranchName;
  kind: MovementKind;
  change: number;
  balance: number;
  ref: string;
  refSub: string;
  by: string;
};

export type Adjustment = {
  id: string;
  at: string;
  itemId: string;
  branch: BranchName;
  kind: "increase" | "decrease" | "correction";
  change: number;
  reason: string;
  notes: string;
  by: string;
};

export type SaleSource = "invoice" | "walk-in" | "shopify";

export type SaleLine = {
  id: string;
  date: string;
  itemId: string;
  qty: number;
  price: number;
  branch: BranchName;
  source: SaleSource;
  ref: string;
  href?: string;
};

export type PayMethod = "Cash" | "KHQR" | "Card";

export type WalkInSale = {
  id: string;
  at: string;
  lines: { itemId: string; qty: number; price: number; discount: number }[];
  method: PayMethod;
  accountId: string;
  branch: BranchName;
  currency: Currency;
  /** Total in the charged currency. */
  total: number;
  by: string;
};

export type Customer = {
  id: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  email: string;
  telegram: string;
  address: string;
  terms: number;
  since: string;
  active: boolean;
  notes: string;
  notesMeta: string;
};

export type DocLine = { itemId: string | null; description: string; sku?: string; qty: number; price: number; discount: number; ai?: boolean };

export type InvoicePayment = { id: string; date: string; amount: number; method: string; accountId: string; ref: string; by: string; slip?: string; khr?: number };

export type Invoice = {
  id: string;
  customerId: string;
  branch: BranchName;
  issued: string;
  due: string;
  currency: Currency;
  lines: DocLine[];
  notes: string;
  /** Only draft and cancelled are stored; other states derive from payments and due date. */
  stored: "draft" | "cancelled" | null;
  payments: InvoicePayment[];
  history: HistoryEntry[];
  fromPlanned?: string;
  /** True once sent: stock has been reduced and lines are locked. */
  sentAt?: string;
};

export type PlannedStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";

export type Planned = {
  id: string;
  customerId: string;
  branch: BranchName;
  created: string;
  expires: string;
  currency: Currency;
  lines: DocLine[];
  notes: string;
  status: PlannedStatus;
  invoiceId?: string;
  history: HistoryEntry[];
  acceptedNote?: string;
};

export type OpsState = {
  items: Item[];
  moves: StockMove[];
  adjustments: Adjustment[];
  saleLines: SaleLine[];
  walkIns: WalkInSale[];
  customers: Customer[];
  invoices: Invoice[];
  planned: Planned[];
  next: { invoice: number; walkIn: number; planned: number; move: number };
  /** Undo window for the last item import (ids created). */
  lastImport?: { ids: string[]; at: string; file: string };
};
