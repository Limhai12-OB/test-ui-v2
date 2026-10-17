"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Info, Plug, ShoppingCart, TrendingUp, Trophy } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Notice, Page } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { cn, downloadCsv, fmtDate, money, num } from "@/lib/format";
import { BRANCHES_4, type Adjustment, type BranchName, type Item, type SaleLine } from "@/lib/mock/ops-types";
import { branchLevel, plural, totalStock, useBranchScope, useOps } from "@/lib/ops-store";
import { AdjustButton, InventoryHeader, ItemTile } from "./inventory-shared";
import { fmtStamp, MOVE_KIND, MovesTable } from "./item-detail";

/** Frame 08.6 "Stock by Branch". */
export function StockByBranch() {
  const { state } = useOps();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [show, setShow] = useState<string | null>("low");
  const [sort, setSort] = useState<SortState>({ key: "item", dir: "asc" });
  const items = state.items.filter((i) => i.active);
  const rows = items
    .filter(
      (i) =>
        (!query || `${i.name} ${i.sku}`.toLowerCase().includes(query.toLowerCase())) &&
        (!category || i.category === category) &&
        (show !== "low" || BRANCHES_4.some((b) => ["low", "out"].includes(branchLevel(i, b) ?? ""))),
    )
    .sort((a, b) => a.name.localeCompare(b.name) * (sort.dir === "asc" ? 1 : -1));
  const summary = (b: BranchName) => {
    const low = items.filter((i) => branchLevel(i, b) === "low").length;
    const out = items.filter((i) => branchLevel(i, b) === "out").length;
    return out ? { label: `${out} out`, tone: "error" as const } : low ? { label: `${low} low`, tone: "warning" as const } : { label: "All in stock", tone: "success" as const };
  };
  const cell = (i: Item, b: BranchName) => {
    const level = branchLevel(i, b);
    if (!level) return <span className="text-muted">—</span>;
    return <span className={cn("tabular", level === "in" ? "text-fg" : level === "low" ? "text-warning-fg" : "text-error-fg")}>{i.stock[b]}</span>;
  };
  return (
    <Page>
      <InventoryHeader />
      <div className="mt-6 grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
        {BRANCHES_4.map((b) => {
          const s = summary(b);
          return (
            <button key={b} type="button" onClick={() => setShow(s.tone === "success" ? null : "low")} className="focus-ring flex cursor-pointer flex-col items-start gap-2 rounded-lg border border-line bg-surface p-5 text-left shadow-xs hover:border-line-strong">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                <Building2 size={18} className="text-icon" aria-hidden />
                {b}
              </span>
              <StatusPill tone={s.tone}>{s.label}</StatusPill>
            </button>
          );
        })}
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Stock by branch">
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("stock-by-branch.csv", [["Item", "SKU", "Minimum", ...BRANCHES_4, "Total"], ...rows.map((i) => [i.name, i.sku, i.min["Central Market"] ?? "", ...BRANCHES_4.map((b) => i.stock[b] ?? ""), totalStock(i)])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
          <FilterMenu label="Category" value={category} onChange={setCategory} options={[...new Set(items.map((i) => i.category))].sort().map((c) => ({ value: c, label: c }))} />
          <FilterMenu label="Show" value={show} onChange={setShow} width={240} options={[{ value: "low", label: "Low or out of stock" }]} />
          <span className="flex items-center gap-4 text-[13px] text-muted md:ml-auto">
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-warning" />Below minimum</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-error" />Out of stock</span>
          </span>
        </FilterBar>
        <DataTable
          caption="Stock by branch"
          rows={rows}
          rowKey={(i) => i.id}
          sort={sort}
          sortable={["item"]}
          onSort={setSort}
          minWidth={980}
          empty="No items match these filters."
          columns={[
            { key: "item", header: "Item", cell: (i) => (<div className="flex items-center gap-3"><ItemTile /><TwoLine title={<Link href={`/inventory/items/${i.id}`} className="hover:underline">{i.name}</Link>} titleClassName="font-normal" sub={i.sku} /></div>) },
            { key: "min", header: "Minimum", align: "right", width: "90px", cell: (i) => <span className="tabular text-muted">{i.min["Central Market"] ?? Object.values(i.min)[0]}</span> },
            ...BRANCHES_4.map((b) => ({ key: b, header: b, align: "right" as const, width: "130px", cell: (i: Item) => cell(i, b) })),
            { key: "total", header: "Total", align: "right", width: "90px", cell: (i) => <span className="tabular text-fg">{totalStock(i)}</span> },
            { key: "adjust", header: "Adjust", srHeader: true, width: "80px", cell: (i) => <span className="block text-right"><AdjustButton link label="Adjust" itemId={i.id} branch={BRANCHES_4.find((b) => ["low", "out"].includes(branchLevel(i, b) ?? ""))} /></span> },
          ]}
          mobileRow={(i) => <MobileRow leading={<ItemTile />} title={i.name} sub={BRANCHES_4.map((b) => `${b.split(" ")[0]} ${i.stock[b] ?? "—"}`).join(" · ")} value={<span className="tabular">{totalStock(i)}</span>} />}
        />
        <Pagination page={1} pageSize={10} total={rows.length} noun="items" onPage={() => {}} />
      </section>
    </Page>
  );
}

const SOURCE = { invoice: { label: "Invoice", tone: "info" as const }, "walk-in": { label: "Walk-in", tone: "sky" as const }, shopify: { label: "Shopify", tone: "success" as const } };

/** Frame 08.7 "Item Sales". */
export function ItemSales() {
  const { state } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<string | null>("oct");
  const [branch, setBranch] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(params.get("item"));
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const lines = state.saleLines.filter((l) => !scope || l.branch === scope);
  const itemOf = (id: string) => state.items.find((i) => i.id === id)!;
  const units = lines.reduce((s, l) => s + l.qty, 0);
  const revenue = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const byItem = Object.entries(lines.reduce<Record<string, { qty: number; rev: number }>>((acc, l) => ((acc[l.itemId] ??= { qty: 0, rev: 0 }), (acc[l.itemId].qty += l.qty), (acc[l.itemId].rev += l.qty * l.price), acc), {})).sort((a, b) => b[1].rev - a[1].rev);
  // The design names Angkor Beer as October's top item (reporting mock); fall back to the highest revenue.
  const top = byItem.find(([id]) => id === "angkor-beer") ?? byItem[0];
  const shopify = lines.filter((l) => l.source === "shopify").reduce((s, l) => s + l.qty * l.price, 0);

  const rows = useMemo(() => {
    const list = lines.filter(
      (l) =>
        (!query || `${itemOf(l.itemId).name} ${l.ref}`.toLowerCase().includes(query.toLowerCase())) &&
        (!range || (range === "oct" ? l.date.startsWith("2026-10") : l.date >= "2026-10-25")) &&
        (!branch || l.branch === branch) &&
        (!source || l.source === source) &&
        (!itemId || l.itemId === itemId),
    );
    return sort.dir === "desc" ? list : [...list].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, query, range, branch, source, itemId, sort]);
  const { current, slice } = paginate(rows, page, 8);
  const refHref = (l: SaleLine) => (l.ref.startsWith("INV-") ? `/sales/invoices/${l.ref}` : l.ref.startsWith("WS-") ? `/sales/walk-in?sale=${l.ref}` : undefined);

  return (
    <Page>
      <InventoryHeader actions={<Button icon={ShoppingCart} onClick={() => router.push("/sales/walk-in/new")}>New walk-in sale</Button>} />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Units sold · October" icon={<ShoppingCart size={16} aria-hidden />} value={units.toLocaleString("en-US")} lines={[<span key="d" className="flex items-center gap-2"><Delta value="7.1%" direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Item revenue · October" icon={<TrendingUp size={16} aria-hidden />} value={money(revenue)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value="11.6%" direction="up" tone="success" /> vs last month</span>]} />
        <StatCard label="Top item" icon={<Trophy size={16} aria-hidden />} value={top ? itemOf(top[0]).name.split(" ").slice(0, 2).join(" ") : "—"} lines={top ? [<span key="d" className="flex items-center gap-2"><Delta value="8.4%" direction="up" tone="success" /> {top[1].qty} {plural(itemOf(top[0]).unit)} · {money(top[1].rev)}</span>] : []} />
        <StatCard label="Online sales · Shopify" icon={<Plug size={16} aria-hidden />} value={money(shopify)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><Delta value="20.1%" direction="up" tone="success" /> vs last month</span>]} />
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Item sales">
        <FilterBar
          className="border-b border-line"
          onExport={() => downloadCsv("item-sales.csv", [["Date", "Item", "SKU", "Quantity", "Unit price (USD)", "Total (USD)", "Branch", "Source", "Reference"], ...rows.map((l) => [l.date, itemOf(l.itemId).name, itemOf(l.itemId).sku, l.qty, l.price, l.qty * l.price, l.branch, SOURCE[l.source].label, l.ref])])}
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search item or reference" />
          <FilterMenu label="Date" icon="calendar" value={range} onChange={setRange} options={[{ value: "oct", label: "1–31 Oct 2026" }, { value: "week", label: "Last 7 days" }]} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
          <FilterMenu label="Source" value={source} onChange={setSource} options={Object.entries(SOURCE).map(([value, s]) => ({ value, label: s.label }))} />
          <FilterMenu label="Item" value={itemId} onChange={setItemId} width={260} options={state.items.map((i) => ({ value: i.id, label: i.name }))} />
        </FilterBar>
        <DataTable
          caption="Item sales lines"
          rows={slice}
          rowKey={(l) => l.id}
          sort={sort}
          sortable={["date"]}
          onSort={setSort}
          minWidth={1000}
          empty="No sales lines match these filters."
          columns={[
            { key: "date", header: "Date", width: "120px", cell: (l) => <span className="whitespace-nowrap text-muted">{fmtDate(l.date)}</span> },
            { key: "item", header: "Item", cell: (l) => <TwoLine title={itemOf(l.itemId).name} titleClassName="font-normal" sub={itemOf(l.itemId).sku} /> },
            { key: "qty", header: "Quantity", align: "right", width: "90px", cell: (l) => <span className="tabular text-fg">{l.qty}</span> },
            { key: "price", header: "Unit price (USD)", align: "right", width: "130px", cell: (l) => <span className="tabular text-fg">{num(l.price)}</span> },
            { key: "total", header: "Total (USD)", align: "right", width: "110px", cell: (l) => <span className="tabular text-fg">{num(l.qty * l.price)}</span> },
            { key: "branch", header: "Branch", width: "140px", cell: (l) => <span className="text-fg">{l.branch}</span> },
            { key: "source", header: "Source", width: "110px", cell: (l) => <StatusPill tone={SOURCE[l.source].tone}>{SOURCE[l.source].label}</StatusPill> },
            { key: "ref", header: "Reference", width: "140px", cell: (l) => (refHref(l) ? <Link href={refHref(l)!} className="focus-ring rounded-xs text-brand hover:underline">{l.ref}</Link> : <span className="text-brand">{l.ref}</span>) },
          ]}
          mobileRow={(l) => <MobileRow title={itemOf(l.itemId).name} sub={`${fmtDate(l.date)} · ${l.ref}`} value={<span className="tabular">{num(l.qty * l.price)}</span>} valueSub={`${l.qty} × ${num(l.price)}`} />}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="sales lines" onPage={setPage} />
      </section>
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="Stock is reduced automatically">
        Every sale line lowers the stock of that item at the selling branch and adds a movement with its reference.
      </Notice>
    </Page>
  );
}

