"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, Building2, Calendar, CircleCheck, Info, Lock, Mail, Mic, PackageCheck, Send, TriangleAlert } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Combobox } from "@/components/hairline/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { ModalFooter, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { addDays, cn, daysBetween, fmtDate, money, TODAY, type Currency } from "@/lib/format";
import { docTotal } from "@/lib/mock/ops-data";
import { BRANCHES_4, type BranchName, type Customer, type DocLine, type Invoice } from "@/lib/mock/ops-types";
import { invoiceBalance, invoiceStatus, nowMeta, sendInvoice, stockShortfalls, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { LineEditor, PaperDocument, SummaryCard } from "./sales-shared";

const DEMO_LINES: DocLine[] = [
  { itemId: "angkor-beer", description: "Angkor Beer 330ml × 24", sku: "BEV-ANG-330", qty: 20, price: 14.5, discount: 0 },
  { itemId: "rumduol-rice", description: "Phka Rumduol Rice 25kg", sku: "RIC-JAS-25", qty: 10, price: 23, discount: 0 },
];

export type InvoiceForm = { id: string; customerId: string; issued: string; due: string; branch: BranchName; currency: Currency; lines: DocLine[]; notes: string };

/** Frames 09.8 "Create Invoice", "Review" and "Send by Email or Telegram". Also edits saved drafts. */
export function InvoiceEditor({ existing, initial, aiNotice }: { existing?: Invoice; initial?: Partial<InvoiceForm>; aiNotice?: React.ReactNode }) {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const nextId = `INV-2026-${String(state.next.invoice).padStart(4, "0")}`;
  const fromCustomer = params.get("customer");
  const [form, setForm] = useState<InvoiceForm>(() =>
    existing
      ? { id: existing.id, customerId: existing.customerId, issued: existing.issued, due: existing.due, branch: existing.branch, currency: existing.currency, lines: existing.lines, notes: existing.notes }
      : {
          id: nextId,
          customerId: fromCustomer ?? (scope ? "golden-lotus" : "angkor-wholesale"),
          issued: TODAY,
          due: addDays(TODAY, 14),
          branch: scope ?? "Central Market",
          currency: "USD",
          lines: fromCustomer || scope ? [] : DEMO_LINES,
          notes: fromCustomer || scope ? "" : "Thank you for your order. Delivery on Monday 2 Nov before 9 am.",
          ...initial,
        },
  );
  const [step, setStep] = useState<"edit" | "review">(existing && params.get("review") === "1" ? "review" : "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const customer = state.customers.find((c) => c.id === form.customerId);
  const set = (patch: Partial<InvoiceForm>) => setForm((f) => ({ ...f, ...patch }));
  const total = docTotal(form.lines);
  const overdue = state.invoices.filter((i) => i.customerId === form.customerId && invoiceStatus(i) === "overdue");
  const shortfalls = stockShortfalls(state, form.lines, form.branch);
  const numberTaken = state.invoices.some((i) => i.id === form.id && i.id !== existing?.id);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!customer) next.customer = "Choose a customer.";
    if (!/^INV-\d{4}-\d{4}$/.test(form.id)) next.id = "Use the format INV-2026-0157.";
    else if (numberTaken) next.id = "This number is already used.";
    if (form.due < form.issued) next.due = "The due date is before the issue date.";
    if (!form.lines.length || form.lines.some((l) => l.qty <= 0)) next.lines = "Add at least one item with a quantity.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  /** Saves the draft to the store and returns its id. */
  const saveDraft = () => {
    update((draft) => {
      const target = draft.invoices.find((i) => i.id === (existing?.id ?? form.id));
      const data = { customerId: form.customerId, issued: form.issued, due: form.due, branch: form.branch, currency: form.currency, lines: form.lines, notes: form.notes };
      if (target) {
        Object.assign(target, data, { id: form.id });
        target.history.unshift({ kind: "edit", title: "Draft updated", meta: nowMeta(user!.name) });
      } else {
        draft.invoices.unshift({ id: form.id, ...data, stored: "draft", payments: [], history: [{ kind: "start", title: "Draft created", meta: nowMeta(user!.name) }] });
        if (form.id === nextId) draft.next.invoice++;
      }
    });
    return form.id;
  };

  const toReview = () => {
    if (!validate()) return;
    const id = saveDraft();
    setStep("review");
    if (!existing) router.replace(`/sales/invoices/${id}?review=1`);
  };

  if (step === "review" && customer) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: form.id, href: `/sales/invoices/${form.id}` }, { label: "Review" }]}
          title="Review invoice"
          badges={<StatusPill tone="neutral">Draft</StatusPill>}
          subtitle={`This is what ${customer.name} will receive.`}
          actions={
            <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep("edit")}>
                Back to edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  saveDraft();
                  toast({ title: "Draft saved", body: `${form.id} is saved as a draft.` });
                  router.push("/sales/invoices");
                }}
              >
                Save as draft
              </Button>
              <Button icon={Send} onClick={() => setSending(true)}>
                Send invoice
              </Button>
            </>
          }
        />
        <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
          <PaperDocument
            kind="invoice"
            number={form.id}
            status={<StatusPill tone="neutral">Draft</StatusPill>}
            customer={customer}
            dates={[["Issue date", fmtDate(form.issued)], ["Due date", fmtDate(form.due)], ["Branch", form.branch]]}
            lines={form.lines}
            currency={form.currency}
            notes={form.notes}
          />
          <div className="flex flex-col gap-4 md:gap-6">
            <Card aria-labelledby="before-send-title">
              <CardHeader title="Before you send" titleId="before-send-title" />
              <ul className="flex flex-col gap-3 p-5 text-sm text-body">
                <Check ok>Invoice number {form.id} is unique</Check>
                <Check ok={!shortfalls.length}>{shortfalls.length ? `${shortfalls.map((s) => s.item.name).join(", ")} is short at ${form.branch}` : `Stock is available at ${form.branch}`}</Check>
                <Check ok={Boolean(customer.email && customer.telegram)}>{customer.email && customer.telegram ? "Customer has email and Telegram" : "Customer has no Telegram on file"}</Check>
                {overdue.length > 0 && <Check ok={false}>Customer has {overdue.length} overdue invoice ({money(overdue.reduce((s, i) => s + invoiceBalance(i), 0))})</Check>}
              </ul>
            </Card>
            <Card aria-labelledby="what-happens-title">
              <CardHeader title="What happens when you send" titleId="what-happens-title" />
              <ul className="flex flex-col gap-3 p-5 text-sm text-body">
                <li className="flex gap-2.5"><Lock size={18} className="shrink-0 text-icon" aria-hidden /> Items and amounts are locked</li>
                <li className="flex gap-2.5"><PackageCheck size={18} className="shrink-0 text-icon" aria-hidden /> Stock is reduced at {form.branch}</li>
                <li className="flex gap-2.5"><Bell size={18} className="shrink-0 text-icon" aria-hidden /> Reminders 7 and 2 days before it is due</li>
              </ul>
            </Card>
          </div>
        </div>
        <SendDialog
          open={sending}
          onClose={() => setSending(false)}
          invoiceId={form.id}
          customer={customer}
          total={total}
          currency={form.currency}
          due={form.due}
          onSent={(channels) => {
            update((draft) => sendInvoice(draft, form.id, user!.name, channels));
            toast({ title: "Invoice sent", body: `${form.id} was sent by ${channels}. Stock at ${form.branch} was reduced.` });
            router.push(`/sales/invoices/${form.id}`);
          }}
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: existing ? form.id : "Create invoice" }]}
        title={existing ? `Edit ${form.id}` : "Create invoice"}
        badges={<StatusPill tone="neutral">Draft</StatusPill>}
        subtitle="Draft invoices can be edited freely. Sending an invoice locks its items and amounts."
      />
      {aiNotice}
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <CustomerAndDates form={form} set={set} errors={errors} customers={state.customers} scope={scope} />
          <LineEditor
            lines={form.lines}
            onChange={(lines) => set({ lines })}
            branch={form.branch}
            currency={form.currency}
            errors={errors.lines}
            aiFlags
            action={
              <Link href="/sales/invoices/voice" className="focus-ring inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
                <Mic size={16} aria-hidden /> Add from voice
              </Link>
            }
          />
          <Card aria-labelledby="notes-title">
            <CardHeader title="Notes for the customer" titleId="notes-title" subtitle="Shown on the invoice under the totals." />
            <div className="p-5">
              <TextAreaField label="Notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Add a note for the customer (optional)" />
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <SummaryCard lines={form.lines} currency={form.currency}>
            <Button iconRight={ArrowRight} onClick={toReview}>
              Review invoice
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!customer) return setErrors({ customer: "Choose a customer." });
                saveDraft();
                toast({ title: "Draft saved", body: `${form.id} is saved as a draft.` });
                router.push("/sales/invoices");
              }}
            >
              Save as draft
            </Button>
            <button type="button" onClick={() => router.push("/sales/invoices")} className="focus-ring mx-auto cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
              Cancel
            </button>
          </SummaryCard>
          {customer && <BillTo customer={customer} />}
          {overdue.length > 0 && (
            <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="Customer has an overdue invoice" action={<Link href={`/sales/invoices/${overdue[0].id}`} className="text-sm font-medium text-warning-fg hover:underline">View</Link>}>
              {overdue[0].id} · {money(invoiceBalance(overdue[0]))}
              <br />
              {-daysBetween(TODAY, overdue[0].due)} days overdue
            </Notice>
          )}
        </div>
      </div>
    </Page>
  );
}

