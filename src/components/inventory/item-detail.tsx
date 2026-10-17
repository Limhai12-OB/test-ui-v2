"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { Boxes, Ellipsis, Lightbulb, Pencil, Percent, ShoppingCart, TrendingUp } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { Bar } from "@/components/ui/charts";
import { DataTable, MobileRow, TwoLine } from "@/components/ui/data-table";
import { DetailList, Segmented } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/overlay";
import { Page, PageHeader } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { cn, fmtDate, money } from "@/lib/format";
import type { BranchName, StockMove } from "@/lib/mock/ops-types";
import { branchLevel, plural, stockSummary, totalStock, useBranchScope, useOps } from "@/lib/ops-store";
import { AdjustButton } from "./inventory-shared";

export const MOVE_KIND = {
  sale: { label: "Sale", tone: "sky" as const },
  increase: { label: "Increase", tone: "success" as const },
  decrease: { label: "Decrease", tone: "warning" as const },
  correction: { label: "Correction", tone: "info" as const },
  initial: { label: "Initial stock", tone: "neutral" as const },
};

export const fmtStamp = (at: string) => `${fmtDate(at.slice(0, 10))}, ${at.slice(11, 16)}`;

/** Weekly units sold, W36–W43. October weeks come from the sales lines; earlier weeks are scaled. */
function weeklyUnits(lines: { date: string; qty: number }[], itemId: string) {
  const oct = [0, 0, 0, 0, 0];
  for (const l of lines) {
    const d = Number(l.date.slice(8, 10));
    oct[d <= 4 ? 0 : d <= 11 ? 1 : d <= 18 ? 2 : d <= 25 ? 3 : 4] += l.qty;
  }
  const weeks = [oct[0] + oct[1], oct[2], oct[3], oct[4]];
  const base = weeks.reduce((s, n) => s + n, 0) / 4;
  if (!base) return [0, 0, 0, 0, 0, 0, 0, 0];
  const seed = itemId.length;
  const earlier = [0.86, 0.92, 0.89, 1.01].map((f, i) => Math.round(base * (f + ((seed + i) % 3) * 0.01)));
  return [...earlier, ...weeks];
}

