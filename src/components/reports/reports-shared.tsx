"use client";

import { ArrowDownRight, ArrowUpRight, FileText, Lock, Percent, PiggyBank, ReceiptText, TrendingUp, Info } from "lucide-react";
import { NumberRoll } from "@/components/hairline/number-roll";
import { RevenueChart } from "@/components/hairline/revenue-chart";
import { TaskProgress } from "@/components/hairline/task-progress";
import { buildReport, GENERATE_STEP_LABELS, type MonthId } from "@/lib/mock/reports-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/page";
import { cn, num } from "@/lib/format";
import type { Kpi, ReportStatus } from "@/lib/mock/reports-data";

export const usd = (n: number) => `$${num(n)}`;

export function ReportStatusBadge({ status }: { status: ReportStatus | "generating" | "none" }) {
  if (status === "generating")
    return (
      <Badge tone="sky" dot>
        Generating
      </Badge>
    );
  if (status === "none") return <Badge tone="neutral">Not generated</Badge>;
  return (
    <Badge tone={status === "complete" ? "success" : "warning"} dot>
      {status === "complete" ? "Complete" : "Incomplete"}
    </Badge>
  );
}

const KPI_ICON = { revenue: TrendingUp, expenses: ReceiptText, profit: PiggyBank, margin: Percent };

/** KPI cards of frames 12.5 and 12.13: figure, unit and a change pill. Expenses going up is bad news. */
export function KpiTiles({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = KPI_ICON[kpi.id];
        const percent = kpi.id === "margin";
        const up = (kpi.delta ?? 0) >= 0;
        const good = kpi.id === "expenses" ? !up : up;
        const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
        return (
          <section key={kpi.id} className="lift flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate text-[13px] leading-5 text-muted">{kpi.label}</h2>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
                <Icon size={16} aria-hidden />
              </span>
            </div>
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
              <span className="tabular truncate text-[22px] leading-8 font-semibold tracking-[-0.14px] text-fg md:text-[28px] md:leading-9">
                {percent ? (
                  <NumberRoll value={kpi.value} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
                ) : (
                  <NumberRoll value={kpi.value} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} prefix="$" />
                )}
              </span>
              {!percent && <span className="text-xs leading-4 font-medium text-muted max-md:sr-only">USD</span>}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {kpi.delta !== undefined && (
                <span className={cn("inline-flex h-[22px] items-center gap-0.5 rounded-sm px-1.5 text-xs leading-4 font-medium", good ? "bg-success-subtle text-success-fg" : "bg-error-subtle text-error-fg")}>
                  <DeltaIcon size={12} aria-hidden />
                  <span className="sr-only">{up ? "Up" : "Down"}</span>
                  {Math.abs(kpi.delta).toFixed(1)}
                  {percent ? "" : "%"}
                </span>
              )}
              <span className="text-xs leading-4 text-muted">{kpi.vs}</span>
            </p>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Revenue, expenses and net profit by month (frames 12.1 and 12.5), drawn with
 * the Hairline UI revenue chart: switch the measure, point at a month for its
 * readout, and the total and change roll.
 */
export function TrendChart({
  points,
  height = 240,
  label,
}: {
  points: { short: string; revenue: number; expenses: number; profit: number }[];
  height?: number;
  label: string;
}) {
  const fmt: Intl.NumberFormatOptions = { style: "currency", currency: "USD", maximumFractionDigits: 0 };
  return (
    <div aria-label={label} style={{ "--plot-h": `${height}px` } as React.CSSProperties}>
      <RevenueChart
        labels={points.map((p) => p.short)}
        titles={points.map((p) => `${p.short} 2026`)}
        metrics={[
          { id: "revenue", label: "Revenue", current: points.map((p) => p.revenue), format: fmt },
          { id: "expenses", label: "Expenses", current: points.map((p) => p.expenses), format: fmt },
          { id: "profit", label: "Net profit", current: points.map((p) => p.profit), format: fmt },
        ]}
        locales="en-US"
        className="!rounded-none !bg-transparent !shadow-none [&>div]:!p-0 md:[&>div]:[--plot:var(--plot-h)]"
      />
    </div>
  );
}

/** A report being generated, as the Hairline UI task progress card: phases, live timer, stats and Cancel. */
export function GeneratingCard({ id, step, startedAt, onCancel, onOpen }: { id: MonthId; step: number; startedAt: number; onCancel: () => void; onOpen?: () => void }) {
  const report = buildReport(id);
  return (
    <TaskProgress
      title={`Generating the ${report.label} report`}
      status="running"
      phases={GENERATE_STEP_LABELS}
      phase={step}
      startedAt={startedAt}
      stats={[
        { label: "Checks passed", value: `${report.checksPassed} of 12` },
        { label: "Branches", value: <NumberRoll value={Math.min(4, step + 1)} /> },
        { label: "Insights written", value: <NumberRoll value={step >= 2 ? report.insights.length : 0} /> },
      ]}
      message="You can keep working; we will notify you when it is ready."
      onCancel={onCancel}
      onOpen={onOpen}
      openLabel="Open report"
    />
  );
}

/** Title, subtitle, Overview / All reports tabs and the Generate button (frames 12.1, 12.2, 12.12). */
export function ReportsHeader({
  isManager,
  branch,
  count,
  generating,
  onGenerate,
}: {
  isManager: boolean;
  branch?: string;
  count: number;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <>
      <header className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">Monthly Reports</h1>
          <p className="mt-1 text-sm leading-[22px] text-muted">
            {isManager
              ? `Reports for ${branch} Branch. The Business Owner generates each month’s report.`
              : "A monthly summary of revenue, expenses, cash and stock, with AI insights and a check that the month’s records are complete."}
          </p>
        </div>
        {isManager ? (
          <div className="flex flex-col items-start gap-1.5 md:items-end">
            <Button variant="secondary" icon={Lock} disabled>
              Generate report
            </Button>
            <p className="flex items-center gap-1 text-xs leading-4 text-muted">
              <Info size={12} aria-hidden />
              Only the Business Owner can generate reports
            </p>
          </div>
        ) : (
          <Button variant={generating ? "primary" : "secondary"} icon={FileText} onClick={onGenerate} disabled={generating} className={generating ? "disabled:bg-primary disabled:text-white" : undefined}>
            {generating ? "Generating…" : "Generate report"}
          </Button>
        )}
      </header>
      {!isManager && (
        <LinkTabs
          className="mt-5"
          items={[
            { label: "Overview", href: "/monthly-reports", exact: true },
            { label: "All reports", href: "/monthly-reports/all", count },
          ]}
        />
      )}
    </>
  );
}

/** Small amber/green/grey dot-pill used for branch record status. */
export function RecordsPill({ label, tone }: { label: string; tone: "success" | "warning" }) {
  return (
    <Badge tone={tone} dot size="sm">
      {label}
    </Badge>
  );
}
