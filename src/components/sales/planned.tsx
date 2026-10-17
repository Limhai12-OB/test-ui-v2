"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowRightLeft, Calendar, CircleCheck, Download, Ellipsis, Info, Plus, Send, TriangleAlert } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, TextAreaField, TextField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { DetailList, Timeline } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { addDays, cn, daysBetween, downloadCsv, fmtDate, money, num, TODAY, type Currency } from "@/lib/format";
import { docTotal, lineTotal } from "@/lib/mock/ops-data";
import { BRANCHES_4, type BranchName, type DocLine, type Planned } from "@/lib/mock/ops-types";
import { nowMeta, PLANNED_STATUS, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { toTimeline } from "@/components/records/bill-detail";
import { CustomerAndDates, SendDialog, type InvoiceForm } from "./invoice-editor";
import { LineEditor, PaperDocument, SalesHeader, SummaryCard } from "./sales-shared";

/** Frame 09.12 "Planned Purchases". */
export function PlannedList() {
  const { state } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const nameOf = (id: string) => state.customers.find((c) => c.id === id)?.name ?? id;
  const all = state.planned.filter((p) => !scope || p.branch === scope);
  const counts = all.reduce<Record<string, number>>((acc, p) => ((acc[p.status] = (acc[p.status] ?? 0) + 1), acc), {});
  const rows = all
    .filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (!query || `${p.id} ${nameOf(p.customerId)}`.toLowerCase().includes(query.toLowerCase())) &&
        (!customer || p.customerId === customer) &&
        (!branch || p.branch === branch) &&
        (!expiry || (expiry === "week" ? p.expires >= TODAY && daysBetween(TODAY, p.expires) <= 7 : p.expires < TODAY)),
    )
    .sort((a, b) => b.id.localeCompare(a.id));
  const { current, slice } = paginate(rows, page, 6);
  const statuses: (Planned["status"] | "all")[] = ["all", "draft", "sent", "accepted", "rejected", "expired", "converted"];
  return (
    <Page>
      <SalesHeader actions={<Button icon={Plus} onClick={() => router.push("/sales/planned/new")}>New planned purchase</Button>} />
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="A planned purchase is a quote, not an invoice">
        It shows an estimated total and no amount is due. When the customer confirms, convert it to an invoice in one step.
      </Notice>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Planned purchases">
        <Tabs label="Status" className="px-5 pt-1" value={tab} onChange={(t) => (setTab(t), setPage(1))} items={statuses.map((s) => ({ id: s, label: s === "all" ? "All" : PLANNED_STATUS[s].label, count: s === "all" ? all.length : counts[s] ?? 0 }))} />
        <FilterBar className="border-b border-line" onExport={() => downloadCsv("planned-purchases.csv", [["Number", "Customer", "Branch", "Created", "Expires", "Estimated total (USD)", "Status"], ...rows.map((p) => [p.id, nameOf(p.customerId), p.branch, p.created, p.expires, docTotal(p.lines), PLANNED_STATUS[p.status].label])])}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search number or customer" />
          <FilterMenu label="Customer" value={customer} onChange={setCustomer} width={260} options={[...new Set(all.map((p) => p.customerId))].map((id) => ({ value: id, label: nameOf(id) }))} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
          <FilterMenu label="Expiry" value={expiry} onChange={setExpiry} options={[{ value: "week", label: "Expires within 7 days" }, { value: "past", label: "Already expired" }]} />
        </FilterBar>
        <DataTable
          caption="Planned purchases"
          rows={slice}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(`/sales/planned/${p.id}`)}
          rowClassName={(p) => (["expired", "rejected"].includes(p.status) ? "bg-subtle/70" : undefined)}
          minWidth={960}
          empty="No planned purchases match these filters."
          columns={[
            { key: "id", header: "Number ↓", width: "140px", cell: (p) => <Link href={`/sales/planned/${p.id}`} className="text-brand hover:underline">{p.id}</Link> },
            { key: "cust", header: "Customer and branch", cell: (p) => <TwoLine title={nameOf(p.customerId)} titleClassName="font-normal" sub={p.branch} /> },
            { key: "created", header: "Created", width: "120px", cell: (p) => <span className="text-muted">{fmtDate(p.created)}</span> },
            { key: "expires", header: "Expires", width: "120px", cell: (p) => <span className="text-muted">{fmtDate(p.expires)}</span> },
            { key: "total", header: "Estimated total (USD)", align: "right", width: "170px", cell: (p) => <span className="tabular text-fg">{num(docTotal(p.lines))}</span> },
            { key: "status", header: "Status", width: "130px", cell: (p) => <StatusPill tone={PLANNED_STATUS[p.status].tone} className={p.status === "expired" ? "border border-line-strong bg-surface" : undefined}>{PLANNED_STATUS[p.status].label}</StatusPill> },
            {
              key: "act",
              header: "Actions",
              srHeader: true,
              width: "110px",
              cell: (p) =>
                p.status === "accepted" ? (
                  <button type="button" onClick={() => router.push(`/sales/planned/${p.id}?convert=1`)} className="focus-ring ml-auto flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
                    <ArrowRightLeft size={16} aria-hidden /> Convert
                  </button>
                ) : (
                  <span className="flex justify-end">
                    <Menu
                      align="end"
                      width={200}
                      triggerLabel={`Actions for ${p.id}`}
                      triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                      trigger={<Ellipsis size={16} aria-hidden />}
                      items={[
                        { id: "view", label: "View", onSelect: () => router.push(`/sales/planned/${p.id}`) },
                        ...(p.invoiceId ? [{ id: "inv", label: `Open ${p.invoiceId}`, onSelect: () => router.push(`/sales/invoices/${p.invoiceId}`) }] : []),
                      ]}
                    />
                  </span>
                ),
            },
          ]}
          mobileRow={(p) => <MobileRow title={`${p.id} · ${nameOf(p.customerId)}`} sub={`Expires ${fmtDate(p.expires)}`} value={<span className="tabular">{num(docTotal(p.lines))}</span>} valueSub={PLANNED_STATUS[p.status].label} />}
        />
        <Pagination page={current} pageSize={6} total={rows.length} noun="planned purchases" onPage={setPage} />
      </section>
    </Page>
  );
}

