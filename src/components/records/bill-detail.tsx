"use client";

import { useRef, useState } from "react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Banknote, Check, CircleAlert, CircleCheck, Download, Ellipsis, Landmark, RefreshCw, Sparkles, TriangleAlert, Receipt, Calendar } from "lucide-react";
import { FileDrop, MoneyInput, parseAmount, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, TwoLine } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { DetailList, Timeline, type TimelineItem } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { ModalFooter, useToast } from "@/components/ui/overlay";
import { DialogClose } from "@/components/ui/dialog";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { StatStrip } from "@/components/ui/stat";
import { BILL_STATUS, billBalance, billStatus, billSubtotal, billTotal, useFinance } from "@/lib/finance-store";
import { daysBetween, downloadCsv, fmtDate, money, num, TODAY } from "@/lib/format";
import type { Bill, HistoryEntry } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

export const HISTORY_ICONS: Record<HistoryEntry["kind"], { icon: React.ReactNode; tone: TimelineItem["tone"] }> = {
  status: { icon: <RefreshCw size={14} aria-hidden />, tone: "primary" },
  ai: { icon: <Sparkles size={14} aria-hidden />, tone: "ai" },
  payment: { icon: <Banknote size={14} aria-hidden />, tone: "success" },
  submit: { icon: <Receipt size={14} aria-hidden />, tone: "sky" },
  start: { icon: <Receipt size={14} aria-hidden />, tone: "neutral" },
  signed: { icon: <CircleCheck size={14} aria-hidden />, tone: "success" },
  returned: { icon: <RefreshCw size={14} aria-hidden />, tone: "warning" },
  import: { icon: <Receipt size={14} aria-hidden />, tone: "neutral" },
  match: { icon: <RefreshCw size={14} aria-hidden />, tone: "primary" },
  edit: { icon: <Receipt size={14} aria-hidden />, tone: "neutral" },
  reverse: { icon: <RefreshCw size={14} aria-hidden />, tone: "warning" },
};

export const toTimeline = (history: HistoryEntry[]): TimelineItem[] =>
  history.map((entry) => ({ ...HISTORY_ICONS[entry.kind], title: entry.title, meta: entry.meta, detail: entry.detail }));

