"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  HeartPulse,
  Info,
  Lightbulb,

  Lock,
  MessageSquare,
  Minus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  TriangleAlert,
  Building2,
} from "lucide-react";
import { ScoreRing } from "@/components/dashboard/health-card";
import { AccountAvatar } from "@/components/finance/common";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { Bar } from "@/components/ui/charts";
import { DataTable, TwoLine, type Column } from "@/components/ui/data-table";
import { Segmented } from "@/components/ui/flow";
import { Notice, Page, PageHeader, ScopeNotice, Tabs } from "@/components/ui/page";
import { useToast } from "@/components/ui/overlay";
import { cn, downloadCsv, num } from "@/lib/format";
import { downloadBlob } from "@/lib/pdf";
import {
  BRANCH_META,
  buildBranchReport,
  buildReport,
  isMonthId,
  KHR_RATE,
  MATRIX_COLUMNS,
  TREND,
  type Check,
  type Insight,
  type MonthId,
  type PlLine,
  type Report,
} from "@/lib/mock/reports-data";
import { useSession } from "@/lib/session";
import { ExportDialog } from "./export-dialog";
import { GenerateDialog } from "./generate-dialog";
import { BRANCH_SECTIONS, branchPdf, OWNER_SECTIONS, ownerPdf, type AmountMode, type SectionId } from "./report-pdf";
import { GeneratingCard, KpiTiles, RecordsPill, ReportStatusBadge, TrendChart, usd } from "./reports-shared";
import { useReports } from "./reports-store";

type Tab = "summary" | "pl" | "insights" | "completeness";

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-fg">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

function AiPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
      <Sparkles size={12} aria-hidden />
      {children}
    </span>
  );
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Route for `/monthly-reports/[month]`: owner report or the Branch Manager's branch report. */
export function ReportRoute() {
  const { month } = useParams<{ month: string }>();
  const { user } = useSession();
  const reports = useReports();
  if (!user || !reports.ready) return null;
  if (!isMonthId(month)) {
    return (
      <Page>
        <p className="text-sm text-muted">There is no report for this month.</p>
      </Page>
    );
  }
  return user.role === "manager" ? <BranchReportView id={month} branch={user.branch ?? "Toul Kork"} /> : <OwnerReport id={month} />;
}

function useExportParam(base: string) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "summary";
  const exportOpen = params.get("export") === "1";
  const set = (next: { tab?: Tab; export?: boolean }) => {
    const q = new URLSearchParams();
    const t = next.tab ?? tab;
    if (t !== "summary") q.set("tab", t);
    if (next.export ?? exportOpen) q.set("export", "1");
    router.replace(q.size ? `${base}?${q}` : base, { scroll: false });
  };
  return { tab, exportOpen, set };
}

/* ---------- Owner report (12.5–12.11) ---------- */

