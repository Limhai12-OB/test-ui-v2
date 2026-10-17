"use client";

import { useCallback, useEffect, useState } from "react";
import { useFinance } from "@/lib/finance-store";
import { seedHistory, type CleanupId, type ErrorId, type FieldId, type HistoryRow, type ImportTypeId, COLUMNS } from "@/lib/mock/import-data";
import { useSession } from "@/lib/session";

export type Source = "spreadsheet" | "pdf" | "photo";
export type DupChoice = "one" | "both" | "skip" | "keep" | "new";

export type FileInfo = { name: string; size: number; sample: boolean; sheets: string[]; rows: number | null; uploadedAt: string };
export type ReadFailure = { title: string; body: string };

/** Everything the wizard asks for, saved as a draft after each change ("Save and exit"). */
export type Draft = {
  step: number;
  reached: number;
  savedAt: string;
  type: ImportTypeId;
  source: Source;
  branchMode: "column" | string;
  dateOrder: "dmy" | "mdy";
  file: FileInfo | null;
  failure: ReadFailure | null;
  read: boolean;
  header: "first" | "none";
  leaveOutTotals: boolean;
  includedTotals: string[];
  mapping: Record<string, FieldId>;
  cleanups: Record<CleanupId, boolean>;
  dupChoices: Record<string, DupChoice>;
  /** Error rows: fixed value (or null while still open). */
  fixes: Partial<Record<ErrorId, string | null>>;
  thbRate: string;
  /** To-check rows the user accepted; changed rows hold the user's own value. */
  accepted: string[];
  changed: Record<string, string>;
  /** Row edits made in the review table. */
  edits: Record<string, { category?: string; branch?: string }>;
  checkedConfirm: boolean;
  emailSummary: boolean;
};

export const freshDraft = (type: ImportTypeId = "expenses", branch?: string): Draft => ({
  step: 1,
  reached: 1,
  savedAt: "",
  type,
  source: "spreadsheet",
  branchMode: branch ?? "column",
  dateOrder: "dmy",
  file: null,
  failure: null,
  read: false,
  header: "first",
  leaveOutTotals: true,
  includedTotals: [],
  mapping: Object.fromEntries(COLUMNS.map((c) => [c.letter, c.ai])),
  cleanups: { dates: true, amounts: true, suppliers: true, branches: true, categories: true },
  dupChoices: {},
  // AI fixed two of the four errors itself (frame 16.8).
  fixes: { vattanac: "1150", chipmong: "2026-02-28", thb: null, kampot: null },
  thbRate: "36.5",
  accepted: [],
  changed: {},
  edits: {},
  checkedConfirm: false,
  emailSummary: true,
});

/** The draft the design shows on the start page: "Expenses · step 6 of 11 · saved 18:20". */
const SEEDED_DRAFT = (): Draft => ({
  ...freshDraft(),
  step: 6,
  reached: 6,
  savedAt: "18:20",
  file: { name: "Expenses_Jan-Mar_2026.xlsx", size: 86 * 1024, sample: true, sheets: ["Jan", "Feb", "Mar"], rows: 214, uploadedAt: "Today, 18:02" },
  read: true,
});

const keys = (role: string) => ({ draft: `fs-import-draft-${role}`, history: `fs-import-history-${role}` });

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const clock = () => new Date().toTimeString().slice(0, 5);

/** Draft and history for the signed-in role, kept in localStorage. */
export function useImports() {
  const { user } = useSession();
  const { update } = useFinance();
  const role = user?.role ?? "owner";
  const branch = user?.branch ?? "Toul Kork";
  const k = keys(role);
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<Draft | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const storedDraft = read<Draft | null>(k.draft);
    // localStorage is only readable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftState(storedDraft === undefined ? (role === "owner" ? SEEDED_DRAFT() : null) : storedDraft);
    setHistory(read<HistoryRow[]>(k.history) ?? seedHistory(role, branch));
    setReady(true);
  }, [user, k.draft, k.history, role, branch]);

  const setDraft = useCallback(
    (next: Draft | null) => {
      setDraftState(next);
      write(k.draft, next);
    },
    [k.draft],
  );

  const saveHistory = useCallback(
    (next: HistoryRow[]) => {
      setHistory(next);
      write(k.history, next);
    },
    [k.history],
  );

  /** Writes the imported expenses to Financial Records and logs the import. */
  const commit = useCallback(
    (entry: HistoryRow, txns: Parameters<Parameters<typeof update>[0]>[0]["transactions"]) => {
      update((d) => {
        d.transactions.push(...txns);
      });
      saveHistory([entry, ...(read<HistoryRow[]>(k.history) ?? seedHistory(role, branch))]);
      setDraft(null);
    },
    [update, saveHistory, setDraft, k.history, role, branch],
  );

  const undo = useCallback(
    (id: string) => {
      const entry = history.find((h) => h.id === id);
      if (!entry?.ref) return;
      update((d) => {
        d.transactions = d.transactions.filter((t) => t.ref !== entry.ref);
      });
      saveHistory(history.map((h) => (h.id === id ? { ...h, status: "undone", note: `Undone · ${h.rows} records removed` } : h)));
    },
    [history, update, saveHistory],
  );

  return { ready, draft, setDraft, history, commit, undo, role, branch };
}