/** Frames 10.4 "Bill Details", 10.5 "Record Bill Payment" and "Bill paid". */
export function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useFinance();
  const router = useRouter();
  const params = useSearchParams();
  const bill = state.bills.find((b) => b.id === id);
  const paymentsRef = useRef<HTMLElement>(null);
  if (!bill) notFound();
  const payOpen = params.get("pay") === "1";
  const status = billStatus(bill);
  const balance = billBalance(bill);
  const total = billTotal(bill);
  const days = daysBetween(TODAY, bill.due);
  const payable = ["open", "partial", "overdue"].includes(status);
  const openPay = () => router.replace(`/financial-records/bills/${bill.id}?pay=1`, { scroll: false });

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Bills", href: "/financial-records/bills" },
          { label: bill.id },
        ]}
        title={bill.id}
        badges={<StatusPill tone={BILL_STATUS[status].tone}>{BILL_STATUS[status].label}</StatusPill>}
        subtitle={`${bill.supplier} · supplier no. ${bill.supplierNo} · ${bill.branch}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                downloadCsv(`${bill.id}.csv`, [
                  ["Bill", bill.id],
                  ["Supplier", bill.supplier],
                  ["Supplier number", bill.supplierNo],
                  ["Bill date", bill.billDate],
                  ["Due", bill.due],
                  [],
                  ["Description", "Quantity", `Unit price (${bill.currency})`, `Amount (${bill.currency})`],
                  ...bill.lines.map((line) => [line.description, line.qty, line.price, line.qty * line.price]),
                  ...(bill.vatRate ? [[`VAT ${bill.vatRate * 100}%`, "", "", total - billSubtotal(bill)]] : []),
                  ["Total", "", "", total],
                ])
              }
            >
              Export
            </Button>
            {payable ? (
              <Button icon={Banknote} onClick={openPay}>
                Record payment
              </Button>
            ) : (
              bill.payments.length > 0 && (
                <Button variant="secondary" icon={Receipt} onClick={() => paymentsRef.current?.scrollIntoView({ behavior: "smooth" })}>
                  View payment
                </Button>
              )
            )}
            <Menu
              align="end"
              width={200}
              triggerLabel="More bill actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                { id: "list", label: "Back to bills", onSelect: () => router.push("/financial-records/bills") },
                { id: "attachment", label: `Download ${bill.attachment ?? "attachment"}`, disabled: true },
              ]}
            />
          </>
        }
      />

      {payable && status === "overdue" && (
        <Notice tone="error" className="mt-6" icon={<CircleAlert size={18} aria-hidden />} title={`Overdue by ${-days} day${days === -1 ? "" : "s"}`}>
          This bill was due on {fmtDate(bill.due)}. Record the payment as soon as it is made.
        </Notice>
      )}
      {payable && status !== "overdue" && days <= 7 && (
        <Notice tone="warning" className="mt-6" icon={<TriangleAlert size={18} aria-hidden />} title={`Due in ${days} day${days === 1 ? "" : "s"}`}>
          This bill is due on {fmtDate(bill.due)}. Paying from ABA Business USD keeps you above your cash safety level.
        </Notice>
      )}

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Bill amounts">
            <StatStrip
              className="border-b"
              items={[
                { label: "Total", value: money(total, bill.currency), sub: bill.currency === "KHR" ? `≈ ${money(total / 4100, "USD")}` : `≈ ${money(total * 4100, "KHR")}` },
                { label: "Paid", value: money(bill.paid, bill.currency), valueClassName: bill.paid ? "text-success-fg" : undefined },
                { label: "Balance", value: money(balance, bill.currency), valueClassName: status === "overdue" ? "text-error-fg" : undefined },
                {
                  label: "Due date",
                  value: fmtDate(bill.due),
                  sub: payable ? <StatusPill tone={status === "overdue" ? "error" : "warning"}>{status === "overdue" ? `${-days} days late` : days === 0 ? "Today" : `In ${days} days`}</StatusPill> : undefined,
                },
              ]}
            />
            <DataTable
              caption="Bill lines"
              rows={[...bill.lines.map((line, i) => ({ ...line, key: String(i) })), ...(bill.vatRate ? [{ key: "vat", description: `VAT ${bill.vatRate * 100}%`, sub: "Tax", qty: 0, price: 0, kind: "tax" as const }] : [])]}
              rowKey={(line) => line.key}
              minWidth={600}
              columns={[
                { key: "desc", header: "Description", cell: (line) => <TwoLine title={line.description} titleClassName="font-normal" sub={line.sub} /> },
                { key: "qty", header: "Quantity", align: "right", width: "100px", cell: (line) => (line.kind === "tax" ? "" : <span className="tabular text-fg">{line.qty}</span>) },
                { key: "price", header: `Unit price (${bill.currency})`, align: "right", width: "150px", cell: (line) => (line.kind === "tax" ? "" : <span className="tabular text-fg">{num(line.price, bill.currency)}</span>) },
                {
                  key: "amount",
                  header: `Amount (${bill.currency})`,
                  align: "right",
                  width: "150px",
                  cell: (line) => <span className="tabular text-fg">{num(line.kind === "tax" ? total - billSubtotal(bill) : line.qty * line.price, bill.currency)}</span>,
                },
              ]}
              mobileRow={(line) => (
                <div className="flex justify-between gap-3 text-[13px]">
                  <TwoLine title={line.description} sub={line.kind === "tax" ? "Tax" : `${line.qty} × ${num(line.price, bill.currency)}`} />
                  <span className="tabular shrink-0">{num(line.kind === "tax" ? total - billSubtotal(bill) : line.qty * line.price, bill.currency)}</span>
                </div>
              )}
            />
          </section>

          <section ref={paymentsRef} className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-labelledby="payments-title">
            <CardHeader
              title="Payments"
              titleId="payments-title"
              subtitle={bill.payments.length ? `${bill.payments.length} payment${bill.payments.length === 1 ? "" : "s"}` : "No payments recorded yet"}
              divided={bill.payments.length > 0}
            />
            {bill.payments.length ? (
              <DataTable
                caption="Payments"
                rows={bill.payments.map((p, i) => ({ ...p, key: String(i) }))}
                rowKey={(p) => p.key}
                minWidth={560}
                columns={[
                  { key: "date", header: "Date", width: "120px", cell: (p) => <span className="text-muted">{fmtDate(p.date)}</span> },
                  { key: "from", header: "Paid from", cell: (p) => <TwoLine title={p.account} titleClassName="font-normal" sub={p.method} /> },
                  { key: "ref", header: "Reference", width: "160px", cell: (p) => <span className="text-fg">{p.ref || "—"}</span> },
                  { key: "amount", header: `Amount (${bill.currency})`, align: "right", width: "140px", cell: (p) => <span className="tabular text-fg">{num(p.amount, bill.currency)}</span> },
                ]}
                mobileRow={(p) => (
                  <div className="flex justify-between gap-3">
                    <TwoLine title={p.account} sub={`${fmtDate(p.date)} · ${p.ref}`} />
                    <span className="tabular">{num(p.amount, bill.currency)}</span>
                  </div>
                )}
              />
            ) : (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted-bg text-icon-strong">
                  <Banknote size={24} aria-hidden />
                </span>
                <p className="mt-4 text-base font-semibold text-fg">Nothing paid yet</p>
                <p className="mt-1 text-sm text-muted">Record a payment when you pay this bill. Partial payments reduce the balance.</p>
                {payable && (
                  <Button variant="secondary" onClick={openPay} className="mt-5">
                    Record payment
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="bill-details-title">
            <CardHeader title="Details" titleId="bill-details-title" />
            <div className="p-5">
              <DetailList
                labelWidth={110}
                items={[
                  ["Supplier", bill.supplier],
                  ["Bill date", fmtDate(bill.billDate)],
                  ["Category", bill.category],
                  ["Branch", bill.branch],
                  ["Attachment", bill.attachment ? <span className="text-brand">{bill.attachment}</span> : "—"],
                ]}
              />
            </div>
          </Card>
          <Card aria-labelledby="bill-history-title" className="flex-1">
            <CardHeader title="History" titleId="bill-history-title" />
            <div className="p-5">
              <Timeline items={toTimeline(bill.history)} />
            </div>
          </Card>
        </div>
      </div>
      <PaymentDialog bill={bill} open={payOpen && payable} onClose={() => router.replace(`/financial-records/bills/${bill.id}`, { scroll: false })} />
    </Page>
  );
}

function PaymentDialog({ bill, open, onClose }: { bill: Bill; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="pay-title" width={600}>
      <PaymentForm key={String(open)} bill={bill} onClose={onClose} />
    </Dialog>
  );
}

function PaymentForm({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const balance = billBalance(bill);
  const sources = state.accounts.filter((a) => a.status === "active");
  const [date, setDate] = useState(TODAY);
  const [currency, setCurrency] = useState(bill.currency);
  const [amount, setAmount] = useState(num(balance, bill.currency));
  const [accountId, setAccountId] = useState(sources.find((a) => a.currency === bill.currency && a.kind !== "till")?.id ?? sources[0]?.id ?? "");
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState(bill.currency === "USD" ? "FT26304B7C55" : "");
  const [notes, setNotes] = useState("");
  const [slip, setSlip] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const account = sources.find((a) => a.id === accountId);
  const entered = parseAmount(amount);
  const inBillCurrency = currency === bill.currency ? entered : currency === "KHR" ? entered / 4100 : entered * 4100;
  const after = Math.max(0, balance - inBillCurrency);
  const accountCurrency = account?.kind === "till" ? (currency === "KHR" ? "KHR" : "USD") : account?.currency ?? "USD";
  const accountBalance = account ? (account.kind === "till" && accountCurrency === "KHR" ? account.khrBalance ?? 0 : account.balance) : 0;
  const spend = accountCurrency === currency ? entered : accountCurrency === "KHR" ? entered * 4100 : entered / 4100;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (entered <= 0) return setError("Enter the amount you paid.");
    if (inBillCurrency - balance > (bill.currency === "KHR" ? 100 : 0.005)) return setError(`That is more than the balance of ${money(balance, bill.currency)}.`);
    if (spend > accountBalance + 0.005) return setError(`${account?.name} only has ${money(accountBalance, accountCurrency)}.`);
    const paid = Math.round(inBillCurrency * 100) / 100;
    const becomes = after <= 0.005 ? "Paid" : "Partially Paid";
    update((draft) => {
      const target = draft.bills.find((b) => b.id === bill.id)!;
      target.paid = Math.round((target.paid + paid) * 100) / 100;
      target.payments.push({ date, account: `${account?.name}${account?.last4 ? ` •••• ${account.last4}` : ""}`, method, ref: reference, amount: paid });
      target.history.unshift({
        kind: "payment",
        title: `Payment recorded · ${money(paid, bill.currency)}`,
        meta: `${user?.name} · ${fmtDate(date)}, 17:40`,
        detail: `${account?.name}${reference ? ` · ref ${reference}` : ""}`,
      });
      const source = draft.accounts.find((a) => a.id === accountId)!;
      if (source.kind === "till" && accountCurrency === "KHR") source.khrBalance = (source.khrBalance ?? 0) - spend;
      else source.balance = Math.round((source.balance - spend) * 100) / 100;
      draft.transactions.unshift({
        id: `TXN-2026-10-${String(draft.nextIds.txn++).padStart(4, "0")}`,
        date,
        description: `Payment ${bill.id} · ${bill.supplier}`,
        type: "expense",
        accountId,
        branch: bill.branch,
        category: bill.category,
        amount: -spend,
        currency: accountCurrency,
        status: "posted",
        ref: reference,
        method,
        linked: { label: `${bill.id} · ${becomes === "Paid" ? "paid in full" : "part payment"}`, href: `/financial-records/bills/${bill.id}` },
        recon: "unmatched",
        history: [{ kind: "payment", title: `Recorded from ${bill.id}`, meta: `${user?.name} · ${fmtDate(date)}, 17:40` }],
      });
    });
    toast({ title: "Payment recorded", body: `${bill.id} is now ${becomes}. ${money(paid, bill.currency)} was paid from ${account?.name}.` });
    onClose();
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-start gap-4 border-b border-line px-5 py-5 md:px-6">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-subtle text-brand">
          <Banknote size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pay-title" className="text-xl leading-7 font-semibold text-fg">
            Record bill payment
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            {bill.id} · {bill.supplier} · balance {money(balance, bill.currency)} {bill.currency}
          </p>
        </div>
        <DialogClose onClose={onClose} />
      </div>
      <div className="grid gap-x-4 gap-y-5 px-5 py-5 sm:grid-cols-2 md:px-6">
        <TextField size="md" label="Payment date" type="date" icon={Calendar} max={TODAY} value={date} onChange={(event) => setDate(event.target.value)} />
        <MoneyInput
          id="pay-amount"
          label="Amount paid"
          currency={currency}
          onCurrency={setCurrency}
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setError(undefined);
          }}
          error={error}
          hint={currency === "USD" ? `≈ ${money(entered * 4100, "KHR")} at 4,100 KHR per USD` : `≈ ${money(entered / 4100, "USD")} at 4,100 KHR per USD`}
        />
        <SelectField
          label="Paid from"
          icon={Landmark}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          options={sources.map((a) => ({ value: a.id, label: `${a.name}${a.last4 ? ` •••• ${a.last4}` : ""}` }))}
          message={account ? `Account balance after: ${money(accountBalance - spend, accountCurrency)}` : undefined}
        />
        <SelectField
          label="Payment method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          options={["Bank transfer", "KHQR", "Wing transfer", "Cash", "Cheque"].map((m) => ({ value: m, label: m }))}
        />
        <TextField size="md" label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Bank or wallet reference" />
        <TextField size="md" label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        <div className="sm:col-span-2">
          {slip ? (
            <p className="flex items-center justify-between rounded-md border border-line bg-subtle px-4 py-3 text-sm text-fg">
              {slip}
              <button type="button" onClick={() => setSlip(null)} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
                Remove
              </button>
            </p>
          ) : (
            <FileDrop compact accept="image/png,image/jpeg,application/pdf" hint="Attach the transfer slip · JPG, PNG or PDF up to 10 MB" label="Attach transfer slip" onFile={(file) => setSlip(file.name)} />
          )}
        </div>
      </div>
      <ModalFooter
        note={
          entered > 0 && (
            <span className={after <= 0.005 ? "text-success-fg" : "text-warning-fg"}>
              Bill balance after: {money(after, bill.currency)} · becomes {after <= 0.005 ? "Paid" : "Partially Paid"}
            </span>
          )
        }
      >
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
