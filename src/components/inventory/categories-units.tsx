"use client";

import { useState } from "react";
import { Ellipsis, Info, Plus, Ruler, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/page";
import type { Item, OpsState } from "@/lib/mock/ops-types";
import { useOps } from "@/lib/ops-store";

type Kind = "category" | "unit";

const KINDS = {
  category: {
    title: "Item categories",
    subtitle: "Group items for filters, reports and imports.",
    noun: "category",
    icon: Tags,
    list: (s: OpsState) => s.categories,
    uses: (i: Item, name: string) => i.category === name,
    assign: (i: Item, name: string) => void (i.category = name),
    tidy: (raw: string) => raw.trim().replace(/\s+/g, " "),
  },
  unit: {
    title: "Units",
    subtitle: "How an item is counted and sold, such as case or kg.",
    noun: "unit",
    icon: Ruler,
    list: (s: OpsState) => s.units,
    // Items keep their unit in lower case ("case"); the list shows it capitalised ("Case").
    uses: (i: Item, name: string) => i.unit === name.toLowerCase(),
    assign: (i: Item, name: string) => void (i.unit = name.toLowerCase()),
    tidy: (raw: string) => {
      const t = raw.trim().replace(/\s+/g, " ");
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
  },
} as const;

/** Items & Inventory → "Categories & units" tab (both roles): add, rename and delete item categories and units. */
export function CategoriesUnits() {
  return (
    <>
      <div className="mt-4 grid gap-4 md:gap-6 xl:grid-cols-2">
        <ListCard kind="category" />
        <ListCard kind="unit" />
      </div>
      <Notice tone="info" className="mt-6" icon={<Info size={18} aria-hidden />} title="Changes apply to every item">
        Renaming updates all items that use it. To delete one that is in use, you choose where its items move, so no item is left without a category or unit.
      </Notice>
    </>
  );
}

type DialogState = { mode: "add" } | { mode: "rename"; name: string } | { mode: "delete"; name: string } | null;

function ListCard({ kind }: { kind: Kind }) {
  const { state } = useOps();
  const k = KINDS[kind];
  const Icon = k.icon;
  const [dialog, setDialog] = useState<DialogState>(null);
  const names = [...k.list(state)].sort((a, b) => a.localeCompare(b));
  const countOf = (name: string) => state.items.filter((i) => k.uses(i, name)).length;
  const titleId = `${kind}-list-title`;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title={k.title}
        titleId={titleId}
        subtitle={k.subtitle}
        divided
        actions={
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setDialog({ mode: "add" })}>
            Add {k.noun}
          </Button>
        }
      />
      {names.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No {k.noun === "category" ? "categories" : "units"} yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {names.map((name) => {
            const count = countOf(name);
            return (
              <li key={name} className="flex items-center gap-3 px-5 py-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-muted-bg text-icon">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm leading-5 font-medium text-fg">{name}</span>
                  <span className="text-[13px] leading-5 text-muted">{count ? `${count} item${count === 1 ? "" : "s"}` : "Not used yet"}</span>
                </span>
                <Menu
                  align="end"
                  width={180}
                  triggerLabel={`Actions for ${name}`}
                  triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                  trigger={<Ellipsis size={16} aria-hidden />}
                  items={[
                    { id: "rename", label: "Rename", onSelect: () => setDialog({ mode: "rename", name }) },
                    { id: "delete", label: "Delete", icon: <Trash2 size={16} className="text-icon-error" aria-hidden />, onSelect: () => setDialog({ mode: "delete", name }) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={dialog !== null} onClose={() => setDialog(null)} labelledBy={`${kind}-dialog-title`} width={440}>
        {dialog?.mode === "delete" ? (
          <DeleteForm kind={kind} name={dialog.name} count={countOf(dialog.name)} onClose={() => setDialog(null)} />
        ) : dialog ? (
          <NameForm key={dialog.mode === "rename" ? dialog.name : "add"} kind={kind} current={dialog.mode === "rename" ? dialog.name : undefined} onClose={() => setDialog(null)} />
        ) : null}
      </Dialog>
    </Card>
  );
}

/** Add a category or unit, or rename one (renaming updates every item that uses it). */
function NameForm({ kind, current, onClose }: { kind: Kind; current?: string; onClose: () => void }) {
  const { state, update } = useOps();
  const toast = useToast();
  const k = KINDS[kind];
  const Icon = k.icon;
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const label = k.noun === "category" ? "Category" : "Unit";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = k.tidy(value);
        if (!name) return setError(`Enter a ${k.noun} name.`);
        if (name.length > 40) return setError("Use 40 characters or fewer.");
        const clash = k.list(state).find((n) => n.toLowerCase() === name.toLowerCase() && n !== current);
        if (clash) return setError(`“${clash}” already exists.`);
        if (current === name) return onClose();
        update((draft) => {
          const list = k.list(draft);
          if (current) {
            list[list.indexOf(current)] = name;
            draft.items.forEach((i) => k.uses(i, current) && k.assign(i, name));
          } else list.push(name);
        });
        toast(current ? { title: `${label} renamed`, body: `“${current}” is now “${name}”.` } : { title: `${label} added`, body: `“${name}” is ready to use on items.` });
        onClose();
      }}
    >
      <ModalHeader
        id={`${kind}-dialog-title`}
        title={current ? `Rename ${k.noun}` : `Add ${k.noun}`}
        description={current ? `Every item using “${current}” will show the new name.` : kind === "category" ? "For example Frozen food or Personal care." : "For example Litre, Dozen or Carton."}
        icon={<Icon size={20} aria-hidden />}
        onClose={onClose}
      />
      <ModalBody>
        <TextField
          size="md"
          label={`${label} name`}
          autoFocus
          value={value}
          maxLength={60}
          onChange={(e) => (setValue(e.target.value), setError(null))}
          state={error ? "error" : "default"}
          message={error ?? undefined}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{current ? "Save" : `Add ${k.noun}`}</Button>
      </ModalFooter>
    </form>
  );
}

/** Delete a category or unit. If items use it, they move to another one first. */
function DeleteForm({ kind, name, count, onClose }: { kind: Kind; name: string; count: number; onClose: () => void }) {
  const { state, update } = useOps();
  const toast = useToast();
  const k = KINDS[kind];
  const others = k.list(state).filter((n) => n !== name).sort((a, b) => a.localeCompare(b));
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const items = `${count} item${count === 1 ? "" : "s"}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (count && !target) return setError(`Choose where to move ${count === 1 ? "this item" : "these items"}.`);
        update((draft) => {
          if (count) draft.items.forEach((i) => k.uses(i, name) && k.assign(i, target));
          const list = k.list(draft);
          list.splice(list.indexOf(name), 1);
        });
        toast({ title: `${k.noun === "category" ? "Category" : "Unit"} deleted`, body: count ? `${items} moved to “${target}”.` : `“${name}” was removed.` });
        onClose();
      }}
    >
      <ModalHeader
        id={`${kind}-dialog-title`}
        title={`Delete “${name}”?`}
        description={count ? `${items} use this ${k.noun}. Move them to another ${k.noun} before it is deleted.` : `No items use this ${k.noun}.`}
        icon={<Trash2 size={20} aria-hidden />}
        iconTone="error"
        onClose={onClose}
      />
      {count > 0 && (
        <ModalBody>
          {others.length ? (
            <SelectField
              label={`Move ${count === 1 ? "it" : "them"} to`}
              value={target}
              onChange={(e) => (setTarget(e.target.value), setError(null))}
              state={error ? "error" : "default"}
              message={error ?? undefined}
              options={[{ value: "", label: `Select a ${k.noun}`, disabled: true }, ...others.map((n) => ({ value: n, label: n }))]}
            />
          ) : (
            <p className="text-sm leading-5 text-body">Add another {k.noun} first, so these items have somewhere to move.</p>
          )}
        </ModalBody>
      )}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={count > 0 && !others.length}>
          {count ? "Move items and delete" : "Delete"}
        </Button>
      </ModalFooter>
    </form>
  );
}
