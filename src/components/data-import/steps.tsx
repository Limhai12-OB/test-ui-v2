"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CircleX,
  CloudUpload,
  Coins,
  Copy,
  Download,
  FileImage,
  FileWarning,
  FileX,
  Hash,
  Info,
  LoaderCircle,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Table,
  TrendingUp,
  TriangleAlert,
  Truck,
  Undo2,
  FilePlus,
} from "lucide-react";
import { HoldToConfirm } from "@/components/hairline/hold-to-confirm";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/fields";
import { FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader } from "@/components/ui/overlay";
import { Breadcrumbs, Tabs, PAGE_CLASS } from "@/components/ui/page";
import { useToast } from "@/components/ui/overlay";
import { cn, downloadCsv } from "@/lib/format";
import { ACTIVE_BRANCHES, amountLabel, CLEANUPS, fmtShort, SAMPLE_FILE, type HistoryRow } from "@/lib/mock/import-data";
import { defaultDup, fmtIso, STEP_LABELS, type Computed, type FinalRow } from "./compute";
import type { Draft, DupChoice } from "./import-store";
import { Panel, StepFooter, Tiles } from "./wizard";

type StepProps = { draft: Draft; set: (p: Partial<Draft>) => void; c: Computed; onBack: () => void; onNext: () => void };

const CLEANUP_ICON = { calendar: Calendar, hash: Hash, truck: Truck, building: Building2, tag: Tag };

/* ---------- Step 6 ---------- */