export function CustomerAndDates({
  form,
  set,
  errors,
  customers,
  scope,
  numberLabel = "Invoice number",
  dueLabel = "Due date",
  issueLabel = "Issue date",
  dueHint,
  aiDue,
  customerConfidence,
}: {
  form: { id: string; customerId: string; issued: string; due: string; branch: BranchName; currency: Currency };
  set: (patch: Partial<InvoiceForm>) => void;
  errors: Record<string, string>;
  customers: Customer[];
  scope: BranchName | null;
  numberLabel?: string;
  dueLabel?: string;
  issueLabel?: string;
  dueHint?: string;
  aiDue?: { confirmed: boolean; onConfirm: () => void };
  /** AI confidence chip shown next to the Customer label (voice draft). */
  customerConfidence?: number;
}) {
  const customer = customers.find((c) => c.id === form.customerId);
  const customerOptions = customers
    .filter((c) => c.active)
    .map((c) => ({ value: c.id, label: c.name, description: `${c.city} · ${c.contact}`, initials: c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase(), keywords: [c.city, c.contact, c.phone] }));
  return (
    <Card aria-labelledby="customer-dates-title">
      <CardHeader title={numberLabel === "Number" ? "Customer and validity" : "Customer and dates"} titleId="customer-dates-title" />
      <div className="grid gap-x-4 gap-y-5 p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="relative">
          {customerConfidence !== undefined && (
            <span className="absolute top-0 right-0 inline-flex h-5 items-center gap-1 rounded-full bg-success-subtle px-1.5 text-xs font-medium text-success-fg">
              <CircleCheck size={12} aria-hidden /> {customerConfidence}% confident
            </span>
          )}
        {/* Hairline UI combobox: type to search customers; results morph between queries. */}
        <div className="flex flex-col">
          <span className="mb-1.5 text-sm leading-5 font-medium text-fg">Customer</span>
          <Combobox
            label="Customer"
            placeholder="Choose a customer"
            searchPlaceholder="Search name, city or contact"
            variant="field"
            value={customerOptions.find((o) => o.value === form.customerId) ?? null}
            onValueChange={(o) => {
              const c = customers.find((x) => x.id === o?.value);
              set({ customerId: o?.value ?? "", due: addDays(form.issued, numberLabel === "Number" ? 14 : c?.terms ?? 14) });
            }}
            options={customerOptions}
            emptyMessage={(q) => `No customer matches “${q}”. Add them in Sales → Customers.`}
            className={cn("w-full", errors.customer && "[&_button]:!border-error")}
          />
          {errors.customer && <span className="mt-1.5 text-[13px] leading-5 text-error-fg">{errors.customer}</span>}
        </div>
        </div>
        <TextField size="md" label={numberLabel} value={form.id} onChange={(e) => set({ id: e.target.value.toUpperCase() })} state={errors.id ? "error" : "default"} message={errors.id ?? "Next number in sequence. Must be unique."} />
        <div className="grid gap-x-4 gap-y-5 md:col-span-2 md:grid-cols-[1fr_1fr_1fr_120px]">
          <TextField size="md" type="date" label={issueLabel} icon={Calendar} value={form.issued} onChange={(e) => set({ issued: e.target.value, due: addDays(e.target.value, customer?.terms ?? 14) })} />
          <TextField
            size="md"
            type="date"
            label={dueLabel}
            icon={Calendar}
            value={form.due}
            onChange={(e) => {
              set({ due: e.target.value });
              aiDue?.onConfirm();
            }}
            onBlur={() => aiDue?.onConfirm()}
            state={errors.due ? "error" : aiDue && !aiDue.confirmed ? "warning" : "default"}
            message={errors.due ?? (aiDue && !aiDue.confirmed ? "Heard “in two weeks”. Confirm the due date." : dueHint ?? (customer ? `Customer terms: ${customer.terms} days` : undefined))}
          />
          <SelectField label="Branch" icon={Building2} value={form.branch} disabled={Boolean(scope)} onChange={(e) => set({ branch: e.target.value as BranchName })} options={(scope ? [scope] : BRANCHES_4).map((b) => ({ value: b, label: b }))} />
          <SelectField label="Currency" value={form.currency} onChange={(e) => set({ currency: e.target.value as Currency })} options={[{ value: "USD", label: "USD" }, { value: "KHR", label: "KHR" }]} />
        </div>
      </div>
    </Card>
  );
}

