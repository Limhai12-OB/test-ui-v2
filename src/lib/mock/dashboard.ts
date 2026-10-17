/**
 * MOCK dashboard data.
 *
 * Figures are transcribed from Figma frames 05.1 (Business Owner, all
 * branches) and 05.3 (Branch Manager, Toul Kork). There is no reporting API
 * yet; `getDashboard` simulates one so the loading state (05.4) is real.
 */

export type Tone = "neutral" | "success" | "error" | "warning" | "info";
export type Currency = "USD" | "KHR";

/** Display rate implied by the design: ៛860,000 ≈ $209.76. */
export const KHR_PER_USD = 4100;

export type Kpi = {
  id: "revenue" | "expenses" | "profit" | "margin";
  label: string;
  /** Phone label from frame 18.2. */
  shortLabel: string;
  /** USD amount, or a percentage for the margin card. */
  value: number;
  kind: "money" | "percent";
  delta: string;
  deltaDirection: "up" | "down";
  /** Whether the change is good news (green) or bad news (red). */
  deltaTone: "success" | "error";
  deltaSuffix: string;
  /** Phone suffix from frame 18.2, e.g. "vs Sep". */
  shortSuffix: string;
};

export type AgingBucket = { label: string; amount: number; color: "primary" | "warning" | "error" };
export type Aging = {
  title: string;
  subtitle: string;
  total: number;
  link: { label: string; href: string };
  buckets: AgingBucket[];
};

export type HealthFactor = { label: string; score: number };
export type Health = {
  title: string;
  score: number;
  summary: string;
  factors: HealthFactor[];
  insight: string;
};

export type ListItem = {
  id: string;
  icon: "receipt" | "file" | "calendar" | "package" | "calculator" | "undo" | "tags";
  tone: Tone;
  title: string;
  /** Amount shown in tabular figures before the detail text. */
  amount?: string;
  amountTone?: "error" | "default";
  detail: string;
  href: string;
};

export type Transaction = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  category: string;
  /** Category needs attention (e.g. "Uncategorised"). */
  categoryTone?: "warning";
  amount: string;
  positive: boolean;
  /** Second line under the amount: "USD" or "KHR · ≈ $209.76". */
  currencyLine: string;
};

export type QuickAction = {
  id: string;
  icon: "receipt" | "cart" | "upload" | "sparkles" | "calculator";
  title: string;
  detail: string;
  href: string;
};

export type ChartInfo = {
  subtitle: string;
  yLabels: string[];
  callout: { value: string; detail: string };
};

export type DashboardData = {
  scopeLabel: string;
  kpis: Kpi[];
  chart: ChartInfo;
  health: Health;
  receivable: Aging;
  payable: Aging;
  attention: { title: string; badgeTone: "error" | "warning"; items: ListItem[] };
  transactions: { subtitle: string; rows: Transaction[] };
  quickActions: QuickAction[];
};

