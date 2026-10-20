"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, Download, FileText, Info, LoaderCircle, MoreHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataTable, TwoLine, type Column, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { Page, ScopeNotice } from "@/components/ui/page";
import { cn, downloadCsv, num } from "@/lib/format";
import { buildBranchReport, buildReport, GENERATE_STEP_LABELS, OCTOBER, type MonthId } from "@/lib/mock/reports-data";
import { useSession } from "@/lib/session";
import { GenerateDialog } from "./generate-dialog";
import { GeneratingCard, ReportsHeader, ReportStatusBadge } from "./reports-shared";
import { useReports } from "./reports-store";

const iconButton = "focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg hover:text-icon-strong";

/** Owner report rows, shared by the overview's "Recent reports" and the full list. */
export function ReportsTable({ ids, sort, onSort, onRegenerate }: { ids: MonthId[]; sort?: SortState; onSort?: (s: SortState) => void; onRegenerate?: (id: MonthId) => void }) {
  const router = useRouter();
  const reports = useReports();
  const rows = ids.map((id) => ({ report: buildReport(id), gen: reports.view(id) }));
  type Row = (typeof rows)[number];
  const generating = (r: Row) => r.gen.state === "generating";

  const columns: Column<Row>[] = [
    { key: "period", header: "Period", width: "17%", cell: (r) => <TwoLine title={<span className="font-medium text-fg">{r.report.label}</span>} sub={r.report.sub ?? "All branches"} /> },
    { key: "status", header: "Status", width: "14%", cell: (r) => <ReportStatusBadge status={generating(r) ? "generating" : r.report.status} /> },
    { key: "revenue", header: "Revenue (USD)", align: "right", width: "12%", cell: (r) => <span className="tabular text-fg">{generating(r) ? "—" : num(r.report.revenue)}</span> },
    { key: "expenses", header: "Expenses (USD)", align: "right", width: "12%", cell: (r) => <span className="tabular text-fg">{generating(r) ? "—" : num(r.report.expenses)}</span> },
    { key: "profit", header: "Net profit (USD)", align: "right", width: "12%", cell: (r) => <span className={cn("tabular", generating(r) ? "text-fg" : "text-success-fg")}>{generating(r) ? "—" : num(r.report.profit)}</span> },
    { key: "checks", header: "Checks", width: "8%", cell: (r) => <span className="text-muted">{r.report.checksPassed} of 12</span> },
    {
      key: "generated",
      header: "Generated",
      width: "15%",
      cell: (r) =>
        r.gen.state === "generating" ? (
          <TwoLine title={<span className="text-fg">Started {r.gen.startedLabel}</span>} sub={`Step ${r.gen.step + 1} of 5 · ${GENERATE_STEP_LABELS[r.gen.step].toLowerCase()}`} />
        ) : (
          <TwoLine title={<span className="text-fg">{r.gen.state === "ready" ? r.gen.generatedAt : r.report.generatedAt}</span>} sub={r.report.generatedBy} />
        ),
    },
    {
      key: "actions",
      header: "Actions",
      srHeader: true,
      width: "10%",
      align: "right",
      cell: (r) =>
        generating(r) ? (
          <span className="inline-flex size-8 items-center justify-center text-icon-info">
            <LoaderCircle size={16} className="animate-spin" aria-label="Generating" />
          </span>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button type="button" className={iconButton} aria-label={`Export ${r.report.label} as PDF`} title="Export PDF" onClick={() => router.push(`/monthly-reports/${r.report.id}?export=1`)}>
              <Download size={16} aria-hidden />
            </button>
            <Menu
              align="end"
              width={220}
              triggerLabel={`More actions for ${r.report.label}`}
              triggerClassName={iconButton}
              trigger={<MoreHorizontal size={16} aria-hidden />}
              items={[
                { id: "open", label: "Open report", icon: <FileText size={16} className="text-icon" aria-hidden />, onSelect: () => router.push(`/monthly-reports/${r.report.id}`) },
                ...(onRegenerate && r.report.status === "incomplete"
                  ? [{ id: "regen", label: "Regenerate", icon: <RefreshCw size={16} className="text-icon" aria-hidden />, disabled: Boolean(reports.generating), onSelect: () => onRegenerate(r.report.id) }]
                  : []),
                { id: "ask", label: "Ask the AI Advisor", icon: <Sparkles size={16} className="text-icon" aria-hidden />, onSelect: () => router.push("/ai-advisor") },
              ]}
            />
          </div>
        ),
    },
  ];

  return (
    <DataTable
      caption="Monthly reports"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.report.id}
      sort={sort}
      sortable={onSort ? ["period"] : []}
      onSort={onSort}
      onRowClick={(r) => !generating(r) && router.push(`/monthly-reports/${r.report.id}`)}
      rowClassName={(r) => (generating(r) ? "bg-info-subtle/40" : undefined)}
      minWidth={980}
      empty="No reports match these filters."
      mobileRow={(r) => (
        <div className="flex items-start justify-between gap-3">
          <TwoLine title={<span className="font-medium text-fg">{r.report.label}</span>} sub={generating(r) ? `Generating · step ${r.gen.state === "generating" ? r.gen.step + 1 : 1} of 5` : `Net profit $${num(r.report.profit)} · ${r.report.checksPassed} of 12 checks`} />
          <ReportStatusBadge status={generating(r) ? "generating" : r.report.status} />
        </div>
      )}
    />
  );
}

