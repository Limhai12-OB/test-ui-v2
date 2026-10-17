/**
 * Data Import (section 16). The wizard walks through one scripted file,
 * "Expenses_Jan-Mar_2026.xlsx" (3 sheets, 214 rows), so every step's figures
 * match frames 16.3–16.11. Rows are generated deterministically around the
 * rows the design shows, and the totals are fixed to the designed ones.
 */

export type ImportTypeId = "sales" | "expenses" | "customers" | "suppliers" | "items" | "bills" | "bank" | "stock";

export type ImportType = {
  id: ImportTypeId;
  label: string;
  sub: string;
  /** Types that have their own import screen elsewhere in the app. */
  href?: string;
  /** Shown to Branch Managers (frame 16.13). */
  manager: boolean;
  owner: boolean;
};

export const IMPORT_TYPES: ImportType[] = [
  { id: "sales", label: "Sales", sub: "Daily sales or invoices", manager: true, owner: true },
  { id: "expenses", label: "Expenses", sub: "Past spending from a ledger or file", manager: true, owner: true },
  { id: "customers", label: "Customers", sub: "Names, contacts, opening balances", manager: false, owner: true },
  { id: "suppliers", label: "Suppliers", sub: "Names, contacts and payment terms", manager: false, owner: true },
  { id: "items", label: "Items", sub: "Catalogue with prices and stock", href: "/inventory/import", manager: false, owner: true },
  { id: "bills", label: "Bills", sub: "Supplier bills as PDF, photo or list", href: "/financial-records/bills/new", manager: false, owner: true },
  { id: "bank", label: "Bank statements", sub: "CSV or Excel from ABA, ACLEDA, Wing", href: "/banking/import", manager: true, owner: true },
  { id: "stock", label: "Stock counts", sub: "Counted quantities for your branch", href: "/inventory/import", manager: true, owner: false },
];

/** Columns of the downloadable templates. */
export const TEMPLATES: Record<ImportTypeId, string[][]> = {
  sales: [["Date", "Customer", "Item", "Quantity", "Unit price", "Currency", "Branch", "Payment method"]],
  expenses: [["Date", "Supplier", "Description", "Amount", "Currency", "Category", "Branch", "Paid from account", "Remark"], ["02/01/2026", "Borey Property Management", "Rent Jan - main shop", "2400.00", "USD", "Rent", "Central Market", "ABA Business USD", ""]],
  customers: [["Name", "Phone", "Email", "Address", "Opening balance", "Currency", "Payment terms (days)"]],
  suppliers: [["Name", "Phone", "Email", "Address", "Payment terms (days)", "Default category"]],
  items: [["Name", "SKU", "Category", "Unit", "Cost price", "Selling price", "Currency", "Stock", "Reorder at", "Branch"]],
  bills: [["Bill number", "Supplier", "Bill date", "Due date", "Amount", "Currency", "Category", "Branch"]],
  bank: [["Date", "Description", "Money in", "Money out", "Balance", "Reference"]],
  stock: [["SKU", "Item", "Counted quantity", "Count date"]],
};

/* ---------- Import history ---------- */

export type ImportStatus = "completed" | "review" | "failed" | "undone";
export type HistoryRow = {
  id: string;
  at: string;
  type: string;
  file: string;
  rows: number;
  note: string;
  status: ImportStatus;
  by: string;
  branch: string;
  /** Imports made with this wizard can be undone; they carry the created transaction ids. */
  ref?: string;
  undoUntil?: string;
  href?: string;
  /** Summary shown on the result screen (frame 16.11) for imports made with the wizard. */
  result?: ImportResult;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  leftOut: { where: string; supplier: string; sub: string; amount: string; reason: string }[];
  suppliers: number;
  categories: number;
  marchCount: number;
  seconds: number;
  finishedAt: string;
  emailed?: string;
};

