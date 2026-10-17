"use client";

import { useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Check, CircleCheck, CloudUpload, Download, Ellipsis, Eye, FileSpreadsheet, Info, Link2, Pencil, Plus, Scale, Search, Send, Sparkles, Tag, TriangleAlert, Undo2, Unlink, X } from "lucide-react";
import { AccountAvatar, MoneyInput, parseAmount, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Bar } from "@/components/ui/charts";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Stepper, Timeline } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { StatStrip } from "@/components/ui/stat";
import { accountName, reconFigures, REVIEW_STATUS, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, fmtDate, fmtDay, money, signed } from "@/lib/format";
import { CATEGORIES } from "@/lib/mock/finance-data";
import type { Recon, ReconLine } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { toTimeline } from "./bill-detail";
import { IMPORT_STEPS } from "@/components/banking/import-statement";
import { RecordsHeader } from "./records-shared";
import { ReturnDialog, SignOffDialog } from "./signoff";

const diffText = (value: number, currency: "USD" | "KHR") => (value === 0 ? (currency === "KHR" ? "៛0" : "$0.00") : money(value, currency));

/** Frame 10.11 "Bank Reconciliation" list. */
export function ReconList() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>("3");
  const [branch, setBranch] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const counts = { draft: 0, submitted: 0, returned: 0, signed: 0 };
  state.recons.forEach((r) => counts[r.status]++);
  const cutoff = period === "3" ? "2026-08" : period === "6" ? "2026-05" : "0000";
  const rows = state.recons
    .filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (!query || accountName(state, r.accountId).toLowerCase().includes(query.toLowerCase())) &&
        (!account || r.accountId === account) &&
        r.period >= cutoff &&
        (!branch || r.usedBy === branch),
    )
    .sort((a, b) => b.period.localeCompare(a.period) || order(a) - order(b));
  const { current, slice } = paginate(rows, page, 7);
  const firstDraft = state.recons.find((r) => r.status === "draft" || (isManager && r.status === "returned"));

  return (
    <Page>
      <RecordsHeader
        actions={
          <>
            <Button variant="secondary" icon={CloudUpload} onClick={() => router.push("/banking/import")}>
              Import statement
            </Button>
            <Button icon={Scale} onClick={() => router.push(firstDraft ? `/financial-records/reconciliation/${firstDraft.id}` : "/banking/import")}>
              {firstDraft ? "Continue reconciliation" : "Start reconciliation"}
            </Button>
          </>
        }
      />
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="How sign-off works">
        Whoever prepares a reconciliation submits it. The Business Owner signs it off or returns it. A signed-off period is locked and cannot be changed by imports.
      </Notice>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Reconciliations">
        <Tabs
          label="Reconciliation status"
          className="px-5 pt-1"
          value={tab}
          onChange={(id) => {
            setTab(id);
            setPage(1);
          }}
          items={[
            { id: "all", label: "All", count: state.recons.length },
            { id: "draft", label: "Draft", count: counts.draft },
            { id: "submitted", label: "Submitted", count: counts.submitted },
            { id: "returned", label: "Returned", count: counts.returned },
            { id: "signed", label: "Signed Off", count: counts.signed },
          ]}
        />
        <FilterBar className="border-b border-line">
          <SearchInput value={query} onChange={setQuery} placeholder="Search account" />
          <FilterMenu label="Account" value={account} onChange={setAccount} options={[...new Set(state.recons.map((r) => r.accountId))].map((id) => ({ value: id, label: accountName(state, id) }))} />
          <FilterMenu
            label="Period"
            icon="calendar"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "3", label: "Last 3 months" },
              { value: "6", label: "Last 6 months" },
            ]}
          />
          {!isManager && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={["Business-wide", "Toul Kork"].map((b) => ({ value: b, label: b }))} />}
        </FilterBar>
        <DataTable
          caption="Reconciliations"
          rows={slice}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/financial-records/reconciliation/${r.id}`)}
          minWidth={980}
          empty="No reconciliations match these filters."
          columns={[
            {
              key: "account",
              header: "Account",
              cell: (r) => {
                const a = state.accounts.find((x) => x.id === r.accountId);
                return (
                  <div className="flex items-center gap-2.5">
                    {a && <AccountAvatar provider={a.provider} size={32} />}
                    <span className="truncate font-medium text-fg">{accountName(state, r.accountId)}</span>
                  </div>
                );
              },
            },
            { key: "period", header: "Period", width: "150px", cell: (r) => <span className="text-fg">{r.periodLabel}</span> },
            { key: "used", header: "Used by", width: "130px", cell: (r) => <span className="text-muted">{r.usedBy}</span> },
            { key: "by", header: "Prepared by", width: "130px", cell: (r) => <span className="text-muted">{r.preparedBy}</span> },
            { key: "lines", header: "Lines matched", align: "right", width: "120px", cell: (r) => <span className="tabular text-fg">{`${reconFigures(r).matched} of ${r.totalLines}`}</span> },
            {
              key: "diff",
              header: "Difference",
              align: "right",
              width: "120px",
              cell: (r) => {
                const d = r.status === "returned" ? r.lines.filter((l) => l.state === "todo").reduce((s, l) => s + l.amount, 0) : reconFigures(r).difference;
                return <span className={cn("tabular", d !== 0 ? "text-warning-fg" : "text-fg")}>{diffText(Math.abs(d), r.currency)}</span>;
              },
            },
            { key: "status", header: "Status", width: "130px", cell: (r) => <StatusPill tone={REVIEW_STATUS[r.status].tone}>{REVIEW_STATUS[r.status].label}</StatusPill> },
            {
              key: "action",
              header: "Action",
              srHeader: true,
              width: "110px",
              cell: (r) => {
                const preparer = r.preparedBy === user?.name;
                if (r.status === "submitted" && !isManager)
                  return (
                    <Button variant="secondary" size="sm" onClick={() => router.push(`/financial-records/reconciliation/${r.id}`)}>
                      Review
                    </Button>
                  );
                if ((r.status === "draft" || r.status === "returned") && preparer)
                  return (
                    <button type="button" onClick={() => router.push(`/financial-records/reconciliation/${r.id}`)} className="focus-ring ml-auto block cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                      {r.status === "returned" ? "Fix" : "Continue"}
                    </button>
                  );
                return (
                  <button type="button" onClick={() => router.push(`/financial-records/reconciliation/${r.id}`)} aria-label={`View ${accountName(state, r.accountId)} ${r.periodLabel}`} className="focus-ring ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg">
                    <Eye size={16} aria-hidden />
                  </button>
                );
              },
            },
          ]}
          mobileRow={(r) => <MobileRow title={accountName(state, r.accountId)} sub={`${r.periodLabel} · ${r.preparedBy}`} value={<StatusPill tone={REVIEW_STATUS[r.status].tone}>{REVIEW_STATUS[r.status].label}</StatusPill>} valueSub={`${reconFigures(r).matched} of ${r.totalLines}`} />}
        />
        <Pagination page={current} pageSize={7} total={rows.length} noun="reconciliations" onPage={setPage} />
      </section>
    </Page>
  );
}

const order = (r: Recon) => ({ submitted: 0, draft: 1, returned: 2, signed: 3 })[r.status] + (r.accountId.startsWith("wing") ? 0 : r.accountId === "aba-operating-khr" ? 0.1 : 0.2);

/** Routes a reconciliation to the right screen for its status and the viewer's role. */
export function ReconDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useFinance();
  const { user } = useSession();
  const recon = state.recons.find((r) => r.id === id);
  if (!recon) notFound();
  const preparer = recon.preparedBy === user?.name;
  if (recon.status === "draft" && preparer) return <ReconPrepare recon={recon} />;
  return <ReconReview recon={recon} />;
}

/** Frame 10.11 "Match statement lines" (draft) with the submit dialog. */
function ReconPrepare({ recon }: { recon: Recon }) {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState("todo");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [creating, setCreating] = useState<ReconLine | null>(null);
  const fig = reconFigures(recon);
  const cur = recon.currency;
  const account = state.accounts.find((a) => a.id === recon.accountId);
  const todo = recon.lines.filter((l) => l.state === "todo");
  const lists: Record<string, ReconLine[]> = {
    todo,
    suggested: todo.filter((l) => l.kind === "suggested"),
    unmatched: todo.filter((l) => l.kind !== "suggested"),
    matched: recon.lines.filter((l) => l.state === "matched"),
    excluded: recon.lines.filter((l) => l.state === "excluded"),
  };
  const missing = todo.find((l) => l.kind === "missing");
  const uncategorised = todo.find((l) => l.kind === "uncategorised");

  const resolve = (lineId: string, patch: Partial<ReconLine>, extra?: (draft: Parameters<Parameters<typeof update>[0]>[0]) => void) =>
    update((draft) => {
      const target = draft.recons.find((r) => r.id === recon.id)!;
      Object.assign(target.lines.find((l) => l.id === lineId)!, patch);
      extra?.(draft);
    });

  const confirm = (line: ReconLine) => {
    resolve(line.id, { state: "matched", resolution: "Matched", sub: `AI match confirmed${line.recordSub ? ` · ${line.recordSub.split(" · ")[0]}` : ""}` });
    toast({ title: "Match confirmed", body: `${line.description} ↔ ${line.record}` });
  };
  const notMatch = (line: ReconLine) => resolve(line.id, { kind: "missing", record: undefined, recordSub: undefined, confidence: undefined });
  const categorise = (line: ReconLine, category: string) => {
    resolve(line.id, { state: "matched", resolution: `Matched · ${category}`, sub: `${line.record} · category set` }, (draft) => {
      const txn = draft.transactions.find((t) => t.id === line.record);
      if (txn) {
        txn.category = category;
        txn.status = "posted";
        txn.recon = "matched";
      }
      const pending = draft.uncategorised.find((u) => line.description.toUpperCase().includes(u.description.replace("WING TRANSFER ", "")) || u.description.toUpperCase() === line.description.toUpperCase());
      if (pending) pending.accepted = true;
    });
    toast({ title: "Categorised and matched", body: `${line.description} → ${category}` });
  };
  const exclude = (line: ReconLine) => resolve(line.id, { state: "excluded", resolution: "Excluded · duplicate", sub: "Excluded by you" });
  const include = (line: ReconLine) => resolve(line.id, { state: "todo", resolution: undefined });

  const steps = IMPORT_STEPS.map((label, i) => ({ label, state: i < 3 ? ("done" as const) : ("active" as const) }));
  const progress = (fig.matched / recon.totalLines) * 100;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Reconciliation", href: "/financial-records/reconciliation" },
          { label: `${accountName(state, recon.accountId)} · ${recon.periodLabel}` },
        ]}
        title={`Reconcile ${accountName(state, recon.accountId)}`}
        badges={<StatusPill tone="neutral">Draft</StatusPill>}
        subtitle={`Statement ${recon.statementFile} · 1–${recon.period.endsWith("09") ? 30 : 31} ${recon.periodLabel.slice(0, 3)} 2026 · ${recon.totalLines} lines`}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Draft saved", body: "Your matches are kept. Continue any time." })}>
              Save draft
            </Button>
            <Button icon={Send} onClick={() => setSubmitOpen(true)}>
              Submit for sign-off
            </Button>
          </>
        }
      />
      <Stepper className="mt-6" steps={steps} />

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Statement lines">
        <StatStrip
          className="border-b"
          items={[
            { label: "Statement balance", value: money(recon.statementBalance, cur), sub: cur === "KHR" ? `≈ ${money(recon.statementBalance / 4100, "USD")}` : undefined },
            { label: "LuyFlow balance", value: money(fig.luyflowBalance, cur), sub: cur === "KHR" ? `≈ ${money(fig.luyflowBalance / 4100, "USD")}` : undefined },
            {
              label: "Difference",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <span className={fig.difference ? "text-warning-fg" : "text-fg"}>{diffText(Math.abs(fig.difference), cur)}</span>
                  <StatusPill tone={fig.difference ? "warning" : "success"}>{fig.difference ? "To explain" : "Balanced"}</StatusPill>
                </span>
              ),
            },
            {
              label: "Lines matched",
              value: `${fig.matched} of ${recon.totalLines}`,
              sub: <Bar className="mt-2" value={progress} color="var(--lf-primary-default)" />,
            },
          ]}
        />
        <Tabs
          label="Lines"
          className="px-5"
          value={tab}
          onChange={setTab}
          items={[
            { id: "todo", label: "To do", count: lists.todo.length },
            { id: "suggested", label: "Suggested matches", count: lists.suggested.length },
            { id: "unmatched", label: "Unmatched", count: lists.unmatched.length },
            { id: "matched", label: "Matched", count: fig.matched },
            { id: "excluded", label: "Excluded", count: lists.excluded.length },
          ]}
        />
        <DataTable
          caption="Statement lines"
          rows={lists[tab]}
          rowKey={(l) => l.id}
          minWidth={1000}
          rowClassName={(l) => (l.state === "todo" && l.kind !== "suggested" ? "bg-warning-subtle/70" : undefined)}
          empty={
            tab === "todo" ? (
              <span className="flex flex-col items-center gap-2">
                <CircleCheck size={22} className="text-icon-success" aria-hidden />
                All statement lines are matched or excluded. You can submit the reconciliation for sign-off.
              </span>
            ) : tab === "matched" ? (
              `${recon.autoMatched} lines were matched automatically.`
            ) : (
              "Nothing here."
            )
          }
          columns={[
            { key: "line", header: "Statement line", cell: (l) => <TwoLine title={l.description} titleClassName="font-medium" sub={l.state === "todo" ? fmtDate(l.date) : l.sub} /> },
            { key: "amount", header: `Amount (${cur})`, align: "right", width: "140px", cell: (l) => <span className={cn("tabular", l.amount > 0 ? "text-success-fg" : "text-fg")}>{signed(l.amount, cur)}</span> },
            {
              key: "link",
              header: "Link",
              srHeader: true,
              width: "56px",
              cell: (l) => (l.record && l.kind !== "missing" ? <Link2 size={18} className={cn("mx-auto", l.kind === "uncategorised" ? "text-icon-warning" : "text-icon-ai")} aria-hidden /> : l.state === "todo" ? <Unlink size={18} className="mx-auto text-icon-warning" aria-hidden /> : <Link2 size={18} className="mx-auto text-icon-success" aria-hidden />),
            },
            {
              key: "record",
              header: "LuyFlow record",
              cell: (l) =>
                l.record && l.kind !== "missing" ? <TwoLine title={l.record} titleClassName="font-normal" sub={l.recordSub} /> : l.state === "todo" ? <TwoLine title="—" sub="No LuyFlow record found" /> : <TwoLine title={l.resolution ?? "Matched"} titleClassName="font-normal" />,
            },
            {
              key: "match",
              header: "Match",
              width: "170px",
              cell: (l) =>
                l.state === "excluded" ? (
                  <StatusPill tone="neutral">Excluded</StatusPill>
                ) : l.state === "matched" ? (
                  <StatusPill tone="success">Matched</StatusPill>
                ) : l.kind === "suggested" ? (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs font-medium whitespace-nowrap text-ai-fg">
                    <Sparkles size={12} aria-hidden /> Suggested · {l.confidence}%
                  </span>
                ) : (
                  <StatusPill tone="warning">Unmatched</StatusPill>
                ),
            },
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "280px",
              cell: (l) => (
                <div className="flex items-center justify-end gap-2">
                  <LineActions line={l} currency={cur} onConfirm={confirm} onNotMatch={notMatch} onCategorise={categorise} onCreate={setCreating} onExclude={exclude} onInclude={include} />
                </div>
              ),
            },
          ]}
          mobileRow={(l) => (
            <div>
              <MobileRow title={l.description} sub={l.record && l.kind !== "missing" ? `↔ ${l.record}` : "No LuyFlow record"} value={<span className={cn("tabular", l.amount > 0 && "text-success-fg")}>{signed(l.amount, cur)}</span>} />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <LineActions line={l} currency={cur} onConfirm={confirm} onNotMatch={notMatch} onCategorise={categorise} onCreate={setCreating} onExclude={exclude} onInclude={include} />
              </div>
            </div>
          )}
        />
        {lists[tab].length > 0 && <Pagination page={1} pageSize={10} total={lists[tab].length} noun={tab === "todo" ? "lines to do" : "lines"} onPage={() => {}} />}
      </section>

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-2">
        {fig.difference || uncategorised ? (
          <Notice
            tone="ai"
            icon={<Sparkles size={18} aria-hidden />}
            title="Why is there a difference?"
            action={
              missing && (
                <button type="button" onClick={() => setCreating(missing)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-ai-fg hover:underline">
                  Create transaction
                </button>
              )
            }
          >
            {missing
              ? `The ${money(Math.abs(missing.amount), cur)} ${missing.description} of ${fmtDay(missing.date)} is on the statement but not in LuyFlow. Create it as “${/fee/i.test(missing.description) ? "Bank fees" : "a new transaction"}” to bring the difference to ${cur === "KHR" ? "៛0" : "$0.00"}.`
              : ""}
            {uncategorised ? ` ${uncategorised.description} is already in LuyFlow (${uncategorised.record}), so it is not part of the difference. It only needs a category and a match.` : ""}
          </Notice>
        ) : (
          <Notice tone="success" icon={<CircleCheck size={18} aria-hidden />} title="The balances agree">
            {fig.todo ? `${fig.todo} line${fig.todo === 1 ? "" : "s"} still need a decision before you submit.` : "Every line is matched or excluded. Submit the reconciliation for sign-off."}
          </Notice>
        )}
        <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title={recon.preparedBy === "Sokha Chan" ? "You prepare and you sign off" : "You prepare, the owner signs off"}>
          When the difference is {cur === "KHR" ? "៛0" : "$0.00"} or explained, submit it. {recon.preparedBy === "Sokha Chan" ? "As the Business Owner you then sign it off." : "Sokha Chan signs it off or returns it with a comment."}
        </Notice>
      </div>

      <SubmitDialog
        open={submitOpen}
        recon={recon}
        onClose={() => setSubmitOpen(false)}
        onSubmit={(note) => {
          update((draft) => {
            const target = draft.recons.find((r) => r.id === recon.id)!;
            target.status = "submitted";
            target.note = note;
            target.submittedAt = "31 Oct 2026, 18:10";
            target.returnReason = undefined;
            target.history.unshift({ kind: "submit", title: "Submitted for sign-off", meta: `${user?.name} · 31 Oct 2026, 18:10` });
            const acct = draft.accounts.find((a) => a.id === recon.accountId);
            if (acct) acct.recon = { label: "Submitted · awaiting sign-off", tone: "sky" };
          });
          toast({ title: "Submitted for sign-off", body: recon.preparedBy === "Sokha Chan" ? "Review and sign it off when you are ready." : "Sokha Chan has been notified." });
        }}
      />
      <CreateLineTransaction line={creating} recon={recon} accountLabel={account?.name ?? ""} onClose={() => setCreating(null)} />
    </Page>
  );
}

function LineActions({
  line,
  currency,
  onConfirm,
  onNotMatch,
  onCategorise,
  onCreate,
  onExclude,
  onInclude,
}: {
  line: ReconLine;
  currency: "USD" | "KHR";
  onConfirm: (l: ReconLine) => void;
  onNotMatch: (l: ReconLine) => void;
  onCategorise: (l: ReconLine, category: string) => void;
  onCreate: (l: ReconLine) => void;
  onExclude: (l: ReconLine) => void;
  onInclude: (l: ReconLine) => void;
}) {
  const more = (
    <Menu
      align="end"
      width={200}
      triggerLabel={`More actions for ${line.description}`}
      triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
      trigger={<Ellipsis size={16} aria-hidden />}
      items={line.state === "todo" ? [{ id: "exclude", label: "Exclude as duplicate", onSelect: () => onExclude(line) }] : [{ id: "undo", label: line.state === "excluded" ? "Include again" : "Undo match", onSelect: () => onInclude(line) }]}
    />
  );
  if (line.state !== "todo") return more;
  if (line.kind === "suggested")
    return (
      <>
        <button type="button" onClick={() => onNotMatch(line)} className="focus-ring cursor-pointer rounded-xs px-2 text-sm font-medium whitespace-nowrap text-brand hover:underline">
          Not a match
        </button>
        <Button variant="secondary" size="sm" icon={Check} onClick={() => onConfirm(line)}>
          Confirm
        </Button>
        {more}
      </>
    );
  if (line.kind === "uncategorised")
    return (
      <>
        <Menu
          align="end"
          width={220}
          triggerLabel={`Categorise and match ${line.description}`}
          triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium whitespace-nowrap text-fg hover:bg-subtle"
          trigger={
            <>
              <Tag size={14} aria-hidden /> Categorise and match
            </>
          }
          items={CATEGORIES.filter((c) => c.active && c.kind === (line.amount > 0 ? "income" : "expense")).map((c) => ({ id: c.id, label: c.name, onSelect: () => onCategorise(line, c.name) }))}
        />
        {more}
      </>
    );
  return (
    <>
      <Menu
        align="end"
        width={260}
        triggerLabel={`Find a LuyFlow record for ${line.description}`}
        triggerClassName="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium whitespace-nowrap text-brand hover:underline"
        trigger={
          <>
            <Search size={14} className="mr-1" aria-hidden /> Find
          </>
        }
        items={[
          { id: "none", label: `No unmatched record of ${money(Math.abs(line.amount), currency)}`, description: `Searched ${fmtDay(line.date)} ± 7 days`, disabled: true },
          { id: "create", label: "Create a new transaction instead", onSelect: () => onCreate(line) },
        ]}
      />
      <Button variant="secondary" size="sm" icon={Plus} onClick={() => onCreate(line)}>
        Create new
      </Button>
      {more}
    </>
  );
}

function CreateLineTransaction({ line, recon, accountLabel, onClose }: { line: ReconLine | null; recon: Recon; accountLabel: string; onClose: () => void }) {
  return (
    <Dialog open={line !== null} onClose={onClose} labelledBy="create-line-title" width={560}>
      {line && <CreateLineForm key={line.id} line={line} recon={recon} accountLabel={accountLabel} onClose={onClose} />}
    </Dialog>
  );
}

function CreateLineForm({ line, recon, accountLabel, onClose }: { line: ReconLine; recon: Recon; accountLabel: string; onClose: () => void }) {
  const { update, state } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const income = line.amount > 0;
  const options = CATEGORIES.filter((c) => c.active && c.kind === (income ? "income" : "expense")).map((c) => c.name);
  const [category, setCategory] = useState(/fee/i.test(line.description) ? "Bank fees" : /cash-in|cash dep/i.test(line.description) ? "Sales" : options[0]);
  const [description, setDescription] = useState(line.description);
  const [amount, setAmount] = useState(String(Math.abs(line.amount)));
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const id = `TXN-2026-10-${String(state.nextIds.txn).padStart(4, "0")}`;
        update((draft) => {
          draft.nextIds.txn++;
          draft.transactions.unshift({
            id,
            date: line.date,
            description,
            type: income ? "income" : "expense",
            accountId: recon.accountId,
            branch: recon.usedBy === "Business-wide" ? "Central Market" : recon.usedBy,
            category,
            amount: (income ? 1 : -1) * parseAmount(amount),
            currency: recon.currency,
            status: "posted",
            ref: "",
            method: "Statement line",
            recon: "matched",
            history: [{ kind: "match", title: "Created from statement line while reconciling", meta: `${user?.name} · 31 Oct 2026, 18:02` }],
          });
          const target = draft.recons.find((r) => r.id === recon.id)!;
          Object.assign(target.lines.find((l) => l.id === line.id)!, { state: "matched", resolution: `Created · ${category}`, sub: "New transaction recorded", record: id });
        });
        toast({ title: "Transaction created and matched", body: `${id} · ${category}` });
        onClose();
      }}
    >
      <ModalHeader id="create-line-title" title="Create transaction" description={`From the statement line of ${fmtDate(line.date)} · ${accountLabel}`} icon={<Plus size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <TextField size="md" className="sm:col-span-2" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <MoneyInput id="line-amount" label={income ? "Money in" : "Money out"} currency={recon.currency} value={amount} onChange={setAmount} />
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={options.map((o) => ({ value: o, label: o }))} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Check}>
          Create and match
        </Button>
      </ModalFooter>
    </form>
  );
}

function SubmitDialog({ open, recon, onClose, onSubmit }: { open: boolean; recon: Recon; onClose: () => void; onSubmit: (note: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="submit-recon-title" width={540}>
      {open && <SubmitForm recon={recon} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}

function SubmitForm({ recon, onClose, onSubmit }: { recon: Recon; onClose: () => void; onSubmit: (note: string) => void }) {
  const { state } = useFinance();
  const [note, setNote] = useState(recon.note);
  const fig = reconFigures(recon);
  const checks = [
    { ok: fig.todo === 0, text: `${fig.matched} of ${recon.totalLines} lines matched`, fail: `${fig.todo} line${fig.todo === 1 ? "" : "s"} still to do` },
    { ok: true, text: `${fig.excluded} duplicate line${fig.excluded === 1 ? "" : "s"} excluded`, fail: "" },
    { ok: fig.difference === 0, text: `Difference ${recon.currency === "KHR" ? "៛0" : "$0.00"}${recon.lines.some((l) => l.resolution?.startsWith("Created")) ? " after recording the missing lines" : ""}`, fail: `Difference ${money(Math.abs(fig.difference), recon.currency)} is not explained` },
    { ok: !recon.lines.some((l) => l.state === "todo" && l.kind === "uncategorised"), text: "All transactions have a category", fail: "A matched transaction has no category" },
  ];
  const ready = checks.every((c) => c.ok);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        onSubmit(note.trim());
        onClose();
      }}
    >
      <ModalHeader id="submit-recon-title" title="Submit for sign-off" description={`${accountName(state, recon.accountId)} · ${recon.periodLabel} · sent to Sokha Chan`} icon={<Send size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2.5 rounded-lg bg-subtle p-4 text-sm">
          {checks.map((c) => (
            <li key={c.text} className="flex items-center gap-2.5">
              {c.ok ? <CircleCheck size={18} className="shrink-0 text-icon-success" aria-label="Done" /> : <X size={18} className="shrink-0 text-icon-error" aria-label="Not done" />}
              <span className={c.ok ? "text-body" : "text-error-fg"}>{c.ok ? c.text : c.fail}</span>
            </li>
          ))}
        </ul>
        <TextAreaField label="Note for the Business Owner" labelHint="Optional" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain anything you matched or created by hand." />
        <p className="flex items-center gap-2.5 rounded-md border border-icon-info/25 bg-info-subtle px-3 py-2.5 text-[13px] text-body">
          <Info size={16} className="shrink-0 text-icon-info" aria-hidden />
          {ready ? "You cannot edit this reconciliation while it is waiting for sign-off." : "Finish the lines above before you submit."}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Keep working
        </Button>
        <Button type="submit" icon={Send} disabled={!ready}>
          Submit
        </Button>
      </ModalFooter>
    </form>
  );
}

/** Frames 10.11 Submitted, 10.12 Reconciliation Details (review and returned) and 10.13 Approval. */
function ReconReview({ recon }: { recon: Recon }) {
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"sign" | "return" | null>(null);
  const isOwner = user?.role === "owner";
  const preparer = recon.preparedBy === user?.name;
  const fig = reconFigures(recon);
  const cur = recon.currency;
  const returned = recon.status === "returned";
  const unexplained = returned ? recon.lines.filter((l) => l.state === "todo").reduce((s, l) => s + l.amount, 0) : fig.difference;
  const luyflow = recon.statementBalance - unexplained;
  const openSeptember = state.recons.find((r) => r.accountId === recon.accountId && r.period < recon.period && r.status === "returned");
  const items = returned ? recon.lines.filter((l) => l.state === "todo") : fig.resolved;
  const signedMeta = recon.history.find((h) => h.kind === "signed" || h.kind === "returned")?.meta;

  const sign = () => {
    update((draft) => {
      const target = draft.recons.find((r) => r.id === recon.id)!;
      target.status = "signed";
      target.history.unshift({ kind: "signed", title: "Signed off by Business Owner", meta: "Sokha Chan · 31 Oct 2026, 19:18" });
      const acct = draft.accounts.find((a) => a.id === recon.accountId);
      if (acct) acct.recon = { label: `Reconciled to ${recon.period.endsWith("10") ? "31 Oct" : "30 Sep"}`, tone: "success" };
    });
    toast({ title: `${recon.periodLabel} signed off`, body: `${recon.preparedBy === "Sokha Chan" ? "The period" : `${recon.preparedBy} has been notified. The period`} is locked.` });
  };
  const ret = (reason: string) => {
    update((draft) => {
      const target = draft.recons.find((r) => r.id === recon.id)!;
      target.status = "returned";
      target.returnReason = reason;
      target.history.unshift({ kind: "returned", title: "Returned to Branch Manager", meta: "Sokha Chan · 31 Oct 2026, 19:20", detail: reason });
      const acct = draft.accounts.find((a) => a.id === recon.accountId);
      if (acct) acct.recon = { label: "Returned for changes", tone: "warning" };
    });
    toast({ title: `Returned to ${recon.preparedBy}`, body: "They can correct and resubmit the reconciliation." });
  };
  const fix = () => {
    update((draft) => {
      const target = draft.recons.find((r) => r.id === recon.id)!;
      target.status = "draft";
      target.lines.forEach((l) => {
        if (l.state === "todo") l.sub = fmtDate(l.date);
      });
    });
  };

  const actions =
    recon.status === "submitted" && isOwner ? (
      <>
        {!preparer && (
          <Button variant="secondary" icon={Undo2} onClick={() => setDialog("return")}>
            Return for changes
          </Button>
        )}
        <Button icon={CircleCheck} onClick={() => setDialog("sign")}>
          Sign off
        </Button>
      </>
    ) : returned && preparer ? (
      <Button icon={Pencil} onClick={fix}>
        Fix and resubmit
      </Button>
    ) : recon.status === "submitted" ? (
      <Button variant="secondary" onClick={() => router.push("/dashboard")}>
        Back to dashboard
      </Button>
    ) : (
      <>
        <Button
          variant="secondary"
          icon={Download}
          onClick={() =>
            downloadCsv(`reconciliation-${recon.accountId}-${recon.period}.csv`, [
              ["Account", accountName(state, recon.accountId)],
              ["Period", recon.periodLabel],
              ["Prepared by", recon.preparedBy],
              ["Statement balance", recon.statementBalance],
              ["Status", REVIEW_STATUS[recon.status].label],
              [],
              ["Date", "Statement line", `Amount (${cur})`, "Resolution"],
              ...items.map((l) => [l.date, l.description, l.amount, l.resolution ?? "Unmatched"]),
            ])
          }
        >
          Export
        </Button>
        <Button variant="secondary" onClick={() => router.push("/financial-records/reconciliation")}>
          Back to reconciliation
        </Button>
      </>
    );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Reconciliation", href: "/financial-records/reconciliation" },
          { label: `${accountName(state, recon.accountId)} · ${recon.periodLabel}` },
        ]}
        title={`${accountName(state, recon.accountId)} · ${recon.periodLabel}`}
        badges={<StatusPill tone={REVIEW_STATUS[recon.status].tone}>{REVIEW_STATUS[recon.status].label}</StatusPill>}
        subtitle={`Prepared by ${recon.preparedBy}${recon.submittedAt ? ` · submitted ${recon.submittedAt}` : ""} · ${recon.usedBy}`}
        actions={actions}
      />
      <Stepper
        className="mt-6"
        doneTone="success"
        steps={[
          { label: "Prepared", sub: recon.preparedBy, state: "done" },
          { label: "Submitted", sub: recon.submittedAt?.replace(" 2026", "") ?? "", state: recon.status === "draft" ? "todo" : "done" },
          {
            label: returned ? "Returned" : "Owner sign-off",
            sub: recon.status === "submitted" ? (isOwner ? "Waiting for you" : "Waiting for Sokha Chan") : signedMeta?.replace(" 2026", "").replace("·", "·") ?? "",
            state: recon.status === "signed" ? "done" : "active",
          },
        ]}
      />

      {recon.status === "submitted" && !isOwner && (
        <Notice tone="success" className="mt-6" icon={<CircleCheck size={18} aria-hidden />} title="Submitted for sign-off">
          Sokha Chan has been notified. You will hear back in the app and on Telegram.
        </Notice>
      )}
      {recon.status === "submitted" && isOwner && openSeptember && (
        <Notice tone="warning" className="mt-6" icon={<TriangleAlert size={18} aria-hidden />} title={`${openSeptember.periodLabel} is still open for this account`}>
          It was returned to {openSeptember.preparedBy} on 29 Oct with {money(openSeptember.lines.filter((l) => l.state === "todo").reduce((s, l) => s + l.amount, 0), cur)} unexplained. Signing off {recon.periodLabel.split(" ")[0]} does not close {openSeptember.periodLabel.split(" ")[0]}.
        </Notice>
      )}
      {recon.status === "signed" && (
        <Notice tone="success" className="mt-6" icon={<CircleCheck size={18} aria-hidden />} title={`${recon.periodLabel} is signed off and locked`}>
          New imports for this account cannot change {recon.periodLabel.split(" ")[0]}.{recon.preparedBy !== "Sokha Chan" ? ` ${recon.preparedBy} has been notified.` : ""}
        </Notice>
      )}
      {returned && (
        <Notice
          tone="warning"
          className="mt-6"
          icon={<TriangleAlert size={18} aria-hidden />}
          title={preparer ? `Returned by Sokha Chan on ${signedMeta?.split(" · ")[1]?.split(",")[0] ?? "29 Oct 2026"}` : `Returned to ${recon.preparedBy}`}
          action={
            preparer && (
              <button type="button" onClick={fix} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-warning-fg hover:underline">
                Open unmatched lines
              </button>
            )
          }
        >
          “{recon.returnReason}”
        </Notice>
      )}

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Summary">
            <StatStrip
              className="border-b"
              items={[
                { label: "Statement balance", value: money(recon.statementBalance, cur), sub: cur === "KHR" ? `≈ ${money(recon.statementBalance / 4100, "USD")}` : undefined },
                { label: "LuyFlow balance", value: money(luyflow, cur), sub: cur === "KHR" ? `≈ ${money(luyflow / 4100, "USD")}` : undefined },
                {
                  label: "Difference",
                  value: (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={unexplained ? "text-warning-fg" : "text-fg"}>{diffText(Math.abs(unexplained), cur)}</span>
                      <StatusPill tone={unexplained ? "warning" : "success"}>{unexplained ? "Unexplained" : "Balanced"}</StatusPill>
                    </span>
                  ),
                },
                {
                  label: "Lines",
                  value: `${returned ? recon.totalLines - items.length : fig.matched} of ${recon.totalLines} matched`,
                  sub: returned ? `${items.length} unmatched` : fig.excluded ? `${fig.excluded} duplicate excluded` : "All matched",
                },
              ]}
            />
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-fg">Note from {recon.preparedBy}</p>
              <p className="mt-1.5 text-[15px] leading-[22px] text-body">{recon.note || "No note."}</p>
            </div>
          </section>
          <Card className="overflow-hidden" aria-labelledby="items-title">
            <CardHeader
              title={returned ? "Unmatched lines" : "Items to look at"}
              titleId="items-title"
              subtitle={returned ? "Fix these before resubmitting" : items.length ? `The ${items.length === 5 ? "four" : items.length} lines resolved by hand${fig.excluded ? " and the excluded line" : ""}` : `All ${recon.totalLines} lines were matched automatically`}
              divided
            />
            <DataTable
              caption="Resolved statement lines"
              rows={items}
              rowKey={(l) => l.id}
              minWidth={640}
              empty="Nothing needed a manual decision."
              columns={[
                { key: "date", header: "Date", width: "84px", cell: (l) => <span className="text-muted">{fmtDay(l.date)}</span> },
                { key: "line", header: "Statement line", cell: (l) => <TwoLine title={l.description} titleClassName="font-normal" sub={l.sub} /> },
                { key: "amount", header: `Amount (${cur})`, align: "right", width: "140px", cell: (l) => <span className={cn("tabular", l.amount > 0 ? "text-success-fg" : "text-fg")}>{signed(l.amount, cur)}</span> },
                {
                  key: "res",
                  header: "Resolution",
                  width: "230px",
                  cell: (l) => <StatusPill tone={l.state === "excluded" ? "neutral" : l.state === "todo" ? "warning" : "success"}>{l.resolution ?? "Unmatched"}</StatusPill>,
                },
              ]}
              mobileRow={(l) => <MobileRow title={l.description} sub={l.resolution ?? "Unmatched"} value={<span className="tabular">{signed(l.amount, cur)}</span>} valueSub={fmtDay(l.date)} />}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="attach-title">
            <CardHeader title="Attachments" titleId="attach-title" />
            <div className="flex items-center gap-3 p-5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-success-subtle text-icon-success">
                <FileSpreadsheet size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{recon.statementFile}</p>
                <p className="text-xs text-muted">
                  {recon.totalLines} lines · imported {recon.period.endsWith("10") ? "31 Oct" : "2 Oct"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Download ${recon.statementFile} summary`}
                title="Download line summary"
                onClick={() => downloadCsv(recon.statementFile.replace(/\.\w+$/, "") + "-summary.csv", [["Date", "Statement line", "Amount", "Resolution"], ...recon.lines.map((l) => [l.date, l.description, l.amount, l.resolution ?? "Unmatched"])])}
                className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg"
              >
                <Download size={16} aria-hidden />
              </button>
            </div>
          </Card>
          <Card aria-labelledby="recon-history-title" className="flex-1">
            <CardHeader title="History" titleId="recon-history-title" />
            <div className="p-5">
              <Timeline items={toTimeline(recon.history)} />
            </div>
          </Card>
        </div>
      </div>
      <SignOffDialog open={dialog === "sign"} onClose={() => setDialog(null)} onConfirm={sign} title="Sign off this reconciliation?">
        {accountName(state, recon.accountId)} for {recon.periodLabel} will be locked. New imports cannot change this period.
      </SignOffDialog>
      <ReturnDialog open={dialog === "return"} onClose={() => setDialog(null)} onConfirm={ret} person={recon.preparedBy} what="reconciliation" />
    </Page>
  );
}
