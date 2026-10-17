"use client";

import { TrendChart } from "@/components/hairline/trend-chart";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, ChevronRight, Ellipsis, Lock, Scale, Tags, Undo2 } from "lucide-react";
import { AccountAvatar, accountBalanceLines, StatusPill } from "@/components/finance/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { Segmented } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { Page, ScopeNotice } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { useFinance } from "@/lib/finance-store";
import { cn, money } from "@/lib/format";
import type { Account } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { AccountCard, BankingHeader } from "./banking-shared";

/** Cash position (USD thousands) for 1–31 Oct, shaped after frame 06.1. */
const CASH_31 = [82.6, 83.5, 83.9, 83.4, 82.0, 81.2, 81.6, 82.4, 83.1, 83.4, 82.5, 81.5, 82.7, 83.7, 84.5, 84.7, 84.0, 84.5, 85.2, 85.5, 84.9, 84.2, 85.0, 85.5, 86.1, 86.9, 86.3, 85.6, 86.5, 87.0, 86.41];
const CASH_90 = [...Array.from({ length: 59 }, (_, i) => 76 + i * 0.1 + Math.sin(i / 3) * 1.4), ...CASH_31];

export function BankingOverview() {
  const { user } = useSession();
  return user?.role === "manager" ? <ManagerOverview /> : <OwnerOverview />;
}

function OwnerOverview() {
  const { state } = useFinance();
  const router = useRouter();
  const [range, setRange] = useState<"7" | "31" | "90">("31");
  const active = state.accounts.filter((account) => account.status === "active");
  const sumUsd = (list: Account[]) => list.reduce((sum, a) => sum + (a.currency === "KHR" ? a.balance / 4100 : a.balance) + (a.khrBalance ?? 0) / 4100, 0);
  const banks = active.filter((a) => a.kind === "bank");
  const wallets = active.filter((a) => a.kind === "wallet");
  const tills = active.filter((a) => a.kind === "till");
  const total = sumUsd(active);
  const values = range === "7" ? CASH_31.slice(-7) : range === "31" ? CASH_31 : CASH_90;
  // The same number of days just before, for the dashed comparison line (none before 3 Aug).
  const previous = range === "7" ? CASH_31.slice(-14, -7) : range === "31" ? CASH_90.slice(28, 59) : null;
  const recordedSplit = (list: Account[]) => {
    const usd = list.filter((a) => a.currency === "USD" || a.kind === "till").reduce((s, a) => s + a.balance, 0);
    const khr = list.reduce((s, a) => s + (a.currency === "KHR" && a.kind !== "till" ? a.balance : 0) + (a.khrBalance ?? 0), 0);
    return [usd ? money(usd, "USD") : null, khr ? money(khr, "KHR") : null].filter(Boolean).join(" + ");
  };

  return (
    <Page>
      <BankingHeader />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard
          tone="primary"
          label="Total cash position"
          value={money(total, "USD")}
          unit="USD"
          lines={[`≈ ${money(Math.round((total * 4100) / 100) * 100, "KHR")} · display conversion`, `${active.length} active accounts · updated 17:42`]}
        />
        <StatCard label="Bank accounts" value={money(sumUsd(banks), "USD")} unit="USD" lines={[`${recordedSplit(banks)} recorded`, `${banks.length} accounts · ABA and ACLEDA`]} />
        <StatCard label="Mobile wallets" value={money(sumUsd(wallets), "USD")} unit="USD" lines={[`${recordedSplit(wallets)} recorded`, `${wallets.length} account · Wing`]} />
        <StatCard label="Cash tills" value={money(sumUsd(tills), "USD")} unit="USD" lines={[`${recordedSplit(tills)} recorded`, `${tills.length} tills · one per branch`]} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card aria-labelledby="cash-title">
          <CardHeader
            title="Cash position"
            titleId="cash-title"
            subtitle={`All accounts, converted to USD for display · last ${range} days`}
            className="flex-wrap"
            actions={
              <>
                <Segmented
                  label="Range"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: "7", label: "7 days" },
                    { value: "31", label: "31 days" },
                    { value: "90", label: "90 days" },
                  ]}
                />
                <Menu
                  align="end"
                  triggerLabel="Chart options"
                  triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                  trigger={<Ellipsis size={16} aria-hidden />}
                  items={[{ id: "accounts", label: "View accounts", onSelect: () => router.push("/banking/accounts") }]}
                />
              </>
            }
          />
          <div className="px-5 pt-6 pb-4">
            {/* Hairline UI trend chart: point at a day for its readout; the dashed line is the period before. */}
            <TrendChart
              key={range}
              label={`Cash position over the last ${range} days. Today ${money(total, "USD")}.`}
              buckets={values.map((_, i) => Date.UTC(2026, 9, 31) - (values.length - 1 - i) * 864e5)}
              values={values.map((v) => Math.round(v * 1000))}
              previous={previous ? previous.map((v) => Math.round(v * 1000)) : null}
              previousLabel={`The ${range} days before`}
              interval="day"
              format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
              unit="in cash"
              now={Date.UTC(2026, 10, 1)}
              locale="en-GB"
            />
          </div>
        </Card>
        <AttentionList />
      </div>

      <Card className="mt-4 overflow-hidden md:mt-6" aria-labelledby="accounts-title">
        <CardHeader
          title="Accounts"
          titleId="accounts-title"
          subtitle="Balances are shown in the currency they are held in"
          divided
          actions={<CardLink href="/banking/accounts">View all accounts</CardLink>}
        />
        <AccountsTable accounts={active.slice(0, 6)} />
      </Card>
    </Page>
  );
}

