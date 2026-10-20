/**
 * Monthly reports (section 12). October 2026 and August 2026 follow frames
 * 12.5–12.11 exactly; the other months are derived from their totals so every
 * screen adds up.
 */

export type MonthId = "2026-03" | "2026-04" | "2026-05" | "2026-06" | "2026-07" | "2026-08" | "2026-09" | "2026-10";
export type ReportStatus = "complete" | "incomplete";

type Base = { id: MonthId; label: string; short: string; long: string; revenue: number; expenses: number; generatedAt: string; sub?: string };

const BASE: Base[] = [
  { id: "2026-03", label: "March 2026", short: "Mar", long: "1–31 Mar 2026", revenue: 33100, expenses: 25900, generatedAt: "1 Apr 2026, 16:45", sub: "First month on LuyFlow" },
  { id: "2026-04", label: "April 2026", short: "Apr", long: "1–30 Apr 2026", revenue: 34750, expenses: 26480, generatedAt: "2 May 2026, 11:02" },
  { id: "2026-05", label: "May 2026", short: "May", long: "1–31 May 2026", revenue: 36900, expenses: 27300, generatedAt: "1 Jun 2026, 08:30" },
  { id: "2026-06", label: "June 2026", short: "Jun", long: "1–30 Jun 2026", revenue: 38400, expenses: 28100, generatedAt: "1 Jul 2026, 09:18" },
  { id: "2026-07", label: "July 2026", short: "Jul", long: "1–31 Jul 2026", revenue: 40150, expenses: 29050, generatedAt: "2 Aug 2026, 10:40" },
  { id: "2026-08", label: "August 2026", short: "Aug", long: "1–31 Aug 2026", revenue: 41800, expenses: 29900, generatedAt: "1 Sep 2026, 08:05" },
  { id: "2026-09", label: "September 2026", short: "Sep", long: "1–30 Sep 2026", revenue: 43250, expenses: 30680, generatedAt: "1 Oct 2026, 08:12" },
  { id: "2026-10", label: "October 2026", short: "Oct", long: "1–31 Oct 2026", revenue: 48620, expenses: 31940, generatedAt: "31 Oct 2026, 19:04" },
];

export const OCTOBER: MonthId = "2026-10";
export const MONTH_IDS = BASE.map((m) => m.id);
export const isMonthId = (value: string): value is MonthId => (MONTH_IDS as string[]).includes(value);

const round10 = (n: number) => Math.round(n / 10) * 10;
const pct = (now: number, before: number) => ((now - before) / before) * 100;

/* ---------- Branches ---------- */

export type BranchKey = "central-market" | "toul-kork" | "siem-reap" | "battambang";
export const BRANCH_META: Record<BranchKey, { name: string; manager: string }> = {
  "central-market": { name: "Central Market (Main)", manager: "Sokha Chan · Owner-managed" },
  "toul-kork": { name: "Toul Kork", manager: "Dara Sok" },
  "siem-reap": { name: "Siem Reap", manager: "Bopha Keo" },
  battambang: { name: "Battambang", manager: "Vannak Lim" },
};

const TOUL_KORK: Record<MonthId, [number, number]> = {
  "2026-03": [6180, 4460],
  "2026-04": [10420, 7180],
  "2026-05": [10860, 7350],
  "2026-06": [11240, 7540],
  "2026-07": [11620, 7760],
  "2026-08": [12050, 7930],
  "2026-09": [12485, 8110],
  "2026-10": [13260, 8870],
};

const DESIGNED_BRANCHES: Partial<Record<MonthId, Record<BranchKey, [number, number]>>> = {
  "2026-08": { "central-market": [17340, 12190], "toul-kork": [12050, 7930], "siem-reap": [8420, 6150], battambang: [3990, 3630] },
  "2026-10": { "central-market": [19840, 12910], "toul-kork": [13260, 8870], "siem-reap": [9710, 6420], battambang: [5810, 3740] },
};

