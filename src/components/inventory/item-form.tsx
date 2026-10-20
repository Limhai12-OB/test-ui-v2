"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MoneyInput, parseAmount, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/fields";
import { DetailList, Switch } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { cn, money, num } from "@/lib/format";
import { BRANCHES_4, type BranchName, type Item } from "@/lib/mock/ops-types";
import { moveStock, nowStamp, plural, totalStock, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { ItemTile } from "./inventory-shared";

type Row = { on: boolean; opening: string; min: string };

/** Frames 08.2 "Create Item" (with the SKU-already-used state) and 08.4 "Edit Item". */
export function ItemForm({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const existing = mode === "edit" ? state.items.find((i) => i.id === params.id) : undefined;
  if (mode === "edit" && !existing) notFound();

  const [name, setName] = useState(existing?.name ?? "");
  const [sku, setSku] = useState(existing?.sku ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [unit, setUnit] = useState(existing ? existing.unit[0].toUpperCase() + existing.unit.slice(1) : "");
  const [cost, setCost] = useState(existing ? num(existing.cost) : "");
  const [price, setPrice] = useState(existing ? num(existing.price) : "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [rows, setRows] = useState<Record<BranchName, Row>>(
    () =>
      Object.fromEntries(
        BRANCHES_4.map((b) => [
          b,
          existing
            ? { on: existing.stock[b] !== undefined, opening: "0", min: String(existing.min[b] ?? 0) }
            : { on: b === "Central Market" || b === "Toul Kork", opening: "0", min: "0" },
        ]),
      ) as Record<BranchName, Row>,
  );
  const [submitted, setSubmitted] = useState(false);

  if (scope) {
    return (
      <Page>
        <Notice tone="neutral" icon={null} title="Items are managed by the Business Owner">
          Ask Sokha Chan to add an item or change a price. <Link href="/inventory" className="text-brand underline">Back to items</Link>
        </Notice>
      </Page>
    );
  }

  const skuTaken = state.items.find((i) => i.sku.toLowerCase() === sku.trim().toLowerCase() && i.id !== existing?.id);
  const c = parseAmount(cost);
  const p = parseAmount(price);
  const marginPct = p ? ((p - c) / p) * 100 : null;
  const unitLower = (unit || "unit").toLowerCase();
  const stocked = BRANCHES_4.filter((b) => rows[b].on);
  const opening = stocked.reduce((s, b) => s + (Number(rows[b].opening) || 0), 0);
  const ready = name.trim() && sku.trim() && category && unit && p > 0 && !skuTaken && stocked.length > 0;
  const missing = !name.trim() || !sku.trim() || !category || !unit || !(p > 0);

  const save = (another: boolean) => {
    setSubmitted(true);
    if (!ready) return;
    const id = existing?.id ?? sku.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    update((draft) => {
      if (existing) {
        const target = draft.items.find((i) => i.id === existing.id)!;
        Object.assign(target, { name: name.trim(), sku: sku.trim(), category, unit: unitLower, cost: c, price: p, active });
        for (const b of BRANCHES_4) {
          if (rows[b].on) {
            if (target.stock[b] === undefined) target.stock[b] = 0;
            target.min[b] = Number(rows[b].min) || 0;
          } else if ((target.stock[b] ?? 0) === 0) {
            delete target.stock[b];
            delete target.min[b];
          }
        }
        return;
      }
      const item: Item = { id, name: name.trim(), sku: sku.trim(), category, unit: unitLower, cost: c, price: p, active: true, stock: {}, min: {}, created: "2026-10-31", createdBy: user!.name };
      draft.items.push(item);
      for (const b of stocked) {
        item.stock[b] = 0;
        item.min[b] = Number(rows[b].min) || 0;
        const qty = Number(rows[b].opening) || 0;
        if (qty) moveStock(draft, { at: nowStamp(), itemId: id, branch: b, kind: "initial", change: qty, ref: "Initial stock", refSub: "New item", by: user!.name });
      }
    });
    toast({ title: existing ? "Item updated" : "Item added", body: existing ? `${name.trim()} was saved. Price changes apply to new sales only.` : `${name.trim()} is stocked at ${stocked.length} branch${stocked.length === 1 ? "" : "es"}.` });
    if (another) {
      setName("");
      setSku("");
      setCost("");
      setPrice("");
      setSubmitted(false);
      setRows((r) => Object.fromEntries(BRANCHES_4.map((b) => [b, { ...r[b], opening: "0" }])) as Record<BranchName, Row>);
    } else router.push(`/inventory/items/${id}`);
  };

  const levelFor = (b: BranchName) => {
    if (!rows[b].on) return null;
    const qty = existing ? existing.stock[b] ?? 0 : Number(rows[b].opening) || 0;
    const min = Number(rows[b].min) || 0;
    if (!existing && !rows[b].opening && !rows[b].min) return null;
    if (!existing && qty === 0 && min === 0) return null;
    return qty === 0 ? "out" : qty < min ? "low" : "in";
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={existing ? [{ label: "Items & Inventory", href: "/inventory" }, { label: existing.name, href: `/inventory/items/${existing.id}` }, { label: "Edit" }] : [{ label: "Items & Inventory", href: "/inventory" }, { label: "Add item" }]}
        title={existing ? "Edit item" : "Add item"}
        subtitle={existing ? "Price changes apply to new sales only. Past records keep the price used at the time." : "Items are shared across the business. Choose which branches stock them."}
      />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Card aria-labelledby="item-details-title">
            <CardHeader title="Item details" titleId="item-details-title" />
            <div className="grid gap-x-4 gap-y-5 p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <TextField size="md" label="Item name" placeholder="e.g. Angkor Beer 330ml × 24" value={name} onChange={(e) => setName(e.target.value)} state={submitted && !name.trim() ? "error" : "default"} message={submitted && !name.trim() ? "Enter the item name." : undefined} />
              <TextField
                size="md"
                label="SKU"
                placeholder="e.g. BEV-ANG-330"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                state={skuTaken || (submitted && !sku.trim()) ? "error" : "default"}
                message={skuTaken ? `This SKU is already used by “${skuTaken.name}”.` : submitted && !sku.trim() ? "Enter a SKU." : "Must be unique."}
              />
              <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} state={submitted && !category ? "error" : "default"} message={submitted && !category ? "Choose a category." : undefined} options={[{ value: "", label: "Select a category", disabled: true }, ...state.categories.map((x) => ({ value: x, label: x }))]} />
              <SelectField label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} state={submitted && !unit ? "error" : "default"} message={submitted && !unit ? "Choose a unit." : undefined} options={[{ value: "", label: "e.g. piece, case, kg", disabled: true }, ...state.units.map((x) => ({ value: x, label: x }))]} />
            </div>
            <p className="-mt-1 px-5 pb-5 text-[13px] leading-5 text-muted">
              Missing a category or unit?{" "}
              <Link href="/inventory?view=categories" className="focus-ring rounded-xs font-medium text-brand hover:underline">
                Manage categories and units
              </Link>
            </p>
          </Card>
          <Card aria-labelledby="pricing-title">
            <CardHeader title="Pricing" titleId="pricing-title" subtitle="Prices are kept in USD, your default currency." />
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <MoneyInput id="item-cost" label="Cost price" currency="USD" value={cost} onChange={setCost} hint={c ? `≈ ${money(Math.round((c * 4100) / 100) * 100, "KHR")} at 4,100 KHR per USD` : undefined} />
              <MoneyInput id="item-price" label="Selling price" currency="USD" value={price} onChange={setPrice} error={submitted && !(p > 0) ? "Enter a selling price." : undefined} hint={p ? `≈ ${money(Math.round((p * 4100) / 100) * 100, "KHR")} at 4,100 KHR per USD` : undefined} />
              <div>
                <p className="mb-1.5 text-sm font-medium text-fg">Margin</p>
                <p
                  className={cn(
                    "flex h-10 items-center rounded-md border border-line px-3 text-sm",
                    marginPct === null ? "bg-muted-bg text-muted" : marginPct < 0 ? "bg-error-subtle text-error-fg" : "bg-success-subtle/60 text-success-fg",
                  )}
                  aria-live="polite"
                >
                  {marginPct === null ? "—" : `${marginPct.toFixed(1)}% · ${money(p - c)} per ${unitLower}`}
                </p>
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden" aria-labelledby="branches-title">
            <CardHeader title="Branches and stock" titleId="branches-title" subtitle={existing ? "Change stock with an adjustment so the history stays complete." : "Opening stock is posted to each branch as an “Initial stock” movement."} divided />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">Branches and stock</caption>
                <thead>
                  <tr className="h-11 border-b border-line bg-subtle text-xs font-medium text-muted">
                    <th scope="col" className="px-4 font-medium">Branch</th>
                    <th scope="col" className="px-4 font-medium">{existing ? "Current stock" : "Opening stock"}</th>
                    <th scope="col" className="px-4 font-medium">Minimum stock</th>
                    <th scope="col" className="px-4 font-medium">Stock status</th>
                  </tr>
                </thead>
                <tbody>
                  {BRANCHES_4.map((b) => {
                    const row = rows[b];
                    const level = levelFor(b);
                    const hasStock = (existing?.stock[b] ?? 0) > 0;
                    return (
                      <tr key={b} className="h-14 border-b border-line-subtle last:border-b-0">
                        <td className="px-4">
                          <label className={cn("flex items-center gap-3 text-sm", hasStock ? "cursor-not-allowed" : "cursor-pointer")} title={hasStock ? "This branch still has stock. Adjust it to 0 first." : undefined}>
                            <input type="checkbox" className="lf-check" checked={row.on} disabled={hasStock} onChange={(e) => setRows((r) => ({ ...r, [b]: { ...r[b], on: e.target.checked } }))} />
                            <span className="text-fg">{b}</span>
                          </label>
                        </td>
                        <td className="px-4">
                          {existing ? (
                            <span className="text-sm text-fg">{row.on ? `${existing.stock[b] ?? 0} ${plural(unitLower)}` : "—"}</span>
                          ) : (
                            <input aria-label={`Opening stock at ${b}`} inputMode="numeric" disabled={!row.on} value={row.opening} onChange={(e) => setRows((r) => ({ ...r, [b]: { ...r[b], opening: e.target.value.replace(/\D/g, "") } }))} className="h-10 w-[120px] rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:border-line disabled:bg-muted-bg disabled:text-muted" />
                          )}
                        </td>
                        <td className="px-4">
                          <input aria-label={`Minimum stock at ${b}`} inputMode="numeric" disabled={!row.on} value={row.min} onChange={(e) => setRows((r) => ({ ...r, [b]: { ...r[b], min: e.target.value.replace(/\D/g, "") } }))} className="h-10 w-[120px] rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:border-line disabled:bg-muted-bg disabled:text-muted" />
                        </td>
                        <td className="px-4">{level ? <StatusPill tone={level === "out" ? "error" : level === "low" ? "warning" : "success"}>{level === "out" ? "Out of Stock" : level === "low" ? "Low Stock" : "In Stock"}</StatusPill> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {existing && (
            <Card aria-labelledby="item-status-title">
              <CardHeader title="Item status" titleId="item-status-title" />
              <div className="flex items-center gap-4 p-5">
                <div className="flex-1">
                  <p className="text-[15px] text-fg">{active ? "Active" : "Inactive"}</p>
                  <p className="text-[13px] text-muted">Inactive items cannot be sold or invoiced. Their history and stock stay on record.</p>
                </div>
                <Switch label="Item active" checked={active} onChange={setActive} />
              </div>
            </Card>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => router.push(existing ? `/inventory/items/${existing.id}` : "/inventory")}>
              Cancel
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              {!existing && (
                <p className="text-[13px] text-muted">
                  {skuTaken ? "Change the SKU to add this item." : missing ? "Fill in the item details and prices to add the item." : stocked.length === 0 ? "Choose at least one branch." : ""}
                </p>
              )}
              {!existing && (
                <Button variant="secondary" onClick={() => save(true)} disabled={Boolean(skuTaken)}>
                  Add and start another
                </Button>
              )}
              <Button onClick={() => save(false)} disabled={Boolean(skuTaken)}>
                {existing ? "Save changes" : "Add item"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="preview-title">
            <CardHeader title="Preview" titleId="preview-title" />
            <div className="p-5">
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <ItemTile size={48} />
                <div className="min-w-0">
                  <p className={cn("truncate text-[15px] font-semibold", name ? "text-fg" : "text-body")}>{name || "Item name"}</p>
                  <p className="truncate text-xs text-muted">{[sku || "SKU", category || "Category"].join(" · ")}</p>
                </div>
              </div>
              <div className="pt-4">
                <DetailList
                  labelWidth={130}
                  items={[
                    ["Selling price", p ? `${money(p)} USD` : "—"],
                    ["Cost price", c ? `${money(c)} USD` : "—"],
                    ["Stocked at", `${stocked.length} branch${stocked.length === 1 ? "" : "es"}`],
                    existing ? ["Total stock", `${totalStock(existing)} ${plural(unitLower)}`] : ["Opening stock", opening ? `${opening} ${plural(unitLower)}` : "0"],
                  ]}
                />
              </div>
            </div>
          </Card>
          <Card aria-labelledby="side-title">
            <CardHeader title={existing ? "Need to change the stock?" : "Many items to add?"} titleId="side-title" />
            <div className="p-5 text-sm leading-[22px] text-muted">
              {existing ? "Stock is changed with an adjustment, so every change has a date, a person and a reason." : "Upload a spreadsheet and let AI map the columns for you to review."}
              <Link href={existing ? "/inventory/adjustments" : "/inventory/import"} className="focus-ring mt-3 flex w-fit items-center gap-1 rounded-xs font-medium text-brand hover:underline">
                {existing ? "Adjust stock" : "Import items"} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
