/**
 * MOCK data for Items & Inventory (section 08) and Sales & Customers (09).
 *
 * The seed is the moment shown in the Sales frames: INV-2026-0157 has not been
 * created yet. Creating and sending it in the app (20 Angkor Beer and 10 rice
 * from Central Market) brings stock to exactly the figures in the Inventory
 * frames (Angkor Beer 166 cases, Central Market 86).
 * Rows visible in Figma are copied; the rest is generated with a fixed seed,
 * sized so counts and totals match the design.
 */
import type { HistoryEntry } from "./finance-types";
import { round2, seeded, split } from "./finance-data";
import type {
  Adjustment,
  BranchName,
  Customer,
  DocLine,
  Invoice,
  InvoicePayment,
  Item,
  OpsState,
  Planned,
  SaleLine,
  StockMove,
  WalkInSale,
} from "./ops-types";

const CM: BranchName = "Central Market";
const TK: BranchName = "Toul Kork";
const SR: BranchName = "Siem Reap";
const BB: BranchName = "Battambang";
const ALL: BranchName[] = [CM, TK, SR, BB];

const pick = <T,>(rand: () => number, list: readonly T[]) => list[Math.floor(rand() * list.length)];

/** Splits an integer total into `n` integer parts of at least 1. */
function intSplit(rand: () => number, total: number, n: number) {
  const weights = Array.from({ length: n }, () => 0.2 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const free = total - n;
  const parts = weights.map((w) => 1 + Math.floor((w / sum) * free));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % n, rest--) parts[i]++;
  return parts;
}

const pad = (n: number, width = 4) => String(n).padStart(width, "0");
const day = (d: number) => `2026-10-${pad(d, 2)}`;

/* ---------- Items (08.1) ---------- */

const item = (
  id: string,
  name: string,
  sku: string,
  category: string,
  unit: string,
  cost: number,
  price: number,
  stock: Partial<Record<BranchName, number>>,
  min: number,
  active = true,
): Item => ({
  id,
  name,
  sku,
  category,
  unit,
  cost,
  price,
  active,
  stock,
  min: Object.fromEntries(Object.keys(stock).map((b) => [b, min])),
  created: "2026-03-01",
  createdBy: "Sokha Chan",
});

export const ITEMS: Item[] = [
  item("angkor-beer", "Angkor Beer 330ml × 24", "BEV-ANG-330", "Beverages", "case", 11.2, 14.5, { [CM]: 106, [TK]: 18, [SR]: 40, [BB]: 22 }, 24),
  item("condensed-milk", "Condensed Milk 390g", "DRY-CDM-390", "Dairy", "can", 0.95, 1.4, { [CM]: 240, [TK]: 118, [SR]: 140, [BB]: 86 }, 60),
  item("cooking-oil", "Cooking Oil 1L", "OIL-CKG-1L", "Pantry", "bottle", 1.85, 2.6, { [CM]: 176, [TK]: 44, [SR]: 90, [BB]: 58 }, 48),
  item("fish-sauce", "Fish Sauce 750ml", "SAU-FSH-750", "Pantry", "bottle", 1.45, 2.2, { [CM]: 148, [TK]: 60, [SR]: 72, [BB]: 30 }, 36),
  item("instant-noodles", "Instant Noodles × 30", "NDL-INS-30", "Pantry", "box", 5.6, 7.2, { [CM]: 92, [TK]: 48, [SR]: 35, [BB]: 28 }, 25),
  item("kampot-pepper", "Kampot Pepper 100g", "SPC-KPP-100", "Spices", "pack", 3.8, 5.5, { [CM]: 120, [TK]: 74, [SR]: 96, [BB]: 41 }, 30),
  item("mondulkiri-coffee", "Mondulkiri Coffee 250g", "COF-MDK-250", "Beverages", "pack", 4.2, 6.5, { [CM]: 80, [SR]: 48 }, 20, false),
  item("palm-sugar", "Palm Sugar 500g", "SWT-PLM-500", "Pantry", "pack", 1.6, 2.4, { [CM]: 210, [TK]: 96, [SR]: 80, [BB]: 60 }, 40),
  item("rumduol-rice", "Phka Rumduol Rice 25kg", "RIC-JAS-25", "Rice & grains", "bag", 19, 23, { [CM]: 74, [TK]: 31, [SR]: 28, [BB]: 19 }, 20),
  item("vital-water", "Vital Water 500ml × 12", "BEV-VTL-500", "Beverages", "case", 2.1, 3, { [CM]: 340, [TK]: 152, [SR]: 0, [BB]: 76 }, 60),
];

export const ITEM_CATEGORIES = ["Beverages", "Dairy", "Pantry", "Spices", "Rice & grains", "Snacks", "Household"];
export const UNITS = ["Case", "Bag", "Box", "Bottle", "Can", "Pack", "Piece", "Kg"];

const PEOPLE: Record<BranchName, string> = { [CM]: "Sokha Chan", [TK]: "Dara Sok", [SR]: "Bopha Keo", [BB]: "Vannak Lim" };

/* ---------- Adjustments (08.8) ---------- */

