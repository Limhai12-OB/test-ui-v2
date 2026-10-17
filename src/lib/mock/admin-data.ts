/**
 * MOCK data for Branch Management (07), Notifications (14), Integrations (15)
 * and Profile & Settings (17). Values follow the Figma frames. Nothing here is
 * read from or sent to a server; see `lib/admin-store.tsx`.
 */
import type { Role } from "@/lib/session";

/* ---------- Branches and managers (07) ---------- */

export type BranchRec = {
  id: string;
  name: string;
  main: boolean;
  address: string;
  city: string;
  phone: string;
  opened: string;
  staff: number;
  status: "active" | "deactivated";
  deactivatedOn?: string;
  /** October figures (USD) and their change on September, in percent. */
  revenue: number;
  expenses: number;
  revDelta: number;
  expDelta: number;
  profitDelta: number;
  /** Change of the share of business revenue, in percentage points. */
  shareDelta: number;
  /** Totals for the "Last 3 months" and "Year to date" chart options. */
  q: [number, number];
  ytd: [number, number];
};

export type ManagerRec = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "invited" | "deactivated";
  /** Branch the manager runs now (or ran, when deactivated). */
  branchId: string | null;
  /** For an invitation: the branch they take over once they accept. */
  pendingBranchId?: string | null;
  lastActive: string;
  added: string;
  expires?: string;
  telegram?: string;
  /** Row highlight after an action ("Invitation sent just now"). */
  fresh?: boolean;
};

export const CITIES = ["Phnom Penh", "Siem Reap", "Battambang", "Kampot", "Sihanoukville", "Kampong Cham", "Takeo"];

export const BRANCH_SEED: BranchRec[] = [
  {
    id: "central-market", name: "Central Market", main: true, address: "No. 86, St. 136, Daun Penh, Phnom Penh", city: "Phnom Penh", phone: "+855 23 880 142",
    opened: "2026-03-01", staff: 9, status: "active", revenue: 19840, expenses: 12910, revDelta: 14.2, expDelta: 3.8, profitDelta: 41.6, shareDelta: 1.9, q: [55120, 37480], ytd: [148600, 101250],
  },
  {
    id: "toul-kork", name: "Toul Kork", main: false, address: "No. 12, St. 289, Toul Kork, Phnom Penh", city: "Phnom Penh", phone: "+855 23 991 507",
    opened: "2026-03-12", staff: 6, status: "active", revenue: 13260, expenses: 8870, revDelta: 6.2, expDelta: 9.4, profitDelta: 0.3, shareDelta: -1.6, q: [38940, 25710], ytd: [101380, 68420],
  },
  {
    id: "siem-reap", name: "Siem Reap", main: false, address: "Sivatha Blvd, Svay Dangkum, Siem Reap", city: "Siem Reap", phone: "+855 63 966 210",
    opened: "2026-03-03", staff: 5, status: "active", revenue: 9710, expenses: 6420, revDelta: 4.1, expDelta: 2.6, profitDelta: 7.3, shareDelta: -0.4, q: [27650, 18930], ytd: [74120, 50860],
  },
  {
    id: "battambang", name: "Battambang", main: false, address: "Street 3, Svay Por, Battambang", city: "Battambang", phone: "+855 53 952 118",
    opened: "2026-06-19", staff: 4, status: "active", revenue: 5810, expenses: 3740, revDelta: 11.8, expDelta: -2.3, profitDelta: 38.9, shareDelta: 0.6, q: [15340, 10560], ytd: [21480, 15020],
  },
  {
    id: "kampot", name: "Kampot", main: false, address: "Old Market Road, Kampong Kandal, Kampot", city: "Kampot", phone: "+855 33 932 404",
    opened: "2026-03-09", staff: 0, status: "deactivated", deactivatedOn: "2026-08-14", revenue: 0, expenses: 0, revDelta: 0, expDelta: 0, profitDelta: 0, shareDelta: 0, q: [0, 0], ytd: [16420, 13980],
  },
];

/** Branch ids pre-rendered for branches added in the app ("branch-6" …). */
export const NEW_BRANCH_IDS = ["branch-6", "branch-7", "branch-8", "branch-9"];

