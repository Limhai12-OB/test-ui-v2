"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCheck, Ellipsis } from "lucide-react";
import { AiBadge, AiCategoryChip, ConfidenceChip, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { DataTable, MobileRow } from "@/components/ui/data-table";
import { Pagination, paginate } from "@/components/ui/filters";
import { Stepper } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Page, PageHeader, ScopeNotice, Tabs } from "@/components/ui/page";
import { StatStrip } from "@/components/ui/stat";
import { accountName, useFinance } from "@/lib/finance-store";
import { cn, fmtDay, signed } from "@/lib/format";
import { LINE_CATEGORIES } from "@/lib/mock/finance-data";
import { useSession } from "@/lib/session";
import { IMPORT_STEPS } from "./import-statement";
import { categoryOf, SelectAll } from "./uncategorised";

type Row = { id: string; date: string; description: string; amount: number; category: string | null; ai: boolean; confidence: number | null; review: boolean; match: string; accepted?: boolean };

/** Frame 06.8 "AI Categorisation Review" (owner and Branch Manager). */
export function AiReview() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  const review = state.review;
  const [tab, setTab] = useState("review");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const pending = state.uncategorised.filter((line) => !line.accepted);
  const ledger = state.ledgers[review.accountId] ?? [];

  const reviewRows: Row[] = pending.map((line) => ({
    id: line.id,
    date: line.date,
    description: line.description,
    amount: line.amount,
    category: categoryOf(line),
    ai: !line.chosen && Boolean(line.suggestion),
    confidence: line.chosen ? null : line.confidence,
    review: true,
    match: "New transaction",
  }));
  const highRows: Row[] = ledger.slice(0, review.highConfidence).map((row, i) => ({
    id: row.id,
    date: row.date,
    description: row.description.toUpperCase(),
    amount: row.credit || -row.debit,
    category: row.category,
    ai: true,
    confidence: 90 + ((i * 7) % 10),
    review: false,
    match: "Matched",
    accepted: review.acceptedHigh,
  }));
  const dupRows: Row[] = ledger.slice(-review.duplicates).map((row) => ({
    id: `dup-${row.id}`,
    date: row.date,
    description: row.description.toUpperCase(),
    amount: row.credit || -row.debit,
    category: row.category,
    ai: false,
    confidence: null,
    review: false,
    match: "Already imported 2 Oct",
  }));
  const rows = tab === "review" ? reviewRows : tab === "all" ? [...reviewRows, ...highRows] : dupRows;
  const { current, slice } = paginate(rows, page, tab === "review" ? 9 : 10);

  const accept = (ids: string[]) => {
    const ok = pending.filter((line) => ids.includes(line.id) && categoryOf(line));
    if (!ok.length) return;
    update((draft) => {
      for (const line of draft.uncategorised) if (ok.some((o) => o.id === line.id)) line.accepted = true;
      if (draft.uncategorised.every((l) => l.accepted) && draft.review.acceptedHigh) {
        const record = draft.imports.find((r) => r.status === "review");
        if (record) record.status = "completed";
      }
    });
    setSelected((list) => list.filter((id) => !ok.some((o) => o.id === id)));
    toast({ title: `${ok.length} line${ok.length === 1 ? "" : "s"} accepted`, body: "Accepted lines are posted. You can still change a category later." });
  };
  const setCategory = (id: string, category: string) => update((draft) => void (draft.uncategorised.find((l) => l.id === id)!.chosen = category));

  const pageIds = slice.filter((r) => r.review).map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Import statement", href: "/banking/import" },
          { label: "AI categorisation" },
        ]}
        title="Review AI categorisation"
        badges={<AiBadge />}
        subtitle={`${review.file} · ${accountName(state, review.accountId)} · ${review.period}`}
      />
      {user?.role === "manager" && <ScopeNotice branch={user.branch} className="mt-6" />}
      <Stepper className="mt-6" steps={IMPORT_STEPS.map((label, i) => ({ label, state: i === 0 ? "done" : i === 1 ? "active" : "todo" }))} />

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Statement lines">
        <StatStrip
          className="border-b"
          items={[
            { label: "Lines read", value: review.read, valueClassName: "text-xl" },
            { label: "Categorised with high confidence", value: review.highConfidence, valueClassName: "text-xl text-success-fg" },
            {
              label: "Need your review",
              value: (
                <span className="flex items-center gap-2">
                  <span className={pending.length ? "text-warning-fg" : "text-success-fg"}>{pending.length}</span>
                  {pending.length > 0 && <StatusPill tone="warning">Review</StatusPill>}
                </span>
              ),
              valueClassName: "text-xl",
            },
            { label: "Duplicates excluded", value: review.duplicates, valueClassName: "text-xl" },
          ]}
        />
        <Tabs
          label="Lines"
          value={tab}
          onChange={(id) => {
            setTab(id);
            setPage(1);
          }}
          className="px-5"
          items={[
            { id: "review", label: "Needs Review", count: reviewRows.length },
            { id: "all", label: "All lines", count: review.read },
            { id: "dup", label: "Duplicates", count: review.duplicates },
          ]}
        />
        <DataTable
          caption="Statement lines to review"
          rows={slice}
          rowKey={(row) => row.id}
          minWidth={980}
          empty={tab === "review" ? "Every line has a category. Nothing left to review." : "No lines."}
          columns={[
            {
              key: "select",
              header: <SelectAll label="Select all lines on this page" checked={allOnPage} indeterminate={!allOnPage && pageIds.some((id) => selected.includes(id))} onChange={() => setSelected(allOnPage ? [] : pageIds)} />,
              width: "48px",
              cell: (row) =>
                row.review && (
                  <input
                    type="checkbox"
                    className="lf-check"
                    aria-label={`Select ${row.description}`}
                    checked={selected.includes(row.id)}
                    onChange={() => setSelected((list) => (list.includes(row.id) ? list.filter((id) => id !== row.id) : [...list, row.id]))}
                  />
                ),
            },
            { key: "date", header: "Date", width: "80px", cell: (row) => <span className="text-muted">{fmtDay(row.date)}</span> },
            { key: "desc", header: "Statement description", cell: (row) => <span className="font-medium text-fg">{row.description}</span> },
            { key: "amount", header: "Amount (KHR)", align: "right", width: "140px", cell: (row) => <span className={cn("tabular", row.amount > 0 ? "text-success-fg" : "text-fg")}>{signed(row.amount, "KHR")}</span> },
            {
              key: "category",
              header: "AI category",
              width: "320px",
              cell: (row) =>
                row.review ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <AiCategoryChip label={`Category for ${row.description}`} value={row.category} ai={row.ai} options={LINE_CATEGORIES} onChange={(c) => setCategory(row.id, c)} />
                    {row.ai && <ConfidenceChip confidence={row.confidence} />}
                    {!row.category && <ConfidenceChip confidence={null} />}
                  </div>
                ) : (
                  <span className="text-body">
                    {row.category}
                    {row.confidence && <span className="ml-2 text-xs text-muted">{row.confidence}%</span>}
                  </span>
                ),
            },
            { key: "match", header: "Match", width: "170px", cell: (row) => <StatusPill tone={row.review ? "sky" : row.match === "Matched" ? "success" : "neutral"}>{row.accepted ? "Posted" : row.match}</StatusPill> },
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "88px",
              cell: (row) =>
                row.review && (
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      disabled={!row.category}
                      onClick={() => accept([row.id])}
                      aria-label={`Accept ${row.category ?? "category"} for ${row.description}`}
                      className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg disabled:cursor-not-allowed disabled:text-line-strong"
                    >
                      <Check size={16} aria-hidden />
                    </button>
                    <Menu
                      align="end"
                      triggerLabel={`More actions for ${row.description}`}
                      triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                      trigger={<Ellipsis size={16} aria-hidden />}
                      items={[{ id: "later", label: "Review later in Uncategorised", onSelect: () => router.push("/banking/uncategorised") }]}
                    />
                  </div>
                ),
            },
          ]}
          mobileRow={(row) => (
            <div>
              <MobileRow title={row.description} sub={fmtDay(row.date)} value={<span className={cn("tabular", row.amount > 0 && "text-success-fg")}>{signed(row.amount, "KHR")}</span>} />
              {row.review && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AiCategoryChip label={`Category for ${row.description}`} value={row.category} ai={row.ai} options={LINE_CATEGORIES} onChange={(c) => setCategory(row.id, c)} />
                  <ConfidenceChip confidence={row.category ? row.confidence : null} />
                  <Button variant="secondary" size="sm" icon={Check} disabled={!row.category} onClick={() => accept([row.id])} className="ml-auto">
                    Accept
                  </Button>
                </div>
              )}
            </div>
          )}
        />
        {rows.length > 0 && <Pagination page={current} pageSize={tab === "review" ? 9 : 10} total={rows.length} noun={tab === "review" ? "lines that need review" : "lines"} onPage={setPage} />}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/banking/import")}>
          Back
        </Button>
        <p className="text-[13px] leading-5 text-muted">Accepted lines are posted. You can still change a category later.</p>
        <div className="flex flex-wrap gap-3 xl:ml-auto">
          {selected.length > 0 && (
            <Button variant="secondary" icon={Check} onClick={() => accept(selected)}>
              Accept {selected.length} selected
            </Button>
          )}
          <Button
            variant="secondary"
            icon={CheckCheck}
            disabled={review.acceptedHigh}
            onClick={() => {
              update((draft) => {
                draft.review.acceptedHigh = true;
                if (draft.uncategorised.every((l) => l.accepted)) {
                  const record = draft.imports.find((r) => r.status === "review");
                  if (record) record.status = "completed";
                }
              });
              toast({ title: `${review.highConfidence} lines posted`, body: "High-confidence lines were accepted with their AI categories." });
            }}
          >
            {review.acceptedHigh ? `${review.highConfidence} high-confidence accepted` : `Accept ${review.highConfidence} high-confidence`}
          </Button>
          <Button iconRight={ArrowRight} onClick={() => router.push(pending.length ? "/banking/uncategorised" : "/financial-records/reconciliation")}>
            {pending.length ? `Review ${pending.length} uncategorised lines` : "Continue to reconciliation"}
          </Button>
        </div>
      </div>
    </Page>
  );
}
