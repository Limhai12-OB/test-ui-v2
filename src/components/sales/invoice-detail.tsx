"use client";

import { useState } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Banknote, Bell, CalendarClock, Check, CircleCheck, Copy, Download, Ellipsis, FileImage, FileText, Image as ImageIcon, Info, Landmark, Mail, Printer, Send, Sparkles } from "lucide-react";
import { MoneyInput, parseAmount, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { Timeline } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalFooter, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn, daysBetween, fmtDate, money, num, TODAY } from "@/lib/format";
import type { Invoice } from "@/lib/mock/ops-types";
import { INVOICE_STATUS, invoiceBalance, invoicePaid, invoiceStatus, invoiceTotal, nowMeta, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { toTimeline } from "@/components/records/bill-detail";
import { InvoiceEditor, SendDialog } from "./invoice-editor";
import { PaperDocument } from "./sales-shared";

/** Routes /sales/invoices/[id]: drafts open in the editor, others in the detail view. */
export function InvoiceRoute() {
  const { id } = useParams<{ id: string }>();
  const { state } = useOps();
  const scope = useBranchScope();
  const invoice = state.invoices.find((i) => i.id === id);
  if (!invoice || (scope && invoice.branch !== scope)) notFound();
  if (invoice.stored === "draft") return <InvoiceEditor key={invoice.id} existing={invoice} />;
  return <InvoiceDetail invoice={invoice} />;
}

/** Frames 09.9 "Invoice Details — Sent", "Export as PDF or image" and 09.10 "Invoice paid". */
function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const { state, update } = useOps();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [send, setSend] = useState<null | "both" | "Telegram" | "email" | "receipt">(null);
  const customer = state.customers.find((c) => c.id === invoice.customerId)!;
  const status = invoiceStatus(invoice);
  const total = invoiceTotal(invoice);
  const paid = invoicePaid(invoice);
  const balance = invoiceBalance(invoice);
  const open = ["sent", "partial", "overdue"].includes(status);
  const days = daysBetween(TODAY, invoice.due);
  const payOpen = params.get("pay") === "1" && open;
  const lastPay = invoice.payments[invoice.payments.length - 1];

  const duplicate = () => {
    const id = `INV-2026-${String(state.next.invoice).padStart(4, "0")}`;
    update((draft) => {
      draft.next.invoice++;
      draft.invoices.unshift({ ...structuredClone(invoice), id, issued: TODAY, due: new Date(Date.parse(TODAY) + 14 * 864e5).toISOString().slice(0, 10), stored: "draft", payments: [], sentAt: undefined, history: [{ kind: "start", title: `Draft created from ${invoice.id}`, meta: nowMeta(user!.name) }] });
    });
    toast({ title: "Invoice duplicated", body: `${id} is a new draft with the same items.` });
    router.push(`/sales/invoices/${id}`);
  };

  const exportMenu = (
    <Menu
      align="end"
      width={250}
      triggerLabel="Export"
      triggerClassName="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-subtle"
      trigger={
        <>
          <Download size={16} aria-hidden /> Export <span aria-hidden>⌄</span>
        </>
      }
      items={[
        { id: "pdf", label: "Download PDF", description: "Choose “Save as PDF” in the print dialog", icon: <FileText size={16} className="text-icon" aria-hidden />, onSelect: () => window.print() },
        { id: "png", label: "Download image (PNG)", description: "Needs the export service", icon: <ImageIcon size={16} className="text-icon" aria-hidden />, disabled: true },
        { id: "print", label: "Print", icon: <Printer size={16} className="text-icon" aria-hidden />, onSelect: () => window.print() },
        { id: "tg", label: "Send by Telegram", icon: <Send size={16} className="text-icon" aria-hidden />, disabled: status === "cancelled", onSelect: () => setSend("Telegram") },
        { id: "mail", label: "Send by email", icon: <Mail size={16} className="text-icon" aria-hidden />, disabled: status === "cancelled", onSelect: () => setSend("email") },
      ]}
    />
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: invoice.id }]}
        title={invoice.id}
        badges={<StatusPill tone={INVOICE_STATUS[status].tone}>{INVOICE_STATUS[status].label}</StatusPill>}
        subtitle={`${customer.name} · ${invoice.branch} · issued ${fmtDate(invoice.issued)}`}
        actions={
          <>
            {exportMenu}
            {open ? (
              <>
                <Button
                  variant="secondary"
                  icon={Bell}
                  onClick={() => {
                    update((d) => void d.invoices.find((i) => i.id === invoice.id)!.history.unshift({ kind: "submit", title: "Reminder sent by Telegram", meta: nowMeta(user!.name) }));
                    toast({ title: "Reminder sent", body: `${customer.contact} was reminded about ${invoice.id} (${money(balance)}).` });
                  }}
                >
                  Send reminder
                </Button>
                <Button icon={Banknote} onClick={() => router.replace(`/sales/invoices/${invoice.id}?pay=1`, { scroll: false })}>
                  Record payment
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" icon={Copy} onClick={duplicate}>
                  Duplicate
                </Button>
                {status === "paid" && (
                  <Button icon={Send} onClick={() => setSend("receipt")}>
                    Send receipt
                  </Button>
                )}
              </>
            )}
            <Menu
              align="end"
              width={200}
              triggerLabel="More invoice actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                { id: "dup", label: "Duplicate", onSelect: duplicate },
                { id: "customer", label: "Open customer", onSelect: () => router.push(`/sales/customers/${customer.id}`) },
                {
                  id: "cancel",
                  label: "Cancel invoice",
                  disabled: !open || paid > 0,
                  onSelect: () => {
                    update((d) => {
                      const t = d.invoices.find((i) => i.id === invoice.id)!;
                      t.stored = "cancelled";
                      t.history.unshift({ kind: "status", title: "Invoice cancelled", meta: nowMeta(user!.name) });
                    });
                    toast({ title: `${invoice.id} cancelled`, body: "Adjust stock if the goods came back." });
                  },
                },
              ]}
            />
          </>
        }
      />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <PaperDocument
          kind="invoice"
          number={invoice.id}
          status={<StatusPill tone={INVOICE_STATUS[status].tone}>{INVOICE_STATUS[status].label}</StatusPill>}
          customer={customer}
          dates={[["Issue date", fmtDate(invoice.issued)], ["Due date", fmtDate(invoice.due)], ["Branch", invoice.branch]]}
          lines={invoice.lines}
          currency={invoice.currency}
          notes={invoice.notes}
          paid={paid || undefined}
        />
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="pay-status-title">
            <CardHeader title="Payment status" titleId="pay-status-title" />
            <div className="p-5">
              <dl className="grid grid-cols-3 gap-2 text-[13px]">
                {[
                  ["Total", money(total, invoice.currency), "text-fg"],
                  ["Paid", money(paid, invoice.currency), paid ? "text-success-fg" : "text-fg"],
                  ["Balance", money(status === "cancelled" ? 0 : balance, invoice.currency), status === "overdue" ? "text-error-fg" : "text-fg"],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <dt className="text-muted">{l}</dt>
                    <dd className={cn("mt-1 text-[15px] font-semibold", c)}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Paid" aria-valuenow={Math.round((paid / total) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="lf-grow-x h-full rounded-full bg-success" style={{ width: `${Math.min(100, (paid / total) * 100)}%` }} />
              </div>
              <p className={cn("mt-4 flex items-center gap-2 text-sm", status === "paid" ? "text-success-fg" : status === "overdue" ? "text-error-fg" : "text-muted")}>
                {status === "paid" ? <CircleCheck size={16} aria-hidden /> : <CalendarClock size={16} aria-hidden />}
                {status === "paid"
                  ? `Paid in full on ${fmtDate(lastPay.date)}`
                  : status === "cancelled"
                    ? "Cancelled · nothing is due"
                    : status === "overdue"
                      ? `${-days} days overdue · due ${fmtDate(invoice.due)}`
                      : `Due ${days === 0 ? "today" : `in ${days} days`} · ${fmtDate(invoice.due)}`}
              </p>
            </div>
          </Card>
          <Card aria-labelledby="inv-history-title">
            <CardHeader title="History" titleId="inv-history-title" />
            <div className="p-5">
              <Timeline items={toTimeline(invoice.history)} />
            </div>
          </Card>
          {open && (
            <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Why can’t I edit this invoice?">
              Sent invoices are locked. To change items, cancel this invoice and create a new one.
            </Notice>
          )}
        </div>
      </div>
      <Dialog open={payOpen} onClose={() => router.replace(`/sales/invoices/${invoice.id}`, { scroll: false })} labelledBy="pay-inv-title" width={640}>
        {payOpen && <PaymentForm invoice={invoice} onClose={() => router.replace(`/sales/invoices/${invoice.id}`, { scroll: false })} />}
      </Dialog>
      <SendDialog
        open={send !== null}
        onClose={() => setSend(null)}
        invoiceId={invoice.id}
        customer={customer}
        total={send === "receipt" ? paid : balance || total}
        currency={invoice.currency}
        due={invoice.due}
        only={send === "Telegram" || send === "email" ? send : undefined}
        title={send === "receipt" ? `Send receipt for ${invoice.id}` : undefined}
        button={send === "receipt" ? "Send receipt" : "Send"}
        note={send === "receipt" ? "The receipt shows the payments recorded on this invoice." : "The invoice is sent again with its current status."}
        onSent={(channels) => {
          update((d) => void d.invoices.find((i) => i.id === invoice.id)!.history.unshift({ kind: "submit", title: `${send === "receipt" ? "Receipt" : "Invoice"} sent by ${channels}`, meta: nowMeta(user!.name) }));
          toast({ title: send === "receipt" ? "Receipt sent" : "Invoice sent", body: `${invoice.id} was sent by ${channels}.` });
        }}
      />
    </Page>
  );
}

