/**
 * MOCK data for Banking (section 06) and Financial Records (section 10).
 *
 * Rows that appear in Figma frames are copied exactly. Lists in the design
 * are longer than one page ("Showing 1–8 of 36 bills"), so the rest is
 * generated with a fixed seed, sized so counts and totals match the design.
 * Owner and Branch Manager each get their own copy (see finance-store).
 */
import { addDays, TODAY } from "@/lib/format";
import type { Role } from "@/lib/session";
import type {
  Account,
  Bill,
  Category,
  CategoryRule,
  FinanceState,
  ImportRecord,
  LedgerRow,
  Movement,
  Recon,
  ReviewLine,
  Rule,
  TillRecord,
  Txn,
} from "./finance-types";

export function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
const pick = <T,>(rand: () => number, list: T[]) => list[Math.floor(rand() * list.length)];

/** Splits `total` into `count` random positive parts that add up exactly (to the cent). */
export function split(rand: () => number, total: number, count: number, step = 0.01) {
  const weights = Array.from({ length: count }, () => 0.3 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.round((w / sum) * total / step) * step);
  const diff = total - parts.reduce((a, b) => a + b, 0);
  parts[parts.length - 1] = round2(parts[parts.length - 1] + diff);
  return parts.map(round2);
}

export const BRANCH_NAMES = ["Central Market", "Toul Kork", "Siem Reap", "Battambang"];

export const ACCOUNTS: Account[] = [
  { id: "aba-business-usd", name: "ABA Business USD", kind: "bank", provider: "ABA", last4: "4821", currency: "USD", balance: 24810.55, branch: "Business-wide", status: "active", recon: { label: "Reconciled to 30 Sep", tone: "success" }, opened: "2025-01-14" },
  { id: "aba-operating-khr", name: "ABA Operating KHR", kind: "bank", provider: "ABA", last4: "9034", currency: "KHR", balance: 86420000, branch: "Business-wide", status: "active", recon: { label: "9 lines need review", tone: "warning" }, opened: "2025-01-14" },
  { id: "acleda-savings-usd", name: "ACLEDA Savings USD", kind: "bank", provider: "ACLEDA", last4: "1175", currency: "USD", balance: 31250, branch: "Business-wide", status: "active", recon: { label: "Reconciled to 30 Sep", tone: "success" }, opened: "2025-03-02" },
  { id: "wing-merchant-khr", name: "Wing Merchant KHR", kind: "wallet", provider: "Wing", last4: "0367", currency: "KHR", balance: 12300000, branch: "Toul Kork", status: "active", recon: { label: "Submitted · awaiting sign-off", tone: "sky" }, opened: "2025-06-20" },
  { id: "till-central-market", name: "Cash till · Central Market", kind: "till", provider: "Cash", currency: "USD", balance: 1940, khrBalance: 2260000, branch: "Central Market", status: "active", recon: { label: "Balanced today", tone: "success" }, opened: "2025-01-14" },
  { id: "till-toul-kork", name: "Cash till · Toul Kork", kind: "till", provider: "Cash", currency: "USD", balance: 1280, khrBalance: 1640000, branch: "Toul Kork", status: "active", recon: { label: "Submitted · awaiting sign-off", tone: "sky" }, opened: "2025-06-20" },
  { id: "till-siem-reap", name: "Cash till · Siem Reap", kind: "till", provider: "Cash", currency: "USD", balance: 980, khrBalance: 1100000, branch: "Siem Reap", status: "active", recon: { label: "Submitted · awaiting sign-off", tone: "sky" }, opened: "2025-09-01" },
  { id: "till-battambang", name: "Cash till · Battambang", kind: "till", provider: "Cash", currency: "USD", balance: 670, khrBalance: 740000, branch: "Battambang", status: "active", recon: { label: "Not balanced today", tone: "warning" }, opened: "2026-02-10" },
  { id: "acleda-current-khr", name: "ACLEDA Current KHR", kind: "bank", provider: "ACLEDA", last4: "7702", currency: "KHR", balance: 0, branch: "Business-wide", status: "deactivated", recon: { label: "Deactivated", tone: "neutral" }, opened: "2025-03-02" },
];

/* ---------- Account statements (06.3 / 06.4) ---------- */

const ABA_USD_DESIGNED: Omit<LedgerRow, "balance">[] = [
  { id: "l-1", date: "2026-10-31", description: "Shopify order #10492", ref: "FT26304X7K21", category: "Sales", debit: 0, credit: 184.5, recon: "matched" },
  { id: "l-2", date: "2026-10-30", description: "Payment INV-2026-0138", ref: "FT26303M2Q88", category: "Sales", debit: 0, credit: 1250, recon: "matched" },
  { id: "l-3", date: "2026-10-30", description: "Cambodia Beverage Co. — stock order", ref: "FT26303K9Q24", category: "Inventory purchases", debit: 1320, credit: 0, recon: "matched" },
  { id: "l-4", date: "2026-10-29", description: "Staff wages, week 43", ref: "FT26302P1L07", category: "Payroll", debit: 1180, credit: 0, recon: "matched" },
  { id: "l-5", date: "2026-10-28", description: "Transfer to ACLEDA Savings USD", ref: "FT26301T5N63", category: "Transfer", debit: 2000, credit: 0, recon: "matched" },
  { id: "l-6", date: "2026-10-27", description: "Incoming transfer — to be matched", ref: "FT26300H8R15", category: "Sales", debit: 0, credit: 1000, recon: "review" },
  { id: "l-7", date: "2026-10-26", description: "Smart Axiata — internet and phone", ref: "FT26299C4D90", category: "Internet & phone", debit: 96, credit: 0, recon: "matched" },
  { id: "l-8", date: "2026-10-25", description: "KHQR settlements (38 payments)", ref: "FT26298A2B44", category: "Sales", debit: 0, credit: 1312.4, recon: "matched" },
  { id: "l-9", date: "2026-10-24", description: "Borey Property Management — rent", ref: "FT26297R6S31", category: "Rent", debit: 1200, credit: 0, recon: "matched" },
  { id: "l-10", date: "2026-10-23", description: "Cash deposit — Central Market till", ref: "FT26296D0E72", category: "Transfer", debit: 0, credit: 900, recon: "unmatched" },
];

const CREDIT_TEMPLATES = [
  ["Shopify order #10", "Sales"],
  ["KHQR settlements", "Sales"],
  ["Payment INV-2026-01", "Wholesale invoices"],
  ["Card settlement", "Sales"],
  ["Cash deposit — till", "Transfer"],
] as const;
const DEBIT_TEMPLATES = [
  ["Cambodia Beverage Co. — stock order", "Inventory purchases"],
  ["Khmer Fresh Produce — vegetables", "Inventory purchases"],
  ["Staff wages", "Payroll"],
  ["EDC electricity", "Utilities"],
  ["Phnom Penh Water Supply", "Utilities"],
  ["Total Station — fuel", "Fuel & transport"],
  ["Vattanac Distribution", "Inventory purchases"],
  ["ABA service fee", "Bank fees"],
] as const;

