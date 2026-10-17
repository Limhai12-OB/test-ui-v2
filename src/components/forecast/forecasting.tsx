"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Download, GitCompareArrows, Info, Lock, RotateCcw, Save, Sparkles, Target, TriangleAlert, UserRound } from "lucide-react";
import { OwnerOnlyBadge, Restricted } from "@/components/admin/restricted";
import { AreaChart } from "@/components/hairline/area-chart";
import { ComboChart } from "@/components/hairline/combo-chart";
import { EarningsChart } from "@/components/hairline/earnings-chart";
import { NumberRoll } from "@/components/hairline/number-roll";
import { StatsBand } from "@/components/hairline/stats-band";
import { StepperInput } from "@/components/hairline/stepper-input";
import { Sparkline as HairlineSparkline } from "@/components/hairline/sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/flow";
import { Notice, Page, Tabs } from "@/components/ui/page";
import { useToast } from "@/components/ui/overlay";
import { cn, downloadCsv, num } from "@/lib/format";
import {
  applyScenario,
  BACKTESTS,
  BASE_SCENARIO,
  BRANCH_REVENUE,
  CASH_TODAY,
  EXPENSE_CATEGORIES,
  forecastTo,
  HISTORY_DAYS,
  HORIZON_LABEL,
  KNOWN_ITEMS,
  monthsFor,
  RECORDED,
  RELIABILITY,
  REVENUE_SOURCES,
  SAFETY_LEVEL,
  totals,
  type Horizon,
  type Reliability,
  type Scenario,
} from "@/lib/mock/forecast-data";
import { TREND } from "@/lib/mock/reports-data";
import { useSession } from "@/lib/session";

type Tab = "overview" | "revenue" | "expenses" | "cashflow" | "runway" | "reliability" | "whatif" | "budget";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "expenses", label: "Expenses" },
  { id: "cashflow", label: "Cash flow" },
  { id: "runway", label: "Runway" },
  { id: "reliability", label: "Reliability" },
  { id: "whatif", label: "What-if" },
  { id: "budget", label: "Target budget" },
];

const usd = (n: number) => `$${num(n)}`;
const k = (n: number) => `$${Math.round(n / 1000)}k`;
const short = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const BUDGET_KEY = "fs-forecast-budget";

/* ---------- pieces ---------- */

function AiBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/25 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
      <Sparkles size={12} aria-hidden />
      AI forecast
    </span>
  );
}

/** "AI / Reliability Indicator": four bars plus the level and backtest error. */
export function ReliabilityIndicator({ r }: { r: Reliability }) {
  const tone = r.bars >= 3 ? "bg-success" : r.bars === 2 ? "bg-warning" : "bg-error";
  return (
    <span className="inline-flex h-[35px] items-center gap-2.5 rounded-md border border-line bg-subtle px-3">
      <span className="flex items-end gap-[3px]" role="img" aria-label={`${r.level} reliability, ${r.bars} of 4`}>
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={cn("w-[5px] rounded-[1px]", b <= r.bars ? tone : "bg-line")} style={{ height: 6 + b * 3 }} />
        ))}
      </span>
      <span className="text-[13px] leading-5 whitespace-nowrap">
        <span className="font-medium text-fg">{r.level}</span>
        <span className="text-muted"> · {r.error} in backtests</span>
      </span>
    </span>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: "success" | "warning" }) {
  return (
    <section className="lift flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-[13px] leading-5 text-muted">{label}</h2>
        <span className="inline-flex h-5 items-center rounded-full bg-ai-subtle px-2 text-[11px] font-medium text-ai-fg">Expected</span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <span className={cn("tabular text-[24px] leading-9 font-semibold tracking-[-0.14px] xl:text-[28px]", tone === "success" ? "text-success-fg" : "text-fg")}>
          <NumberRoll value={value} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} prefix="$" />
        </span>
        <span className="text-xs font-medium text-muted">USD</span>
      </p>
      <p className={cn("mt-1.5 text-xs leading-[18px]", tone === "warning" ? "text-warning-fg" : "text-muted")}>{sub}</p>
    </section>
  );
}

