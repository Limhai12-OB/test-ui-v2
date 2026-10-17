"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CircleHelp, Copy, Eye, FileText, Info, Landmark, Link2, Plug, RefreshCw, Sparkles, Tags, TriangleAlert, ArrowLeftRight } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { useAdmin } from "@/lib/admin-store";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/format";
import { WEBILL_REVIEWS, type WebillReview } from "@/lib/mock/admin-data";
import { nowMeta } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { IntegrationStatus, KeyValues, ProviderTile, SyncedTable } from "./integrations-shared";

function useBillAccounts() {
  const { state } = useFinance();
  return state.accounts.filter((a) => a.status === "active" && a.kind === "bank").map((a) => `${a.name} •••• ${a.last4}`);
}

export function WebillPage() {
  const { state } = useAdmin();
  return state.webill.status === "not_connected" ? <WebillConnect /> : <WebillConnected />;
}

/* ---------- 15.6 Not connected ---------- */

function WebillConnect() {
  const { state, update } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const accounts = useBillAccounts();
  const [merchant, setMerchant] = useState(state.webill.merchant);
  const [key, setKey] = useState("");
  const [account, setAccount] = useState(accounts.includes(state.webill.account) ? state.webill.account : accounts[0]);
  const [noBranch, setNoBranch] = useState(state.webill.noBranch);
  const [duplicates, setDuplicates] = useState(state.webill.duplicates);
  const [help, setHelp] = useState(false);
  const [errors, setErrors] = useState<{ merchant?: string; key?: string }>({});
  const [testing, setTesting] = useState(false);

  const connect = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!/^MM-\d{6}$/.test(merchant.trim().toUpperCase())) next.merchant = "Merchant IDs look like MM-204518.";
    if (key.trim().length < 10) next.key = "Paste the full access key (at least 10 characters).";
    setErrors(next);
    if (next.merchant || next.key) return;
    setTesting(true);
    setTimeout(() => {
      update((draft) => {
        Object.assign(draft.webill, { status: "needs_review", merchant: merchant.trim().toUpperCase(), account, noBranch, duplicates, reviews: structuredClone(WEBILL_REVIEWS), resolved: [] });
      });
      toast({ title: "WeBill365 connected", body: "16 bills were fetched. 2 need your decision before they are recorded." });
    }, 1200);
  };

  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "WeBill365" }]} title="WeBill365" badges={<IntegrationStatus status="not_connected" />} subtitle="Bring the bills you pay through WeBill365 into Financial Records automatically." />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Connect your WeBill365 account" />
            <form onSubmit={connect} noValidate className="flex flex-col gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField size="md" label="Merchant ID" value={merchant} onChange={(e) => setMerchant(e.target.value)} state={errors.merchant ? "error" : "default"} message={errors.merchant ?? "Shown in your WeBill365 business profile."} />
                <TextField size="md" label="Access key" password value={key} autoComplete="off" onChange={(e) => setKey(e.target.value)} state={errors.key ? "error" : "default"} message={errors.key ?? "Paste a read-only key created in WeBill365."} />
              </div>
              <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-2">
                <SelectField label="Bills are paid from" icon={Landmark} value={account} onChange={(e) => setAccount(e.target.value)} message="Default account for bills paid through WeBill365." options={accounts.map((a) => ({ value: a, label: a }))} />
                <SelectField
                  label="When a bill has no branch"
                  icon={Building2}
                  value={noBranch}
                  onChange={(e) => setNoBranch(e.target.value)}
                  message="Bills are never assigned to a branch by guesswork."
                  options={[{ value: "Ask me to choose", label: "Ask me to choose" }, ...state.branches.filter((b) => b.status === "active").map((b) => ({ value: `Record under ${b.name}`, label: `Record under ${b.name}` }))]}
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm leading-5 font-medium text-fg">When a synced bill looks like one you already have</legend>
                <div className="flex flex-col gap-2.5">
                  {(
                    [
                      ["hold", "Hold it for my review (recommended)"],
                      ["link", "Link it to the existing bill automatically"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
                      <input type="radio" name="duplicates" checked={duplicates === value} onChange={() => setDuplicates(value)} className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {help && (
                <Notice tone="info" icon={<CircleHelp size={18} aria-hidden />} title="Where to find these in WeBill365">
                  Sign in to WeBill365, open Business profile for the merchant ID, then Settings → API access → Create read-only key. Copy the key once; WeBill365 does not show it again.
                </Notice>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="focus-ring mr-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm leading-5 font-medium text-brand hover:underline">
                  Where do I find these?
                  <CircleHelp size={14} aria-hidden />
                </button>
                <Button variant="secondary" onClick={() => router.push("/integrations")}>
                  Cancel
                </Button>
                <Button type="submit" icon={Plug} disabled={testing} aria-busy={testing || undefined}>
                  {testing ? "Testing…" : "Test and connect"}
                </Button>
              </div>
              <p className="text-xs leading-4 text-muted">The connection test is simulated in this demo; the key is not sent anywhere or stored.</p>
            </form>
          </Card>
          <Card>
            <CardHeader title="What will be synced" />
            <SyncedTable
              rows={[
                ["Bills", "Financial Records", "/financial-records/bills", "Supplier, bill number, amount, currency and due date."],
                ["Payments", "Bill payments", "/financial-records/bills", "Paid bills are marked Paid with the payment date and reference."],
                ["Suppliers", "Suppliers", "/financial-records/bills", "New billers are added as suppliers the first time they appear."],
              ]}
            />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="h-fit">
            <CardHeader title="Before bills are recorded" />
            <ul className="flex flex-col gap-3 p-5 text-sm leading-5 text-body">
              <li className="flex gap-3">
                <Copy size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                Every bill is checked for duplicates first.
              </li>
              <li className="flex gap-3">
                <Tags size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                AI suggests a category that you can change.
              </li>
              <li className="flex gap-3">
                <Eye size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                Anything uncertain is held as “Needs Review” and is not counted in reports.
              </li>
            </ul>
          </Card>
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Read-only">
            LuyFlow only reads from WeBill365. It cannot pay, cancel or change bills there.
          </Notice>
        </div>
      </div>
    </Page>
  );
}

/* ---------- 15.7 Needs review / connected ---------- */

function WebillConnected() {
  const { state, update } = useAdmin();
  const finance = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState("review");
  const [checking, setChecking] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const w = state.webill;
  const waiting = w.reviews.length;

  const resolve = (review: WebillReview, outcome: "ignore" | "new" | "link") => {
    let message = "";
    if (outcome === "link") {
      finance.update((draft) => {
        const bill = draft.bills.find((b) => b.id === review.billId);
        bill?.history.unshift({ kind: "match", title: "Linked to WeBill365", meta: nowMeta(user!.name), detail: `WeBill365 bill ${review.supplierNo}` });
      });
      message = `${review.billId} now carries the WeBill365 reference ${review.supplierNo}.`;
    } else if (outcome === "new") {
      const id = `BILL-0${finance.state.nextIds.bill}`;
      const b = review.newBill;
      finance.update((draft) => {
        draft.nextIds.bill++;
        draft.bills.unshift({
          id,
          supplier: review.supplier,
          supplierNo: review.supplierNo,
          category: b.category,
          branch: b.branch,
          billDate: b.billDate,
          due: b.due,
          currency: b.currency,
          lines: [{ description: `${b.category} — October`, qty: 1, price: b.total }],
          vatRate: 0,
          paid: b.paid,
          stored: null,
          history: [{ kind: "import", title: "Imported from WeBill365", meta: nowMeta(user!.name), detail: `Recorded as a new bill after review · ${review.supplierNo}` }],
          payments: b.paid ? [{ date: b.due, account: w.account, method: "WeBill365", ref: review.supplierNo, amount: b.paid }] : [],
        });
      });
      message = `${id} was added to Financial Records.`;
    } else {
      message = `${review.supplierNo} will not be recorded.`;
    }
    update((draft) => {
      draft.webill.reviews = draft.webill.reviews.filter((r) => r.id !== review.id);
      draft.webill.resolved.push({ id: review.id, outcome });
      if (!draft.webill.reviews.length) draft.webill.status = "connected";
    });
    toast({ title: outcome === "link" ? "Bills linked" : outcome === "new" ? "Bill recorded" : "Bill ignored", body: message });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "WeBill365" }]}
        title="WeBill365"
        badges={<IntegrationStatus status={w.status} />}
        subtitle="Bill payments · Mekong Mart Co., Ltd."
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            disabled={checking}
            onClick={() => {
              setChecking(true);
              setTimeout(() => {
                setChecking(false);
                toast({ title: "WeBill365 is up to date", body: "No new bills since 17:00." });
              }, 1500);
            }}
          >
            {checking ? "Syncing…" : "Sync now"}
          </Button>
        }
      />
      <Tabs
        label="WeBill365 sections"
        className="mt-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "review", label: "Needs Review", count: waiting || undefined },
          { id: "status", label: "Sync status" },
          { id: "settings", label: "Settings" },
        ]}
      />

      {tab !== "settings" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Waiting for your decision" value={`${waiting} ${waiting === 1 ? "bill" : "bills"}`} tone={waiting ? "warning" : "default"} lines={waiting ? ["$578.00 USD equivalent", "Not counted in reports yet"] : ["Nothing waiting", "All synced bills are recorded"]} />
          <StatCard label="Last sync" value="17:00" lines={["31 Oct 2026", "3 bills fetched · syncs daily at 17:00"]} />
          <StatCard label="Bills synced · October" value={16} lines={[`${14 + w.resolved.filter((r) => r.outcome === "new").length} recorded`, "9 marked Paid by WeBill365"]} />
          <StatCard label="Duplicates prevented" value={5 + w.resolved.filter((r) => r.outcome === "link").length} lines={["Linked to existing bills", "Since 1 Mar 2026"]} />
        </div>
      )}

      {tab === "review" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-6">
            {w.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} onResolve={(o) => resolve(r, o)} />
            ))}
            {!waiting && (
              <Card className="items-center px-6 py-14 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-subtle text-icon-success">
                  <FileText size={20} aria-hidden />
                </span>
                <h2 className="mt-4 text-base leading-6 font-semibold text-fg">No bills waiting for your decision</h2>
                <p className="mt-1 max-w-[380px] text-sm leading-[22px] text-muted">New WeBill365 bills that look like duplicates or differ from your records will appear here after the next sync.</p>
                <Link href="/financial-records/bills" className="focus-ring mt-4 rounded-xs text-sm font-medium text-brand hover:underline">
                  Open bills
                </Link>
              </Card>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <WebillHistory waiting={waiting} />
            <Card className="h-fit">
              <CardHeader title="Why bills are held" />
              <ul className="flex flex-col gap-3 p-5 text-sm leading-5 text-body">
                <li className="flex gap-3">
                  <Copy size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                  The same bill may already have been typed in or imported from a statement.
                </li>
                <li className="flex gap-3">
                  <ArrowLeftRight size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                  The currency or the amount differs from the recorded bill.
                </li>
                <li className="flex gap-3">
                  <Building2 size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                  The bill has no branch and you chose to be asked.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "status" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <WebillHistory waiting={waiting} />
          <WebillConnection />
        </div>
      )}

      {tab === "settings" && <WebillSettings onDisconnect={() => setDisconnect(true)} />}

      <ConfirmDialog
        open={disconnect}
        onClose={() => setDisconnect(false)}
        id="webill-disconnect"
        icon={<Plug size={20} aria-hidden />}
        title="Disconnect WeBill365?"
        confirmLabel="Disconnect"
        confirmVariant="danger"
        focusCancel
        onConfirm={() => {
          update((draft) => {
            draft.webill.status = "not_connected";
          });
          setDisconnect(false);
          toast({ title: "WeBill365 disconnected", body: "Bills already recorded stay in Financial Records." });
        }}
      >
        New WeBill365 bills stop coming in. Bills already recorded stay in Financial Records, and bills waiting for review are dropped.
      </ConfirmDialog>
    </Page>
  );
}