const DEMO_PLANNED: DocLine[] = [
  { itemId: "instant-noodles", description: "Instant Noodles × 30", sku: "NDL-INS-30", qty: 40, price: 7.2, discount: 0 },
  { itemId: "fish-sauce", description: "Fish Sauce 750ml", sku: "SAU-FSH-750", qty: 60, price: 2.2, discount: 0 },
  { itemId: "palm-sugar", description: "Palm Sugar 500g", sku: "SWT-PLM-500", qty: 48, price: 2.4, discount: 0 },
];

/** Frame 09.13 "Create Planned Purchase". */
export function NewPlanned() {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const fromCustomer = params.get("customer");
  const nextId = `PP-2026-${String(state.next.planned).padStart(4, "0")}`;
  const [form, setForm] = useState<InvoiceForm>({
    id: nextId,
    customerId: fromCustomer ?? (scope ? "borey-cafe" : "golden-lotus"),
    issued: TODAY,
    due: addDays(TODAY, 14),
    branch: scope ?? "Central Market",
    currency: "USD",
    lines: fromCustomer || scope ? [] : DEMO_PLANNED,
    notes: fromCustomer || scope ? "" : "Prices valid until 14 Nov 2026. Delivery within 3 days of confirmation.",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendOpen, setSendOpen] = useState(false);
  const customer = state.customers.find((c) => c.id === form.customerId);
  const set = (patch: Partial<InvoiceForm>) => setForm((f) => ({ ...f, ...patch }));

  const save = (status: "draft" | "sent", channels?: string) => {
    update((d) => {
      d.planned.unshift({
        id: form.id,
        customerId: form.customerId,
        branch: form.branch,
        created: form.issued,
        expires: form.due,
        currency: form.currency,
        lines: form.lines,
        notes: form.notes,
        status,
        history: [...(status === "sent" ? [{ kind: "submit" as const, title: `Sent by ${channels}`, meta: nowMeta(user!.name) }] : []), { kind: "start", title: "Planned purchase created", meta: nowMeta(user!.name) }],
      });
      d.next.planned++;
    });
    toast({ title: status === "sent" ? "Planned purchase sent" : "Draft saved", body: `${form.id} · estimated ${money(docTotal(form.lines), form.currency)}` });
    router.push(`/sales/planned/${form.id}`);
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (!customer) next.customer = "Choose a customer.";
    if (state.planned.some((p) => p.id === form.id)) next.id = "This number is already used.";
    if (form.due < form.issued) next.due = "The expiry date is before the created date.";
    if (!form.lines.length) next.lines = "Add at least one item.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Planned purchases", href: "/sales/planned" }, { label: "New planned purchase" }]}
        title="New planned purchase"
        badges={<StatusPill tone="neutral">Draft</StatusPill>}
        subtitle="Share prices and quantities with a customer before they commit. No amount is due and stock is not reserved."
      />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <CustomerAndDates form={form} set={set} errors={errors} customers={state.customers} scope={scope} numberLabel="Number" issueLabel="Created" dueLabel="Expiry date" dueHint="Prices held until then." />
          <LineEditor lines={form.lines} onChange={(lines) => set({ lines })} branch={form.branch} currency={form.currency} stockNote="at" errors={errors.lines} />
          <Card aria-labelledby="pp-notes-title">
            <CardHeader title="Notes for the customer" titleId="pp-notes-title" />
            <div className="p-5">
              <TextAreaField label="Notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </Card>
        </div>
        <SummaryCard lines={form.lines} currency={form.currency} estimate>
          <p className="flex items-start gap-2 rounded-md bg-subtle px-3 py-2 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> Estimate only. No amount is due until this becomes an invoice.
          </p>
          <Button icon={Send} onClick={() => validate() && setSendOpen(true)}>
            Save and send
          </Button>
          <Button variant="secondary" onClick={() => validate() && save("draft")}>
            Save as draft
          </Button>
          <button type="button" onClick={() => router.push("/sales/planned")} className="focus-ring mx-auto cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
            Cancel
          </button>
        </SummaryCard>
      </div>
      {customer && (
        <SendDialog
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          invoiceId={form.id}
          customer={customer}
          total={docTotal(form.lines)}
          currency={form.currency}
          due={form.due}
          title={`Send ${form.id}`}
          button="Send planned purchase"
          note="The customer sees an estimate. Nothing is due and stock is not reserved."
          onSent={(channels) => save("sent", channels)}
        />
      )}
    </Page>
  );
}