/**
 * Builds a month of statement lines. Designed rows come first (newest);
 * generated rows fill the rest so the totals match `credits` and `debits`.
 */
function buildLedger(
  seed: number,
  closing: number,
  count: number,
  credits: number,
  debits: number,
  designed: Omit<LedgerRow, "balance">[] = [],
  khr = false,
  /** Optional [category, total, count] split for debits, including the designed rows. */
  debitPlan?: [string, number, number][],
): LedgerRow[] {
  const rand = seeded(seed);
  const extra = count - designed.length;
  const dCredit = designed.reduce((s, r) => s + r.credit, 0);
  const dDebit = designed.reduce((s, r) => s + r.debit, 0);
  const step = khr ? 100 : 0.01;
  // Debits either follow the plan (category totals from the design) or are random.
  const debitQueue: { amount: number; category: string }[] = [];
  if (debitPlan) {
    for (const [category, total, count] of debitPlan) {
      const already = designed.filter((r) => r.debit && (r.category === category || (category === "Other" && !debitPlan.some(([c]) => c === r.category))));
      const remaining = round2(total - already.reduce((s, r) => s + r.debit, 0));
      const n = count - already.length;
      const parts = split(rand, remaining, n, step);
      const others = ["Internet & phone", "Bank fees", "Fuel & transport"];
      parts.forEach((amount, i) => debitQueue.push({ amount, category: category === "Other" ? others[i % others.length] : category }));
    }
  }
  const nDebit = debitPlan ? debitQueue.length : Math.round(extra * 0.45);
  const nCredit = extra - nDebit;
  const creditParts = split(rand, credits - dCredit, nCredit, step);
  for (let i = debitQueue.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [debitQueue[i], debitQueue[j]] = [debitQueue[j], debitQueue[i]];
  }
  const debitParts = debitPlan ? debitQueue.map((q) => q.amount) : split(rand, debits - dDebit, nDebit, step);
  const lastDesigned = designed.length ? designed[designed.length - 1].date : addDays(TODAY, 1);
  const days = Math.max(1, Number(lastDesigned.slice(8, 10)) - 1);
  const generated: Omit<LedgerRow, "balance">[] = [];
  let c = 0;
  let d = 0;
  for (let i = 0; i < extra; i++) {
    const isCredit = (c < nCredit && rand() < 0.55) || d >= nDebit;
    const day = Math.max(1, days - Math.floor((i / extra) * days));
    const date = `2026-10-${String(day).padStart(2, "0")}`;
    let [desc, category] = (isCredit ? pick(rand, [...CREDIT_TEMPLATES]) : pick(rand, [...DEBIT_TEMPLATES])) as [string, string];
    if (!isCredit && debitPlan) {
      category = debitQueue[d].category;
      desc = DEBIT_TEMPLATES.find(([, c]) => c === category)?.[0] ?? (category === "Rent" ? "Borey Property Management — rent" : category === "Transfer" ? "Transfer to ACLEDA Savings USD" : category === "Internet & phone" ? "Smart Axiata — internet and phone" : desc);
    }
    const suffix = desc.endsWith("#10") || desc.endsWith("-01") ? String(100 + Math.floor(rand() * 400)) : "";
    generated.push({
      id: `g-${seed}-${i}`,
      date,
      description: `${desc}${suffix}`,
      ref: `FT26${String(270 + day).padStart(3, "0")}${Math.floor(rand() * 1e5).toString(36).toUpperCase().padStart(4, "0")}`,
      category,
      debit: isCredit ? 0 : debitParts[d++],
      credit: isCredit ? creditParts[c++] : 0,
      recon: "matched",
    });
  }
  const rows = [...designed, ...generated];
  let balance = closing;
  return rows.map((row) => {
    const out = { ...row, balance: round2(balance) };
    balance = balance - row.credit + row.debit;
    return out;
  });
}

function buildLedgers(): Record<string, LedgerRow[]> {
  return {
    "aba-business-usd": buildLedger(11, 24810.55, 187, 38420, 35016.45, ABA_USD_DESIGNED, false, [
      ["Inventory purchases", 14820, 38],
      ["Payroll", 7640, 9],
      ["Rent", 4800, 4],
      ["Transfer", 4000, 2],
      ["Utilities", 1890.45, 11],
      ["Other", 1866, 17],
    ]),
    "aba-operating-khr": buildLedger(12, 86420000, 214, 182400000, 171560000, [], true),
    "acleda-savings-usd": buildLedger(13, 31250, 12, 6000, 1250),
    "wing-merchant-khr": buildLedger(14, 12300000, 96, 41820000, 40640000, [], true),
    "till-central-market": buildLedger(15, 1940, 64, 6120, 6045),
    "till-toul-kork": buildLedger(16, 1280, 58, 5240, 5180),
    "till-siem-reap": buildLedger(17, 980, 52, 4310, 4250),
    "till-battambang": buildLedger(18, 670, 44, 3220, 3190),
    "acleda-current-khr": [],
  };
}

/* ---------- Categories and rules (06.5, 10.8) ---------- */

export const CATEGORIES: Category[] = [
  { id: "sales", name: "Sales", kind: "income", color: "#1d33ba", system: true, active: true, usedInOct: 294, aiRules: 6 },
  { id: "wholesale", name: "Wholesale invoices", kind: "income", color: "#0d9488", system: true, active: true, usedInOct: 38, aiRules: 2 },
  { id: "other-income", name: "Other income", kind: "income", color: "#64748b", system: false, active: true, usedInOct: 3, aiRules: 0 },
  { id: "interest", name: "Interest", kind: "income", color: "#f43f5e", system: false, active: true, usedInOct: 1, aiRules: 1 },
  { id: "inventory", name: "Inventory purchases", kind: "expense", color: "#1d33ba", system: true, active: true, usedInOct: 66, aiRules: 9 },
  { id: "payroll", name: "Payroll", kind: "expense", color: "#0d9488", system: false, active: true, usedInOct: 9, aiRules: 2 },
  { id: "rent", name: "Rent", kind: "expense", color: "#ea580c", system: false, active: true, usedInOct: 4, aiRules: 1 },
  { id: "utilities", name: "Utilities", kind: "expense", color: "#0284c7", system: false, active: true, usedInOct: 19, aiRules: 5 },
  { id: "internet", name: "Internet & phone", kind: "expense", color: "#f43f5e", system: false, active: true, usedInOct: 7, aiRules: 2 },
  { id: "fuel", name: "Fuel & transport", kind: "expense", color: "#d97706", system: false, active: true, usedInOct: 11, aiRules: 3 },
  { id: "repairs", name: "Repairs", kind: "expense", color: "#16a34a", system: false, active: true, usedInOct: 5, aiRules: 0 },
  { id: "bank-fees", name: "Bank fees", kind: "expense", color: "#64748b", system: true, active: true, usedInOct: 8, aiRules: 4 },
  { id: "cash-over-short", name: "Cash over/short", kind: "expense", color: "#64748b", system: true, active: true, usedInOct: 7, aiRules: 0 },
  { id: "marketing", name: "Marketing", kind: "expense", color: "#64748b", system: false, active: false, usedInOct: 0, aiRules: 0 },
];

