import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/format";
import type { Aging, Currency } from "@/lib/mock/dashboard";

const COLORS = { primary: "bg-chart-revenue", warning: "bg-warning", error: "bg-error" };
const TEXT = { primary: "text-fg", warning: "text-fg", error: "text-error-fg" };

/** Cards "Accounts receivable" / "Accounts payable" with the 10px ageing bar. */
export function AgingCard({ aging, currency, id }: { aging: Aging; currency: Currency; id: string }) {
  const filled = aging.buckets.filter((bucket) => bucket.amount > 0);
  return (
    <Card aria-labelledby={`${id}-title`}>
      <CardHeader title={aging.title} titleId={`${id}-title`} actions={<CardLink href={aging.link.href}>{aging.link.label}</CardLink>} />
      <div className="flex flex-col gap-4 px-5 pt-0.5 pb-5">
        <p className="text-[13px] leading-5 text-muted">{aging.subtitle}</p>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[28px] leading-9 font-semibold tracking-[-0.14px] text-fg">{formatMoney(aging.total, currency)}</span>
          <span className="text-xs leading-4 font-medium text-muted">{currency}</span>
        </p>
        <div className="flex h-2.5 gap-[3px]" aria-hidden>
          {filled.map((bucket) => (
            <span
              key={bucket.label}
              className={cn("h-full rounded-full", COLORS[bucket.color])}
              style={{ flexGrow: bucket.amount, flexBasis: 0 }}
            />
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {aging.buckets.map((bucket) => (
            <li key={bucket.label} className="flex items-center gap-2 text-[13px] leading-5">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", COLORS[bucket.color])} />
              <span className="min-w-0 flex-1 text-muted">{bucket.label}</span>
              <span className={cn("tabular", bucket.amount > 0 ? TEXT[bucket.color] : "text-fg")}>
                {formatMoney(bucket.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