const ownerData: DashboardData = {
  scopeLabel: "all branches",
  kpis: [
    { id: "revenue", label: "Monthly revenue", shortLabel: "Revenue", value: 48620, kind: "money", delta: "12.4%", deltaDirection: "up", deltaTone: "success", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "expenses", label: "Monthly expenses", shortLabel: "Expenses", value: 31940, kind: "money", delta: "4.1%", deltaDirection: "up", deltaTone: "error", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "profit", label: "Net profit", shortLabel: "Net profit", value: 16680, kind: "money", delta: "32.7%", deltaDirection: "up", deltaTone: "success", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "margin", label: "Profit margin", shortLabel: "Profit margin", value: 34.3, kind: "percent", delta: "5.2", deltaDirection: "up", deltaTone: "success", deltaSuffix: "points vs last month", shortSuffix: "pts vs Sep" },
  ],
  chart: {
    subtitle: "Daily totals · 1–31 Oct 2026 · all branches · USD",
    yLabels: ["$3k", "$2k", "$1k", "$0"],
    callout: { value: "$2,331.00 income", detail: "Sat 31 Oct · highest day" },
  },
  health: {
    title: "Business health score",
    score: 78,
    summary: "Up 4 points from September. Weakest area: receivables.",
    factors: [
      { label: "Cash and liquidity", score: 82 },
      { label: "Profitability", score: 85 },
      { label: "Cash flow trend", score: 74 },
      { label: "Receivables", score: 58 },
      { label: "Payables", score: 80 },
      { label: "Expense control", score: 71 },
    ],
    insight: "3 invoices worth $3,150.00 are overdue. Collecting them would lift the score to about 84.",
  },
  receivable: {
    title: "Accounts receivable",
    subtitle: "14 open invoices · money owed to you",
    total: 18450,
    link: { label: "View invoices", href: "/sales/invoices" },
    buckets: [
      { label: "Not yet due", amount: 11900, color: "primary" },
      { label: "Due within 7 days", amount: 3400, color: "warning" },
      { label: "Overdue", amount: 3150, color: "error" },
    ],
  },
  payable: {
    title: "Accounts payable",
    subtitle: "9 open bills · money you owe",
    total: 9870,
    link: { label: "View bills", href: "/financial-records/bills" },
    buckets: [
      { label: "Not yet due", amount: 5220, color: "primary" },
      { label: "Due within 7 days", amount: 3500, color: "warning" },
      { label: "Overdue", amount: 1150, color: "error" },
    ],
  },
  attention: {
    title: "Needs attention",
    badgeTone: "error",
    items: [
      { id: "a1", icon: "receipt", tone: "error", title: "3 invoices overdue", amount: "$3,150.00", amountTone: "error", detail: "Oldest: 22 days", href: "/sales/invoices?status=overdue" },
      { id: "a2", icon: "file", tone: "error", title: "BILL-0918 overdue", amount: "$1,150.00", amountTone: "error", detail: "Vattanac Distribution", href: "/financial-records/bills/BILL-0918" },
      { id: "a3", icon: "calendar", tone: "warning", title: "BILL-0931 due in 2 days", amount: "$1,480.00", detail: "Cambodia Beverage Co.", href: "/financial-records/bills/BILL-0931" },
      { id: "a4", icon: "calendar", tone: "warning", title: "INV-2026-0153 due in 7 days", amount: "$2,180.00", detail: "Angkor Wholesale Trading", href: "/sales/invoices/INV-2026-0153" },
      { id: "a5", icon: "package", tone: "warning", title: "Angkor Beer below minimum", detail: "Toul Kork · 18 of 24 cases", href: "/inventory/items/angkor-beer" },
    ],
  },
  transactions: {
    subtitle: "Latest across all accounts and branches",
    rows: [
      { id: "t1", date: "31 Oct", title: "Shopify order #10492", subtitle: "ABA Business USD · Central Market", category: "Sales", amount: "+$184.50", positive: true, currencyLine: "USD" },
      { id: "t2", date: "31 Oct", title: "EDC electricity bill", subtitle: "ABA Operating KHR · Central Market", category: "Utilities", amount: "−៛860,000", positive: false, currencyLine: "KHR · ≈ $209.76" },
      { id: "t3", date: "30 Oct", title: "Payment INV-2026-0138", subtitle: "ABA Business USD · Central Market", category: "Sales", amount: "+$1,250.00", positive: true, currencyLine: "USD" },
      { id: "t4", date: "30 Oct", title: "Cambodia Beverage Co. — stock order", subtitle: "ABA Business USD · Central Market", category: "Inventory purchases", amount: "−$1,320.00", positive: false, currencyLine: "USD" },
      { id: "t5", date: "29 Oct", title: "Wing transfer 4471826", subtitle: "Wing Merchant KHR · Toul Kork", category: "Inventory purchases", amount: "−៛1,850,000", positive: false, currencyLine: "KHR · ≈ $451.22" },
      { id: "t6", date: "29 Oct", title: "Staff wages, week 43", subtitle: "ABA Business USD · Siem Reap", category: "Payroll", amount: "−$1,180.00", positive: false, currencyLine: "USD" },
    ],
  },
  quickActions: [
    { id: "q1", icon: "receipt", title: "Create invoice", detail: "For a wholesale customer", href: "/sales/invoices/new" },
    { id: "q2", icon: "cart", title: "Record walk-in sale", detail: "Cash, KHQR or card", href: "/sales/walk-in/new" },
    { id: "q3", icon: "upload", title: "Import bank statement", detail: "ABA, ACLEDA or Wing", href: "/banking/import" },
    { id: "q4", icon: "sparkles", title: "Ask the AI Advisor", detail: "Questions in Khmer or English", href: "/ai-advisor" },
  ],
};

