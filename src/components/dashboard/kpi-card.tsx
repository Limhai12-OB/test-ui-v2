import { ArrowDownRight, ArrowUpRight, Percent, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import { NumberRoll } from "@/components/hairline/number-roll";
import { cn, formatMoney } from "@/lib/format";
import { KHR_PER_USD, type Currency, type Kpi } from "@/lib/mock/dashboard";

const ICONS = { revenue: TrendingUp, expenses: ReceiptText, profit: PiggyBank, margin: Percent };

/** Figma "KPI" card: 20px padding, 12px gap, Financial/XL figure. */
export function KpiCard({ kpi, currency, empty = false }: { kpi: Kpi; currency: Currency; empty?: boolean }) {
  const Icon = ICONS[kpi.id];
  const DeltaIcon = kpi.deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;
  // Figures roll to their new value when the branch or display currency changes (Hairline UI number roll).
  const value =
    kpi.kind === "percent" ? (
      <NumberRoll value={kpi.value} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
    ) : currency === "KHR" ? (
      <NumberRoll value={Math.round((kpi.value * KHR_PER_USD) / 100) * 100} format={{ maximumFractionDigits: 0 }} prefix="៛" />
    ) : (
      <NumberRoll value={kpi.value} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} prefix="$" />
    );

  return (
    <section className="lift flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] leading-5 text-muted">
          <span className="md:hidden">{kpi.shortLabel}</span>
          <span className="hidden md:inline">{kpi.label}</span>
        </h2>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="truncate text-[22px] leading-8 font-semibold tracking-[-0.14px] text-fg md:text-[28px] md:leading-9">
          {empty ? (kpi.kind === "percent" ? "—" : formatMoney(0, currency)) : value}
        </span>
        {kpi.kind === "money" && (
          <span className="text-xs leading-4 font-medium text-muted max-md:sr-only">{currency}</span>
        )}
      </p>
      {empty ? (
        <p className="text-xs leading-4 text-muted">No data yet</p>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "inline-flex h-[22px] items-center gap-0.5 rounded-sm px-1.5 text-xs leading-4 font-medium",
              kpi.deltaTone === "success" ? "bg-success-subtle text-success-fg" : "bg-error-subtle text-error-fg",
            )}
          >
            <DeltaIcon size={12} aria-hidden />
            <span className="sr-only">{kpi.deltaDirection === "up" ? "Up" : "Down"}</span>
            {kpi.delta}
          </span>
          <span className="text-xs leading-4 text-muted">
            <span className="md:hidden">{kpi.shortSuffix}</span>
            <span className="hidden md:inline">{kpi.deltaSuffix}</span>
          </span>
        </p>
      )}
    </section>
  );
}
