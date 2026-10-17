"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { CalendarClock, Ellipsis, Eye, FileText, Info, Lock, MapPin, Pencil, Phone, Plus, ScanLine, Send, Timer, Wallet } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { DetailList, Switch, Timeline } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, ScopeNotice, Tabs } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { accountName, useFinance } from "@/lib/finance-store";
import { cn, daysBetween, downloadCsv, fmtDate, money, num, TODAY } from "@/lib/format";
import { CITIES } from "@/lib/mock/ops-data";
import type { Customer, Invoice } from "@/lib/mock/ops-types";
import { INVOICE_STATUS, invoiceBalance, invoiceStatus, invoiceTotal, PLANNED_STATUS, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { toTimeline } from "@/components/records/bill-detail";
import { SalesHeader } from "./sales-shared";

const isOpen = (i: Invoice) => ["sent", "partial", "overdue"].includes(invoiceStatus(i));

/** Frame 09.4 "Wholesale Customers" (owner) and the Branch Manager view-only version. */
export function CustomersList() {
  const { state } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const invoicesOf = (c: Customer) => state.invoices.filter((i) => i.customerId === c.id && (!scope || i.branch === scope));
  const balanceOf = (c: Customer) => invoicesOf(c).filter(isOpen).reduce((s, i) => s + invoiceBalance(i), 0);
  const overdueOf = (c: Customer) => invoicesOf(c).filter((i) => invoiceStatus(i) === "overdue").reduce((s, i) => s + invoiceBalance(i), 0);
  const rows = state.customers
    .filter(
      (c) =>
        (!query || `${c.name} ${c.phone} ${c.email} ${c.contact}`.toLowerCase().includes(query.toLowerCase())) &&
        (!city || c.city === city) &&
        (!status || (status === "active") === c.active) &&
        (!balance || (balance === "open" ? balanceOf(c) > 0 : balance === "overdue" ? overdueOf(c) > 0 : balanceOf(c) === 0)),
    )
    .map((c, index) => ({ c, index, count: invoicesOf(c).length }))
    .sort((a, b) => b.count - a.count || (scope ? balanceOf(b.c) - balanceOf(a.c) : 0) || a.index - b.index)
    .map((x) => x.c);
  const { current, slice } = paginate(rows, page, 8);

  return (
    <Page>
      <SalesHeader
        actions={
          scope ? (
            <div className="flex flex-col items-end gap-1">
              <Button variant="secondary" icon={Lock} disabled>
                Add customer
              </Button>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Info size={12} aria-hidden /> Only the Business Owner can add or edit customers
              </p>
            </div>
          ) : (
            <Button icon={Plus} onClick={() => setEditing("new")}>
              Add customer
            </Button>
          )
        }
      />
      {scope && (
        <Notice tone="neutral" className="mt-6" icon={<Info size={18} aria-hidden />} title="Wholesale customers are shared across the business">
          You can view customers and create invoices for them. Balances and invoice counts are for {scope} only.
        </Notice>
      )}
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Customers">
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("customers.csv", [["Customer", "City", "Contact", "Phone", "Email", "Open balance (USD)", "Invoices", "Status"], ...rows.map((c) => [c.name, c.city, c.contact, c.phone, c.email, balanceOf(c), invoicesOf(c).length, c.active ? "Active" : "Inactive"])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, phone or email" />
          <FilterMenu label="City" value={city} onChange={setCity} options={CITIES.map((c) => ({ value: c, label: c }))} />
          <FilterMenu label="Status" value={status} onChange={setStatus} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <FilterMenu label="Balance" value={balance} onChange={setBalance} options={[{ value: "open", label: "Has an open balance" }, { value: "overdue", label: "Has overdue invoices" }, { value: "zero", label: "Nothing owed" }]} />
        </FilterBar>
        <DataTable
          caption="Customers"
          rows={slice}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/sales/customers/${c.id}`)}
          rowClassName={(c) => (!c.active ? "bg-subtle/70" : undefined)}
          minWidth={1000}
          columns={[
            { key: "name", header: "Customer", cell: (c) => <TwoLine title={c.name} titleClassName="font-normal" sub={c.city} /> },
            { key: "contact", header: "Contact", width: "170px", cell: (c) => <TwoLine title={c.contact} titleClassName="font-normal" sub={c.phone} /> },
            { key: "email", header: "Email", cell: (c) => <span className="truncate text-muted">{c.email}</span> },
            {
              key: "balance",
              header: scope ? "Balance here (USD)" : "Open balance (USD)",
              align: "right",
              width: "150px",
              cell: (c) => (
                <div>
                  <p className="tabular text-fg">{num(balanceOf(c))}</p>
                  {overdueOf(c) > 0 && <p className="text-xs text-error-fg">{num(overdueOf(c))} overdue</p>}
                </div>
              ),
            },
            { key: "count", header: scope ? "↓ Invoices here" : "↓ Invoices", align: "right", width: "120px", cell: (c) => <span className="tabular text-fg">{invoicesOf(c).length}</span> },
            { key: "status", header: "Status", width: "110px", cell: (c) => <StatusPill tone={c.active ? "success" : "neutral"} className={c.active ? undefined : "border border-line-strong bg-surface"}>{c.active ? "Active" : "Inactive"}</StatusPill> },
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "52px",
              cell: (c) =>
                scope ? (
                  <button type="button" onClick={() => router.push(`/sales/customers/${c.id}`)} aria-label={`View ${c.name}`} className="focus-ring ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg">
                    <Eye size={16} aria-hidden />
                  </button>
                ) : (
                  <Menu
                    align="end"
                    width={200}
                    triggerLabel={`Actions for ${c.name}`}
                    triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                    trigger={<Ellipsis size={16} aria-hidden />}
                    items={[
                      { id: "view", label: "View customer", onSelect: () => router.push(`/sales/customers/${c.id}`) },
                      { id: "edit", label: "Edit customer", onSelect: () => setEditing(c) },
                      { id: "inv", label: "Create invoice", disabled: !c.active, onSelect: () => router.push(`/sales/invoices/new?customer=${c.id}`) },
                    ]}
                  />
                ),
            },
          ]}
          mobileRow={(c) => <MobileRow title={c.name} sub={`${c.contact} · ${c.city}`} value={<span className="tabular">{num(balanceOf(c))}</span>} valueSub={`${invoicesOf(c).length} invoices`} />}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="customers" onPage={setPage} />
      </section>
      <CustomerDialog customer={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}

/** Frame 09.6 "Create or Edit Customer". */
export function CustomerDialog({ customer, onClose }: { customer: Customer | "new" | null; onClose: () => void }) {
  return (
    <Dialog open={customer !== null} onClose={onClose} labelledBy="customer-dialog-title" width={620}>
      {customer && <CustomerForm key={customer === "new" ? "new" : customer.id} customer={customer === "new" ? undefined : customer} onClose={onClose} />}
    </Dialog>
  );
}

function CustomerForm({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { state, update } = useOps();
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState<Customer>(
    customer ?? { id: "", name: "", city: "Phnom Penh", contact: "", phone: "", email: "", telegram: "", address: "", terms: 14, since: TODAY, active: true, notes: "", notesMeta: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Customer>) => setF((x) => ({ ...x, ...patch }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!f.name.trim()) next.name = "Enter the customer name.";
    else if (state.customers.some((c) => c.name.toLowerCase() === f.name.trim().toLowerCase() && c.id !== customer?.id)) next.name = "A customer with this name already exists.";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) next.email = "Enter a valid email address.";
    if (f.telegram && !f.telegram.startsWith("@")) next.telegram = "Telegram usernames start with @.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = customer?.id ?? f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    update((d) => {
      const notesMeta = f.notes !== (customer?.notes ?? "") ? `Updated by ${user!.name} · 31 Oct 2026` : f.notesMeta;
      if (customer) Object.assign(d.customers.find((c) => c.id === customer.id)!, { ...f, name: f.name.trim(), notesMeta });
      else d.customers.push({ ...f, id, name: f.name.trim(), notesMeta });
    });
    toast({ title: customer ? "Customer saved" : "Customer added", body: customer ? "Changes apply to new invoices. Sent invoices keep their details." : `${f.name.trim()} can now be invoiced.` });
    onClose();
    if (!customer) router.push(`/sales/customers/${id}`);
  };
  return (
    <form onSubmit={submit} noValidate>
      <ModalHeader id="customer-dialog-title" title={customer ? "Edit customer" : "Add customer"} description={customer ? "Changes apply to new invoices. Sent invoices keep their details." : "Wholesale customers are shared by every branch."} onClose={onClose} />
      <ModalBody className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <TextField size="md" label="Customer name" value={f.name} onChange={(e) => set({ name: e.target.value })} state={errors.name ? "error" : "default"} message={errors.name} />
        <TextField size="md" label="Contact person" value={f.contact} onChange={(e) => set({ contact: e.target.value })} />
        <TextField size="md" label="Phone" icon={Phone} type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
        <TextField size="md" label="Telegram" icon={Send} value={f.telegram} onChange={(e) => set({ telegram: e.target.value })} state={errors.telegram ? "error" : "default"} message={errors.telegram} placeholder="@username" />
        <TextField size="md" label="Email" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} state={errors.email ? "error" : "default"} message={errors.email} />
        <SelectField label="Payment terms" value={String(f.terms)} onChange={(e) => set({ terms: Number(e.target.value) })} options={[7, 14, 30, 45].map((d) => ({ value: String(d), label: `${d} days after invoice date` }))} />
        <div className="grid gap-x-4 gap-y-5 sm:col-span-2 sm:grid-cols-[1.6fr_1fr]">
          <TextField size="md" label="Address" icon={MapPin} value={f.address} onChange={(e) => set({ address: e.target.value })} />
          <SelectField label="City or province" value={f.city} onChange={(e) => set({ city: e.target.value })} options={CITIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <TextAreaField className="sm:col-span-2" label="Notes" rows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </ModalBody>
      <ModalFooter
        note={
          <label className="flex items-center gap-3 text-sm text-fg">
            <Switch label="Active customer" checked={f.active} onChange={(v) => set({ active: v })} />
            Active customer
          </label>
        }
      >
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save customer</Button>
      </ModalFooter>
    </form>
  );
}

/** Frame 09.5 "Customer Details". */
export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useOps();
  const finance = useFinance();
  const scope = useBranchScope();
  const router = useRouter();
  const [tab, setTab] = useState("invoices");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const customer = state.customers.find((c) => c.id === id);
  if (!customer) notFound();
  const invoices = state.invoices.filter((i) => i.customerId === id && (!scope || i.branch === scope)).sort((a, b) => b.id.localeCompare(a.id));
  const open = invoices.filter(isOpen);
  const overdue = invoices.filter((i) => invoiceStatus(i) === "overdue");
  const billed = invoices.filter((i) => !i.stored);
  const payments = invoices.flatMap((i) => i.payments.map((p) => ({ ...p, invoice: i }))).sort((a, b) => b.date.localeCompare(a.date));
  const paidInvoices = billed.filter((i) => invoiceStatus(i) === "paid");
  const avgDays = paidInvoices.length ? Math.round(paidInvoices.reduce((s, i) => s + daysBetween(i.issued, i.payments[i.payments.length - 1].date), 0) / paidInvoices.length) : null;
  const planned = state.planned.filter((p) => p.customerId === id && (!scope || p.branch === scope));
  const firstMonth = billed.length ? fmtDate(billed[billed.length - 1].issued).split(" ")[1] : "";
  const tabRows = tab === "invoices" ? invoices : [];
  const { current, slice } = paginate(tabRows, page, 5);
  const activity = invoices.flatMap((i) => i.history.map((h) => ({ ...h, title: `${i.id} · ${h.title}` }))).slice(0, 12);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Customers", href: "/sales/customers" }, { label: customer.name }]}
        title={customer.name}
        badges={<StatusPill tone={customer.active ? "success" : "neutral"}>{customer.active ? "Active" : "Inactive"}</StatusPill>}
        subtitle={`Wholesale customer since ${fmtDate(customer.since)} · payment terms: ${customer.terms} days`}
        actions={
          <>
            {!scope && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            <Button icon={Plus} disabled={!customer.active} onClick={() => router.push(`/sales/invoices/new?customer=${id}`)}>
              Create invoice
            </Button>
            <Menu
              align="end"
              width={220}
              triggerLabel="More customer actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                { id: "pp", label: "New planned purchase", disabled: !customer.active, onSelect: () => router.push(`/sales/planned/new?customer=${id}`) },
                { id: "statement", label: "Download statement (CSV)", onSelect: () => downloadCsv(`${id}-statement.csv`, [["Invoice", "Issued", "Due", "Total", "Balance", "Status"], ...invoices.map((i) => [i.id, i.issued, i.due, invoiceTotal(i), invoiceBalance(i), INVOICE_STATUS[invoiceStatus(i)].label])]) },
              ]}
            />
          </>
        }
      />
      {scope && <ScopeNotice branch={scope} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Open balance" icon={<Wallet size={16} aria-hidden />} value={money(open.reduce((s, i) => s + invoiceBalance(i), 0))} unit="USD" lines={[`${open.length} open invoice${open.length === 1 ? "" : "s"}`]} />
        <StatCard label="Overdue" icon={<CalendarClock size={16} aria-hidden />} value={money(overdue.reduce((s, i) => s + invoiceBalance(i), 0))} unit="USD" lines={[overdue.length ? `${overdue[0].id} · ${-daysBetween(TODAY, overdue[0].due)} days overdue` : "Nothing overdue"]} />
        <StatCard label="Invoiced in 2026" icon={<FileText size={16} aria-hidden />} value={money(billed.reduce((s, i) => s + invoiceTotal(i), 0))} unit="USD" lines={[`${billed.length} invoices${firstMonth ? ` since ${{ Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October" }[firstMonth] ?? firstMonth}` : ""}`]} />
        <StatCard label="Average days to pay" icon={<Timer size={16} aria-hidden />} value={avgDays === null ? "—" : String(avgDays)} unit={avgDays === null ? undefined : "days"} lines={[avgDays === null ? "No paid invoices yet" : avgDays > customer.terms ? `${avgDays - customer.terms} days longer than the ${customer.terms}-day terms` : `Within the ${customer.terms}-day terms`]} />
      </div>
      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Customer records">
          <Tabs
            label="Customer records"
            className="px-5 pt-1"
            value={tab}
            onChange={(t) => (setTab(t), setPage(1))}
            items={[
              { id: "invoices", label: "Invoices", count: invoices.length },
              { id: "payments", label: "Payments", count: payments.length },
              { id: "planned", label: "Planned purchases", count: planned.length },
              { id: "activity", label: "Activity" },
            ]}
          />
          {tab === "invoices" && (
            <>
              <DataTable
                caption="Invoices"
                rows={slice}
                rowKey={(i) => i.id}
                onRowClick={(i) => router.push(`/sales/invoices/${i.id}`)}
                minWidth={680}
                empty="No invoices yet."
                columns={[
                  { key: "id", header: "Invoice ↓", width: "140px", cell: (i) => <Link href={`/sales/invoices/${i.id}`} className="text-brand hover:underline">{i.id}</Link> },
                  { key: "issued", header: "Issued", cell: (i) => <span className="text-muted">{fmtDate(i.issued)}</span> },
                  { key: "due", header: "Due", cell: (i) => <span className="text-muted">{fmtDate(i.due)}</span> },
                  { key: "total", header: "Total (USD)", align: "right", width: "110px", cell: (i) => <span className="tabular">{num(invoiceTotal(i))}</span> },
                  { key: "bal", header: "Balance (USD)", align: "right", width: "120px", cell: (i) => <span className={cn("tabular", invoiceStatus(i) === "overdue" && "text-error-fg")}>{num(invoiceBalance(i))}</span> },
                  { key: "status", header: "Status", width: "130px", cell: (i) => <StatusPill tone={INVOICE_STATUS[invoiceStatus(i)].tone}>{INVOICE_STATUS[invoiceStatus(i)].label}</StatusPill> },
                ]}
                mobileRow={(i) => <MobileRow title={i.id} sub={`Due ${fmtDate(i.due)}`} value={num(invoiceBalance(i))} valueSub={INVOICE_STATUS[invoiceStatus(i)].label} />}
              />
              <Pagination page={current} pageSize={5} total={invoices.length} noun="invoices" onPage={setPage} />
            </>
          )}
          {tab === "payments" && (
            <DataTable
              caption="Payments"
              rows={payments}
              rowKey={(p) => p.id}
              minWidth={680}
              empty="No payments yet."
              columns={[
                { key: "date", header: "Date", width: "120px", cell: (p) => <span className="text-muted">{fmtDate(p.date)}</span> },
                { key: "inv", header: "Invoice", width: "140px", cell: (p) => <Link href={`/sales/invoices/${p.invoice.id}`} className="text-brand hover:underline">{p.invoice.id}</Link> },
                { key: "by", header: "Paid by", cell: (p) => <TwoLine title={p.method} titleClassName="font-normal" sub={accountName(finance.state, p.accountId)} /> },
                { key: "ref", header: "Reference", cell: (p) => <span className="text-fg">{p.ref}</span> },
                { key: "amt", header: "Amount (USD)", align: "right", width: "120px", cell: (p) => <span className="tabular text-success-fg">+{num(p.amount)}</span> },
              ]}
              mobileRow={(p) => <MobileRow title={p.invoice.id} sub={`${fmtDate(p.date)} · ${p.method}`} value={`+${num(p.amount)}`} />}
            />
          )}
          {tab === "planned" && (
            <DataTable
              caption="Planned purchases"
              rows={planned}
              rowKey={(p) => p.id}
              onRowClick={(p) => router.push(`/sales/planned/${p.id}`)}
              minWidth={600}
              empty="No planned purchases."
              columns={[
                { key: "id", header: "Number", width: "140px", cell: (p) => <Link href={`/sales/planned/${p.id}`} className="text-brand hover:underline">{p.id}</Link> },
                { key: "created", header: "Created", cell: (p) => <span className="text-muted">{fmtDate(p.created)}</span> },
                { key: "expires", header: "Expires", cell: (p) => <span className="text-muted">{fmtDate(p.expires)}</span> },
                { key: "status", header: "Status", width: "140px", cell: (p) => <StatusPill tone={PLANNED_STATUS[p.status].tone}>{PLANNED_STATUS[p.status].label}</StatusPill> },
              ]}
              mobileRow={(p) => <MobileRow title={p.id} sub={PLANNED_STATUS[p.status].label} />}
            />
          )}
          {tab === "activity" && (
            <div className="p-5">
              <Timeline items={toTimeline(activity)} />
            </div>
          )}
        </section>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="contact-title">
            <CardHeader title="Contact" titleId="contact-title" />
            <div className="p-5">
              <DetailList labelWidth={80} items={[["Contact", customer.contact], ["Phone", customer.phone], ["Email", customer.email], ["Address", customer.address], ["Telegram", customer.telegram || "—"]]} />
            </div>
          </Card>
          <Card aria-labelledby="notes-title">
            <CardHeader title="Notes" titleId="notes-title" />
            <div className="p-5">
              <p className="text-sm leading-[22px] text-body">{customer.notes || "No notes yet."}</p>
              {customer.notesMeta && <p className="mt-2 text-xs text-muted">{customer.notesMeta}</p>}
            </div>
          </Card>
        </div>
      </div>
      <CustomerDialog customer={editing ? customer : null} onClose={() => setEditing(false)} />
    </Page>
  );
}

/** Frame 09.11 "Payment History". */
export function PaymentsList() {
  const { state } = useOps();
  const finance = useFinance();
  const scope = useBranchScope();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string | null>("2026-10");
  const [method, setMethod] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const nameOf = (id: string) => state.customers.find((c) => c.id === id)?.name ?? id;
  const all = state.invoices
    .filter((i) => !scope || i.branch === scope)
    .flatMap((i) => i.payments.map((p) => ({ ...p, invoice: i })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const oct = all.filter((p) => p.date.startsWith("2026-10"));
  const rows = all.filter(
    (p) =>
      (!query || `${p.invoice.id} ${nameOf(p.invoice.customerId)} ${p.ref}`.toLowerCase().includes(query.toLowerCase())) &&
      (!month || p.date.startsWith(month)) &&
      (!method || p.method === method) &&
      (!account || p.accountId === account) &&
      (!branch || p.invoice.branch === branch),
  );
  const { current, slice } = paginate(rows, page, 5);
  const slips = oct.length ? Math.round((oct.filter((p) => p.slip).length / oct.length) * 100) : 0;
  const paidInvoices = state.invoices.filter((i) => (!scope || i.branch === scope) && invoiceStatus(i) === "paid" && i.payments.some((p) => p.date.startsWith("2026-10")));
  const avgDays = paidInvoices.length ? Math.round(paidInvoices.reduce((s, i) => s + Math.max(0, daysBetween(i.issued, i.payments[i.payments.length - 1].date)), 0) / paidInvoices.length) : 0;

  return (
    <Page>
      <SalesHeader />
      {scope && <ScopeNotice branch={scope} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Received · October" icon={<Wallet size={16} aria-hidden />} value={money(oct.reduce((s, p) => s + p.amount, 0))} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value="14.6%" direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Payments recorded" icon={<FileText size={16} aria-hidden />} value={String(oct.length)} lines={[<span key="d" className="flex items-center gap-2"><Delta value="6" direction="up" tone="success" /> more than last month</span>]} />
        <StatCard label="Read from payment slips" icon={<ScanLine size={16} aria-hidden />} value={`${slips}%`} lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-muted-bg px-1.5 text-xs font-medium text-body">↗ 9.0</span> points vs last month</span>]} />
        <StatCard label="Average days to pay" icon={<Timer size={16} aria-hidden />} value={String(avgDays)} unit="days" lines={[<span key="d" className="flex items-center gap-2"><Delta value="2" direction="down" tone="success" /> days faster than September</span>]} />
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Payments">
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("payments.csv", [["Date", "Invoice", "Customer", "Method", "Account", "Reference", "Amount (USD)", "Recorded by"], ...rows.map((p) => [p.date, p.invoice.id, nameOf(p.invoice.customerId), p.method, accountName(finance.state, p.accountId), p.ref, p.amount, p.by])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search invoice, customer or reference" className="md:w-[330px]" />
          <FilterMenu label="Date" icon="calendar" value={month} onChange={setMonth} options={[{ value: "2026-10", label: "October 2026" }, { value: "2026-09", label: "September 2026" }]} />
          <FilterMenu label="Method" value={method} onChange={setMethod} options={["Bank transfer", "KHQR", "Cash", "Cheque", "Card"].map((m) => ({ value: m, label: m }))} />
          <FilterMenu label="Account" value={account} onChange={setAccount} width={240} options={[...new Set(all.map((p) => p.accountId))].map((a) => ({ value: a, label: accountName(finance.state, a) }))} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={["Central Market", "Toul Kork", "Siem Reap", "Battambang"].map((b) => ({ value: b, label: b }))} />}
        </FilterBar>
        <DataTable
          caption="Payments"
          rows={slice}
          rowKey={(p) => p.id}
          minWidth={1000}
          empty="No payments match these filters."
          columns={[
            { key: "date", header: "Date ↓", width: "120px", cell: (p) => <span className="text-muted">{fmtDate(p.date)}</span> },
            { key: "inv", header: "Invoice", width: "140px", cell: (p) => <Link href={`/sales/invoices/${p.invoice.id}`} className="text-brand hover:underline">{p.invoice.id}</Link> },
            { key: "cust", header: "Customer", cell: (p) => <span className="text-fg">{nameOf(p.invoice.customerId)}</span> },
            { key: "by", header: "Paid by", width: "200px", cell: (p) => <TwoLine title={p.method} titleClassName="font-normal" sub={accountName(finance.state, p.accountId)} /> },
            { key: "ref", header: "Reference", width: "150px", cell: (p) => <span className="text-fg">{p.ref}</span> },
            { key: "amt", header: "Amount (USD)", align: "right", width: "130px", cell: (p) => <div><p className="tabular text-success-fg">+{num(p.amount)}</p>{p.khr && <p className="tabular text-xs text-muted">{money(p.khr, "KHR")}</p>}</div> },
            { key: "rec", header: "Recorded by", width: "120px", cell: (p) => <span className="text-muted">{p.by}</span> },
          ]}
          mobileRow={(p) => <MobileRow title={`${p.invoice.id} · ${nameOf(p.invoice.customerId)}`} sub={`${fmtDate(p.date)} · ${p.method}`} value={<span className="tabular text-success-fg">+{num(p.amount)}</span>} />}
        />
        <Pagination page={current} pageSize={5} total={rows.length} noun="payments" onPage={setPage} />
      </section>
    </Page>
  );
}