/** Splits what is left after Toul Kork using August's shares, so totals still match. */
function branchFigures(m: Base): Record<BranchKey, [number, number]> {
  const designed = DESIGNED_BRANCHES[m.id];
  if (designed) return designed;
  const aug = DESIGNED_BRANCHES["2026-08"]!;
  const [tkRev, tkExp] = TOUL_KORK[m.id];
  const rest = (["central-market", "siem-reap", "battambang"] as const).map((key) => aug[key]);
  const share = (index: 0 | 1, total: number) => {
    const sum = rest.reduce((s, r) => s + r[index], 0);
    const parts = rest.map((r) => round10((r[index] / sum) * total));
    parts[0] += total - parts.reduce((s, p) => s + p, 0);
    return parts;
  };
  const revs = share(0, m.revenue - tkRev);
  const exps = share(1, m.expenses - tkExp);
  return { "central-market": [revs[0], exps[0]], "toul-kork": [tkRev, tkExp], "siem-reap": [revs[1], exps[1]], battambang: [revs[2], exps[2]] };
}

/* ---------- Report shape ---------- */

export type Kpi = { id: "revenue" | "expenses" | "profit" | "margin"; label: string; value: number; delta?: number; vs: string };
export type Insight = { id: string; group: "well" | "watch" | "next"; icon: "up" | "alert" | "warning" | "idea"; title: string; body: string; basis: string; link: { label: string; href: string } };
export type Check = { id: string; title: string; detail: string; action?: { label: string; href: string } };
export type PlLine = { label: string; now: number; before: number };
export type CashAccount = { id: string; name: string; kind: string; provider: "ABA" | "ACLEDA" | "Wing" | "Cash"; branch: string; recorded: string; recordedSub: string; usd: number; signoff: { label: string; tone: "success" | "warning" | "sky" } };
export type BranchRow = { key: BranchKey; revenue: number; expenses: number; records: { label: string; tone: "success" | "warning" } };
export type MatrixCell = "ok" | "open" | "na";

export type Report = {
  id: MonthId;
  label: string;
  short: string;
  period: string;
  status: ReportStatus;
  checksPassed: number;
  generatedAt: string;
  generatedBy: string;
  sub?: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  prevLabel?: string;
  kpis: Kpi[];
  summary: string[];
  summaryBasis: string;
  health: { score: number; change: string };
  cash: { usd: number; khr: number };
  insights: Insight[];
  branches: BranchRow[];
  revenueLines: PlLine[];
  expenseLines: PlLine[];
  accounts: CashAccount[];
  open: Check[];
  passed: Check[];
  matrix: { branch: string; cells: MatrixCell[] }[];
  draftsTotal?: { total: number; revenue: number; expenses: number };
};

const HEALTH: Record<MonthId, number> = { "2026-03": 66, "2026-04": 68, "2026-05": 69, "2026-06": 70, "2026-07": 71, "2026-08": 72, "2026-09": 74, "2026-10": 78 };
const CASH: Record<MonthId, { usd: number; khr: number }> = {
  "2026-03": { usd: 38200, khr: 61500000 },
  "2026-04": { usd: 41100, khr: 66800000 },
  "2026-05": { usd: 44300, khr: 71200000 },
  "2026-06": { usd: 47200, khr: 76100000 },
  "2026-07": { usd: 49800, khr: 80300000 },
  "2026-08": { usd: 52340, khr: 84542000 },
  "2026-09": { usd: 56900, khr: 94400000 },
  "2026-10": { usd: 60930.55, khr: 104460000 },
};
export const KHR_RATE = 4100;

const OCT_REVENUE: PlLine[] = [
  { label: "Wholesale invoices", now: 27340, before: 23860 },
  { label: "Walk-in sales", now: 17460, before: 16210 },
  { label: "Online sales (Shopify)", now: 3820, before: 3180 },
];
const OCT_EXPENSES: PlLine[] = [
  { label: "Inventory purchases", now: 14820, before: 14200 },
  { label: "Payroll", now: 7640, before: 7400 },
  { label: "Rent", now: 4800, before: 4800 },
  { label: "Utilities", now: 2460, before: 2050 },
  { label: "Internet & phone", now: 620, before: 630 },
  { label: "Other", now: 1600, before: 1600 },
];

/** Category lines for a month, scaled from September's mix (October's own are designed). */
function lines(template: PlLine[], total: number, prevTotal: number | undefined, field: "now" | "before"): PlLine[] {
  const base = template.map((l) => l[field]);
  const sum = base.reduce((s, v) => s + v, 0);
  const scale = (t: number) => {
    const parts = base.map((v) => round10((v / sum) * t));
    parts[0] += t - parts.reduce((s, p) => s + p, 0);
    return parts;
  };
  const now = scale(total);
  const before = prevTotal ? scale(prevTotal) : now.map(() => 0);
  return template.map((l, i) => ({ label: l.label, now: now[i], before: before[i] }));
}