/** Frames 09.14 "Planned Purchase Details" and 09.15 "Convert to Invoice". */
export function PlannedDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useOps();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const pp = state.planned.find((p) => p.id === id);
  if (!pp) notFound();
  const customer = state.customers.find((c) => c.id === pp.customerId)!;
  const total = docTotal(pp.lines);
  const daysLeft = daysBetween(TODAY, pp.expires);
  const convertOpen = params.get("convert") === "1" && pp.status === "accepted";
  const setStatus = (status: Planned["status"], title: string, detail?: string) => {
    update((d) => {
      const t = d.planned.find((p) => p.id === id)!;
      t.status = status;
      t.history.unshift({ kind: status === "rejected" ? "returned" : "status", title, meta: nowMeta(user!.name), detail });
    });
    toast({ title, body: `${pp.id} · ${customer.name}` });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Planned purchases", href: "/sales/planned" }, { label: pp.id }]}
        title={pp.id}
        badges={<StatusPill tone={PLANNED_STATUS[pp.status].tone}>{PLANNED_STATUS[pp.status].label}</StatusPill>}
        subtitle={`${customer.name} · ${pp.branch} · ${pp.status === "expired" ? "expired" : "expires"} ${fmtDate(pp.expires)}`}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => window.print()}>
              Export
            </Button>
            {["draft", "sent", "accepted"].includes(pp.status) && (
              <Button variant="secondary" icon={Send} onClick={() => setSendOpen(true)}>
                {pp.status === "draft" ? "Send" : "Send again"}
              </Button>
            )}
            {pp.status === "accepted" && (
              <Button icon={ArrowRightLeft} onClick={() => router.replace(`/sales/planned/${id}?convert=1`, { scroll: false })}>
                Convert to invoice
              </Button>
            )}
            {pp.status === "converted" && pp.invoiceId && (
              <Button iconRight={ArrowRight} onClick={() => router.push(`/sales/invoices/${pp.invoiceId}`)}>
                Open {pp.invoiceId}
              </Button>
            )}
            <Menu
              align="end"
              width={230}
              triggerLabel="More actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                { id: "acc", label: "Mark as accepted", disabled: pp.status !== "sent", onSelect: () => setStatus("accepted", "Accepted by customer", "Recorded by hand") },
                { id: "rej", label: "Mark as rejected", disabled: !["sent", "accepted"].includes(pp.status), onSelect: () => setStatus("rejected", "Rejected by customer") },
                { id: "csv", label: "Download lines (CSV)", onSelect: () => downloadCsv(`${pp.id}.csv`, [["Item", "SKU", "Qty", "Unit price", "Amount"], ...pp.lines.map((l) => [l.description, l.sku ?? "", l.qty, l.price, lineTotal(l)])]) },
              ]}
            />
          </>
        }
      />
      {pp.status === "accepted" && (
        <Notice
          tone="success"
          className="mt-6"
          icon={<CircleCheck size={18} aria-hidden />}
          title={`Accepted by the customer on ${pp.history.find((h) => h.title.startsWith("Accepted"))?.meta.split(" · ")[1]?.split(",")[0] ?? fmtDate(TODAY)}`}
          action={<button type="button" onClick={() => router.replace(`/sales/planned/${id}?convert=1`, { scroll: false })} className="cursor-pointer text-sm font-medium text-success-fg hover:underline">Convert now</button>}
        >
          {pp.acceptedNote ?? `${customer.contact} confirmed.`} Convert it to an invoice to bill the customer and reduce stock.
        </Notice>
      )}
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <PaperDocument
          kind="planned"
          number={pp.id}
          status={<StatusPill tone={PLANNED_STATUS[pp.status].tone}>{PLANNED_STATUS[pp.status].label}</StatusPill>}
          customer={customer}
          dates={[["Created", fmtDate(pp.created)], ["Expires", fmtDate(pp.expires)], ["Branch", pp.branch]]}
          lines={pp.lines}
          currency={pp.currency}
          notes={pp.notes}
          footer={
            <div className="text-[13px]">
              <p className="text-muted">Good to know</p>
              <p className="mt-1 text-body">This is not an invoice and no amount is due. Prices are held until the expiry date.</p>
            </div>
          }
        />
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="pp-status-title">
            <CardHeader title="Status" titleId="pp-status-title" />
            <div className="p-5">
              <DetailList
                labelWidth={120}
                items={[
                  ["Estimated total", `${money(total, pp.currency)} ${pp.currency}`],
                  ["Amount due", "None (not an invoice)"],
                  ["Expires in", daysLeft < 0 ? "Expired" : `${daysLeft} days`],
                  ["Linked invoice", pp.invoiceId ? <Link key="l" href={`/sales/invoices/${pp.invoiceId}`} className="text-brand hover:underline">{pp.invoiceId}</Link> : "Not converted yet"],
                ]}
              />
            </div>
          </Card>
          <Card aria-labelledby="pp-history-title">
            <CardHeader title="History" titleId="pp-history-title" />
            <div className="p-5">
              <Timeline items={toTimeline(pp.history)} />
            </div>
          </Card>
        </div>
      </div>
      {/* After converting, the form navigates to the new invoice; closing must not override that. */}
      <Dialog open={convertOpen} onClose={() => pp.status === "accepted" && router.replace(`/sales/planned/${id}`, { scroll: false })} labelledBy="convert-title" width={620}>
        {convertOpen && <ConvertForm pp={pp} onClose={() => router.replace(`/sales/planned/${id}`, { scroll: false })} />}
      </Dialog>
      <SendDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        invoiceId={pp.id}
        customer={customer}
        total={total}
        currency={pp.currency}
        due={pp.expires}
        title={`Send ${pp.id}`}
        button="Send planned purchase"
        note="The customer sees an estimate. Nothing is due and stock is not reserved."
        onSent={(channels) => {
          update((d) => {
            const t = d.planned.find((p) => p.id === id)!;
            if (t.status === "draft") t.status = "sent";
            t.history.unshift({ kind: "submit", title: `Sent by ${channels}`, meta: nowMeta(user!.name) });
          });
          toast({ title: "Planned purchase sent", body: `${pp.id} was sent by ${channels}.` });
        }}
      />
    </Page>
  );
}

