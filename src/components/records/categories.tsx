"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Check, CloudUpload, FlaskConical, Info, Lock, Pencil, Plus, Sparkles, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dot } from "@/components/ui/charts";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/format";
import type { Category, CategoryMatchType, CategoryRule } from "@/lib/mock/finance-types";
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
      <Dialog open={editing !== null} onClose={() => setEditing(null)} labelledBy="cat-dialog-title" width={600}>
        {editing && (
          <CategoryForm
            key={editing.category?.id ?? editing.kind}
            kind={editing.kind}
            category={editing.category}
            categories={state.categories}
            allRules={state.categoryRules}
            onClose={() => setEditing(null)}
            onSave={({ name, kind, active, rules }) => {
              const id = editing.category?.id ?? `cat-${Date.now()}`;
              update((draft) => {
                if (editing.category) {
                  const target = draft.categories.find((c) => c.id === id)!;
                  target.name = name;
                  target.kind = kind;
                  target.active = active;
                  target.aiRules = rules.length;
                } else {
                  // The schema has no colour; charts get the first palette colour not yet used by this type.
                  const used = draft.categories.filter((c) => c.kind === kind).map((c) => c.color);
                  const color = COLORS.find((c) => !used.includes(c)) ?? COLORS[draft.categories.length % COLORS.length];
                  draft.categories.push({ id, name, kind, color, system: false, active, usedInOct: 0, aiRules: rules.length });
                }
                draft.categoryRules = [
                  ...draft.categoryRules.filter((r) => r.categoryId !== id),
                  ...rules.map((r, i) => ({ id: r.id ?? `cr-${Date.now()}-${i}`, categoryId: id, matchType: r.matchType, matchText: r.matchText, active: r.active })),
                ];
              });
              const ruleNote = rules.length ? ` with ${rules.length} matching rule${rules.length === 1 ? "" : "s"}` : "";
              toast({
                title: editing.category ? "Category updated" : "Category added",
                body: active
                  ? `${name} is available for ${kind === "income" ? "income" : "expenses"}${ruleNote}.`
                  : `${name} is saved but turned off, so it is hidden from new records.`,
              });
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </Page>
  );
}

const NAME_MAX = 50;
const MATCH_MAX = 100;
const RULES_MAX = 10;
const MATCH_TYPES: { value: CategoryMatchType; label: string }[] = [
  { value: "CONTAINS", label: "Contains" },
  { value: "STARTS_WITH", label: "Starts with" },
  { value: "EQUALS", label: "Is exactly" },
];

type DraftRule = { key: string; id?: string; matchType: CategoryMatchType; matchText: string; active: boolean };
type SavedRule = Omit<DraftRule, "key">;

const newRule = (): DraftRule => ({ key: `n-${Date.now()}`, matchType: "CONTAINS", matchText: "", active: true });

const omit = (record: Record<string, string>, key: string) => Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

/** Case-insensitive match of a bank line's description against one rule. */
function matches(description: string, rule: { matchType: CategoryMatchType; matchText: string }) {
  const text = description.trim().toUpperCase();
  const needle = rule.matchText.trim().toUpperCase();
  if (!needle) return false;
  if (rule.matchType === "EQUALS") return text === needle;
  if (rule.matchType === "STARTS_WITH") return text.startsWith(needle);
  return text.includes(needle);
}

/** Create or edit a category (`categories`) together with its matching rules (`category_rules`). */
function CategoryForm({
  kind: initialKind,
  category,
  categories,
  allRules,
  onClose,
  onSave,
}: {
  kind: Category["kind"];
  category?: Category;
  categories: Category[];
  allRules: CategoryRule[];
  onClose: () => void;
  onSave: (value: { name: string; kind: Category["kind"]; active: boolean; rules: SavedRule[] }) => void;
}) {
  const [kind, setKind] = useState(category?.kind ?? initialKind);
  const [name, setName] = useState(category?.name ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const [rules, setRules] = useState<DraftRule[]>(() =>
    allRules
      .filter((r) => r.categoryId === category?.id)
      .map((r) => ({ key: r.id, id: r.id, matchType: r.matchType, matchText: r.matchText, active: r.active })),
  );
  const [sample, setSample] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
  // A category that already has records keeps its type, so past income/expense totals don't move.
  const typeLocked = !!category && category.usedInOct > 0;

  const otherRules = allRules.filter((r) => r.categoryId !== category?.id);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "another category";
  const display = name.trim() || "this category";

  const patchRule = (key: string, patch: Partial<DraftRule>) => {
    setRules((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    if ("matchText" in patch || "matchType" in patch) setRuleErrors((errors) => omit(errors, key));
  };

  const sampleHit = sample.trim() ? rules.find((r) => r.active && matches(sample, r)) : undefined;
  const sampleOther = sample.trim() && !sampleHit ? otherRules.find((r) => r.active && matches(sample, r)) : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        let nextNameError: string | undefined;
        if (!trimmed) nextNameError = "Enter a name.";
        else if (categories.some((c) => c.id !== category?.id && c.name.toLowerCase() === trimmed.toLowerCase())) nextNameError = "A category with this name already exists.";
        const errors: Record<string, string> = {};
        const seen = new Set<string>();
        for (const r of rules) {
          const text = r.matchText.trim().toUpperCase();
          const signature = `${r.matchType}:${text}`;
          const clash = otherRules.find((o) => o.matchType === r.matchType && o.matchText.toUpperCase() === text);
          if (!text) errors[r.key] = "Enter the text to look for, or remove this rule.";
          else if (text.length < 2) errors[r.key] = "Use at least 2 characters.";
          else if (seen.has(signature)) errors[r.key] = "This rule is listed twice.";
          else if (clash) errors[r.key] = `Already used by ${categoryName(clash.categoryId)}.`;
          seen.add(signature);
        }
        setNameError(nextNameError);
        setRuleErrors(errors);
        if (nextNameError || Object.keys(errors).length) return;
        onSave({ name: trimmed, kind, active, rules: rules.map((r) => ({ id: r.id, matchType: r.matchType, matchText: r.matchText.trim().toUpperCase(), active: r.active })) });
      }}
    >
      <ModalHeader
        id="cat-dialog-title"
        title={category ? "Edit category" : "New category"}
        description="Categories group your income and expenses. Matching rules let the AI suggest this category for bank lines."
        icon={<Tag size={20} aria-hidden />}
        onClose={onClose}
      />
      <ModalBody className="flex max-h-[min(68vh,640px)] flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-5">
          <div>
            <p id="cat-type-label" className="mb-1.5 text-sm leading-5 font-medium text-fg">
              Type
            </p>
            {typeLocked ? (
              <p className="flex flex-wrap items-center gap-2">
                <Badge tone={kind === "income" ? "success" : "warning"}>{kind === "income" ? "Income" : "Expense"}</Badge>
                <span className="text-[13px] leading-5 text-muted">Can’t be changed: {category.usedInOct} records already use it.</span>
              </p>
            ) : (
              <div role="radiogroup" aria-labelledby="cat-type-label" className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["income", "Income", "Money coming in", ArrowDownLeft],
                    ["expense", "Expense", "Money going out", ArrowUpRight],
                  ] as const
                ).map(([value, label, hint, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={kind === value}
                    onClick={() => setKind(value)}
                    className={cn(
                      "focus-ring flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      kind === value ? "border-primary bg-primary-subtle ring-1 ring-primary" : "border-line hover:bg-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                        value === "income" ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg",
                      )}
                    >
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-5 font-medium text-fg">{label}</span>
                      <span className="block text-xs leading-4 text-muted">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <TextField
            size="md"
            label="Category name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(undefined);
            }}
            state={nameError ? "error" : "default"}
            message={nameError ?? "Branch Managers pick from this name when they record a transaction."}
            placeholder={kind === "income" ? "e.g. Catering orders" : "e.g. Packaging"}
            suffix={
              <span className={cn("tabular shrink-0 text-xs", name.length >= NAME_MAX ? "text-warning-fg" : "text-muted")} aria-hidden>
                {name.length}/{NAME_MAX}
              </span>
            }
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm leading-5 font-medium text-fg">Active</p>
              <p className="text-[13px] leading-5 text-muted">{active ? "Can be chosen on new records." : "Hidden from new records. History is kept."}</p>
            </div>
            <Switch label="Category active" checked={active} onChange={setActive} />
          </div>
        </div>

        <section aria-labelledby="cat-rules-title" className="flex flex-col gap-3 border-t border-line pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="cat-rules-title" className="text-base leading-6 font-semibold text-fg">
                Matching rules <span className="ml-1 text-sm font-normal text-muted">Optional</span>
              </h3>
              <p className="text-[13px] leading-5 text-muted">
                When a bank line’s description matches, the AI suggests {display}. Upper and lower case are treated the same.
              </p>
            </div>
            {rules.length > 0 && (
              <span className="tabular shrink-0 pt-1 text-xs text-muted">
                {rules.length}/{RULES_MAX}
              </span>
            )}
          </div>

          {rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-6 text-center">
              <Sparkles size={18} className="text-icon-ai" aria-hidden />
              <p className="text-sm leading-5 text-body">No rules yet. People can still choose {display} by hand.</p>
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => setRules([newRule()])}>
                Add a rule
              </Button>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {rules.map((r, index) => {
                  const error = ruleErrors[r.key];
                  const hit = sampleHit?.key === r.key;
                  return (
                    <li key={r.key} className={cn("rounded-lg border p-3 transition-colors", hit ? "border-success bg-success-subtle" : "border-line bg-subtle")}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                        <SelectField
                          label={`Rule ${index + 1} match type`}
                          className="sm:w-35 [&>label]:sr-only"
                          value={r.matchType}
                          onChange={(e) => patchRule(r.key, { matchType: e.target.value as CategoryMatchType })}
                          options={MATCH_TYPES}
                        />
                        <TextField
                          size="md"
                          label={`Rule ${index + 1} text`}
                          className={cn("flex-1 [&>label]:sr-only", !r.active && "opacity-60")}
                          value={r.matchText}
                          maxLength={MATCH_MAX}
                          placeholder="e.g. EDC"
                          onChange={(e) => patchRule(r.key, { matchText: e.target.value })}
                          state={error ? "error" : "default"}
                          message={error}
                          autoFocus={!r.id && index === rules.length - 1}
                        />
                        <div className="flex h-10 items-center justify-between gap-2 sm:justify-start">
                          <span className="flex items-center gap-2 text-[13px] text-muted sm:sr-only">
                            {r.active ? "On" : "Off"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Switch label={`Rule ${index + 1} active`} checked={r.active} onChange={(checked) => patchRule(r.key, { active: checked })} />
                            <button
                              type="button"
                              onClick={() => {
                                setRules((list) => list.filter((x) => x.key !== r.key));
                                setRuleErrors((errors) => omit(errors, r.key));
                              }}
                              aria-label={`Remove rule ${index + 1}`}
                              className="focus-ring ml-1 flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg hover:text-icon-error"
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </span>
                        </div>
                      </div>
                      {hit && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success-fg">
                          <Check size={14} aria-hidden /> Matches your test line
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                className="self-start"
                disabled={rules.length >= RULES_MAX}
                onClick={() => setRules((list) => [...list, newRule()])}
              >
                {rules.length >= RULES_MAX ? `Up to ${RULES_MAX} rules` : "Add another rule"}
              </Button>

              <div className="rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3">
                <TextField
                  size="md"
                  label="Test a bank line"
                  labelHint="Not saved"
                  icon={FlaskConical}
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  placeholder="e.g. EDC PHNOM PENH BILL 10/2026"
                />
                <p className="mt-2 text-[13px] leading-5 text-body" aria-live="polite">
                  {!sample.trim()
                    ? "Paste a description from a statement to check your rules."
                    : sampleHit
                      ? `The AI would suggest ${display}.`
                      : sampleOther
                        ? `No rule here matches. It would go to ${categoryName(sampleOther.categoryId)} instead.`
                        : "No rule matches. This line would stay uncategorised."}
                </p>
              </div>
            </>
          )}
        </section>
      </ModalBody>
      <ModalFooter note={<span className="text-muted max-sm:hidden">Rules only suggest. You still review every line.</span>}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{category ? "Save changes" : "Create category"}</Button>
      </ModalFooter>
    </form>
  );
}
