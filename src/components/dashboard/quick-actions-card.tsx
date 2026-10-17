import Link from "next/link";
import { ArrowRight, Calculator, CloudUpload, ReceiptText, ShoppingCart, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { QuickAction } from "@/lib/mock/dashboard";

const ICONS = { receipt: ReceiptText, cart: ShoppingCart, upload: CloudUpload, sparkles: Sparkles, calculator: Calculator };

/** Card "Quick actions": 62px bordered rows with a 36px icon tile. */
export function QuickActionsCard({ actions, className }: { actions: QuickAction[]; className?: string }) {
  return (
    <Card className={className} aria-labelledby="quick-actions-title">
      <CardHeader title="Quick actions" titleId="quick-actions-title" />
      <ul className="grid gap-2 p-5 md:max-xl:grid-cols-2">
        {actions.map((action) => {
          const Icon = ICONS[action.icon];
          return (
            <li key={action.id}>
              <Link
                href={action.href}
                className="lift focus-ring group flex items-center gap-3 rounded-[10px] border border-line p-3 hover:border-line-strong hover:bg-subtle"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-subtle text-brand">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[13px] leading-[18px] font-medium text-fg">{action.title}</span>
                  <span className="truncate text-xs leading-4 text-muted">{action.detail}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-icon group-hover:text-icon-strong" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