const DESIGNED_HISTORY: HistoryRow[] = [
  { id: "h-31", at: "31 Oct 2026, 17:58", type: "Items", file: "items-oct-2026.xlsx", rows: 49, note: "46 created · 3 duplicates skipped", status: "completed", by: "Sokha Chan", branch: "All branches", href: "/inventory" },
  { id: "h-30", at: "31 Oct 2026, 17:42", type: "Bank statement", file: "ABA_statement_Oct.csv", rows: 214, note: "9 need review · 3 duplicates left out", status: "review", by: "Sokha Chan", branch: "Business-wide", href: "/banking/uncategorised" },
  { id: "h-29", at: "31 Oct 2026, 17:20", type: "Bank statement", file: "ABA_USD_Oct2026.xlsx", rows: 187, note: "187 imported", status: "completed", by: "Sokha Chan", branch: "Business-wide", href: "/banking/imports" },
  { id: "h-28", at: "31 Oct 2026, 16:58", type: "Bank statement", file: "Wing_statement_Oct.csv", rows: 96, note: "96 imported · 3 need review", status: "review", by: "Dara Sok", branch: "Toul Kork", href: "/banking/imports" },
  { id: "h-27", at: "27 Oct 2026, 16:31", type: "Bills", file: "EDC_bill_scan.pdf", rows: 1, note: "Could not read the scan", status: "failed", by: "Sokha Chan", branch: "Toul Kork" },
  { id: "h-26", at: "22 Oct 2026, 08:40", type: "Sales", file: "TK_walkin_sales_wk42.xlsx", rows: 312, note: "312 imported", status: "completed", by: "Dara Sok", branch: "Toul Kork", href: "/sales/walk-in" },
  { id: "h-25", at: "9 Oct 2026, 12:15", type: "Stock count", file: "TK_stock_count_Oct.xlsx", rows: 64, note: "61 imported · 3 skipped", status: "completed", by: "Dara Sok", branch: "Toul Kork", href: "/inventory/stock" },
];

