"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Info, Lock, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dot } from "@/components/ui/charts";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/format";
import type { Category } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { RecordsHeader } from "./records-shared";

const COLORS = ["#1d33ba", "#0d9488", "#ea580c", "#0284c7", "#f43f5e", "#d97706", "#16a34a", "#7c3aed", "#64748b"];

/** Frame 10.8 "Categories Management". Branch Managers see it read-only. */
export function CategoriesPage() {
  const { state, update } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();
  const isOwner = user?.role === "owner";
  const [editing, setEditing] = useState<{ kind: Category["kind"]; category?: Category } | null>(null);

  const totals = (kind: Category["kind"]) => state.categories.filter((c) => c.kind === kind).reduce((s, c) => s + c.usedInOct, 0);

  const table = (kind: Category["kind"]) => (
    <Card className="overflow-hidden" aria-labelledby={`${kind}-cats-title`}>
      <CardHeader
        title={kind === "income" ? "Income categories" : "Expense categories"}
        titleId={`${kind}-cats-title`}
        subtitle={`${kind === "income" ? "Money coming in" : "Money going out"} · ${totals(kind)} transactions in October`}
        divided
        actions={
          isOwner && (
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setEditing({ kind })}>
              Add category
            </Button>
          )
        }
      />
      <DataTable
        caption={`${kind} categories`}
        rows={state.categories.filter((c) => c.kind === kind)}
        rowKey={(c) => c.id}
        minWidth={460}
        columns={[
          {
            key: "name",
            header: "Category",
            cell: (c) => (
              <div className="flex items-center gap-2.5">
                <Dot color={c.color} className="size-2.5" />
                <div className="min-w-0">
                  <p className={cn("truncate text-sm leading-5 font-medium", c.active ? "text-fg" : "text-muted")}>{c.name}</p>
                  {c.system && <p className="text-xs leading-4 text-muted">System category</p>}
                </div>
              </div>
            ),
          },
          { key: "used", header: "Used in Oct", align: "right", width: "100px", cell: (c) => <span className="tabular text-fg">{c.usedInOct}</span> },
          { key: "rules", header: "AI rules", align: "right", width: "80px", cell: (c) => <span className="tabular text-fg">{c.aiRules}</span> },
          {
            key: "active",
            header: "Active",
            width: "86px",
            cell: (c) => (
              <span className="pl-3">
                <Switch
                  label={`${c.name} active`}
                  checked={c.active}
                  disabled={c.system || !isOwner}
                  onChange={(checked) => {
                    update((draft) => void (draft.categories.find((x) => x.id === c.id)!.active = checked));
                    toast({ title: checked ? `${c.name} turned on` : `${c.name} turned off`, body: checked ? "It can be chosen on new records again." : "It is hidden from new records. Its history is kept." });
                  }}
                />
              </span>
            ),
          },
          {
            key: "edit",
            header: "Edit",
            srHeader: true,
            width: "52px",
            cell: (c) =>
              c.system || !isOwner ? (
                <Lock size={16} className="ml-auto text-icon" aria-label={c.system ? "System category, cannot be changed" : "Only the Business Owner can edit"} />
              ) : (
                <button type="button" onClick={() => setEditing({ kind, category: c })} aria-label={`Edit ${c.name}`} className="focus-ring ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg">
                  <Pencil size={16} aria-hidden />
                </button>
              ),
          },
        ]}
        mobileRow={(c) => (
          <div className="flex items-center gap-3">
            <Dot color={c.color} className="size-2.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{c.name}</p>
              <p className="text-xs text-muted">
                {c.usedInOct} used in Oct · {c.aiRules} AI rules{c.system ? " · System" : ""}
              </p>
            </div>
            <Switch label={`${c.name} active`} checked={c.active} disabled={c.system || !isOwner} onChange={(checked) => update((draft) => void (draft.categories.find((x) => x.id === c.id)!.active = checked))} />
          </div>
        )}
      />
    </Card>
  );

  return (
    <Page>
      <RecordsHeader
        actions={
          isOwner ? (
            <Button variant="secondary" icon={CloudUpload} onClick={() => router.push("/data-import")}>
              Import categories
            </Button>
          ) : (
            <span />
          )
        }
      />
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="Categories are shared by the whole business">
        {isOwner
          ? "Branch Managers choose from this list. Turning a category off hides it from new records but keeps its history. System categories are always on."
          : "Only the Business Owner can add, rename or turn off categories. You choose from this list when you record a transaction."}
      </Notice>
      <div className="mt-6 grid items-start gap-4 md:gap-6 xl:grid-cols-2">
        {table("income")}
        {table("expense")}
      </div>
      <p className="mt-6 flex items-start gap-2 text-[13px] leading-5 text-muted">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        “Used in Oct” counts the 502 transactions dated 1–31 Oct 2026: 472 with a category, 21 transfers between your own accounts and 9 still uncategorised.
      </p>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} labelledBy="cat-dialog-title" width={480}>
        {editing && (
          <CategoryForm
            key={editing.category?.id ?? editing.kind}
            kind={editing.kind}
            category={editing.category}
            existing={state.categories.map((c) => c.name.toLowerCase())}
            onClose={() => setEditing(null)}
            onSave={(name, color) => {
              update((draft) => {
                if (editing.category) {
                  const target = draft.categories.find((c) => c.id === editing.category!.id)!;
                  target.name = name;
                  target.color = color;
                } else {
                  draft.categories.push({ id: `cat-${Date.now()}`, name, kind: editing.kind, color, system: false, active: true, usedInOct: 0, aiRules: 0 });
                }
              });
              toast({ title: editing.category ? "Category updated" : "Category added", body: `${name} is available for ${editing.kind === "income" ? "income" : "expenses"}.` });
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </Page>
  );
}

function CategoryForm({
  kind,
  category,
  existing,
  onClose,
  onSave,
}: {
  kind: Category["kind"];
  category?: Category;
  existing: string[];
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? COLORS[2]);
  const [error, setError] = useState<string>();
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return setError("Enter a name.");
        if (trimmed.toLowerCase() !== category?.name.toLowerCase() && existing.includes(trimmed.toLowerCase())) return setError("A category with this name already exists.");
        onSave(trimmed, color);
      }}
    >
      <ModalHeader id="cat-dialog-title" title={category ? "Edit category" : `Add ${kind} category`} onClose={onClose} />
      <ModalBody className="flex flex-col gap-5">
        <TextField size="md" label="Name" value={name} onChange={(e) => setName(e.target.value)} state={error ? "error" : "default"} message={error} placeholder="e.g. Packaging" />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <label key={c} className="relative cursor-pointer">
                <input type="radio" name="colour" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" aria-label={c} />
                <span className="block size-8 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary" style={{ background: c }} />
              </label>
            ))}
          </div>
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{category ? "Save changes" : "Add category"}</Button>
      </ModalFooter>
    </form>
  );
}