export function BillTo({ customer, title = "Bill to" }: { customer: Customer; title?: string }) {
  return (
    <Card aria-labelledby="bill-to-title">
      <CardHeader title={title} titleId="bill-to-title" />
      <div className="p-5 text-sm">
        <p className="text-[15px] font-semibold text-fg">{customer.name}</p>
        <p className="mt-2 text-muted">{customer.address}</p>
        <p className="mt-2 text-muted">
          {customer.contact} · {customer.phone}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {customer.email && <StatusPill tone="success">Email on file</StatusPill>}
          {customer.telegram && <StatusPill tone="success">Telegram linked</StatusPill>}
        </div>
      </div>
    </Card>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      {ok ? <CircleCheck size={18} className="shrink-0 text-icon-success" aria-label="OK" /> : <TriangleAlert size={18} className="shrink-0 text-icon-warning" aria-label="Check" />}
      <span>{children}</span>
    </li>
  );
}

/** Frame 09.8 "Send by Email or Telegram". */
export function SendDialog({
  open,
  onClose,
  invoiceId,
  customer,
  total,
  currency,
  due,
  onSent,
  only,
  title,
  button = "Send invoice",
  note = "Sending marks the invoice as Sent and locks its items and amounts.",
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  customer: Customer;
  total: number;
  currency: Currency;
  due: string;
  onSent: (channels: string) => void;
  only?: "Telegram" | "email";
  title?: string;
  button?: string;
  note?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="send-title" width={580}>
      {open && <SendForm {...{ onClose, invoiceId, customer, total, currency, due, onSent, only, title, button, note }} />}
    </Dialog>
  );
}

