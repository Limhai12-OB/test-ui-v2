/**
 * Scripted AI Advisor answers (section 11). The advisor is read-only: every
 * answer is canned data built from the same October 2026 figures the other
 * screens use, and links to the records it was "calculated" from.
 */

export type AdvisorScope = "all" | "toul-kork";
export type AdvisorLang = "en" | "km";

export type RecordKind = "report" | "invoice" | "bill" | "transactions" | "accounts" | "branch";

export type AdvisorRecord = {
  id: string;
  kind: RecordKind;
  /** Chip label, e.g. "38 invoices" or "BILL-0924 · EDC". */
  label: string;
  href: string;
  /** Card in the "Referenced records" sheet (frame 11.6). */
  title?: string;
  sub?: string;
  status?: { label: string; tone: "error" | "warning" | "success" | "sky" };
  amount?: string;
  amountSub?: string;
  /** Key/value rows shown when the record is selected. */
  preview?: [string, string, "error"?][];
};

export type Stat = { label: string; value: string; delta: string; vs: string; tone: "good" | "bad" };

export type ColumnChart = {
  kind: "columns";
  title: string;
  series: { label: string; color: string }[];
  groups: { label: string; values: number[] }[];
  max: number;
  yLabels: string[];
};

export type BranchBars = {
  kind: "branch-bars";
  title: string;
  series: { label: string; color: string }[];
  rows: { label: string; bar: number; track: number; value: string; note: string; highlight?: boolean }[];
};

export type Table = {
  columns: { label: string; align?: "right" }[];
  rows: { cells: string[]; href?: string; tones?: ("up" | "down" | "error" | undefined)[] }[];
  total?: string[];
};

export type Answer = {
  id: string;
  lang?: AdvisorLang;
  /** "warning" is the amber "not enough data" card, "locked" a read-only or branch limit. */
  tone?: "default" | "warning" | "locked";
  tags: string[];
  readOnlyTag?: boolean;
  heading?: string;
  text: string;
  stats?: Stat[];
  chart?: ColumnChart | BranchBars;
  table?: Table;
  note?: string;
  insight?: { title: string; body: string; basis: string; href: string; link: string };
  available?: { ok: boolean; text: string }[];
  importPrompt?: { text: string; href: string; label: string };
  actions?: { label: string; href: string; icon: "invoice" | "payment" | "import" }[];
  records: AdvisorRecord[];
  followUps: string[];
  /** Steps shown while the answer is being worked out (frame 11.7). */
  steps: string[];
  /** Where to look instead when the answer fails (frame 11.8). */
  fallback: { label: string; href: string };
  disclaimer?: boolean;
};

const C = { sep: "#64748b", oct: "var(--lf-chart-revenue)", exp: "var(--lf-chart-expense)", rev: "var(--lf-chart-revenue)" };
const DISCLAIMER = true;

/* ---------- Referenced records ---------- */

const R = {
  pl: { id: "pl-oct", kind: "report", label: "Profit & loss · Oct 2026", href: "/monthly-reports", title: "Profit & loss · Oct 2026", sub: "Monthly report used for revenue, expenses and profit" },
  invoices38: { id: "inv-38", kind: "invoice", label: "38 invoices", href: "/sales/invoices", title: "38 invoices", sub: "Issued 1–31 Oct 2026 across 4 branches" },
  bills36: { id: "bills-36", kind: "bill", label: "36 bills", href: "/financial-records/bills", title: "36 bills", sub: "Supplier bills dated October 2026" },
  tx502: { id: "tx-502", kind: "transactions", label: "502 transactions", href: "/financial-records/transactions", title: "502 transactions", sub: "Bank, wallet and till lines for October 2026" },
  expCat: { id: "exp-cat", kind: "report", label: "Expenses by category · Oct 2026", href: "/financial-records/categories", title: "Expenses by category · Oct 2026", sub: "Category totals for September and October" },
  bill0931: {
    id: "BILL-0931", kind: "bill", label: "BILL-0931 · Cambodia Beverage Co.", href: "/financial-records/bills/BILL-0931",
    title: "BILL-0931", sub: "Cambodia Beverage Co. · Central Market", status: { label: "Open", tone: "sky" }, amount: "$1,480.00", amountSub: "Due 2 Nov 2026",
    preview: [["Supplier", "Cambodia Beverage Co."], ["Category", "Inventory purchases"], ["Branch", "Central Market (Main)"], ["Total", "$1,480.00 USD"], ["Due", "2 Nov 2026"]],
  },
  bill0924: {
    id: "BILL-0924", kind: "bill", label: "BILL-0924 · EDC", href: "/financial-records/bills/BILL-0924",
    title: "BILL-0924", sub: "Électricité du Cambodge · Toul Kork", status: { label: "Paid", tone: "success" }, amount: "៛2,050,000", amountSub: "≈ $500.00",
    preview: [["Supplier", "Électricité du Cambodge"], ["Category", "Utilities"], ["Branch", "Toul Kork"], ["Total", "៛2,050,000 KHR"], ["Paid", "27 Oct 2026"]],
  },
  bill0930: {
    id: "BILL-0930", kind: "bill", label: "BILL-0930 · Khmer Fresh Produce", href: "/financial-records/bills/BILL-0930",
    title: "BILL-0930", sub: "Khmer Fresh Produce · Toul Kork", status: { label: "Due soon", tone: "warning" }, amount: "$820.00", amountSub: "Due 1 Nov 2026",
    preview: [["Supplier", "Khmer Fresh Produce"], ["Category", "Inventory purchases"], ["Branch", "Toul Kork"], ["Total", "$820.00 USD"], ["Due", "1 Nov 2026"]],
  },
  payroll9: { id: "payroll-9", kind: "transactions", label: "9 payroll transactions", href: "/financial-records/transactions", title: "9 payroll transactions", sub: "Salaries paid in October 2026" },
  branchPerf: { id: "branch-perf", kind: "report", label: "Branch performance · Oct 2026", href: "/branches", title: "Branch performance · Oct 2026", sub: "Revenue and expenses for each active branch" },
  accounts8: { id: "accounts-8", kind: "accounts", label: "8 financial accounts", href: "/banking/accounts", title: "8 financial accounts", sub: "Bank accounts, wallets and cash tills" },
  payroll71: { id: "payroll-71", kind: "transactions", label: "71 payroll transactions · Mar–Oct 2026", href: "/financial-records/transactions", title: "71 payroll transactions", sub: "Every salary payment recorded since March 2026" },
  inv0129: {
    id: "INV-2026-0129", kind: "invoice", label: "INV-2026-0129", href: "/sales/invoices/INV-2026-0129",
    title: "INV-2026-0129", sub: "Tonle Sap Restaurant · Siem Reap", status: { label: "Overdue", tone: "error" }, amount: "$420.00", amountSub: "22 days overdue",
    preview: [["Customer", "Tonle Sap Restaurant"], ["Issued", "24 Sep 2026"], ["Due", "9 Oct 2026 · 22 days overdue", "error"], ["Branch", "Siem Reap"], ["Total", "$420.00 USD"], ["Paid", "$0.00"], ["Last reminder", "Sent by email · 20 Oct 2026"]],
  },
  inv0131: {
    id: "INV-2026-0131", kind: "invoice", label: "INV-2026-0131", href: "/sales/invoices/INV-2026-0131",
    title: "INV-2026-0131", sub: "Phsar Leu Traders · Battambang", status: { label: "Overdue", tone: "error" }, amount: "$1,480.00", amountSub: "19 days overdue",
    preview: [["Customer", "Phsar Leu Traders"], ["Issued", "27 Sep 2026"], ["Due", "12 Oct 2026 · 19 days overdue", "error"], ["Branch", "Battambang"], ["Total", "$1,480.00 USD"], ["Paid", "$0.00"], ["Last reminder", "Sent by Telegram · 24 Oct 2026"]],
  },
  inv0142: {
    id: "INV-2026-0142", kind: "invoice", label: "INV-2026-0142", href: "/sales/invoices/INV-2026-0142",
    title: "INV-2026-0142", sub: "Angkor Wholesale Trading · Central Market", status: { label: "Overdue", tone: "error" }, amount: "$1,250.00", amountSub: "8 days overdue",
    preview: [["Customer", "Angkor Wholesale Trading"], ["Issued", "9 Oct 2026"], ["Due", "23 Oct 2026 · 8 days overdue", "error"], ["Branch", "Central Market (Main)"], ["Total", "$1,250.00 USD"], ["Paid", "$0.00"], ["Last reminder", "Sent by Telegram · 27 Oct 2026"]],
  },
  ageing: { id: "ageing", kind: "report", label: "Receivables ageing · 31 Oct 2026", href: "/sales/invoices", title: "Receivables ageing · 31 Oct 2026", sub: "Report used for the total of $3,150.00" },
  tkOct: { id: "tk-oct", kind: "branch", label: "Toul Kork · Oct 2026", href: "/branches/toul-kork", title: "Toul Kork · Oct 2026", sub: "Branch revenue, expenses and profit" },
  tkTx118: { id: "tk-118", kind: "transactions", label: "118 branch transactions", href: "/financial-records/transactions", title: "118 branch transactions", sub: "Toul Kork lines for October 2026" },
  stock: { id: "stock", kind: "report", label: "Stock levels · 31 Oct 2026", href: "/inventory?view=branch", title: "Stock levels · 31 Oct 2026", sub: "On hand and reorder points by branch" },
  sales: { id: "sales", kind: "report", label: "Sales by item · Oct 2026", href: "/inventory/sales", title: "Sales by item · Oct 2026", sub: "Units and revenue for each item" },
  payments: { id: "payments", kind: "report", label: "Customer payments · Jun–Oct 2026", href: "/sales/payments", title: "Customer payments", sub: "Days from due date to payment, last 5 months" },
  walkIns: { id: "walk-ins", kind: "transactions", label: "1,214 walk-in sales", href: "/sales/walk-in", title: "1,214 walk-in sales", sub: "Toul Kork, October 2026" },
  till: { id: "till-30", kind: "report", label: "Till count · 30 Oct 2026", href: "/financial-records/till", title: "Till count · 30 Oct 2026", sub: "Toul Kork cash till, counted 18:04" },
  tkInvoices: { id: "tk-inv", kind: "invoice", label: "4 open invoices", href: "/sales/invoices", title: "4 open invoices", sub: "Toul Kork customers" },
} satisfies Record<string, AdvisorRecord>;