/** Business-wide matching rules for the editable categories (counts match `aiRules`). */
export const CATEGORY_RULES: CategoryRule[] = [
  { id: "cr1", categoryId: "interest", matchType: "STARTS_WITH", matchText: "INTEREST CREDIT", active: true },
  { id: "cr2", categoryId: "payroll", matchType: "CONTAINS", matchText: "SALARY", active: true },
  { id: "cr3", categoryId: "payroll", matchType: "CONTAINS", matchText: "PAYROLL", active: true },
  { id: "cr4", categoryId: "rent", matchType: "CONTAINS", matchText: "BOREY PROPERTY", active: true },
  { id: "cr5", categoryId: "utilities", matchType: "CONTAINS", matchText: "EDC", active: true },
  { id: "cr6", categoryId: "utilities", matchType: "CONTAINS", matchText: "PPWSA", active: true },
  { id: "cr7", categoryId: "utilities", matchType: "STARTS_WITH", matchText: "ELECTRICITE DU CAMBODGE", active: true },
  { id: "cr8", categoryId: "utilities", matchType: "CONTAINS", matchText: "WATER SUPPLY", active: true },
  { id: "cr9", categoryId: "utilities", matchType: "EQUALS", matchText: "CINTRI WASTE", active: false },
  { id: "cr10", categoryId: "internet", matchType: "CONTAINS", matchText: "SMART AXIATA", active: true },
  { id: "cr11", categoryId: "internet", matchType: "CONTAINS", matchText: "CELLCARD", active: true },
  { id: "cr12", categoryId: "fuel", matchType: "CONTAINS", matchText: "TOTAL STATION", active: true },
  { id: "cr13", categoryId: "fuel", matchType: "CONTAINS", matchText: "PTT", active: true },
  { id: "cr14", categoryId: "fuel", matchType: "CONTAINS", matchText: "GRAB", active: true },
];

/** Categories for statement lines also include transfers between own accounts. */
export const LINE_CATEGORIES = [
  "Sales",
  "Wholesale invoices",
  "Other income",
  "Inventory purchases",
  "Payroll",
  "Rent",
  "Utilities",
  "Internet & phone",
  "Fuel & transport",
  "Repairs",
  "Bank fees",
  "Transfer to till",
  "Transfer from till",
  "Transfer",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Inventory purchases": "#1d33ba",
  Payroll: "#0d9488",
  Rent: "#ea580c",
  Transfer: "#0284c7",
  Utilities: "#f43f5e",
  Other: "#64748b",
  "Internet & phone": "#f43f5e",
  Sales: "#1d33ba",
};

const RULES: Rule[] = [
  { id: "r1", accountId: "aba-business-usd", contains: "CAMBODIA BEVERAGE", category: "Inventory purchases", learned: true, active: true },
  { id: "r2", accountId: "aba-business-usd", contains: "SMART AXIATA", category: "Internet & phone", learned: false, active: true },
  { id: "r3", accountId: "aba-business-usd", contains: "BOREY PROPERTY", category: "Rent", learned: false, active: true },
  { id: "r4", accountId: "aba-business-usd", contains: "KHQR", category: "Sales", learned: true, active: true },
  { id: "r5", accountId: "aba-business-usd", contains: "ATM", category: "Transfer", learned: false, active: false },
];

/* ---------- Bills (10.2–10.5) ---------- */

const SUPPLIERS: [string, string][] = [
  ["Cambodia Beverage Co.", "Inventory purchases"],
  ["Khmer Fresh Produce", "Inventory purchases"],
  ["Vattanac Distribution", "Inventory purchases"],
  ["Chip Mong Retail Supply", "Inventory purchases"],
  ["Électricité du Cambodge", "Utilities"],
  ["Phnom Penh Water Supply", "Utilities"],
  ["Smart Axiata", "Internet & phone"],
  ["Borey Property Management", "Rent"],
  ["Total Station", "Fuel & transport"],
];

const created = (date: string, who = "Sokha Chan") => ({ kind: "status" as const, title: "Status changed to Open", meta: `${who} · ${date}, 11:20` });

function simpleBill(
  id: string,
  supplier: string,
  category: string,
  branch: string,
  billDate: string,
  due: string,
  total: number,
  paid: number,
  extra: Partial<Bill> = {},
): Bill {
  return {
    id,
    supplier,
    supplierNo: `${supplier.split(" ")[0].slice(0, 3).toUpperCase()}-${id.slice(5)}${String(total).length}`,
    category,
    branch,
    billDate,
    due,
    currency: "USD",
    lines: [{ description: category === "Inventory purchases" ? "Stock delivery" : `${category} — ${billDate.slice(5, 7) === "10" ? "October" : "September"}`, qty: 1, price: total }],
    vatRate: 0,
    paid,
    stored: null,
    history: [created(billDate.split("-").reverse().join("/"))],
    payments: paid
      ? [{ date: addDays(due, -2), account: "ABA Business USD •••• 4821", method: "Bank transfer", ref: `FT26${id.slice(5)}P`, amount: paid }]
      : [],
    ...extra,
  };
}

