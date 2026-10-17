import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { cn } from "@/lib/format";
import type { Transaction } from "@/lib/mock/dashboard";

/**
 * Card "Recent transactions". A table from 768px up (columns 84 / flex / 184 /
 * 148 as in Figma); on phones the rows become a list with the amount on the
 * right, as frame 20.1 and 18.2 specify.
 */
export function TransactionsCard({ subtitle, rows }: { subtitle: string; rows: Transaction[] }) {
  return (
    <Card className="overflow-hidden" aria-labelledby="transactions-title">
      <CardHeader
        title="Recent transactions"
        titleId="transactions-title"
        subtitle={subtitle}
        divided
        actions={<CardLink href="/financial-records/transactions">View all</CardLink>}
      />

      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Recent transactions</caption>
          <colgroup>
            <col className="w-[84px]" />
            <col />
            <col className="w-[184px]" />
            <col className="w-[148px]" />
          </colgroup>
          <thead>
            <tr className="h-11 border-b border-line bg-subtle text-xs leading-4 font-medium text-muted">
              <th scope="col" className="px-4 font-medium">Date</th>
              <th scope="col" className="px-4 font-medium">Description</th>
              <th scope="col" className="px-4 font-medium">Category</th>
              <th scope="col" className="px-4 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="h-14 border-b border-line-subtle last:border-b-0">
                <td className="px-4 text-[13px] leading-5 whitespace-nowrap text-muted">{row.date}</td>
                <td className="px-4">
                  <p className="truncate text-[13px] leading-5 font-medium text-fg">{row.title}</p>
                  <p className="truncate text-xs leading-4 text-muted">{row.subtitle}</p>
                </td>
                <td className="px-4">
                  <Badge tone={row.categoryTone ?? "neutral"} className="max-w-full">
                    <span className="truncate">{row.category}</span>
                  </Badge>
                </td>
                <td className="px-4 text-right">
                  <p className={cn("tabular truncate text-[13px] leading-5", row.positive ? "text-success-fg" : "text-fg")}>
                    {row.amount}
                  </p>
                  <p className="tabular truncate text-xs leading-4 text-muted">{row.currencyLine}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 border-b border-line-subtle px-4 py-3 last:border-b-0">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-[9px]",
                row.positive ? "bg-success-subtle text-icon-success" : "bg-muted-bg text-icon-strong",
              )}
            >
              {row.positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-5 font-medium text-fg">{row.title}</p>
              <p className="truncate text-xs leading-4 text-muted">
                <span className={row.categoryTone === "warning" ? "text-warning-fg" : undefined}>{row.category}</span> ·{" "}
                {row.subtitle}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("tabular text-[13px] leading-5", row.positive ? "text-success-fg" : "text-fg")}>{row.amount}</p>
              <p className="text-xs leading-4 text-muted">{row.date}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