function ConvertForm({ pp, onClose }: { pp: Planned; onClose: () => void }) {
  const { state, update } = useOps();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const customer = state.customers.find((c) => c.id === pp.customerId)!;
  const nextId = `INV-2026-${String(state.next.invoice).padStart(4, "0")}`;
  const [number, setNumber] = useState(nextId);
  const [issued, setIssued] = useState(TODAY);
  const [due, setDue] = useState(addDays(TODAY, customer.terms));
  const [keepPrices, setKeepPrices] = useState(true);
  const [link, setLink] = useState(true);
  const [error, setError] = useState<string>();
  const stockOf = (l: DocLine) => (l.itemId ? state.items.find((i) => i.id === l.itemId)?.stock[pp.branch as BranchName] ?? 0 : Infinity);
  const short = pp.lines.filter((l) => stockOf(l) < l.qty);
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.invoices.some((i) => i.id === number)) return setError("This number is already used.");
    if (due < issued) return setError("The due date is before the issue date.");
    const lines = pp.lines.map((l) => {
      const item = state.items.find((i) => i.id === l.itemId);
      return keepPrices || !item ? { ...l } : { ...l, price: item.price };
    });
    update((d) => {
      d.invoices.unshift({ id: number, customerId: pp.customerId, branch: pp.branch, issued, due, currency: pp.currency as Currency, lines, notes: pp.notes, stored: "draft", payments: [], fromPlanned: pp.id, history: [{ kind: "start", title: `Draft created from ${pp.id}`, meta: nowMeta(user!.name) }] });
      if (number === nextId) d.next.invoice++;
      if (link) {
        const t = d.planned.find((p) => p.id === pp.id)!;
        t.status = "converted";
        t.invoiceId = number;
        t.history.unshift({ kind: "status", title: `Converted to ${number}`, meta: nowMeta(user!.name) });
      }
    });
    toast({ title: "Draft invoice created", body: `${number} from ${pp.id}. Check it, then send.` });
    router.push(`/sales/invoices/${number}`);
  };
  return (
    <form onSubmit={create} noValidate>
      <ModalHeader id="convert-title" title="Convert to invoice" description={`${pp.id} · ${customer.name} · estimated total ${money(docTotal(pp.lines), pp.currency)} ${pp.currency}`} icon={<ArrowRightLeft size={20} aria-hidden />} onClose={onClose} />
      <div className="flex flex-col gap-5 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField size="md" label="Invoice number" value={number} onChange={(e) => (setNumber(e.target.value.toUpperCase()), setError(undefined))} state={error?.includes("number") ? "error" : "default"} message={error?.includes("number") ? error : "Next number in sequence."} />
          <TextField size="md" type="date" label="Issue date" icon={Calendar} value={issued} onChange={(e) => setIssued(e.target.value)} />
          <TextField size="md" type="date" label="Due date" icon={Calendar} value={due} onChange={(e) => setDue(e.target.value)} state={error?.includes("due") ? "error" : "default"} message={error?.includes("due") ? error : undefined} />
        </div>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="h-10 bg-subtle text-xs text-muted">
                <th scope="col" className="px-4 font-medium">Item</th>
                <th scope="col" className="px-3 text-right font-medium">Qty</th>
                <th scope="col" className="px-3 text-right font-medium">Stock at {pp.branch}</th>
                <th scope="col" className="px-4 text-right font-medium">Amount ({pp.currency})</th>
              </tr>
            </thead>
            <tbody>
              {pp.lines.map((l, i) => {
                const have = stockOf(l);
                const out = have < l.qty;
                return (
                  <tr key={i} className={cn("border-t border-line-subtle", out && "bg-error-subtle")}>
                    <td className="px-4 py-3 text-fg">{l.description}</td>
                    <td className="px-3 py-3 text-right text-fg">{l.qty}</td>
                    <td className="px-3 py-3 text-right">{l.itemId ? <StatusPill tone={out ? "error" : "success"}>{have} in stock</StatusPill> : "—"}</td>
                    <td className="px-4 py-3 text-right text-fg">{num(lineTotal(l), pp.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {short.length > 0 && (
          <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title={`${short.map((l) => l.description.split(" ").slice(0, 2).join(" ")).join(", ")} is ${short.some((l) => stockOf(l) === 0) ? "out of stock" : "short"} at ${pp.branch}`}>
            You can still create the draft. Restock or change the quantity before sending.
          </Notice>
        )}
        <div className="flex flex-col gap-3">
          <Checkbox checked={keepPrices} onChange={setKeepPrices}>Keep the prices from the planned purchase</Checkbox>
          <Checkbox checked={link} onChange={setLink}>Mark {pp.id} as Converted and link it to the invoice</Checkbox>
        </div>
      </div>
      <ModalFooter className="bg-surface">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" iconRight={ArrowRight}>
          Create draft invoice
        </Button>
      </ModalFooter>
    </form>
  );
}