function buildBills(role: Role): Bill[] {
  const bill0931: Bill = {
    id: "BILL-0931",
    supplier: "Cambodia Beverage Co.",
    supplierNo: "CBC-118204",
    category: "Inventory purchases",
    branch: "Central Market",
    billDate: "2026-10-19",
    due: "2026-11-02",
    currency: "USD",
    lines: [
      { description: "Angkor Beer 330ml × 24", sub: "BEV-ANG-330 · stock received at Central Market", qty: 96, price: 11.2 },
      { description: "Vital Water 500ml × 12", sub: "BEV-VTL-500 · stock received at Central Market", qty: 120, price: 2.1 },
      { description: "Delivery", sub: "Expense line · Inventory purchases", qty: 1, price: 18.25, kind: "expense" },
    ],
    vatRate: 0.1,
    paid: 0,
    stored: null,
    attachment: "CBC-118204.jpg",
    history: [
      { kind: "status", title: "Status changed to Open", meta: "Sokha Chan · 19 Oct 2026, 11:20" },
      { kind: "ai", title: "Bill read from uploaded document", meta: "Sokha Chan · 19 Oct 2026, 11:16", detail: "9 fields extracted · 2 corrected by you" },
    ],
    payments: [],
  };
  const bill0930 = simpleBill("BILL-0930", "Khmer Fresh Produce", "Inventory purchases", "Toul Kork", "2026-10-25", "2026-11-01", 820, 0);
  const bill0924 = simpleBill("BILL-0924", "Électricité du Cambodge", "Utilities", "Toul Kork", "2026-10-13", "2026-10-27", 500, 500);
  const bill0908 = simpleBill("BILL-0908", "Khmer Fresh Produce", "Inventory purchases", "Toul Kork", "2026-10-15", "2026-10-29", 1850000, 1850000, { currency: "KHR" });
  bill0908.lines = [{ description: "Vegetables and fruit", qty: 1, price: 1850000 }];
  bill0908.payments = [{ date: "2026-10-29", account: "Wing Merchant KHR •••• 0367", method: "Wing transfer", ref: "4471826", amount: 1850000 }];

  if (role === "manager") return [bill0930, bill0924, bill0908];

  const designed: Bill[] = [
    bill0931,
    bill0930,
    simpleBill("BILL-0927", "Borey Property Management", "Rent", "Central Market", "2026-10-22", "2026-11-05", 2400, 1200),
    bill0924,
    simpleBill("BILL-0921", "Smart Axiata", "Internet & phone", "Business-wide", "2026-10-11", "2026-10-25", 96, 96),
    simpleBill("BILL-0918", "Vattanac Distribution", "Inventory purchases", "Siem Reap", "2026-10-10", "2026-10-24", 1150, 0),
    simpleBill("BILL-0915", "Phnom Penh Water Supply", "Utilities", "Central Market", "2026-10-25", "2026-11-08", 74.2, 0),
    simpleBill("BILL-0912", "Chip Mong Retail Supply", "Inventory purchases", "Battambang", "2026-10-30", "2026-11-20", 3120, 0, { stored: "draft" }),
    bill0908,
  ];

  const rand = seeded(31);
  const extra: Bill[] = [];
  // 4 more open bills due after 7 Nov, 22 more paid in October and 1 cancelled (totals from frame 10.2).
  const openTotals = [1980.4, 1240, 1385.4, 540];
  const paidTotals = split(rand, 21480 - 500 - 96 - 451.22, 22);
  let n = 911;
  const nextId = () => {
    const id = `BILL-0${n--}`;
    if (n === 908) n--;
    return id;
  };
  openTotals.forEach((total, i) => {
    const [supplier, category] = SUPPLIERS[(i * 3 + 1) % SUPPLIERS.length];
    extra.push(simpleBill(nextId(), supplier, category, BRANCH_NAMES[i % 4], "2026-10-28", `2026-11-${String(10 + i * 3).padStart(2, "0")}`, total, 0));
  });
  paidTotals.forEach((total, i) => {
    const [supplier, category] = SUPPLIERS[i % SUPPLIERS.length];
    const day = 28 - Math.floor(i * 1.2);
    const due = `2026-10-${String(Math.max(day, 2)).padStart(2, "0")}`;
    extra.push(simpleBill(nextId(), supplier, category, BRANCH_NAMES[i % 4], addDays(due, -14), due, total, total));
  });
  extra.push(simpleBill(nextId(), "Total Station", "Fuel & transport", "Siem Reap", "2026-09-28", "2026-10-12", 210, 0, { stored: "cancelled" }));
  return [...designed, ...extra];
}

/* ---------- Business transactions (10.6, 10.7) ---------- */

type TxnSeed = [string, string, Txn["type"], string, string, string, number, Txn["currency"], Txn["status"]?];

const OWNER_TXNS: TxnSeed[] = [
  ["2026-10-31", "Shopify order #10492", "income", "aba-business-usd", "Central Market", "Sales", 184.5, "USD"],
  ["2026-10-31", "EDC electricity bill", "expense", "aba-operating-khr", "Central Market", "Utilities", -860000, "KHR"],
  ["2026-10-30", "Payment INV-2026-0138", "income", "aba-business-usd", "Central Market", "Sales", 1250, "USD"],
  ["2026-10-30", "Cambodia Beverage Co. — stock order", "expense", "aba-business-usd", "Central Market", "Inventory purchases", -1320, "USD"],
  ["2026-10-29", "Wing transfer 4471826", "expense", "wing-merchant-khr", "Toul Kork", "Inventory purchases", -1850000, "KHR"],
  ["2026-10-29", "Staff wages, week 43", "expense", "aba-business-usd", "Siem Reap", "Payroll", -1180, "USD"],
  ["2026-10-28", "Transfer to ACLEDA Savings USD", "transfer", "aba-business-usd", "Business-wide", "Transfer", -2000, "USD"],
  ["2026-10-27", "Shop sign repair (entered twice)", "expense", "till-battambang", "Battambang", "Repairs", -45, "USD", "reversed"],
];

const MANAGER_TXNS: TxnSeed[] = [
  ["2026-10-31", "Khmer Fresh Produce — vegetables", "expense", "till-toul-kork", "Toul Kork", "Inventory purchases", -48, "USD"],
  ["2026-10-30", "Walk-in sales (till close)", "income", "till-toul-kork", "Toul Kork", "Sales", 402.5, "USD"],
  ["2026-10-29", "Wing transfer 4471826", "expense", "wing-merchant-khr", "Toul Kork", "Uncategorised", -1850000, "KHR", "draft"],
  ["2026-10-28", "Walk-in sales (till close)", "income", "till-toul-kork", "Toul Kork", "Sales", 1960000, "KHR"],
  ["2026-10-27", "Payment INV-2026-0144", "income", "wing-merchant-khr", "Toul Kork", "Sales", 1312000, "KHR"],
  ["2026-10-27", "EDC electricity · BILL-0924", "expense", "aba-operating-khr", "Toul Kork", "Utilities", -2050000, "KHR"],
  ["2026-10-27", "Khmer Fresh Produce — vegetables", "expense", "till-toul-kork", "Toul Kork", "Inventory purchases", -184, "USD"],
  ["2026-10-26", "Walk-in sales (till close)", "income", "till-toul-kork", "Toul Kork", "Sales", 438.5, "USD"],
];

const TXN_TEMPLATES: [string, Txn["type"], string, number, number][] = [
  ["Walk-in sales (till close)", "income", "Sales", 250, 650],
  ["KHQR settlements", "income", "Sales", 400, 1500],
  ["Shopify order #10", "income", "Sales", 40, 260],
  ["Payment INV-2026-01", "income", "Wholesale invoices", 300, 2200],
  ["Khmer Fresh Produce — vegetables", "expense", "Inventory purchases", 60, 260],
  ["Cambodia Beverage Co. — stock order", "expense", "Inventory purchases", 400, 1600],
  ["Staff wages", "expense", "Payroll", 600, 1300],
  ["Total Station — fuel", "expense", "Fuel & transport", 20, 90],
  ["Phnom Penh Water Supply", "expense", "Utilities", 30, 90],
  ["ABA service fee", "expense", "Bank fees", 2, 8],
];