export const MANAGER_SEED: ManagerRec[] = [
  { id: "dara", name: "Dara Sok", email: "dara@mekongmart.com.kh", phone: "+855 96 441 205", status: "active", branchId: "toul-kork", lastActive: "Today, 16:58", added: "2026-03-12", telegram: "Linked · daily summary" },
  { id: "bopha", name: "Bopha Keo", email: "bopha@mekongmart.com.kh", status: "active", branchId: "siem-reap", lastActive: "Yesterday, 18:20", added: "2026-03-03", telegram: "Linked · right away" },
  { id: "vannak", name: "Vannak Lim", email: "vannak@mekongmart.com.kh", status: "active", branchId: "battambang", lastActive: "29 Oct 2026", added: "2026-06-19", telegram: "Not linked" },
  { id: "sreymom", name: "Sreymom Heng", email: "sreymom.heng@gmail.com", status: "invited", branchId: null, pendingBranchId: null, lastActive: "", added: "2026-10-28", expires: "2026-11-04" },
  { id: "pisey", name: "Pisey Chan", email: "pisey.chan@mekongmart.com.kh", status: "deactivated", branchId: "kampot", lastActive: "14 Aug 2026", added: "2026-03-09" },
];

/* ---------- Notifications (14) ---------- */

export type AlertType = "financial" | "stock" | "signoff" | "cash" | "reports" | "system";
export type AlertIcon = "scale" | "upload" | "package" | "invoice" | "alert" | "payment" | "bill" | "report";

export type Notification = {
  id: string;
  type: AlertType;
  icon: AlertIcon;
  title: string;
  body: string;
  /** "Today, 18:10" etc. `day` groups the list. */
  time: string;
  day: "today" | "yesterday" | "earlier" | "older";
  branch: string;
  unread: boolean;
  /** Record the alert is about. */
  href: string;
  hrefLabel: string;
  record?: { ref: string; kind: string; status?: { label: string; tone: "error" | "warning" | "success" | "sky" | "neutral" }; rows: [string, string, ("error" | "success")?][] };
  lead?: string;
  /** Longer text for the details drawer; the list shows `body`. */
  detail?: string;
  steps?: { label: string; href: string; icon: "send" | "payment" | "ai" | "open" }[];
  history?: { title: string; meta: string; icon: "send" | "sync" }[];
  repeat?: string;
  secondary?: { label: string; href: string };
};

