"use client";

import { RevenueChart } from "@/components/hairline/revenue-chart";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftRight, Ban, Eye, FileText, PiggyBank, PieChart, Pencil, RefreshCw, RotateCcw, Banknote, TrendingUp, Undo2, Plus } from "lucide-react";
import { AccountAvatar, StatusPill } from "@/components/finance/common";
import { useShell } from "@/components/shell/shell-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { DetailList } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Page, PageHeader } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { branchManager, pendingManager, firstName, useAdmin } from "@/lib/admin-store";
import { useFinance } from "@/lib/finance-store";
import { cn, fmtDate, initialsOf, money, TODAY } from "@/lib/format";
import type { BranchRec } from "@/lib/mock/admin-data";
import { BRANCHES } from "@/lib/mock/dashboard";
import { DeactivateDialog, ReassignDialog } from "./branch-dialogs";

/** Deterministic daily figures for October that add up to the branch totals. */
function daily(total: number, phase: number, spikes: number[]) {
  const raw = Array.from({ length: 31 }, (_, i) => {
    const wave = 1 + 0.28 * Math.sin(i * 0.82 + phase) + 0.16 * Math.sin(i * 0.31 + phase * 2);
    return wave + (spikes.includes(i) ? 0.45 : 0);
  });
  const sum = raw.reduce((s, v) => s + v, 0);
  return raw.map((v) => Math.round(((v / sum) * total) * 100) / 100);
}

type Activity = { icon: React.ReactNode; tone: string; title: string; meta: string; detail?: string };

function activityFor(branch: BranchRec, manager: string): Activity[] {
  const neutral = "bg-muted-bg text-icon-strong";
  if (branch.id === "toul-kork") {
    return [
      { icon: <RefreshCw size={14} aria-hidden />, tone: "bg-primary-subtle text-brand", title: "Till balance submitted for 30 Oct", meta: "Dara Sok · 30 Oct 2026, 18:04", detail: "Counted $1,280.00 and ៛1,640,000 · variance ៛0" },
      { icon: <Undo2 size={14} aria-hidden />, tone: "bg-warning-subtle text-icon-warning", title: "Reconciliation returned for changes", meta: "Sokha Chan · 29 Oct 2026, 10:12", detail: "Wing Merchant KHR · September 2026 · 2 unmatched lines" },
      { icon: <Banknote size={14} aria-hidden />, tone: "bg-success-subtle text-icon-success", title: "Payment recorded for INV-2026-0144", meta: "Dara Sok · 27 Oct 2026, 14:30" },
      { icon: <Pencil size={14} aria-hidden />, tone: neutral, title: "Stock adjustment: Angkor Beer 330ml × 24", meta: "Dara Sok · 26 Oct 2026, 09:15", detail: "Decrease of 6 cases · damaged in delivery" },
    ];
  }
  if (branch.revenue === 0 && branch.status === "active") {
    return [{ icon: <Plus size={14} aria-hidden />, tone: "bg-primary-subtle text-brand", title: "Branch added", meta: `Sokha Chan · ${fmtDate(branch.opened > TODAY ? TODAY : branch.opened)}`, detail: "No sales or bills recorded yet." }];
  }
  if (branch.status === "deactivated") {
    return [
      { icon: <Ban size={14} aria-hidden />, tone: "bg-error-subtle text-icon-error", title: "Branch deactivated", meta: `Sokha Chan · ${fmtDate(branch.deactivatedOn ?? TODAY)}`, detail: "History is kept. No new records can be added." },
    ];
  }
  return [
    { icon: <RefreshCw size={14} aria-hidden />, tone: "bg-primary-subtle text-brand", title: "Till balance submitted for 30 Oct", meta: `${manager} · 30 Oct 2026, 18:20` },
    { icon: <Banknote size={14} aria-hidden />, tone: "bg-success-subtle text-icon-success", title: "Walk-in sales closed for 30 Oct", meta: `${manager} · 30 Oct 2026, 18:05` },
    { icon: <Pencil size={14} aria-hidden />, tone: neutral, title: "Stock count saved", meta: `${manager} · 28 Oct 2026, 19:40`, detail: "No differences found" },
  ];
}