const OCT_ACCOUNTS: CashAccount[] = [
  { id: "aba-business-usd", name: "ABA Business USD", kind: "Bank account · •••• 4821", provider: "ABA", branch: "Business-wide", recorded: "$24,810.55", recordedSub: "USD", usd: 24810.55, signoff: { label: "Reconciled to 30 Sep", tone: "warning" } },
  { id: "aba-operating-khr", name: "ABA Operating KHR", kind: "Bank account · •••• 9034", provider: "ABA", branch: "Business-wide", recorded: "៛86,420,000", recordedSub: "KHR", usd: 21078.05, signoff: { label: "9 lines need review", tone: "warning" } },
  { id: "acleda-savings-usd", name: "ACLEDA Savings USD", kind: "Bank account · •••• 1175", provider: "ACLEDA", branch: "Business-wide", recorded: "$31,250.00", recordedSub: "USD", usd: 31250, signoff: { label: "Reconciled to 30 Sep", tone: "warning" } },
  { id: "wing-merchant-khr", name: "Wing Merchant KHR", kind: "Mobile wallet · •••• 0367", provider: "Wing", branch: "Toul Kork", recorded: "៛12,300,000", recordedSub: "KHR", usd: 3000, signoff: { label: "Awaiting sign-off", tone: "sky" } },
  { id: "till-central-market", name: "Cash till · Central Market", kind: "Cash till · USD and KHR", provider: "Cash", branch: "Central Market", recorded: "$1,940.00", recordedSub: "៛2,260,000 KHR", usd: 2491.22, signoff: { label: "Signed Off", tone: "success" } },
  { id: "till-toul-kork", name: "Cash till · Toul Kork", kind: "Cash till · USD and KHR", provider: "Cash", branch: "Toul Kork", recorded: "$1,280.00", recordedSub: "៛1,640,000 KHR", usd: 1680, signoff: { label: "31 Oct awaiting sign-off", tone: "sky" } },
  { id: "till-siem-reap", name: "Cash till · Siem Reap", kind: "Cash till · USD and KHR", provider: "Cash", branch: "Siem Reap", recorded: "$980.00", recordedSub: "៛1,100,000 KHR", usd: 1248.29, signoff: { label: "31 Oct awaiting sign-off", tone: "sky" } },
  { id: "till-battambang", name: "Cash till · Battambang", kind: "Cash till · USD and KHR", provider: "Cash", branch: "Battambang", recorded: "$670.00", recordedSub: "៛740,000 KHR", usd: 850.49, signoff: { label: "30–31 Oct not signed off", tone: "warning" } },
];

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const khr = (n: number) => `៛${n.toLocaleString("en-US")}`;

/** Earlier months: same accounts scaled to that month's closing cash, all signed off. */
function accountsFor(id: MonthId): CashAccount[] {
  if (id === OCTOBER) return OCT_ACCOUNTS;
  const ratioUsd = CASH[id].usd / CASH[OCTOBER].usd;
  const ratioKhr = CASH[id].khr / CASH[OCTOBER].khr;
  const signedLabel = id === "2026-09" ? { label: "Signed Off", tone: "success" as const } : { label: "Signed Off", tone: "success" as const };
  return OCT_ACCOUNTS.map((a) => {
    const isKhr = a.recordedSub === "KHR";
    if (isKhr) {
      const amount = Math.round((Number(a.recorded.replace(/[^\d]/g, "")) * ratioKhr) / 1000) * 1000;
      const wingPending = id === "2026-09" && a.id === "wing-merchant-khr";
      return { ...a, recorded: khr(amount), usd: amount / KHR_RATE, signoff: wingPending ? { label: "Awaiting sign-off", tone: "sky" } : signedLabel };
    }
    const amount = Math.round(Number(a.recorded.replace(/[^\d.]/g, "")) * ratioUsd * 100) / 100;
    const tillKhr = a.provider === "Cash" ? Math.round((Number(a.recordedSub.replace(/[^\d]/g, "")) * ratioKhr) / 1000) * 1000 : 0;
    return {
      ...a,
      recorded: usd(amount),
      recordedSub: a.provider === "Cash" ? `${khr(tillKhr)} KHR` : a.recordedSub,
      usd: amount + tillKhr / KHR_RATE,
      signoff: signedLabel,
    };
  });
}

/* ---------- Completeness ---------- */