/** Frames 12.2, 12.4 (owner) and 12.12 (Branch Manager). */
export function ReportsList() {
  const { user } = useSession();
  const reports = useReports();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string | null>("2026");
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "period", dir: "desc" });
  const [regenMonth, setRegenMonth] = useState<MonthId | null>(null);
  const generateOpen = params.get("generate") === "1" || regenMonth !== null;

  if (!user || !reports.ready) return null;
  const isManager = user.role === "manager";
  const branch = user.branch ?? "Toul Kork";

  const filterIds = (ids: MonthId[]) => {
    const q = search.trim().toLowerCase();
    const list = ids.filter((id) => {
      const r = buildReport(id);
      const gen = reports.view(id);
      const s = gen.state === "generating" ? "generating" : r.status;
      return (!q || r.label.toLowerCase().includes(q)) && (!year || id.startsWith(year)) && (!status || s === status);
    });
    return sort.dir === "desc" ? list : [...list].reverse();
  };
  const ids = filterIds(reports.available);

  const closeGenerate = () => {
    setRegenMonth(null);
    if (params.get("generate")) router.replace("/monthly-reports/all", { scroll: false });
  };

  const exportList = () =>
    downloadCsv("LuyFlow_monthly_reports_2026.csv", [
      isManager ? ["Period", "Status", "Branch revenue (USD)", "Branch expenses (USD)", "Branch net profit (USD)"] : ["Period", "Status", "Revenue (USD)", "Expenses (USD)", "Net profit (USD)", "Checks passed", "Generated", "Generated by"],
      ...ids.map((id) => {
        if (isManager) {
          const r = buildBranchReport(id, branch);
          return [r.label, r.status, r.revenue.toFixed(2), r.expenses.toFixed(2), r.profit.toFixed(2)];
        }
        const r = buildReport(id);
        const gen = reports.view(id);
        return [r.label, r.status, r.revenue.toFixed(2), r.expenses.toFixed(2), r.profit.toFixed(2), `${r.checksPassed} of 12`, gen.state === "ready" ? gen.generatedAt : "", r.generatedBy];
      }),
    ]);

  const oct = reports.view(OCTOBER);

  return (
    <Page>
      <ReportsHeader isManager={isManager} branch={branch} generating={Boolean(reports.generating)} onGenerate={() => router.replace("/monthly-reports/all?generate=1", { scroll: false })} />
      {isManager && <ScopeNotice branch={branch} className="mt-6" />}

      {!isManager && oct.state === "generating" && (
        <div className="mt-6">
          <GeneratingCard id={OCTOBER} step={oct.step} startedAt={oct.startedAt} onCancel={() => reports.cancel(OCTOBER)} />
        </div>
      )}

      <Card className="mt-6">
        <FilterBar onExport={exportList} className="border-b border-line">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by month" />
          <FilterMenu label="Year" icon="calendar" value={year} onChange={setYear} options={[{ value: "2026", label: "2026" }]} />
          <FilterMenu
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "complete", label: "Complete" },
              { value: "incomplete", label: "Incomplete" },
              ...(isManager ? [] : [{ value: "generating", label: "Generating" }]),
            ]}
          />
          {!isManager && (
            <Menu
              width={220}
              triggerLabel="Branch: All branches"
              triggerClassName="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm leading-5 font-medium whitespace-nowrap text-fg hover:bg-subtle"
              trigger={
                <>
                  <Building2 size={16} className="text-icon-strong" aria-hidden />
                  Branch: All branches
                  <ChevronDown size={16} className="text-icon-strong" aria-hidden />
                </>
              }
              items={[
                { id: "all", label: "All branches", selected: true },
                { id: "one", label: "One branch", description: "Branch reports are part of each monthly report", disabled: true },
              ]}
            />
          )}
        </FilterBar>
        {isManager ? <BranchTable ids={ids} branch={branch} /> : <ReportsTable ids={ids} sort={sort} onSort={setSort} onRegenerate={setRegenMonth} />}
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
          <p className="text-[13px] leading-5 text-muted">
            Showing {ids.length ? `1–${ids.length}` : "0"} of {ids.length} reports
          </p>
        </div>
      </Card>

      <p className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-muted">
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
        Complete = every completeness check passed when the report was generated. Incomplete reports list what was missing and can be regenerated at any time.
      </p>

      {!isManager && (
        <GenerateDialog
          key={`${generateOpen}-${regenMonth}`}
          open={generateOpen}
          onClose={closeGenerate}
          initialMonth={regenMonth ?? OCTOBER}
          onGenerate={(id) => reports.start(id)}
          existing={(id) => reports.view(id).state === "ready"}
        />
      )}
    </Page>
  );
}