export function BranchDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useAdmin();
  const finance = useFinance().state;
  const { setBranch } = useShell();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"reassign" | "deactivate" | null>(null);
  const branch = state.branches.find((b) => b.id === id);

  if (!branch) {
    return (
      <Page>
        <PageHeader title="Branch not found" breadcrumbs={[{ label: "Branches", href: "/branches" }, { label: "Not found" }]} subtitle="This branch does not exist in this demo session." />
        <ButtonLink href="/branches" variant="secondary" className="mt-6">
          Back to branches
        </ButtonLink>
      </Page>
    );
  }

  const manager = branchManager(state, branch.id);
  const pending = pendingManager(state, branch.id);
  const active = branch.status === "active";
  const total = state.branches.filter((b) => b.status === "active").reduce((s, b) => s + b.revenue, 0);
  const share = total ? (branch.revenue / total) * 100 : 0;
  const profit = branch.revenue - branch.expenses;
  const rev = daily(branch.revenue, 0.4, [14, 23, 30]);
  const exp = daily(branch.expenses, 1.7, [9, 14, 24, 29]);
  const accounts = finance.accounts.filter((a) => a.branch === branch.name);
  const demo = BRANCHES.find((b) => b.label === branch.name);

  const viewAs = () => {
    if (!demo?.hasDemoData) {
      toast({ title: "No demo data for this branch", body: `The dashboard has demo figures for All branches and Toul Kork only, not ${branch.name}.`, tone: "error" });
      return;
    }
    setBranch(demo.id);
    router.push("/dashboard");
  };

  const delta = (value: number, goodUp = true) => (
    <span className="flex items-center gap-2">
      <Delta value={`${Math.abs(value)}%`} direction={value >= 0 ? "up" : "down"} tone={(value >= 0) === goodUp ? "success" : "error"} />
      vs last month
    </span>
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Branches", href: "/branches" }, { label: branch.name }]}
        title={branch.main ? `${branch.name} (Main)` : branch.name}
        badges={active ? <StatusPill tone="success">Active</StatusPill> : <StatusPill tone="neutral">Deactivated</StatusPill>}
        subtitle={`${branch.address}${branch.phone ? ` · ${branch.phone}` : ""}`}
        actions={
          <>
            {active ? (
              <Button variant="ghost" icon={Ban} className="text-brand hover:bg-primary-subtle" onClick={() => setDialog("deactivate")}>
                Deactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon={RotateCcw}
                className="text-brand hover:bg-primary-subtle"
                onClick={() => {
                  update((draft) => {
                    const b = draft.branches.find((x) => x.id === branch.id)!;
                    b.status = "active";
                    b.deactivatedOn = undefined;
                  });
                  toast({ title: `${branch.name} reactivated`, body: "New records can be added again." });
                }}
              >
                Reactivate
              </Button>
            )}
            <ButtonLink href={`/branches/${branch.id}/edit`} variant="secondary" icon={Pencil}>
              Edit branch
            </ButtonLink>
            <Button icon={Eye} onClick={viewAs} disabled={!active}>
              View as this branch
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue · October" icon={<TrendingUp size={16} aria-hidden />} value={money(branch.revenue)} unit="USD" lines={[delta(branch.revDelta)]} />
        <StatCard label="Expenses · October" icon={<FileText size={16} aria-hidden />} value={money(branch.expenses)} unit="USD" lines={[delta(branch.expDelta, false)]} />
        <StatCard label="Net profit" icon={<PiggyBank size={16} aria-hidden />} value={money(profit)} unit="USD" valueTone={profit < 0 ? "error" : undefined} lines={[delta(branch.profitDelta)]} />
        <StatCard
          label="Share of business revenue"
          icon={<PieChart size={16} aria-hidden />}
          value={`${share.toFixed(1)}%`}
          lines={[
            <span key="s" className="flex items-center gap-2">
              <span className={cn("inline-flex h-[22px] items-center rounded-sm px-1.5 text-xs font-medium", branch.shareDelta >= 0 ? "bg-success-subtle text-success-fg" : "bg-muted-bg text-body")}>
                {branch.shareDelta >= 0 ? "↗" : "↘"} {Math.abs(branch.shareDelta)}
              </span>
              points vs last month
            </span>,
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="branch-chart-title">
            <CardHeader
              title="Revenue vs expenses"
              titleId="branch-chart-title"
              subtitle="Daily · 1–31 Oct 2026 · USD · point at a day for its figures"
            />
            <div className="p-5 pt-6">
              {branch.revenue > 0 ? (
                // Hairline UI revenue chart: switch Revenue / Expenses / Net profit, point at a day for its readout.
                <RevenueChart
                  labels={rev.map((_, i) => `${i + 1} Oct`)}
                  titles={rev.map((_, i) => `${i + 1} October 2026`)}
                  metrics={[
                    { id: "revenue", label: "Revenue", current: rev.map((v) => Math.round(v)), format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
                    { id: "expenses", label: "Expenses", current: exp.map((v) => Math.round(v)), format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
                    { id: "profit", label: "Net profit", current: rev.map((v, i) => Math.round(v - exp[i])), format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
                  ]}
                  locales="en-US"
                  className="!rounded-none !bg-transparent !shadow-none [&>div]:!p-0"
                />
              ) : (
                <p className="flex h-[220px] items-center justify-center rounded-md bg-subtle text-sm text-muted">No sales or expenses recorded in October.</p>
              )}
            </div>
          </Card>

          <Card aria-labelledby="activity-title">
            <CardHeader title="Recent activity" titleId="activity-title" subtitle="What changed at this branch" actions={<CardLink href="/financial-records/transactions">View transactions</CardLink>} />
            <ol className="flex flex-col p-5">
              {activityFor(branch, manager?.name ?? "Sokha Chan").map((item, index, list) => (
                <li key={item.title} className="relative flex gap-3 pb-6 last:pb-0">
                  {index < list.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[13px] w-0.5 bg-line" />}
                  <span className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-full", item.tone)}>{item.icon}</span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm leading-5 font-medium text-fg">{item.title}</p>
                    <p className="text-xs leading-4 text-muted">{item.meta}</p>
                    {item.detail && <p className="mt-1 text-[13px] leading-5 text-body">{item.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="manager-title">
            <CardHeader
              title="Branch Manager"
              titleId="manager-title"
              actions={
                active && (
                  <button type="button" onClick={() => setDialog("reassign")} className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                    Reassign
                    <ArrowLeftRight size={14} aria-hidden />
                  </button>
                )
              }
            />
            <div className="p-5">
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-base font-semibold text-brand">
                  {manager ? initialsOf(manager.name) : "SC"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-5 font-medium text-fg">{manager?.name ?? "Sokha Chan"}</p>
                  <p className="truncate text-[13px] leading-5 text-muted">{manager?.email ?? (branch.status === "active" ? "Owner-managed · no Branch Manager" : "Access removed")}</p>
                  {manager && (
                    <StatusPill tone="success" className="mt-1">
                      Active
                    </StatusPill>
                  )}
                </div>
              </div>
              <div className="pt-4">
                <DetailList
                  labelWidth={120}
                  items={
                    manager
                      ? [
                          ["Manager since", fmtDate(manager.added)],
                          ["Last active", manager.lastActive],
                          ["Telegram", manager.telegram ?? "Not linked"],
                          ...(pending ? ([["Taking over", `${pending.name} · when ${firstName(pending.name)} accepts`]] as [string, string][]) : []),
                        ]
                      : [
                          ["Runs the branch", branch.status === "active" ? "You (Business Owner)" : "Nobody"],
                          ...(pending ? ([["Invited", `${pending.name} · starts when accepted`]] as [string, string][]) : []),
                        ]
                  }
                />
              </div>
            </div>
          </Card>

          <Card aria-labelledby="details-title">
            <CardHeader title="Branch details" titleId="details-title" />
            <div className="p-5">
              <DetailList
                labelWidth={116}
                items={[
                  ["Address", branch.address],
                  ["Phone", branch.phone || "—"],
                  ["Opened", fmtDate(branch.opened)],
                  ["Staff", `${branch.staff} ${branch.staff === 1 ? "person" : "people"}`],
                  ...(branch.deactivatedOn ? ([["Deactivated", fmtDate(branch.deactivatedOn)]] as [string, string][]) : []),
                ]}
              />
            </div>
          </Card>

          <Card aria-labelledby="accounts-title">
            <CardHeader title="Accounts used by this branch" titleId="accounts-title" />
            <ul className="flex flex-col gap-4 p-5">
              {accounts.map((a) => (
                <li key={a.id}>
                  <Link href={`/banking/accounts/${a.id}`} className="focus-ring flex items-center gap-3 rounded-md hover:bg-subtle">
                    <AccountAvatar provider={a.provider} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm leading-5 font-medium text-fg">{a.name}</span>
                      <span className="block text-xs leading-4 text-muted">{a.kind === "till" ? "USD and KHR" : `•••• ${a.last4}`}</span>
                    </span>
                    <span className="tabular shrink-0 text-right text-sm leading-5 font-medium text-fg">
                      {money(a.balance, a.currency)}
                      {a.kind === "till" && <span className="block">{money(a.khrBalance ?? 0, "KHR")}</span>}
                    </span>
                  </Link>
                </li>
              ))}
              {!accounts.length && <li className="text-[13px] leading-5 text-muted">No accounts are assigned to this branch.</li>}
              <li className="text-xs leading-4 text-muted">Business-wide accounts are not listed here.</li>
            </ul>
          </Card>
        </div>
      </div>

      <ReassignDialog branch={branch} open={dialog === "reassign"} onClose={() => setDialog(null)} />
      {dialog === "deactivate" && <DeactivateDialog branch={branch} open onClose={() => setDialog(null)} />}
    </Page>
  );
}