const PASSED_ALWAYS: Check[] = [
  { id: "sales", title: "Sales recorded every day", detail: "All 4 active branches have sales on each of the 31 days." },
  { id: "invoices", title: "Invoices and payments", detail: "38 invoices were issued in October; every payment received is matched to an invoice." },
  { id: "bills", title: "Bills", detail: "36 bills recorded; none are missing a category." },
  { id: "stock", title: "Stock movements", detail: "Sales, purchases and 6 adjustments are posted for every branch." },
  { id: "shopify", title: "Shopify sync", detail: "Orders are synced up to 31 Oct 2026, 18:45." },
  { id: "rate", title: "Exchange rate", detail: "Display rate for October is set: 1 USD = 4,100 KHR." },
  { id: "assign", title: "Branch assignments", detail: "Every transaction belongs to a branch or is marked business-wide." },
];

const OCT_OPEN: Check[] = [
  { id: "bank", title: "Bank reconciliation", detail: "None of the 4 accounts is Signed Off for October yet. Wing Merchant KHR is waiting for your sign-off and 9 lines need review in ABA Operating KHR.", action: { label: "Review", href: "/financial-records/reconciliation" } },
  { id: "till", title: "Till balancing", detail: "120 of 124 daily balances are Signed Off. Toul Kork and Siem Reap 31 Oct are submitted, Battambang 30 Oct was returned and Battambang 31 Oct is not submitted.", action: { label: "Review", href: "/financial-records/till" } },
  { id: "uncategorised", title: "Uncategorised transactions", detail: "9 transactions in ABA Operating KHR have no category yet. Their money out is counted under “Other”.", action: { label: "Categorise", href: "/banking/uncategorised" } },
  { id: "drafts", title: "Draft documents", detail: "INV-2026-0156 ($415.00) and BILL-0912 ($3,120.00) are drafts, so $3,535.00 is not in the totals.", action: { label: "Open drafts", href: "/financial-records/bills/BILL-0912" } },
  { id: "webill", title: "WeBill365 sync", detail: "2 synced bills need review before they are recorded.", action: { label: "Review", href: "/integrations/webill365" } },
];

function monthChecks(m: Base): Check[] {
  const name = m.label.split(" ")[0];
  const days = Number(m.long.split("–")[1].split(" ")[0]);
  return [
    { id: "bank", title: "Bank reconciliation", detail: `All 4 bank and wallet accounts are Signed Off for ${name}.` },
    { id: "till", title: "Till balancing", detail: `Every daily till balance in ${name} is Signed Off.` },
    { id: "uncategorised", title: "Uncategorised transactions", detail: "Every transaction has a category." },
    { id: "drafts", title: "Draft documents", detail: "No invoices or bills were left as drafts." },
    { id: "webill", title: "WeBill365 sync", detail: "All synced bills were reviewed and recorded." },
    { id: "sales", title: "Sales recorded every day", detail: `All active branches have sales on each of the ${days} days.` },
    ...PASSED_ALWAYS.slice(1, 4),
    { id: "shopify", title: "Shopify sync", detail: `Orders are synced up to the last day of ${name}.` },
    { id: "rate", title: "Exchange rate", detail: `Display rate for ${name} is set: 1 USD = 4,100 KHR.` },
    PASSED_ALWAYS[6],
  ];
}

const OCT_MATRIX: Report["matrix"] = [
  { branch: "Central Market", cells: ["ok", "ok", "ok", "ok", "ok"] },
  { branch: "Toul Kork", cells: ["ok", "ok", "open", "open", "ok"] },
  { branch: "Siem Reap", cells: ["ok", "ok", "ok", "open", "ok"] },
  { branch: "Battambang", cells: ["open", "open", "ok", "open", "ok"] },
  { branch: "Business-wide", cells: ["na", "open", "open", "na", "na"] },
];
export const MATRIX_COLUMNS = ["Sales", "Bills", "Bank", "Till", "Stock"];

/* ---------- Words ---------- */

