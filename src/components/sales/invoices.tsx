"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Page, ScopeNotice, Tabs } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { cn, daysBetween, downloadCsv, fmtDate, money, num, TODAY } from "@/lib/format";
import { BRANCHES_4, type Invoice } from "@/lib/mock/ops-types";
import { INVOICE_STATUS, invoiceBalance, invoicePaid, invoiceStatus, invoiceTotal, nowMeta, useBranchScope, useOps, type InvoiceStatus } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { SalesHeader } from "./sales-shared";

/** Frame 09.7 "Invoice List" (owner and Branch Manager). */
export function InvoicesList() {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [tab, setTab] = useState<string>(params.get("status") ?? "all");
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>("60");
  const [branch, setBranch] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "id", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const nameOf = (id: string) => state.customers.find((c) => c.id === id)?.name ?? id;

  const invoices = state.invoices.filter((i) => !scope || i.branch === scope);
  const inRange = invoices.filter((i) => !range || (range === "60" ? i.issued >= "2026-09-01" : true));
  const counts = inRange.reduce<Record<string, number>>((acc, i) => ((acc[invoiceStatus(i)] = (acc[invoiceStatus(i)] ?? 0) + 1), acc), {});
  const open = invoices.filter((i) => ["sent", "partial", "overdue"].includes(invoiceStatus(i)));
  const overdue = open.filter((i) => invoiceStatus(i) === "overdue");
  const dueSoon = open.filter((i) => invoiceStatus(i) !== "overdue" && daysBetween(TODAY, i.due) <= 7);
  const octPays = invoices.flatMap((i) => i.payments.filter((p) => p.date.startsWith("2026-10")).map((p) => ({ ...p, invoice: i.id })));
  const sum = (list: Invoice[]) => list.reduce((s, i) => s + invoiceBalance(i), 0);
  const khr = (v: number) => `≈ ${money(Math.round((v * 4100) / 1000) * 1000, "KHR")}`;
  const oldest = overdue.length ? Math.max(...overdue.map((i) => -daysBetween(TODAY, i.due))) : 0;

  const rows = useMemo(() => {
    const list = inRange.filter(
      (i) =>
        (tab === "all" || invoiceStatus(i) === tab) &&
        (!query || `${i.id} ${nameOf(i.customerId)}`.toLowerCase().includes(query.toLowerCase())) &&
        (!customer || i.customerId === customer) &&
        (!branch || i.branch === branch),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (sort.key === "due" ? a.due.localeCompare(b.due) : a.id.localeCompare(b.id)) * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, tab, query, customer, branch, sort]);
  const { current, slice } = paginate(rows, page, pageSize);
  const tabs: (InvoiceStatus | "all")[] = ["all", "draft", "sent", "partial", "overdue", "paid", "cancelled"];

  const cancel = (inv: Invoice) => {
    update((draft) => {
      const target = draft.invoices.find((x) => x.id === inv.id)!;
      target.stored = "cancelled";
      target.history.unshift({ kind: "status", title: "Invoice cancelled", meta: nowMeta(user!.name) });
    });
    toast({ title: `${inv.id} cancelled`, body: "Its stock is not returned automatically. Adjust stock if the goods came back." });
  };

  return (
    <Page>
      <SalesHeader />
      {scope && <ScopeNotice branch={scope} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Outstanding" value={money(sum(open))} unit="USD" lines={[khr(sum(open)), `${open.length} open invoice${open.length === 1 ? "" : "s"}`]} />
        <StatCard label="Overdue" tone={overdue.length ? "error" : "default"} valueTone={overdue.length ? "error" : undefined} value={money(sum(overdue))} unit="USD" lines={[overdue.length ? khr(sum(overdue)) : "≈ ៛0", overdue.length ? `${overdue.length} invoices · oldest ${oldest} days` : "Nothing overdue"]} />
        <StatCard label="Due within 7 days" tone={dueSoon.length ? "warning" : "default"} value={money(sum(dueSoon))} unit="USD" lines={[khr(sum(dueSoon)), dueSoon.length === 1 ? `1 invoice · ${dueSoon[0].id}` : `${dueSoon.length} invoices`]} />
        <StatCard label="Paid in October" value={money(octPays.reduce((s, p) => s + p.amount, 0))} unit="USD" lines={[khr(octPays.reduce((s, p) => s + p.amount, 0)), `${new Set(octPays.map((p) => p.invoice)).size} invoices`]} />
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Invoices">
        <Tabs label="Invoice status" className="px-5 pt-1" value={tab} onChange={(id) => (setTab(id), setPage(1))} items={tabs.map((t) => ({ id: t, label: t === "all" ? "All" : INVOICE_STATUS[t].label, count: t === "all" ? inRange.length : counts[t] ?? 0 }))} />
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("invoices.csv", [["Invoice", "Customer", "Branch", "Issued", "Due", "Total", "Paid", "Balance", "Status"], ...rows.map((i) => [i.id, nameOf(i.customerId), i.branch, i.issued, i.due, invoiceTotal(i), invoicePaid(i), invoiceBalance(i), INVOICE_STATUS[invoiceStatus(i)].label])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search number or customer" />
          <FilterMenu label="Customer" value={customer} onChange={setCustomer} width={260} options={[...new Set(invoices.map((i) => i.customerId))].map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label))} />
          <FilterMenu label="Date" icon="calendar" value={range} onChange={setRange} options={[{ value: "60", label: "Last 60 days" }, { value: "year", label: "2026" }]} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
        </FilterBar>
        <DataTable
          caption="Invoices"
          rows={slice}
          rowKey={(i) => i.id}
          sort={sort}
          sortable={["id", "due"]}
          onSort={setSort}
          onRowClick={(i) => router.push(`/sales/invoices/${i.id}`)}
          rowClassName={(i) => (invoiceStatus(i) === "cancelled" ? "bg-subtle/70" : undefined)}
          minWidth={scope ? 900 : 1000}
          empty="No invoices match these filters."
          columns={[
            { key: "id", header: "Invoice", width: "150px", cell: (i) => <Link href={`/sales/invoices/${i.id}`} className="focus-ring rounded-xs text-brand hover:underline">{i.id}</Link> },
            { key: "customer", header: scope ? "Customer" : "Customer and branch", cell: (i) => (scope ? <span className="text-fg">{nameOf(i.customerId)}</span> : <TwoLine title={nameOf(i.customerId)} titleClassName="font-normal" sub={i.branch} />) },
            { key: "issued", header: "Issued", width: "120px", cell: (i) => <span className="text-muted">{fmtDate(i.issued)}</span> },
            { key: "due", header: "Due", width: "120px", cell: (i) => <span className="text-muted">{fmtDate(i.due)}</span> },
            { key: "total", header: "Total (USD)", align: "right", width: "110px", cell: (i) => <span className="tabular text-fg">{num(invoiceTotal(i))}</span> },
            {
              key: "balance",
              header: "Balance (USD)",
              align: "right",
              width: "120px",
              cell: (i) => (invoiceStatus(i) === "draft" ? <span className="text-muted">—</span> : <span className={cn("tabular", invoiceStatus(i) === "overdue" ? "text-error-fg" : "text-fg")}>{num(invoiceStatus(i) === "cancelled" ? 0 : invoiceBalance(i))}</span>),
            },
            { key: "status", header: "Status", width: "150px", cell: (i) => <StatusPill tone={INVOICE_STATUS[invoiceStatus(i)].tone} className={invoiceStatus(i) === "cancelled" ? "border border-line-strong bg-surface" : undefined}>{INVOICE_STATUS[invoiceStatus(i)].label}</StatusPill> },
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "52px",
              cell: (i) => {
                const s = invoiceStatus(i);
                return (
                  <Menu
                    align="end"
                    width={200}
                    triggerLabel={`Actions for ${i.id}`}
                    triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                    trigger={<Ellipsis size={16} aria-hidden />}
                    items={[
                      { id: "open", label: s === "draft" ? "Edit draft" : "View invoice", onSelect: () => router.push(`/sales/invoices/${i.id}`) },
                      { id: "pay", label: "Record payment", disabled: !["sent", "partial", "overdue"].includes(s), onSelect: () => router.push(`/sales/invoices/${i.id}?pay=1`) },
                      { id: "cancel", label: "Cancel invoice", disabled: s === "cancelled" || s === "paid" || invoicePaid(i) > 0, onSelect: () => cancel(i) },
                    ]}
                  />
                );
              },
            },
          ]}
          mobileRow={(i) => <MobileRow title={`${i.id} · ${nameOf(i.customerId)}`} sub={`Due ${fmtDate(i.due)} · ${INVOICE_STATUS[invoiceStatus(i)].label}`} value={<span className="tabular">{num(invoiceBalance(i))}</span>} valueSub={`of ${num(invoiceTotal(i))}`} />}
        />
        <Pagination page={current} pageSize={pageSize} total={rows.length} noun="invoices" onPage={setPage} onPageSize={scope ? undefined : (s) => (setPageSize(s), setPage(1))} />
      </section>
    </Page>
  );
}