function OwnerReport({ id }: { id: MonthId }) {
  const reports = useReports();
  const toast = useToast();
  const router = useRouter();
  const base = `/monthly-reports/${id}`;
  const { tab, exportOpen, set } = useExportParam(base);
  const [generateOpen, setGenerateOpen] = useState(false);
  const gen = reports.view(id);
  const report = buildReport(id, gen.state === "ready" ? { generatedAt: gen.generatedAt } : {});
  const incomplete = report.status === "incomplete";
  const breadcrumbs = [{ label: "Monthly Reports", href: "/monthly-reports" }, { label: report.label }];

  const generateDialog = (
    <GenerateDialog
      key={`gen-${generateOpen}`}
      open={generateOpen}
      onClose={() => setGenerateOpen(false)}
      initialMonth={id}
      onGenerate={(m) => {
        reports.start(m);
        if (m !== id) router.push(`/monthly-reports/${m}`);
      }}
      existing={(m) => reports.view(m).state === "ready"}
    />
  );

  if (gen.state !== "ready") {
    return (
      <Page>
        <PageHeader breadcrumbs={breadcrumbs} title={`${report.label} report`} badges={<ReportStatusBadge status={gen.state === "generating" ? "generating" : "none"} />} subtitle={`All branches · ${report.period}`} />
        {gen.state === "generating" ? (
          <div className="mt-6 max-w-[720px]">
            <GeneratingCard id={id} step={gen.step} startedAt={gen.startedAt} onCancel={() => reports.cancel(id)} />
          </div>
        ) : (
          <section className="mt-6 flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-14 text-center shadow-xs">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-subtle text-brand">
              <FileText size={22} aria-hidden />
            </span>
            <h2 className="mt-4 text-base leading-6 font-semibold text-fg">{report.label} has not been reported yet</h2>
            <p className="mt-1 max-w-md text-sm leading-[22px] text-muted">
              {report.checksPassed} of 12 checks passed. Generate it now and it will be marked Incomplete with the open items listed, or resolve them first.
            </p>
            <Button icon={Sparkles} className="mt-5" onClick={() => setGenerateOpen(true)}>
              Generate {report.label.split(" ")[0]} report
            </Button>
          </section>
        )}
        {generateDialog}
      </Page>
    );
  }

  const onExport = (sections: SectionId[], mode: AmountMode) => {
    const doc = ownerPdf(report, sections, mode);
    const blob = doc.toBlob((page, total) => `LuyFlow · Mekong Mart Co., Ltd. · ${report.label} report · ${incomplete ? "INCOMPLETE · " : ""}page ${page} of ${total}`);
    const fileName = `LuyFlow_MekongMart_${id}.pdf`;
    downloadBlob(fileName, blob);
    set({ export: false });
    toast({ title: "PDF exported", body: `${fileName} was saved to your downloads (${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}, ${sizeLabel(blob.size)}).` });
  };

  const openTab = (href: string) => (href.startsWith("?tab=") ? set({ tab: href.slice(5) as Tab }) : router.push(href));

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={`${report.label} report`}
        badges={
          <>
            <ReportStatusBadge status={report.status} />
            <AiPill>AI summary</AiPill>
          </>
        }
        subtitle={`All branches · ${report.period} · generated ${report.generatedAt} by ${report.generatedBy} · amounts in USD`}
        actions={
          <>
            {incomplete && (
              <Button variant="secondary" icon={RefreshCw} disabled={Boolean(reports.generating)} onClick={() => setGenerateOpen(true)}>
                Regenerate
              </Button>
            )}
            <Button icon={Download} onClick={() => set({ export: true })}>
              Export PDF
            </Button>
          </>
        }
      />

      <Tabs
        className="mt-5"
        label="Report sections"
        value={tab}
        onChange={(t) => set({ tab: t as Tab })}
        items={[
          { id: "summary", label: "Summary" },
          { id: "pl", label: "Profit & loss" },
          { id: "insights", label: "AI insights", count: report.insights.length },
          { id: "completeness", label: "Completeness", count: report.open.length || undefined },
        ]}
      />

      <div className="mt-6">
        {tab === "summary" && <SummaryTab report={report} onTab={openTab} />}
        {tab === "pl" && <PlTab report={report} />}
        {tab === "insights" && <InsightsTab report={report} onLink={openTab} />}
        {tab === "completeness" && <CompletenessTab report={report} runs={gen.runs} />}
      </div>

      <ExportDialog
        key={`export-${exportOpen}`}
        open={exportOpen}
        onClose={() => set({ export: false })}
        title="Export report as PDF"
        subtitle={`${report.label} · all branches`}
        sections={OWNER_SECTIONS}
        defaults={["summary", "pl", "branches", "cash", "receivables", "insights"]}
        incomplete={incomplete}
        fileName={`LuyFlow_MekongMart_${id}.pdf`}
        preview={{
          label: `Monthly report · ${report.label}`,
          scope: `Mekong Mart Co., Ltd. · all branches · USD · ${report.generatedAt}`,
          kpis: [
            ["Revenue", usd(report.revenue)],
            ["Expenses", usd(report.expenses)],
            ["Net profit", usd(report.profit)],
          ],
        }}
        onExport={onExport}
      />
      {generateDialog}
    </Page>
  );
}

function SummaryCard({ report }: { report: { summary: string[]; summaryBasis: string } }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const btn = "focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-muted-bg";
  return (
    <Card aria-labelledby="summary-title">
      <CardHeader
        title="Summary"
        titleId="summary-title"
        badge={<AiPill>AI-written</AiPill>}
        actions={
          <>
            <button type="button" aria-label="Helpful summary" aria-pressed={vote === "up"} onClick={() => setVote(vote === "up" ? null : "up")} className={cn(btn, vote === "up" ? "text-brand" : "text-icon")}>
              <ThumbsUp size={16} fill={vote === "up" ? "currentColor" : "none"} aria-hidden />
            </button>
            <button type="button" aria-label="Not helpful" aria-pressed={vote === "down"} onClick={() => setVote(vote === "down" ? null : "down")} className={cn(btn, vote === "down" ? "text-brand" : "text-icon")}>
              <ThumbsDown size={16} fill={vote === "down" ? "currentColor" : "none"} aria-hidden />
            </button>
          </>
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-3 pb-5 text-sm leading-[22px] text-body md:text-[15px] md:leading-6">
        {report.summary.map((p) => (
          <p key={p.slice(0, 24)}>
            <Rich text={p} />
          </p>
        ))}
        <p className="flex items-start gap-2 text-xs leading-4 text-muted">
          <ShieldCheck size={14} className="shrink-0" aria-hidden />
          {report.summaryBasis}
        </p>
      </div>
    </Card>
  );
}

const INSIGHT_ICON = {
  up: { icon: TrendingUp, tone: "bg-success-subtle text-icon-success" },
  alert: { icon: CircleAlert, tone: "bg-error-subtle text-icon-error" },
  warning: { icon: TriangleAlert, tone: "bg-warning-subtle text-icon-warning" },
  idea: { icon: Lightbulb, tone: "bg-ai-subtle text-icon-ai" },
};

function InsightCard({ insight, onLink, compact }: { insight: Insight; onLink: (href: string) => void; compact?: boolean }) {
  const { icon: Icon, tone } = INSIGHT_ICON[insight.icon];
  return (
    <article className={cn("flex flex-col rounded-lg border border-line bg-surface p-4", !compact && "shadow-xs md:p-5")}>
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", tone)}>
          <Icon size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] leading-[22px] font-semibold text-fg">{insight.title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-body md:text-sm">{insight.body}</p>
          <p className="mt-1 text-xs leading-4 text-muted">{insight.basis}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <AiPill>AI insight</AiPill>
        <button type="button" onClick={() => onLink(insight.link.href)} className="focus-ring cursor-pointer rounded-xs text-[13px] leading-5 font-medium text-brand hover:underline">
          {compact ? "View" : insight.link.label}
        </button>
      </div>
    </article>
  );
}

