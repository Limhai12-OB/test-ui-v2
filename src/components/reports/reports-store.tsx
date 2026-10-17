"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/overlay";
import { fmtDate, TODAY } from "@/lib/format";
import { buildReport, GENERATE_STEPS, MONTH_IDS, OCTOBER, type MonthId } from "@/lib/mock/reports-data";

/** How long the demo takes to "generate" a report (frame 12.4 says under a minute). */
export const GENERATE_MS = 9000;
const STORAGE_KEY = "fs-reports";

type Run = { at: string; checks: number };
type Gen = { startedAt?: number; startedLabel?: string; runs: Run[] };
type State = Partial<Record<MonthId, Gen>>;

export type GenerationView =
  | { state: "none" }
  | { state: "generating"; step: number; startedLabel: string; startedAt: number }
  | { state: "ready"; generatedAt: string; runs: Run[] };

type Ctx = {
  ready: boolean;
  view: (id: MonthId) => GenerationView;
  /** Months that have a report, newest first. */
  available: MonthId[];
  generating: MonthId | null;
  start: (id: MonthId) => void;
  cancel: (id: MonthId) => void;
};

const ReportsContext = createContext<Ctx | null>(null);

const clock = () => new Date().toTimeString().slice(0, 5);

/**
 * Report generation state for section 12. Kept in localStorage so the owner's
 * October report also shows up when a Branch Manager signs in on this browser.
 */
export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<State>({});
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // localStorage is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(JSON.parse(raw) as State);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const generating = (MONTH_IDS.find((id) => state[id]?.startedAt) as MonthId | undefined) ?? null;

  // Tick while a report is generating, then record the finished run.
  useEffect(() => {
    if (!generating) return;
    const startedAt = state[generating]!.startedAt!;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - startedAt < GENERATE_MS) return;
      const report = buildReport(generating);
      setState((s) => ({ ...s, [generating]: { runs: [{ at: `${fmtDate(TODAY)}, ${clock()}`, checks: report.checksPassed }, ...(s[generating]?.runs ?? [])] } }));
      toast({
        title: `${report.label} report is ready`,
        body: report.status === "complete" ? "All 12 checks passed." : `Marked Incomplete: ${report.checksPassed} of 12 checks passed.`,
      });
    }, 400);
    return () => clearInterval(timer);
  }, [generating, state, toast]);

  const view = useCallback(
    (id: MonthId): GenerationView => {
      const gen = state[id];
      if (gen?.startedAt) {
        const step = Math.min(GENERATE_STEPS.length - 1, Math.floor(((now - gen.startedAt) / GENERATE_MS) * GENERATE_STEPS.length));
        return { state: "generating", step: Math.max(0, step), startedLabel: gen.startedLabel ?? "", startedAt: gen.startedAt };
      }
      const runs = gen?.runs ?? [];
      if (runs.length) return { state: "ready", generatedAt: runs[0].at, runs };
      // Every month before October was generated before the demo starts.
      if (id !== OCTOBER) {
        const base = buildReport(id);
        return { state: "ready", generatedAt: base.generatedAt, runs: [{ at: base.generatedAt, checks: base.checksPassed }] };
      }
      return { state: "none" };
    },
    [state, now],
  );

  const start = useCallback((id: MonthId) => {
    const t = Date.now();
    setNow(t);
    setState((s) => ({ ...s, [id]: { runs: s[id]?.runs ?? [], startedAt: t, startedLabel: clock() } }));
  }, []);

  const cancel = useCallback((id: MonthId) => {
    setState((s) => ({ ...s, [id]: { runs: s[id]?.runs ?? [] } }));
  }, []);

  const available = useMemo(
    () => [...MONTH_IDS].reverse().filter((id) => id !== OCTOBER || (state[id]?.runs.length ?? 0) > 0 || state[id]?.startedAt),
    [state],
  );

  const value = useMemo(() => ({ ready, view, available, generating, start, cancel }), [ready, view, available, generating, start, cancel]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used inside <ReportsProvider>");
  return ctx;
}
