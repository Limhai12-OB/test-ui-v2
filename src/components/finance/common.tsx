"use client";

import { useRef, useState } from "react";
import { Banknote, ChevronDown, CircleAlert, CloudUpload, FileSpreadsheet, Sparkles, TriangleAlert } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Menu } from "@/components/ui/menu";
import { cn, money, type Currency } from "@/lib/format";
import type { Account, Provider } from "@/lib/mock/finance-types";

const PROVIDER_STYLE: Record<Provider, { bg: string; text: string }> = {
  ABA: { bg: "bg-[#0f5c66]", text: "ABA" },
  ACLEDA: { bg: "bg-[#1e3a8a]", text: "AC" },
  Wing: { bg: "bg-[#4d7c0f]", text: "W" },
  Cash: { bg: "bg-[#475569]", text: "" },
};

/** Coloured bank tile ("ABA", "AC", "W", or a banknote for cash tills). */
export function AccountAvatar({ provider, size = 40, muted }: { provider: Provider; size?: 32 | 40; muted?: boolean }) {
  const style = PROVIDER_STYLE[provider];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-medium text-white",
        style.bg,
        size === 40 ? "size-10 text-[13px]" : "size-8 text-xs",
        muted && "opacity-60",
      )}
    >
      {style.text || <Banknote size={size === 40 ? 20 : 16} aria-hidden />}
    </span>
  );
}

export function StatusPill({ tone, children, className }: { tone: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <Badge tone={tone} dot className={className}>
      {children}
    </Badge>
  );
}

/** Balance in the account's own currency plus the converted or second-currency line. */
export function accountBalanceLines(account: Account) {
  if (account.kind === "till") {
    return { main: money(account.balance, "USD"), unit: "USD", sub: `+ ${money(account.khrBalance ?? 0, "KHR")} KHR` };
  }
  return {
    main: money(account.balance, account.currency),
    unit: account.currency,
    sub: account.currency === "KHR" ? `≈ ${money(account.balance / 4100, "USD")}` : `≈ ${money(account.balance * 4100, "KHR")}`,
  };
}

export function accountKindLabel(account: Account) {
  if (account.kind === "till") return "Cash till · USD and KHR";
  return `${account.kind === "bank" ? "Bank account" : "Mobile wallet"} · •••• ${account.last4}`;
}

/** Violet AI category chip with a dropdown to change it. */
export function AiCategoryChip({
  value,
  ai,
  options,
  onChange,
  label,
}: {
  value: string | null;
  ai: boolean;
  options: string[];
  onChange: (category: string) => void;
  label: string;
}) {
  return (
    <Menu
      width={220}
      triggerLabel={`${label}: ${value ?? "choose category"}`}
      triggerClassName={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-[13px] leading-[18px] font-medium whitespace-nowrap",
        value && ai ? "border-icon-ai/25 bg-ai-subtle text-ai-fg hover:border-icon-ai/50" : value ? "border-line-strong bg-surface text-fg hover:bg-subtle" : "border-line-strong bg-surface text-body hover:bg-subtle",
      )}
      trigger={
        <>
          {value && ai && <Sparkles size={14} aria-hidden />}
          <span className="truncate">{value ?? "Choose category"}</span>
          <ChevronDown size={14} aria-hidden />
        </>
      }
      items={options.map((option) => ({ id: option, label: option, selected: option === value, onSelect: () => onChange(option) }))}
    />
  );
}

/** "71% · check" amber confidence chip, or "No suggestion" in red. */
export function ConfidenceChip({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-error-subtle px-2 text-xs leading-4 font-medium whitespace-nowrap text-error-fg">
        <TriangleAlert size={12} aria-hidden />
        No suggestion
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2 text-xs leading-4 font-medium whitespace-nowrap text-warning-fg">
      <CircleAlert size={12} aria-hidden />
      {confidence}% · check
    </span>
  );
}

export function AiBadge({ children = "AI suggestions" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
      <Sparkles size={12} aria-hidden />
      {children}
    </span>
  );
}

/** Amount cell: "−៛1,200,000" over "KHR · ≈ $292.68". Positive amounts are green. */
export function AmountCell({ amount, currency, showApprox = true }: { amount: number; currency: Currency; showApprox?: boolean }) {
  return (
    <div className="text-right">
      <p className={cn("tabular text-[13px] leading-5 whitespace-nowrap", amount > 0 ? "text-success-fg" : "text-fg")}>{money(amount, currency, { sign: true })}</p>
      <p className="text-xs leading-4 whitespace-nowrap text-muted">
        {currency}
        {showApprox && currency === "KHR" && ` · ≈ ${money(Math.abs(amount) / 4100, "USD")}`}
      </p>
    </div>
  );
}

/** Currency-prefixed number input ("USD | 1,480.00"). */
export function MoneyInput({
  label,
  currency,
  onCurrency,
  value,
  onChange,
  hint,
  error,
  id,
}: {
  label: string;
  currency: Currency;
  onCurrency?: (currency: Currency) => void;
  value: string;
  onChange: (value: string) => void;
  hint?: React.ReactNode;
  error?: string;
  id: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm leading-5 font-medium text-fg">
        {label}
      </label>
      <div
        className={cn(
          "flex h-10 items-stretch overflow-hidden rounded-md border bg-surface focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-error" : "border-icon-subtle focus-within:border-primary",
        )}
      >
        {onCurrency ? (
          <select
            aria-label={`${label} currency`}
            value={currency}
            onChange={(event) => onCurrency(event.target.value as Currency)}
            className="cursor-pointer border-r border-line bg-subtle px-3 text-[13px] font-medium text-fg outline-none"
          >
            <option value="USD">USD</option>
            <option value="KHR">KHR</option>
          </select>
        ) : (
          <span className="inline-flex items-center border-r border-line bg-subtle px-3 text-[13px] font-medium text-fg">{currency}</span>
        )}
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-hint`}
          className="tabular min-w-0 flex-1 bg-transparent px-3 text-right text-sm leading-5 font-normal text-fg outline-none"
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-hint`} className={cn("mt-1.5 text-[13px] leading-5", error ? "text-error-fg" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const parseAmount = (value: string) => Number(value.replace(/,/g, "")) || 0;

/** Dashed drop zone ("Drag and drop a file, or browse"). */
export function FileDrop({
  accept,
  hint,
  onFile,
  label = "Choose a file",
  compact,
}: {
  accept: string;
  hint: string;
  onFile: (file: File) => void;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition-colors",
        compact ? "py-6" : "py-9",
        over ? "border-primary bg-primary-subtle/50" : "border-line-strong bg-subtle",
      )}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-icon-strong">
        <CloudUpload size={22} aria-hidden />
      </span>
      <p className="mt-3 text-[15px] leading-[22px] text-fg">
        Drag and drop a file, or{" "}
        <button type="button" onClick={() => inputRef.current?.click()} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
          browse
        </button>
      </p>
      <p className="mt-1 text-xs leading-4 text-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function FileTile({ tone = "success" }: { tone?: "success" | "error" }) {
  return (
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", tone === "error" ? "bg-error-subtle text-icon-error" : "bg-success-subtle text-icon-success")}>
      <FileSpreadsheet size={18} aria-hidden />
    </span>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
