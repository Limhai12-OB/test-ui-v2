import { KHR_PER_USD, type Currency } from "@/lib/mock/dashboard";

export type { Currency };

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const khr = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Formats a USD amount in the display currency chosen in the top bar. */
export function formatMoney(amountUsd: number, currency: Currency) {
  if (currency === "KHR") return `៛${khr.format(Math.round((amountUsd * KHR_PER_USD) / 100) * 100)}`;
  return `$${usd.format(amountUsd)}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const f2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Number without a currency sign: 2 decimals for USD, none for KHR. */
export function num(value: number, currency: Currency = "USD") {
  return currency === "KHR" ? f0.format(Math.abs(value)) : f2.format(Math.abs(value));
}

/**
 * Amount in its own currency, e.g. "$1,320.00" or "៛860,000". Negative values
 * use a true minus sign as in the design; `sign` adds "+" to positive values.
 */
export function money(value: number, currency: Currency = "USD", { sign = false } = {}) {
  const prefix = value < 0 ? "−" : sign && value > 0 ? "+" : "";
  return `${prefix}${currency === "KHR" ? "៛" : "$"}${num(value, currency)}`;
}

/** Signed number without currency sign, for table cells: "+1,250.00" / "−1,320.00". */
export function signed(value: number, currency: Currency = "USD") {
  return `${value < 0 ? "−" : value > 0 ? "+" : ""}${num(value, currency)}`;
}

export const toUsd = (value: number, currency: Currency) => (currency === "KHR" ? value / KHR_PER_USD : value);
export const toKhr = (value: number, currency: Currency) => (currency === "USD" ? value * KHR_PER_USD : value);

/** "≈ $209.76" / "≈ ៛101,723,300": the other currency at the display rate. */
export function approxOther(value: number, currency: Currency) {
  return currency === "KHR" ? `≈ ${money(toUsd(value, "KHR"), "USD")}` : `≈ ${money(toKhr(value, "USD"), "KHR")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The demo's "today". All mock data is dated relative to 31 Oct 2026. */
export const TODAY = "2026-10-31";

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "31 Oct 2026" */
export const fmtDate = (iso: string) => {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m]} ${y}`;
};
/** "31 Oct" */
export const fmtDay = (iso: string) => {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m]}`;
};
/** "October 2026" */
export const fmtMonth = (iso: string) => {
  const { y, m } = parts(iso);
  return `${LONG_MONTHS[m]} ${y}`;
};
/** "Saturday 31 October 2026" */
export const fmtLongDate = (iso: string) => {
  const { y, m, d } = parts(iso);
  return `${DAYS[new Date(Date.UTC(y, m, d)).getUTCDay()]} ${d} ${LONG_MONTHS[m]} ${y}`;
};
/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string) {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m, pb.d) - Date.UTC(pa.y, pa.m, pa.d)) / 86400000);
}
export function addDays(iso: string, days: number) {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m, d + days)).toISOString().slice(0, 10);
}

/** Downloads rows as a CSV file in the browser. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** "Angkor Wholesale Trading" → "AW"; ignores "&" and similar. */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
