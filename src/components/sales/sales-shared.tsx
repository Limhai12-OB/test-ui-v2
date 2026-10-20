"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Plus, QrCode, ShoppingCart, Trash2 } from "lucide-react";
import { AiBadge } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { cn, fmtDate, money, num, type Currency } from "@/lib/format";
import { docTotal, lineTotal } from "@/lib/mock/ops-data";
import type { BranchName, Customer, DocLine } from "@/lib/mock/ops-types";
import { useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";

/** "Sales" header and tabs (section 09). */
export function SalesHeader({ actions }: { actions?: React.ReactNode }) {
  const scope = useBranchScope();
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Sales"
        subtitle={scope ? `Invoices issued by ${scope} Branch.` : "Walk-in sales, wholesale invoices and planned purchases."}
        actions={
          actions ?? (
            <>
              <Button variant="secondary" icon={Mic} onClick={() => router.push("/sales/invoices/voice")}>
                Voice to invoice
              </Button>
              <Button variant="secondary" icon={ShoppingCart} onClick={() => router.push("/sales/walk-in/new")}>
                New walk-in sale
              </Button>
              <Button icon={Plus} onClick={() => router.push("/sales/invoices/new")}>
                Create invoice
              </Button>
            </>
          )
        }
      />
    </>
  );
}

export const BUSINESS = {
  name: "Mekong Mart Co., Ltd.",
  address: "No. 86, Street 136, Daun Penh, Phnom Penh",
  contact: "+855 23 880 142 · finance@mekongmart.com.kh",
  bank: "ABA Bank · Mekong Mart Co., Ltd. · 000 482 148 21 (USD)",
};

/**
 * The paper invoice / planned purchase from frames 09.8, 09.9 and 09.14.
 * Rendered inside `.print-area` so Export → Print prints only the document.
 */