const OWNER_NOTIFICATIONS: Notification[] = [
  {
    id: "n-recon", type: "signoff", icon: "scale", title: "Reconciliation submitted for sign-off", day: "today", time: "Today, 18:10", branch: "Toul Kork", unread: true,
    body: "Dara Sok submitted Wing Merchant KHR for October 2026. 95 of 96 lines matched, 1 excluded.",
    href: "/financial-records/reconciliation", hrefLabel: "Open reconciliation",
    record: { ref: "Wing Merchant KHR · October 2026", kind: "Reconciliation", status: { label: "Submitted", tone: "sky" }, rows: [["Submitted by", "Dara Sok"], ["Lines matched", "95 of 96"], ["Excluded", "1 line"], ["Waiting since", "Today, 18:10"]] },
  },
  {
    id: "n-till", type: "signoff", icon: "scale", title: "Till balance submitted · Toul Kork", day: "today", time: "Today, 17:52", branch: "Toul Kork", unread: true,
    body: "31 Oct count: USD is short by $12.50 and KHR is over by ៛4,000. Waiting for your sign-off.",
    href: "/financial-records/till", hrefLabel: "Open till balance",
    record: { ref: "Cash till · Toul Kork · 31 Oct", kind: "Till balance", status: { label: "Submitted", tone: "sky" }, rows: [["Counted by", "Dara Sok"], ["USD variance", "−$12.50", "error"], ["KHR variance", "+៛4,000"]] },
  },
  {
    id: "n-import", type: "system", icon: "upload", title: "Wing statement import finished", day: "today", time: "Today, 16:58", branch: "Toul Kork", unread: false,
    body: "96 lines imported. 3 need review before the month can be closed.",
    href: "/banking/uncategorised", hrefLabel: "Review lines",
    record: { ref: "Wing Merchant KHR · October 2026", kind: "Statement import", status: { label: "Needs Review", tone: "warning" }, rows: [["Lines imported", "96"], ["Need review", "3"], ["Imported by", "Dara Sok"]] },
  },
  {
    id: "n-stock", type: "stock", icon: "package", title: "Angkor Beer 330ml is below minimum stock", day: "today", time: "Today, 14:20", branch: "Toul Kork", unread: true,
    body: "18 cases left at Toul Kork. The minimum for this branch is 24.",
    href: "/inventory/items/angkor-beer", hrefLabel: "Open item",
    record: { ref: "Angkor Beer 330ml × 24", kind: "Item", status: { label: "Low Stock", tone: "warning" }, rows: [["SKU", "BEV-ANG-330"], ["At Toul Kork", "18 cases"], ["Minimum", "24 cases"]] },
    secondary: { label: "Plan a purchase", href: "/sales/planned/new" },
  },
  {
    id: "n-overdue", type: "financial", icon: "invoice", title: "INV-2026-0142 is 8 days overdue", day: "today", time: "Today, 08:00", branch: "Central Market", unread: true,
    body: "Angkor Wholesale Trading owes $1,250.00. Send a reminder or record a payment.",
    href: "/sales/invoices/INV-2026-0142", hrefLabel: "Open invoice",
    lead: "Angkor Wholesale Trading owes $1,250.00",
    detail: "The invoice was due on 23 Oct 2026. No payment has been recorded and no reminder has been sent in the last 4 days.",
    record: {
      ref: "INV-2026-0142", kind: "Invoice", status: { label: "Overdue", tone: "error" },
      rows: [["Customer", "Angkor Wholesale Trading"], ["Issued", "9 Oct 2026"], ["Due", "23 Oct 2026 · 8 days overdue", "error"], ["Balance", "$1,250.00 USD"], ["Usually pays", "9 days after the due date"]],
    },
    steps: [
      { label: "Send a reminder by Telegram or email", href: "/sales/invoices/INV-2026-0142", icon: "send" },
      { label: "Record a payment if the customer has paid", href: "/sales/invoices/INV-2026-0142?pay=1", icon: "payment" },
      { label: "Ask the AI Advisor about this customer", href: "/ai-advisor", icon: "ai" },
    ],
    history: [
      { title: "Second alert: 8 days overdue", meta: "Today, 08:00 · app and Telegram", icon: "send" },
      { title: "First alert: 1 day overdue", meta: "24 Oct 2026, 08:00 · app and Telegram", icon: "send" },
      { title: "Invoice became overdue", meta: "System · 24 Oct 2026, 00:00", icon: "sync" },
    ],
    repeat: "Overdue alerts repeat every 7 days until the invoice is paid.",
    secondary: { label: "Record payment", href: "/sales/invoices/INV-2026-0142?pay=1" },
  },
  {
    id: "n-cash", type: "cash", icon: "alert", title: "Cash could dip below your safety level", day: "today", time: "Today, 06:00", branch: "Forecast", unread: true,
    body: "Conservative forecast: $58,200.00 around 22 Nov 2026, under your $60,000.00 safety level.",
    href: "/forecasting", hrefLabel: "Open forecast",
    record: { ref: "Cash forecast · conservative", kind: "Forecast", status: { label: "Below safety level", tone: "error" }, rows: [["Lowest point", "$58,200.00", "error"], ["Around", "22 Nov 2026"], ["Safety level", "$60,000.00"]] },
  },
  {
    id: "n-paid", type: "financial", icon: "payment", title: "Payment received for INV-2026-0138", day: "yesterday", time: "Yesterday, 11:16", branch: "Central Market", unread: false,
    body: "Golden Lotus Minimart paid $1,250.00 into ABA Business USD. The invoice is no longer overdue.",
    href: "/sales/invoices/INV-2026-0138", hrefLabel: "Open invoice",
    record: { ref: "INV-2026-0138", kind: "Invoice", status: { label: "Paid", tone: "success" }, rows: [["Customer", "Golden Lotus Minimart"], ["Amount", "$1,250.00", "success"], ["Into", "ABA Business USD"]] },
  },
  {
    id: "n-bill", type: "financial", icon: "bill", title: "BILL-0931 is due in 3 days", day: "yesterday", time: "Yesterday, 08:00", branch: "Central Market", unread: false,
    body: "Cambodia Beverage Co. · $1,480.00 due on 2 Nov 2026.",
    href: "/financial-records/bills/BILL-0931", hrefLabel: "Open bill",
    record: { ref: "BILL-0931", kind: "Bill", status: { label: "Open", tone: "sky" }, rows: [["Supplier", "Cambodia Beverage Co."], ["Amount", "$1,480.00"], ["Due", "2 Nov 2026"]] },
  },
  {
    id: "n-out", type: "stock", icon: "package", title: "Vital Water 500ml is out of stock", day: "yesterday", time: "Yesterday, 07:30", branch: "Siem Reap", unread: false,
    body: "Siem Reap has 0 packs left. It last sold on 27 Oct.",
    href: "/inventory/items/vital-water", hrefLabel: "Open item",
  },
  {
    id: "n-shopify", type: "system", icon: "upload", title: "Shopify sync completed", day: "earlier", time: "29 Oct 2026, 18:45", branch: "", unread: false,
    body: "42 orders synced. None need review.",
    href: "/integrations/shopify", hrefLabel: "Open Shopify",
  },
  {
    id: "n-report", type: "reports", icon: "report", title: "September 2026 report is ready", day: "earlier", time: "1 Oct 2026, 08:12", branch: "", unread: false,
    body: "Net profit $12,570.00, up 5.6% on August. 5 insights to review.",
    href: "/monthly-reports", hrefLabel: "Open report",
  },
  {
    id: "n-old-1", type: "reports", icon: "report", title: "August 2026 report is ready", day: "older", time: "1 Sep 2026, 08:10", branch: "", unread: false,
    body: "Net profit $11,900.00, up 3.1% on July. 4 insights to review.",
    href: "/monthly-reports", hrefLabel: "Open report",
  },
  {
    id: "n-old-2", type: "signoff", icon: "scale", title: "Kampot branch deactivated", day: "older", time: "14 Aug 2026, 17:05", branch: "Kampot", unread: false,
    body: "Pisey Chan lost access. History for Kampot is kept.",
    href: "/branches/kampot", hrefLabel: "Open branch",
  },
];