const OCT_INSIGHTS: Insight[] = [
  { id: "wholesale", group: "well", icon: "up", title: "Wholesale revenue is up 14.6%", body: "Wholesale invoices reached $27,340.00. Angkor Wholesale Trading and Riverside Hotel Supplies placed 6 more orders than in September.", basis: "Based on 38 invoices", link: { label: "View invoices", href: "/sales/invoices" } },
  { id: "margin", group: "well", icon: "up", title: "Margin improved by 5.2 points", body: "Revenue grew three times faster than expenses. Rent and other fixed costs did not change, so more of each sale became profit.", basis: "Profit & loss · Sep and Oct", link: { label: "View P&L", href: "?tab=pl" } },
  { id: "overdue", group: "watch", icon: "alert", title: "$3,150.00 of invoices are overdue", body: "3 invoices are past due, the oldest by 22 days. Overdue receivables are the weakest factor in your health score (58 of 100).", basis: "Receivables ageing · 31 Oct", link: { label: "View invoices", href: "/sales/invoices?status=overdue" } },
  { id: "electricity", group: "watch", icon: "warning", title: "Electricity at Toul Kork rose 25.0%", body: "The EDC bill went from ៛1,640,000 to ៛2,050,000 while branch sales grew 6.2%.", basis: "BILL-0924 and BILL-0897", link: { label: "View bills", href: "/financial-records/bills" } },
  { id: "restock", group: "next", icon: "idea", title: "Restock Vital Water in Siem Reap", body: "It has been out of stock since 27 Oct. The branch usually sells about 35 packs a week, so roughly $105.00 of weekly sales is at risk.", basis: "Stock movements · Siem Reap", link: { label: "View stock", href: "/inventory?view=branch" } },
  { id: "resolve", group: "next", icon: "idea", title: "Resolve 5 open items to finalise October", body: "Finish 4 reconciliations and 4 till balances, categorise 9 transactions, clear 2 drafts and review 2 WeBill365 bills, then regenerate.", basis: "Completeness check · 7 of 12 passed", link: { label: "Review", href: "?tab=completeness" } },
];

const AUG_INSIGHTS: Insight[] = [
  { id: "walkin", group: "well", icon: "up", title: "Walk-in sales grew in every branch", body: "Walk-in sales reached $15,640.00, up from $14,980.00 in July.", basis: "Based on August sales records", link: { label: "View", href: "/sales/walk-in" } },
  { id: "siemreap", group: "well", icon: "up", title: "Siem Reap had its best month so far", body: "Revenue at Siem Reap was $8,420.00, its highest since records began in March.", basis: "Branch performance · August", link: { label: "View", href: "/branches/siem-reap" } },
  { id: "battambang", group: "watch", icon: "warning", title: "Battambang margin is thin at 9.0%", body: "Expenses at Battambang were $3,630.00 against $3,990.00 of revenue. Rent is 38% of its costs.", basis: "Branch performance · August", link: { label: "View", href: "/branches/battambang" } },
  { id: "receivables", group: "watch", icon: "alert", title: "Receivables took 4 days longer to collect", body: "Customers paid on average 19 days after invoicing, up from 15 days in July.", basis: "Customer payments · August", link: { label: "View", href: "/sales/payments" } },
  { id: "payroll", group: "next", icon: "idea", title: "Plan for the September payroll rise", body: "Two new staff start at Siem Reap in September, adding about $640.00 a month.", basis: "Payroll · August", link: { label: "View", href: "/financial-records/transactions" } },
];

function genericInsights(m: Base, prev?: Base): Insight[] {
  const growth = prev ? pct(m.revenue, prev.revenue) : 0;
  return [
    prev
      ? { id: "growth", group: "well", icon: "up", title: `Revenue grew ${growth.toFixed(1)}%`, body: `Revenue reached ${usd(m.revenue)}, up from ${usd(prev.revenue)} in ${prev.label.split(" ")[0]}.`, basis: `Profit & loss · ${m.short}`, link: { label: "View P&L", href: "?tab=pl" } }
      : { id: "first", group: "well", icon: "up", title: "Your first month on LuyFlow", body: "Records started on 13 March, so this report covers part of the month for Toul Kork.", basis: "Profit & loss · Mar", link: { label: "View P&L", href: "?tab=pl" } },
    { id: "costs", group: "watch", icon: "warning", title: "Inventory purchases are the largest cost", body: `Stock bought for resale was about 46% of ${m.label.split(" ")[0]} expenses.`, basis: `Expenses by category · ${m.short}`, link: { label: "View P&L", href: "?tab=pl" } },
    { id: "cash", group: "next", icon: "idea", title: "Keep a month of costs in cash", body: `Closing cash covered about ${(((CASH[m.id].usd + CASH[m.id].khr / KHR_RATE) / m.expenses)).toFixed(1)} months of expenses.`, basis: `Cash by account · ${m.short}`, link: { label: "View cash", href: "?tab=pl" } },
  ];
}

