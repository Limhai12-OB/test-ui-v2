/**
 * Forecasting (frame 20.11). Figures follow the design: cash today is the
 * $86,408.60 the other screens show, the expected cash dips to $68,600.00 on
 * 16 Nov (festival stock order) with a conservative low of $58,200 on 22 Nov,
 * and November is expected at $50,300 revenue and $33,100 expenses.
 */

export type Horizon = 1 | 3 | 6;
export const SAFETY_LEVEL = 60000;
export const CASH_TODAY = 86408.6;
export const HISTORY_DAYS = 245;

export type Point = { date: string; label: string; value: number };
export type ForecastPoint = { date: string; label: string; p10: number; p50: number; p90: number };

/** Recorded cash at the end of each week, 1 Sep – 31 Oct 2026. */
export const RECORDED: Point[] = [
  ["2026-09-01", 72400],
  ["2026-09-08", 74100],
  ["2026-09-15", 73300],
  ["2026-09-22", 76900],
  ["2026-09-29", 75200],
  ["2026-10-06", 78800],
  ["2026-10-13", 80100],
  ["2026-10-20", 79400],
  ["2026-10-27", 83900],
  ["2026-10-31", CASH_TODAY],
].map(([date, value]) => ({ date: date as string, label: label(date as string), value: value as number }));

function label(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}

/** Expected cash (P50) with the P10–P90 range, weekly from 31 Oct 2026 to 30 Apr 2027. */
const P50: [string, number, number, number][] = [
  // date, p50, p10, p90. Month ends match applyScenario(BASE_SCENARIO): profit − drawings − receivables growth.
  ["2026-10-31", CASH_TODAY, CASH_TODAY, CASH_TODAY],
  ["2026-11-07", 80300, 76900, 83600],
  ["2026-11-16", 68600, 62100, 75200],
  ["2026-11-22", 76500, 58200, 84900],
  ["2026-11-30", 92800, 81200, 104100],
  ["2026-12-07", 94900, 81900, 108300],
  ["2026-12-14", 97300, 82800, 112600],
  ["2026-12-21", 99800, 83900, 117100],
  ["2026-12-31", 102700, 84800, 121900],
  ["2027-01-07", 103900, 84600, 124700],
  ["2027-01-14", 105000, 84300, 127600],
  ["2027-01-21", 106100, 84100, 130400],
  ["2027-01-31", 107100, 83900, 133700],
  ["2027-02-15", 110300, 83100, 140200],
  ["2027-02-28", 113600, 82800, 146900],
  ["2027-03-15", 116400, 82100, 153100],
  ["2027-03-31", 119300, 81900, 159800],
  ["2027-04-15", 123700, 81600, 165600],
  ["2027-04-30", 128200, 81800, 172400],
];
const FORECAST: ForecastPoint[] = P50.map(([date, p50, p10, p90]) => ({ date, label: label(date), p50, p10, p90 }));

export const HORIZON_END: Record<Horizon, string> = { 1: "2026-11-30", 3: "2027-01-31", 6: "2027-04-30" };
export const HORIZON_LABEL: Record<Horizon, string> = { 1: "1 Nov – 30 Nov 2026", 3: "1 Nov 2026 – 31 Jan 2027", 6: "1 Nov 2026 – 30 Apr 2027" };
export const forecastTo = (h: Horizon) => FORECAST.filter((p) => p.date <= HORIZON_END[h]);