function BranchTable({ ids, branch }: { ids: MonthId[]; branch: string }) {
  const router = useRouter();
  const rows = ids.map((id) => buildBranchReport(id, branch));
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "period", header: "Period", width: "26%", cell: (r) => <TwoLine title={<span className="font-medium text-fg">{r.label}</span>} sub={r.sub} /> },
    { key: "status", header: "Status", width: "14%", cell: (r) => <ReportStatusBadge status={r.status} /> },
    { key: "revenue", header: "Branch revenue (USD)", align: "right", width: "17%", cell: (r) => <span className="tabular text-fg">{num(r.revenue)}</span> },
    { key: "expenses", header: "Branch expenses (USD)", align: "right", width: "17%", cell: (r) => <span className="tabular text-fg">{num(r.expenses)}</span> },
    { key: "profit", header: "Branch net profit (USD)", align: "right", width: "18%", cell: (r) => <span className="tabular text-success-fg">{num(r.profit)}</span> },
    {
      key: "download",
      header: "Export",
      srHeader: true,
      width: "8%",
      align: "right",
      cell: (r) => (
        <button type="button" className={iconButton} aria-label={`Export ${r.label} branch PDF`} title="Export branch PDF" onClick={() => router.push(`/monthly-reports/${r.id}?export=1`)}>
          <Download size={16} aria-hidden />
        </button>
      ),
    },
  ];
  return (
    <DataTable
      caption={`${branch} monthly reports`}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/monthly-reports/${r.id}`)}
      minWidth={820}
      empty="No reports match these filters."
      mobileRow={(r) => (
        <div className="flex items-start justify-between gap-3">
          <TwoLine title={<span className="font-medium text-fg">{r.label}</span>} sub={`Net profit $${num(r.profit)}`} />
          <ReportStatusBadge status={r.status} />
        </div>
      )}
    />
  );
}
