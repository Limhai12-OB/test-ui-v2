"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, CircleCheck, Scale, TrendingUp, Undo2, FileText, ReceiptText, Tags } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { Bar } from "@/components/ui/charts";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { Page, ScopeNotice } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { BILL_STATUS, billBalance, billStatus, tillVariance, useFinance } from "@/lib/finance-store";
import { cn, fmtDate, fmtDay, money, signed } from "@/lib/format";
import { useSession } from "@/lib/session";
import { RecordsHeader } from "./records-shared";

const EXPENSES = [
  { name: "Inventory purchases", amount: 14820, color: "#1d33ba" },
  { name: "Payroll", amount: 7640, color: "#0d9488" },
  { name: "Rent", amount: 4800, color: "#ea580c" },
  { name: "Utilities", amount: 2460, color: "#0284c7" },
  { name: "Internet & phone", amount: 620, color: "#f43f5e" },
  { name: "Other", amount: 1600, color: "#64748b" },
];
const MANAGER_EXPENSES = [
  { name: "Inventory purchases", amount: 4210, color: "#1d33ba" },
  { name: "Utilities", amount: 1820, color: "#0284c7" },
  { name: "Payroll", amount: 2140, color: "#0d9488" },
  { name: "Other", amount: 700, color: "#64748b" },
];