/** Monthly expectations (USD) with their P10–P90 ranges. */
export type MonthForecast = { id: string; label: string; revenue: [number, number, number]; expenses: [number, number, number]; drawings: number; note?: string };
export const MONTHS: MonthForecast[] = [
  { id: "2026-11", label: "November 2026", revenue: [46200, 50300, 54900], expenses: [31600, 33100, 34900], drawings: 6500, note: "Festival stock order on 16 Nov ($14,800.00)" },
  { id: "2026-12", label: "December 2026", revenue: [50800, 56100, 61900], expenses: [33200, 35400, 37900], drawings: 6500, note: "Year-end sales; staff bonus on 24 Dec" },
  { id: "2027-01", label: "January 2027", revenue: [44300, 49900, 55800], expenses: [32100, 34600, 37400], drawings: 6500 },
  { id: "2027-02", label: "February 2027", revenue: [43800, 51200, 58900], expenses: [32600, 35200, 38100], drawings: 6500, note: "Chinese New Year week" },
  { id: "2027-03", label: "March 2027", revenue: [42100, 50100, 58600], expenses: [32300, 35000, 38200], drawings: 6500 },
  { id: "2027-04", label: "April 2027", revenue: [44900, 54800, 64900], expenses: [33400, 36500, 40100], drawings: 6500, note: "Khmer New Year, 14–16 Apr" },
];
export const monthsFor = (h: Horizon) => MONTHS.slice(0, h);

/** Customers are expected to owe more at the end of the horizon than today. */
const RECEIVABLES_BY_MONTH = [4300, 4300, 4400, 3000, 2900, 2900];
export const RECEIVABLES_GROWTH: Record<Horizon, number> = { 1: 4300, 3: 13000, 6: 21800 };

export function totals(h: Horizon) {
  const m = monthsFor(h);
  const sum = (pick: (x: MonthForecast) => number) => m.reduce((s, x) => s + pick(x), 0);
  const revenue = { p10: sum((x) => x.revenue[0]), p50: sum((x) => x.revenue[1]), p90: sum((x) => x.revenue[2]) };
  const expenses = { p10: sum((x) => x.expenses[0]), p50: sum((x) => x.expenses[1]), p90: sum((x) => x.expenses[2]) };
  const profit = revenue.p50 - expenses.p50;
  const drawings = sum((x) => x.drawings);
  const end = forecastTo(h).at(-1)!;
  return { revenue, expenses, profit, drawings, receivables: RECEIVABLES_GROWTH[h], cash: end, profitRange: [revenue.p10 - expenses.p90, revenue.p90 - expenses.p10] as const };
}

/** Reliability levels from backtests on the recorded history. */
export type Reliability = { level: "High" | "Good" | "Fair" | "Low"; bars: 1 | 2 | 3 | 4; error: string };
export const RELIABILITY: Record<string, Record<Horizon, Reliability>> = {
  revenue: { 1: { level: "High", bars: 4, error: "within ±5%" }, 3: { level: "Good", bars: 3, error: "within ±9%" }, 6: { level: "Fair", bars: 2, error: "within ±16%" } },
  expenses: { 1: { level: "High", bars: 4, error: "within ±4%" }, 3: { level: "Good", bars: 3, error: "within ±7%" }, 6: { level: "Good", bars: 3, error: "within ±11%" } },
  cash: { 1: { level: "Good", bars: 3, error: "within ±$6,800" }, 3: { level: "Good", bars: 3, error: "within ±$11,200" }, 6: { level: "Fair", bars: 2, error: "within ±$24,500" } },
};
export const BACKTESTS = [
  { month: "May 2026", forecast: 36400, actual: 36900 },
  { month: "June 2026", forecast: 37900, actual: 38400 },
  { month: "July 2026", forecast: 40800, actual: 40150 },
  { month: "August 2026", forecast: 41100, actual: 41800 },
  { month: "September 2026", forecast: 44600, actual: 43250 },
  { month: "October 2026", forecast: 46900, actual: 48620 },
];