/** Frame 09.10 "Record Payment", with the AI-read payment slip. */
function PaymentForm({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { update } = useOps();
  const finance = useFinance();
  const { user } = useSession();
  const scope = useBranchScope();
  const toast = useToast();
  const customer = useOps().state.customers.find((c) => c.id === invoice.customerId)!;
  const balance = invoiceBalance(invoice);
  const sampleFits = customer.id === "angkor-wholesale" && Math.abs(balance - 520) < 0.005;
  const [slip, setSlip] = useState<{ name: string; ai: boolean } | null>(sampleFits ? { name: "ABA_slip_31Oct.jpg", ai: true } : null);
  const accounts = finance.state.accounts.filter((a) => a.status === "active" && (!scope || a.branch === scope));
  const [date, setDate] = useState(TODAY);
  const [amount, setAmount] = useState(num(balance, invoice.currency));
  const [accountId, setAccountId] = useState(accounts.find((a) => a.id === "aba-business-usd")?.id ?? accounts[0]?.id ?? "");
  const [method, setMethod] = useState("Bank transfer");
  const [ref, setRef] = useState(sampleFits ? "FT26304Q8M12" : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const value = parseAmount(amount);
  const after = Math.max(0, Math.round((balance - value) * 100) / 100);
  const account = accounts.find((a) => a.id === accountId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value <= 0) return setError("Enter the amount received.");
    if (value - balance > 0.004) return setError(`That is more than the balance of ${money(balance, invoice.currency)}.`);
    if (!account) return setError("Choose where the money was paid into.");
    const khr = account.currency === "KHR" && account.kind !== "till";
    update((draft) => {
      const t = draft.invoices.find((i) => i.id === invoice.id)!;
      t.payments.push({ id: `pay-${Date.now()}`, date, amount: value, method, accountId: account.id, ref, by: user!.name, slip: slip?.name, khr: khr ? Math.round(value * 4100) : undefined });
      t.history.unshift({ kind: "payment", title: `Payment recorded · ${money(value, invoice.currency)}`, meta: nowMeta(user!.name), detail: `${method === "Bank transfer" ? "ABA transfer" : method}${ref ? ` · ref ${ref}` : ""}${slip ? "\nPayment slip attached" : ""}`.replace("\n", " · ") });
    });
    finance.update((draft) => {
      const a = draft.accounts.find((x) => x.id === account.id);
      if (a) a.balance = Math.round((a.balance + (khr ? value * 4100 : value)) * 100) / 100;
      draft.transactions.unshift({
        id: `TXN-2026-10-${String(draft.nextIds.txn++).padStart(4, "0")}`,
        date,
        description: `Payment ${invoice.id}`,
        type: "income",
        accountId: account.id,
        branch: invoice.branch,
        category: "Wholesale invoices",
        amount: khr ? Math.round(value * 4100) : value,
        currency: khr ? "KHR" : "USD",
        status: "posted",
        ref,
        method,
        linked: { label: `${invoice.id} · ${after <= 0.004 ? "paid in full" : "part payment"}`, href: `/sales/invoices/${invoice.id}` },
        recon: "unmatched",
        history: [{ kind: "payment", title: `Recorded from ${invoice.id}`, meta: nowMeta(user!.name) }],
      });
    });
    toast({ title: "Payment recorded", body: `${invoice.id} is now ${after <= 0.004 ? "Paid" : "Partially Paid"}. ${money(value, invoice.currency)} was received into ${account.name}.` });
    onClose();
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-start gap-4 border-b border-line px-6 py-5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-success-subtle text-icon-success">
          <Banknote size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pay-inv-title" className="text-xl font-semibold text-fg">
            Record payment
          </h2>
          <p className="mt-1 text-sm text-muted">
            {invoice.id} · {customer.name} · balance {money(balance, invoice.currency)} {invoice.currency}
          </p>
        </div>
        <DialogClose onClose={onClose} />
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">
        {slip?.ai ? (
          <div className="rounded-lg border border-icon-ai/25 bg-ai-subtle p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-medium text-ai-fg">
                <Sparkles size={16} aria-hidden /> Read from payment slip
              </p>
              <StatusPill tone="warning">Confirm the details</StatusPill>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-icon-ai">
                <FileImage size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="text-[15px] font-medium text-fg">{slip.name}</p>
                <p className="text-body">Sender CHENDA MEAS · $520.00 USD</p>
                <p className="text-body">31 Oct 2026, 17:21 · ref FT26304Q8M12</p>
              </div>
              <label className="cursor-pointer text-sm font-medium text-brand hover:underline">
                Replace
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && setSlip({ name: e.target.files[0].name, ai: false })} />
              </label>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong bg-subtle p-4 text-sm">
            {slip ? (
              <p className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-fg"><FileImage size={18} className="text-icon" aria-hidden /> {slip.name} attached</span>
                <button type="button" onClick={() => setSlip(null)} className="cursor-pointer font-medium text-brand hover:underline">Remove</button>
              </p>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 text-brand">
                <FileImage size={18} aria-hidden /> <span className="font-medium hover:underline">Attach the payment slip</span>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && setSlip({ name: e.target.files[0].name, ai: false })} />
              </label>
            )}
            <p className="mt-1.5 text-xs text-muted">Reading slips with AI needs the AI service, which is not connected in this demo. Fill in the fields yourself.</p>
          </div>
        )}
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField size="md" type="date" label="Payment date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
          <MoneyInput id="inv-pay-amount" label="Amount received" currency={invoice.currency} value={amount} onChange={(v) => (setAmount(v), setError(undefined))} error={error} hint={value >= balance - 0.004 ? "Full balance. Enter less for a partial payment." : `Partial payment · ${money(after, invoice.currency)} will remain.`} />
          <SelectField label="Paid into" icon={Landmark} value={accountId} onChange={(e) => setAccountId(e.target.value)} options={accounts.map((a) => ({ value: a.id, label: `${a.name}${a.last4 ? ` •••• ${a.last4}` : ""}` }))} />
          <SelectField label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={["Bank transfer", "KHQR", "Cash", "Cheque", "Card"].map((m) => ({ value: m, label: m }))} />
          <div className="relative">
            <TextField size="md" label="Reference" value={ref} onChange={(e) => setRef(e.target.value)} suffix={slip?.ai && ref === "FT26304Q8M12" && <Sparkles size={16} className="text-icon-ai" aria-hidden />} />
            {slip?.ai && ref === "FT26304Q8M12" && <span className="absolute top-0 right-0 inline-flex h-5 items-center gap-1 rounded-full bg-success-subtle px-1.5 text-xs font-medium text-success-fg"><CircleCheck size={12} aria-hidden />98% confident</span>}
          </div>
          <TextField size="md" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <ModalFooter note={value > 0 && <span className={after <= 0.004 ? "text-success-fg" : "text-warning-fg"}>Balance after: {money(after, invoice.currency)} · becomes {after <= 0.004 ? "Paid" : "Partially Paid"}</span>} className="bg-surface">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Check}>
          Record payment
        </Button>
      </ModalFooter>
    </form>
  );
}
