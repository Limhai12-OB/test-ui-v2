"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Building2, Calendar, Check, Info, Tag, Undo2, WalletCards, X } from "lucide-react";
import { MoneyInput, parseAmount, StatusPill } from "@/components/finance/common";
import { DateRangePicker, type DateRange } from "@/components/hairline/date-range-picker";
import { FilterBar as FilterBarHairline, matchFilters, type Filter, type FilterField } from "@/components/hairline/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { FilterBar, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Timeline } from "@/components/ui/flow";
import { Drawer, ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Page, ScopeNotice, Tabs } from "@/components/ui/page";
import { accountName, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, fmtDate, money, TODAY, type Currency } from "@/lib/format";
import { BRANCH_NAMES, CATEGORIES } from "@/lib/mock/finance-data";
import type { Txn } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { toTimeline } from "./bill-detail";
import { RecordsHeader } from "./records-shared";

const STATUS = { posted: { label: "Posted", tone: "success" as const }, draft: { label: "Draft", tone: "neutral" as const }, reversed: { label: "Reversed", tone: "neutral" as const } };
const TYPE_LABEL = { income: "Income", expense: "Expense", transfer: "Transfer" };

function AmountStack({ txn }: { txn: Txn }) {
  return (
    <div className="text-right">
      <p className={cn("tabular text-[13px] leading-5 whitespace-nowrap", txn.status === "reversed" ? "text-muted line-through" : txn.amount > 0 ? "text-success-fg" : "text-fg")}>{money(txn.amount, txn.currency, { sign: true })}</p>
      <p className="text-xs leading-4 whitespace-nowrap text-muted">{txn.currency === "KHR" ? `KHR · ≈ ${money(Math.abs(txn.amount) / 4100, "USD")}` : "USD"}</p>
    </div>
  );
}