/** Frame 10.1 "Financial Overview" (and a branch-only version for Branch Managers). */
export function RecordsOverview() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const unpaidBills = state.bills.filter((b) => ["open", "partial", "overdue"].includes(billStatus(b)));
  const unpaid = unpaidBills.reduce((s, b) => s + (b.currency === "KHR" ? billBalance(b) / 4100 : billBalance(b)), 0);
  const overdue = unpaidBills.filter((b) => billStatus(b) === "overdue").reduce((s, b) => s + billBalance(b), 0);
  const awaitingRecons = state.recons.filter((r) => r.status === "submitted");
  const awaitingTills = state.tills.filter((t) => t.status === "submitted");
  const expenses = isManager ? MANAGER_EXPENSES : EXPENSES;
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const dueSoon = [...unpaidBills].sort((a, b) => (billStatus(a) === "overdue" ? -1 : billStatus(b) === "overdue" ? 1 : a.due.localeCompare(b.due))).slice(0, 5);
  const recent = state.transactions.filter((t) => t.status !== "reversed").slice(0, 5);

  const tasks: { icon: React.ReactNode; title: string; sub: string; href: string; action: string }[] = isManager
    ? [
        ...state.tills
          .filter((t) => t.date === "2026-10-31" && (t.status === "draft" || t.status === "returned"))
          .map((t) => ({ icon: <Calculator size={18} aria-hidden />, title: "Balance today’s till", sub: `Cash till · ${t.branch} · due by 18:00`, href: "/financial-records/till/count", action: "Count" })),
        ...state.recons
          .filter((r) => r.status === "returned" || r.status === "draft")
          .map((r) => ({
            icon: r.status === "returned" ? <Undo2 size={18} aria-hidden /> : <Scale size={18} aria-hidden />,
            title: r.status === "returned" ? `Reconciliation returned · ${r.periodLabel}` : `Reconcile Wing Merchant KHR · ${r.periodLabel}`,
            sub: r.status === "returned" ? "Returned by Sokha Chan · 2 lines to fix" : `${r.lines.filter((l) => l.state === "todo").length} lines to do`,
            href: `/financial-records/reconciliation/${r.id}`,
            action: r.status === "returned" ? "Fix" : "Continue",
          })),
      ]
    : [
        ...awaitingRecons.map((r) => ({
          icon: <Scale size={18} aria-hidden />,
          title: "Reconciliation · Wing Merchant KHR",
          sub: `${r.periodLabel} · ${r.preparedBy} · submitted ${r.submittedAt?.split(", ")[1] ?? ""}`,
          href: `/financial-records/reconciliation/${r.id}`,
          action: "Review",
        })),
        ...awaitingTills.map((t) => {
          const v = tillVariance(t);
          return {
            icon: <Calculator size={18} aria-hidden />,
            title: `Till balance · ${t.branch}`,
            sub: v.usd || v.khr ? `${fmtDay(t.date)} · variance ${money(v.usd, "USD")} and ${money(v.khr, "KHR", { sign: true })}` : `${fmtDay(t.date)} · no variance`,
            href: `/financial-records/till/${t.id}`,
            action: "Review",
          };
        }),
      ];

  return (
    <Page>
      <RecordsHeader />
      {isManager && <ScopeNotice branch={user?.branch} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard
          label="Revenue · October"
          icon={<TrendingUp size={16} aria-hidden />}
          value={money(isManager ? 13260 : 48620, "USD")}
          unit="USD"
          lines={[<span key="d" className="flex items-center gap-2"><Delta value={isManager ? "6.2%" : "12.4%"} direction="up" tone="success" /> vs last month</span>]}
        />
        <StatCard
          label="Expenses · October"
          icon={<ReceiptText size={16} aria-hidden />}
          value={money(isManager ? 8870 : 31940, "USD")}
          unit="USD"
          lines={[<span key="d" className="flex items-center gap-2"><Delta value={isManager ? "9.4%" : "4.1%"} direction="up" tone="error" /> vs last month</span>]}
        />
        <StatCard
          label="Unpaid bills"
          icon={<FileText size={16} aria-hidden />}
          value={money(unpaid, "USD")}
          unit="USD"
          lines={[`${unpaidBills.length} open bill${unpaidBills.length === 1 ? "" : "s"}${overdue ? ` · ${money(overdue, "USD")} overdue` : " · nothing overdue"}`]}
        />
        <StatCard
          label={isManager ? "Your open tasks" : "Awaiting your sign-off"}
          icon={<CircleCheck size={16} aria-hidden />}
          value={String(tasks.length)}
          lines={[isManager ? "Till count and reconciliation" : `${awaitingTills.length} till count${awaitingTills.length === 1 ? "" : "s"} · ${awaitingRecons.length} reconciliation`]}
        />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card aria-labelledby="expense-cat-title">
          <CardHeader
            title="Expenses by category"
            titleId="expense-cat-title"
            subtitle={`October 2026 · ${isManager ? `${user?.branch}` : "all branches"} · ${money(expenseTotal, "USD")} USD`}
            actions={<CardLink href="/financial-records/categories">Manage categories</CardLink>}
          />
          <ul className="flex flex-col gap-3.5 p-5">
            {expenses.map((e) => (
              <li key={e.name} className="grid grid-cols-[minmax(110px,170px)_minmax(0,1fr)_90px_48px] items-center gap-3 text-sm leading-5 max-sm:grid-cols-[minmax(0,1fr)_90px_48px]">
                <span className="truncate text-body">{e.name}</span>
                <Bar value={(e.amount / Math.max(...expenses.map((x) => x.amount))) * 100} color={e.color} className="max-sm:hidden" />
                <span className="tabular text-right text-fg">{money(e.amount, "USD")}</span>
                <span className="text-right text-[13px] text-muted">{((e.amount / expenseTotal) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card aria-labelledby="signoff-title">
          <CardHeader
            title={isManager ? "Your tasks" : "Awaiting your sign-off"}
            titleId="signoff-title"
            badge={
              <Badge tone={isManager ? "warning" : "info"} size="sm">
                {tasks.length}
              </Badge>
            }
          />
          {tasks.length ? (
            <ul className="flex flex-col px-5 py-2">
              {tasks.map((task, i) => (
                <li key={task.href + i} className={cn("flex items-center gap-3 py-3", i < tasks.length - 1 && "border-b border-line-subtle")}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-subtle text-brand">{task.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-5 font-medium text-fg">{task.title}</span>
                    <span className="block text-xs leading-4 text-muted">{task.sub}</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => router.push(task.href)}>
                    {task.action}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-[13px] text-muted">Nothing is waiting. Every count and reconciliation is signed off.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card className="overflow-hidden" aria-labelledby="due-title">
          <CardHeader title="Bills due soon" titleId="due-title" subtitle="Open bills by due date, overdue first" divided actions={<CardLink href="/financial-records/bills">View bills</CardLink>} />
          <DataTable
            caption="Bills due soon"
            rows={dueSoon}
            rowKey={(b) => b.id}
            minWidth={560}
            onRowClick={(b) => router.push(`/financial-records/bills/${b.id}`)}
            empty="No unpaid bills."
            columns={[
              { key: "supplier", header: "Supplier", cell: (b) => <TwoLine title={b.supplier} sub={`${b.id} · ${b.branch}`} /> },
              { key: "due", header: "Due ↑", width: "130px", cell: (b) => <span className="text-muted">{fmtDate(b.due)}</span> },
              {
                key: "balance",
                header: `Balance (USD)`,
                align: "right",
                width: "130px",
                cell: (b) => <span className={cn("tabular", billStatus(b) === "overdue" ? "text-error-fg" : "text-fg")}>{signed(billBalance(b), b.currency).replace("+", "")}</span>,
              },
              { key: "status", header: "Status", width: "140px", cell: (b) => <StatusPill tone={BILL_STATUS[billStatus(b)].tone}>{BILL_STATUS[billStatus(b)].label}</StatusPill> },
            ]}
            mobileRow={(b) => <MobileRow title={b.supplier} sub={`${b.id} · due ${fmtDay(b.due)}`} value={<span className="tabular">{money(billBalance(b), b.currency)}</span>} valueSub={BILL_STATUS[billStatus(b)].label} />}
          />
        </Card>
        <Card className="overflow-hidden" aria-labelledby="recent-title">
          <CardHeader title="Recent transactions" titleId="recent-title" subtitle={isManager ? `${user?.branch} only` : "Latest across all branches"} divided actions={<CardLink href="/financial-records/transactions">View all</CardLink>} />
          <ul className="flex flex-col">
            <li className="flex h-11 items-center justify-between border-b border-line bg-subtle px-4 text-xs font-medium text-muted">
              <span>Description</span>
              <span>Amount</span>
            </li>
            {recent.map((t) => (
              <li key={t.id} className="border-b border-line-subtle last:border-b-0">
                <Link href={`/financial-records/transactions?txn=${t.id}`} className="focus-ring flex items-center gap-3 px-4 py-2.5 hover:bg-subtle">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-5 font-medium text-fg">{t.description}</span>
                    <span className="block truncate text-xs leading-4 text-muted">
                      {fmtDay(t.date)} · {t.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn("tabular block text-[13px] leading-5", t.amount > 0 ? "text-success-fg" : "text-fg")}>{money(t.amount, t.currency, { sign: true })}</span>
                    <span className="block text-xs leading-4 text-muted">{t.currency === "KHR" ? `KHR · ≈ ${money(Math.abs(t.amount) / 4100, "USD")}` : "USD"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {isManager && (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-muted">
          <Tags size={14} aria-hidden /> Categories are managed by the Business Owner.
        </p>
      )}
    </Page>
  );
}
