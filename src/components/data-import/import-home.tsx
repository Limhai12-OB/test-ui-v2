"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, CloudUpload, Download, FileClock, FileText, Landmark, Lock, MoreHorizontal, Package, ReceiptText, Truck, Undo2, Users, Wallet } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DropZone } from "@/components/hairline/drop-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, TwoLine, type Column } from "@/components/ui/data-table";
import { DetailList } from "@/components/ui/flow";
import { FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { Drawer, useToast } from "@/components/ui/overlay";
import { Page, ScopeNotice } from "@/components/ui/page";
import { downloadCsv } from "@/lib/format";
import { IMPORT_TYPES, TEMPLATES, type HistoryRow, type ImportStatus, type ImportTypeId } from "@/lib/mock/import-data";
import { useSession } from "@/lib/session";
import { clock, freshDraft, useImports } from "./import-store";
import { inspect } from "./wizard";
import { AiAssisted } from "./wizard";

const ICONS: Record<ImportTypeId, typeof FileText> = { sales: ReceiptText, expenses: Wallet, customers: Users, suppliers: Truck, items: Package, bills: FileText, bank: Landmark, stock: ClipboardList };

export function TypeIcon({ id, size = 20 }: { id: ImportTypeId; size?: number }) {
  const Icon = ICONS[id];
  return <Icon size={size} aria-hidden />;
}

const STATUS: Record<ImportStatus, { label: string; tone: "success" | "warning" | "error" | "neutral" }> = {
  completed: { label: "Completed", tone: "success" },
  review: { label: "Needs Review", tone: "warning" },
  failed: { label: "Failed", tone: "error" },
  undone: { label: "Undone", tone: "neutral" },
};

/** Frames 16.0 (owner) and 16.13 (Branch Manager). */
export function ImportHome() {
  const { user } = useSession();
  const store = useImports();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>("90");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<HistoryRow | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [replaceType, setReplaceType] = useState<ImportTypeId | null>(null);

  if (!user || !store.ready) return null;
  const isManager = user.role === "manager";
  const branch = store.branch;
  const draft = store.draft;
  const typeLabel = (id: ImportTypeId) => IMPORT_TYPES.find((t) => t.id === id)!.label;

  const start = (id: ImportTypeId) => {
    const t = IMPORT_TYPES.find((x) => x.id === id)!;
    if (t.href) return router.push(t.href);
    if (draft) return setReplaceType(id);
    router.push(`/data-import/new?type=${id}`);
  };

  const rows = store.history.filter(
    (h) =>
      (!query || h.file.toLowerCase().includes(query.toLowerCase())) &&
      (!type || h.type === type) &&
      (!status || h.status === status) &&
      (range !== "30" || /Oct 2026/.test(h.at)),
  );
  const { current, slice } = paginate(rows, page, 7);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const columns: Column<HistoryRow>[] = [
    { key: "at", header: "Imported", width: "15%", cell: (h) => <span className="text-body">{h.at}</span> },
    { key: "type", header: "Type", width: "13%", cell: (h) => <span className="text-fg">{h.type}</span> },
    { key: "file", header: "File", width: "30%", cell: (h) => <TwoLine title={<span className="font-medium text-fg">{h.file}</span>} sub={h.note} /> },
    { key: "rows", header: "Rows", align: "right", width: "7%", cell: (h) => <span className="tabular text-fg">{h.rows}</span> },
    { key: "status", header: "Status", width: "13%", cell: (h) => <Badge tone={STATUS[h.status].tone} dot size="sm">{STATUS[h.status].label}</Badge> },
    ...(isManager ? [] : [{ key: "by", header: "By", width: "12%", cell: (h: HistoryRow) => <span className="text-body">{h.by}</span> }]),
    {
      key: "actions",
      header: "Actions",
      srHeader: true,
      width: "10%",
      align: "right",
      cell: (h) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setView(h)} className="focus-ring cursor-pointer rounded-xs px-1 text-sm font-medium text-brand hover:underline">
            View
          </button>
          <Menu
            align="end"
            width={220}
            triggerLabel={`More actions for ${h.file}`}
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
            trigger={<MoreHorizontal size={16} aria-hidden />}
            items={[
              ...(h.href ? [{ id: "open", label: "Open the records", onSelect: () => router.push(h.href!) }] : []),
              ...(h.result && h.status !== "undone" ? [{ id: "result", label: "Open the import summary", onSelect: () => router.push(`/data-import/new?done=${h.id}`) }] : []),
              { id: "undo", label: "Undo this import", description: h.ref && h.status !== "undone" ? `Available until ${h.undoUntil}` : "Only for imports made in Data Import", disabled: !h.ref || h.status === "undone", onSelect: () => setUndoId(h.id) },
            ]}
          />
        </div>
      ),
    },
  ];

  const types = IMPORT_TYPES.filter((t) => (isManager ? t.manager : t.owner));
  const locked = isManager ? IMPORT_TYPES.filter((t) => t.owner && !t.manager) : [];
  const undoEntry = store.history.find((h) => h.id === undoId);

  return (
    <Page>
      <header className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">Data Import</h1>
            <AiAssisted />
          </div>
          <p className="mt-1 max-w-[760px] text-sm leading-[22px] text-muted">
            {isManager
              ? `Import records for ${branch} Branch from spreadsheets, PDFs or photos. Nothing is saved until you confirm.`
              : "Bring existing records into LuyFlow from spreadsheets, PDFs or photos. AI reads the file, cleans it up and flags anything uncertain. Nothing is saved until you confirm."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isManager && (
            <Menu
              align="end"
              width={240}
              triggerLabel="Download templates"
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-subtle"
              trigger={
                <>
                  <Download size={16} aria-hidden />
                  Download templates
                </>
              }
              items={IMPORT_TYPES.filter((t) => t.owner).map((t) => ({ id: t.id, label: `${t.label} template (.csv)`, onSelect: () => downloadCsv(`LuyFlow_${t.id}_template.csv`, TEMPLATES[t.id]) }))}
            />
          )}
          <Button icon={CloudUpload} onClick={() => (draft ? setReplaceType("expenses") : router.push("/data-import/new?fresh=1"))}>
            New import
          </Button>
        </div>
      </header>

      {isManager && <ScopeNotice branch={branch} className="mt-6" />}

      {/* Hairline UI drop zone: drop a file here to start an import straight away. */}
      <section aria-labelledby="drop-title" className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="drop-title" className="text-base leading-6 font-semibold text-fg md:text-lg">
              Import a file
            </h2>
            <p className="text-[13px] leading-5 text-muted md:text-sm">
              Drop a spreadsheet, PDF or photo of {isManager ? `${branch} records` : "your records"} here, or browse. LuyFlow reads it and walks you through the rest. Nothing is saved until you confirm.
            </p>
          </div>
          <button type="button" onClick={() => router.push("/data-import/new?fresh=1")} className="focus-ring cursor-pointer rounded-xs text-[13px] font-medium text-brand hover:underline">
            No file to hand? Try the sample
          </button>
        </div>
        <DropZone
          accept=".csv,.xlsx,.pdf,image/png,image/jpeg"
          maxSize={10 * 1024 * 1024}
          multiple={false}
          title="Drop a file to import"
          hint="CSV, Excel (.xlsx), PDF, JPG or PNG · up to 10 MB"
          onFilesRejected={(r) => r[0] && toast({ title: "That file can’t be imported", body: r[0].reason, tone: "error" })}
          onUpload={async (file, { progress, signal }) => {
            for (let step = 1; step <= 10; step++) {
              if (signal.aborted) return;
              await new Promise((resolve) => setTimeout(resolve, 80));
              progress(step / 10);
            }
            const result = await inspect(file);
            const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
            const source = ext === "pdf" ? "pdf" : ext === "png" || ext === "jpg" || ext === "jpeg" ? "photo" : "spreadsheet";
            store.setDraft({
              ...freshDraft("expenses", isManager ? branch : undefined),
              source,
              step: 3,
              reached: 3,
              savedAt: clock(),
              file: { name: file.name, size: file.size, sample: false, sheets: result.sheets, rows: result.rows, uploadedAt: `Today, ${clock()}` },
              failure: result.failure,
            });
            setTimeout(() => router.push("/data-import/new"), 500);
          }}
        />
        {draft && <p className="mt-3 text-xs leading-4 text-muted">Dropping a file starts a new import and replaces the {typeLabel(draft.type).toLowerCase()} import saved at step {draft.step}.</p>}
      </section>

      <section aria-labelledby="types-title" className="mt-7">
        <h2 id="types-title" className="text-lg leading-7 font-semibold text-fg md:text-xl">
          What would you like to import?
        </h2>
        <p className="text-sm leading-[22px] text-muted">{isManager ? `Imported rows are always recorded for ${branch}.` : "Choose a type to start. Every import is checked step by step before anything is saved."}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {types.map((t) => (
            <button key={t.id} type="button" onClick={() => start(t.id)} className="lift focus-ring group flex cursor-pointer flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-xs hover:border-primary/40">
              <span className="flex items-start justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-subtle text-brand">
                  <TypeIcon id={t.id} />
                </span>
                <ArrowRight size={16} className="text-icon group-hover:text-icon-strong" aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] leading-[22px] font-semibold text-fg">{t.label}</span>
                <span className="block text-[13px] leading-5 text-muted">{t.sub}</span>
              </span>
            </button>
          ))}
          {locked.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 opacity-70" aria-disabled>
              <span className="flex items-start justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-muted-bg text-icon">
                  <TypeIcon id={t.id} />
                </span>
                <Lock size={16} className="text-icon" aria-label="Business Owner only" />
              </span>
              <span>
                <span className="block text-[15px] leading-[22px] font-semibold text-body">{t.label}</span>
                <span className="block text-[13px] leading-5 text-muted">Business Owner only</span>
              </span>
            </div>
          ))}
          {draft && (
            <div className="flex flex-col gap-3 rounded-lg border border-warning/60 bg-warning-subtle p-4">
              <span className="flex items-start justify-between">
                <span className="inline-flex size-10 items-center justify-center text-icon-warning">
                  <FileClock size={22} aria-hidden />
                </span>
                <Button variant="secondary" size="sm" onClick={() => router.push("/data-import/new")}>
                  Resume
                </Button>
              </span>
              <span>
                <span className="block text-[15px] leading-[22px] font-semibold text-fg">1 import in progress</span>
                <span className="block text-[13px] leading-5 text-body">
                  {typeLabel(draft.type)} · step {draft.step} of 11{draft.savedAt ? ` · saved ${draft.savedAt}` : ""}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="history-title" className="mt-7 rounded-lg border border-line bg-surface shadow-xs">
        <div className="px-5 pt-5">
          <h2 id="history-title" className="text-base leading-6 font-semibold text-fg md:text-lg">
            {isManager ? "Your imports" : "Import history"}
          </h2>
          <p className="text-[13px] leading-5 text-muted md:text-sm">{isManager ? `Imports you made for ${branch} Branch.` : "Imports by everyone in the business. Open one to see what it created, or to undo it while undo is available."}</p>
        </div>
        {!isManager && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <SearchInput value={query} onChange={resetPage(setQuery)} placeholder="Search by file name" />
            <FilterMenu label="Type" value={type} onChange={resetPage(setType)} options={[...new Set(store.history.map((h) => h.type))].map((x) => ({ value: x, label: x }))} />
            <FilterMenu label="Status" value={status} onChange={resetPage(setStatus)} options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))} />
            <FilterMenu label="Date" icon="calendar" value={range} onChange={resetPage(setRange)} options={[{ value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} />
          </div>
        )}
        <div className={isManager ? "mt-4 border-t border-line" : undefined}>
          <DataTable
            caption={isManager ? "Your imports" : "Import history"}
            columns={columns}
            rows={slice}
            rowKey={(h) => h.id}
            minWidth={900}
            empty="No imports match these filters."
            mobileRow={(h) => (
              <button type="button" onClick={() => setView(h)} className="flex w-full items-start justify-between gap-3 text-left">
                <TwoLine title={<span className="font-medium text-fg">{h.file}</span>} sub={`${h.at} · ${h.type}`} />
                <Badge tone={STATUS[h.status].tone} dot size="sm">
                  {STATUS[h.status].label}
                </Badge>
              </button>
            )}
          />
        </div>
        <Pagination page={current} pageSize={7} total={rows.length} noun="imports" onPage={setPage} />
      </section>

      <Drawer open={Boolean(view)} onClose={() => setView(null)} labelledBy="import-view-title">
        {view && (
          <>
            <div className="border-b border-line px-5 py-5 md:px-6">
              <p className="text-xs text-muted">{view.type} import</p>
              <h2 id="import-view-title" className="mt-0.5 text-lg leading-7 font-semibold break-all text-fg">
                {view.file}
              </h2>
              <div className="mt-2">
                <Badge tone={STATUS[view.status].tone} dot>
                  {STATUS[view.status].label}
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
              <DetailList
                items={[
                  ["Imported", view.at],
                  ["By", view.by],
                  ["Branch", view.branch],
                  ["Rows in the file", String(view.rows)],
                  ["Result", view.note],
                  ...(view.ref ? ([["Reference", view.ref]] as [string, string][]) : []),
                  ...(view.ref && view.status !== "undone" ? ([["Undo available until", view.undoUntil ?? ""]] as [string, string][]) : []),
                ]}
              />
              {view.status === "failed" && <p className="mt-5 rounded-md bg-error-subtle px-4 py-3 text-[13px] leading-5 text-body">Nothing was imported from this file. Upload a clearer copy or a CSV or Excel export to try again.</p>}
              {view.status === "review" && <p className="mt-5 rounded-md bg-warning-subtle px-4 py-3 text-[13px] leading-5 text-body">Some lines were imported with an uncertain category. Open the records to confirm them.</p>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 md:px-6">
              {view.ref && view.status !== "undone" && (
                <Button variant="secondary" icon={Undo2} onClick={() => (setUndoId(view.id), setView(null))}>
                  Undo
                </Button>
              )}
              {view.result && view.status !== "undone" ? (
                <Button iconRight={ArrowRight} onClick={() => router.push(`/data-import/new?done=${view.id}`)}>
                  Open summary
                </Button>
              ) : view.href ? (
                <Button iconRight={ArrowRight} onClick={() => router.push(view.href!)}>
                  Open the records
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setView(null)}>
                  Close
                </Button>
              )}
            </div>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(undoEntry)}
        onClose={() => setUndoId(null)}
        id="undo-title"
        icon={<Undo2 size={20} aria-hidden />}
        title="Undo this import?"
        confirmLabel={`Remove ${undoEntry?.rows ?? 0} records`}
        confirmVariant="danger"
        focusCancel
        onConfirm={() => {
          if (!undoEntry) return;
          store.undo(undoEntry.id);
          setUndoId(null);
          toast({ title: "Import undone", body: `${undoEntry.rows} records from ${undoEntry.file} were removed.` });
        }}
      >
        The {undoEntry?.rows} records created from {undoEntry?.file} are removed from Financial Records. Nothing else changes.
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(replaceType)}
        onClose={() => setReplaceType(null)}
        id="replace-title"
        icon={<FileClock size={20} aria-hidden />}
        title="Start a new import?"
        cancelLabel="Keep the saved import"
        confirmLabel="Discard and start new"
        onConfirm={() => {
          const t = replaceType;
          setReplaceType(null);
          router.push(`/data-import/new?fresh=1&type=${t}`);
        }}
      >
        {draft && `You have an ${typeLabel(draft.type).toLowerCase()} import saved at step ${draft.step} of 11. Starting a new import discards it.`}{" "}
        <Link href="/data-import/new" className="font-medium text-brand hover:underline">
          Resume it instead
        </Link>
      </ConfirmDialog>
    </Page>
  );
}