/** Frame 08.3 "Item Details". */
export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const [range, setRange] = useState<"8w" | "6m">("8w");
  const item = state.items.find((i) => i.id === id);
  if (!item) notFound();

  const branches = (scope ? [scope] : Object.keys(item.stock)) as BranchName[];
  const total = totalStock(item, scope);
  const sales = state.saleLines.filter((l) => l.itemId === id && (!scope || l.branch === scope));
  const sold = sales.reduce((s, l) => s + l.qty, 0);
  const revenue = sales.reduce((s, l) => s + l.qty * l.price, 0);
  const moves = state.moves.filter((m) => m.itemId === id && (!scope || m.branch === scope));
  const lastWeek = moves.filter((m) => m.at >= "2026-10-25").reduce((s, m) => s + m.change, 0);
  const unit = item.unit;
  const units = plural(unit);
  const weekly = weeklyUnits(sales, id);
  const sixMonths = [0.74, 0.81, 0.88, 0.9, 0.97, 1].map((f) => Math.round(sold * f));
  const bars = range === "8w" ? weekly : sixMonths;
  const barLabels = range === "8w" ? ["W36", "W37", "W38", "W39", "W40", "W41", "W42", "W43"] : ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const maxBar = Math.max(...bars, 1);
  const axisMax = Math.ceil(maxBar / 30) * 30 || 30;
  const summary = stockSummary(item, scope);
  // Insight: the branch most below its minimum, with a weekly sales rate.
  const weakest = branches.map((b) => ({ b, gap: (item.stock[b] ?? 0) - (item.min[b] ?? 0) })).sort((a, b) => a.gap - b.gap)[0];
  const branchWeekly = Math.max(1, Math.round(state.saleLines.filter((l) => l.itemId === id && l.branch === weakest?.b).reduce((s, l) => s + l.qty, 0) / 4.4 / 2));

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Items & Inventory", href: "/inventory" }, { label: item.name }]}
        title={item.name}
        badges={
          <>
            <StatusPill tone={item.active ? "success" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill>
            {summary.tone !== "success" && summary.tone !== "neutral" && <StatusPill tone={summary.tone}>{summary.label}</StatusPill>}
          </>
        }
        subtitle={`${item.sku} · ${item.category} · sold by the ${unit}`}
        actions={
          <>
            <AdjustButton variant="secondary" itemId={item.id} branch={scope ?? undefined} />
            {!scope && (
              <Button icon={Pencil} onClick={() => router.push(`/inventory/items/${id}/edit`)}>
                Edit item
              </Button>
            )}
            <Menu
              align="end"
              width={210}
              triggerLabel="More item actions"
              triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
              trigger={<Ellipsis size={18} aria-hidden />}
              items={[
                { id: "moves", label: "Movement history", onSelect: () => router.push(`/inventory/movements?item=${id}`) },
                { id: "sales", label: "Item sales", onSelect: () => router.push(`/inventory/sales?item=${id}`) },
                ...(scope
                  ? []
                  : [
                      {
                        id: "toggle",
                        label: item.active ? "Make inactive" : "Make active",
                        onSelect: () => {
                          update((d) => void (d.items.find((i) => i.id === id)!.active = !item.active));
                          toast({ title: item.active ? "Item made inactive" : "Item made active", body: item.name });
                        },
                      },
                    ]),
              ]}
            />
          </>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label={scope ? `Stock at ${scope}` : "Total stock"} icon={<Boxes size={16} aria-hidden />} value={String(total)} unit={`${units}`} lines={[<span key="d" className="flex items-center gap-2"><span className="inline-flex h-[22px] items-center rounded-sm bg-muted-bg px-1.5 text-xs font-medium text-body">{lastWeek <= 0 ? "↘" : "↗"} {Math.abs(lastWeek)}</span> {units} vs last week</span>]} />
        <StatCard label="Sold in October" icon={<ShoppingCart size={16} aria-hidden />} value={String(sold)} unit={`${units}`} lines={[sold ? <span key="d" className="flex items-center gap-2"><Delta value="8.4%" direction="up" tone="success" /> vs last month</span> : "No sales yet"]} />
        <StatCard label="Revenue · October" icon={<TrendingUp size={16} aria-hidden />} value={money(revenue)} unit="USD" lines={[sold ? <span key="d" className="flex items-center gap-2"><Delta value="8.4%" direction="up" tone="success" /> vs last month</span> : "No sales yet"]} />
        <StatCard label="Margin" icon={<Percent size={16} aria-hidden />} value={`${(((item.price - item.cost) / item.price) * 100).toFixed(1)}%`} lines={[`${money(item.price - item.cost)} per ${unit}`]} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Card aria-labelledby="by-branch-title">
            <CardHeader title={scope ? "Stock here" : "Stock by branch"} titleId="by-branch-title" subtitle={`Minimum stock is ${item.min[branches[0]] ?? 0} ${units} per branch`} actions={!scope && <CardLink href="/inventory/stock">Open stock by branch</CardLink>} />
            <ul className="flex flex-col gap-3.5 p-5">
              {branches.map((b) => {
                const qty = item.stock[b] ?? 0;
                const level = branchLevel(item, b);
                const scaleMax = Math.max(...branches.map((x) => item.stock[x] ?? 0), item.min[b] ?? 0) * 1.12 || 1;
                return (
                  <li key={b} className="grid grid-cols-[110px_minmax(0,1fr)_80px_110px] items-center gap-3 text-sm max-sm:grid-cols-[minmax(0,1fr)_80px_110px]">
                    <span className="text-fg">{b}</span>
                    <Bar className="max-sm:hidden" value={(qty / scaleMax) * 100} color={level === "in" ? "var(--lf-primary-default)" : level === "low" ? "var(--lf-warning-default)" : "var(--lf-error-default)"} />
                    <span className={cn("text-right", level === "in" ? "text-fg" : level === "low" ? "text-warning-fg" : "text-error-fg")}>{qty} {units}</span>
                    <StatusPill tone={level === "out" ? "error" : level === "low" ? "warning" : "success"}>{level === "out" ? "Out of Stock" : level === "low" ? "Low Stock" : "In Stock"}</StatusPill>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card aria-labelledby="units-title">
            <CardHeader
              title={range === "8w" ? "Units sold per week" : "Units sold per month"}
              titleId="units-title"
              subtitle={`${range === "8w" ? "Last 8 weeks" : "Last 6 months"} · ${scope ?? "all branches"} · ${units}`}
              actions={<Segmented label="Range" value={range} onChange={setRange} options={[{ value: "8w", label: "8 weeks" }, { value: "6m", label: "6 months" }]} />}
            />
            <figure className="px-5 pt-5 pb-4" aria-label={`Units sold: ${bars.join(", ")}`}>
              <div className="relative ml-8 h-[180px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="absolute inset-x-0" style={{ top: `${(i / 4) * 100}%` }}>
                    <span className={cn("absolute inset-x-0 h-px", i === 4 ? "bg-chart-axis" : "bg-chart-grid")} />
                    <span className="absolute -top-[7px] -left-8 w-6 text-right text-[11px] text-muted">{Math.round(axisMax - (axisMax / 4) * i)}</span>
                  </div>
                ))}
                <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
                  {bars.map((v, i) => (
                    <div key={barLabels[i]} className="flex h-full w-full max-w-11 flex-col justify-end">
                      <div className="rounded-t-[4px] bg-primary" style={{ height: `${(v / axisMax) * 100}%` }} title={`${barLabels[i]}: ${v}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="ml-8 flex justify-around gap-2 px-2 pt-2">
                {barLabels.map((l) => (
                  <span key={l} className="w-full max-w-11 text-center text-[11px] text-muted">
                    {l}
                  </span>
                ))}
              </div>
            </figure>
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card aria-labelledby="item-details-title">
            <CardHeader title="Details" titleId="item-details-title" />
            <div className="p-5">
              <DetailList
                labelWidth={130}
                items={[
                  ["SKU", item.sku],
                  ["Category", item.category],
                  ["Cost price", `${money(item.cost)} USD`],
                  ["Selling price", `${money(item.price)} USD`],
                  ["Minimum stock", `${item.min[branches[0]] ?? 0} ${units} per branch`],
                  ["Branches", Object.keys(item.stock).length === 4 ? "All 4 active branches" : `${Object.keys(item.stock).length} of 4 branches`],
                  ["Created", fmtDate(item.created)],
                  ["Created by", item.createdBy],
                ]}
              />
            </div>
          </Card>
          {weakest && weakest.gap < 0 && (
            <section className="rounded-lg border border-line bg-surface p-5 shadow-xs" aria-label="AI insight">
              <div className="flex gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-ai-subtle text-icon-ai">
                  <Lightbulb size={18} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-fg">Restock {weakest.b} by Monday</p>
                  <p className="mt-1 text-sm leading-[22px] text-body">
                    {weakest.b} sells about {branchWeekly} {units} a week and has {item.stock[weakest.b]} left, below the minimum of {item.min[weakest.b]}.
                  </p>
                  <p className="mt-1 text-xs text-muted">Based on 8 weeks of sales</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs font-medium text-ai-fg">✦ AI insight</span>
                <Link href={`/inventory/sales?item=${id}`} className="focus-ring rounded-xs text-sm font-medium text-brand hover:underline">
                  View sales
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden md:mt-6" aria-labelledby="latest-moves-title">
        <CardHeader title="Latest stock movements" titleId="latest-moves-title" divided actions={<CardLink href={`/inventory/movements?item=${id}`}>View all movements</CardLink>} />
        <MovesTable moves={moves.slice(0, 4)} showItem={false} />
      </Card>
    </Page>
  );
}

export function MovesTable({ moves, showItem = true }: { moves: StockMove[]; showItem?: boolean }) {
  const { state } = useOps();
  const router = useRouter();
  return (
    <DataTable
      caption="Stock movements"
      rows={moves}
      rowKey={(m) => m.id}
      minWidth={showItem ? 1000 : 900}
      empty="No movements match these filters."
      onRowClick={(m) => (m.ref.startsWith("INV-") ? router.push(`/sales/invoices/${m.ref}`) : m.ref.startsWith("WS-") ? router.push(`/sales/walk-in?sale=${m.ref}`) : undefined)}
      columns={[
        { key: "at", header: "Date and time", width: "170px", cell: (m) => <span className="whitespace-nowrap text-muted">{fmtStamp(m.at)}</span> },
        ...(showItem ? [{ key: "item", header: "Item", cell: (m: StockMove) => { const it = state.items.find((i) => i.id === m.itemId); return <TwoLine title={it?.name} titleClassName="font-normal" sub={it?.sku} />; } }] : []),
        { key: "kind", header: "Movement", width: "130px", cell: (m) => <StatusPill tone={MOVE_KIND[m.kind].tone}>{MOVE_KIND[m.kind].label}</StatusPill> },
        { key: "change", header: "Change", align: "right", width: "80px", cell: (m) => <span className={cn("tabular", m.change > 0 ? "text-success-fg" : "text-fg")}>{m.change > 0 ? `+${m.change}` : `−${-m.change}`}</span> },
        { key: "balance", header: "Balance after", align: "right", width: "110px", cell: (m) => <span className="tabular text-fg">{m.balance}</span> },
        { key: "branch", header: "Branch", width: "140px", cell: (m) => <span className="text-fg">{m.branch}</span> },
        { key: "ref", header: "Reference or reason", cell: (m) => <TwoLine title={m.ref} titleClassName="font-normal" sub={m.refSub} /> },
        { key: "by", header: "By", width: "120px", cell: (m) => <span className="text-muted">{m.by}</span> },
      ]}
      mobileRow={(m) => <MobileRow title={m.ref} sub={`${fmtStamp(m.at)} · ${m.branch}`} value={<span className="tabular">{m.change > 0 ? `+${m.change}` : `−${-m.change}`}</span>} valueSub={`Balance ${m.balance}`} />}
    />
  );
}