function buildTransactions(role: Role): Txn[] {
  const isManager = role === "manager";
  const seeds = isManager ? MANAGER_TXNS : OWNER_TXNS;
  const total = isManager ? 118 : 502;
  let number = isManager ? 500 : 502;
  const toTxn = (seed: TxnSeed, i: number): Txn => {
    const [date, description, type, accountId, branch, category, amount, currency, status = "posted"] = seed;
    const id = `TXN-2026-10-${String(number).padStart(4, "0")}`;
    number -= isManager ? 4 + (i % 5) : i < 8 ? [1, 4, 11, 6, 0, 2, 9, 8][i] : 1;
    return {
      id,
      date,
      description,
      type,
      accountId,
      branch,
      category,
      amount,
      currency,
      status,
      ref: `FT26${300 + Number(date.slice(8, 10)) - 27}${(i * 7919).toString(36).toUpperCase().padStart(5, "0")}`,
      method: accountId.startsWith("till") ? "Cash" : accountId.startsWith("wing") ? "Wing transfer" : "Bank transfer",
      recon: "matched",
      history: [
        { kind: "import", title: accountId.startsWith("till") ? "Recorded at till close" : "Imported from statement", meta: `${isManager ? "Dara Sok" : "Sokha Chan"} · ${date.slice(8, 10)} Oct 2026, 13:58` },
      ],
    };
  };
  // Fix ids of the designed owner rows so they match the frames.
  const designedIds = isManager
    ? ["0500", "0492", "0481", "0468", "0461", "0458", "0455", "0447"]
    : ["0502", "0501", "0498", "0487", "0481", "0479", "0470", "0462"];
  const rows = seeds.map((seed, i) => ({ ...toTxn(seed, i), id: `TXN-2026-10-${designedIds[i]}` }));
  const cambodia = rows.find((row) => row.id === "TXN-2026-10-0487");
  if (cambodia) {
    cambodia.ref = "FT26303K9Q24";
    cambodia.linked = { label: "BILL-0906 · paid in full", href: "/financial-records/bills" };
    cambodia.history = [
      { kind: "match", title: "Matched to statement line 42", meta: "System · 31 Oct 2026, 17:22" },
      { kind: "edit", title: "Category changed to Inventory purchases", meta: "Sokha Chan · 30 Oct 2026, 14:02", detail: "Was: Uncategorised (AI suggested Inventory purchases, 94%)" },
      { kind: "import", title: "Imported from ABA statement", meta: "Sokha Chan · 30 Oct 2026, 13:58" },
    ];
  }
  const rand = seeded(isManager ? 41 : 42);
  const accounts = isManager ? ["till-toul-kork", "wing-merchant-khr"] : ACCOUNTS.filter((a) => a.status === "active").map((a) => a.id);
  let seq = Number(designedIds[designedIds.length - 1]) - 1;
  for (let i = rows.length; i < total; i++) {
    const [desc, type, category, lo, hi] = pick(rand, TXN_TEMPLATES);
    const accountId = pick(rand, accounts);
    const account = ACCOUNTS.find((a) => a.id === accountId)!;
    const khr = account.currency === "KHR" && account.kind !== "till";
    const usd = round2(lo + rand() * (hi - lo));
    const amount = (type === "income" ? 1 : -1) * (khr ? Math.round((usd * 4100) / 1000) * 1000 : usd);
    const day = Math.max(1, 27 - Math.floor(((i - rows.length) / (total - rows.length)) * 27));
    const suffix = desc.endsWith("#10") || desc.endsWith("-01") ? String(100 + Math.floor(rand() * 400)) : "";
    rows.push({
      id: `TXN-2026-10-${String(Math.max(seq--, 1)).padStart(4, "0")}`,
      date: `2026-10-${String(day).padStart(2, "0")}`,
      description: `${desc}${suffix}`,
      type,
      accountId,
      branch: isManager ? "Toul Kork" : account.branch === "Business-wide" ? pick(rand, BRANCH_NAMES) : account.branch,
      category,
      amount,
      currency: khr ? "KHR" : "USD",
      status: "posted",
      ref: `FT26${270 + day}${Math.floor(rand() * 1e6).toString(36).toUpperCase().padStart(4, "0")}`,
      method: accountId.startsWith("till") ? "Cash" : accountId.startsWith("wing") ? "Wing transfer" : "Bank transfer",
      recon: "matched",
      history: [{ kind: "import", title: "Imported from statement", meta: `${isManager ? "Dara Sok" : "Sokha Chan"} · ${day} Oct 2026, 13:58` }],
    });
  }
  return rows;
}

/* ---------- Till balancing (10.9, 10.10) ---------- */

export const TOUL_KORK_MOVEMENTS: Movement[] = [
  { time: "08:00", label: "Opening float", sub: "Carried from 30 Oct", usd: 1280, khr: 1640000 },
  { time: "09:12–17:40", label: "Cash sales", sub: "9 walk-in sales", usd: 204.5, khr: 918000 },
  { time: "13:05", label: "Cash paid out", sub: "Khmer Fresh Produce · vegetables", usd: -48, khr: 0 },
  { time: "16:30", label: "Deposit to Wing Merchant KHR", sub: "Cash-in 7719", usd: 0, khr: -750000 },
];

const COUNTERS: Record<string, string> = { "Toul Kork": "Dara Sok", "Siem Reap": "Bopha Keo", "Central Market": "Sokha Chan", Battambang: "Vannak Lim" };
const TILL_BASE: Record<string, [number, number]> = { "Toul Kork": [1250, 1600000], "Siem Reap": [920, 1050000], "Central Market": [1880, 2200000], Battambang: [650, 720000] };

function movementsFor(branch: string, usd: number, khr: number): Movement[] {
  return [
    { time: "08:00", label: "Opening float", sub: "Carried from the day before", usd: round2(usd * 0.86), khr: Math.round((khr * 0.88) / 1000) * 1000 },
    { time: "09:00–17:45", label: "Cash sales", sub: `Walk-in sales at ${branch}`, usd: round2(usd * 0.14), khr: Math.round((khr * 0.12) / 1000) * 1000 },
  ];
}