const toulKorkData: DashboardData = {
  scopeLabel: "Toul Kork Branch",
  kpis: [
    { id: "revenue", label: "Monthly revenue", shortLabel: "Revenue", value: 13260, kind: "money", delta: "6.2%", deltaDirection: "up", deltaTone: "success", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "expenses", label: "Monthly expenses", shortLabel: "Expenses", value: 8870, kind: "money", delta: "9.4%", deltaDirection: "up", deltaTone: "error", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "profit", label: "Net profit", shortLabel: "Net profit", value: 4390, kind: "money", delta: "0.3%", deltaDirection: "up", deltaTone: "success", deltaSuffix: "vs last month", shortSuffix: "vs Sep" },
    { id: "margin", label: "Profit margin", shortLabel: "Profit margin", value: 33.1, kind: "percent", delta: "1.9", deltaDirection: "down", deltaTone: "error", deltaSuffix: "points vs last month", shortSuffix: "pts vs Sep" },
  ],
  chart: {
    subtitle: "Daily totals · 1–31 Oct 2026 · Toul Kork · USD",
    yLabels: ["$0.8k", "$0.6k", "$0.4k", "$0.2k", "$0"],
    callout: { value: "$636.00 income", detail: "Sat 31 Oct · highest day" },
  },
  health: {
    title: "Branch health score",
    score: 74,
    summary: "Based on Toul Kork records only. Expense control dipped this month.",
    factors: [
      { label: "Cash and liquidity", score: 78 },
      { label: "Profitability", score: 81 },
      { label: "Cash flow trend", score: 72 },
      { label: "Receivables", score: 76 },
      { label: "Payables", score: 70 },
      { label: "Expense control", score: 62 },
    ],
    insight: "Electricity rose 25.0% while sales grew 6.2%. Ask the AI Advisor what changed.",
  },
  receivable: {
    title: "Accounts receivable",
    subtitle: "2 open invoices · this branch",
    total: 1890,
    link: { label: "View invoices", href: "/sales/invoices" },
    buckets: [
      { label: "Not yet due", amount: 1250, color: "primary" },
      { label: "Due within 7 days", amount: 640, color: "warning" },
      { label: "Overdue", amount: 0, color: "error" },
    ],
  },
  payable: {
    title: "Accounts payable",
    subtitle: "1 open bill · this branch",
    total: 820,
    link: { label: "View bills", href: "/financial-records/bills" },
    buckets: [
      { label: "Not yet due", amount: 0, color: "primary" },
      { label: "Due within 7 days", amount: 820, color: "warning" },
      { label: "Overdue", amount: 0, color: "error" },
    ],
  },
  attention: {
    title: "Your tasks",
    badgeTone: "warning",
    items: [
      { id: "b1", icon: "calculator", tone: "warning", title: "Submit today’s till balance", detail: "Not balanced today · due by 18:00", href: "/financial-records/till/count" },
      { id: "b2", icon: "undo", tone: "warning", title: "Reconciliation returned", detail: "Wing Merchant KHR · Sep 2026", href: "/financial-records/reconciliation/rec-wing-2026-09" },
      { id: "b3", icon: "tags", tone: "info", title: "3 uncategorised transactions", detail: "Wing Merchant KHR · Oct 2026", href: "/banking/uncategorised" },
      { id: "b4", icon: "package", tone: "warning", title: "Angkor Beer below minimum", detail: "18 of 24 cases left", href: "/inventory/items/angkor-beer" },
    ],
  },
  transactions: {
    subtitle: "Toul Kork Branch only",
    rows: [
      { id: "r1", date: "29 Oct", title: "Wing transfer 4471826", subtitle: "Bank import · Wing Merchant KHR", category: "Uncategorised", categoryTone: "warning", amount: "−៛1,850,000", positive: false, currencyLine: "KHR · ≈ $451.22" },
      { id: "r2", date: "28 Oct", title: "Walk-in sales (till close)", subtitle: "Cash till · Toul Kork", category: "Sales", amount: "+៛1,960,000", positive: true, currencyLine: "KHR · ≈ $478.05" },
      { id: "r3", date: "27 Oct", title: "Payment INV-2026-0144", subtitle: "Borey Café & Bakery · Wing Merchant KHR", category: "Sales", amount: "+៛1,312,000", positive: true, currencyLine: "KHR · ≈ $320.00" },
      { id: "r4", date: "27 Oct", title: "EDC electricity · BILL-0924", subtitle: "Bank transfer · ABA Operating KHR", category: "Utilities", amount: "−៛2,050,000", positive: false, currencyLine: "KHR · ≈ $500.00" },
      { id: "r5", date: "27 Oct", title: "Khmer Fresh Produce — vegetables", subtitle: "Cash till · Toul Kork", category: "Inventory purchases", amount: "−$184.00", positive: false, currencyLine: "USD" },
      { id: "r6", date: "26 Oct", title: "Walk-in sales (till close)", subtitle: "Cash till · Toul Kork", category: "Sales", amount: "+$438.50", positive: true, currencyLine: "USD" },
      { id: "r7", date: "25 Oct", title: "Walk-in sales (till close)", subtitle: "Cash till · Toul Kork", category: "Sales", amount: "+៛2,140,000", positive: true, currencyLine: "KHR · ≈ $521.95" },
      { id: "r8", date: "24 Oct", title: "Wing pay · Khmer Fresh Produce", subtitle: "Bank import · Wing Merchant KHR", category: "Uncategorised", categoryTone: "warning", amount: "−៛754,400", positive: false, currencyLine: "KHR · ≈ $184.00" },
      { id: "r9", date: "24 Oct", title: "Walk-in sales (till close)", subtitle: "Cash till · Toul Kork", category: "Sales", amount: "+$396.00", positive: true, currencyLine: "USD" },
    ],
  },
  quickActions: [
    { id: "q1", icon: "cart", title: "Record walk-in sale", detail: "Cash, KHQR or card", href: "/sales/walk-in/new" },
    { id: "q2", icon: "receipt", title: "Create invoice", detail: "For a wholesale customer", href: "/sales/invoices/new" },
    { id: "q3", icon: "calculator", title: "Balance the till", detail: "Count USD and KHR", href: "/financial-records/till/count" },
    { id: "q4", icon: "sparkles", title: "Ask the AI Advisor", detail: "Answers for your branch", href: "/ai-advisor" },
  ],
};

