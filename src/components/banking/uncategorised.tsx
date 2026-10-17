"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Ellipsis, Sparkles } from "lucide-react";
import { AiCategoryChip, AmountCell, ConfidenceChip } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { DataTable, TwoLine } from "@/components/ui/data-table";
import { Pagination, paginate } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, ScopeNotice } from "@/components/ui/page";
import { accountName, useFinance } from "@/lib/finance-store";
import { cn, fmtDay } from "@/lib/format";
import { LINE_CATEGORIES } from "@/lib/mock/finance-data";
import type { ReviewLine } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { BankingHeader } from "./banking-shared";

/** Header checkbox that shows the indeterminate state. */
export function SelectAll({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} onChange={onChange} className="lf-check" />;
}

export const categoryOf = (line: ReviewLine) => line.chosen ?? line.suggestion;

/** Frame 06.6 "Uncategorised Transactions" (owner and Branch Manager). */
export function Uncategorised() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const lines = useMemo(() => state.uncategorised.filter((line) => !line.accepted), [state.uncategorised]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>(() =>
    state.uncategorised.filter((line) => !line.accepted && line.suggestion).slice(0, 4).map((line) => line.id),
  );
  const { current, slice } = paginate(lines, page, 8);
  const suggested = state.uncategorised.filter((line) => line.suggestion).length;
  const total = state.uncategorised.length;
  const selectedLines = lines.filter((line) => selected.includes(line.id));
  const acceptable = selectedLines.filter((line) => categoryOf(line));

  const accept = (ids: string[]) => {
    const accepted = lines.filter((line) => ids.includes(line.id) && categoryOf(line));
    if (!accepted.length) return;
    update((draft) => {
      for (const line of draft.uncategorised) if (accepted.some((a) => a.id === line.id)) line.accepted = true;
    });
    setSelected((list) => list.filter((id) => !accepted.some((a) => a.id === id)));
    toast({
      title: `${accepted.length} transaction${accepted.length === 1 ? "" : "s"} categorised`,
      body: accepted.length === 1 ? `${accepted[0].description} → ${categoryOf(accepted[0])}` : "They are posted with the categories you accepted.",
    });
  };
  const setCategory = (ids: string[], category: string) =>
    update((draft) => {
      for (const line of draft.uncategorised) if (ids.includes(line.id)) line.chosen = category;
    });

  const pageIds = slice.map((line) => line.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someOnPage = pageIds.some((id) => selected.includes(id));

  return (
    <Page>
      <BankingHeader />
      {isManager && <ScopeNotice branch={user?.branch} className="mt-6" />}
      <Notice tone="ai" className="mt-6" icon={<Sparkles size={18} aria-hidden />} title={`AI suggested a category for ${suggested} of ${total} transactions`}>
        These are the statement lines the AI was not sure about. Nothing is posted until you accept a suggestion or choose a category.
      </Notice>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Uncategorised transactions">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-subtle text-icon-success">
              <Check size={22} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-fg">Every transaction has a category</p>
            <p className="mt-1 text-[13px] text-muted">You can continue to reconciliation.</p>
          </div>
        ) : (
          <>
            <div className={cn("flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-5", selected.length ? "border-primary/20 bg-primary-subtle/60" : "border-line")}>
              {selected.length ? (
                <>
                  <p className="text-sm leading-5 font-medium text-brand">{selected.length} selected</p>
                  <p className="text-sm leading-5 text-body">Check each suggestion before you accept it.</p>
                  <div className="flex gap-2 md:ml-auto">
                    <Menu
                      align="end"
                      width={220}
                      triggerLabel="Change category of selected lines"
                      triggerClassName="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-subtle"
                      trigger="Change category"
                      items={LINE_CATEGORIES.map((category) => ({ id: category, label: category, onSelect: () => setCategory(selected, category) }))}
                    />
                    <Button size="md" icon={Check} className="h-9" disabled={!acceptable.length} onClick={() => accept(selected)}>
                      Accept suggestions
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm leading-5 text-muted">Select lines to accept their suggestions together, or accept them one by one.</p>
              )}
            </div>
            <DataTable
              caption="Uncategorised transactions"
              rows={slice}
              rowKey={(line) => line.id}
              rowClassName={(line) => (selected.includes(line.id) ? "bg-primary-subtle/40" : undefined)}
              minWidth={isManager ? 900 : 1060}
              columns={[
                {
                  key: "select",
                  header: (
                    <SelectAll
                      label="Select all on this page"
                      checked={allOnPage}
                      indeterminate={someOnPage && !allOnPage}
                      onChange={() => setSelected((list) => (allOnPage ? list.filter((id) => !pageIds.includes(id)) : [...new Set([...list, ...pageIds])]))}
                    />
                  ),
                  width: "48px",
                  cell: (line) => (
                    <input
                      type="checkbox"
                      className="lf-check"
                      aria-label={`Select ${line.description}`}
                      checked={selected.includes(line.id)}
                      onChange={() => setSelected((list) => (list.includes(line.id) ? list.filter((id) => id !== line.id) : [...list, line.id]))}
                    />
                  ),
                },
                { key: "date", header: "Date", width: "76px", cell: (line) => <span className="text-muted">{fmtDay(line.date)}</span> },
                { key: "desc", header: "Description", cell: (line) => <TwoLine title={line.description} sub={accountName(state, line.accountId)} /> },
                ...(isManager ? [] : [{ key: "branch", header: "Branch", width: "140px", cell: (line: ReviewLine) => <span className="text-fg">{line.branch}</span> }]),
                { key: "amount", header: "Amount", align: "right" as const, width: "140px", cell: (line: ReviewLine) => <AmountCell amount={line.amount} currency={line.currency} /> },
                {
                  key: "ai",
                  header: "AI suggestion",
                  width: "336px",
                  cell: (line: ReviewLine) => (
                    <div className="flex flex-wrap items-center gap-2">
                      <AiCategoryChip
                        label={`Category for ${line.description}`}
                        value={categoryOf(line)}
                        ai={!line.chosen && Boolean(line.suggestion)}
                        options={LINE_CATEGORIES}
                        onChange={(category) => setCategory([line.id], category)}
                      />
                      {!line.chosen && <ConfidenceChip confidence={line.confidence} />}
                    </div>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  srHeader: true,
                  width: "88px",
                  cell: (line: ReviewLine) => (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={!categoryOf(line)}
                        onClick={() => accept([line.id])}
                        aria-label={`Accept ${categoryOf(line) ?? "category"} for ${line.description}`}
                        title={categoryOf(line) ? "Accept" : "Choose a category first"}
                        className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent"
                      >
                        <Check size={16} aria-hidden />
                      </button>
                      <Menu
                        align="end"
                        width={220}
                        triggerLabel={`More actions for ${line.description}`}
                        triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                        trigger={<Ellipsis size={16} aria-hidden />}
                        items={[
                          { id: "clear", label: "Clear my choice", disabled: !line.chosen, onSelect: () => update((draft) => void (draft.uncategorised.find((l) => l.id === line.id)!.chosen = null)) },
                          { id: "reconcile", label: "Set while reconciling", onSelect: () => router.push("/financial-records/reconciliation") },
                        ]}
                      />
                    </div>
                  ),
                },
              ]}
              mobileRow={(line) => (
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    className="lf-check mt-0.5"
                    aria-label={`Select ${line.description}`}
                    checked={selected.includes(line.id)}
                    onChange={() => setSelected((list) => (list.includes(line.id) ? list.filter((id) => id !== line.id) : [...list, line.id]))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <TwoLine title={line.description} sub={`${fmtDay(line.date)} · ${line.branch}`} />
                      <AmountCell amount={line.amount} currency={line.currency} showApprox={false} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AiCategoryChip label={`Category for ${line.description}`} value={categoryOf(line)} ai={!line.chosen && Boolean(line.suggestion)} options={LINE_CATEGORIES} onChange={(category) => setCategory([line.id], category)} />
                      {!line.chosen && <ConfidenceChip confidence={line.confidence} />}
                      <Button variant="secondary" size="sm" icon={Check} disabled={!categoryOf(line)} onClick={() => accept([line.id])} className="ml-auto">
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            />
            <Pagination page={current} pageSize={8} total={lines.length} noun="uncategorised transactions" onPage={setPage} />
          </>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] leading-5 text-muted">A line you leave here stays uncategorised. You can also set its category while you reconcile.</p>
        <Button variant="secondary" iconRight={ArrowRight} onClick={() => router.push("/financial-records/reconciliation")}>
          Continue to reconciliation
        </Button>
      </div>
    </Page>
  );
}
