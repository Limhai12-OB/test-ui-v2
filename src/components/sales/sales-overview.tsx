"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, FileText, ShoppingCart, TrendingUp } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { DataTable, MobileRow } from "@/components/ui/data-table";
import { Page, ScopeNotice } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { cn, daysBetween, fmtDate, initialsOf, money, num, TODAY } from "@/lib/format";
import { docTotal } from "@/lib/mock/ops-data";
import { INVOICE_STATUS, invoiceBalance, invoiceStatus, useBranchScope, useOps } from "@/lib/ops-store";
import { SourceDonut, WeeklySalesChart, type Source } from "./sales-charts";
import { SalesHeader } from "./sales-shared";

/** October sales by week and source (reporting mock, frame 09.1). */
const WEEKS = [
  { label: "1–4 Oct", wholesale: 3190, walkin: 2270, online: 520 },
  { label: "5–11 Oct", wholesale: 5560, walkin: 3870, online: 820 },
  { label: "12–18 Oct", wholesale: 6170, walkin: 3920, online: 870 },
  { label: "19–25 Oct", wholesale: 6800, walkin: 4040, online: 960 },
  { label: "26–31 Oct", wholesale: 5620, walkin: 3360, online: 650 },
];
const SOURCES: Source[] = [
  { key: "wholesale", label: "Wholesale invoices", short: "Wholesale", color: "var(--lf-chart-revenue)" },
  { key: "walkin", label: "Walk-in sales", short: "Walk-in", color: "var(--lf-secondary-strong)" },
  { key: "online", label: "Online · Shopify", short: "Online", color: "var(--lf-chart-expense)" },
];

/** Frame 09.1 "Sales Overview". */
export function SalesOverview() {
  const { state } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const share = scope ? 0.273 : 1;
  const weeks = WEEKS.map((w) => ({ ...w, wholesale: Math.round(w.wholesale * share), walkin: Math.round(w.walkin * share), online: scope ? 0 : w.online }));
  const totals = { wholesale: weeks.reduce((s, w) => s + w.wholesale, 0), walkin: weeks.reduce((s, w) => s + w.walkin, 0), online: weeks.reduce((s, w) => s + w.online, 0) };
  const total = totals.wholesale + totals.walkin + totals.online;
  // Branch Managers have no online shop, so their charts leave it out.
  const shownSources = SOURCES.filter((src) => !scope || src.key !== "online");
  const invoices = state.invoices.filter((i) => !scope || i.branch === scope);
  const open = invoices.filter((i) => ["sent", "partial", "overdue"].includes(invoiceStatus(i)));
  const outstanding = open.reduce((s, i) => s + invoiceBalance(i), 0);
  const overdue = open.filter((i) => invoiceStatus(i) === "overdue");
  const attention = open
    .filter((i) => invoiceStatus(i) === "overdue" || daysBetween(TODAY, i.due) <= 7)
    .sort((a, b) => a.due.localeCompare(b.due));
  const top = Object.entries(
    invoices.filter((i) => i.issued.startsWith("2026-10") && !i.stored).reduce<Record<string, number>>((acc, i) => ((acc[i.customerId] = (acc[i.customerId] ?? 0) + docTotal(i.lines)), acc), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTop = top[0]?.[1] ?? 1;
  const customer = (id: string) => state.customers.find((c) => c.id === id)!;

  return (
    <Page>
      <SalesHeader />
      {scope && <ScopeNotice branch={scope} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Sales · October" icon={<TrendingUp size={16} aria-hidden />} value={money(total)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value={scope ? "6.2%" : "12.4%"} direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Wholesale invoiced" icon={<FileText size={16} aria-hidden />} value={money(totals.wholesale)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value="14.6%" direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Walk-in sales" icon={<ShoppingCart size={16} aria-hidden />} value={money(totals.walkin)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value="7.7%" direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Outstanding" icon={<CalendarClock size={16} aria-hidden />} value={money(outstanding)} unit="USD" lines={[`${open.length} open · ${money(overdue.reduce((s, i) => s + invoiceBalance(i), 0))} overdue`]} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card aria-labelledby="by-week-title">
          <CardHeader
            title="Sales by week"
            titleId="by-week-title"
            subtitle={`October 2026 · ${scope ?? "all branches"} · USD`}
          />
          <WeeklySalesChart weeks={weeks} sources={shownSources} />
        </Card>
        <Card aria-labelledby="by-source-title">
          <CardHeader title="Sales by source" titleId="by-source-title" subtitle="Share of October sales · point at a source" />
          <SourceDonut totals={totals} sources={shownSources} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card className="overflow-hidden" aria-labelledby="attention-inv-title">
          <CardHeader title="Invoices that need attention" titleId="attention-inv-title" subtitle="Overdue or due within 7 days" divided actions={<CardLink href="/sales/invoices">View all invoices</CardLink>} />
          <DataTable
            caption="Invoices that need attention"
            rows={attention}
            rowKey={(i) => i.id}
            minWidth={640}
            onRowClick={(i) => router.push(`/sales/invoices/${i.id}`)}
            empty="Nothing is overdue or due this week."
            columns={[
              { key: "id", header: "Invoice", width: "150px", cell: (i) => <Link href={`/sales/invoices/${i.id}`} className="focus-ring rounded-xs text-brand hover:underline">{i.id}</Link> },
              { key: "customer", header: "Customer", cell: (i) => <span className="text-fg">{customer(i.customerId).name}</span> },
              { key: "due", header: "Due ↑", width: "130px", cell: (i) => <span className="text-muted">{fmtDate(i.due)}</span> },
              { key: "balance", header: "Balance (USD)", align: "right", width: "130px", cell: (i) => <span className={cn("tabular", invoiceStatus(i) === "overdue" ? "text-error-fg" : "text-fg")}>{num(invoiceBalance(i))}</span> },
              { key: "status", header: "Status", width: "140px", cell: (i) => <StatusPill tone={INVOICE_STATUS[invoiceStatus(i)].tone}>{INVOICE_STATUS[invoiceStatus(i)].label}</StatusPill> },
            ]}
            mobileRow={(i) => <MobileRow title={`${i.id} · ${customer(i.customerId).name}`} sub={`Due ${fmtDate(i.due)}`} value={<span className="tabular">{num(invoiceBalance(i))}</span>} valueSub={INVOICE_STATUS[invoiceStatus(i)].label} />}
          />
        </Card>
        <Card aria-labelledby="top-customers-title">
          <CardHeader title="Top customers" titleId="top-customers-title" subtitle="Invoiced in October" />
          <ul className="flex flex-col gap-4 p-5">
            {top.map(([id, value]) => (
              <li key={id}>
                <Link href={`/sales/customers/${id}`} className="focus-ring group flex items-center gap-3 rounded-md">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-medium text-brand">{initialsOf(customer(id).name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg group-hover:underline">{customer(id).name}</span>
                    <span className="mt-1 block h-1 rounded-full bg-line">
                      <span className="lf-grow-x block h-full rounded-full bg-primary" style={{ width: `${(value / maxTop) * 100}%` }} />
                    </span>
                  </span>
                  <span className="tabular text-sm text-fg">{money(value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