export function AccountsTable({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  return (
    <DataTable
      caption="Accounts"
      rows={accounts}
      rowKey={(a) => a.id}
      onRowClick={(a) => router.push(`/banking/accounts/${a.id}`)}
      columns={[
        {
          key: "account",
          header: "Account",
          width: "34%",
          cell: (a) => (
            <div className="flex items-center gap-3">
              <AccountAvatar provider={a.provider} size={32} muted={a.status === "deactivated"} />
              <TwoLine title={a.name} sub={a.kind === "till" ? "USD and KHR" : `•••• ${a.last4}`} />
            </div>
          ),
        },
        { key: "type", header: "Type", cell: (a) => <span className="text-muted">{a.kind === "bank" ? "Bank account" : a.kind === "wallet" ? "Mobile wallet" : "Cash till"}</span> },
        { key: "branch", header: "Branch", cell: (a) => <span className="text-fg">{a.branch}</span> },
        {
          key: "balance",
          header: "Balance",
          align: "right",
          cell: (a) => {
            const lines = accountBalanceLines(a);
            return (
              <div>
                <p className="tabular text-[13px] text-fg">{lines.main}</p>
                <p className="text-xs leading-4 text-muted">{a.kind === "till" ? `+ ${money(a.khrBalance ?? 0, "KHR")} KHR` : lines.sub}</p>
              </div>
            );
          },
        },
        { key: "recon", header: "Reconciliation", width: "230px", cell: (a) => <StatusPill tone={a.recon.tone}>{a.recon.label}</StatusPill> },
      ]}
      mobileRow={(a) => {
        const lines = accountBalanceLines(a);
        return <MobileRow leading={<AccountAvatar provider={a.provider} size={32} />} title={a.name} sub={a.recon.label} value={<span className="tabular">{lines.main}</span>} valueSub={a.branch} />;
      }}
    />
  );
}

function AttentionList({ full }: { full?: boolean }) {
  const { state } = useFinance();
  const { user } = useSession();
  const isManager = user?.role === "manager";
  const uncategorised = state.uncategorised.filter((line) => !line.accepted).length;
  const items: { icon: React.ReactNode; tone: string; title: string; sub: string; href: string }[] = [];
  if (uncategorised) {
    items.push({
      icon: <Tags size={18} aria-hidden />,
      tone: "bg-warning-subtle text-icon-warning",
      title: `${uncategorised} uncategorised transaction${uncategorised === 1 ? "" : "s"}`,
      sub: isManager ? "Wing Merchant KHR · from the October statement" : "ABA Operating KHR · October statement",
      href: "/banking/uncategorised",
    });
  }
  if (isManager) {
    const returned = state.recons.find((r) => r.status === "returned");
    if (returned)
      items.push({
        icon: <Undo2 size={18} aria-hidden />,
        tone: "bg-warning-subtle text-icon-warning",
        title: "Reconciliation returned by Sokha Chan",
        sub: `Wing Merchant KHR · ${returned.periodLabel} · ${returned.lines.filter((l) => l.state === "todo").length} lines to fix`,
        href: `/financial-records/reconciliation/${returned.id}`,
      });
    const till = state.tills.find((t) => t.date === "2026-10-31");
    if (till && (till.status === "draft" || till.status === "returned"))
      items.push({ icon: <Calculator size={18} aria-hidden />, tone: "bg-warning-subtle text-icon-warning", title: "Till not balanced today", sub: "Cash till · Toul Kork · due by 18:00", href: "/financial-records/till/count" });
  } else {
    const submitted = state.recons.filter((r) => r.status === "submitted");
    submitted.forEach((recon) =>
      items.push({
        icon: <Scale size={18} aria-hidden />,
        tone: "bg-primary-subtle text-brand",
        title: "Reconciliation awaiting sign-off",
        sub: `Wing Merchant KHR · ${recon.periodLabel.split(" ")[0]} · submitted 18:10`,
        href: `/financial-records/reconciliation/${recon.id}`,
      }),
    );
    const tills = state.tills.filter((t) => t.status === "submitted");
    if (tills.length)
      items.push({
        icon: <Calculator size={18} aria-hidden />,
        tone: "bg-primary-subtle text-brand",
        title: `${tills.length} till balance${tills.length === 1 ? "" : "s"} awaiting sign-off`,
        sub: `${tills.map((t) => t.branch).join(" and ")} · 31 Oct`,
        href: "/financial-records/till",
      });
    if (!state.tills.some((t) => t.date === "2026-10-31" && t.branch === "Battambang"))
      items.push({ icon: <Calculator size={18} aria-hidden />, tone: "bg-warning-subtle text-icon-warning", title: "Battambang till not balanced", sub: "No count from Vannak Lim today", href: "/financial-records/till" });
  }

  return (
    <Card aria-labelledby="bank-attention-title">
      <CardHeader
        title="Needs attention"
        titleId="bank-attention-title"
        badge={
          <Badge tone="warning" size="sm">
            {items.length}
          </Badge>
        }
      />
      {items.length ? (
        <ul className={cn("flex flex-col px-5 py-2", full && "pb-3")}>
          {items.map((item, index) => (
            <li key={item.title} className={cn(index < items.length - 1 && "border-b border-line-subtle")}>
              <Link href={item.href} className="focus-ring group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-subtle">
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[9px]", item.tone)}>{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-[18px] font-medium text-fg">{item.title}</span>
                  <span className="block text-xs leading-4 text-muted">{item.sub}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-icon group-hover:text-icon-strong" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-[13px] leading-5 text-muted">Nothing needs attention. Every account is up to date.</p>
      )}
    </Card>
  );
}

function ManagerOverview() {
  const { state } = useFinance();
  const { user } = useSession();
  return (
    <Page>
      <BankingHeader />
      <ScopeNotice branch={user?.branch} className="mt-6" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {state.accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
        <div className="flex flex-col justify-center rounded-lg border border-dashed border-line-strong px-5 py-6">
          <p className="flex items-center gap-2 text-[15px] leading-[22px] font-semibold text-fg">
            <Lock size={16} className="text-icon" aria-hidden />
            Business-wide accounts
          </p>
          <p className="mt-2 text-sm leading-5 text-muted">
            ABA and ACLEDA accounts are managed by the Business Owner. Their balances are not shown to Branch Managers.
          </p>
        </div>
      </div>
      <div className="mt-4 md:mt-6">
        <AttentionList full />
      </div>
    </Page>
  );
}