function SummaryTab({ report, onTab }: { report: Report; onTab: (href: string) => void }) {
  const cashKhrUsd = report.cash.khr / KHR_RATE;
  const trend = TREND.slice(0, TREND.findIndex((t) => t.id === report.id) + 1);
  const trendTitle = `${["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"][trend.length - 1]}-month trend`;
  const top = [report.insights.find((i) => i.group === "well"), report.insights.find((i) => i.group === "watch")].filter(Boolean) as Insight[];
  const columns: Column<Report["branches"][number]>[] = [
    { key: "branch", header: "Branch", width: "34%", cell: (b) => <TwoLine title={<span className="font-medium text-fg">{BRANCH_META[b.key].name}</span>} sub={BRANCH_META[b.key].manager} /> },
    { key: "revenue", header: "Revenue", align: "right", cell: (b) => <span className="tabular text-fg">{num(b.revenue)}</span> },
    { key: "expenses", header: "Expenses", align: "right", cell: (b) => <span className="tabular text-fg">{num(b.expenses)}</span> },
    { key: "profit", header: "Net profit", align: "right", cell: (b) => <span className="tabular text-success-fg">{num(b.revenue - b.expenses)}</span> },
    { key: "margin", header: "Margin", align: "right", width: "9%", cell: (b) => <span className="tabular text-fg">{(((b.revenue - b.expenses) / b.revenue) * 100).toFixed(1)}%</span> },
    { key: "records", header: "Records", width: "15%", cell: (b) => <RecordsPill {...b.records} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {report.status === "incomplete" ? (
        <Notice
          tone="warning"
          icon={<TriangleAlert size={18} aria-hidden />}
          title="This report is incomplete"
          action={
            <button type="button" onClick={() => onTab("?tab=completeness")} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-warning-fg hover:underline">
              Review completeness
            </button>
          }
        >
          {report.open.length} completeness check{report.open.length === 1 ? " is" : "s are"} still open.
          {report.draftsTotal ? " $3,535.00 of draft documents and 2 WeBill365 bills are not in the totals yet." : ""}
        </Notice>
      ) : (
        <Notice tone="success" icon={<CircleCheck size={18} aria-hidden />} title="All 12 completeness checks passed">
          Every reconciliation and till balance for {report.label.split(" ")[0]} is Signed Off. The figures only change if a signed-off period is reopened.
        </Notice>
      )}

      <KpiTiles kpis={report.kpis} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SummaryCard report={report} />
          <Card aria-labelledby="trend-title">
            <CardHeader title={trendTitle} titleId="trend-title" subtitle="Revenue, expenses and net profit · USD" />
            <div className="px-5 pt-4 pb-5">
              <TrendChart points={trend} height={300} label={trendTitle} />
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="health-title">
            <CardHeader title="Business health score" titleId="health-title" subtitle={`End of ${report.label.split(" ")[0]}`} actions={<CardLink href="/dashboard">See the six factors</CardLink>} />
            <div className="flex items-center gap-4 p-5">
              <ScoreRing score={report.health.score} />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <Badge tone="success" dot>
                  Good
                </Badge>
                <p className="text-[13px] leading-5 text-muted">{report.health.change}</p>
              </div>
            </div>
          </Card>
          <Card aria-labelledby="cash-title">
            <CardHeader title="Cash at month end" titleId="cash-title" subtitle={`8 accounts · ${report.id === "2026-10" ? "31 Oct 2026" : `end of ${report.label}`}`} />
            <div className="px-5 pt-3 pb-5">
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="tabular text-[26px] leading-9 font-semibold text-fg md:text-[28px]">{usd(report.cash.usd + cashKhrUsd)}</span>
                <span className="text-xs leading-4 font-medium text-muted">USD equivalent</span>
              </p>
              <dl className="mt-3 flex flex-col gap-2 text-[13px] leading-5">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Held in USD</dt>
                  <dd className="tabular text-fg">{usd(report.cash.usd)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Held in KHR</dt>
                  <dd className="tabular text-fg">៛{num(report.cash.khr, "KHR")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">KHR shown in USD</dt>
                  <dd className="tabular text-fg">≈ {usd(cashKhrUsd)}</dd>
                </div>
              </dl>
              <p className="mt-3 flex items-start gap-2 text-xs leading-4 text-muted">
                <Info size={13} className="mt-px shrink-0" aria-hidden />
                KHR balances are converted for display at 4,100 KHR per USD. Recorded balances are not changed.
              </p>
            </div>
          </Card>
          <Card aria-labelledby="top-title">
            <CardHeader
              title="Top insights"
              titleId="top-title"
              actions={
                <button type="button" onClick={() => onTab("?tab=insights")} className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                  All {report.insights.length}
                  <ArrowRight size={14} aria-hidden />
                </button>
              }
            />
            <div className="flex flex-col gap-3 p-5">
              {top.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onLink={onTab} compact />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card aria-labelledby="branches-title">
        <CardHeader title="Branch performance" titleId="branches-title" subtitle={`${report.label} · USD`} divided actions={<CardLink href="/branches">Open Branches</CardLink>} />
        <DataTable
          caption={`Branch performance, ${report.label}`}
          columns={columns}
          rows={report.branches}
          rowKey={(b) => b.key}
          minWidth={760}
          mobileRow={(b) => (
            <div className="flex items-start justify-between gap-3">
              <TwoLine title={<span className="font-medium text-fg">{BRANCH_META[b.key].name}</span>} sub={`Net profit $${num(b.revenue - b.expenses)}`} />
              <RecordsPill {...b.records} />
            </div>
          )}
        />
        <div className="flex border-t border-line bg-subtle px-4 py-3 text-[13px] leading-5 font-semibold text-fg">
          <span className="flex-1">All branches</span>
          <span className="tabular hidden w-[14%] text-right md:block">{num(report.revenue)}</span>
          <span className="tabular hidden w-[14%] text-right md:block">{num(report.expenses)}</span>
          <span className="tabular w-[14%] text-right text-success-fg">{num(report.profit)}</span>
          <span className="tabular hidden w-[9%] text-right md:block">{report.margin.toFixed(1)}%</span>
          <span className="hidden w-[15%] md:block" />
        </div>
      </Card>
    </div>
  );
}

const plChange = (now: number, before: number) => {
  const d = now - before;
  return { d, pct: before ? (d / before) * 100 : 0 };
};

/** Lower expenses and higher revenue are good news (green); the opposite is amber. */
function PlRow({ line, expense, strong, hasPrev }: { line: PlLine; expense?: boolean; strong?: boolean; hasPrev: boolean }) {
  const c = plChange(line.now, line.before);
  const tone = c.d === 0 ? "text-fg" : (expense ? c.d < 0 : c.d > 0) ? "text-success-fg" : "text-warning-fg";
  return (
    <tr className={cn("border-t border-line-subtle", strong && "bg-subtle font-semibold")}>
      <td className={cn("py-3 pr-4", strong ? "pl-4 text-fg" : "pl-8 text-body")}>{line.label}</td>
      <td className="tabular px-4 py-3 text-right text-fg">{num(line.now)}</td>
      <td className="tabular px-4 py-3 text-right text-fg">{hasPrev ? num(line.before) : "—"}</td>
      <td className={cn("tabular px-4 py-3 text-right", tone)}>{hasPrev ? `${c.d > 0 ? "+" : c.d < 0 ? "−" : ""}${num(c.d)}` : "—"}</td>
      <td className="tabular py-3 pr-4 pl-4 text-right text-fg">{hasPrev ? `${c.pct > 0 ? "+" : c.pct < 0 ? "−" : ""}${Math.abs(c.pct).toFixed(1)}%` : "—"}</td>
    </tr>
  );
}

function PlTab({ report }: { report: Report }) {
  const [view, setView] = useState<"category" | "branch">("category");
  const prev = report.prevLabel ?? "Previous month";
  const change = plChange;
  const sum = (lines: PlLine[], label: string): PlLine => ({ label, now: lines.reduce((s, l) => s + l.now, 0), before: lines.reduce((s, l) => s + l.before, 0) });
  const totalRev = sum(report.revenueLines, "Total revenue");
  const totalExp = sum(report.expenseLines, "Total expenses");
  const net = change(totalRev.now - totalExp.now, totalRev.before - totalExp.before);

  const exportCsv = () =>
    downloadCsv(`LuyFlow_PL_${report.id}.csv`, [
      ["Category", report.label, prev, "Change"],
      ...[...report.revenueLines, totalRev, ...report.expenseLines, totalExp].map((l) => [l.label, l.now.toFixed(2), l.before.toFixed(2), (l.now - l.before).toFixed(2)]),
      ["Net profit", (totalRev.now - totalExp.now).toFixed(2), (totalRev.before - totalExp.before).toFixed(2), net.d.toFixed(2)],
    ]);

  const accountColumns: Column<Report["accounts"][number]>[] = [
    {
      key: "account",
      header: "Account",
      width: "30%",
      cell: (a) => (
        <div className="flex items-center gap-3">
          <AccountAvatar provider={a.provider} size={32} />
          <TwoLine title={<Link href={`/banking/accounts/${a.id}`} className="focus-ring rounded-xs font-medium text-fg hover:underline">{a.name}</Link>} sub={a.kind} />
        </div>
      ),
    },
    { key: "branch", header: "Branch", width: "16%", cell: (a) => <span className="text-body">{a.branch}</span> },
    { key: "recorded", header: "Recorded balance", align: "right", width: "18%", cell: (a) => <TwoLine title={<span className="tabular text-fg">{a.recorded}</span>} sub={a.recordedSub} /> },
    { key: "usd", header: "USD equivalent", align: "right", width: "15%", cell: (a) => <span className="tabular text-fg">{usd(a.usd)}</span> },
    { key: "signoff", header: `${report.short} sign-off`, width: "21%", cell: (a) => <Badge tone={a.signoff.tone} dot size="sm">{a.signoff.label}</Badge> },
  ];
  const signed = report.accounts.filter((a) => a.signoff.tone === "success").length;

  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="pl-title">
        <CardHeader
          title="Profit & loss"
          titleId="pl-title"
          subtitle={`${report.label} compared with ${prev} · all branches · USD`}
          divided
          actions={
            <>
              <Segmented label="Group by" value={view} onChange={setView} options={[{ value: "category", label: "By category" }, { value: "branch", label: "By branch" }]} />
              <Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>
                Export
              </Button>
            </>
          }
        />
        <div className="overflow-x-auto">
          {view === "category" ? (
            <table className="w-full min-w-[640px] text-left text-[13px] leading-5">
              <thead className="bg-subtle text-xs leading-4 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{report.label}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{prev}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Change</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">% change</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line-subtle"><th scope="rowgroup" colSpan={5} className="px-4 py-3 font-medium text-fg">Revenue</th></tr>
                {report.revenueLines.map((l) => <PlRow key={l.label} line={l} hasPrev={Boolean(report.prevLabel)} />)}
                <PlRow line={totalRev} strong hasPrev={Boolean(report.prevLabel)} />
                <tr className="border-t border-line-subtle"><th scope="rowgroup" colSpan={5} className="px-4 py-3 font-medium text-fg">Expenses</th></tr>
                {report.expenseLines.map((l) => <PlRow key={l.label} line={l} expense hasPrev={Boolean(report.prevLabel)} />)}
                <PlRow line={totalExp} expense strong hasPrev={Boolean(report.prevLabel)} />
                <tr className="border-t border-success/30 bg-success-subtle font-semibold">
                  <td className="px-4 py-3.5 text-fg">Net profit</td>
                  <td className="tabular px-4 py-3.5 text-right text-success-fg">{num(totalRev.now - totalExp.now)}</td>
                  <td className="tabular px-4 py-3.5 text-right text-fg">{report.prevLabel ? num(totalRev.before - totalExp.before) : "—"}</td>
                  <td className="tabular px-4 py-3.5 text-right text-success-fg">{report.prevLabel ? `${net.d >= 0 ? "+" : "−"}${num(net.d)}` : "—"}</td>
                  <td className="tabular px-4 py-3.5 text-right text-success-fg">{report.prevLabel ? `${net.pct >= 0 ? "+" : "−"}${Math.abs(net.pct).toFixed(1)}%` : "—"}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[640px] text-left text-[13px] leading-5">
              <thead className="bg-subtle text-xs leading-4 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Expenses</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Net profit</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.branches.map((b) => (
                  <tr key={b.key} className="border-t border-line-subtle">
                    <td className="px-4 py-3 text-fg">{BRANCH_META[b.key].name}</td>
                    <td className="tabular px-4 py-3 text-right text-fg">{num(b.revenue)}</td>
                    <td className="tabular px-4 py-3 text-right text-fg">{num(b.expenses)}</td>
                    <td className="tabular px-4 py-3 text-right text-success-fg">{num(b.revenue - b.expenses)}</td>
                    <td className="tabular px-4 py-3 text-right text-fg">{(((b.revenue - b.expenses) / b.revenue) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="border-t border-success/30 bg-success-subtle font-semibold">
                  <td className="px-4 py-3.5 text-fg">All branches</td>
                  <td className="tabular px-4 py-3.5 text-right text-fg">{num(report.revenue)}</td>
                  <td className="tabular px-4 py-3.5 text-right text-fg">{num(report.expenses)}</td>
                  <td className="tabular px-4 py-3.5 text-right text-success-fg">{num(report.profit)}</td>
                  <td className="tabular px-4 py-3.5 text-right text-fg">{report.margin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {report.id === "2026-10" && (
        <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} action={<Link href="/banking/uncategorised" className="focus-ring rounded-xs text-sm font-medium text-warning-fg hover:underline">Categorise</Link>}>
          “Other” includes the money out of 9 transactions in ABA Operating KHR that have no category yet. Categorise them to move the amounts to the right lines.
        </Notice>
      )}

      <Card aria-labelledby="cash-accounts-title">
        <CardHeader title="Cash by account" titleId="cash-accounts-title" subtitle={`Closing balances at the end of ${report.label} · recorded currency with USD shown for comparison`} divided />
        <DataTable
          caption="Cash by account"
          columns={accountColumns}
          rows={report.accounts}
          rowKey={(a) => a.id}
          minWidth={860}
          mobileRow={(a) => (
            <div className="flex items-start justify-between gap-3">
              <TwoLine title={<span className="font-medium text-fg">{a.name}</span>} sub={`${a.recorded} · ≈ ${usd(a.usd)}`} />
              <Badge tone={a.signoff.tone} dot size="sm">{a.signoff.label}</Badge>
            </div>
          )}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line bg-subtle px-4 py-3 text-[13px] leading-5">
          <span className="flex-1 font-semibold text-fg">Total cash</span>
          <span className="tabular font-semibold text-fg">{usd(report.accounts.reduce((s, a) => s + a.usd, 0))}</span>
          <span className="text-muted">
            {signed} of {report.accounts.length} Signed Off for {report.label.split(" ")[0]}
          </span>
        </div>
      </Card>
    </div>
  );
}

function InsightsTab({ report, onLink }: { report: Report; onLink: (href: string) => void }) {
  const groups = [
    { id: "well", title: "What went well", sub: "Changes that helped profit this month" },
    { id: "watch", title: "Watch closely", sub: "Risks the records point to" },
    { id: "next", title: "Suggested next steps", sub: "Actions you may want to take. LuyFlow does not take them for you." },
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-4 md:flex-row md:items-center md:px-5">
        <Sparkles size={20} className="hidden shrink-0 text-icon-ai md:block" aria-hidden />
        <div className="min-w-0 flex-1 text-sm leading-[22px]">
          <p className="font-semibold text-fg">
            {report.insights.length} insights written by AI from {report.label.split(" ")[0]}’s records
          </p>
          <p className="text-body">
            Read them as suggestions to check, not as accounting advice.{report.status === "incomplete" ? " Because the report is incomplete, some may change after you regenerate." : ""}
          </p>
        </div>
        <ButtonLink href="/ai-advisor" variant="secondary" icon={MessageSquare}>
          Ask the AI Advisor about this report
        </ButtonLink>
      </div>
      {groups.map((group) => {
        const items = report.insights.filter((i) => i.group === group.id);
        if (!items.length) return null;
        return (
          <section key={group.id} aria-labelledby={`g-${group.id}`}>
            <h2 id={`g-${group.id}`} className="text-base leading-6 font-semibold text-fg">
              {group.title}
            </h2>
            <p className="text-[13px] leading-5 text-muted">{group.sub}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {items.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onLink={onLink} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CheckList({ title, items, tone }: { title: string; items: Check[]; tone: "open" | "passed" }) {
  return (
    <Card aria-label={title}>
      <div className="flex items-center gap-2 px-5 pt-5">
        <h2 className="text-base leading-6 font-semibold text-fg">{title}</h2>
        <Badge tone={tone === "open" ? "warning" : "success"} size="sm">
          {items.length}
        </Badge>
      </div>
      {tone === "open" && <p className="px-5 text-[13px] leading-5 text-muted">Each item opens the screen where it can be resolved.</p>}
      <ul className="divide-y divide-line-subtle px-5 pt-2 pb-3">
        {items.map((check) => (
          <li key={check.id} className="flex items-center gap-3 py-3">
            {tone === "open" ? (
              <TriangleAlert size={16} className="mt-0.5 shrink-0 self-start text-icon-warning" aria-hidden />
            ) : (
              <CircleCheck size={16} className="mt-0.5 shrink-0 self-start text-icon-success" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium text-fg">{check.title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">{check.detail}</p>
            </div>
            {check.action && (
              <ButtonLink href={check.action.href} variant="secondary" size="sm">
                {check.action.label}
              </ButtonLink>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CompletenessTab({ report, runs }: { report: Report; runs: { at: string; checks: number }[] }) {
  const incomplete = report.status === "incomplete";
  const cell = (value: "ok" | "open" | "na") =>
    value === "ok" ? <CircleCheck size={18} className="mx-auto text-icon-success" aria-label="Complete" /> : value === "open" ? <TriangleAlert size={18} className="mx-auto text-icon-warning" aria-label="Open item" /> : <Minus size={16} className="mx-auto text-icon-subtle" aria-label="Not applicable" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <section className={cn("rounded-lg border p-5 shadow-xs", incomplete ? "border-warning/50 bg-warning-subtle" : "border-success/30 bg-success-subtle")}>
          <h2 className="text-[13px] leading-5 text-body">Report status</h2>
          <p className="mt-2 text-[26px] leading-9 font-semibold text-fg">{incomplete ? "Incomplete" : "Complete"}</p>
          <p className="mt-1 text-xs leading-4 text-body">Generated {report.generatedAt}</p>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] leading-5 text-muted">Checks passed</h2>
          <p className="mt-2 text-[26px] leading-9 font-semibold text-fg">{report.checksPassed} of 12</p>
          <p className="mt-1 text-xs leading-4 text-muted">{incomplete ? `${report.open.length} open item${report.open.length === 1 ? "" : "s"}. Resolve them, then regenerate to mark the report Complete.` : "Nothing is left to resolve."}</p>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] leading-5 text-muted">Drafts not in the totals</h2>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[26px] leading-9 font-semibold text-fg">{usd(report.draftsTotal?.total ?? 0)}</span>
            <span className="text-xs font-medium text-muted">USD</span>
          </p>
          <p className="mt-1 text-xs leading-4 text-muted">{report.draftsTotal ? `If confirmed: revenue +${usd(report.draftsTotal.revenue)}, expenses +${usd(report.draftsTotal.expenses)}` : "No drafts were left for this month."}</p>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="flex min-w-0 flex-col gap-6">
          {report.open.length > 0 && <CheckList title="Open items" items={report.open} tone="open" />}
          <CheckList title="Passed" items={report.passed} tone="passed" />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="matrix-title">
            <CardHeader title="By branch" titleId="matrix-title" subtitle={report.label} divided />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[13px] leading-5">
                <thead className="bg-subtle text-xs leading-4 text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Branch</th>
                    {MATRIX_COLUMNS.map((c) => (
                      <th key={c} scope="col" className="px-2 py-3 text-center font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.matrix.map((row) => (
                    <tr key={row.branch} className="border-t border-line-subtle">
                      <th scope="row" className="px-4 py-3.5 text-left font-medium text-fg">{row.branch}</th>
                      {row.cells.map((c, i) => (
                        <td key={i} className="px-2 py-3.5 text-center">{cell(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-xs leading-4 text-muted">
              <span className="flex items-center gap-1"><CircleCheck size={13} className="text-icon-success" aria-hidden />Complete</span>
              <span className="flex items-center gap-1"><TriangleAlert size={13} className="text-icon-warning" aria-hidden />Open item</span>
              <span className="flex items-center gap-1"><Minus size={13} aria-hidden />Not applicable</span>
            </p>
          </Card>
          <Card aria-labelledby="history-title">
            <CardHeader title="Report history" titleId="history-title" />
            <ol className="flex flex-col gap-5 p-5">
              {runs.map((run, index) => (
                <li key={`${run.at}-${index}`} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ai-subtle text-icon-ai">
                    <Sparkles size={14} aria-hidden />
                  </span>
                  <div className="text-[13px] leading-5">
                    <p className="text-sm font-medium text-fg">
                      Report {index < runs.length - 1 ? "regenerated" : "generated"} · {run.checks === 12 ? "Complete" : "Incomplete"}
                    </p>
                    <p className="text-muted">Sokha Chan · {run.at}</p>
                    <p className="text-body">{run.checks} of 12 checks passed</p>
                  </div>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted-bg text-icon">
                  <FileText size={14} aria-hidden />
                </span>
                <div className="text-[13px] leading-5">
                  <p className="text-sm font-medium text-fg">Month closed for reporting</p>
                  <p className="text-muted">System · {report.id === "2026-10" ? "31 Oct 2026, 19:00" : `end of ${report.label}`}</p>
                  <p className="text-body">Includes everything recorded up to {report.id === "2026-10" ? "19:00" : "the last day of the month"}</p>
                </div>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- Branch Manager (12.13) ---------- */

function BranchReportView({ id, branch }: { id: MonthId; branch: string }) {
  const reports = useReports();
  const toast = useToast();
  const base = `/monthly-reports/${id}`;
  const { tab, exportOpen, set } = useExportParam(base);
  const gen = reports.view(id);
  const report = buildBranchReport(id, branch);
  const generatedAt = gen.state === "ready" ? gen.generatedAt : buildReport(id).generatedAt;
  const breadcrumbs = [{ label: "Monthly Reports", href: "/monthly-reports" }, { label: report.label }];
  const total = report.categories.reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...report.categories.map((c) => c.amount));

  if (gen.state !== "ready") {
    return (
      <Page>
        <PageHeader breadcrumbs={breadcrumbs} title={`${report.label} report`} subtitle={`${branch} Branch · ${report.period}`} />
        <section className="mt-6 flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-14 text-center shadow-xs">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted-bg text-icon">
            <Lock size={20} aria-hidden />
          </span>
          <h2 className="mt-4 text-base leading-6 font-semibold text-fg">The {report.label} report is not ready yet</h2>
          <p className="mt-1 max-w-md text-sm leading-[22px] text-muted">The Business Owner generates each month’s report. You will be notified when it is available.</p>
          <ButtonLink href="/monthly-reports" variant="secondary" className="mt-5">
            Back to Monthly Reports
          </ButtonLink>
        </section>
      </Page>
    );
  }

  const onExport = (sections: SectionId[], mode: AmountMode) => {
    const doc = branchPdf(report, branch, sections, mode);
    const blob = doc.toBlob((page, n) => `LuyFlow · ${branch} Branch · ${report.label} · page ${page} of ${n}`);
    const fileName = `LuyFlow_${branch.replace(/\s+/g, "")}_${id}.pdf`;
    downloadBlob(fileName, blob);
    set({ export: false });
    toast({ title: "PDF exported", body: `${fileName} was saved to your downloads (${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}, ${sizeLabel(blob.size)}).` });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={`${report.label} report`}
        badges={
          <>
            <ReportStatusBadge status={report.status} />
            <AiPill>AI summary</AiPill>
          </>
        }
        subtitle={`${branch} Branch · ${report.period} · generated ${generatedAt} by Sokha Chan · amounts in USD`}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => set({ export: true })}>
            Export branch PDF
          </Button>
        }
      />
      <Tabs
        className="mt-5"
        label="Report sections"
        value={tab === "completeness" ? "completeness" : "summary"}
        onChange={(t) => set({ tab: t as Tab })}
        items={[
          { id: "summary", label: "Summary" },
          { id: "completeness", label: "Completeness", count: report.open.length || undefined },
        ]}
      />
      <ScopeNotice branch={branch} className="mt-6" />

      <div className="mt-6 flex flex-col gap-6">
        {tab === "completeness" ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {report.open.length > 0 && <CheckList title="Open items" items={report.open} tone="open" />}
            <CheckList title="Passed" items={report.passed} tone="passed" />
          </div>
        ) : (
          <>
            <KpiTiles kpis={report.kpis} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="flex min-w-0 flex-col gap-6">
                <SummaryCard report={report} />
                <Card aria-labelledby="cat-title">
                  <CardHeader title="Expenses by category" titleId="cat-title" subtitle={`${branch} · ${report.label} · USD`} />
                  <ul className="flex flex-col gap-3 px-5 pt-4">
                    {report.categories.map((c) => (
                      <li key={c.label} className="grid grid-cols-[130px_1fr_90px] items-center gap-3 text-[13px] leading-5 md:grid-cols-[180px_1fr_100px]">
                        <span className="text-body">{c.label}</span>
                        <Bar value={(c.amount / max) * 100} color={c.color} />
                        <span className="tabular text-right text-fg">{usd(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mx-5 mt-4 mb-5 flex justify-between border-t border-line pt-3 text-sm leading-5 font-semibold text-fg">
                    <span>Total expenses</span>
                    <span className="tabular">{usd(total)}</span>
                  </p>
                </Card>
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <Card aria-labelledby="your-open-title">
                  <div className="flex items-center gap-2 px-5 pt-5">
                    <h2 id="your-open-title" className="text-base leading-6 font-semibold text-fg">
                      Your open items
                    </h2>
                    <Badge tone={report.open.length ? "warning" : "success"} size="sm">
                      {report.open.length}
                    </Badge>
                  </div>
                  <p className="px-5 text-[13px] leading-5 text-muted">
                    {report.open.length ? `These keep the ${report.label.split(" ")[0]} report Incomplete. Nothing more is needed from you.` : "Everything at your branch is Signed Off for this month."}
                  </p>
                  <ul className="divide-y divide-line-subtle px-5 pt-1 pb-3">
                    {report.open.map((check) => (
                      <li key={check.id} className="flex items-center gap-3 py-3">
                        <TriangleAlert size={16} className="mt-0.5 shrink-0 self-start text-icon-warning" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 font-medium text-fg">{check.title}</p>
                          <p className="mt-0.5 text-[13px] leading-5 text-muted">{check.detail}</p>
                        </div>
                        {check.action && (
                          <ButtonLink href={check.action.href} variant="secondary" size="sm">
                            {check.action.label}
                          </ButtonLink>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card aria-labelledby="hidden-title">
                  <CardHeader title="Not shown to Branch Managers" titleId="hidden-title" />
                  <ul className="flex flex-col gap-2.5 px-5 pt-3 text-[13px] leading-5 text-body">
                    {[
                      [Building2, "Other branches and business totals"],
                      [HeartPulse, "Business health score"],
                      [TrendingUp, "Forecasts and what-if scenarios"],
                    ].map(([Icon, label]) => {
                      const I = Icon as typeof Lock;
                      return (
                        <li key={label as string} className="flex items-center gap-2.5">
                          <Lock size={14} className="text-icon" aria-hidden />
                          <I size={14} className="text-icon" aria-hidden />
                          {label as string}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="px-5 pt-3 pb-5 text-xs leading-4 text-muted">Ask Sokha Chan (Business Owner) if you need these figures.</p>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      <ExportDialog
        key={`export-${exportOpen}`}
        open={exportOpen}
        onClose={() => set({ export: false })}
        title="Export branch report as PDF"
        subtitle={`${report.label} · ${branch} Branch`}
        sections={BRANCH_SECTIONS}
        defaults={["summary", "categories"]}
        incomplete={report.status === "incomplete"}
        fileName={`LuyFlow_${branch.replace(/\s+/g, "")}_${id}.pdf`}
        preview={{
          label: `Branch report · ${report.label}`,
          scope: `Mekong Mart Co., Ltd. · ${branch} · USD · ${generatedAt}`,
          kpis: [
            ["Revenue", usd(report.revenue)],
            ["Expenses", usd(report.expenses)],
            ["Net profit", usd(report.profit)],
          ],
        }}
        onExport={onExport}
      />
    </Page>
  );
}