function SendForm({ onClose, invoiceId, customer, total, currency, due, onSent, only, title, button, note }: Omit<Parameters<typeof SendDialog>[0], "open">) {
  const [telegram, setTelegram] = useState(only !== "email" && Boolean(customer.telegram));
  const [email, setEmail] = useState(only !== "Telegram" && Boolean(customer.email));
  const [pdf, setPdf] = useState(true);
  const [png, setPng] = useState(false);
  const [message, setMessage] = useState(`Hello ${customer.contact.split(" ")[0]}, please find ${title?.startsWith("Send PP") ? "planned purchase" : "invoice"} ${invoiceId} for ${money(total, currency)}, due on ${fmtDate(due)}. Thank you!`);
  const [error, setError] = useState<string>();
  const channel = (on: boolean, set: (v: boolean) => void, icon: React.ReactNode, name: string, detail: string, tone: string) => (
    <label className={cn("flex cursor-pointer items-center gap-4 rounded-[10px] px-4 py-3.5", on ? "border-2 border-primary bg-primary-subtle/60 px-[15px] py-[13px]" : "border border-line hover:border-line-strong")}>
      <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-fg">{name}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      <input type="checkbox" className="lf-check" checked={on} onChange={(e) => (set(e.target.checked), setError(undefined))} aria-label={`Send by ${name}`} />
    </label>
  );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!telegram && !email) return setError("Choose at least one way to send it.");
        if (!pdf && !png) return setError("Attach a PDF or an image.");
        onSent([telegram && "Telegram", email && "email"].filter(Boolean).join(" and "));
        onClose();
      }}
    >
      <div className="flex items-start gap-4 border-b border-line px-6 py-5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-subtle text-brand">
          <Send size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="send-title" className="text-xl font-semibold text-fg">
            {title ?? `Send ${invoiceId}`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Total {currency === "USD" ? "due" : ""} {money(total, currency)} {currency} · due {fmtDate(due)}
          </p>
        </div>
        <DialogClose onClose={onClose} />
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Send through</legend>
          <div className="flex flex-col gap-3">
            {customer.telegram && channel(telegram, setTelegram, <Send size={20} aria-hidden />, "Telegram", `${customer.telegram} · delivered through the LuyFlow bot`, "bg-[#229ed9] text-white")}
            {customer.email && channel(email, setEmail, <Mail size={20} aria-hidden />, "Email", customer.email, "bg-primary-subtle text-brand")}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Attach as</legend>
          <div className="flex gap-6">
            <Checkbox checked={pdf} onChange={setPdf}>PDF</Checkbox>
            <Checkbox checked={png} onChange={setPng}>Image (PNG)</Checkbox>
          </div>
        </fieldset>
        <TextAreaField label="Message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        <p className="flex items-center gap-2.5 rounded-md border border-icon-info/25 bg-info-subtle px-3 py-2.5 text-[13px] text-body">
          <Info size={16} className="shrink-0 text-icon-info" aria-hidden />
          {note} Delivery is simulated in this demo.
        </p>
        {error && <p role="alert" className="text-[13px] text-error-fg">{error}</p>}
      </div>
      <ModalFooter className="bg-surface">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Send}>
          {button}
        </Button>
      </ModalFooter>
    </form>
  );
}