const SUMMARY: Partial<Record<MonthId, { text: string[]; basis: string }>> = {
  "2026-10": {
    text: [
      "October was Mekong Mart’s strongest month since records began in March. Revenue reached **$48,620.00**, up 12.4%, while expenses rose only 4.1%, lifting net profit to **$16,680.00** and the margin to 34.3%.",
      "Growth came mainly from wholesale invoices (+$3,480.00), led by Angkor Wholesale Trading and Riverside Hotel Supplies. Walk-in sales grew steadily in every branch. Costs rose most in inventory purchases (+$620.00), utilities (+$410.00) and payroll (+$240.00).",
      "Two things need attention: **$3,150.00** of invoices are overdue, and Vital Water has been out of stock in Siem Reap since 27 Oct.",
    ],
    basis: "Written from 38 invoices, 36 bills and 502 transactions in October. Not accounting or tax advice.",
  },
  "2026-08": {
    text: [
      "August continued the steady growth seen since June. Revenue rose 4.1% to **$41,800.00** and net profit reached **$11,900.00**.",
      "Walk-in sales grew in every branch and Siem Reap had its best month so far. Rent and payroll did not change, so most of the extra revenue became profit.",
    ],
    basis: "Written from 33 invoices, 31 bills and 441 transactions in August. Not accounting or tax advice.",
  },
};

/* ---------- Build ---------- */

export function buildReport(id: MonthId, opts: { generatedAt?: string } = {}): Report {
  const index = BASE.findIndex((m) => m.id === id);
  const m = BASE[index];
  const prev = BASE[index - 1];
  const profit = m.revenue - m.expenses;
  const margin = (profit / m.revenue) * 100;
  const prevMargin = prev ? ((prev.revenue - prev.expenses) / prev.revenue) * 100 : undefined;
  const prevName = prev?.label.split(" ")[0];
  const vs = prev ? `vs ${prevName}` : "first month";
  const status: ReportStatus = id === "2026-10" || id === "2026-09" ? "incomplete" : "complete";
  const checksPassed = id === "2026-10" ? 7 : id === "2026-09" ? 11 : 12;

  const branchesRaw = branchFigures(m);
  const branchStatus: Record<BranchKey, BranchRow["records"]> =
    id === "2026-10"
      ? { "central-market": { label: "Complete", tone: "success" }, "toul-kork": { label: "2 open items", tone: "warning" }, "siem-reap": { label: "1 open item", tone: "warning" }, battambang: { label: "3 open items", tone: "warning" } }
      : id === "2026-09"
        ? { "central-market": { label: "Complete", tone: "success" }, "toul-kork": { label: "1 open item", tone: "warning" }, "siem-reap": { label: "Complete", tone: "success" }, battambang: { label: "Complete", tone: "success" } }
        : { "central-market": { label: "Complete", tone: "success" }, "toul-kork": { label: "Complete", tone: "success" }, "siem-reap": { label: "Complete", tone: "success" }, battambang: { label: "Complete", tone: "success" } };

  const isOct = id === OCTOBER;
  const revenueLines = isOct ? OCT_REVENUE : lines(OCT_REVENUE, m.revenue, prev?.revenue, "before");
  const expenseLines = isOct ? OCT_EXPENSES : lines(OCT_EXPENSES, m.expenses, prev?.expenses, "before");

  const checks = monthChecks(m);
  const open = isOct
    ? OCT_OPEN
    : id === "2026-09"
      ? [{ id: "bank", title: "Bank reconciliation", detail: "Wing Merchant KHR is waiting for your sign-off for September. The other 3 accounts are Signed Off.", action: { label: "Review", href: "/financial-records/reconciliation" } }]
      : [];
  const passed = isOct ? PASSED_ALWAYS : checks.filter((c) => !open.some((o) => o.id === c.id));

  const summary = SUMMARY[id] ?? {
    text: [
      prev
        ? `Revenue for ${m.label.split(" ")[0]} was **${usd(m.revenue)}**, ${pct(m.revenue, prev.revenue) >= 0 ? "up" : "down"} ${Math.abs(pct(m.revenue, prev.revenue)).toFixed(1)}% on ${prevName}, and net profit was **${usd(profit)}**, a margin of ${margin.toFixed(1)}%.`
        : `March was the first month recorded in LuyFlow. Revenue was **${usd(m.revenue)}** and net profit **${usd(profit)}**, a margin of ${margin.toFixed(1)}%. Toul Kork started recording on 13 March.`,
      "Inventory purchases and payroll were the largest costs. Every branch recorded sales on each trading day.",
    ],
    basis: `Written from the invoices, bills and transactions recorded in ${m.label.split(" ")[0]}. Not accounting or tax advice.`,
  };

  const health = HEALTH[id];
  const prevHealth = prev ? HEALTH[prev.id] : undefined;
  const healthChange =
    id === "2026-10"
      ? "Up 4 points from September. Receivables is the weakest of the six factors."
      : prevHealth !== undefined
        ? `Up ${health - prevHealth} point${health - prevHealth === 1 ? "" : "s"} from ${prevName}.`
        : "First score, from 18 days of records.";

  return {
    id,
    label: m.label,
    short: m.short,
    period: m.long,
    status,
    checksPassed,
    generatedAt: opts.generatedAt ?? m.generatedAt,
    generatedBy: "Sokha Chan",
    sub: m.sub,
    revenue: m.revenue,
    expenses: m.expenses,
    profit,
    margin,
    prevLabel: prev?.label,
    kpis: [
      { id: "revenue", label: "Revenue", value: m.revenue, delta: prev && pct(m.revenue, prev.revenue), vs },
      { id: "expenses", label: "Expenses", value: m.expenses, delta: prev && pct(m.expenses, prev.expenses), vs },
      { id: "profit", label: "Net profit", value: profit, delta: prev && pct(profit, prev.revenue - prev.expenses), vs },
      { id: "margin", label: "Profit margin", value: margin, delta: prevMargin !== undefined ? margin - prevMargin : undefined, vs: prev ? `points vs ${prevName}` : "first month" },
    ],
    summary: summary.text,
    summaryBasis: summary.basis,
    health: { score: health, change: healthChange },
    cash: CASH[id],
    insights: isOct ? OCT_INSIGHTS : id === "2026-08" ? AUG_INSIGHTS : genericInsights(m, prev),
    branches: (Object.keys(BRANCH_META) as BranchKey[]).map((key) => ({ key, revenue: branchesRaw[key][0], expenses: branchesRaw[key][1], records: branchStatus[key] })),
    revenueLines,
    expenseLines,
    accounts: accountsFor(id),
    open,
    passed,
    matrix: isOct
      ? OCT_MATRIX
      : OCT_MATRIX.map((row) => ({
          ...row,
          cells: row.cells.map((cell, i) => (cell === "na" ? "na" : id === "2026-09" && row.branch === "Toul Kork" && i === 2 ? "open" : "ok")),
        })),
    draftsTotal: isOct ? { total: 3535, revenue: 415, expenses: 3120 } : undefined,
  };
}

