import { CLEANUPS, COLUMNS, FIELDS, SHEETS, sampleRows, THB_PER_USD, type BranchName, type Cur, type ErrorId, type FieldId, type ImportRow } from "@/lib/mock/import-data";
import type { Draft, DupChoice } from "./import-store";

export const STEP_LABELS = ["Data type", "Upload", "Read file", "AI extraction", "Map columns", "AI cleanup", "Duplicates", "Validation", "Review", "Confirm", "Result"];

export type FinalRow = ImportRow & { finalBranch: BranchName; finalCurrency: "USD" | "KHR"; finalAmount: number; finalDate: string; finalCategory: string; status: "ready" | "duplicate" | "error" };

export type ErrorItem = {
  id: ErrorId | `total-${string}`;
  where: string;
  supplier: string;
  sub: string;
  problem: string;
  fixed: string | null;
  inFile?: string;
};

export const TOTAL_ROWS = SHEETS.filter((s) => "totalRow" in s).map((s) => ({ id: `${s.id}-${(s as { totalRow: number }).totalRow}`, sheet: s.id, row: (s as { totalRow: number }).totalRow, text: (s as { total: string }).total }));

export const defaultDup = (row: ImportRow): DupChoice => (row.kind === "repeat" ? "one" : "keep");

/** Every number the wizard shows, derived from the draft so the steps always agree. */
export function compute(draft: Draft, managerBranch?: string) {
  const rows = sampleRows();
  const included = draft.leaveOutTotals ? draft.includedTotals : TOTAL_ROWS.map((t) => t.id);
  const expenseRows = 212 + included.length;
  const leftOutTotals = TOTAL_ROWS.filter((t) => !included.includes(t.id));

  // Step 5
  const mappedFields: FieldId[] = Object.values(draft.mapping).filter((f) => f !== "none");
  const required = FIELDS.filter((f) => f.required);
  const covered = required.filter((f) => mappedFields.includes(f.id));
  const doubled = FIELDS.filter((f) => f.id !== "none" && mappedFields.filter((m) => m === f.id).length > 1);
  const toCheckColumns = COLUMNS.filter((c) => c.confidence !== null && c.confidence < 90 && draft.mapping[c.letter] === c.ai);
  const mappingOk = covered.length === required.length && doubled.length === 0;

  // Step 6
  const applied = CLEANUPS.filter((c) => draft.cleanups[c.id]);
  const cellsChanged = applied.reduce((s, c) => s + c.cells, 0);
  const brokenByCleanup = (["dates", "amounts", "branches"] as const).filter((id) => !draft.cleanups[id]);

  // Step 7
  const dups = rows.filter((r) => r.dup);
  const choice = (r: ImportRow) => draft.dupChoices[r.id] ?? defaultDup(r);
  const skippedIds = new Set<string>();
  for (const r of dups) {
    const c = choice(r);
    if (c === "one" || c === "keep") skippedIds.add(r.id);
    if (c === "skip") {
      skippedIds.add(r.id);
      skippedIds.add(r.dup!.of);
    }
  }
  const afterDup = expenseRows - skippedIds.size;

  // Step 8
  const errors: ErrorItem[] = [
    { id: "vattanac", where: "Feb · row 20", supplier: "Vattanac Distribution", sub: "9 Feb 2026 · Siem Reap", problem: "The amount is missing.", fixed: draft.fixes.vattanac ? `amount set to $${Number(draft.fixes.vattanac).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : null, inFile: "the amount was missing" },
    { id: "chipmong", where: "Feb · row 66", supplier: "Chip Mong Retail Supply", sub: `28 Feb 2026 · ${managerBranch ?? "Battambang"}`, problem: "“31/02/2026” is a date that does not exist.", fixed: draft.fixes.chipmong ? `date set to ${fmtIso(draft.fixes.chipmong)}` : null, inFile: "“31/02/2026”, a date that does not exist" },
    { id: "thb", where: "Mar · row 27", supplier: "Bangkok Packaging Ltd", sub: `12 Mar 2026 · ${managerBranch ?? "Central Market"}`, problem: "Currency “THB” is not supported. LuyFlow records USD and KHR.", fixed: draft.fixes.thb ? `converted to $${(8400 / Number(draft.fixes.thb)).toFixed(2)} at ${draft.fixes.thb} THB per USD` : null },
    ...(managerBranch ? [] : [{ id: "kampot" as const, where: "Mar · row 55", supplier: "Kampot Pepper Farm", sub: "24 Mar 2026 · Kampot", problem: "Branch “Kampot” is deactivated and cannot receive new records.", fixed: draft.fixes.kampot ? `branch set to ${draft.fixes.kampot}` : null }]),
    ...TOTAL_ROWS.filter((t) => included.includes(t.id)).map((t) => ({ id: `total-${t.id}` as const, where: `${t.sheet} · row ${t.row}`, supplier: "Total row", sub: t.text, problem: "This looks like a total, not an expense. It has no supplier or date.", fixed: null })),
  ];
  const openErrors = errors.filter((e) => !e.fixed);
  const allErrors = errors.length + (brokenByCleanup.length ? 1 : 0);
  const checks = rows.filter((r) => r.check && !skippedIds.has(r.id));
  const acceptedChecks = checks.filter((r) => draft.accepted.includes(r.id) || draft.changed[r.id]);

  // Final rows
  const errorRowIds = new Set(rows.filter((r) => r.error && (r.error !== "kampot" || !managerBranch)).map((r) => r.id));
  const final: FinalRow[] = rows.map((r) => {
    const edit = draft.edits[r.id] ?? {};
    let currency = r.currency;
    let amount = r.amount;
    let date = r.date;
    let branch: BranchName = managerBranch ? (managerBranch as BranchName) : r.branch;
    if (r.error === "thb" && draft.fixes.thb) {
      amount = Math.round((8400 / Number(draft.fixes.thb)) * 100) / 100;
      currency = "USD";
    }
    if (r.error === "kampot" && draft.fixes.kampot) branch = draft.fixes.kampot as BranchName;
    if (r.check && draft.changed[r.id]) {
      if (r.check.kind === "currency") currency = draft.changed[r.id] as Cur;
      else date = draft.changed[r.id];
    }
    if (edit.branch && !managerBranch) branch = edit.branch as BranchName;
    const isError = errorRowIds.has(r.id) && !errors.find((e) => e.id === r.error)?.fixed;
    return {
      ...r,
      finalBranch: branch,
      finalCurrency: currency === "THB" ? "USD" : currency,
      finalAmount: amount,
      finalDate: date,
      finalCategory: edit.category ?? r.category,
      status: skippedIds.has(r.id) ? "duplicate" : isError ? "error" : "ready",
    };
  });
  const ready = final.filter((r) => r.status === "ready");
  const sum = (c: "USD" | "KHR") => ready.filter((r) => r.finalCurrency === c).reduce((s, r) => s + r.finalAmount, 0);
  const count = (c: "USD" | "KHR") => ready.filter((r) => r.finalCurrency === c).length;
  const branches = ready.reduce<Record<string, number>>((m, r) => ((m[r.finalBranch] = (m[r.finalBranch] ?? 0) + 1), m), {});
  const dates = ready.map((r) => r.finalDate).sort();
  const edited = acceptedChecks.length + errors.filter((e) => e.fixed && (e.id === "thb" || e.id === "kampot")).length + Object.keys(draft.edits).length;
  const months = new Set(ready.map((r) => r.finalDate.slice(0, 7)));
  const leftOut = final.filter((r) => r.status === "error").length + included.length;

  return {
    rows,
    included,
    leftOutTotals,
    expenseRows,
    mapped: mappedFields.length,
    covered,
    required,
    doubled,
    toCheckColumns,
    mappingOk,
    applied,
    cellsChanged,
    brokenByCleanup,
    dups,
    choice,
    skipped: skippedIds.size,
    repeatedSkipped: dups.filter((r) => r.kind === "repeat" && skippedIds.has(r.id)).length,
    existingSkipped: dups.filter((r) => r.kind === "existing" && skippedIds.has(r.id)).length,
    afterDup,
    errors,
    openErrors,
    allErrors,
    checks,
    acceptedChecks,
    final,
    ready,
    leftOut,
    usd: { total: sum("USD"), rows: count("USD") },
    khr: { total: sum("KHR"), rows: count("KHR") },
    branches,
    period: { from: dates[0], to: dates[dates.length - 1] },
    edited,
    marchCount: ready.filter((r) => r.finalDate.startsWith("2026-03")).length,
    months: months.size,
    newSuppliers: draft.cleanups.suppliers ? (openErrors.some((e) => e.id === "thb") ? 3 : 4) : 9,
    blocked: brokenByCleanup.length > 0,
  };
}

export type Computed = ReturnType<typeof compute>;

const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${M[m - 1]} ${y}`;
}

export const THB_DEFAULT = THB_PER_USD;