/** Frames 10.6 "Transactions", 10.7 "Transaction Details" and "New manual transaction". */
export function Transactions() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const isManager = user?.role === "manager";
  // `?q=` opens the list filtered to a reference, e.g. the expenses of one import (frame 16.11).
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  // Hairline UI date range picker: October by default, or everything when opened for one import (?q=).
  const [range, setRange] = useState<DateRange | null>(() => (params.get("q") ? null : { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) }));
  // Hairline UI filter bar: property → value chips, edited in place.
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const openId = params.get("txn");
  const newOpen = params.get("new") === "1";
  const close = () => router.replace("/financial-records/transactions", { scroll: false });

  const fields = useMemo<FilterField<Txn>[]>(
    () => [
      { id: "type", label: "Type", type: "option", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
      { id: "account", label: "Account", type: "option", options: state.accounts.map((a) => ({ value: a.id, label: a.name })), get: (t) => t.accountId },
      { id: "category", label: "Category", type: "option", options: [...new Set(state.transactions.map((t) => t.category))].sort().map((c) => ({ value: c, label: c })) },
      ...(isManager ? [] : [{ id: "branch", label: "Branch", type: "option" as const, options: ["Business-wide", ...BRANCH_NAMES].map((b) => ({ value: b, label: b })) }]),
      { id: "status", label: "Status", type: "option", options: Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label })) },
      { id: "amount", label: "Amount", type: "number", unit: ["USD", "USD"], get: (t) => Math.abs(t.currency === "KHR" ? t.amount / 4100 : t.amount) },
      { id: "description", label: "Description", type: "text" },
      { id: "date", label: "Date", type: "date", get: (t) => new Date(`${t.date}T12:00:00`) },
    ],
    [state.accounts, state.transactions, isManager],
  );

  const inRange = useMemo(() => {
    const from = range ? range.start.toISOString().slice(0, 10) : "";
    const to = range ? new Date(range.end.getTime() + 864e5 - 1).toISOString().slice(0, 10) : "";
    return state.transactions.filter(
      (t) => (!query || `${t.description} ${t.id} ${t.ref}`.toLowerCase().includes(query.toLowerCase())) && (!range || (t.date >= from && t.date <= to)),
    );
  }, [state.transactions, query, range]);

  const rows = useMemo(() => {
    // "Within 7 days" is measured from the demo's today, 31 Oct 2026.
    const list = matchFilters(inRange, filters, fields, Date.parse("2026-10-31T23:59:00"));
    return sort.dir === "desc" ? list : [...list].reverse();
  }, [inRange, filters, fields, sort]);
  const { current, slice } = paginate(rows, page, 8);
  const selected = state.transactions.find((t) => t.id === openId);

  return (
    <Page>
      <RecordsHeader subtitle={isManager ? `Transactions recorded for ${user?.branch} Branch.` : undefined} />
      {isManager && <ScopeNotice branch={user?.branch} className="mt-6" />}
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Transactions">
        <FilterBar
          className="border-b border-line"
          onExport={() =>
            downloadCsv("transactions.csv", [
              ["Date", "Transaction", "Description", "Type", "Account", "Branch", "Category", "Amount", "Currency", "Status"],
              ...rows.map((t) => [t.date, t.id, t.description, TYPE_LABEL[t.type], accountName(state, t.accountId), t.branch, t.category, t.amount, t.currency, STATUS[t.status].label]),
            ])
          }
        >
          <SearchInput value={query} onChange={setQuery} placeholder="Search description or reference" />
          <DateRangePicker
            value={range}
            onValueChange={(r) => {
              setRange(r);
              setPage(1);
            }}
            presets={[
              { label: "October 2026", range: () => ({ start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) }) },
              { label: "Last 7 days", range: () => ({ start: new Date(2026, 9, 25), end: new Date(2026, 9, 31) }) },
              { label: "September 2026", range: () => ({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }) },
              { label: "Since March", range: () => ({ start: new Date(2026, 2, 1), end: new Date(2026, 9, 31) }) },
            ]}
            max={new Date(2026, 9, 31)}
            weekStartsOn={1}
            locales="en-GB"
            placeholder="All dates"
          />
          {range && (
            <button type="button" onClick={() => setRange(null)} className="focus-ring cursor-pointer rounded-xs text-[13px] font-medium text-brand hover:underline">
              All dates
            </button>
          )}
          <FilterBarHairline
            fields={fields}
            value={filters}
            onValueChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            count={rows.length}
            total={inRange.length}
            noun={["transaction", "transactions"]}
            hotkey="f"
            locales="en-US"
            className="order-last basis-full"
          />
        </FilterBar>
        <DataTable
          caption="Transactions"
          rows={slice}
          rowKey={(t) => t.id}
          sort={sort}
          sortable={["date"]}
          onSort={setSort}
          onRowClick={(t) => router.replace(`/financial-records/transactions?txn=${t.id}`, { scroll: false })}
          rowClassName={(t) => (t.id === openId ? "bg-subtle" : undefined)}
          empty="No transactions match these filters."
          minWidth={980}
          columns={[
            { key: "date", header: "Date", width: "130px", cell: (t) => <span className="whitespace-nowrap text-muted">{fmtDate(t.date)}</span> },
            { key: "desc", header: "Description", cell: (t) => <TwoLine title={t.description} titleClassName="font-normal" sub={`${TYPE_LABEL[t.type]} · ${t.id}`} /> },
            {
              key: "account",
              header: isManager ? "Account" : "Account and branch",
              width: "210px",
              cell: (t) => (isManager ? <span className="text-fg">{accountName(state, t.accountId)}</span> : <TwoLine title={accountName(state, t.accountId)} titleClassName="font-medium" sub={t.branch} />),
            },
            {
              key: "category",
              header: "Category",
              width: "190px",
              cell: (t) => (
                <Badge tone={t.category === "Uncategorised" ? "warning" : "neutral"} className="max-w-full">
                  <span className="truncate">{t.category}</span>
                </Badge>
              ),
            },
            { key: "amount", header: "Amount", align: "right", width: "150px", cell: (t) => <AmountStack txn={t} /> },
            {
              key: "status",
              header: "Status",
              width: "120px",
              cell: (t) =>
                t.status === "reversed" ? (
                  <Badge dot className="border border-line-strong bg-surface">
                    Reversed
                  </Badge>
                ) : (
                  <StatusPill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</StatusPill>
                ),
            },
          ]}
          mobileRow={(t) => <MobileRow title={t.description} sub={`${fmtDate(t.date)} · ${t.category}`} value={<AmountStack txn={t} />} />}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="transactions" onPage={setPage} />
      </section>

      <Drawer open={Boolean(selected)} onClose={close} labelledBy="txn-title">
        {selected && <TransactionPanel key={selected.id} txn={selected} onClose={close} />}
      </Drawer>
      <Dialog open={newOpen} onClose={close} labelledBy="new-txn-title" width={600}>
        {newOpen && <NewTransaction onClose={close} />}
      </Dialog>
    </Page>
  );
}