const ADJUSTMENTS: Adjustment[] = [
  { id: "adj-9", at: "2026-10-26T09:15", itemId: "angkor-beer", branch: TK, kind: "decrease", change: -6, reason: "Damaged in delivery", notes: "", by: "Dara Sok" },
  { id: "adj-8", at: "2026-10-24T18:30", itemId: "angkor-beer", branch: SR, kind: "correction", change: 2, reason: "Stock count found 44, not 42", notes: "", by: "Bopha Keo" },
  { id: "adj-7", at: "2026-10-22T08:50", itemId: "vital-water", branch: SR, kind: "decrease", change: -12, reason: "Expired", notes: "", by: "Bopha Keo" },
  { id: "adj-6", at: "2026-10-19T16:05", itemId: "palm-sugar", branch: CM, kind: "increase", change: 20, reason: "Supplier bonus stock", notes: "", by: "Sokha Chan" },
  { id: "adj-5", at: "2026-10-15T10:22", itemId: "cooking-oil", branch: TK, kind: "correction", change: -3, reason: "Stock count found 61, not 64", notes: "", by: "Dara Sok" },
  { id: "adj-4", at: "2026-10-11T13:40", itemId: "rumduol-rice", branch: BB, kind: "decrease", change: -2, reason: "Torn bags", notes: "", by: "Vannak Lim" },
  { id: "adj-3", at: "2026-10-08T11:10", itemId: "fish-sauce", branch: CM, kind: "decrease", change: -4, reason: "Broken bottles", notes: "", by: "Sokha Chan" },
  { id: "adj-2", at: "2026-10-05T17:30", itemId: "instant-noodles", branch: SR, kind: "correction", change: 3, reason: "Stock count found 38, not 35", notes: "", by: "Bopha Keo" },
  { id: "adj-1", at: "2026-10-02T09:05", itemId: "condensed-milk", branch: BB, kind: "decrease", change: -6, reason: "Expired", notes: "", by: "Vannak Lim" },
];

/* ---------- Stock movements (08.9) ---------- */

type FixedMove = Omit<StockMove, "id" | "balance"> & { target?: number };

/** Angkor Beer movements visible in frame 08.9 (before INV-2026-0157). */
const BEER_FIXED: FixedMove[] = [
  { at: "2026-10-31T16:20", itemId: "angkor-beer", branch: CM, kind: "sale", change: -6, ref: "WS-2026-1088", refSub: "Walk-in sale", by: "Sokha Chan" },
  { at: "2026-10-31T14:20", itemId: "angkor-beer", branch: TK, kind: "sale", change: -6, ref: "WS-2026-1083", refSub: "Walk-in sale", by: "Dara Sok" },
  { at: "2026-10-30T13:35", itemId: "angkor-beer", branch: CM, kind: "sale", change: -1, ref: "Order #10487", refSub: "Shopify", by: "Shopify sync" },
  { at: "2026-10-30T10:05", itemId: "angkor-beer", branch: SR, kind: "sale", change: -4, ref: "WS-2026-1009", refSub: "Walk-in sale", by: "Bopha Keo" },
  { at: "2026-10-29T15:12", itemId: "angkor-beer", branch: BB, kind: "sale", change: -3, ref: "WS-2026-0981", refSub: "Walk-in sale", by: "Vannak Lim" },
  { at: "2026-10-28T11:48", itemId: "angkor-beer", branch: CM, kind: "sale", change: -2, ref: "WS-2026-0946", refSub: "Walk-in sale", by: "Sokha Chan" },
];

function buildMoves(): StockMove[] {
  const rand = seeded(71);
  const moves: StockMove[] = [];
  let seq = 1;
  for (const it of ITEMS) {
    const fixed: FixedMove[] = [
      ...(it.id === "angkor-beer" ? BEER_FIXED : []),
      ...ADJUSTMENTS.filter((a) => a.itemId === it.id).map((a) => {
        const m = /found (\d+)/.exec(a.reason);
        return { at: a.at, itemId: a.itemId, branch: a.branch, kind: a.kind, change: a.change, ref: a.reason, refSub: "Stock adjustment", by: a.by, target: m ? Number(m[1]) : undefined };
      }),
    ];
    // Generated sales: for Angkor Beer only before 24 Oct so frame 08.9's first page stays exact.
    const count = it.id === "angkor-beer" ? 60 - fixed.length : 18 + Math.floor(rand() * 16);
    const latestDay = it.id === "angkor-beer" ? 23 : 30;
    const branches = Object.keys(it.stock) as BranchName[];
    const generated: FixedMove[] = Array.from({ length: count }, () => {
      const branch = pick(rand, branches);
      const d = 1 + Math.floor(rand() * latestDay);
      const shopify = branch === CM && rand() < 0.15;
      const ws = 700 + Math.floor(rand() * 380);
      return {
        at: `${day(d)}T${pad(8 + Math.floor(rand() * 10), 2)}:${pad(Math.floor(rand() * 60), 2)}`,
        itemId: it.id,
        branch,
        kind: "sale" as const,
        change: -(1 + Math.floor(rand() * 6)),
        ref: shopify ? `Order #${10100 + Math.floor(rand() * 380)}` : `WS-2026-${pad(ws)}`,
        refSub: shopify ? "Shopify" : "Walk-in sale",
        by: shopify ? "Shopify sync" : PEOPLE[branch],
      };
    });
    const all = [...fixed, ...generated].sort((a, b) => b.at.localeCompare(a.at));
    // Make correction counts true: generated sales newer than a correction add up to the gap.
    for (const branch of branches) {
      const timeline = all.filter((m) => m.branch === branch);
      const anchor = timeline.find((m) => m.target !== undefined);
      if (!anchor) continue;
      const newer = timeline.slice(0, timeline.indexOf(anchor));
      const fixedSum = newer.filter((m) => fixed.includes(m)).reduce((s, m) => s + m.change, 0);
      const fillers = newer.filter((m) => !fixed.includes(m));
      const need = (it.stock[branch] ?? 0) - anchor.target! - fixedSum; // negative = units sold
      const parts = fillers.length && need < 0 ? intSplit(rand, -need, Math.min(fillers.length, -need)) : [];
      fillers.forEach((m, i) => (m.change = i < parts.length ? -parts[i] : 0));
    }
    const kept = all.filter((m) => m.change !== 0);
    const balance: Partial<Record<BranchName, number>> = { ...it.stock };
    for (const m of kept) {
      moves.push({ id: `mv-${seq++}`, at: m.at, itemId: m.itemId, branch: m.branch, kind: m.kind, change: m.change, balance: balance[m.branch] ?? 0, ref: m.ref, refSub: m.refSub, by: m.by });
      balance[m.branch] = (balance[m.branch] ?? 0) - m.change;
    }
  }
  return moves.sort((a, b) => b.at.localeCompare(a.at));
}

