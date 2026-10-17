"use client";

import { TrendChart } from "@/components/hairline/trend-chart";
import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronRight, CloudUpload, Ellipsis, Landmark, Plus, Scale, Sparkles } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { Bar, Donut, Dot } from "@/components/ui/charts";
import { DataTable, MobileRow, TwoLine, type Column, type SortState } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { DetailList, Segmented, Switch } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { LinkTabs, PageHeader, Page } from "@/components/ui/page";
import { Delta, StatCard, StatStrip } from "@/components/ui/stat";
import { REVIEW_STATUS, reconFigures, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, fmtDate, fmtDay, money, num } from "@/lib/format";
import { CATEGORY_COLORS, LINE_CATEGORIES } from "@/lib/mock/finance-data";
import type { Account, LedgerRow } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

const PROVIDER_NAMES = { ABA: "ABA Bank", ACLEDA: "ACLEDA Bank", Wing: "Wing", Cash: "Cash" };
const RECON_LABEL = { matched: { label: "Matched", tone: "success" as const }, review: { label: "Needs Review", tone: "warning" as const }, unmatched: { label: "Unmatched", tone: "warning" as const } };

export function useAccount(id: string) {
  const { state } = useFinance();
  const account = state.accounts.find((a) => a.id === id);
  return { account, ledger: state.ledgers[id] ?? [], state };
}

function AccountHeader({ account }: { account: Account }) {
  const { state } = useFinance();
  const router = useRouter();
  const recon = state.recons.find((r) => r.accountId === account.id && r.period === "2026-10");
  const ledger = state.ledgers[account.id] ?? [];
  const statements = state.imports.filter((row) => row.accountId === account.id).length;
  const base = `/banking/accounts/${account.id}`;
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Accounts", href: "/banking/accounts" },
          { label: account.name },
        ]}
        title={account.name}
        badges={
          <>
            <StatusPill tone={account.status === "active" ? "success" : "neutral"}>{account.status === "active" ? "Active" : "Deactivated"}</StatusPill>
            <Badge>{account.kind === "till" ? "USD + KHR" : account.currency}</Badge>
          </>
        }
        subtitle={[
          PROVIDER_NAMES[account.provider],
          account.last4 ? `account ending ${account.last4}` : "cash drawer",
          account.branch,
          `opened ${fmtDate(account.opened)}`,
        ].join(" · ")}
        actions={
          <>
            {account.kind !== "till" && (
              <Button variant="secondary" icon={CloudUpload} onClick={() => router.push(`/banking/import?account=${account.id}`)}>
                Import statement
              </Button>
            )}
            <Button icon={Scale} onClick={() => router.push(account.kind === "till" ? "/financial-records/till" : recon ? `/financial-records/reconciliation/${recon.id}` : "/financial-records/reconciliation")}>
              {account.kind === "till" ? "Till balancing" : "Reconcile"}
            </Button>
            <Menu
              align="end"
              width={220}
              triggerLabel="More account actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                {
                  id: "export",
                  label: "Export statement (CSV)",
                  onSelect: () =>
                    downloadCsv(`${account.name.replace(/\W+/g, "_")}_Oct2026.csv`, [
                      ["Date", "Description", "Reference", "Category", "Debit", "Credit", "Balance"],
                      ...ledger.map((row) => [row.date, row.description, row.ref, row.category, row.debit || "", row.credit || "", row.balance]),
                    ]),
                },
                { id: "history", label: "Import history", onSelect: () => router.push("/banking/imports") },
              ]}
            />
          </>
        }
      />
      <LinkTabs
        className="mt-6"
        items={[
          { href: base, label: "Overview", exact: true },
          { href: `${base}/transactions`, label: "Transactions", count: ledger.length },
          { href: `${base}/categories`, label: "Categories" },
          { href: `${base}/statements`, label: "Statements", count: statements },
        ]}
      />
    </>
  );
}

function ledgerTotals(ledger: LedgerRow[]) {
  const credits = ledger.reduce((s, r) => s + r.credit, 0);
  const debits = ledger.reduce((s, r) => s + r.debit, 0);
  const closing = ledger[0]?.balance ?? 0;
  return { credits, debits, closing, opening: closing - credits + debits };
}