const ADJ = { increase: { label: "Increase", tone: "success" as const }, decrease: { label: "Decrease", tone: "warning" as const }, correction: { label: "Correction", tone: "info" as const } };

/** Frame 08.8 "Item Adjustments". */
export function Adjustments() {
  const { state } = useOps();
  const scope = useBranchScope();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string | null>("2026-10");
  const [branch, setBranch] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemOf = (id: string) => state.items.find((i) => i.id === id)!;
  const rows = state.adjustments.filter(
    (a) =>
      (!scope || a.branch === scope) &&
      (!query || `${itemOf(a.itemId).name} ${a.reason}`.toLowerCase().includes(query.toLowerCase())) &&
      (!month || a.at.startsWith(month)) &&
      (!branch || a.branch === branch) &&
      (!type || a.kind === type),
  );
  const { current, slice } = paginate(rows, page, 6);
  return (
    <Page>
      <InventoryHeader actions={<AdjustButton />} />
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Adjustments">
        <FilterBar className="border-b border-line" onExport={() => downloadCsv("adjustments.csv", [["Date and time", "Item", "Type", "Quantity", "Branch", "Reason", "Notes", "Adjusted by"], ...rows.map((a) => [a.at, itemOf(a.itemId).name, ADJ[a.kind].label, a.change, a.branch, a.reason, a.notes, a.by])])}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search item or reason" />
          <FilterMenu label="Date" icon="calendar" value={month} onChange={setMonth} options={[{ value: "2026-10", label: "October 2026" }]} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
          <FilterMenu label="Type" value={type} onChange={setType} options={Object.entries(ADJ).map(([value, a]) => ({ value, label: a.label }))} />
        </FilterBar>
        <DataTable
          caption="Stock adjustments"
          rows={slice}
          rowKey={(a) => a.id}
          minWidth={980}
          empty="No adjustments match these filters."
          columns={[
            { key: "at", header: "Date and time ↓", width: "170px", cell: (a) => <span className="whitespace-nowrap text-muted">{fmtStamp(a.at)}</span> },
            { key: "item", header: "Item", cell: (a) => <TwoLine title={itemOf(a.itemId).name} titleClassName="font-normal" sub={itemOf(a.itemId).sku} /> },
            { key: "type", header: "Type", width: "130px", cell: (a: Adjustment) => <StatusPill tone={ADJ[a.kind].tone}>{ADJ[a.kind].label}</StatusPill> },
            { key: "qty", header: "Quantity", align: "right", width: "90px", cell: (a) => <span className={cn("tabular", a.change > 0 ? "text-success-fg" : "text-fg")}>{a.change > 0 ? `+${a.change}` : `−${-a.change}`}</span> },
            { key: "branch", header: "Branch", width: "140px", cell: (a) => <span className="text-fg">{a.branch}</span> },
            { key: "reason", header: "Reason", cell: (a) => <TwoLine title={a.reason} titleClassName="font-normal" sub={a.notes || undefined} /> },
            { key: "by", header: "Adjusted by", width: "120px", cell: (a) => <span className="text-muted">{a.by}</span> },
          ]}
          mobileRow={(a) => <MobileRow title={itemOf(a.itemId).name} sub={`${fmtStamp(a.at)} · ${a.reason}`} value={<span className="tabular">{a.change > 0 ? `+${a.change}` : `−${-a.change}`}</span>} valueSub={a.branch} />}
        />
        <Pagination page={current} pageSize={6} total={rows.length} noun="adjustments" onPage={setPage} />
      </section>
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="Adjustments keep a full history">
        Each adjustment records who made it, when and why. Decreases above the branch limit notify the Business Owner.
      </Notice>
    </Page>
  );
}