/* ---------- Item sales lines (08.7) ---------- */

const DESIGNED_SALE_LINES: Omit<SaleLine, "id">[] = [
  { date: day(31), itemId: "angkor-beer", qty: 6, price: 14.5, branch: CM, source: "walk-in", ref: "WS-2026-1088" },
  { date: day(31), itemId: "vital-water", qty: 2, price: 3, branch: CM, source: "walk-in", ref: "WS-2026-1088" },
  { date: day(31), itemId: "vital-water", qty: 24, price: 3, branch: CM, source: "shopify", ref: "Order #10492" },
  { date: day(31), itemId: "rumduol-rice", qty: 1, price: 23, branch: CM, source: "walk-in", ref: "WS-2026-1087" },
  { date: day(31), itemId: "fish-sauce", qty: 3, price: 2.2, branch: CM, source: "walk-in", ref: "WS-2026-1087" },
  { date: day(31), itemId: "cooking-oil", qty: 4, price: 2.6, branch: TK, source: "walk-in", ref: "WS-2026-1086" },
];

/**
 * October quantities after INV-2026-0157 are 6,482 units and $41,960.00
 * (frame 08.7). The seed is 20 Angkor Beer and 10 rice lower.
 * [item, quantity still to generate, lines, Shopify quantity, Shopify lines]
 */
const SALE_PLAN: [string, number, number, number, number][] = [
  ["angkor-beer", 386, 80, 0, 0],
  ["rumduol-rice", 669, 135, 0, 0],
  ["instant-noodles", 950, 180, 0, 0],
  ["kampot-pepper", 700, 131, 4, 1],
  ["vital-water", 1374, 110, 1242, 60],
  ["cooking-oil", 896, 170, 0, 0],
  ["palm-sugar", 700, 160, 0, 0],
  ["fish-sauce", 497, 145, 0, 0],
  ["condensed-milk", 240, 85, 0, 0],
];