/** Known money in and out over the next 30 days ("drawn on their dates"). */
export const KNOWN_ITEMS = [
  { date: "2026-11-01", label: "Rent · 4 branches", amount: -4800, kind: "Bill" },
  { date: "2026-11-01", label: "BILL-0930 · Khmer Fresh Produce", amount: -820, kind: "Bill" },
  { date: "2026-11-02", label: "BILL-0931 · Cambodia Beverage Co.", amount: -1480, kind: "Bill" },
  { date: "2026-11-05", label: "Owner drawings", amount: -6500, kind: "Drawings" },
  { date: "2026-11-05", label: "Borey Café · invoice due", amount: 418, kind: "Invoice" },
  { date: "2026-11-08", label: "Golden Lotus Restaurant · invoice due", amount: 950, kind: "Invoice" },
  { date: "2026-11-15", label: "Riverside Hotel Supplies · planned order", amount: 714.4, kind: "Invoice" },
  { date: "2026-11-16", label: "Festival stock order · Vattanac Distribution", amount: -14800, kind: "Purchase" },
  { date: "2026-11-25", label: "Payroll · 17 staff", amount: -7640, kind: "Payroll" },
];

/** Expense categories expected for the first forecast month. */
export const EXPENSE_CATEGORIES = [
  { name: "Inventory purchases", recorded: 14820, expected: 15400, range: [14600, 16300] },
  { name: "Payroll", recorded: 7640, expected: 7640, range: [7640, 7640] },
  { name: "Rent", recorded: 4800, expected: 4800, range: [4800, 4800] },
  { name: "Utilities", recorded: 2460, expected: 2620, range: [2380, 2900] },
  { name: "Internet & phone", recorded: 620, expected: 620, range: [600, 640] },
  { name: "Other", recorded: 1600, expected: 2020, range: [1580, 2560] },
];

export const REVENUE_SOURCES = [
  { name: "Wholesale invoices", recorded: 27340, expected: 28100, range: [25600, 30700] },
  { name: "Walk-in sales", recorded: 17460, expected: 18300, range: [16900, 19800] },
  { name: "Online sales (Shopify)", recorded: 3820, expected: 3900, range: [3300, 4500] },
];

export const BRANCH_REVENUE = [
  { name: "Central Market (Main)", recorded: 19840, expected: 20600 },
  { name: "Toul Kork", recorded: 13260, expected: 13900 },
  { name: "Siem Reap", recorded: 9710, expected: 10100 },
  { name: "Battambang", recorded: 5810, expected: 5700 },
];

/* ---------- What-if ---------- */

export type Scenario = { hires: number; salary: number; startMonth: number; priceChange: number; purchase: number; purchaseMonth: number; drawings: number };
export const BASE_SCENARIO: Scenario = { hires: 0, salary: 380, startMonth: 1, priceChange: 0, purchase: 0, purchaseMonth: 1, drawings: 6500 };

/** Applies a scenario to the monthly expectations; price changes are assumed to keep 70% of unit sales. */
export function applyScenario(s: Scenario, h: Horizon) {
  const months = monthsFor(h);
  let cash = CASH_TODAY;
  let lowest = { value: Infinity, month: "" };
  const rows = months.map((m, i) => {
    const n = i + 1;
    const priceFactor = 1 + (s.priceChange / 100) * 0.7 - (s.priceChange > 0 ? (s.priceChange / 100) * 0.3 * 0.5 : 0);
    const revenue = Math.round(m.revenue[1] * priceFactor);
    const extraPayroll = n >= s.startMonth ? s.hires * s.salary : 0;
    const purchase = n === s.purchaseMonth ? s.purchase : 0;
    const expenses = m.expenses[1] + extraPayroll + purchase;
    const profit = revenue - expenses;
    const receivables = RECEIVABLES_BY_MONTH[i];
    // The festival dip sits inside November; it is ~17,800 below the month's opening cash.
    const dip = n === 1 ? 17800 : 0;
    const monthLow = cash - dip - purchase * 0.5;
    if (monthLow < lowest.value) lowest = { value: monthLow, month: m.label };
    cash = cash + profit - s.drawings - receivables;
    return { ...m, revenueValue: revenue, expensesValue: expenses, profit, cashEnd: cash };
  });
  return { rows, revenue: rows.reduce((t, r) => t + r.revenueValue, 0), expenses: rows.reduce((t, r) => t + r.expensesValue, 0), profit: rows.reduce((t, r) => t + r.profit, 0), cash, lowest };
}