function buildTills(role: Role): TillRecord[] {
  const isManager = role === "manager";
  const records: TillRecord[] = [];
  const variances: Record<string, number> = { "2026-10-27|Toul Kork": 1, "2026-10-20|Siem Reap": -5, "2026-10-15|Battambang": -10 };
  for (let day = 31; day >= 1; day--) {
    const date = `2026-10-${String(day).padStart(2, "0")}`;
    for (const branch of ["Toul Kork", "Siem Reap", "Central Market", "Battambang"]) {
      if (isManager && branch !== "Toul Kork") continue;
      if (day === 31 && branch === "Battambang") continue;
      const [baseUsd, baseKhr] = TILL_BASE[branch];
      const wobble = ((day * 37 + branch.length * 11) % 40) - 20;
      let expectedUsd = round2(baseUsd + wobble * 5);
      let expectedKhr = baseKhr + wobble * 10000;
      let variance = variances[`${date}|${branch}`] ?? 0;
      let status: TillRecord["status"] = "signed";
      let notes = "";
      let movements = movementsFor(branch, expectedUsd, expectedKhr);
      let returnReason: string | undefined;
      let khrVariance = 0;
      if (day === 31 && branch === "Toul Kork") {
        expectedUsd = 1436.5;
        expectedKhr = 1808000;
        variance = -12.5;
        khrVariance = 4000;
        status = isManager ? "draft" : "submitted";
        notes = "USD is short by $12.50: change for a KHR sale was given from the dollar drawer. KHR is over by ៛4,000.";
        movements = TOUL_KORK_MOVEMENTS;
      }
      if (day === 31 && branch === "Siem Reap") {
        expectedUsd = 980;
        expectedKhr = 1100000;
        status = "submitted";
      }
      if (day === 31 && branch === "Central Market") {
        expectedUsd = 1940;
        expectedKhr = 2260000;
      }
      if (day === 30 && branch === "Battambang") {
        expectedUsd = 670;
        expectedKhr = 740000;
        variance = -15;
        status = "returned";
        returnReason = "Please recount the USD drawer and attach the slip for the $15.00 difference.";
      }
      if (day === 30) {
        if (branch === "Toul Kork") [expectedUsd, expectedKhr] = [1280, 1640000];
        if (branch === "Siem Reap") [expectedUsd, expectedKhr] = [905, 1020000];
        if (branch === "Central Market") [expectedUsd, expectedKhr] = [1865, 2140000];
      }
      if (day === 29 && branch === "Toul Kork") [expectedUsd, expectedKhr] = [1105, 1512000];
      const counter = COUNTERS[branch];
      const submittedAt = `${day} Oct 2026, 17:52`;
      records.push({
        id: `till-${branch.toLowerCase().replace(/ /g, "-")}-${date}`,
        date,
        branch,
        countedBy: counter,
        usd: round2(expectedUsd + variance),
        khr: expectedKhr + khrVariance,
        expectedUsd,
        expectedKhr,
        status,
        notes,
        returnReason,
        submittedAt,
        movements,
        history:
          status === "signed"
            ? [
                { kind: "signed", title: "Signed off by Business Owner", meta: `Sokha Chan · ${day} Oct 2026, 19:12` },
                { kind: "submit", title: "Submitted for sign-off", meta: `${counter} · ${submittedAt}` },
                { kind: "start", title: "Count started", meta: `${counter} · ${day} Oct 2026, 17:44` },
              ]
            : status === "returned"
              ? [
                  { kind: "returned", title: "Returned to Branch Manager", meta: `Sokha Chan · ${day} Oct 2026, 19:10`, detail: "Reason: recount USD and attach the slip" },
                  { kind: "submit", title: "Submitted for sign-off", meta: `${counter} · ${submittedAt}` },
                  { kind: "start", title: "Count started", meta: `${counter} · ${day} Oct 2026, 17:44` },
                ]
              : status === "submitted"
                ? [
                    { kind: "submit", title: "Submitted for sign-off", meta: `${counter} · ${submittedAt}` },
                    { kind: "start", title: "Count started", meta: `${counter} · ${day} Oct 2026, 17:44` },
                  ]
                : [{ kind: "start", title: "Count started", meta: `${counter} · ${day} Oct 2026, 17:44` }],
      });
    }
  }
  return records;
}

/* ---------- Reconciliations (10.11–10.13) ---------- */

function wingOctober(role: Role): Recon {
  const isManager = role === "manager";
  const submittedLines: Recon["lines"] = [
    { id: "w1", date: "2026-10-31", description: "KHQR settlement 31/10", sub: "AI match confirmed · 14 walk-in sales", amount: 1246000, kind: "suggested", record: "Walk-in sales · KHQR", recordSub: "14 sales · WS-2026-1071 to 1084", confidence: 96, resolution: "Matched", state: "matched" },
    { id: "w2", date: "2026-10-29", description: "Wing transfer 4471826", sub: "TXN-2026-10-0481 · pays BILL-0908", amount: -1850000, kind: "uncategorised", record: "TXN-2026-10-0481", recordSub: "In LuyFlow · Uncategorised", resolution: "Matched · Inventory purchases", state: "matched" },
    { id: "w3", date: "2026-10-25", description: "Wing fee 10/2026", sub: "New transaction recorded", amount: -18000, kind: "missing", resolution: "Created · Bank fees", state: "matched" },
    { id: "w4", date: "2026-10-22", description: "Wing cash-in 7712", sub: "AI match confirmed · till deposit", amount: 940000, kind: "suggested", record: "Till deposit · Toul Kork", recordSub: "22 Oct · Dara Sok", confidence: 88, resolution: "Matched", state: "matched" },
    { id: "w5", date: "2026-10-12", description: "KHQR settlement 12/10", sub: "Listed twice on the statement", amount: 1020000, kind: "suggested", resolution: "Excluded · duplicate", state: "excluded" },
  ];
  const draftLines: Recon["lines"] = submittedLines.map((line) =>
    line.state === "excluded" ? line : { ...line, state: "todo", resolution: undefined, sub: line.id === "w2" ? "29 Oct 2026" : line.id === "w3" ? "25 Oct 2026" : line.id === "w1" ? "31 Oct 2026" : "22 Oct 2026" },
  );
  return {
    id: "rec-wing-2026-10",
    accountId: "wing-merchant-khr",
    period: "2026-10",
    periodLabel: "October 2026",
    usedBy: "Toul Kork",
    preparedBy: "Dara Sok",
    totalLines: 96,
    autoMatched: 91,
    statementBalance: 12300000,
    currency: "KHR",
    status: isManager ? "draft" : "submitted",
    lines: isManager ? draftLines : submittedLines,
    note: isManager ? "" : "Wing fee recorded as Bank fees. Transfer 4471826 was the payment of BILL-0908 (Khmer Fresh Produce); I set its category to Inventory purchases.",
    submittedAt: isManager ? undefined : "31 Oct 2026, 18:10",
    statementFile: "Wing_statement_Oct.csv",
    history: isManager
      ? [
          { kind: "ai", title: "89 lines matched automatically", meta: "System · 31 Oct 2026, 17:02" },
          { kind: "import", title: "Statement imported", meta: "Dara Sok · 31 Oct 2026, 16:58" },
        ]
      : [
          { kind: "submit", title: "Submitted for sign-off", meta: "Dara Sok · 31 Oct 2026, 18:10" },
          { kind: "ai", title: "89 lines matched automatically", meta: "System · 31 Oct 2026, 17:02" },
          { kind: "import", title: "Statement imported", meta: "Dara Sok · 31 Oct 2026, 16:58" },
        ],
  };
}