export type BranchId = "all" | "toul-kork" | "central-market" | "siem-reap";

export const BRANCHES: { id: BranchId; label: string; hasDemoData: boolean }[] = [
  { id: "all", label: "All branches", hasDemoData: true },
  { id: "central-market", label: "Central Market", hasDemoData: false },
  { id: "toul-kork", label: "Toul Kork", hasDemoData: true },
  { id: "siem-reap", label: "Siem Reap", hasDemoData: false },
];

/** Returns null for a branch that has no demo records yet. */
export async function getDashboard(branch: BranchId): Promise<DashboardData | null> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (branch === "all") return ownerData;
  if (branch === "toul-kork") return toulKorkData;
  return null;
}

export function branchIdFromName(name?: string): BranchId {
  return BRANCHES.find((branch) => branch.label === name)?.id ?? "all";
}

export const SETUP_STEPS = [
  { id: "business", title: "Create your business", detail: "default currency USD · Central Market (Main) created", action: null, href: null, done: true },
  { id: "account", title: "Add a bank account or cash till", detail: "Tell LuyFlow where your money is kept.", action: "Add account", href: "/banking/accounts?add=1", done: false },
  { id: "statement", title: "Import a bank statement", detail: "CSV or Excel from ABA, ACLEDA or Wing. AI suggests the categories.", action: "Import statement", href: "/data-import", done: false },
  { id: "items", title: "Add your items and stock", detail: "Type them in or upload your item list.", action: "Add items", href: "/inventory/new", done: false },
  { id: "invite", title: "Invite a Branch Manager", detail: "They only see the branch you assign.", action: "Invite manager", href: "/branches", done: false },
] as const;
