"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Camera,
  Check,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Info,
  ListOrdered,
  Lock,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { formatBytes } from "@/components/finance/common";
import { DropZone } from "@/components/hairline/drop-zone";
import { Plan } from "@/components/hairline/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/flow";
import { Breadcrumbs, Tabs, PAGE_CLASS } from "@/components/ui/page";
import { useToast } from "@/components/ui/overlay";
import { cn, downloadCsv } from "@/lib/format";
import { COLUMNS, EXTRACT_PREVIEW, FIELDS, IMPORT_TYPES, SAMPLE_FILE, SHEETS, TEMPLATES, type FieldId, type ImportTypeId } from "@/lib/mock/import-data";
import { useSession } from "@/lib/session";
import { compute, STEP_LABELS, TOTAL_ROWS, type Computed } from "./compute";
import { clock, freshDraft, useImports, type Draft, type FileInfo, type ReadFailure, type Source } from "./import-store";
import { TypeIcon } from "./import-home";
import { CleanupStep, ConfirmStep, DuplicatesStep, FailedStep, ResultStep, ReviewStep, ValidationStep } from "./steps";

export function AiAssisted() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
      <Sparkles size={12} aria-hidden />
      AI-assisted
    </span>
  );
}

/** Small summary tile row used at the top of steps 4–9. */
export function Tiles({ items }: { items: { label: string; value: React.ReactNode; tone?: "success" | "warning" | "error" }[] }) {
  const tones = { success: "border-success/30 bg-success-subtle", warning: "border-warning/50 bg-warning-subtle", error: "border-error/30 bg-error-subtle" };
  const valueTone = { success: "text-success-fg", warning: "text-warning-fg", error: "text-error-fg" };
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:gap-4", items.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {items.map((item) => (
        <section key={item.label} className={cn("rounded-lg border px-4 py-3 shadow-xs", item.tone ? tones[item.tone] : "border-line bg-surface")}>
          <h2 className="truncate text-[13px] leading-5 text-body">{item.label}</h2>
          <p className={cn("tabular mt-1 text-[22px] leading-8 font-semibold", item.tone ? valueTone[item.tone] : "text-fg")}>{item.value}</p>
        </section>
      ))}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className, tone }: { title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; tone?: "warning" | "error" }) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-surface shadow-xs", tone === "warning" ? "border-warning/60" : tone === "error" ? "border-error/40" : "border-line", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-base leading-6 font-semibold text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] leading-5 text-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const HEADINGS: Record<number, (c: Computed, d: Draft) => [string, string]> = {
  1: () => ["What are you importing?", "Choose the type of record so LuyFlow knows which fields to look for."],
  2: (_c, d) => ["Upload your file", `One file per import. Files stay private to ${d.type === "expenses" ? "Mekong Mart" : "your business"}.`],
  3: () => ["Reading your file", "This usually takes less than a minute."],
  4: () => ["Check what AI found in the file", "Confirm the header row and the rows that are not expenses."],
  5: (c) => ["Match your columns to LuyFlow fields", `AI suggested a match for 8 of 9 columns. ${c.mappingOk ? "Change any that are wrong." : "Some required fields are not matched yet."}`],
  6: (c) => ["Review AI cleanup suggestions", `AI found 7 ways to tidy this file. ${c.applied.length} are switched on; switch off any you do not want.`],
  7: (c) => ["Check possible duplicates", `${c.dups.length} rows look like records that already exist. Choose what to do with each one.`],
  8: (c) => ["Fix errors and confirm AI suggestions", `${c.errors.length - c.openErrors.length} of ${c.errors.length} errors are fixed and ${c.checks.length - c.acceptedChecks.length} rows have a suggestion waiting for you.`],
  9: (c) => ["Review before importing", `${c.ready.length} expenses are ready. Check the totals and open any row to edit it.`],
  10: () => ["Confirm the import", "This is the only step that changes your records."],
};

function stepSub(step: number, c: Computed, d: Draft) {
  switch (step) {
    case 1:
      return IMPORT_TYPES.find((t) => t.id === d.type)?.label;
    case 2:
      return d.file?.name;
    case 3:
      return `${d.file?.sample === false ? 1 : 3} sheet${d.file?.sample === false ? "" : "s"} · 214 rows`;
    case 4:
      return `${c.expenseRows} expense rows`;
    case 5:
      return `${c.mapped} of 9 mapped`;
    case 6:
      return `${c.applied.length + 2} suggestions`;
    case 7:
      return `${c.dups.length} found`;
    case 8:
      return `${c.errors.length} errors · ${c.checks.length} to check`;
    case 9:
      return `${c.ready.length} ready`;
  }
}