const MANAGER_EXTRA: HistoryRow[] = [
  { id: "h-m2", at: "2 Oct 2026, 08:40", type: "Bank statement", file: "Wing_statement_Sep.csv", rows: 90, note: "90 imported", status: "completed", by: "Dara Sok", branch: "Toul Kork", href: "/banking/imports" },
  { id: "h-m1", at: "1 Oct 2026, 18:31", type: "Bank statement", file: "Wing_Sep.pdf", rows: 0, note: "Unsupported format", status: "failed", by: "Dara Sok", branch: "Toul Kork" },
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Older imports so the history has the designed totals (31 for the owner, 14 for Toul Kork). */
function olderHistory(): HistoryRow[] {
  const rand = seeded(16);
  const kinds: [string, string, string][] = [
    ["Sales", "TK_walkin_sales_wk{n}.xlsx", "Toul Kork"],
    ["Bank statement", "ABA_USD_{m}2026.xlsx", "Business-wide"],
    ["Sales", "CM_walkin_sales_wk{n}.xlsx", "Central Market"],
    ["Expenses", "SR_expenses_{m}.xlsx", "Siem Reap"],
    ["Stock count", "TK_stock_count_{m}.xlsx", "Toul Kork"],
    ["Bank statement", "Wing_statement_{m}.csv", "Toul Kork"],
  ];
  const months = ["Sep", "Aug", "Jul", "Jun", "May", "Apr"];
  const out: HistoryRow[] = [];
  for (let i = 0; i < 24; i++) {
    const [type, pattern, branch] = kinds[i % kinds.length];
    const mi = Math.floor(i / 4);
    const m = months[mi];
    const day = 28 - ((i * 5) % 26);
    const rows = Math.round(40 + rand() * 260);
    const file = pattern.replace("{m}", m).replace("{n}", String(41 - i));
    const by = branch === "Toul Kork" ? "Dara Sok" : branch === "Siem Reap" ? "Bopha Keo" : "Sokha Chan";
    out.push({ id: `h-o${i}`, at: `${day} ${m} 2026, ${String(8 + (i % 9)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`, type, file, rows, note: `${rows} imported`, status: "completed", by, branch });
  }
  return out;
}

export function seedHistory(role: "owner" | "manager", branch = "Toul Kork"): HistoryRow[] {
  const older = olderHistory();
  if (role === "manager") {
    const mine = [...DESIGNED_HISTORY, ...MANAGER_EXTRA, ...older].filter((h) => h.by === "Dara Sok" && h.branch === branch && h.type !== "Items");
    return mine.slice(0, 14);
  }
  return [...DESIGNED_HISTORY, ...older];
}

/* ---------- The sample file ---------- */

export const SAMPLE_FILE = { name: "Expenses_Jan-Mar_2026.xlsx", size: 86 * 1024, rows: 214, sheets: ["Jan", "Feb", "Mar"] };
export const SHEETS = [
  { id: "Jan", rows: 73, totalRow: 73, total: "TOTAL JAN 18,420.75" },
  { id: "Feb", rows: 68, totalRow: 68, total: "TOTAL FEB 17,905.20" },
  { id: "Mar", rows: 73 },
] as const;

export type BranchName = "Central Market" | "Toul Kork" | "Siem Reap" | "Battambang" | "Business-wide" | "Kampot";
export type Cur = "USD" | "KHR" | "THB";

export type ImportRow = {
  id: string;
  sheet: "Jan" | "Feb" | "Mar";
  row: number;
  date: string;
  supplier: string;
  description: string;
  category: string;
  branch: BranchName;
  account: string;
  amount: number;
  currency: Cur;
  /** What the cell said in the file (frame 16.9 "Show original values"). */
  original: { date: string; supplier: string; amount: string; branch: string };
  kind: "ready" | "repeat" | "existing" | "error";
  /** To-check reason (16 rows): currency or date that AI suggested. */
  check?: { kind: "currency" | "date"; inFile: string; suggestion: string; confidence: number };
  /** Light AI note shown under the description in the review table. */
  note?: string;
  /** Duplicate details (13 rows). */
  dup?: { of: string; ofLabel: string; ofDate: string; ofAmount: string; ofDetail: string; reason: string; match: number };
  error?: ErrorId;
};

export type ErrorId = "vattanac" | "chipmong" | "thb" | "kampot";

const SUPPLIERS: { name: string; file: string; desc: string; category: string; cur: "USD" | "KHR"; weight: number }[] = [
  { name: "Cambodia Beverage Co.", file: "CBC", desc: "Beer + water", category: "Inventory purchases", cur: "USD", weight: 6 },
  { name: "Khmer Fresh Produce", file: "Khmer Fresh Produce", desc: "បន្លែ", category: "Inventory purchases", cur: "KHR", weight: 5 },
  { name: "Vattanac Distribution", file: "Vattanac", desc: "Stock order", category: "Inventory purchases", cur: "USD", weight: 4 },
  { name: "Électricité du Cambodge", file: "EDC", desc: "Electricity", category: "Utilities", cur: "KHR", weight: 3 },
  { name: "Phnom Penh Water Supply", file: "PPWSA", desc: "Water", category: "Utilities", cur: "KHR", weight: 2 },
  { name: "Smart Axiata", file: "Smart", desc: "Internet", category: "Internet & phone", cur: "USD", weight: 2 },
  { name: "Chip Mong Retail Supply", file: "Chip Mong", desc: "Shelving and bags", category: "Inventory purchases", cur: "USD", weight: 3 },
  { name: "Total Energies Cambodia", file: "Total", desc: "Fuel delivery van", category: "Fuel & transport", cur: "KHR", weight: 3 },
  { name: "Staff salaries", file: "Salary", desc: "Payroll", category: "Payroll", cur: "USD", weight: 3 },
  { name: "Angkor Ice Factory", file: "Ice", desc: "Ice", category: "Inventory purchases", cur: "KHR", weight: 2 },
  { name: "ABA Bank", file: "ABA fee", desc: "Bank fee", category: "Bank fees", cur: "USD", weight: 1 },
  { name: "Sok Repair Service", file: "Sok repair", desc: "Fridge repair", category: "Repairs", cur: "USD", weight: 1 },
];

const fmtShort = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar"][m - 1]} ${y}`;
};
const toSlash = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const iso = (sheet: "Jan" | "Feb" | "Mar", day: number) => `2026-${String(["Jan", "Feb", "Mar"].indexOf(sheet) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const khr = (n: number) => `៛${n.toLocaleString("en-US")}`;
export const amountLabel = (n: number, cur: Cur) => (cur === "USD" ? usd(n) : cur === "KHR" ? khr(n) : `${n.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB`);

const ACCOUNT_FOR = (cur: Cur, branch: BranchName) => (cur === "KHR" ? (branch === "Toul Kork" ? "wing-merchant-khr" : "aba-operating-khr") : "aba-business-usd");

/** Builds the 212 expense rows of the sample file. */
function buildRows(): ImportRow[] {
  const rows: ImportRow[] = [];
  const add = (r: Omit<ImportRow, "id" | "account" | "original"> & { original?: Partial<ImportRow["original"]> }) => {
    rows.push({
      ...r,
      id: `${r.sheet}-${r.row}`,
      account: ACCOUNT_FOR(r.currency, r.branch),
      original: {
        date: r.original?.date ?? toSlash(r.date),
        supplier: r.original?.supplier ?? r.supplier,
        amount: r.original?.amount ?? (r.currency === "KHR" ? r.amount.toLocaleString("en-US") : r.amount.toFixed(2)),
        branch: r.original?.branch ?? r.branch,
      },
    });
  };

  // Rows the frames show.
  add({ sheet: "Jan", row: 1, date: "2026-01-02", supplier: "Borey Property Management", description: "Rent Jan - main shop", category: "Rent", branch: "Central Market", amount: 2400, currency: "USD", kind: "ready", original: { date: "02/01/2026", supplier: "Borey Property", amount: "$2,400.00", branch: "Central" } });
  add({ sheet: "Jan", row: 2, date: "2026-01-03", supplier: "Électricité du Cambodge", description: "Electricity Dec", category: "Utilities", branch: "Toul Kork", amount: 1480000, currency: "KHR", kind: "ready", note: "Supplier matched from “E.D.C”", original: { date: "2026-01-03", supplier: "E.D.C", amount: "៛1,480,000", branch: "TK" } });
  add({ sheet: "Jan", row: 3, date: "2026-01-14", supplier: "Khmer Fresh Produce", description: "បន្លែ", category: "Inventory purchases", branch: "Toul Kork", amount: 120000, currency: "KHR", kind: "ready", note: "Currency confirmed by you", check: { kind: "currency", inFile: "120,000 · paid by Cash", suggestion: "KHR", confidence: 88 }, original: { date: "១៤ មករា ២០២៦", amount: "១២០,០០០", branch: "Toul kok" } });
  add({ sheet: "Jan", row: 4, date: "2026-01-05", supplier: "Cambodia Beverage Co.", description: "Beer + water", category: "Inventory purchases", branch: "Central Market", amount: 1320.5, currency: "USD", kind: "ready", note: "1 repeated row skipped", original: { supplier: "Cambodia Beverage", amount: "1,320.50", branch: "Central" } });
  add({ sheet: "Jan", row: 5, date: "2026-01-05", supplier: "Cambodia Beverage Co.", description: "Beer + water", category: "Inventory purchases", branch: "Central Market", amount: 1320.5, currency: "USD", kind: "repeat", dup: { of: "Jan-4", ofLabel: "Jan · row 4", ofDate: "5 Jan 2026", ofAmount: "$1,320.50", ofDetail: "Beer + water · inv 117840", reason: "Same date, supplier, amount and remark as the row before it", match: 99 }, original: { supplier: "Cambodia Beverage", amount: "1,320.50", branch: "Central" } });
  add({ sheet: "Jan", row: 6, date: "2026-01-07", supplier: "Smart Axiata", description: "Internet", category: "Internet & phone", branch: "Business-wide", amount: 96, currency: "USD", kind: "ready", note: "Category suggested by AI · 97%", original: { supplier: "Smart", amount: "96", branch: "All" } });
  add({ sheet: "Jan", row: 42, date: "2026-01-21", supplier: "Angkor Ice Factory", description: "Ice delivery", category: "Inventory purchases", branch: "Central Market", amount: 45, currency: "USD", kind: "ready", check: { kind: "currency", inFile: "45 · paid by ABA", suggestion: "USD", confidence: 71 }, original: { supplier: "Ice", amount: "45", branch: "Central" } });
  add({ sheet: "Feb", row: 5, date: "2026-02-03", supplier: "Cambodia Beverage Co.", description: "Beer + water", category: "Inventory purchases", branch: "Central Market", amount: 1180, currency: "USD", kind: "ready", check: { kind: "date", inFile: "03/02/2026", suggestion: "3 Feb 2026", confidence: 93 }, original: { date: "03/02/2026", supplier: "CBC", amount: "1,180.00", branch: "Central" } });
  add({ sheet: "Feb", row: 20, date: "2026-02-09", supplier: "Vattanac Distribution", description: "Stock order", category: "Inventory purchases", branch: "Siem Reap", amount: 1150, currency: "USD", kind: "error", error: "vattanac", note: "Amount entered by you", original: { supplier: "Vattanac", amount: "", branch: "Siem Reap" } });
  add({ sheet: "Feb", row: 66, date: "2026-02-28", supplier: "Chip Mong Retail Supply", description: "Shelving and bags", category: "Inventory purchases", branch: "Battambang", amount: 2480, currency: "USD", kind: "error", error: "chipmong", note: "Date corrected by AI", original: { date: "31/02/2026", supplier: "Chip Mong", amount: "2,480.00", branch: "Battambang" } });
  add({ sheet: "Mar", row: 4, date: "2026-03-05", supplier: "Borey Property Management", description: "Rent Mar - main shop", category: "Rent", branch: "Central Market", amount: 2400, currency: "USD", kind: "existing", note: "Already recorded · skipped", dup: { of: "TXN-2026-03-0044", ofLabel: "TXN-2026-03-0044 · in LuyFlow", ofDate: "5 Mar 2026", ofAmount: "$2,400.00", ofDetail: "Rent · Central Market", reason: "Same supplier, date and amount as a recorded transaction", match: 96 }, original: { supplier: "Borey Property", amount: "$2,400.00", branch: "Central" } });
  add({ sheet: "Mar", row: 5, date: "2026-03-05", supplier: "Khmer Fresh Produce", description: "បន្លែ", category: "Inventory purchases", branch: "Toul Kork", amount: 460000, currency: "KHR", kind: "ready", check: { kind: "date", inFile: "05/03/2026", suggestion: "5 Mar 2026", confidence: 93 }, original: { date: "05/03/2026", amount: "460,000", branch: "TK" } });
  add({ sheet: "Mar", row: 27, date: "2026-03-12", supplier: "Bangkok Packaging Ltd", description: "Paper bags", category: "Other", branch: "Central Market", amount: 8400, currency: "THB", kind: "error", error: "thb", note: "Unsupported currency · left out", original: { amount: "8,400.00", branch: "Central" } });
  add({ sheet: "Mar", row: 41, date: "2026-03-18", supplier: "Électricité du Cambodge", description: "Electricity Feb · TK", category: "Utilities", branch: "Toul Kork", amount: 1520000, currency: "KHR", kind: "existing", dup: { of: "TXN-2026-03-0102", ofLabel: "TXN-2026-03-0102 · in LuyFlow", ofDate: "20 Mar 2026", ofAmount: "៛1,520,000", ofDetail: "Utilities · Toul Kork", reason: "Same supplier and amount, dates 2 days apart", match: 78 }, original: { supplier: "EDC", amount: "1,520,000", branch: "TK" } });
  add({ sheet: "Mar", row: 55, date: "2026-03-24", supplier: "Kampot Pepper Farm", description: "Pepper stock", category: "Inventory purchases", branch: "Kampot", amount: 64, currency: "USD", kind: "error", error: "kampot", original: { supplier: "Kampot Pepper", amount: "64.00", branch: "Kampot" } });

  // Generated rows fill every other slot.
  const rand = seeded(1601);
  const taken = new Set(rows.map((r) => r.id));
  const slots: { sheet: "Jan" | "Feb" | "Mar"; row: number }[] = [];
  for (const sheet of SHEETS) {
    const last = "totalRow" in sheet ? sheet.totalRow - 1 : sheet.rows;
    for (let row = 1; row <= last; row++) if (!taken.has(`${sheet.id}-${row}`)) slots.push({ sheet: sheet.id, row });
  }
  const pool = SUPPLIERS.flatMap((s) => Array(s.weight).fill(s) as (typeof SUPPLIERS)[number][]);

  // Duplicates: 3 more repeated rows and 7 more already in LuyFlow.
  const repeatSlots = new Set([20, 71, 140].map((i) => slots[i].sheet + "-" + slots[i].row));
  const existingSlots = new Set([12, 37, 58, 90, 118, 150, 181].map((i) => slots[i].sheet + "-" + slots[i].row));
  // To check: 7 more currency rows and 5 more date rows (with the designed 4 that makes 16).
  const currencySlots = new Set([8, 30, 66, 99, 127, 160, 190].map((i) => slots[i].sheet + "-" + slots[i].row));
  const dateSlots = new Set([45, 83, 110, 133, 172].map((i) => slots[i].sheet + "-" + slots[i].row));

  // Branch quota for the ready rows (frame 16.10: CM 87 · TK 52 · SR 37 · BB 1 · Business-wide 20).
  const quota: Record<string, number> = { "Central Market": 87, "Toul Kork": 52, "Siem Reap": 37, Battambang: 1, "Business-wide": 20 };
  for (const r of rows) if (r.kind === "ready" || (r.kind === "error" && (r.error === "vattanac" || r.error === "chipmong"))) quota[r.branch]--;
  const branchBag: BranchName[] = Object.entries(quota).flatMap(([b, n]) => Array(Math.max(0, n)).fill(b) as BranchName[]);
  for (let i = branchBag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [branchBag[i], branchBag[j]] = [branchBag[j], branchBag[i]];
  }

  // Currency quota for ready rows: 141 USD and 56 KHR.
  const curQuota = { USD: 141, KHR: 56 };
  for (const r of rows) if ((r.kind === "ready" || r.error === "vattanac" || r.error === "chipmong") && r.currency !== "THB") curQuota[r.currency]--;

  let bagIndex = 0;
  const readyGenerated: ImportRow[] = [];
  for (const slot of slots) {
    const key = `${slot.sheet}-${slot.row}`;
    const dupRepeat = repeatSlots.has(key);
    const dupExisting = existingSlots.has(key);
    let s = pool[Math.floor(rand() * pool.length)];
    const dupKind = dupRepeat ? "repeat" : dupExisting ? "existing" : "ready";
    let currency: "USD" | "KHR" = s.cur;
    if (dupKind === "ready") {
      if (currency === "USD" && curQuota.USD <= 0) currency = "KHR";
      if (currency === "KHR" && curQuota.KHR <= 0) currency = "USD";
      if (currency !== s.cur) s = SUPPLIERS.find((x) => x.cur === currency)!;
      curQuota[currency]--;
    }
    const branch: BranchName = dupKind === "ready" ? branchBag[bagIndex++] ?? "Central Market" : s.category === "Payroll" ? "Business-wide" : "Central Market";
    const maxDay = slot.sheet === "Feb" ? 28 : 31;
    const day = Math.max(1, Math.min(maxDay, Math.round((slot.row / (slot.sheet === "Feb" ? 67 : 73)) * maxDay)));
    const date = iso(slot.sheet, day);
    const row: ImportRow = {
      id: key,
      sheet: slot.sheet,
      row: slot.row,
      date,
      supplier: s.name,
      description: s.desc,
      category: s.category,
      branch: branch === "Business-wide" && s.category === "Inventory purchases" ? "Business-wide" : branch,
      account: ACCOUNT_FOR(currency, branch),
      amount: 0,
      currency,
      original: { date: toSlash(date), supplier: s.file, amount: "", branch: branch === "Central Market" ? "Central" : branch === "Toul Kork" ? (rand() > 0.5 ? "TK" : "Toul kok") : branch === "Business-wide" ? "All" : branch },
      kind: dupKind,
    };
    if (dupKind === "repeat") {
      const prev = rows.find((r) => r.sheet === slot.sheet && r.row === slot.row - 1) ?? readyGenerated[readyGenerated.length - 1];
      Object.assign(row, { supplier: prev.supplier, description: prev.description, category: prev.category, branch: prev.branch, currency: prev.currency as "USD" | "KHR", date: prev.date, amount: prev.amount });
      row.dup = { of: prev.id, ofLabel: `${prev.sheet} · row ${prev.row}`, ofDate: fmtShort(prev.date), ofAmount: amountLabel(prev.amount, prev.currency), ofDetail: prev.description, reason: "Same date, supplier, amount and remark as the row before it", match: 99 };
    }
    if (dupKind === "existing") {
      row.amount = currency === "USD" ? Math.round((80 + rand() * 900) * 20) / 20 : Math.round(200 + rand() * 1600) * 1000;
      const n = String(10 + Math.floor(rand() * 180)).padStart(4, "0");
      const m = ["01", "02", "03"][["Jan", "Feb", "Mar"].indexOf(slot.sheet)];
      row.dup = { of: `TXN-2026-${m}-${n}`, ofLabel: `TXN-2026-${m}-${n} · in LuyFlow`, ofDate: fmtShort(date), ofAmount: amountLabel(row.amount, currency), ofDetail: `${s.category} · ${row.branch}`, reason: "Same supplier, date and amount as a recorded transaction", match: 90 + Math.floor(rand() * 9) };
    }
    if (dupKind === "ready") {
      if (currencySlots.has(key)) row.check = { kind: "currency", inFile: `paid by ${currency === "KHR" ? "Cash" : "ABA"}`, suggestion: currency, confidence: 80 + Math.floor(rand() * 17) };
      if (dateSlots.has(key)) {
        const d = Number(date.slice(8, 10));
        const mo = Number(date.slice(5, 7));
        if (d <= 12) row.original.date = `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/2026`;
        row.check = { kind: "date", inFile: row.original.date, suggestion: fmtShort(date), confidence: 86 + Math.floor(rand() * 10) };
      }
      readyGenerated.push(row);
    }
    rows.push(row);
  }

  // Amounts of the generated ready rows add up to the designed totals: $38,912.40 and ៛61,740,000.
  const fixedUsd = rows.filter((r) => r.amount && (r.kind === "ready" || r.error === "vattanac" || r.error === "chipmong") && r.currency === "USD").reduce((s, r) => s + r.amount, 0);
  const fixedKhr = rows.filter((r) => r.amount && (r.kind === "ready" || r.error === "vattanac" || r.error === "chipmong") && r.currency === "KHR").reduce((s, r) => s + r.amount, 0);
  const spread = (list: ImportRow[], total: number, step: number) => {
    const weights = list.map(() => 0.4 + rand());
    const sum = weights.reduce((a, b) => a + b, 0);
    let used = 0;
    list.forEach((r, i) => {
      if (i === list.length - 1) r.amount = Math.round((total - used) / step) * step;
      else {
        r.amount = Math.round(((weights[i] / sum) * total) / step) * step;
        used += r.amount;
      }
      r.amount = Math.round(r.amount * 100) / 100;
    });
  };
  spread(readyGenerated.filter((r) => r.currency === "USD"), 38912.4 - fixedUsd, 0.05);
  spread(readyGenerated.filter((r) => r.currency === "KHR"), 61740000 - fixedKhr, 1000);
  for (const r of readyGenerated) {
    r.original.amount = r.currency === "USD" ? r.amount.toFixed(2) : r.amount.toLocaleString("en-US");
    if (r.check?.kind === "currency") r.check.inFile = `${r.original.amount} · ${r.check.inFile}`;
  }
  // Repeated rows copy the amount of the row before them, which is now known.
  for (const r of rows.filter((x) => x.kind === "repeat" && !x.amount)) {
    const prev = rows.find((x) => x.id === r.dup!.of)!;
    r.amount = prev.amount;
    r.dup!.ofAmount = amountLabel(prev.amount, prev.currency);
    r.original.amount = prev.original.amount;
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.sheet.localeCompare(b.sheet) || a.row - b.row);
}

let cache: ImportRow[] | null = null;
export function sampleRows() {
  return (cache ??= buildRows());
}

/* ---------- Step content ---------- */

/** Step 4: the first rows of each sheet as they are in the file. */
export const EXTRACT_PREVIEW = {
  columns: ["Date / ថ្ងៃខែ", "Paid to", "Description", "Amount", "Cur", "Type", "Branch", "Paid by", "Remark"],
  Jan: [
    ["02/01/2026", "Borey Property", "Rent Jan - main shop", "$2,400.00", "USD", "Rent", "Central", "ABA", ""],
    ["2026-01-03", "E.D.C", "Electricity Dec", "៛1,480,000", "KHR", "Utilities", "TK", "ABA KHR", "paid late"],
    ["១៤ មករា ២០២៦", "Khmer Fresh Produce", "បន្លែ", "១២០,០០០", "", "", "Toul kok", "Cash", ""],
    ["05/01/2026", "Cambodia Beverage", "Beer + water", "1,320.50", "USD", "Stock", "Central", "ABA", "inv 117840"],
    ["05/01/2026", "Cambodia Beverage", "Beer + water", "1,320.50", "USD", "Stock", "Central", "ABA", "inv 117840"],
    ["07/01/2026", "Smart", "Internet", "96", "USD", "", "All", "ABA", ""],
  ],
  Feb: [
    ["01/02/2026", "Borey Property", "Rent Feb - main shop", "$2,400.00", "USD", "Rent", "Central", "ABA", ""],
    ["02/02/2026", "EDC", "Electricity Jan", "1,610,000", "KHR", "Utilities", "TK", "ABA KHR", ""],
    ["02/02/2026", "Khmer Fresh Produce", "បន្លែ", "៤៥០,០០០", "KHR", "Stock", "Toul kok", "Cash", ""],
    ["03/02/2026", "Smart", "Internet", "96", "USD", "", "All", "ABA", ""],
    ["03/02/2026", "CBC", "Beer + water", "1,180.00", "USD", "Stock", "Central", "ABA", "inv 118022"],
    ["05/02/2026", "Salary", "Payroll Jan", "2,450.00", "USD", "Payroll", "All", "ABA", ""],
  ],
  Mar: [
    ["01/03/2026", "Smart", "Internet", "96", "USD", "", "All", "ABA", ""],
    ["02/03/2026", "Vattanac", "Stock order", "980.00", "USD", "Stock", "Siem Reap", "ABA", ""],
    ["03/03/2026", "Total", "Fuel delivery van", "410,000", "KHR", "Fuel", "Central", "Cash", ""],
    ["05/03/2026", "Borey Property", "Rent Mar - main shop", "$2,400.00", "USD", "Rent", "Central", "ABA", ""],
    ["05/03/2026", "Khmer Fresh Produce", "បន្លែ", "460,000", "", "Stock", "TK", "Cash", ""],
    ["06/03/2026", "Chip Mong", "Bags", "320.00", "USD", "Stock", "Central", "ABA", ""],
  ],
};

export type FieldId = "date" | "supplier" | "description" | "amount" | "currency" | "category" | "branch" | "account" | "none";
export const FIELDS: { id: FieldId; label: string; required?: boolean }[] = [
  { id: "date", label: "Date", required: true },
  { id: "supplier", label: "Supplier", required: true },
  { id: "description", label: "Description" },
  { id: "amount", label: "Amount", required: true },
  { id: "currency", label: "Currency", required: true },
  { id: "category", label: "Category", required: true },
  { id: "branch", label: "Branch" },
  { id: "account", label: "Paid from account" },
  { id: "none", label: "Do not import" },
];

export const COLUMNS: { letter: string; name: string; sample: string; ai: FieldId; confidence: number | null }[] = [
  { letter: "A", name: "Date / ថ្ងៃខែ", sample: "02/01/2026 · 2026-01-03 · ១៤ មករា ២០២៦", ai: "date", confidence: 99 },
  { letter: "B", name: "Paid to", sample: "Borey Property · E.D.C · Khmer Fresh Produce", ai: "supplier", confidence: 96 },
  { letter: "C", name: "Description", sample: "Rent Jan - main shop · Electricity Dec · បន្លែ", ai: "description", confidence: 98 },
  { letter: "D", name: "Amount", sample: "$2,400.00 · ៛1,480,000 · ១២០,០០០", ai: "amount", confidence: 99 },
  { letter: "E", name: "Cur", sample: "USD · KHR · THB · (blank)", ai: "currency", confidence: 97 },
  { letter: "F", name: "Type", sample: "Rent · Utilities · Stock · (blank)", ai: "category", confidence: 81 },
  { letter: "G", name: "Branch", sample: "Central · TK · Toul kok · All", ai: "branch", confidence: 93 },
  { letter: "H", name: "Paid by", sample: "ABA · ABA KHR · Cash", ai: "account", confidence: 76 },
  { letter: "I", name: "Remark", sample: "paid late · inv 117840", ai: "none", confidence: null },
];

export type CleanupId = "dates" | "amounts" | "suppliers" | "branches" | "categories";
export const CLEANUPS: { id: CleanupId; title: string; rows: number; body: string; icon: "calendar" | "hash" | "truck" | "building" | "tag"; examples: [string, string][]; cells: number; add?: boolean }[] = [
  { id: "dates", title: "Use one date format", rows: 212, body: "Three formats were found. All dates will be stored as dates and shown as “2 Jan 2026”.", icon: "calendar", examples: [["02/01/2026", "2 Jan 2026"], ["2026-01-03", "3 Jan 2026"], ["១៤ មករា ២០២៦", "14 Jan 2026"]], cells: 212 },
  { id: "amounts", title: "Read amounts as numbers", rows: 212, body: "Currency signs, separators and Khmer numerals are removed from the amount and kept as the row’s currency.", icon: "hash", examples: [["$2,400.00", "2,400.00 · USD"], ["៛1,480,000", "1,480,000 · KHR"], ["១២០,០០០", "120,000"]], cells: 212 },
  { id: "suppliers", title: "Match supplier names", rows: 94, body: "14 spellings were matched to 6 suppliers you already have. 3 new suppliers will be created.", icon: "truck", examples: [["E.D.C · EDC · Electricite du Cambodge", "Électricité du Cambodge"], ["Cambodia Beverage · CBC", "Cambodia Beverage Co."], ["Smart", "Smart Axiata"]], cells: 94 },
  { id: "branches", title: "Match branch names", rows: 212, body: "Short names and spellings were matched to your branches. “All” becomes Business-wide.", icon: "building", examples: [["Central", "Central Market (Main)"], ["TK · Toul kok", "Toul Kork"], ["All", "Business-wide"]], cells: 212 },
  { id: "categories", title: "Suggest missing categories", rows: 38, body: "Rows with no “Type” get a category from the description and supplier. Each suggestion shows its confidence in the review.", icon: "tag", examples: [["Smart · Internet", "Internet & phone · 97%"], ["Khmer Fresh Produce · បន្លែ", "Inventory purchases · 91%"]], cells: 38, add: true },
];

/** Branches a Branch Manager's import is limited to, and the active branches for the owner. */
export const ACTIVE_BRANCHES: BranchName[] = ["Central Market", "Toul Kork", "Siem Reap", "Battambang"];
export const THB_PER_USD = 36.5;

export { fmtShort };