export function CleanupStep({ draft, set, c, onBack, onNext }: StepProps) {
  const [open, setOpen] = useState<"currency" | "date" | null>(null);
  const decisions = [
    { id: "currency" as const, title: "Rows with no currency", body: "AI will not guess a currency. It suggests one from the amount and the account used, and you confirm each row.", icon: Coins },
    { id: "date" as const, title: "Dates that can be read two ways", body: "For example 03/02/2026 could be 3 Feb or 2 Mar. Day-first is suggested because the rest of the file uses it.", icon: Calendar },
  ];
  return (
    <>
      <Tiles
        items={[
          { label: "Suggestions", value: 7 },
          { label: "Applied", value: c.applied.length, tone: "success" },
          { label: "Need your decision", value: 2, tone: "warning" },
          { label: "Cells changed", value: c.cellsChanged },
        ]}
      />
      {CLEANUPS.map((cl) => {
        const Icon = CLEANUP_ICON[cl.icon];
        const on = draft.cleanups[cl.id];
        return (
          <section key={cl.id} className="rounded-lg border border-line bg-surface p-5 shadow-xs">
            <div className="flex flex-wrap items-start gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-ai-subtle text-icon-ai">
                <Icon size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px] font-semibold text-fg">
                  {cl.title}
                  <Badge size="sm">{cl.rows} rows</Badge>
                </h2>
                <p className="mt-0.5 text-[13px] leading-5 text-body md:text-sm">{cl.id === "suppliers" && !on ? "Spellings are kept as they are in the file, so 9 new suppliers would be created." : cl.body}</p>
                <dl className={cn("mt-3 grid gap-x-6 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]", !on && "opacity-50")}>
                  {cl.examples.map(([from, to]) => (
                    <div key={from} className="contents">
                      <dt className={cn("text-muted", !cl.add && "line-through")}>{from}</dt>
                      <dd className="flex items-center gap-2 text-ai-fg">
                        {cl.add ? <span aria-hidden>+</span> : <ArrowRight size={14} className="text-icon" aria-hidden />}
                        {to}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!on && (cl.id === "dates" || cl.id === "amounts" || cl.id === "branches") && (
                  <p className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-error-fg">
                    <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                    Without this, LuyFlow cannot read {cl.id === "dates" ? "the dates" : cl.id === "amounts" ? "the amounts" : "the branches"} of {cl.rows} rows, and step 8 will stop the import.
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  role="switch"
                  checked={on}
                  onChange={(e) => set({ cleanups: { ...draft.cleanups, [cl.id]: e.target.checked } })}
                  className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-icon-subtle transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:bg-primary checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                Apply
              </label>
            </div>
          </section>
        );
      })}
      {decisions.map((d) => {
        const rows = c.checks.filter((r) => r.check!.kind === d.id);
        const Icon = d.icon;
        return (
          <section key={d.id} className="rounded-lg border border-warning/60 bg-surface p-5 shadow-xs">
            <div className="flex flex-wrap items-start gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-icon-warning">
                <Icon size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-center gap-2 text-[15px] leading-[22px] font-semibold text-fg">
                  {d.title}
                  <Badge size="sm">{rows.length} rows</Badge>
                  <Badge tone="warning" dot size="sm">
                    Needs your decision
                  </Badge>
                </h2>
                <p className="mt-0.5 text-[13px] leading-5 text-body md:text-sm">{d.body}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                  {(open === d.id ? rows : rows.slice(0, 2)).map((r) => (
                    <div key={r.id} className="contents">
                      <dt className="text-body">
                        {r.check!.inFile}
                        {open === d.id && <span className="text-muted"> · {r.sheet} row {r.row}</span>}
                      </dt>
                      <dd className="flex items-center gap-2 text-warning-fg">
                        <ArrowRight size={14} className="text-icon" aria-hidden />
                        Suggested: {r.check!.suggestion} · {r.check!.confidence}% confident
                      </dd>
                    </div>
                  ))}
                </dl>
                {open === d.id && <p className="mt-3 text-xs leading-4 text-muted">You accept or change each of these in step 8.</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setOpen(open === d.id ? null : d.id)} aria-expanded={open === d.id}>
                {open === d.id ? "Hide rows" : "Review rows"}
              </Button>
            </div>
          </section>
        );
      })}
      <StepFooter
        onBack={onBack}
        note={`${c.applied.length} applied · 2 need your decision in step 8`}
        next={
          <Button iconRight={ArrowRight} onClick={onNext}>
            Check for duplicates
          </Button>
        }
      />
    </>
  );
}

/* ---------- Step 7 ---------- */

function Radio({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm leading-5 text-fg">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="size-[18px] shrink-0 cursor-pointer accent-primary" />
      {children}
    </label>
  );
}

export function DuplicatesStep({ draft, set, c, onBack, onNext }: StepProps) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const list = c.dups.filter(
    (r) => (tab === "all" || (tab === "repeat" ? r.kind === "repeat" : r.kind === "existing")) && (!query || `${r.supplier} ${r.amount} ${amountLabel(r.amount, r.currency)}`.toLowerCase().includes(query.toLowerCase())),
  );
  const shown = all || query ? list : list.slice(0, 3);
  const choose = (id: string, v: DupChoice) => set({ dupChoices: { ...draft.dupChoices, [id]: v } });
  const repeat = c.dups.filter((r) => r.kind === "repeat").length;
  return (
    <>
      <Tiles
        items={[
          { label: "Possible duplicates", value: c.dups.length, tone: "warning" },
          { label: "Repeated in the file", value: repeat },
          { label: "Already in LuyFlow", value: c.dups.length - repeat },
          { label: "Rows after this step", value: c.afterDup, tone: "success" },
        ]}
      />
      <Panel>
        <Tabs
          className="px-5 pt-2"
          label="Duplicate kind"
          value={tab}
          onChange={setTab}
          items={[
            { id: "all", label: "All", count: c.dups.length },
            { id: "repeat", label: "Repeated in the file", count: repeat },
            { id: "existing", label: "Already in LuyFlow", count: c.dups.length - repeat },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search supplier or amount" />
          <span className="ml-auto text-[13px] text-muted">Apply to all {c.dups.length}:</span>
          <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => set({ dupChoices: {} })}>
            Use safe defaults
          </Button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">No possible duplicates match “{query}”.</p>}
          {shown.map((r) => {
            const d = r.dup!;
            const value = c.choice(r);
            const of = c.rows.find((x) => x.id === d.of);
            return (
              <article key={r.id} className="overflow-hidden rounded-lg border border-line">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-subtle px-4 py-2.5">
                  <span className={cn("inline-flex h-6 items-center rounded-sm px-2 text-xs font-medium", r.kind === "repeat" ? "bg-muted-bg text-body" : "bg-primary-subtle text-brand")}>
                    {r.kind === "repeat" ? "Repeated in the file" : "Already in LuyFlow"}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-muted">{d.reason}</span>
                  <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium", d.match >= 90 ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg")}>
                    {d.match >= 90 ? <CircleCheck size={12} aria-hidden /> : <CircleAlert size={12} aria-hidden />}
                    {d.match}% {d.match >= 90 ? "match" : "· check"}
                  </span>
                </header>
                <div className="grid md:grid-cols-[1fr_1fr_260px]">
                  {r.kind === "repeat" && of ? (
                    <DupCard where={`${of.sheet} · row ${of.row}`} name={of.supplier} date={fmtShort(of.date)} amount={amountLabel(of.amount, of.currency)} detail={of.description} />
                  ) : (
                    <DupCard where={`${r.sheet} · row ${r.row}`} name={r.supplier} date={fmtShort(r.date)} amount={amountLabel(r.amount, r.currency)} detail={r.description} />
                  )}
                  {r.kind === "repeat" ? (
                    <DupCard where={`${r.sheet} · row ${r.row}`} name={r.supplier} date={fmtShort(r.date)} amount={amountLabel(r.amount, r.currency)} detail={r.description} />
                  ) : (
                    <DupCard where={d.ofLabel} name={r.supplier} date={d.ofDate} amount={d.ofAmount} detail={d.ofDetail} existing />
                  )}
                  <fieldset className="flex flex-col justify-center gap-2.5 border-t border-line p-4 md:border-t-0 md:border-l">
                    <legend className="sr-only">What to do with {r.supplier}</legend>
                    {r.kind === "repeat" ? (
                      <>
                        <Radio name={r.id} checked={value === "one"} onChange={() => choose(r.id, "one")}>Import one, skip the other</Radio>
                        <Radio name={r.id} checked={value === "both"} onChange={() => choose(r.id, "both")}>Import both</Radio>
                        <Radio name={r.id} checked={value === "skip"} onChange={() => choose(r.id, "skip")}>Skip both</Radio>
                      </>
                    ) : (
                      <>
                        <Radio name={r.id} checked={value === "keep"} onChange={() => choose(r.id, "keep")}>Skip: keep the LuyFlow record</Radio>
                        <Radio name={r.id} checked={value === "new"} onChange={() => choose(r.id, "new")}>Import as a new expense</Radio>
                      </>
                    )}
                    {value !== defaultDup(r) && <span className="text-xs text-muted">Changed from the safe default</span>}
                  </fieldset>
                </div>
              </article>
            );
          })}
        </div>
        {!query && list.length > 3 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
            <span className="text-muted">
              Showing {shown.length} of {list.length} possible duplicates
            </span>
            <button type="button" onClick={() => setAll(!all)} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
              {all ? "Show fewer" : `Show ${list.length - 3} more`}
            </button>
          </div>
        )}
      </Panel>
      <StepFooter
        onBack={onBack}
        note="Default choices never create a second copy"
        next={
          <Button iconRight={ArrowRight} onClick={onNext}>
            Validate rows
          </Button>
        }
      />
    </>
  );
}

