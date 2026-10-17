"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, CircleCheck, FileText, Maximize2, RotateCw, Sparkles, TriangleAlert, Plus, Trash2, X } from "lucide-react";
import { AiBadge } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn, fmtDate, money, num, TODAY, type Currency } from "@/lib/format";
import { BRANCH_NAMES, CATEGORIES } from "@/lib/mock/finance-data";
import type { Bill } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

type Line = { id: string; description: string; note: string; matched: boolean; qty: string; price: string };

const SAMPLE = {
  file: "CBC-118204.jpg",
  supplier: "Cambodia Beverage Co.",
  number: "CBC-118204",
  billDate: "2026-10-19",
  due: "2026-11-02",
  branch: "Central Market",
  category: "Inventory purchases",
  currency: "USD" as Currency,
  lines: [
    { id: "a", description: "Angkor Beer 330ml × 24", note: "Matched to item in your list", matched: true, qty: "96", price: "11.20" },
    { id: "b", description: "Vital Water 500ml × 12", note: "Matched to item in your list", matched: true, qty: "120", price: "2.10" },
    { id: "c", description: "Delivery", note: "No matching item · recorded as an expense line", matched: false, qty: "1", price: "18.25" },
  ],
};

/** Frame 10.3 "Create Bill — AI reads the supplier bill". */
export function BillCreate() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const isManager = user?.role === "manager";
  const fileRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<{ name: string; url: string | null; sample: boolean }>({ name: SAMPLE.file, url: null, sample: true });
  const [ai, setAi] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [supplier, setSupplier] = useState(SAMPLE.supplier);
  const [number, setNumber] = useState(SAMPLE.number);
  const [billDate, setBillDate] = useState(SAMPLE.billDate);
  const [due, setDue] = useState(SAMPLE.due);
  const [dueChecked, setDueChecked] = useState(false);
  const [branch, setBranch] = useState(isManager ? user!.branch! : SAMPLE.branch);
  const [category, setCategory] = useState(SAMPLE.category);
  const [currency, setCurrency] = useState<Currency>(SAMPLE.currency);
  const [lines, setLines] = useState<Line[]>(SAMPLE.lines);
  const [vat, setVat] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "bill" | null>(null);

  useEffect(() => () => {
    if (doc.url) URL.revokeObjectURL(doc.url);
  }, [doc.url]);

  const readSample = () => {
    setDoc({ name: SAMPLE.file, url: null, sample: true });
    setAi(true);
    setSupplier(SAMPLE.supplier);
    setNumber(SAMPLE.number);
    setBillDate(SAMPLE.billDate);
    setDue(SAMPLE.due);
    setDueChecked(false);
    setBranch(isManager ? user!.branch! : SAMPLE.branch);
    setCategory(SAMPLE.category);
    setCurrency("USD");
    setLines(SAMPLE.lines);
    setVat(true);
    setErrors({});
  };

  const replace = (file: File) => {
    setDoc({ name: file.name, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, sample: false });
    setAi(false);
    setSupplier("");
    setNumber("");
    setBillDate(TODAY);
    setDue("");
    setDueChecked(true);
    setLines([{ id: `l-${Date.now()}`, description: "", note: "", matched: false, qty: "1", price: "" }]);
    setVat(false);
    setErrors({});
  };

  const subtotal = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.price.replace(/,/g, "")) || 0), 0);
  const tax = vat ? Math.round(subtotal * 10 + 1e-6) / 100 : 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const duplicate = state.bills.find(
    (b) => b.supplier.toLowerCase() === supplier.trim().toLowerCase() && (b.supplierNo.toLowerCase() === number.trim().toLowerCase() || (Math.abs(b.lines.reduce((s, l) => s + l.qty * l.price, 0) * (1 + b.vatRate) - total) < 0.01 && b.billDate.slice(0, 7) === billDate.slice(0, 7))),
  );
  const lowConfidence = ai && !dueChecked ? 2 : 0;

  const save = (mode: "draft" | "bill") => {
    const next: Record<string, string> = {};
    if (!supplier.trim()) next.supplier = "Enter the supplier.";
    if (!number.trim()) next.number = "Enter the supplier’s bill number.";
    if (!billDate) next.billDate = "Enter the bill date.";
    if (!due) next.due = "Enter the due date.";
    else if (due < billDate) next.due = "The due date is before the bill date.";
    if (!lines.some((l) => l.description.trim() && Number(l.qty) > 0 && Number(l.price.replace(/,/g, "")) > 0)) next.lines = "Add at least one line with a quantity and price.";
    setErrors(next);
    if (Object.keys(next).length && mode === "bill") return;
    if (!supplier.trim()) return;
    setSaving(mode);
    const id = `BILL-0${state.nextIds.bill}`;
    const bill: Bill = {
      id,
      supplier: supplier.trim(),
      supplierNo: number.trim(),
      category,
      branch,
      billDate,
      due: due || billDate,
      currency,
      lines: lines
        .filter((l) => l.description.trim())
        .map((l) => ({ description: l.description.trim(), sub: l.matched ? `stock received at ${branch}` : "Expense line", qty: Number(l.qty) || 0, price: Number(l.price.replace(/,/g, "")) || 0, kind: l.matched ? "item" : "expense" })),
      vatRate: vat ? 0.1 : 0,
      paid: 0,
      stored: mode === "draft" ? "draft" : null,
      attachment: doc.name,
      history: [
        { kind: "status", title: mode === "draft" ? "Saved as draft" : "Status changed to Open", meta: `${user?.name} · 31 Oct 2026, 17:46` },
        ...(ai ? [{ kind: "ai" as const, title: "Bill read from uploaded document", meta: `${user?.name} · 31 Oct 2026, 17:42`, detail: "9 fields extracted" }] : []),
      ],
      payments: [],
    };
    update((draft) => {
      draft.bills.unshift(bill);
      draft.nextIds.bill++;
    });
    toast({ title: mode === "draft" ? "Draft saved" : "Bill saved", body: `${id} from ${bill.supplier} · ${money(total, currency)}` });
    router.push(`/financial-records/bills/${id}`);
  };

  const setLine = (id: string, patch: Partial<Line>) => setLines((list) => list.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: "Financial Records", href: "/financial-records" },
          { label: "Bills", href: "/financial-records/bills" },
          { label: "New bill" },
        ]}
        title="Create bill"
        badges={ai && <AiBadge>Read from document</AiBadge>}
        subtitle="Upload a supplier bill and AI fills in the fields for you to check, or type the bill in yourself."
      />

      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 md:gap-6">
          <Card className="overflow-hidden" aria-labelledby="doc-title">
            <CardHeader
              title="Original document"
              titleId="doc-title"
              subtitle={`${doc.name} · 1 page`}
              actions={
                <>
                  <button type="button" onClick={readSample} disabled={!doc.sample} aria-label="Read the document again" title="Read again" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-40">
                    <RotateCw size={16} aria-hidden />
                  </button>
                  <button type="button" onClick={() => setZoom(true)} aria-label="Open document full size" title="Full size" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
                    <Maximize2 size={16} aria-hidden />
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="focus-ring cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium text-brand hover:bg-primary-subtle">
                    Replace
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    className="sr-only"
                    aria-label="Upload a supplier bill"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) replace(file);
                      event.target.value = "";
                    }}
                  />
                </>
              }
            />
            <div className="mt-5 flex justify-center bg-muted-bg px-6 py-7">
              <DocumentPreview doc={doc} />
            </div>
          </Card>
          {ai ? (
            <Notice tone="ai" icon={<Sparkles size={18} aria-hidden />} title="Check highlighted fields">
              {lowConfidence ? `${lowConfidence} of 9 fields have lower confidence. ` : "All fields are checked. "}Nothing is saved until you choose Save bill.
            </Notice>
          ) : (
            <Notice tone="neutral" icon={<CircleAlert size={18} aria-hidden />} title="Type the bill in yourself">
              Reading your own documents needs the AI service, which is not connected in this demo. Use Read again with the sample bill to see AI filling the fields.
            </Notice>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Card aria-labelledby="bill-details-title">
            <CardHeader title="Bill details" titleId="bill-details-title" />
            <div className="grid gap-x-4 gap-y-5 p-5 sm:grid-cols-2">
              <AiField confidence={ai ? 98 : null}>
                <TextField size="md" label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} suffix={ai && <Sparkles size={16} className="text-icon-ai" aria-hidden />} state={errors.supplier ? "error" : "default"} message={errors.supplier} />
              </AiField>
              <AiField confidence={ai ? 96 : null}>
                <TextField size="md" label="Supplier bill number" value={number} onChange={(e) => setNumber(e.target.value)} suffix={ai && <Sparkles size={16} className="text-icon-ai" aria-hidden />} state={errors.number ? "error" : "default"} message={errors.number} />
              </AiField>
              <AiField confidence={ai ? 95 : null}>
                <TextField size="md" type="date" label="Bill date" value={billDate} max={TODAY} onChange={(e) => setBillDate(e.target.value)} state={errors.billDate ? "error" : "default"} message={errors.billDate} />
              </AiField>
              <AiField confidence={ai && !dueChecked ? "check" : ai ? 100 : null}>
                <TextField
                  size="md"
                  type="date"
                  label="Due date"
                  value={due}
                  onChange={(e) => {
                    setDue(e.target.value);
                    setDueChecked(true);
                  }}
                  onBlur={() => setDueChecked(true)}
                  state={errors.due ? "error" : ai && !dueChecked ? "warning" : "default"}
                  message={errors.due ?? (ai && !dueChecked ? "Read as 02/11/2026. Day and month could be swapped." : undefined)}
                />
              </AiField>
              <div className="grid gap-x-4 gap-y-5 sm:col-span-2 sm:grid-cols-[1fr_1fr_160px]">
                <SelectField
                  label="Branch"
                  value={branch}
                  disabled={isManager}
                  onChange={(e) => setBranch(e.target.value)}
                  options={(isManager ? [user!.branch!] : BRANCH_NAMES).map((b) => ({ value: b, label: b }))}
                  message={isManager ? "Branch Managers record bills for their own branch." : ai ? <span className="text-ai-fg">Read from the document</span> : undefined}
                />
                <SelectField
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={CATEGORIES.filter((c) => c.kind === "expense" && c.active).map((c) => ({ value: c.name, label: c.name }))}
                  message={ai ? <span className="text-ai-fg">Suggested from the line items</span> : undefined}
                />
                <SelectField
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "KHR", label: "KHR" },
                  ]}
                  message={ai ? <span className="text-ai-fg">From “TOTAL USD”</span> : undefined}
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden" aria-labelledby="lines-title">
            <CardHeader
              title="Line items"
              titleId="lines-title"
              badge={ai && <AiBadge>Read from document</AiBadge>}
              divided
              actions={
                ai && lines.some((l) => !l.matched) ? (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2 text-xs font-medium text-warning-fg">
                    <CircleAlert size={12} aria-hidden /> {lines.filter((l) => !l.matched).length} line to check
                  </span>
                ) : undefined
              }
            />
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <caption className="sr-only">Bill line items</caption>
                <thead>
                  <tr className="h-11 border-b border-line bg-subtle text-xs font-medium text-muted">
                    <th scope="col" className="px-4 font-medium">Description</th>
                    <th scope="col" className="w-[110px] px-2 font-medium">Quantity</th>
                    <th scope="col" className="w-[130px] px-2 font-medium">Unit price</th>
                    <th scope="col" className="w-[130px] px-4 text-right font-medium">Amount ({currency})</th>
                    <th scope="col" className="w-10"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className={cn("border-b border-line-subtle", ai && !line.matched && "bg-warning-subtle")}>
                      <td className="px-4 py-2.5">
                        {ai ? (
                          <>
                            <p className="text-sm leading-5 font-medium text-fg">{line.description}</p>
                            <p className={cn("text-xs leading-4", line.matched ? "text-success-fg" : "text-warning-fg")}>{line.note}</p>
                          </>
                        ) : (
                          <input
                            aria-label="Line description"
                            value={line.description}
                            onChange={(e) => setLine(line.id, { description: e.target.value })}
                            placeholder="What was bought"
                            className="h-10 w-full rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <input aria-label={`Quantity for ${line.description || "line"}`} inputMode="numeric" value={line.qty} onChange={(e) => setLine(line.id, { qty: e.target.value.replace(/[^\d.]/g, "") })} className="tabular h-10 w-full rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                      </td>
                      <td className="px-2 py-2.5">
                        <input aria-label={`Unit price for ${line.description || "line"}`} inputMode="decimal" value={line.price} onChange={(e) => setLine(line.id, { price: e.target.value.replace(/[^\d.,]/g, "") })} className="tabular h-10 w-full rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-sm text-fg">{num((Number(line.qty) || 0) * (Number(line.price.replace(/,/g, "")) || 0), currency)}</td>
                      <td className="pr-2">
                        {!ai && lines.length > 1 && (
                          <button type="button" onClick={() => setLines((list) => list.filter((l) => l.id !== line.id))} aria-label={`Remove ${line.description || "line"}`} className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
                            <Trash2 size={15} aria-hidden />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4">
              <div className={cn("flex flex-col items-start gap-2", ai && "hidden")}>
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => setLines((list) => [...list, { id: `l-${Date.now()}`, description: "", note: "", matched: false, qty: "1", price: "" }])}>
                  Add line
                </Button>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-body">
                  <input type="checkbox" className="lf-check" checked={vat} onChange={(e) => setVat(e.target.checked)} />
                  Add VAT 10%
                </label>
                {errors.lines && <p className="text-[13px] text-error-fg">{errors.lines}</p>}
              </div>
              {ai && errors.lines && <p className="text-[13px] text-error-fg">{errors.lines}</p>}
              <dl className="ml-auto flex gap-8 text-right">
                <div>
                  <dt className="text-[13px] text-muted">Subtotal</dt>
                  <dd className="tabular text-[15px] text-fg">{money(subtotal, currency)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">VAT 10%</dt>
                  <dd className="tabular text-[15px] text-fg">{money(tax, currency)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Total</dt>
                  <dd className="tabular text-[15px] font-semibold text-fg">
                    {money(total, currency)} {currency}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {supplier.trim() && number.trim() && (
            duplicate ? (
              <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="Possible duplicate">
                {duplicate.id} from {duplicate.supplier} has {duplicate.supplierNo.toLowerCase() === number.trim().toLowerCase() ? `the same number ${duplicate.supplierNo}` : "the same total this month"}. It was dated {fmtDate(duplicate.billDate)}. Save only if this is a different bill.
              </Notice>
            ) : (
              <Notice tone="success" icon={<CircleCheck size={18} aria-hidden />} title="No duplicate found">
                No other bill from {supplier.trim()} has the number {number.trim()} or the same total this month.
              </Notice>
            )
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => router.push("/financial-records/bills")}>
              Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={saving !== null} onClick={() => save("draft")}>
                {saving === "draft" ? "Saving…" : "Save as draft"}
              </Button>
              <Button icon={Check} disabled={saving !== null} onClick={() => save("bill")}>
                {saving === "bill" ? "Saving…" : "Save bill"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={zoom} onClose={() => setZoom(false)} labelledBy="doc-zoom-title" width={720}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="doc-zoom-title" className="text-base font-semibold text-fg">
            {doc.name}
          </h2>
          <button type="button" onClick={() => setZoom(false)} aria-label="Close" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex justify-center bg-muted-bg p-6">
          <DocumentPreview doc={doc} large />
        </div>
      </Dialog>
    </Page>
  );
}

/** Wraps a field with the AI confidence chip shown at the right of its label. */
function AiField({ confidence, children }: { confidence: number | "check" | null; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {confidence !== null && (
        <span
          className={cn(
            "absolute top-0 right-0 inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-xs leading-4 font-medium",
            confidence === "check" ? "bg-error-subtle text-error-fg" : "bg-success-subtle text-success-fg",
          )}
        >
          {confidence === "check" ? <TriangleAlert size={12} aria-hidden /> : <CircleCheck size={12} aria-hidden />}
          {confidence === "check" ? "Check date" : confidence === 100 ? "Checked" : `${confidence}% confident`}
        </span>
      )}
    </div>
  );
}

/** The sample supplier bill from the Figma frame, rebuilt as HTML; or the uploaded file. */
function DocumentPreview({ doc, large }: { doc: { name: string; url: string | null; sample: boolean }; large?: boolean }) {
  if (!doc.sample) {
    return doc.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={doc.url} alt={`Uploaded bill ${doc.name}`} className={cn("max-w-full rounded-sm bg-white object-contain shadow-md", large ? "max-h-[70vh]" : "max-h-[400px]")} />
    ) : (
      <div className="flex h-[300px] w-[260px] flex-col items-center justify-center gap-3 rounded-sm bg-white text-center shadow-md">
        <FileText size={40} className="text-icon" aria-hidden />
        <p className="px-4 text-sm text-fg">{doc.name}</p>
        <p className="text-xs text-muted">PDF preview is not available in the demo</p>
      </div>
    );
  }
  return (
    <figure
      aria-label="Sample supplier bill CBC-118204 from Cambodia Beverage Co."
      className={cn("w-full origin-center -rotate-1 bg-white px-6 py-6 text-[#1f2937] shadow-md", large ? "max-w-[560px] text-[13px]" : "max-w-[380px] text-[11px]")}
    >
      <div className="flex justify-between gap-4">
        <div>
          <p className={cn("font-semibold tracking-wide", large ? "text-[15px]" : "text-[13px]")}>CAMBODIA BEVERAGE CO., LTD.</p>
          <p className="mt-1 leading-[15px] text-[#4b5563]">
            National Road 4, Por Sen
            <br />
            Chey, Phnom Penh
            <br />
            VAT TIN K004-901882144
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tracking-wider">TAX INVOICE</p>
          <p className="font-medium">No. CBC-118204</p>
        </div>
      </div>
      <hr className="my-3 border-[#d1d5db]" />
      <div className="flex justify-between">
        <p className="leading-[15px]">
          Sold to: Mekong Mart Co., Ltd.
          <br />
          <span className="text-[#4b5563]">Central Market branch</span>
        </p>
        <p className="text-right leading-[15px]">
          Date: 19/10/2026
          <br />
          Due: 02/11/2026
        </p>
      </div>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-[#f3f4f6] text-left text-[#4b5563]">
            <th className="py-1 pl-1 font-normal">Description</th>
            <th className="py-1 text-right font-normal">Qty</th>
            <th className="py-1 text-right font-normal">Price</th>
            <th className="py-1 pr-1 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Angkor Beer 330ml x24", "96", "11.20", "1,075.20"],
            ["Vital Water 500ml x12", "120", "2.10", "252.00"],
            ["Delivery", "1", "18.25", "18.25"],
          ].map(([d, q, p, a]) => (
            <tr key={d}>
              <td className="py-1 pl-1">{d}</td>
              <td className="py-1 text-right">{q}</td>
              <td className="py-1 text-right">{p}</td>
              <td className="py-1 pr-1 text-right">{a}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-3 border-[#d1d5db]" />
      <div className="ml-auto w-[60%] text-right leading-[17px]">
        <p className="flex justify-between">
          <span>Subtotal</span>1,345.45
        </p>
        <p className="flex justify-between">
          <span>VAT 10%</span>134.55
        </p>
        <p className="flex justify-between font-semibold">
          <span>TOTAL USD</span>1,480.00
        </p>
      </div>
      <p className="mt-4 text-[#4b5563]">Payment: ABA 000 771 302 · Thank you</p>
    </figure>
  );
}