const MANAGER_NOTIFICATIONS: Notification[] = [
  { ...OWNER_NOTIFICATIONS[2], unread: true },
  { ...OWNER_NOTIFICATIONS[3] },
  {
    id: "m-till", type: "signoff", icon: "scale", title: "Till balance signed off", day: "yesterday", time: "Yesterday, 18:42", branch: "Toul Kork", unread: true,
    body: "Sokha Chan signed off your 30 Oct count. No variance.",
    href: "/financial-records/till", hrefLabel: "Open till balance",
  },
  {
    id: "m-recon", type: "signoff", icon: "scale", title: "Reconciliation returned for correction", day: "earlier", time: "29 Oct 2026, 10:12", branch: "Toul Kork", unread: false,
    body: "Sokha Chan returned September 2026 for Wing Merchant KHR: 2 lines are still unmatched (៛164,000).",
    href: "/financial-records/reconciliation", hrefLabel: "Open reconciliation",
  },
  {
    id: "m-bill", type: "financial", icon: "bill", title: "BILL-0930 is due in 3 days", day: "earlier", time: "29 Oct 2026, 08:00", branch: "Toul Kork", unread: false,
    body: "Khmer Fresh Produce · $820.00 due on 1 Nov 2026.",
    href: "/financial-records/bills/BILL-0930", hrefLabel: "Open bill",
  },
  {
    id: "m-report", type: "reports", icon: "report", title: "September 2026 report is ready", day: "earlier", time: "1 Oct 2026, 08:12", branch: "Toul Kork", unread: false,
    body: "The Toul Kork section is available: net profit $4,375.00.",
    href: "/monthly-reports", hrefLabel: "Open report",
  },
  {
    id: "m-old", type: "reports", icon: "report", title: "August 2026 report is ready", day: "older", time: "1 Sep 2026, 08:10", branch: "Toul Kork", unread: false,
    body: "The Toul Kork section is available: net profit $4,120.00.",
    href: "/monthly-reports", hrefLabel: "Open report",
  },
];

