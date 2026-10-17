"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2, Landmark, WalletCards } from "lucide-react";
import { MoneyInput, parseAmount } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { FilterMenu, SearchInput } from "@/components/ui/filters";
import { Segmented } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Page, ScopeNotice } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { cn, money, type Currency } from "@/lib/format";
import { BRANCH_NAMES } from "@/lib/mock/finance-data";
import type { Account, AccountKind, Provider } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { AccountCard, BankingHeader } from "./banking-shared";
import { AccountsTable } from "./banking-overview";

/** Frame 06.2 "Bank Accounts List" with the "Add account" dialog. */
export function AccountsList() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>("all");
  const [view, setView] = useState<"cards" | "list">("cards");
  const addOpen = params.get("add") === "1" && user?.role === "owner";

  const activeCount = state.accounts.filter((a) => a.status === "active").length;
  const deactivatedCount = state.accounts.length - activeCount;
  const rows = state.accounts.filter((account) => {
    if (query && !`${account.name} ${account.last4 ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (type && account.kind !== type) return false;
    if (branch && account.branch !== branch) return false;
    if (status === "active" || status === null) return account.status === "active";
    if (status === "deactivated") return account.status === "deactivated";
    return true;
  });

  return (
    <Page>
      <BankingHeader onAdd={() => router.push("/banking/accounts?add=1")} />
      {user?.role === "manager" && <ScopeNotice branch={user.branch} className="mt-6" />}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search accounts" />
        <FilterMenu
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: "bank", label: "Bank account" },
            { value: "wallet", label: "Mobile wallet" },
            { value: "till", label: "Cash till" },
          ]}
        />
        {user?.role === "owner" && (
          <FilterMenu label="Branch" value={branch} onChange={setBranch} options={["Business-wide", ...BRANCH_NAMES].map((b) => ({ value: b, label: b }))} />
        )}
        <FilterMenu
          label="Status"
          value={status}
          onChange={setStatus}
          width={240}
          options={[
            { value: "all", label: "Active and deactivated" },
            { value: "active", label: "Active only" },
            { value: "deactivated", label: "Deactivated only" },
          ]}
        />
        <p className="text-[13px] leading-5 text-muted">
          {activeCount} active · {deactivatedCount} deactivated
        </p>
        <div className="ml-auto">
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "cards", label: "Cards" },
              { value: "list", label: "List" },
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-surface px-6 py-14 text-center shadow-xs">
          <p className="text-[15px] font-semibold text-fg">No accounts match these filters</p>
          <p className="mt-1 text-[13px] text-muted">Clear a filter or search for another name.</p>
        </div>
      ) : view === "cards" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {rows.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
          <AccountsTable accounts={rows} />
        </div>
      )}

      <AddAccountDialog open={addOpen} onClose={() => router.replace("/banking/accounts")} />
    </Page>
  );
}

const TYPES: { id: AccountKind; label: string; icon: React.ReactNode }[] = [
  { id: "bank", label: "Bank account", icon: <Landmark size={18} aria-hidden /> },
  { id: "wallet", label: "Mobile wallet", icon: <WalletCards size={18} aria-hidden /> },
  { id: "till", label: "Cash till", icon: <Banknote size={18} aria-hidden /> },
];

const PROVIDERS: Record<AccountKind, { value: Provider; label: string }[]> = {
  bank: [
    { value: "ABA", label: "ABA Bank" },
    { value: "ACLEDA", label: "ACLEDA Bank" },
  ],
  wallet: [{ value: "Wing", label: "Wing" }],
  till: [{ value: "Cash", label: "Cash" }],
};

function AddAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update } = useFinance();
  const toast = useToast();
  const [kind, setKind] = useState<AccountKind>("bank");
  const [provider, setProvider] = useState<Provider>("ACLEDA");
  const [name, setName] = useState("ACLEDA Payroll KHR");
  const [last4, setLast4] = useState("2291");
  const [currency, setCurrency] = useState<Currency>("KHR");
  const [usedBy, setUsedBy] = useState("Business-wide");
  const [opening, setOpening] = useState("8,200,000");
  const [asOf, setAsOf] = useState("2026-10-31");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chooseKind = (next: AccountKind) => {
    setKind(next);
    setProvider(PROVIDERS[next][0].value);
    if (next === "till") {
      setCurrency("USD");
      setUsedBy(BRANCH_NAMES[0]);
      setName(`Cash till · ${BRANCH_NAMES[0]}`);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter an account name.";
    if (kind !== "till" && !/^\d{4}$/.test(last4)) next.last4 = "Enter the last 4 digits of the account number.";
    if (kind === "till" && usedBy === "Business-wide") next.usedBy = "A cash till belongs to one branch.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const amount = parseAmount(opening);
    const account: Account = {
      id: `acc-${Date.now()}`,
      name: name.trim(),
      kind,
      provider,
      last4: kind === "till" ? undefined : last4,
      currency: kind === "till" ? "USD" : currency,
      balance: kind === "till" && currency === "KHR" ? 0 : amount,
      khrBalance: kind === "till" ? (currency === "KHR" ? amount : 0) : undefined,
      branch: usedBy,
      status: "active",
      recon: { label: "Not reconciled yet", tone: "neutral" },
      opened: asOf,
    };
    update((draft) => {
      draft.accounts.push(account);
      draft.ledgers[account.id] = [];
    });
    toast({ title: "Account added", body: `${account.name} was added with an opening balance of ${money(amount, currency)}.` });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="add-account-title" width={600}>
      <form onSubmit={submit} noValidate>
        <ModalHeader
          id="add-account-title"
          title="Add a financial account"
          description="Bank accounts, mobile wallets and cash tills. Balances are kept in the account’s own currency."
          onClose={onClose}
        />
        <ModalBody className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 text-sm leading-5 font-medium text-fg">Account type</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPES.map((type) => {
                const selected = kind === type.id;
                return (
                  <label
                    key={type.id}
                    className={cn(
                      "relative flex min-h-16 cursor-pointer items-center gap-3 rounded-[10px] px-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                      selected ? "border-2 border-primary bg-primary-subtle/60 px-[15px] text-brand" : "border border-line bg-surface text-fg hover:border-line-strong",
                    )}
                  >
                    <span className={selected ? "text-brand" : "text-icon"}>{type.icon}</span>
                    <span className="flex-1 text-sm leading-5 font-medium">{type.label}</span>
                    <input
                      type="radio"
                      name="account-type"
                      checked={selected}
                      onChange={() => chooseKind(type.id)}
                      className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary"
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {kind !== "till" && (
              <SelectField
                label={kind === "bank" ? "Bank" : "Wallet"}
                value={provider}
                onChange={(event) => setProvider(event.target.value as Provider)}
                options={PROVIDERS[kind]}
              />
            )}
            <TextField size="md" label="Account name" value={name} onChange={(event) => setName(event.target.value)} state={errors.name ? "error" : "default"} message={errors.name} className={kind === "till" ? "sm:col-span-2" : undefined} />
            {kind !== "till" && (
              <TextField
                size="md"
                label="Last 4 digits"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))}
                state={errors.last4 ? "error" : "default"}
                message={errors.last4 ?? "Only used to recognise the account."}
              />
            )}
            <SelectField
              label={kind === "till" ? "Opening currency" : "Currency"}
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              options={[
                { value: "USD", label: "USD · US Dollar" },
                { value: "KHR", label: "KHR · Cambodian Riel" },
              ]}
            />
            <SelectField
              className="sm:col-span-2"
              label="Used by"
              icon={Building2}
              value={usedBy}
              onChange={(event) => setUsedBy(event.target.value)}
              state={errors.usedBy ? "error" : "default"}
              message={errors.usedBy ?? "Branch Managers only see accounts assigned to their branch."}
              options={[{ value: "Business-wide", label: "Business-wide (all branches)" }, ...BRANCH_NAMES.map((b) => ({ value: b, label: b }))]}
            />
            <MoneyInput
              id="opening-balance"
              label="Opening balance"
              currency={currency}
              value={opening}
              onChange={setOpening}
              hint={currency === "KHR" ? `≈ ${money(parseAmount(opening) / 4100, "USD")} at 4,100 KHR per USD` : `≈ ${money(parseAmount(opening) * 4100, "KHR")} at 4,100 KHR per USD`}
            />
            <TextField size="md" label="As of" type="date" value={asOf} max="2026-10-31" onChange={(event) => setAsOf(event.target.value)} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add account</Button>
        </ModalFooter>
      </form>
    </Dialog>
  );
}
