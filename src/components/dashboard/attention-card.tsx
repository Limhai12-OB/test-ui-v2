import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  ChevronRight,
  FileText,
  PackageMinus,
  ReceiptText,
  Tags,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/format";
import type { ListItem, Tone } from "@/lib/mock/dashboard";

const ICONS = {
  receipt: ReceiptText,
  file: FileText,
  calendar: CalendarClock,
  package: PackageMinus,
  calculator: Calculator,
  undo: Undo2,
  tags: Tags,
};

export const TILE_TONES: Record<Tone, string> = {
  error: "bg-error-subtle text-icon-error",
  warning: "bg-warning-subtle text-icon-warning",
  info: "bg-info-subtle text-icon-info",
  success: "bg-success-subtle text-icon-success",
  neutral: "bg-primary-subtle text-brand",
};

/** "Needs attention" (owner) / "Your tasks" (Branch Manager) list card. */
export function AttentionCard({
  title,
  badgeTone,
  items,
  showFooterLink = false,
  className,
}: {
  title: string;
  badgeTone: "error" | "warning";
  items: ListItem[];
  showFooterLink?: boolean;
  className?: string;
}) {
  return (
    <Card className={className} aria-labelledby="attention-title">
      <CardHeader
        title={title}
        titleId="attention-title"
        badge={
          <Badge tone={badgeTone} size="sm">
            {items.length}
            <span className="sr-only"> items</span>
          </Badge>
        }
      />
      <ul className="flex flex-col px-5 py-2">
        {items.map((item, index) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className={cn(index < items.length - 1 && "border-b border-line-subtle")}>
              <Link
                href={item.href}
                className="focus-ring group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-subtle"
              >
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[9px]", TILE_TONES[item.tone])}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] leading-[18px] font-medium text-fg">{item.title}</span>
                  <span className="flex gap-1.5 text-xs leading-4">
                    {item.amount && (
                      <span className={cn("tabular whitespace-nowrap", item.amountTone === "error" ? "text-error-fg" : "text-fg")}>
                        {item.amount}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-muted">{item.detail}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-icon group-hover:text-icon-strong" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      {showFooterLink && (
        <Link
          href="/notifications"
          className="focus-ring mx-5 mb-4 inline-flex items-center justify-center gap-1 rounded-md border-t border-line-subtle pt-3 text-sm leading-5 font-medium text-brand hover:underline"
        >
          See all in Notifications
          <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </Card>
  );
}