function DupCard({ where, name, date, amount, detail, existing }: { where: string; name: string; date: string; amount: string; detail: string; existing?: boolean }) {
  return (
    <div className={cn("border-line p-4 md:border-l first:md:border-l-0", existing && "bg-primary-subtle/40")}>
      <p className="text-xs leading-4 text-muted">{where}</p>
      <p className="mt-1 text-sm leading-5 font-semibold text-fg">{name}</p>
      <p className="mt-0.5 flex gap-4 text-[13px] leading-5">
        <span className="text-muted">{date}</span>
        <span className="tabular font-medium text-fg">{amount}</span>
      </p>
      <p className="text-[13px] leading-5 text-muted">{detail}</p>
    </div>
  );
}

/* ---------- Step 8 ---------- */

export function ValidationStep({ draft, set, c, onBack, onNext, isManager }: StepProps & { isManager: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [allChecks, setAllChecks] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const fix = (id: string, v: string | null) => set({ fixes: { ...draft.fixes, [id]: v } });
  const startEdit = (id: string, v: string) => {
    setEditing(id);
    setValue(v);
  };
  const accept = (ids: string[]) => set({ accepted: [...new Set([...draft.accepted, ...ids])] });
  const checksShown = allChecks ? c.checks : c.checks.slice(0, 4);
  const ready = c.ready.length - c.checks.filter((r) => !c.acceptedChecks.includes(r)).length;

  return (
    <>
      <Tiles
        items={[
          { label: "Rows checked", value: c.afterDup },
          { label: "Errors left", value: `${c.openErrors.length} of ${c.errors.length}`, tone: c.openErrors.length ? "error" : "success" },
          { label: "To check", value: c.checks.length - c.acceptedChecks.length, tone: c.checks.length - c.acceptedChecks.length ? "warning" : undefined },
          { label: "Ready", value: Math.max(0, ready), tone: "success" },
        ]}
      />
      {c.blocked && (
        <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-error/40 bg-error-subtle px-5 py-4">
          <CircleX size={18} className="mt-0.5 shrink-0 text-icon-error" aria-hidden />
          <div className="min-w-0 flex-1 text-sm leading-5 text-body">
            <p className="font-semibold text-fg">212 rows cannot be read</p>
            <p className="mt-0.5">
              {c.brokenByCleanup.map((id) => CLEANUPS.find((x) => x.id === id)!.title.toLowerCase()).join(" and ")} {c.brokenByCleanup.length === 1 ? "is" : "are"} switched off in step 6, so dates, amounts or branches stay as text. Switch {c.brokenByCleanup.length === 1 ? "it" : "them"} back on to continue.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => set({ step: 6 })}>
            Go to step 6
          </Button>
        </div>
      )}
      <Panel
        title={
          <span className="flex items-center gap-2">
            Errors{" "}
            <Badge tone={c.openErrors.length ? "error" : "success"} size="sm">
              {c.openErrors.length ? `${c.openErrors.length} left` : "All fixed"}
            </Badge>
          </span>
        }
        subtitle="Fix the value here, or leave the row out. The file itself is not changed."
        actions={
          <button
            type="button"
            onClick={() => downloadCsv("LuyFlow_import_errors.csv", [["Row", "Supplier", "Problem", "Status"], ...c.errors.map((e) => [e.where, e.supplier, e.problem, e.fixed ? `Fixed: ${e.fixed}` : "Left out"])])}
            className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline"
          >
            <Download size={15} aria-hidden />
            Download error list
          </button>
        }
      >
        <ul className="mt-4">
          {c.errors.map((e) => {
            const leftOut = draft.fixes[e.id as keyof Draft["fixes"]] === "";
            return (
              <li key={e.id} className={cn("grid items-center gap-3 border-t border-line-subtle px-5 py-3.5 md:grid-cols-[110px_220px_minmax(0,1fr)_auto]", e.fixed && "bg-success-subtle/60")}>
                <span className="text-sm font-medium text-fg">{e.where}</span>
                <span>
                  <span className="block text-sm font-medium text-fg">{e.supplier}</span>
                  <span className="block text-xs text-muted">{e.sub}</span>
                </span>
                {editing === e.id ? (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      if (!value.trim()) return;
                      fix(e.id, value.trim());
                      setEditing(null);
                    }}
                  >
                    <label className="text-[13px] text-body">
                      {e.id === "vattanac" ? "Amount (USD)" : e.id === "chipmong" ? "Date" : "THB per USD"}
                      <input
                        autoFocus
                        type={e.id === "chipmong" ? "date" : "text"}
                        inputMode="decimal"
                        min="2026-02-01"
                        max="2026-02-28"
                        value={value}
                        onChange={(ev) => setValue(e.id === "chipmong" ? ev.target.value : ev.target.value.replace(/[^\d.]/g, ""))}
                        className="focus-ring ml-2 h-9 w-36 rounded-md border border-icon-subtle bg-surface px-2.5 text-sm text-fg"
                      />
                    </label>
                    {e.id === "thb" && value && <span className="text-[13px] text-muted">= ${(8400 / Number(value || 1)).toFixed(2)}</span>}
                    <Button size="sm" type="submit">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <p className={cn("flex items-start gap-2 text-[13px] leading-5", e.fixed ? "text-success-fg" : "text-error-fg")}>
                    {e.fixed ? <CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> : <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />}
                    <span>
                      {e.fixed ? `Fixed: ${e.fixed}` : leftOut ? `Left out. ${e.problem}` : e.problem}
                      {e.fixed && e.inFile && <span className="block text-muted">In the file: {e.inFile}</span>}
                    </span>
                  </p>
                )}
                <span className="flex items-center justify-end gap-3">
                  {editing !== e.id &&
                    (e.fixed ? (
                      e.id !== "kampot" && (
                        <button type="button" onClick={() => startEdit(e.id, draft.fixes[e.id as keyof Draft["fixes"]] ?? "")} className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs text-sm font-medium text-brand hover:underline">
                          <Pencil size={14} aria-hidden />
                          Edit
                        </button>
                      )
                    ) : e.id === "thb" ? (
                      <Button variant="secondary" size="sm" onClick={() => startEdit("thb", draft.thbRate)}>
                        Convert…
                      </Button>
                    ) : e.id === "kampot" ? (
                      <Menu
                        align="end"
                        width={200}
                        triggerLabel="Change branch"
                        triggerClassName="inline-flex h-8 items-center rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg hover:bg-subtle"
                        trigger="Change branch"
                        items={ACTIVE_BRANCHES.map((b) => ({ id: b, label: b, onSelect: () => fix("kampot", b) }))}
                      />
                    ) : e.id === "vattanac" || e.id === "chipmong" ? (
                      <Button variant="secondary" size="sm" onClick={() => startEdit(e.id, e.id === "chipmong" ? "2026-02-28" : "")}>
                        Fix
                      </Button>
                    ) : null)}
                  {editing !== e.id && e.fixed && e.id === "kampot" && (
                    <button type="button" onClick={() => fix("kampot", null)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                      Undo
                    </button>
                  )}
                  {editing !== e.id && !e.fixed && !e.id.startsWith("total") && (
                    <button type="button" onClick={() => fix(e.id, leftOut ? null : "")} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                      {leftOut ? "Undo" : "Leave out"}
                    </button>
                  )}
                  {e.id.startsWith("total") && <span className="text-xs text-muted">Leave it out in step 4</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      {isManager && <p className="-mt-3 text-[13px] text-muted">The Branch column is not used for your imports, so no branch errors can occur: every row is recorded for your branch.</p>}

      <Panel
        title={
          <span className="flex items-center gap-2">
            To check <Badge tone="warning" size="sm">{c.checks.length - c.acceptedChecks.length}</Badge>
          </span>
        }
        subtitle="AI suggests a value. Nothing uncertain is imported without your say."
        actions={
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={() => accept(c.checks.filter((r) => r.check!.confidence > 85).map((r) => r.id))}>
            Accept all above 85%
          </Button>
        }
      >
        <ul className="mt-4">
          {checksShown.map((r) => {
            const done = draft.accepted.includes(r.id) || draft.changed[r.id];
            const ck = r.check!;
            const userValue = draft.changed[r.id];
            const alt = ck.kind === "currency" ? (ck.suggestion === "USD" ? "KHR" : "USD") : altDate(r.date);
            return (
              <li key={r.id} className={cn("grid items-center gap-3 border-t border-line-subtle px-5 py-3 md:grid-cols-[110px_minmax(0,1fr)_150px_70px_auto]", done && "bg-success-subtle/40")}>
                <span className="text-sm font-medium text-fg">
                  {r.sheet} · row {r.row}
                </span>
                <span>
                  <span className="block text-sm text-fg">{ck.kind === "currency" ? "No currency" : "Date read two ways"}</span>
                  <span className="block text-xs text-muted">In the file: {ck.inFile}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-ai-fg">
                  <Sparkles size={14} aria-hidden />
                  {userValue ? (ck.kind === "currency" ? userValue : fmtIso(userValue)) : ck.suggestion}
                </span>
                <span className={cn("inline-flex h-6 w-fit items-center gap-1 rounded-full px-2 text-xs font-medium", ck.confidence > 85 ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg")}>
                  {ck.confidence}%
                </span>
                <span className="flex items-center justify-end gap-3">
                  {done ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-success-fg">
                        <Check size={14} aria-hidden />
                        {userValue ? "Changed by you" : "Accepted"}
                      </span>
                      <button type="button" onClick={() => set({ accepted: draft.accepted.filter((x) => x !== r.id), changed: Object.fromEntries(Object.entries(draft.changed).filter(([k]) => k !== r.id)) })} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                        Undo
                      </button>
                    </>
                  ) : changing === r.id ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => (set({ changed: { ...draft.changed, [r.id]: alt } }), setChanging(null))}>
                        Use {ck.kind === "currency" ? alt : fmtIso(alt)}
                      </Button>
                      <button type="button" onClick={() => setChanging(null)} className="focus-ring cursor-pointer rounded-xs text-sm text-muted hover:underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" icon={Check} onClick={() => accept([r.id])}>
                        Accept
                      </Button>
                      <button type="button" onClick={() => setChanging(r.id)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                        Change
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
          <span className="text-muted">
            Showing {checksShown.length} of {c.checks.length}
          </span>
          {c.checks.length > 4 && (
            <button type="button" onClick={() => setAllChecks(!allChecks)} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
              {allChecks ? "Show fewer" : `Show ${c.checks.length - 4} more`}
            </button>
          )}
        </div>
      </Panel>
      <StepFooter
        onBack={onBack}
        note={c.blocked ? "Turn the cleanup back on in step 6 to continue" : `${c.errors.length - c.openErrors.length} of ${c.errors.length} errors fixed · rows still in error are left out`}
        next={
          <Button iconRight={ArrowRight} disabled={c.blocked} onClick={onNext}>
            Review all rows
          </Button>
        }
      />
    </>
  );
}

/** The other reading of a day/month date: 3 Feb ↔ 2 Mar. */
function altDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}-${d}-${m}`;
}

/* ---------- Step 9 ---------- */

const STATUS_BADGE = {
  ready: { tone: "success" as const, label: "Ready" },
  duplicate: { tone: "neutral" as const, label: "Duplicate" },
  error: { tone: "error" as const, label: "Error" },
};

function money(r: FinalRow) {
  if (r.currency === "THB" && r.finalCurrency === "USD" && r.status === "ready") return { main: `$${r.finalAmount.toFixed(2)}`, unit: "USD · from THB" };
  if (r.currency === "THB") return { main: r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 }), unit: "THB" };
  return { main: r.finalCurrency === "USD" ? `$${r.finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : `៛${r.finalAmount.toLocaleString("en-US")}`, unit: r.finalCurrency };
}

export function ReviewStep({ draft, set, c, onBack, onNext, isManager }: StepProps & { isManager: boolean }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [original, setOriginal] = useState(false);
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<FinalRow | null>(null);

  const rows = c.final.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (!branch || r.finalBranch === branch) &&
      (!category || r.finalCategory === category) &&
      (!currency || r.finalCurrency === currency || r.currency === currency) &&
      (!query || `${r.supplier} ${r.description} ${r.finalAmount}`.toLowerCase().includes(query.toLowerCase())),
  );
  const { current, slice } = paginate(rows, page, 8);
  const categories = [...new Set(c.final.map((r) => r.finalCategory))].sort();
  const khrUsd = c.khr.total / 4100;
  const counts = { ready: c.ready.length, duplicate: c.final.filter((r) => r.status === "duplicate").length, error: c.final.filter((r) => r.status === "error").length };
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <>
      <Tiles
        items={[
          { label: "Ready to import", value: c.ready.length, tone: "success" },
          { label: "Duplicates skipped", value: c.skipped },
          { label: "Left out · errors", value: c.leftOut, tone: c.leftOut ? "error" : undefined },
          { label: "Edited by you", value: c.edited },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] text-muted">USD expenses</h2>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="tabular text-[26px] leading-9 font-semibold text-fg">${c.usd.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs font-medium text-muted">USD</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">{c.usd.rows} rows</p>
          <p className="mt-2 text-xs text-muted">Recorded in USD</p>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] text-muted">KHR expenses</h2>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="tabular text-[26px] leading-9 font-semibold text-fg">៛{c.khr.total.toLocaleString("en-US")}</span>
            <span className="text-xs font-medium text-muted">KHR</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {c.khr.rows} rows · ≈ ${khrUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-xs text-muted">Recorded in KHR, not converted</p>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-[13px] text-muted">Period</h2>
          <p className="mt-2 text-[26px] leading-9 font-semibold text-fg">Jan – Mar 2026</p>
          <p className="mt-1 text-[13px] text-muted">
            {c.period.from && fmtIso(c.period.from)} – {c.period.to && fmtIso(c.period.to)} · 3 months
          </p>
          <p className="mt-2 text-xs text-muted">Adds 59 days before your first LuyFlow record</p>
        </section>
      </div>
      <Panel>
        <Tabs
          className="px-5 pt-2"
          label="Rows"
          value={tab}
          onChange={resetPage(setTab)}
          items={[
            { id: "all", label: "All rows", count: c.final.length },
            { id: "ready", label: "Ready", count: counts.ready },
            { id: "duplicate", label: "Duplicates", count: counts.duplicate },
            { id: "error", label: "Left out", count: counts.error },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={query} onChange={resetPage(setQuery)} placeholder="Search supplier, description or amount" className="md:w-[320px]" />
          {!isManager && <FilterMenu label="Branch" value={branch} onChange={resetPage(setBranch)} options={[...ACTIVE_BRANCHES, "Business-wide", "Kampot"].map((b) => ({ value: b, label: b }))} />}
          <FilterMenu label="Category" value={category} onChange={resetPage(setCategory)} options={categories.map((x) => ({ value: x, label: x }))} />
          <FilterMenu label="Currency" value={currency} onChange={resetPage(setCurrency)} options={["USD", "KHR", "THB"].map((x) => ({ value: x, label: x }))} />
          <label className="ml-auto flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              role="switch"
              checked={original}
              onChange={(e) => setOriginal(e.target.checked)}
              className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-icon-subtle transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:bg-primary checked:before:translate-x-4"
            />
            Show original values
          </label>
        </div>
        {slice.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No rows match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[13px] leading-5">
              <thead className="bg-subtle text-xs leading-4 text-muted">
                <tr>
                  {["Date", "Supplier and description", "Category", "Branch", "Amount", "Status", ""].map((h, i) => (
                    <th key={h || i} scope="col" className={cn("px-4 py-3 font-medium", i === 4 && "text-right")}>
                      {h || <span className="sr-only">Edit</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((r) => {
                  const m = money(r);
                  return (
                    <tr key={r.id} className={cn("border-t border-line-subtle", r.status === "error" && "bg-error-subtle/50", r.status === "duplicate" && "bg-subtle")}>
                      <td className="px-4 py-3 whitespace-nowrap text-body">
                        {fmtIso(r.finalDate)}
                        {original && <span className="block text-xs text-muted">{r.original.date}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-fg">{r.supplier}</span>
                        <span className="block text-xs text-muted">
                          {r.description}
                          {r.note && <span className="text-ai-fg"> · {r.status === "error" && r.error === "thb" ? "Unsupported currency · left out" : r.note}</span>}
                          {r.status === "duplicate" && !r.note && <span className="text-ai-fg"> · {r.kind === "existing" ? "Already recorded · skipped" : "Repeated row · skipped"}</span>}
                          {original && r.original.supplier !== r.supplier && <span className="text-muted"> · in the file: “{r.original.supplier}”</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-6 items-center rounded-full bg-muted-bg px-2.5 text-xs font-medium text-body">{r.finalCategory}</span>
                      </td>
                      <td className="px-4 py-3 text-body">
                        {r.finalBranch}
                        {original && <span className="block text-xs text-muted">{r.original.branch}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("tabular block", r.status === "error" ? "text-error-fg" : "text-fg")}>{original ? r.original.amount || "(blank)" : m.main}</span>
                        <span className="block text-xs text-muted">{m.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_BADGE[r.status].tone} dot size="sm">
                          {STATUS_BADGE[r.status].label}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button type="button" onClick={() => setEdit(r)} disabled={r.status !== "ready"} aria-label={`Edit ${r.supplier}, ${fmtIso(r.finalDate)}`} title={r.status === "ready" ? "Edit row" : "Only ready rows can be edited here"} className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-40">
                          <Pencil size={15} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={current} pageSize={8} total={rows.length} noun="rows" onPage={setPage} />
      </Panel>
      <StepFooter
        onBack={onBack}
        note={`${c.ready.length} of ${c.final.length} rows will be imported`}
        next={
          <Button iconRight={ArrowRight} onClick={onNext} disabled={!c.ready.length}>
            Continue to confirm
          </Button>
        }
      />
      {edit && (
        <EditRowDialog
          row={edit}
          categories={categories}
          isManager={isManager}
          onClose={() => setEdit(null)}
          onSave={(patch) => {
            set({ edits: { ...draft.edits, [edit.id]: patch } });
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

function EditRowDialog({ row, categories, isManager, onClose, onSave }: { row: FinalRow; categories: string[]; isManager: boolean; onClose: () => void; onSave: (p: { category?: string; branch?: string }) => void }) {
  const [category, setCategory] = useState(row.finalCategory);
  const [branch, setBranch] = useState<string>(row.finalBranch);
  const opts = [...new Set([...categories, "Fuel & transport", "Repairs", "Bank fees", "Payroll", "Rent", "Utilities", "Internet & phone", "Other"])].sort();
  return (
    <Dialog open onClose={onClose} labelledBy="edit-row-title" width={480}>
      <ModalHeader id="edit-row-title" title="Edit row" description={`${row.sheet} · row ${row.row} · ${row.supplier}`} onClose={onClose} />
      <ModalBody className="flex flex-col gap-4">
        <label className="flex flex-col text-sm font-medium text-fg">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="focus-ring mt-1.5 h-10 rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal">
            {opts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium text-fg">
          Branch
          <select value={branch} disabled={isManager} onChange={(e) => setBranch(e.target.value)} className="focus-ring mt-1.5 h-10 rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal disabled:bg-muted-bg">
            {[...ACTIVE_BRANCHES, "Business-wide"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <p className="text-[13px] leading-5 text-muted">
          Amount and date come from the file: {money(row).main} on {fmtIso(row.finalDate)}. Fix them in the file and import again if they are wrong.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ category: category !== row.category ? category : undefined, branch: !isManager && branch !== row.branch ? branch : undefined })}>Save row</Button>
      </ModalFooter>
    </Dialog>
  );
}

/* ---------- Step 10 ---------- */

export function ConfirmStep({ draft, set, c, onBack, onImport, importing, isManager }: Omit<StepProps, "onNext"> & { onImport: () => void; importing: boolean; isManager: boolean }) {
  const [open, setOpen] = useState(false);
  const branchList = Object.entries(c.branches)
    .sort((a, b) => b[1] - a[1])
    .map(([b, n]) => `${b} ${n}`)
    .join(" · ");
  const named = Object.keys(c.branches).filter((b) => b !== "Business-wide").length;
  const items = [
    { icon: FilePlus, title: `${c.ready.length} expenses will be created`, body: "As posted transactions for January to March 2026, each marked as imported from this file." },
    { icon: Truck, title: `${c.newSuppliers} suppliers will be created`, body: c.openErrors.some((e) => e.id === "thb") ? "Bangkok Packaging Ltd is not created because its row was left out." : "Every other supplier matched one you already have." },
    { icon: Building2, title: isManager ? `Records go to ${draft.branchMode}` : `Records go to ${named} branch${named === 1 ? "" : "es"}${c.branches["Business-wide"] ? " and business-wide" : ""}`, body: branchList },
    { icon: Copy, title: `${c.skipped} duplicates are skipped`, body: `${c.repeatedSkipped} repeated in the file, ${c.existingSkipped} already in LuyFlow.` },
    { icon: CircleX, title: `${c.leftOut} row${c.leftOut === 1 ? " is" : "s are"} left out`, body: c.leftOut ? `${c.final.filter((r) => r.status === "error").map((r) => `${r.sheet} · row ${r.row}`).concat(c.included.map((t) => t.replace("-", " · row "))).join(" and ")}. They are listed in the error report.` : "Every error was fixed." },
  ];
  const pending = c.checks.length - c.acceptedChecks.length;
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="What will happen">
          <ul className="flex flex-col px-5 pt-2 pb-3">
            {items.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 border-b border-line-subtle py-3.5 last:border-b-0">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
                  <Icon size={17} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] leading-[22px] font-medium text-fg">{title}</p>
                  <p className="text-[13px] leading-5 text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Totals">
            <dl className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-3 px-5 pt-4 pb-5 text-sm leading-5">
              <dt className="text-muted">USD</dt>
              <dd className="tabular text-fg">
                ${c.usd.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {c.usd.rows} rows
              </dd>
              <dt className="text-muted">KHR</dt>
              <dd className="tabular text-fg">
                ៛{c.khr.total.toLocaleString("en-US")} · {c.khr.rows} rows
              </dd>
              <dt className="text-muted">Period</dt>
              <dd className="text-fg">
                {c.period.from && fmtIso(c.period.from)} – {c.period.to && fmtIso(c.period.to)}
              </dd>
              <dt className="text-muted">File</dt>
              <dd className="break-all text-fg">{draft.file?.name ?? SAMPLE_FILE.name}</dd>
            </dl>
          </Panel>
          {!isManager && (
            <div className="flex gap-3 rounded-lg border border-warning/50 bg-warning-subtle px-4 py-3">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-icon-warning" aria-hidden />
              <div className="text-[13px] leading-5 text-body">
                <p className="text-sm font-semibold text-fg">March 2026 already has a Complete report</p>
                <p className="mt-0.5">{c.marchCount} of these expenses fall in March. The March report will no longer match your records until you regenerate it, so its figures stay honest.</p>
              </div>
            </div>
          )}
          <p className="flex gap-3 rounded-lg border border-line bg-muted-bg/60 px-4 py-3 text-[13px] leading-5 text-body">
            <Info size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
            Reconciled or signed-off records are never changed by an import. New records are added beside them.
          </p>
        </div>
      </div>
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-xs">
        <Checkbox checked={draft.checkedConfirm} onChange={(v) => set({ checkedConfirm: v })}>
          I have checked the {c.checks.length} rows that needed my decision
          {pending > 0 && <span className="text-warning-fg"> · {pending} still use the AI suggestion without your say</span>}
        </Checkbox>
        <Checkbox checked={draft.emailSummary} onChange={(v) => set({ emailSummary: v })}>
          Email me the import summary and error report
        </Checkbox>
      </section>
      <StepFooter
        onBack={onBack}
        note="You can undo this import for 30 days"
        next={
          <Button iconRight={ArrowRight} disabled={!draft.checkedConfirm} onClick={() => setOpen(true)}>
            Import {c.ready.length} expenses
          </Button>
        }
      />
      <Dialog open={open} onClose={() => !importing && setOpen(false)} labelledBy="confirm-import-title" width={480}>
        <div role="alertdialog" aria-labelledby="confirm-import-title" className="flex gap-4 p-6">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-brand">
            {importing ? <LoaderCircle size={20} className="animate-spin" aria-hidden /> : <CloudUpload size={20} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-import-title" className="text-lg leading-7 font-semibold text-fg">
              {importing ? `Importing ${c.ready.length} expenses…` : `Import ${c.ready.length} expenses?`}
            </h2>
            <p className="mt-1 text-sm leading-[22px] text-body">
              They will be added to your records for January to March 2026, {isManager ? `for ${draft.branchMode}` : `in ${named} branches${c.branches["Business-wide"] ? " and business-wide" : ""}`}. You can undo the whole import from Import history for 30 days.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={importing}>
                Go back
              </Button>
              <Button onClick={onImport} disabled={importing}>
                {importing ? "Importing…" : `Import ${c.ready.length} expenses`}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/* ---------- Step 11 ---------- */

function DoneRail({ failedAt }: { failedAt?: number }) {
  return (
    <nav aria-label="Import steps" className="rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5">
      <ol className="flex flex-col">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < 10 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-primary" />}
            <span className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Check size={14} strokeWidth={3} aria-hidden />
            </span>
            <p className="pt-0.5 text-sm leading-5 font-medium text-fg">{label}</p>
          </li>
        ))}
      </ol>
      {!failedAt && null}
    </nav>
  );
}

export function ResultStep({ entry, onUndo, isManager }: { entry: HistoryRow; onUndo: () => void; isManager: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const r = entry.result!;
  const undone = entry.status === "undone";
  return (
    <div className={PAGE_CLASS}>
      <Breadcrumbs items={[{ label: "Data Import", href: "/data-import" }, { label: "New import" }, { label: entry.type }]} />
      <header className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">{undone ? "Import undone" : "Import complete"}</h1>
            <Badge tone={undone ? "neutral" : "success"} dot>
              {undone ? "Undone" : "Completed"}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-[22px] text-muted">
            Step 11 of 11 · Finished today at {r.finishedAt} · took {r.seconds} seconds.
          </p>
        </div>
        <ButtonLink href="/data-import" variant="secondary" icon={ArrowLeft}>
          Back to Data Import
        </ButtonLink>
      </header>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <DoneRail />
          <p className="flex items-start gap-2 px-1 text-xs leading-4 text-muted">
            <CircleCheck size={14} className="mt-px shrink-0 text-icon-success" aria-hidden />
            Saved to your records on {entry.at}.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {undone ? (
            <section className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-5 shadow-xs">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted-bg text-icon">
                <Undo2 size={22} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-fg">The {r.imported} imported expenses were removed</h2>
                <p className="text-sm text-body">Everything else in your records is unchanged. The file can be imported again at any time.</p>
              </div>
              <ButtonLink href="/data-import/new?fresh=1" icon={CloudUpload}>
                Import again
              </ButtonLink>
            </section>
          ) : (
            <section className="flex flex-wrap items-center gap-5 rounded-lg border border-success/30 bg-success-subtle p-5 md:p-6">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-success text-white">
                <Check size={26} strokeWidth={3} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl leading-7 font-semibold text-fg md:text-2xl">
                  {r.imported} {entry.type.toLowerCase()} were imported
                </h2>
                <p className="mt-1 text-sm leading-[22px] text-body">They are in Financial Records now, each marked as imported from this file.{r.emailed ? ` A summary was sent to ${r.emailed}.` : ""}</p>
              </div>
              <ButtonLink href={`/financial-records/transactions?q=${entry.ref}`} iconRight={ArrowRight}>
                View imported expenses
              </ButtonLink>
            </section>
          )}
          <Tiles
            items={[
              { label: "Imported", value: undone ? 0 : r.imported, tone: undone ? undefined : "success" },
              { label: "Duplicates skipped", value: r.skipped },
              { label: "Left out · errors", value: r.leftOut.length, tone: r.leftOut.length ? "error" : undefined },
              { label: "Suppliers created", value: undone ? 0 : r.suppliers },
            ]}
          />
          {r.leftOut.length > 0 && (
            <Panel
              title="Rows that were not imported"
              subtitle="Fix them in the file and import again, or add them by hand."
              actions={
                <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadCsv(`LuyFlow_import_errors_${entry.ref}.csv`, [["Row", "Supplier", "Amount", "Reason"], ...r.leftOut.map((x) => [x.where, x.supplier, x.amount, x.reason])])}>
                  Download error report
                </Button>
              }
            >
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[13px] leading-5">
                  <thead className="bg-subtle text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Row</th>
                      <th scope="col" className="px-4 py-3 font-medium">Supplier</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                      <th scope="col" className="px-4 py-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.leftOut.map((x) => (
                      <tr key={x.where} className="border-t border-line-subtle">
                        <td className="px-4 py-3 font-medium text-fg">{x.where}</td>
                        <td className="px-4 py-3">
                          <span className="block text-fg">{x.supplier}</span>
                          {x.sub && <span className="block text-xs text-muted">{x.sub}</span>}
                        </td>
                        <td className="tabular px-4 py-3 text-right text-fg">{x.amount}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <Badge tone="error" dot size="sm">
                              Error
                            </Badge>
                            <span className="text-muted">{x.reason}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel title={<span className="flex items-center gap-2">What changes now <span className="inline-flex h-5 items-center gap-1 rounded-full border border-icon-ai/25 bg-ai-subtle px-1.5 text-[11px] font-medium text-ai-fg"><Sparkles size={11} aria-hidden />AI</span></span>}>
              <ul className="flex flex-col gap-3 px-5 pt-4 pb-5 text-sm leading-5 text-body">
                <li className="flex gap-2.5">
                  <TrendingUp size={16} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
                  Forecasts gain 59 days of expense history. Reliability is recalculated tonight.
                </li>
                {!isManager && (
                  <li className="flex gap-2.5">
                    <FileWarning size={16} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
                    The March 2026 report no longer matches your records ({r.marchCount} new expenses). Regenerate it to include them.
                  </li>
                )}
                {r.categories > 0 && (
                  <li className="flex gap-2.5">
                    <Tag size={16} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
                    AI filled in {r.categories} missing categories. You can change any of them in Financial Records.
                  </li>
                )}
              </ul>
            </Panel>
            <Panel title="Next">
              <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
                <Button variant="secondary" icon={CloudUpload} onClick={() => router.push("/data-import/new?fresh=1")}>
                  Import another file
                </Button>
                {!isManager && (
                  <Button variant="secondary" icon={RefreshCw} onClick={() => router.push("/monthly-reports/2026-03")}>
                    Regenerate March report
                  </Button>
                )}
                {!undone && (
                  <>
                    {/* Hairline UI hold-to-confirm: undoing removes records, so it takes a deliberate hold. */}
                    <HoldToConfirm
                      icon={<Undo2 />}
                      labels={{ idle: "Hold to undo this import", holding: "Keep holding…", pending: "Removing…", success: "Import undone" }}
                      onConfirm={() => {
                        onUndo();
                        toast({ title: "Import undone", body: `${r.imported} expenses were removed from Financial Records.` });
                      }}
                      className="mt-1 w-full !rounded-md !border-error !bg-error hover:!bg-error/90"
                    />
                    <p className="text-center text-xs leading-4 text-muted">
                      Undo is available until {entry.undoUntil}. It removes only the {r.imported} records created by this import.
                    </p>
                  </>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 16.12 ---------- */

export function FailedStep({ draft, onBack, onRetry }: { draft: Draft; onBack: () => void; onRetry: () => void }) {
  const f = draft.failure!;
  return (
    <>
      <section className="rounded-lg border border-line bg-surface px-5 py-10 shadow-xs md:px-8 md:py-14" role="alert">
        <div className="mx-auto flex max-w-[680px] flex-col items-center text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-error-subtle text-icon-error">
            <FileX size={26} aria-hidden />
          </span>
          <h2 className="mt-5 text-base leading-6 font-semibold text-fg md:text-lg">{f.title}</h2>
          <p className="mt-1.5 text-sm leading-[22px] text-body">{f.body}</p>
        </div>
        <div className="mx-auto mt-10 max-w-[780px] border-t border-line pt-6">
          <h3 className="text-sm font-semibold text-fg">Other reasons a file cannot be read</h3>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-5 text-body">
            <li className="flex gap-2.5">
              <FileImage size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />A photo or scan is too dark, blurred or cut off.
            </li>
            <li className="flex gap-2.5">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
              The file is damaged or is not really a CSV, Excel, PDF or image.
            </li>
            <li className="flex gap-2.5">
              <Table size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
              The sheet has no table: for example only a chart or a single total.
            </li>
          </ul>
        </div>
      </section>
      <StepFooter
        onBack={onBack}
        next={
          <Button iconRight={ArrowRight} onClick={onRetry}>
            Upload a different file
          </Button>
        }
      />
    </>
  );
}