/** Frame 08.9 "Stock Movement History". */
export function Movements() {
  const { state } = useOps();
  const scope = useBranchScope();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState<string | null>(params.get("item") ?? "angkor-beer");
  const [branch, setBranch] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>("2026-10");
  const [page, setPage] = useState(1);
  const rows = state.moves.filter(
    (m) =>
      (!scope || m.branch === scope) &&
      (!query || `${m.ref} ${m.refSub}`.toLowerCase().includes(query.toLowerCase())) &&
      (!itemId || m.itemId === itemId) &&
      (!branch || m.branch === branch) &&
      (!kind || m.kind === kind) &&
      (!month || m.at.startsWith(month)),
  );
  const { current, slice } = paginate(rows, page, 9);
  return (
    <Page>
      <InventoryHeader />
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Stock movements">
        <FilterBar className="border-b border-line" onExport={() => downloadCsv("stock-movements.csv", [["Date and time", "Item", "Movement", "Change", "Balance after", "Branch", "Reference or reason", "By"], ...rows.map((m) => [m.at, state.items.find((i) => i.id === m.itemId)?.name ?? "", MOVE_KIND[m.kind].label, m.change, m.balance, m.branch, m.ref, m.by])])}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search reference or reason" />
          <FilterMenu label="Item" value={itemId} onChange={(v) => (setItemId(v), setPage(1))} width={260} options={state.items.map((i) => ({ value: i.id, label: i.name }))} />
          {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
          <FilterMenu label="Movement" value={kind} onChange={setKind} options={Object.entries(MOVE_KIND).map(([value, k]) => ({ value, label: k.label }))} />
          <FilterMenu label="Date" icon="calendar" value={month} onChange={setMonth} options={[{ value: "2026-10", label: "October 2026" }]} />
        </FilterBar>
        <MovesTable moves={slice} showItem={!itemId} />
        <Pagination page={current} pageSize={9} total={rows.length} noun="movements" onPage={setPage} />
      </section>
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="Movements cannot be edited or deleted">
        To fix a mistake, add a correcting adjustment. This keeps stock history complete for audits.
      </Notice>
    </Page>
  );
}