export type ChannelPref = { telegram: boolean; email: boolean; rule: number };
export type AlertKey = "overdue" | "bills" | "stock" | "signoff" | "cash" | "budget" | "imports" | "report";

export type NotificationPrefs = {
  alerts: Record<AlertKey, ChannelPref>;
  quiet: boolean;
  quietFrom: string;
  quietUntil: string;
  timezone: string;
  cashThroughQuiet: boolean;
  language: "English" | "Khmer";
  dailySummary: boolean;
  sundaySummary: boolean;
  telegramOn: boolean;
  emailOn: boolean;
};

/** Each alert type: icon tone, title, rule options (the first sentence shown under the title). */
export const ALERT_TYPES: { key: AlertKey; icon: AlertIcon | "target"; title: string; managerTitle?: string; ownerOnly?: boolean; rules: string[]; managerRules?: string[] }[] = [
  { key: "overdue", icon: "invoice", title: "Overdue invoices", rules: ["When an invoice is 1 day overdue, every 7 days after that, and when it is paid.", "When an invoice is 1 day overdue, every 3 days after that, and when it is paid.", "Only on the first day an invoice is overdue, and when it is paid."] },
  { key: "bills", icon: "bill", title: "Bills due soon", rules: ["3 days before a bill’s due date, and on the day it becomes overdue.", "7 days before a bill’s due date, and on the day it becomes overdue.", "Only on the day a bill becomes overdue."] },
  { key: "stock", icon: "package", title: "Low and out of stock", rules: ["When an item falls below its minimum level at a branch.", "Only when an item is out of stock at a branch."] },
  { key: "signoff", icon: "scale", title: "Reconciliation and till sign-off", managerTitle: "Sign-off results", rules: ["When a Branch Manager submits a reconciliation or till balance for your sign-off.", "Only when a submission has a variance."], managerRules: ["When the Business Owner signs off or returns something you submitted.", "Only when something you submitted is returned."] },
  { key: "cash", icon: "alert", title: "Cash warnings", ownerOnly: true, rules: ["When the conservative forecast goes below your safety level of $60,000.00.", "When the conservative forecast goes below your safety level of $50,000.00."] },
  { key: "budget", icon: "target", title: "Budget off target", ownerOnly: true, rules: ["When a month is more than 10% away from its target budget.", "When a month is more than 20% away from its target budget."] },
  { key: "imports", icon: "upload", title: "Imports and sync", rules: ["When a statement import or integration sync finishes or needs review.", "Only when an import or sync needs review or fails."] },
  { key: "report", icon: "report", title: "Monthly report ready", rules: ["When a monthly report has been generated.", "When a monthly report has insights that need your attention."], managerRules: ["When the report for your branch is available.", "When the report for your branch has insights that need your attention."] },
];

export function defaultPrefs(role: Role): NotificationPrefs {
  const alerts: Record<AlertKey, ChannelPref> = {
    overdue: { telegram: true, email: false, rule: 0 },
    bills: { telegram: true, email: true, rule: 0 },
    stock: { telegram: true, email: false, rule: 0 },
    signoff: { telegram: true, email: false, rule: 0 },
    cash: { telegram: role === "owner", email: role === "owner", rule: 0 },
    budget: { telegram: false, email: role === "owner", rule: 0 },
    imports: { telegram: false, email: false, rule: 0 },
    report: { telegram: true, email: true, rule: 0 },
  };
  return { alerts, quiet: true, quietFrom: "21:00", quietUntil: "07:00", timezone: "Phnom Penh (UTC+7)", cashThroughQuiet: true, language: "English", dailySummary: true, sundaySummary: false, telegramOn: true, emailOn: true };
}

export type TelegramLink = { linked: boolean; handle: string; linkedOn: string; delivered: number; lastDelivered: string };

/* ---------- Integrations (15) ---------- */

export type ShopifyStatus = "not_connected" | "syncing" | "connected" | "error";
export type WebillStatus = "not_connected" | "needs_review" | "connected";

export type SyncRun = { id: string; started: string; day: number; type: string; what: string; sub: string; duration: string; result: "completed" | "failed" | "running" | "review" };