export function PaperDocument({
  kind,
  number,
  status,
  customer,
  dates,
  lines,
  currency,
  notes,
  paid,
  footer,
}: {
  kind: "invoice" | "planned";
  number: string;
  status: React.ReactNode;
  customer: Customer;
  dates: [string, string][];
  lines: DocLine[];
  currency: Currency;
  notes?: string;
  paid?: number;
  footer?: React.ReactNode;
}) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const total = docTotal(lines);
  const discount = Math.round((subtotal - total) * 100) / 100;
  return (
    <div className="rounded-lg bg-muted-bg/70 p-4 md:p-8">
      <article className="print-area mx-auto max-w-[680px] bg-white px-6 py-8 shadow-md md:px-10 md:py-10" aria-label={`${kind === "invoice" ? "Invoice" : "Planned purchase"} ${number}`}>
        <header className="flex flex-wrap justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-secondary-strong text-sm font-medium text-white">MM</span>
              <span className="text-lg font-semibold text-fg">{BUSINESS.name}</span>
            </div>
            <p className="mt-3 text-[13px] leading-[18px] text-body">
              {BUSINESS.address}
              <br />
              {BUSINESS.contact}
            </p>
          </div>
          <div className="text-right">
            <p className="text-overline text-brand">{kind === "invoice" ? "Invoice" : "Planned purchase"}</p>
            <p className="mt-1 text-[22px] font-semibold text-fg">{number}</p>
            <div className="mt-2 flex justify-end">{status}</div>
          </div>
        </header>
        <div className="mt-8 flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-[13px] text-muted">{kind === "invoice" ? "Bill to" : "Prepared for"}</p>
            <p className="mt-1 text-base font-semibold text-fg">{customer.name}</p>
            <p className="mt-1 text-[13px] leading-[18px] text-body">
              {customer.address}
              <br />
              {customer.contact} · {customer.phone}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-10 gap-y-1.5 text-[13px]">
            {dates.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <table className="mt-8 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong text-[13px] text-muted">
              <th scope="col" className="pb-2 font-normal">Item</th>
              <th scope="col" className="pb-2 text-right font-normal">Qty</th>
              <th scope="col" className="pb-2 text-right font-normal">Unit price</th>
              <th scope="col" className="pb-2 text-right font-normal">Amount ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line-subtle">
                <td className="py-3">
                  <p className="text-[15px] text-fg">{l.description}</p>
                  {l.sku && <p className="text-xs text-muted">{l.sku}</p>}
                  {l.discount > 0 && <p className="text-xs text-success-fg">{l.discount}% off</p>}
                </td>
                <td className="py-3 text-right text-fg">{l.qty}</td>
                <td className="py-3 text-right text-fg">{num(l.price, currency)}</td>
                <td className="py-3 text-right text-fg">{num(lineTotal(l), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-6 ml-auto grid max-w-[300px] grid-cols-[1fr_auto] gap-y-2 text-sm">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-right text-fg">{money(subtotal, currency)}</dd>
          <dt className="text-muted">Discount</dt>
          <dd className="text-right text-fg">{money(discount, currency)}</dd>
          <dt className="text-muted">Tax (none)</dt>
          <dd className="text-right text-fg">{money(0, currency)}</dd>
          <dt className="mt-2 border-t border-line-strong pt-3 font-semibold text-fg">{kind === "planned" ? "Estimated total" : paid ? "Total" : "Total due"}</dt>
          <dd className="mt-2 border-t border-line-strong pt-2 text-right text-xl font-semibold text-fg">
            {money(total, currency)} {currency}
          </dd>
          <dd className="col-span-2 text-right text-xs text-muted">{currency === "USD" ? `≈ ${money(Math.round((total * 4100) / 1000) * 1000, "KHR")} at 4,100 KHR per USD` : `≈ ${money(total / 4100)} at 4,100 KHR per USD`}</dd>
          {paid ? (
            <>
              <dt className="text-success-fg">Paid</dt>
              <dd className="text-right text-success-fg">{money(-paid, currency)}</dd>
              <dt className="font-semibold text-fg">Balance</dt>
              <dd className="text-right font-semibold text-fg">{money(Math.max(0, total - paid), currency)}</dd>
            </>
          ) : null}
        </dl>
        {notes && (
          <div className="mt-6">
            <p className="text-[13px] text-muted">Notes</p>
            <p className="mt-1 text-sm text-fg">{notes}</p>
          </div>
        )}
        <footer className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          {footer ?? (
            <>
              <div className="text-[13px] leading-[18px]">
                <p className="text-muted">Payment details</p>
                <p className="mt-1 text-body">
                  {BUSINESS.bank}
                  <br />
                  Please quote {number} with your payment.
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="inline-flex size-16 items-center justify-center rounded-md border border-line text-icon-strong">
                  <QrCode size={34} aria-hidden />
                </span>
                <span className="text-[11px] text-muted">KHQR</span>
              </div>
            </>
          )}
        </footer>
      </article>
    </div>
  );
}

/** Item lines table with quantity, price and discount inputs (invoice, planned purchase, voice draft). */
export function LineEditor({
  lines,
  onChange,
  branch,
  currency,
  stockNote = "after",
  aiFlags = false,
  title = "Items",
  action,
  errors,
}: {
  lines: DocLine[];
  onChange: (lines: DocLine[]) => void;
  branch: BranchName;
  currency: Currency;
  stockNote?: "after" | "at";
  aiFlags?: boolean;
  title?: string;
  action?: React.ReactNode;
  errors?: string;
}) {
  const { state } = useOps();
  const [adding, setAdding] = useState(false);
  const items = state.items.filter((i) => i.active && i.stock[branch] !== undefined);
  const set = (index: number, patch: Partial<DocLine>) => onChange(lines.map((l, i) => (i === index ? { ...l, ...patch, ai: patch.qty !== undefined || patch.price !== undefined ? false : l.ai } : l)));
  const short = lines.filter((l) => l.itemId).map((l) => ({ l, item: state.items.find((i) => i.id === l.itemId)! })).filter((x) => x.item);
  const input = "tabular h-10 w-full rounded-md border border-icon-subtle bg-surface px-3 text-sm font-normal text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  return (
    <Card className="overflow-hidden" aria-labelledby="lines-title">
      <CardHeader title={title} titleId="lines-title" actions={action} divided />
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Items</caption>
          <thead>
            <tr className="h-11 border-b border-line bg-subtle text-xs text-muted">
              <th scope="col" className="px-4 font-medium">Item</th>
              <th scope="col" className="w-[90px] px-2 font-medium">Quantity</th>
              <th scope="col" className="w-[120px] px-2 font-medium">Price ({currency})</th>
              <th scope="col" className="w-[90px] px-2 font-medium">Discount</th>
              <th scope="col" className="w-[120px] px-4 text-right font-medium">Amount ({currency})</th>
              <th scope="col" className="w-12"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const item = l.itemId ? state.items.find((x) => x.id === l.itemId) : undefined;
              const over = item && (item.stock[branch] ?? 0) < l.qty;
              return (
                <tr key={i} className="border-b border-line-subtle">
                  <td className="px-4 py-2.5">
                    <p className="flex items-center gap-2 text-[15px] text-fg">
                      {l.description}
                      {aiFlags && l.ai && <AiBadge>AI</AiBadge>}
                    </p>
                    {l.sku && <p className="text-xs text-muted">{l.sku}</p>}
                    {over && <p className="text-xs text-error-fg">Only {item.stock[branch]} in stock at {branch}</p>}
                  </td>
                  <td className="px-2 py-2.5">
                    <input aria-label={`Quantity of ${l.description}`} inputMode="numeric" value={l.qty || ""} onChange={(e) => set(i, { qty: Number(e.target.value.replace(/\D/g, "")) || 0 })} className={cn(input, over && "border-error")} />
                  </td>
                  <td className="px-2 py-2.5">
                    <input aria-label={`Price of ${l.description}`} inputMode="decimal" defaultValue={num(l.price, currency)} key={`${i}-${l.itemId}`} onBlur={(e) => set(i, { price: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} className={input} />
                  </td>
                  <td className="px-2 py-2.5">
                    <input aria-label={`Discount on ${l.description} in percent`} inputMode="numeric" value={`${l.discount}%`} onChange={(e) => set(i, { discount: Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0) })} className={input} />
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-sm font-normal text-fg">{num(lineTotal(l), currency)}</td>
                  <td className="pr-2">
                    <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label={`Remove ${l.description}`} className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        {adding ? (
          <select
            autoFocus
            aria-label="Item to add"
            defaultValue=""
            onBlur={() => setAdding(false)}
            onChange={(e) => {
              const item = items.find((x) => x.id === e.target.value);
              if (item) onChange([...lines, { itemId: item.id, description: item.name, sku: item.sku, qty: 1, price: currency === "KHR" ? item.price * 4100 : item.price, discount: 0 }]);
              setAdding(false);
            }}
            className="focus-ring h-10 cursor-pointer rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg"
          >
            <option value="" disabled>
              Choose an item…
            </option>
            {items.map((x) => (
              <option key={x.id} value={x.id} disabled={lines.some((l) => l.itemId === x.id)}>
                {x.name} · {x.stock[branch]} in stock
              </option>
            ))}
          </select>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
            <Plus size={16} aria-hidden /> Add line
          </button>
        )}
        {short.length > 0 && (
          <p className="text-[13px] text-muted">
            {stockNote === "after" ? `Stock left at ${branch} after this invoice: ` : `Stock at ${branch}: `}
            {short.map(({ l, item }) => `${item.name.replace(/ \d.*$/, "").replace("Phka ", "")} ${stockNote === "after" ? (item.stock[branch] ?? 0) - l.qty : item.stock[branch] ?? 0}`).join(" · ")}
          </p>
        )}
      </div>
      {errors && <p className="px-5 pb-3 text-[13px] text-error-fg">{errors}</p>}
    </Card>
  );
}

export function SummaryCard({ lines, currency, children, estimate = false }: { lines: DocLine[]; currency: Currency; children: React.ReactNode; estimate?: boolean }) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const total = docTotal(lines);
  return (
    <Card aria-labelledby="summary-title">
      <CardHeader title="Summary" titleId="summary-title" />
      <div className="p-5">
        <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-right text-fg">{money(subtotal, currency)}</dd>
          <dt className="text-muted">Discount</dt>
          <dd className="text-right text-fg">{money(subtotal - total, currency)}</dd>
          <dt className="text-muted">Tax</dt>
          <dd className="text-right text-fg">{money(0, currency)}</dd>
          <dt className="mt-2 border-t border-line pt-4 text-[15px] font-semibold text-fg">{estimate ? "Estimated total" : "Total"}</dt>
          <dd className="mt-2 border-t border-line pt-3 text-right">
            <span className="text-[28px] font-semibold text-fg">{money(total, currency)}</span> <span className="text-xs font-medium text-muted">{currency}</span>
          </dd>
          <dd className="col-span-2 text-right text-xs text-muted">{currency === "USD" ? `≈ ${money(Math.round((total * 4100) / 100) * 100, "KHR")} at 4,100 KHR per USD` : `≈ ${money(total / 4100)} at 4,100 KHR per USD`}</dd>
        </dl>
        <div className="mt-5 flex flex-col gap-3">{children}</div>
      </div>
    </Card>
  );
}

export function useNextNumber() {
  const { state } = useOps();
  return `INV-2026-${String(state.next.invoice).padStart(4, "0")}`;
}

export function useCustomer(id: string) {
  const { state } = useOps();
  return state.customers.find((c) => c.id === id);
}

export function useSalesPerson() {
  const { user } = useSession();
  return user?.name ?? "Sokha Chan";
}

export const fmt = fmtDate;
