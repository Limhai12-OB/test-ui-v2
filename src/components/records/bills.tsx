"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Page, ScopeNotice, Tabs } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { BILL_STATUS, billBalance, billStatus, billTotal, useFinance } from "@/lib/finance-store";
import { addDays, cn, daysBetween, downloadCsv, fmtDate, money, TODAY } from "@/lib/format";
import { BRANCH_NAMES } from "@/lib/mock/finance-data";
import type { Bill, BillStatus } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { RecordsHeader } from "./records-shared";

const usd = (bill: Bill, value: number) => (bill.currency === "KHR" ? value / 4100 : value);

function MoneyStack({ value, currency, tone }: { value: number; currency: "USD" | "KHR"; tone?: "error" }) {
  return (
    <div className="text-right">
      <p className={cn("tabular text-[13px] leading-5 whitespace-nowrap", tone === "error" ? "text-error-fg" : "text-fg")}>{money(value, currency)}</p>
      <p className="text-xs leading-4 whitespace-nowrap text-muted">{currency === "KHR" ? (value ? `KHR · ≈ ${money(value / 4100, "USD")}` : "KHR") : "USD"}</p>
    </div>
  );
}

/** Frame 10.2 "Bills List" (owner) and the Branch Manager variant. */
export function BillsList() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const isManager = user?.role === "manager";
  const [tab, setTab] = useState<"all" | BillStatus>("all");
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "bill", dir: "desc" });
  const [page, setPage] = useState(1);

  const bills = state.bills;
  const counts = bills.reduce<Record<string, number>>((acc, b) => ((acc[billStatus(b)] = (acc[billStatus(b)] ?? 0) + 1), acc), {});
  const unpaid = bills.filter((b) => ["open", "partial", "overdue"].includes(billStatus(b)));
  const overdue = bills.filter((b) => billStatus(b) === "overdue");
  const dueSoon = unpaid.filter((b) => billStatus(b) !== "overdue" && daysBetween(TODAY, b.due) <= 7);
  const paidOct = bills.filter((b) => billStatus(b) === "paid");
  const sumUsd = (list: Bill[], pick: (b: Bill) => number) => list.reduce((s, b) => s + usd(b, pick(b)), 0);

  const rows = bills
    .filter((b) => {
      const status = billStatus(b);
      if (tab !== "all" && status !== tab) return false;
      if (query && !`${b.id} ${b.supplier} ${b.supplierNo}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (supplier && b.supplier !== supplier) return false;
      if (category && b.category !== category) return false;
      if (branch && b.branch !== branch) return false;
      if (due === "overdue" && status !== "overdue") return false;
      if (due === "week" && !(b.due >= TODAY && b.due <= addDays(TODAY, 7))) return false;
      if (due === "month" && !(b.due >= TODAY && b.due <= addDays(TODAY, 30))) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "due") return a.due.localeCompare(b.due) * dir;
      return a.id.localeCompare(b.id) * dir;
    });
  const { current, slice } = paginate(rows, page, 8);
  const tabs: ("all" | BillStatus)[] = ["all", "draft", "open", "partial", "overdue", "paid", "cancelled"];

  const cancel = (bill: Bill) => {
    update((draft) => {
      const target = draft.bills.find((b) => b.id === bill.id)!;
      target.stored = "cancelled";
      target.history.unshift({ kind: "status", title: "Bill cancelled", meta: `${user?.name} · 31 Oct 2026, 17:50` });
    });
    toast({ title: `${bill.id} cancelled`, body: "It no longer counts towards unpaid bills." });
  };

  return (
    <Page>
      <RecordsHeader subtitle={isManager ? `Bills recorded for ${user?.branch} Branch.` : undefined} />
      {isManager && <ScopeNotice branch={user?.branch} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Unpaid bills" value={money(sumUsd(unpaid, billBalance), "USD")} unit="USD" lines={[`≈ ${money(sumUsd(unpaid, billBalance) * 4100, "KHR")}`, `${unpaid.length} open bill${unpaid.length === 1 ? "" : "s"}`]} />
        <StatCard
          label="Overdue"
          tone={overdue.length ? "error" : "default"}
          valueTone={overdue.length ? "error" : undefined}
          value={money(sumUsd(overdue, billBalance), "USD")}
          unit="USD"
          lines={overdue.length ? [`≈ ${money(sumUsd(overdue, billBalance) * 4100, "KHR")}`, `${overdue[0].id} · ${-daysBetween(TODAY, overdue[0].due)} days`] : ["Nothing overdue"]}
        />
        <StatCard
          label="Due within 7 days"
          tone={dueSoon.length ? "warning" : "default"}
          value={money(sumUsd(dueSoon, billBalance), "USD")}
          unit="USD"
          lines={[`≈ ${money(sumUsd(dueSoon, billBalance) * 4100, "KHR")}`, dueSoon.length === 1 ? `${dueSoon[0].id} · due ${daysBetween(TODAY, dueSoon[0].due) === 1 ? "tomorrow" : `in ${daysBetween(TODAY, dueSoon[0].due)} days`}` : `${dueSoon.length} bills`]}
        />
        <StatCard label="Paid in October" value={money(sumUsd(paidOct, (b) => b.paid), "USD")} unit="USD" lines={[`≈ ${money(sumUsd(paidOct, (b) => b.paid) * 4100, "KHR")}`, `${paidOct.length} bills`]} />
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:mt-6" aria-label="Bills">
        <Tabs
          label="Bill status"
          className="px-5 pt-1"
          value={tab}
          onChange={(id) => {
            setTab(id as typeof tab);
            setPage(1);
          }}
          items={tabs
            .filter((t) => t === "all" || !isManager || counts[t])
            .map((t) => ({ id: t, label: t === "all" ? "All" : BILL_STATUS[t].label, count: t === "all" ? bills.length : counts[t] ?? 0 }))}
        />
        <FilterBar
          className="border-b border-line"
          onExport={() =>
            downloadCsv("bills.csv", [
              ["Bill", "Supplier", "Category", "Branch", "Due", "Total", "Balance", "Currency", "Status"],
              ...rows.map((b) => [b.id, b.supplier, b.category, b.branch, b.due, billTotal(b), billBalance(b), b.currency, BILL_STATUS[billStatus(b)].label]),
            ])
          }
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search number or supplier" />
          <FilterMenu label="Supplier" value={supplier} onChange={setSupplier} options={[...new Set(bills.map((b) => b.supplier))].sort().map((s) => ({ value: s, label: s }))} />
          <FilterMenu label="Category" value={category} onChange={setCategory} options={[...new Set(bills.map((b) => b.category))].sort().map((s) => ({ value: s, label: s }))} />
          {!isManager && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={["Business-wide", ...BRANCH_NAMES].map((s) => ({ value: s, label: s }))} />}
          <FilterMenu
            label="Due date"
            icon="calendar"
            value={due}
            onChange={setDue}
            options={[
              { value: "overdue", label: "Overdue" },
              { value: "week", label: "Next 7 days" },
              { value: "month", label: "Next 30 days" },
            ]}
          />
        </FilterBar>
        <DataTable
          caption="Bills"
          rows={slice}
          rowKey={(b) => b.id}
          sort={sort}
          sortable={["bill", "due"]}
          onSort={setSort}
          onRowClick={(b) => router.push(`/financial-records/bills/${b.id}`)}
          empty="No bills match these filters."
          minWidth={isManager ? 860 : 1000}
          columns={[
            {
              key: "bill",
              header: "Bill",
              width: "124px",
              cell: (b) => (
                <Link href={`/financial-records/bills/${b.id}`} className="focus-ring rounded-xs font-medium text-brand hover:underline">
                  {b.id}
                </Link>
              ),
            },
            { key: "supplier", header: "Supplier", cell: (b) => <TwoLine title={b.supplier} titleClassName="font-normal" sub={b.category} /> },
            { key: "due", header: "Due", width: "130px", cell: (b) => <span className="text-muted">{fmtDate(b.due)}</span> },
            { key: "total", header: "Total", align: "right", width: "130px", cell: (b) => <MoneyStack value={billTotal(b)} currency={b.currency} /> },
            { key: "balance", header: "Balance", align: "right", width: "130px", cell: (b) => <MoneyStack value={billBalance(b)} currency={b.currency} tone={billStatus(b) === "overdue" ? "error" : undefined} /> },
            { key: "status", header: "Status", width: "160px", cell: (b) => <StatusPill tone={BILL_STATUS[billStatus(b)].tone}>{BILL_STATUS[billStatus(b)].label}</StatusPill> },
            ...(isManager ? [] : [{ key: "branch", header: "Branch", width: "140px", cell: (b: Bill) => <span className="text-muted">{b.branch}</span> }]),
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "56px",
              cell: (b: Bill) => {
                const status = billStatus(b);
                return (
                  <Menu
                    align="end"
                    width={200}
                    triggerLabel={`Actions for ${b.id}`}
                    triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                    trigger={<Ellipsis size={16} aria-hidden />}
                    items={[
                      { id: "view", label: "View bill", onSelect: () => router.push(`/financial-records/bills/${b.id}`) },
                      { id: "pay", label: "Record payment", disabled: !["open", "partial", "overdue"].includes(status), onSelect: () => router.push(`/financial-records/bills/${b.id}?pay=1`) },
                      ...(isManager ? [] : [{ id: "cancel", label: "Cancel bill", disabled: status === "paid" || status === "cancelled" || b.paid > 0, onSelect: () => cancel(b) }]),
                    ]}
                  />
                );
              },
            },
          ]}
          mobileRow={(b) => (
            <MobileRow
              title={`${b.id} · ${b.supplier}`}
              sub={`Due ${fmtDate(b.due)}`}
              value={<span className={cn("tabular", billStatus(b) === "overdue" && "text-error-fg")}>{money(billBalance(b), b.currency)}</span>}
              valueSub={BILL_STATUS[billStatus(b)].label}
            />
          )}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="bills" onPage={setPage} />
      </section>
    </Page>
  );
}