export const SHOPIFY_RUNS: SyncRun[] = [
  { id: "r12", started: "31 Oct, 18:45", day: 31, type: "Scheduled", what: "4 new orders", sub: "$51.80 · 0 refunds", duration: "6 s", result: "completed" },
  { id: "r11", started: "31 Oct, 18:30", day: 31, type: "Scheduled", what: "2 new orders", sub: "$23.50 · 0 refunds", duration: "5 s", result: "completed" },
  { id: "r10", started: "31 Oct, 14:10", day: 31, type: "Manual", what: "11 new orders", sub: "$142.30 · 1 refund of $12.00", duration: "9 s", result: "completed" },
  { id: "r9", started: "30 Oct, 23:00", day: 30, type: "Payout", what: "Payout matched to bank line", sub: "$612.40 · fees $18.94 recorded", duration: "3 s", result: "completed" },
  { id: "r8", started: "29 Oct, 18:45", day: 29, type: "Scheduled", what: "42 new orders", sub: "$498.60 · 0 refunds", duration: "14 s", result: "completed" },
  { id: "r7", started: "29 Oct, 12:30", day: 29, type: "Scheduled", what: "9 new orders", sub: "$104.40 · 0 refunds", duration: "7 s", result: "completed" },
  { id: "r6", started: "28 Oct, 18:45", day: 28, type: "Scheduled", what: "16 new orders", sub: "$187.90 · 1 refund of $9.80", duration: "9 s", result: "completed" },
  { id: "r5", started: "28 Oct, 09:15", day: 28, type: "Scheduled", what: "7 new orders", sub: "$88.20 · 0 refunds", duration: "6 s", result: "completed" },
  { id: "r4", started: "27 Oct, 18:45", day: 27, type: "Scheduled", what: "21 new orders", sub: "$256.10 · 1 refund of $14.60", duration: "11 s", result: "completed" },
  { id: "r3", started: "27 Oct, 02:00", day: 27, type: "Scheduled", what: "Could not reach Shopify", sub: "Retried at 02:15 and worked", duration: "30 s", result: "failed" },
  { id: "r2", started: "26 Oct, 23:00", day: 26, type: "Payout", what: "Payout matched to bank line", sub: "$1,034.80 · fees $31.12 recorded", duration: "3 s", result: "completed" },
  { id: "r1", started: "26 Oct, 18:45", day: 26, type: "Scheduled", what: "13 new orders", sub: "$161.70 · 0 refunds", duration: "8 s", result: "completed" },
];

export type UnmappedProduct = { id: string; name: string; sku: string; hint: string; suggestion?: string };

export const UNMAPPED: UnmappedProduct[] = [
  { id: "gift-basket", name: "Gift basket · Pchum Ben", sku: "GFT-PCB-01", hint: "No matching item" },
  { id: "beer-6", name: "Angkor Beer 330ml × 6", sku: "BEV-ANG-330-6", hint: "Similar to BEV-ANG-330", suggestion: "angkor-beer" },
];

export type WebillReview = {
  id: string;
  title: string;
  supplier: string;
  supplierNo: string;
  amount: string;
  existingAmount: string;
  amountDiffers?: boolean;
  billDate: string;
  status: string;
  existingStatus: string;
  billId: string;
  note: string;
  /** For "Record as new bill". */
  newBill: { category: string; branch: string; billDate: string; due: string; currency: "USD" | "KHR"; total: number; paid: number };
};

