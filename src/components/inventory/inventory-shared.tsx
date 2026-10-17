"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CloudUpload, Minus, Package, Plus, ShoppingCart, SlidersHorizontal, Equal } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextAreaField } from "@/components/ui/fields";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { LinkTabs, PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/format";
import { BRANCHES_4, type BranchName, type Item } from "@/lib/mock/ops-types";
import { branchLevel, moveStock, nowStamp, plural, unitLabel, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";

export function ItemTile({ size = 36 }: { size?: 36 | 48 }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-muted-bg text-icon-strong", size === 48 ? "size-12" : "size-9")}>
      <Package size={size === 48 ? 22 : 18} />
    </span>
  );
}

/** Header and tab bar for Items & Inventory (section 08). `actions` overrides the default buttons. */
export function InventoryHeader({ actions }: { actions?: React.ReactNode }) {
  const { state } = useOps();
  const scope = useBranchScope();
  const router = useRouter();
  const count = state.items.filter((i) => (scope ? i.active && i.stock[scope] !== undefined : true)).length;
  return (
    <>
      <PageHeader
        title="Items & Inventory"
        subtitle={scope ? `Items assigned to ${scope} Branch and their stock here.` : "Your item list and stock levels in every branch."}
        actions={
          actions ??
          (scope ? (
            <>
              <AdjustButton variant="secondary" />
              <Button icon={ShoppingCart} onClick={() => router.push("/sales/walk-in/new")}>
                New walk-in sale
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={CloudUpload} onClick={() => router.push("/inventory/import")}>
                Import items
              </Button>
              <Button icon={Plus} onClick={() => router.push("/inventory/new")}>
                Add item
              </Button>
            </>
          ))
        }
      />
      <LinkTabs
        className="mt-6"
        items={[
          { href: "/inventory", label: "Items", count, exact: true },
          ...(scope ? [] : [{ href: "/inventory/stock", label: "Stock by branch" }]),
          { href: "/inventory/sales", label: "Item sales" },
          { href: "/inventory/adjustments", label: "Adjustments" },
          { href: "/inventory/movements", label: "Movement history" },
        ]}
      />
    </>
  );
}

