"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, CircleCheck, CopyCheck, FileText, Info, Landmark, Lock, TriangleAlert } from "lucide-react";
import { AccountAvatar, FileDrop, FileTile, formatBytes } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectField } from "@/components/ui/fields";
import { Stepper } from "@/components/ui/flow";
import { Notice, Page, PageHeader, ScopeNotice } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/format";
import type { Provider } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

export const IMPORT_STEPS = ["Upload statement", "AI categorisation", "Review and fix", "Reconcile"];

type FileState =
  | { kind: "none" }
  | { kind: "uploading" | "ready"; name: string; size: number; rows: number | null; sample: boolean }
  | { kind: "error"; name: string; message: string };

const PROVIDERS: { id: Provider; name: string }[] = [
  { id: "ABA", name: "ABA Bank" },
  { id: "ACLEDA", name: "ACLEDA Bank" },
  { id: "Wing", name: "Wing" },
];

const PERIODS = [
  { value: "2026-10", label: "1–31 Oct 2026" },
  { value: "2026-09", label: "1–30 Sep 2026" },
];

/** Frame 06.7 "Import Bank Statement": empty, validated and unsupported-file states. */
export function ImportStatement() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const isManager = user?.role === "manager";
  const preset = state.accounts.find((a) => a.id === params.get("account"));
  const [provider, setProvider] = useState<Provider>(preset?.provider ?? (isManager ? "Wing" : "ABA"));
  const accounts = state.accounts.filter((a) => a.provider === provider && a.status === "active");
  const [accountId, setAccountId] = useState(preset?.id ?? (isManager ? "wing-merchant-khr" : "aba-operating-khr"));
  const [period, setPeriod] = useState("2026-10");
  const [file, setFile] = useState<FileState>({ kind: "none" });
  const [blocked, setBlocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const account = state.accounts.find((a) => a.id === accountId) ?? accounts[0];
  const signedOff = state.recons.some((r) => r.accountId === account?.id && r.period === period && r.status === "signed");
  const isDemo = account?.id === state.review.accountId && period === "2026-10";

  const chooseProvider = (next: Provider) => {
    setProvider(next);
    setAccountId(state.accounts.find((a) => a.provider === next && a.status === "active")?.id ?? "");
    setFile({ kind: "none" });
    setBlocked(false);
  };

  const onFile = async (picked: File) => {
    setBlocked(false);
    const ext = picked.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx"].includes(ext ?? "")) {
      setFile({ kind: "error", name: picked.name, message: `${(ext ?? "This file").toUpperCase()} is not supported. Upload a CSV or Excel (.xlsx) file.` });
      return;
    }
    if (picked.size > 10 * 1024 * 1024) {
      setFile({ kind: "error", name: picked.name, message: "The file is larger than 10 MB. Export a shorter period." });
      return;
    }
    // Real check: count the data rows of a CSV in the browser. Excel files are counted by the import service.
    const rows = ext === "csv" ? Math.max(0, (await picked.text()).split(/\r?\n/).filter((line) => line.trim()).length - 1) : null;
    setFile({ kind: "uploading", name: picked.name, size: picked.size, rows, sample: false });
    timer.current = setTimeout(() => setFile((f) => (f.kind === "uploading" ? { ...f, kind: "ready" } : f)), 1200);
  };

  const useSample = () => {
    const sample = state.review;
    setFile({ kind: "uploading", name: sample.file, size: isManager ? 21 * 1024 : 48 * 1024, rows: sample.read, sample: true });
    timer.current = setTimeout(() => setFile((f) => (f.kind === "uploading" ? { ...f, kind: "ready" } : f)), 1200);
  };

  const ready = file.kind === "ready" && !signedOff;
  const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? provider;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: "Import statement" }]}
        title="Import bank statement"
        subtitle={`Upload a CSV or Excel export from ${isManager ? "Wing" : "ABA, ACLEDA or Wing"}. AI reads the lines and suggests categories for you to review.`}
      />
      {isManager && <ScopeNotice branch={user?.branch} className="mt-6" />}
      <Stepper className="mt-6" steps={IMPORT_STEPS.map((label, i) => ({ label, state: i === 0 ? "active" : "todo" }))} />

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card aria-labelledby="details-title">
          <CardHeader title="1 · Statement details" titleId="details-title" />
          <div className="flex flex-col gap-5 p-5">
            <fieldset>
              <legend className="mb-2 text-sm leading-5 font-medium text-fg">Bank or wallet</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {PROVIDERS.map((p) => {
                  const locked = isManager && p.id !== "Wing";
                  const selected = provider === p.id;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "relative flex min-h-[70px] items-center gap-3 rounded-[10px] px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                        locked ? "cursor-not-allowed border border-line bg-subtle" : "cursor-pointer",
                        !locked && (selected ? "border-2 border-primary bg-primary-subtle/60 px-[15px]" : "border border-line bg-surface hover:border-line-strong"),
                      )}
                    >
                      <AccountAvatar provider={p.id} muted={locked} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[15px] leading-[22px] font-semibold", locked ? "text-body" : "text-fg")}>{p.name}</span>
                        <span className="block text-xs leading-4 text-muted">{locked ? "Managed by the Business Owner" : "CSV or Excel"}</span>
                      </span>
                      {locked ? (
                        <Lock size={16} className="shrink-0 text-icon" aria-label="Not available" />
                      ) : (
                        <input
                          type="radio"
                          name="provider"
                          checked={selected}
                          onChange={() => chooseProvider(p.id)}
                          className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary"
                        />
                      )}
                      {locked && <input type="radio" name="provider" disabled className="sr-only" aria-label={`${p.name} (managed by the Business Owner)`} />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Account"
                icon={Landmark}
                value={account?.id ?? ""}
                onChange={(event) => setAccountId(event.target.value)}
                options={accounts.length ? accounts.map((a) => ({ value: a.id, label: `${a.name} •••• ${a.last4}` })) : [{ value: "", label: `No active ${providerName} account` }]}
              />
              <SelectField
                label="Statement period"
                icon={CalendarDays}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                state={signedOff ? "error" : "default"}
                message={signedOff ? "This period is signed off and locked. Choose a later period." : undefined}
                options={PERIODS}
              />
            </div>
            <div>
              <p className="mb-2 text-sm leading-5 font-medium text-fg">Statement file</p>
              {file.kind === "none" && (
                <>
                  <FileDrop accept=".csv,.xlsx,.pdf" hint="CSV or Excel (.xlsx) · up to 10 MB" onFile={onFile} label="Choose a statement file" />
                  {isDemo && (
                    <p className="mt-3 text-[13px] leading-5 text-muted">
                      No file at hand?{" "}
                      <button type="button" onClick={useSample} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
                        Use the sample {state.review.file}
                      </button>
                    </p>
                  )}
                </>
              )}
              {(file.kind === "uploading" || file.kind === "ready") && (
                <div className="rounded-lg border border-success/30 bg-success-subtle p-4">
                  <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                    <FileTile />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-5 font-medium text-fg">{file.name}</p>
                      <p className="text-xs leading-4 text-muted">
                        {file.rows !== null ? `${file.rows} rows · ` : ""}
                        {formatBytes(file.size)} · {file.kind === "uploading" ? "uploading…" : "uploaded"}
                      </p>
                    </div>
                    <button type="button" onClick={() => setFile({ kind: "none" })} className="focus-ring cursor-pointer rounded-xs px-2 text-sm font-medium text-brand hover:underline">
                      Replace
                    </button>
                    {file.kind === "ready" ? (
                      <CircleCheck size={20} className="text-icon-success" aria-label="Uploaded" />
                    ) : (
                      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-success/30 border-t-success" />
                    )}
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-success-fg" role="status">
                    {file.kind === "uploading" ? "Uploading… keep this page open." : "Uploaded. Check the results below, then continue."}
                  </p>
                </div>
              )}
              {file.kind === "error" && (
                <div className="rounded-lg border border-dashed border-error/50 bg-error-subtle p-4" role="alert">
                  <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                    <FileTile tone="error" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-5 font-medium text-fg">{file.name}</p>
                      <p className="text-xs leading-4 text-error-fg">{file.message}</p>
                    </div>
                    <button type="button" onClick={() => setFile({ kind: "none" })} className="focus-ring cursor-pointer rounded-xs px-2 text-sm font-medium text-brand hover:underline">
                      Replace
                    </button>
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-error-fg">Nothing was imported. Export the statement as CSV or Excel from {providerName}, then choose Replace.</p>
                </div>
              )}
            </div>
            {file.kind === "ready" && (
              <div className="rounded-lg bg-subtle p-4">
                <p className="text-sm leading-5 font-medium text-fg">File check</p>
                <ul className="mt-2.5 flex flex-col gap-2 text-sm leading-5 text-body">
                  {file.sample ? (
                    <>
                      <Check ok>{`${file.rows} rows found · ${PERIODS.find((p) => p.value === period)?.label}`}</Check>
                      <Check ok>Currency KHR matches the selected account</Check>
                      <Check ok>{isManager ? "Opening balance ៛11,480,000 matches the September closing balance" : "Opening balance ៛79,860,000 matches the September closing balance"}</Check>
                      <Check>{isManager ? "1 row looks like a duplicate of another line. It will be flagged, not posted" : "3 rows look like duplicates of lines already imported. They will be flagged, not posted"}</Check>
                    </>
                  ) : (
                    <>
                      <Check ok>{file.rows !== null ? `${file.rows} rows found` : "Excel file received · rows are counted when it is read"}</Check>
                      <Check ok>File type and size are supported</Check>
                      <li className="flex gap-2.5 text-muted">
                        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
                        Currency, balance and duplicate checks need the import service, which is not connected in this demo.
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
            {blocked && (
              <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="This file cannot be read in the demo">
                AI categorisation runs on the import service, which is not connected yet. Use the sample statement for {state.review.file.replace(/_.*/, "")} to try the review step.
              </Notice>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="before-title">
            <CardHeader title="Before you upload" titleId="before-title" />
            <ul className="flex flex-col gap-4 p-5">
              {[
                [<FileText key="i" size={18} aria-hidden />, "Use the bank’s own export", "CSV or Excel (.xlsx), up to 10 MB."],
                [<CalendarDays key="i" size={18} aria-hidden />, "One period per file", "Must not overlap a signed-off period."],
                [<CopyCheck key="i" size={18} aria-hidden />, "Duplicates are caught", "Lines already in LuyFlow are left out."],
              ].map(([icon, title, sub]) => (
                <li key={String(title)} className="flex gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-subtle text-brand">{icon}</span>
                  <span>
                    <span className="block text-sm leading-5 font-medium text-fg">{title}</span>
                    <span className="block text-xs leading-4 text-muted">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card aria-labelledby="connected-title" className="flex-1">
            <CardHeader title={isManager ? "Connected services" : "Connected instead?"} titleId="connected-title" />
            <div className="p-5 text-sm leading-[22px] text-muted">
              <p>Shopify and WeBill365 sync automatically. {isManager ? "They are managed by the Business Owner." : "Bank statements are imported by file."}</p>
              {!isManager && (
                <Link href="/integrations" className="focus-ring mt-3 inline-flex items-center gap-1 rounded-xs font-medium text-brand hover:underline">
                  View integrations <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => router.push("/banking")}>
          Cancel
        </Button>
        <Button
          iconRight={ArrowRight}
          disabled={!ready}
          onClick={() => {
            if (file.kind === "ready" && file.sample && isDemo) router.push("/banking/import/review");
            else setBlocked(true);
          }}
        >
          Continue to AI categorisation
        </Button>
      </div>
    </Page>
  );
}

function Check({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      {ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-icon-success" aria-label="Passed" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-icon-warning" aria-label="Warning" />}
      {children}
    </li>
  );
}