function ReviewCard({ review, onResolve }: { review: WebillReview; onResolve: (outcome: "ignore" | "new" | "link") => void }) {
  const rows: [string, string, string, boolean?][] = [
    ["Bill", "Not recorded yet", review.billId],
    ["Supplier", review.supplier, review.supplier],
    ["Supplier bill no.", review.supplierNo, review.supplierNo],
    ["Amount", review.amount, review.existingAmount, review.amountDiffers],
    ["Bill date", review.billDate, review.billDate],
    ["Status", review.status, review.existingStatus],
  ];
  const linkCls = "focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium text-brand hover:underline";
  return (
    <Card className="overflow-hidden border-warning/50" aria-label={review.title}>
      <div className="flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning-subtle px-5 py-3">
        <TriangleAlert size={16} className="shrink-0 text-icon-warning" aria-hidden />
        <p className="flex-1 text-sm leading-5 font-medium text-warning-fg">{review.title}</p>
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs font-medium text-ai-fg">
          <Sparkles size={12} aria-hidden />
          AI check
        </span>
      </div>
      <div className="grid md:grid-cols-[1.45fr_1fr]">
        <div className="px-5 py-4">
          <p className="mb-3 flex items-center gap-2 text-sm leading-5 text-body md:pl-[132px]">
            <ProviderTile provider="webill" size={32} />
            From WeBill365
          </p>
          <dl className="grid grid-cols-[132px_minmax(0,1fr)] gap-y-3 text-sm leading-5">
            {rows.map(([label, ours]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className={label === "Bill" ? "text-muted" : "text-fg"}>{ours}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-t border-line bg-subtle px-5 py-4 md:border-t-0 md:border-l">
          <p className="mb-3 flex items-center gap-2 text-sm leading-5 text-body">
            <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-md bg-primary-subtle text-brand">
              <FileText size={16} />
            </span>
            Already in LuyFlow
          </p>
          <dl className="grid grid-cols-[136px_minmax(0,1fr)] gap-y-3 text-sm leading-5 md:grid-cols-1">
            {rows.map(([label, , theirs, differs]) => (
              <div key={label} className="contents">
                <dt className="text-muted md:sr-only">{label}</dt>
                <dd className={cn(differs ? "text-warning-fg" : "text-fg")}>
                  {label === "Bill" ? (
                    <Link href={`/financial-records/bills/${theirs}`} className="focus-ring rounded-xs font-medium text-brand hover:underline">
                      {theirs}
                    </Link>
                  ) : (
                    theirs
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-5 py-3">
        <p className="min-w-[220px] flex-1 text-[13px] leading-5 text-muted">{review.note}</p>
        <button type="button" className={linkCls} onClick={() => onResolve("ignore")}>
          Ignore
        </button>
        <button type="button" className={linkCls} onClick={() => onResolve("new")}>
          Record as new bill
        </button>
        <Button variant="secondary" icon={Link2} onClick={() => onResolve("link")}>
          Link to {review.billId}
        </Button>
      </div>
    </Card>
  );
}

function WebillHistory({ waiting }: { waiting: number }) {
  const rows: [string, string, "needs_review" | "completed"][] = [
    [waiting ? `3 bills fetched · ${waiting} need review` : "3 bills fetched · all recorded", "31 Oct, 17:00", waiting ? "needs_review" : "completed"],
    ["2 payments matched", "30 Oct, 17:00", "completed"],
    ["1 bill recorded · Smart Axiata", "29 Oct, 17:00", "completed"],
    ["No new bills", "28 Oct, 17:00", "completed"],
  ];
  return (
    <Card className="h-fit" aria-labelledby="wb-history-title">
      <CardHeader title="Sync history" titleId="wb-history-title" subtitle="One run a day, at 17:00" />
      <ul className="flex flex-col px-5 pt-2 pb-3">
        {rows.map(([what, when, status]) => (
          <li key={when} className="flex items-center gap-3 border-b border-line-subtle py-3 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-5 font-medium text-fg">{what}</span>
              <span className="block text-xs leading-4 text-muted">{when}</span>
            </span>
            <IntegrationStatus status={status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function WebillConnection() {
  const { state } = useAdmin();
  return (
    <Card className="h-fit">
      <CardHeader title="Connection" />
      <div className="p-5">
        <KeyValues
          rows={[
            ["Merchant", `Mekong Mart Co., Ltd. · ${state.webill.merchant}`],
            ["Connected by", "Sokha Chan · 2 Mar 2026"],
            ["Bills paid from", state.webill.account],
            ["No branch on a bill", state.webill.noBranch],
            ["Possible duplicates", state.webill.duplicates === "hold" ? "Held for review" : "Linked automatically"],
            ["Access", "Read-only"],
          ]}
        />
      </div>
    </Card>
  );
}

function WebillSettings({ onDisconnect }: { onDisconnect: () => void }) {
  const { state, update } = useAdmin();
  const toast = useToast();
  const accounts = useBillAccounts();
  const [account, setAccount] = useState(state.webill.account);
  const [noBranch, setNoBranch] = useState(state.webill.noBranch);
  const [duplicates, setDuplicates] = useState(state.webill.duplicates);
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <CardHeader title="Sync settings" subtitle="Changes apply from the next daily sync." />
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Bills are paid from" icon={Landmark} value={account} onChange={(e) => setAccount(e.target.value)} options={accounts.map((a) => ({ value: a, label: a }))} />
            <SelectField
              label="When a bill has no branch"
              icon={Building2}
              value={noBranch}
              onChange={(e) => setNoBranch(e.target.value)}
              options={[{ value: "Ask me to choose", label: "Ask me to choose" }, ...state.branches.filter((b) => b.status === "active").map((b) => ({ value: `Record under ${b.name}`, label: `Record under ${b.name}` }))]}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm leading-5 font-medium text-fg">When a synced bill looks like one you already have</legend>
            {(
              [
                ["hold", "Hold it for my review (recommended)"],
                ["link", "Link it to the existing bill automatically"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="mt-2 flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
                <input type="radio" name="duplicates-settings" checked={duplicates === value} onChange={() => setDuplicates(value)} className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary" />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
          <Button variant="ghost" className="text-error-fg hover:bg-error-subtle" onClick={onDisconnect}>
            Disconnect WeBill365
          </Button>
          <Button
            className="ml-auto"
            onClick={() => {
              update((draft) => Object.assign(draft.webill, { account, noBranch, duplicates }));
              toast({ title: "WeBill365 settings saved", body: "They apply from the next daily sync." });
            }}
          >
            Save settings
          </Button>
        </div>
      </Card>
      <WebillConnection />
    </div>
  );
}
