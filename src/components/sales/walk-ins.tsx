"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2, Check, CreditCard, Info, Minus, Plus, Printer, QrCode, Receipt, ScanBarcode, Scale, Search, ShoppingCart, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/fields";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { Drawer, useToast } from "@/components/ui/overlay";
import { Page, PageHeader, ScopeNotice } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { accountName, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, fmtDate, money, num, TODAY, type Currency } from "@/lib/format";
import { BRANCHES_4, type BranchName, type PayMethod, type WalkInSale } from "@/lib/mock/ops-types";
import { moveStock, nowStamp, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { BUSINESS, SalesHeader } from "./sales-shared";

const usdOf = (s: WalkInSale) => (s.currency === "KHR" ? Math.round(s.total / 41) / 100 : s.total);
const listTotal = (s: WalkInSale) => s.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
const fmtTime = (at: string) => `${fmtDate(at.slice(0, 10))}, ${at.slice(11, 16)}`;

/** Frame 09.2 "Walk-in Sales" with a receipt drawer (`?sale=`). */
export function WalkIns() {
  const { state } = useOps();
  const finance = useFinance();
  const scope = useBranchScope();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<string | null>("today");
  const [method, setMethod] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemName = (id: string) => state.items.find((i) => i.id === id)?.name ?? id;
  const all = state.walkIns.filter((s) => !scope || s.branch === scope);
  const today = all.filter((s) => s.at.startsWith(TODAY));
  const todayTotal = today.reduce((sum, s) => sum + usdOf(s), 0);
  const khqr = today.length ? Math.round((today.filter((s) => s.method === "KHQR").length / today.length) * 100) : 0;
  const rows = useMemo(
    () =>
      all.filter(
        (s) =>
          (!query || `${s.id} ${s.lines.map((l) => itemName(l.itemId)).join(" ")}`.toLowerCase().includes(query.toLowerCase())) &&
          (!range || (range === "today" ? s.at.startsWith(TODAY) : s.at >= "2026-10-25")) &&
          (!method || s.method === method) &&
          (!account || s.accountId === account) &&
          (!branch || s.branch === branch),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, query, range, method, account, branch],
  );
  const { current, slice } = paginate(rows, page, 7);
  const openId = params.get("sale");
  const open = state.walkIns.find((s) => s.id === openId);
  const short = (name: string) => name.replace(/ \d+(ml|g|kg|L)\b.*$/, "").replace(/ × \d+$/, "").replace("Phka ", "");

  return (
    <Page>
      <SalesHeader />
      {scope && <ScopeNotice branch={scope} className="mt-6" />}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Walk-in sales today" icon={<ShoppingCart size={16} aria-hidden />} value={money(todayTotal)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-success-subtle px-1.5 text-xs font-medium text-success-fg">↗ 8.2%</span> vs last Saturday</span>]} />
        <StatCard label="Number of sales" icon={<Receipt size={16} aria-hidden />} value={String(today.length)} lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-success-subtle px-1.5 text-xs font-medium text-success-fg">↗ 3</span> more than last Saturday</span>]} />
        <StatCard label="Average sale" icon={<Scale size={16} aria-hidden />} value={money(today.length ? todayTotal / today.length : 0)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-success-subtle px-1.5 text-xs font-medium text-success-fg">↗ 1.1%</span> vs last Saturday</span>]} />
        <StatCard label="Paid by KHQR" icon={<QrCode size={16} aria-hidden />} value={`${khqr}%`} lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-muted-bg px-1.5 text-xs font-medium text-body">↗ 6.0</span> points vs last Saturday</span>]} />
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Walk-in sales">
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("walk-in-sales.csv", [["Date and time", "Sale", "Items", "Paid by", "Account", "Branch", "Total", "Currency"], ...rows.map((s) => [s.at, s.id, s.lines.map((l) => `${itemName(l.itemId)} ×${l.qty}`).join("; "), s.method, accountName(finance.state, s.accountId), s.branch, s.total, s.currency])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search sale number or item" />
          <FilterMenu label="Date" icon="calendar" value={range} onChange={setRange} options={[{ value: "today", label: "Today, 31 Oct" }, { value: "week", label: "Last 7 days" }]} />
          <FilterMenu label="Payment method" value={method} onChange={setMethod} options={["Cash", "KHQR", "Card"].map((m) => ({ value: m, label: m }))} />
          <FilterMenu label="Account" value={account} onChange={setAccount} width={240} options={[...new Set(all.map((s) => s.accountId))].map((id) => ({ value: id, label: accountName(finance.state, id) }))} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
        </FilterBar>
        <DataTable
          caption="Walk-in sales"
          rows={slice}
          rowKey={(s) => s.id}
          minWidth={980}
          onRowClick={(s) => router.replace(`/sales/walk-in?sale=${s.id}`, { scroll: false })}
          empty="No walk-in sales match these filters."
          columns={[
            { key: "at", header: "Date and time ↓", width: "170px", cell: (s) => <span className="whitespace-nowrap text-muted">{fmtTime(s.at)}</span> },
            { key: "id", header: "Sale", width: "140px", cell: (s) => <span className="text-brand">{s.id}</span> },
            { key: "items", header: "Items", cell: (s) => <span className="text-fg">{s.lines.map((l) => `${short(itemName(l.itemId))} ×${l.qty}`).join(", ")}</span> },
            { key: "paid", header: "Paid by", width: "200px", cell: (s) => <div><p className="text-fg">{s.method}</p><p className="text-xs text-muted">{accountName(finance.state, s.accountId).replace("Cash till · ", "Cash till · ")}</p></div> },
            { key: "branch", header: "Branch", width: "140px", cell: (s) => <span className="text-fg">{s.branch}</span> },
            { key: "total", header: "Total", align: "right", width: "130px", cell: (s) => <div><p className="tabular text-fg">{money(s.total, s.currency)}</p><p className="text-xs text-muted">{s.currency === "KHR" ? `KHR · ≈ ${money(usdOf(s))}` : "USD"}</p></div> },
          ]}
          mobileRow={(s) => <MobileRow title={s.id} sub={`${s.at.slice(11, 16)} · ${s.method} · ${s.branch}`} value={<span className="tabular">{money(s.total, s.currency)}</span>} valueSub={s.lines.length === 1 ? "1 item" : `${s.lines.length} items`} />}
        />
        <Pagination page={current} pageSize={7} total={rows.length} noun={range === "today" ? "sales today" : "sales"} onPage={setPage} />
      </section>
      <Drawer open={Boolean(open)} onClose={() => router.replace("/sales/walk-in", { scroll: false })} labelledBy="sale-title">
        {open && <ReceiptPanel sale={open} onClose={() => router.replace("/sales/walk-in", { scroll: false })} autoPrint={params.get("print") === "1"} />}
      </Drawer>
    </Page>
  );
}

function ReceiptPanel({ sale, onClose, autoPrint }: { sale: WalkInSale; onClose: () => void; autoPrint: boolean }) {
  const { state } = useOps();
  const finance = useFinance();
  useEffect(() => {
    if (autoPrint) setTimeout(() => window.print(), 300);
  }, [autoPrint]);
  const list = listTotal(sale);
  const totalUsd = usdOf(sale);
  return (
    <>
      <div className="flex items-start gap-3 border-b border-line px-6 py-5">
        <div className="min-w-0 flex-1">
          <h2 id="sale-title" className="text-xl font-semibold text-fg">
            {sale.id}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {fmtTime(sale.at)} · {sale.branch} · {sale.by}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close receipt" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted-bg/60 p-6">
        <article className="print-area mx-auto max-w-[340px] bg-white px-6 py-6 font-mono text-[13px] text-fg shadow-md">
          <p className="text-center font-sans font-semibold">{BUSINESS.name}</p>
          <p className="text-center font-sans text-xs text-muted">{sale.branch} · {fmtTime(sale.at)}</p>
          <p className="mt-1 text-center font-sans text-xs text-muted">{sale.id}</p>
          <hr className="my-3 border-dashed border-line-strong" />
          {sale.lines.map((l, i) => (
            <div key={i} className="mb-1.5">
              <p>{state.items.find((x) => x.id === l.itemId)?.name}</p>
              <p className="flex justify-between text-body">
                <span>
                  {l.qty} × {num(l.price)}
                </span>
                <span>{num(l.qty * l.price)}</span>
              </p>
              {l.discount > 0 && (
                <p className="flex justify-between text-success-fg">
                  <span>Discount</span>
                  <span>−{num(l.discount)}</span>
                </p>
              )}
            </div>
          ))}
          <hr className="my-3 border-dashed border-line-strong" />
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>{num(list)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Total {sale.currency}</span>
            <span>{money(sale.total, sale.currency)}</span>
          </p>
          {sale.currency === "KHR" && <p className="text-right text-xs text-muted">≈ {money(totalUsd)}</p>}
          <p className="mt-2 flex justify-between text-body">
            <span>Paid by</span>
            <span>{sale.method}</span>
          </p>
          <p className="text-right text-xs text-muted">{accountName(finance.state, sale.accountId)}</p>
          <hr className="my-3 border-dashed border-line-strong" />
          <p className="text-center font-sans text-xs text-muted">Thank you · Please come again</p>
        </article>
      </div>
      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button icon={Printer} onClick={() => window.print()}>
          Print receipt
        </Button>
      </div>
    </>
  );
}

type CartLine = { itemId: string; qty: number; price: number; discountPct: number };

const DEMO_CART: CartLine[] = [
  { itemId: "angkor-beer", qty: 2, price: 14.5, discountPct: 0 },
  { itemId: "vital-water", qty: 6, price: 3, discountPct: 0 },
  { itemId: "kampot-pepper", qty: 3, price: 5.5, discountPct: 10 },
];

/** Frame 09.3 "Create Walk-in Sale". */
export function NewWalkIn() {
  const { state, update } = useOps();
  const finance = useFinance();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const [branch, setBranch] = useState<BranchName>(scope ?? "Central Market");
  const [cart, setCart] = useState<CartLine[]>(scope ? [] : DEMO_CART);
  const [query, setQuery] = useState("");
  const [charge, setCharge] = useState<Currency>("USD");
  const [tax, setTax] = useState("none");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [cashCurrency, setCashCurrency] = useState<Currency>("USD");
  const [cash, setCash] = useState(scope ? "" : "70.00");
  const [error, setError] = useState<string>();
  const [scanOpen, setScanOpen] = useState(false);
  const [barcode, setBarcode] = useState("");

  const items = state.items.filter((i) => i.active && i.stock[branch] !== undefined);
  const matches = query ? items.filter((i) => `${i.name} ${i.sku}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  const accounts = finance.state.accounts.filter((a) => a.status === "active");
  const tillId = { "Central Market": "till-central-market", "Toul Kork": "till-toul-kork", "Siem Reap": "till-siem-reap", Battambang: "till-battambang" }[branch];
  const accountOptions =
    method === "Cash"
      ? accounts.filter((a) => a.id === tillId)
      : accounts.filter((a) => a.kind !== "till" && (scope ? a.branch === scope : true) && (method === "Card" ? a.currency === "USD" : true));
  const [accountId, setAccountId] = useState(tillId);
  const account = accountOptions.find((a) => a.id === accountId) ?? accountOptions[0];

  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = Math.round(cart.reduce((s, l) => s + l.qty * l.price * (l.discountPct / 100), 0) * 100) / 100;
  const taxAmount = tax === "vat" ? Math.round((subtotal - discount) * 10) / 100 : 0;
  const totalUsd = Math.round((subtotal - discount + taxAmount) * 100) / 100;
  const totalKhr = Math.round((totalUsd * 4100) / 100) * 100;
  const total = charge === "USD" ? totalUsd : totalKhr;
  const units = cart.reduce((s, l) => s + l.qty, 0);
  const cashUsd = cashCurrency === "USD" ? Number(cash.replace(/,/g, "")) || 0 : (Number(cash.replace(/,/g, "")) || 0) / 4100;
  const change = Math.round((cashUsd - totalUsd) * 100) / 100;

  const add = (itemId: string) => {
    const item = state.items.find((i) => i.id === itemId)!;
    setCart((c) => (c.some((l) => l.itemId === itemId) ? c.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + 1 } : l)) : [...c, { itemId, qty: 1, price: item.price, discountPct: 0 }]));
    setQuery("");
    setError(undefined);
  };
  const setQty = (itemId: string, qty: number) => setCart((c) => c.map((l) => (l.itemId === itemId ? { ...l, qty: Math.max(1, qty) } : l)));

  const complete = (print: boolean) => {
    if (!cart.length) return setError("Add at least one item.");
    const over = cart.find((l) => l.qty > (state.items.find((i) => i.id === l.itemId)?.stock[branch] ?? 0));
    if (over) return setError(`Only ${state.items.find((i) => i.id === over.itemId)?.stock[branch]} ${state.items.find((i) => i.id === over.itemId)?.name} left at ${branch}.`);
    if (method === "Cash" && change < -0.004) return setError("Cash received is less than the total.");
    if (!account) return setError("Choose where the money is paid into.");
    const id = `WS-2026-${String(state.next.walkIn).padStart(4, "0")}`;
    const at = nowStamp();
    const sale: WalkInSale = {
      id,
      at,
      lines: cart.map((l, i) => ({ itemId: l.itemId, qty: l.qty, price: l.price, discount: i === 0 ? discount : 0 })),
      method,
      accountId: account.id,
      branch,
      currency: charge,
      total,
      by: user!.name,
    };
    update((draft) => {
      draft.next.walkIn++;
      draft.walkIns.unshift(sale);
      for (const l of cart) {
        moveStock(draft, { at, itemId: l.itemId, branch, kind: "sale", change: -l.qty, ref: id, refSub: "Walk-in sale", by: user!.name });
        draft.saleLines.unshift({ id: `sl-${id}-${l.itemId}`, date: TODAY, itemId: l.itemId, qty: l.qty, price: l.price, branch, source: "walk-in", ref: id });
      }
    });
    finance.update((draft) => {
      const target = draft.accounts.find((a) => a.id === account.id);
      if (target) {
        if (target.kind === "till" && charge === "KHR") target.khrBalance = (target.khrBalance ?? 0) + totalKhr;
        else if (target.currency === "KHR" && target.kind !== "till") target.balance += totalKhr;
        else target.balance = Math.round((target.balance + totalUsd) * 100) / 100;
      }
      draft.transactions.unshift({
        id: `TXN-2026-10-${String(draft.nextIds.txn++).padStart(4, "0")}`,
        date: TODAY,
        description: `Walk-in sale ${id}`,
        type: "income",
        accountId: account.id,
        branch,
        category: "Sales",
        amount: charge === "USD" ? totalUsd : totalKhr,
        currency: charge,
        status: "posted",
        ref: id,
        method,
        recon: "unmatched",
        history: [{ kind: "status", title: "Recorded from walk-in sale", meta: `${user!.name} · 31 Oct 2026, ${at.slice(11, 16)}` }],
      });
    });
    toast({ title: "Sale completed", body: `${id} · ${money(total, charge)} paid by ${method}${method === "Cash" && change > 0 ? `. Change ${money(change)}` : ""}.` });
    router.push(`/sales/walk-in?sale=${id}${print ? "&print=1" : ""}`);
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Walk-in sales", href: "/sales/walk-in" }, { label: "New walk-in sale" }]}
        title="New walk-in sale"
        subtitle="Stock is reduced at the selected branch when you complete the sale."
        actions={
          <label className="flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface pr-1 pl-3 text-sm">
            <Building2 size={16} className="text-icon" aria-hidden />
            <span className="sr-only">Branch</span>
            <select
              value={branch}
              disabled={Boolean(scope)}
              onChange={(e) => {
                const b = e.target.value as BranchName;
                setBranch(b);
                setCart((c) => c.filter((l) => state.items.find((i) => i.id === l.itemId)?.stock[b] !== undefined));
                setAccountId({ "Central Market": "till-central-market", "Toul Kork": "till-toul-kork", "Siem Reap": "till-siem-reap", Battambang: "till-battambang" }[b]);
              }}
              className="h-full min-w-[160px] cursor-pointer bg-transparent pr-2 text-fg outline-none disabled:cursor-default"
            >
              {(scope ? [scope] : BRANCHES_4).map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
        }
      />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_384px]">
        <Card aria-labelledby="cart-title">
          <CardHeader
            title="Items"
            titleId="cart-title"
            divided
            actions={
              <button type="button" onClick={() => setScanOpen(true)} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline">
                <ScanBarcode size={18} aria-hidden /> Scan barcode
              </button>
            }
          />
          <div className="relative p-4">
            <label className="flex h-11 items-center gap-2 rounded-md border border-icon-subtle bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Search size={18} className="text-icon" aria-hidden />
              <span className="sr-only">Search item name or SKU to add</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && matches[0] && add(matches[0].id)}
                placeholder="Search item name or SKU to add"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-placeholder"
              />
            </label>
            {matches.length > 0 && (
              <ul role="listbox" aria-label="Matching items" className="absolute inset-x-4 top-[60px] z-20 rounded-lg border border-line bg-surface p-1.5 shadow-md">
                {matches.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => add(i.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted-bg focus-visible:bg-muted-bg focus-visible:outline-none">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-fg">{i.name}</span>
                        <span className="block text-xs text-muted">
                          {i.sku} · {i.stock[branch]} in stock
                        </span>
                      </span>
                      <span className="tabular text-sm">{money(i.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative overflow-x-auto rounded-b-lg border-t border-line">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <caption className="sr-only">Cart</caption>
              <thead>
                <tr className="h-11 border-b border-line bg-subtle text-xs text-muted">
                  <th scope="col" className="px-4 font-medium">Item</th>
                  <th scope="col" className="w-[130px] px-2 font-medium">Quantity</th>
                  <th scope="col" className="w-[100px] px-2 text-right font-medium">Price (USD)</th>
                  <th scope="col" className="w-[100px] px-2 text-center font-medium">Discount</th>
                  <th scope="col" className="w-[110px] px-4 text-right font-medium">Amount (USD)</th>
                  <th scope="col" className="w-12"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => {
                  const item = state.items.find((i) => i.id === l.itemId)!;
                  return (
                    <tr key={l.itemId} className="h-16 border-b border-line-subtle">
                      <td className="px-4">
                        <p className="text-[15px] text-fg">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.sku} · {item.stock[branch]} in stock
                        </p>
                      </td>
                      <td className="px-2">
                        <div className="inline-flex h-10 items-stretch overflow-hidden rounded-md border border-icon-subtle">
                          <button type="button" aria-label={`One less ${item.name}`} onClick={() => setQty(l.itemId, l.qty - 1)} className="w-9 cursor-pointer text-icon-strong hover:bg-muted-bg">
                            <Minus size={14} className="mx-auto" aria-hidden />
                          </button>
                          <input aria-label={`Quantity of ${item.name}`} inputMode="numeric" value={l.qty} onChange={(e) => setQty(l.itemId, Number(e.target.value.replace(/\D/g, "")) || 1)} className="w-11 border-x border-line bg-surface text-center text-sm outline-none" />
                          <button type="button" aria-label={`One more ${item.name}`} onClick={() => setQty(l.itemId, l.qty + 1)} className="w-9 cursor-pointer text-icon-strong hover:bg-muted-bg">
                            <Plus size={14} className="mx-auto" aria-hidden />
                          </button>
                        </div>
                      </td>
                      <td className="tabular px-2 text-right text-sm font-normal">{num(l.price)}</td>
                      <td className="px-2 text-center">
                        <Menu
                          width={150}
                          triggerLabel={`Discount on ${item.name}`}
                          triggerClassName={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium", l.discountPct ? "bg-success-subtle text-success-fg" : "text-muted hover:bg-muted-bg")}
                          trigger={l.discountPct ? `${l.discountPct}% off` : "—"}
                          items={[0, 5, 10, 15, 20].map((d) => ({ id: String(d), label: d ? `${d}% off` : "No discount", selected: d === l.discountPct, onSelect: () => setCart((c) => c.map((x) => (x.itemId === l.itemId ? { ...x, discountPct: d } : x))) }))}
                        />
                      </td>
                      <td className="tabular px-4 text-right text-sm font-normal">{num(l.qty * l.price * (1 - l.discountPct / 100))}</td>
                      <td className="pr-2">
                        <button type="button" onClick={() => setCart((c) => c.filter((x) => x.itemId !== l.itemId))} aria-label={`Remove ${item.name}`} className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted">
            <Info size={14} aria-hidden />
            {cart.length ? `${cart.length} item${cart.length === 1 ? "" : "s"} · ${units} unit${units === 1 ? "" : "s"}. Prices come from the item list and can be discounted per line.` : "Search for an item or scan a barcode to start."}
          </p>
        </Card>

        <Card aria-labelledby="payment-title">
          <CardHeader title="Payment" titleId="payment-title" />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg">Charge in</span>
              <div role="radiogroup" aria-label="Charge in" className="inline-flex gap-0.5 rounded-md bg-muted-bg p-[3px]">
                {(["USD", "KHR"] as const).map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={charge === c} onClick={() => setCharge(c)} className={cn("focus-ring inline-flex h-8 cursor-pointer items-center rounded-sm px-3 text-[13px] font-medium", charge === c ? "bg-surface text-fg shadow-xs" : "text-body")}>
                    {c === "USD" ? "$ USD" : <><span className="font-khmer">៛</span>&nbsp;KHR</>}
                  </button>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-[1fr_auto] items-center gap-y-2.5 text-sm">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-right text-fg">{money(subtotal)}</dd>
              <dt className="text-muted">Discount</dt>
              <dd className="text-right text-success-fg">{discount ? `−${money(discount)}` : money(0)}</dd>
              <dt className="text-muted">Tax</dt>
              <dd className="text-right">
                <select aria-label="Tax" value={tax} onChange={(e) => setTax(e.target.value)} className="focus-ring h-10 w-[130px] cursor-pointer rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg">
                  <option value="none">None</option>
                  <option value="vat">VAT 10%</option>
                </select>
              </dd>
            </dl>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[15px] font-semibold text-fg">Total</span>
              <span>
                <span className="text-[28px] font-semibold text-fg">{money(total, charge)}</span> <span className="text-xs font-medium text-muted">{charge}</span>
              </span>
            </div>
            <p className="-mt-3 text-right text-xs text-muted">{charge === "USD" ? `≈ ${money(totalKhr, "KHR")} at 4,100 KHR per USD` : `≈ ${money(totalUsd)} at 4,100 KHR per USD`}</p>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-fg">Payment method</legend>
              <div className="grid grid-cols-3 gap-2.5">
                {([["Cash", Banknote], ["KHQR", QrCode], ["Card", CreditCard]] as const).map(([m, Icon]) => (
                  <label key={m} className={cn("flex h-[70px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30", method === m ? "border-2 border-primary bg-primary-subtle/60 font-medium text-brand" : "border border-line text-fg hover:border-line-strong")}>
                    <input
                      type="radio"
                      name="pay-method"
                      className="sr-only"
                      checked={method === m}
                      onChange={() => {
                        setMethod(m);
                        setAccountId(m === "Cash" ? tillId : m === "KHQR" && charge === "KHR" ? "wing-merchant-khr" : "aba-business-usd");
                      }}
                    />
                    <Icon size={20} aria-hidden />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>
            <SelectField label="Paid into" icon={Wallet} value={account?.id ?? ""} onChange={(e) => setAccountId(e.target.value)} options={accountOptions.length ? accountOptions.map((a) => ({ value: a.id, label: a.name })) : [{ value: "", label: "No account available" }]} />
            {method === "Cash" && (
              <>
                <div className="flex flex-col">
                  <label htmlFor="cash-received" className="mb-1.5 text-sm font-medium text-fg">
                    Cash received
                  </label>
                  <div className="flex h-10 overflow-hidden rounded-md border border-icon-subtle focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                    <select aria-label="Cash currency" value={cashCurrency} onChange={(e) => setCashCurrency(e.target.value as Currency)} className="cursor-pointer border-r border-line bg-subtle px-3 text-[13px] font-medium text-fg outline-none">
                      <option>USD</option>
                      <option>KHR</option>
                    </select>
                    <input id="cash-received" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.,]/g, ""))} className="tabular min-w-0 flex-1 bg-surface px-3 text-right text-sm font-normal outline-none" />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{cashCurrency === "USD" ? `≈ ${money(Math.round((cashUsd * 4100) / 100) * 100, "KHR")} at 4,100 KHR per USD` : `≈ ${money(cashUsd)} at 4,100 KHR per USD`}</p>
                </div>
                <div className={cn("flex items-center justify-between rounded-md border px-3 py-2.5 text-sm", change < -0.004 ? "border-error/40 bg-error-subtle text-error-fg" : "border-line bg-subtle text-fg")} aria-live="polite">
                  <span>{change < -0.004 ? "Still to pay" : "Change to give back"}</span>
                  <span className="font-semibold">{money(Math.abs(change))}</span>
                </div>
              </>
            )}
            {error && <p role="alert" className="text-[13px] text-error-fg">{error}</p>}
            <Button size="lg" icon={Check} onClick={() => complete(false)} className="w-full">
              Complete sale · {money(total, charge)}
            </Button>
            <Button variant="secondary" icon={Printer} onClick={() => complete(true)} className="w-full">
              Complete and print receipt
            </Button>
            <button type="button" onClick={() => router.push("/sales/walk-in")} className="focus-ring mx-auto cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
              Cancel
            </button>
          </div>
        </Card>
      </div>
      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} labelledBy="scan-title" width={440}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const item = items.find((i) => i.sku.toLowerCase() === barcode.trim().toLowerCase());
            if (!item) return setError(`No item with code ${barcode.trim()} at ${branch}.`);
            add(item.id);
            setBarcode("");
            setScanOpen(false);
          }}
          className="p-6"
        >
          <h2 id="scan-title" className="text-xl font-semibold text-fg">
            Scan barcode
          </h2>
          <p className="mt-1 text-sm text-muted">Point a USB or Bluetooth scanner at the item, or type the SKU. Camera scanning needs the mobile app.</p>
          <input autoFocus aria-label="Barcode or SKU" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="e.g. BEV-ANG-330" className="mt-4 h-11 w-full rounded-md border border-icon-subtle px-3 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setScanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add item</Button>
          </div>
        </form>
      </Dialog>
    </Page>
  );
}