function wingSeptember(): Recon {
  return {
    id: "rec-wing-2026-09",
    accountId: "wing-merchant-khr",
    period: "2026-09",
    periodLabel: "September 2026",
    usedBy: "Toul Kork",
    preparedBy: "Dara Sok",
    totalLines: 90,
    autoMatched: 88,
    statementBalance: 11480000,
    currency: "KHR",
    status: "returned",
    lines: [
      { id: "s1", date: "2026-09-21", description: "Wing cash-in 6688", sub: "No matching till deposit", amount: 70000, kind: "missing", state: "todo" },
      { id: "s2", date: "2026-09-14", description: "Wing cash-in 6621", sub: "No matching till deposit", amount: 94000, kind: "missing", state: "todo" },
    ],
    note: "Two cash-in lines could not be matched to a till deposit.",
    returnReason: "Two lines are still unmatched (៛164,000 in total). Please match or explain them and resubmit.",
    submittedAt: "2 Oct 2026, 16:40",
    statementFile: "Wing_statement_Sep.csv",
    history: [
      { kind: "returned", title: "Returned to Branch Manager", meta: "Sokha Chan · 29 Oct 2026, 10:12", detail: "2 unmatched lines · ៛164,000" },
      { kind: "submit", title: "Submitted for sign-off", meta: "Dara Sok · 2 Oct 2026, 16:40" },
      { kind: "ai", title: "86 lines matched automatically", meta: "System · 2 Oct 2026, 16:02" },
      { kind: "import", title: "Statement imported", meta: "Dara Sok · 2 Oct 2026, 15:58" },
    ],
  };
}

function ownerDraft(id: string, accountId: string, total: number, autoMatched: number, balance: number, currency: "USD" | "KHR", lines: Recon["lines"], file: string): Recon {
  return {
    id,
    accountId,
    period: "2026-10",
    periodLabel: "October 2026",
    usedBy: "Business-wide",
    preparedBy: "Sokha Chan",
    totalLines: total,
    autoMatched,
    statementBalance: balance,
    currency,
    status: "draft",
    lines,
    note: "",
    statementFile: file,
    history: [
      { kind: "ai", title: `${autoMatched} lines matched automatically`, meta: "System · 31 Oct 2026, 17:44" },
      { kind: "import", title: "Statement imported", meta: "Sokha Chan · 31 Oct 2026, 17:42" },
    ],
  };
}

function signedRecon(accountId: string, period: string, label: string, lines: number, usedBy: string, preparedBy: string, balance: number, currency: "USD" | "KHR"): Recon {
  return {
    id: `rec-${accountId}-${period}`,
    accountId,
    period,
    periodLabel: label,
    usedBy,
    preparedBy,
    totalLines: lines,
    autoMatched: lines,
    statementBalance: balance,
    currency,
    status: "signed",
    lines: [],
    note: "All lines matched automatically.",
    submittedAt: `2 ${label.split(" ")[0].slice(0, 3)} 2026, 09:40`,
    statementFile: `${accountId}_${period}.csv`,
    history: [
      { kind: "signed", title: "Signed off by Business Owner", meta: `Sokha Chan · ${label}` },
      { kind: "submit", title: "Submitted for sign-off", meta: `${preparedBy} · ${label}` },
    ],
  };
}

function buildRecons(role: Role): Recon[] {
  if (role === "manager") return [wingOctober(role), wingSeptember()];
  const abaKhr = ownerDraft(
    "rec-aba-operating-khr-2026-10",
    "aba-operating-khr",
    214,
    202,
    86420000,
    "KHR",
    [
      { id: "k1", date: "2026-10-28", description: "TRF TO 000 882 114 SOK P.", sub: "28 Oct 2026", amount: -1200000, kind: "uncategorised", record: "TXN-2026-10-0493", recordSub: "In LuyFlow · Uncategorised", state: "todo" },
      { id: "k2", date: "2026-10-23", description: "TRF FROM 001 334 870", sub: "23 Oct 2026", amount: 2870000, kind: "missing", state: "todo" },
      { id: "k3", date: "2026-10-13", description: "TRF TO 000 415 660 CHEA V.", sub: "13 Oct 2026", amount: -480000, kind: "missing", state: "todo" },
    ],
    "ABA_statement_Oct.csv",
  );
  const abaUsd = ownerDraft(
    "rec-aba-business-usd-2026-10",
    "aba-business-usd",
    187,
    185,
    24810.55,
    "USD",
    [
      { id: "u1", date: "2026-10-27", description: "Incoming transfer — to be matched", sub: "27 Oct 2026", amount: 1000, kind: "suggested", record: "Payment INV-2026-0141", recordSub: "Angkor Wholesale Trading · partial", confidence: 74, state: "todo" },
      { id: "u2", date: "2026-10-23", description: "Cash deposit — Central Market till", sub: "23 Oct 2026", amount: 900, kind: "missing", state: "todo" },
    ],
    "ABA_USD_Oct2026.xlsx",
  );
  const sep: Recon[] = [
    signedRecon("aba-operating-khr", "2026-09", "September 2026", 208, "Business-wide", "Sokha Chan", 79860000, "KHR"),
    signedRecon("acleda-savings-usd", "2026-09", "September 2026", 12, "Business-wide", "Sokha Chan", 26500, "USD"),
    signedRecon("aba-business-usd", "2026-09", "September 2026", 176, "Business-wide", "Sokha Chan", 21407, "USD"),
  ];
  const older: Recon[] = [];
  const months: [string, string][] = [
    ["2026-08", "August 2026"],
    ["2026-07", "July 2026"],
    ["2026-06", "June 2026"],
    ["2026-05", "May 2026"],
    ["2026-04", "April 2026"],
    ["2026-03", "March 2026"],
  ];
  const rand = seeded(51);
  for (const [period, label] of months) {
    for (const [accountId, usedBy, by, currency] of [
      ["wing-merchant-khr", "Toul Kork", "Dara Sok", "KHR"],
      ["aba-operating-khr", "Business-wide", "Sokha Chan", "KHR"],
      ["acleda-savings-usd", "Business-wide", "Sokha Chan", "USD"],
      ["aba-business-usd", "Business-wide", "Sokha Chan", "USD"],
    ] as const) {
      if (older.length >= 21) break;
      older.push(signedRecon(accountId, period, label, 60 + Math.floor(rand() * 150), usedBy, by, currency === "KHR" ? 10000000 + Math.floor(rand() * 7e7) : 15000 + round2(rand() * 15000), currency));
    }
  }
  return [wingOctober(role), abaKhr, abaUsd, wingSeptember(), ...sep, ...older];
}

/* ---------- Imports, uncategorised and AI review (06.6–06.9) ---------- */