function Legend({ items }: { items: { label: string; swatch: React.ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs leading-4 text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.swatch}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

const SW = {
  recorded: <span className="h-2.5 w-4 rounded-[2px] bg-primary/25 ring-1 ring-primary" />,
  p50: <span className="w-4 border-t-2 border-dashed border-icon-ai" />,
  band: <span className="h-2.5 w-4 rounded-[2px] bg-icon-ai/20" />,
  safety: <span className="w-4 border-t-2 border-dashed border-warning" />,
};

type ChartPoint = { date: string; label: string; kind: "recorded" | "forecast"; value: number; p10?: number; p90?: number };

const year = (iso: string) => iso.slice(0, 4);

/**
 * Cash chart of frame 20.11: recorded area, P10–P90 band, dashed P50, safety
 * level and the lowest point. Interactive in the Hairline UI chart style: point
 * at (or arrow through) the chart and the header becomes that week's readout,
 * with the figures rolling; the lines draw in again when the horizon changes.
 */
function CashChart({ horizon }: { horizon: Horizon }) {
  const fc = forecastTo(horizon);
  const start = Date.parse(RECORDED[0].date);
  const end = Date.parse(fc.at(-1)!.date);
  const x = (iso: string) => ((Date.parse(iso) - start) / (end - start)) * 100;
  const max = horizon === 6 ? 180000 : 140000;
  const min = 40000;
  const ticks = Array.from({ length: (max - min) / 20000 + 1 }, (_, i) => max - i * 20000);
  const y = (v: number) => ((max - v) / (max - min)) * 100;
  const pts = (list: [string, number][]) => list.map(([d, v]) => `${x(d).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const recorded = pts(RECORDED.map((p) => [p.date, p.value]));
  const band = `${pts(fc.map((p) => [p.date, p.p90]))} ${pts([...fc].reverse().map((p) => [p.date, p.p10]))}`;
  const p50 = pts(fc.map((p) => [p.date, p.p50]));
  const low = fc.reduce((a, b) => (b.p10 < a.p10 ? b : a));
  const split = x(RECORDED.at(-1)!.date);
  const months = Array.from(new Set([...RECORDED, ...fc].map((p) => p.date.slice(0, 7))));
  const points: ChartPoint[] = [
    ...RECORDED.map((p) => ({ date: p.date, label: p.label, kind: "recorded" as const, value: p.value })),
    ...fc.slice(1).map((p) => ({ date: p.date, label: p.label, kind: "forecast" as const, value: p.p50, p10: p.p10, p90: p.p90 })),
  ];
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const current = active === null ? null : points[Math.min(active, points.length - 1)];
  const shown = current ?? points.at(-1)!;
  const summary = `Recorded cash rose from ${short(RECORDED[0].value)} on 1 Sep to ${short(CASH_TODAY)} on 31 Oct. Expected cash dips to ${short(68600)} on 16 Nov, with a conservative low of ${short(low.p10)} on ${low.label}, and reaches ${short(fc.at(-1)!.p50)} by ${fc.at(-1)!.label}.`;

  const pick = (clientX: number) => {
    const r = plotRef.current?.getBoundingClientRect();
    if (!r) return;
    const at = ((clientX - r.left) / r.width) * 100;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - at) < Math.abs(x(points[best].date) - at)) best = i;
    });
    setActive(best);
  };

  return (
    <figure aria-label={`Cash balance chart. ${summary}`} className="flex flex-col gap-4">
      {/* Readout: the latest expected value, or the week under the pointer. */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2" aria-live="polite">
        <div>
          <p className="text-[13px] leading-5 text-muted">
            {shown.kind === "recorded" ? "Recorded" : "Expected"} · {shown.label} {year(shown.date)}
          </p>
          <p className={cn("tabular text-[26px] leading-9 font-semibold", shown.kind === "forecast" ? "text-ai-fg" : "text-fg")}>
            <NumberRoll value={shown.value} format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }} prefix="$" />
          </p>
        </div>
        {shown.kind === "forecast" ? (
          <p className="pb-1.5 text-[13px] leading-5 text-muted">
            Range <NumberRoll value={shown.p10 ?? 0} prefix="$" className="text-fg" /> – <NumberRoll value={shown.p90 ?? 0} prefix="$" className="text-fg" />
            {(shown.p10 ?? 0) < SAFETY_LEVEL && <span className="ml-2 font-medium text-warning-fg">Below safety level in the conservative case</span>}
          </p>
        ) : (
          <p className="pb-1.5 text-[13px] leading-5 text-muted">From the 8 active accounts at the end of that week</p>
        )}
        {current === null && <p className="ml-auto hidden pb-1.5 text-xs text-muted md:block">Point at the chart, or focus it and use the arrow keys</p>}
      </div>

      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label="Cash balance by week"
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={active ?? points.length - 1}
        aria-valuetext={`${shown.label} ${year(shown.date)}: ${shown.kind === "recorded" ? "recorded" : "expected"} ${short(shown.value)}`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
          e.preventDefault();
          const i = active ?? points.length - 1;
          setActive(e.key === "Home" ? 0 : e.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, i + (e.key === "ArrowRight" ? 1 : -1))));
        }}
        className="focus-ring relative ml-11 h-[280px] cursor-crosshair touch-none rounded-xs md:h-[300px]"
      >
        {ticks.map((t, i) => (
          <div key={t} className="pointer-events-none absolute inset-x-0" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden>
            <span className={cn("absolute inset-x-0 h-px", i === ticks.length - 1 ? "bg-chart-axis" : "bg-chart-grid")} />
            <span className="absolute -top-[7px] -left-11 w-9 text-right text-[11px] leading-[14px] text-muted">{k(t)}</span>
          </div>
        ))}
        <svg key={horizon} viewBox="0 0 100 100" preserveAspectRatio="none" className="lf-reveal pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <polygon points={band} fill="var(--lf-icon-ai)" opacity={0.14} />
          <polygon points={`${recorded} ${split},100 0,100`} fill="var(--lf-chart-revenue)" opacity={0.12} />
          <polyline points={recorded} fill="none" stroke="var(--lf-chart-revenue)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <polyline points={p50} fill="none" stroke="var(--lf-icon-ai)" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={100} y1={y(SAFETY_LEVEL)} y2={y(SAFETY_LEVEL)} className="stroke-warning" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <line x1={split} x2={split} y1={0} y2={100} stroke="var(--lf-chart-axis)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="pointer-events-none absolute top-1 -translate-x-[calc(100%+6px)] text-[11px] text-muted" style={{ left: `${split}%` }} aria-hidden>
          Recorded
        </span>
        <span className="pointer-events-none absolute top-0.5 ml-1.5 rounded-sm bg-ai-subtle px-1.5 py-0.5 text-[11px] font-medium text-ai-fg" style={{ left: `${split}%` }} aria-hidden>
          Forecast
        </span>
        <span className="pointer-events-none absolute left-2 -translate-y-[calc(100%+3px)] rounded-sm bg-warning-subtle px-1.5 py-0.5 text-[11px] font-medium text-warning-fg" style={{ top: `${y(SAFETY_LEVEL)}%` }} aria-hidden>
          Safety level {short(SAFETY_LEVEL)}
        </span>
        {current === null && (
          <>
            <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-warning bg-surface" style={{ left: `${x(low.date)}%`, top: `${y(low.p10)}%` }} aria-hidden />
            <span className="pointer-events-none absolute -translate-x-1/2 translate-y-3 rounded-md bg-inverse px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-md md:px-2.5 md:text-xs" style={{ left: `${Math.min(Math.max(x(low.date) + 8, 30), 70)}%`, top: `${y(low.p10)}%` }} aria-hidden>
              Conservative low {short(low.p10)} · {low.label}
            </span>
          </>
        )}
        {current && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 transition-[left] duration-150 ease-out" style={{ left: `${x(current.date)}%` }}>
            <span className="absolute inset-y-0 -left-px w-px bg-line-strong" />
            {current.kind === "forecast" && (
              <span
                className="absolute -left-[3px] w-1.5 rounded-full bg-icon-ai/25"
                style={{ top: `${y(current.p90 ?? 0)}%`, height: `${y(current.p10 ?? 0) - y(current.p90 ?? 0)}%` }}
              />
            )}
            <span
              className={cn("absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface shadow-xs", current.kind === "forecast" ? "border-icon-ai" : "border-primary")}
              style={{ top: `${y(current.value)}%` }}
            />
          </div>
        )}
        <span className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-icon-ai" style={{ left: "100%", top: `${y(fc.at(-1)!.p50)}%` }} aria-hidden />
      </div>
      <div className="relative -mt-2 ml-11 h-4" aria-hidden>
        {months.map((m) => {
          const pos = x(`${m}-01`);
          if (pos < -1 || pos > 101) return null;
          const [yy, mm] = m.split("-").map(Number);
          return (
            <span key={m} className="absolute -translate-x-1/2 text-[11px] leading-[14px] whitespace-nowrap text-muted" style={{ left: `${Math.max(pos, 3)}%` }}>
              1 {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mm - 1]}
              {mm === 1 ? ` ${yy}` : ""}
            </span>
          );
        })}
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

function SmallCard({ title, sub, value, range, spark, href, tone }: { title: string; sub: string; value: string; range: string; spark: number[]; href: string; tone?: "warning" }) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={sub}
        actions={
          <Link href={href} scroll={false} className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
            Open
            <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />
      <div className="flex items-end justify-between gap-4 px-5 pt-3 pb-5">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5">
            <span className="tabular text-[22px] leading-7 font-semibold text-fg">{value}</span>
            <span className="text-xs font-medium text-muted">USD</span>
          </p>
          <p className={cn("mt-0.5 text-xs", tone === "warning" ? "text-warning-fg" : "text-muted")}>{range}</p>
        </div>
        <HairlineSparkline data={spark} width={120} height={40} variant="area" color={tone === "warning" ? "var(--lf-chart-expense)" : "var(--lf-icon-ai)"} showScrubber format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} label={title} className="shrink-0" />
      </div>
    </Card>
  );
}

function SimpleTable({ caption, columns, rows, foot }: { caption: string; columns: { label: string; right?: boolean }[]; rows: (string | React.ReactNode)[][]; foot?: (string | React.ReactNode)[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px] leading-5">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-subtle text-xs leading-4 text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" className={cn("px-4 py-3 font-medium md:px-5", c.right && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line-subtle">
              {r.map((cell, j) => (
                <td key={j} className={cn("px-4 py-3 md:px-5", columns[j].right ? "tabular text-right text-fg" : "text-fg")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t border-line bg-subtle font-semibold">
              {foot.map((cell, j) => (
                <td key={j} className={cn("px-4 py-3 text-fg md:px-5", columns[j].right && "tabular text-right")}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const Predicted = ({ children }: { children: React.ReactNode }) => <span className="text-ai-fg">{children}</span>;

/** Category split per month: recorded months follow the October mix scaled to each month's total. */
function categorySeries(months: ReturnType<typeof monthsFor>) {
  const totalOct = EXPENSE_CATEGORIES.reduce((a, c) => a + c.recorded, 0);
  return EXPENSE_CATEGORIES.slice(0, 5).map((c) => ({
    id: c.name,
    label: c.name,
    values: [...TREND.map((m) => Math.round((c.recorded / totalOct) * m.expenses)), ...months.map((m) => Math.round((c.expected / totalOct) * m.expenses[1]))],
  }));
}

/* ---------- screen ---------- */

/** Forecasting (frame 20.11 and its tabs). Business Owner only. */
export function Forecasting() {
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview") as Tab;
  const [horizon, setHorizon] = useState<Horizon>(3);
  const [scenario, setScenario] = useState<Scenario>(BASE_SCENARIO);
  const [savedBudget, setSavedBudget] = useState<{ scenario: Scenario; savedAt: string } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      // The saved plan is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSavedBudget(JSON.parse(raw));
    } catch {}
  }, []);

  const t = useMemo(() => totals(horizon), [horizon]);
  if (!user) return null;
  if (user.role === "manager") {
    return (
      <Restricted title="Forecasting" heading="Forecasts are for the Business Owner">
        Forecasts and what-if scenarios cover the whole business, so only Sokha Chan can open them. Your branch figures are on your dashboard and in Monthly Reports.
      </Restricted>
    );
  }

  const setTab = (id: Tab) => router.replace(id === "overview" ? "/forecasting" : `/forecasting?tab=${id}`, { scroll: false });
  const tabHref = (id: Tab) => `/forecasting?tab=${id}`;
  const fc = forecastTo(horizon);
  const low = fc.reduce((a, b) => (b.p10 < a.p10 ? b : a));
  const months = monthsFor(horizon);
  const horizonDays = horizon === 1 ? 30 : horizon === 3 ? 90 : 180;

  const exportCsv = () =>
    downloadCsv(`LuyFlow_forecast_${horizon}m.csv`, [
      ["Date", "Kind", "Cash P10", "Cash P50", "Cash P90"],
      ...RECORDED.map((p) => [p.date, "Recorded", "", p.value.toFixed(2), ""]),
      ...fc.slice(1).map((p) => [p.date, "Forecast", p.p10.toFixed(2), p.p50.toFixed(2), p.p90.toFixed(2)]),
      [],
      ["Month", "Revenue P10", "Revenue P50", "Revenue P90", "Expenses P10", "Expenses P50", "Expenses P90"],
      ...months.map((m) => [m.label, ...m.revenue, ...m.expenses]),
    ]);

  return (
    <Page>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">Forecasting</h1>
            <AiBadge />
            <OwnerOnlyBadge />
          </div>
          <p className="mt-1 max-w-[560px] text-sm leading-[22px] text-muted">
            Predictions for {HORIZON_LABEL[horizon]}, based on {HISTORY_DAYS} days of recorded history. Predicted values are always dashed or violet, never shown as recorded data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Forecast horizon"
            value={String(horizon) as "1" | "3" | "6"}
            onChange={(v) => setHorizon(Number(v) as Horizon)}
            options={[
              { value: "1", label: "1 month" },
              { value: "3", label: "3 months" },
              { value: "6", label: "6 months" },
            ]}
          />
          <Button variant="secondary" icon={Download} onClick={exportCsv}>
            Export
          </Button>
          <Button icon={GitCompareArrows} onClick={() => setTab("whatif")}>
            What-if scenario
          </Button>
        </div>
      </header>

      <Tabs className="mt-5" label="Forecast views" value={tab} onChange={(id) => setTab(id as Tab)} items={TABS} />

      <div className="mt-6 flex flex-col gap-6">
        {tab === "overview" && (
          <>
            <Notice
              tone="warning"
              icon={<TriangleAlert size={18} aria-hidden />}
              title="Cash could dip below your safety level in late November"
              action={
                <Link href={tabHref("cashflow")} scroll={false} className="focus-ring rounded-xs text-sm font-medium whitespace-nowrap text-warning-fg hover:underline">
                  See what drives it
                </Link>
              }
            >
              The festival stock order on 16 Nov ($14,800.00) and November payroll leave expected cash at $68,600.00. In the conservative case it falls to $58,200 on 22 Nov, below your $60,000 safety level. Collecting the 3 overdue invoices ($3,150.00) first would keep it above.
            </Notice>

            <div>
              <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
                <Metric label={`Cash, ${fc.at(-1)!.label}`} value={t.cash.p50} sub={`Range ${short(t.cash.p10)} – ${short(t.cash.p90)}`} />
                <Metric label="Revenue" value={t.revenue.p50} sub={`Range ${short(t.revenue.p10)} – ${short(t.revenue.p90)}`} />
                <Metric label="Expenses" value={t.expenses.p50} sub={`Range ${short(t.expenses.p10)} – ${short(t.expenses.p90)}`} />
                <Metric label="Net profit" value={t.profit} sub={`Range ${short(t.profitRange[0])} – ${short(t.profitRange[1])}`} tone="success" />
              </div>
              <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-muted">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                Why cash grows less than profit: {usd(t.drawings)} of owner drawings is paid out of cash but is not an expense, and customers are expected to owe about {short(t.receivables)} more on {fc.at(-1)!.label} than today.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
              <Card aria-labelledby="cash-title">
                <CardHeader
                  title="Cash balance: recorded and forecast"
                  titleId="cash-title"
                  subtitle={`1 Sep 2026 – ${fc.at(-1)!.label} ${fc.at(-1)!.date.slice(0, 4)} · all accounts · USD`}
                  actions={
                    <Link href={tabHref("cashflow")} scroll={false} className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                      Cash flow detail
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  }
                />
                <div className="flex flex-col gap-4 px-5 pt-5 pb-5">
                  <Legend items={[{ label: "Recorded", swatch: SW.recorded }, { label: "Expected (P50)", swatch: SW.p50 }, { label: "Range (P10 – P90)", swatch: SW.band }, { label: "Safety level", swatch: SW.safety }]} />
                  <CashChart horizon={horizon} />
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <span className="text-sm font-medium text-fg">Cash balance · {horizonDays} days</span>
                    <ReliabilityIndicator r={RELIABILITY.cash[horizon]} />
                  </div>
                  <p className="flex items-start gap-2 text-[13px] leading-5 text-muted">
                    <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                    For the next 30 days, known bills, rent, owner drawings and payroll are drawn on their dates. Later dates show the expected trend.
                  </p>
                </div>
              </Card>

              <Card aria-labelledby="rel-title">
                <CardHeader
                  title="Forecast reliability"
                  titleId="rel-title"
                  actions={
                    <Link href={tabHref("reliability")} scroll={false} className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                      Details
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  }
                />
                <div className="flex flex-col gap-4 px-5 pt-5 pb-5">
                  <div>
                    <p className="text-sm font-medium text-fg">Revenue · {horizon} month{horizon === 1 ? "" : "s"} ahead</p>
                    <div className="mt-1.5">
                      <ReliabilityIndicator r={RELIABILITY.revenue[horizon]} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">Cash balance · {horizonDays} days</p>
                    <div className="mt-1.5">
                      <ReliabilityIndicator r={RELIABILITY.cash[horizon]} />
                    </div>
                  </div>
                  <p className="text-[13px] leading-5 text-muted">Levels come from backtests on your 8 months of history. They describe past performance and are not a guarantee of future results.</p>
                  <hr className="border-line" />
                  <dl className="flex flex-col gap-3.5">
                    {[
                      [<span key="a" className="mt-1 h-3 w-4 shrink-0 rounded-[2px] border-b-2 border-icon-ai/50 bg-icon-ai/10" />, "Conservative · P10", "The lower edge of the range. Only 1 in 10 outcomes is expected to be lower than this."],
                      [<span key="b" className="mt-2.5 w-4 shrink-0 border-t-2 border-dashed border-icon-ai" />, "Expected · P50", "The middle outcome: equally likely to be higher or lower."],
                      [<span key="c" className="mt-1 h-3 w-4 shrink-0 rounded-[2px] border-t-2 border-icon-ai/50 bg-icon-ai/10" />, "Optimistic · P90", "The upper edge of the range. Only 1 in 10 outcomes is expected to be higher than this."],
                    ].map(([sw, title, body]) => (
                      <div key={title as string} className="flex gap-2.5">
                        {sw}
                        <div>
                          <dt className="text-sm font-medium text-fg">{title}</dt>
                          <dd className="text-[13px] leading-5 text-muted">{body}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <SmallCard title="Revenue forecast" sub="November 2026 · expected" value={usd(50300)} range="Range $46,200 – $54,900" spark={[48620, 49100, 50300, 51400, 56100]} href={tabHref("revenue")} />
              <SmallCard title="Expense forecast" sub="November 2026 · expected" value={usd(33100)} range="Range $31,600 – $34,900" spark={[31940, 32300, 33100, 34200, 35400]} href={tabHref("expenses")} />
              <SmallCard title="Lowest expected cash" sub="16 Nov 2026 · festival stock order" value={usd(68600)} range={`P10 low ${short(low.p10)} · ${low.label}`} spark={[86400, 80300, 68600, 76500, 92800]} href={tabHref("cashflow")} tone="warning" />
            </div>

            <WhatIfPrompt onOpen={() => setTab("whatif")} />
          </>
        )}

        {tab === "revenue" && (
          <>
            <Card>
              <CardHeader title="Revenue, month by month" subtitle="Switch between the months recorded so far and the months ahead · USD" />
              <div className="px-1 pb-1">
                <EarningsChart
                  key={horizon}
                  title="Revenue"
                  periods={[
                    {
                      id: "ahead",
                      label: `Next ${horizon}`,
                      bars: months.map((m) => ({ key: m.id, label: m.label.slice(0, 3), title: `${m.label} · expected`, value: m.revenue[1] })),
                      previous: TREND.slice(-horizon).reduce((a, b) => a + b.revenue, 0),
                      comparison: `vs the ${horizon} month${horizon === 1 ? "" : "s"} before`,
                    },
                    {
                      id: "recorded",
                      label: "Recorded",
                      bars: TREND.map((m) => ({ key: m.id, label: m.short, title: `${m.short} 2026 · recorded`, value: m.revenue })),
                    },
                  ]}
                  format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                  locales="en-US"
                  className="!rounded-none !bg-transparent !shadow-none"
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue by month" subtitle={`${HORIZON_LABEL[horizon]} · expected with P10–P90 range · USD`} divided />
              <SimpleTable
                caption="Revenue forecast by month"
                columns={[{ label: "Month" }, { label: "Conservative (P10)", right: true }, { label: "Expected (P50)", right: true }, { label: "Optimistic (P90)", right: true }, { label: "What drives it" }]}
                rows={months.map((m) => [m.label, num(m.revenue[0]), <Predicted key="p">{num(m.revenue[1])}</Predicted>, num(m.revenue[2]), <span key="n" className="text-muted">{m.note ?? "Usual pattern"}</span>])}
                foot={["Total", num(t.revenue.p10), num(t.revenue.p50), num(t.revenue.p90), ""]}
              />
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader title="By source" subtitle="October recorded vs November expected · USD" divided />
                <SimpleTable caption="Revenue by source" columns={[{ label: "Source" }, { label: "October", right: true }, { label: "November", right: true }, { label: "Range", right: true }]} rows={REVENUE_SOURCES.map((s) => [s.name, num(s.recorded), <Predicted key="p">{num(s.expected)}</Predicted>, `${short(s.range[0])} – ${short(s.range[1])}`])} />
              </Card>
              <Card>
                <CardHeader title="By branch" subtitle="October recorded vs November expected · USD" divided />
                <SimpleTable caption="Revenue by branch" columns={[{ label: "Branch" }, { label: "October", right: true }, { label: "November", right: true }, { label: "Change", right: true }]} rows={BRANCH_REVENUE.map((b) => [b.name, num(b.recorded), <Predicted key="p">{num(b.expected)}</Predicted>, `${b.expected >= b.recorded ? "+" : "−"}${(Math.abs(b.expected / b.recorded - 1) * 100).toFixed(1)}%`])} />
              </Card>
            </div>
            <ReliabilityRow label="Revenue" r={RELIABILITY.revenue[horizon]} horizon={horizon} />
          </>
        )}

        {tab === "expenses" && (
          <>
            <Card>
              <CardHeader title="Expenses by category" subtitle="Recorded months, then the months ahead · stacked, overlapping or as shares · USD" />
              <div className="px-1 pb-1">
                <AreaChart
                  key={horizon}
                  title="Expenses"
                  caption={`March 2026 – ${months.at(-1)!.label}`}
                  labels={[...TREND.map((m) => m.short), ...months.map((m) => m.label.slice(0, 3))]}
                  titles={[...TREND.map((m) => `${m.short} 2026 · recorded`), ...months.map((m) => `${m.label} · expected`)]}
                  series={categorySeries(months)}
                  format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                  locales="en-US"
                  className="!rounded-none !bg-transparent !shadow-none"
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Expenses by month" subtitle={`${HORIZON_LABEL[horizon]} · expected with P10–P90 range · USD`} divided />
              <SimpleTable
                caption="Expense forecast by month"
                columns={[{ label: "Month" }, { label: "Low (P10)", right: true }, { label: "Expected (P50)", right: true }, { label: "High (P90)", right: true }, { label: "Known items" }]}
                rows={months.map((m) => [m.label, num(m.expenses[0]), <Predicted key="p">{num(m.expenses[1])}</Predicted>, num(m.expenses[2]), <span key="n" className="text-muted">{m.note ?? "Rent, payroll and usual stock orders"}</span>])}
                foot={["Total", num(t.expenses.p10), num(t.expenses.p50), num(t.expenses.p90), ""]}
              />
            </Card>
            <Card>
              <CardHeader title="November by category" subtitle="October recorded vs November expected · USD" divided />
              <SimpleTable
                caption="Expenses by category"
                columns={[{ label: "Category" }, { label: "October", right: true }, { label: "November", right: true }, { label: "Range", right: true }]}
                rows={EXPENSE_CATEGORIES.map((c) => [c.name, num(c.recorded), <Predicted key="p">{num(c.expected)}</Predicted>, c.range[0] === c.range[1] ? "Fixed" : `${short(c.range[0])} – ${short(c.range[1])}`])}
              />
              <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[13px] leading-5 text-muted">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                November’s figure excludes the festival stock order’s one-off part ($14,800.00 is spread over the stock it buys). Rent and payroll are fixed, so they have no range.
              </p>
            </Card>
            <ReliabilityRow label="Expenses" r={RELIABILITY.expenses[horizon]} horizon={horizon} />
          </>
        )}

        {tab === "cashflow" && (
          <>
            <Card>
              <CardHeader title="Cash balance: recorded and forecast" subtitle="All accounts · USD" />
              <div className="flex flex-col gap-4 px-5 pt-5 pb-5">
                <Legend items={[{ label: "Recorded", swatch: SW.recorded }, { label: "Expected (P50)", swatch: SW.p50 }, { label: "Range (P10 – P90)", swatch: SW.band }, { label: "Safety level", swatch: SW.safety }]} />
                <CashChart horizon={horizon} />
              </div>
            </Card>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
              <Card>
                <CardHeader title="Known money in and out" subtitle="Next 30 days · drawn on their dates" divided />
                <SimpleTable
                  caption="Known items in the next 30 days"
                  columns={[{ label: "Date" }, { label: "Item" }, { label: "Kind" }, { label: "Amount", right: true }]}
                  rows={KNOWN_ITEMS.map((i) => [i.date.slice(8).replace(/^0/, "") + " Nov", i.label, <span key="k" className="text-muted">{i.kind}</span>, <span key="a" className={i.amount < 0 ? "text-fg" : "text-success-fg"}>{`${i.amount < 0 ? "−" : "+"}${usd(Math.abs(i.amount))}`}</span>])}
                  foot={["", "Net known items", "", `−${usd(Math.abs(KNOWN_ITEMS.reduce((s, i) => s + i.amount, 0)))}`]}
                />
              </Card>
              <Card>
                <CardHeader title="Month-end cash" subtitle="Expected, with the conservative case" divided />
                <SimpleTable
                  caption="Month-end cash"
                  columns={[{ label: "Month end" }, { label: "Expected", right: true }, { label: "Conservative", right: true }]}
                  rows={fc.filter((p) => /-(30|31|28)$/.test(p.date) && p.date !== "2026-10-31").map((p) => [`${p.label} ${p.date.slice(0, 4)}`, <Predicted key="p">{short(p.p50)}</Predicted>, <span key="c" className={p.p10 < SAFETY_LEVEL ? "text-warning-fg" : undefined}>{short(p.p10)}</span>])}
                />
              </Card>
            </div>
          </>
        )}

        {tab === "runway" && <Runway horizon={horizon} />}

        {tab === "reliability" && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["Revenue", RELIABILITY.revenue],
                  ["Expenses", RELIABILITY.expenses],
                  ["Cash balance", RELIABILITY.cash],
                ] as const
              ).map(([label, r]) => (
                <Card key={label} className="p-5">
                  <h2 className="text-base font-semibold text-fg">{label}</h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {([1, 3, 6] as Horizon[]).map((h) => (
                      <li key={h} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] text-muted">{h} month{h === 1 ? "" : "s"} ahead</span>
                        <ReliabilityIndicator r={r[h]} />
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader title="Backtests: revenue one month ahead" subtitle="What the model would have forecast at the start of each month, against what was recorded" />
              <div className="px-1">
                <ComboChart
                  title="Recorded revenue"
                  days={BACKTESTS.map((b) => ({ key: b.month, label: b.month.slice(0, 3), title: b.month, value: b.actual }))}
                  average={BACKTESTS.map((b) => b.forecast)}
                  series={["Recorded", "Forecast one month ahead"]}
                  format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                  locales="en-US"
                  className="!rounded-none !bg-transparent !shadow-none"
                />
              </div>
              <SimpleTable
                caption="Revenue backtests"
                columns={[{ label: "Month" }, { label: "Forecast (P50)", right: true }, { label: "Recorded", right: true }, { label: "Error", right: true }]}
                rows={BACKTESTS.map((b) => [b.month, <Predicted key="p">{num(b.forecast)}</Predicted>, num(b.actual), `${b.actual >= b.forecast ? "+" : "−"}${(Math.abs(b.actual / b.forecast - 1) * 100).toFixed(1)}%`])}
              />
              <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[13px] leading-5 text-muted">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                March and April are left out: with fewer than 60 days of history the model has too little to learn from. Reliability improves as more months are recorded.
              </p>
            </Card>
          </>
        )}

        {tab === "whatif" && (
          <WhatIf
            horizon={horizon}
            scenario={scenario}
            onChange={setScenario}
            onSave={() => {
              const entry = { scenario, savedAt: `31 Oct 2026, ${new Date().toTimeString().slice(0, 5)}` };
              setSavedBudget(entry);
              try {
                localStorage.setItem(BUDGET_KEY, JSON.stringify(entry));
              } catch {}
              toast({ title: "Saved as target budget", body: "Compare your months against it in Target budget." });
              setTab("budget");
            }}
          />
        )}

        {tab === "budget" && (
          <Budget
            saved={savedBudget}
            horizon={horizon}
            onBuild={() => setTab("whatif")}
            onClear={() => {
              setSavedBudget(null);
              try {
                localStorage.removeItem(BUDGET_KEY);
              } catch {}
            }}
          />
        )}
      </div>
    </Page>
  );
}

function WhatIfPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-xs md:flex-row md:items-center">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-ai-subtle text-icon-ai">
        <GitCompareArrows size={22} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base leading-6 font-semibold text-fg">Planning a change? Test it before you commit</h2>
        <p className="mt-0.5 text-sm leading-5 text-muted">See how a new hire, a price change or a large purchase would move profit and cash, then save the plan you like as a target budget.</p>
      </div>
      <Button variant="secondary" icon={GitCompareArrows} onClick={onOpen}>
        Build a what-if scenario
      </Button>
    </section>
  );
}

function ReliabilityRow({ label, r, horizon }: { label: string; r: Reliability; horizon: Horizon }) {
  return (
    <p className="flex flex-wrap items-center gap-3 text-sm text-fg">
      <span className="font-medium">
        {label} · {horizon} month{horizon === 1 ? "" : "s"} ahead
      </span>
      <ReliabilityIndicator r={r} />
    </p>
  );
}

function Runway({ horizon }: { horizon: Horizon }) {
  const fc = forecastTo(horizon);
  const monthlyBurn = 33100 + 6500; // expected expenses plus owner drawings
  const months = CASH_TODAY / monthlyBurn;
  const aboveSafety = (CASH_TODAY - SAFETY_LEVEL) / monthlyBurn;
  return (
    <>
      <Card className="px-5 py-5">
        <StatsBand
          stats={[
            { value: CASH_TODAY, label: "Cash today", prefix: "$", format: { maximumFractionDigits: 0 } },
            { value: monthlyBurn, label: "Monthly outgoings", prefix: "$", format: { maximumFractionDigits: 0 } },
            { value: months, label: "Months with no income", format: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
            { value: aboveSafety, label: "Months above the safety level", format: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
          ]}
          numberClassName="tabular text-fg"
        />
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <Metric label="Cash today" value={CASH_TODAY} sub="8 active accounts · recorded" />
        <Metric label="Monthly outgoings" value={monthlyBurn} sub="Expected expenses + owner drawings" />
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] text-muted">Runway with no income</h2>
          <p className="mt-3 text-[28px] leading-9 font-semibold text-fg">{months.toFixed(1)} months</p>
          <p className="mt-1.5 text-xs text-muted">If sales stopped today, cash would last until mid-February 2027.</p>
        </section>
        <section className="rounded-lg border border-warning/50 bg-warning-subtle p-5 shadow-xs">
          <h2 className="text-[13px] text-body">Above your safety level</h2>
          <p className="mt-3 text-[28px] leading-9 font-semibold text-warning-fg">{aboveSafety.toFixed(1)} months</p>
          <p className="mt-1.5 text-xs text-body">Cash stays above {short(SAFETY_LEVEL)} for about {Math.round(aboveSafety * 30)} days with no income.</p>
        </section>
      </div>
      <Card>
        <CardHeader title="With expected income" subtitle="Cash never runs out in the forecast; the closest point to the safety level is in late November" divided />
        <SimpleTable
          caption="Runway checkpoints"
          columns={[{ label: "Date" }, { label: "Expected cash", right: true }, { label: "Conservative", right: true }, { label: "Months of outgoings", right: true }]}
          rows={fc.filter((_, i) => i % 2 === 0).map((p) => [`${p.label} ${p.date.slice(0, 4)}`, <Predicted key="p">{short(p.p50)}</Predicted>, <span key="c" className={p.p10 < SAFETY_LEVEL ? "text-warning-fg" : undefined}>{short(p.p10)}</span>, (p.p50 / monthlyBurn).toFixed(1)])}
        />
      </Card>
    </>
  );
}

/** Hairline UI stepper: tap to step, hold to accelerate, digits roll in place. */
function NumberField({ label, value, onChange, unit, money, min = 0, max, step = 1, hint }: { label: string; value: number; onChange: (v: number) => void; unit?: string; money?: boolean; min?: number; max?: number; step?: number; hint?: string }) {
  return (
    <div className="flex flex-col text-sm font-medium text-fg">
      <span className="mb-1.5">{label}</span>
      <StepperInput
        label={label}
        value={value}
        onValueChange={onChange}
        min={min}
        max={max ?? 1_000_000}
        step={step}
        unit={unit}
        format={money ? { style: "currency", currency: "USD", maximumFractionDigits: 0 } : undefined}
        variant="field"
        className="w-full"
      />
      {hint && <span className="mt-1 text-xs font-normal text-muted">{hint}</span>}
    </div>
  );
}

function WhatIf({ horizon, scenario, onChange, onSave }: { horizon: Horizon; scenario: Scenario; onChange: (s: Scenario) => void; onSave: () => void }) {
  const base = applyScenario(BASE_SCENARIO, horizon);
  const next = applyScenario(scenario, horizon);
  const months = monthsFor(horizon);
  const set = (patch: Partial<Scenario>) => onChange({ ...scenario, ...patch });
  const changed = JSON.stringify(scenario) !== JSON.stringify(BASE_SCENARIO);
  const delta = (a: number, b: number) => `${b - a >= 0 ? "+" : "−"}${usd(Math.abs(b - a))}`;
  const belowSafety = next.lowest.value < SAFETY_LEVEL;
  const monthOptions = months.map((m, i) => ({ value: i + 1, label: m.label }));

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Your scenario" subtitle={`Applied to ${HORIZON_LABEL[horizon]}`} divided />
        <div className="flex flex-col gap-5 p-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <UserRound size={16} className="text-icon" aria-hidden />
              New staff
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="People" value={scenario.hires} max={10} onChange={(v) => set({ hires: v })} />
              <NumberField label="Monthly salary" money value={scenario.salary} step={10} onChange={(v) => set({ salary: v })} />
            </div>
            <label className="flex flex-col text-sm font-medium text-fg">
              Starting in
              <select value={scenario.startMonth} onChange={(e) => set({ startMonth: Number(e.target.value) })} className="focus-ring mt-1.5 h-10 rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal">
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <Target size={16} className="text-icon" aria-hidden />
              Prices
            </legend>
            <NumberField label="Change wholesale and walk-in prices by" unit="%" value={scenario.priceChange} min={-20} max={20} onChange={(v) => set({ priceChange: v })} hint="Assumes some customers buy less after a rise, as in your past price changes." />
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <BriefcaseBusiness size={16} className="text-icon" aria-hidden />
              One large purchase
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Amount" money value={scenario.purchase} step={500} onChange={(v) => set({ purchase: v })} />
              <label className="flex flex-col text-sm font-medium text-fg">
                In
                <select value={scenario.purchaseMonth} onChange={(e) => set({ purchaseMonth: Number(e.target.value) })} className="focus-ring mt-1.5 h-10 rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal">
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <NumberField label="Owner drawings each month" money value={scenario.drawings} step={100} onChange={(v) => set({ drawings: v })} />
          <div className="flex flex-wrap gap-3 border-t border-line pt-4">
            <Button variant="secondary" icon={RotateCcw} disabled={!changed} onClick={() => onChange(BASE_SCENARIO)}>
              Reset
            </Button>
            <Button icon={Save} disabled={!changed} onClick={onSave}>
              Save as target budget
            </Button>
          </div>
        </div>
      </Card>
      <div className="flex min-w-0 flex-col gap-6">
        {belowSafety && changed && (
          <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="This plan takes expected cash below your safety level">
            Lowest expected cash would be {short(next.lowest.value)} in {next.lowest.month}, under {short(SAFETY_LEVEL)}. Move the purchase later or spread it over two months.
          </Notice>
        )}
        <Card>
          <CardHeader title="Effect of your scenario" subtitle="Compared with the forecast as it is · expected values · USD" divided />
          <SimpleTable
            caption="Scenario comparison"
            columns={[{ label: "" }, { label: "Forecast", right: true }, { label: "With your scenario", right: true }, { label: "Difference", right: true }]}
            rows={[
              ["Revenue", num(base.revenue), <Predicted key="a">{num(next.revenue)}</Predicted>, delta(base.revenue, next.revenue)],
              ["Expenses", num(base.expenses), <Predicted key="b">{num(next.expenses)}</Predicted>, delta(base.expenses, next.expenses)],
              ["Net profit", num(base.profit), <Predicted key="c">{num(next.profit)}</Predicted>, delta(base.profit, next.profit)],
              [`Cash at the end`, num(base.cash), <Predicted key="d">{num(next.cash)}</Predicted>, delta(base.cash, next.cash)],
              ["Lowest expected cash", num(base.lowest.value), <span key="e" className={belowSafety ? "text-warning-fg" : "text-ai-fg"}>{num(next.lowest.value)}</span>, delta(base.lowest.value, next.lowest.value)],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Month by month" subtitle="With your scenario" divided />
          <SimpleTable
            caption="Scenario by month"
            columns={[{ label: "Month" }, { label: "Revenue", right: true }, { label: "Expenses", right: true }, { label: "Net profit", right: true }, { label: "Cash at month end", right: true }]}
            rows={next.rows.map((r) => [r.label, num(r.revenueValue), num(r.expensesValue), <span key="p" className={r.profit < 0 ? "text-error-fg" : "text-success-fg"}>{num(r.profit)}</span>, <Predicted key="c">{num(r.cashEnd)}</Predicted>])}
          />
        </Card>
        <p className="flex items-start gap-2 text-[13px] leading-5 text-muted">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
          Scenarios are estimates built on the expected forecast. Nothing in your records changes until you act on the plan.
        </p>
      </div>
    </div>
  );
}

function Budget({ saved, horizon, onBuild, onClear }: { saved: { scenario: Scenario; savedAt: string } | null; horizon: Horizon; onBuild: () => void; onClear: () => void }) {
  if (!saved) {
    return (
      <section className="flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-14 text-center shadow-xs">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-ai-subtle text-icon-ai">
          <Target size={22} aria-hidden />
        </span>
        <h2 className="mt-4 text-base font-semibold text-fg">No target budget yet</h2>
        <p className="mt-1 max-w-md text-sm text-muted">Build a what-if scenario and save it. Each month is then compared with the plan as it is recorded.</p>
        <Button icon={GitCompareArrows} className="mt-5" onClick={onBuild}>
          Build a what-if scenario
        </Button>
      </section>
    );
  }
  const plan = applyScenario(saved.scenario, horizon);
  const s = saved.scenario;
  const parts = [s.hires ? `${s.hires} new staff at $${s.salary}/month` : "", s.priceChange ? `prices ${s.priceChange > 0 ? "+" : ""}${s.priceChange}%` : "", s.purchase ? `${usd(s.purchase)} purchase` : "", s.drawings !== BASE_SCENARIO.drawings ? `drawings ${usd(s.drawings)}/month` : ""].filter(Boolean);
  return (
    <>
      <section className="flex flex-wrap items-center gap-4 rounded-lg border border-icon-ai/20 bg-ai-subtle px-5 py-4">
        <Target size={20} className="shrink-0 text-icon-ai" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-fg">Target budget · saved {saved.savedAt}</p>
          <p className="text-body">{parts.length ? parts.join(" · ") : "The forecast as it is"}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBuild}>
          Change plan
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Remove
        </Button>
      </section>
      <Card>
        <CardHeader title="Targets by month" subtitle="November is tracked as it is recorded; later months fill in as they happen" divided />
        <SimpleTable
          caption="Target budget by month"
          columns={[{ label: "Month" }, { label: "Revenue target", right: true }, { label: "Expense limit", right: true }, { label: "Profit target", right: true }, { label: "Recorded so far" }]}
          rows={plan.rows.map((r, i) => [r.label, num(r.revenueValue), num(r.expensesValue), num(r.profit), <span key="s" className="text-muted">{i === 0 ? "Starts 1 Nov 2026" : "Not started"}</span>])}
          foot={["Total", num(plan.revenue), num(plan.expenses), num(plan.profit), ""]}
        />
      </Card>
      <p className="flex items-start gap-2 text-[13px] leading-5 text-muted">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
        Only you can see the target budget. Branch Managers see their branch’s recorded figures, not targets.
      </p>
    </>
  );
}