function buildSaleLines(): SaleLine[] {
  const rand = seeded(72);
  const lines: SaleLine[] = DESIGNED_SALE_LINES.map((l, i) => ({ ...l, id: `sl-d${i}` }));
  let seq = 0;
  for (const [itemId, qty, count, shopQty, shopCount] of SALE_PLAN) {
    const it = ITEMS.find((i) => i.id === itemId)!;
    const shopParts = shopCount ? intSplit(rand, shopQty, shopCount) : [];
    const otherParts = intSplit(rand, qty - shopQty, count - shopCount);
    const make = (q: number, shopify: boolean): SaleLine => {
      const d = 1 + Math.floor(rand() * 30);
      const invoice = !shopify && q >= 8 && rand() < 0.5;
      const branch: BranchName = shopify ? CM : pick(rand, Object.keys(it.stock).filter((b) => (it.stock as Record<string, number>)[b] !== undefined) as BranchName[]);
      const ref = shopify ? `Order #${10100 + Math.floor(rand() * 390)}` : invoice ? `INV-2026-0${100 + Math.floor(rand() * 56)}` : `WS-2026-${pad(400 + Math.floor(rand() * 640))}`;
      return { id: `sl-${seq++}`, date: day(d), itemId, qty: q, price: it.price, branch, source: shopify ? "shopify" : invoice ? "invoice" : "walk-in", ref };
    };
    shopParts.forEach((q) => lines.push(make(q, true)));
    otherParts.forEach((q) => lines.push(make(q, false)));
  }
  // Stable sort keeps the designed 31 Oct lines first.
  return lines.sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- Walk-in sales (09.2) ---------- */

const ACCOUNT_FOR: Record<string, string> = {
  [`Cash|${CM}`]: "till-central-market",
  [`Cash|${TK}`]: "till-toul-kork",
  [`Cash|${SR}`]: "till-siem-reap",
  [`Cash|${BB}`]: "till-battambang",
};

const DESIGNED_WALKINS: WalkInSale[] = [
  { id: "WS-2026-1088", at: "2026-10-31T16:20", lines: [{ itemId: "angkor-beer", qty: 6, price: 14.5, discount: 0 }, { itemId: "vital-water", qty: 2, price: 3, discount: 0 }], method: "KHQR", accountId: "aba-business-usd", branch: CM, currency: "USD", total: 93, by: "Sokha Chan" },
  { id: "WS-2026-1087", at: "2026-10-31T16:04", lines: [{ itemId: "rumduol-rice", qty: 1, price: 23, discount: 0 }, { itemId: "fish-sauce", qty: 3, price: 2.2, discount: 0 }], method: "Cash", accountId: "till-central-market", branch: CM, currency: "KHR", total: 121400, by: "Sokha Chan" },
  { id: "WS-2026-1086", at: "2026-10-31T15:48", lines: [{ itemId: "cooking-oil", qty: 4, price: 2.6, discount: 0 }, { itemId: "palm-sugar", qty: 2, price: 2.4, discount: 0 }], method: "Cash", accountId: "till-toul-kork", branch: TK, currency: "KHR", total: 62300, by: "Dara Sok" },
  { id: "WS-2026-1085", at: "2026-10-31T15:31", lines: [{ itemId: "kampot-pepper", qty: 10, price: 5.5, discount: 0 }], method: "Card", accountId: "aba-business-usd", branch: SR, currency: "USD", total: 55, by: "Bopha Keo" },
  { id: "WS-2026-1084", at: "2026-10-31T15:02", lines: [{ itemId: "instant-noodles", qty: 2, price: 7.2, discount: 0 }, { itemId: "condensed-milk", qty: 6, price: 1.4, discount: 0 }], method: "KHQR", accountId: "wing-merchant-khr", branch: TK, currency: "KHR", total: 93500, by: "Dara Sok" },
  { id: "WS-2026-1083", at: "2026-10-31T14:20", lines: [{ itemId: "angkor-beer", qty: 6, price: 14.5, discount: 0 }], method: "Cash", accountId: "till-toul-kork", branch: TK, currency: "USD", total: 87, by: "Dara Sok" },
  { id: "WS-2026-1082", at: "2026-10-31T14:12", lines: [{ itemId: "vital-water", qty: 10, price: 3, discount: 0 }, { itemId: "kampot-pepper", qty: 2, price: 5.5, discount: 0 }], method: "KHQR", accountId: "aba-business-usd", branch: CM, currency: "USD", total: 41, by: "Sokha Chan" },
];

function buildWalkIns(): WalkInSale[] {
  const rand = seeded(73);
  const sellable = ITEMS.filter((i) => i.active);
  const sales: WalkInSale[] = [...DESIGNED_WALKINS];
  const makeSale = (id: string, at: string, target: number, khqr: boolean): WalkInSale => {
    const branch = pick(rand, ALL);
    const lines: WalkInSale["lines"] = [];
    let sum = 0;
    while (sum < target) {
      const it = pick(rand, sellable);
      const qty = Math.max(1, Math.min(6, Math.ceil((target - sum) / it.price)));
      lines.push({ itemId: it.id, qty, price: it.price, discount: 0 });
      sum = round2(sum + qty * it.price);
      if (lines.length >= 3) break;
    }
    if (sum < target) {
      lines[0].qty += Math.ceil((target - sum) / lines[0].price);
      sum = lines.reduce((s, l) => round2(s + l.qty * l.price), 0);
    }
    // The amount charged can be below the list total: the difference is a discount on the first line.
    lines[0].discount = round2(sum - target);
    const method = khqr ? "KHQR" : rand() < 0.7 ? "Cash" : "Card";
    return {
      id,
      at,
      lines,
      method,
      accountId: method === "Cash" ? ACCOUNT_FOR[`Cash|${branch}`] : "aba-business-usd",
      branch,
      currency: "USD",
      total: target,
      by: PEOPLE[branch],
    };
  };
  // 39 more sales today: $1,432.40 in total and 26 of 46 paid by KHQR (frame 09.2).
  const totals = split(rand, 1432.4 - 343.61, 39);
  totals.forEach((t, i) => {
    const minute = 8 * 60 + Math.floor((i / 39) * (6 * 60 + 8));
    sales.push(makeSale(`WS-2026-${pad(1081 - i)}`, `2026-10-31T${pad(Math.floor(minute / 60), 2)}:${pad(minute % 60, 2)}`, t, (i * 3) % 5 < 3 && i < 39 - 1));
  });
  // Earlier days for the "Last 7 days" filter.
  let n = 1081 - 39;
  for (let d = 30; d >= 25; d--) {
    for (let i = 0; i < 40; i++) {
      const minute = 8 * 60 + Math.floor((i / 40) * 10 * 60);
      sales.push(makeSale(`WS-2026-${pad(n--)}`, `${day(d)}T${pad(Math.floor(minute / 60), 2)}:${pad(minute % 60, 2)}`, round2(8 + rand() * 50), rand() < 0.55));
    }
  }
  return sales.sort((a, b) => b.at.localeCompare(a.at));
}

/* ---------- Customers (09.4) ---------- */

const cust = (id: string, name: string, city: string, contact: string, phone: string, email: string, extra: Partial<Customer> = {}): Customer => ({
  id,
  name,
  city,
  contact,
  phone,
  email,
  telegram: `@${email.split("@")[0].replace(/\W/g, "").slice(0, 16)}`,
  address: `${city === "Phnom Penh" ? "St. 2004, Toul Kork" : "Main Road"}, ${city}`,
  terms: 14,
  since: "2026-03-09",
  active: true,
  notes: "",
  notesMeta: "",
  ...extra,
});

export const CUSTOMERS: Customer[] = [
  cust("angkor-wholesale", "Angkor Wholesale Trading", "Phnom Penh", "Chenda Meas", "+855 12 345 678", "orders@angkorwholesale.com.kh", {
    telegram: "@angkorwholesale",
    address: "No. 45, St. 271, Sen Sok, Phnom Penh",
    notes: "Prefers delivery before 9 am. Sends payment by ABA transfer and shares the slip on Telegram.",
    notesMeta: "Updated by Sokha Chan · 2 Oct 2026",
  }),
  cust("golden-lotus", "Golden Lotus Minimart", "Phnom Penh", "Pisey Chea", "+855 17 882 301", "pisey@goldenlotus.com.kh", { since: "2026-03-14" }),
  cust("tonle-sap", "Tonle Sap Restaurant", "Siem Reap", "Rithy Noun", "+855 92 440 915", "rithy@tonlesap-restaurant.com", { since: "2026-04-02" }),
  cust("phsar-leu", "Phsar Leu Traders", "Battambang", "Maly Yim", "+855 89 372 650", "maly@phsarleutraders.com", { since: "2026-04-11" }),
  cust("borey-cafe", "Borey Café & Bakery", "Phnom Penh", "Kunthea Ros", "+855 96 215 774", "hello@boreycafe.com.kh", { since: "2026-06-20" }),
  cust("riverside-hotel", "Riverside Hotel Supplies", "Siem Reap", "Visal Tep", "+855 11 630 248", "purchasing@riversidehotel.com.kh", { address: "River Road, Wat Bo, Siem Reap", since: "2026-05-05", terms: 14 }),
  cust("sovann-guesthouse", "Sovann Guesthouse", "Battambang", "Sovann Phy", "+855 78 904 116", "sovann.guesthouse@gmail.com", { since: "2026-07-01" }),
  cust("kampot-pepper-house", "Kampot Pepper House", "Kampot", "Sophal Kong", "+855 15 707 933", "info@kampotpepperhouse.com", { active: false, since: "2026-03-20" }),
  cust("lucky-mart", "Lucky Mart Sen Sok", "Phnom Penh", "Dalin Ouk", "+855 12 778 140", "purchase@luckymart.com.kh", { terms: 45 }),
  cust("sokha-hotel", "Sokha Beach Kitchen", "Sihanoukville", "Ratha Keo", "+855 16 448 902", "kitchen@sokhabeach.com.kh", { terms: 45 }),
  cust("mekong-river-cafe", "Mekong River Café", "Phnom Penh", "Srey Leak", "+855 93 214 650", "hello@mekongrivercafe.com", { terms: 45 }),
  cust("kep-crab-house", "Kep Crab House", "Kep", "Bunthoeun Lay", "+855 77 609 321", "orders@kepcrabhouse.com", { terms: 45 }),
  cust("orussey-wholesale", "Orussey Wholesale", "Phnom Penh", "Vuthy Hang", "+855 89 552 017", "vuthy@orusseywholesale.com", { terms: 45 }),
  cust("battambang-bakery", "Battambang Bakery", "Battambang", "Sreymom Chhun", "+855 70 318 446", "bakery@btbbakery.com", { terms: 45 }),
  cust("tuol-tom-poung", "Tuol Tom Poung Grocery", "Phnom Penh", "Kosal Prak", "+855 11 902 744", "kosal.ttp@gmail.com" ),
  cust("angkor-palace", "Angkor Palace Hotel", "Siem Reap", "Chantrea Mao", "+855 63 900 112", "fb@angkorpalace.com.kh"),
  cust("psar-thmey-stall", "Psar Thmey Stall 42", "Phnom Penh", "Heng Lim", "+855 12 660 913", "heng.stall42@gmail.com"),
  cust("green-leaf-mart", "Green Leaf Mart", "Kampong Cham", "Sotheary Chan", "+855 92 337 581", "greenleaf.kc@gmail.com"),
  cust("royal-noodle-house", "Royal Noodle House", "Phnom Penh", "Pheakdey Sam", "+855 15 441 208", "royalnoodle@gmail.com"),
  cust("bayon-guesthouse", "Bayon Guesthouse", "Siem Reap", "Narin Ty", "+855 96 773 015", "stay@bayonguesthouse.com"),
  cust("star-minimart", "Star Minimart Battambang", "Battambang", "Kimly Sar", "+855 78 615 290", "starminimart.btb@gmail.com"),
  cust("kampong-som-traders", "Kampong Som Traders", "Sihanoukville", "Samnang Pen", "+855 16 280 774", "samnang@kstraders.com"),
  cust("riverside-noodles", "Phnom Penh Noodle Bar", "Phnom Penh", "Davy Chum", "+855 93 120 576", "davy@ppnoodlebar.com"),
];
export const CITIES = ["Phnom Penh", "Siem Reap", "Battambang", "Kampot", "Kep", "Sihanoukville", "Kampong Cham"];

/* ---------- Invoice lines ---------- */

/** Builds lines worth exactly `total`, with a delivery line for the remainder. */
function linesFor(rand: () => number, total: number, itemIds?: string[]): DocLine[] {
  const pool = itemIds ? ITEMS.filter((i) => itemIds.includes(i.id)) : ITEMS.filter((i) => i.active);
  const lines: DocLine[] = [];
  let rest = total;
  const count = total > 1500 ? 3 : total > 400 ? 2 : 1;
  for (let i = 0; i < count && rest > 0; i++) {
    const it = pool[(Math.floor(rand() * pool.length) + i) % pool.length];
    if (lines.some((l) => l.itemId === it.id)) continue;
    const share = i === count - 1 ? rest : rest * (0.4 + rand() * 0.3);
    const qty = Math.floor(share / it.price);
    if (qty < 1) continue;
    lines.push({ itemId: it.id, description: it.name, sku: it.sku, qty, price: it.price, discount: 0 });
    rest = round2(rest - qty * it.price);
  }
  if (rest > 0.004) lines.push({ itemId: null, description: "Delivery", qty: 1, price: rest, discount: 0 });
  return lines;
}

export function lineTotal(line: DocLine) {
  return round2(line.qty * line.price * (1 - line.discount / 100));
}
export function docTotal(lines: DocLine[]) {
  return round2(lines.reduce((s, l) => s + lineTotal(l), 0));
}

/* ---------- Invoices (09.7–09.11) ---------- */

type InvSeed = {
  n: number;
  customerId: string;
  branch: BranchName;
  issued: string;
  due?: string;
  total: number;
  state: "draft" | "sent" | "partial" | "overdue" | "paid" | "cancelled";
  paid?: { date: string; amount: number; method: string; accountId: string; ref: string; by: string; khr?: number }[];
  items?: string[];
};

const addDaysIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const DESIGNED_INVOICES: InvSeed[] = [
  { n: 156, customerId: "sovann-guesthouse", branch: BB, issued: "2026-10-28", total: 415, state: "draft" },
  { n: 155, customerId: "riverside-hotel", branch: SR, issued: "2026-10-27", total: 3420, state: "sent", items: ["vital-water", "rumduol-rice", "kampot-pepper"] },
  { n: 154, customerId: "golden-lotus", branch: TK, issued: "2026-10-26", total: 1250, state: "sent" },
  { n: 153, customerId: "angkor-wholesale", branch: CM, issued: "2026-10-24", total: 2180, state: "sent", items: ["angkor-beer", "rumduol-rice"] },
  { n: 151, customerId: "borey-cafe", branch: TK, issued: "2026-10-20", total: 640, state: "sent" },
  { n: 149, customerId: "golden-lotus", branch: CM, issued: "2026-10-16", total: 760, state: "cancelled" },
  { n: 147, customerId: "tonle-sap", branch: SR, issued: "2026-10-14", due: "2026-11-04", total: 980, state: "partial", paid: [{ date: day(27), amount: 400, method: "Cash", accountId: "till-siem-reap", ref: "Receipt 0412", by: "Bopha Keo" }] },
  { n: 144, customerId: "borey-cafe", branch: TK, issued: "2026-10-12", total: 320, state: "paid", paid: [{ date: day(27), amount: 320, method: "KHQR", accountId: "wing-merchant-khr", ref: "KHQR 99640", by: "Dara Sok", khr: 1312000 }] },
  { n: 142, customerId: "angkor-wholesale", branch: CM, issued: "2026-10-09", total: 1250, state: "overdue" },
  { n: 138, customerId: "golden-lotus", branch: CM, issued: "2026-10-05", total: 1250, state: "paid", paid: [{ date: day(30), amount: 1250, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26303M2Q88", by: "Sokha Chan" }] },
  { n: 133, customerId: "sovann-guesthouse", branch: BB, issued: "2026-10-01", total: 690, state: "paid", paid: [{ date: day(29), amount: 690, method: "Cheque", accountId: "acleda-savings-usd", ref: "CHQ 004417", by: "Vannak Lim" }] },
  { n: 131, customerId: "phsar-leu", branch: BB, issued: "2026-09-28", total: 1480, state: "overdue" },
  { n: 129, customerId: "tonle-sap", branch: SR, issued: "2026-09-25", total: 420, state: "overdue" },
  { n: 127, customerId: "angkor-wholesale", branch: CM, issued: "2026-09-22", total: 1940, state: "paid", paid: [{ date: day(8), amount: 1940, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26281A8C10", by: "Sokha Chan" }] },
  { n: 126, customerId: "golden-lotus", branch: TK, issued: "2026-09-21", total: 1180, state: "paid", paid: [{ date: day(5), amount: 1180, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26278G2H41", by: "Dara Sok" }] },
  { n: 124, customerId: "borey-cafe", branch: TK, issued: "2026-09-18", total: 410, state: "paid", paid: [{ date: day(2), amount: 410, method: "KHQR", accountId: "wing-merchant-khr", ref: "KHQR 98102", by: "Dara Sok", khr: 1681000 }] },
  { n: 121, customerId: "golden-lotus", branch: TK, issued: "2026-09-14", total: 960, state: "paid", paid: [{ date: "2026-09-28", amount: 960, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26271Q0S55", by: "Dara Sok" }] },
  { n: 118, customerId: "borey-cafe", branch: TK, issued: "2026-09-10", total: 385, state: "paid", paid: [{ date: "2026-09-24", amount: 385, method: "KHQR", accountId: "wing-merchant-khr", ref: "KHQR 96011", by: "Dara Sok", khr: 1578500 }] },
  { n: 115, customerId: "golden-lotus", branch: TK, issued: "2026-09-07", total: 1040, state: "paid", paid: [{ date: "2026-09-21", amount: 1040, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26264D7F02", by: "Dara Sok" }] },
  { n: 113, customerId: "angkor-wholesale", branch: CM, issued: "2026-09-04", total: 2260, state: "paid", paid: [{ date: "2026-09-20", amount: 2260, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26263K4L90", by: "Sokha Chan" }] },
  { n: 112, customerId: "borey-cafe", branch: TK, issued: "2026-09-03", total: 350, state: "paid", paid: [{ date: "2026-09-17", amount: 350, method: "KHQR", accountId: "wing-merchant-khr", ref: "KHQR 95233", by: "Dara Sok", khr: 1435000 }] },
];

/** Invoice numbers that do not appear in frame 09.7 between 0156 and 0138. */
const MISSING = [152, 150, 148, 146, 145, 143, 141, 140, 139];
const OTHERS = CUSTOMERS.slice(8).map((c) => c.id);
const NON_TK: BranchName[] = [CM, SR, BB];

function buildInvoices(): Invoice[] {
  const rand = seeded(74);
  const seeds: InvSeed[] = [...DESIGNED_INVOICES];
  const designedNs = new Set(seeds.map((s) => s.n));
  const slots: number[] = [];
  for (let n = 156; n >= 92; n--) if (!designedNs.has(n) && !MISSING.includes(n)) slots.push(n);
  // Issue dates follow the number between designed anchors (0092–0111 on 1–3 Sep).
  const anchors = [...seeds.map((s) => [s.n, s.issued] as [number, string]), [92, "2026-09-01"] as [number, string]].sort((a, b) => a[0] - b[0]);
  const dateOf = (n: number) => {
    const lo = [...anchors].reverse().find(([k]) => k <= n)!;
    const hi = anchors.find(([k]) => k >= n) ?? lo;
    if (lo[0] === hi[0]) return lo[1];
    const span = (Date.parse(hi[1]) - Date.parse(lo[1])) / 86400000;
    return addDaysIso(lo[1], Math.round(((n - lo[0]) / (hi[0] - lo[0])) * span));
  };
  // Open invoices of other customers, 45-day terms (balances $7,230.00 in total).
  const open: [number, number, InvSeed["state"], number?][] = [
    [128, 2100, "sent"],
    [130, 1850, "sent"],
    [132, 1400, "sent"],
    [134, 880, "sent"],
    [135, 600, "sent"],
    [136, 900, "partial", 500],
  ];
  const opens = new Set(open.map(([n]) => n));
  const drafts = new Set([137, 111]);
  // Extra in-window invoices of the designed customers, all paid in September or October.
  const quota = [...Array(3).fill("golden-lotus"), ...Array(5).fill("tonle-sap"), ...Array(5).fill("phsar-leu"), ...Array(3).fill("riverside-hotel"), "sovann-guesthouse", "kampot-pepper-house", "kampot-pepper-house"];
  const homeBranch: Record<string, BranchName> = { "golden-lotus": CM, "tonle-sap": SR, "phsar-leu": BB, "riverside-hotel": SR, "sovann-guesthouse": BB, "kampot-pepper-house": CM };
  let otherIdx = 0;
  const nextOther = () => OTHERS[otherIdx++ % OTHERS.length];
  const paidSlots = slots.filter((n) => !opens.has(n) && !drafts.has(n));
  // 27 paid invoices with 33 October payments worth $16,250.00 (frame 09.11: 41 payments, $22,940.00).
  const paidTotals = split(rand, 16250, paidSlots.length, 1);
  const twoPayments = new Set(paidSlots.filter((_, i) => i % 4 === 1).slice(0, 6));
  paidSlots.forEach((n, i) => {
    const customerId = n <= 133 && quota.length ? quota.shift()! : nextOther();
    const issued = dateOf(n);
    const total = paidTotals[i];
    const paidOn = (offset: number) => {
      const d = addDaysIso(issued, 14 + offset);
      return d < "2026-10-01" ? `2026-10-0${1 + (n % 8)}` : d > "2026-10-30" ? "2026-10-30" : d;
    };
    const branch = homeBranch[customerId] ?? pick(rand, NON_TK);
    const pay = (amount: number, date: string) => {
      const method = pick(rand, ["Bank transfer", "Bank transfer", "KHQR", "Cash"]);
      return {
        date,
        amount,
        method,
        accountId: method === "Cash" ? ACCOUNT_FOR[`Cash|${branch}`] : "aba-business-usd",
        ref: method === "Cash" ? `Receipt 0${300 + n}` : method === "KHQR" ? `KHQR ${90000 + n * 37}` : `FT26${280 + (n % 20)}${(n * 7919).toString(36).toUpperCase().slice(0, 5)}`,
        by: PEOPLE[branch],
      };
    };
    const payments = twoPayments.has(n) ? [pay(round2(Math.floor(total / 2)), paidOn(-4)), pay(round2(total - Math.floor(total / 2)), paidOn(2))] : [pay(total, paidOn(rand() < 0.5 ? 0 : 3))];
    seeds.push({ n, customerId, branch, issued, total, state: "paid", paid: payments });
  });
  for (const [n, total, state, paid] of open) {
    const branch = pick(rand, NON_TK);
    const issued = dateOf(n);
    seeds.push({
      n,
      customerId: nextOther(),
      branch,
      issued,
      due: addDaysIso(issued, 45),
      total,
      state,
      paid: paid ? [{ date: "2026-10-20", amount: paid, method: "Bank transfer", accountId: "aba-business-usd", ref: "FT26293P5R18", by: PEOPLE[branch] }] : undefined,
    });
  }
  for (const n of drafts) seeds.push({ n, customerId: nextOther(), branch: pick(rand, NON_TK), issued: dateOf(n), total: round2(120 + rand() * 500), state: "draft" });

  // Older invoices (March–August) behind the customer totals in 09.4 and 09.5.
  // Angkor Wholesale: 12 invoices since March, $21,860.00 in total (frame 09.5).
  const older: [string, number][] = Array.from({ length: 8 }, () => ["angkor-wholesale", 0] as [string, number]);
  const angkorOlder = [1720, ...split(rand, 12510, 7, 10)];
  let on = 89;
  older.forEach(([customerId], i) => {
    const issued = i === 0 ? "2026-08-15" : addDaysIso("2026-08-12", -i * 21);
    const total = customerId === "angkor-wholesale" ? angkorOlder[i] : round2(300 + rand() * 1400);
    const branch = homeBranch[customerId] ?? CM;
    const paidDate = addDaysIso(issued, customerId === "angkor-wholesale" ? 16 : 14);
    seeds.push({ n: on, customerId, branch, issued, total, state: "paid", paid: [{ date: paidDate, amount: total, method: "Bank transfer", accountId: "aba-business-usd", ref: `FT26${(on * 3571).toString(36).toUpperCase().slice(0, 7)}`, by: PEOPLE[branch] }] });
    on -= 1 + (i % 3);
  });

  return seeds
    .map((s): Invoice => {
      const customer = CUSTOMERS.find((c) => c.id === s.customerId)!;
      const due = s.due ?? addDaysIso(s.issued, customer.terms);
      const fmt = (iso: string) => `${Number(iso.slice(8, 10))} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(iso.slice(5, 7)) - 1]} 2026`;
      const by = PEOPLE[s.branch];
      const payments: InvoicePayment[] = (s.paid ?? []).map((p, i) => ({ id: `pay-${s.n}-${i}`, ...p }));
      const history: HistoryEntry[] = [
        ...payments.map((p) => ({ kind: "payment" as const, title: `Payment recorded · $${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, meta: `${p.by} · ${fmt(p.date)}, 16:40`, detail: `${p.method} · ref ${p.ref}` })).reverse(),
        ...(s.state === "cancelled" ? [{ kind: "status" as const, title: "Invoice cancelled", meta: `${by} · ${fmt(addDaysIso(s.issued, 3))}, 10:05`, detail: "Customer changed the order" }] : []),
        ...(s.state !== "draft" ? [{ kind: "submit" as const, title: "Sent by Telegram and email", meta: `${by} · ${fmt(s.issued)}, 11:12` }] : []),
        { kind: "start" as const, title: "Draft created", meta: `${by} · ${fmt(s.issued)}, 11:05` },
      ];
      return {
        id: `INV-2026-${pad(s.n)}`,
        customerId: s.customerId,
        branch: s.branch,
        issued: s.issued,
        due,
        currency: "USD",
        lines: linesFor(rand, s.total, s.items),
        notes: "",
        stored: s.state === "draft" ? "draft" : s.state === "cancelled" ? "cancelled" : null,
        payments,
        history,
        sentAt: s.state === "draft" ? undefined : s.issued,
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/* ---------- Planned purchases (09.12–09.15) ---------- */

function buildPlanned(invoices: Invoice[]): Planned[] {
  const rand = seeded(75);
  const rows: [number, string, BranchName, string, string, number, Planned["status"], string?][] = [
    [31, "riverside-hotel", SR, "2026-10-26", "2026-11-15", 714.4, "accepted"],
    [30, "angkor-wholesale", CM, "2026-10-25", "2026-11-08", 2960, "sent"],
    [29, "borey-cafe", TK, "2026-10-22", "2026-11-05", 418, "draft"],
    [28, "golden-lotus", TK, "2026-10-14", "2026-10-28", 1250, "converted", "INV-2026-0154"],
    [27, "tonle-sap", SR, "2026-10-10", "2026-10-24", 610, "expired"],
    [26, "sovann-guesthouse", BB, "2026-10-06", "2026-10-20", 280, "rejected"],
    [25, "golden-lotus", CM, "2026-10-01", "2026-10-15", 1250, "converted", "INV-2026-0138"],
    [24, "riverside-hotel", SR, "2026-09-29", "2026-10-13", 3420, "converted", "INV-2026-0155"],
    [23, "phsar-leu", BB, "2026-09-24", "2026-10-08", 1480, "converted", "INV-2026-0131"],
    [22, "borey-cafe", TK, "2026-09-16", "2026-09-30", 640, "converted", "INV-2026-0151"],
    [21, "lucky-mart", CM, "2026-10-21", "2026-11-04", 930, "sent"],
    [20, "tonle-sap", SR, "2026-09-10", "2026-09-24", 455, "expired"],
  ];
  const fmt = (iso: string) => `${Number(iso.slice(8, 10))} ${["Sep", "Oct", "Nov"][Number(iso.slice(5, 7)) - 9]} 2026`;
  return rows.map(([n, customerId, branch, created, expires, total, status, invoiceId]) => {
    const by = PEOPLE[branch];
    const lines =
      n === 31
        ? [
            { itemId: "vital-water", description: "Vital Water 500ml × 12", sku: "BEV-VTL-500", qty: 120, price: 3, discount: 0 },
            { itemId: "kampot-pepper", description: "Kampot Pepper 100g", sku: "SPC-KPP-100", qty: 40, price: 5.5, discount: 0 },
            { itemId: "condensed-milk", description: "Condensed Milk 390g", sku: "DRY-CDM-390", qty: 96, price: 1.4, discount: 0 },
          ]
        : invoiceId
          ? invoices.find((i) => i.id === invoiceId)?.lines ?? linesFor(rand, total)
          : linesFor(rand, total);
    const history: HistoryEntry[] = [
      ...(status === "converted" ? [{ kind: "status" as const, title: `Converted to ${invoiceId}`, meta: `${by} · ${fmt(addDaysIso(created, 4))}, 09:30` }] : []),
      ...(status === "accepted" ? [{ kind: "status" as const, title: "Accepted by customer", meta: `${by} · 30 Oct 2026, 10:42`, detail: "Confirmed by Telegram" }] : []),
      ...(status === "rejected" ? [{ kind: "returned" as const, title: "Rejected by customer", meta: `${by} · ${fmt(addDaysIso(created, 5))}, 14:10`, detail: "Found a cheaper supplier" }] : []),
      ...(status === "expired" ? [{ kind: "status" as const, title: "Expired", meta: `System · ${fmt(expires)}, 23:59` }] : []),
      ...(status !== "draft" ? [{ kind: "submit" as const, title: "Sent by Telegram", meta: `${by} · ${fmt(created)}, 15:10` }] : []),
      { kind: "start" as const, title: "Planned purchase created", meta: `${by} · ${fmt(created)}, 15:02` },
    ];
    return {
      id: `PP-2026-${pad(n)}`,
      customerId,
      branch,
      created,
      expires,
      currency: "USD",
      lines,
      notes: "",
      status,
      invoiceId,
      history,
      acceptedNote: status === "accepted" ? "Visal Tep confirmed by Telegram." : undefined,
    };
  });
}

export function buildOpsState(): OpsState {
  const invoices = buildInvoices();
  // 26 of October's 41 payments were read from a payment slip (63%, frame 09.11).
  invoices
    .flatMap((i) => i.payments)
    .filter((p) => p.date.startsWith("2026-10") && p.method !== "Cash")
    .slice(0, 26)
    .forEach((p) => (p.slip = `slip_${p.ref.replace(/\W/g, "")}.jpg`));
  return {
    items: structuredClone(ITEMS),
    moves: buildMoves(),
    adjustments: ADJUSTMENTS,
    saleLines: buildSaleLines(),
    walkIns: buildWalkIns(),
    customers: CUSTOMERS,
    invoices,
    planned: buildPlanned(invoices),
    next: { invoice: 157, walkIn: 1089, planned: 32, move: 10000 },
  };
}