/** End-of-day balances for 1–31 Oct, rebuilt from the statement lines. */
function dailyBalances(ledger: LedgerRow[], closing: number) {
  const byDay: number[] = [];
  let balance = closing;
  for (let day = 31; day >= 1; day--) {
    byDay[day - 1] = balance;
    for (const row of ledger.filter((r) => Number(r.date.slice(8, 10)) === day)) balance = balance - row.credit + row.debit;
  }
  return byDay;
}

export function AccountOverview({ id }: { id: string }) {
  const { account, ledger, state } = useAccount(id);
  const [range, setRange] = useState<"31" | "90" | "12">("31");
  if (!account) notFound();
  const khr = account.currency === "KHR" && account.kind !== "till";
  const totals = ledgerTotals(ledger);
  const closing = ledger.length ? totals.closing : account.balance;
  const unreconciled = ledger.filter((row) => row.recon !== "matched").length;
  const days = dailyBalances(ledger, closing);
  const values = range === "31" ? days : range === "90" ? [...Array.from({ length: 59 }, (_, i) => days[0] * (0.9 + (i / 59) * 0.1) + Math.sin(i / 4) * days[0] * 0.03), ...days] : Array.from({ length: 12 }, (_, i) => closing * (0.62 + i * 0.035) + Math.sin(i) * closing * 0.04);
  const recons = state.recons.filter((r) => r.accountId === id).sort((a, b) => b.period.localeCompare(a.period)).slice(0, 2);
  const isAbaUsd = id === "aba-business-usd";
  const cur = khr ? "KHR" : "USD";

  return (
    <Page>
      <AccountHeader account={account} />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard
          label="Current balance"
          icon={<Landmark size={16} aria-hidden />}
          value={money(closing, cur)}
          unit={cur}
          lines={[khr ? `≈ ${money(closing / 4100, "USD")}` : `≈ ${money(closing * 4100, "KHR")}`, isAbaUsd ? <span className="flex items-center gap-2"><Delta value="15.9%" direction="up" tone="success" /> vs 30 Sep</span> : null].filter(Boolean)}
        />
        <StatCard
          label="Money in · October"
          icon={<ArrowDownLeft size={16} aria-hidden />}
          value={money(totals.credits, cur, { sign: true })}
          unit={cur}
          lines={isAbaUsd ? [<span key="d" className="flex items-center gap-2"><Delta value="9.8%" direction="up" tone="success" /> vs last month</span>] : [`${ledger.filter((r) => r.credit).length} credits`]}
        />
        <StatCard
          label="Money out · October"
          icon={<ArrowUpRight size={16} aria-hidden />}
          value={money(-totals.debits, cur)}
          unit={cur}
          lines={isAbaUsd ? [<span key="d" className="flex items-center gap-2"><Delta value="6.1%" direction="up" tone="error" /> vs last month</span>] : [`${ledger.filter((r) => r.debit).length} debits`]}
        />
        <StatCard label="Unreconciled lines" icon={<Scale size={16} aria-hidden />} value={String(unreconciled)} lines={[`of ${ledger.length} in October`]} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card aria-labelledby="balance-title">
          <CardHeader
            title="Balance"
            titleId="balance-title"
            subtitle={`End-of-day balance · ${range === "31" ? "1–31 Oct 2026" : range === "90" ? "last 90 days" : "last 12 months"} · ${cur}`}
            className="flex-wrap"
            actions={
              <Segmented
                label="Range"
                value={range}
                onChange={setRange}
                options={[
                  { value: "31", label: "31 days" },
                  { value: "90", label: "90 days" },
                  { value: "12", label: "12 months" },
                ]}
              />
            }
          />
          <div className="px-5 pt-6 pb-4">
            {ledger.length ? (
              <TrendChart
                key={range}
                label={`Balance over ${range === "12" ? "12 months" : `${range} days`}, ending at ${money(closing, cur)}`}
                buckets={values.map((_, i) => (range === "12" ? Date.UTC(2025, 10 + i, 1) : Date.UTC(2026, 9, 31) - (values.length - 1 - i) * 864e5))}
                values={values.map((v) => Math.round(v))}
                interval={range === "12" ? "month" : "day"}
                format={khr ? { maximumFractionDigits: 0 } : { style: "currency", currency: "USD", maximumFractionDigits: 0 }}
                unit={khr ? "KHR balance" : "balance"}
                now={Date.UTC(2026, 10, 1)}
                locale="en-GB"
              />
            ) : (
              <p className="py-20 text-center text-sm text-muted">No statement lines yet. Import a statement to see the balance trend.</p>
            )}
          </div>
        </Card>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="details-title">
            <CardHeader title="Account details" titleId="details-title" />
            <div className="p-5">
              <DetailList
                items={[
                  [account.kind === "till" ? "Location" : "Bank", account.kind === "till" ? account.branch : PROVIDER_NAMES[account.provider]],
                  ["Account number", account.last4 ? `•••• ${account.last4}` : "—"],
                  ["Currency", account.kind === "till" ? "USD and KHR" : account.currency],
                  ["Used by", account.branch],
                  ["Last statement", ledger.length ? "1–31 Oct 2026" : "None yet"],
                  ["Imported", ledger.length ? "Today, 17:20" : "—"],
                ]}
              />
            </div>
          </Card>
          {account.kind !== "till" && (
            <Card aria-labelledby="recon-card-title">
              <CardHeader title="Reconciliation" titleId="recon-card-title" actions={<CardLink href={recons[0] ? `/financial-records/reconciliation/${recons[0].id}` : "/financial-records/reconciliation"}>Open</CardLink>} />
              <div className="flex flex-col gap-3 p-5">
                {recons.length === 0 && <p className="text-[13px] text-muted">No reconciliation started yet.</p>}
                {recons.map((recon) => {
                  const fig = reconFigures(recon);
                  const status = REVIEW_STATUS[recon.status];
                  return (
                    <div key={recon.id}>
                      <div className="flex items-center gap-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        <Link href={`/financial-records/reconciliation/${recon.id}`} className="focus-ring min-w-0 flex-1 truncate rounded-xs text-sm leading-5 font-medium text-fg hover:underline">
                          {recon.periodLabel}
                        </Link>
                        <span className="text-xs leading-4 whitespace-nowrap text-muted">{recon.status === "signed" ? "2 Oct" : `${fig.matched} of ${recon.totalLines} matched`}</span>
                      </div>
                      {recon.status === "draft" && <Bar className="mt-3" value={(fig.matched / recon.totalLines) * 100} color="var(--lf-primary-default)" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden md:mt-6" aria-labelledby="latest-title">
        <CardHeader title="Latest transactions" titleId="latest-title" subtitle="From the October statement" divided actions={<CardLink href={`/banking/accounts/${id}/transactions`}>{`View all ${ledger.length}`}</CardLink>} />
        <LedgerTable ledger={ledger.slice(0, 5)} currency={cur} />
      </Card>
    </Page>
  );
}

function LedgerTable({ ledger, currency, sort, onSort }: { ledger: LedgerRow[]; currency: "USD" | "KHR"; sort?: SortState; onSort?: (sort: SortState) => void }) {
  const columns: Column<LedgerRow>[] = [
    { key: "date", header: "Date", width: "84px", cell: (row) => <span className="text-muted">{fmtDay(row.date)}</span> },
    { key: "desc", header: "Description", cell: (row) => <TwoLine title={row.description} sub={`Ref ${row.ref}`} /> },
    { key: "category", header: "Category", width: "190px", cell: (row) => <Badge className="max-w-full"><span className="truncate">{row.category}</span></Badge> },
    { key: "debit", header: `Debit (${currency})`, align: "right", width: "120px", cell: (row) => <span className="tabular text-fg">{row.debit ? num(row.debit, currency) : "—"}</span> },
    { key: "credit", header: `Credit (${currency})`, align: "right", width: "120px", cell: (row) => <span className={cn("tabular", row.credit ? "text-success-fg" : "text-fg")}>{row.credit ? num(row.credit, currency) : "—"}</span> },
    { key: "balance", header: `Balance (${currency})`, align: "right", width: "140px", cell: (row) => <span className="tabular text-fg">{num(row.balance, currency)}</span> },
    { key: "recon", header: "Reconciliation", width: "150px", cell: (row) => <StatusPill tone={RECON_LABEL[row.recon].tone}>{RECON_LABEL[row.recon].label}</StatusPill> },
  ];
  return (
    <DataTable
      caption="Statement lines"
      rows={ledger}
      rowKey={(row) => row.id}
      columns={columns}
      sort={sort}
      sortable={["date"]}
      onSort={onSort}
      minWidth={960}
      empty="No statement lines match."
      mobileRow={(row) => (
        <MobileRow
          title={row.description}
          sub={`${fmtDay(row.date)} · ${row.category}`}
          value={<span className={cn("tabular", row.credit ? "text-success-fg" : "")}>{row.credit ? `+${num(row.credit, currency)}` : `−${num(row.debit, currency)}`}</span>}
          valueSub={RECON_LABEL[row.recon].label}
        />
      )}
    />
  );
}

export function AccountTransactions({ id }: { id: string }) {
  const { account, ledger } = useAccount(id);
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<string | null>("oct");
  const [type, setType] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(params.get("category"));
  const [recon, setRecon] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rows = useMemo(() => {
    const list = ledger.filter(
      (row) =>
        (!query || `${row.description} ${row.ref}`.toLowerCase().includes(query.toLowerCase())) &&
        (!type || (type === "credit" ? row.credit > 0 : row.debit > 0)) &&
        (!category || row.category === category) &&
        (!recon || row.recon === recon) &&
        (!range || (range === "oct" ? row.date.startsWith("2026-10") : Number(row.date.slice(8, 10)) > 24)),
    );
    return sort.dir === "desc" ? list : [...list].reverse();
  }, [ledger, query, type, category, recon, range, sort]);
  if (!account) notFound();
  const cur = account.currency === "KHR" && account.kind !== "till" ? "KHR" : "USD";
  const totals = ledgerTotals(ledger);
  const { current, slice } = paginate(rows, page, pageSize);
  return (
    <Page>
      <AccountHeader account={account} />
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Statement lines">
        <StatStrip
          className="border-b"
          items={[
            { label: "Opening balance · 1 Oct", value: money(totals.opening, cur) },
            { label: "Total credits", value: money(totals.credits, cur, { sign: true }), valueClassName: "text-success-fg" },
            { label: "Total debits", value: money(-totals.debits, cur) },
            { label: "Closing balance · 31 Oct", value: money(totals.closing, cur) },
          ]}
        />
        <FilterBar
          className="border-b border-line"
          onExport={() =>
            downloadCsv(`${account.name.replace(/\W+/g, "_")}_transactions.csv`, [
              ["Date", "Description", "Reference", "Category", `Debit (${cur})`, `Credit (${cur})`, `Balance (${cur})`, "Reconciliation"],
              ...rows.map((row) => [row.date, row.description, row.ref, row.category, row.debit || "", row.credit || "", row.balance, RECON_LABEL[row.recon].label]),
            ])
          }
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search description or reference" />
          <FilterMenu
            label="Date"
            icon="calendar"
            value={range}
            onChange={setRange}
            options={[
              { value: "oct", label: "1–31 Oct 2026" },
              { value: "week", label: "Last 7 days" },
            ]}
          />
          <FilterMenu
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "credit", label: "Money in" },
              { value: "debit", label: "Money out" },
            ]}
          />
          <FilterMenu label="Category" value={category} onChange={setCategory} options={[...new Set(ledger.map((row) => row.category))].sort().map((c) => ({ value: c, label: c }))} />
          <FilterMenu label="Reconciliation" value={recon} onChange={setRecon} options={Object.entries(RECON_LABEL).map(([value, r]) => ({ value, label: r.label }))} />
        </FilterBar>
        <LedgerTable ledger={slice} currency={cur} sort={sort} onSort={setSort} />
        <Pagination
          page={current}
          pageSize={pageSize}
          total={rows.length}
          noun="transactions"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
    </Page>
  );
}

export function AccountCategories({ id }: { id: string }) {
  const { account, ledger, state } = useAccount(id);
  const { update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [ruleOpen, setRuleOpen] = useState(false);
  if (!account) notFound();
  const cur = account.currency === "KHR" && account.kind !== "till" ? "KHR" : "USD";
  const rows = ledger.filter((row) => (direction === "out" ? row.debit : row.credit) > 0);
  const total = rows.reduce((s, row) => s + (direction === "out" ? row.debit : row.credit), 0);
  const groups = Object.entries(
    rows.reduce<Record<string, { count: number; total: number }>>((acc, row) => {
      const g = (acc[row.category] ??= { count: 0, total: 0 });
      g.count++;
      g.total += direction === "out" ? row.debit : row.credit;
      return acc;
    }, {}),
  )
    .map(([name, g]) => ({ name, ...g, share: total ? (g.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
  const top = groups.slice(0, 5);
  const rest = groups.slice(5);
  const shown = rest.length ? [...top, { name: "Other", count: rest.reduce((s, g) => s + g.count, 0), total: rest.reduce((s, g) => s + g.total, 0), share: rest.reduce((s, g) => s + g.share, 0) }] : top;
  const palette = ["#1d33ba", "#0d9488", "#ea580c", "#0284c7", "#f43f5e", "#64748b"];
  const colorOf = (name: string, index: number) => (name === "Other" ? "#64748b" : (CATEGORY_COLORS[name] && !shown.slice(0, index).some((g) => CATEGORY_COLORS[g.name] === CATEGORY_COLORS[name]) ? CATEGORY_COLORS[name] : palette[index]));
  const rules = state.rules.filter((rule) => rule.accountId === id);
  const isOwner = user?.role === "owner";

  return (
    <Page>
      <AccountHeader account={account} />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden" aria-labelledby="by-category-title">
          <CardHeader
            title={direction === "out" ? "Money out by category" : "Money in by category"}
            titleId="by-category-title"
            subtitle={`October 2026 · ${money(total, cur)} ${cur} · ${rows.length} transactions`}
            divided
            className="flex-wrap"
            actions={
              <Segmented
                label="Direction"
                value={direction}
                onChange={setDirection}
                options={[
                  { value: "out", label: "Money out" },
                  { value: "in", label: "Money in" },
                ]}
              />
            }
          />
          {rows.length ? (
            <>
              <div className="flex flex-col items-center gap-6 border-b border-line p-5 sm:flex-row">
                <Donut segments={shown.map((g, i) => ({ label: g.name, value: g.total, color: colorOf(g.name, i) }))} center={money(total, cur)} sub={direction === "out" ? "Money out" : "Money in"} />
                <ul className="flex w-full flex-1 flex-col gap-2.5">
                  {shown.map((g, i) => (
                    <li key={g.name} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,1fr)_52px] items-center gap-3 text-sm leading-5">
                      <span className="flex min-w-0 items-center gap-2 text-body">
                        <Dot color={colorOf(g.name, i)} />
                        <span className="truncate">{g.name}</span>
                      </span>
                      <Bar value={g.share} color={colorOf(g.name, i)} />
                      <span className="tabular text-right text-[13px] text-muted">{g.share.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <DataTable
                caption="Categories"
                rows={shown}
                rowKey={(g) => g.name}
                minWidth={560}
                onRowClick={(g) => g.name !== "Other" && router.push(`/banking/accounts/${id}/transactions?category=${encodeURIComponent(g.name)}`)}
                columns={[
                  { key: "name", header: "Category", cell: (g) => <span className="font-medium text-fg">{g.name}</span> },
                  { key: "count", header: "Transactions", align: "right", width: "120px", cell: (g) => <span className="tabular text-fg">{g.count}</span> },
                  { key: "total", header: `Total (${cur})`, align: "right", width: "140px", cell: (g) => <span className="tabular text-fg">{num(g.total, cur)}</span> },
                  { key: "share", header: "Share", align: "right", width: "90px", cell: (g) => <span className="tabular text-fg">{g.share.toFixed(1)}%</span> },
                  { key: "go", header: "Open", srHeader: true, width: "48px", cell: (g) => g.name !== "Other" && <ChevronRight size={16} className="ml-auto text-icon" aria-hidden /> },
                ]}
                mobileRow={(g) => <MobileRow title={g.name} sub={`${g.count} transactions`} value={<span className="tabular">{num(g.total, cur)}</span>} valueSub={`${g.share.toFixed(1)}%`} />}
              />
            </>
          ) : (
            <p className="px-5 py-14 text-center text-sm text-muted">No {direction === "out" ? "money out" : "money in"} this month.</p>
          )}
        </Card>

        <Card aria-labelledby="rules-title">
          <CardHeader
            title="Categorisation rules"
            titleId="rules-title"
            subtitle="Applied to new statement lines for this account"
            actions={
              isOwner && (
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => setRuleOpen(true)}>
                  Add rule
                </Button>
              )
            }
          />
          <ul className="flex flex-col px-5 pt-3">
            {rules.length === 0 && <li className="py-6 text-center text-[13px] text-muted">No rules yet for this account.</li>}
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-3 border-b border-line-subtle py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-5 text-muted">
                    Description contains <span className="font-medium text-fg">“{rule.contains}”</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ArrowRight size={14} className="text-icon" aria-hidden />
                    <Badge>{rule.category}</Badge>
                    {rule.learned && (
                      <Badge tone="violet" size="sm" className="border border-icon-ai/20">
                        <Sparkles size={11} aria-hidden /> Learned
                      </Badge>
                    )}
                  </p>
                </div>
                <Switch
                  label={`Rule: ${rule.contains} to ${rule.category}`}
                  checked={rule.active}
                  disabled={!isOwner}
                  onChange={(checked) => update((draft) => void (draft.rules.find((r) => r.id === rule.id)!.active = checked))}
                />
              </li>
            ))}
          </ul>
          <p className="m-5 flex gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3 text-[13px] leading-5 text-body">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
            Rules only suggest a category. You still review every suggestion.
          </p>
        </Card>
      </div>
      <AddRuleDialog
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        onAdd={(contains, category) => {
          update((draft) => void draft.rules.push({ id: `r-${Date.now()}`, accountId: id, contains: contains.toUpperCase(), category, learned: false, active: true }));
          toast({ title: "Rule added", body: `Lines containing “${contains.toUpperCase()}” will be suggested as ${category}.` });
        }}
      />
    </Page>
  );
}

function AddRuleDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (contains: string, category: string) => void }) {
  const [contains, setContains] = useState("");
  const [category, setCategory] = useState(LINE_CATEGORIES[3]);
  const [error, setError] = useState<string>();
  return (
    <Dialog open={open} onClose={onClose} labelledBy="rule-title" width={480}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (contains.trim().length < 2) return setError("Enter at least 2 characters to look for.");
          onAdd(contains.trim(), category);
          setContains("");
          setError(undefined);
          onClose();
        }}
      >
        <ModalHeader id="rule-title" title="Add a categorisation rule" description="When a statement line’s description contains this text, the AI suggests the category." onClose={onClose} />
        <ModalBody className="flex flex-col gap-5">
          <TextField size="md" label="Description contains" placeholder="e.g. TOTAL STATION" value={contains} onChange={(event) => setContains(event.target.value)} state={error ? "error" : "default"} message={error} />
          <SelectField label="Suggest category" value={category} onChange={(event) => setCategory(event.target.value)} options={LINE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add rule</Button>
        </ModalFooter>
      </form>
    </Dialog>
  );
}

export function AccountStatements({ id }: { id: string }) {
  const { account, state } = useAccount(id);
  const router = useRouter();
  if (!account) notFound();
  const rows = state.imports.filter((row) => row.accountId === id);
  return (
    <Page>
      <AccountHeader account={account} />
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Statements">
        <DataTable
          caption="Imported statements"
          rows={rows}
          rowKey={(row) => row.id}
          empty={account.kind === "till" ? "Cash tills have no bank statements. Counts are recorded in Till balancing." : "No statements imported for this account yet."}
          minWidth={640}
          onRowClick={(row) => router.push(row.status === "review" ? "/banking/import/review" : `/banking/accounts/${id}/transactions`)}
          columns={[
            { key: "period", header: "Statement period", cell: (row) => <span className="font-medium text-fg">{row.period}</span> },
            { key: "file", header: "File", cell: (row) => <TwoLine title={row.file} titleClassName="font-normal" sub={`by ${row.by}`} /> },
            { key: "lines", header: "Lines", align: "right", width: "90px", cell: (row) => <span className="tabular">{row.lines}</span> },
            {
              key: "status",
              header: "Status",
              width: "150px",
              cell: (row) => <StatusPill tone={row.status === "completed" ? "success" : row.status === "review" ? "warning" : "error"}>{row.status === "completed" ? "Completed" : row.status === "review" ? "Needs Review" : "Failed"}</StatusPill>,
            },
          ]}
          mobileRow={(row) => <MobileRow title={row.period} sub={row.file} value={`${row.lines} lines`} valueSub={row.status} />}
        />
      </section>
    </Page>
  );
}