function Rail({ draft, c, onGo, failed }: { draft: Draft; c: Computed; onGo: (step: number) => void; failed?: boolean }) {
  return (
    <nav aria-label="Import steps" className="rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5">
      <ol className="flex flex-col">
        {STEP_LABELS.map((label, index) => {
          const n = index + 1;
          const done = n < draft.step || (n === 11 && draft.step === 11);
          const active = n === draft.step && !(failed && n === 3);
          const error = failed && n === 3;
          const reachable = n <= draft.reached && n !== draft.step && draft.step !== 11 && !failed;
          const sub = done ? stepSub(n, c, draft) : undefined;
          return (
            <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
              {n < 11 && <span aria-hidden className={cn("absolute top-7 bottom-0 left-[13px] w-0.5", done ? "bg-primary" : "bg-line")} />}
              <span
                className={cn(
                  "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] leading-[18px] font-medium",
                  done && "bg-primary text-white",
                  active && "border-2 border-primary bg-surface text-brand",
                  error && "border-2 border-error bg-error-subtle text-icon-error",
                  !done && !active && !error && "border border-line-strong bg-surface text-muted",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : error ? <TriangleAlert size={14} aria-hidden /> : n}
              </span>
              <div className="min-w-0 pt-0.5">
                {reachable ? (
                  <button type="button" onClick={() => onGo(n)} className="focus-ring cursor-pointer rounded-xs text-left text-sm leading-5 font-medium text-fg hover:underline">
                    {label}
                  </button>
                ) : (
                  <p aria-current={active ? "step" : undefined} className={cn("text-sm leading-5", error ? "font-medium text-error-fg" : active || done ? "font-medium text-fg" : "text-body")}>
                    {label}
                  </p>
                )}
                {sub && <p className="truncate text-xs leading-4 text-muted">{sub}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-xs leading-4 text-muted">
        {draft.step === 11 ? <CircleCheck size={14} className="mt-px shrink-0 text-icon-success" aria-hidden /> : <ShieldCheck size={14} className="mt-px shrink-0" aria-hidden />}
        {draft.step === 11 ? "Saved to your records." : "Nothing is saved to your records until you confirm in step 10."}
      </p>
    </nav>
  );
}

/** Footer with Back, an optional note and the next action. */
export function StepFooter({ onBack, note, next, extra }: { onBack?: () => void; note?: React.ReactNode; next: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-4 shadow-xs md:px-5">
      {onBack && (
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Back
        </Button>
      )}
      {note && <p className="order-first w-full text-[13px] leading-5 text-muted md:order-none md:w-auto md:min-w-0 md:flex-1">{note}</p>}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {extra}
        {next}
      </div>
    </div>
  );
}

/** Reads the first bytes of the chosen file to catch files that cannot be imported (frame 16.12). */
export async function inspect(file: File): Promise<{ failure: ReadFailure | null; rows: number | null; sheets: string[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isZip = head[0] === 0x50 && head[1] === 0x4b;
  const isCfb = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
  if (file.size === 0) return { failure: { title: "The file is empty", body: `${file.name} has no content. Export it again and upload the new copy.` }, rows: null, sheets: [] };
  if (ext === "xlsx" && isCfb)
    return { failure: { title: "The file is password-protected", body: `${file.name} opens only with a password, so LuyFlow cannot read its rows. Save a copy without the password in Excel and upload that copy.` }, rows: null, sheets: [] };
  if (ext === "xlsx" && !isZip) return { failure: { title: "The file is damaged", body: `${file.name} is not a working Excel file. Open it in Excel, save it again and upload that copy.` }, rows: null, sheets: [] };
  if (ext === "pdf" && !(head[0] === 0x25 && head[1] === 0x50)) return { failure: { title: "The file is damaged", body: `${file.name} is not a working PDF.` }, rows: null, sheets: [] };
  if (ext === "csv") {
    const lines = (await file.text()).split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { failure: { title: "The sheet has no table", body: `${file.name} has a header but no rows, or no header at all.` }, rows: null, sheets: [] };
    return { failure: null, rows: lines.length - 1, sheets: ["Sheet 1"] };
  }
  return { failure: null, rows: null, sheets: ext === "xlsx" ? ["Sheet 1"] : [] };
}

const ACCEPT: Record<Source, { accept: string; hint: string; exts: string[] }> = {
  spreadsheet: { accept: ".csv,.xlsx", hint: "CSV or Excel (.xlsx) · up to 10 MB", exts: ["csv", "xlsx"] },
  pdf: { accept: ".pdf", hint: "PDF · up to 20 pages, 10 MB", exts: ["pdf"] },
  photo: { accept: "image/png,image/jpeg", hint: "JPG or PNG · one page, up to 10 MB", exts: ["jpg", "jpeg", "png"] },
};

/** Frames 16.1–16.12: the 11-step import. `?step=` follows the draft; `?state=failed` pins 16.12. */
export function ImportWizard() {
  const { user } = useSession();
  const store = useImports();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const isManager = user?.role === "manager";
  const managerBranch = isManager ? store.branch : undefined;
  const doneId = params.get("done");
  const [importing, setImporting] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Start a draft for `?type=` when there is none (or `?fresh=1` asks for a new one). Runs once per URL.
  const initFor = useRef<string | null>(null);
  const { ready: storeReady, draft: storeDraft, setDraft } = store;
  useEffect(() => {
    if (!storeReady || doneId) return;
    const key = params.toString();
    if (initFor.current === key) return;
    initFor.current = key;
    const type = params.get("type") as ImportTypeId | null;
    if (!storeDraft || params.get("fresh") === "1") {
      setDraft({ ...freshDraft(type ?? "expenses", managerBranch), savedAt: clock() });
      if (key) router.replace("/data-import/new", { scroll: false });
    } else if (params.get("state") === "failed" && !storeDraft.failure) {
      setDraft({
        ...storeDraft,
        step: 3,
        reached: Math.max(3, storeDraft.reached),
        file: storeDraft.file ?? { ...SAMPLE_FILE, sample: true, uploadedAt: "Today, 18:02" },
        failure: { title: "The file is password-protected", body: `${SAMPLE_FILE.name} opens only with a password, so LuyFlow cannot read its rows. Save a copy without the password in Excel and upload that copy.` },
      });
    }
  }, [storeReady, storeDraft, setDraft, params, router, doneId, managerBranch]);

  const draft = store.draft;
  const c = useMemo(() => (draft ? compute(draft, managerBranch) : null), [draft, managerBranch]);

  const doneEntry = doneId ? store.history.find((h) => h.id === doneId) : undefined;
  if (!user || !store.ready) return null;

  if (doneId) {
    if (!doneEntry?.result) {
      return (
        <div className={PAGE_CLASS}>
          <p className="text-sm text-muted">This import is no longer available.</p>
        </div>
      );
    }
    return <ResultStep entry={doneEntry} onUndo={() => store.undo(doneEntry.id)} isManager={isManager} />;
  }
  if (!draft || !c) return null;

  const set = (patch: Partial<Draft>) => store.setDraft({ ...draft, ...patch, savedAt: clock() });
  const go = (step: number) => {
    set({ step, reached: Math.max(draft.reached, step) });
    mainRef.current?.scrollIntoView({ block: "start" });
    window.scrollTo({ top: 0 });
  };
  const back = () => go(Math.max(1, draft.step - 1));
  const next = () => go(draft.step + 1);
  const saveAndExit = () => {
    set({});
    toast({ title: "Import saved", body: `You can resume it from Data Import. Step ${draft.step} of 11.` });
    router.push("/data-import");
  };
  const failed = draft.step === 3 && Boolean(draft.failure);
  const [title, subtitle] = failed ? ["We could not read this file", "Nothing was imported."] : HEADINGS[draft.step](c, draft);
  const type = IMPORT_TYPES.find((t) => t.id === draft.type)!;
  const fullWidth = draft.step === 9 && !showSteps;

  const runImport = () => {
    setImporting(true);
    const startedAt = Date.now();
    setTimeout(() => {
      const ref = `IMP-2026-${String(32 + store.history.filter((h) => h.ref).length).padStart(4, "0")}`;
      const by = user.name;
      const at = `31 Oct 2026, ${clock()}`;
      const txns = c.ready.map((r, i) => ({
        id: `TXN-${r.finalDate.slice(0, 7)}-I${String(i + 1).padStart(3, "0")}`,
        date: r.finalDate,
        description: `${r.supplier} — ${r.description}`,
        type: "expense" as const,
        accountId: r.account,
        branch: r.finalBranch,
        category: r.finalCategory,
        amount: -r.finalAmount,
        currency: r.finalCurrency,
        status: "posted" as const,
        ref,
        method: "Import",
        recon: "unmatched" as const,
        history: [{ kind: "import" as const, title: `Imported from ${draft.file?.name ?? SAMPLE_FILE.name}`, meta: `${by} · ${at}` }],
      }));
      const id = `h-${Date.now().toString(36)}`;
      store.commit(
        {
          id,
          at,
          type: type.label,
          file: draft.file?.name ?? SAMPLE_FILE.name,
          rows: c.ready.length,
          note: `${c.ready.length} imported · ${c.skipped} duplicates skipped${c.leftOut ? ` · ${c.leftOut} left out` : ""}`,
          status: "completed",
          by,
          branch: managerBranch ?? "All branches",
          ref,
          undoUntil: "30 Nov 2026",
          result: {
            imported: c.ready.length,
            skipped: c.skipped,
            leftOut: c.final.filter((r) => r.status === "error").map((r) => ({ where: `${r.sheet} · row ${r.row}`, supplier: r.supplier, sub: `${r.date.slice(8, 10).replace(/^0/, "")} ${["Jan", "Feb", "Mar"][Number(r.date.slice(5, 7)) - 1]} 2026 · ${r.branch}`, amount: r.currency === "THB" ? "8,400.00 THB" : `$${r.amount.toFixed(2)}`, reason: r.error === "thb" ? "Unsupported currency" : r.error === "kampot" ? "Deactivated branch" : "Error" })).concat(c.included.map((t) => ({ where: t.replace("-", " · row "), supplier: "Total row", sub: "", amount: "", reason: "Total row" }))),
          suppliers: c.newSuppliers,
          categories: c.applied.some((a) => a.id === "categories") ? 38 : 0,
          marchCount: c.marchCount,
          seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)) + 12,
          finishedAt: clock(),
          emailed: draft.emailSummary ? user.email : undefined,
        },
      },
      txns,
      );
      setImporting(false);
      toast({ title: `${c.ready.length} expenses imported`, body: "They are in Financial Records now." });
      router.replace(`/data-import/new?done=${id}`);
    }, 1400);
  };

  return (
    <div ref={mainRef} className={PAGE_CLASS}>
      <Breadcrumbs items={[{ label: "Data Import", href: "/data-import" }, { label: "New import" }, { label: type.label }]} />
      <header className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">{title}</h1>
            {failed ? (
              <Badge tone="error" dot>
                Failed
              </Badge>
            ) : (
              <AiAssisted />
            )}
          </div>
          <p className="mt-1 text-sm leading-[22px] text-muted">
            Step {draft.step} of 11 · {subtitle}
          </p>
        </div>
        <Button variant="secondary" icon={Save} onClick={saveAndExit}>
          Save and exit
        </Button>
      </header>

      {fullWidth && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3 shadow-xs md:px-5">
          <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-primary text-[13px] font-medium text-brand">9</span>
          <div>
            <p className="text-sm leading-5 font-medium text-fg">Review</p>
            <p className="text-xs leading-4 text-muted">Step 9 of 11</p>
          </div>
          <div className="hidden flex-1 gap-1.5 md:flex" aria-hidden>
            {STEP_LABELS.map((l, i) => (
              <span key={l} className={cn("h-1.5 flex-1 rounded-full", i < 8 ? "bg-primary" : i === 8 ? "bg-primary/40" : "bg-line")} />
            ))}
          </div>
          <button type="button" onClick={() => setShowSteps(true)} className="focus-ring ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
            Show all steps
            <ListOrdered size={16} aria-hidden />
          </button>
        </div>
      )}

      <div className={cn("mt-6 grid items-start gap-6", !fullWidth && "lg:grid-cols-[264px_minmax(0,1fr)]")}>
        {!fullWidth && (
          <div className="flex flex-col gap-2 lg:sticky lg:top-6">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-xs lg:hidden">
              <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-medium", failed ? "border-error text-icon-error" : "border-primary text-brand")}>{draft.step}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 font-medium text-fg">{STEP_LABELS[draft.step - 1]}</p>
                <div className="mt-1.5 flex gap-1" aria-hidden>
                  {STEP_LABELS.map((l, i) => (
                    <span key={l} className={cn("h-1 flex-1 rounded-full", i < draft.step - 1 ? "bg-primary" : i === draft.step - 1 ? "bg-primary/40" : "bg-line")} />
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <Rail draft={draft} c={c} onGo={go} failed={failed} />
            </div>
            {draft.step === 9 && (
              <button type="button" onClick={() => setShowSteps(false)} className="focus-ring cursor-pointer self-start rounded-xs text-[13px] font-medium text-brand hover:underline">
                Hide steps
              </button>
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-6">
          {failed ? (
            <FailedStep draft={draft} onBack={() => set({ step: 2, failure: null, file: null })} onRetry={() => set({ step: 2, failure: null, file: null })} />
          ) : draft.step === 1 ? (
            <TypeStep draft={draft} set={set} onNext={next} isManager={isManager} branch={store.branch} />
          ) : draft.step === 2 ? (
            <UploadStep draft={draft} set={set} onBack={back} onNext={() => (draft.file ? go(3) : undefined)} userName={user.name} />
          ) : draft.step === 3 ? (
            <ReadStep draft={draft} set={set} onBack={back} onNext={next} onCancel={() => (store.setDraft(null), router.push("/data-import"))} />
          ) : draft.step === 4 ? (
            <ExtractStep draft={draft} set={set} c={c} onBack={back} onNext={next} />
          ) : draft.step === 5 ? (
            <MapStep draft={draft} set={set} c={c} onBack={back} onNext={next} />
          ) : draft.step === 6 ? (
            <CleanupStep draft={draft} set={set} c={c} onBack={back} onNext={next} />
          ) : draft.step === 7 ? (
            <DuplicatesStep draft={draft} set={set} c={c} onBack={back} onNext={next} />
          ) : draft.step === 8 ? (
            <ValidationStep draft={draft} set={set} c={c} onBack={back} onNext={next} isManager={isManager} />
          ) : draft.step === 9 ? (
            <ReviewStep draft={draft} set={set} c={c} onBack={back} onNext={next} isManager={isManager} />
          ) : (
            <ConfirmStep draft={draft} set={set} c={c} onBack={back} onImport={runImport} importing={importing} isManager={isManager} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 1 ---------- */

function TypeStep({ draft, set, onNext, isManager, branch }: { draft: Draft; set: (p: Partial<Draft>) => void; onNext: () => void; isManager: boolean; branch: string }) {
  const router = useRouter();
  const types = IMPORT_TYPES.filter((t) => (isManager ? t.manager : t.owner));
  const type = IMPORT_TYPES.find((t) => t.id === draft.type)!;
  const sources: { id: Source; label: string; sub: string; icon: typeof FileSpreadsheet }[] = [
    { id: "spreadsheet", label: "Spreadsheet", sub: "CSV or Excel (.xlsx)", icon: FileSpreadsheet },
    { id: "pdf", label: "PDF document", sub: "Exported or scanned", icon: FileText },
    { id: "photo", label: "Photo", sub: "JPG or PNG, one page", icon: Camera },
  ];
  const noSample = !type.href && type.id !== "expenses";
  const radio = (active: boolean) => cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-primary" : "border-icon-subtle");

  return (
    <>
      <Panel title="Record type">
        <div role="radiogroup" aria-label="Record type" className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {types.map((t) => {
            const active = t.id === draft.type;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ type: t.id })}
                className={cn("focus-ring flex cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left", active ? "border-primary bg-primary-subtle/60 ring-1 ring-primary" : "border-line bg-surface hover:bg-subtle")}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-subtle text-brand">
                    <TypeIcon id={t.id} />
                  </span>
                  <span className={radio(active)}>{active && <span className="size-2.5 rounded-full bg-primary" />}</span>
                </span>
                <span>
                  <span className="block text-[15px] leading-[22px] font-semibold text-fg">{t.label}</span>
                  <span className="block text-[13px] leading-5 text-muted">{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      {type.href ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-xs">
          <Info size={18} className="shrink-0 text-icon" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-5 text-body">
            {type.label} are imported on their own screen, which knows the fields they need{type.id === "bank" ? " and matches lines to the account’s reconciliation" : ""}.
          </p>
          <Button iconRight={ArrowRight} onClick={() => router.push(type.href!)}>
            Open {type.label.toLowerCase()} import
          </Button>
        </div>
      ) : (
        <>
          <Panel title="Where is the data now?">
            <div className="flex flex-col gap-5 p-5">
              <div role="radiogroup" aria-label="Where is the data now?" className="grid gap-3 md:grid-cols-3">
                {sources.map(({ id, label, sub, icon: Icon }) => {
                  const active = draft.source === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set({ source: id, file: null })}
                      className={cn("focus-ring flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left", active ? "border-primary bg-primary-subtle/60 ring-1 ring-primary" : "border-line bg-surface hover:bg-subtle")}
                    >
                      <Icon size={20} className="shrink-0 text-icon-strong" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-5 font-semibold text-fg">{label}</span>
                        <span className="block text-xs leading-4 text-muted">{sub}</span>
                      </span>
                      <span className={radio(active)}>{active && <span className="size-2.5 rounded-full bg-primary" />}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col">
                  <span className="mb-1.5 text-sm leading-5 font-medium text-fg">Branch for these {type.label.toLowerCase()}</span>
                  <span className="relative">
                    {isManager ? <Lock size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon" aria-hidden /> : <Building2 size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-strong" aria-hidden />}
                    <select
                      value={draft.branchMode}
                      disabled={isManager}
                      onChange={(e) => set({ branchMode: e.target.value })}
                      className="focus-ring h-10 w-full cursor-pointer appearance-none rounded-md border border-icon-subtle bg-surface pr-9 pl-9 text-sm text-fg disabled:cursor-not-allowed disabled:bg-muted-bg"
                    >
                      {isManager ? (
                        <option value={branch}>{branch} (your branch)</option>
                      ) : (
                        <>
                          <option value="column">Use the Branch column in the file</option>
                          {["Central Market", "Toul Kork", "Siem Reap", "Battambang", "Business-wide"].map((b) => (
                            <option key={b} value={b}>
                              All rows: {b}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </span>
                  <span className="mt-1.5 text-[13px] leading-5 text-muted">{isManager ? `Imported rows are always recorded for ${branch}.` : "Rows without a branch will be flagged for you to choose."}</span>
                </label>
                <label className="flex flex-col">
                  <span className="mb-1.5 text-sm leading-5 font-medium text-fg">Dates in the file are</span>
                  <span className="relative">
                    <Calendar size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-strong" aria-hidden />
                    <select value={draft.dateOrder} onChange={(e) => set({ dateOrder: e.target.value as Draft["dateOrder"] })} className="focus-ring h-10 w-full cursor-pointer appearance-none rounded-md border border-icon-subtle bg-surface pr-9 pl-9 text-sm text-fg">
                      <option value="dmy">Day first (31/01/2026)</option>
                      <option value="mdy">Month first (01/31/2026)</option>
                    </select>
                  </span>
                  <span className="mt-1.5 text-[13px] leading-5 text-muted">AI flags dates that could be read two ways.</span>
                </label>
              </div>
            </div>
          </Panel>
          <div className="flex flex-wrap items-start gap-3 rounded-lg border border-line bg-muted-bg/60 px-5 py-4">
            <Info size={18} className="mt-0.5 shrink-0 text-icon" aria-hidden />
            <div className="min-w-0 flex-1 text-sm leading-5 text-body">
              <p className="font-medium text-fg">Need a starting point?</p>
              <p className="mt-0.5">
                Download the {type.label.toLowerCase()} template to see the columns LuyFlow looks for. Your own layout works too: you will map the columns in step 5.
              </p>
            </div>
            <button type="button" onClick={() => downloadCsv(`LuyFlow_${type.id}_template.csv`, TEMPLATES[type.id])} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
              Download template
            </button>
          </div>
        </>
      )}

      <StepFooter
        note={noSample ? `This demo has a sample file for Expenses only. ${type.label} use the same 11 steps.` : undefined}
        next={
          type.href ? null : (
            <Button iconRight={ArrowRight} disabled={noSample} onClick={onNext}>
              Continue
            </Button>
          )
        }
      />
    </>
  );
}

/* ---------- Step 2 ---------- */

function UploadStep({ draft, set, onBack, onNext, userName }: { draft: Draft; set: (p: Partial<Draft>) => void; onBack: () => void; onNext: () => void; userName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = ACCEPT[draft.source];

  const pick = async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!accept.exts.includes(ext)) return setError(`${ext ? ext.toUpperCase() : "This file"} is not accepted for a ${draft.source === "spreadsheet" ? "spreadsheet" : draft.source === "pdf" ? "PDF document" : "photo"}. Choose ${accept.hint.split(" ·")[0]}, or change the source in step 1.`);
    if (file.size > 10 * 1024 * 1024) return setError("The file is larger than 10 MB. Split it into smaller files.");
    const result = await inspect(file);
    const info: FileInfo = { name: file.name, size: file.size, sample: false, sheets: result.sheets, rows: result.rows, uploadedAt: `Today, ${clock()}` };
    set({ file: info, failure: result.failure, read: false });
  };
  const useSample = () => {
    setError(null);
    set({ file: { name: SAMPLE_FILE.name, size: SAMPLE_FILE.size, sample: true, sheets: SAMPLE_FILE.sheets, rows: SAMPLE_FILE.rows, uploadedAt: `Today, ${clock()}` }, failure: null, read: false });
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="File">
          <div className="p-5">
            {draft.file ? (
              <>
                <div className="rounded-lg border border-success/30 bg-success-subtle p-3">
                  <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-success-subtle text-icon-success">
                      <FileSpreadsheet size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-5 font-medium text-fg">{draft.file.name}</p>
                      <p className="text-xs leading-4 text-muted">
                        {draft.file.rows !== null ? `${draft.file.rows} rows · ` : ""}
                        {formatBytes(draft.file.size)} · uploaded
                      </p>
                    </div>
                    <button type="button" onClick={() => inputRef.current?.click()} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                      Replace
                    </button>
                    <CircleCheck size={20} className="shrink-0 text-icon-success" aria-label="Uploaded" />
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-4 text-sm leading-5">
                  <div>
                    <dt className="text-[13px] text-muted">Sheets</dt>
                    <dd className="mt-0.5 text-fg">{draft.file.sheets.length ? draft.file.sheets.join(", ") : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Uploaded</dt>
                    <dd className="mt-0.5 text-fg">{draft.file.uploadedAt}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Uploaded by</dt>
                    <dd className="mt-0.5 text-fg">{userName}</dd>
                  </div>
                </dl>
                {!draft.file.sample && !draft.failure && (
                  <p className="mt-4 flex items-start gap-2 rounded-md bg-info-subtle px-3 py-2.5 text-[13px] leading-5 text-body">
                    <Info size={15} className="mt-0.5 shrink-0 text-icon-info" aria-hidden />
                    Demo: LuyFlow checks that this file can be opened, then walks through the sample expenses ({SAMPLE_FILE.name}) in the next steps.
                  </p>
                )}
                <button type="button" onClick={() => set({ file: null, failure: null })} className="focus-ring mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
                  <Trash2 size={15} aria-hidden />
                  Remove file
                </button>
              </>
            ) : (
              <>
                {/* Hairline UI drop zone: drag and drop or browse, with upload progress. */}
                <DropZone
                  accept={accept.accept}
                  maxSize={10 * 1024 * 1024}
                  multiple={false}
                  title="Drop your file here"
                  hint={accept.hint}
                  onFilesRejected={(r) => r[0] && setError(r[0].reason)}
                  onUpload={async (file, { progress, signal }) => {
                    setError(null);
                    for (let step = 1; step <= 10; step++) {
                      if (signal.aborted) return;
                      await new Promise((resolve) => setTimeout(resolve, 70));
                      progress(step / 10);
                    }
                    await pick(file);
                  }}
                />
                {error ? (
                  <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-error-fg">
                    <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                    {error}
                  </p>
                ) : (
                  <p className="mt-3 flex items-center gap-2 text-[13px] leading-5 text-muted">
                    <Info size={15} aria-hidden />
                    Choose a file to continue.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-icon-ai/20 bg-ai-subtle px-4 py-3">
                  <Sparkles size={16} className="shrink-0 text-icon-ai" aria-hidden />
                  <p className="min-w-0 flex-1 text-[13px] leading-5 text-body">No file to hand? Try the sample: three months of Mekong Mart expenses in English and Khmer.</p>
                  <Button variant="secondary" size="sm" onClick={useSample}>
                    Use sample file
                  </Button>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={accept.accept}
              aria-label="Choose a file to import"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pick(file);
                e.target.value = "";
              }}
            />
          </div>
        </Panel>
        <Panel title="Accepted files">
          <ul className="flex flex-col gap-3 px-5 pt-4 text-sm leading-5">
            {[
              [FileSpreadsheet, "CSV or Excel (.xlsx)", "Up to 10 MB · 20,000 rows"],
              [FileText, "PDF", "Up to 20 pages"],
              [ImageIcon, "JPG or PNG", "Clear, flat photo of one page"],
            ].map(([Icon, label, sub]) => {
              const I = Icon as typeof FileText;
              return (
                <li key={label as string} className="flex gap-3">
                  <I size={18} className="mt-0.5 shrink-0 text-icon-strong" aria-hidden />
                  <span>
                    <span className="block text-fg">{label as string}</span>
                    <span className="block text-xs leading-4 text-muted">{sub as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mx-5 mt-4 mb-5 border-t border-line pt-3 text-[13px] leading-5 text-muted">Khmer and English text, Khmer numerals and both USD and KHR amounts are supported.</p>
        </Panel>
      </div>
      <StepFooter
        onBack={onBack}
        next={
          <Button iconRight={ArrowRight} disabled={!draft.file} onClick={onNext}>
            Read file
          </Button>
        }
      />
    </>
  );
}

/* ---------- Step 3 ---------- */

const READ_STEPS = [
  { title: "File uploaded and scanned", sub: "86 KB · no problems found" },
  { title: "Sheets found", sub: "Jan (73 rows), Feb (68 rows), Mar (73 rows) · header rows are not counted" },
  { title: "Languages and formats detected", sub: "English and Khmer text · Khmer numerals · USD and KHR amounts" },
  { title: "Extracting rows", sub: "Finding the header row, expense rows and totals on each sheet" },
  { title: "Suggesting column mapping", sub: "Starts when extraction finishes" },
];

function ReadStep({ draft, set, onBack, onNext, onCancel }: { draft: Draft; set: (p: Partial<Draft>) => void; onBack: () => void; onNext: () => void; onCancel: () => void }) {
  const [progress, setProgress] = useState(draft.read ? 214 : 0);
  const done = draft.read || progress >= 214;
  useEffect(() => {
    if (draft.read) return;
    const timer = setInterval(() => setProgress((p) => Math.min(214, p + 9)), 160);
    return () => clearInterval(timer);
  }, [draft.read]);
  useEffect(() => {
    if (progress >= 214 && !draft.read) set({ read: true });
  }, [progress, draft.read, set]);
  const percent = Math.round((progress / 214) * 100);
  const stage = progress < 20 ? 0 : progress < 45 ? 1 : progress < 70 ? 2 : progress < 214 ? 3 : 5;
  const preview = [
    ["Jan · row 1", "02/01/2026", "Borey Property", "Rent Jan - main shop", "$2,400.00"],
    ["Jan · row 2", "2026-01-03", "E.D.C", "Electricity Dec", "៛1,480,000"],
    ["Jan · row 3", "១៤ មករា ២០២៦", "Khmer Fresh Produce", "បន្លែ", "១២០,០០០"],
    ["Jan · row 4", "05/01/2026", "Cambodia Beverage", "Beer + water", "1,320.50"],
    ["Jan · row 5", "05/01/2026", "Cambodia Beverage", "Beer + water", "1,320.50"],
  ];
  const shown = Math.min(preview.length, Math.floor(progress / 30));

  return (
    <>
      <Panel>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-ai-subtle text-icon-ai">
              {done ? <CircleCheck size={22} aria-hidden /> : <Sparkles size={22} aria-hidden />}
            </span>
            <div className="min-w-0 flex-1" role="status" aria-live="polite">
              <h2 className="text-base leading-6 font-semibold text-fg md:text-lg">{done ? `AI read every row of ${SAMPLE_FILE.name}` : `AI is extracting rows from ${SAMPLE_FILE.name}`}</h2>
              <p className="text-[13px] leading-5 text-muted">{progress} of 214 rows read</p>
            </div>
            <span className="tabular text-2xl leading-8 font-semibold text-ai-fg">{percent}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-icon-ai transition-[width] duration-150" style={{ width: `${percent}%` }} />
          </div>
          {/* Hairline UI plan: the checklist ticks itself off as the file is read. */}
          <Plan
            className="mt-4"
            title="Reading the file"
            collapseWhenDone={false}
            tasks={READ_STEPS.map((step, i) => ({
              id: step.title,
              label: step.title,
              detail: i === 4 && (done || i < stage) ? "8 of 9 columns matched" : step.sub,
              status: done || i < stage ? "done" : i === stage ? "running" : "pending",
            }))}
          />
        </div>
      </Panel>
      <Panel title="Preview" subtitle="Rows appear here as they are read, exactly as they are in the file.">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px] leading-5">
            <thead className="bg-subtle text-xs leading-4 text-muted">
              <tr>
                {["Row", "Date", "Paid to", "Description", "Amount"].map((h, i) => (
                  <th key={h} scope="col" className={cn("px-4 py-3 font-medium", i === 4 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, done ? preview.length : shown).map((r) => (
                <tr key={r[0]} className="border-t border-line-subtle">
                  <td className="px-4 py-3 text-muted">{r[0]}</td>
                  <td className="px-4 py-3 text-fg">{r[1]}</td>
                  <td className="px-4 py-3 text-fg">{r[2]}</td>
                  <td className="px-4 py-3 text-fg">{r[3]}</td>
                  <td className="tabular px-4 py-3 text-right text-fg">{r[4]}</td>
                </tr>
              ))}
              {!done &&
                [0, 1].map((i) => (
                  <tr key={i} className="border-t border-line-subtle" aria-hidden>
                    {[60, 150, 110, 160, 70].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <span className="block h-2.5 animate-pulse rounded-full bg-muted-bg" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <StepFooter
        onBack={onBack}
        extra={
          <button type="button" onClick={onCancel} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
            Cancel import
          </button>
        }
        next={
          <Button iconRight={ArrowRight} disabled={!done} onClick={onNext}>
            Continue
          </Button>
        }
      />
    </>
  );
}

/* ---------- Step 4 ---------- */

function ExtractStep({ draft, set, c, onBack, onNext }: { draft: Draft; set: (p: Partial<Draft>) => void; c: Computed; onBack: () => void; onNext: () => void }) {
  const [sheet, setSheet] = useState<"Jan" | "Feb" | "Mar">("Jan");
  const meta = SHEETS.find((s) => s.id === sheet)!;
  const totalRow = TOTAL_ROWS.find((t) => t.sheet === sheet);
  const totalIncluded = totalRow && c.included.includes(totalRow.id);
  const toggleInclude = (id: string) => {
    const has = draft.includedTotals.includes(id);
    set({ leaveOutTotals: true, includedTotals: has ? draft.includedTotals.filter((x) => x !== id) : [...draft.includedTotals, id] });
  };
  return (
    <>
      <Tiles
        items={[
          { label: "Rows in the file", value: 214 },
          { label: "Expense rows found", value: c.expenseRows, tone: "success" },
          { label: "Rows left out", value: c.leftOutTotals.length, tone: c.leftOutTotals.length ? "warning" : undefined },
          { label: "Columns", value: 9 },
        ]}
      />
      <Panel
        title={draft.file?.sample === false ? SAMPLE_FILE.name : draft.file?.name}
        actions={
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2 text-xs font-medium text-success-fg">
            <CircleCheck size={12} aria-hidden />
            97% confident
          </span>
        }
      >
        <Tabs
          className="mt-3 px-5"
          label="Sheets"
          value={sheet}
          onChange={(id) => setSheet(id as typeof sheet)}
          items={SHEETS.map((s) => ({ id: s.id, label: s.id, count: s.rows }))}
        />
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <span className="inline-flex h-6 items-center rounded-sm border border-primary/30 bg-primary-subtle px-2 text-xs font-medium text-brand">Header row</span>
          {totalRow && <span className={cn("inline-flex h-6 items-center rounded-sm border border-line-strong bg-muted-bg px-2 text-xs font-medium text-muted", !totalIncluded && "line-through")}>Left out: total row</span>}
          <select
            aria-label="Header row"
            value={draft.header}
            onChange={(e) => set({ header: e.target.value as Draft["header"] })}
            className="focus-ring ml-auto h-10 cursor-pointer rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg"
          >
            <option value="first">Header: first row of the sheet</option>
            <option value="none">No header row</option>
          </select>
          <span className="flex items-center gap-2 text-sm text-fg">
            <Switch checked={draft.leaveOutTotals} onChange={(on) => set({ leaveOutTotals: on, includedTotals: [] })} label="Leave out total rows" />
            Leave out total rows
          </span>
        </div>
        {draft.header === "none" && (
          <p className="mx-5 mt-3 flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-[13px] leading-5 text-body">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-icon-warning" aria-hidden />
            AI is 97% sure the first row holds the column names. Without a header, the first row would be imported as an expense and columns are named by letter in step 5.
          </p>
        )}
        <div className="mx-5 mt-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[920px] text-left text-[13px] leading-5">
            <thead className="bg-subtle text-[11px] text-muted">
              <tr>
                <th scope="col" className="w-10 px-2 py-1.5" aria-label="Row" />
                {"ABCDEFGHI".split("").map((l) => (
                  <th key={l} scope="col" className="border-l border-line px-3 py-1.5 text-center font-medium">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line bg-primary-subtle/50">
                <td className="px-2 py-2 text-center text-xs text-muted" />
                {EXTRACT_PREVIEW.columns.map((h) => (
                  <td key={h} className="border-l border-line px-3 py-2 font-medium text-brand">
                    {h}
                  </td>
                ))}
              </tr>
              {EXTRACT_PREVIEW[sheet].map((row, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-2 py-2 text-center text-xs text-muted">{i + 1}</td>
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-[160px] truncate border-l border-line px-3 py-2 text-fg">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {totalRow && (
                <tr className={cn("border-t border-line", totalIncluded ? "bg-warning-subtle/60" : "bg-subtle")}>
                  <td className="px-2 py-2 text-center text-xs text-muted">{totalRow.row}</td>
                  <td className={cn("border-l border-line px-3 py-2 text-muted", !totalIncluded && "line-through")}>{totalRow.text.split(" ").slice(0, 2).join(" ")}</td>
                  <td colSpan={2} className="border-l border-line" />
                  <td className={cn("border-l border-line px-3 py-2 text-muted", !totalIncluded && "line-through")}>{totalRow.text.split(" ").pop()}</td>
                  <td colSpan={5} className="border-l border-line" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-5 pt-3 pb-5 text-xs leading-4 text-muted">
          ⋯ Rows 7–{meta.rows - (totalRow ? 1 : 0)} are not shown in this preview. Rows are numbered under the header row; all {meta.rows} rows of this sheet were read.
        </p>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={<span className="flex items-center gap-2">What AI noticed <span className="inline-flex h-5 items-center gap-1 rounded-full border border-icon-ai/25 bg-ai-subtle px-1.5 text-[11px] font-medium text-ai-fg"><Sparkles size={11} aria-hidden />AI</span></span>}>
          <ul className="flex flex-col gap-3 px-5 pt-4 pb-5 text-sm leading-5 text-body">
            <li>• Khmer and English text, including Khmer numerals in amounts and dates.</li>
            <li>• Three currency codes: USD in 147 rows, KHR in 55 rows and THB in 1 row. 9 rows state no currency.</li>
            <li>• Three date formats: 02/01/2026, 2026-01-03 and Khmer month names.</li>
            <li>• Jan · rows 4 and 5 look identical. Duplicates are checked in step 7.</li>
          </ul>
        </Panel>
        <Panel title={<span className="flex items-center gap-2">Rows left out <Badge size="sm">{c.leftOutTotals.length}</Badge></span>}>
          <ul className="divide-y divide-line-subtle px-5 pt-2 pb-3">
            {TOTAL_ROWS.map((t) => {
              const inc = c.included.includes(t.id);
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 font-medium text-fg">
                      {t.sheet} · row {t.row}
                    </p>
                    <p className="text-[13px] leading-5 text-muted">
                      Total row: “{t.text}”{inc ? " · will be imported" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => (draft.leaveOutTotals ? toggleInclude(t.id) : set({ leaveOutTotals: true, includedTotals: TOTAL_ROWS.filter((x) => x.id !== t.id).map((x) => x.id) }))} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                    {inc ? "Leave out" : "Include"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <StepFooter
        onBack={onBack}
        note={c.included.length ? "Included total rows will be flagged as errors in step 8: they have no supplier or date." : undefined}
        next={
          <Button iconRight={ArrowRight} onClick={onNext}>
            Map columns
          </Button>
        }
      />
    </>
  );
}

/* ---------- Step 5 ---------- */

function MapStep({ draft, set, c, onBack, onNext }: { draft: Draft; set: (p: Partial<Draft>) => void; c: Computed; onBack: () => void; onNext: () => void }) {
  const confidence = (letter: string) => {
    const col = COLUMNS.find((x) => x.letter === letter)!;
    const field = draft.mapping[letter];
    if (field !== col.ai) return <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary-subtle px-2 text-xs font-medium text-brand"><Check size={12} aria-hidden />Set by you</span>;
    if (col.confidence === null) return <span className="inline-flex h-6 items-center gap-1 rounded-full bg-error-subtle px-2 text-xs font-medium text-error-fg"><TriangleAlert size={12} aria-hidden />Not sure</span>;
    if (col.confidence < 90) return <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2 text-xs font-medium text-warning-fg"><TriangleAlert size={12} aria-hidden />{col.confidence}% · check</span>;
    return <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2 text-xs font-medium text-success-fg"><CircleCheck size={12} aria-hidden />{col.confidence}% confident</span>;
  };
  const required = (f: FieldId) => FIELDS.find((x) => x.id === f)?.required;
  return (
    <>
      <Tiles
        items={[
          { label: "Columns matched", value: `${c.mapped} of 9`, tone: "success" },
          { label: "Required fields covered", value: `${c.covered.length} of ${c.required.length}`, tone: c.covered.length === c.required.length ? "success" : "error" },
          { label: "To check", value: c.toCheckColumns.length, tone: c.toCheckColumns.length ? "warning" : undefined },
          { label: "Not imported", value: 9 - c.mapped },
        ]}
      />
      <Panel
        title="Column mapping"
        subtitle="Sample values are from your file, unchanged."
        actions={
          <button type="button" onClick={() => set({ mapping: Object.fromEntries(COLUMNS.map((x) => [x.letter, x.ai])) })} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
            <Sparkles size={15} aria-hidden />
            Reset to AI suggestion
          </button>
        }
      >
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px] leading-5">
            <thead className="bg-subtle text-xs leading-4 text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Column in file</th>
                <th scope="col" className="px-4 py-3 font-medium">Sample values</th>
                <th scope="col" className="px-4 py-3 font-medium">LuyFlow field</th>
                <th scope="col" className="px-4 py-3 font-medium">AI match</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((col) => {
                const field = draft.mapping[col.letter];
                const dup = c.doubled.some((d) => d.id === field);
                const warn = field === col.ai && col.confidence !== null && col.confidence < 90;
                return (
                  <tr key={col.letter} className={cn("border-t border-line-subtle", warn && "bg-warning-subtle/50")}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="inline-flex size-6 items-center justify-center rounded-sm bg-muted-bg text-xs font-medium text-body">{col.letter}</span>
                        <span className="font-medium text-fg">{draft.header === "none" ? `Column ${col.letter}` : col.name}</span>
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-muted">{col.sample}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <ArrowRight size={15} className="shrink-0 text-icon" aria-hidden />
                        <select
                          aria-label={`LuyFlow field for column ${col.letter}`}
                          value={field}
                          onChange={(e) => set({ mapping: { ...draft.mapping, [col.letter]: e.target.value as FieldId } })}
                          className={cn("focus-ring h-10 w-[200px] cursor-pointer rounded-md border bg-surface px-3 text-sm text-fg", dup ? "border-error" : "border-icon-subtle")}
                        >
                          {FIELDS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </span>
                      {dup && <span className="mt-1 block pl-7 text-xs text-error-fg">Another column is already matched to this field.</span>}
                    </td>
                    <td className="px-4 py-3">
                      {confidence(col.letter)}
                      {required(field) && <span className="mt-1 block text-xs text-muted">Required field</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title="Required for an expense">
          <ul className="flex flex-col gap-2.5 px-5 pt-4 pb-5 text-sm leading-5">
            {c.required.map((f) => {
              const letter = Object.entries(draft.mapping).find(([, v]) => v === f.id)?.[0];
              return (
                <li key={f.id} className="grid grid-cols-[24px_100px_1fr] items-start gap-2">
                  {letter ? <CircleCheck size={17} className="mt-0.5 text-icon-success" aria-label="Covered" /> : <X size={17} className="mt-0.5 text-icon-error" aria-label="Missing" />}
                  <span className="text-fg">{f.label}</span>
                  <span className="text-muted">
                    {letter ? `Column ${letter}` : "Not matched: choose a column above"}
                    {letter && f.id === "currency" && " · you confirm the 9 blank cells in step 8"}
                    {letter && f.id === "category" && " · the 38 blank cells get an AI suggestion in step 6"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <div className="flex flex-col gap-4">
          {[
            ["Why “Type” needs a check", "Values such as “Stock” fit more than one LuyFlow category. AI chooses from the description and the supplier, and shows its confidence."],
            ["Why “Paid by” needs a check", "“ABA” could mean ABA Business USD or ABA Operating KHR. AI picks the account that matches each row’s currency and flags the rest."],
          ].map(([t, b]) => (
            <div key={t} className="flex gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
              <div className="text-[13px] leading-5 text-body">
                <p className="text-sm font-semibold text-fg">{t}</p>
                <p className="mt-0.5">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <StepFooter
        onBack={onBack}
        note={!c.mappingOk ? (c.doubled.length ? "Each LuyFlow field can only be matched to one column." : `Match ${c.required.length - c.covered.length} more required field${c.required.length - c.covered.length === 1 ? "" : "s"} to continue.`) : undefined}
        next={
          <Button iconRight={ArrowRight} disabled={!c.mappingOk} onClick={onNext}>
            Start AI cleanup
          </Button>
        }
      />
    </>
  );
}

