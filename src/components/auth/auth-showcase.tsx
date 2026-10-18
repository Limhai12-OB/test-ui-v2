import { Sparkles, TrendingUp } from "lucide-react";

/**
 * Decorative product preview for the auth panel: a frosted "Financial report"
 * card with white revenue, expense, net-profit and AI-insight cards floating
 * over it. Drawn on a fixed 660×660 stage and scaled per breakpoint by the
 * shell. Colours are literal because the panel stays blue in both themes.
 */
const STAGE = "absolute left-1/2 top-0 h-[660px] w-[660px] -translate-x-1/2 origin-top";

const KPIS = [
  { label: "Total revenue", value: "$48,620", note: "+12.4% vs last month" },
  { label: "Total expenses", value: "$31,940", note: "−4.3% vs last month" },
  { label: "Cash balance", value: "$24,310", note: "Across 3 accounts" },
];

const TRANSACTIONS = [
  { name: "Sales invoice #1042", category: "Income", amount: "+$2,480", income: true },
  { name: "Office rent", category: "Rent", amount: "−$1,200" },
  { name: "Supplier payment", category: "Inventory", amount: "−$860" },
];

const EXPENSES = [
  { label: "Payroll", share: 46, color: "#3348e8" },
  { label: "Rent", share: 28, color: "#7c8cf3" },
  { label: "Supplies", share: 16, color: "#b4bff8" },
  { label: "Other", share: 10, color: "#e2e6f5" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const card = "absolute rounded-2xl bg-white text-[#0f172a] shadow-[0_24px_48px_-16px_rgba(15,23,80,0.35)]";
const rise = "motion-safe:animate-[lf-rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both]";

/** Green "good change" pill; expenses going down is also good news. */
function Delta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 font-num text-[11px] leading-4 font-semibold text-[#15803d]">
      {children}
    </span>
  );
}

export function AuthShowcase() {
  return (
    <div className={STAGE} aria-hidden>
      {/* Frosted report card */}
      <div
        className={`absolute top-[52px] left-[82px] h-[526px] w-[472px] rounded-2xl border border-white/25 bg-white/10 p-5 text-white backdrop-blur-sm ${rise}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-[7px] rounded-full bg-white/70" />
            ))}
          </span>
          <span className="text-[13px] leading-5 text-white/90">Financial report</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-white/20 bg-white/10 px-3 py-3">
              <p className="text-[11px] leading-4 text-white/75">{kpi.label}</p>
              <p className="mt-1 font-num text-lg leading-6 font-semibold">{kpi.value}</p>
              <p className="mt-1 text-[10px] leading-3 text-white/60">{kpi.note}</p>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <p className="text-[12px] leading-4 font-medium text-white/90">Recent transactions</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {TRANSACTIONS.map((tx) => (
              <li
                key={tx.name}
                className="grid grid-cols-[1fr_120px_auto] items-center rounded-lg bg-white/10 px-3 py-1.5 text-[12px] leading-4"
              >
                <span className="flex items-center gap-2.5">
                  <span className={`size-1.5 rounded-full ${tx.income ? "bg-white" : "bg-white/50"}`} />
                  {tx.name}
                </span>
                <span className="text-[11px] text-white/65">{tx.category}</span>
                <span className="font-num font-semibold">{tx.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Net profit */}
      <div className={`${card} top-0 left-[472px] w-[190px] px-4 py-3.5 ${rise}`} style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#eef1ff] text-[#3348e8]">
            <TrendingUp size={15} strokeWidth={2.25} />
          </span>
          <span className="text-[12px] leading-4 text-[#475569]">Net profit</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="font-num text-[22px] leading-7 font-semibold">$16,680</span>
          <Delta>+11.6%</Delta>
        </div>
      </div>

      {/* Revenue */}
      <div className={`${card} top-[207px] left-0 h-[203px] w-[350px] px-5 py-4 ${rise}`} style={{ animationDelay: "200ms" }}>
        <div className="flex items-start justify-between">
          <span className="text-[12px] leading-4 text-[#475569]">Revenue</span>
          <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] leading-4 font-medium text-[#475569]">
            Last 6 months
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-num text-[22px] leading-7 font-semibold">$48,620</span>
          <Delta>+12.4%</Delta>
        </div>
        <svg viewBox="0 0 310 90" className="mt-2 h-[90px] w-full overflow-visible">
          <defs>
            <linearGradient id="auth-rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3348e8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3348e8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[10, 40, 70].map((y) => (
            <line key={y} x1="0" x2="310" y1={y} y2={y} stroke="#eef1f6" />
          ))}
          <path
            d="M0 68 C 30 62, 50 52, 80 56 S 120 70, 150 58 S 190 34, 215 38 S 250 46, 270 36 S 295 18, 310 12 L310 90 L0 90 Z"
            fill="url(#auth-rev-fill)"
          />
          <path
            d="M0 68 C 30 62, 50 52, 80 56 S 120 70, 150 58 S 190 34, 215 38 S 250 46, 270 36 S 295 18, 310 12"
            fill="none"
            stroke="#3348e8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="310" cy="12" r="4" fill="#fff" stroke="#3348e8" strokeWidth="2" />
        </svg>
        <div className="mt-1.5 flex justify-between text-[10px] leading-3 text-[#94a3b8]">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {/* Expenses by category */}
      <div className={`${card} top-[238px] left-[370px] w-[263px] px-5 py-4 ${rise}`} style={{ animationDelay: "280ms" }}>
        <span className="text-[12px] leading-4 text-[#475569]">Expenses by category</span>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-num text-[20px] leading-7 font-semibold">$31,940</span>
          <Delta>−4.3%</Delta>
        </div>
        <div className="mt-4 flex items-center gap-5">
          <Donut />
          <ul className="flex flex-1 flex-col gap-2 text-[11px] leading-4">
            {EXPENSES.map((e) => (
              <li key={e.label} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: e.color }} />
                <span className="flex-1 text-[#334155]">{e.label}</span>
                <span className="font-num font-semibold">{e.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI insight */}
      <div className={`${card} top-[561px] left-0 w-[300px] px-4 py-4 ${rise}`} style={{ animationDelay: "360ms" }}>
        <div className="flex gap-3">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5b6ef5] to-[#2236cf] text-white">
            <Sparkles size={15} />
          </span>
          <div>
            <p className="text-[10px] leading-4 font-semibold tracking-[0.6px] text-[#3348e8]">AI INSIGHT</p>
            <p className="mt-1 text-[12px] leading-[18px] text-[#1e293b]">
              Net profit is up 11.6% this month. Supplies are your fastest-growing cost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Donut() {
  const r = 30;
  const c = 2 * Math.PI * r;
  const starts = EXPENSES.map((_, i) => EXPENSES.slice(0, i).reduce((sum, e) => sum + (e.share / 100) * c, 0));
  return (
    <svg viewBox="0 0 80 80" className="size-[84px] shrink-0 -rotate-90">
      {EXPENSES.map((e, i) => {
        const length = (e.share / 100) * c;
        const gap = 2;
        return (
          <circle
            key={e.label}
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={e.color}
            strokeWidth="12"
            strokeDasharray={`${length - gap} ${c - length + gap}`}
            strokeDashoffset={-starts[i]}
          />
        );
      })}
    </svg>
  );
}