function buildImports(role: Role): ImportRecord[] {
  const designed: ImportRecord[] = [
    { id: "imp-24", importedAt: "2026-10-31T17:42", period: "1–31 Oct 2026", accountId: "aba-operating-khr", file: "ABA_statement_Oct.csv", by: "Sokha Chan", lines: 214, status: "review", note: "9 lines need review" },
    { id: "imp-23", importedAt: "2026-10-31T17:20", period: "1–31 Oct 2026", accountId: "aba-business-usd", file: "ABA_USD_Oct2026.xlsx", by: "Sokha Chan", lines: 187, status: "completed" },
    { id: "imp-22", importedAt: "2026-10-31T16:58", period: "1–31 Oct 2026", accountId: "wing-merchant-khr", file: "Wing_statement_Oct.csv", by: "Dara Sok", lines: 96, status: "completed" },
    { id: "imp-21", importedAt: "2026-10-02T09:10", period: "1–30 Sep 2026", accountId: "acleda-savings-usd", file: "ACLEDA_Sep2026.xlsx", by: "Sokha Chan", lines: 12, status: "completed" },
    { id: "imp-20", importedAt: "2026-10-02T09:02", period: "1–30 Sep 2026", accountId: "aba-operating-khr", file: "ABA_KHR_Sep2026.csv", by: "Sokha Chan", lines: 208, status: "completed" },
    { id: "imp-19", importedAt: "2026-10-02T08:40", period: "1–30 Sep 2026", accountId: "wing-merchant-khr", file: "Wing_statement_Sep.csv", by: "Dara Sok", lines: 90, status: "completed" },
    { id: "imp-18", importedAt: "2026-10-01T18:31", period: "1–30 Sep 2026", accountId: "wing-merchant-khr", file: "Wing_Sep.pdf", by: "Dara Sok", lines: 0, status: "failed", note: "Unsupported format" },
    { id: "imp-17", importedAt: "2026-10-01T18:05", period: "1–30 Sep 2026", accountId: "aba-business-usd", file: "ABA_USD_Sep2026.xlsx", by: "Sokha Chan", lines: 176, status: "completed" },
  ];
  if (role === "manager") {
    return [
      { id: "imp-m3", importedAt: "2026-10-31T16:58", period: "1–31 Oct 2026", accountId: "wing-merchant-khr", file: "Wing_statement_Oct.csv", by: "Dara Sok", lines: 96, status: "review", note: "3 lines need review" },
      designed[5],
      designed[6],
    ];
  }
  const older: ImportRecord[] = [];
  const months = [
    ["2026-09-01", "1–31 Aug 2026", "Aug"],
    ["2026-08-01", "1–31 Jul 2026", "Jul"],
    ["2026-07-01", "1–30 Jun 2026", "Jun"],
    ["2026-06-02", "1–31 May 2026", "May"],
  ];
  const rand = seeded(61);
  let n = 16;
  for (const [date, period, month] of months) {
    for (const accountId of ["aba-business-usd", "aba-operating-khr", "acleda-savings-usd", "wing-merchant-khr"]) {
      const account = ACCOUNTS.find((a) => a.id === accountId)!;
      older.push({
        id: `imp-${n--}`,
        importedAt: `${date}T09:${String(10 + Math.floor(rand() * 40)).padStart(2, "0")}`,
        period,
        accountId,
        file: `${account.provider}_${account.currency}_${month}2026.${rand() > 0.5 ? "csv" : "xlsx"}`,
        by: accountId.startsWith("wing") ? "Dara Sok" : "Sokha Chan",
        lines: accountId.startsWith("acleda") ? 10 + Math.floor(rand() * 5) : 80 + Math.floor(rand() * 130),
        status: "completed",
      });
    }
  }
  return [...designed, ...older];
}

const line = (
  id: string,
  date: string,
  description: string,
  accountId: string,
  branch: string,
  amount: number,
  suggestion: string | null,
  confidence: number | null,
): ReviewLine => ({ id, date, description, accountId, branch, amount, currency: "KHR", suggestion, confidence, chosen: null, accepted: false });

function buildUncategorised(role: Role): ReviewLine[] {
  if (role === "manager") {
    return [
      line("m1", "2026-10-29", "WING TRANSFER 4471826", "wing-merchant-khr", "Toul Kork", -1850000, null, null),
      line("m2", "2026-10-24", "WING PAY KHMER FRESH PROD", "wing-merchant-khr", "Toul Kork", -754400, "Inventory purchases", 74),
      line("m3", "2026-10-18", "WING PAY SMART TOPUP", "wing-merchant-khr", "Toul Kork", -41000, "Internet & phone", 68),
    ];
  }
  return [
    line("u1", "2026-10-28", "TRF TO 000 882 114 SOK P.", "aba-operating-khr", "Central Market", -1200000, "Payroll", 71),
    line("u2", "2026-10-27", "ATM WDL 0238 ORUSSEY", "aba-operating-khr", "Central Market", -800000, "Transfer to till", 58),
    line("u3", "2026-10-26", "CASH DEP BR 014", "aba-operating-khr", "Siem Reap", 3400000, "Transfer from till", 62),
    line("u4", "2026-10-24", "POS 4412 TOTAL STATION", "aba-operating-khr", "Battambang", -328000, "Fuel & transport", 66),
    line("u5", "2026-10-23", "TRF FROM 001 334 870", "aba-operating-khr", "Central Market", 2870000, null, null),
    line("u6", "2026-10-21", "CHQ 000418 PAID", "aba-operating-khr", "Siem Reap", -2460000, "Repairs", 57),
    line("u7", "2026-10-17", "POS 7730 PHSAR DEPO", "aba-operating-khr", "Central Market", -186000, "Inventory purchases", 61),
    line("u8", "2026-10-13", "TRF TO 000 415 660 CHEA V.", "aba-operating-khr", "Battambang", -480000, null, null),
    line("u9", "2026-10-08", "FEE SMS BANKING", "aba-operating-khr", "Central Market", -20500, "Bank fees", 78),
  ];
}

export function buildFinanceState(role: Role): FinanceState {
  const isManager = role === "manager";
  const accounts = isManager
    ? ACCOUNTS.filter((a) => a.branch === "Toul Kork").map((a) =>
        a.id === "wing-merchant-khr"
          ? { ...a, recon: { label: "3 lines need review", tone: "warning" as const } }
          : a.id === "till-toul-kork"
            ? { ...a, recon: { label: "Not balanced today", tone: "warning" as const } }
            : a,
      )
    : ACCOUNTS;
  return {
    accounts,
    ledgers: buildLedgers(),
    transactions: buildTransactions(role),
    bills: buildBills(role),
    categories: CATEGORIES,
    categoryRules: CATEGORY_RULES,
    rules: RULES,
    tills: buildTills(role),
    recons: buildRecons(role),
    imports: buildImports(role),
    uncategorised: buildUncategorised(role),
    review: isManager
      ? { file: "Wing_statement_Oct.csv", accountId: "wing-merchant-khr", period: "1–31 Oct 2026", read: 96, highConfidence: 92, duplicates: 1, acceptedHigh: false }
      : { file: "ABA_statement_Oct.csv", accountId: "aba-operating-khr", period: "1–31 Oct 2026", read: 214, highConfidence: 202, duplicates: 3, acceptedHigh: false },
    nextIds: { bill: 932, txn: 503 },
  };
}