function TransactionPanel({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState("details");
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(txn.category);
  const account = state.accounts.find((a) => a.id === txn.accountId);
  const options = CATEGORIES.filter((c) => c.active && c.kind === (txn.amount > 0 ? "income" : "expense")).map((c) => c.name);

  const saveCategory = () => {
    update((draft) => {
      const target = draft.transactions.find((t) => t.id === txn.id)!;
      target.history.unshift({ kind: "edit", title: `Category changed to ${category}`, meta: `${user?.name} · 31 Oct 2026, 17:55`, detail: `Was: ${target.category}` });
      target.category = category;
    });
    setEditing(false);
    toast({ title: "Category updated", body: `${txn.id} is now in ${category}.` });
  };

  const reverse = () => {
    update((draft) => {
      const target = draft.transactions.find((t) => t.id === txn.id)!;
      target.status = "reversed";
      target.history.unshift({ kind: "reverse", title: "Entry reversed", meta: `${user?.name} · 31 Oct 2026, 17:56`, detail: "A reversing entry with the opposite amount was recorded." });
    });
    toast({ title: "Entry reversed", body: `${txn.id} stays in the history. Record a new transaction with the correct details.` });
  };

  const post = () => {
    if (txn.category === "Uncategorised") return setEditing(true);
    update((draft) => {
      const target = draft.transactions.find((t) => t.id === txn.id)!;
      target.status = "posted";
      target.history.unshift({ kind: "status", title: "Posted", meta: `${user?.name} · 31 Oct 2026, 17:56` });
    });
    toast({ title: "Transaction posted", body: `${txn.id} now counts in reports.` });
  };

  return (
    <>
      <div className="flex items-start gap-3 border-b border-line px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="txn-title" className="text-xl leading-7 font-semibold text-fg">
              {txn.id}
            </h2>
            <StatusPill tone={STATUS[txn.status].tone}>{STATUS[txn.status].label}</StatusPill>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted">
            {TYPE_LABEL[txn.type]} · {txn.method.toLowerCase()} · {account?.name}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <Tabs
          label="Transaction"
          value={tab}
          onChange={setTab}
          items={[
            { id: "details", label: "Details" },
            { id: "attachments", label: "Attachments", count: txn.linked ? 1 : 0 },
          ]}
        />
        {tab === "details" ? (
          <>
            <div className="border-b border-line py-5">
              <p className="text-[13px] leading-5 text-muted">Amount</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className={cn("text-[28px] leading-9 font-semibold tracking-[-0.14px]", txn.status === "reversed" ? "text-muted line-through" : "text-fg")}>{money(txn.amount, txn.currency)}</span>
                <span className="text-xs font-medium text-muted">{txn.currency}</span>
              </p>
              <p className="text-xs leading-4 text-muted">≈ {txn.currency === "USD" ? money(Math.abs(txn.amount) * 4100, "KHR") : money(Math.abs(txn.amount) / 4100, "USD")} · display conversion</p>
            </div>
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-4 gap-y-3.5 border-b border-line py-5 text-sm leading-5">
              <dt className="text-muted">Date</dt>
              <dd className="text-fg">{fmtDate(txn.date)}</dd>
              <dt className="text-muted">Description</dt>
              <dd className="text-fg">{txn.description}</dd>
              <dt className="text-muted">Category</dt>
              <dd>
                {editing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="focus-ring h-9 rounded-md border border-icon-subtle bg-surface px-2 text-sm text-fg">
                      {txn.category === "Uncategorised" && <option value="Uncategorised">Choose a category</option>}
                      {options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={saveCategory} disabled={category === "Uncategorised"}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Badge tone={txn.category === "Uncategorised" ? "warning" : "neutral"}>{txn.category}</Badge>
                )}
              </dd>
              <dt className="text-muted">Account</dt>
              <dd className="text-fg">
                {account?.name}
                {account?.last4 ? ` •••• ${account.last4}` : ""}
              </dd>
              <dt className="text-muted">Branch</dt>
              <dd className="text-fg">{txn.branch === "Central Market" ? "Central Market (Main)" : txn.branch}</dd>
              <dt className="text-muted">Reference</dt>
              <dd className="text-fg">{txn.ref || "—"}</dd>
              {txn.linked && (
                <>
                  <dt className="text-muted">Linked record</dt>
                  <dd>
                    <Link href={txn.linked.href} className="focus-ring rounded-xs text-brand hover:underline">
                      {txn.linked.label}
                    </Link>
                  </dd>
                </>
              )}
              <dt className="text-muted">Reconciliation</dt>
              <dd>
                <StatusPill tone={txn.recon === "matched" ? "success" : "warning"}>{txn.recon === "matched" ? "Matched" : "Not matched yet"}</StatusPill>
              </dd>
            </dl>
            <div className="py-5">
              <p className="text-sm leading-5 font-medium text-fg">Change history</p>
              <div className="mt-4">
                <Timeline items={toTimeline(txn.history)} />
              </div>
            </div>
            <div className="mb-6 flex gap-3 rounded-lg border border-line bg-muted-bg/60 px-4 py-3">
              <Info size={18} className="mt-0.5 shrink-0 text-icon" aria-hidden />
              <div className="text-[13px] leading-5 text-body">
                <p className="font-medium text-fg">Posted transactions are not edited</p>
                To correct the amount or account, reverse this entry and record a new one. Both stay in the history.
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-muted">
            {txn.linked ? (
              <p>
                Attached through{" "}
                <Link href={txn.linked.href} className="text-brand hover:underline">
                  {txn.linked.label}
                </Link>
                .
              </p>
            ) : (
              "No attachments."
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
        {txn.status === "posted" && (
          <Button variant="secondary" icon={Undo2} onClick={reverse}>
            Reverse entry
          </Button>
        )}
        {txn.status === "draft" && (
          <Button variant="secondary" icon={Check} onClick={post}>
            Post transaction
          </Button>
        )}
        {txn.status !== "reversed" && (
          <Button icon={Tag} onClick={() => setEditing(true)} disabled={editing}>
            Edit category
          </Button>
        )}
      </div>
    </>
  );
}

function NewTransaction({ onClose }: { onClose: () => void }) {
  const { state, update } = useFinance();
  const { user } = useSession();
  const toast = useToast();
  const isManager = user?.role === "manager";
  const accounts = state.accounts.filter((a) => a.status === "active");
  const [type, setType] = useState<Txn["type"]>("expense");
  const [date, setDate] = useState(TODAY);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState(accounts.find((a) => a.kind === "till")?.id ?? accounts[0]?.id);
  const [toAccountId, setToAccountId] = useState(accounts.find((a) => a.id !== accountId)?.id);
  const [category, setCategory] = useState("Repairs");
  const account = accounts.find((a) => a.id === accountId);
  const [branch, setBranch] = useState(isManager ? user!.branch! : account?.branch === "Business-wide" ? "Central Market" : account?.branch ?? "Central Market");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const categories = CATEGORIES.filter((c) => c.active && c.kind === (type === "income" ? "income" : "expense")).map((c) => c.name);

  const save = (status: "posted" | "draft") => {
    const value = parseAmount(amount);
    const next: Record<string, string> = {};
    if (value <= 0) next.amount = "Enter an amount.";
    if (!description.trim()) next.description = "Describe what this is for.";
    if (type === "transfer" && toAccountId === accountId) next.to = "Choose a different account.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = `TXN-2026-10-${String(state.nextIds.txn).padStart(4, "0")}`;
    update((draft) => {
      draft.nextIds.txn++;
      draft.transactions.unshift({
        id,
        date,
        description: description.trim(),
        type,
        accountId: accountId!,
        branch: type === "transfer" ? account?.branch ?? branch : branch,
        category: type === "transfer" ? "Transfer" : category,
        amount: type === "income" ? value : -value,
        currency,
        status,
        ref: "",
        method: account?.kind === "till" ? "Cash" : "Bank transfer",
        recon: "unmatched",
        history: [{ kind: "status", title: status === "posted" ? "Recorded and posted" : "Saved as draft", meta: `${user?.name} · ${fmtDate(date)}, 17:58` }],
      });
    });
    toast({ title: status === "posted" ? "Transaction posted" : "Draft saved", body: `${id} · ${description.trim()} · ${money(type === "income" ? value : -value, currency)}` });
    onClose();
  };

  const types: { id: Txn["type"]; label: string; icon: React.ReactNode }[] = [
    { id: "income", label: "Income", icon: <ArrowDownLeft size={16} aria-hidden /> },
    { id: "expense", label: "Expense", icon: <ArrowUpRight size={16} aria-hidden /> },
    { id: "transfer", label: "Transfer", icon: <ArrowLeftRight size={16} aria-hidden /> },
  ];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save("posted");
      }}
    >
      <ModalHeader id="new-txn-title" title="New transaction" description="Record income, an expense or a transfer that did not come from a sale, bill or import." onClose={onClose} />
      <ModalBody className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-3 gap-3">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={type === t.id}
              onClick={() => {
                setType(t.id);
                setCategory(t.id === "income" ? "Other income" : "Repairs");
              }}
              className={cn(
                "focus-ring inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium",
                type === t.id ? "border-primary bg-primary-subtle text-brand" : "border-line-strong bg-surface text-fg hover:bg-subtle",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <TextField size="md" type="date" label="Date" icon={Calendar} value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
          <MoneyInput
            id="txn-amount"
            label="Amount"
            currency={currency}
            onCurrency={setCurrency}
            value={amount}
            onChange={setAmount}
            error={errors.amount}
            hint={parseAmount(amount) ? (currency === "USD" ? `≈ ${money(parseAmount(amount) * 4100, "KHR")} at 4,100 KHR per USD` : `≈ ${money(parseAmount(amount) / 4100, "USD")} at 4,100 KHR per USD`) : undefined}
          />
          <TextField size="md" className="sm:col-span-2" label="Description" placeholder="e.g. Shop sign repair" value={description} onChange={(e) => setDescription(e.target.value)} state={errors.description ? "error" : "default"} message={errors.description} />
          <SelectField
            label={type === "income" ? "Received in" : type === "transfer" ? "From" : "Paid from"}
            icon={WalletCards}
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              const a = accounts.find((x) => x.id === e.target.value);
              if (!isManager && a && a.branch !== "Business-wide") setBranch(a.branch);
            }}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          {type === "transfer" ? (
            <SelectField label="To" icon={WalletCards} value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} state={errors.to ? "error" : "default"} message={errors.to} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          ) : (
            <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} />
          )}
          {type !== "transfer" && (
            <SelectField
              className="sm:col-span-2"
              label="Branch"
              icon={Building2}
              value={branch}
              disabled={isManager}
              onChange={(e) => setBranch(e.target.value)}
              options={(isManager ? [user!.branch!] : BRANCH_NAMES).map((b) => ({ value: b, label: b }))}
              message="Set from the account. Branch Managers always record for their own branch."
            />
          )}
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Info size={14} aria-hidden /> Drafts are not counted in reports.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => save("draft")}>
          Save as draft
        </Button>
        <Button type="submit" icon={Check}>
          Post transaction
        </Button>
      </ModalFooter>
    </form>
  );
}