const allSteps = (what: string) => ["Understood the question", `Read ${what}`, "Checked the figures against today, 31 Oct 2026"];

/* ---------- Answers ---------- */

const ANSWERS: Answer[] = [
  {
    id: "profit",
    tags: ["All branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "Your net profit for October 2026 was **$16,680.00**, which is **32.7% higher** than September. Revenue grew by $5,370.00 while expenses grew by only $1,260.00, so your profit margin improved from 29.1% to 34.3%.",
    stats: [
      { label: "Revenue", value: "$48,620.00", delta: "+12.4%", vs: "vs September", tone: "good" },
      { label: "Expenses", value: "$31,940.00", delta: "+4.1%", vs: "vs September", tone: "bad" },
      { label: "Net profit", value: "$16,680.00", delta: "+32.7%", vs: "vs September", tone: "good" },
    ],
    chart: {
      kind: "columns",
      title: "September and October 2026 (USD)",
      series: [{ label: "September", color: C.sep }, { label: "October", color: C.oct }],
      groups: [
        { label: "Revenue", values: [43250, 48620] },
        { label: "Expenses", values: [30680, 31940] },
        { label: "Net profit", values: [12570, 16680] },
      ],
      max: 60000,
      yLabels: ["$60k", "$40k", "$20k", "$0"],
    },
    records: [R.pl, R.invoices38, R.bills36, R.tx502],
    followUps: [],
    steps: allSteps("38 invoices, 36 bills and 502 transactions"),
    fallback: { label: "View financial overview instead", href: "/financial-records" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "expenses",
    tags: ["All branches", "Oct vs Sep 2026", "Amounts in USD"],
    text: "Expenses rose by **$1,260.00 (4.1%)** to $31,940.00. Three categories went up: **inventory purchases** (+$620.00), **utilities** (+$410.00) and **payroll** (+$240.00). Internet & phone fell by $10.00; rent and other costs did not change. Toul Kork accounts for $760.00 of the increase.",
    table: {
      columns: [{ label: "Category" }, { label: "September", align: "right" }, { label: "October", align: "right" }, { label: "Change", align: "right" }, { label: "% change", align: "right" }],
      rows: [
        { cells: ["Inventory purchases", "$14,200.00", "$14,820.00", "+$620.00", "+4.4%"], tones: [, , , "up", "up"] },
        { cells: ["Utilities", "$2,050.00", "$2,460.00", "+$410.00", "+20.0%"], tones: [, , , "up", "up"] },
        { cells: ["Payroll", "$7,400.00", "$7,640.00", "+$240.00", "+3.2%"], tones: [, , , "up", "up"] },
        { cells: ["Rent", "$4,800.00", "$4,800.00", "$0.00", "0.0%"] },
        { cells: ["Other", "$1,600.00", "$1,600.00", "$0.00", "0.0%"] },
        { cells: ["Internet & phone", "$630.00", "$620.00", "−$10.00", "−1.6%"], tones: [, , , "down", "down"] },
      ],
      total: ["Total expenses", "$30,680.00", "$31,940.00", "+$1,260.00", "+4.1%"],
    },
    insight: {
      title: "Electricity at Toul Kork is rising faster than sales",
      body: "The EDC bill went from ៛1,640,000 to ៛2,050,000 (+25.0%, about $100.00 more) while branch sales grew 6.2%. It may be worth checking the cold-room hours.",
      basis: "Based on BILL-0924 and BILL-0897",
      href: "/financial-records/bills",
      link: "View bills",
    },
    records: [R.expCat, R.bill0931, R.bill0924, R.payroll9],
    followUps: ["Which branch has the highest expenses?", "Show utilities by branch", "Compare payroll with last October"],
    steps: allSteps("36 bills and 312 expense transactions"),
    fallback: { label: "View expenses instead", href: "/financial-records/categories" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "branch-expenses",
    tags: ["4 active branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "**Central Market (Main)** has the highest expenses at **$12,910.00**, which is expected because it is also your largest branch by revenue. Measured against sales, **Toul Kork** spends the most: 66.9 cents of every dollar earned, compared with 64.4 cents at Battambang.",
    chart: {
      kind: "branch-bars",
      title: "Expenses by branch · October 2026",
      series: [{ label: "Expenses", color: C.exp }, { label: "Revenue", color: C.rev }],
      rows: [
        { label: "Central Market", bar: 12910, track: 19840, value: "$12,910.00", note: "65.1% of revenue" },
        { label: "Toul Kork", bar: 8870, track: 13260, value: "$8,870.00", note: "66.9% of revenue", highlight: true },
        { label: "Siem Reap", bar: 6420, track: 9710, value: "$6,420.00", note: "66.1% of revenue" },
        { label: "Battambang", bar: 3740, track: 5810, value: "$3,740.00", note: "64.4% of revenue" },
      ],
    },
    note: "Kampot is deactivated and has no October records, so it is not included.",
    records: [R.branchPerf, R.bills36, R.tx502, R.accounts8],
    followUps: ["Why is Toul Kork’s expense ratio higher?", "Show expenses by category for Toul Kork", "Which branch earned the most?"],
    steps: allSteps("expenses and revenue for 4 active branches"),
    fallback: { label: "View branches instead", href: "/branches" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "branch-revenue",
    tags: ["4 active branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "**Central Market (Main)** earned the most in October with **$19,840.00**, 40.8% of all revenue. Toul Kork was second with $13,260.00 and grew fastest, up 6.2% on September.",
    chart: {
      kind: "branch-bars",
      title: "Revenue by branch · October 2026",
      series: [{ label: "Revenue", color: C.rev }],
      rows: [
        { label: "Central Market", bar: 19840, track: 19840, value: "$19,840.00", note: "+4.8% vs September", highlight: true },
        { label: "Toul Kork", bar: 13260, track: 19840, value: "$13,260.00", note: "+6.2% vs September" },
        { label: "Siem Reap", bar: 9710, track: 19840, value: "$9,710.00", note: "+3.1% vs September" },
        { label: "Battambang", bar: 5810, track: 19840, value: "$5,810.00", note: "+2.4% vs September" },
      ],
    },
    records: [R.branchPerf, R.invoices38, R.tx502],
    followUps: ["Which branch has the highest expenses?", "How much profit did we make this month?"],
    steps: allSteps("sales for 4 active branches"),
    fallback: { label: "View branches instead", href: "/branches" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-ratio",
    tags: ["Toul Kork", "1–31 Oct 2026", "Amounts in USD"],
    text: "Toul Kork’s ratio is higher mainly because of **electricity** and **stock purchases**. Its cold room runs all day, so utilities are 6.7% of branch revenue against 4.6% at the other branches, and Khmer Fresh Produce raised its prices in October (+$184.00).",
    stats: [
      { label: "Utilities share", value: "6.7%", delta: "+2.1 pts", vs: "vs other branches", tone: "bad" },
      { label: "Stock purchases share", value: "31.0%", delta: "+1.2 pts", vs: "vs other branches", tone: "bad" },
      { label: "Payroll share", value: "16.7%", delta: "+0.9 pts", vs: "vs other branches", tone: "good" },
    ],
    records: [R.tkOct, R.bill0924, R.bill0930],
    followUps: ["Show expenses by category for Toul Kork", "Show utilities by branch"],
    steps: allSteps("Toul Kork bills and transactions"),
    fallback: { label: "View Toul Kork instead", href: "/branches/toul-kork" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-categories",
    tags: ["Toul Kork", "Oct vs Sep 2026", "Amounts in USD"],
    text: "Toul Kork spent **$8,870.00** in October, up **$760.00**. Stock purchases and electricity explain most of the rise.",
    table: {
      columns: [{ label: "Category" }, { label: "September", align: "right" }, { label: "October", align: "right" }, { label: "Change", align: "right" }],
      rows: [
        { cells: ["Inventory purchases", "$3,688.72", "$4,108.72", "+$420.00"], tones: [, , , "up"] },
        { cells: ["Payroll", "$2,030.00", "$2,210.00", "+$180.00"], tones: [, , , "up"] },
        { cells: ["Utilities", "$786.50", "$886.50", "+$100.00"], tones: [, , , "up"] },
        { cells: ["Rent", "$1,400.00", "$1,400.00", "$0.00"] },
        { cells: ["Other", "$204.78", "$264.78", "+$60.00"], tones: [, , , "up"] },
      ],
      total: ["Total expenses", "$8,110.00", "$8,870.00", "+$760.00"],
    },
    records: [R.tkOct, R.bill0930, R.bill0924, R.tkTx118],
    followUps: ["How much did we spend on utilities?", "Which items are running low?"],
    steps: allSteps("118 Toul Kork transactions"),
    fallback: { label: "View expenses instead", href: "/financial-records/categories" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "utilities-branch",
    tags: ["4 active branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "Utilities came to **$2,460.00** in October. Toul Kork had the biggest rise, mostly the EDC electricity bill.",
    table: {
      columns: [{ label: "Branch" }, { label: "September", align: "right" }, { label: "October", align: "right" }, { label: "Change", align: "right" }],
      rows: [
        { cells: ["Central Market", "$753.50", "$873.50", "+$120.00"], tones: [, , , "up"] },
        { cells: ["Toul Kork", "$786.50", "$886.50", "+$100.00"], tones: [, , , "up"] },
        { cells: ["Siem Reap", "$330.00", "$450.00", "+$120.00"], tones: [, , , "up"] },
        { cells: ["Battambang", "$180.00", "$250.00", "+$70.00"], tones: [, , , "up"] },
      ],
      total: ["Total utilities", "$2,050.00", "$2,460.00", "+$410.00"],
    },
    records: [R.expCat, R.bill0924],
    followUps: ["Why is Toul Kork’s expense ratio higher?"],
    steps: allSteps("19 utility bills"),
    fallback: { label: "View bills instead", href: "/financial-records/bills" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "payroll-last-year",
    tone: "warning",
    tags: ["All branches", "Oct 2026 vs Oct 2025"],
    heading: "I don’t have enough data to compare these two months",
    text: "LuyFlow has payroll records from **March 2026** onwards, so there is nothing recorded for October 2025. I would rather tell you that than estimate a number.",
    available: [
      { ok: true, text: "Payroll for March–October 2026 (8 months)" },
      { ok: true, text: "Payroll by branch for the same period" },
      { ok: false, text: "Anything before 1 March 2026" },
    ],
    importPrompt: { text: "If you have older payroll in a spreadsheet, you can import it.", href: "/data-import", label: "Go to Data Import" },
    records: [R.payroll71],
    followUps: ["Show payroll by month for 2026", "Compare payroll by branch"],
    steps: allSteps("71 payroll transactions"),
    fallback: { label: "View transactions instead", href: "/financial-records/transactions" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "payroll-month",
    tags: ["All branches", "Mar–Oct 2026", "Amounts in USD"],
    text: "Payroll has grown from **$6,180.00** in March to **$7,640.00** in October, mostly from two new staff at Siem Reap in June.",
    table: {
      columns: [{ label: "Month" }, { label: "Payroll", align: "right" }, { label: "Change", align: "right" }],
      rows: [
        { cells: ["March", "$6,180.00", "—"] },
        { cells: ["April", "$6,180.00", "$0.00"] },
        { cells: ["May", "$6,320.00", "+$140.00"], tones: [, , "up"] },
        { cells: ["June", "$7,120.00", "+$800.00"], tones: [, , "up"] },
        { cells: ["July", "$7,180.00", "+$60.00"], tones: [, , "up"] },
        { cells: ["August", "$7,400.00", "+$220.00"], tones: [, , "up"] },
        { cells: ["September", "$7,400.00", "$0.00"] },
        { cells: ["October", "$7,640.00", "+$240.00"], tones: [, , "up"] },
      ],
      total: ["Total", "$55,420.00", "+$1,460.00"],
    },
    records: [R.payroll71],
    followUps: ["Compare payroll by branch"],
    steps: allSteps("71 payroll transactions"),
    fallback: { label: "View transactions instead", href: "/financial-records/transactions" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "payroll-branch",
    tags: ["4 active branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "October payroll was **$7,640.00**. Central Market pays the most because it has the most staff; Toul Kork rose by $180.00 after a new cashier started.",
    table: {
      columns: [{ label: "Branch" }, { label: "Staff", align: "right" }, { label: "October", align: "right" }, { label: "Change", align: "right" }],
      rows: [
        { cells: ["Central Market", "6", "$2,510.00", "+$60.00"], tones: [, , , "up"] },
        { cells: ["Toul Kork", "4", "$2,210.00", "+$180.00"], tones: [, , , "up"] },
        { cells: ["Siem Reap", "4", "$1,780.00", "$0.00"] },
        { cells: ["Battambang", "3", "$1,140.00", "$0.00"] },
      ],
      total: ["Total payroll", "17", "$7,640.00", "+$240.00"],
    },
    records: [R.payroll9],
    followUps: ["Show payroll by month for 2026"],
    steps: allSteps("9 payroll transactions"),
    fallback: { label: "View transactions instead", href: "/financial-records/transactions" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "overdue",
    tags: ["All branches", "As of 31 Oct 2026", "Amounts in USD"],
    text: "You have **3 overdue invoices** worth **$3,150.00**. The oldest is INV-2026-0129 for Tonle Sap Restaurant, 22 days past its due date. Phsar Leu Traders owes the most, $1,480.00.",
    table: {
      columns: [{ label: "Invoice" }, { label: "Customer" }, { label: "Due" }, { label: "Overdue", align: "right" }, { label: "Balance", align: "right" }],
      rows: [
        { cells: ["INV-2026-0129", "Tonle Sap Restaurant", "9 Oct 2026", "22 days", "$420.00"], href: "/sales/invoices/INV-2026-0129", tones: [, , , "error"] },
        { cells: ["INV-2026-0131", "Phsar Leu Traders", "12 Oct 2026", "19 days", "$1,480.00"], href: "/sales/invoices/INV-2026-0131", tones: [, , , "error"] },
        { cells: ["INV-2026-0142", "Angkor Wholesale Trading", "23 Oct 2026", "8 days", "$1,250.00"], href: "/sales/invoices/INV-2026-0142", tones: [, , , "error"] },
      ],
      total: ["Total", "", "", "", "$3,150.00"],
    },
    records: [R.inv0129, R.inv0131, R.inv0142, R.ageing],
    followUps: ["Which customers usually pay late?"],
    steps: ["Understood the question", "Read 14 open invoices across 4 branches", "Checking due dates against today, 31 Oct 2026"],
    fallback: { label: "View invoices instead", href: "/sales/invoices?status=overdue" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "late-payers",
    tags: ["All branches", "Jun–Oct 2026"],
    text: "Three customers pay late most of the time. **Phsar Leu Traders** pays on average 17 days after the due date; the rest of your customers pay within 3 days.",
    table: {
      columns: [{ label: "Customer" }, { label: "Invoices", align: "right" }, { label: "Paid late", align: "right" }, { label: "Average delay", align: "right" }],
      rows: [
        { cells: ["Phsar Leu Traders", "9", "7", "17 days"], tones: [, , , "error"] },
        { cells: ["Tonle Sap Restaurant", "11", "6", "12 days"], tones: [, , , "error"] },
        { cells: ["Angkor Wholesale Trading", "8", "4", "6 days"] },
      ],
    },
    records: [R.payments, R.ageing],
    followUps: ["Which invoices are overdue?"],
    steps: allSteps("126 customer payments"),
    fallback: { label: "View customers instead", href: "/sales/customers" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "cash",
    tags: ["8 active accounts", "As of 31 Oct 2026"],
    text: "You have about **$86,408.60** across 8 active accounts: **$60,930.55** in USD and **៛104,460,000** (≈ $25,478.05) in KHR. ACLEDA Savings USD holds the most.",
    table: {
      columns: [{ label: "Account" }, { label: "Branch" }, { label: "Balance", align: "right" }],
      rows: [
        { cells: ["ACLEDA Savings USD", "Business-wide", "$31,250.00"], href: "/banking/accounts/acleda-savings-usd" },
        { cells: ["ABA Business USD", "Business-wide", "$24,810.55"], href: "/banking/accounts/aba-business-usd" },
        { cells: ["ABA Operating KHR", "Business-wide", "៛86,420,000"], href: "/banking/accounts/aba-operating-khr" },
        { cells: ["Wing Merchant KHR", "Toul Kork", "៛12,300,000"], href: "/banking/accounts/wing-merchant-khr" },
        { cells: ["4 cash tills", "Each branch", "$4,870.00 + ៛5,740,000"], href: "/banking/accounts" },
      ],
      total: ["Total", "", "≈ $86,408.60"],
    },
    records: [R.accounts8],
    followUps: ["How much profit did we make this month?"],
    steps: allSteps("balances of 8 financial accounts"),
    fallback: { label: "View accounts instead", href: "/banking/accounts" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "best-sellers",
    tags: ["All branches", "1–31 Oct 2026", "Amounts in USD"],
    text: "**Vital Water 500ml** sold the most units in October; **Kampot Pepper 100g** brought in the most revenue.",
    table: {
      columns: [{ label: "Item" }, { label: "Units", align: "right" }, { label: "Revenue", align: "right" }],
      rows: [
        { cells: ["Kampot Pepper 100g", "1,120", "$6,160.00"] },
        { cells: ["Vital Water 500ml × 12", "1,840", "$5,520.00"] },
        { cells: ["Angkor Beer can × 24", "310", "$4,650.00"] },
        { cells: ["Condensed Milk 390g", "2,260", "$3,164.00"] },
        { cells: ["Jasmine Rice 5kg", "420", "$2,940.00"] },
      ],
    },
    records: [R.sales],
    followUps: ["Which items are running low?"],
    steps: allSteps("sales for 214 items"),
    fallback: { label: "View item sales instead", href: "/inventory/sales" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "low-stock",
    tags: ["All branches", "As of 31 Oct 2026"],
    text: "**5 items** are at or below their reorder point. Kampot Pepper 100g at Toul Kork will run out first, in about 3 days at the current rate.",
    table: {
      columns: [{ label: "Item" }, { label: "Branch" }, { label: "On hand", align: "right" }, { label: "Reorder at", align: "right" }],
      rows: [
        { cells: ["Kampot Pepper 100g", "Toul Kork", "18", "40"], tones: [, , "error"] },
        { cells: ["Condensed Milk 390g", "Central Market", "36", "60"], tones: [, , "error"] },
        { cells: ["Vital Water 500ml × 12", "Siem Reap", "22", "30"], tones: [, , "error"] },
        { cells: ["Jasmine Rice 5kg", "Toul Kork", "14", "20"], tones: [, , "error"] },
        { cells: ["Palm Sugar 1kg", "Battambang", "9", "12"], tones: [, , "error"] },
      ],
    },
    records: [R.stock],
    followUps: ["Best sellers in October"],
    steps: allSteps("stock levels for 214 items"),
    fallback: { label: "View stock instead", href: "/inventory?view=branch" },
    disclaimer: DISCLAIMER,
  },

  /* ----- Khmer (11.4) ----- */
  {
    id: "km-profit",
    lang: "km",
    tags: ["គ្រប់សាខា", "1–31 តុលា 2026", "ចំនួនទឹកប្រាក់គិតជា USD"],
    text: "ប្រាក់ចំណេញសុទ្ធសម្រាប់ខែតុលា ឆ្នាំ 2026 គឺ **$16,680.00** កើនឡើង **32.7%** ធៀបនឹងខែកញ្ញា។ ចំណូលកើនឡើង $5,370.00 ខណៈដែលចំណាយកើនឡើងត្រឹមតែ $1,260.00 ប៉ុណ្ណោះ។",
    stats: [
      { label: "ចំណូល", value: "$48,620.00", delta: "+12.4%", vs: "ធៀបនឹងខែកញ្ញា", tone: "good" },
      { label: "ចំណាយ", value: "$31,940.00", delta: "+4.1%", vs: "ធៀបនឹងខែកញ្ញា", tone: "bad" },
      { label: "ប្រាក់ចំណេញសុទ្ធ", value: "$16,680.00", delta: "+32.7%", vs: "ធៀបនឹងខែកញ្ញា", tone: "good" },
    ],
    records: [
      { ...R.pl, label: "ចំណេញ និងខាត · តុលា 2026" },
      { ...R.invoices38, label: "វិក្កយបត្រ 38" },
      { ...R.bills36, label: "វិក្កយបត្រទិញ 36" },
      { ...R.tx502, label: "ប្រតិបត្តិការ 502" },
    ],
    followUps: ["ហេតុអ្វីបានជាចំណាយកើនឡើង?", "សាខាណាមានចំណាយខ្ពស់ជាងគេ?", "តើវិក្កយបត្រណាខ្លះហួសកាលកំណត់?"],
    steps: ["បានយល់សំណួរ", "បានអានវិក្កយបត្រ 38 វិក្កយបត្រទិញ 36 និងប្រតិបត្តិការ 502", "កំពុងពិនិត្យតួលេខ"],
    fallback: { label: "មើលទិដ្ឋភាពហិរញ្ញវត្ថុ", href: "/financial-records" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-expenses",
    lang: "km",
    tags: ["គ្រប់សាខា", "តុលា ធៀបនឹង កញ្ញា 2026", "ចំនួនទឹកប្រាក់គិតជា USD"],
    text: "ចំណាយកើនឡើង **$1,260.00 (4.1%)** ដល់ $31,940.00។ ការកើនឡើងធំបំផុតគឺ **ការទិញទំនិញ** (+$620.00) **ថ្លៃទឹកភ្លើង** (+$410.00) និង **ប្រាក់បៀវត្ស** (+$240.00)។ សាខាទួលគោក រួមចំណែក $760.00 នៃការកើនឡើងនេះ។",
    records: [{ ...R.expCat, label: "ចំណាយតាមប្រភេទ · តុលា 2026" }, { ...R.bill0924, label: "BILL-0924 · EDC" }],
    followUps: ["សាខាណាមានចំណាយខ្ពស់ជាងគេ?"],
    steps: ["បានយល់សំណួរ", "បានអានវិក្កយបត្រទិញ 36", "កំពុងប្រៀបធៀបខែកញ្ញា និងខែតុលា"],
    fallback: { label: "មើលចំណាយ", href: "/financial-records/categories" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-branch",
    lang: "km",
    tags: ["សាខាសកម្ម 4", "1–31 តុលា 2026", "ចំនួនទឹកប្រាក់គិតជា USD"],
    text: "សាខា **ផ្សារធំថ្មី (មេ)** មានចំណាយខ្ពស់ជាងគេ **$12,910.00** ព្រោះជាសាខាធំជាងគេ។ បើធៀបនឹងការលក់ សាខា **ទួលគោក** ចំណាយច្រើនជាងគេ គឺ 66.9 សេនក្នុងមួយដុល្លារ។",
    records: [{ ...R.branchPerf, label: "លទ្ធផលសាខា · តុលា 2026" }],
    followUps: ["ហេតុអ្វីបានជាចំណាយកើនឡើង?"],
    steps: ["បានយល់សំណួរ", "បានអានចំណាយរបស់សាខាទាំង 4", "កំពុងប្រៀបធៀបជាមួយចំណូល"],
    fallback: { label: "មើលសាខា", href: "/branches" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-overdue",
    lang: "km",
    tags: ["គ្រប់សាខា", "គិតត្រឹម 31 តុលា 2026"],
    text: "មាន **វិក្កយបត្រហួសកាលកំណត់ 3** សរុប **$3,150.00**។ ចាស់ជាងគេគឺ INV-2026-0129 របស់ Tonle Sap Restaurant ហួស 22 ថ្ងៃ។",
    records: [R.inv0129, R.inv0131, R.inv0142],
    followUps: ["ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន?"],
    steps: ["បានយល់សំណួរ", "បានអានវិក្កយបត្រមិនទាន់បង់ 14", "កំពុងពិនិត្យកាលបរិច្ឆេទកំណត់"],
    fallback: { label: "មើលវិក្កយបត្រ", href: "/sales/invoices?status=overdue" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-low-stock",
    lang: "km",
    tags: ["គ្រប់សាខា", "គិតត្រឹម 31 តុលា 2026"],
    text: "មាន **ទំនិញ 5** ដែលនៅសល់តិចជាងកម្រិតត្រូវបញ្ជាទិញ។ ម្រេចកំពត 100g នៅសាខាទួលគោក នឹងអស់មុនគេ ក្នុងរយៈពេលប្រហែល 3 ថ្ងៃ។",
    records: [{ ...R.stock, label: "កម្រិតស្តុក · 31 តុលា 2026" }],
    followUps: ["ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន?"],
    steps: ["បានយល់សំណួរ", "បានអានស្តុកទំនិញ 214", "កំពុងប្រៀបធៀបជាមួយកម្រិតបញ្ជាទិញ"],
    fallback: { label: "មើលស្តុក", href: "/inventory?view=branch" },
    disclaimer: DISCLAIMER,
  },

  /* ----- Branch Manager, Toul Kork (11.9–11.10) ----- */
  {
    id: "tk-expenses",
    tags: ["Toul Kork Branch", "Oct vs Sep 2026", "Amounts in USD"],
    text: "Expenses at Toul Kork were **$8,870.00** in October, up **$760.00 (9.4%)** on September. The biggest cause was **stock purchases** (+$420.00), of which $184.00 was Khmer Fresh Produce. **Payroll** rose by $180.00 and **electricity** by $100.00: the EDC bill went from ៛1,640,000 to ៛2,050,000 (+25.0%). Other costs added $60.00.",
    stats: [
      { label: "Branch revenue", value: "$13,260.00", delta: "+6.2%", vs: "vs September", tone: "good" },
      { label: "Branch expenses", value: "$8,870.00", delta: "+9.4%", vs: "vs September", tone: "bad" },
      { label: "Branch net profit", value: "$4,390.00", delta: "+0.3%", vs: "vs September", tone: "good" },
    ],
    records: [R.tkOct, R.bill0930, R.bill0924, R.tkTx118],
    followUps: ["How much did we spend on utilities?", "Which items are running low?"],
    steps: allSteps("118 Toul Kork transactions"),
    fallback: { label: "View branch expenses instead", href: "/financial-records/categories" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-sales",
    tags: ["Toul Kork Branch", "1–31 Oct 2026", "Amounts in USD"],
    text: "Toul Kork sold **$13,260.00** in October, up **6.2%** on September. Walk-in sales were $10,940.00 and invoices to wholesale customers $2,320.00.",
    stats: [
      { label: "Walk-in sales", value: "$10,940.00", delta: "+5.8%", vs: "vs September", tone: "good" },
      { label: "Invoiced", value: "$2,320.00", delta: "+8.1%", vs: "vs September", tone: "good" },
      { label: "Total sales", value: "$13,260.00", delta: "+6.2%", vs: "vs September", tone: "good" },
    ],
    records: [R.tkOct, R.walkIns],
    followUps: ["Which days were busiest in October?", "Sales by method"],
    steps: allSteps("1,214 walk-in sales and 12 invoices"),
    fallback: { label: "View sales instead", href: "/sales" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-busiest",
    tags: ["Toul Kork Branch", "1–31 Oct 2026", "Amounts in USD"],
    text: "Saturdays were your busiest days: the four Saturdays averaged **$612.00** in sales against $398.00 on other days. The single best day was **Saturday 24 October** with $718.40.",
    table: {
      columns: [{ label: "Day" }, { label: "Sales", align: "right" }, { label: "Walk-ins", align: "right" }],
      rows: [
        { cells: ["Sat 24 Oct", "$718.40", "62"] },
        { cells: ["Sat 17 Oct", "$642.10", "57"] },
        { cells: ["Sat 31 Oct", "$596.00", "51"] },
        { cells: ["Sun 25 Oct", "$548.20", "49"] },
        { cells: ["Sat 10 Oct", "$491.50", "44"] },
      ],
    },
    records: [R.walkIns],
    followUps: ["How much did my branch sell this month?"],
    steps: allSteps("1,214 walk-in sales"),
    fallback: { label: "View walk-in sales instead", href: "/sales/walk-in" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-methods",
    tags: ["Toul Kork Branch", "1–31 Oct 2026", "Amounts in USD"],
    text: "Most walk-in customers paid by **KHQR** (48%), then cash (41%) and card (11%). Cash sales include ៛8,920,000 taken in riel.",
    table: {
      columns: [{ label: "Method" }, { label: "Sales", align: "right" }, { label: "Share", align: "right" }],
      rows: [
        { cells: ["KHQR", "$5,251.20", "48%"] },
        { cells: ["Cash (USD and KHR)", "$4,485.40", "41%"] },
        { cells: ["Card", "$1,203.40", "11%"] },
      ],
      total: ["Total", "$10,940.00", "100%"],
    },
    records: [R.walkIns],
    followUps: ["Which days were busiest in October?"],
    steps: allSteps("1,214 walk-in sales"),
    fallback: { label: "View walk-in sales instead", href: "/sales/walk-in" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-unpaid",
    tags: ["Toul Kork Branch", "As of 31 Oct 2026", "Amounts in USD"],
    text: "Your branch has **4 unpaid invoices** worth **$2,148.00**. None is overdue yet; the next one is due on 5 November.",
    table: {
      columns: [{ label: "Customer" }, { label: "Due" }, { label: "Balance", align: "right" }],
      rows: [
        { cells: ["Borey Café", "5 Nov 2026", "$418.00"] },
        { cells: ["Golden Lotus Restaurant", "8 Nov 2026", "$950.00"] },
        { cells: ["Toul Kork Mini Mart", "12 Nov 2026", "$460.00"] },
        { cells: ["Borey Café", "19 Nov 2026", "$320.00"] },
      ],
      total: ["Total", "", "$2,148.00"],
    },
    records: [R.tkInvoices],
    followUps: ["How much did my branch sell this month?"],
    steps: allSteps("open invoices for Toul Kork"),
    fallback: { label: "View invoices instead", href: "/sales/invoices" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-till",
    tags: ["Toul Kork Branch", "30 Oct 2026"],
    text: "Yes. Yesterday’s till was counted at 18:04 and was **short by $1.50**, inside your $2.00 tolerance. It is submitted and waiting for the owner’s sign-off.",
    stats: [
      { label: "Expected", value: "$1,281.50", delta: "USD + ៛1,640,000", vs: "", tone: "good" },
      { label: "Counted", value: "$1,280.00", delta: "USD + ៛1,640,000", vs: "", tone: "good" },
      { label: "Difference", value: "−$1.50", delta: "Within tolerance", vs: "", tone: "good" },
    ],
    records: [R.till],
    followUps: ["How much did my branch sell this month?"],
    steps: allSteps("the 30 Oct till count"),
    fallback: { label: "View till counts instead", href: "/financial-records/till" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-utilities",
    tags: ["Toul Kork Branch", "1–31 Oct 2026", "Amounts in USD"],
    text: "Toul Kork spent **$886.50** on utilities in October, up $100.00. Electricity was ៛2,050,000 (≈ $500.00); the rest was water, gas and ice deliveries.",
    records: [R.bill0924, R.tkTx118],
    followUps: ["What caused my branch expenses to increase?"],
    steps: allSteps("Toul Kork utility bills"),
    fallback: { label: "View bills instead", href: "/financial-records/bills" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "tk-low-stock",
    tags: ["Toul Kork Branch", "As of 31 Oct 2026"],
    text: "**2 items** at your branch are below their reorder point. Kampot Pepper 100g will run out in about 3 days.",
    table: {
      columns: [{ label: "Item" }, { label: "On hand", align: "right" }, { label: "Reorder at", align: "right" }],
      rows: [
        { cells: ["Kampot Pepper 100g", "18", "40"], tones: [, "error"] },
        { cells: ["Jasmine Rice 5kg", "14", "20"], tones: [, "error"] },
      ],
    },
    records: [R.stock],
    followUps: ["How much did my branch sell this month?"],
    steps: allSteps("stock at Toul Kork"),
    fallback: { label: "View stock instead", href: "/inventory?view=branch" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-tk-profit",
    lang: "km",
    tags: ["សាខាទួលគោក", "1–31 តុលា 2026", "ចំនួនទឹកប្រាក់គិតជា USD"],
    text: "ខែនេះសាខាទួលគោកចំណេញសុទ្ធ **$4,390.00** កើនឡើង 0.3% ធៀបនឹងខែកញ្ញា។ ចំណូល $13,260.00 និងចំណាយ $8,870.00។",
    records: [{ ...R.tkOct, label: "ទួលគោក · តុលា 2026" }],
    followUps: ["តើទំនិញណាខ្លះនៅសាខារបស់ខ្ញុំជិតអស់ស្តុក?"],
    steps: ["បានយល់សំណួរ", "បានអានប្រតិបត្តិការ 118 របស់សាខា", "កំពុងពិនិត្យតួលេខ"],
    fallback: { label: "មើលសាខា", href: "/dashboard" },
    disclaimer: DISCLAIMER,
  },
  {
    id: "km-tk-low-stock",
    lang: "km",
    tags: ["សាខាទួលគោក", "គិតត្រឹម 31 តុលា 2026"],
    text: "មាន **ទំនិញ 2** នៅសាខារបស់អ្នកដែលជិតអស់៖ ម្រេចកំពត 100g (នៅសល់ 18) និងអង្ករម្លិះ 5kg (នៅសល់ 14)។",
    records: [{ ...R.stock, label: "កម្រិតស្តុក · 31 តុលា 2026" }],
    followUps: ["ខែនេះសាខារបស់ខ្ញុំចំណេញប៉ុន្មាន?"],
    steps: ["បានយល់សំណួរ", "បានអានស្តុកនៅសាខាទួលគោក", "កំពុងប្រៀបធៀបជាមួយកម្រិតបញ្ជាទិញ"],
    fallback: { label: "មើលស្តុក", href: "/inventory?view=branch" },
    disclaimer: DISCLAIMER,
  },
];

const byId = new Map(ANSWERS.map((answer) => [answer.id, answer]));

/* ---------- Answers built from the question ---------- */

/** Frame 11.5: the advisor refuses to change data and links to the right screen. */
function writeBlocked(question: string, scope: AdvisorScope): Answer {
  const invoiceId = question.match(/INV-\d{4}-\d{4}/i)?.[0].toUpperCase();
  const known = invoiceId === "INV-2026-0142";
  return {
    id: `write:${invoiceId ?? ""}`,
    tone: "locked",
    tags: [],
    readOnlyTag: false,
    heading: "I can’t change your records",
    text: known
      ? "I am read-only, so I can’t record payments, edit invoices or delete anything. **INV-2026-0142** for Angkor Wholesale Trading is 8 days overdue with a balance of **$1,250.00**. You can record the payment yourself in Sales."
      : "I am read-only, so I can’t record payments, edit invoices, create bills or delete anything. You can make the change yourself on the right screen.",
    actions: invoiceId
      ? [
          { label: `Open ${invoiceId}`, href: `/sales/invoices/${invoiceId}`, icon: "invoice" },
          { label: "Record payment in Sales", href: `/sales/invoices/${invoiceId}?pay=1`, icon: "payment" },
        ]
      : [
          { label: "Open Sales", href: "/sales", icon: "invoice" },
          { label: "Open Financial Records", href: "/financial-records", icon: "payment" },
        ],
    records: known ? [{ ...R.inv0142, label: "INV-2026-0142" }] : [],
    followUps: [scope === "all" ? "Which invoices are overdue?" : "Which invoices at my branch are unpaid?"],
    steps: ["Understood the question"],
    fallback: { label: "View invoices instead", href: "/sales/invoices" },
  };
}

/** Frame 11.10: a Branch Manager asks about other branches. */
function branchLimited(branch: string): Answer {
  return {
    id: "branch-limited",
    tone: "locked",
    tags: [],
    readOnlyTag: false,
    heading: `I can only answer about ${branch} Branch`,
    text: `You are signed in as Branch Manager of ${branch}, so I can’t see or compare other branches. Sokha Chan (Business Owner) can ask this question. For your branch, October expenses were **$8,870.00**.`,
    records: [R.tkOct],
    followUps: ["Show Toul Kork expenses by category"],
    steps: ["Understood the question", "Checked what you have access to"],
    fallback: { label: "View your dashboard instead", href: "/dashboard" },
  };
}

/** Anything the scripted advisor has no answer for. */
function noAnswer(scope: AdvisorScope, lang: AdvisorLang): Answer {
  return {
    id: "no-answer",
    tone: "warning",
    lang,
    tags: [scope === "all" ? "All branches" : "Toul Kork Branch"],
    heading: lang === "km" ? "ខ្ញុំមិនទាន់អាចឆ្លើយសំណួរនេះបានទេ" : "I can’t answer that one yet",
    text:
      lang === "km"
        ? "ខ្ញុំអាចឆ្លើយអំពីចំណូល ចំណាយ ប្រាក់ចំណេញ វិក្កយបត្រ សាច់ប្រាក់ និងស្តុក ដែលបានកត់ត្រាក្នុង LuyFlow។ សាកល្បងសំណួរខាងក្រោម។"
        : "I answer questions about the revenue, expenses, profit, invoices, cash and stock recorded in LuyFlow. I would rather say so than guess. Try one of these instead.",
    records: [],
    followUps: suggestionsFor(scope === "all" ? "owner" : "manager").flatMap((group) => group.questions).filter((q) => (lang === "km") === isKhmer(q)).slice(0, 3),
    steps: ["Understood the question", "Looked for matching records"],
    fallback: { label: "View dashboard instead", href: "/dashboard" },
  };
}

/* ---------- Question matching ---------- */

const OWNER_QUESTIONS: Record<string, string> = {
  "how much profit did my business make this month": "profit",
  "how much profit did we make this month": "profit",
  "profit this month": "profit",
  "what caused my expenses to increase": "expenses",
  "which branch has the highest expenses": "branch-expenses",
  "highest-spending branch": "branch-expenses",
  "which branch earned the most in october": "branch-revenue",
  "which branch earned the most": "branch-revenue",
  "why is toul kork's expense ratio higher": "tk-ratio",
  "show expenses by category for toul kork": "tk-categories",
  "show toul kork expenses by category": "tk-categories",
  "show utilities by branch": "utilities-branch",
  "compare payroll with last october": "payroll-last-year",
  "show payroll by month for 2026": "payroll-month",
  "compare payroll by branch": "payroll-branch",
  "which invoices are overdue": "overdue",
  "overdue invoices": "overdue",
  "which customers usually pay late": "late-payers",
  "late-paying customers": "late-payers",
  "how much cash do i have across all accounts": "cash",
  "cash across all accounts": "cash",
  "best sellers in october": "best-sellers",
  "which items are running low": "low-stock",
  "items running low": "low-stock",
  "ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន": "km-profit",
  "ប្រាក់ចំណេញខែនេះ": "km-profit",
  "ហេតុអ្វីបានជាចំណាយកើនឡើង": "km-expenses",
  "សាខាណាមានចំណាយខ្ពស់ជាងគេ": "km-branch",
  "តើវិក្កយបត្រណាខ្លះហួសកាលកំណត់": "km-overdue",
  "តើទំនិញណាខ្លះជិតអស់ស្តុក": "km-low-stock",
  "ស្តុកទំនិញដែលជិតអស់": "km-low-stock",
};

const MANAGER_QUESTIONS: Record<string, string> = {
  "what caused my branch expenses to increase": "tk-expenses",
  "expenses at my branch": "tk-expenses",
  "show toul kork expenses by category": "tk-categories",
  "show expenses by category for toul kork": "tk-categories",
  "how much did my branch sell this month": "tk-sales",
  "which days were busiest in october": "tk-busiest",
  "sales by method": "tk-methods",
  "which invoices at my branch are unpaid": "tk-unpaid",
  "unpaid invoices": "tk-unpaid",
  "did yesterday's till balance": "tk-till",
  "how much did we spend on utilities": "tk-utilities",
  "which items are running low": "tk-low-stock",
  "items running low": "tk-low-stock",
  "ខែនេះសាខារបស់ខ្ញុំចំណេញប៉ុន្មាន": "km-tk-profit",
  "តើទំនិញណាខ្លះនៅសាខារបស់ខ្ញុំជិតអស់ស្តុក": "km-tk-low-stock",
};

/** Lower-case, straight apostrophes, no trailing punctuation. */
export const normalise = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[?？!.។\s]+$/u, "")
    .replace(/\s+/g, " ");

export const isKhmer = (text: string) => /[ក-៿]/.test(text);

const WRITE_INTENT = /\b(mark|record|pay|delete|remove|edit|change|update|create|add|cancel|void|send|approve|refund)\b/;
const OTHER_BRANCHES = /\b(central market|siem reap|battambang|kampot|other branch|other branches|all branches|which branch|compare branch|compare branches|each branch)\b/;

/** Picks the scripted answer for a question, or a read-only/branch/no-answer reply. */
export function answerFor(question: string, scope: AdvisorScope, role: "owner" | "manager", branch = "Toul Kork"): Answer {
  const q = normalise(question);
  if (WRITE_INTENT.test(q)) return writeBlocked(question, scope);
  if (role === "manager" && OTHER_BRANCHES.test(q)) return branchLimited(branch);

  const table = scope === "all" ? OWNER_QUESTIONS : MANAGER_QUESTIONS;
  const exact = table[q] ?? (scope === "toul-kork" ? OWNER_QUESTIONS[q] : undefined);
  const exactAnswer = exact && byId.get(exact);
  // Business-wide answers are not available inside a single-branch scope.
  if (exactAnswer && (scope === "all" || exactAnswer.id.startsWith("tk-") || exactAnswer.id.startsWith("km-tk"))) return exactAnswer;

  const has = (...words: string[]) => words.some((word) => q.includes(word));
  const pick = (owner: string, manager: string) => byId.get(scope === "all" ? owner : manager)!;
  if (isKhmer(q)) {
    if (has("ស្តុក")) return pick("km-low-stock", "km-tk-low-stock");
    if (has("ចំណេញ")) return pick("km-profit", "km-tk-profit");
    if (scope === "all" && has("ចំណាយ")) return byId.get("km-expenses")!;
    if (scope === "all" && has("វិក្កយបត្រ")) return byId.get("km-overdue")!;
    return noAnswer(scope, "km");
  }
  if (has("profit", "margin")) return scope === "all" ? byId.get("profit")! : byId.get("tk-expenses")!;
  if (has("overdue", "unpaid", "owe")) return pick("overdue", "tk-unpaid");
  if (has("late")) return scope === "all" ? byId.get("late-payers")! : byId.get("tk-unpaid")!;
  if (has("payroll", "salary", "salaries", "wages")) return scope === "all" ? byId.get("payroll-branch")! : byId.get("tk-categories")!;
  if (has("utilit", "electric", "edc", "water")) return pick("utilities-branch", "tk-utilities");
  if (has("expense", "spend", "spent", "cost")) return pick("expenses", "tk-expenses");
  if (has("stock", "running low", "reorder", "inventory")) return pick("low-stock", "tk-low-stock");
  if (has("best sell", "top item", "best-sell")) return byId.get(scope === "all" ? "best-sellers" : "tk-sales")!;
  if (has("cash", "balance", "account", "bank")) return scope === "all" ? byId.get("cash")! : byId.get("tk-till")!;
  if (has("revenue", "sales", "sell", "sold", "earn", "income")) return pick("branch-revenue", "tk-sales");
  if (has("till")) return byId.get("tk-till")!;
  return noAnswer(scope, "en");
}

/** Plain text of an answer, for the copy button. */
export function answerText(answer: Answer) {
  const strip = (text: string) => text.replace(/\*\*/g, "");
  const parts = [answer.heading, strip(answer.text)];
  answer.stats?.forEach((stat) => parts.push(`${stat.label}: ${stat.value} (${stat.delta} ${stat.vs})`.trim()));
  if (answer.table) {
    parts.push(answer.table.columns.map((c) => c.label).join("\t"));
    answer.table.rows.forEach((row) => parts.push(row.cells.join("\t")));
    if (answer.table.total) parts.push(answer.table.total.join("\t"));
  }
  if (answer.note) parts.push(answer.note);
  return parts.filter(Boolean).join("\n");
}

/* ---------- Start screen and history ---------- */

export type SuggestionGroup = { id: "profit" | "expenses" | "invoices" | "khmer"; label: string; questions: string[] };

export function suggestionsFor(role: "owner" | "manager"): SuggestionGroup[] {
  if (role === "manager") {
    return [
      { id: "profit", label: "Profit and revenue", questions: ["How much did my branch sell this month?", "Which days were busiest in October?"] },
      { id: "expenses", label: "Expenses", questions: ["What caused my branch expenses to increase?", "How much did we spend on utilities?"] },
      { id: "invoices", label: "Invoices and cash", questions: ["Which invoices at my branch are unpaid?", "Did yesterday’s till balance?"] },
      { id: "khmer", label: "ភាសាខ្មែរ", questions: ["ខែនេះសាខារបស់ខ្ញុំចំណេញប៉ុន្មាន?", "តើទំនិញណាខ្លះនៅសាខារបស់ខ្ញុំជិតអស់ស្តុក?"] },
    ];
  }
  return [
    { id: "profit", label: "Profit and revenue", questions: ["How much profit did we make this month?", "Which branch earned the most in October?"] },
    { id: "expenses", label: "Expenses", questions: ["What caused my expenses to increase?", "Which branch has the highest expenses?"] },
    { id: "invoices", label: "Invoices and cash", questions: ["Which invoices are overdue?", "How much cash do I have across all accounts?"] },
    { id: "khmer", label: "ភាសាខ្មែរ", questions: ["ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន?", "តើទំនិញណាខ្លះជិតអស់ស្តុក?"] },
  ];
}

export type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "advisor"; question: string; time: string; status: "done"; answerId?: string; answer?: Answer; /** How long the answer took (ms), for the trace. */ duration?: number }
  | { id: string; role: "advisor"; question: string; time: string; status: "error" | "stopped" };

export type Conversation = {
  id: string;
  title: string;
  time: string;
  group: "Today" | "Yesterday" | "Previous 7 days";
  messages: Message[];
};

/** Resolves a stored message's answer (scripted ones are kept by id). */
export function messageAnswer(message: Extract<Message, { status: "done" }>) {
  return message.answer ?? (message.answerId ? byId.get(message.answerId) : undefined);
}

function exchange(id: string, question: string, time: string, answerId: string): Message[] {
  return [
    { id: `${id}-q`, role: "user", text: question },
    { id: `${id}-a`, role: "advisor", question, time, status: "done", answerId },
  ];
}

export function seedConversations(role: "owner" | "manager", branch = "Toul Kork"): Conversation[] {
  if (role === "manager") {
    return [
      {
        id: "m-expenses", title: "Expenses at my branch", time: "10:02", group: "Today",
        messages: [
          ...exchange("m1", "What caused my branch expenses to increase?", "10:02", "tk-expenses"),
          { id: "m2-q", role: "user", text: "Which branch has the highest expenses?" },
          { id: "m2-a", role: "advisor", question: "Which branch has the highest expenses?", time: "10:04", status: "done", answer: branchLimited(branch) },
        ],
      },
      { id: "m-stock", title: "Items running low", time: "09:31", group: "Today", messages: exchange("m3", "Which items are running low?", "09:31", "tk-low-stock") },
      { id: "m-methods", title: "Sales by method", time: "28 Oct", group: "Previous 7 days", messages: exchange("m4", "Sales by method", "28 Oct, 16:20", "tk-methods") },
      { id: "m-unpaid", title: "Unpaid invoices", time: "26 Oct", group: "Previous 7 days", messages: exchange("m5", "Which invoices at my branch are unpaid?", "26 Oct, 11:42", "tk-unpaid") },
    ];
  }
  return [
    { id: "c-km", title: "ប្រាក់ចំណេញខែនេះ", time: "09:40", group: "Today", messages: exchange("c1", "ខែនេះអាជីវកម្មរបស់ខ្ញុំចំណេញប៉ុន្មាន?", "09:40", "km-profit") },
    { id: "c-branch", title: "Highest-spending branch", time: "09:31", group: "Today", messages: exchange("c2", "Which branch has the highest expenses?", "09:31", "branch-expenses") },
    {
      id: "c-profit", title: "Profit this month", time: "09:14", group: "Today",
      messages: [
        ...exchange("c3", "How much profit did my business make this month?", "09:14", "profit"),
        ...exchange("c4", "What caused my expenses to increase?", "09:16", "expenses"),
        ...exchange("c5", "Compare payroll with last October", "09:21", "payroll-last-year"),
        { id: "c6-q", role: "user", text: "Mark INV-2026-0142 as paid" },
        { id: "c6-a", role: "advisor", question: "Mark INV-2026-0142 as paid", time: "09:23", status: "done", answer: writeBlocked("Mark INV-2026-0142 as paid", "all") },
      ],
    },
    { id: "c-overdue", title: "Overdue invoices", time: "08:52", group: "Today", messages: exchange("c7", "Which invoices are overdue?", "08:52", "overdue") },
    { id: "c-stock", title: "ស្តុកទំនិញដែលជិតអស់", time: "11:05", group: "Yesterday", messages: exchange("c8", "តើទំនិញណាខ្លះជិតអស់ស្តុក?", "Yesterday, 11:05", "km-low-stock") },
    { id: "c-best", title: "Best sellers in October", time: "27 Oct", group: "Previous 7 days", messages: exchange("c9", "Best sellers in October", "27 Oct, 15:12", "best-sellers") },
    { id: "c-cash", title: "Cash across all accounts", time: "26 Oct", group: "Previous 7 days", messages: exchange("c10", "How much cash do I have across all accounts?", "26 Oct, 09:30", "cash") },
    { id: "c-late", title: "Late-paying customers", time: "24 Oct", group: "Previous 7 days", messages: exchange("c11", "Which customers usually pay late?", "24 Oct, 14:08", "late-payers") },
  ];
}