/** Rows of the report list (12.2), newest first. October only once generated. */
export function reportRows(octoberGenerated: boolean) {
  return BASE.filter((m) => m.id !== OCTOBER || octoberGenerated)
    .map((m) => buildReport(m.id))
    .reverse();
}

export const TREND = BASE.map((m) => ({ id: m.id, short: m.short, revenue: m.revenue, expenses: m.expenses, profit: m.revenue - m.expenses }));

/* ---------- Branch Manager view (12.12–12.13) ---------- */

export type BranchReport = {
  id: MonthId;
  label: string;
  period: string;
  status: ReportStatus;
  sub: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  kpis: Kpi[];
  summary: string[];
  summaryBasis: string;
  categories: { label: string; amount: number; color: string }[];
  open: Check[];
  passed: Check[];
};

const TK_OCT_CATEGORIES = [
  { label: "Inventory purchases", amount: 4108.72, color: "var(--lf-chart-revenue)" },
  { label: "Payroll", amount: 2210, color: "#0d9488" },
  { label: "Rent", amount: 1400, color: "var(--lf-chart-expense)" },
  { label: "Utilities", amount: 886.5, color: "#0284c7" },
  { label: "Other", amount: 264.78, color: "#64748b" },
];

export function buildBranchReport(id: MonthId, branch: string): BranchReport {
  const index = BASE.findIndex((m) => m.id === id);
  const m = BASE[index];
  const prev = BASE[index - 1];
  const [revenue, expenses] = TOUL_KORK[id];
  const profit = revenue - expenses;
  const margin = (profit / revenue) * 100;
  const prevName = prev?.label.split(" ")[0];
  const [pr, pe] = prev ? TOUL_KORK[prev.id] : [0, 0];
  const isOct = id === OCTOBER;
  const status: ReportStatus = id === "2026-10" || id === "2026-09" ? "incomplete" : "complete";
  const ratio = expenses / 8870;
  const categories = TK_OCT_CATEGORIES.map((c) => ({ ...c, amount: isOct ? c.amount : Math.round(c.amount * ratio * 100) / 100 }));
  if (!isOct) categories[4].amount = Math.round((expenses - categories.slice(0, 4).reduce((s, c) => s + c.amount, 0)) * 100) / 100;

  const open: Check[] = isOct
    ? [
        { id: "till", title: "Till balance · 31 Oct", detail: "Submitted 31 Oct, 17:52. Waiting for the Business Owner to sign off.", action: { label: "View", href: "/financial-records/till" } },
        { id: "wing", title: "Wing Merchant KHR reconciliation", detail: "Submitted 31 Oct, 18:10. Waiting for the Business Owner to sign off.", action: { label: "View", href: "/financial-records/reconciliation" } },
      ]
    : id === "2026-09"
      ? [{ id: "wing", title: "Wing Merchant KHR reconciliation", detail: "Submitted 1 Oct, 09:20. Waiting for the Business Owner to sign off.", action: { label: "View", href: "/financial-records/reconciliation" } }]
      : [];
  const name = m.label.split(" ")[0];
  const passed: Check[] = [
    { id: "sales", title: "Sales recorded every day", detail: `Toul Kork has sales on every trading day in ${name}.` },
    { id: "bills", title: "Bills", detail: "Every branch bill has a category and a supplier." },
    { id: "stock", title: "Stock movements", detail: "Sales, purchases and adjustments are posted." },
    ...(open.some((o) => o.id === "till") ? [] : [{ id: "till", title: "Till balancing", detail: `Every daily till balance in ${name} is Signed Off.` }]),
  ];

  return {
    id,
    label: m.label,
    period: m.long,
    status,
    sub: id === "2026-03" ? "From 13 Mar · first month" : `${branch} Branch`,
    revenue,
    expenses,
    profit,
    margin,
    kpis: [
      { id: "revenue", label: "Branch revenue", value: revenue, delta: prev && pct(revenue, pr), vs: prev ? `vs ${prevName}` : "first month" },
      { id: "expenses", label: "Branch expenses", value: expenses, delta: prev && pct(expenses, pe), vs: prev ? `vs ${prevName}` : "first month" },
      { id: "profit", label: "Branch net profit", value: profit, delta: prev && pct(profit, pr - pe), vs: prev ? `vs ${prevName}` : "first month" },
      { id: "margin", label: "Branch margin", value: margin, delta: prev ? margin - ((pr - pe) / pr) * 100 : undefined, vs: prev ? `points vs ${prevName}` : "first month" },
    ],
    summary: isOct
      ? [
          "Toul Kork sold **$13,260.00** in October, up 6.2%. Expenses grew faster, by 9.4%, so net profit was almost flat at **$4,390.00** and the margin fell 1.9 points to 33.1%.",
          "The largest cost increases were stock purchases (+$420.00), payroll (+$180.00) and electricity (+$100.00: the EDC bill rose from ៛1,640,000 to ៛2,050,000). Angkor Beer is below its minimum stock level, with 18 of 24 cases left.",
        ]
      : [`Toul Kork sold **${usd(revenue)}** in ${name}${prev ? `, ${pct(revenue, pr) >= 0 ? "up" : "down"} ${Math.abs(pct(revenue, pr)).toFixed(1)}% on ${prevName}` : ""}. Net profit was **${usd(profit)}**, a margin of ${margin.toFixed(1)}%.`],
    summaryBasis: isOct ? "Written from Toul Kork records only: 9 invoices, 3 bills and 118 transactions. Not accounting or tax advice." : `Written from Toul Kork records for ${name} only. Not accounting or tax advice.`,
    categories,
    open,
    passed,
  };
}

export function branchRows(octoberGenerated: boolean, branch: string) {
  return BASE.filter((m) => m.id !== OCTOBER || octoberGenerated)
    .map((m) => buildBranchReport(m.id, branch))
    .reverse();
}

/** Steps shown while a report is generated (frame 12.4 "Step 3 of 5 · insights"). */
export const GENERATE_STEPS = ["completeness", "totals", "insights", "branches", "layout"];
export const GENERATE_STEP_LABELS = ["Checking completeness", "Adding up the totals", "Writing insights", "Comparing branches", "Laying out the report"];
