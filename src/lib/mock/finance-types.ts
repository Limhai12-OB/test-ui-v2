import type { Currency } from "@/lib/mock/dashboard";

export type Provider = "ABA" | "ACLEDA" | "Wing" | "Cash";
export type AccountKind = "bank" | "wallet" | "till";
export type StatusTone = "success" | "warning" | "sky" | "error" | "neutral";

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  provider: Provider;
  last4?: string;
  /** Tills hold both currencies; `balance` is the USD part and `khrBalance` the riel part. */
  currency: Currency;
  balance: number;
  khrBalance?: number;
  branch: string;
  status: "active" | "deactivated";
  recon: { label: string; tone: StatusTone };
  opened: string;
};

export type LedgerRow = {
  id: string;
  date: string;
  description: string;
  ref: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
  recon: "matched" | "review" | "unmatched";
};

export type BillStatus = "draft" | "open" | "partial" | "paid" | "overdue" | "cancelled";

export type BillLine = { description: string; sub?: string; qty: number; price: number; kind?: "item" | "expense" };

export type HistoryEntry = {
  kind: "status" | "ai" | "payment" | "submit" | "start" | "signed" | "returned" | "import" | "match" | "edit" | "reverse";
  title: string;
  meta: string;
  detail?: string;
};

export type Payment = { date: string; account: string; method: string; ref: string; amount: number };

export type Bill = {
  id: string;
  supplier: string;
  supplierNo: string;
  category: string;
  branch: string;
  billDate: string;
  due: string;
  currency: Currency;
  lines: BillLine[];
  vatRate: number;
  paid: number;
  /** Only draft and cancelled are stored; other states are derived from paid/due. */
  stored: "draft" | "cancelled" | null;
  attachment?: string;
  history: HistoryEntry[];
  payments: Payment[];
};

export type Txn = {
  id: string;
  date: string;
  description: string;
  type: "income" | "expense" | "transfer";
  accountId: string;
  branch: string;
  category: string;
  amount: number;
  currency: Currency;
  status: "posted" | "draft" | "reversed";
  ref: string;
  method: string;
  linked?: { label: string; href: string };
  recon: "matched" | "unmatched";
  history: HistoryEntry[];
};

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  system: boolean;
  active: boolean;
  usedInOct: number;
  aiRules: number;
};

export type Rule = { id: string; accountId: string; contains: string; category: string; learned: boolean; active: boolean };

export type Movement = { time: string; label: string; sub: string; usd: number; khr: number };

export type TillRecord = {
  id: string;
  date: string;
  branch: string;
  countedBy: string;
  usd: number | null;
  khr: number | null;
  expectedUsd: number;
  expectedKhr: number;
  status: "draft" | "submitted" | "returned" | "signed";
  notes: string;
  returnReason?: string;
  submittedAt?: string;
  history: HistoryEntry[];
  movements: Movement[];
};

export type ReconLine = {
  id: string;
  date: string;
  description: string;
  sub: string;
  amount: number;
  /** suggested: AI found a record; uncategorised: record exists but needs a category; missing: no record yet. */
  kind: "suggested" | "uncategorised" | "missing";
  record?: string;
  recordSub?: string;
  confidence?: number;
  resolution?: string;
  state: "todo" | "matched" | "excluded";
};

export type Recon = {
  id: string;
  accountId: string;
  period: string;
  periodLabel: string;
  usedBy: string;
  preparedBy: string;
  totalLines: number;
  autoMatched: number;
  statementBalance: number;
  currency: Currency;
  status: "draft" | "submitted" | "returned" | "signed";
  lines: ReconLine[];
  note: string;
  returnReason?: string;
  submittedAt?: string;
  statementFile: string;
  history: HistoryEntry[];
};

export type ImportRecord = {
  id: string;
  importedAt: string;
  period: string;
  accountId: string;
  file: string;
  by: string;
  lines: number;
  status: "review" | "completed" | "failed";
  note?: string;
};

export type ReviewLine = {
  id: string;
  date: string;
  description: string;
  accountId: string;
  branch: string;
  amount: number;
  currency: Currency;
  suggestion: string | null;
  confidence: number | null;
  /** Category chosen by the user (overrides the suggestion). */
  chosen: string | null;
  accepted: boolean;
};

export type FinanceState = {
  accounts: Account[];
  ledgers: Record<string, LedgerRow[]>;
  transactions: Txn[];
  bills: Bill[];
  categories: Category[];
  rules: Rule[];
  tills: TillRecord[];
  recons: Recon[];
  imports: ImportRecord[];
  /** Statement lines the AI was not sure about (Banking → Uncategorised). */
  uncategorised: ReviewLine[];
  /** Lines of the statement currently in AI review (06.8). */
  review: { file: string; accountId: string; period: string; read: number; highConfidence: number; duplicates: number; acceptedHigh: boolean };
  nextIds: { bill: number; txn: number };
};
