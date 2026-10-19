import type { IconName } from "./icon";

/** Product name used across the landing page. Change it here once. */
export const BRAND = "FinanceSight";

export const navLinks = [
  ["Home", "#top"],
  ["Features", "#features"],
  ["Roles", "#pricing"],
  ["Guides", "#insights"],
] as const;

/** Services FinanceSight connects to (spec 3.4, 3.13). Names only — no brand logos are used. */
export const logos: { name: string; icon: IconName }[] = [
  { name: "Shopify", icon: "bag" },
  { name: "WeBill365", icon: "layers" },
  { name: "ABA Bank", icon: "building" },
  { name: "Wing", icon: "wallet" },
  { name: "ACLEDA", icon: "building" },
  { name: "KHQR", icon: "grid" },
  { name: "Telegram", icon: "chat" },
  { name: "Google sign-in", icon: "globe" },
];

export type Feature = {
  title: string;
  text: string;
  points: { icon: IconName; label: string }[];
  widget: "target" | "balance" | "ai";
};

export const features: Feature[] = [
  {
    title: "Snap it, AI books it",
    text: "Receipts, payment slips, supplier invoices, bank statements and POS data go into one ledger with almost no typing. AI reads, cleans and flags every record, and you review it before posting.",
    points: [
      { icon: "camera", label: "Reads Khmer and English receipts, even handwritten" },
      { icon: "layers", label: "Imports CSV, Excel, ABA, Wing and ACLEDA statements" },
      { icon: "checkCircle", label: "Flags duplicates and odd amounts before posting" },
    ],
    widget: "target",
  },
  {
    title: "Know your cash position",
    text: "Keep one accurate ledger in USD and KHR across cash tills, bank accounts and wallets, and prove it against reality with till balancing and bank reconciliation.",
    points: [
      { icon: "wallet", label: "Every entry keeps its own currency and exchange rate" },
      { icon: "chart", label: "Bank reconciliation matched on date, reference and amount" },
      { icon: "checkCircle", label: "Till counts with automatic over/short per currency" },
    ],
    widget: "balance",
  },
  {
    title: "Ask your numbers anything",
    text: "Understand your business without accounting skills. Ask in Khmer or English and get a clear answer that shows the records behind it.",
    points: [
      { icon: "sparkle", label: "Replies in the language you asked in" },
      { icon: "chart", label: "Compares periods and separates one-time from recurring costs" },
      { icon: "checkCircle", label: "Monthly AI report on the 1st, exportable as PDF" },
    ],
    widget: "ai",
  },
];

export type Plan = {
  name: string;
  price: string;
  unit: string;
  text: string;
  icon: IconName;
  points: string[];
  cta: string;
  featured?: boolean;
};

/** Rendered in the "Roles" section (two cards). Featured = Business Owner. */
export const plans: Plan[] = [
  {
    name: "Branch Manager",
    price: "1",
    unit: "/assigned branch",
    icon: "user",
    text: "Runs day-to-day work for one branch and sees only that branch's records plus shared items, customers and categories.",
    points: [
      "Record sales, invoices, bills and transactions",
      "Stock adjustments for the branch",
      "Till counts at the end of each shift",
      "Import statements for the branch's own accounts",
      "Joins by invitation from the owner",
    ],
    cta: "Accept an Invitation",
  },
  {
    name: "Business Owner",
    price: "All",
    unit: "/branches",
    icon: "building",
    text: "Sets up the business, invites Branch Managers and sees every branch, with forecasting and planning tools.",
    points: [
      "Manage branches, managers and settings",
      "Own items, customers, categories and accounts",
      "Sign off till balances and reconciliations",
      "Cash forecasts, cash-crunch alerts and what-if tests",
      "Connect Shopify, WeBill365 and Telegram",
    ],
    cta: "Get Started",
    featured: true,
  },
];

/**
 * PLACEHOLDER CONTENT — sample quotes so the layout can be reviewed.
 * Replace with real, attributable customer feedback before launch.
 */
export const quotes = [
  {
    name: "Sample Owner",
    role: "Owner, Sample Mart · Phnom Penh",
    text: "I snap the receipt and it's in the books. At the end of the month I finally know where the money went, in dollars and in riel.",
  },
  {
    name: "Sample Manager",
    role: "Branch Manager, Sample Mini Market",
    text: "Closing the till used to take an hour of counting and guessing. Now I enter the count and see right away if we are over or short.",
  },
  {
    name: "Sample Founder",
    role: "Founder, Sample Shop · Siem Reap",
    text: "The cash warning came three weeks early. We delayed one supplier order and never ran short. That alone was worth it.",
  },
];

export const articles = [
  { title: "Reading Your Health Score", date: "October 12, 2025", tag: "Dashboard", read: "5 min read", tone: 0 },
  { title: "From Receipts to Ledger", date: "October 18, 2025", tag: "Data import", read: "4 min read", tone: 1 },
  { title: "Planning for a Cash Crunch", date: "October 24, 2025", tag: "Forecasting", read: "6 min read", tone: 2 },
];

/** Facts from the product spec. */
export const stats = [
  ["2", "Currencies, USD & KHR"],
  ["2", "Languages, Khmer & English"],
  ["90", "Day cash forecasts"],
  ["7", "Bank, sales & app integrations"],
] as const;

export const footerCols = [
  { title: "Product", items: ["Dashboard", "Data import", "Sales & invoices", "Forecasting"] },
  { title: "Platform", items: ["Web app", "Mobile app", "AI financial advisor", "Monthly AI report"] },
  { title: "Others", items: ["Integrations", "FAQ", "Help Center"] },
];
