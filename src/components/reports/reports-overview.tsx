"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarCheck, Download, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { Segmented } from "@/components/ui/flow";
import { Page } from "@/components/ui/page";
import { cn } from "@/lib/format";
import { buildReport, OCTOBER, TREND, type MonthId } from "@/lib/mock/reports-data";
import { useSession } from "@/lib/session";
import { GenerateDialog } from "./generate-dialog";
import { ReportsTable } from "./reports-list";
import { GeneratingCard, ReportsHeader, TrendChart, usd } from "./reports-shared";
import { useReports } from "./reports-store";

/** Frame 12.1. Branch Managers go straight to their list (12.12). */
export function ReportsOverview() {
  const { user } = useSession();
  const reports = useReports();
  const router = useRouter();
  const params = useSearchParams();
  const [range, setRange] = useState<"8" | "12">("8");
  const generateOpen = params.get("generate") === "1";
  const setGenerate = (open: boolean) => router.replace(open ? "/monthly-reports?generate=1" : "/monthly-reports", { scroll: false });

  if (!user || !reports.ready) return null;
  const oct = reports.view(OCTOBER);
  const october = buildReport(OCTOBER);
  const latest = buildReport("2026-08");
  const recent = reports.available.slice(0, 3);

  const startGenerate = (id: MonthId) => {
    reports.start(id);
    router.push("/monthly-reports/all");
  };

  return (
    <Page>
      <ReportsHeader isManager={false} count={reports.available.length} generating={Boolean(reports.generating)} onGenerate={() => setGenerate(true)} />

      <div className="mt-6 flex flex-col gap-6">
        {oct.state === "none" && (
          <section aria-labelledby="ready-title" className="flex flex-col gap-4 rounded-lg border border-primary/30 bg-surface p-5 shadow-xs md:flex-row md:items-center md:gap-6 md:p-6">
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-brand md:inline-flex">
              <CalendarCheck size={26} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="ready-title" className="text-lg leading-7 font-semibold text-fg md:text-xl">
                  October 2026 is ready to report
                </h2>
                <Badge tone="neutral">Not generated</Badge>
              </div>
              <p className="mt-1 max-w-[700px] text-sm leading-[22px] text-body">
                The month ended today. {october.checksPassed} of 12 checks passed, so the report will be marked Incomplete and will say exactly what is missing. You can regenerate it after
                resolving the open items.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5">
                <span className="h-1.5 w-[280px] max-w-full overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="lf-grow-x block h-full rounded-full bg-warning" style={{ width: `${(october.checksPassed / 12) * 100}%` }} />
                </span>
                <span className="font-medium text-warning-fg">{october.checksPassed} of 12 checks passed</span>
                <span className="text-muted">· {october.open.length} open items</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <Button icon={Sparkles} onClick={() => setGenerate(true)}>
                Generate October report
              </Button>
              <button type="button" onClick={() => setGenerate(true)} className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs text-[13px] leading-5 font-medium text-brand hover:underline">
                See what is missing
                <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </section>
        )}
        {oct.state === "generating" && <GeneratingCard id={OCTOBER} step={oct.step} startedAt={oct.startedAt} onCancel={() => reports.cancel(OCTOBER)} />}
        {oct.state === "ready" && (
          <section className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-xs">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-brand">
              <CalendarCheck size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px] font-semibold text-fg">
                October 2026 report
                <Badge tone={october.status === "complete" ? "success" : "warning"} dot>
                  {october.status === "complete" ? "Complete" : "Incomplete"}
                </Badge>
              </p>
              <p className="text-[13px] leading-5 text-muted">
                Generated {oct.generatedAt} · {october.checksPassed} of 12 checks passed
              </p>
            </div>
            <ButtonLink href={`/monthly-reports/${OCTOBER}`} iconRight={ArrowRight}>
              Open report
            </ButtonLink>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card aria-labelledby="trend-title">
            <CardHeader
              title="Revenue, expenses and net profit"
              titleId="trend-title"
              subtitle="March–October 2026 · all branches · USD"
              actions={<Segmented label="Chart range" value={range} onChange={setRange} options={[{ value: "8", label: "8 months" }, { value: "12", label: "12 months" }]} />}
            />
            <div className="px-5 pt-4 pb-5">
              {range === "12" && (
                <p className="mb-3 rounded-md bg-subtle px-3 py-2 text-xs leading-4 text-body">LuyFlow has records from March 2026, so 8 months are shown. The 12-month view fills in as more months are recorded.</p>
              )}
              <TrendChart points={TREND} label="Revenue, expenses and net profit, March to October 2026" />
              <p className="mt-4 flex items-start gap-2 text-xs leading-4 text-muted">
                <Info size={14} className="shrink-0" aria-hidden />
                October is shown from recorded data. It becomes final once its report is Complete. The 12-month view opens in March 2027, when a full year is recorded.
              </p>
            </div>
          </Card>

          <Card aria-labelledby="latest-title">
            <CardHeader
              title="Latest complete report"
              titleId="latest-title"
              subtitle="August 2026 · all branches"
              badge={
                <Badge tone="success" dot size="sm">
                  Complete
                </Badge>
              }
              actions={<CardLink href="/monthly-reports/2026-08">Open</CardLink>}
            />
            <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-line pb-4">
                {[
                  ["Revenue", usd(latest.revenue)],
                  ["Expenses", usd(latest.expenses)],
                  ["Net profit", usd(latest.profit)],
                  ["Profit margin", `${latest.margin.toFixed(1)}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs leading-4 text-muted">{label}</dt>
                    <dd className={cn("tabular mt-1 text-[15px] leading-[22px] font-medium", label === "Net profit" ? "text-success-fg" : "text-fg")}>{value}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-4 inline-flex h-6 w-fit items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
                <Sparkles size={12} aria-hidden />
                AI summary
              </span>
              <p className="mt-2 text-sm leading-[22px] text-body">Walk-in sales grew in every branch and Siem Reap had its best month so far. Rent and payroll did not change.</p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <ButtonLink href="/monthly-reports/2026-08?export=1" variant="secondary" icon={Download}>
                  Export PDF
                </ButtonLink>
                <ButtonLink href="/ai-advisor" variant="secondary" icon={Sparkles}>
                  Ask the AI Advisor
                </ButtonLink>
              </div>
            </div>
          </Card>
        </div>

        <Card aria-labelledby="recent-title">
          <CardHeader title="Recent reports" titleId="recent-title" divided actions={<CardLink href="/monthly-reports/all">View all reports</CardLink>} />
          <ReportsTable ids={recent} />
        </Card>
      </div>

      <GenerateDialog key={String(generateOpen)} open={generateOpen} onClose={() => setGenerate(false)} initialMonth={OCTOBER} onGenerate={startGenerate} existing={(id) => reports.view(id).state === "ready"} />
    </Page>
  );
}
