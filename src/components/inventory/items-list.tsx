"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Boxes, Ellipsis, Info, Landmark, PackageX } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { cn, downloadCsv, money, num } from "@/lib/format";
import { BRANCHES_4, type BranchName, type Item } from "@/lib/mock/ops-types";
import { branchLevel, stockSummary, totalStock, useBranchScope, useOps } from "@/lib/ops-store";
import { AdjustButton, InventoryHeader, ItemTile, LevelPill } from "./inventory-shared";

const margin = (i: Item) => (i.price ? ((i.price - i.cost) / i.price) * 100 : 0);

/** Frame 08.1 "Items List" (owner) and "Items List — Branch Manager". */
export function ItemsList() {
  const { state, update } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "item", dir: "asc" });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const items = scope ? state.items.filter((i) => i.active && i.stock[scope] !== undefined) : state.items;
  const active = items.filter((i) => i.active);
  const levelAt = (i: Item, b: BranchName) => branchLevel(i, b);
  const branchesOf = (i: Item) => (scope ? [scope] : (Object.keys(i.stock) as BranchName[]));
  const lowItems = active.filter((i) => branchesOf(i).some((b) => levelAt(i, b) === "low"));
  const outPairs = active.flatMap((i) => branchesOf(i).filter((b) => levelAt(i, b) === "out").map((b) => `${i.name.split(" ").slice(0, 2).join(" ")} at ${b}`));
  const value = active.reduce((s, i) => s + i.cost * totalStock(i, scope), 0);

  const rows = useMemo(() => {
    const list = items.filter((i) => {
      if (query && !`${i.name} ${i.sku}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (category && i.category !== category) return false;
      if (branch && i.stock[branch as BranchName] === undefined) return false;
      const bs = branch ? [branch as BranchName] : branchesOf(i);
      if (level === "low" && !bs.some((b) => levelAt(i, b) === "low")) return false;
      if (level === "out" && !bs.some((b) => levelAt(i, b) === "out")) return false;
      if (level === "in" && bs.some((b) => levelAt(i, b) !== "in")) return false;
      if (status && (status === "active") !== i.active) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => (sort.key === "stock" ? (totalStock(a, scope) - totalStock(b, scope)) * dir : a.name.localeCompare(b.name) * dir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, category, branch, level, status, sort, scope]);
  const { current, slice } = paginate(rows, page, pageSize);

  const setActive = (ids: string[], value: boolean) => {
    update((draft) => draft.items.forEach((i) => ids.includes(i.id) && (i.active = value)));
    toast({ title: value ? "Items made active" : "Items made inactive", body: `${ids.length} item${ids.length === 1 ? "" : "s"} updated.` });
    setSelected([]);
  };

  const exportCsv = () =>
    downloadCsv("items.csv", [
      ["Item", "SKU", "Category", "Cost (USD)", "Price (USD)", scope ? `Stock at ${scope}` : "Total stock", "Status"],
      ...rows.map((i) => [i.name, i.sku, i.category, i.cost, i.price, totalStock(i, scope), i.active ? "Active" : "Inactive"]),
    ]);

  const columns = scope
    ? [
        { key: "item", header: "Item", cell: (i: Item) => <ItemCell item={i} sub={i.sku} /> },
        { key: "category", header: "Category", width: "150px", cell: (i: Item) => <span className="text-muted">{i.category}</span> },
        { key: "price", header: "Selling price (USD)", align: "right" as const, width: "150px", cell: (i: Item) => <span className="tabular text-fg">{num(i.price)}</span> },
        { key: "stock", header: "Stock here", align: "right" as const, width: "100px", cell: (i: Item) => <span className={cn("tabular", levelAt(i, scope) === "in" ? "text-fg" : levelAt(i, scope) === "out" ? "text-error-fg" : "text-warning-fg")}>{i.stock[scope]}</span> },
        { key: "min", header: "Minimum", align: "right" as const, width: "90px", cell: (i: Item) => <span className="tabular text-fg">{i.min[scope]}</span> },
        { key: "status", header: "Stock status", width: "150px", cell: (i: Item) => <LevelPill item={i} branch={scope} /> },
        { key: "adjust", header: "Adjust", srHeader: true, width: "80px", cell: (i: Item) => <span className="block text-right"><AdjustButton link label="Adjust" itemId={i.id} branch={scope} /></span> },
      ]
    : [
        {
          key: "select",
          header: (
            <input
              type="checkbox"
              className="lf-check"
              aria-label="Select all items on this page"
              checked={slice.length > 0 && slice.every((i) => selected.includes(i.id))}
              onChange={(e) => setSelected(e.target.checked ? slice.map((i) => i.id) : [])}
            />
          ),
          width: "48px",
          cell: (i: Item) => (
            <input type="checkbox" className="lf-check" aria-label={`Select ${i.name}`} checked={selected.includes(i.id)} onChange={() => setSelected((s) => (s.includes(i.id) ? s.filter((x) => x !== i.id) : [...s, i.id]))} />
          ),
        },
        { key: "item", header: "Item", cell: (i: Item) => <ItemCell item={i} sub={`${i.sku} · ${i.category}`} /> },
        { key: "cost", header: "Cost (USD)", align: "right" as const, width: "100px", cell: (i: Item) => <span className="tabular text-fg">{num(i.cost)}</span> },
        { key: "price", header: "Price (USD)", align: "right" as const, width: "100px", cell: (i: Item) => <span className="tabular text-fg">{num(i.price)}</span> },
        { key: "margin", header: "Margin", align: "right" as const, width: "80px", cell: (i: Item) => <span className="text-fg">{margin(i).toFixed(1)}%</span> },
        { key: "stock", header: "Total stock", align: "right" as const, width: "100px", cell: (i: Item) => <span className="tabular text-fg">{totalStock(i)}</span> },
        { key: "level", header: "Stock status", width: "170px", cell: (i: Item) => { const s = stockSummary(i); return s.tone === "neutral" ? <span className="text-muted">—</span> : <StatusPill tone={s.tone}>{s.label}</StatusPill>; } },
        { key: "status", header: "Status", width: "110px", cell: (i: Item) => <StatusPill tone={i.active ? "success" : "neutral"} className={i.active ? undefined : "border border-line-strong bg-surface"}>{i.active ? "Active" : "Inactive"}</StatusPill> },
        {
          key: "actions",
          header: "Actions",
          srHeader: true,
          width: "52px",
          cell: (i: Item) => (
            <Menu
              align="end"
              width={200}
              triggerLabel={`Actions for ${i.name}`}
              triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
              trigger={<Ellipsis size={16} aria-hidden />}
              items={[
                { id: "view", label: "View item", onSelect: () => router.push(`/inventory/items/${i.id}`) },
                { id: "edit", label: "Edit item", onSelect: () => router.push(`/inventory/items/${i.id}/edit`) },
                { id: "moves", label: "Movement history", onSelect: () => router.push(`/inventory/movements?item=${i.id}`) },
                { id: "toggle", label: i.active ? "Make inactive" : "Make active", onSelect: () => setActive([i.id], !i.active) },
              ]}
            />
          ),
        },
      ];

  return (
    <Page>
      <InventoryHeader />
      {scope && (
        <Notice tone="neutral" className="mt-6" icon={<Info size={18} aria-hidden />} title="Items are managed by the Business Owner">
          You can record sales and adjust stock for {scope}. Ask Sokha Chan to add an item or change a price.
        </Notice>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Active items" icon={<Box size={16} aria-hidden />} value={String(active.length)} lines={[scope ? `stocked at ${scope}` : `${items.length - active.length} inactive`]} />
        <StatCard label="Low stock" icon={<Boxes size={16} aria-hidden />} value={String(lowItems.length)} lines={[<span key="d" className="flex items-center gap-2"><Delta value="1" direction="up" tone="error" /> more than last week</span>]} />
        <StatCard label="Out of stock" icon={<PackageX size={16} aria-hidden />} value={String(outPairs.length)} lines={[outPairs.length ? outPairs.slice(0, 2).join(", ") : "Nothing is out of stock"]} />
        <StatCard label="Stock value at cost" icon={<Landmark size={16} aria-hidden />} value={money(value)} unit="USD" lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-muted-bg px-1.5 text-xs font-medium text-body">↗ 2.3%</span> vs last month</span>]} />
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:mt-6" aria-label="Items">
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-primary/20 bg-primary-subtle/60 px-4 py-3">
            <p className="text-sm font-medium text-brand">{selected.length} selected</p>
            <button type="button" onClick={() => setActive(selected, true)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">Make active</button>
            <button type="button" onClick={() => setActive(selected, false)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">Make inactive</button>
            <button type="button" onClick={() => setSelected([])} className="focus-ring ml-auto cursor-pointer rounded-xs text-sm text-body hover:underline">Clear selection</button>
          </div>
        ) : (
          <FilterBar className="border-b border-line" onExport={exportCsv}>
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
            <FilterMenu label="Category" value={category} onChange={setCategory} options={[...new Set(state.items.map((i) => i.category))].sort().map((c) => ({ value: c, label: c }))} />
            {!scope && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={BRANCHES_4.map((b) => ({ value: b, label: b }))} />}
            <FilterMenu
              label="Stock"
              value={level}
              onChange={setLevel}
              options={[
                { value: "in", label: "In stock" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Out of stock" },
              ]}
            />
            {!scope && (
              <FilterMenu
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            )}
          </FilterBar>
        )}
        <DataTable
          caption="Items"
          rows={slice}
          rowKey={(i) => i.id}
          sort={sort}
          sortable={["item", "stock"]}
          onSort={setSort}
          onRowClick={(i) => router.push(`/inventory/items/${i.id}`)}
          rowClassName={(i) => (!i.active ? "bg-subtle/70" : selected.includes(i.id) ? "bg-primary-subtle/40" : undefined)}
          minWidth={scope ? 860 : 1040}
          empty="No items match these filters."
          columns={columns}
          mobileRow={(i) => (
            <MobileRow
              leading={<ItemTile />}
              title={i.name}
              sub={`${i.sku} · ${scope ? stockSummary(i, scope).label : stockSummary(i).label}`}
              value={<span className="tabular">{totalStock(i, scope)}</span>}
              valueSub={`$${num(i.price)}`}
            />
          )}
        />
        <Pagination page={current} pageSize={pageSize} total={rows.length} noun="items" onPage={setPage} onPageSize={scope ? undefined : (s) => (setPageSize(s), setPage(1))} />
      </section>
    </Page>
  );
}

export function ItemCell({ item, sub }: { item: Item; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <ItemTile />
      <TwoLine title={item.name} sub={sub} titleClassName={item.active ? undefined : "text-body"} />
    </div>
  );
}
