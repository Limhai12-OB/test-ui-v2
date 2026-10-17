"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Calculator, CalendarCheck, CircleCheck, Clock3, Download, Eye, Info, Scale, Send, TriangleAlert, Undo2, ArrowDownRight } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Stepper, Timeline } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { REVIEW_STATUS, tillVariance, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, fmtDate, fmtDay, fmtLongDate, money, num, signed, TODAY } from "@/lib/format";
import { BRANCH_NAMES } from "@/lib/mock/finance-data";
import type { TillRecord } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { toTimeline } from "./bill-detail";
import { RecordsHeader } from "./records-shared";
import { ReturnDialog, SignOffDialog } from "./signoff";

const usdVar = (v: number) => (v === 0 ? "$0.00" : money(v, "USD", { sign: true }));
const khrVar = (v: number) => (v === 0 ? "៛0" : money(v, "KHR", { sign: true }));

/** Frame 10.9 "Till Balancing — Business Owner list" (and the Branch Manager's own list). */
export function TillList() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string | null>("2026-10");
  const [branch, setBranch] = useState<string | null>(null);
  const [variance, setVariance] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const tills = state.tills;
  const counts = { submitted: 0, returned: 0, signed: 0, draft: 0 };
  tills.forEach((t) => counts[t.status]++);
  const awaiting = tills.filter((t) => t.status === "submitted");
  const varianceTotal = tills.reduce((s, t) => s + tillVariance(t).usd, 0);
  const notSubmitted = isManager
    ? tills.filter((t) => t.date === TODAY && (t.status === "draft" || t.status === "returned")).map((t) => t.branch)
    : BRANCH_NAMES.filter((b) => !tills.some((t) => t.date === TODAY && t.branch === b && t.status !== "draft"));

  const rows = useMemo(() => {
    const list = tills.filter((t) => {
      const v = tillVariance(t);
      return (
        t.status !== "draft" &&
        (tab === "all" || t.status === tab) &&
        (!query || `${t.branch} ${t.countedBy}`.toLowerCase().includes(query.toLowerCase())) &&
        (!month || t.date.startsWith(month)) &&
        (!branch || t.branch === branch) &&
        (!variance || (variance === "with" ? v.usd !== 0 || v.khr !== 0 : v.usd === 0 && v.khr === 0))
      );
    });
    return sort.dir === "desc" ? list : [...list].reverse();
  }, [tills, tab, query, month, branch, variance, sort]);
  const { current, slice } = paginate(rows, page, 8);

  return (
    <Page>
      <RecordsHeader
        actions={
          isManager ? (
            <Button icon={Calculator} onClick={() => router.push("/financial-records/till/count")}>
              Balance today’s till
            </Button>
          ) : undefined
        }
      />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard
          label={isManager ? "Waiting for sign-off" : "Awaiting your sign-off"}
          icon={<CircleCheck size={16} aria-hidden />}
          value={String(awaiting.length)}
          lines={[awaiting.length ? `${awaiting.map((t) => t.branch).join(" and ")} · ${fmtDay(awaiting[0].date)}` : "Nothing waiting"]}
        />
        <StatCard
          label="Not submitted today"
          icon={<Clock3 size={16} aria-hidden />}
          value={String(notSubmitted.length)}
          lines={[notSubmitted.length ? `${notSubmitted.join(", ")} · due by 18:00` : "Every till is counted"]}
        />
        <StatCard
          label="Variance · October"
          icon={<Scale size={16} aria-hidden />}
          value={money(varianceTotal, "USD")}
          unit="USD"
          lines={[
            <span key="d" className="flex items-center gap-2">
              <span className="inline-flex h-[22px] items-center gap-0.5 rounded-sm bg-success-subtle px-1.5 text-xs font-medium text-success-fg">
                <ArrowDownRight size={12} aria-hidden />6
              </span>
              fewer days with a variance
            </span>,
          ]}
        />
        <StatCard label="Days signed off" icon={<CalendarCheck size={16} aria-hidden />} value={String(counts.signed)} unit={`of ${isManager ? 31 : 124}`} lines={[`${((counts.signed / (isManager ? 31 : 124)) * 100).toFixed(1)}% of October till days`]} />
      </div>

      {!isManager && (
        <Notice
          tone="info"
          className="mt-6"
          icon={<Info size={18} aria-hidden />}
          title="Who counts and who signs off"
          action={
            <button type="button" onClick={() => router.push("/financial-records/till/count?branch=Central%20Market")} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-info-fg hover:underline">
              Balance Central Market till
            </button>
          }
        >
          Branch Managers count their till and submit it by 18:00; you sign each count off or return it. Central Market is owner-managed, so a count you enter there is signed off when you save it.
        </Notice>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Till records">
        <Tabs
          label="Till status"
          className="px-5 pt-1"
          value={tab}
          onChange={(id) => {
            setTab(id);
            setPage(1);
          }}
          items={[
            { id: "all", label: "All", count: tills.filter((t) => t.status !== "draft").length },
            { id: "submitted", label: "Submitted", count: counts.submitted },
            { id: "returned", label: "Returned", count: counts.returned },
            { id: "signed", label: "Signed Off", count: counts.signed },
          ]}
        />
        <FilterBar
          className="border-b border-line"
          onExport={() =>
            downloadCsv("till-balancing.csv", [
              ["Date", "Branch", "Counted by", "Counted USD", "Counted KHR", "Variance USD", "Variance KHR", "Status"],
              ...rows.map((t) => [t.date, t.branch, t.countedBy, t.usd ?? "", t.khr ?? "", tillVariance(t).usd, tillVariance(t).khr, REVIEW_STATUS[t.status].label]),
            ])
          }
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search branch or manager" />
          <FilterMenu label="Date" icon="calendar" value={month} onChange={setMonth} options={[{ value: "2026-10", label: "October 2026" }]} />
          {!isManager && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCH_NAMES.map((b) => ({ value: b, label: b }))} />}
          <FilterMenu
            label="Variance"
            value={variance}
            onChange={setVariance}
            options={[
              { value: "with", label: "With a variance" },
              { value: "none", label: "No variance" },
            ]}
          />
        </FilterBar>
        <DataTable
          caption="Till records"
          rows={slice}
          rowKey={(t) => t.id}
          sort={sort}
          sortable={["date"]}
          onSort={setSort}
          onRowClick={(t) => router.push(`/financial-records/till/${t.id}`)}
          minWidth={980}
          empty="No till records match these filters."
          columns={[
            { key: "date", header: "Date", width: "120px", cell: (t) => <span className="whitespace-nowrap text-muted">{fmtDate(t.date)}</span> },
            { key: "branch", header: "Branch", cell: (t) => <TwoLine title={t.branch} titleClassName="font-normal" sub={`Counted by ${t.countedBy}`} /> },
            { key: "usd", header: "Counted USD", align: "right", width: "130px", cell: (t) => <span className="tabular text-fg">{money(t.usd ?? 0, "USD")}</span> },
            { key: "khr", header: "Counted KHR", align: "right", width: "130px", cell: (t) => <span className="tabular text-fg">{money(t.khr ?? 0, "KHR")}</span> },
            { key: "vusd", header: "Variance USD", align: "right", width: "120px", cell: (t) => <span className={cn("tabular", tillVariance(t).usd < 0 ? "text-error-fg" : tillVariance(t).usd > 0 ? "text-warning-fg" : "text-fg")}>{usdVar(tillVariance(t).usd)}</span> },
            { key: "vkhr", header: "Variance KHR", align: "right", width: "120px", cell: (t) => <span className={cn("tabular", tillVariance(t).khr < 0 ? "text-error-fg" : tillVariance(t).khr > 0 ? "text-warning-fg" : "text-fg")}>{khrVar(tillVariance(t).khr)}</span> },
            { key: "status", header: "Status", width: "140px", cell: (t) => <StatusPill tone={REVIEW_STATUS[t.status].tone}>{REVIEW_STATUS[t.status].label}</StatusPill> },
            {
              key: "action",
              header: "Action",
              srHeader: true,
              width: "104px",
              cell: (t) =>
                t.status === "submitted" && !isManager ? (
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/financial-records/till/${t.id}`)}>
                    Review
                  </Button>
                ) : (
                  <button type="button" onClick={() => router.push(`/financial-records/till/${t.id}`)} aria-label={`View ${t.branch} ${fmtDate(t.date)}`} className="focus-ring ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg">
                    <Eye size={16} aria-hidden />
                  </button>
                ),
            },
          ]}
          mobileRow={(t) => (
            <MobileRow
              title={`${t.branch} · ${fmtDay(t.date)}`}
              sub={`${money(t.usd ?? 0, "USD")} · ${money(t.khr ?? 0, "KHR")}`}
              value={<StatusPill tone={REVIEW_STATUS[t.status].tone}>{REVIEW_STATUS[t.status].label}</StatusPill>}
              valueSub={tillVariance(t).usd || tillVariance(t).khr ? `${usdVar(tillVariance(t).usd)} · ${khrVar(tillVariance(t).khr)}` : "No variance"}
            />
          )}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="till records" onPage={setPage} />
      </section>
    </Page>
  );
}

/** Frames 10.9 "Branch Manager counts the till" and "Submitted". */
export function TillCount() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const isManager = user?.role === "manager";
  const branch = isManager ? user!.branch! : params.get("branch") ?? "Central Market";
  const record = state.tills.find((t) => t.date === TODAY && t.branch === branch);
  const ownerManaged = !isManager && branch === "Central Market";

  useEffect(() => {
    if (record && (record.status === "signed" || (!isManager && record.status === "submitted"))) router.replace(`/financial-records/till/${record.id}`);
  }, [record, isManager, router]);

  const expected = record ? { usd: record.expectedUsd, khr: record.expectedKhr } : { usd: 1940, khr: 2260000 };
  const [usd, setUsd] = useState(record?.usd !== null && record?.usd !== undefined ? num(record.usd, "USD") : "");
  const [khr, setKhr] = useState(record?.khr !== null && record?.khr !== undefined ? num(record.khr, "KHR") : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [counter, setCounter] = useState(false);
  const [noteError, setNoteError] = useState<string>();
  const counted = { usd: usd === "" ? null : Number(usd.replace(/,/g, "")), khr: khr === "" ? null : Number(khr.replace(/,/g, "")) };
  const vUsd = counted.usd === null ? null : Math.round((counted.usd - expected.usd) * 100) / 100;
  const vKhr = counted.khr === null ? null : counted.khr - expected.khr;
  const hasVariance = (vUsd ?? 0) !== 0 || (vKhr ?? 0) !== 0;
  const movements = record?.movements ?? [];
  const submitted = record?.status === "submitted";
  const managerName = isManager ? user!.name : "Sokha Chan";

  const persist = (status: TillRecord["status"]) => {
    update((draft) => {
      let target = draft.tills.find((t) => t.date === TODAY && t.branch === branch);
      if (!target) {
        target = { id: `till-${branch.toLowerCase().replace(/ /g, "-")}-${TODAY}`, date: TODAY, branch, countedBy: managerName, usd: null, khr: null, expectedUsd: expected.usd, expectedKhr: expected.khr, status: "draft", notes: "", history: [], movements: [] };
        draft.tills.unshift(target);
      }
      target.usd = counted.usd;
      target.khr = counted.khr;
      target.notes = notes.trim();
      target.status = status;
      if (status === "submitted") {
        target.submittedAt = "31 Oct 2026, 17:52";
        target.returnReason = undefined;
        target.history.unshift({ kind: "submit", title: "Submitted for sign-off", meta: `${managerName} · 31 Oct 2026, 17:52` });
      }
      if (status === "signed") {
        target.submittedAt = "31 Oct 2026, 17:52";
        target.history.unshift({ kind: "signed", title: "Counted and signed off by Business Owner", meta: "Sokha Chan · 31 Oct 2026, 17:52" });
      }
      if (!target.history.some((h) => h.kind === "start")) target.history.push({ kind: "start", title: "Count started", meta: `${managerName} · 31 Oct 2026, 17:44` });
    });
  };

  const submit = () => {
    if (counted.usd === null || counted.khr === null) return setNoteError("Enter both counted amounts first.");
    if (hasVariance && notes.trim().length < 5) return setNoteError("Explain the difference before you submit.");
    setNoteError(undefined);
    persist(ownerManaged ? "signed" : "submitted");
    toast(ownerManaged ? { title: "Till signed off", body: `${branch} is balanced for ${fmtDay(TODAY)}.` } : { title: "Submitted for sign-off", body: "Sokha Chan has been notified." });
    if (ownerManaged) router.push("/financial-records/till");
  };

  const steps = [
    { label: "Count the cash", sub: managerName, state: submitted ? ("done" as const) : ("active" as const) },
    { label: "Submit", sub: submitted ? "Today, 17:52" : "Before 18:00", state: submitted ? ("done" as const) : ("todo" as const) },
    { label: ownerManaged ? "Signed off on save" : "Owner sign-off", sub: "Sokha Chan", state: submitted ? ("active" as const) : ("todo" as const) },
  ];

  const status = record?.status ?? "draft";
  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Till balancing", href: "/financial-records/till" },
          { label: fmtDate(TODAY) },
        ]}
        title="Balance the till"
        badges={<StatusPill tone={REVIEW_STATUS[status].tone}>{REVIEW_STATUS[status].label}</StatusPill>}
        subtitle={`Cash till · ${branch} · ${fmtLongDate(TODAY)}`}
        actions={
          submitted ? (
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  persist(status === "returned" ? "returned" : "draft");
                  toast({ title: "Draft saved", body: "You can finish the count later today." });
                }}
              >
                Save draft
              </Button>
              <Button icon={Send} onClick={submit}>
                {ownerManaged ? "Save and sign off" : status === "returned" ? "Resubmit for sign-off" : "Submit for sign-off"}
              </Button>
            </>
          )
        }
      />
      <Stepper className="mt-6" steps={steps} doneTone="success" />
      {submitted && (
        <Notice tone="success" className="mt-6" icon={<CircleCheck size={18} aria-hidden />} title="Submitted to Sokha Chan for sign-off">
          You will be notified when it is signed off or returned. The count is locked while it is being reviewed.
        </Notice>
      )}
      {status === "returned" && record?.returnReason && (
        <Notice tone="warning" className="mt-6" icon={<TriangleAlert size={18} aria-hidden />} title="Returned by Sokha Chan">
          “{record.returnReason}” Correct the count and submit it again.
        </Notice>
      )}

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Card aria-labelledby="count-title">
            <CardHeader title={submitted ? "Cash counted in the till" : "Count the cash in the till"} titleId="count-title" subtitle={submitted ? `Submitted by ${managerName} · ${record?.submittedAt}` : "Enter what is physically in the drawer, in each currency."} />
            <div className="flex flex-col gap-5 p-5">
              {submitted ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {[
                      ["Counted USD", money(counted.usd ?? 0, "USD"), `Expected ${money(expected.usd, "USD")}`],
                      ["Counted KHR", money(counted.khr ?? 0, "KHR"), `Expected ${money(expected.khr, "KHR")}`],
                    ].map(([label, value, sub]) => (
                      <div key={label}>
                        <p className="text-[13px] text-muted">{label}</p>
                        <p className="text-[22px] leading-8 font-semibold text-fg">{value}</p>
                        <p className="text-xs text-muted">{sub}</p>
                      </div>
                    ))}
                  </div>
                  {notes && (
                    <div>
                      <p className="text-[13px] text-muted">Closing notes</p>
                      <p className="mt-1 text-sm leading-[22px] text-fg">{notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CountInput label="Counted USD" currency="USD" value={usd} onChange={setUsd} hint={`Expected ${money(expected.usd, "USD")}`} />
                    <CountInput label="Counted KHR" currency="KHR" value={khr} onChange={setKhr} hint={`Expected ${money(expected.khr, "KHR")}`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-subtle px-4 py-3">
                    <Calculator size={18} className="text-icon" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">Count by note</p>
                      <p className="text-xs text-muted">Enter how many of each note you have and LuyFlow adds them up.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setCounter(true)}>
                      Open counter
                    </Button>
                  </div>
                  <TextAreaField
                    label="Closing notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setNoteError(undefined);
                    }}
                    state={noteError ? "error" : "default"}
                    message={noteError ?? (hasVariance ? "Required when there is a variance." : "Optional when the till balances.")}
                    placeholder="Explain any difference between expected and counted cash."
                  />
                </>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden" aria-labelledby="expected-title">
            <CardHeader title="How the expected amount is calculated" titleId="expected-title" divided />
            <DataTable
              caption="Cash movements today"
              rows={[...movements, { time: "", label: "Expected in till", sub: "", usd: expected.usd, khr: expected.khr, total: true }]}
              rowKey={(m) => m.label}
              minWidth={480}
              columns={[
                { key: "label", header: "Movement today", cell: (m) => <span className={cn("text-sm", "total" in m ? "font-semibold text-fg" : "text-fg")}>{m.label}</span> },
                { key: "usd", header: "USD", align: "right", width: "150px", cell: (m) => <span className={cn("tabular", "total" in m ? "font-semibold text-fg" : m.usd > 0 && m.label !== "Opening float" ? "text-success-fg" : "text-fg")}>{"total" in m || m.label === "Opening float" ? num(m.usd, "USD") : m.usd === 0 ? "0.00" : signed(m.usd, "USD")}</span> },
                { key: "khr", header: "KHR", align: "right", width: "150px", cell: (m) => <span className={cn("tabular", "total" in m ? "font-semibold text-fg" : m.khr > 0 && m.label !== "Opening float" ? "text-success-fg" : "text-fg")}>{"total" in m || m.label === "Opening float" ? num(m.khr, "KHR") : m.khr === 0 ? "0" : signed(m.khr, "KHR")}</span> },
              ]}
              mobileRow={(m) => <MobileRow title={m.label} value={num(m.usd, "USD")} valueSub={num(m.khr, "KHR")} />}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="variance-title">
            <CardHeader title="Variance" titleId="variance-title" />
            <div className="flex flex-col gap-4 p-5">
              <VarianceBox currency="USD" expected={expected.usd} counted={counted.usd} />
              <VarianceBox currency="KHR" expected={expected.khr} counted={counted.khr} />
              <p className="flex gap-2 text-xs leading-4 text-muted">
                <Info size={14} className="shrink-0" aria-hidden />
                Net difference ≈ {money((vUsd ?? 0) + (vKhr ?? 0) / 4100, "USD")} after converting KHR at 4,100 per USD.
              </p>
            </div>
          </Card>
          {!submitted && (
            <div className="flex gap-3 rounded-lg border border-line bg-muted-bg/60 px-4 py-3">
              <Info size={18} className="mt-0.5 shrink-0 text-icon" aria-hidden />
              <div className="text-[13px] leading-5 text-body">
                <p className="font-medium text-fg">Who signs off?</p>
                {ownerManaged ? "Central Market is owner-managed, so your count is signed off when you save it." : "You submit the count. Only the Business Owner can sign it off or return it for changes."}
              </div>
            </div>
          )}
        </div>
      </div>
      <NoteCounter open={counter} onClose={() => setCounter(false)} onApply={(u, k) => (setUsd(num(u, "USD")), setKhr(num(k, "KHR")))} />
    </Page>
  );
}

function CountInput({ label, currency, value, onChange, hint }: { label: string; currency: "USD" | "KHR"; value: string; onChange: (v: string) => void; hint: string }) {
  const id = `count-${currency}`;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm font-medium text-fg">
        {label}
      </label>
      <div className="flex h-12 overflow-hidden rounded-md border border-icon-subtle bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <span className="inline-flex items-center border-r border-line bg-subtle px-3 text-[13px] font-medium text-fg">{currency}</span>
        <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} aria-describedby={`${id}-hint`} className="tabular min-w-0 flex-1 bg-transparent px-3 text-right text-[15px] font-normal text-fg outline-none" />
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
        {hint}
      </p>
    </div>
  );
}

function VarianceBox({ currency, expected, counted }: { currency: "USD" | "KHR"; expected: number; counted: number | null }) {
  const diff = counted === null ? null : Math.round((counted - expected) * 100) / 100;
  const state = diff === null ? "empty" : diff < 0 ? "short" : diff > 0 ? "over" : "balanced";
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-fg">{currency}</p>
        {state !== "empty" && <StatusPill tone={state === "short" ? "error" : state === "over" ? "warning" : "success"}>{state === "short" ? "Short" : state === "over" ? "Over" : "Balanced"}</StatusPill>}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <dt className="text-muted">Expected</dt>
          <dd className="mt-0.5 text-[15px] text-fg">{money(expected, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted">Counted</dt>
          <dd className="mt-0.5 text-[15px] text-fg">{counted === null ? "—" : money(counted, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted">Difference</dt>
          <dd className={cn("mt-0.5 text-[15px] font-semibold", state === "short" ? "text-error-fg" : state === "over" ? "text-warning-fg" : "text-fg")}>{diff === null ? "—" : currency === "USD" ? usdVar(diff) : khrVar(diff)}</dd>
        </div>
      </dl>
    </div>
  );
}

const USD_NOTES = [100, 50, 20, 10, 5, 1];
const KHR_NOTES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 100];

function NoteCounter({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (usd: number, khr: number) => void }) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const total = (cur: "USD" | "KHR") => (cur === "USD" ? USD_NOTES : KHR_NOTES).reduce((s, n) => s + n * (Number(counts[`${cur}-${n}`]) || 0), 0);
  const [coins, setCoins] = useState("");
  return (
    <Dialog open={open} onClose={onClose} labelledBy="counter-title" width={600}>
      <ModalHeader id="counter-title" title="Count by note" description="Enter how many of each note is in the drawer." icon={<Calculator size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="grid gap-6 sm:grid-cols-2">
        {(["USD", "KHR"] as const).map((cur) => (
          <fieldset key={cur}>
            <legend className="mb-2 text-sm font-semibold text-fg">{cur} notes</legend>
            <div className="flex flex-col gap-2">
              {(cur === "USD" ? USD_NOTES : KHR_NOTES).map((n) => (
                <label key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-body">{money(n, cur)}</span>
                  <span className="text-muted">×</span>
                  <input
                    inputMode="numeric"
                    aria-label={`Number of ${money(n, cur)} notes`}
                    value={counts[`${cur}-${n}`] ?? ""}
                    onChange={(e) => setCounts((c) => ({ ...c, [`${cur}-${n}`]: e.target.value.replace(/\D/g, "") }))}
                    className="tabular h-9 w-20 rounded-md border border-icon-subtle bg-surface px-2 text-right outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
              {cur === "USD" && (
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-body">Coins / cents</span>
                  <span className="text-muted">$</span>
                  <input inputMode="decimal" aria-label="Coins and cents in USD" value={coins} onChange={(e) => setCoins(e.target.value.replace(/[^\d.]/g, ""))} className="tabular h-9 w-20 rounded-md border border-icon-subtle bg-surface px-2 text-right outline-none focus:border-primary" />
                </label>
              )}
              <p className="mt-1 text-sm font-semibold text-fg">Total {money(total(cur) + (cur === "USD" ? Number(coins) || 0 : 0), cur)}</p>
            </div>
          </fieldset>
        ))}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onApply(total("USD") + (Number(coins) || 0), total("KHR"));
            onClose();
          }}
        >
          Use these totals
        </Button>
      </ModalFooter>
    </Dialog>
  );
}

/** Frames 10.10 "Till Balancing Review" (submitted, signed off, returned). */
export function TillReview() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"sign" | "return" | null>(null);
  const till = state.tills.find((t) => t.id === id);
  const isManager = user?.role === "manager";
  useEffect(() => {
    if (till && isManager && till.date === TODAY && (till.status === "draft" || till.status === "returned")) router.replace("/financial-records/till/count");
  }, [till, isManager, router]);
  if (!till) notFound();
  const v = tillVariance(till);
  const recent = state.tills.filter((t) => t.branch === till.branch && t.date <= till.date).slice(0, 5);
  const signedTime = till.history.find((h) => h.kind === "signed" || h.kind === "returned")?.meta.split(", ")[1] ?? "19:12";

  const sign = () => {
    update((draft) => {
      const t = draft.tills.find((x) => x.id === id)!;
      t.status = "signed";
      t.history.unshift({ kind: "signed", title: "Signed off by Business Owner", meta: `Sokha Chan · ${fmtDay(t.date)} 2026, 19:12` });
    });
    toast({ title: "Till balance signed off", body: `${till.countedBy} has been notified.` });
  };
  const ret = (reason: string) => {
    update((draft) => {
      const t = draft.tills.find((x) => x.id === id)!;
      t.status = "returned";
      t.returnReason = reason;
      t.history.unshift({ kind: "returned", title: "Returned to Branch Manager", meta: `Sokha Chan · ${fmtDay(t.date)} 2026, 19:10`, detail: `Reason: ${reason}` });
    });
    toast({ title: `Returned to ${till.countedBy}`, body: "They can correct and resubmit the count." });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Till balancing", href: "/financial-records/till" },
          { label: `${till.branch} · ${fmtDate(till.date)}` },
        ]}
        title={`Till balance · ${till.branch}`}
        badges={<StatusPill tone={REVIEW_STATUS[till.status].tone}>{REVIEW_STATUS[till.status].label}</StatusPill>}
        subtitle={`Counted by ${till.countedBy} · submitted ${till.submittedAt ?? fmtDate(till.date)}`}
        actions={
          till.status === "submitted" && !isManager ? (
            <>
              <Button variant="secondary" icon={Undo2} onClick={() => setDialog("return")}>
                Return for changes
              </Button>
              <Button icon={CircleCheck} onClick={() => setDialog("sign")}>
                Sign off
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                icon={Download}
                onClick={() =>
                  downloadCsv(`till-${till.branch}-${till.date}.csv`, [
                    ["Branch", till.branch],
                    ["Date", till.date],
                    ["Counted by", till.countedBy],
                    ["Expected USD", till.expectedUsd],
                    ["Counted USD", till.usd ?? ""],
                    ["Expected KHR", till.expectedKhr],
                    ["Counted KHR", till.khr ?? ""],
                    ["Status", REVIEW_STATUS[till.status].label],
                    ["Notes", till.notes],
                  ])
                }
              >
                Export
              </Button>
              <Button variant="secondary" onClick={() => router.push("/financial-records/till")}>
                Back to till balancing
              </Button>
            </>
          )
        }
      />
      <Stepper
        className="mt-6"
        doneTone="success"
        steps={[
          { label: "Count the cash", sub: `${till.countedBy} · 17:44`, state: "done" },
          { label: "Submitted", sub: till.submittedAt?.replace(" 2026", "") ?? "", state: "done" },
          {
            label: till.status === "returned" ? "Returned" : "Owner sign-off",
            sub: till.status === "submitted" ? (isManager ? "Waiting for Sokha Chan" : "Waiting for you") : `Sokha Chan · ${signedTime}`,
            state: till.status === "signed" ? "done" : "active",
          },
        ]}
      />
      {till.status === "signed" && (
        <Notice tone="success" className="mt-6" icon={<CircleCheck size={18} aria-hidden />} title="Till balance signed off">
          This record is locked. {v.usd || v.khr ? `The variance was posted to “Cash over/short” for ${till.branch}, and ${till.countedBy} has been notified.` : `${till.countedBy} has been notified.`}
        </Notice>
      )}
      {till.status === "returned" && (
        <Notice tone="warning" className="mt-6" icon={<TriangleAlert size={18} aria-hidden />} title={`Returned to ${till.countedBy}`}>
          “{till.returnReason}” {till.countedBy.split(" ")[0]} can correct and resubmit.
        </Notice>
      )}

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Count and variance">
            <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["Expected USD", money(till.expectedUsd, "USD")],
                ["Counted USD", money(till.usd ?? 0, "USD")],
                ["Variance USD", usdVar(v.usd), v.usd < 0 ? "Short" : v.usd > 0 ? "Over" : null, v.usd < 0 ? "error" : "warning"],
                ["Expected KHR", money(till.expectedKhr, "KHR")],
                ["Counted KHR", money(till.khr ?? 0, "KHR")],
                ["Variance KHR", khrVar(v.khr), v.khr < 0 ? "Short" : v.khr > 0 ? "Over" : null, v.khr < 0 ? "error" : "warning"],
              ].map(([label, value, pill, tone]) => (
                <div key={label} className="bg-surface px-4 py-3.5">
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className={cn("mt-0.5 text-[15px] font-semibold", pill ? (tone === "error" ? "text-error-fg" : "text-warning-fg") : "text-fg")}>{value}</dd>
                  {pill && (
                    <dd className="mt-1">
                      <StatusPill tone={tone as "error" | "warning"}>{pill}</StatusPill>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-fg">Closing notes from {till.countedBy}</p>
              <p className="mt-1.5 text-[15px] leading-[22px] text-body">{till.notes || "No notes. The till balanced."}</p>
            </div>
          </section>
          <Card className="overflow-hidden" aria-labelledby="movements-title">
            <CardHeader title="Cash movements today" titleId="movements-title" subtitle={`Cash till · ${till.branch}`} divided />
            <DataTable
              caption="Cash movements"
              rows={till.movements}
              rowKey={(m) => m.label}
              minWidth={560}
              columns={[
                { key: "time", header: "Time", width: "120px", cell: (m) => <span className="text-muted">{m.time}</span> },
                { key: "movement", header: "Movement", cell: (m) => <TwoLine title={m.label} titleClassName="font-normal" sub={m.sub} /> },
                { key: "usd", header: "USD", align: "right", width: "130px", cell: (m) => <span className={cn("tabular", m.usd > 0 && m.label !== "Opening float" ? "text-success-fg" : "text-fg")}>{m.label === "Opening float" ? num(m.usd, "USD") : m.usd === 0 ? "0.00" : signed(m.usd, "USD")}</span> },
                { key: "khr", header: "KHR", align: "right", width: "130px", cell: (m) => <span className={cn("tabular", m.khr > 0 && m.label !== "Opening float" ? "text-success-fg" : "text-fg")}>{m.label === "Opening float" ? num(m.khr, "KHR") : m.khr === 0 ? "0" : signed(m.khr, "KHR")}</span> },
              ]}
              mobileRow={(m) => <MobileRow title={m.label} sub={`${m.time} · ${m.sub}`} value={num(m.usd, "USD")} valueSub={num(m.khr, "KHR")} />}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="recent-var-title">
            <CardHeader title={`Recent variances at ${till.branch}`} titleId="recent-var-title" />
            <ul className="flex flex-col gap-2.5 p-5">
              {recent.map((t) => {
                const rv = tillVariance(t);
                return (
                  <li key={t.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-14 text-muted">{fmtDay(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-fg">{rv.usd || rv.khr ? [rv.usd ? usdVar(rv.usd) : null, rv.khr ? khrVar(rv.khr) : null].filter(Boolean).join(" · ") : "No variance"}</span>
                    <StatusPill tone={REVIEW_STATUS[t.status].tone}>{REVIEW_STATUS[t.status].label}</StatusPill>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card aria-labelledby="till-history-title" className="flex-1">
            <CardHeader title="History" titleId="till-history-title" />
            <div className="p-5">
              <Timeline items={toTimeline(till.history)} />
            </div>
          </Card>
        </div>
      </div>
      <SignOffDialog open={dialog === "sign"} onClose={() => setDialog(null)} onConfirm={sign} title="Sign off this till balance?">
        {v.usd || v.khr
          ? `The variance of ${usdVar(v.usd)} and ${khrVar(v.khr)} (${till.branch}, ${fmtDate(till.date)}) will be posted to “Cash over/short”. Signing off locks the record.`
          : `${till.branch} balanced on ${fmtDate(till.date)}. Signing off locks the record.`}
      </SignOffDialog>
      <ReturnDialog open={dialog === "return"} onClose={() => setDialog(null)} onConfirm={ret} person={till.countedBy} what="count" />
    </Page>
  );
}