export const WEBILL_REVIEWS: WebillReview[] = [
  {
    id: "wb-1", title: "Possible duplicate: same supplier, amount and month as BILL-0924", supplier: "Électricité du Cambodge", supplierNo: "EDC-TK-2026-10",
    amount: "៛2,050,000 KHR", existingAmount: "$500.00 USD (≈ ៛2,050,000)", billDate: "12 Oct 2026", status: "Paid 27 Oct 2026", existingStatus: "Paid 27 Oct 2026", billId: "BILL-0924",
    note: "The amounts are the same. Linking keeps one bill and adds the WeBill365 reference to it.",
    newBill: { category: "Utilities", branch: "Toul Kork", billDate: "2026-10-12", due: "2026-10-27", currency: "KHR", total: 2050000, paid: 2050000 },
  },
  {
    id: "wb-2", title: "Amount differs from the bill you recorded", supplier: "Phnom Penh Water Supply", supplierNo: "PPWSA-88104-10",
    amount: "៛319,800 KHR (≈ $78.00)", existingAmount: "$74.20 USD (≈ ៛304,200)", amountDiffers: true, billDate: "8 Oct 2026", status: "Unpaid · due 8 Nov 2026", existingStatus: "Open · due 8 Nov 2026", billId: "BILL-0915",
    note: "The difference is ៛15,600 (≈ $3.80). Correct the bill in LuyFlow first, or link the two as they are.",
    newBill: { category: "Utilities", branch: "Central Market", billDate: "2026-10-08", due: "2026-11-08", currency: "KHR", total: 319800, paid: 0 },
  },
];

export type TeamLink = { id: string; name: string; role: string; connected: boolean; types: string; invited?: boolean };

export const TELEGRAM_TEAM: TeamLink[] = [
  { id: "sokha", name: "Sokha Chan", role: "Business Owner · All branches", connected: true, types: "6 of 8" },
  { id: "dara", name: "Dara Sok", role: "Branch Manager · Toul Kork", connected: true, types: "5 of 6" },
  { id: "bopha", name: "Bopha Keo", role: "Branch Manager · Siem Reap", connected: true, types: "5 of 6" },
  { id: "vannak", name: "Vannak Lim", role: "Branch Manager · Battambang", connected: false, types: "—" },
];

/* ---------- Profile & Settings (17) ---------- */

export type Device = { id: string; name: string; where: string; kind: "desktop" | "phone"; current?: boolean; signedOut?: boolean };

export type Profile = {
  name: string;
  khmerName: string;
  email: string;
  phone: string;
  timezone: string;
  photo?: string;
  lastSignIn: string;
  memberSince: string;
  passwordChanged: string;
  googleLinked: boolean;
  googleLinkedOn: string;
  devices: Device[];
  language: "English" | "Khmer";
  aiLanguage: string;
  invoiceLanguage: string;
  alertLanguage: string;
};

export type BusinessProfile = {
  legalName: string;
  tradingName: string;
  khmerName: string;
  type: string;
  registration: string;
  vat: string;
  address: string;
  phone: string;
  email: string;
  footer: string;
  logo?: string;
};

export type RateRow = { from: string; rate: number; source: string; by: string };

export type CurrencySettings = {
  rateSource: "manual" | "daily";
  displayCurrency: "USD" | "KHR";
  rounding: string;
  showConverted: boolean;
  printBoth: boolean;
  history: RateRow[];
};

export function profileSeed(role: Role): Profile {
  return role === "owner"
    ? {
        name: "Sokha Chan", khmerName: "ចាន់ សុខា", email: "sokha@mekongmart.com.kh", phone: "+855 12 880 142", timezone: "Phnom Penh (UTC+7)",
        lastSignIn: "Today, 08:02 · Phnom Penh", memberSince: "1 Mar 2026 · created the business", passwordChanged: "14 Aug 2026", googleLinked: true, googleLinkedOn: "1 Mar 2026",
        devices: [
          { id: "d1", name: "Chrome on Windows", where: "Phnom Penh, Cambodia · active now", kind: "desktop", current: true },
          { id: "d2", name: "LuyFlow for Android", where: "Galaxy A55 · yesterday, 21:14", kind: "phone" },
        ],
        language: "English", aiLanguage: "The language of my question", invoiceLanguage: "English and Khmer (bilingual)", alertLanguage: "English",
      }
    : {
        name: "Dara Sok", khmerName: "សុខ ដារ៉ា", email: "dara@mekongmart.com.kh", phone: "+855 96 441 205", timezone: "Phnom Penh (UTC+7)",
        lastSignIn: "Today, 07:46 · Phnom Penh", memberSince: "12 Mar 2026 · invited by Sokha Chan", passwordChanged: "2 Sep 2026", googleLinked: false, googleLinkedOn: "",
        devices: [
          { id: "d1", name: "Chrome on Windows", where: "Phnom Penh, Cambodia · active now", kind: "desktop", current: true },
          { id: "d2", name: "LuyFlow for Android", where: "Galaxy A14 · today, 07:46", kind: "phone" },
          { id: "d3", name: "Safari on iPad", where: "Phnom Penh · 26 Oct 2026", kind: "phone" },
        ],
        language: "English", aiLanguage: "The language of my question", invoiceLanguage: "English and Khmer (bilingual)", alertLanguage: "English",
      };
}