/** "Adjust stock" button that opens the dialog (optionally preset to an item and branch). */
export function AdjustButton({ variant = "primary", itemId, branch, label = "Adjust stock", link }: { variant?: "primary" | "secondary"; itemId?: string; branch?: BranchName; label?: string; link?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {link ? (
        <button type="button" onClick={() => setOpen(true)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
          {label}
        </button>
      ) : (
        <Button variant={variant} icon={SlidersHorizontal} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="adjust-title" width={560}>
        {open && <AdjustForm itemId={itemId} branch={branch} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

const REASONS = {
  increase: ["Supplier bonus stock", "Returned by customer", "Found during count", "Other"],
  decrease: ["Damaged in delivery", "Expired", "Broken or torn", "Theft or loss", "Used in the shop", "Other"],
  correction: ["Stock count", "Other"],
};

/** Frame 08.8 "Adjust stock". */
function AdjustForm({ itemId, branch, onClose }: { itemId?: string; branch?: BranchName; onClose: () => void }) {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const toast = useToast();
  const branches = scope ? [scope] : [...BRANCHES_4];
  const [branchName, setBranch] = useState<BranchName>(scope ?? branch ?? "Toul Kork");
  const items = state.items.filter((i) => i.stock[branchName] !== undefined);
  const [id, setId] = useState(itemId ?? items[0]?.id ?? "");
  const [kind, setKind] = useState<"increase" | "decrease" | "correction">("correction");
  const [qty, setQty] = useState(itemId || branch ? "" : "17");
  const [reason, setReason] = useState(REASONS.correction[0]);
  const [notes, setNotes] = useState(itemId || branch ? "" : "Evening count on 31 Oct: 17 cases on the shelf, 18 on record.");
  const [error, setError] = useState<string>();
  const item = state.items.find((i) => i.id === id) as Item | undefined;
  const current = item?.stock[branchName] ?? 0;
  const n = Number(qty);
  const after = qty === "" || Number.isNaN(n) ? null : kind === "increase" ? current + n : kind === "decrease" ? current - n : n;
  const min = item?.min[branchName] ?? 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return setError("Choose an item.");
    if (qty === "" || !Number.isInteger(n) || n < 0 || (kind !== "correction" && n === 0)) return setError(kind === "correction" ? "Enter the counted quantity." : "Enter how many to add or remove.");
    if (after! < 0) return setError(`Only ${unitLabel(item, current)} at ${branchName}.`);
    if (after === current) return setError("The counted quantity is the same as the record. Nothing to change.");
    const change = after! - current;
    const fullReason = kind === "correction" && reason === "Stock count" ? `Stock count found ${after}, not ${current}` : reason;
    update((draft) => {
      const at = nowStamp();
      draft.adjustments.unshift({ id: `adj-${Date.now()}`, at, itemId: item.id, branch: branchName, kind, change, reason: fullReason, notes, by: user!.name });
      moveStock(draft, { at, itemId: item.id, branch: branchName, kind, change, ref: fullReason, refSub: "Stock adjustment", by: user!.name });
    });
    toast({ title: "Stock adjusted", body: `${item.name} at ${branchName}: ${current} → ${unitLabel(item, after!)}.` });
    onClose();
  };

  const types = [
    { id: "increase" as const, label: "Increase", sub: "Add stock", icon: <Plus size={16} aria-hidden /> },
    { id: "decrease" as const, label: "Decrease", sub: "Remove stock", icon: <Minus size={16} aria-hidden /> },
    { id: "correction" as const, label: "Correction", sub: "Set to counted quantity", icon: <Equal size={16} aria-hidden /> },
  ];

  return (
    <form onSubmit={submit} noValidate>
      <ModalHeader id="adjust-title" title="Adjust stock" description="For damage, loss, expiry or a stock-count correction." icon={<SlidersHorizontal size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Branch"
            icon={Building2}
            value={branchName}
            disabled={Boolean(scope)}
            onChange={(e) => {
              const b = e.target.value as BranchName;
              setBranch(b);
              if (state.items.find((i) => i.id === id)?.stock[b] === undefined) setId(state.items.find((i) => i.stock[b] !== undefined)?.id ?? "");
            }}
            options={branches.map((b) => ({ value: b, label: b }))}
          />
          <SelectField label="Item" icon={Package} value={id} onChange={(e) => setId(e.target.value)} options={items.map((i) => ({ value: i.id, label: i.name }))} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Adjustment type</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {types.map((t) => (
              <label
                key={t.id}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-[10px] px-3 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                  kind === t.id ? "border-2 border-primary bg-primary-subtle/60 px-[11px] py-[11px]" : "border border-line hover:border-line-strong",
                )}
              >
                <span className={cn("flex items-center gap-2 text-sm font-medium", kind === t.id ? "text-brand" : "text-fg")}>
                  <input
                    type="radio"
                    name="adjust-type"
                    checked={kind === t.id}
                    onChange={() => {
                      setKind(t.id);
                      setReason(REASONS[t.id][0]);
                      setError(undefined);
                    }}
                    className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary"
                  />
                  {t.icon}
                  {t.label}
                </span>
                <span className="text-xs text-muted">{t.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor="adjust-qty" className="mb-1.5 text-sm font-medium text-fg">
              {kind === "correction" ? "Counted quantity" : kind === "increase" ? "Quantity to add" : "Quantity to remove"}
            </label>
            <input
              id="adjust-qty"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                setQty(e.target.value.replace(/\D/g, ""));
                setError(undefined);
              }}
              aria-invalid={Boolean(error) || undefined}
              className={cn("h-10 rounded-md border bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/20", error ? "border-error" : "border-icon-subtle focus:border-primary")}
            />
            <p className={cn("mt-1.5 text-[13px]", error ? "text-error-fg" : "text-muted")}>{error ?? (item ? `${plural(item.unit)[0].toUpperCase()}${plural(item.unit).slice(1)}` : "")}</p>
          </div>
          <SelectField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS[kind].map((r) => ({ value: r, label: r }))} />
        </div>
        <TextAreaField label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened? Optional." />
        {item && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-subtle px-4 py-3">
            <div>
              <p className="text-[13px] text-muted">Stock at {branchName}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xl font-semibold text-fg">
                <span className="text-muted">{current}</span>
                <span aria-hidden className="text-icon">→</span>
                {after === null || after < 0 ? "—" : unitLabel(item, after)}
              </p>
            </div>
            {after !== null && after >= 0 && (
              <StatusPill tone={after === 0 ? "error" : after < min ? "warning" : "success"}>{after === 0 ? "Out of stock" : after < min ? `Below minimum of ${min}` : "In stock"}</StatusPill>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save adjustment</Button>
      </ModalFooter>
    </form>
  );
}

export function LevelPill({ item, branch }: { item: Item; branch: BranchName }) {
  const level = branchLevel(item, branch);
  if (!level) return <span className="text-muted">—</span>;
  return <StatusPill tone={level === "out" ? "error" : level === "low" ? "warning" : "success"}>{level === "out" ? "Out of Stock" : level === "low" ? "Low Stock" : "In Stock"}</StatusPill>;
}
