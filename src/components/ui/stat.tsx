import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/format";

/** Up/down change pill used under KPI figures ("↗ 12.4%"). */
export function Delta({ value, direction, tone }: { value: string; direction: "up" | "down"; tone: "success" | "error" }) {
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-0.5 rounded-sm px-1.5 text-xs leading-4 font-medium",
        tone === "success" ? "bg-success-subtle text-success-fg" : "bg-error-subtle text-error-fg",
      )}
    >
      <Icon size={12} aria-hidden />
      <span className="sr-only">{direction === "up" ? "Up" : "Down"}</span>
      {value}
    </span>
  );
}

/**
 * Stat card (Figma "KPI" card): label, optional icon tile, a 28/36 figure
 * with unit, and up to two lines below. `tone` tints the whole card as on
 * the Bills summary (overdue red, due-soon amber) or makes it primary blue.
 */
export function StatCard({
  label,
  icon,
  value,
  unit,
  valueTone,
  lines,
  tone = "default",
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  valueTone?: "error" | "success";
  lines?: React.ReactNode[];
  tone?: "default" | "primary" | "error" | "warning";
  className?: string;
}) {
  const toneClass = {
    default: "border-line bg-surface",
    primary: "border-primary bg-primary text-white",
    error: "border-error/40 bg-error-subtle",
    warning: "border-warning/50 bg-warning-subtle",
  }[tone];
  const primary = tone === "primary";
  return (
    <section className={cn("lift flex min-w-0 flex-col rounded-lg border p-5 shadow-xs", toneClass, className)}>
      <div className="flex items-center gap-2">
        <h2 className={cn("min-w-0 flex-1 truncate text-[13px] leading-5", primary ? "text-white/90" : tone === "default" ? "text-muted" : "text-body")}>{label}</h2>
        {icon && <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">{icon}</span>}
      </div>
      <p className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            "truncate text-[24px] leading-9 font-semibold tracking-[-0.14px] md:text-[28px]",
            primary ? "text-white" : valueTone === "error" ? "text-error-fg" : valueTone === "success" ? "text-success-fg" : "text-fg",
          )}
        >
          {value}
        </span>
        {unit && <span className={cn("text-xs leading-4 font-medium", primary ? "text-white/90" : "text-muted")}>{unit}</span>}
      </p>
      {lines?.map((line, index) => (
        <div key={index} className={cn("text-xs leading-[18px]", index === 0 ? "mt-1.5" : "mt-2.5", primary ? "text-white/90" : "text-muted")}>
          {line}
        </div>
      ))}
    </section>
  );
}

/** Horizontal strip of small stats separated by dividers (statement totals, till variance). */
export function StatStrip({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; sub?: React.ReactNode; valueClassName?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 border-line md:flex", className)}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 flex-1 border-line px-4 py-3.5 md:px-5",
            index > 0 && "md:border-l",
            index % 2 === 1 && "max-md:border-l",
            index > 1 && "max-md:border-t",
          )}
        >
          <dt className="truncate text-[13px] leading-5 text-muted">{item.label}</dt>
          <dd className={cn("mt-0.5 text-[15px] leading-[22px] font-semibold text-fg md:text-base", item.valueClassName)}>{item.value}</dd>
          {item.sub && <dd className="mt-0.5 text-xs leading-4 text-muted">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