export const BUSINESS_SEED: BusinessProfile = {
  legalName: "Mekong Mart Co., Ltd.",
  tradingName: "Mekong Mart",
  khmerName: "មេគង្គ ម៉ាត",
  type: "Retail · mini-marts and wholesale",
  registration: "00045812",
  vat: "L001-901456782",
  address: "No. 86, Street 136, Phsar Kandal I, Daun Penh, Phnom Penh",
  phone: "+855 23 880 142",
  email: "finance@mekongmart.com.kh",
  footer: "Thank you for your business. Please pay by bank transfer to ABA 000 482 148 21 or by KHQR.",
};

export const CURRENCY_SEED: CurrencySettings = {
  rateSource: "manual",
  displayCurrency: "USD",
  rounding: "Nearest ៛100",
  showConverted: true,
  printBoth: true,
  history: [
    { from: "2026-10-01", rate: 4100, source: "Set manually", by: "Sokha Chan" },
    { from: "2026-07-01", rate: 4095, source: "Set manually", by: "Sokha Chan" },
    { from: "2026-04-01", rate: 4080, source: "Set manually", by: "Sokha Chan" },
    { from: "2026-03-01", rate: 4050, source: "At setup", by: "Sokha Chan" },
  ],
};

/* ---------- State ---------- */

export type AdminState = {
  branches: BranchRec[];
  managers: ManagerRec[];
  notifications: Notification[];
  prefs: NotificationPrefs;
  telegram: TelegramLink;
  shopify: { status: ShopifyStatus; store: string; branch: string; payout: string; from: string; frequency: string; connectedOn: string; progress: number; failedAt?: string; unmapped: UnmappedProduct[]; runs: SyncRun[] };
  webill: { status: WebillStatus; merchant: string; account: string; noBranch: string; duplicates: "hold" | "link"; reviews: WebillReview[]; resolved: { id: string; outcome: string }[] };
  team: TeamLink[];
  customerMessages: { invoices: boolean; reminders: boolean; receipts: boolean };
  telegramBusiness: boolean;
  profile: Profile;
  business: BusinessProfile;
  currency: CurrencySettings;
};

export function buildAdminState(role: Role): AdminState {
  return {
    branches: structuredClone(BRANCH_SEED),
    managers: structuredClone(MANAGER_SEED),
    notifications: structuredClone(role === "owner" ? OWNER_NOTIFICATIONS : MANAGER_NOTIFICATIONS),
    prefs: defaultPrefs(role),
    telegram: role === "owner"
      ? { linked: true, handle: "@sokha_mekongmart", linkedOn: "6 Mar 2026", delivered: 21, lastDelivered: "Today, 18:10 · Reconciliation submitted" }
      : { linked: true, handle: "@dara_sok", linkedOn: "14 Mar 2026", delivered: 12, lastDelivered: "Today, 16:58 · Wing statement import finished" },
    shopify: {
      status: "connected", store: "mekongmart", branch: "Central Market", payout: "ABA Business USD •••• 4821", from: "2026-03-01", frequency: "Every 15 minutes", connectedOn: "4 Mar 2026",
      progress: 0, unmapped: structuredClone(UNMAPPED), runs: structuredClone(SHOPIFY_RUNS),
    },
    webill: { status: "needs_review", merchant: "MM-204518", account: "ABA Operating KHR •••• 9034", noBranch: "Ask me to choose", duplicates: "hold", reviews: structuredClone(WEBILL_REVIEWS), resolved: [] },
    team: structuredClone(TELEGRAM_TEAM),
    customerMessages: { invoices: true, reminders: true, receipts: false },
    telegramBusiness: true,
    profile: profileSeed(role),
    business: { ...BUSINESS_SEED },
    currency: structuredClone(CURRENCY_SEED),
  };
}
