import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("flex min-w-0 flex-col rounded-lg border border-line bg-surface shadow-xs", className)}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * Card header as built in Figma: 20px top/side padding, Title/LG (16/24
 * SemiBold) with an optional 13/20 subtitle and trailing actions.
 */
export function CardHeader({
  title,
  titleId,
  subtitle,
  badge,
  actions,
  divided = false,
  className,
}: {
  title: string;
  titleId?: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  divided?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5",
        divided ? "border-b border-line py-4" : "pt-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h2 id={titleId} className="text-base leading-6 font-semibold text-fg">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && <p className="text-[13px] leading-5 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium whitespace-nowrap text-brand hover:underline"
    >
      {children}
      <ArrowRight size={14} strokeWidth={2} aria-hidden />
    </Link>
  );
}
